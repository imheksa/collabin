import { useEffect, useRef, useState, useCallback } from 'react';
import { useGameStore } from '../stores/gameStore';
import { Fighter } from '../types';
import { recordMatch, getProfile, getLevelTier, ACHIEVEMENT_RARITY_COLORS } from '../utils/playerProfile';

const GAME_URL = 'https://imheksa.github.io/collabin/gitmusk-fighter-arena/';
const CARD_W = 600;
const CARD_H = 315;

// ─── Canvas share-card renderer ──────────────────────────────────────────────

async function loadImg(username: string, avatarUrl: string): Promise<HTMLImageElement | null> {
  const dicebear = `https://api.dicebear.com/7.x/pixel-art/png?seed=${encodeURIComponent(username)}&size=80`;

  // Try sources in order: Netlify proxy → original URL → DiceBear fallback
  const sources = [
    `/.netlify/functions/avatar-proxy?username=${encodeURIComponent(username)}`,
    avatarUrl,
    dicebear,
  ];

  for (const src of sources) {
    const result = await new Promise<HTMLImageElement | null>(resolve => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      const timer = setTimeout(() => resolve(null), 4000);
      img.onload = () => { clearTimeout(timer); resolve(img); };
      img.onerror = () => { clearTimeout(timer); resolve(null); };
      img.src = src;
    });
    if (result) return result;
  }
  return null;
}

function hexToRgb(hex: string) {
  const m = hex.replace('#', '').match(/.{2}/g);
  return m ? [parseInt(m[0], 16), parseInt(m[1], 16), parseInt(m[2], 16)] : [128, 0, 255];
}

