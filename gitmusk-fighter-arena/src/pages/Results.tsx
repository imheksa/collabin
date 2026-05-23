import { useEffect, useState } from 'react';
import { useGameStore } from '../stores/gameStore';
import { FighterCard } from '../components/FighterCard';
import { recordMatchResult } from '../utils/leaderboard';

const GAME_URL = 'https://imheksa.github.io/collabin/gitmusk-fighter-arena/';

export function Results() {
  const { matchResult, resetMatch, setScreen, player1, player2 } = useGameStore();
  const [show, setShow] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShow(true), 300);
    return () => clearTimeout(t);
  }, []);

  // Record W/L in localStorage once on mount
  useEffect(() => {
    if (!matchResult || !player1) return;
    const isP1Win = matchResult.winner.profile.username === player1.profile.username;
    recordMatchResult(player1.profile.username, isP1Win, matchResult.maxCombo);
  }, []);

  if (!matchResult || !player1 || !player2) return null;

  const { winner, loser, rounds, duration, maxCombo } = matchResult;
  const isP1Win = winner.profile.username === player1.profile.username;

  const shareText = [
    `⚔️ I just KO'd @${loser.profile.username} as @${winner.profile.username} in GitMusk Fighter Arena!`,
    ``,
    `💥 Max combo: ${maxCombo}x | ⏱ ${duration}s battle`,
    `🎮 Play free: ${GAME_URL}`,
    ``,
    `#GitMuskFighterArena #SocialFi #Base`,
  ].join('\n');

  const shareOnX = () => {
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`,
      '_blank',
      'noopener,noreferrer'
    );
  };

  const copyResult = async () => {
    await navigator.clipboard.writeText(shareText).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-arena-bg p-4 overflow-hidden">
      {/* Victory title */}
      <div
        className="font-pixel text-center mb-2 transition-all duration-500"
        style={{ opacity: show ? 1 : 0, transform: show ? 'translateY(0)' : 'translateY(-20px)' }}
      >
        <div className="text-3xl md:text-4xl mb-2"
          style={{ color: winner.stats.color, textShadow: `0 0 20px ${winner.stats.color}, 0 0 40px ${winner.stats.glowColor}` }}>
          {winner.profile.username.toUpperCase()}
        </div>
        <div className="text-xl" style={{ color: '#ffff00', textShadow: '0 0 12px #ffff00' }}>
          WINS!
        </div>
      </div>

      {/* Fighter cards */}
      <div
        className="flex gap-6 items-center my-6 transition-all duration-700"
        style={{ opacity: show ? 1 : 0, transform: show ? 'scale(1)' : 'scale(0.9)' }}
      >
        <div className="flex-1 max-w-xs">
          <div className="font-pixel text-center mb-2"
            style={{ fontSize: '8px', color: isP1Win ? '#00ffff' : '#666' }}>
            {isP1Win ? '🏆 WINNER' : '💀 LOSER'}
          </div>
          <FighterCard fighter={player1} compact={false} />
        </div>

        <div className="text-center">
          <div className="font-pixel text-gray-600 text-2xl">VS</div>
        </div>

        <div className="flex-1 max-w-xs">
          <div className="font-pixel text-center mb-2"
            style={{ fontSize: '8px', color: !isP1Win ? '#ff00ff' : '#666' }}>
            {!isP1Win ? '🏆 WINNER' : '💀 LOSER'}
          </div>
          <FighterCard fighter={player2} compact={false} />
        </div>
      </div>

      {/* Stats */}
      <div
        className="flex gap-6 mb-6 transition-all duration-700 delay-200"
        style={{ opacity: show ? 1 : 0 }}
      >
        {[
          { label: 'ROUNDS', value: rounds },
          { label: 'DURATION', value: `${duration}s` },
          { label: 'MAX COMBO', value: `${maxCombo}x` },
        ].map(stat => (
          <div key={stat.label} className="text-center">
            <div className="font-pixel text-gray-500" style={{ fontSize: '7px' }}>{stat.label}</div>
            <div className="font-pixel text-white mt-1 text-lg" style={{ textShadow: '0 0 8px #fff' }}>
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* Share on X */}
      <div
        className="w-full max-w-sm mb-4 transition-all duration-700 delay-100"
        style={{ opacity: show ? 1 : 0 }}
      >
        <div className="p-4 rounded" style={{ background: '#0a0a1a', border: '1px solid #1d9bf040' }}>
          <div className="font-mono mb-3" style={{ fontSize: '10px', color: '#888' }}>
            {shareText.split('\n').map((line, i) => (
              <div key={i}>{line || ' '}</div>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={shareOnX}
              className="flex-1 font-pixel py-3 rounded transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
              style={{
                background: 'linear-gradient(135deg, #1d9bf030, #1d9bf010)',
                border: '2px solid #1d9bf0',
                color: '#1d9bf0',
                fontSize: '9px',
                boxShadow: '0 0 15px #1d9bf030',
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.261 5.635zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              SHARE ON X
            </button>
            <button
              onClick={copyResult}
              className="font-pixel px-3 py-3 rounded transition-all hover:scale-[1.02]"
              style={{ background: 'transparent', border: '1px solid #333', color: copied ? '#00ff41' : '#555', fontSize: '8px' }}
            >
              {copied ? '✓ COPIED' : '📋'}
            </button>
          </div>
        </div>
      </div>

      {/* P2E upsell */}
      <div
        className="p-3 rounded mb-5 max-w-sm text-center transition-all duration-700 delay-300"
        style={{ background: '#12002a', border: '1px solid #bf00ff', boxShadow: '0 0 20px #bf00ff30', opacity: show ? 1 : 0 }}
      >
        <div className="font-pixel text-yellow-400 mb-1" style={{ fontSize: '9px' }}>
          💰 UPGRADE TO P2E MODE
        </div>
        <div className="font-mono text-gray-300 text-xs">
          This match was worth $0. In P2E mode, winner takes ~$9 from a $10 pool.
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 flex-wrap justify-center">
        <button
          onClick={() => { resetMatch(); setScreen('login'); }}
          className="font-pixel px-5 py-3 text-xs transition-all hover:scale-105 active:scale-95"
          style={{ border: '2px solid #00ffff', color: '#00ffff', background: 'transparent', boxShadow: '0 0 10px #00ffff30' }}
        >
          ▶ REMATCH
        </button>
        <button
          onClick={() => setScreen('leaderboard')}
          className="font-pixel px-5 py-3 text-xs transition-all hover:scale-105 active:scale-95"
          style={{ border: '2px solid #ffd700', color: '#ffd700', background: 'transparent', boxShadow: '0 0 10px #ffd70030' }}
        >
          🏆 LEADERBOARD
        </button>
        <button
          onClick={() => setScreen('landing')}
          className="font-pixel px-5 py-3 text-xs transition-all hover:scale-105 active:scale-95"
          style={{ border: '2px solid #2a0050', color: '#666', background: 'transparent' }}
        >
          ← MENU
        </button>
      </div>
    </div>
  );
}
