import { useEffect, useState, useRef } from 'react';
import { useGameStore } from '../stores/gameStore';
import { FighterCard } from '../components/FighterCard';
import { supabase } from '../lib/supabase';

const RARITY_GLOW: Record<string, string> = {
  bronze: '#cd7f32',
  silver: '#c0c0c0',
  gold: '#ffd700',
  elite: '#00e5ff',
  legendary: '#b026ff',
};

export function VSScreen() {
  const { player1, player2, setScreen, matchId, isHost } = useGameStore();
  const [phase, setPhase] = useState<'enter' | 'vs' | 'ready_wait' | 'countdown' | 'fight'>('enter');
  const [p1Ready, setP1Ready] = useState(false);
  const [p2Ready, setP2Ready] = useState(false);
  const [localReady, setLocalReady] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [readyTimer, setReadyTimer] = useState(30);
  const vsChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const isP2P = !!matchId;

  // Phase transitions for single-player (auto) and P2P (wait for ready)
  useEffect(() => {
    const t1 = setTimeout(() => setPhase('vs'), 800);
    const t2 = setTimeout(() => {
      if (!isP2P) {
        setPhase('ready_wait');
      } else {
        setPhase('ready_wait');
      }
    }, 1800);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [isP2P]);

  // Single-player: auto-proceed after animation
  useEffect(() => {
    if (isP2P) return;
    const t = setTimeout(() => setScreen('arena'), 3500);
    return () => clearTimeout(t);
  }, [isP2P, setScreen]);

  // P2P: channel for ready sync
  useEffect(() => {
    if (!isP2P || !matchId) return;

    const ch = supabase.channel(`match_lobby:${matchId}`);
    vsChannelRef.current = ch;

    ch.on('broadcast', { event: 'player_ready' }, ({ payload }) => {
      if (payload.player === 'p1') setP1Ready(true);
      if (payload.player === 'p2') setP2Ready(true);
    }).subscribe();

    // 30s countdown
    const interval = setInterval(() => {
      setReadyTimer(t => {
        if (t <= 1) {
          clearInterval(interval);
          setP1Ready(true);
          setP2Ready(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => {
      clearInterval(interval);
      supabase.removeChannel(ch);
      vsChannelRef.current = null;
    };
  }, [isP2P, matchId]);

  // Both ready → countdown
  useEffect(() => {
    if (!isP2P || !p1Ready || !p2Ready) return;
    setPhase('countdown');
  }, [isP2P, p1Ready, p2Ready]);

  // Countdown 3-2-1
  useEffect(() => {
    if (phase !== 'countdown') return;
    setCountdown(3);
    const iv = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { clearInterval(iv); return 0; }
        return c - 1;
      });
    }, 1000);
    const t = setTimeout(() => {
      setPhase('fight');
      setTimeout(() => setScreen('arena'), 600);
    }, 3600);
    return () => { clearInterval(iv); clearTimeout(t); };
  }, [phase, setScreen]);

  const handleReady = () => {
    if (localReady || !vsChannelRef.current || !matchId) return;
    setLocalReady(true);
    const playerRole = isHost ? 'p1' : 'p2';
    vsChannelRef.current.send({
      type: 'broadcast',
      event: 'player_ready',
      payload: { player: playerRole },
    });
    if (isHost) setP1Ready(true);
    else setP2Ready(true);
  };

  if (!player1 || !player2) return null;

  const p1Glow = RARITY_GLOW[player1.stats.rarity] ?? '#b026ff';
  const p2Glow = RARITY_GLOW[player2.stats.rarity] ?? '#b026ff';

  const myRole = isHost ? 'P1' : 'P2';
  const opponentRole = isHost ? 'P2' : 'P1';

  return (
    <div className="gscreen flex flex-col items-center justify-center overflow-hidden" style={{ minHeight: '100vh' }}>
      <style>{`
        @keyframes vs-flash { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.7;transform:scale(1.08)} }
        @keyframes fight-pop { 0%{transform:scale(.5);opacity:0} 60%{transform:scale(1.15)} 100%{transform:scale(1);opacity:1} }
        @keyframes spark-rise { 0%{transform:translateY(0);opacity:0} 10%{opacity:1} 100%{transform:translateY(-200px);opacity:0} }
        @keyframes countdown-pop { 0%{transform:scale(2);opacity:0} 40%{opacity:1} 100%{transform:scale(1);opacity:0} }
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

      <div className="relative z-10 w-full max-w-5xl px-3 md:px-4">
        {/* P2P Ready labels */}
        <div className="flex items-center justify-between mb-3 md:mb-4">
          <div style={{ fontFamily: 'var(--pixel)', fontSize: 'clamp(7px,2vw,10px)', color: 'var(--neon-b)', textShadow: '0 0 10px var(--neon-b)', letterSpacing: '.1em' }}>
            P1 {isP2P && p1Ready && <span style={{ color: 'var(--neon-grn)' }}>✓</span>}
          </div>
          {isP2P && phase === 'ready_wait' && (
            <div style={{ fontFamily: 'var(--pixel)', fontSize: '8px', color: 'var(--neon-yel)' }}>
              {readyTimer}s
            </div>
          )}
          <div style={{ fontFamily: 'var(--pixel)', fontSize: 'clamp(7px,2vw,10px)', color: 'var(--neon-pink)', textShadow: '0 0 10px var(--neon-pink)', letterSpacing: '.1em' }}>
            {isP2P && p2Ready && <span style={{ color: 'var(--neon-grn)' }}>✓ </span>}P2
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-8">
          {/* P1 */}
          <div className="flex-1 min-w-0 transition-all duration-700"
            style={{ transform: phase === 'enter' ? 'translateX(-80px)' : 'translateX(0)', opacity: phase === 'enter' ? 0 : 1 }}>
            <div style={{ boxShadow: `0 0 0 4px var(--void), 0 0 0 8px ${p1Glow}, 0 0 40px ${p1Glow}60` }}>
              <FighterCard fighter={player1} />
            </div>
            {isP2P && isHost && (
              <div className="text-center mt-2"
                style={{ fontFamily: 'var(--pixel)', fontSize: '7px', color: 'var(--neon-b)', opacity: 0.7 }}>
                YOU
              </div>
            )}
          </div>

          {/* VS / Countdown */}
          <div className="flex-shrink-0 flex flex-col items-center gap-3">
            {phase !== 'countdown' && phase !== 'fight' ? (
              <div style={{
                fontFamily: 'var(--pixel)',
                fontSize: phase === 'enter' ? '0px' : 'clamp(28px, 8vw, 56px)',
                color: 'var(--neon-yel)',
                textShadow: '4px 4px 0 var(--neon-pink), 0 0 30px var(--neon-yel)',
                transition: 'font-size .3s ease',
                animation: phase !== 'enter' ? 'vs-flash 1.4s ease-in-out infinite' : 'none',
              }}>VS</div>
            ) : (
              <div key={countdown} style={{
                fontFamily: 'var(--pixel)',
                fontSize: countdown === 0 ? 'clamp(22px,6vw,32px)' : 'clamp(36px,10vw,64px)',
                color: countdown === 0 ? 'var(--neon-pink)' : 'var(--neon-yel)',
                textShadow: '4px 4px 0 var(--neon-pink), 0 0 40px currentColor',
                animation: 'countdown-pop 0.8s ease-out forwards',
              }}>
                {countdown === 0 ? 'FIGHT!' : countdown}
              </div>
            )}

            {/* P2P Ready button */}
            {isP2P && phase === 'ready_wait' && (
              <button
                onClick={handleReady}
                disabled={localReady}
                className="g-btn pink sm"
                style={{
                  fontSize: '9px',
                  opacity: localReady ? 0.5 : 1,
                  cursor: localReady ? 'default' : 'pointer',
                  background: localReady ? 'rgba(255,45,117,.2)' : undefined,
                }}>
                {localReady ? '✓ READY' : `${myRole} — READY UP!`}
              </button>
            )}

            {!isP2P && phase === 'fight' && (
              <div style={{
                fontFamily: 'var(--pixel)', fontSize: '18px', color: 'var(--neon-pink)',
                textShadow: '3px 3px 0 var(--void), 0 0 20px var(--neon-pink)',
                animation: 'fight-pop .4s ease-out',
              }}>FIGHT!</div>
            )}
          </div>

          {/* P2 */}
          <div className="flex-1 min-w-0 transition-all duration-700"
            style={{ transform: phase === 'enter' ? 'translateX(80px)' : 'translateX(0)', opacity: phase === 'enter' ? 0 : 1 }}>
            <div style={{ boxShadow: `0 0 0 4px var(--void), 0 0 0 8px ${p2Glow}, 0 0 40px ${p2Glow}60` }}>
              <FighterCard fighter={player2} />
            </div>
            {isP2P && !isHost && (
              <div className="text-center mt-2"
                style={{ fontFamily: 'var(--pixel)', fontSize: '7px', color: 'var(--neon-pink)', opacity: 0.7 }}>
                YOU
              </div>
            )}
          </div>
        </div>

        {/* Archetype matchup */}
        {phase !== 'enter' && (
          <div className="text-center mt-4 flex items-center justify-center gap-2 flex-wrap">
            <span style={{ fontFamily: 'var(--pixel)', fontSize: 'clamp(7px,2vw,10px)', color: player1.stats.color }}>{player1.stats.archetypeLabel.toUpperCase()}</span>
            <div style={{ width: '24px', height: '2px', background: 'var(--panel-line)', flexShrink: 0 }} />
            <span style={{ fontFamily: 'var(--pixel)', fontSize: 'clamp(7px,2vw,10px)', color: 'var(--neon-yel)' }}>VS</span>
            <div style={{ width: '24px', height: '2px', background: 'var(--panel-line)', flexShrink: 0 }} />
            <span style={{ fontFamily: 'var(--pixel)', fontSize: 'clamp(7px,2vw,10px)', color: player2.stats.color }}>{player2.stats.archetypeLabel.toUpperCase()}</span>
          </div>
        )}

        {/* P2P status indicator */}
        {isP2P && phase === 'ready_wait' && (
          <div className="text-center mt-4 flex justify-center gap-6">
            <div style={{ fontFamily: 'var(--pixel)', fontSize: '8px', color: p1Ready ? 'var(--neon-grn)' : 'var(--txt-dim)' }}>
              P1 {p1Ready ? '✓ READY' : '... waiting'}
            </div>
            <div style={{ fontFamily: 'var(--pixel)', fontSize: '8px', color: p2Ready ? 'var(--neon-grn)' : 'var(--txt-dim)' }}>
              P2 {p2Ready ? '✓ READY' : '... waiting'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
