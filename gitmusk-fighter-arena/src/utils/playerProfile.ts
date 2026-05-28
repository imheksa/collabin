// ─── Types ───────────────────────────────────────────────────────────────────

export interface MatchHistoryEntry {
  opponent: string;
  opponentArchetype: string;
  won: boolean;
  maxCombo: number;
  durationSec: number;
  xpGained: number;
  timestamp: number;
  isPvP?: boolean;
}

export interface PlayerProfile {
  username: string;
  xp: number;
  level: number;
  wins: number;
  losses: number;
  pvpWins: number;
  maxCombo: number;
  winStreak: number;
  lossStreak: number;
  maxWinStreak: number;
  achievements: string[];
  matchHistory: MatchHistoryEntry[];
}

export interface CombatModifiers {
  attackMult: number;   // multiplier on damage dealt  (>1 = stronger)
  defenseMult: number;  // multiplier on damage taken  (<1 = tankier)
  xpMult: number;       // XP gain multiplier
}

export interface MatchReward {
  xpGained: number;
  leveledUp: boolean;
  oldLevel: number;
  newLevel: number;
  newAchievements: Achievement[];
}

export interface Achievement {
  id: string;
  name: string;
  desc: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

// ─── Level tiers ─────────────────────────────────────────────────────────────

export interface LevelTier {
  name: string;
  color: string;
  minLevel: number;
}

export const LEVEL_TIERS: LevelTier[] = [
  { minLevel: 1,  name: 'ROOKIE',   color: '#888888' },
  { minLevel: 6,  name: 'FIGHTER',  color: '#00ff41' },
  { minLevel: 11, name: 'WARRIOR',  color: '#00ccff' },
  { minLevel: 21, name: 'CHAMPION', color: '#ff00ff' },
  { minLevel: 36, name: 'LEGEND',   color: '#ffd700' },
  { minLevel: 51, name: 'MYTHIC',   color: '#ff4400' },
];

export function getLevelTier(level: number): LevelTier {
  for (let i = LEVEL_TIERS.length - 1; i >= 0; i--) {
    if (level >= LEVEL_TIERS[i].minLevel) return LEVEL_TIERS[i];
  }
  return LEVEL_TIERS[0];
}

// ─── XP / Level formulas ─────────────────────────────────────────────────────
// XP to go from level N → N+1 = 150 * N
// Total cumulative XP to reach level N = 75 * N * (N - 1)

export function xpForLevel(level: number): number {
  return 75 * level * (level - 1);
}

export function levelFromXp(xp: number): number {
  let lv = 1;
  while (xpForLevel(lv + 1) <= xp) lv++;
  return lv;
}

export function xpProgressInLevel(xp: number, level: number): number {
  const start = xpForLevel(level);
  const end = xpForLevel(level + 1);
  return Math.min(1, (xp - start) / (end - start));
}

export function xpNeededForNextLevel(level: number): number {
  return xpForLevel(level + 1) - xpForLevel(level);
}

// ─── XP reward per match ─────────────────────────────────────────────────────

export function calcMatchXp(won: boolean, maxCombo: number, durationSec: number): number {
  let xp = 15;                               // base: just for playing
  xp += won ? 100 : 25;                      // win / loss bonus
  xp += maxCombo * 5;                        // combo mastery
  xp += Math.floor(durationSec / 10) * 2;   // longer fights → more XP
  return xp;
}

// ─── Combat modifiers ────────────────────────────────────────────────────────
//
// attackMult  — applied to damage dealt.    Base = 1.0, grows with level/wins.
// defenseMult — applied to damage TAKEN.   Base = 1.0, shrinks with level/wins.
//               (lower is better: 0.8 means 20% less damage taken)

export function getCombatModifiers(profile: PlayerProfile): CombatModifiers {
  const { level, wins, losses, winStreak, lossStreak } = profile;
  const totalMatches = wins + losses;
  const winRate = totalMatches >= 3 ? wins / totalMatches : 0.5;

  // ── Level base bonuses ──
  let attackMult  = 1 + (level - 1) * 0.020;   // +2.0% ATK per level
  let defenseMult = 1 - (level - 1) * 0.012;   // -1.2% damage taken per level

  // ── Win streak (offensive momentum) ──
  if (winStreak >= 2) {
    const bonus = Math.min(winStreak, 8) * 0.030;  // up to +24% ATK
    attackMult  += bonus;
    defenseMult -= bonus * 0.25;                   // small defense follow
  }

  // ── Win rate bonus ──
  if (winRate >= 0.70 && totalMatches >= 5) {
    attackMult  += 0.12;
    defenseMult -= 0.06;
  } else if (winRate >= 0.55 && totalMatches >= 3) {
    attackMult  += 0.06;
    defenseMult -= 0.03;
  }

  // ── Loss streak penalty (you play worse after tilt) ──
  if (lossStreak >= 3) {
    const penalty = Math.min(lossStreak, 6) * 0.040;  // up to -24% ATK
    attackMult  -= penalty;
    defenseMult += penalty * 0.30;                     // small defense consolation
  }

  // ── XP multiplier (streaks / hot hand) ──
  let xpMult = 1;
  if (winStreak >= 3) xpMult += 0.25;
  if (winRate >= 0.70 && totalMatches >= 5) xpMult += 0.15;

  return {
    attackMult:  Math.max(0.60, Math.min(2.30, attackMult)),
    defenseMult: Math.max(0.50, Math.min(1.35, defenseMult)),
    xpMult,
  };
}

// ─── Achievements ─────────────────────────────────────────────────────────────

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first_win',  name: 'First Blood',   desc: 'Win your first match',         icon: '🩸', rarity: 'common'    },
  { id: 'combo5',     name: 'Combo Artist',  desc: 'Land a 5x combo',              icon: '💥', rarity: 'common'    },
  { id: 'combo10',    name: 'Dominator',     desc: 'Land a 10x combo',             icon: '⚡', rarity: 'rare'      },
  { id: 'wins5',      name: 'Fighter',       desc: 'Win 5 matches',                icon: '⚔️', rarity: 'common'    },
  { id: 'wins25',     name: 'Veteran',       desc: 'Win 25 matches',               icon: '🏆', rarity: 'rare'      },
  { id: 'wins100',    name: 'Champion',      desc: 'Win 100 matches',              icon: '👑', rarity: 'epic'      },
  { id: 'streak3',    name: 'On Fire',       desc: '3-win streak',                 icon: '🔥', rarity: 'common'    },
  { id: 'streak7',    name: 'Momentum',      desc: '7-win streak',                 icon: '🌪️', rarity: 'rare'      },
  { id: 'streak15',   name: 'Unstoppable',   desc: '15-win streak',                icon: '☄️', rarity: 'legendary' },
  { id: 'level10',    name: 'Warrior',       desc: 'Reach Level 10',               icon: '🗡️', rarity: 'common'    },
  { id: 'level25',    name: 'Legend',        desc: 'Reach Level 25',               icon: '🌟', rarity: 'epic'      },
  { id: 'level50',    name: 'Mythic',        desc: 'Reach Level 50',               icon: '💎', rarity: 'legendary' },
  { id: 'grinder',    name: 'Grinder',       desc: 'Play 50 matches',              icon: '🎮', rarity: 'rare'      },
  { id: 'survivor',   name: 'Survivor',      desc: 'Win after a 5-loss streak',    icon: '💪', rarity: 'epic'      },
  { id: 'perfectWR',  name: 'Flawless',      desc: '10 wins with 70%+ win rate',   icon: '✨', rarity: 'legendary' },
];

