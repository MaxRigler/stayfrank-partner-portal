import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { AuthModal } from "@/components/AuthModal";
import { Badge } from "@/components/ui/badge";
import { User, LogOut, ChevronDown, UserCog, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface UserMenuProps {
    className?: string;
    variant?: 'default' | 'light';
}

// Helper function to get full user data from localStorage synchronously
interface StoredUserData {
    id: string;
    email?: string;
    full_name?: string;
    company_name?: string;
}

// Helper to get cached admin status synchronously
function getCachedAdminStatus(userId: string): boolean {
    try {
        const cached = localStorage.getItem(`admin_status_${userId}`);
        return cached === 'true';
    } catch {
        return false;
    }
}

// Helper to cache admin status
function setCachedAdminStatus(userId: string, isAdmin: boolean): void {
    try {
        localStorage.setItem(`admin_status_${userId}`, isAdmin ? 'true' : 'false');
    } catch {
        // Ignore localStorage errors
    }
}

// Module-level tracking for pending admin checks - survives React Strict Mode remounts
const pendingAdminChecks = new Map<string, Promise<boolean>>();

// Supabase config for raw fetch - bypass the Supabase client's internal AbortController
const SUPABASE_URL = "https://ximkveundgebbvbgacfu.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhpbWt2ZXVuZGdlYmJ2YmdhY2Z1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1ODA2MzQsImV4cCI6MjA4NDE1NjYzNH0.7UGEMBH1SCibG3XavZ1G3cdxJhky0_1aw9Hh1pU3JdQ";

// Single function to check admin status that can be shared across component instances
async function checkAdminRoleOnce(userId: string): Promise<boolean> {
    // If there's already a pending check for this user, return that promise
    const existingCheck = pendingAdminChecks.get(userId);
    if (existingCheck) {
        console.log('UserMenu: Reusing existing admin check for user:', userId);
        return existingCheck;
    }

    // Create the check promise using raw fetch to bypass Supabase client's AbortController
    const checkPromise = (async () => {
        try {
            console.log('UserMenu: Making fresh admin role API call (raw fetch) for user:', userId);

            // Get access token for authenticated request
            const storedData = localStorage.getItem('sb-ximkveundgebbvbgacfu-auth-token');
            let accessToken = '';
            if (storedData) {
                try {
                    const parsed = JSON.parse(storedData);
                    accessToken = parsed?.access_token || '';
                } catch { }
            }

            // Use raw fetch without any AbortController
            const response = await fetch(
                `${SUPABASE_URL}/rest/v1/user_roles?user_id=eq.${userId}&role=eq.admin&select=role`,
                {
                    method: 'GET',
                    headers: {
                        'apikey': SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${accessToken || SUPABASE_ANON_KEY}`,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=representation'
                    }
                }
            );

            if (!response.ok) {
                console.warn('UserMenu: Admin role check HTTP error:', response.status);
                return getCachedAdminStatus(userId);
            }

            const data = await response.json();
            const isAdmin = Array.isArray(data) && data.length > 0;
            console.log('UserMenu: Admin role API result (raw fetch):', isAdmin);
            setCachedAdminStatus(userId, isAdmin);
            return isAdmin;
        } catch (err: any) {
            console.warn('UserMenu: Admin role check exception:', err?.message || err);
            // On exception, return cached status or false  
            return getCachedAdminStatus(userId);
        } finally {
            // Clean up after a delay to allow for race conditions
            setTimeout(() => {
                pendingAdminChecks.delete(userId);
            }, 1000);
        }
    })();

    // Store the pending check
    pendingAdminChecks.set(userId, checkPromise);
    return checkPromise;
}

function getStoredUser(): StoredUserData | null {
    const storageKey = 'sb-ximkveundgebbvbgacfu-auth-token';
    try {
        const storedData = localStorage.getItem(storageKey);
        if (!storedData) return null;

        const parsed = JSON.parse(storedData);
        if (parsed?.access_token && parsed?.user && parsed?.expires_at) {
            // Check if token is expired
            const expiresAt = new Date(parsed.expires_at * 1000);
            if (expiresAt > new Date()) {
                const user = parsed.user;
                // Extract user_metadata which contains full_name and company_name
                const metadata = user.user_metadata || {};
                return {
                    id: user.id,
                    email: user.email,
                    full_name: metadata.full_name || null,
                    company_name: metadata.company_name || null,
                };
            }
        }
    } catch (e) {
        console.warn('UserMenu: Could not parse stored session:', e);
    }
    return null;
}

export function UserMenu({ className, variant = 'default' }: UserMenuProps) {
    const navigate = useNavigate();

    // Get user from localStorage synchronously on first render
    const storedUser = getStoredUser();
    const [user, setUser] = useState(storedUser);
    const [profile, setProfile] = useState<{ full_name: string | null; company_name: string | null; status: string | null } | null>(null);
    // Initialize isAdmin from cached value for instant display
    const [isAdmin, setIsAdmin] = useState(() => storedUser ? getCachedAdminStatus(storedUser.id) : false);
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);
    const [showPendingModal, setShowPendingModal] = useState(false);
    const [isWideModal, setIsWideModal] = useState(false);

    // Fetch profile data with retry logic
    useEffect(() => {
        let mounted = true;
        let retryCount = 0;
        const maxRetries = 3;

        const fetchProfile = async () => {
            const currentUser = user || storedUser;
            if (!currentUser?.id) {
                console.log('UserMenu: No user ID available for profile fetch');
                return;
            }

            try {
                console.log('UserMenu: Fetching profile for user:', currentUser.id);
                const { data, error } = await supabase
                    .from('profiles')
                    .select('full_name, company_name, status')
                    .eq('id', currentUser.id)
                    .single();

                if (error) {
                    console.warn('UserMenu: Profile fetch returned error:', error.message);
                    // Retry on certain errors
                    if (retryCount < maxRetries && (error.message.includes('abort') || error.message.includes('AbortError'))) {
                        retryCount++;
                        console.log(`UserMenu: Retrying profile fetch (${retryCount}/${maxRetries})...`);
                        setTimeout(fetchProfile, 1000);
                        return;
                    }
                }

                if (data && mounted) {
                    const profileData = data as { full_name: string | null; company_name: string | null; status: string | null };
                    console.log('UserMenu: Profile loaded:', profileData.full_name, profileData.company_name);
                    setProfile(profileData);
                }
            } catch (err: any) {
                console.warn('UserMenu: Error fetching profile:', err?.message || err);
                // Retry on AbortError
                if (retryCount < maxRetries && err?.name === 'AbortError') {
                    retryCount++;
                    console.log(`UserMenu: Retrying after error (${retryCount}/${maxRetries})...`);
                    setTimeout(fetchProfile, 1000);
                }
            }
        };

        // Initial fetch
        fetchProfile();

        return () => {
            mounted = false;
        };
    }, [user, storedUser]);

    // Separate useEffect for admin role check - uses module-level deduplication
    // This survives React Strict Mode remounts by sharing a single pending promise
    useEffect(() => {
        let mounted = true;

        const checkAdmin = async () => {
            const currentUser = user || storedUser;
            if (!currentUser?.id) return;

            // Set from cache immediately for instant UI display
            const cachedStatus = getCachedAdminStatus(currentUser.id);
            if (cachedStatus && mounted) {
                console.log('UserMenu: Setting admin from cache');
                setIsAdmin(true);
            }

            // Use the module-level function for the API check
            // This ensures only one API call is made even if the component remounts
            const isAdminResult = await checkAdminRoleOnce(currentUser.id);
            if (mounted) {
                setIsAdmin(isAdminResult);
            }
        };

        checkAdmin();

        return () => {
            mounted = false;
        };
    }, [user, storedUser]);

    // Listen for auth state changes (for real-time updates)
    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.user) {
                // Extract the same data format as getStoredUser
                const metadata = session.user.user_metadata || {};
                setUser({
                    id: session.user.id,
                    email: session.user.email || undefined,
                    full_name: metadata.full_name || undefined,
                    company_name: metadata.company_name || undefined,
                });
            } else {
                setUser(null);
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const handleNavigation = (path: string) => {
        setIsPopoverOpen(false);
        if (profile?.status === 'pending') {
            setShowPendingModal(true);
        } else {
            // Use setTimeout to ensure navigation happens after popover closes
            // This prevents React re-renders from interfering with navigation
            setTimeout(() => {
                navigate(path);
            }, 0);
        }
    };

    const handleSignOut = () => {
        setIsPopoverOpen(false);
        // Clear localStorage first to ensure sign-out works even if API call is aborted
        localStorage.removeItem('sb-ximkveundgebbvbgacfu-auth-token');
        // Also clear admin status cache
        if (user?.id) {
            localStorage.removeItem(`admin_status_${user.id}`);
        }
        // Fire and forget the Supabase signOut - don't await to prevent AbortError issues
        supabase.auth.signOut().catch((err) => {
            console.warn('Sign out API call failed (expected if aborted):', err);
        });
        // Always redirect regardless of API success
        window.location.href = '/';
    };

    const getStatusBadge = () => {
        // If we have a valid session in localStorage but profile hasn't loaded yet,
        // assume 'active' since being logged in means they were approved
        const status = profile?.status || 'active';
        switch (status) {
            case 'active':
                return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100">Active</Badge>;
            case 'pending':
                return <Badge className="bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100">Pending</Badge>;
            case 'denied':
                return <Badge className="bg-red-100 text-red-700 border-red-200 hover:bg-red-100">Denied</Badge>;
            default:
                return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100">Active</Badge>;
        }
    };

    // Don't render if no user from localStorage
    const currentUser = user || storedUser;
    if (!currentUser) return null;

    // Prioritize localStorage data (user_metadata) which is always available immediately
    // Fall back to profile data if localStorage doesn't have it
    const displayName = storedUser?.full_name || profile?.full_name || currentUser.email?.split('@')[0] || 'User';
    const displayCompany = storedUser?.company_name || profile?.company_name || '';

    return (
        <>
            <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                <PopoverTrigger asChild>
                    {/* Styled button - supports purple (default) and light (white) variants */}
                    <button
                        type="button"
                        className={`
                            flex items-center gap-2 md:gap-3 px-2 md:px-4 py-2 md:py-3
                            transition-all duration-200 cursor-pointer
                            ${variant === 'light'
                                ? 'bg-transparent hover:bg-gray-50 text-gray-800'
                                : 'bg-[hsl(var(--purple-medium))] hover:bg-[hsl(var(--purple-deep))] text-white rounded-lg shadow-lg'
                            }
                            ${className}
                        `}
                    >
                        <User className={`w-5 h-5 ${variant === 'light' ? 'text-[hsl(var(--purple-medium))]' : 'opacity-80'}`} />
                        {/* Hide name and company on mobile to prevent overlap with wizard steps */}
                        <div className="hidden md:flex flex-col items-start text-left leading-tight">
                            <span className="text-sm font-semibold">{displayName}</span>
                            {displayCompany && (
                                <span className={`text-xs ${variant === 'light' ? 'text-gray-500' : 'opacity-70'}`}>{displayCompany}</span>
                            )}
                        </div>
                        <ChevronDown className={`w-4 h-4 ${variant === 'light' ? 'text-gray-400' : 'opacity-60'}`} />
                    </button>
                </PopoverTrigger>
                <PopoverContent
                    className="w-64 p-0 shadow-xl border border-gray-200 rounded-xl overflow-hidden"
                    align="end"
                    sideOffset={8}
                >
                    {/* Header section with user info */}
                    <div className="p-4 bg-white border-b border-gray-100">
                        <p className="font-semibold text-gray-900 truncate">
                            {displayName}
                        </p>
                        <p className="text-sm text-[hsl(var(--purple-medium))] truncate">
                            {displayCompany || currentUser.email}
                        </p>
                    </div>

                    {/* Account status section */}
                    <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                        <p className="text-xs text-gray-500 mb-1.5">Account Status</p>
                        {getStatusBadge()}
                    </div>

                    {/* Menu items */}
                    <div className="py-2 bg-white">
                        <button
                            type="button"
                            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors text-left"
                            onClick={() => handleNavigation('/profile')}
                        >
                            <UserCog className="w-4 h-4 text-gray-500" />
                            <span className="text-sm text-gray-700">Profile Settings</span>
                        </button>

                        {/* Admin Dashboard - only shown for admins */}
                        {isAdmin && (
                            <button
                                type="button"
                                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors text-left"
                                onClick={() => handleNavigation('/admin')}
                            >
                                <Shield className="w-4 h-4 text-[hsl(var(--purple-medium))]" />
                                <span className="text-sm text-gray-700">Admin Dashboard</span>
                            </button>
                        )}

                    </div>

                    {/* Sign out section */}
                    <div className="py-2 bg-white border-t border-gray-100">
                        <button
                            type="button"
                            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors text-left"
                            onClick={handleSignOut}
                        >
                            <LogOut className="w-4 h-4 text-red-500" />
                            <span className="text-sm text-red-500">Sign Out</span>
                        </button>
                    </div>
                </PopoverContent>
            </Popover>

            <Dialog open={showPendingModal} onOpenChange={(open) => {
                setShowPendingModal(open);
                if (!open) {
                    setIsWideModal(false);
                }
            }}>
                <DialogContent className={`max-w-[calc(100%-2rem)] rounded-lg transition-all duration-300 ease-in-out ${isWideModal ? 'sm:max-w-2xl' : 'sm:max-w-md'}`}>
                    <AuthModal
                        initialView="account-pending"
                        onTabChange={(tab) => setIsWideModal(tab === 'signup')}
                    />
                </DialogContent>
            </Dialog>
        </>
    );
}

