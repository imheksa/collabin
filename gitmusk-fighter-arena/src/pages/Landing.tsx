import { useEffect, useState } from 'react';
import { useGameStore } from '../stores/gameStore';

export function Landing() {
  const { setScreen, onlinePlayers, activeMatches, setOnlinePlayers, setActiveMatches } = useGameStore();
  const [blink, setBlink] = useState(true);
  const [glitch, setGlitch] = useState(false);

  useEffect(() => {
    const b = setInterval(() => setBlink(v => !v), 600);
    const g = setInterval(() => {
      setGlitch(true);
      setTimeout(() => setGlitch(false), 150);
    }, 4000);
    const o = setInterval(() => {
      setOnlinePlayers(onlinePlayers + Math.floor((Math.random() - 0.4) * 5));
      setActiveMatches(Math.max(5, activeMatches + Math.floor((Math.random() - 0.4) * 3)));
    }, 3000);
    return () => { clearInterval(b); clearInterval(g); clearInterval(o); };
  }, [onlinePlayers, activeMatches, setOnlinePlayers, setActiveMatches]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-arena-bg relative overflow-hidden">
      {/* Background stars */}
      <div className="absolute inset-0 overflow-hidden">
        {Array.from({ length: 60 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              width: Math.random() > 0.9 ? 3 : 1,
              height: Math.random() > 0.9 ? 3 : 1,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              background: ['#ff00ff', '#00ffff', '#ffff00', '#ffffff'][i % 4],
              opacity: 0.2 + Math.random() * 0.6,
              animation: `pulse ${1 + Math.random() * 3}s ease-in-out infinite`,
            }}
          />
        ))}
      </div>

      {/* Neon grid floor */}
      <div
        className="absolute bottom-0 left-0 right-0 h-48 opacity-30"
        style={{
          backgroundImage: `
            linear-gradient(to bottom, transparent, #0d001a),
            repeating-linear-gradient(90deg, #bf00ff 0, #bf00ff 1px, transparent 0, transparent 60px),
            repeating-linear-gradient(0deg, #bf00ff 0, #bf00ff 1px, transparent 0, transparent 30px)
          `,
          perspective: '300px',
          transform: 'rotateX(30deg)',
          transformOrigin: 'bottom center',
        }}
      />

      <div className="relative z-10 flex flex-col items-center px-4 text-center">
        {/* Game title */}
        <div className={glitch ? 'animate-glitch' : ''}>
          <div
            className="font-pixel text-4xl md:text-5xl leading-tight mb-2"
            style={{
              color: '#ff00ff',
              textShadow: '0 0 20px #ff00ff, 0 0 40px #bf00ff, 0 0 80px #7700aa',
              letterSpacing: '2px',
            }}
          >
            GITMUSK
          </div>
          <div
            className="font-pixel text-3xl md:text-4xl leading-tight"
            style={{
              color: '#00ffff',
              textShadow: '0 0 20px #00ffff, 0 0 40px #0080ff',
              letterSpacing: '4px',
            }}
          >
            FIGHTER ARENA
          </div>
        </div>

        {/* Tagline */}
        <div className="mt-4 font-mono text-sm md:text-base"
          style={{ color: '#ffff00', textShadow: '0 0 8px #ffff00' }}>
          Your social identity becomes your fighting power.
        </div>

        {/* Live online counter */}
        <div className="flex justify-center gap-6 mt-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                style={{ background: '#00ff41' }} />
              <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: '#00ff41' }} />
            </span>
            <span className="font-pixel" style={{ color: '#00ff41', fontSize: '8px' }}>
              {onlinePlayers.toLocaleString()} ONLINE
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                style={{ background: '#ff6600' }} />
              <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: '#ff6600' }} />
            </span>
            <span className="font-pixel" style={{ color: '#ff6600', fontSize: '8px' }}>
              {activeMatches} IN BATTLE
            </span>
          </div>
        </div>

        {/* Badges */}
        <div className="flex gap-3 mt-4 flex-wrap justify-center">
          {['SOCIALFI', 'IDENTITY PVP', 'BASE L2', 'P2E ECONOMY'].map(tag => (
            <span
              key={tag}
              className="font-pixel px-2 py-1 text-xs rounded"
              style={{
                border: '1px solid #bf00ff',
                color: '#bf00ff',
                background: '#1a003a',
                fontSize: '8px',
              }}
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Coin insert */}
        <div className="mt-12 mb-6">
          {blink && (
            <div
              className="font-pixel text-lg md:text-xl"
              style={{
                color: '#ffffff',
                textShadow: '0 0 12px #ffffff',
                letterSpacing: '2px',
              }}
            >
              ► INSERT COIN TO PLAY ◄
            </div>
          )}
          {!blink && <div className="h-7" />}
        </div>

        {/* Mode buttons */}
        <div className="flex flex-col sm:flex-row gap-4 flex-wrap justify-center">
          <button
            onClick={() => setScreen('login')}
            className="font-pixel px-6 py-3 transition-all duration-200 hover:scale-105 active:scale-95"
            style={{
              background: 'transparent',
              border: '2px solid #00ffff',
              color: '#00ffff',
              textShadow: '0 0 8px #00ffff',
              boxShadow: '0 0 15px #00ffff40, inset 0 0 15px #00ffff10',
              fontSize: '11px',
              letterSpacing: '1px',
            }}
          >
            ▶ FREE MODE
          </button>
          <button
            onClick={() => setScreen('login')}
            className="font-pixel px-6 py-3 transition-all duration-200 hover:scale-105 active:scale-95"
            style={{
              background: 'transparent',
              border: '2px solid #ff00ff',
              color: '#ff00ff',
              textShadow: '0 0 8px #ff00ff',
              boxShadow: '0 0 15px #ff00ff40, inset 0 0 15px #ff00ff10',
              fontSize: '11px',
              letterSpacing: '1px',
            }}
          >
            💰 PLAY TO EARN
          </button>
          <button
            onClick={() => setScreen('leaderboard')}
            className="font-pixel px-6 py-3 transition-all duration-200 hover:scale-105 active:scale-95"
            style={{
              background: 'transparent',
              border: '2px solid #ffd700',
              color: '#ffd700',
              textShadow: '0 0 8px #ffd700',
              boxShadow: '0 0 15px #ffd70040, inset 0 0 15px #ffd70010',
              fontSize: '11px',
              letterSpacing: '1px',
            }}
          >
            🏆 LEADERBOARD
          </button>
        </div>

        {/* Feature list */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-12 max-w-2xl">
          {[
            { icon: '🐦', label: 'X OAuth Login', desc: 'Your profile = your fighter' },
            { icon: '⚔️', label: 'Retro PvP', desc: 'Tekken-style combat' },
            { icon: '🔗', label: 'On-Chain', desc: 'Base L2 settlement' },
            { icon: '💎', label: 'P2E Economy', desc: '$5 min battle entry' },
          ].map(f => (
            <div
              key={f.label}
              className="p-3 rounded text-center"
              style={{ background: '#12002a', border: '1px solid #2a0050' }}
            >
              <div className="text-2xl mb-1">{f.icon}</div>
              <div className="font-pixel text-white" style={{ fontSize: '8px' }}>{f.label}</div>
              <div className="font-mono text-gray-400 mt-1" style={{ fontSize: '10px' }}>{f.desc}</div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-8 font-mono text-xs text-gray-600">
          Built on{' '}
          <span style={{ color: '#00ffff' }}>@gitlawb</span>
          {' '}· Follow{' '}
          <span style={{ color: '#ff00ff' }}>@iniheksa</span>
          {' '}to unlock Free Mode
        </div>
      </div>
    </div>
  );
}
