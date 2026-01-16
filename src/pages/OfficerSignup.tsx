import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { UserPlus, Loader2 } from 'lucide-react';

interface ManagerInfo {
  full_name: string | null;
  company_name: string | null;
}

export default function OfficerSignup() {
  const { inviteToken } = useParams<{ inviteToken: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [isValidToken, setIsValidToken] = useState(false);
  const [managerInfo, setManagerInfo] = useState<ManagerInfo | null>(null);

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    cellPhone: '',
    password: '',
    confirmPassword: '',
  });

  useEffect(() => {
    const validateInviteToken = async () => {
      if (!inviteToken) {
        setValidating(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('full_name, company_name')
          .eq('invite_token', inviteToken)
          .eq('role', 'manager')
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setIsValidToken(true);
          setManagerInfo(data);
        }
      } catch (error) {
        console.error('Error validating invite token:', error);
      } finally {
        setValidating(false);
      }
    };

    validateInviteToken();
  }, [inviteToken]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: 'Error',
        description: 'Passwords do not match',
        variant: 'destructive',
      });
      return;
    }

    if (formData.password.length < 6) {
      toast({
        title: 'Error',
        description: 'Password must be at least 6 characters',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: formData.fullName,
            cell_phone: formData.cellPhone,
            invite_token: inviteToken,
          },
        },
      });

      if (error) throw error;

      toast({
        title: 'Account created!',
        description: 'You have been registered as an officer. Redirecting...',
      });

      // Navigate to home after successful signup
      setTimeout(() => navigate('/'), 2000);
    } catch (error: unknown) {
      console.error('Signup error:', error);
      toast({
        title: 'Error',
        description: (error as Error).message || 'Failed to create account',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (validating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isValidToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <CardTitle className="text-destructive">Invalid Invite Link</CardTitle>
            <CardDescription>
              This invite link is invalid or has expired. Please contact your manager for a new invitation.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => navigate('/')}
              className="w-full"
              variant="outline"
            >
              Go to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="text-3xl font-bold mb-4">
            <span className="text-[hsl(38,78%,57%)]">Stay</span>
            <span className="text-[hsl(276,40%,17%)]">Frank</span>
            <span className="text-[hsl(38,78%,57%)]">.</span>
          </div>
          <CardTitle className="flex items-center justify-center gap-2">
            <UserPlus className="h-5 w-5" />
            Join as Officer
          </CardTitle>
          <CardDescription>
            {managerInfo?.company_name
              ? `You've been invited to join ${managerInfo.company_name}`
              : managerInfo?.full_name
                ? `You've been invited by ${managerInfo.full_name}`
                : "You've been invited to join as an officer"
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                name="fullName"
                type="text"
                value={formData.fullName}
                onChange={handleChange}
                required
                placeholder="John Doe"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder="john@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cellPhone">Cell Phone</Label>
              <Input
                id="cellPhone"
                name="cellPhone"
                type="tel"
                value={formData.cellPhone}
                onChange={handleChange}
                placeholder="(555) 123-4567"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                required
                placeholder="••••••••"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                placeholder="••••••••"
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Account...
                </>
              ) : (
                'Create Account'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
