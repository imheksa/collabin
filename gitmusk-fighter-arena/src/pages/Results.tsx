import { useEffect, useRef, useState, useCallback } from 'react';
import { useGameStore } from '../stores/gameStore';
import { Fighter } from '../types';
import { recordMatch, getProfile, getLevelTier, ACHIEVEMENT_RARITY_COLORS } from '../utils/playerProfile';
import { syncProfile } from '../utils/cloudSync';

const GAME_URL = 'https://gitmuskarena.vercel.app';
const CARD_W = 600, CARD_H = 315;

async function loadImg(username: string, avatarUrl: string): Promise<HTMLImageElement | null> {
  const dicebear = `https://api.dicebear.com/7.x/pixel-art/png?seed=${encodeURIComponent(username)}&size=80`;
  const sources = [`/.netlify/functions/avatar-proxy?username=${encodeURIComponent(username)}`, avatarUrl, dicebear];
  for (const src of sources) {
    const result = await new Promise<HTMLImageElement | null>(resolve => {
      const img = new Image(); img.crossOrigin = 'anonymous';
      const t = setTimeout(() => resolve(null), 4000);
      img.onload = () => { clearTimeout(t); resolve(img); };
      img.onerror = () => { clearTimeout(t); resolve(null); };
      img.src = src;
    });
    if (result) return result;
  }
  return null;
}

function hexToRgb(hex: string) {
  const m = hex.replace('#', '').match(/.{2}/g);
  return m ? [parseInt(m[0], 16), parseInt(m[1], 16), parseInt(m[2], 16)] : [176, 38, 255];
}

