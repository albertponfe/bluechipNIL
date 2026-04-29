import React, { useState } from 'react';
import {
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
} from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { Layout } from './components/Layout';
import { Auth } from './components/Auth';
import { ContractReview } from './components/ContractReview';
import { AthleteProfile } from './components/AthleteProfile';
import { NILValuation } from './components/NILValuation';
import { BrandDeals } from './components/BrandDeals';
import { TaxAutopilot } from './components/TaxAutopilot';
import { FinancialLiteracy } from './components/FinancialLiteracy';
import { BrandOptimization } from './components/BrandOptimization';
import { LandingPage } from './components/LandingPage';
import { AthleteProfileWizard } from './components/AthleteProfileWizard';
import { BrandProfileWizard } from './components/BrandProfileWizard';
import { Loader2 } from 'lucide-react';

export type Tab = 'contracts' | 'profile' | 'deals' | 'valuation' | 'tax' | 'literacy' | 'brand';

// ── Guards ───────────────────────────────────────────────────────────────────

/** Redirect to /auth if not logged in; otherwise render children. */
function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <FullPageSpinner />;
  if (!user) return <Navigate to="/auth" state={{ from: location }} replace />;
  return <>{children}</>;
}

/**
 * Redirect to /onboarding if the user hasn't completed setup yet.
 * Must be used inside <RequireAuth>.
 */
function RequireOnboarding({ children }: { children: React.ReactNode }) {
  const { userDoc, loading } = useAuth();

  if (loading) return <FullPageSpinner />;
  if (userDoc && !userDoc.flags.onboardingComplete) {
    return <Navigate to="/onboarding" replace />;
  }
  return <>{children}</>;
}

function FullPageSpinner() {
  return (
    <div className="flex items-center justify-center h-screen bg-navy">
      <Loader2 className="w-10 h-10 animate-spin text-gold" />
    </div>
  );
}

// ── Root redirect: send logged-in users to their dashboard ───────────────────

function RootRedirect() {
  const { user, role, userDoc, loading } = useAuth();
  const navigate = useNavigate();

  if (loading) return <FullPageSpinner />;

  if (!user) return <LandingPage onLogin={() => navigate('/auth')} />;

  if (userDoc && !userDoc.flags.onboardingComplete) {
    return <Navigate to="/onboarding" replace />;
  }

  if (role === 'brand') return <Navigate to="/brand-dashboard" replace />;
  return <Navigate to="/athlete-dashboard" replace />;
}

// ── Athlete dashboard (existing tab-based UX) ────────────────────────────────

function AthleteDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('tax');
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);

  if (!user) return null;

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab} user={user}>
      {activeTab === 'contracts' && <ContractReview user={user} />}
      {activeTab === 'profile' && (
        <AthleteProfile user={user} profile={profile} setProfile={setProfile} />
      )}
      {activeTab === 'deals' && <BrandDeals user={user} profile={profile} />}
      {activeTab === 'valuation' && <NILValuation user={user} profile={profile} />}
      {activeTab === 'tax' && <TaxAutopilot user={user} profile={profile} />}
      {activeTab === 'literacy' && <FinancialLiteracy user={user} profile={profile} />}
      {activeTab === 'brand' && <BrandOptimization user={user} profile={profile} />}
    </Layout>
  );
}

// ── Brand dashboard ───────────────────────────────────────────────────────────

function BrandDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('deals');

  if (!user) return null;

  // Brands share the Layout wrapper for a consistent chrome, but only see
  // deal- and brand-relevant tabs. Athlete-only tabs redirect to deals.
  const brandTab = (['deals', 'brand', 'contracts'] as Tab[]).includes(activeTab)
    ? activeTab
    : 'deals';

  return (
    <Layout activeTab={brandTab} setActiveTab={setActiveTab} user={user}>
      {brandTab === 'contracts' && <ContractReview user={user} />}
      {brandTab === 'deals' && <BrandDeals user={user} profile={null} />}
      {brandTab === 'brand' && <BrandOptimization user={user} profile={null} />}
    </Layout>
  );
}

// ── Onboarding gate ───────────────────────────────────────────────────────────

function OnboardingGate() {
  const { user, role, userDoc } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  // If onboarding is already done, send to the correct dashboard.
  if (userDoc?.flags.onboardingComplete) {
    return <Navigate to={role === 'brand' ? '/brand-dashboard' : '/athlete-dashboard'} replace />;
  }

  const handleComplete = () => {
    navigate(role === 'brand' ? '/brand-dashboard' : '/athlete-dashboard', { replace: true });
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
    if (userDoc && !userDoc.flags.onboardingComplete) {
      return <Navigate to="/onboarding" replace />;
    }
    return <Navigate to={role === 'brand' ? '/brand-dashboard' : '/athlete-dashboard'} replace />;
  }

  return <Auth onBack={() => navigate('/', { replace: true })} />;
}

// ── App root ──────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />

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
        path="/athlete-dashboard"
        element={
          <RequireAuth>
            <RequireOnboarding>
              <AthleteDashboard />
            </RequireOnboarding>
          </RequireAuth>
        }
      />

      <Route
        path="/brand-dashboard"
        element={
          <RequireAuth>
            <RequireOnboarding>
              <BrandDashboard />
            </RequireOnboarding>
          </RequireAuth>
        }
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
