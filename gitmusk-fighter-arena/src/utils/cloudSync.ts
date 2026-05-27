import { PlayerProfile, mergeCloudProfile } from './playerProfile';
import { Fighter } from '../types';

export interface CloudLeaderboardEntry {
  username: string;
  displayName: string;
  avatarUrl: string;
  level: number;
  wins: number;
  losses: number;
  maxCombo: number;
  winStreak: number;
  archetypeLabel: string;
  color: string;
  basePower: number;
}

export interface LeaderboardResult {
  entries: CloudLeaderboardEntry[];
  configured: boolean;
}

export async function syncProfile(profile: PlayerProfile, fighter: Fighter): Promise<void> {
  try {
    await fetch('/api/save-stats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: profile.username,
        displayName: fighter.profile.displayName,
        avatarUrl: fighter.profile.avatarUrl,
        level: profile.level,
        xp: profile.xp,
        wins: profile.wins,
        losses: profile.losses,
        maxCombo: profile.maxCombo,
        winStreak: profile.winStreak,
        maxWinStreak: profile.maxWinStreak,
        archetype: fighter.stats.archetype,
        archetypeLabel: fighter.stats.archetypeLabel,
        color: fighter.stats.color,
        basePower: fighter.stats.basePower,
      }),
    });
  } catch { /* silent — local data is still intact */ }
}

export async function loadCloudProfile(username: string): Promise<PlayerProfile | null> {
  try {
    const res = await fetch(`/api/get-profile?username=${encodeURIComponent(username)}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.profile ?? null;
  } catch { return null; }
}

// Pulls cloud stats for a returning player and merges them into localStorage.
// Returns the merged profile, or null when the cloud has no record (or is
// unconfigured) so the caller can leave the existing local profile untouched.
export async function restoreProfileFromCloud(username: string): Promise<PlayerProfile | null> {
  const cloud = await loadCloudProfile(username);
  if (!cloud) return null;
  return mergeCloudProfile(username, {
    xp: cloud.xp,
    wins: cloud.wins,
    losses: cloud.losses,
    maxCombo: cloud.maxCombo,
    winStreak: cloud.winStreak,
    maxWinStreak: cloud.maxWinStreak,
  });
}

export async function fetchLeaderboard(): Promise<LeaderboardResult> {
  try {
    const res = await fetch('/api/leaderboard');
    if (!res.ok) return { entries: [], configured: false };
    const data = await res.json();
    const entries: CloudLeaderboardEntry[] = (data.entries ?? []).map((row: Record<string, unknown>) => ({
      username: String(row.username ?? ''),
      displayName: String(row.display_name ?? row.username ?? ''),
      avatarUrl: String(row.avatar_url ?? ''),
      level: Number(row.level ?? 1),
      wins: Number(row.wins ?? 0),
      losses: Number(row.losses ?? 0),
      maxCombo: Number(row.max_combo ?? 0),
      winStreak: Number(row.win_streak ?? 0),
      archetypeLabel: String(row.archetype_label ?? ''),
      color: String(row.fighter_color ?? '#b026ff'),
      basePower: Number(row.base_power ?? 0),
    }));
    return { entries, configured: Boolean(data.configured) };
  } catch { return { entries: [], configured: false }; }
}