export const ACHIEVEMENT_RARITY_COLORS: Record<Achievement['rarity'], string> = {
  common:    '#888',
  rare:      '#00ccff',
  epic:      '#bf00ff',
  legendary: '#ffd700',
};

function checkCondition(id: string, p: PlayerProfile): boolean {
  const total = p.wins + p.losses;
  const wr = total >= 3 ? p.wins / total : 0;
  switch (id) {
    case 'first_win':  return p.wins >= 1;
    case 'combo5':     return p.maxCombo >= 5;
    case 'combo10':    return p.maxCombo >= 10;
    case 'wins5':      return p.wins >= 5;
    case 'wins25':     return p.wins >= 25;
    case 'wins100':    return p.wins >= 100;
    case 'streak3':    return p.maxWinStreak >= 3;
    case 'streak7':    return p.maxWinStreak >= 7;
    case 'streak15':   return p.maxWinStreak >= 15;
    case 'level10':    return p.level >= 10;
    case 'level25':    return p.level >= 25;
    case 'level50':    return p.level >= 50;
    case 'grinder':    return total >= 50;
    case 'survivor':   return p.wins >= 1 && p.losses >= 5 && p.winStreak >= 1;
    case 'perfectWR':  return p.wins >= 10 && wr >= 0.70;
    default:           return false;
  }
}

// ─── Storage ─────────────────────────────────────────────────────────────────

const KEY = (u: string) => `gmf_profile_v2_${u}`;

