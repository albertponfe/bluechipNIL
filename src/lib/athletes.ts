import { supabase } from './supabase';

export interface Athlete {
  id: string;
  name: string;
  sport: string;
  school: string;
  instagram: string | null;
  followers: number;
  engagementRate: number;
  localCred: number;
  imageUrl: string;
  bio: string;
}

/** Fetches every athlete row for the Discovery marketplace. */
export async function fetchAthletes(): Promise<Athlete[]> {
  const { data, error } = await supabase
    .from('athletes')
    .select('id, name, university, sport, bio, photo_url, instagram, followers, engagement_rate, local_cred')
    .order('followers', { ascending: false });
  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name || 'Unnamed Athlete',
    sport: row.sport || '',
    school: row.university || '',
    instagram: row.instagram,
    followers: Number(row.followers) || 0,
    engagementRate: Number(row.engagement_rate) || 0,
    localCred: Number(row.local_cred) || 0,
    imageUrl: row.photo_url || `https://picsum.photos/seed/${row.id}/400/250`,
    bio: row.bio || '',
  }));
}

export function calculateMatchScore(athlete: Athlete): number {
  // Engagement is highly valuable for local NIL (max 45 points)
  // 12% engagement is considered the benchmark for max points
  const engagementScore = Math.min((athlete.engagementRate * 100) / 12, 1) * 45;

  // Local Cred (max 35 points)
  // Rated 1-10 based on local ties, sport visibility, and community involvement
  const localCredScore = (athlete.localCred / 10) * 35;

  // Reach/Followers (max 20 points)
  // For a local business, 25k+ followers caps out the value, as beyond that it's national
  const reachScore = Math.min(athlete.followers / 25000, 1) * 20;

  return Math.round(engagementScore + localCredScore + reachScore);
}

export function formatFollowers(count: number): string {
  if (count >= 1000) {
    return (count / 1000).toFixed(1) + 'k';
  }
  return count.toString();
}

export function formatEngagement(rate: number): string {
  return (rate * 100).toFixed(1) + '%';
}

export function getLocalCredLabel(cred: number): string {
  if (cred >= 9) return 'Very High';
  if (cred >= 7) return 'High';
  if (cred >= 5) return 'Medium';
  return 'Low';
}
