import { useState } from 'react';
import { WizardStep1 } from './WizardStep1';
import { DualOfferDisplay } from './DualOfferDisplay';
import { UserMenu } from './UserMenu';

interface UnderwritingWizardProps {
  address: string;
  onBack: () => void;
}

interface PropertyData {
  homeValue: number;
  state: string;
  mortgageBalance: number;
  maxInvestment: number;
  propertyType: string;
  ownershipType: string;
  currentCLTV: number;
  ownerNames: string[];
  isEmployed: boolean | null;
  hasLatePayments: boolean | null;
  isCreditScoreLow: boolean | null;
}

export function UnderwritingWizard({ address, onBack }: UnderwritingWizardProps) {
  const [step, setStep] = useState(1);
  const [propertyData, setPropertyData] = useState<PropertyData | null>(null);

  const handleStep1Complete = (data: PropertyData) => {
    setPropertyData(data);
    setStep(2);
  };

  const handleBackToStep1 = () => {
    setStep(1);
  };

  const handleBackToStep2 = () => {
    setStep(2);
  };

  const handleReset = () => {
    setStep(1);
    setPropertyData(null);
    onBack();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto font-sans text-foreground">
      {/* Background Image Layer */}
      <div
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat pointer-events-none"
        style={{ backgroundImage: `url('https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?ixlib=rb-4.0.3&auto=format&fit=crop&w=2075&q=80')` }}
      />

      {/* White Overlay Layer (90% Opacity) */}
      <div className="fixed inset-0 z-0 bg-white/90 pointer-events-none" />

      {/* Header */}
      <header className="border-b border-border bg-white relative z-10">
        <div className="w-full px-[30px] py-4">
          <div className="grid grid-cols-3 items-center">
            {/* Left: StayFrank Logo */}
            <div className="text-2xl font-bold justify-self-start">
              <span className="text-[hsl(38,78%,57%)]">Stay</span>
              <span className="text-[hsl(276,40%,17%)]">Frank</span>
              <span className="text-[hsl(38,78%,57%)]">.</span>
            </div>

            {/* Center: Progress Steps */}
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <span className={step === 1 ? 'text-accent font-semibold' : ''}>
                1. Property Details
              </span>
              <span>→</span>
              <span className={step === 2 ? 'text-accent font-semibold' : ''}>
                2. Review Offers
              </span>
            </div>

            {/* Right: User Menu with light variant (white background) */}
            <div className="justify-self-end">
              <UserMenu variant="light" />
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-8 max-w-4xl relative z-10">
        {step === 1 && (
          <WizardStep1
            address={address}
            onComplete={handleStep1Complete}
            onBack={onBack}
          />
        )}

        {step === 2 && propertyData && (
          <DualOfferDisplay
            address={address}
            homeValue={propertyData.homeValue}
            mortgageBalance={propertyData.mortgageBalance}
            state={propertyData.state}
            propertyType={propertyData.propertyType}
            ownershipType={propertyData.ownershipType}
            currentCLTV={propertyData.currentCLTV}
            ownerNames={propertyData.ownerNames}
            isEmployed={propertyData.isEmployed}
            hasLatePayments={propertyData.hasLatePayments}
            isCreditScoreLow={propertyData.isCreditScoreLow}
            onBack={handleBackToStep1}
            onReset={handleReset}
          />
        )}
      </main>
    </div>
  );
}
