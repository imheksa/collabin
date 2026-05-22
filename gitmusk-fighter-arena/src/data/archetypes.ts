import { Archetype } from '../types';

export interface ArchetypeData {
  label: string;
  description: string;
  passiveAbility: string;
  ultimateName: string;
  ultimateDescription: string;
  color: string;
  glowColor: string;
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
    keywords: ['trade', 'crypto', 'alpha', 'defi', 'degen', 'btc', 'eth', 'sol', 'pump', 'dump', 'chart'],
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
    keywords: ['ai', 'ml', 'build', 'engineer', 'agent', 'llm', 'model', 'code', 'neural', 'gpt', 'claude'],
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
    keywords: ['meme', 'lol', 'based', 'gm', 'wen', 'ser', 'fren', 'kek', 'wagmi', 'ngmi', 'pepe'],
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
    keywords: ['founder', 'ceo', 'building', 'startup', 'vision', 'team', 'co-founder', 'launch', 'product'],
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
    keywords: ['dev', 'developer', 'open source', 'github', 'commit', 'pull request', 'deploy', 'stack', 'backend', 'frontend'],
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
    keywords: ['follow', 'content', 'creator', 'brand', 'collab', 'sponsor', 'viral', 'growth'],
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
    keywords: ['ape', 'yolo', '100x', 'moon', 'nft', 'jeet', 'rugged', 'lfg', 'wagmi', 'casino'],
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
    color: '#gold',
    glowColor: '#ffcc00',
    keywords: ['og', 'early', '2010', '2011', '2012', '2013', '2014', 'veteran', 'since'],
    attackMod: 0.9,
    defenseMod: 1.5,
    speedMod: 0.9,
    critMod: 0.9,
  },
};

export function detectArchetype(profile: { bio: string; username: string; accountAgeDays: number }): Archetype {
  const text = `${profile.bio} ${profile.username}`.toLowerCase();

  const scores: Record<Archetype, number> = {} as Record<Archetype, number>;
  for (const [archetype, data] of Object.entries(ARCHETYPES)) {
    scores[archetype as Archetype] = data.keywords.filter(k => text.includes(k)).length;
  }

  if (profile.accountAgeDays > 3650) scores['og_holder'] += 3;

  const best = Object.entries(scores).sort(([, a], [, b]) => b - a)[0];
  return (best[1] > 0 ? best[0] : 'degen') as Archetype;
}
