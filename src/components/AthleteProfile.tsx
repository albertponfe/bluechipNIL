import React, { useState } from 'react';
import { User, db, doc, updateDoc, OperationType, handleFirestoreError } from '../firebase';
import { User as UserIcon, Camera, Save, Loader2, Instagram, Twitter, Globe } from 'lucide-react';

export function AthleteProfile({ user, profile, setProfile }: { user: User; profile: any; setProfile: any }) {
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState(profile);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateDoc(doc(db, 'athletes', user.uid), formData);
      setProfile(formData);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `athletes/${user.uid}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight">My Profile</h2>
          <p className="text-neutral-400 mt-2">Manage your public athlete profile for brands to see.</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-gold text-navy px-6 py-3 rounded-2xl font-bold hover:bg-gold-light transition-all shadow-lg shadow-gold/10 disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Changes
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Card */}
        <div className="space-y-6">
          <div className="bg-white/5 border border-white/10 rounded-3xl p-8 text-center backdrop-blur-sm">
            <div className="relative inline-block mb-6">
              <img
                src={formData.photoUrl || `https://picsum.photos/seed/${user.uid}/200/200`}
                alt="Profile"
                className="w-32 h-32 rounded-3xl object-cover border-4 border-white/5 shadow-xl"
                referrerPolicy="no-referrer"
              />
              <button className="absolute -bottom-2 -right-2 p-2 bg-gold rounded-xl shadow-lg border border-white/10 text-navy hover:bg-gold-light transition-colors">
                <Camera className="w-4 h-4" />
              </button>
            </div>
            <h3 className="text-xl font-bold text-white">{formData.name}</h3>
            <p className="text-gold font-bold mt-1 uppercase tracking-wider text-xs">{formData.sport || 'Add Sport'}</p>
            <p className="text-neutral-500 text-sm mt-1">{formData.university || 'Add University'}</p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-sm">
            <h3 className="text-lg font-bold text-white mb-6 uppercase tracking-wider text-sm">Social Media</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-pink-400">
                  <Instagram className="w-5 h-5" />
                </div>
                <input
                  type="text"
                  placeholder="Instagram handle"
                  value={formData.instagram || ''}
                  onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                  className="flex-1 bg-white/5 border-none rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-gold/20 text-white placeholder:text-neutral-600"
                />
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-blue-400">
                  <Twitter className="w-5 h-5" />
                </div>
                <input
                  type="text"
                  placeholder="Twitter handle"
                  value={formData.twitter || ''}
                  onChange={(e) => setFormData({ ...formData, twitter: e.target.value })}
                  className="flex-1 bg-white/5 border-none rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-gold/20 text-white placeholder:text-neutral-600"
                />
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-neutral-400">
                  <UserIcon className="w-5 h-5" />
                </div>
                <input
                  type="text"
                  placeholder="TikTok handle"
                  value={formData.tiktok || ''}
                  onChange={(e) => setFormData({ ...formData, tiktok: e.target.value })}
                  className="flex-1 bg-white/5 border-none rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-gold/20 text-white placeholder:text-neutral-600"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Details Section */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-sm space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Full Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-white/5 border-none rounded-2xl px-4 py-3 focus:ring-2 focus:ring-gold/20 text-white"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Sport</label>
                <input
                  type="text"
                  value={formData.sport}
                  onChange={(e) => setFormData({ ...formData, sport: e.target.value })}
                  className="w-full bg-white/5 border-none rounded-2xl px-4 py-3 focus:ring-2 focus:ring-gold/20 text-white"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest">University</label>
                <input
                  type="text"
                  value={formData.university}
                  onChange={(e) => setFormData({ ...formData, university: e.target.value })}
                  className="w-full bg-white/5 border-none rounded-2xl px-4 py-3 focus:ring-2 focus:ring-gold/20 text-white"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Year</label>
                <input
                  type="text"
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                  className="w-full bg-white/5 border-none rounded-2xl px-4 py-3 focus:ring-2 focus:ring-gold/20 text-white"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Email Address</label>
                <input
                  type="email"
                  value={formData.email}
                  disabled
                  className="w-full bg-white/5 border-none rounded-2xl px-4 py-3 text-neutral-600 cursor-not-allowed"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Bio / About You</label>
              <textarea
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                rows={5}
                placeholder="Tell brands about your achievements, values, and what you're looking for in a partnership..."
                className="w-full bg-white/5 border-none rounded-2xl px-4 py-3 focus:ring-2 focus:ring-gold/20 resize-none text-white placeholder:text-neutral-600"
              />
            </div>
          </div>

          <div className="bg-gold rounded-3xl p-8 text-navy relative overflow-hidden">
            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-navy/10 rounded-2xl flex items-center justify-center">
                  <Globe className="w-6 h-6 text-navy" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">Public Visibility</h3>
                  <p className="text-navy/60 text-sm font-medium">Your profile is currently visible to verified brands.</p>
                </div>
              </div>
              <div className="flex items-center justify-between p-4 bg-navy/5 rounded-2xl border border-navy/10">
                <span className="text-sm font-bold uppercase tracking-wider">Profile Status</span>
                <span className="px-3 py-1 bg-navy text-gold text-xs font-bold rounded-full uppercase tracking-wider">Active</span>
              </div>
            </div>
            <div className="absolute -right-8 -bottom-8 opacity-10">
              <Globe className="w-48 h-48" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
