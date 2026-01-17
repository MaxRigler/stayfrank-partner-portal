import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';
import { AddressAutocomplete } from '@/components/AddressAutocomplete';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { AuthModal } from '@/components/AuthModal';
import { useAuth } from '@/hooks/useAuth';

interface HeroProps {
  onCheckEligibility: (address: string) => void;
}

const subheadlineItems = [
  'Sale-Leaseback Options',
  'Home Equity Investments',
  'Stay In Your Home'
];

export function Hero({ onCheckEligibility }: HeroProps) {
  const [address, setAddress] = useState('');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [pendingAddress, setPendingAddress] = useState<string | null>(null);
  const [showPendingModal, setShowPendingModal] = useState(false);
  const [isWideModal, setIsWideModal] = useState(false);

  // Use centralized auth hook for synchronized session state
  const { session, userStatus, isLoading: checkingAuth } = useAuth();


  const handleCheckEligibility = (addressToCheck: string) => {
    // Check if user is logged in
    if (!session) {
      setPendingAddress(addressToCheck);
      setShowAuthModal(true);
      return;
    }

    // Check if user is approved (active status)
    if (userStatus === 'pending') {
      setPendingAddress(addressToCheck);
      setShowPendingModal(true);
      return;
    }

    if (userStatus === 'denied') {
      alert('Your account has been denied. Please contact support.');
      return;
    }

    // User is logged in and approved - proceed
    onCheckEligibility(addressToCheck);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (address.trim()) {
      handleCheckEligibility(address);
    }
  };

  const handleAuthSuccess = () => {
    setShowAuthModal(false);
    if (pendingAddress) {
      onCheckEligibility(pendingAddress);
      setPendingAddress(null);
    }
  };

  return (
    <section className="fixed inset-0 bg-[hsl(var(--purple-deep))] overflow-hidden">
      {/* Background image layer */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url('https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?ixlib=rb-4.0.3&auto=format&fit=crop&w=2075&q=80')` }}
      />

      {/* Background gradient overlay - StayFrank purple tones */}
      <div className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--purple-deep))] via-[hsl(var(--purple-medium))] to-[hsl(var(--purple-deep))] opacity-95" />

      {/* Animated decorative elements with orange accent */}
      <div className="absolute top-20 right-10 w-72 h-72 bg-accent rounded-full blur-3xl animate-float-glow" />
      <div className="absolute bottom-20 left-10 w-96 h-96 bg-accent rounded-full blur-3xl animate-float-glow-reverse" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent/5 rounded-full blur-3xl animate-glow-pulse" />

      <div className="relative z-10 container mx-auto px-2 md:px-4 min-h-full flex flex-col justify-center md:block md:py-16 lg:py-24">
        {/* Main Content */}
        <div className="max-w-4xl mx-auto text-left md:text-center">
          {/* Logo/Brand */}
          <div className="mb-8 md:mb-16 flex justify-start md:justify-center">
            {/* StayFrank Logo - Text version, replace with actual logo image */}
            <div className="text-4xl md:text-5xl font-bold">
              <span className="text-[hsl(38,78%,57%)]">Stay</span>
              <span className="text-white">Frank</span>
              <span className="text-[hsl(38,78%,57%)]">.</span>
            </div>
          </div>

          <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-primary-foreground mb-6 animate-fade-in">
            {/* Mobile: 2-line layout */}
            <span className="md:hidden">
              <span className="block whitespace-nowrap">Transform <span className="text-gradient-orange">Home Equity</span></span>
              <span className="block">into Cash</span>
            </span>
            {/* Desktop: 2-line layout */}
            <span className="hidden md:inline">
              <span className="block whitespace-nowrap">Transform <span className="text-gradient-orange">Home Equity</span></span>
              <span className="block whitespace-nowrap">Into Cash</span>
            </span>
          </h1>

          {/* Mobile Subheadline - Vertical stacked list */}
          <div className="mb-12 max-w-3xl mx-auto animate-slide-up md:hidden">
            <div className="flex flex-col items-start gap-3">
              {subheadlineItems.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-accent flex-shrink-0" />
                  <span className="text-primary-foreground/80 text-left font-bold">{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Address Input Form */}
          <form onSubmit={handleSubmit} className="relative z-50 max-w-2xl mx-auto mb-8 md:mt-12 md:mb-12 animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <div className="flex flex-col sm:flex-row gap-3 p-2 bg-card/10 backdrop-blur-sm rounded-xl border border-primary-foreground/10">
              <AddressAutocomplete
                onSelect={(selectedAddress) => {
                  setAddress(selectedAddress);
                  handleCheckEligibility(selectedAddress);
                }}
                onChange={(value) => setAddress(value)}
                placeholder="Enter Property Address"
              />
              <Button type="submit" size="xl" className="w-full sm:w-auto bg-accent hover:bg-accent/90 text-primary">
                Check Eligibility
              </Button>
            </div>
          </form>

          {/* Desktop Subheadline - Horizontal row */}
          <div className="hidden md:block max-w-3xl mx-auto animate-slide-up relative z-0">
            <div className="flex flex-nowrap justify-center items-center gap-x-2">
              {subheadlineItems.map((item, index) => (
                <div key={index} className="flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-accent flex-shrink-0" />
                  <span className="text-primary-foreground/80 text-sm whitespace-nowrap font-bold">{item}</span>
                  {index < subheadlineItems.length - 1 && (
                    <div className="w-px h-4 bg-primary-foreground/30 ml-2" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Partner subtitle */}
          <p className="mt-8 text-sm text-primary-foreground/60 animate-slide-up" style={{ animationDelay: '0.2s' }}>
            Partner Portal — Submit leads for StayFrank's home equity programs
          </p>
        </div>
      </div>

      <Dialog open={showAuthModal} onOpenChange={(open) => {
        setShowAuthModal(open);
        if (!open) setIsWideModal(false);
      }}>
        <DialogContent className={`max-w-[calc(100%-2rem)] rounded-lg transition-all duration-300 ease-in-out ${isWideModal ? 'sm:max-w-2xl' : 'sm:max-w-md'}`}>
          <AuthModal
            onLoginSuccess={handleAuthSuccess}
            disclaimerMessage="Log in or create an account to submit leads."
            onTabChange={(tab) => setIsWideModal(tab === 'signup')}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={showPendingModal} onOpenChange={setShowPendingModal}>
        <DialogContent className="sm:max-w-md">
          <AuthModal
            initialView="account-pending"
          />
        </DialogContent>
      </Dialog>
    </section>
  );
}
