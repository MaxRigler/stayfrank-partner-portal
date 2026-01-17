import { useState, useEffect } from 'react';
import { Hero } from '@/components/Hero';
import { UnderwritingWizard } from '@/components/UnderwritingWizard';
import { useWizard } from '@/contexts/WizardContext';
import { UserMenu } from '@/components/UserMenu';
import { AuthModal } from '@/components/AuthModal';
import { supabase } from '@/integrations/supabase/client';
import { User } from 'lucide-react';
import { Session } from '@supabase/supabase-js';

// Helper function to get session from localStorage synchronously
function getStoredSession(): Session | null {
  const storageKey = 'sb-ximkveundgebbvbgacfu-auth-token';
  try {
    const storedData = localStorage.getItem(storageKey);
    if (!storedData) return null;

    const parsed = JSON.parse(storedData);
    if (parsed?.access_token && parsed?.user && parsed?.expires_at) {
      // Check if token is expired
      const expiresAt = new Date(parsed.expires_at * 1000);
      if (expiresAt > new Date()) {
        // Return a Session-like object
        return {
          access_token: parsed.access_token,
          refresh_token: parsed.refresh_token,
          expires_at: parsed.expires_at,
          expires_in: Math.floor((expiresAt.getTime() - Date.now()) / 1000),
          token_type: parsed.token_type || 'bearer',
          user: parsed.user,
        } as Session;
      }
    }
  } catch (e) {
    console.warn('Could not parse stored session:', e);
  }
  return null;
}

const Index = () => {
  const [showWizard, setShowWizard] = useState(false);
  const [propertyAddress, setPropertyAddress] = useState('');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const { setWizardActive } = useWizard();

  // Initialize session from localStorage synchronously
  const initialSession = getStoredSession();
  const [session, setSession] = useState<Session | null>(initialSession);
  // Only show loading if we have a localStorage session to verify
  // If no localStorage session, immediately show login button (no waiting for Supabase API)
  const [checkingSession, setCheckingSession] = useState(!!initialSession);

  // Verify session with Supabase and listen for auth changes
  useEffect(() => {
    let mounted = true;

    // If we already have a session from localStorage, verify it in the background
    // If no localStorage session, we already know user is logged out - no need to call Supabase
    console.log('Index: Initial session from localStorage:', initialSession ? 'found' : 'not found');

    if (!initialSession) {
      // No localStorage session = definitely not logged in, no need to check Supabase
      console.log('Index: No localStorage session, skipping Supabase check');
      setCheckingSession(false);
    } else {
      // Verify existing localStorage session with Supabase
      supabase.auth.getSession()
        .then(({ data: { session: supabaseSession } }) => {
          console.log('Index: Supabase session check:', supabaseSession ? 'logged in' : 'not logged in');
          if (mounted) {
            setSession(supabaseSession);
            setCheckingSession(false);
          }
        })
        .catch((err) => {
          // AbortError is common with React's cleanup - don't treat it as logout
          if (err?.name === 'AbortError') {
            console.log('Index: Session check aborted (likely React remount), keeping current state');
            // Keep the session from localStorage if we have it
            if (mounted) {
              setCheckingSession(false);
            }
          } else {
            console.error('Index: Session check failed:', err);
            if (mounted) {
              // Keep localStorage session if Supabase API fails
              setCheckingSession(false);
            }
          }
        });
    }

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      console.log('Index: Auth state changed:', _event, newSession ? 'logged in' : 'not logged in');
      if (mounted) {
        setSession(newSession);
        setCheckingSession(false);
      }
    });

    return () => {
      mounted = false;
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

      {/* Account button in bottom right */}
      <div className="fixed bottom-6 right-6 z-50" style={{ pointerEvents: 'auto' }}>
        {checkingSession ? (
          // Loading state
          <div className="bg-white border border-gray-300 shadow-lg rounded-lg px-4 py-3 text-gray-500 text-sm">
            Loading...
          </div>
        ) : session ? (
          // Logged in - show UserMenu with dropdown
          <UserMenu />
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

