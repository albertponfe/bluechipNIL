import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { auth, db, doc, getDoc, onAuthStateChanged } from '../firebase';
import type { User } from 'firebase/auth';

export type UserRole = 'athlete' | 'brand' | 'admin';

export interface UserFlags {
  idVerified: boolean;
  schoolVerified: boolean;
  businessVerified: boolean;
  onboardingComplete: boolean;
}

export interface UserDoc {
  uid: string;
  email: string;
  role: UserRole;
  activeRole: UserRole;
  status: string;
  displayName: string;
  photoUrl: string;
  flags: UserFlags;
}

interface AuthContextValue {
  user: User | null;
  userDoc: UserDoc | null;
  role: UserRole | null;
  /** True while any auth state or user-doc fetch is in flight. */
  loading: boolean;
  /** Force-refresh the ID token so new custom claims arrive, then reload userDoc. */
  refreshToken: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  userDoc: null,
  role: null,
  loading: true,
  refreshToken: async () => {},
});

async function fetchUserDoc(uid: string): Promise<UserDoc | null> {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? (snap.data() as UserDoc) : null;
}

/**
 * Retry fetching the user doc up to `maxAttempts` times with exponential back-off.
 * This handles the short window after account creation where the onCreate Cloud
 * Function hasn't finished writing users/{uid} yet.
 */
async function fetchUserDocWithRetry(uid: string, maxAttempts = 5): Promise<UserDoc | null> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const result = await fetchUserDoc(uid);
    if (result !== null) return result;
    if (attempt < maxAttempts - 1) {
      // Wait 500ms, 1s, 2s, 4s…
      await new Promise((r) => setTimeout(r, 500 * Math.pow(2, attempt)));
    }
  }
  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userDoc, setUserDoc] = useState<UserDoc | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshToken = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    // Force server round-trip to pick up the latest custom claims.
    await currentUser.getIdToken(/* forceRefresh */ true);
    const result = await currentUser.getIdTokenResult();
    const claims = result.claims as { role?: UserRole };
    setRole(claims.role ?? null);

    // Retry until the onCreate Cloud Function has written the doc.
    const freshDoc = await fetchUserDocWithRetry(currentUser.uid);
    setUserDoc(freshDoc);
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      setUser(fbUser);

      if (fbUser) {
        const result = await fbUser.getIdTokenResult();
        const claims = result.claims as { role?: UserRole };
        setRole(claims.role ?? null);

        // Single fetch here — existing users always have the doc.
        // For brand-new signups, refreshToken() (called from Auth.tsx after
        // setPendingRole) retries with back-off until the onCreate Cloud
        // Function has finished writing users/{uid}.
        const userRecord = await fetchUserDoc(fbUser.uid);
        setUserDoc(userRecord);
      } else {
        setRole(null);
        setUserDoc(null);
      }

      setLoading(false);
    });

    return unsub;
  }, []);

  return (
    <AuthContext.Provider value={{ user, userDoc, role, loading, refreshToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
