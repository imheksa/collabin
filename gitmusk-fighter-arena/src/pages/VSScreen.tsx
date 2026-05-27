import { useEffect, useState } from 'react';
import { useGameStore } from '../stores/gameStore';
import { FighterCard } from '../components/FighterCard';

const RARITY_GLOW: Record<string, string> = {
  bronze: '#cd7f32',
  silver: '#c0c0c0',
  gold: '#ffd700',
  elite: '#00e5ff',
  legendary: '#b026ff',
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

  const p1Glow = RARITY_GLOW[player1.stats.rarity] ?? '#b026ff';
  const p2Glow = RARITY_GLOW[player2.stats.rarity] ?? '#b026ff';

  return (
    <div className="gscreen flex flex-col items-center justify-center overflow-hidden" style={{ minHeight: '100vh' }}>
      <style>{`
        @keyframes vs-flash { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.7;transform:scale(1.08)} }
        @keyframes fight-pop { 0%{transform:scale(.5);opacity:0} 60%{transform:scale(1.15)} 100%{transform:scale(1);opacity:1} }
        @keyframes spark-rise { 0%{transform:translateY(0);opacity:0} 10%{opacity:1} 100%{transform:translateY(-200px);opacity:0} }
      `}</style>

      {/* Background grid */}
      <div className="absolute inset-0 pointer-events-none" style={{ opacity: .4 }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(0deg,transparent 95%,rgba(176,38,255,.5) 95%), linear-gradient(90deg,transparent 95%,rgba(0,229,255,.3) 95%)',
          backgroundSize: '48px 48px',
          transform: 'perspective(600px) rotateX(55deg)',
          transformOrigin: 'center 80%',
          maskImage: 'linear-gradient(180deg,transparent 0%,#000 40%,#000 80%,transparent 100%)',
        }} />
        {/* Sparks */}
        {[
          { left:'12%', delay:'0s', color:'var(--neon-yel)' },
          { left:'28%', delay:'1.2s', color:'var(--neon-pink)' },
          { left:'50%', delay:'.4s', color:'var(--neon-b)' },
          { left:'72%', delay:'.8s', color:'var(--neon-grn)' },
          { left:'88%', delay:'1.8s', color:'var(--neon-yel)' },
        ].map(({ left, delay, color }, i) => (
          <div key={i} style={{
            position: 'absolute', bottom: '20%', left, width: '8px', height: '8px',
            background: color, boxShadow: `0 0 12px ${color}`,
            animation: `spark-rise 3.5s linear ${delay} infinite`,
          }} />
        ))}
      </div>

      <div className="relative z-10 w-full max-w-5xl px-4">
        {/* PLAYER labels */}
        <div className="flex items-center justify-between mb-4">
          <div style={{ fontFamily: 'var(--pixel)', fontSize: '10px', color: 'var(--neon-b)', textShadow: '0 0 10px var(--neon-b)', letterSpacing: '.2em' }}>
            PLAYER 1
          </div>
          <div style={{ fontFamily: 'var(--pixel)', fontSize: '10px', color: 'var(--neon-pink)', textShadow: '0 0 10px var(--neon-pink)', letterSpacing: '.2em' }}>
            PLAYER 2
          </div>
        </div>

        <div className="flex items-center gap-4 md:gap-8">
          {/* P1 */}
          <div className="flex-1 transition-all duration-700"
            style={{ transform: phase === 'enter' ? 'translateX(-80px)' : 'translateX(0)', opacity: phase === 'enter' ? 0 : 1 }}>
            <div style={{ boxShadow: `0 0 0 4px var(--void), 0 0 0 8px ${p1Glow}, 0 0 40px ${p1Glow}60` }}>
              <FighterCard fighter={player1} />
            </div>
          </div>

          {/* VS */}
          <div className="flex-shrink-0 flex flex-col items-center gap-3">
            <div style={{
              fontFamily: 'var(--pixel)',
              fontSize: phase === 'enter' ? '0px' : '56px',
              color: 'var(--neon-yel)',
              textShadow: '4px 4px 0 var(--neon-pink), 0 0 30px var(--neon-yel)',
              transition: 'font-size .3s ease',
              animation: phase !== 'enter' ? 'vs-flash 1.4s ease-in-out infinite' : 'none',
            }}>VS</div>
            {phase === 'ready' && (
              <div style={{
                fontFamily: 'var(--pixel)', fontSize: '18px', color: 'var(--neon-pink)',
                textShadow: '3px 3px 0 var(--void), 0 0 20px var(--neon-pink)',
                animation: 'fight-pop .4s ease-out',
              }}>FIGHT!</div>
            )}
          </div>

          {/* P2 */}
          <div className="flex-1 transition-all duration-700"
            style={{ transform: phase === 'enter' ? 'translateX(80px)' : 'translateX(0)', opacity: phase === 'enter' ? 0 : 1 }}>
            <div style={{ boxShadow: `0 0 0 4px var(--void), 0 0 0 8px ${p2Glow}, 0 0 40px ${p2Glow}60` }}>
              <FighterCard fighter={player2} />
            </div>
          </div>
        </div>

        {/* Archetype matchup */}
        {phase !== 'enter' && (
          <div className="text-center mt-6 flex items-center justify-center gap-3">
            <span style={{ fontFamily: 'var(--pixel)', fontSize: '10px', color: player1.stats.color }}>{player1.stats.archetypeLabel.toUpperCase()}</span>
            <div style={{ width: '32px', height: '2px', background: 'var(--panel-line)' }} />
            <span style={{ fontFamily: 'var(--pixel)', fontSize: '10px', color: 'var(--neon-yel)' }}>VS</span>
            <div style={{ width: '32px', height: '2px', background: 'var(--panel-line)' }} />
            <span style={{ fontFamily: 'var(--pixel)', fontSize: '10px', color: player2.stats.color }}>{player2.stats.archetypeLabel.toUpperCase()}</span>
          </div>
        )}
      </div>
    </div>
  );
}
