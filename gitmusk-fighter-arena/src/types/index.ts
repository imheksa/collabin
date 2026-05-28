export type TickType = 'none' | 'blue' | 'gold';

export type Rarity = 'bronze' | 'silver' | 'gold' | 'elite' | 'legendary';

export type Archetype =
  | 'crypto_trader'
  | 'ai_builder'
  | 'meme_account'
  | 'founder_ceo'
  | 'developer'
  | 'influencer'
  | 'degen'
  | 'og_holder';

export interface XProfile {
  username: string;
  displayName: string;
  bio: string;
  avatarUrl: string;
  followers: number;
  following: number;
  tweetCount: number;
  accountAgeDays: number;
  twitterScore: number;
  verified: TickType;
  isDemo?: boolean;
}

export interface FighterStats {
  // Combat stats (0-100)
  basePower: number;
  defense: number;
  speed: number;
  critRate: number;
  stamina: number;
  rageSpeed: number;

  // Derived
  rarity: Rarity;
  tier: string;
  archetype: Archetype;
  archetypeLabel: string;
  passiveAbility: string;
  ultimateName: string;
  color: string;
  glowColor: string;
}

export interface Fighter {
  profile: XProfile;
  stats: FighterStats;
}

export type GameScreen =
  | 'landing'
  | 'login'
  | 'mode_select'
  | 'room_lobby'
  | 'vs_screen'
  | 'arena'
  | 'results'
  | 'leaderboard'
  | 'profile';

export type GameMode = 'free' | 'p2e';
export type MatchMode = 'random' | 'friend';

export interface MatchResult {
  winner: Fighter;
  loser: Fighter;
  rounds: number;
  duration: number;
  maxCombo: number;
  mode: GameMode;
  disconnected?: boolean;
}

export type P2PRole = 'host' | 'client';

export interface P2PInput {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  block: boolean;
  punch: boolean;
  kick: boolean;
  special: boolean;
  ultimate: boolean;
  ts: number;
}

export type FighterState =
  | 'idle'
  | 'walk_fwd'
  | 'walk_back'
  | 'jump'
  | 'punch'
  | 'kick'
  | 'special'
  | 'ultimate'
  | 'block'
  | 'hurt'
  | 'dead';

export interface DamageOverTime {
  dmgPerTick: number;
  ticks: number;
  interval: number;
  counter: number;
  color: string;
  label: string;
  random?: [number, number];
}

export interface GameFighterState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  rage: number;
  state: FighterState;
  stateTimer: number;
  facing: 1 | -1;
  isGrounded: boolean;
  attackCooldown: number;
  blockCooldown: number;
  comboCount: number;
  comboTimer: number;
  side: 'left' | 'right';
  specialHitCount: number;
  specialReady: boolean;
  stunTimer: number;
  invincibleTimer: number;
  dots: DamageOverTime[];
}
