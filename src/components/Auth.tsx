import React, { useState } from 'react';
import {
  auth,
  functions,
  googleProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  httpsCallable,
} from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import {
  ShieldCheck,
  LogIn,
  Mail,
  Lock,
  UserPlus,
  Loader2,
  AlertCircle,
  Trophy,
  Briefcase,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AuthProps {
  onBack: () => void;
}

type SignupStep = 'role' | 'credentials';
type SelectedRole = 'athlete' | 'brand' | null;

const ROLE_KEY = 'bluechip_pending_role';

export function Auth({ onBack }: AuthProps) {
  const { refreshToken } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [signupStep, setSignupStep] = useState<SignupStep>('role');
  const [selectedRole, setSelectedRole] = useState<SelectedRole>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError(null);
      await signInWithPopup(auth, googleProvider);
      // For Google sign-in, role defaults to 'athlete' via onUserCreate.
      // Users can change role in settings later.
      await refreshToken();
    } catch (err: unknown) {
      const e = err as { code?: string; message?: string };
      if (e.code === 'auth/operation-not-allowed') {
        setError(
          'Google login is not enabled. Please enable it in the Firebase Console under Authentication > Sign-in method.'
        );
      } else if (e.code === 'auth/popup-closed-by-user') {
        setError('Sign-in popup was closed before completing.');
      } else {
        setError(e.message || 'An error occurred during Google sign-in.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
        // Force token refresh so custom claims arrive immediately after login.
        await refreshToken();
      } else {
        const cred = await createUserWithEmailAndPassword(auth, email, password);

        // Persist chosen role to localStorage so it survives any page reload
        // during the onboarding flow.
        const role = selectedRole ?? 'athlete';
        localStorage.setItem(ROLE_KEY, role);

        // Tell the server the chosen role. This sets custom claims so the next
        // getIdToken(true) reflects them, and patches users/{uid} if onCreate
        // has already written it.
        const setPendingRole = httpsCallable<{ role: string }, { success: boolean }>(
          functions,
          'setPendingRole'
        );
        await setPendingRole({ role });

        // Send Firebase's built-in verification email using the platform template.
        await sendEmailVerification(cred.user);

        // Pull the fresh token so the app gets the role claim right away.
        await refreshToken();

        localStorage.removeItem(ROLE_KEY);
      }
    } catch (err: unknown) {
      const e = err as { code?: string; message?: string };
      if (e.code === 'auth/operation-not-allowed') {
        setError(
          'Email/Password login is not enabled. Please enable it in the Firebase Console under Authentication > Sign-in method.'
        );
      } else if (e.code === 'auth/email-already-in-use') {
        setError('An account with this email already exists. Please log in instead.');
        setIsLogin(true);
      } else if (
        e.code === 'auth/invalid-credential' ||
        e.code === 'auth/wrong-password'
      ) {
        setError('Invalid email or password. Please try again.');
      } else if (e.code === 'auth/weak-password') {
        setError('Password should be at least 6 characters.');
      } else {
        setError(e.message || 'An error occurred during authentication.');
      }
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setIsLogin(!isLogin);
    setError(null);
    setSignupStep('role');
    setSelectedRole(null);
  };

  return (
    <div className="min-h-screen bg-navy flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-white/5 backdrop-blur-xl rounded-[2.5rem] shadow-2xl p-10 border border-white/10 relative"
      >
        <button
          onClick={onBack}
          className="absolute top-8 right-8 text-neutral-500 hover:text-white transition-colors text-[10px] font-bold uppercase tracking-widest"
        >
          Back
        </button>

        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gold rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-gold/20 rotate-3">
            <ShieldCheck className="text-navy w-10 h-10" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2 tracking-tighter">AthleteBank</h1>
          <p className="text-neutral-400 text-sm font-medium uppercase tracking-widest">
            {isLogin ? 'Welcome Back' : 'Join the Generation'}
          </p>
        </div>

        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-500 text-sm"
            >
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p>{error}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Signup: Step 1 — Role Picker ────────────────────────────── */}
        <AnimatePresence mode="wait">
          {!isLogin && signupStep === 'role' && (
            <motion.div
              key="role-picker"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest mb-4 text-center">
                I am a…
              </p>
              <div className="grid grid-cols-2 gap-4 mb-8">
                <button
                  type="button"
                  onClick={() => setSelectedRole('athlete')}
                  data-testid="role-athlete"
                  className={`flex flex-col items-center gap-3 p-6 rounded-2xl border-2 transition-all ${
                    selectedRole === 'athlete'
                      ? 'border-gold bg-gold/10 text-gold'
                      : 'border-white/10 bg-white/5 text-neutral-400 hover:border-white/30 hover:text-white'
                  }`}
                >
                  <Trophy className="w-8 h-8" />
                  <span className="text-sm font-bold">Athlete</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedRole('brand')}
                  data-testid="role-brand"
                  className={`flex flex-col items-center gap-3 p-6 rounded-2xl border-2 transition-all ${
                    selectedRole === 'brand'
                      ? 'border-gold bg-gold/10 text-gold'
                      : 'border-white/10 bg-white/5 text-neutral-400 hover:border-white/30 hover:text-white'
                  }`}
                >
                  <Briefcase className="w-8 h-8" />
                  <span className="text-sm font-bold">Business</span>
                </button>
              </div>

              <button
                type="button"
                disabled={!selectedRole}
                onClick={() => setSignupStep('credentials')}
                data-testid="role-next"
                className="w-full flex items-center justify-center gap-3 bg-gold text-navy px-8 py-4 rounded-2xl font-bold text-lg hover:bg-gold-light transition-all shadow-xl shadow-gold/10 active:scale-[0.98] disabled:opacity-40"
              >
                Continue <ArrowRight className="w-5 h-5" />
              </button>
            </motion.div>
          )}

          {/* ── Signup: Step 2 / Login — Credentials ─────────────────────── */}
          {(isLogin || signupStep === 'credentials') && (
            <motion.div
              key="credentials"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              {!isLogin && (
                <button
                  type="button"
                  onClick={() => setSignupStep('role')}
                  className="flex items-center gap-1 text-xs font-bold text-neutral-500 hover:text-white transition-colors mb-4 uppercase tracking-widest"
                >
                  <ArrowLeft className="w-3 h-3" /> Back
                </button>
              )}

              {!isLogin && selectedRole && (
                <div className="mb-6 flex items-center gap-2 px-4 py-2 rounded-xl bg-gold/10 border border-gold/20">
                  {selectedRole === 'athlete' ? (
                    <Trophy className="w-4 h-4 text-gold" />
                  ) : (
                    <Briefcase className="w-4 h-4 text-gold" />
                  )}
                  <span className="text-xs font-bold text-gold uppercase tracking-wider">
                    Signing up as {selectedRole === 'athlete' ? 'Athlete' : 'Business'}
                  </span>
                </div>
              )}

              <form onSubmit={handleEmailAuth} className="space-y-4 mb-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest ml-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
                    <input
                      required
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white focus:border-gold outline-none transition-all"
                      placeholder="athlete@university.edu"
                      data-testid="email-input"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest ml-1">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
                    <input
                      required
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white focus:border-gold outline-none transition-all"
                      placeholder="••••••••"
                      data-testid="password-input"
                    />
                  </div>
                </div>

                <button
                  disabled={loading}
                  type="submit"
                  data-testid="submit-auth"
                  className="w-full flex items-center justify-center gap-3 bg-gold text-navy px-8 py-4 rounded-2xl font-bold text-lg hover:bg-gold-light transition-all shadow-xl shadow-gold/10 active:scale-[0.98] disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    <>
                      {isLogin ? <LogIn className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
                      {isLogin ? 'Sign In' : 'Create Account'}
                    </>
                  )}
                </button>
              </form>

              <div className="relative mb-8">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/10" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-navy px-4 text-neutral-500 font-bold tracking-widest">
                    Or continue with
                  </span>
                </div>
              </div>

              <button
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 bg-white/5 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:bg-white/10 border border-white/10 transition-all active:scale-[0.98] disabled:opacity-50"
              >
                <img
                  src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                  className="w-5 h-5"
                  alt="Google"
                />
                Google Account
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <p className="mt-8 text-center text-sm text-neutral-500">
          {isLogin ? "Don't have an account?" : 'Already have an account?'}{' '}
          <button onClick={switchMode} className="text-gold font-bold hover:underline">
            {isLogin ? 'Sign Up' : 'Sign In'}
          </button>
        </p>
      </motion.div>
    </div>
  );
}
