import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { Lock, Users, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export default function ResetPassword() {
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const [isValidSession, setIsValidSession] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;

    const verifyToken = async () => {
      // Extract token from URL hash
      const hash = window.location.hash.substring(1);
      const params = new URLSearchParams(hash);
      const accessToken = params.get('access_token');
      const tokenType = params.get('type');
      const refreshToken = params.get('refresh_token');

      // If we have a token in the URL, try to verify it
      if (accessToken && tokenType === 'recovery') {
        try {
          // Check if it's a short OTP token (not a JWT)
          const isOtpToken = !accessToken.includes('.');

          if (isOtpToken) {
            // Verify OTP token to establish session
            const { data, error } = await supabase.auth.verifyOtp({
              token_hash: accessToken,
              type: 'recovery',
            });

            if (error) {
              console.error('OTP verification error:', error);
              if (isMounted) {
                setIsVerifying(false);
                toast({
                  title: "Invalid or expired link",
                  description: "Please request a new password reset link.",
                  variant: "destructive",
                });
                navigate('/');
              }
              return;
            }

            if (data.session && isMounted) {
              setIsValidSession(true);
              setIsVerifying(false);
            }
          } else {
            // It's a JWT access token - try to set the session directly
            const { data, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken || '',
            });

            if (error) {
              console.error('Session error:', error);
              if (isMounted) {
                setIsVerifying(false);
                toast({
                  title: "Invalid or expired link",
                  description: "Please request a new password reset link.",
                  variant: "destructive",
                });
                navigate('/');
              }
              return;
            }

            if (data.session && isMounted) {
              setIsValidSession(true);
              setIsVerifying(false);
            }
          }
        } catch (err) {
          console.error('Verification error:', err);
          if (isMounted) {
            setIsVerifying(false);
            toast({
              title: "Invalid or expired link",
              description: "Please request a new password reset link.",
              variant: "destructive",
            });
            navigate('/');
          }
        }
      } else {
        // No token in URL - check for existing session
        const { data: { session } } = await supabase.auth.getSession();
        if (session && isMounted) {
          setIsValidSession(true);
          setIsVerifying(false);
        } else if (isMounted) {
          setIsVerifying(false);
          toast({
            title: "Invalid or expired link",
            description: "Please request a new password reset link.",
            variant: "destructive",
          });
          navigate('/');
        }
      }
    };

    // Listen for auth state changes as a fallback
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') && session && isMounted) {
        setIsValidSession(true);
        setIsVerifying(false);
      }
    });

    verifyToken();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [navigate]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newPassword || !confirmPassword) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }

    // Everflow requires: min 12 chars, uppercase, lowercase, number, special char
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{12,}$/;
    if (!passwordRegex.test(newPassword)) {
      toast({
        title: "Error",
        description: "Password must be at least 12 characters with uppercase, lowercase, number, and special character (!@#$%^&* etc.)",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    setIsLoading(false);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Password updated",
      description: "Your password has been successfully updated.",
    });

    navigate('/');
  };

  if (isVerifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Verifying your reset link...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isValidSession) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="text-3xl font-bold">
            <span className="text-[hsl(38,78%,57%)]">Stay</span>
            <span className="text-[hsl(276,40%,17%)]">Frank</span>
            <span className="text-[hsl(38,78%,57%)]">.</span>
          </div>
          <div className="flex items-center justify-center gap-2 text-primary">
            <Users className="h-6 w-6" />
            <CardTitle className="text-xl">Set New Password</CardTitle>
          </div>
          <CardDescription>
            Enter your new password below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="new-password"
                  type="password"
                  placeholder="Min 12 chars, Aa1!"
                  className="pl-10"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-new-password">Confirm New Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="confirm-new-password"
                  type="password"
                  placeholder="••••••••"
                  className="pl-10"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>

            <Button type="submit" variant="navy" className="w-full" disabled={isLoading}>
              {isLoading ? "Updating..." : "Update Password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}