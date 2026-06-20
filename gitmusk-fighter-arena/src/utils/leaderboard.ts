export interface PlayerStats {
  wins: number;
  losses: number;
  maxCombo: number;
  lastPlayed: number;
}

export function getPlayerStats(username: string): PlayerStats {
  try {
    const raw = localStorage.getItem(`gmf_stats_${username}`);
    return raw ? (JSON.parse(raw) as PlayerStats) : { wins: 0, losses: 0, maxCombo: 0, lastPlayed: 0 };
  } catch {
    return { wins: 0, losses: 0, maxCombo: 0, lastPlayed: 0 };
  }
}

export function recordMatchResult(username: string, won: boolean, combo: number) {
  const stats = getPlayerStats(username);
  if (won) stats.wins++; else stats.losses++;
  stats.maxCombo = Math.max(stats.maxCombo, combo);
  stats.lastPlayed = Date.now();
  try {
    localStorage.setItem(`gmf_stats_${username}`, JSON.stringify(stats));
  } catch { /* storage full */ }
}

export function getAllLocalStats(): Record<string, PlayerStats> {
  const result: Record<string, PlayerStats> = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('gmf_stats_')) {
        const username = key.slice('gmf_stats_'.length);
        result[username] = getPlayerStats(username);
      }
    }
  } catch { /* blocked */ }
  return result;
}
