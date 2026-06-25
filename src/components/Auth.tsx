import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
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

export function Auth({ onBack }: AuthProps) {
  const { refreshToken } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [signupStep, setSignupStep] = useState<SignupStep>('role');
  const [selectedRole, setSelectedRole] = useState<SelectedRole>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError(null);
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin },
      });
      if (oauthError) throw oauthError;
      // Supabase redirects the full page for OAuth, so there's nothing else to do here.
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || 'An error occurred during Google sign-in.');
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
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        await refreshToken();
      } else {
        const role = selectedRole ?? 'athlete';

        // The chosen role rides along in user metadata; the handle_new_user
        // Postgres trigger reads it to create the profiles row server-side.
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { role },
            emailRedirectTo: window.location.origin,
          },
        });
        if (signUpError) throw signUpError;

        setEmailSent(true);
        return;
      }
    } catch (err: unknown) {
      const e = err as { message?: string };
      const raw = typeof e?.message === 'string' && e.message.trim() ? e.message : null;
      const msg = raw || 'Something went wrong. Please try again.';
      if (/already registered/i.test(msg)) {
        setError('An account with this email already exists. Please log in instead.');
        setIsLogin(true);
      } else if (/invalid login credentials/i.test(msg)) {
        setError('Invalid email or password. Please try again.');
      } else if (/password/i.test(msg) && /6/i.test(msg)) {
        setError('Password should be at least 6 characters.');
      } else if (/smtp|email|sending/i.test(msg) || !raw) {
        setError('Could not send confirmation email. Please try again in a moment.');
      } else {
        setError(msg);
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

  if (emailSent) {
    return (
      <div className="min-h-screen bg-navy flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-white/5 backdrop-blur-xl rounded-[2.5rem] shadow-2xl p-10 border border-white/10 relative text-center"
        >
          <button
            onClick={onBack}
            className="absolute top-8 right-8 text-neutral-500 hover:text-white transition-colors text-[10px] font-bold uppercase tracking-widest"
          >
            Back
          </button>
          <div className="w-16 h-16 bg-gold/10 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-gold/20">
            <Mail className="w-8 h-8 text-gold" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3 tracking-tight">Check your email</h2>
          <p className="text-neutral-400 text-sm mb-2">We sent a confirmation link to</p>
          <p className="text-white font-semibold text-sm mb-6">{email}</p>
          <p className="text-neutral-500 text-xs leading-relaxed mb-8">
            Click the link in the email to verify your address and continue setting up your account. Check your spam folder if you don't see it.
          </p>
          <button
            onClick={() => { setEmailSent(false); setIsLogin(true); }}
            className="text-xs font-bold text-neutral-500 hover:text-white transition-colors uppercase tracking-widest"
          >
            Back to sign in
          </button>
        </motion.div>
      </div>
    );
  }

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
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-[#3d8bff]/20" style={{ background: 'linear-gradient(135deg, #3d8bff, #00f292)' }}>
            <ShieldCheck className="text-white w-10 h-10" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2 tracking-tighter">
            BlueChip<span className="text-[#3d8bff]">NIL</span>
          </h1>
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
                      ? 'border-[#00f292] bg-[#00f292]/10 text-[#00f292] shadow-lg shadow-[#00f292]/10'
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
                      ? 'border-[#3d8bff] bg-[#3d8bff]/10 text-[#3d8bff] shadow-lg shadow-[#3d8bff]/10'
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
                <div className={`mb-6 flex items-center gap-2 px-4 py-2 rounded-xl border ${
                  selectedRole === 'athlete'
                    ? 'bg-[#00f292]/10 border-[#00f292]/20'
                    : 'bg-[#3d8bff]/10 border-[#3d8bff]/20'
                }`}>
                  {selectedRole === 'athlete' ? (
                    <Trophy className="w-4 h-4 text-[#00f292]" />
                  ) : (
                    <Briefcase className="w-4 h-4 text-[#3d8bff]" />
                  )}
                  <span className={`text-xs font-bold uppercase tracking-wider ${
                    selectedRole === 'athlete' ? 'text-[#00f292]' : 'text-[#3d8bff]'
                  }`}>
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
