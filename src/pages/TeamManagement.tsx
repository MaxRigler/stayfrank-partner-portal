import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/hooks/use-toast';
import { Copy, Users, Link as LinkIcon, ArrowLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { UserMenu } from '@/components/UserMenu';

interface Officer {
  id: string;
  email: string;
  full_name: string | null;
  status: string;
  created_at: string;
}

export default function TeamManagement() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [officers, setOfficers] = useState<Officer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchManagerData = async () => {
      try {
        // Fetch manager's profile including invite token
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('invite_token, full_name, company_name')
          .eq('id', user!.id)
          .maybeSingle();

        if (profileError) throw profileError;
        setInviteToken(profileData?.invite_token);

        // Fetch officers under this manager
        const { data: officerData, error: officerError } = await supabase
          .from('profiles')
          .select('id, email, full_name, status, created_at')
          .eq('parent_id', user!.id)
          .eq('role', 'officer')
          .order('created_at', { ascending: false });

        if (officerError) throw officerError;
        setOfficers(officerData || []);
      } catch (error) {
        console.error('Error fetching manager data:', error);
        toast({
          title: 'Error',
          description: 'Failed to load team data',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchManagerData();
    }
  }, [user]);

  const getInviteLink = () => {
    if (!inviteToken) return '';
    return `${window.location.origin}/join/${inviteToken}`;
  };

  const copyInviteLink = async () => {
    const link = getInviteLink();
    try {
      await navigator.clipboard.writeText(link);
      toast({
        title: 'Copied!',
        description: 'Invite link copied to clipboard',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to copy link',
        variant: 'destructive',
      });
    }
  };

  const getOfficerStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Active</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Pending</Badge>;
      case 'denied':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Denied</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <header className="flex items-center justify-between mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>

          {user && <UserMenu showArrow />}
        </header>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Team Management</h1>
          <p className="text-muted-foreground mt-2">Invite officers and manage your team</p>
        </div>

        {/* Invite Link Card */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LinkIcon className="h-5 w-5" />
              Officer Invite Link
            </CardTitle>
            <CardDescription>
              Share this link with officers to invite them to your team. They'll automatically be added under your account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 p-3 bg-muted rounded-lg font-mono text-sm break-all">
                {getInviteLink()}
              </div>
              <Button onClick={copyInviteLink} className="shrink-0">
                <Copy className="mr-2 h-4 w-4" />
                Copy Link
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Officers Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Your Officers
            </CardTitle>
            <CardDescription>
              {officers.length === 0
                ? 'No officers yet. Share your invite link to get started.'
                : `${officers.length} officer${officers.length === 1 ? '' : 's'} on your team`
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {officers.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No officers have joined yet</p>
                <p className="text-sm mt-1">Share your invite link to add team members</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {officers.map((officer) => (
                    <TableRow key={officer.id}>
                      <TableCell className="font-medium">
                        {officer.full_name || 'N/A'}
                      </TableCell>
                      <TableCell>{officer.email}</TableCell>
                      <TableCell>{getOfficerStatusBadge(officer.status)}</TableCell>
                      <TableCell>
                        {new Date(officer.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