async function renderCard(
  canvas: HTMLCanvasElement,
  me: Fighter,
  opponent: Fighter,
  isWin: boolean,
  maxCombo: number,
  duration: number,
) {
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const ctx = canvas.getContext('2d')!;

  // Background
  const bg = ctx.createLinearGradient(0, 0, CARD_W, CARD_H);
  bg.addColorStop(0, '#06001a');
  bg.addColorStop(1, '#1a0035');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  // Subtle scanlines
  for (let y = 0; y < CARD_H; y += 4) {
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fillRect(0, y, CARD_W, 2);
  }

  // Outer neon border (fighter color)
  const [r, g, b] = hexToRgb(me.stats.color);
  ctx.strokeStyle = me.stats.color;
  ctx.lineWidth = 3;
  ctx.shadowColor = me.stats.color;
  ctx.shadowBlur = 16;
  ctx.strokeRect(3, 3, CARD_W - 6, CARD_H - 6);
  ctx.shadowBlur = 0;

  // Inner thin border
  ctx.strokeStyle = `rgba(${r},${g},${b},0.3)`;
  ctx.lineWidth = 1;
  ctx.strokeRect(8, 8, CARD_W - 16, CARD_H - 16);

  const mono = (size: number) => `bold ${size}px "Courier New", monospace`;

  // ── Top bar ──────────────────────────────────────────────────────────────
  ctx.fillStyle = `rgba(${r},${g},${b},0.12)`;
  ctx.fillRect(0, 0, CARD_W, 38);

  ctx.fillStyle = '#ff00ff';
  ctx.shadowColor = '#ff00ff';
  ctx.shadowBlur = 8;
  ctx.font = mono(10);
  ctx.textAlign = 'center';
  ctx.fillText('⚔  GITMUSK FIGHTER ARENA  ⚔', CARD_W / 2, 24);
  ctx.shadowBlur = 0;

  // ── Result badge (center) ─────────────────────────────────────────────────
  const resultColor = isWin ? '#00ff41' : '#ff4040';
  const resultText = isWin ? 'VICTORY!' : 'DEFEATED';
  ctx.fillStyle = resultColor;
  ctx.shadowColor = resultColor;
  ctx.shadowBlur = 18;
  ctx.font = mono(22);
  ctx.textAlign = 'center';
  ctx.fillText(resultText, CARD_W / 2, 80);
  ctx.shadowBlur = 0;

  ctx.fillStyle = '#ffffff50';
  ctx.font = mono(9);
  ctx.fillText(isWin ? `vs @${opponent.profile.username}` : `by @${opponent.profile.username}`, CARD_W / 2, 96);

  // Divider
  ctx.strokeStyle = '#2a0050';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(20, 106); ctx.lineTo(CARD_W - 20, 106); ctx.stroke();

  // ── MY fighter card (left) ────────────────────────────────────────────────
  const avatarX = 80, avatarY = 175, avatarR = 38;

  const meImg = await loadImg(me.profile.username, me.profile.avatarUrl);
  if (meImg) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarX, avatarY, avatarR, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(meImg, avatarX - avatarR, avatarY - avatarR, avatarR * 2, avatarR * 2);
    ctx.restore();
  } else {
    ctx.fillStyle = me.stats.color;
    ctx.beginPath();
    ctx.arc(avatarX, avatarY, avatarR, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.font = mono(22);
    ctx.textAlign = 'center';
    ctx.fillText(me.profile.username[0].toUpperCase(), avatarX, avatarY + 8);
  }

  // Avatar glow ring
  ctx.strokeStyle = me.stats.color;
  ctx.shadowColor = me.stats.color;
  ctx.shadowBlur = 14;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(avatarX, avatarY, avatarR + 4, 0, Math.PI * 2);
  ctx.stroke();
  ctx.shadowBlur = 0;

  // WIN badge on avatar
  if (isWin) {
    ctx.fillStyle = '#00ff41';
    ctx.shadowColor = '#00ff41';
    ctx.shadowBlur = 8;
    ctx.font = mono(8);
    ctx.textAlign = 'center';
    ctx.fillText('🏆 WINNER', avatarX, avatarY - avatarR - 8);
    ctx.shadowBlur = 0;
  }

  // My stats
  ctx.textAlign = 'left';
  const sx = 132;

  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = me.stats.color;
  ctx.shadowBlur = 6;
  ctx.font = mono(14);
  ctx.fillText(`@${me.profile.username.slice(0, 12)}`, sx, 150);
  ctx.shadowBlur = 0;

  ctx.fillStyle = me.stats.color;
  ctx.font = mono(8);
  ctx.fillText(me.stats.archetypeLabel.toUpperCase(), sx, 168);

  ctx.fillStyle = '#ffff00';
  ctx.font = mono(9);
  ctx.fillText(`PWR ${me.stats.basePower}  |  DEF ${me.stats.defense}`, sx, 184);

  ctx.fillStyle = '#888';
  ctx.font = mono(8);
  ctx.fillText(`SPD ${me.stats.speed}  |  CRIT ${me.stats.critRate}%`, sx, 198);

  // Power bar
  const barW = 140, barH = 6, barX = sx, barY = 207;
  ctx.fillStyle = '#1a0030';
  ctx.fillRect(barX, barY, barW, barH);
  ctx.fillStyle = me.stats.color;
  ctx.shadowColor = me.stats.color;
  ctx.shadowBlur = 4;
  ctx.fillRect(barX, barY, barW * (me.stats.basePower / 100), barH);
  ctx.shadowBlur = 0;

  // ── Opponent (right, dimmed) ───────────────────────────────────────────────
  const oppAlpha = isWin ? 0.4 : 0.8;
  ctx.globalAlpha = oppAlpha;

  const oppAvatarX = CARD_W - 80, oppAvatarY = 175, oppR = 30;
  const oppImg = await loadImg(opponent.profile.username, opponent.profile.avatarUrl);
  if (oppImg) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(oppAvatarX, oppAvatarY, oppR, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(oppImg, oppAvatarX - oppR, oppAvatarY - oppR, oppR * 2, oppR * 2);
    ctx.restore();
  } else {
    ctx.fillStyle = opponent.stats.color;
    ctx.beginPath();
    ctx.arc(oppAvatarX, oppAvatarY, oppR, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.font = mono(16);
    ctx.textAlign = 'center';
    ctx.fillText(opponent.profile.username[0].toUpperCase(), oppAvatarX, oppAvatarY + 6);
  }

  ctx.strokeStyle = opponent.stats.color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(oppAvatarX, oppAvatarY, oppR + 3, 0, Math.PI * 2);
  ctx.stroke();

  ctx.textAlign = 'right';
  ctx.fillStyle = '#ffffff';
  ctx.font = mono(10);
  ctx.fillText(`@${opponent.profile.username.slice(0, 10)}`, CARD_W - 20, 150);

  ctx.fillStyle = opponent.stats.color;
  ctx.font = mono(7);
  ctx.fillText(opponent.stats.archetypeLabel.toUpperCase(), CARD_W - 20, 163);

  ctx.fillStyle = '#888';
  ctx.font = mono(7);
  ctx.fillText(`PWR ${opponent.stats.basePower}`, CARD_W - 20, 176);

  // Defeated X over opponent
  if (isWin) {
    ctx.strokeStyle = '#ff4040';
    ctx.lineWidth = 3;
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.moveTo(oppAvatarX - oppR - 4, oppAvatarY - oppR - 4);
    ctx.lineTo(oppAvatarX + oppR + 4, oppAvatarY + oppR + 4);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(oppAvatarX + oppR + 4, oppAvatarY - oppR - 4);
    ctx.lineTo(oppAvatarX - oppR - 4, oppAvatarY + oppR + 4);
    ctx.stroke();
  }

  ctx.globalAlpha = 1;

  // ── Stats strip ──────────────────────────────────────────────────────────
  ctx.fillStyle = `rgba(${r},${g},${b},0.1)`;
  ctx.fillRect(0, 238, CARD_W, 42);
  ctx.strokeStyle = `rgba(${r},${g},${b},0.3)`;
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, 238); ctx.lineTo(CARD_W, 238); ctx.stroke();

  const stats = [
    { label: 'COMBO', value: `${maxCombo}x`, color: '#ffff00' },
    { label: 'DURATION', value: `${duration}s`, color: '#00ffff' },
    { label: 'RARITY', value: me.stats.rarity.toUpperCase(), color: me.stats.color },
    { label: 'TIER', value: me.stats.tier.toUpperCase(), color: '#ff00ff' },
  ];
  const sw = CARD_W / stats.length;
  stats.forEach(({ label, value, color }, i) => {
    const cx = sw * i + sw / 2;
    ctx.fillStyle = '#555';
    ctx.font = mono(7);
    ctx.textAlign = 'center';
    ctx.fillText(label, cx, 253);
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 6;
    ctx.font = mono(11);
    ctx.fillText(value, cx, 270);
    ctx.shadowBlur = 0;
  });

  // ── Footer ────────────────────────────────────────────────────────────────
  ctx.fillStyle = `rgba(${r},${g},${b},0.06)`;
  ctx.fillRect(0, 284, CARD_W, CARD_H - 284);

  ctx.fillStyle = '#444';
  ctx.font = mono(7);
  ctx.textAlign = 'center';
  ctx.fillText(`🎮  ${GAME_URL}`, CARD_W / 2, 305);
}

