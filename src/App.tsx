import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { WizardProvider } from "./contexts/WizardContext";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import Index from "./pages/Index";
import MySubmissions from "./pages/MySubmissions";
import AdminDashboard from "./pages/AdminDashboard";
import TeamManagement from "./pages/TeamManagement";
import Profile from "./pages/Profile";
import OfficerSignup from "./pages/OfficerSignup";
import IsoPending from "./pages/IsoPending";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";
import "./App.css";

const queryClient = new QueryClient();

// Protected Route component - uses synchronous localStorage check for INSTANT access
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  // Check localStorage synchronously for instant access - no waiting for async hooks
  const getStoredSession = () => {
    try {
      const storedData = localStorage.getItem('sb-ximkveundgebbvbgacfu-auth-token');
      if (storedData) {
        const parsed = JSON.parse(storedData);
        const expiresAt = new Date((parsed?.expires_at || 0) * 1000);
        if (expiresAt > new Date() && parsed?.user?.id) {
          return { userId: parsed.user.id, isValid: true };
        }
      }
    } catch { }
    return { userId: null, isValid: false };
  };

  const session = getStoredSession();

  // If no valid session in localStorage, redirect immediately
  if (!session.isValid) {
    return <Navigate to="/" replace />;
  }

  // User has a valid session token - render children immediately
  // The Profile page itself will handle data loading and any status checks
  return <>{children}</>;
}

// Admin Route component - uses cached admin status to avoid race conditions
function AdminRoute({ children }: { children: React.ReactNode }) {
  const [checking, setChecking] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    let mounted = true;

    const checkAccess = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        console.log('AdminRoute: Session check:', session ? 'logged in' : 'not logged in');

        if (!session) {
          if (mounted) setChecking(false);
          return;
        }

        // Check cached admin status first (set by UserMenu)
        const cachedAdminStatus = localStorage.getItem(`admin_status_${session.user.id}`);
        if (cachedAdminStatus === 'true') {
          console.log('AdminRoute: Using cached admin status (true)');
          if (mounted) {
            setHasAccess(true);
            setChecking(false);
          }
          return;
        }

        // If not cached, check admin role from database
        const { data: roleData, error: roleError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id)
          .eq('role', 'admin')
          .maybeSingle();

        console.log('AdminRoute: Admin role check:', { roleData, roleError });

        if (mounted) {
          if (roleData && !roleError) {
            setHasAccess(true);
            // Cache the result for future use
            localStorage.setItem(`admin_status_${session.user.id}`, 'true');
          }
          setChecking(false);
        }
      } catch (err) {
        console.error('AdminRoute: Error checking access:', err);
        // On error, check if we have a cached admin status
        try {
          const storageKey = 'sb-ximkveundgebbvbgacfu-auth-token';
          const storedData = localStorage.getItem(storageKey);
          if (storedData) {
            const parsed = JSON.parse(storedData);
            if (parsed?.user?.id) {
              const cachedAdminStatus = localStorage.getItem(`admin_status_${parsed.user.id}`);
              if (cachedAdminStatus === 'true' && mounted) {
                console.log('AdminRoute: Falling back to cached admin status after error');
                setHasAccess(true);
              }
            }
          }
        } catch {
          // Ignore localStorage errors
        }
        if (mounted) setChecking(false);
      }
    };

    // Add timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      console.log('AdminRoute: Timeout, forcing check complete');
      // Try to use cached status on timeout
      try {
        const storageKey = 'sb-ximkveundgebbvbgacfu-auth-token';
        const storedData = localStorage.getItem(storageKey);
        if (storedData) {
          const parsed = JSON.parse(storedData);
          if (parsed?.user?.id) {
            const cachedAdminStatus = localStorage.getItem(`admin_status_${parsed.user.id}`);
            if (cachedAdminStatus === 'true' && mounted) {
              console.log('AdminRoute: Using cached admin status on timeout');
              setHasAccess(true);
            }
          }
        }
      } catch {
        // Ignore localStorage errors
      }
      if (mounted) setChecking(false);
    }, 5000);

    checkAccess();

    return () => {
      mounted = false;
      clearTimeout(timeout);
    };
  }, []);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
      </div>
    );
  }

  if (!hasAccess) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

// Manager Route component
function ManagerRoute({ children }: { children: React.ReactNode }) {
  const { user, userRole, userStatus, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
      </div>
    );
  }

  if (!user || userRole !== 'manager' || userStatus !== 'active') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <WizardProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Index />} />
            <Route path="/signup/:token" element={<OfficerSignup />} />
            <Route path="/pending" element={<IsoPending />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Protected routes */}
            <Route
              path="/submissions"
              element={
                <ProtectedRoute>
                  <MySubmissions />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />

            {/* Manager routes */}
            <Route
              path="/team"
              element={
                <ManagerRoute>
                  <TeamManagement />
                </ManagerRoute>
              }
            />

            {/* Admin routes */}
            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <AdminDashboard />
                </AdminRoute>
              }
            />

            {/* Catch all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </WizardProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
