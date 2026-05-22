import { useEffect, useState } from 'react';
import { useGameStore } from '../stores/gameStore';
import { FighterCard } from '../components/FighterCard';

export function Results() {
  const { matchResult, resetMatch, setScreen, player1, player2 } = useGameStore();
  const [show, setShow] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShow(true), 300);
    return () => clearTimeout(t);
  }, []);

  if (!matchResult || !player1 || !player2) return null;

  const { winner, loser, rounds, duration, maxCombo } = matchResult;
  const isP1Win = winner.profile.username === player1.profile.username;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-arena-bg p-4 overflow-hidden">
      {/* Victory title */}
      <div
        className="font-pixel text-center mb-2 transition-all duration-500"
        style={{
          opacity: show ? 1 : 0,
          transform: show ? 'translateY(0)' : 'translateY(-20px)',
        }}
      >
        <div
          className="text-3xl md:text-4xl mb-2"
          style={{
            color: winner.stats.color,
            textShadow: `0 0 20px ${winner.stats.color}, 0 0 40px ${winner.stats.glowColor}`,
          }}
        >
          {winner.profile.username.toUpperCase()}
        </div>
        <div
          className="text-xl"
          style={{ color: '#ffff00', textShadow: '0 0 12px #ffff00' }}
        >
          WINS!
        </div>
      </div>

      {/* Fighter cards */}
      <div
        className="flex gap-6 items-center my-6 transition-all duration-700"
        style={{ opacity: show ? 1 : 0, transform: show ? 'scale(1)' : 'scale(0.9)' }}
      >
        <div className="flex-1 max-w-xs">
          <div
            className="font-pixel text-center mb-2"
            style={{
              fontSize: '8px',
              color: isP1Win ? '#00ffff' : '#666',
            }}
          >
            {isP1Win ? '🏆 WINNER' : '💀 LOSER'}
          </div>
          <FighterCard fighter={player1} compact={false} />
        </div>

        <div className="text-center">
          <div className="font-pixel text-gray-600 text-2xl">VS</div>
        </div>

        <div className="flex-1 max-w-xs">
          <div
            className="font-pixel text-center mb-2"
            style={{
              fontSize: '8px',
              color: !isP1Win ? '#ff00ff' : '#666',
            }}
          >
            {!isP1Win ? '🏆 WINNER' : '💀 LOSER'}
          </div>
          <FighterCard fighter={player2} compact={false} />
        </div>
      </div>

      {/* Stats */}
      <div
        className="flex gap-6 mb-8 transition-all duration-700 delay-200"
        style={{ opacity: show ? 1 : 0 }}
      >
        {[
          { label: 'ROUNDS', value: rounds },
          { label: 'DURATION', value: `${duration}s` },
          { label: 'MAX COMBO', value: `${maxCombo}x` },
        ].map(stat => (
          <div key={stat.label} className="text-center">
            <div className="font-pixel text-gray-500" style={{ fontSize: '7px' }}>{stat.label}</div>
            <div className="font-pixel text-white mt-1 text-lg"
              style={{ textShadow: '0 0 8px #fff' }}>
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* P2E upsell */}
      <div
        className="p-4 rounded mb-6 max-w-sm text-center transition-all duration-700 delay-300"
        style={{
          background: '#12002a',
          border: '1px solid #bf00ff',
          boxShadow: '0 0 20px #bf00ff30',
          opacity: show ? 1 : 0,
        }}
      >
        <div className="font-pixel text-yellow-400 mb-2" style={{ fontSize: '9px' }}>
          💰 UPGRADE TO P2E MODE
        </div>
        <div className="font-mono text-gray-300 text-xs mb-3">
          This match was worth $0. In P2E mode, winner takes ~$9 from a $10 prize pool.
        </div>
        <div className="font-pixel text-xs text-gray-500" style={{ fontSize: '7px' }}>
          Requires: X OAuth + Bankr wallet + Base token ($100k+ mcap)
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-4">
        <button
          onClick={() => {
            resetMatch();
            setScreen('login');
          }}
          className="font-pixel px-5 py-3 text-xs transition-all hover:scale-105 active:scale-95"
          style={{
            border: '2px solid #00ffff',
            color: '#00ffff',
            background: 'transparent',
            boxShadow: '0 0 10px #00ffff30',
          }}
        >
          ▶ REMATCH
        </button>
        <button
          onClick={() => setScreen('landing')}
          className="font-pixel px-5 py-3 text-xs transition-all hover:scale-105 active:scale-95"
          style={{
            border: '2px solid #2a0050',
            color: '#666',
            background: 'transparent',
          }}
        >
          ← MENU
        </button>
      </div>
    </div>
  );
}