// ─── Share text generator ────────────────────────────────────────────────────

function buildTweetText(me: Fighter, opponent: Fighter, isWin: boolean, maxCombo: number, duration: number) {
  if (isWin) {
    return [
      `⚔️ Just defeated @${opponent.profile.username} in #GitMuskFighterArena!`,
      ``,
      `🏆 ${me.stats.archetypeLabel} | Power: ${me.stats.basePower}`,
      `💥 Max combo: ${maxCombo}x | ⏱ ${duration}s`,
      ``,
      `Think you can beat me? 🎮`,
      `${GAME_URL}`,
    ].join('\n');
  } else {
    return [
      `💀 Just got rekt by @${opponent.profile.username} in #GitMuskFighterArena!`,
      ``,
      `My fighter: ${me.stats.archetypeLabel} | Power: ${me.stats.basePower}`,
      `Rematch time! 🎮`,
      `${GAME_URL}`,
    ].join('\n');
  }
}

// ─── Results page ────────────────────────────────────────────────────────────

export function Results() {
  const { matchResult, resetMatch, setScreen, player1, player2 } = useGameStore();
  const [show, setShow] = useState(false);
  const [copied, setCopied] = useState(false);
  const [cardReady, setCardReady] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { lastMatchReward, setLastMatchReward, setPlayerProfile, setScreen: _setScreen } = useGameStore();

  useEffect(() => {
    const t = setTimeout(() => setShow(true), 300);
    return () => clearTimeout(t);
  }, []);

  // Record match + compute reward once on mount
  useEffect(() => {
    if (!matchResult || !player1 || !player2) return;
    const isP1Win = matchResult.winner.profile.username === player1.profile.username;
    const reward = recordMatch(
      player1.profile.username,
      isP1Win,
      matchResult.maxCombo,
      matchResult.duration,
      { username: player2.profile.username, archetype: player2.stats.archetype },
    );
    setLastMatchReward(reward);
    setPlayerProfile(getProfile(player1.profile.username));
  }, []);

  // Render share card after mount
  useEffect(() => {
    if (!matchResult || !player1 || !player2 || !canvasRef.current) return;
    const isP1Win = matchResult.winner.profile.username === player1.profile.username;
    setCardReady(false);
    renderCard(
      canvasRef.current,
      player1,
      player2,
      isP1Win,
      matchResult.maxCombo,
      matchResult.duration,
    ).then(() => setCardReady(true));
  }, [matchResult, player1, player2]);

  const downloadCard = useCallback(() => {
    if (!canvasRef.current) return;
    const link = document.createElement('a');
    link.download = 'gitmusk-fighter-result.png';
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
  }, []);

  if (!matchResult || !player1 || !player2) return null;

  const { winner, loser, rounds, duration, maxCombo } = matchResult;
  const isP1Win = winner.profile.username === player1.profile.username;
  const me = player1;
  const opponent = player2;

  const tweetText = buildTweetText(me, opponent, isP1Win, maxCombo, duration);

  const shareOnX = () => {
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`,
      '_blank', 'noopener,noreferrer'
    );
  };

  const copyText = async () => {
    await navigator.clipboard.writeText(tweetText).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-arena-bg p-4 overflow-y-auto">
      <div className="w-full max-w-2xl">

        {/* Victory title */}
        <div className="font-pixel text-center mb-4 transition-all duration-500"
          style={{ opacity: show ? 1 : 0, transform: show ? 'translateY(0)' : 'translateY(-20px)' }}>
          <div className="text-3xl md:text-4xl mb-1"
            style={{ color: winner.stats.color, textShadow: `0 0 20px ${winner.stats.color}, 0 0 40px ${winner.stats.glowColor}` }}>
            {winner.profile.username.toUpperCase()}
          </div>
          <div className="text-xl" style={{ color: '#ffff00', textShadow: '0 0 12px #ffff00' }}>
            {isP1Win ? '🏆 WINS!' : '💀 DEFEATED'}
          </div>
        </div>

        {/* Quick stats */}
        <div className="flex justify-center gap-6 mb-4"
          style={{ opacity: show ? 1 : 0, transition: 'opacity 0.7s 0.2s' }}>
          {[
            { label: 'ROUNDS', value: rounds },
            { label: 'DURATION', value: `${duration}s` },
            { label: 'MAX COMBO', value: `${maxCombo}x` },
          ].map(s => (
            <div key={s.label} className="text-center">
              <div className="font-pixel text-gray-500" style={{ fontSize: '7px' }}>{s.label}</div>
              <div className="font-pixel text-white text-lg mt-1" style={{ textShadow: '0 0 8px #fff' }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* ── XP Reward panel ── */}
        {lastMatchReward && (
          <div className="mb-4 p-4 rounded transition-all duration-700"
            style={{ background: '#0d001a', border: `2px solid ${lastMatchReward.leveledUp ? '#ffd700' : '#2a0050'}`, boxShadow: lastMatchReward.leveledUp ? '0 0 30px #ffd70040' : 'none', opacity: show ? 1 : 0 }}>

            {lastMatchReward.leveledUp ? (
              <div className="text-center mb-3">
                <div className="font-pixel text-2xl animate-pulse" style={{ color: '#ffd700', textShadow: '0 0 20px #ffd700' }}>
                  ⬆ LEVEL UP!
                </div>
                <div className="font-pixel mt-1" style={{ fontSize: '10px', color: '#fff' }}>
                  {getLevelTier(lastMatchReward.oldLevel).name} → {getLevelTier(lastMatchReward.newLevel).name} LV{lastMatchReward.newLevel}
                </div>
              </div>
            ) : (
              <div className="font-pixel text-center mb-2" style={{ fontSize: '8px', color: '#bf00ff' }}>XP EARNED</div>
            )}

            <div className="text-center mb-2">
              <span className="font-pixel text-2xl" style={{ color: '#00ff41', textShadow: '0 0 12px #00ff41' }}>
                +{lastMatchReward.xpGained} XP
              </span>
            </div>

            {lastMatchReward.newAchievements.length > 0 && (
              <div className="mt-2">
                <div className="font-pixel text-center mb-2" style={{ fontSize: '7px', color: '#888' }}>ACHIEVEMENTS UNLOCKED</div>
                <div className="flex flex-wrap gap-2 justify-center">
                  {lastMatchReward.newAchievements.map(ach => (
                    <div key={ach.id} className="flex items-center gap-1.5 px-2 py-1 rounded"
                      style={{ background: `${ACHIEVEMENT_RARITY_COLORS[ach.rarity]}15`, border: `1px solid ${ACHIEVEMENT_RARITY_COLORS[ach.rarity]}` }}>
                      <span>{ach.icon}</span>
                      <span className="font-pixel" style={{ fontSize: '7px', color: ACHIEVEMENT_RARITY_COLORS[ach.rarity] }}>{ach.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Share card canvas ── */}
        <div className="mb-4 transition-all duration-700"
          style={{ opacity: show ? 1 : 0 }}>
          <div className="font-pixel mb-2 text-center" style={{ fontSize: '8px', color: '#bf00ff' }}>
            SHARE CARD — DOWNLOAD &amp; ATTACH TO YOUR TWEET
          </div>
          <div className="relative rounded overflow-hidden"
            style={{ border: '2px solid #2a0050', boxShadow: '0 0 20px #bf00ff20' }}>
            {/* Canvas — scales to fit */}
            <canvas
              ref={canvasRef}
              style={{ width: '100%', height: 'auto', display: 'block' }}
            />
            {/* Loading overlay */}
            {!cardReady && (
              <div className="absolute inset-0 flex items-center justify-center"
                style={{ background: '#0d001a' }}>
                <div className="flex gap-1">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="w-2 h-2 rounded-full animate-bounce"
                      style={{ background: '#bf00ff', animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Share actions ── */}
        <div className="mb-4 transition-all duration-700"
          style={{ opacity: show ? 1 : 0 }}>
          {/* Tweet text preview */}
          <div className="p-3 rounded mb-3"
            style={{ background: '#080018', border: '1px solid #1d9bf030' }}>
            <div className="font-mono" style={{ fontSize: '10px', color: '#888', lineHeight: '1.6' }}>
              {tweetText.split('\n').map((line, i) => (
                <div key={i}>{line || ' '}</div>
              ))}
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-2">
            {/* Download card */}
            <button
              onClick={downloadCard}
              disabled={!cardReady}
              className="font-pixel py-3 px-4 rounded transition-all hover:scale-[1.02] disabled:opacity-40 disabled:cursor-wait"
              style={{ background: `rgba(${hexToRgb(me.stats.color).join(',')},0.1)`, border: `2px solid ${me.stats.color}`, color: me.stats.color, fontSize: '8px', whiteSpace: 'nowrap' }}
            >
              📥 SAVE CARD
            </button>

            {/* Share on X */}
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

            {/* Copy text */}
            <button
              onClick={copyText}
              className="font-pixel px-3 py-3 rounded transition-all hover:scale-[1.02]"
              style={{ background: 'transparent', border: '1px solid #333', color: copied ? '#00ff41' : '#555', fontSize: '8px' }}
            >
              {copied ? '✓' : '📋'}
            </button>
          </div>

          <div className="text-center mt-2 font-mono" style={{ fontSize: '9px', color: '#444' }}>
            Save card → attach image to tweet for maximum impact 🔥
          </div>
        </div>

        {/* P2E upsell */}
        <div className="p-3 rounded mb-4 text-center"
          style={{ background: '#12002a', border: '1px solid #bf00ff', boxShadow: '0 0 20px #bf00ff30', opacity: show ? 1 : 0, transition: 'opacity 0.7s 0.3s' }}>
          <div className="font-pixel text-yellow-400 mb-1" style={{ fontSize: '9px' }}>💰 UPGRADE TO P2E MODE</div>
          <div className="font-mono text-gray-300 text-xs">
            This match was worth $0. In P2E mode, winner takes ~$9 from a $10 pool.
          </div>
        </div>

        {/* Navigation */}
        <div className="flex gap-3 flex-wrap justify-center"
          style={{ opacity: show ? 1 : 0, transition: 'opacity 0.7s 0.4s' }}>
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
            onClick={() => setScreen('profile')}
            className="font-pixel px-5 py-3 text-xs transition-all hover:scale-105 active:scale-95"
            style={{ border: '2px solid #bf00ff', color: '#bf00ff', background: 'transparent', boxShadow: '0 0 10px #bf00ff30' }}
          >
            👤 PROFILE
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
    </div>
  );
}