async function renderCard(canvas: HTMLCanvasElement, me: Fighter, opponent: Fighter, isWin: boolean, maxCombo: number, duration: number) {
  canvas.width = CARD_W; canvas.height = CARD_H;
  const ctx = canvas.getContext('2d')!;
  const bg = ctx.createLinearGradient(0, 0, CARD_W, CARD_H);
  bg.addColorStop(0, '#0a0118'); bg.addColorStop(1, '#1d0b3a');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, CARD_W, CARD_H);
  for (let y = 0; y < CARD_H; y += 4) { ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(0, y, CARD_W, 2); }
  const [r, g, b] = hexToRgb(me.stats.color);
  ctx.strokeStyle = me.stats.color; ctx.lineWidth = 3; ctx.shadowColor = me.stats.color; ctx.shadowBlur = 16;
  ctx.strokeRect(3, 3, CARD_W - 6, CARD_H - 6); ctx.shadowBlur = 0;
  ctx.strokeStyle = `rgba(${r},${g},${b},0.3)`; ctx.lineWidth = 1;
  ctx.strokeRect(8, 8, CARD_W - 16, CARD_H - 16);
  const mono = (size: number) => `bold ${size}px "Courier New", monospace`;
  ctx.fillStyle = `rgba(${r},${g},${b},0.12)`; ctx.fillRect(0, 0, CARD_W, 38);
  ctx.fillStyle = '#ff2d75'; ctx.shadowColor = '#ff2d75'; ctx.shadowBlur = 8;
  ctx.font = mono(10); ctx.textAlign = 'center';
  ctx.fillText('⚔  X FIGHTER ARENA  ⚔', CARD_W / 2, 24); ctx.shadowBlur = 0;
  const resultColor = isWin ? '#00ff9d' : '#ff2d75';
  ctx.fillStyle = resultColor; ctx.shadowColor = resultColor; ctx.shadowBlur = 18;
  ctx.font = mono(22); ctx.textAlign = 'center';
  ctx.fillText(isWin ? 'VICTORY!' : 'DEFEATED', CARD_W / 2, 80); ctx.shadowBlur = 0;
  ctx.fillStyle = '#ffffff50'; ctx.font = mono(9);
  ctx.fillText(isWin ? `vs @${opponent.profile.username}` : `by @${opponent.profile.username}`, CARD_W / 2, 96);
  ctx.strokeStyle = '#3a1c5e'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(20, 106); ctx.lineTo(CARD_W - 20, 106); ctx.stroke();
  const aX = 80, aY = 175, aR = 38;
  const meImg = await loadImg(me.profile.username, me.profile.avatarUrl);
  if (meImg) { ctx.save(); ctx.beginPath(); ctx.arc(aX, aY, aR, 0, Math.PI * 2); ctx.clip(); ctx.drawImage(meImg, aX - aR, aY - aR, aR * 2, aR * 2); ctx.restore(); }
  else { ctx.fillStyle = me.stats.color; ctx.beginPath(); ctx.arc(aX, aY, aR, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#000'; ctx.font = mono(22); ctx.textAlign = 'center'; ctx.fillText(me.profile.username[0].toUpperCase(), aX, aY + 8); }
  ctx.strokeStyle = me.stats.color; ctx.shadowColor = me.stats.color; ctx.shadowBlur = 14; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(aX, aY, aR + 4, 0, Math.PI * 2); ctx.stroke(); ctx.shadowBlur = 0;
  if (isWin) { ctx.fillStyle = '#00ff9d'; ctx.shadowColor = '#00ff9d'; ctx.shadowBlur = 8; ctx.font = mono(8); ctx.textAlign = 'center'; ctx.fillText('🏆 WINNER', aX, aY - aR - 8); ctx.shadowBlur = 0; }
  ctx.textAlign = 'left'; const sx = 132;
  ctx.fillStyle = '#ffffff'; ctx.shadowColor = me.stats.color; ctx.shadowBlur = 6; ctx.font = mono(14);
  ctx.fillText(`@${me.profile.username.slice(0, 12)}`, sx, 148); ctx.shadowBlur = 0;
  ctx.fillStyle = me.stats.color; ctx.font = mono(8); ctx.fillText(me.stats.archetypeLabel.toUpperCase(), sx, 163);

  // Stat bars — 4 rows, clean layout
  const sBarW = 128;
  [
    { label: 'PWR',  value: me.stats.basePower, color: me.stats.color, max: 100 },
    { label: 'DEF',  value: me.stats.defense,   color: '#00ccff',     max: 100 },
    { label: 'SPD',  value: me.stats.speed,      color: '#00ff41',     max: 100 },
    { label: 'CRIT', value: me.stats.critRate,   color: '#ffd60a',     max: 80  },
  ].forEach(({ label, value, color, max }, i) => {
    const sy = 176 + i * 14;
    ctx.fillStyle = '#555'; ctx.font = mono(6); ctx.textAlign = 'left';
    ctx.fillText(`${label} ${value}`, sx, sy);
    ctx.fillStyle = '#22103f'; ctx.fillRect(sx + 42, sy - 8, sBarW, 5);
    ctx.fillStyle = color; ctx.shadowColor = color; ctx.shadowBlur = 3;
    ctx.fillRect(sx + 42, sy - 8, sBarW * Math.min(1, value / max), 5); ctx.shadowBlur = 0;
  });
  ctx.globalAlpha = isWin ? 0.4 : 0.8;
  const oX = CARD_W - 80, oY = 175, oR = 30;
  const oppImg = await loadImg(opponent.profile.username, opponent.profile.avatarUrl);
  if (oppImg) { ctx.save(); ctx.beginPath(); ctx.arc(oX, oY, oR, 0, Math.PI * 2); ctx.clip(); ctx.drawImage(oppImg, oX - oR, oY - oR, oR * 2, oR * 2); ctx.restore(); }
  else { ctx.fillStyle = opponent.stats.color; ctx.beginPath(); ctx.arc(oX, oY, oR, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#000'; ctx.font = mono(16); ctx.textAlign = 'center'; ctx.fillText(opponent.profile.username[0].toUpperCase(), oX, oY + 6); }
  ctx.strokeStyle = opponent.stats.color; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(oX, oY, oR + 3, 0, Math.PI * 2); ctx.stroke();
  ctx.textAlign = 'right'; ctx.fillStyle = '#ffffff'; ctx.font = mono(10);
  ctx.fillText(`@${opponent.profile.username.slice(0, 10)}`, CARD_W - 20, 150);
  ctx.fillStyle = opponent.stats.color; ctx.font = mono(7); ctx.fillText(opponent.stats.archetypeLabel.toUpperCase(), CARD_W - 20, 163);
  if (isWin) { ctx.strokeStyle = '#ff2d75'; ctx.lineWidth = 3; ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.moveTo(oX - oR - 4, oY - oR - 4); ctx.lineTo(oX + oR + 4, oY + oR + 4); ctx.stroke(); ctx.beginPath(); ctx.moveTo(oX + oR + 4, oY - oR - 4); ctx.lineTo(oX - oR - 4, oY + oR + 4); ctx.stroke(); }
  ctx.globalAlpha = 1;
  ctx.fillStyle = `rgba(${r},${g},${b},0.1)`; ctx.fillRect(0, 238, CARD_W, 42);
  ctx.strokeStyle = `rgba(${r},${g},${b},0.3)`; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, 238); ctx.lineTo(CARD_W, 238); ctx.stroke();
  [{ label: 'COMBO', value: `${maxCombo}x`, color: '#ffd60a' }, { label: 'DURATION', value: `${duration}s`, color: '#00e5ff' }, { label: 'RARITY', value: me.stats.rarity.toUpperCase(), color: me.stats.color }, { label: 'TIER', value: me.stats.tier.toUpperCase(), color: '#b026ff' }]
    .forEach(({ label, value, color }, i) => {
      const sw = CARD_W / 4; const cx = sw * i + sw / 2;
      ctx.fillStyle = '#555'; ctx.font = mono(7); ctx.textAlign = 'center'; ctx.fillText(label, cx, 253);
      ctx.fillStyle = color; ctx.shadowColor = color; ctx.shadowBlur = 6; ctx.font = mono(11);
      ctx.fillText(value, cx, 270); ctx.shadowBlur = 0;
    });
  ctx.fillStyle = `rgba(${r},${g},${b},0.06)`; ctx.fillRect(0, 284, CARD_W, CARD_H - 284);
  ctx.fillStyle = '#444'; ctx.font = mono(7); ctx.textAlign = 'center'; ctx.fillText(`🎮  ${GAME_URL}`, CARD_W / 2, 305);
}

function buildTweetText(me: Fighter, opponent: Fighter, isWin: boolean, maxCombo: number, duration: number) {
  return isWin
    ? `⚔️ Just defeated @${opponent.profile.username} in #XFighterArena!\n\n🏆 ${me.stats.archetypeLabel} | Power: ${me.stats.basePower}\n💥 Max combo: ${maxCombo}x | ⏱ ${duration}s\n\nThink you can beat me? 🎮\n${GAME_URL}`
    : `💀 Just got rekt by @${opponent.profile.username} in #XFighterArena!\n\nMy fighter: ${me.stats.archetypeLabel} | Power: ${me.stats.basePower}\nRematch time! 🎮\n${GAME_URL}`;
}

export function Results() {
  const { matchResult, resetMatch, setScreen, player1, player2, lastMatchReward, setLastMatchReward, setPlayerProfile } = useGameStore();
  const [show, setShow] = useState(false);
  const [copied, setCopied] = useState(false);
  const [cardReady, setCardReady] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => { const t = setTimeout(() => setShow(true), 300); return () => clearTimeout(t); }, []);

  useEffect(() => {
    if (!matchResult || !player1 || !player2) return;
    const isP1Win = matchResult.winner.profile.username === player1.profile.username;
    const reward = recordMatch(player1.profile.username, isP1Win, matchResult.maxCombo, matchResult.duration, { username: player2.profile.username, archetype: player2.stats.archetype });
    setLastMatchReward(reward);
    const updated = getProfile(player1.profile.username);
    setPlayerProfile(updated);
    syncProfile(updated, player1).catch(() => {});
  }, []);

  useEffect(() => {
    if (!matchResult || !player1 || !player2 || !canvasRef.current) return;
    const isP1Win = matchResult.winner.profile.username === player1.profile.username;
    setCardReady(false);
    renderCard(canvasRef.current, player1, player2, isP1Win, matchResult.maxCombo, matchResult.duration).then(() => setCardReady(true));
  }, [matchResult, player1, player2]);

  const downloadCard = useCallback(() => {
    if (!canvasRef.current) return;
    const a = document.createElement('a'); a.download = 'x-fighter-result.png'; a.href = canvasRef.current.toDataURL('image/png'); a.click();
  }, []);

  if (!matchResult || !player1 || !player2) return null;

  const { winner, rounds, duration, maxCombo } = matchResult;
  const isP1Win = winner.profile.username === player1.profile.username;
  const tweetText = buildTweetText(player1, player2, isP1Win, maxCombo, duration);

  const shareWithCard = useCallback(async () => {
    if (!canvasRef.current) return;
    const blob = await new Promise<Blob>(res => canvasRef.current!.toBlob(b => res(b!), 'image/png'));
    const file = new File([blob], 'fighter-result.png', { type: 'image/png' });

    // Mobile: native share sheet — opens X/Twitter app with card image pre-attached
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ title: '⚔ X Fighter Arena', text: tweetText, files: [file] });
        return;
      } catch { /* user dismissed */ }
    }

    // Desktop fallback: save card then open Twitter compose
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.download = 'fighter-result.png'; a.href = url; a.click();
    URL.revokeObjectURL(url);
    setTimeout(() => {
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`, '_blank', 'noopener,noreferrer');
    }, 600);
  }, [canvasRef, tweetText]);

  const copyText = async () => { await navigator.clipboard.writeText(tweetText).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  return (
    <div className="gscreen flex flex-col items-center p-4 py-8 overflow-y-auto">
      <div className="w-full max-w-2xl">

        {/* Nav */}
        <nav className="g-nav" style={{ position: 'relative', marginBottom: '28px' }}>
          <div className="logo"><div className="badge">X</div>FIGHTER ARENA</div>
          <button onClick={() => setScreen('landing')} className="g-btn ghost sm">← MENU</button>
        </nav>

        {/* Result header */}
        <div className="text-center mb-6 transition-all duration-500"
          style={{ opacity: show ? 1 : 0, transform: show ? 'translateY(0)' : 'translateY(-20px)' }}>
          <span className="g-eyebrow" style={{ color: isP1Win ? 'var(--neon-grn)' : 'var(--neon-pink)' }}>
            // BATTLE RESULTS
          </span>
          <div style={{ fontFamily: 'var(--pixel)', fontSize: '28px', color: winner.stats.color, textShadow: `3px 3px 0 ${isP1Win ? 'var(--neon-grn)' : 'var(--neon-pink)'}` }}>
            {winner.profile.username.toUpperCase()}
          </div>
          <div style={{ fontFamily: 'var(--pixel)', fontSize: '18px', color: isP1Win ? 'var(--neon-grn)' : 'var(--neon-pink)', marginTop: '8px', textShadow: `0 0 20px ${isP1Win ? 'var(--neon-grn)' : 'var(--neon-pink)'}` }}>
            {isP1Win ? '🏆 VICTORY!' : '💀 DEFEATED'}
          </div>
        </div>

        {/* Stats strip */}
        <div className="flex gap-3 mb-5" style={{ opacity: show ? 1 : 0, transition: 'opacity .6s .15s' }}>
          {[
            { label: 'ROUNDS', val: String(rounds), color: 'var(--neon-b)' },
            { label: 'DURATION', val: `${duration}s`, color: 'var(--neon-yel)' },
            { label: 'MAX COMBO', val: `${maxCombo}x`, color: 'var(--neon-pink)' },
          ].map(s => (
            <div key={s.label} className="flex-1 text-center py-4"
              style={{ background: 'var(--void-2)', border: `3px solid ${s.color}40` }}>
              <div style={{ fontFamily: 'var(--pixel)', fontSize: '7px', color: 'var(--txt-dim)', marginBottom: '8px' }}>{s.label}</div>
              <div style={{ fontFamily: 'var(--pixel)', fontSize: '16px', color: s.color, textShadow: `0 0 12px ${s.color}` }}>{s.val}</div>
            </div>
          ))}
        </div>

        {/* XP Reward panel */}
        {lastMatchReward && (
          <div className={`g-panel mb-5 ${lastMatchReward.leveledUp ? 'yel' : ''}`}
            style={{ padding: '20px', opacity: show ? 1 : 0, transition: 'opacity .6s .25s' }}>
            <div className="corners"><i></i><i></i><i></i><i></i></div>
            {lastMatchReward.leveledUp ? (
              <div className="text-center mb-3">
                <div style={{ fontFamily: 'var(--pixel)', fontSize: '18px', color: 'var(--neon-yel)', textShadow: '0 0 20px var(--neon-yel)', animation: 'g-pulse 1s steps(2) infinite' }}>
                  ⬆ LEVEL UP!
                </div>
                <div style={{ fontFamily: 'var(--pixel)', fontSize: '9px', color: '#fff', marginTop: '8px' }}>
                  {getLevelTier(lastMatchReward.oldLevel).name} → {getLevelTier(lastMatchReward.newLevel).name} LV{lastMatchReward.newLevel}
                </div>
              </div>
            ) : (
              <div style={{ fontFamily: 'var(--pixel)', fontSize: '8px', color: 'var(--neon-p)', textAlign: 'center', marginBottom: '12px', letterSpacing: '.2em' }}>
                XP EARNED
              </div>
            )}
            <div className="text-center mb-3">
              <span style={{ fontFamily: 'var(--pixel)', fontSize: '22px', color: 'var(--neon-grn)', textShadow: '0 0 12px var(--neon-grn)' }}>
                +{lastMatchReward.xpGained} XP
              </span>
            </div>
            {lastMatchReward.newAchievements.length > 0 && (
              <div>
                <div style={{ fontFamily: 'var(--pixel)', fontSize: '7px', color: 'var(--txt-dim)', textAlign: 'center', marginBottom: '8px' }}>ACHIEVEMENTS UNLOCKED</div>
                <div className="flex flex-wrap gap-2 justify-center">
                  {lastMatchReward.newAchievements.map(ach => (
                    <div key={ach.id} className="flex items-center gap-1.5 px-2 py-1"
                      style={{ background: `${ACHIEVEMENT_RARITY_COLORS[ach.rarity]}18`, border: `2px solid ${ACHIEVEMENT_RARITY_COLORS[ach.rarity]}` }}>
                      <span>{ach.icon}</span>
                      <span style={{ fontFamily: 'var(--pixel)', fontSize: '7px', color: ACHIEVEMENT_RARITY_COLORS[ach.rarity] }}>{ach.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Share card */}
        <div className="mb-5" style={{ opacity: show ? 1 : 0, transition: 'opacity .6s .35s' }}>
          <div style={{ fontFamily: 'var(--pixel)', fontSize: '8px', color: 'var(--neon-b)', textAlign: 'center', marginBottom: '10px', letterSpacing: '.15em' }}>
            // SHARE CARD
          </div>
          <div style={{ position: 'relative', border: '4px solid var(--neon-p)', boxShadow: '0 0 24px rgba(176,38,255,.4)' }}>
            <canvas ref={canvasRef} style={{ width: '100%', height: 'auto', display: 'block' }} />
            {!cardReady && (
              <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'var(--void-2)' }}>
                <div className="flex gap-2">
                  {[0,1,2].map(i => <div key={i} className="w-3 h-3 animate-bounce" style={{ background: 'var(--neon-p)', animationDelay: `${i*.15}s` }} />)}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Share actions */}
        <div className="mb-5" style={{ opacity: show ? 1 : 0, transition: 'opacity .6s .4s' }}>
          <div className="p-3 mb-3" style={{ background: 'var(--void-2)', border: '3px solid var(--panel-line)' }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--txt-dim)', lineHeight: '1.7' }}>
              {tweetText.split('\n').map((line, i) => <div key={i}>{line || ' '}</div>)}
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={downloadCard} disabled={!cardReady} className="g-btn ghost sm" style={{ color: player1.stats.color, borderColor: player1.stats.color, boxShadow: 'none', fontSize: '8px' }}>
              📥 SAVE
            </button>
            <button onClick={shareWithCard} className="g-btn flex-1 sm" style={{ background: '#1d9bf0', fontSize: '9px', gap: '8px' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.261 5.635zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              SHARE ON X
            </button>
            <button onClick={copyText} className="g-btn ghost sm" style={{ fontSize: '9px', color: copied ? 'var(--neon-grn)' : undefined }}>
              {copied ? '✓' : '📋'}
            </button>
          </div>
        </div>

        {/* P2E upsell */}
        <div className="g-panel mb-5 text-center" style={{ padding: '16px', opacity: show ? 1 : 0, transition: 'opacity .6s .45s' }}>
          <div className="corners"><i></i><i></i><i></i><i></i></div>
          <div style={{ fontFamily: 'var(--pixel)', fontSize: '9px', color: 'var(--neon-yel)', marginBottom: '6px' }}>💰 UPGRADE TO P2E MODE</div>
          <div style={{ fontFamily: 'var(--body)', fontSize: '18px', color: 'var(--txt-dim)' }}>
            This match was worth $0. In P2E mode, winner takes ~$1.995 from a $2 pool (0.25% fee).
          </div>
        </div>

        {/* Navigation */}
        <div className="flex gap-3 flex-wrap justify-center" style={{ opacity: show ? 1 : 0, transition: 'opacity .6s .5s' }}>
          <button onClick={() => { resetMatch(); setScreen('login'); }} className="g-btn ghost sm" style={{ color: 'var(--neon-b)' }}>▶ REMATCH</button>
          <button onClick={() => setScreen('leaderboard')} className="g-btn sm">🏆 LEADERBOARD</button>
          <button onClick={() => setScreen('profile')} className="g-btn ghost sm" style={{ color: 'var(--neon-p)' }}>👤 PROFILE</button>
        </div>
      </div>
    </div>
  );
}
