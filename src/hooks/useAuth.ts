import { useState, useEffect, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type UserRole = 'manager' | 'officer';
type UserStatus = 'pending' | 'active' | 'denied';

interface UseAuthReturn {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  userRole: UserRole | null;
  userStatus: UserStatus | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

// Helper function to get session from localStorage synchronously
// This prevents race conditions when checking auth state before async check completes
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

export function useAuth(): UseAuthReturn {
  // Initialize from localStorage synchronously to prevent race conditions
  const initialSession = getStoredSession();
  const [user, setUser] = useState<User | null>(initialSession?.user ?? null);
  const [session, setSession] = useState<Session | null>(initialSession);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [userStatus, setUserStatus] = useState<UserStatus | null>(null);
  // Only show loading if we have a localStorage session to verify
  // If no localStorage session, we immediately know user is not logged in
  const [isLoading, setIsLoading] = useState(!!initialSession);

  const checkAdminRole = useCallback(async (userId: string) => {
    try {
      console.log('Checking admin role for user:', userId);
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('role', 'admin')
        .maybeSingle();

      console.log('Admin role check result:', { data, error });

      if (error) {
        console.error('Error checking admin role:', error);
        return false;
      }

      const isAdmin = !!data;
      console.log('Is admin:', isAdmin);
      return isAdmin;
    } catch (err) {
      console.error('Error in checkAdminRole:', err);
      return false;
    }
  }, []);

  const fetchUserProfile = useCallback(async (userId: string) => {
    try {
      console.log('Fetching profile for user:', userId);
      const { data, error } = await supabase
        .from('profiles')
        .select('role, status')
        .eq('id', userId)
        .maybeSingle();

      console.log('Profile fetch result:', { data, error });

      if (error) {
        console.error('Error fetching profile:', error);
        return { role: null, status: null };
      }

      const result = {
        role: data?.role as UserRole | null,
        status: data?.status as UserStatus | null,
      };
      console.log('Returning profile:', result);
      return result;
    } catch (err) {
      console.error('Error in fetchUserProfile:', err);
      return { role: null, status: null };
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!user) return;

    const { role, status } = await fetchUserProfile(user.id);
    setUserRole(role);
    setUserStatus(status);

    const adminStatus = await checkAdminRole(user.id);
    setIsAdmin(adminStatus);
  }, [user, fetchUserProfile, checkAdminRole]);

  useEffect(() => {
    let mounted = true;

    // Timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      if (mounted) {
        console.log('useAuth: Timeout reached, forcing isLoading to false');
        setIsLoading(false);
      }
    }, 5000);

    // Initial session check
    console.log('useAuth: Starting session check');
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return;
      console.log('useAuth: Session received:', session ? 'logged in' : 'not logged in');

      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        try {
          const { role, status } = await fetchUserProfile(session.user.id);
          if (mounted) {
            setUserRole(role);
            setUserStatus(status);
          }

          const adminStatus = await checkAdminRole(session.user.id);
          if (mounted) {
            setIsAdmin(adminStatus);
          }
        } catch (err) {
          console.error('useAuth: Error fetching profile/admin status:', err);
        }
      }

      if (mounted) {
        console.log('useAuth: Setting isLoading to false');
        setIsLoading(false);
      }
    }).catch((err) => {
      console.error('useAuth: Session check failed:', err);
      if (mounted) {
        setIsLoading(false);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      console.log('useAuth: Auth state changed:', event);

      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        try {
          const { role, status } = await fetchUserProfile(session.user.id);
          if (mounted) {
            setUserRole(role);
            setUserStatus(status);
          }

          const adminStatus = await checkAdminRole(session.user.id);
          if (mounted) {
            setIsAdmin(adminStatus);
          }
        } catch (err) {
          console.error('useAuth: Error in auth state change handler:', err);
        }
      } else {
        setIsAdmin(false);
        setUserRole(null);
        setUserStatus(null);
      }

      if (mounted) {
        setIsLoading(false);
      }
    });

    return () => {
      mounted = false;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, [fetchUserProfile, checkAdminRole]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setIsAdmin(false);
    setUserRole(null);
    setUserStatus(null);
  }, []);

  return {
    user,
    session,
    isAdmin,
    userRole,
    userStatus,
    isLoading,
    signOut,
    refreshProfile,
  };
}
