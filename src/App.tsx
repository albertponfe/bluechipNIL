import React from 'react';
import {
  Routes,
  Route,
  Navigate,
  useNavigate,
} from 'react-router-dom';
// useNavigate is used in OnboardingGate and AuthPage
import { useAuth } from './contexts/AuthContext';
import { Auth } from './components/Auth';
import { AthleteProfileWizard } from './components/AthleteProfileWizard';
import { BrandProfileWizard } from './components/BrandProfileWizard';
import { Dashboard } from './components/Dashboard';
import { AthletePortal } from './components/AthletePortal';
import { LandingPage } from './components/LandingPage';
import { Loader2 } from 'lucide-react';

// ── Guards ───────────────────────────────────────────────────────────────────

/** Redirect to /auth if not logged in; otherwise render children. */
function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) return <FullPageSpinner />;
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

/**
 * Redirect to /onboarding if the user hasn't completed setup yet.
 * Must be used inside <RequireAuth>.
 */
function RequireOnboarding({ children }: { children: React.ReactNode }) {
  const { userDoc, loading } = useAuth();

  if (loading) return <FullPageSpinner />;
  if (userDoc && !userDoc.onboarding_complete) {
    return <Navigate to="/onboarding" replace />;
  }
  return <>{children}</>;
}

function FullPageSpinner() {
  return (
    <div className="flex items-center justify-center h-screen bg-background">
      <Loader2 className="w-10 h-10 animate-spin text-primary" />
    </div>
  );
}

// ── Root: show landing page; redirect logged-in users to their dashboard ──────

function RootRoute() {
  const { user, role, userDoc, loading } = useAuth();

  if (loading) return <FullPageSpinner />;

  // Unauthenticated → show landing page
  if (!user) return <LandingPage />;

  // Logged in but onboarding incomplete → go finish setup
  if (userDoc && !userDoc.onboarding_complete) {
    return <Navigate to="/onboarding" replace />;
  }

  // Fully onboarded → go to dashboard
  if (role === 'brand') return <Navigate to="/dashboard" replace />;
  return <Navigate to="/athlete-portal" replace />;
}

// ── Onboarding gate ───────────────────────────────────────────────────────────

function OnboardingGate() {
  const { user, role, userDoc, refreshToken } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  // If onboarding is already done, send to the correct dashboard.
  if (userDoc?.onboarding_complete) {
    return <Navigate to={role === 'brand' ? '/dashboard' : '/athlete-portal'} replace />;
  }

  const handleComplete = async () => {
    await refreshToken();
    navigate(role === 'brand' ? '/dashboard' : '/athlete-portal', { replace: true });
  };

  if (role === 'brand') {
    return <BrandProfileWizard user={user} onComplete={handleComplete} />;
  }

  // Default: athlete wizard (also covers Google sign-in with no role set yet).
  return <AthleteProfileWizard user={user} onComplete={handleComplete} />;
}

// ── Auth page wrapper ─────────────────────────────────────────────────────────

function AuthPage() {
  const { user, role, userDoc } = useAuth();
  const navigate = useNavigate();

  // Already signed in → skip auth screen.
  if (user) {
    if (userDoc && !userDoc.onboarding_complete) {
      return <Navigate to="/onboarding" replace />;
    }
    return <Navigate to={role === 'brand' ? '/dashboard' : '/athlete-portal'} replace />;
  }

  return <Auth onBack={() => navigate('/', { replace: true })} />;
}

// ── App root ──────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<RootRoute />} />

      <Route path="/auth" element={<AuthPage />} />

      <Route
        path="/onboarding"
        element={
          <RequireAuth>
            <OnboardingGate />
          </RequireAuth>
        }
      />

      <Route
        path="/dashboard"
        element={
          <RequireAuth>
            <RequireOnboarding>
              <Dashboard />
            </RequireOnboarding>
          </RequireAuth>
        }
      />

      <Route
        path="/athlete-portal"
        element={
          <RequireAuth>
            <RequireOnboarding>
              <AthletePortal />
            </RequireOnboarding>
          </RequireAuth>
        }
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
