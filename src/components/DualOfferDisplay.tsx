import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle2, MapPin, Loader2, Send, Building2, Percent, ArrowRight } from 'lucide-react';
import { formatCurrency, checkDualProductEligibility } from '@/lib/heaCalculator';
import { toast } from 'sonner';
import { triggerConfetti } from '@/components/ui/confetti';
import { supabase } from '@/integrations/supabase/client';
import { PersonalDetailsData } from './WizardStep2';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface DualOfferDisplayProps {
  address: string;
  homeValue: number;
  mortgageBalance: number;
  state: string;
  propertyType: string;
  ownershipType: string;
  currentCLTV: number;
  ownerNames?: string[];
  isEmployed?: boolean | null;
  hasLatePayments?: boolean | null;
  isCreditScoreLow?: boolean | null;
  personalDetails?: PersonalDetailsData;
  onBack: () => void;
  onReset: () => void;
}

const getStateName = (abbr: string) => {
  const states: Record<string, string> = {
    'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas',
    'CA': 'California', 'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware',
    'FL': 'Florida', 'GA': 'Georgia', 'HI': 'Hawaii', 'ID': 'Idaho',
    'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa', 'KS': 'Kansas',
    'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland',
    'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi',
    'MO': 'Missouri', 'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada',
    'NH': 'New Hampshire', 'NJ': 'New Jersey', 'NM': 'New Mexico', 'NY': 'New York',
    'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio', 'OK': 'Oklahoma',
    'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina',
    'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah',
    'VT': 'Vermont', 'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia',
    'WI': 'Wisconsin', 'WY': 'Wyoming', 'DC': 'District of Columbia'
  };
  return states[abbr] || abbr;
};

