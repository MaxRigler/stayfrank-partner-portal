import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, Home, DollarSign, MapPin, Loader2, Send } from 'lucide-react';
import { formatCurrency } from '@/lib/heaCalculator';
import { calculateSaleLeaseback, SL_ELIGIBLE_STATES } from '@/lib/slCalculator';
import { calculateHEIEligibility, HEI_ELIGIBLE_STATES } from '@/lib/heaCalculator';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';
import { triggerConfetti } from '@/components/ui/confetti';
import { supabase } from '@/integrations/supabase/client';
import { PersonalDetailsData } from './WizardStep2';

interface DualOfferDisplayProps {
  address: string;
  homeValue: number;
  mortgageBalance: number;
  state: string;
  propertyType: string;
  ownershipType: string;
  currentCLTV: number;
  ownerNames?: string[];
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
  personalDetails,
  onBack,
  onReset
}: DualOfferDisplayProps) {
  const isMobile = useIsMobile();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Calculate eligibility for both products
  const slResult = calculateSaleLeaseback(homeValue, mortgageBalance, state, propertyType);
  const heiResult = calculateHEIEligibility(homeValue, mortgageBalance, state, propertyType, ownershipType);

  // Trigger confetti if at least one product is eligible
  useEffect(() => {
    if (slResult.isEligible || heiResult.isEligible) {
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

      // Create submission in local database
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
          sl_eligible: slResult.isEligible,
          sl_offer_amount: slResult.isEligible ? slResult.availableCash : null,
          sl_ineligibility_reasons: slResult.ineligibilityReasons,
          hei_eligible: heiResult.isEligible,
          hei_max_investment: heiResult.isEligible ? heiResult.maxInvestment : null,
          hei_ineligibility_reasons: heiResult.ineligibilityReasons,
          // Personal Details
          owner_emails: personalDetails?.ownerEmails || [],
          owner_phones: personalDetails?.ownerPhones || [],
          owner_credit_scores: personalDetails?.ownerCreditScores || [],
          mortgage_current: personalDetails?.mortgageCurrent ?? null,
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
          sl_eligible: slResult.isEligible,
          sl_offer_amount: slResult.isEligible ? slResult.availableCash : null,
          hei_eligible: heiResult.isEligible,
          hei_max_investment: heiResult.isEligible ? heiResult.maxInvestment : null,
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
      <div className="space-y-6">
        <div className="p-8 bg-[hsl(var(--success))]/10 rounded-xl border border-[hsl(var(--success))]/30 text-center">
          <CheckCircle2 className="w-16 h-16 text-[hsl(var(--success))] mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-[hsl(var(--success))] mb-2">Deal Submitted!</h2>
          <p className="text-muted-foreground mb-4">
            Your lead has been sent to StayFrank. Their team will reach out to the homeowner shortly.
          </p>
          <p className="text-sm text-muted-foreground">
            Property: {address}
          </p>
        </div>
        <Button variant="outline" onClick={onReset} className="w-full">
          Submit Another Property
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Property Summary */}
      <div className="p-4 bg-secondary rounded-xl border border-border">
        <div className="flex items-start gap-3">
          <MapPin className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm text-foreground/70 font-medium">Property</p>
            <p className="font-bold text-muted-foreground">{address}</p>
            <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
              <span>Value: {formatCurrency(homeValue)}</span>
              <span>Mortgage: {formatCurrency(mortgageBalance)}</span>
              <span>LTV: {currentCLTV.toFixed(1)}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Dual Offer Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sale-Leaseback Offer */}
        <div className={`p-6 rounded-xl border ${slResult.isEligible
          ? 'bg-[hsl(var(--success))]/10 border-[hsl(var(--success))]/30'
          : 'bg-destructive/10 border-destructive/30'}`}>
          <div className="flex items-center gap-2 mb-4">
            {slResult.isEligible ? (
              <CheckCircle2 className="w-6 h-6 text-[hsl(var(--success))]" />
            ) : (
              <XCircle className="w-6 h-6 text-destructive" />
            )}
            <span className={`text-lg font-bold ${slResult.isEligible ? 'text-[hsl(var(--success))]' : 'text-destructive'}`}>
              Sell & Stay (Sale-Leaseback)
            </span>
          </div>

          {slResult.isEligible ? (
            <>
              <div className="mb-4">
                <p className="text-xs text-foreground/70 font-medium mb-1">Estimated Cash Available</p>
                <p className="text-3xl font-bold text-[hsl(var(--success))]">
                  {formatCurrency(slResult.availableCash)}
                </p>
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                Homeowner sells property to StayFrank and stays as a tenant for up to 3 years.
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[hsl(var(--success))]" />
                  <span className="text-muted-foreground">Eligible State: {getStateName(state)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[hsl(var(--success))]" />
                  <span className="text-muted-foreground">Property Type: {propertyType}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[hsl(var(--success))]" />
                  <span className="text-muted-foreground">LTV: {slResult.ltv.toFixed(1)}% (under 65%)</span>
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <p className="text-sm font-medium text-destructive mb-2">Not Eligible</p>
              {slResult.ineligibilityReasons.map((reason, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <XCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-muted-foreground">{reason}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* HEI Offer */}
        <div className={`p-6 rounded-xl border ${heiResult.isEligible
          ? 'bg-[hsl(var(--success))]/10 border-[hsl(var(--success))]/30'
          : 'bg-destructive/10 border-destructive/30'}`}>
          <div className="flex items-center gap-2 mb-4">
            {heiResult.isEligible ? (
              <CheckCircle2 className="w-6 h-6 text-[hsl(var(--success))]" />
            ) : (
              <XCircle className="w-6 h-6 text-destructive" />
            )}
            <span className={`text-lg font-bold ${heiResult.isEligible ? 'text-[hsl(var(--success))]' : 'text-destructive'}`}>
              Home Equity Investment (HEI)
            </span>
          </div>

          {heiResult.isEligible ? (
            <>
              <div className="mb-4">
                <p className="text-xs text-foreground/70 font-medium mb-1">Maximum Funding</p>
                <p className="text-3xl font-bold text-[hsl(var(--success))]">
                  {formatCurrency(heiResult.maxInvestment)}
                </p>
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                Homeowner keeps ownership, receives cash in exchange for a share of future appreciation.
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[hsl(var(--success))]" />
                  <span className="text-muted-foreground">Eligible State: {getStateName(state)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[hsl(var(--success))]" />
                  <span className="text-muted-foreground">Property Type: {propertyType}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[hsl(var(--success))]" />
                  <span className="text-muted-foreground">No Monthly Payments</span>
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <p className="text-sm font-medium text-destructive mb-2">Not Eligible</p>
              {heiResult.ineligibilityReasons.map((reason, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <XCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-muted-foreground">{reason}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1" disabled={isSubmitting}>
          Back
        </Button>
        <Button
          variant="success"
          onClick={handleSubmitToStayFrank}
          className="flex-[2]"
          disabled={isSubmitting || (!slResult.isEligible && !heiResult.isEligible)}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Submit Deal to StayFrank
            </>
          )}
        </Button>
      </div>

      {!slResult.isEligible && !heiResult.isEligible && (
        <p className="text-center text-sm text-muted-foreground">
          This property does not qualify for either program. You cannot submit this deal.
        </p>
      )}
    </div>
  );
}
