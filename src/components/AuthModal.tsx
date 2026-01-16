import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { Users, Mail, Lock, User, Building2, Phone, ArrowLeft, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

type ViewType = 'login' | 'signup' | 'forgot-password' | 'account-pending';

interface AuthModalProps {
  onLoginSuccess?: () => void;
  disclaimerMessage?: string;
  initialView?: ViewType;
  onTabChange?: (tab: 'login' | 'signup') => void;
  onShowPending?: () => void;
}

export function AuthModal({ onLoginSuccess, disclaimerMessage, initialView = 'login', onTabChange, onShowPending }: AuthModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [view, setView] = useState<ViewType>(initialView);
  const navigate = useNavigate();

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Signup form state
  const [companyName, setCompanyName] = useState('');
  const [contactName, setContactName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Forgot password state
  const [forgotEmail, setForgotEmail] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!loginEmail || !loginPassword) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: loginPassword,
    });

    setIsLoading(false);

    if (error) {
      toast({
        title: "Login Failed",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Welcome back!",
      description: "You have successfully logged in.",
    });

    onLoginSuccess?.();
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!companyName || !contactName || !signupEmail || !phoneNumber || !signupPassword || !confirmPassword) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    if (signupPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }

    // Check phone number is exactly 10 digits
    const phoneDigits = phoneNumber.replace(/\D/g, '');
    if (phoneDigits.length !== 10) {
      toast({
        title: "Error",
        description: "Phone number must be exactly 10 digits",
        variant: "destructive",
      });
      return;
    }

    // Password requirements: min 8 chars
    if (signupPassword.length < 8) {
      toast({
        title: "Error",
        description: "Password must be at least 8 characters",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    const redirectUrl = `${window.location.origin}/`;

    const { data, error } = await supabase.auth.signUp({
      email: signupEmail,
      password: signupPassword,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: contactName,
          cell_phone: phoneNumber,
          company_name: companyName,
        },
      },
    });

    setIsLoading(false);

    if (error) {
      toast({
        title: "Signup Failed",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    // If we have a session immediately (email confirmation disabled), treat as login
    if (data.session) {
      toast({
        title: "Account created!",
        description: "Welcome to StayFrank Partner Portal.",
      });

      onLoginSuccess?.();
      return;
    }

    // Otherwise, show the pending view (email confirmation enabled)
    onShowPending?.();
    setView('account-pending');
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!forgotEmail) {
      toast({
        title: "Error",
        description: "Please enter your email address",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    const redirectUrl = `${window.location.origin}/reset-password`;

    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: redirectUrl,
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
      title: "Reset Link Sent",
      description: "Check your email for the password reset link.",
    });

    setView('login');
  };

  // Account Pending View
  if (view === 'account-pending') {
    return (
      <div className="space-y-6">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center mb-4">
            <Clock className="h-8 w-8 text-accent" />
          </div>
          <h2 className="text-xl font-bold text-primary">Account Pending Approval</h2>
          <p className="mt-3 text-sm text-muted-foreground text-center">
            Your account has been created and is pending approval. You will receive an email once your account has been activated.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => setView('login')}
          className="w-full"
        >
          Back to Login
        </Button>
      </div>
    );
  }

  // Forgot Password View
  if (view === 'forgot-password') {
    return (
      <div className="space-y-6">
        <div className="flex flex-col items-center">
          <div className="flex items-center justify-center gap-2 text-primary">
            <Mail className="h-8 w-8" />
            <span className="text-2xl font-bold">Reset Password</span>
          </div>
          <p className="mt-3 text-sm text-muted-foreground text-center">
            Enter your email address and we'll send you a link to reset your password.
          </p>
        </div>

        <form onSubmit={handleForgotPassword} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="forgot-email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="forgot-email"
                type="email"
                placeholder="partner@company.com"
                className="pl-10"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
              />
            </div>
          </div>

          <Button type="submit" className="w-full bg-primary" disabled={isLoading}>
            {isLoading ? "Sending..." : "Send Reset Link"}
          </Button>

          <button
            type="button"
            onClick={() => setView('login')}
            className="flex items-center justify-center gap-2 w-full text-sm text-accent hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Login
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center">
        {/* StayFrank Logo - you'll replace with actual logo */}
        <div className="mb-5 text-center">
          <span className="text-3xl font-bold">
            <span className="text-[hsl(38,78%,57%)]">Stay</span>
            <span className="text-[hsl(276,40%,17%)]">Frank</span>
            <span className="text-[hsl(38,78%,57%)]">.</span>
          </span>
        </div>
        <div className="flex items-center justify-center gap-2 text-primary">
          <Users className="h-8 w-8" />
          <span className="text-2xl font-bold">Partner Portal</span>
        </div>
        {disclaimerMessage && (
          <p className="mt-3 text-sm text-muted-foreground text-center">
            {disclaimerMessage}
          </p>
        )}
      </div>

      <Tabs defaultValue="login" className="w-full" onValueChange={(value) => onTabChange?.(value as 'login' | 'signup')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="login">Login</TabsTrigger>
          <TabsTrigger value="signup">Create Account</TabsTrigger>
        </TabsList>

        <TabsContent value="login" className="space-y-4 pt-4">
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="login-email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="login-email"
                  type="email"
                  placeholder="partner@company.com"
                  className="pl-10"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="login-password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="login-password"
                  type="password"
                  placeholder="••••••••"
                  className="pl-10"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                />
              </div>
            </div>

            <Button type="submit" className="w-full bg-primary" disabled={isLoading}>
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              <button
                type="button"
                onClick={() => setView('forgot-password')}
                className="text-accent hover:underline"
              >
                Forgot your password?
              </button>
            </p>
          </form>
        </TabsContent>

        <TabsContent value="signup" className="space-y-4 pt-4">
          <form onSubmit={handleSignup} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="company-name">Company Name</Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="company-name"
                    type="text"
                    placeholder="Your Company"
                    className="pl-10"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact-name">Contact Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="contact-name"
                    type="text"
                    placeholder="John Smith"
                    className="pl-10"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="signup-email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="partner@company.com"
                    className="pl-10"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone-number">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="phone-number"
                    type="tel"
                    placeholder="5551234567"
                    className="pl-10"
                    maxLength={10}
                    inputMode="numeric"
                    value={phoneNumber}
                    onChange={(e) => {
                      const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setPhoneNumber(digitsOnly);
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="signup-password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="Min 8 characters"
                    className="pl-10"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder="••••••••"
                    className="pl-10"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <Button type="submit" className="w-full bg-primary" disabled={isLoading}>
              {isLoading ? "Creating Account..." : "Create Account"}
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              By creating an account, you agree to our{" "}
              <a href="#" className="text-accent hover:underline">Terms of Service</a>
              {" "}and{" "}
              <a href="#" className="text-accent hover:underline">Privacy Policy</a>
            </p>
          </form>
        </TabsContent>
      </Tabs>
    </div>
  );
}