export function DualOfferDisplay({
  address,
  homeValue,
  mortgageBalance,
  state,
  propertyType,
  ownershipType,
  currentCLTV,
  ownerNames,
  isEmployed,
  hasLatePayments,
  isCreditScoreLow,
  personalDetails,
  onBack,
  onReset
}: DualOfferDisplayProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Calculate eligibility for both products using the dual-product checker
  const dualEligibility = checkDualProductEligibility(homeValue, mortgageBalance, state, propertyType, ownershipType);

  // Trigger confetti if at least one product is eligible
  useEffect(() => {
    if (dualEligibility.eitherEligible) {
      triggerConfetti();
    }
  }, []);

  const handleSubmitToStayFrank = async () => {
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        toast.error('You must be logged in to submit a deal');
        return;
      }

      // Create submission in local database - store BOTH product eligibility results
      const { data: submission, error: submissionError } = await supabase
        .from('submissions')
        .insert({
          user_id: user.id,
          property_address: address,
          home_value: homeValue,
          mortgage_balance: mortgageBalance,
          owner_names: ownerNames || [],
          property_type: propertyType,
          state: state,
          sl_eligible: dualEligibility.slEligible,
          sl_offer_amount: dualEligibility.slEligible ? dualEligibility.slOfferAmount : null,
          sl_ineligibility_reasons: dualEligibility.slEligible ? [] : dualEligibility.combinedReasons,
          hei_eligible: dualEligibility.heiEligible,
          hei_max_investment: dualEligibility.heiEligible ? dualEligibility.heiMaxInvestment : null,
          hei_ineligibility_reasons: dualEligibility.heiEligible ? [] : dualEligibility.combinedReasons,
          // Personal Details
          owner_emails: personalDetails?.ownerEmails || [],
          owner_phones: personalDetails?.ownerPhones || [],
          owner_credit_scores: personalDetails?.ownerCreditScores || (isCreditScoreLow ? ['Below 620'] : ['620+']),
          mortgage_current: personalDetails?.mortgageCurrent ?? (hasLatePayments !== undefined && hasLatePayments !== null ? !hasLatePayments : null),
          money_reasons: personalDetails?.moneyReasons || [],
          helpful_context: personalDetails?.helpfulContext || null,
          money_amount: personalDetails?.moneyAmount || null,
        })
        .select('id')
        .single();

      if (submissionError || !submission) {
        console.error('Error creating submission:', submissionError);
        toast.error('Failed to submit deal');
        return;
      }

      // Call edge function to create deal in EquityAdvance and get tracking link
      const { data: partnerDealResult, error: partnerDealError } = await supabase.functions.invoke('submit-deal', {
        body: {
          submission_id: submission.id,
          property_address: address,
          home_value: homeValue,
          mortgage_balance: mortgageBalance,
          owner_names: ownerNames || [],
          property_type: propertyType,
          state: state,
          sl_eligible: dualEligibility.slEligible,
          sl_offer_amount: dualEligibility.slEligible ? dualEligibility.slOfferAmount : null,
          hei_eligible: dualEligibility.heiEligible,
          hei_max_investment: dualEligibility.heiEligible ? dualEligibility.heiMaxInvestment : null,
        }
      });

      if (partnerDealError) {
        console.error('Error creating partner deal:', partnerDealError);
        // Still show success since local submission was created
        toast.warning('Deal submitted locally, but partner sync failed. StayFrank team will follow up.');
      } else if (partnerDealResult) {
        // Update local submission with EquityAdvance deal ID and tracking link
        await supabase
          .from('submissions')
          .update({
            equityadvance_deal_id: partnerDealResult.deal_id,
            everflow_tracking_link: partnerDealResult.tracking_link,
          })
          .eq('id', submission.id);
      }

      setSubmitted(true);
      toast.success('Deal submitted to StayFrank successfully!');
      triggerConfetti();

    } catch (err) {
      console.error('Error submitting deal:', err);
      toast.error('An error occurred while submitting the deal');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="space-y-6 max-w-2xl mx-auto">
        <Card className="border-success/30 bg-success/5">
          <CardContent className="pt-6 pb-8 text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-success/20 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8 text-success" />
            </div>
            <h2 className="text-2xl font-bold text-success">Deal Submitted Successfully!</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              Your lead has been securely sent to StayFrank. Their team will review the property and reach out to the homeowner shortly.
            </p>
            <div className="mt-6 p-4 bg-background rounded-lg border inline-block text-left text-sm">
              <div className="flex items-center gap-2 mb-1">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">{address}</span>
              </div>
            </div>
          </CardContent>
        </Card>
        <Button variant="outline" onClick={onReset} className="w-full">
          Scan Another Property
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Property Context Strip */}
      <div className="bg-background/50 backdrop-blur-sm px-4 py-3 rounded-lg border flex items-center justify-between text-sm text-muted-foreground md:flex-row flex-col gap-2 md:gap-0">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-primary" />
          <span className="font-medium text-foreground">{address}</span>
        </div>
        <div className="flex gap-4 text-xs md:text-sm">
          <span>Value: <span className="font-medium text-foreground">{formatCurrency(homeValue)}</span></span>
          <span className="hidden md:inline text-border">|</span>
          <span>Mortgage: <span className="font-medium text-foreground">{formatCurrency(mortgageBalance)}</span></span>
        </div>
      </div>

      {/* Main Consolidated Offer Card */}
      <Card className="border-2 border-emerald-500/20 shadow-lg overflow-hidden relative">
        {/* Decorative Top Banner */}
        <div className="h-2 bg-gradient-to-r from-emerald-400 to-emerald-600 w-full absolute top-0 left-0" />

        <CardHeader className="text-center pt-10 pb-2">
          <div className="mx-auto bg-emerald-100 text-emerald-700 px-4 py-1.5 rounded-full text-sm font-semibold inline-flex items-center gap-2 mb-4">
            <CheckCircle2 className="w-4 h-4" />
            Pre-Qualification Successful
          </div>
          <CardTitle className="text-3xl md:text-4xl text-foreground font-bold tracking-tight">
            Your Client Pre-Qualifies!
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-8 pb-10">
          {/* Funding Amount Section */}
          <div className="text-center space-y-2">
            <p className="text-muted-foreground font-medium uppercase tracking-wide text-xs">Estimated Funding Capacity</p>
            <div className="text-5xl md:text-6xl font-extrabold text-emerald-600 tracking-tight">
              {formatCurrency(dualEligibility.higherAmount)}
            </div>
            <p className="text-sm text-muted-foreground">
              Based on {formatCurrency(homeValue)} home value
            </p>
          </div>

          <Separator className="max-w-xl mx-auto opacity-50" />

          {/* Qualification Badges Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
            <div className="bg-secondary/50 rounded-xl p-4 flex flex-col items-center justify-center text-center gap-2 border hover:border-emerald-500/30 transition-colors">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mb-1">
                <MapPin className="w-5 h-5" />
              </div>
              <p className="text-xs text-muted-foreground font-medium uppercase">State</p>
              <p className="font-semibold text-foreground flex items-center gap-1">
                {getStateName(state)}
                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              </p>
            </div>

            <div className="bg-secondary/50 rounded-xl p-4 flex flex-col items-center justify-center text-center gap-2 border hover:border-emerald-500/30 transition-colors">
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 mb-1">
                <Building2 className="w-5 h-5" />
              </div>
              <p className="text-xs text-muted-foreground font-medium uppercase">Property</p>
              <p className="font-semibold text-foreground flex items-center gap-1">
                {propertyType}
                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              </p>
            </div>

            <div className="bg-secondary/50 rounded-xl p-4 flex flex-col items-center justify-center text-center gap-2 border hover:border-emerald-500/30 transition-colors">
              <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 mb-1">
                <Percent className="w-5 h-5" />
              </div>
              <p className="text-xs text-muted-foreground font-medium uppercase">LTV</p>
              <p className="font-semibold text-foreground flex items-center gap-1">
                {currentCLTV.toFixed(1)}%
                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Area */}
      <div className="flex flex-col sm:flex-row gap-4 pt-4 max-w-3xl mx-auto">
        <Button
          variant="outline"
          onClick={onBack}
          className="flex-1 h-12 text-base border-2 hover:bg-secondary/80"
          disabled={isSubmitting}
        >
          Back
        </Button>
        <Button
          onClick={handleSubmitToStayFrank}
          className="flex-[2] h-12 text-base font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20 shadow-lg transition-all hover:scale-[1.01]"
          disabled={isSubmitting || !dualEligibility.eitherEligible}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              Submit Deal to StayFrank
              <ArrowRight className="h-5 w-5 ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
