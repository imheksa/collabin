import { Archetype } from '../types';

export interface ArchetypeData {
  label: string;
  description: string;
  passiveAbility: string;
  ultimateName: string;
  ultimateDescription: string;
  color: string;
  glowColor: string;
  primaryKeywords: string[];
  keywords: string[];
  attackMod: number;
  defenseMod: number;
  speedMod: number;
  critMod: number;
}

export const ARCHETYPES: Record<Archetype, ArchetypeData> = {
  crypto_trader: {
    label: 'Crypto Trader',
    description: 'High burst damage, volatile attack patterns, low defense.',
    passiveAbility: 'Market Pump: combos deal +30% damage when HP > 70%',
    ultimateName: 'Liquidation Cascade',
    ultimateDescription: 'Wipe opponent HP by 40% in one devastating strike',
    color: '#ffaa00',
    glowColor: '#ff6600',
    primaryKeywords: ['trader', 'trading', 'trade', 'dex', 'perps', 'futures', 'leverage', 'scalp', 'swing trade', 'day trade'],
    keywords: ['alpha', 'chart', 'candle', 'ta ', 'technical analysis', 'long', 'short', 'liquidat', 'pnl', 'profit', 'loss', 'portfolio', 'market', 'hedge', 'spot', 'margin', 'order', 'bid', 'ask', 'whale alert', 'signal'],
    attackMod: 1.3,
    defenseMod: 0.7,
    speedMod: 1.1,
    critMod: 1.2,
  },
  ai_builder: {
    label: 'AI Builder',
    description: 'Drone summons, prediction shield, tactical zoning.',
    passiveAbility: 'Prediction Engine: 20% chance to predict and dodge attacks',
    ultimateName: 'Autonomous Strike',
    ultimateDescription: 'Deploy AI drones that deal continuous damage for 5s',
    color: '#00ffff',
    glowColor: '#0080ff',
    primaryKeywords: ['ai ', ' ai', 'artificial intelligence', 'machine learning', 'deep learning', 'researcher', 'research', 'llm', 'neural', 'ml '],
    keywords: ['gpt', 'claude', 'agent', 'model', 'transformer', 'diffusion', 'rl ', 'reinforcement', 'computer vision', 'nlp', 'data scien', 'phd', 'professor', 'academic', 'paper', 'arxiv', 'lab', 'openai', 'anthropic', 'deepmind', 'hugging', 'pytorch', 'tensorflow'],
    attackMod: 1.0,
    defenseMod: 1.1,
    speedMod: 0.9,
    critMod: 1.3,
  },
  meme_account: {
    label: 'Meme Chaos Agent',
    description: 'Randomized attacks, chaos-based criticals, luck amplification.',
    passiveAbility: 'RNG God: random chance for any attack to deal 3x damage',
    ultimateName: 'Viral Overload',
    ultimateDescription: 'Spam 7 random hits in 2 seconds — total chaos',
    color: '#ff00ff',
    glowColor: '#bf00ff',
    primaryKeywords: ['meme', 'shitpost', 'parody', 'satire', 'comedian', 'comedy', 'humor', 'funny'],
    keywords: ['lol', 'lmao', 'gm', 'ser', 'fren', 'kek', 'pepe', 'dank', 'ratio', 'cope', 'seethe', 'based', 'touch grass', 'jokes', 'troll', 'viral', 'clown'],
    attackMod: 1.1,
    defenseMod: 0.8,
    speedMod: 1.4,
    critMod: 1.5,
  },
  founder_ceo: {
    label: 'Founder / CEO',
    description: 'Leadership aura, teamwide buffs, crowd control.',
    passiveAbility: 'Founder Aura: every 10s, fully restore 15% HP',
    ultimateName: 'Vision Statement',
    ultimateDescription: 'Stun opponent for 3s while dealing steady damage',
    color: '#00ff41',
    glowColor: '#00cc33',
    primaryKeywords: ['founder', 'ceo', 'co-founder', 'cofounder', 'cto', 'coo', 'cmo', 'chief', 'startup'],
    keywords: ['building', 'vision', 'team', 'launch', 'product', 'company', 'venture', 'raise', 'series', 'seed', 'pre-seed', 'incubat', 'accelerat', 'ycombinator', 'yc ', 'entrepreneur', 'executive', 'director', 'head of', 'vp '],
    attackMod: 0.9,
    defenseMod: 1.2,
    speedMod: 1.0,
    critMod: 1.0,
  },
  developer: {
    label: 'Developer',
    description: 'Precise attacks, exploit combos, tech superiority.',
    passiveAbility: 'Stack Overflow: combos of 3+ deal +50% damage bonus',
    ultimateName: 'Zero Day Exploit',
    ultimateDescription: 'Bypass all defenses for one guaranteed critical hit',
    color: '#00ccff',
    glowColor: '#0066ff',
    primaryKeywords: ['developer', 'engineer', 'dev ', ' dev', 'software', 'full stack', 'fullstack', 'backend', 'frontend', 'solidity'],
    keywords: ['open source', 'github', 'commit', 'deploy', 'stack', 'rust', 'python', 'javascript', 'typescript', 'golang', 'react', 'node', 'smart contract', 'protocol', 'infra', 'devrel', 'hacker', 'hackathon', 'code', 'programming', 'security', 'audit'],
    attackMod: 1.1,
    defenseMod: 1.0,
    speedMod: 1.0,
    critMod: 1.4,
  },
  influencer: {
    label: 'Social Influencer',
    description: 'High social authority buff, influence aura, crowd manipulation.',
    passiveAbility: 'Influencer Aura: opponent loses 5% attack for each 10k followers',
    ultimateName: 'Cancel Wave',
    ultimateDescription: 'Remove opponent rage bar completely and stun for 2s',
    color: '#ff6699',
    glowColor: '#ff0066',
    primaryKeywords: ['influencer', 'content creator', 'creator', 'youtuber', 'streamer', 'podcaster', 'podcast'],
    keywords: ['follow', 'brand', 'collab', 'sponsor', 'growth', 'audience', 'subscribe', 'community', 'newsletter', 'thread', 'threadoor', 'media', 'journalist', 'writer', 'author', 'blog', 'vlog'],
    attackMod: 0.9,
    defenseMod: 1.0,
    speedMod: 1.2,
    critMod: 1.1,
  },
  degen: {
    label: 'Crypto Degen',
    description: 'Maximum risk, maximum reward — all or nothing fighter.',
    passiveAbility: 'Degen Mode: below 30% HP, attack doubles and defense halves',
    ultimateName: 'Ape In',
    ultimateDescription: 'Bet everything — 50% chance instant KO, 50% chance self-damage',
    color: '#ff3300',
    glowColor: '#ff0000',
    primaryKeywords: ['degen', 'ape', 'yolo', 'gambl', 'casino', 'memecoin', 'meme coin'],
    keywords: ['100x', 'moon', 'jeet', 'rugged', 'rug', 'lfg', 'wagmi', 'ngmi', 'ponzi', 'airdrop', 'farm', 'yield', 'flip', 'pump', 'dump', 'fomo', 'fud', 'rekt', 'gwei', 'gas', 'mint', 'nft'],
    attackMod: 1.4,
    defenseMod: 0.6,
    speedMod: 1.2,
    critMod: 1.3,
  },
  og_holder: {
    label: 'OG Veteran',
    description: 'Max defense, resistance, cooldown reduction — built different.',
    passiveAbility: 'OG Status: -30% damage received from all sources',
    ultimateName: 'Old Guard',
    ultimateDescription: 'Enter invincibility for 4s and deal steady chip damage',
    color: '#ffd700',
    glowColor: '#ffcc00',
    primaryKeywords: ['og ', ' og', 'veteran', 'early adopter', 'since 2009', 'since 2010', 'since 2011', 'since 2012', 'since 2013', 'since 2014', 'since 2015'],
    keywords: ['early', 'hodl', 'diamond hands', 'long term', 'holder', 'maxi', 'maximalist', 'genesis', 'pre-mine', 'satoshi'],
    attackMod: 0.9,
    defenseMod: 1.5,
    speedMod: 0.9,
    critMod: 0.9,
  },
  bankr_club: {
    label: 'Bankr Club',
    description: 'Exclusive whale-tier club member. Superior across all stats.',
    passiveAbility: 'Club Access: Regenerate 3% HP every 8 seconds',
    ultimateName: 'Whale Protocol',
    ultimateDescription: "Deal damage equal to 50% of the opponent's current HP",
    color: '#ffd700',
    glowColor: '#ffaa00',
    primaryKeywords: [],
    keywords: [],
    attackMod: 1.25,
    defenseMod: 1.25,
    speedMod: 1.2,
    critMod: 1.2,
  },
};

export function detectArchetype(profile: { bio: string; username: string; accountAgeDays: number }): Archetype {
  const text = ` ${profile.bio} ${profile.username} `.toLowerCase();

  const scores: Record<string, number> = {};
  for (const [archetype, data] of Object.entries(ARCHETYPES)) {
    if (archetype === 'bankr_club') continue;
    let score = 0;
    for (const kw of data.primaryKeywords) {
      if (text.includes(kw)) score += 3;
    }
    for (const kw of data.keywords) {
      if (text.includes(kw)) score += 1;
    }
    scores[archetype] = score;
  }

  // Mild bonus for old accounts — not enough to override clear keyword matches
  if (profile.accountAgeDays > 3650) scores['og_holder'] = (scores['og_holder'] || 0) + 1;

  const best = Object.entries(scores).sort(([, a], [, b]) => b - a)[0];
  return (best[1] > 0 ? best[0] : 'degen') as Archetype;
}
