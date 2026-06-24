import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase, fetchProfile, fetchProfileWithRetry, type Profile, type User } from '../lib/supabase';

export type UserRole = 'athlete' | 'brand' | 'admin';

interface AuthContextValue {
  user: User | null;
  userDoc: Profile | null;
  role: UserRole | null;
  /** True while any auth state or profile fetch is in flight. */
  loading: boolean;
  /** Re-fetch the profile row (e.g. right after onboarding writes it). */
  refreshToken: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  userDoc: null,
  role: null,
  loading: true,
  refreshToken: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userDoc, setUserDoc] = useState<Profile | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshToken = async () => {
    const { data } = await supabase.auth.getUser();
    const currentUser = data.user;
    if (!currentUser) return;

    // Retry until the handle_new_user trigger has written the row.
    const freshProfile = await fetchProfileWithRetry(currentUser.id);
    setUserDoc(freshProfile);
    setRole((freshProfile?.role as UserRole) ?? null);
  };

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      const sessionUser = data.session?.user ?? null;
      setUser(sessionUser);
      if (sessionUser) {
        const profile = await fetchProfile(sessionUser.id);
        if (!active) return;
        setUserDoc(profile);
        setRole((profile?.role as UserRole) ?? null);
      }
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const sessionUser = session?.user ?? null;
      setUser(sessionUser);

      if (sessionUser) {
        const profile = await fetchProfile(sessionUser.id);
        setUserDoc(profile);
        setRole((profile?.role as UserRole) ?? null);
      } else {
        setRole(null);
        setUserDoc(null);
      }
      setLoading(false);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, userDoc, role, loading, refreshToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
