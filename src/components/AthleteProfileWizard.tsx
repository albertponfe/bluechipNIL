import React, { useState } from 'react';
import { supabase, type User } from '../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShieldCheck,
  GraduationCap,
  Trophy,
  User as UserIcon,
  Instagram,
  ArrowRight,
  ArrowLeft,
  Loader2,
  LogOut,
  CheckCircle,
} from 'lucide-react';
import { SchoolAutocomplete } from './SchoolAutocomplete';
import { COLLEGE_SPORTS } from '../lib/collegeSports';

interface AthleteProfileWizardProps {
  user: User;
  onComplete: () => void;
}

interface AthleteFormData {
  name: string;
  university: string;
  sport: string;
  year: string;
  position: string;
  instagram: string;
  bio: string;
}

const STEPS = ['Basics', 'Sport', 'Socials'] as const;

export function AthleteProfileWizard({ user, onComplete }: AthleteProfileWizardProps) {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<AthleteFormData>({
    name: (user.user_metadata?.full_name as string) || '',
    university: '',
    sport: '',
    year: '',
    position: '',
    instagram: '',
    bio: '',
  });

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  const patch = (fields: Partial<AthleteFormData>) =>
    setFormData((prev) => ({ ...prev, ...fields }));

  const handleSubmit = async () => {
    setLoading(true);

    try {
      // Write the athlete profile row.
      const { error: athleteError } = await supabase.from('athletes').upsert({
        id: user.id,
        ...formData,
        photo_url: (user.user_metadata?.avatar_url as string) || null,
        is_verified: false,
      });
      if (athleteError) throw athleteError;

      // Mark onboarding complete on the profile row.
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ onboarding_complete: true, display_name: formData.name })
        .eq('id', user.id);
      if (profileError) throw profileError;

      onComplete();
    } catch (error) {
      console.error('Error saving athlete profile:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-navy flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl w-full bg-white/5 backdrop-blur-xl rounded-[2.5rem] border border-white/10 p-10 shadow-2xl relative"
      >
        <button
          onClick={handleSignOut}
          className="absolute top-8 right-8 text-neutral-500 hover:text-white transition-colors flex items-center gap-2 text-xs font-bold uppercase tracking-widest"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 bg-gold rounded-2xl flex items-center justify-center">
            <ShieldCheck className="text-navy w-7 h-7" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Athlete Profile</h1>
            <p className="text-neutral-400">Step {step + 1} of {STEPS.length} — {STEPS[step]}</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="flex gap-2 mb-8">
          {STEPS.map((label, i) => (
            <div
              key={label}
              className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
                i <= step ? 'bg-gold' : 'bg-white/10'
              }`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* Step 0: Basics */}
          {step === 0 && (
            <motion.div
              key="step-0"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest ml-1">
                    Full Name
                  </label>
                  <div className="relative">
                    <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
                    <input
                      required
                      type="text"
                      value={formData.name}
                      onChange={(e) => patch({ name: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white focus:border-gold outline-none transition-all"
                      placeholder="John Doe"
                      data-testid="athlete-name"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest ml-1">
                    University / School
                  </label>
                  <div className="relative">
                    <GraduationCap className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500 z-10" />
                    <SchoolAutocomplete
                      value={formData.university}
                      onChange={(name) => patch({ university: name })}
                      showIcon={false}
                      placeholder="Start typing your school..."
                      inputClassName="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 h-auto text-white focus-visible:border-gold focus-visible:ring-0 outline-none transition-all"
                      className="bg-navy border-white/10"
                      testId="athlete-university"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest ml-1">
                  Short Bio
                </label>
                <textarea
                  value={formData.bio}
                  onChange={(e) => patch({ bio: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-4 text-white focus:border-gold outline-none transition-all h-24 resize-none"
                  placeholder="Tell us a bit about yourself…"
                />
              </div>
            </motion.div>
          )}

          {/* Step 1: Sport */}
          {step === 1 && (
            <motion.div
              key="step-1"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest ml-1">
                    Sport
                  </label>
                  <div className="relative">
                    <Trophy className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500 z-10" />
                    <select
                      required
                      value={formData.sport}
                      onChange={(e) => patch({ sport: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white focus:border-gold outline-none transition-all appearance-none"
                      data-testid="athlete-sport"
                    >
                      <option value="" disabled className="bg-navy">Select a sport</option>
                      {COLLEGE_SPORTS.map((sport) => (
                        <option key={sport} value={sport} className="bg-navy">{sport}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest ml-1">
                    Year
                  </label>
                  <select
                    required
                    value={formData.year}
                    onChange={(e) => patch({ year: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-4 text-white focus:border-gold outline-none transition-all appearance-none"
                    data-testid="athlete-year"
                  >
                    <option value="" disabled className="bg-navy">Select Year</option>
                    <option value="Freshman" className="bg-navy">Freshman</option>
                    <option value="Sophomore" className="bg-navy">Sophomore</option>
                    <option value="Junior" className="bg-navy">Junior</option>
                    <option value="Senior" className="bg-navy">Senior</option>
                    <option value="Graduate" className="bg-navy">Graduate</option>
                    <option value="5th Year" className="bg-navy">5th Year</option>
                  </select>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest ml-1">
                    Position (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.position}
                    onChange={(e) => patch({ position: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-4 text-white focus:border-gold outline-none transition-all"
                    placeholder="Point Guard"
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 2: Socials */}
          {step === 2 && (
            <motion.div
              key="step-2"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              className="space-y-6"
            >
              <div className="space-y-2">
                <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest ml-1">
                  Instagram Handle
                </label>
                <div className="relative">
                  <Instagram className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
                  <input
                    required
                    type="text"
                    value={formData.instagram}
                    onChange={(e) => patch({ instagram: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white focus:border-gold outline-none transition-all"
                    placeholder="@username"
                    data-testid="athlete-instagram"
                  />
                </div>
              </div>

              <div className="p-6 bg-gold/5 border border-gold/20 rounded-2xl flex items-start gap-4">
                <CheckCircle className="w-5 h-5 text-gold mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-bold text-white mb-1">Almost there!</p>
                  <p className="text-sm text-neutral-400">
                    After setup you can add Twitter, TikTok, and YouTube in your profile
                    settings to maximise your NIL valuation.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex gap-4 mt-8">
          {step > 0 && (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              className="flex items-center gap-2 px-6 py-4 rounded-2xl border border-white/10 text-neutral-400 hover:text-white hover:border-white/30 transition-all font-bold"
            >
              <ArrowLeft className="w-5 h-5" /> Back
            </button>
          )}

          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              disabled={
                (step === 0 && (!formData.name || !formData.university)) ||
                (step === 1 && (!formData.sport || !formData.year))
              }
              className="flex-1 flex items-center justify-center gap-2 bg-gold text-navy py-4 rounded-2xl font-bold text-lg hover:bg-gold-light transition-all shadow-xl shadow-gold/10 disabled:opacity-40"
            >
              Continue <ArrowRight className="w-5 h-5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading || !formData.instagram}
              data-testid="athlete-submit"
              className="flex-1 flex items-center justify-center gap-2 bg-gold text-navy py-4 rounded-2xl font-bold text-lg hover:bg-gold-light transition-all shadow-xl shadow-gold/10 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <>
                  Complete Setup <CheckCircle className="w-5 h-5" />
                </>
              )}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
