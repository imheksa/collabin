import { useMemo, useRef, useState, useCallback, useEffect } from 'react';
import { useGameStore } from '../stores/gameStore';
import {
  getProfile, getCombatModifiers, getLevelTier,
  xpProgressInLevel, xpNeededForNextLevel, xpForLevel,
  ACHIEVEMENTS, ACHIEVEMENT_RARITY_COLORS, LEVEL_TIERS,
  MatchHistoryEntry,
} from '../utils/playerProfile';

const GAME_URL = typeof window !== 'undefined' ? window.location.origin : 'https://exarena.vercel.app';
const CARD_W = 600;
const CARD_H = 400;

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function hexToRgb(hex: string) {
  const m = hex.replace('#', '').match(/.{2}/g);
  return m ? [parseInt(m[0], 16), parseInt(m[1], 16), parseInt(m[2], 16)] : [128, 0, 255];
}

async function loadImg(username: string, avatarUrl: string): Promise<HTMLImageElement | null> {
  const dicebear = `https://api.dicebear.com/7.x/pixel-art/png?seed=${encodeURIComponent(username)}&size=80`;
  const sources = [
    `/.netlify/functions/avatar-proxy?username=${encodeURIComponent(username)}`,
    avatarUrl,
    dicebear,
  ];
  for (const src of sources) {
    const img = await new Promise<HTMLImageElement | null>(resolve => {
      const el = new Image();
      el.crossOrigin = 'anonymous';
      const t = setTimeout(() => resolve(null), 4000);
      el.onload = () => { clearTimeout(t); resolve(el); };
      el.onerror = () => { clearTimeout(t); resolve(null); };
      el.src = src;
    });
    if (img) return img;
  }
  return null;
}

