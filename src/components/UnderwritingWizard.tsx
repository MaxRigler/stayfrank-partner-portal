import { useState } from 'react';
import { WizardStep1 } from './WizardStep1';
import { DualOfferDisplay } from './DualOfferDisplay';

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

  const handleReset = () => {
    setStep(1);
    setPropertyData(null);
    onBack();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="text-2xl font-bold">
              <span className="text-[hsl(38,78%,57%)]">Stay</span>
              <span className="text-[hsl(276,40%,17%)]">Frank</span>
              <span className="text-[hsl(38,78%,57%)]">.</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className={step === 1 ? 'text-accent font-semibold' : ''}>
                1. Property Details
              </span>
              <span>→</span>
              <span className={step === 2 ? 'text-accent font-semibold' : ''}>
                2. Review Offers
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-8 max-w-4xl">
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
            onBack={handleBackToStep1}
            onReset={handleReset}
          />
        )}
      </main>
    </div>
  );
}
