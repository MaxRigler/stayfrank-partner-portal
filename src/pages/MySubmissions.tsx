import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, Home, Calendar, ArrowLeft, Loader2 } from 'lucide-react';
import { formatCurrency } from '@/lib/heaCalculator';

interface Submission {
  id: string;
  property_address: string;
  owner_names: string[];
  created_at: string;
  sl_eligible: boolean;
  hei_eligible: boolean;
  sl_offer_amount: number | null;
  hei_max_investment: number | null;
}

export default function MySubmissions() {
  const navigate = useNavigate();
  const { user, isAdmin, userRole } = useAuth();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSubmissions = async () => {
      if (!user) return;

      setIsLoading(true);
      try {
        let query = supabase
          .from('submissions')
          .select('id, property_address, owner_names, created_at, sl_eligible, hei_eligible, sl_offer_amount, hei_max_investment')
          .order('created_at', { ascending: false });

        // If manager, also fetch officer submissions
        if (userRole === 'manager') {
          // Get all officers under this manager
          const { data: officers } = await supabase
            .from('profiles')
            .select('id')
            .eq('parent_id', user.id);

          const officerIds = officers?.map(o => o.id) || [];
          const allUserIds = [user.id, ...officerIds];

          query = query.in('user_id', allUserIds);
        } else if (!isAdmin) {
          // Regular user - only own submissions
          query = query.eq('user_id', user.id);
        }
        // Admin sees all (no filter)

        const { data, error } = await query;

        if (error) {
          console.error('Error fetching submissions:', error);
        } else {
          setSubmissions(data || []);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchSubmissions();
  }, [user, isAdmin, userRole]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getOwnerName = (ownerNames: string[]) => {
    if (!ownerNames || ownerNames.length === 0) return 'Unknown';
    return ownerNames[0];
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div className="text-2xl font-bold">
                <span className="text-[hsl(38,78%,57%)]">Stay</span>
                <span className="text-[hsl(276,40%,17%)]">Frank</span>
                <span className="text-[hsl(38,78%,57%)]">.</span>
              </div>
            </div>
            <h1 className="text-xl font-semibold text-foreground">My Submissions</h1>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-accent" />
          </div>
        ) : submissions.length === 0 ? (
          <div className="text-center py-12">
            <Home className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
            <h2 className="text-xl font-semibold text-muted-foreground mb-2">No Submissions Yet</h2>
            <p className="text-muted-foreground mb-6">
              You haven't submitted any properties yet. Start by checking a property's eligibility.
            </p>
            <Button onClick={() => navigate('/')} className="bg-accent hover:bg-accent/90">
              Submit a Property
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Property Address</th>
                    <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Homeowner</th>
                    <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Submitted</th>
                    <th className="text-center py-3 px-4 font-semibold text-muted-foreground">Sale-Leaseback</th>
                    <th className="text-center py-3 px-4 font-semibold text-muted-foreground">HEI</th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.map((submission) => (
                    <tr key={submission.id} className="border-b border-border hover:bg-secondary/50">
                      <td className="py-4 px-4">
                        <div className="font-medium text-foreground">{submission.property_address}</div>
                      </td>
                      <td className="py-4 px-4 text-muted-foreground">
                        {getOwnerName(submission.owner_names)}
                      </td>
                      <td className="py-4 px-4 text-muted-foreground text-sm">
                        {formatDate(submission.created_at)}
                      </td>
                      <td className="py-4 px-4 text-center">
                        {submission.sl_eligible ? (
                          <span className="inline-flex items-center gap-1 text-[hsl(var(--success))]">
                            <CheckCircle2 className="h-4 w-4" />
                            Yes
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-destructive">
                            <XCircle className="h-4 w-4" />
                            No
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-center">
                        {submission.hei_eligible ? (
                          <span className="inline-flex items-center gap-1 text-[hsl(var(--success))]">
                            <CheckCircle2 className="h-4 w-4" />
                            Yes
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-destructive">
                            <XCircle className="h-4 w-4" />
                            No
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-4">
              {submissions.map((submission) => (
                <div key={submission.id} className="bg-card rounded-xl border border-border p-4 space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Property</p>
                    <p className="font-medium text-foreground">{submission.property_address}</p>
                  </div>
                  <div className="flex justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Homeowner</p>
                      <p className="text-sm text-foreground">{getOwnerName(submission.owner_names)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Submitted</p>
                      <p className="text-sm text-foreground">{formatDate(submission.created_at)}</p>
                    </div>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-border">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Sale-Leaseback:</span>
                      {submission.sl_eligible ? (
                        <span className="inline-flex items-center gap-1 text-[hsl(var(--success))] text-sm">
                          <CheckCircle2 className="h-4 w-4" />
                          Yes
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-destructive text-sm">
                          <XCircle className="h-4 w-4" />
                          No
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">HEI:</span>
                      {submission.hei_eligible ? (
                        <span className="inline-flex items-center gap-1 text-[hsl(var(--success))] text-sm">
                          <CheckCircle2 className="h-4 w-4" />
                          Yes
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-destructive text-sm">
                          <XCircle className="h-4 w-4" />
                          No
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
