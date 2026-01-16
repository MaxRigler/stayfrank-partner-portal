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

// Protected Route component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, userStatus, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (userStatus === 'pending') {
    return <Navigate to="/pending" replace />;
  }

  if (userStatus === 'denied') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

// Admin Route component
function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
      </div>
    );
  }

  if (!user || !isAdmin) {
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
