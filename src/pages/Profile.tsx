import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, User, Building2, Phone, Mail, Shield, Activity, Save, ArrowLeft, Link as LinkIcon, Users, Copy, Check, X, Ban } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { UserMenu } from '@/components/UserMenu';

interface Officer {
    id: string;
    email: string;
    full_name: string | null;
    status: string;
    created_at: string;
}

export default function Profile() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    // Supabase config for raw fetch - bypass AbortController issues
    const SUPABASE_URL = "https://ximkveundgebbvbgacfu.supabase.co";
    const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhpbWt2ZXVuZGdlYmJ2YmdhY2Z1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1ODA2MzQsImV4cCI6MjA4NDE1NjYzNH0.7UGEMBH1SCibG3XavZ1G3cdxJhky0_1aw9Hh1pU3JdQ";

    // Get stored session data synchronously for instant load
    const getStoredSessionData = () => {
        try {
            const storedData = localStorage.getItem('sb-ximkveundgebbvbgacfu-auth-token');
            if (storedData) {
                const parsed = JSON.parse(storedData);
                const expiresAt = new Date((parsed?.expires_at || 0) * 1000);
                if (expiresAt > new Date()) {
                    return {
                        userId: parsed?.user?.id || null,
                        email: parsed?.user?.email || '',
                        accessToken: parsed?.access_token || SUPABASE_ANON_KEY,
                        metadata: parsed?.user?.user_metadata || {},
                    };
                }
            }
        } catch { }
        return null;
    };

    // Get initial data from localStorage synchronously for INSTANT render
    const storedSession = getStoredSessionData();
    const initialMetadata = storedSession?.metadata || {};

    // Initialize form data from localStorage immediately - NO loading spinner!
    const [formData, setFormData] = useState({
        full_name: initialMetadata.full_name || '',
        company_name: initialMetadata.company_name || '',
        cell_phone: initialMetadata.cell_phone || '',
        email: storedSession?.email || '',
        role: 'manager', // Default - will be updated from API
        status: 'pending', // Default - will be updated from API
    });

    // Team Management state (for managers)
    const [inviteToken, setInviteToken] = useState<string | null>(null);
    const [officers, setOfficers] = useState<Officer[]>([]);
    const [updatingOfficer, setUpdatingOfficer] = useState<string | null>(null);

    // Track if we've fetched from database to show more accurate role/status
    const [hasFetchedFromDb, setHasFetchedFromDb] = useState(false);

    // Background fetch to update data from database (runs after initial render)
    useEffect(() => {
        let mounted = true;

        const fetchProfileFromDatabase = async () => {
            const sessionData = getStoredSessionData();
            if (!sessionData?.userId) return;

            try {
                const response = await fetch(
                    `${SUPABASE_URL}/rest/v1/profiles?id=eq.${sessionData.userId}&select=full_name,company_name,cell_phone,email,role,status,invite_token`,
                    {
                        method: 'GET',
                        headers: {
                            'apikey': SUPABASE_ANON_KEY,
                            'Authorization': `Bearer ${sessionData.accessToken}`,
                            'Content-Type': 'application/json',
                        }
                    }
                );

                if (response.ok && mounted) {
                    const data = await response.json();
                    if (data && data.length > 0) {
                        const profile = data[0];
                        setFormData(prev => ({
                            full_name: profile.full_name || prev.full_name,
                            company_name: profile.company_name || prev.company_name,
                            cell_phone: profile.cell_phone || prev.cell_phone,
                            email: profile.email || prev.email,
                            role: profile.role || prev.role,
                            status: profile.status || prev.status,
                        }));
                        setInviteToken(profile.invite_token);
                        setHasFetchedFromDb(true);

                        // Fetch officers if user is a manager
                        if (profile.role === 'manager') {
                            const officerResponse = await fetch(
                                `${SUPABASE_URL}/rest/v1/profiles?parent_id=eq.${sessionData.userId}&role=eq.officer&select=id,email,full_name,status,created_at&order=created_at.desc`,
                                {
                                    method: 'GET',
                                    headers: {
                                        'apikey': SUPABASE_ANON_KEY,
                                        'Authorization': `Bearer ${sessionData.accessToken}`,
                                        'Content-Type': 'application/json',
                                    }
                                }
                            );

                            if (officerResponse.ok && mounted) {
                                const officerData = await officerResponse.json();
                                setOfficers(officerData || []);
                            }
                        }
                    }
                }
            } catch (error) {
                console.warn('Background profile fetch failed:', error);
            }
        };

        // Start background fetch immediately - page is already rendered with localStorage data
        fetchProfileFromDatabase();

        return () => {
            mounted = false;
        };
    }, []); // Empty dependency - runs once on mount

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({
            ...prev,
            [e.target.name]: e.target.value,
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        setLoading(true);

        try {
            const { error } = await supabase
                .from('profiles')
                .update({
                    full_name: formData.full_name,
                    company_name: formData.company_name,
                    cell_phone: formData.cell_phone,
                })
                .eq('id', user.id);

            if (error) throw error;

            toast({
                title: 'Profile updated',
                description: 'Your changes have been saved successfully.',
            });

        } catch (error: unknown) {
            console.error('Update error:', error);
            toast({
                title: 'Error',
                description: (error as Error).message || 'Failed to update profile',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    // No loading spinner needed - we load data from localStorage instantly
    // If user is not logged in, redirect to home
    if (!storedSession?.userId) {
        return (
            <div className="fixed inset-0 z-10 flex items-center justify-center bg-white">
                <div className="text-center">
                    <p className="text-muted-foreground">Please log in to view your profile.</p>
                    <Button className="mt-4" onClick={() => navigate('/')}>Go Home</Button>
                </div>
            </div>
        );
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'active':
                return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30">Active</Badge>;
            case 'pending':
                return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 hover:bg-amber-500/30">Pending</Badge>;
            case 'denied':
                return <Badge className="bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30">Denied</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    // Team Management functions
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
        } catch {
            toast({
                title: 'Error',
                description: 'Failed to copy link',
                variant: 'destructive',
            });
        }
    };

    const updateOfficerStatus = async (officerId: string, newStatus: 'active' | 'pending' | 'denied') => {
        setUpdatingOfficer(officerId);
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ status: newStatus })
                .eq('id', officerId)
                .eq('parent_id', user!.id); // Security: only update own officers

            if (error) throw error;

            setOfficers(officers.map(o =>
                o.id === officerId ? { ...o, status: newStatus } : o
            ));

            const statusLabel = newStatus === 'active' ? 'approved' : newStatus === 'denied' ? 'denied' : 'updated';
            toast({
                title: 'Success',
                description: `Officer ${statusLabel} successfully`,
            });
        } catch (error) {
            console.error('Error updating officer status:', error);
            toast({
                title: 'Error',
                description: 'Failed to update officer status',
                variant: 'destructive',
            });
        } finally {
            setUpdatingOfficer(null);
        }
    };

    return (
        <div className="fixed inset-0 z-10 bg-white overflow-auto">
            {/* Header */}
            <header className="border-b border-border bg-white px-4 py-3">
                <div className="flex items-center justify-between max-w-2xl mx-auto">
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        {/* StayFrank Logo */}
                        <div className="text-xl font-bold">
                            <span className="text-[hsl(38,78%,57%)]">Stay</span>
                            <span className="text-[hsl(var(--purple-deep))]">Frank</span>
                            <span className="text-[hsl(38,78%,57%)]">.</span>
                        </div>
                    </div>
                    <UserMenu variant="light" />
                </div>
            </header>

            <div className="p-4 md:p-8">
                <div className="max-w-2xl mx-auto space-y-6">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Profile Settings</h1>
                        <p className="text-muted-foreground mt-1">
                            Manage your account details and view your status.
                        </p>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>Personal Information</CardTitle>
                            <CardDescription>
                                Update your personal details here.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="full_name" className="flex items-center gap-2">
                                            <User className="w-4 h-4 text-muted-foreground" />
                                            Full Name
                                        </Label>
                                        <Input
                                            id="full_name"
                                            name="full_name"
                                            value={formData.full_name}
                                            onChange={handleChange}
                                            placeholder="John Doe"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="company_name" className="flex items-center gap-2">
                                            <Building2 className="w-4 h-4 text-muted-foreground" />
                                            Company Name
                                        </Label>
                                        <Input
                                            id="company_name"
                                            name="company_name"
                                            value={formData.company_name}
                                            onChange={handleChange}
                                            placeholder="Acme Corp"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="cell_phone" className="flex items-center gap-2">
                                            <Phone className="w-4 h-4 text-muted-foreground" />
                                            Phone Number
                                        </Label>
                                        <Input
                                            id="cell_phone"
                                            name="cell_phone"
                                            value={formData.cell_phone}
                                            onChange={handleChange}
                                            placeholder="(555) 123-4567"
                                            type="tel"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="email" className="flex items-center gap-2">
                                            <Mail className="w-4 h-4 text-muted-foreground" />
                                            Email Address
                                        </Label>
                                        <Input
                                            id="email"
                                            value={formData.email}
                                            disabled
                                            className="bg-muted text-muted-foreground"
                                        />
                                        <p className="text-[0.8rem] text-muted-foreground">
                                            Email cannot be changed directly using this form.
                                        </p>
                                    </div>
                                </div>

                                <div className="flex justify-end pt-4">
                                    <Button type="submit" disabled={loading}>
                                        {loading ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Saving...
                                            </>
                                        ) : (
                                            <>
                                                <Save className="mr-2 h-4 w-4" />
                                                Save Changes
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Account Status</CardTitle>
                            <CardDescription>
                                View your current role and account standing.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="flex items-center justify-between p-4 border rounded-lg bg-card/50">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-primary/10 rounded-full">
                                            <Shield className="w-5 h-5 text-primary" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium">Account Role</p>
                                            <p className="text-2xl font-bold capitalize">{formData.role}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between p-4 border rounded-lg bg-card/50">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-primary/10 rounded-full">
                                            <Activity className="w-5 h-5 text-primary" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium">Status</p>
                                            <div className="mt-1">
                                                {getStatusBadge(formData.status)}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Team Management Section - Only visible for managers */}
                    {formData.role === 'manager' && (
                        <>
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <LinkIcon className="h-5 w-5" />
                                        Officer Invite Link
                                    </CardTitle>
                                    <CardDescription className="text-left">
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

                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Users className="h-5 w-5" />
                                        Your Officers
                                    </CardTitle>
                                    <CardDescription className="text-left">
                                        {officers.length === 0
                                            ? 'No officers yet. Share your invite link to get started.'
                                            : `${officers.length} officer${officers.length === 1 ? '' : 's'} on your team`
                                        }
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {officers.length === 0 ? (
                                        <div className="text-left py-12 text-muted-foreground">
                                            <Users className="h-12 w-12 mb-4 opacity-50" />
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
                                                    <TableHead className="text-right">Actions</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {officers.map((officer) => (
                                                    <TableRow key={officer.id}>
                                                        <TableCell className="font-medium">
                                                            {officer.full_name || 'N/A'}
                                                        </TableCell>
                                                        <TableCell>{officer.email}</TableCell>
                                                        <TableCell>{getStatusBadge(officer.status)}</TableCell>
                                                        <TableCell>
                                                            {new Date(officer.created_at).toLocaleDateString()}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <div className="flex justify-end gap-2">
                                                                {officer.status === 'pending' && (
                                                                    <>
                                                                        <Button
                                                                            size="sm"
                                                                            variant="outline"
                                                                            className="bg-green-500/10 hover:bg-green-500/20 text-green-400 border-green-500/30"
                                                                            onClick={() => updateOfficerStatus(officer.id, 'active')}
                                                                            disabled={updatingOfficer === officer.id}
                                                                        >
                                                                            <Check className="h-4 w-4 mr-1" />
                                                                            Approve
                                                                        </Button>
                                                                        <Button
                                                                            size="sm"
                                                                            variant="outline"
                                                                            className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/30"
                                                                            onClick={() => updateOfficerStatus(officer.id, 'denied')}
                                                                            disabled={updatingOfficer === officer.id}
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
                                                                        onClick={() => updateOfficerStatus(officer.id, 'denied')}
                                                                        disabled={updatingOfficer === officer.id}
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
                                                                        onClick={() => updateOfficerStatus(officer.id, 'active')}
                                                                        disabled={updatingOfficer === officer.id}
                                                                    >
                                                                        <Check className="h-4 w-4 mr-1" />
                                                                        Reactivate
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    )}
                                </CardContent>
                            </Card>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