async function renderProfileCard(
  canvas: HTMLCanvasElement,
  username: string,
  avatarUrl: string,
  level: number,
  xp: number,
  wins: number,
  losses: number,
  maxCombo: number,
  archetypeLabel: string,
  archetypeColor: string,
  passiveAbility: string,
  basePower: number,
  defense: number,
  speed: number,
  critRate: number,
  stamina: number,
  rageSpeed: number,
  winStreak: number,
  attackMult: number,
  defenseMult: number,
  xpMult: number,
) {
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const ctx = canvas.getContext('2d')!;
  const tier = getLevelTier(level);
  const [r, g, b] = hexToRgb(tier.color);
  const mono = (sz: number) => `bold ${sz}px "Courier New", monospace`;

  // Background + scanlines
  const bg = ctx.createLinearGradient(0, 0, CARD_W, CARD_H);
  bg.addColorStop(0, '#06001a'); bg.addColorStop(1, '#180030');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, CARD_W, CARD_H);
  for (let y = 0; y < CARD_H; y += 4) { ctx.fillStyle = 'rgba(0,0,0,0.15)'; ctx.fillRect(0, y, CARD_W, 2); }

  // Border
  ctx.strokeStyle = tier.color; ctx.lineWidth = 3; ctx.shadowColor = tier.color; ctx.shadowBlur = 18;
  ctx.strokeRect(3, 3, CARD_W - 6, CARD_H - 6); ctx.shadowBlur = 0;
  ctx.strokeStyle = `rgba(${r},${g},${b},0.25)`; ctx.lineWidth = 1;
  ctx.strokeRect(8, 8, CARD_W - 16, CARD_H - 16);

  // Header
  ctx.fillStyle = `rgba(${r},${g},${b},0.14)`; ctx.fillRect(0, 0, CARD_W, 42);
  ctx.fillStyle = '#ff00ff'; ctx.shadowColor = '#ff00ff'; ctx.shadowBlur = 8;
  ctx.font = mono(10); ctx.textAlign = 'center';
  ctx.fillText('⚔  GITMUSK FIGHTER ARENA  ⚔', CARD_W / 2, 26); ctx.shadowBlur = 0;
  ctx.fillStyle = tier.color; ctx.shadowColor = tier.color; ctx.shadowBlur = 10;
  ctx.font = mono(8); ctx.textAlign = 'right'; ctx.fillText(tier.name, CARD_W - 18, 26); ctx.shadowBlur = 0;

  // Avatar
  const AVX = 95, AVY = 118, AVR = 48;
  const img = await loadImg(username, avatarUrl);
  ctx.save();
  ctx.beginPath(); ctx.arc(AVX, AVY, AVR, 0, Math.PI * 2); ctx.clip();
  if (img) {
    ctx.drawImage(img, AVX - AVR, AVY - AVR, AVR * 2, AVR * 2);
  } else {
    ctx.fillStyle = tier.color; ctx.fill();
    ctx.fillStyle = '#000'; ctx.font = mono(26); ctx.textAlign = 'center';
    ctx.fillText(username[0]?.toUpperCase() ?? '?', AVX, AVY + 9);
  }
  ctx.restore();
  ctx.strokeStyle = tier.color; ctx.shadowColor = tier.color; ctx.shadowBlur = 14; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(AVX, AVY, AVR + 4, 0, Math.PI * 2); ctx.stroke(); ctx.shadowBlur = 0;

  // Level badge
  ctx.fillStyle = tier.color; ctx.shadowColor = tier.color; ctx.shadowBlur = 6;
  ctx.fillRect(AVX - 21, AVY + AVR - 1, 42, 15); ctx.shadowBlur = 0;
  ctx.fillStyle = '#000'; ctx.font = mono(7); ctx.textAlign = 'center';
  ctx.fillText(`LV${level}`, AVX, AVY + AVR + 10);

  // XP bar (below avatar)
  const xpBarX = 18, xpBarY = AVY + AVR + 22, xpBarW = 155, xpBarH = 6;
  const xpPct = xpProgressInLevel(xp, level);
  const xpLeft = xpForLevel(level); const xpNext = xpForLevel(level + 1);
  ctx.fillStyle = '#1a0030'; ctx.fillRect(xpBarX, xpBarY, xpBarW, xpBarH);
  const xpGrad = ctx.createLinearGradient(xpBarX, 0, xpBarX + xpBarW, 0);
  xpGrad.addColorStop(0, tier.color); xpGrad.addColorStop(1, archetypeColor);
  ctx.fillStyle = xpGrad; ctx.shadowColor = tier.color; ctx.shadowBlur = 5;
  ctx.fillRect(xpBarX, xpBarY, xpBarW * xpPct, xpBarH); ctx.shadowBlur = 0;
  ctx.fillStyle = '#555'; ctx.font = mono(6); ctx.textAlign = 'left';
  ctx.fillText(`XP ${xp - xpLeft} / ${xpNext - xpLeft}`, xpBarX, xpBarY + xpBarH + 11);

  // Identity (right side)
  const RX = 196;
  ctx.fillStyle = '#ffffff'; ctx.shadowColor = tier.color; ctx.shadowBlur = 8;
  ctx.font = mono(15); ctx.textAlign = 'left'; ctx.fillText(`@${username.slice(0, 14)}`, RX, 68); ctx.shadowBlur = 0;
  ctx.fillStyle = archetypeColor; ctx.font = mono(8); ctx.fillText(archetypeLabel.toUpperCase(), RX, 84);

  // Win/loss stats row
  const total = wins + losses;
  const wr = total > 0 ? Math.round((wins / total) * 100) : 0;
  const cw = (CARD_W - RX - 18) / 4;
  [
    { label: 'WINS',   value: String(wins),    color: '#00ff41' },
    { label: 'LOSSES', value: String(losses),  color: '#ff4040' },
    { label: 'WIN %',  value: `${wr}%`,        color: wr >= 60 ? '#00ff41' : wr >= 40 ? '#ffaa00' : '#ff4040' },
    { label: 'COMBO',  value: `${maxCombo}x`,  color: '#ffd60a' },
  ].forEach(({ label, value, color }, i) => {
    const cx = RX + cw * i + cw / 2;
    ctx.fillStyle = '#555'; ctx.font = mono(6); ctx.textAlign = 'center'; ctx.fillText(label, cx, 106);
    ctx.fillStyle = color; ctx.shadowColor = color; ctx.shadowBlur = 5;
    ctx.font = mono(13); ctx.fillText(value, cx, 124); ctx.shadowBlur = 0;
  });

  // Divider
  ctx.strokeStyle = `rgba(${r},${g},${b},0.3)`; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(16, 176); ctx.lineTo(CARD_W - 16, 176); ctx.stroke();

  // BASE STATS — 6 bars in 2 columns
  ctx.fillStyle = '#666'; ctx.font = mono(7); ctx.textAlign = 'left'; ctx.fillText('BASE STATS', 16, 191);
  const colW6 = (CARD_W - 32) / 2;
  [
    { label: 'POWER',    value: basePower, color: archetypeColor, max: 100 },
    { label: 'CRIT %',   value: critRate,  color: '#ffd60a',     max: 80 },
    { label: 'DEFENSE',  value: defense,   color: '#00ccff',     max: 100 },
    { label: 'STAMINA',  value: stamina,   color: '#ff6699',     max: 100 },
    { label: 'SPEED',    value: speed,     color: '#00ff41',     max: 100 },
    { label: 'RAGE SPD', value: rageSpeed, color: '#ff3300',     max: 100 },
  ].forEach(({ label, value, color, max }, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const bx = 16 + col * colW6, by = 200 + row * 22, bw = colW6 - 18;
    ctx.fillStyle = '#555'; ctx.font = mono(6); ctx.textAlign = 'left';
    ctx.fillText(`${label} ${value}`, bx, by);
    ctx.fillStyle = '#1a0030'; ctx.fillRect(bx, by + 4, bw, 5);
    ctx.fillStyle = color; ctx.shadowColor = color; ctx.shadowBlur = 3;
    ctx.fillRect(bx, by + 4, bw * Math.min(1, value / max), 5); ctx.shadowBlur = 0;
  });

  // Divider
  ctx.strokeStyle = `rgba(${r},${g},${b},0.3)`; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(16, 272); ctx.lineTo(CARD_W - 16, 272); ctx.stroke();

  // COMBAT MODIFIERS — 4 boxes
  ctx.fillStyle = '#666'; ctx.font = mono(7); ctx.textAlign = 'left'; ctx.fillText('COMBAT MODIFIERS', 16, 286);
  const atkPct = Math.round((attackMult - 1) * 100);
  const defPct = Math.round((1 - defenseMult) * 100);
  const xpPctMod = Math.round((xpMult - 1) * 100);
  const modW = (CARD_W - 32) / 4;
  [
    { label: 'ATK BOOST',  value: `${atkPct >= 0 ? '+' : ''}${atkPct}%`,  pos: atkPct >= 0 },
    { label: 'DMG SHIELD', value: `-${Math.max(0, defPct)}%`,              pos: defPct >= 0 },
    { label: 'WIN STREAK', value: `${winStreak}x`,                         pos: winStreak > 0 },
    { label: 'XP BONUS',   value: `+${xpPctMod}%`,                        pos: xpMult >= 1 },
  ].forEach(({ label, value, pos }, i) => {
    const bx = 16 + modW * i, by = 294, mw = modW - 4;
    const mc = pos ? '#00ff41' : '#ff4040';
    ctx.fillStyle = pos ? 'rgba(0,255,65,.07)' : 'rgba(255,45,117,.07)';
    ctx.fillRect(bx, by, mw, 42);
    ctx.strokeStyle = mc; ctx.globalAlpha = 0.35; ctx.lineWidth = 1;
    ctx.strokeRect(bx, by, mw, 42); ctx.globalAlpha = 1;
    ctx.fillStyle = '#555'; ctx.font = mono(5); ctx.textAlign = 'center';
    ctx.fillText(label, bx + mw / 2, by + 13);
    ctx.fillStyle = mc; ctx.shadowColor = mc; ctx.shadowBlur = 5;
    ctx.font = mono(11); ctx.fillText(value, bx + mw / 2, by + 32); ctx.shadowBlur = 0;
  });

  // Passive ability
  ctx.strokeStyle = `rgba(${r},${g},${b},0.3)`; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(16, 348); ctx.lineTo(CARD_W - 16, 348); ctx.stroke();
  ctx.fillStyle = '#666'; ctx.font = mono(6); ctx.textAlign = 'left'; ctx.fillText('PASSIVE', 16, 363);
  ctx.fillStyle = archetypeColor; ctx.font = mono(7);
  const pt = passiveAbility.length > 62 ? passiveAbility.slice(0, 60) + '…' : passiveAbility;
  ctx.fillText(pt, 82, 363);

  // Footer
  ctx.fillStyle = `rgba(${r},${g},${b},0.08)`; ctx.fillRect(0, 378, CARD_W, CARD_H - 378);
  ctx.strokeStyle = `rgba(${r},${g},${b},0.2)`; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, 378); ctx.lineTo(CARD_W, 378); ctx.stroke();
  ctx.fillStyle = '#555'; ctx.font = mono(7); ctx.textAlign = 'center';
  ctx.fillText(`⚔  Think you can beat me?  •  ${GAME_URL}`, CARD_W / 2, 394);
}

