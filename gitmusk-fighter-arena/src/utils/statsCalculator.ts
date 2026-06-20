import { XProfile, FighterStats, Rarity } from '../types';
import { detectArchetype, ARCHETYPES } from '../data/archetypes';

function clamp(val: number, min: number, max: number) {
  return Math.min(max, Math.max(min, val));
}

function getRarity(score: number): Rarity {
  if (score >= 90) return 'legendary';
  if (score >= 70) return 'elite';
  if (score >= 50) return 'gold';
  if (score >= 30) return 'silver';
  return 'bronze';
}

function getTierLabel(rarity: Rarity): string {
  const labels: Record<Rarity, string> = {
    bronze: 'Bronze Tier',
    silver: 'Silver Tier',
    gold: 'Gold Tier',
    elite: 'Elite Tier',
    legendary: 'Legendary',
  };
  return labels[rarity];
}

export function calculateFighterStats(profile: XProfile, opts?: { bankrClub?: boolean }): FighterStats {
  const { twitterScore, followers, accountAgeDays, tweetCount, verified } = profile;

  // Base power from Twitter Score (main stat)
  const basePower = clamp(twitterScore, 10, 100);

  // Defense from account age (OG accounts survive longer)
  const ageFactor = Math.min(1, accountAgeDays / 3650);
  const defense = clamp(Math.floor(30 + ageFactor * 50), 10, 95);

  // Speed from verification + tick type
  let speed = 50;
  if (verified === 'blue') speed += 15;
  if (verified === 'gold') speed += 5;
  speed = clamp(speed + Math.floor(Math.random() * 10), 20, 95);

  // Crit rate from verified followers
  const verifiedFollowerEst = verified === 'none' ? followers * 0.3 : followers * 0.7;
  const critRate = clamp(Math.floor(10 + Math.log10(verifiedFollowerEst + 1) * 5), 5, 60);

  // Stamina from total posts
  const stamina = clamp(Math.floor(30 + Math.log10(tweetCount + 1) * 12), 20, 95);

  // Rage speed from activity
  const rageSpeed = clamp(Math.floor(20 + Math.log10(tweetCount + 1) * 15), 15, 90);

  // Archetype — bankr club members bypass keyword detection
  const archetype = opts?.bankrClub
    ? 'bankr_club'
    : detectArchetype({ bio: profile.bio, username: profile.username, accountAgeDays });
  const archetypeData = ARCHETYPES[archetype];

  // Apply archetype modifiers
  const finalBasePower = clamp(Math.floor(basePower * archetypeData.attackMod), 10, 100);
  const finalDefense = clamp(Math.floor(defense * archetypeData.defenseMod), 5, 100);
  const finalSpeed = clamp(Math.floor(speed * archetypeData.speedMod), 10, 100);
  const finalCritRate = clamp(Math.floor(critRate * archetypeData.critMod), 5, 80);

  // Tick bonus
  let verifiedBonus = 0;
  if (verified === 'blue') verifiedBonus = 5;
  if (verified === 'gold') verifiedBonus = 12;

  // Bankr Club members are always legendary
  const rarity = opts?.bankrClub ? 'legendary' : getRarity(twitterScore + verifiedBonus);

  return {
    basePower: finalBasePower,
    defense: finalDefense,
    speed: finalSpeed,
    critRate: finalCritRate,
    stamina,
    rageSpeed,
    rarity,
    tier: getTierLabel(rarity),
    archetype,
    archetypeLabel: archetypeData.label,
    passiveAbility: archetypeData.passiveAbility,
    ultimateName: archetypeData.ultimateName,
    color: archetypeData.color,
    glowColor: archetypeData.glowColor,
  };
}

export function calcDamage(
  attacker: FighterStats,
  defender: FighterStats,
  moveType: 'punch' | 'kick' | 'special' | 'ultimate',
  isBlocking: boolean,
  comboCount: number,
  attackerMods?: { attackMult: number },
  defenderMods?: { defenseMult: number },
): number {
  const baseDamage: Record<string, number> = {
    punch: 6,
    kick: 10,
    special: 14,
    ultimate: 35,
  };

  const base = baseDamage[moveType];
  const attackMult = 0.5 + (attacker.basePower / 100);
  const combBonus = 1 + comboCount * 0.1;
  const isCrit = Math.random() * 100 < attacker.critRate;
  const critMult = isCrit ? 1.6 : 1.0;

  let damage = base * attackMult * combBonus * critMult;

  // Profile-based attack modifier
  if (attackerMods) damage *= attackerMods.attackMult;

  // Defense reduction (archetype stat)
  const defReduction = defender.defense / 200;
  damage *= (1 - defReduction);

  // Profile-based defense modifier (less damage taken)
  if (defenderMods) damage *= defenderMods.defenseMult;

  // Block reduces damage by 80%
  if (isBlocking) damage *= 0.2;

  return Math.max(1, Math.floor(damage));
}
