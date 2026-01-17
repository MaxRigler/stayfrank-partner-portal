import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { WizardProvider } from "./contexts/WizardContext";
import { useAuth } from "@/hooks/useAuth";
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

// Admin Route component - uses SYNCHRONOUS localStorage check for INSTANT access
function AdminRoute({ children }: { children: React.ReactNode }) {
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

  // Check cached admin status synchronously
  const cachedAdminStatus = localStorage.getItem(`admin_status_${session.userId}`);

  // If we have a cached admin status, render immediately
  if (cachedAdminStatus === 'true') {
    console.log('AdminRoute: Using cached admin status for instant access');
    return <>{children}</>;
  }

  // If no cached admin status, we need to verify - but this should be rare
  // since admin status is cached when AdminDashboard loads or UserMenu checks
  // For safety, redirect non-cached users (they can try again after UserMenu caches their status)
  console.log('AdminRoute: No cached admin status, redirecting. User should access via UserMenu first.');
  return <Navigate to="/" replace />;
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