const ARCHETYPE_LABELS: Record<string, string> = {
  crypto_trader: 'Crypto Trader', ai_builder: 'AI Builder', meme_account: 'Meme Lord',
  founder_ceo: 'Founder CEO', developer: 'Developer', influencer: 'Influencer',
  degen: 'Degen', og_holder: 'OG Holder',
};

function MatchHistoryRow({ entry }: { entry: MatchHistoryEntry }) {
  const wonColor = entry.won ? 'var(--neon-grn)' : 'var(--neon-pink)';
  const label = ARCHETYPE_LABELS[entry.opponentArchetype] ?? entry.opponentArchetype;
  return (
    <div className="flex items-center gap-3 px-4 py-3"
      style={{ borderBottom: '2px solid var(--panel-line)', background: entry.won ? 'rgba(0,255,157,.03)' : 'rgba(255,45,117,.03)' }}>
      <div style={{ fontSize: '16px', flexShrink: 0 }}>{entry.won ? '🏆' : '💀'}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-0.5">
          <span style={{ fontFamily: 'var(--pixel)', fontSize: '8px', color: wonColor }}>{entry.won ? 'WIN' : 'LOSS'}</span>
          {entry.isPvP && (
            <span style={{ fontFamily: 'var(--pixel)', fontSize: '6px', color: '#00ccff', background: 'rgba(0,204,255,.12)', border: '1px solid rgba(0,204,255,.4)', padding: '1px 4px' }}>VS</span>
          )}
          <span style={{ fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--txt-dim)' }}>vs @{entry.opponent}</span>
        </div>
        <div style={{ fontFamily: 'var(--mono)', fontSize: '9px', color: 'var(--txt-dim)' }}>
          {label} · {entry.maxCombo}x combo · {entry.durationSec}s
        </div>
      </div>
      <div className="text-right flex-shrink-0">
        <div style={{ fontFamily: 'var(--pixel)', fontSize: '8px', color: 'var(--neon-grn)' }}>+{entry.xpGained} XP</div>
        <div style={{ fontFamily: 'var(--mono)', fontSize: '8px', color: 'var(--txt-dim)' }}>{timeAgo(entry.timestamp)}</div>
      </div>
    </div>
  );
}

export function Profile() {
  const { player1, setScreen, playerProfile: storeProfile, setPlayerProfile } = useGameStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cardReady, setCardReady] = useState(false);
  const [copied, setCopied] = useState(false);

  const username = player1?.profile.username ?? '';
  const profile = useMemo(() => {
    const p = getProfile(username);
    if (!storeProfile || storeProfile.username !== username) setPlayerProfile(p);
    return p;
  }, [username]);

  const mods = useMemo(() => getCombatModifiers(profile), [profile]);
  const tier = getLevelTier(profile.level);
  const xpProgress = xpProgressInLevel(profile.xp, profile.level);
  const xpNeeded = xpNeededForNextLevel(profile.level);
  const xpIntoLevel = profile.xp - xpForLevel(profile.level);
  const totalMatches = profile.wins + profile.losses;
  const winRate = totalMatches > 0 ? Math.round((profile.wins / totalMatches) * 100) : 0;
  const atkPct = Math.round((mods.attackMult - 1) * 100);
  const defPct = Math.round((1 - mods.defenseMult) * 100);
  const nextTier = LEVEL_TIERS.find(t => t.minLevel > profile.level);

  useEffect(() => {
    if (!canvasRef.current || !player1) return;
    setCardReady(false);
    renderProfileCard(
      canvasRef.current,
      username, player1.profile.avatarUrl,
      profile.level, profile.xp,
      profile.wins, profile.losses, profile.maxCombo,
      player1.stats.archetypeLabel, player1.stats.color,
      player1.stats.passiveAbility,
      player1.stats.basePower, player1.stats.defense, player1.stats.speed,
      player1.stats.critRate, player1.stats.stamina, player1.stats.rageSpeed,
      profile.winStreak, mods.attackMult, mods.defenseMult, mods.xpMult,
    ).then(() => setCardReady(true));
  }, [username, profile.level, profile.wins, profile.losses]);

  const downloadCard = useCallback(() => {
    if (!canvasRef.current) return;
    const a = document.createElement('a');
    a.download = `gitmusk-profile-${username}.png`;
    a.href = canvasRef.current.toDataURL('image/png');
    a.click();
  }, [username]);

  const tweetText = [
    `🎮 My #GitMuskFighterArena fighter card!`,
    ``,
    `@${username} · ${tier.name} · LV${profile.level}`,
    `⚔ ${profile.wins}W / ${profile.losses}L · ${winRate}% WR`,
    `💥 Max combo: ${profile.maxCombo}x | ${player1?.stats.archetypeLabel}`,
    ``,
    `Think you can beat me? ${GAME_URL}`,
  ].join('\n');

  const shareWithCard = useCallback(async () => {
    if (!canvasRef.current) return;
    const blob = await new Promise<Blob>(res => canvasRef.current!.toBlob(b => res(b!), 'image/png'));
    const file = new File([blob], `gitmusk-${username}.png`, { type: 'image/png' });

    // Mobile: native share sheet with image (opens X/Twitter app with image pre-attached)
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ title: '⚔ GitMusk Fighter Arena', text: tweetText, files: [file] });
        return;
      } catch { /* user dismissed */ }
    }

    // Desktop fallback: download PNG then open Twitter compose
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.download = `gitmusk-${username}.png`; a.href = url; a.click();
    URL.revokeObjectURL(url);
    setTimeout(() => {
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`, '_blank', 'noopener,noreferrer');
    }, 600);
  }, [canvasRef, username, tweetText]);

  const copyLink = useCallback(async () => {
    await navigator.clipboard.writeText(GAME_URL).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  return (
    <div className="gscreen flex flex-col items-center p-4 py-8 overflow-y-auto">
      <div className="w-full max-w-lg">

        {/* Nav */}
        <nav className="g-nav" style={{ position: 'relative', marginBottom: '28px' }}>
          <div className="logo"><div className="badge">X</div>FIGHTER ARENA</div>
          <button onClick={() => setScreen('mode_select')} className="g-btn ghost sm">← BACK</button>
        </nav>

        {/* Header */}
        <div className="text-center mb-6">
          <span className="g-eyebrow" style={{ color: tier.color }}>// FIGHTER PROFILE</span>
          <div style={{ fontFamily: 'var(--pixel)', fontSize: '20px', color: '#fff', textShadow: `3px 3px 0 ${tier.color}` }}>
            {tier.name.toUpperCase()}
          </div>
        </div>

        {/* Fighter identity card */}
        <div className="g-panel mb-4" style={{ borderColor: tier.color, boxShadow: `inset 0 0 0 4px var(--void), 0 0 0 4px var(--void), 0 0 24px ${tier.color}60`, padding: '20px' }}>
          <div className="corners"><i style={{ background: tier.color }}></i><i style={{ background: tier.color }}></i><i style={{ background: tier.color }}></i><i style={{ background: tier.color }}></i></div>
          <div className="flex items-center gap-4">
            <div className="relative flex-shrink-0">
              <div className="w-16 h-16 overflow-hidden" style={{ border: `3px solid ${tier.color}`, boxShadow: `0 0 12px ${tier.color}` }}>
                <img src={player1?.profile.avatarUrl} className="w-full h-full object-cover"
                  onError={e => { (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/pixel-art/svg?seed=${username}`; }} />
              </div>
              <div className="absolute -bottom-1 -right-1"
                style={{ background: tier.color, color: '#000', fontFamily: 'var(--pixel)', fontSize: '7px', padding: '2px 5px' }}>
                LV{profile.level}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div style={{ fontFamily: 'var(--pixel)', fontSize: '12px', color: '#fff', marginBottom: '4px' }}>@{username}</div>
              <div style={{ fontFamily: 'var(--pixel)', fontSize: '8px', color: player1?.stats.color, marginBottom: '8px' }}>
                {player1?.stats.archetypeLabel.toUpperCase()} · {player1?.stats.tier.toUpperCase()}
              </div>
              <div className="g-bar-wrap">
                <div className="flex justify-between mb-1">
                  <span style={{ fontFamily: 'var(--pixel)', fontSize: '6px', color: 'var(--txt-dim)' }}>XP</span>
                  <span style={{ fontFamily: 'var(--pixel)', fontSize: '6px', color: tier.color }}>{xpIntoLevel} / {xpNeeded}</span>
                </div>
                <div className="g-bar-track">
                  <div className="g-bar-fill" style={{ width: `${xpProgress * 100}%`, background: `linear-gradient(90deg, ${tier.color}, ${player1?.stats.color ?? 'var(--neon-p)'})`, boxShadow: `0 0 8px ${tier.color}` }} />
                </div>
              </div>
              {nextTier && (
                <div style={{ fontFamily: 'var(--pixel)', fontSize: '6px', color: 'var(--txt-dim)', marginTop: '4px' }}>
                  Next: {nextTier.name} @ LV{nextTier.minLevel}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Season badges */}
        {profile.badges && profile.badges.length > 0 && (
          <div className="g-panel dark mb-4" style={{ padding: '14px 16px' }}>
            <span className="g-eyebrow" style={{ color: 'var(--neon-yel)', marginBottom: '10px', display: 'block' }}>// SEASON BADGES</span>
            <div className="flex flex-wrap gap-2">
              {profile.badges.map(badge => {
                const m = badge.match(/^s(\d+)_(champ|gold|silver|bronze)$/);
                if (!m) return null;
                const styles: Record<string, { color: string; label: string }> = {
                  champ:  { color: '#ffd60a', label: '👑 CHAMPION' },
                  gold:   { color: '#ffb700', label: '🥇 GOLD'     },
                  silver: { color: '#c0c0c0', label: '🥈 SILVER'   },
                  bronze: { color: '#cd7f32', label: '🥉 BRONZE'   },
                };
                const s = styles[m[2]];
                if (!s) return null;
                return (
                  <div key={badge} style={{ fontFamily: 'var(--pixel)', fontSize: '7px', padding: '4px 10px', color: s.color, border: `2px solid ${s.color}60`, background: `${s.color}12` }}>
                    {s.label} <span style={{ color: 'var(--txt-dim)' }}>S{m[1]}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Match record stats */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {[
            { label: 'WINS', value: profile.wins, color: 'var(--neon-grn)' },
            { label: 'LOSSES', value: profile.losses, color: 'var(--neon-pink)' },
            { label: 'WIN %', value: `${winRate}%`, color: winRate >= 60 ? 'var(--neon-grn)' : winRate >= 40 ? 'var(--neon-yel)' : 'var(--neon-pink)' },
            { label: 'COMBO', value: `${profile.maxCombo}x`, color: 'var(--neon-yel)' },
          ].map(s => (
            <div key={s.label} className="g-panel dark text-center" style={{ padding: '12px 8px' }}>
              <div style={{ fontFamily: 'var(--pixel)', fontSize: '6px', color: 'var(--txt-dim)', marginBottom: '6px' }}>{s.label}</div>
              <div style={{ fontFamily: 'var(--pixel)', fontSize: '13px', color: s.color, textShadow: `0 0 8px ${s.color}` }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Base fighter stats */}
        {player1 && (
          <div className="g-panel dark mb-4" style={{ padding: '16px' }}>
            <span className="g-eyebrow" style={{ color: 'var(--neon-p)', marginBottom: '12px', display: 'block' }}>// BASE STATS</span>
            {[
              { label: 'POWER', value: player1.stats.basePower, color: player1.stats.color, max: 100 },
              { label: 'DEFENSE', value: player1.stats.defense, color: 'var(--neon-b)', max: 100 },
              { label: 'SPEED', value: player1.stats.speed, color: 'var(--neon-grn)', max: 100 },
              { label: 'CRIT %', value: player1.stats.critRate, color: 'var(--neon-yel)', max: 80 },
              { label: 'STAMINA', value: player1.stats.stamina, color: 'var(--neon-pink)', max: 100 },
            ].map(({ label, value, color, max }) => (
              <div key={label} className="mb-3">
                <div className="flex justify-between mb-1">
                  <span style={{ fontFamily: 'var(--pixel)', fontSize: '7px', color: 'var(--txt-dim)' }}>{label}</span>
                  <span style={{ fontFamily: 'var(--pixel)', fontSize: '7px', color }}>{value}</span>
                </div>
                <div className="g-bar-track">
                  <div className="g-bar-fill" style={{ width: `${Math.min(1, value / max) * 100}%`, background: color, boxShadow: `0 0 6px ${color}` }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Combat modifiers */}
        <div className="g-panel dark mb-4" style={{ padding: '16px' }}>
          <span className="g-eyebrow" style={{ color: 'var(--neon-p)', marginBottom: '12px', display: 'block' }}>// COMBAT MODIFIERS</span>
          <div className="grid grid-cols-4 gap-2 mb-3">
            {[
              { label: 'ATK BOOST', value: `${atkPct >= 0 ? '+' : ''}${atkPct}%`, positive: atkPct >= 0 },
              { label: 'DMG SHIELD', value: `${defPct >= 0 ? '-' : '+'}${Math.abs(defPct)}%`, positive: defPct >= 0 },
              { label: 'WIN STK', value: `${profile.winStreak}x`, positive: profile.winStreak > 0 },
              { label: 'XP BOOST', value: `${Math.round((mods.xpMult - 1) * 100)}%`, positive: mods.xpMult > 1 },
            ].map(({ label, value, positive }) => (
              <div key={label} className="text-center" style={{ background: 'var(--void)', border: `2px solid ${positive ? 'rgba(0,255,157,.25)' : 'rgba(255,45,117,.25)'}`, padding: '10px 6px' }}>
                <div style={{ fontFamily: 'var(--pixel)', fontSize: '6px', color: 'var(--txt-dim)', marginBottom: '4px' }}>{label}</div>
                <div style={{ fontFamily: 'var(--pixel)', fontSize: '10px', color: positive ? 'var(--neon-grn)' : 'var(--neon-pink)', textShadow: `0 0 6px ${positive ? 'var(--neon-grn)' : 'var(--neon-pink)'}` }}>{value}</div>
              </div>
            ))}
          </div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--txt-dim)', textAlign: 'center' }}>
            {profile.lossStreak >= 3
              ? `⚠ ${profile.lossStreak}-loss streak — ATK reduced until you win`
              : profile.winStreak >= 3
              ? `🔥 ${profile.winStreak}-win streak — ATK buffed!`
              : 'Win streaks boost your ATK. Loss streaks reduce it.'}
          </div>
        </div>

        {/* Streaks */}
        <div className="g-panel dark mb-4" style={{ padding: '16px' }}>
          <span className="g-eyebrow" style={{ color: 'var(--neon-yel)', marginBottom: '12px', display: 'block' }}>// STREAKS</span>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <div style={{ fontFamily: 'var(--pixel)', fontSize: '6px', color: 'var(--txt-dim)', marginBottom: '6px' }}>CURRENT WIN</div>
              <div style={{ fontFamily: 'var(--pixel)', fontSize: '14px', color: profile.winStreak > 0 ? 'var(--neon-grn)' : 'var(--panel-line)', textShadow: profile.winStreak > 0 ? '0 0 8px var(--neon-grn)' : 'none' }}>{profile.winStreak}x</div>
            </div>
            <div>
              <div style={{ fontFamily: 'var(--pixel)', fontSize: '6px', color: 'var(--txt-dim)', marginBottom: '6px' }}>BEST WIN</div>
              <div style={{ fontFamily: 'var(--pixel)', fontSize: '14px', color: 'var(--neon-yel)', textShadow: '0 0 8px var(--neon-yel)' }}>{profile.maxWinStreak}x</div>
            </div>
            <div>
              <div style={{ fontFamily: 'var(--pixel)', fontSize: '6px', color: 'var(--txt-dim)', marginBottom: '6px' }}>LOSS STREAK</div>
              <div style={{ fontFamily: 'var(--pixel)', fontSize: '14px', color: profile.lossStreak > 0 ? 'var(--neon-pink)' : 'var(--panel-line)', textShadow: profile.lossStreak > 0 ? '0 0 8px var(--neon-pink)' : 'none' }}>{profile.lossStreak}x</div>
            </div>
          </div>
        </div>

        {/* Recent matches */}
        <div className="g-panel dark mb-4" style={{ padding: '0' }}>
          <div style={{ padding: '14px 16px 10px', borderBottom: '2px solid var(--panel-line)' }}>
            <span className="g-eyebrow" style={{ color: 'var(--neon-b)' }}>// RECENT MATCHES</span>
          </div>
          {profile.matchHistory.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', fontFamily: 'var(--mono)', fontSize: '12px', color: 'var(--txt-dim)' }}>
              No matches yet — go fight!
            </div>
          ) : (
            profile.matchHistory.map((entry, i) => <MatchHistoryRow key={i} entry={entry} />)
          )}
        </div>

        {/* Achievements */}
        <div className="g-panel dark mb-4" style={{ padding: '16px' }}>
          <div className="flex items-center justify-between mb-3">
            <span className="g-eyebrow" style={{ color: 'var(--neon-p)' }}>// ACHIEVEMENTS</span>
            <span style={{ fontFamily: 'var(--pixel)', fontSize: '7px', color: 'var(--txt-dim)' }}>{profile.achievements.length}/{ACHIEVEMENTS.length}</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {ACHIEVEMENTS.map(ach => {
              const unlocked = profile.achievements.includes(ach.id);
              const rarityColor = ACHIEVEMENT_RARITY_COLORS[ach.rarity];
              return (
                <div key={ach.id} className="text-center"
                  style={{
                    background: unlocked ? `${rarityColor}18` : 'var(--void)', padding: '10px 6px',
                    border: `2px solid ${unlocked ? rarityColor : 'var(--panel-line)'}`,
                    opacity: unlocked ? 1 : 0.35,
                  }}>
                  <div style={{ fontSize: '20px', filter: unlocked ? 'none' : 'grayscale(1)' }}>{ach.icon}</div>
                  <div style={{ fontFamily: 'var(--pixel)', fontSize: '6px', color: unlocked ? rarityColor : 'var(--txt-dim)', marginTop: '4px' }}>{ach.name}</div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: '9px', color: 'var(--txt-dim)', marginTop: '2px' }}>{ach.desc}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Level tiers */}
        <div className="g-panel dark mb-4" style={{ padding: '16px' }}>
          <span className="g-eyebrow" style={{ color: 'var(--neon-p)', marginBottom: '12px', display: 'block' }}>// LEVEL TIERS</span>
          <div className="flex flex-col gap-2">
            {LEVEL_TIERS.map(t => (
              <div key={t.name} className="flex items-center gap-3">
                <div className="w-2 h-2 flex-shrink-0"
                  style={{ background: t.color, boxShadow: profile.level >= t.minLevel ? `0 0 6px ${t.color}` : 'none', opacity: profile.level >= t.minLevel ? 1 : 0.3 }} />
                <div style={{ fontFamily: 'var(--pixel)', fontSize: '7px', color: profile.level >= t.minLevel ? t.color : 'var(--panel-line)', flex: 1 }}>
                  LV{t.minLevel}+ {t.name}
                </div>
                {profile.level >= t.minLevel && (
                  <div style={{ fontFamily: 'var(--pixel)', fontSize: '6px', color: 'var(--txt-dim)' }}>UNLOCKED</div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Profile card */}
        <div className="g-panel dark mb-4" style={{ padding: '16px' }}>
          <span className="g-eyebrow" style={{ color: 'var(--neon-p)', marginBottom: '12px', display: 'block' }}>// FIGHTER CARD</span>
          <div className="relative overflow-hidden mb-3"
            style={{ border: `3px solid ${tier.color}60`, boxShadow: `0 0 20px ${tier.color}20` }}>
            <canvas ref={canvasRef} style={{ width: '100%', height: 'auto', display: 'block' }} />
            {!cardReady && (
              <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'var(--void)' }}>
                <div style={{ fontFamily: 'var(--pixel)', fontSize: '10px', color: tier.color, animation: 'g-pulse 1s steps(2) infinite' }}>
                  RENDERING...
                </div>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={downloadCard} disabled={!cardReady} className="g-btn ghost" style={{ flex: 1, fontSize: '8px' }}>
              📥 SAVE CARD
            </button>
            <button onClick={shareWithCard} className="g-btn" style={{ flex: 1, fontSize: '8px', background: '#1d9bf0', boxShadow: '0 4px 0 0 #0d5a8a, 0 4px 0 4px var(--void), 0 8px 0 4px #5a1a99' }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.261 5.635zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              SHARE
            </button>
            <button onClick={copyLink} className="g-btn ghost sm" style={{ color: copied ? 'var(--neon-grn)' : undefined }}>
              {copied ? '✓' : '🔗'}
            </button>
          </div>
        </div>

        {/* Bottom nav */}
        <div className="flex gap-3">
          <button onClick={() => setScreen('mode_select')} className="g-btn ghost" style={{ flex: 1, fontSize: '10px' }}>← LOBBY</button>
          <button onClick={() => setScreen('leaderboard')} className="g-btn" style={{ flex: 1, fontSize: '10px' }}>🏆 LEADERBOARD</button>
        </div>

      </div>
    </div>
  );
}
