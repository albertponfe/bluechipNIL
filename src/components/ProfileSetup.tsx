import React, { useState } from 'react';
import { auth, db, doc, setDoc, serverTimestamp, OperationType, handleFirestoreError, signOut } from '../firebase';
import { User } from 'firebase/auth';
import { motion } from 'motion/react';
import { ShieldCheck, GraduationCap, Trophy, User as UserIcon, Instagram, ArrowRight, Loader2, LogOut } from 'lucide-react';

interface ProfileSetupProps {
  user: User;
  onComplete: (profile: any) => void;
}

export function ProfileSetup({ user, onComplete }: ProfileSetupProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: user.displayName || '',
    university: '',
    sport: '',
    year: '',
    position: '',
    instagram: '',
    bio: ''
  });

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
// ... (rest of the component)
    e.preventDefault();
    setLoading(true);

    const profileData = {
      ...formData,
      uid: user.uid,
      email: user.email,
      photoUrl: user.photoURL,
      isVerified: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    try {
      await setDoc(doc(db, 'athletes', user.uid), profileData);
      onComplete(profileData);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `athletes/${user.uid}`);
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

        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 bg-gold rounded-2xl flex items-center justify-center">
            <ShieldCheck className="text-navy w-7 h-7" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Complete Your Profile</h1>
            <p className="text-neutral-400">Tell us about your athletic career to get started.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest ml-1">Full Name</label>
              <div className="relative">
                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
                <input
                  required
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white focus:border-gold outline-none transition-all"
                  placeholder="John Doe"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest ml-1">University / School</label>
              <div className="relative">
                <GraduationCap className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
                <input
                  required
                  type="text"
                  value={formData.university}
                  onChange={e => setFormData({ ...formData, university: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white focus:border-gold outline-none transition-all"
                  placeholder="State University"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest ml-1">Sport</label>
              <div className="relative">
                <Trophy className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
                <input
                  required
                  type="text"
                  value={formData.sport}
                  onChange={e => setFormData({ ...formData, sport: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white focus:border-gold outline-none transition-all"
                  placeholder="Basketball"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest ml-1">Year</label>
              <select
                required
                value={formData.year}
                onChange={e => setFormData({ ...formData, year: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-4 text-white focus:border-gold outline-none transition-all appearance-none"
              >
                <option value="" disabled className="bg-navy">Select Year</option>
                <option value="Freshman" className="bg-navy">Freshman</option>
                <option value="Sophomore" className="bg-navy">Sophomore</option>
                <option value="Junior" className="bg-navy">Junior</option>
                <option value="Senior" className="bg-navy">Senior</option>
                <option value="Graduate" className="bg-navy">Graduate</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest ml-1">Position (Optional)</label>
              <input
                type="text"
                value={formData.position}
                onChange={e => setFormData({ ...formData, position: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-4 text-white focus:border-gold outline-none transition-all"
                placeholder="Point Guard"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest ml-1">Instagram Handle</label>
              <div className="relative">
                <Instagram className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
                <input
                  required
                  type="text"
                  value={formData.instagram}
                  onChange={e => setFormData({ ...formData, instagram: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white focus:border-gold outline-none transition-all"
                  placeholder="@username"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest ml-1">Short Bio</label>
            <textarea
              value={formData.bio}
              onChange={e => setFormData({ ...formData, bio: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-4 text-white focus:border-gold outline-none transition-all h-24 resize-none"
              placeholder="Tell us a bit about yourself..."
            />
          </div>

          <button
            disabled={loading}
            type="submit"
            className="w-full bg-gold text-navy py-5 rounded-2xl font-bold text-lg hover:bg-gold-light transition-all flex items-center justify-center gap-2 shadow-xl shadow-gold/10 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <>
                Complete Setup <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
