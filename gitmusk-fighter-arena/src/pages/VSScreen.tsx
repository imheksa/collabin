import { useEffect, useState } from 'react';
import { useGameStore } from '../stores/gameStore';
import { FighterCard } from '../components/FighterCard';

const RARITY_GLOW: Record<string, string> = {
  bronze: '#cd7f32',
  silver: '#c0c0c0',
  gold: '#ffd700',
  elite: '#00ffff',
  legendary: '#ff00ff',
};

export function VSScreen() {
  const { player1, player2, setScreen } = useGameStore();
  const [phase, setPhase] = useState<'enter' | 'vs' | 'ready'>('enter');

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('vs'), 800);
    const t2 = setTimeout(() => setPhase('ready'), 2000);
    const t3 = setTimeout(() => setScreen('arena'), 3500);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [setScreen]);

  if (!player1 || !player2) return null;

  const p1Glow = RARITY_GLOW[player1.stats.rarity];
  const p2Glow = RARITY_GLOW[player2.stats.rarity];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-arena-bg overflow-hidden">
      <div className="w-full max-w-4xl px-4">
        <div className="flex items-center gap-4 md:gap-8">
          {/* P1 */}
          <div
            className="flex-1 transition-all duration-700"
            style={{
              transform: phase === 'enter' ? 'translateX(-100px)' : 'translateX(0)',
              opacity: phase === 'enter' ? 0 : 1,
            }}
          >
            <div className="font-pixel text-center mb-3 text-sm"
              style={{ color: '#00ffff', textShadow: '0 0 10px #00ffff' }}>
              PLAYER 1
            </div>
            <div style={{
              boxShadow: `0 0 40px ${p1Glow}60, 0 0 80px ${p1Glow}30`,
              borderRadius: 4,
            }}>
              <FighterCard fighter={player1} />
            </div>
          </div>

          {/* VS */}
          <div className="flex-shrink-0 text-center">
            <div
              className="font-pixel transition-all duration-300"
              style={{
                fontSize: phase === 'vs' || phase === 'ready' ? '48px' : '0px',
                color: '#ffff00',
                textShadow: '0 0 20px #ffff00, 0 0 40px #ffaa00',
                opacity: phase === 'enter' ? 0 : 1,
              }}
            >
              VS
            </div>
            {phase === 'ready' && (
              <div className="font-pixel text-white mt-2 animate-pulse" style={{ fontSize: '11px' }}>
                FIGHT!
              </div>
            )}
          </div>

          {/* P2 */}
          <div
            className="flex-1 transition-all duration-700"
            style={{
              transform: phase === 'enter' ? 'translateX(100px)' : 'translateX(0)',
              opacity: phase === 'enter' ? 0 : 1,
            }}
          >
            <div className="font-pixel text-center mb-3 text-sm"
              style={{ color: '#ff00ff', textShadow: '0 0 10px #ff00ff' }}>
              PLAYER 2
            </div>
            <div style={{
              boxShadow: `0 0 40px ${p2Glow}60, 0 0 80px ${p2Glow}30`,
              borderRadius: 4,
            }}>
              <FighterCard fighter={player2} />
            </div>
          </div>
        </div>

        {/* Archetype matchup */}
        {phase !== 'enter' && (
          <div className="text-center mt-6 font-mono text-gray-400 text-sm">
            <span style={{ color: player1.stats.color }}>{player1.stats.archetypeLabel}</span>
            <span className="mx-3 text-gray-600">VS</span>
            <span style={{ color: player2.stats.color }}>{player2.stats.archetypeLabel}</span>
          </div>
        )}
      </div>
    </div>
  );
}
