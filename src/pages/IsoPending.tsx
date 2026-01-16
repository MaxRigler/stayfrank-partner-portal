import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Clock, Mail } from 'lucide-react';

export default function IsoPending() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="max-w-md mx-auto px-4 text-center">
        {/* StayFrank Logo */}
        <div className="mb-8">
          <span className="text-4xl font-bold">
            <span className="text-[hsl(38,78%,57%)]">Stay</span>
            <span className="text-[hsl(276,40%,17%)]">Frank</span>
            <span className="text-[hsl(38,78%,57%)]">.</span>
          </span>
        </div>

        {/* Pending Icon */}
        <div className="w-20 h-20 rounded-full bg-accent/20 flex items-center justify-center mx-auto mb-6">
          <Clock className="h-10 w-10 text-accent" />
        </div>

        <h1 className="text-2xl font-bold text-foreground mb-4">
          Account Pending Approval
        </h1>

        <p className="text-muted-foreground mb-6">
          Thank you for signing up! Your account is pending approval from the StayFrank team. 
          You'll receive an email once your account has been activated.
        </p>

        <div className="p-4 bg-secondary rounded-xl border border-border mb-8">
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Mail className="h-4 w-4" />
            <span>We'll notify you at your registered email</span>
          </div>
        </div>

        <Button
          variant="outline"
          onClick={() => navigate('/')}
          className="w-full"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Home
        </Button>
      </div>
    </div>
  );
}
