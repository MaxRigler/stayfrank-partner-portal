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

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [userStatus, setUserStatus] = useState<UserStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkAdminRole = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('role', 'admin')
        .maybeSingle();

      if (error) {
        console.error('Error checking admin role:', error);
        return false;
      }

      return !!data;
    } catch (err) {
      console.error('Error in checkAdminRole:', err);
      return false;
    }
  }, []);

  const fetchUserProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role, status')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile:', error);
        return { role: null, status: null };
      }

      return {
        role: data?.role as UserRole | null,
        status: data?.status as UserStatus | null,
      };
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

    // Initial session check
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return;

      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        const { role, status } = await fetchUserProfile(session.user.id);
        if (mounted) {
          setUserRole(role);
          setUserStatus(status);
        }

        const adminStatus = await checkAdminRole(session.user.id);
        if (mounted) {
          setIsAdmin(adminStatus);
        }
      }

      if (mounted) {
        setIsLoading(false);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        const { role, status } = await fetchUserProfile(session.user.id);
        if (mounted) {
          setUserRole(role);
          setUserStatus(status);
        }

        const adminStatus = await checkAdminRole(session.user.id);
        if (mounted) {
          setIsAdmin(adminStatus);
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
