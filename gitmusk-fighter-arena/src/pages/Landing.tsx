import { useEffect, useState } from 'react';
import { useGameStore } from '../stores/gameStore';

// ─── CSS-animated pixel fighter silhouette ────────────────────────────────────
function FighterSilhouette({ color, flip = false }: { color: string; flip?: boolean }) {
  const s = (w: number, h: number, extra: React.CSSProperties = {}): React.CSSProperties => ({
    width: w, height: h, background: color, borderRadius: 2, flexShrink: 0, ...extra,
  });
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      filter: `drop-shadow(0 0 10px ${color})`,
      animation: `fighterIdle 0.9s ease-in-out infinite`,
      transform: flip ? 'scaleX(-1)' : 'none',
    }}>
      {/* Head */}
      <div style={{ ...s(22, 22), borderRadius: '50%', marginBottom: 2 }} />
      {/* Torso + arms row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 3 }}>
        {/* Front arm (raised in fighting stance) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginTop: 3 }}>
          <div style={s(8, 14)} />
          <div style={{ ...s(12, 8), marginLeft: -4 }} />
        </div>
        {/* Torso */}
        <div style={s(16, 30)} />
        {/* Back arm */}
        <div style={{ ...s(8, 18), marginTop: 6 }} />
      </div>
      {/* Legs */}
      <div style={{ display: 'flex', gap: 4, marginTop: 2 }}>
        <div style={{ ...s(10, 12), marginTop: 0 }} />
        <div style={{ ...s(10, 22) }} />
      </div>
      {/* Feet */}
      <div style={{ display: 'flex', gap: 2, marginTop: 0 }}>
        <div style={{ ...s(14, 7), borderRadius: '0 3px 3px 0', marginLeft: -4 }} />
        <div style={{ ...s(14, 7), borderRadius: '3px 0 0 3px', marginRight: -4 }} />
      </div>
    </div>
  );
}