export function getProfile(username: string): PlayerProfile {
  try {
    const raw = localStorage.getItem(KEY(username));
    if (raw) {
      const p = JSON.parse(raw) as PlayerProfile;
      if (!p.matchHistory) p.matchHistory = [];
      if (p.pvpWins === undefined) p.pvpWins = 0;
      return p;
    }
  } catch { /* blocked */ }
  return { username, xp: 0, level: 1, wins: 0, losses: 0, pvpWins: 0, maxCombo: 0, winStreak: 0, lossStreak: 0, maxWinStreak: 0, achievements: [], matchHistory: [] };
}

export function saveProfile(p: PlayerProfile): void {
  try { localStorage.setItem(KEY(p.username), JSON.stringify(p)); } catch { /* full */ }
}

export function getAllProfiles(): PlayerProfile[] {
  const out: PlayerProfile[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k?.startsWith('gmf_profile_v2_')) continue;
      const raw = localStorage.getItem(k);
      if (raw) try { out.push(JSON.parse(raw)); } catch { /* skip */ }
    }
  } catch { /* blocked */ }
  return out;
}

// ─── Merge cloud-restored stats into the local profile ────────────────────────
// Field-wise max on monotonic counters so a returning device restores progress
// without ever clobbering whichever copy is further ahead. Level + achievements
// are recomputed from the merged totals.

export interface CloudStats {
  xp: number;
  wins: number;
  losses: number;
  pvpWins: number;
  maxCombo: number;
  winStreak: number;
  maxWinStreak: number;
}

export function mergeCloudProfile(username: string, cloud: CloudStats): PlayerProfile {
  const local = getProfile(username);
  const merged: PlayerProfile = {
    ...local,
    xp:           Math.max(local.xp, cloud.xp),
    wins:         Math.max(local.wins, cloud.wins),
    losses:       Math.max(local.losses, cloud.losses),
    pvpWins:      Math.max(local.pvpWins ?? 0, cloud.pvpWins ?? 0),
    maxCombo:     Math.max(local.maxCombo, cloud.maxCombo),
    winStreak:    Math.max(local.winStreak, cloud.winStreak),
    maxWinStreak: Math.max(local.maxWinStreak, cloud.maxWinStreak),
  };
  merged.level = levelFromXp(merged.xp);
  const earned = ACHIEVEMENTS.map(a => a.id).filter(id => checkCondition(id, merged));
  merged.achievements = Array.from(new Set([...local.achievements, ...earned]));
  saveProfile(merged);
  return merged;
}

// ─── Record a match result ───────────────────────────────────────────────────

export function recordMatch(
  username: string,
  won: boolean,
  maxCombo: number,
  durationSec: number,
  opponent?: { username: string; archetype: string },
  isPvP?: boolean,
): MatchReward {
  const profile = getProfile(username);
  const mods = getCombatModifiers(profile);
  const baseXp = calcMatchXp(won, maxCombo, durationSec);
  const xpGained = Math.round(baseXp * mods.xpMult);
  const oldLevel = profile.level;

  profile.xp += xpGained;
  profile.level = levelFromXp(profile.xp);

  if (won) {
    profile.wins++;
    if (isPvP) profile.pvpWins = (profile.pvpWins ?? 0) + 1;
    profile.winStreak++;
    profile.lossStreak = 0;
    profile.maxWinStreak = Math.max(profile.maxWinStreak, profile.winStreak);
  } else {
    profile.losses++;
    profile.winStreak = 0;
    profile.lossStreak++;
  }
  profile.maxCombo = Math.max(profile.maxCombo, maxCombo);

  if (opponent) {
    const entry: MatchHistoryEntry = {
      opponent: opponent.username,
      opponentArchetype: opponent.archetype,
      won,
      maxCombo,
      durationSec,
      xpGained,
      timestamp: Date.now(),
      ...(isPvP ? { isPvP: true } : {}),
    };
    profile.matchHistory = [entry, ...(profile.matchHistory ?? [])].slice(0, 3);
  }

  const newAchIds = ACHIEVEMENTS.map(a => a.id)
    .filter(id => !profile.achievements.includes(id) && checkCondition(id, profile));
  profile.achievements = [...profile.achievements, ...newAchIds];

  saveProfile(profile);

  return {
    xpGained,
    leveledUp: profile.level > oldLevel,
    oldLevel,
    newLevel: profile.level,
    newAchievements: newAchIds.map(id => ACHIEVEMENTS.find(a => a.id === id)!).filter(Boolean),
  };
}
