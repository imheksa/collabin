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
  | 'results';

export type GameMode = 'free' | 'p2e';
export type MatchMode = 'random' | 'friend';

export interface MatchResult {
  winner: Fighter;
  loser: Fighter;
  rounds: number;
  duration: number;
  maxCombo: number;
  mode: GameMode;
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
}