// ─── How To Play modal ─────────────────────────────────────────────────────────
function HowToPlay({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.88)' }} onClick={onClose}>
      <div className="w-full max-w-lg rounded p-6 relative"
        style={{ background: '#0d001a', border: '2px solid #bf00ff', boxShadow: '0 0 40px #bf00ff30' }}
        onClick={e => e.stopPropagation()}>

        <button onClick={onClose}
          className="absolute top-3 right-4 font-pixel text-gray-600 hover:text-white"
          style={{ fontSize: '10px' }}>✕ CLOSE</button>

        <div className="font-pixel text-center mb-5" style={{ fontSize: '12px', color: '#bf00ff', textShadow: '0 0 12px #bf00ff' }}>
          ❓ HOW TO PLAY
        </div>

        {/* Steps */}
        <div className="space-y-4 mb-5">
          {[
            { n: '01', title: 'PICK YOUR FIGHTER', desc: 'Choose a demo profile or connect your X account. Your followers, tweets & engagement become your base stats.', color: '#00ffff' },
            { n: '02', title: 'ENTER THE ARENA', desc: 'Local 2-player or vs random opponent. First to drain HP wins. Unlock ULTIMATE when rage bar fills.', color: '#ff00ff' },
            { n: '03', title: 'WIN, LEVEL UP, SHARE', desc: 'Earn XP every match. Leveling up boosts your ATK & DEF permanently. Share your profile card on X.', color: '#ffd700' },
          ].map(({ n, title, desc, color }) => (
            <div key={n} className="flex gap-3">
              <div className="font-pixel flex-shrink-0 w-8 h-8 rounded flex items-center justify-center"
                style={{ background: `${color}20`, border: `1px solid ${color}`, color, fontSize: '10px' }}>{n}</div>
              <div>
                <div className="font-pixel mb-0.5" style={{ fontSize: '8px', color }}>{title}</div>
                <div className="font-mono" style={{ fontSize: '10px', color: '#666' }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Controls */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded" style={{ background: '#080015', border: '1px solid #00ffff30' }}>
            <div className="font-pixel mb-2" style={{ fontSize: '7px', color: '#00ffff' }}>⌨ PLAYER 1</div>
            {[
              ['W', 'Jump'],
              ['A / D', 'Move'],
              ['S', 'Block'],
              ['F', 'Punch'],
              ['G', 'Kick'],
              ['H', 'Special (5 hits)'],
              ['V', 'Ultimate (full rage)'],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between text-xs font-mono mb-0.5">
                <span style={{ color: '#00ffff' }}>{k}</span>
                <span style={{ color: '#555' }}>{v}</span>
              </div>
            ))}
          </div>
          <div className="p-3 rounded" style={{ background: '#080015', border: '1px solid #ff00ff30' }}>
            <div className="font-pixel mb-2" style={{ fontSize: '7px', color: '#ff00ff' }}>⌨ PLAYER 2</div>
            {[
              ['↑', 'Jump'],
              ['← / →', 'Move'],
              ['↓', 'Block'],
              ['1', 'Punch'],
              ['2', 'Kick'],
              ['3', 'Special (5 hits)'],
              ['4', 'Ultimate (full rage)'],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between text-xs font-mono mb-0.5">
                <span style={{ color: '#ff00ff' }}>{k}</span>
                <span style={{ color: '#555' }}>{v}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="text-center mt-4">
          <button onClick={onClose}
            className="font-pixel px-6 py-2 rounded transition-all hover:scale-105"
            style={{ background: '#bf00ff20', border: '2px solid #bf00ff', color: '#bf00ff', fontSize: '9px' }}>
            LET'S FIGHT! ⚔
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Landing page ─────────────────────────────────────────────────────────────

export function Landing() {
  const { setScreen, onlinePlayers, activeMatches, setOnlinePlayers, setActiveMatches } = useGameStore();
  const [blink, setBlink] = useState(true);
  const [glitch, setGlitch] = useState(false);
  const [showHowTo, setShowHowTo] = useState(false);

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
  }, [onlinePlayers, activeMatches]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-arena-bg relative overflow-hidden">
      {/* Keyframes injected once */}
      <style>{`
        @keyframes fighterIdle {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-7px); }
        }
        @keyframes vsFlash {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.1); }
        }
        @keyframes neonPulse {
          0%, 100% { box-shadow: 0 0 12px #00ffff40, inset 0 0 12px #00ffff08; }
          50% { box-shadow: 0 0 28px #00ffff80, inset 0 0 20px #00ffff15; }
        }
      `}</style>

      {/* Background stars */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 60 }, (_, i) => (
          <div key={i} className="absolute rounded-full" style={{
            width: i % 10 === 0 ? 3 : 1,
            height: i % 10 === 0 ? 3 : 1,
            left: `${(i * 17.3) % 100}%`,
            top: `${(i * 13.7) % 100}%`,
            background: ['#ff00ff', '#00ffff', '#ffff00', '#ffffff'][i % 4],
            opacity: 0.15 + (i % 5) * 0.1,
            animation: `pulse ${1.5 + (i % 4) * 0.5}s ease-in-out infinite`,
            animationDelay: `${(i % 7) * 0.3}s`,
          }} />
        ))}
      </div>

      {/* Neon grid floor */}
      <div className="absolute bottom-0 left-0 right-0 h-48 opacity-20" style={{
        backgroundImage: `
          linear-gradient(to bottom, transparent, #0d001a),
          repeating-linear-gradient(90deg, #bf00ff 0, #bf00ff 1px, transparent 0, transparent 60px),
          repeating-linear-gradient(0deg, #bf00ff 0, #bf00ff 1px, transparent 0, transparent 30px)
        `,
        perspective: '300px',
        transform: 'rotateX(30deg)',
        transformOrigin: 'bottom center',
      }} />

      <div className="relative z-10 flex flex-col items-center px-4 text-center">

        {/* ── Fighters VS preview ── */}
        <div className="flex items-end justify-center gap-6 md:gap-12 mb-5">
          <div className="flex flex-col items-center gap-2">
            <FighterSilhouette color="#00ffff" />
            <div className="font-pixel" style={{ fontSize: '7px', color: '#00ffff66' }}>P1</div>
          </div>

          <div className="flex flex-col items-center mb-2">
            <div className="font-pixel text-2xl md:text-3xl"
              style={{ color: '#ff0040', textShadow: '0 0 20px #ff0040', animation: 'vsFlash 1.5s ease-in-out infinite' }}>
              VS
            </div>
          </div>

          <div className="flex flex-col items-center gap-2">
            <FighterSilhouette color="#ff00ff" flip />
            <div className="font-pixel" style={{ fontSize: '7px', color: '#ff00ff66' }}>P2</div>
          </div>
        </div>

        {/* ── Title ── */}
        <div className={glitch ? 'animate-glitch' : ''}>
          <div className="font-pixel text-4xl md:text-5xl leading-tight mb-1"
            style={{ color: '#ff00ff', textShadow: '0 0 20px #ff00ff, 0 0 40px #bf00ff', letterSpacing: '2px' }}>
            GITMUSK
          </div>
          <div className="font-pixel text-3xl md:text-4xl leading-tight"
            style={{ color: '#00ffff', textShadow: '0 0 20px #00ffff, 0 0 40px #0080ff', letterSpacing: '4px' }}>
            FIGHTER ARENA
          </div>
        </div>

        {/* Tagline */}
        <div className="mt-3 font-mono text-sm md:text-base"
          style={{ color: '#ffff00', textShadow: '0 0 8px #ffff00' }}>
          Your social identity becomes your fighting power.
        </div>

        {/* Live counter */}
        <div className="flex justify-center gap-6 mt-2">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: '#00ff41' }} />
              <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: '#00ff41' }} />
            </span>
            <span className="font-pixel" style={{ color: '#00ff41', fontSize: '8px' }}>{onlinePlayers.toLocaleString()} ONLINE</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: '#ff6600' }} />
              <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: '#ff6600' }} />
            </span>
            <span className="font-pixel" style={{ color: '#ff6600', fontSize: '8px' }}>{activeMatches} IN BATTLE</span>
          </div>
        </div>

        {/* Tags */}
        <div className="flex gap-2 mt-3 flex-wrap justify-center">
          {['SOCIALFI', 'IDENTITY PVP', 'BASE L2', 'P2E'].map(tag => (
            <span key={tag} className="font-pixel px-2 py-0.5 rounded"
              style={{ border: '1px solid #bf00ff', color: '#bf00ff', background: '#1a003a', fontSize: '7px' }}>
              {tag}
            </span>
          ))}
        </div>

        {/* ── Blink prompt ── */}
        <div className="mt-8 mb-4 h-7 flex items-center">
          {blink && (
            <div className="font-pixel text-lg"
              style={{ color: '#ffffff', textShadow: '0 0 12px #ffffff', letterSpacing: '2px' }}>
              ► INSERT COIN TO PLAY ◄
            </div>
          )}
        </div>

        {/* ── Primary CTA ── */}
        <button onClick={() => setScreen('login')}
          className="font-pixel px-10 py-4 rounded transition-all duration-200 hover:scale-105 active:scale-95 mb-3"
          style={{
            background: 'transparent',
            border: '3px solid #00ffff',
            color: '#00ffff',
            textShadow: '0 0 10px #00ffff',
            fontSize: '14px',
            letterSpacing: '2px',
            animation: 'neonPulse 2s ease-in-out infinite',
          }}>
          ▶ ENTER ARENA
        </button>

        {/* ── Secondary buttons ── */}
        <div className="flex gap-3 flex-wrap justify-center mb-10">
          <button onClick={() => setScreen('login')}
            className="font-pixel px-4 py-2 rounded transition-all hover:scale-105"
            style={{ background: 'transparent', border: '2px solid #ff00ff', color: '#ff00ff', fontSize: '9px', boxShadow: '0 0 10px #ff00ff30' }}>
            💰 P2E MODE
          </button>
          <button onClick={() => setScreen('leaderboard')}
            className="font-pixel px-4 py-2 rounded transition-all hover:scale-105"
            style={{ background: 'transparent', border: '2px solid #ffd700', color: '#ffd700', fontSize: '9px', boxShadow: '0 0 10px #ffd70030' }}>
            🏆 LEADERBOARD
          </button>
          <button onClick={() => setShowHowTo(true)}
            className="font-pixel px-4 py-2 rounded transition-all hover:scale-105"
            style={{ background: 'transparent', border: '2px solid #bf00ff', color: '#bf00ff', fontSize: '9px', boxShadow: '0 0 10px #bf00ff30' }}>
            ❓ HOW TO PLAY
          </button>
        </div>

        {/* ── Feature cards ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-2xl">
          {[
            { icon: '🐦', label: 'X Identity', desc: 'Profile → fighter stats' },
            { icon: '⚔️', label: 'Retro PvP', desc: 'Tekken-style combat' },
            { icon: '📈', label: 'Level System', desc: 'XP, tiers, achievements' },
            { icon: '💰', label: 'P2E Economy', desc: 'Base L2 settlement' },
          ].map(f => (
            <div key={f.label} className="p-3 rounded text-center"
              style={{ background: '#12002a', border: '1px solid #2a0050' }}>
              <div className="text-2xl mb-1">{f.icon}</div>
              <div className="font-pixel text-white" style={{ fontSize: '8px' }}>{f.label}</div>
              <div className="font-mono text-gray-400 mt-1" style={{ fontSize: '10px' }}>{f.desc}</div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-6 font-mono text-xs text-gray-600">
          Built on <span style={{ color: '#00ffff' }}>@gitlawb</span>
          {' '}· Follow <span style={{ color: '#ff00ff' }}>@iniheksa</span>
        </div>
      </div>

      {/* How To Play modal */}
      {showHowTo && <HowToPlay onClose={() => setShowHowTo(false)} />}
    </div>
  );
}
