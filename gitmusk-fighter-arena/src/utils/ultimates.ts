import { Archetype, FighterStats, GameFighterState } from '../types';
import { calcDamage } from './statsCalculator';

export interface UltimateResult {
  damage: number;      // immediate damage applied to defender
  selfDamage: number;  // damage applied back to attacker (e.g. degen bust)
  text: string;        // floating banner shown on use
}

/**
 * Applies one fighter's archetype ultimate. Mutates attacker/defender for
 * lasting effects (stun, damage-over-time, invincibility, rage drain) and
 * returns the immediate damage numbers + banner text for the caller to render.
 *
 * `inRange` gates the damage-dealing portion; self-buffs and the degen gamble
 * still resolve out of range so the rage is never wasted silently.
 */
export function applyUltimate(
  archetype: Archetype,
  attacker: GameFighterState,
  defender: GameFighterState,
  attackerStats: FighterStats,
  defenderStats: FighterStats,
  attackerMods: { attackMult: number } | undefined,
  defenderMods: { defenseMult: number } | undefined,
  inRange: boolean,
): UltimateResult {
  const immune = defender.invincibleTimer > 0;

  // A solid single-hit baseline used by several archetypes.
  const heavyHit = () =>
    immune ? 0 : calcDamage(attackerStats, defenderStats, 'ultimate', false, 0, attackerMods, defenderMods);

  switch (archetype) {
    case 'degen': {
      // Ape In — 50% jackpot (near-instant KO), 50% bust (self damage).
      if (Math.random() < 0.5) {
        const dmg = immune ? 0 : Math.ceil(defender.hp * 0.85);
        return { damage: inRange ? dmg : 0, selfDamage: 0, text: inRange ? 'APE IN — JACKPOT!' : 'APE IN — WHIFF' };
      }
      return { damage: 0, selfDamage: 22, text: 'APE IN — REKT!' };
    }

    case 'crypto_trader': {
      // Liquidation Cascade — wipe 40% of the opponent's max HP.
      const dmg = immune ? 0 : Math.ceil(defender.maxHp * 0.4);
      return { damage: inRange ? dmg : 0, selfDamage: 0, text: 'LIQUIDATION CASCADE' };
    }

    case 'developer': {
      // Zero Day Exploit — bypass defense, guaranteed crit.
      const raw = 35 * (0.5 + attackerStats.basePower / 100) * 1.6 * (attackerMods?.attackMult ?? 1);
      const dmg = immune ? 0 : Math.ceil(raw);
      return { damage: inRange ? dmg : 0, selfDamage: 0, text: 'ZERO DAY EXPLOIT' };
    }

    case 'founder_ceo': {
      // Vision Statement — stun 3s + steady chip damage.
      if (inRange && !immune) {
        defender.stunTimer = Math.max(defender.stunTimer, 180);
        defender.dots.push({ dmgPerTick: 3, ticks: 6, interval: 28, counter: 0, color: '#00ff41', label: 'VISION' });
      }
      return { damage: inRange ? Math.ceil(heavyHit() * 0.5) : 0, selfDamage: 0, text: 'VISION STATEMENT' };
    }

    case 'influencer': {
      // Cancel Wave — drain opponent rage + stun 2s.
      if (inRange && !immune) {
        defender.rage = 0;
        defender.stunTimer = Math.max(defender.stunTimer, 120);
      }
      return { damage: inRange ? Math.ceil(heavyHit() * 0.6) : 0, selfDamage: 0, text: 'CANCEL WAVE' };
    }

    case 'ai_builder': {
      // Autonomous Strike — deploy drones dealing continuous damage.
      if (inRange && !immune) {
        defender.dots.push({ dmgPerTick: 5, ticks: 10, interval: 18, counter: 0, color: '#00ffff', label: 'DRONE' });
      }
      return { damage: inRange && !immune ? 8 : 0, selfDamage: 0, text: 'AUTONOMOUS STRIKE' };
    }

    case 'meme_account': {
      // Viral Overload — spam 7 random hits.
      if (inRange && !immune) {
        defender.dots.push({ dmgPerTick: 0, ticks: 7, interval: 9, counter: 0, color: '#ff00ff', label: 'VIRAL', random: [3, 9] });
      }
      return { damage: inRange && !immune ? 6 : 0, selfDamage: 0, text: 'VIRAL OVERLOAD' };
    }

    case 'og_holder': {
      // Old Guard — self invincibility 4s + chip damage to opponent.
      attacker.invincibleTimer = Math.max(attacker.invincibleTimer, 240);
      if (inRange && !immune) {
        defender.dots.push({ dmgPerTick: 3, ticks: 8, interval: 24, counter: 0, color: '#ffd700', label: 'CHIP' });
      }
      return { damage: inRange && !immune ? 6 : 0, selfDamage: 0, text: 'OLD GUARD — INVINCIBLE' };
    }

    default: {
      const dmg = heavyHit();
      return { damage: inRange ? dmg : 0, selfDamage: 0, text: 'ULTIMATE' };
    }
  }
}
