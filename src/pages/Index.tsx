import { useState, useEffect } from 'react';
import { Hero } from '@/components/Hero';
import { UnderwritingWizard } from '@/components/UnderwritingWizard';
import { useWizard } from '@/contexts/WizardContext';
import { UserMenu } from '@/components/UserMenu';
import { AuthModal } from '@/components/AuthModal';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { LogOut, User } from 'lucide-react';
import { Session } from '@supabase/supabase-js';

const Index = () => {
  const [showWizard, setShowWizard] = useState(false);
  const [propertyAddress, setPropertyAddress] = useState('');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const { setWizardActive } = useWizard();
  const [session, setSession] = useState<Session | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);

  // Check for session directly from Supabase
  useEffect(() => {
    let mounted = true;

    // Timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      if (mounted && checkingSession) {
        console.log('Session check timed out, setting to logged out');
        setCheckingSession(false);
      }
    }, 3000);

    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        console.log('Session check complete:', session ? 'logged in' : 'not logged in');
        if (mounted) {
          setSession(session);
          setCheckingSession(false);
        }
      })
      .catch((err) => {
        console.error('Session check failed:', err);
        if (mounted) {
          setCheckingSession(false);
        }
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('Auth state changed:', _event, session ? 'logged in' : 'not logged in');
      if (mounted) {
        setSession(session);
        setCheckingSession(false);
      }
    });

    return () => {
      mounted = false;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    setWizardActive(showWizard);
  }, [showWizard, setWizardActive]);

  const handleCheckEligibility = (address: string) => {
    setPropertyAddress(address);
    setShowWizard(true);
  };

  const handleBackToHome = () => {
    setShowWizard(false);
    setPropertyAddress('');
  };

  const handleSignOut = async () => {
    try {
      console.log('Signing out...');
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Sign out error:', error);
        alert('Error signing out: ' + error.message);
      } else {
        console.log('Signed out successfully');
        // Clear any local storage
        localStorage.clear();
        window.location.href = '/';
      }
    } catch (err) {
      console.error('Sign out exception:', err);
      alert('Error: ' + String(err));
    }
  };

  if (showWizard) {
    return (
      <UnderwritingWizard
        address={propertyAddress}
        onBack={handleBackToHome}
      />
    );
  }

  return (
    <>
      <Hero onCheckEligibility={handleCheckEligibility} />

      {/* Always show account button in bottom right */}
      <div className="fixed bottom-6 right-6 z-50" style={{ pointerEvents: 'auto' }}>
        {checkingSession ? (
          // Loading state
          <div className="bg-white border border-gray-300 shadow-lg rounded-lg px-4 py-3 text-gray-500 text-sm">
            Loading...
          </div>
        ) : session ? (
          // Logged in - show user info and sign out
          <button
            type="button"
            onClick={() => {
              localStorage.clear();
              sessionStorage.clear();
              supabase.auth.signOut();
              window.location.replace('/');
            }}
            className="bg-white border border-gray-300 shadow-lg rounded-lg px-4 py-3 hover:bg-gray-100 text-gray-900 flex items-center gap-2 cursor-pointer"
          >
            <User className="w-4 h-4" />
            <span className="text-sm font-medium">{session.user.email?.split('@')[0]}</span>
            <LogOut className="w-4 h-4 ml-2 text-red-500" />
          </button>
        ) : (
          // Not logged in - show login button
          <button
            type="button"
            onClick={() => setShowAuthModal(true)}
            className="bg-accent text-accent-foreground shadow-lg rounded-lg px-4 py-3 hover:bg-accent/90 flex items-center gap-2 cursor-pointer font-medium"
          >
            <User className="w-4 h-4" />
            <span className="text-sm">Log In</span>
          </button>
        )}
      </div>

      {/* Auth Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowAuthModal(false)}>
          <div className="bg-white rounded-lg max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <AuthModal onLoginSuccess={() => setShowAuthModal(false)} />
          </div>
        </div>
      )}
    </>
  );
};

export default Index;

