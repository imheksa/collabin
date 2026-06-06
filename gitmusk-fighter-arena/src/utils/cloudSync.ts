import { PlayerProfile, mergeCloudProfile } from './playerProfile';
import { Fighter } from '../types';

export interface CloudLeaderboardEntry {
  username: string;
  displayName: string;
  avatarUrl: string;
  level: number;
  wins: number;
  losses: number;
  pvpWins: number;
  seasonWins: number;
  seasonPvpWins: number;
  maxCombo: number;
  winStreak: number;
  archetypeLabel: string;
  color: string;
  basePower: number;
  badges: string[];
}

export interface LeaderboardResult {
  entries: CloudLeaderboardEntry[];
  configured: boolean;
}

export interface SeasonInfo {
  configured: boolean;
  season: number;
  startedAt: string | null;
  endsAt: string | null;
  daysLeft: number;
}

let _seasonCache: SeasonInfo = { configured: false, season: 1, startedAt: null, endsAt: null, daysLeft: 30 };
let _seasonFetched = false;

export async function fetchSeasonInfo(forceRefresh = false): Promise<SeasonInfo> {
  if (_seasonFetched && !forceRefresh) return _seasonCache;
  try {
    const res = await fetch('/api/season-info');
    if (res.ok) {
      const data = await res.json();
      _seasonCache = {
        configured: data.configured ?? false,
        season: data.season ?? 1,
        startedAt: data.startedAt ?? null,
        endsAt: data.endsAt ?? null,
        daysLeft: data.daysLeft ?? 30,
      };
      _seasonFetched = true;
    }
  } catch { /* use default */ }
  return _seasonCache;
}

export function getCurrentSeason(): number {
  return _seasonCache.season;
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
        pvpWins: profile.pvpWins ?? 0,
        maxCombo: profile.maxCombo,
        winStreak: profile.winStreak,
        maxWinStreak: profile.maxWinStreak,
        archetype: fighter.stats.archetype,
        archetypeLabel: fighter.stats.archetypeLabel,
        color: fighter.stats.color,
        basePower: fighter.stats.basePower,
        currentSeason: profile.currentSeason ?? 1,
        seasonWins: profile.seasonWins ?? 0,
        seasonLosses: profile.seasonLosses ?? 0,
        seasonPvpWins: profile.seasonPvpWins ?? 0,
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
    pvpWins: cloud.pvpWins ?? 0,
    maxCombo: cloud.maxCombo,
    winStreak: cloud.winStreak,
    maxWinStreak: cloud.maxWinStreak,
    badges: cloud.badges ?? [],
    currentSeason: cloud.currentSeason,
    seasonWins: cloud.seasonWins,
    seasonLosses: cloud.seasonLosses,
    seasonPvpWins: cloud.seasonPvpWins,
  });
}

export async function fetchLeaderboard(sort: 'wins' | 'pvp' = 'wins'): Promise<LeaderboardResult> {
  try {
    const res = await fetch(`/api/leaderboard?sort=${sort}`);
    if (!res.ok) return { entries: [], configured: false };
    const data = await res.json();
    const entries: CloudLeaderboardEntry[] = (data.entries ?? []).map((row: Record<string, unknown>) => ({
      username: String(row.username ?? ''),
      displayName: String(row.display_name ?? row.username ?? ''),
      avatarUrl: String(row.avatar_url ?? ''),
      level: Number(row.level ?? 1),
      wins: Number(row.wins ?? 0),
      losses: Number(row.losses ?? 0),
      pvpWins: Number(row.pvp_wins ?? 0),
      seasonWins: Number(row.season_wins ?? 0),
      seasonPvpWins: Number(row.season_pvp_wins ?? 0),
      maxCombo: Number(row.max_combo ?? 0),
      winStreak: Number(row.win_streak ?? 0),
      archetypeLabel: String(row.archetype_label ?? ''),
      color: String(row.fighter_color ?? '#b026ff'),
      basePower: Number(row.base_power ?? 0),
      badges: Array.isArray(row.badges) ? (row.badges as string[]) : [],
    }));
    return { entries, configured: Boolean(data.configured) };
  } catch { return { entries: [], configured: false }; }
}
