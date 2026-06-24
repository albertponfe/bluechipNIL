import { createClient, type User } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  // Don't throw — let the app render (landing page, auth screen, etc.) so the
  // UI is still viewable locally before SUPABASE_URL/SUPABASE_ANON_KEY are set.
  // Any real auth/data call will fail until these are configured in .env.local.
  console.warn(
    '[supabase] SUPABASE_URL / SUPABASE_ANON_KEY are not set. ' +
      'Auth and data calls will fail until you configure them (see .env.example).'
  );
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key'
);

export type { User };

export type UserRole = 'athlete' | 'brand' | 'admin';

export interface Profile {
  id: string;
  email: string;
  role: UserRole;
  active_role: UserRole;
  status: string;
  display_name: string;
  photo_url: string | null;
  id_verified: boolean;
  school_verified: boolean;
  business_verified: boolean;
  onboarding_complete: boolean;
}

export async function fetchProfile(uid: string): Promise<Profile | null> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle();
  if (error) {
    console.error('Error fetching profile:', error);
    return null;
  }
  return data as Profile | null;
}

/**
 * Retry fetching the profile a few times with back-off. Mirrors the old
 * Firebase retry helper: there's a brief window right after signup where the
 * `handle_new_user` trigger may not have committed yet.
 */
export async function fetchProfileWithRetry(uid: string, maxAttempts = 5): Promise<Profile | null> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const result = await fetchProfile(uid);
    if (result !== null) return result;
    if (attempt < maxAttempts - 1) {
      await new Promise((r) => setTimeout(r, 500 * Math.pow(2, attempt)));
    }
  }
  return null;
}
