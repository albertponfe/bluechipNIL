import React, { useState } from 'react';
import { supabase, type User } from '../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShieldCheck,
  Building2,
  Globe,
  Briefcase,
  ArrowRight,
  ArrowLeft,
  Loader2,
  LogOut,
  CheckCircle,
  MapPin,
} from 'lucide-react';

interface BrandProfileWizardProps {
  user: User;
  onComplete: () => void;
}

interface BrandFormData {
  legalName: string;
  displayName: string;
  website: string;
  industry: string;
  bio: string;
  city: string;
  region: string;
  country: string;
}

const STEPS = ['Identity', 'Details', 'Location'] as const;

const INDUSTRIES = [
  'Apparel & Footwear',
  'Food & Beverage',
  'Technology',
  'Financial Services',
  'Health & Wellness',
  'Sports Equipment',
  'Automotive',
  'Entertainment',
  'Education',
  'Retail',
  'Other',
];

export function BrandProfileWizard({ user, onComplete }: BrandProfileWizardProps) {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<BrandFormData>({
    legalName: '',
    displayName: '',
    website: '',
    industry: '',
    bio: '',
    city: '',
    region: '',
    country: 'US',
  });

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  const patch = (fields: Partial<BrandFormData>) =>
    setFormData((prev) => ({ ...prev, ...fields }));

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const { legalName, displayName, website, industry, bio, city, region, country } = formData;

      const { error: brandError } = await supabase.from('brands').upsert({
        id: user.id,
        legal_name: legalName,
        display_name: displayName,
        website,
        industry,
        bio,
        city,
        region,
        country,
        photo_url: (user.user_metadata?.avatar_url as string) || null,
        business_verified: false,
      });
      if (brandError) throw brandError;

      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          onboarding_complete: true,
          display_name: displayName || legalName,
        })
        .eq('id', user.id);
      if (profileError) throw profileError;

      onComplete();
    } catch (err) {
      console.error('Brand profile creation error:', err);
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
            <h1 className="text-3xl font-bold text-white tracking-tight">Brand Profile</h1>
            <p className="text-neutral-400">
              Step {step + 1} of {STEPS.length} — {STEPS[step]}
            </p>
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
          {/* Step 0: Identity */}
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
                    Legal Business Name
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
                    <input
                      required
                      type="text"
                      value={formData.legalName}
                      onChange={(e) => patch({ legalName: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white focus:border-gold outline-none transition-all"
                      placeholder="Acme Corporation LLC"
                      data-testid="brand-legal-name"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest ml-1">
                    Display / Brand Name
                  </label>
                  <div className="relative">
                    <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
                    <input
                      type="text"
                      value={formData.displayName}
                      onChange={(e) => patch({ displayName: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white focus:border-gold outline-none transition-all"
                      placeholder="Acme (if different)"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest ml-1">
                  Website
                </label>
                <div className="relative">
                  <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
                  <input
                    type="url"
                    value={formData.website}
                    onChange={(e) => patch({ website: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white focus:border-gold outline-none transition-all"
                    placeholder="https://acme.com"
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 1: Details */}
          {step === 1 && (
            <motion.div
              key="step-1"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              className="space-y-6"
            >
              <div className="space-y-2">
                <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest ml-1">
                  Industry
                </label>
                <select
                  required
                  value={formData.industry}
                  onChange={(e) => patch({ industry: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-4 text-white focus:border-gold outline-none transition-all appearance-none"
                  data-testid="brand-industry"
                >
                  <option value="" disabled className="bg-navy">Select Industry</option>
                  {INDUSTRIES.map((ind) => (
                    <option key={ind} value={ind} className="bg-navy">
                      {ind}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest ml-1">
                  About Your Brand
                </label>
                <textarea
                  value={formData.bio}
                  onChange={(e) => patch({ bio: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-4 text-white focus:border-gold outline-none transition-all h-28 resize-none"
                  placeholder="Tell athletes what your brand is about and what kinds of partnerships you're looking for…"
                />
              </div>
            </motion.div>
          )}

          {/* Step 2: Location */}
          {step === 2 && (
            <motion.div
              key="step-2"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest ml-1">
                    City
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
                    <input
                      required
                      type="text"
                      value={formData.city}
                      onChange={(e) => patch({ city: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white focus:border-gold outline-none transition-all"
                      placeholder="New York"
                      data-testid="brand-city"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest ml-1">
                    State / Province
                  </label>
                  <input
                    required
                    type="text"
                    value={formData.region}
                    onChange={(e) => patch({ region: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-4 text-white focus:border-gold outline-none transition-all"
                    placeholder="NY"
                  />
                </div>
              </div>

              <div className="p-6 bg-gold/5 border border-gold/20 rounded-2xl flex items-start gap-4">
                <CheckCircle className="w-5 h-5 text-gold mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-bold text-white mb-1">Ready to connect with athletes</p>
                  <p className="text-sm text-neutral-400">
                    After setup you can browse athlete profiles, set campaign budgets, and
                    start your first NIL deal.
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
              disabled={step === 0 && !formData.legalName}
              className="flex-1 flex items-center justify-center gap-2 bg-gold text-navy py-4 rounded-2xl font-bold text-lg hover:bg-gold-light transition-all shadow-xl shadow-gold/10 disabled:opacity-40"
            >
              Continue <ArrowRight className="w-5 h-5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading || !formData.city || !formData.region}
              data-testid="brand-submit"
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
