import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { UserMenu } from '@/components/UserMenu';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { Check, X, LogOut, ArrowLeft, Building2, Phone, Mail, Calendar, ChevronDown, ChevronRight, Users, Ban } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type Profile = Database['public']['Tables']['profiles']['Row'];
type UserStatus = Database['public']['Enums']['user_status'];

interface Officer {
  id: string;
  email: string;
  full_name: string | null;
  status: string;
  created_at: string;
}

export default function AdminDashboard() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [officers, setOfficers] = useState<Record<string, Officer[]>>({});
  const [expandedManagers, setExpandedManagers] = useState<Set<string>>(new Set());
  const [loadingOfficers, setLoadingOfficers] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const { signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    let retryCount = 0;
    const maxRetries = 3;

    const fetchProfiles = async () => {
      try {
        console.log('AdminDashboard: Fetching profiles via REST API...');

        // Get the auth token from localStorage
        const storageKey = 'sb-ximkveundgebbvbgacfu-auth-token';
        const storedData = localStorage.getItem(storageKey);
        let accessToken = '';

        if (storedData) {
          try {
            const parsed = JSON.parse(storedData);
            accessToken = parsed?.access_token || '';
          } catch {
            console.warn('AdminDashboard: Could not parse auth token');
          }
        }

        // Use direct REST API call to bypass Supabase client AbortError issue
        const response = await fetch(
          'https://ximkveundgebbvbgacfu.supabase.co/rest/v1/profiles?select=*&order=created_at.desc',
          {
            method: 'GET',
            headers: {
              'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhpbWt2ZXVuZGdlYmJ2YmdhY2Z1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1ODA2MzQsImV4cCI6MjA4NDE1NjYzNH0.7UGEMBH1SCibG3XavZ1G3cdxJhky0_1aw9Hh1pU3JdQ',
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error('AdminDashboard: REST API error:', response.status, errorText);
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        console.log('AdminDashboard: REST API fetch successful:', data?.length || 0, 'profiles found', data);

        if (mounted) {
          setProfiles(data || []);
          setLoading(false);
        }
      } catch (error: any) {
        console.error('AdminDashboard: Exception fetching profiles:', error);
        // Retry on network errors
        if (retryCount < maxRetries && (error?.message?.includes('fetch') || error?.message?.includes('network'))) {
          retryCount++;
          console.log(`AdminDashboard: Retrying after exception (${retryCount}/${maxRetries})...`);
          setTimeout(fetchProfiles, 1000);
          return;
        }
        if (mounted) {
          toast({
            title: 'Error',
            description: 'Failed to load user profiles',
            variant: 'destructive',
          });
          setLoading(false);
        }
      }
    };

    // Delay initial fetch to allow auth to be ready
    setTimeout(fetchProfiles, 500);

    return () => {
      mounted = false;
    };
  }, [toast]);

  const fetchOfficersForManager = async (managerId: string) => {
    if (officers[managerId]) return; // Already loaded

    setLoadingOfficers(prev => new Set(prev).add(managerId));
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, status, created_at')
        .eq('parent_id', managerId)
        .eq('role', 'officer')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOfficers(prev => ({ ...prev, [managerId]: data || [] }));
    } catch (error) {
      console.error('Error fetching officers:', error);
      toast({
        title: 'Error',
        description: 'Failed to load officers',
        variant: 'destructive',
      });
    } finally {
      setLoadingOfficers(prev => {
        const next = new Set(prev);
        next.delete(managerId);
        return next;
      });
    }
  };

  const toggleManagerExpanded = (managerId: string) => {
    setExpandedManagers(prev => {
      const next = new Set(prev);
      if (next.has(managerId)) {
        next.delete(managerId);
      } else {
        next.add(managerId);
        fetchOfficersForManager(managerId);
      }
      return next;
    });
  };

  const updateStatus = async (profileId: string, newStatus: UserStatus, isOfficer = false, parentId?: string) => {
    setUpdating(profileId);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ status: newStatus })
        .eq('id', profileId);

      if (error) throw error;

      if (isOfficer && parentId) {
        // Update officer in local state
        setOfficers(prev => ({
          ...prev,
          [parentId]: prev[parentId]?.map(o =>
            o.id === profileId ? { ...o, status: newStatus } : o
          ) || []
        }));
      } else {
        // Update manager in local state
        setProfiles(profiles.map(p =>
          p.id === profileId ? { ...p, status: newStatus } : p
        ));
      }

      toast({
        title: 'Success',
        description: `User ${newStatus === 'active' ? 'approved' : 'denied'} successfully`,
      });
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update user status',
        variant: 'destructive',
      });
    } finally {
      setUpdating(null);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const getStatusBadge = (status: UserStatus | string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Active</Badge>;
      case 'denied':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Denied</Badge>;
      case 'pending':
      default:
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Pending</Badge>;
    }
  };

  const filterByStatus = (status: UserStatus) =>
    profiles.filter(p => p.status === status);

  const formatDate = (date: string | null) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getOfficerCount = (managerId: string) => {
    return officers[managerId]?.length || 0;
  };

  const OfficerRow = ({ officer, parentId }: { officer: Officer; parentId: string }) => (
    <TableRow className="bg-muted/30">
      <TableCell className="pl-12">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{officer.full_name || 'N/A'}</span>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-muted-foreground" />
          {officer.email}
        </div>
      </TableCell>
      <TableCell colSpan={2}></TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          {formatDate(officer.created_at)}
        </div>
      </TableCell>
      <TableCell>{getStatusBadge(officer.status)}</TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          {officer.status === 'pending' && (
            <>
              <Button
                size="sm"
                variant="outline"
                className="bg-green-500/10 hover:bg-green-500/20 text-green-400 border-green-500/30"
                onClick={() => updateStatus(officer.id, 'active', true, parentId)}
                disabled={updating === officer.id}
              >
                <Check className="h-4 w-4 mr-1" />
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/30"
                onClick={() => updateStatus(officer.id, 'denied', true, parentId)}
                disabled={updating === officer.id}
              >
                <X className="h-4 w-4 mr-1" />
                Deny
              </Button>
            </>
          )}
          {officer.status === 'active' && (
            <Button
              size="sm"
              variant="outline"
              className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border-amber-500/30"
              onClick={() => updateStatus(officer.id, 'denied', true, parentId)}
              disabled={updating === officer.id}
            >
              <Ban className="h-4 w-4 mr-1" />
              Suspend
            </Button>
          )}
          {officer.status === 'denied' && (
            <Button
              size="sm"
              variant="outline"
              className="bg-green-500/10 hover:bg-green-500/20 text-green-400 border-green-500/30"
              onClick={() => updateStatus(officer.id, 'active', true, parentId)}
              disabled={updating === officer.id}
            >
              <Check className="h-4 w-4 mr-1" />
              Reactivate
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );

  const ManagerRow = ({ profile, showActions = false }: { profile: Profile; showActions?: boolean }) => {
    const isExpanded = expandedManagers.has(profile.id);
    const isLoadingOfficers = loadingOfficers.has(profile.id);
    const managerOfficers = officers[profile.id] || [];
    const officerCount = managerOfficers.length;

    return (
      <>
        <TableRow className="cursor-pointer hover:bg-muted/50" onClick={() => toggleManagerExpanded(profile.id)}>
          <TableCell className="font-medium">
            <div className="flex items-center gap-2">
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
              {profile.full_name || 'N/A'}
              {(officerCount > 0 || isLoadingOfficers) && (
                <Badge variant="outline" className="ml-2 text-xs">
                  {isLoadingOfficers ? '...' : `${officerCount} officer${officerCount !== 1 ? 's' : ''}`}
                </Badge>
              )}
            </div>
          </TableCell>
          <TableCell>
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              {profile.email}
            </div>
          </TableCell>
          <TableCell>
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              {profile.company_name || 'N/A'}
            </div>
          </TableCell>
          <TableCell>
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              {profile.cell_phone || 'N/A'}
            </div>
          </TableCell>
          <TableCell>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              {formatDate(profile.created_at)}
            </div>
          </TableCell>
          <TableCell>{getStatusBadge(profile.status)}</TableCell>
          {showActions && (
            <TableCell className="text-right" onClick={e => e.stopPropagation()}>
              <div className="flex justify-end gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="bg-green-500/10 hover:bg-green-500/20 text-green-400 border-green-500/30"
                  onClick={() => updateStatus(profile.id, 'active')}
                  disabled={updating === profile.id}
                >
                  <Check className="h-4 w-4 mr-1" />
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/30"
                  onClick={() => updateStatus(profile.id, 'denied')}
                  disabled={updating === profile.id}
                >
                  <X className="h-4 w-4 mr-1" />
                  Deny
                </Button>
              </div>
            </TableCell>
          )}
        </TableRow>
        {isExpanded && (
          <>
            {isLoadingOfficers ? (
              <TableRow className="bg-muted/30">
                <TableCell colSpan={showActions ? 7 : 6} className="text-center py-4 text-muted-foreground">
                  Loading officers...
                </TableCell>
              </TableRow>
            ) : managerOfficers.length === 0 ? (
              <TableRow className="bg-muted/30">
                <TableCell colSpan={showActions ? 7 : 6} className="text-center py-4 text-muted-foreground pl-12">
                  <div className="flex items-center justify-center gap-2">
                    <Users className="h-4 w-4" />
                    No officers under this manager
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              managerOfficers.map(officer => (
                <OfficerRow key={officer.id} officer={officer} parentId={profile.id} />
              ))
            )}
          </>
        )}
      </>
    );
  };

  const UserTable = ({ users, showActions = false }: { users: Profile[]; showActions?: boolean }) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Company</TableHead>
          <TableHead>Phone</TableHead>
          <TableHead>Signed Up</TableHead>
          <TableHead>Status</TableHead>
          {showActions && <TableHead className="text-right">Actions</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.length === 0 ? (
          <TableRow>
            <TableCell colSpan={showActions ? 7 : 6} className="text-center text-muted-foreground py-8">
              No managers found
            </TableCell>
          </TableRow>
        ) : (
          users.map((profile) => (
            <ManagerRow key={profile.id} profile={profile} showActions={showActions} />
          ))
        )}
      </TableBody>
    </Table>
  );

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-background overflow-auto">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div className="text-xl font-bold">
              <span className="text-[hsl(38,78%,57%)]">Stay</span>
              <span className="text-[hsl(276,40%,17%)]">Frank</span>
              <span className="text-[hsl(38,78%,57%)]">.</span>
            </div>
            <span className="text-foreground font-semibold">Admin Dashboard</span>
          </div>
          <UserMenu variant="light" />
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-400">{filterByStatus('pending').length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-400">{filterByStatus('active').length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Denied</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-400">{filterByStatus('denied').length}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="pt-6">
            <Tabs defaultValue="pending">
              <TabsList className="mb-4">
                <TabsTrigger value="pending">
                  Pending ({filterByStatus('pending').length})
                </TabsTrigger>
                <TabsTrigger value="active">
                  Active ({filterByStatus('active').length})
                </TabsTrigger>
                <TabsTrigger value="denied">
                  Denied ({filterByStatus('denied').length})
                </TabsTrigger>
              </TabsList>
              <TabsContent value="pending">
                <UserTable users={filterByStatus('pending')} showActions />
              </TabsContent>
              <TabsContent value="active">
                <UserTable users={filterByStatus('active')} />
              </TabsContent>
              <TabsContent value="denied">
                <UserTable users={filterByStatus('denied')} showActions />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
