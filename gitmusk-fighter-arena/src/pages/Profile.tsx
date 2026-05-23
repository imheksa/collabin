import { useMemo, useRef, useState, useCallback, useEffect } from 'react';
import { useGameStore } from '../stores/gameStore';
import {
  getProfile, getCombatModifiers, getLevelTier,
  xpProgressInLevel, xpNeededForNextLevel, xpForLevel,
  ACHIEVEMENTS, ACHIEVEMENT_RARITY_COLORS, LEVEL_TIERS,
  MatchHistoryEntry,
} from '../utils/playerProfile';

const GAME_URL = 'https://imheksa.github.io/collabin/gitmusk-fighter-arena/';
const CARD_W = 600;
const CARD_H = 315;

// ─── Helpers ─────────────────────────────────────────────────────────────────

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
  unlockedAchievements: string[],
  basePower: number,
  defense: number,
  speed: number,
) {
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const ctx = canvas.getContext('2d')!;
  const tier = getLevelTier(level);
  const [r, g, b] = hexToRgb(tier.color);
  const mono = (size: number) => `bold ${size}px "Courier New", monospace`;

  // ── Background ──
  const bg = ctx.createLinearGradient(0, 0, CARD_W, CARD_H);
  bg.addColorStop(0, '#06001a');
  bg.addColorStop(1, '#180030');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  for (let y = 0; y < CARD_H; y += 4) {
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.fillRect(0, y, CARD_W, 2);
  }

  // Neon border
  ctx.strokeStyle = tier.color;
  ctx.lineWidth = 3;
  ctx.shadowColor = tier.color;
  ctx.shadowBlur = 18;
  ctx.strokeRect(3, 3, CARD_W - 6, CARD_H - 6);
  ctx.shadowBlur = 0;
  ctx.strokeStyle = `rgba(${r},${g},${b},0.25)`;
  ctx.lineWidth = 1;
  ctx.strokeRect(8, 8, CARD_W - 16, CARD_H - 16);

  // ── TOP BAR (0..42) ──
  ctx.fillStyle = `rgba(${r},${g},${b},0.14)`;
  ctx.fillRect(0, 0, CARD_W, 42);

  ctx.fillStyle = '#ff00ff';
  ctx.shadowColor = '#ff00ff';
  ctx.shadowBlur = 8;
  ctx.font = mono(10);
  ctx.textAlign = 'center';
  ctx.fillText('⚔  GITMUSK FIGHTER ARENA  ⚔', CARD_W / 2, 26);
  ctx.shadowBlur = 0;

  ctx.fillStyle = tier.color;
  ctx.shadowColor = tier.color;
  ctx.shadowBlur = 10;
  ctx.font = mono(8);
  ctx.textAlign = 'right';
  ctx.fillText(tier.name, CARD_W - 18, 26);
  ctx.shadowBlur = 0;

  // ── AVATAR (left column, center at 95,128) ──
  const AVX = 95, AVY = 128, AVR = 52;

  const img = await loadImg(username, avatarUrl);
  ctx.save();
  ctx.beginPath();
  ctx.arc(AVX, AVY, AVR, 0, Math.PI * 2);
  ctx.clip();
  if (img) {
    ctx.drawImage(img, AVX - AVR, AVY - AVR, AVR * 2, AVR * 2);
  } else {
    ctx.fillStyle = tier.color;
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.font = mono(28);
    ctx.textAlign = 'center';
    ctx.fillText(username[0]?.toUpperCase() ?? '?', AVX, AVY + 10);
  }
  ctx.restore();

  ctx.strokeStyle = tier.color;
  ctx.shadowColor = tier.color;
  ctx.shadowBlur = 16;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(AVX, AVY, AVR + 4, 0, Math.PI * 2);
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Level badge
  const lvW = 42, lvH = 16;
  ctx.fillStyle = tier.color;
  ctx.shadowColor = tier.color;
  ctx.shadowBlur = 8;
  ctx.fillRect(AVX - lvW / 2, AVY + AVR - 2, lvW, lvH);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#000';
  ctx.font = mono(8);
  ctx.textAlign = 'center';
  ctx.fillText(`LV${level}`, AVX, AVY + AVR + 10);

  // XP bar below avatar
  const xpBarX = 18, xpBarY = AVY + AVR + 26, xpBarW = 160, xpBarH = 7;
  const xpPct = xpProgressInLevel(xp, level);
  const xpLeft = xpForLevel(level);
  const xpNext = xpForLevel(level + 1);
  ctx.fillStyle = '#1a0030';
  ctx.fillRect(xpBarX, xpBarY, xpBarW, xpBarH);
  const xpGrad = ctx.createLinearGradient(xpBarX, 0, xpBarX + xpBarW, 0);
  xpGrad.addColorStop(0, tier.color);
  xpGrad.addColorStop(1, archetypeColor);
  ctx.fillStyle = xpGrad;
  ctx.shadowColor = tier.color;
  ctx.shadowBlur = 6;
  ctx.fillRect(xpBarX, xpBarY, xpBarW * xpPct, xpBarH);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#444';
  ctx.font = mono(6);
  ctx.textAlign = 'left';
  ctx.fillText(`${xp - xpLeft} / ${xpNext - xpLeft} XP`, xpBarX, xpBarY + xpBarH + 11);

  // ── RIGHT COLUMN (x=200) ──
  const RX = 200;

  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = tier.color;
  ctx.shadowBlur = 8;
  ctx.font = mono(16);
  ctx.textAlign = 'left';
  ctx.fillText(`@${username.slice(0, 14)}`, RX, 76);
  ctx.shadowBlur = 0;

  ctx.fillStyle = archetypeColor;
  ctx.font = mono(8);
  ctx.fillText(archetypeLabel.toUpperCase(), RX, 94);

  // Stat grid row 1: W / L / WR
  const total = wins + losses;
  const wr = total > 0 ? Math.round((wins / total) * 100) : 0;
  const cells1 = [
    { label: 'WINS', value: String(wins), color: '#00ff41' },
    { label: 'LOSSES', value: String(losses), color: '#ff4040' },
    { label: 'WIN RATE', value: `${wr}%`, color: wr >= 60 ? '#00ff41' : wr >= 40 ? '#ffaa00' : '#ff4040' },
  ];
  const colW = (CARD_W - RX - 20) / 3;
  cells1.forEach(({ label, value, color }, i) => {
    const cx = RX + colW * i + colW / 2;
    ctx.fillStyle = '#444';
    ctx.font = mono(6);
    ctx.textAlign = 'center';
    ctx.fillText(label, cx, 118);
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 6;
    ctx.font = mono(14);
    ctx.fillText(value, cx, 138);
    ctx.shadowBlur = 0;
  });

  // Stat grid row 2: Combo / Matches
  const cells2 = [
    { label: 'MAX COMBO', value: `${maxCombo}x`, color: '#ffff00' },
    { label: 'MATCHES', value: String(total), color: '#00ccff' },
  ];
  const colW2 = (CARD_W - RX - 20) / 2;
  cells2.forEach(({ label, value, color }, i) => {
    const cx = RX + colW2 * i + colW2 / 2;
    ctx.fillStyle = '#444';
    ctx.font = mono(6);
    ctx.textAlign = 'center';
    ctx.fillText(label, cx, 156);
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 6;
    ctx.font = mono(13);
    ctx.fillText(value, cx, 174);
    ctx.shadowBlur = 0;
  });

  // ── DIVIDER ──
  ctx.strokeStyle = `rgba(${r},${g},${b},0.3)`;
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(16, 198); ctx.lineTo(CARD_W - 16, 198); ctx.stroke();

  // ── STAT BARS (y=203..238) ──
  const bars = [
    { label: 'PWR', value: basePower, color: archetypeColor },
    { label: 'DEF', value: defense, color: '#00ccff' },
    { label: 'SPD', value: speed, color: '#00ff41' },
  ];
  const barSW = (CARD_W - 32) / 3;
  bars.forEach(({ label, value, color }, i) => {
    const bx = 16 + barSW * i;
    const bw = barSW - 16;
    ctx.fillStyle = '#444';
    ctx.font = mono(7);
    ctx.textAlign = 'left';
    ctx.fillText(`${label} ${value}`, bx, 218);
    ctx.fillStyle = '#1a0030';
    ctx.fillRect(bx, 222, bw, 6);
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 4;
    ctx.fillRect(bx, 222, bw * (value / 100), 6);
    ctx.shadowBlur = 0;
  });

  // ── ACHIEVEMENTS (y=238..278) ──
  ctx.strokeStyle = `rgba(${r},${g},${b},0.2)`;
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(16, 240); ctx.lineTo(CARD_W - 16, 240); ctx.stroke();

  ctx.fillStyle = '#444';
  ctx.font = mono(6);
  ctx.textAlign = 'left';
  ctx.fillText('ACHIEVEMENTS', 16, 254);

  const unlocked = ACHIEVEMENTS.filter(a => unlockedAchievements.includes(a.id));
  if (unlocked.length === 0) {
    ctx.fillStyle = '#333';
    ctx.font = mono(8);
    ctx.textAlign = 'center';
    ctx.fillText('Play matches to unlock!', CARD_W / 2, 270);
  } else {
    const show = unlocked.slice(0, 7);
    show.forEach((ach, i) => {
      ctx.font = '18px serif';
      ctx.textAlign = 'left';
      ctx.globalAlpha = 1;
      ctx.fillText(ach.icon, 100 + i * 62, 272);
    });
    if (unlocked.length > 7) {
      ctx.fillStyle = '#555';
      ctx.font = mono(7);
      ctx.textAlign = 'left';
      ctx.fillText(`+${unlocked.length - 7}`, 100 + 7 * 62, 272);
    }
  }
  ctx.globalAlpha = 1;

  // ── FOOTER (y=283..315) ──
  ctx.fillStyle = `rgba(${r},${g},${b},0.08)`;
  ctx.fillRect(0, 283, CARD_W, CARD_H - 283);
  ctx.strokeStyle = `rgba(${r},${g},${b},0.2)`;
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, 283); ctx.lineTo(CARD_W, 283); ctx.stroke();

  ctx.fillStyle = '#555';
  ctx.font = mono(7);
  ctx.textAlign = 'center';
  ctx.fillText(`⚔️  Think you can beat me?  •  ${GAME_URL}`, CARD_W / 2, 303);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatBar({ label, value, max = 100, color }: { label: string; value: number; max?: number; color: string }) {
  const pct = Math.min(1, value / max);
  return (
    <div className="mb-2">
      <div className="flex justify-between mb-1">
        <span className="font-pixel" style={{ fontSize: '7px', color: '#888' }}>{label}</span>
        <span className="font-pixel" style={{ fontSize: '7px', color }}>{value}</span>
      </div>
      <div className="h-1.5 rounded-full" style={{ background: '#1a0030' }}>
        <div className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct * 100}%`, background: color, boxShadow: `0 0 6px ${color}` }} />
      </div>
    </div>
  );
}

function ModifierBadge({ label, value, positive }: { label: string; value: string; positive: boolean }) {
  const color = positive ? '#00ff41' : '#ff4040';
  return (
    <div className="text-center p-2 rounded" style={{ background: '#0a0018', border: `1px solid ${color}30` }}>
      <div className="font-pixel" style={{ fontSize: '6px', color: '#555' }}>{label}</div>
      <div className="font-pixel mt-1" style={{ fontSize: '10px', color, textShadow: `0 0 6px ${color}` }}>
        {positive ? '+' : ''}{value}
      </div>
    </div>
  );
}

const ARCHETYPE_LABELS: Record<string, string> = {
  crypto_trader: 'Crypto Trader', ai_builder: 'AI Builder', meme_account: 'Meme Lord',
  founder_ceo: 'Founder CEO', developer: 'Developer', influencer: 'Influencer',
  degen: 'Degen', og_holder: 'OG Holder',
};

function MatchHistoryRow({ entry }: { entry: MatchHistoryEntry }) {
  const color = entry.won ? '#00ff41' : '#ff4040';
  const label = ARCHETYPE_LABELS[entry.opponentArchetype] ?? entry.opponentArchetype;
  return (
    <div className="flex items-center gap-3 p-3 rounded mb-2"
      style={{ background: '#080015', border: `1px solid ${color}25` }}>
      <div className="font-pixel flex-shrink-0 text-lg">{entry.won ? '🏆' : '💀'}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
          <span className="font-pixel" style={{ fontSize: '8px', color }}>{entry.won ? 'WIN' : 'LOSS'}</span>
          <span className="font-mono text-gray-500" style={{ fontSize: '9px' }}>vs @{entry.opponent}</span>
        </div>
        <div className="font-mono" style={{ fontSize: '8px', color: '#555' }}>
          {label} · {entry.maxCombo}x combo · {entry.durationSec}s
        </div>
      </div>
      <div className="text-right flex-shrink-0">
        <div className="font-pixel" style={{ fontSize: '8px', color: '#00ff41' }}>+{entry.xpGained} XP</div>
        <div className="font-mono" style={{ fontSize: '7px', color: '#444' }}>{timeAgo(entry.timestamp)}</div>
      </div>
    </div>
  );
}

// ─── Profile page ─────────────────────────────────────────────────────────────

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
      username,
      player1.profile.avatarUrl,
      profile.level,
      profile.xp,
      profile.wins,
      profile.losses,
      profile.maxCombo,
      player1.stats.archetypeLabel,
      player1.stats.color,
      profile.achievements,
      player1.stats.basePower,
      player1.stats.defense,
      player1.stats.speed,
    ).then(() => setCardReady(true));
  }, [username, profile.level, profile.wins, profile.losses]);

  const downloadCard = useCallback(() => {
    if (!canvasRef.current) return;
    const a = document.createElement('a');
    a.download = `gitmusk-profile-${username}.png`;
    a.href = canvasRef.current.toDataURL('image/png');
    a.click();
  }, [username]);

  const shareOnX = useCallback(() => {
    const text = [
      `🎮 My #GitMuskFighterArena fighter card!`,
      ``,
      `@${username} · ${tier.name} · LV${profile.level}`,
      `⚔ ${profile.wins}W / ${profile.losses}L · ${winRate}% WR`,
      `💥 Max combo: ${profile.maxCombo}x`,
      ``,
      `Think you can beat me? ${GAME_URL}`,
    ].join('\n');
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
  }, [username, tier, profile, winRate]);

  const copyLink = useCallback(async () => {
    await navigator.clipboard.writeText(GAME_URL).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-start bg-arena-bg p-4 overflow-y-auto">
      <div className="w-full max-w-lg">

        {/* Header */}
        <div className="text-center mb-5">
          <div className="font-pixel text-xl mb-1" style={{ color: tier.color, textShadow: `0 0 15px ${tier.color}` }}>
            {tier.name}
          </div>
          <div className="font-pixel" style={{ fontSize: '9px', color: '#555' }}>FIGHTER PROFILE</div>
        </div>

        {/* Fighter identity */}
        <div className="p-4 rounded mb-4" style={{ background: '#0d001a', border: `2px solid ${tier.color}`, boxShadow: `0 0 20px ${tier.color}20` }}>
          <div className="flex items-center gap-4">
            <div className="relative flex-shrink-0">
              <div className="w-16 h-16 rounded-full overflow-hidden"
                style={{ border: `3px solid ${tier.color}`, boxShadow: `0 0 12px ${tier.color}` }}>
                <img src={player1?.profile.avatarUrl} className="w-full h-full object-cover"
                  onError={e => { (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/pixel-art/svg?seed=${username}`; }} />
              </div>
              <div className="absolute -bottom-1 -right-1 font-pixel px-1.5 py-0.5 rounded"
                style={{ background: tier.color, color: '#000', fontSize: '7px', lineHeight: 1 }}>
                LV{profile.level}
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="font-pixel text-white mb-1" style={{ fontSize: '12px' }}>@{username}</div>
              <div className="font-pixel mb-1" style={{ fontSize: '8px', color: player1?.stats.color }}>
                {player1?.stats.archetypeLabel.toUpperCase()} · {player1?.stats.tier.toUpperCase()}
              </div>
              <div className="mb-1">
                <div className="flex justify-between mb-0.5">
                  <span className="font-pixel" style={{ fontSize: '6px', color: '#555' }}>XP</span>
                  <span className="font-pixel" style={{ fontSize: '6px', color: tier.color }}>{xpIntoLevel} / {xpNeeded}</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: '#1a0030' }}>
                  <div className="h-full rounded-full transition-all duration-1000"
                    style={{ width: `${xpProgress * 100}%`, background: `linear-gradient(90deg, ${tier.color}, ${player1?.stats.color ?? '#bf00ff'})`, boxShadow: `0 0 8px ${tier.color}` }} />
                </div>
              </div>
              {nextTier && (
                <div className="font-pixel" style={{ fontSize: '6px', color: '#444' }}>
                  Next: {nextTier.name} @ LV{nextTier.minLevel}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Combat modifiers */}
        <div className="mb-4">
          <div className="font-pixel mb-2" style={{ fontSize: '8px', color: '#bf00ff' }}>⚔ COMBAT MODIFIERS</div>
          <div className="grid grid-cols-4 gap-2">
            <ModifierBadge label="ATK BOOST" value={`${atkPct >= 0 ? '+' : ''}${atkPct}%`} positive={atkPct >= 0} />
            <ModifierBadge label="DMG SHIELD" value={`${defPct >= 0 ? '-' : '+'}${Math.abs(defPct)}%`} positive={defPct >= 0} />
            <ModifierBadge label="WIN STK" value={`${profile.winStreak}x`} positive={profile.winStreak > 0} />
            <ModifierBadge label="XP BOOST" value={`${Math.round((mods.xpMult - 1) * 100)}%`} positive={mods.xpMult > 1} />
          </div>
          <div className="mt-2 font-mono text-center" style={{ fontSize: '9px', color: '#444' }}>
            {profile.lossStreak >= 3
              ? `⚠ ${profile.lossStreak}-loss streak — ATK reduced until you win`
              : profile.winStreak >= 3
              ? `🔥 ${profile.winStreak}-win streak — ATK buffed!`
              : 'Win streaks boost your ATK. Loss streaks reduce it.'}
          </div>
        </div>

        {/* Base stats */}
        {player1 && (
          <div className="p-4 rounded mb-4" style={{ background: '#0a0018', border: '1px solid #1a0030' }}>
            <div className="font-pixel mb-3" style={{ fontSize: '8px', color: '#bf00ff' }}>📊 BASE FIGHTER STATS</div>
            <StatBar label="POWER"   value={player1.stats.basePower} color={player1.stats.color} />
            <StatBar label="DEFENSE" value={player1.stats.defense}   color="#00ccff" />
            <StatBar label="SPEED"   value={player1.stats.speed}     color="#00ff41" />
            <StatBar label="CRIT %"  value={player1.stats.critRate}  color="#ffaa00" max={80} />
            <StatBar label="STAMINA" value={player1.stats.stamina}   color="#ff00ff" />
          </div>
        )}

        {/* Match record */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {[
            { label: 'WINS',      value: profile.wins,           color: '#00ff41' },
            { label: 'LOSSES',    value: profile.losses,         color: '#ff4040' },
            { label: 'WIN RATE',  value: `${winRate}%`,          color: winRate >= 60 ? '#00ff41' : winRate >= 40 ? '#ffaa00' : '#ff4040' },
            { label: 'MAX COMBO', value: `${profile.maxCombo}x`, color: '#ffff00' },
          ].map(s => (
            <div key={s.label} className="text-center p-3 rounded" style={{ background: '#0a0018', border: '1px solid #1a0030' }}>
              <div className="font-pixel" style={{ fontSize: '6px', color: '#555' }}>{s.label}</div>
              <div className="font-pixel mt-1" style={{ fontSize: '13px', color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* ── LAST 3 MATCHES ── */}
        <div className="mb-4">
          <div className="font-pixel mb-2" style={{ fontSize: '8px', color: '#bf00ff' }}>⏱ RECENT MATCHES</div>
          {profile.matchHistory.length === 0 ? (
            <div className="p-4 rounded text-center" style={{ background: '#080015', border: '1px solid #150025' }}>
              <div className="font-mono" style={{ fontSize: '10px', color: '#444' }}>No matches recorded yet — go fight!</div>
            </div>
          ) : (
            profile.matchHistory.map((entry, i) => <MatchHistoryRow key={i} entry={entry} />)
          )}
        </div>

        {/* Streaks */}
        <div className="p-3 rounded mb-4" style={{ background: '#0a0018', border: '1px solid #1a0030' }}>
          <div className="font-pixel mb-2" style={{ fontSize: '8px', color: '#bf00ff' }}>🔥 STREAKS</div>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <div className="font-pixel" style={{ fontSize: '6px', color: '#555' }}>CURRENT WIN STK</div>
              <div className="font-pixel mt-1" style={{ fontSize: '14px', color: profile.winStreak > 0 ? '#00ff41' : '#333' }}>{profile.winStreak}x</div>
            </div>
            <div className="text-center">
              <div className="font-pixel" style={{ fontSize: '6px', color: '#555' }}>BEST WIN STK</div>
              <div className="font-pixel mt-1" style={{ fontSize: '14px', color: '#ffd700' }}>{profile.maxWinStreak}x</div>
            </div>
            <div className="text-center">
              <div className="font-pixel" style={{ fontSize: '6px', color: '#555' }}>LOSS STREAK</div>
              <div className="font-pixel mt-1" style={{ fontSize: '14px', color: profile.lossStreak > 0 ? '#ff4040' : '#333' }}>{profile.lossStreak}x</div>
            </div>
          </div>
        </div>

        {/* Achievements */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="font-pixel" style={{ fontSize: '8px', color: '#bf00ff' }}>🏅 ACHIEVEMENTS</div>
            <div className="font-pixel" style={{ fontSize: '7px', color: '#555' }}>{profile.achievements.length}/{ACHIEVEMENTS.length}</div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {ACHIEVEMENTS.map(ach => {
              const unlocked = profile.achievements.includes(ach.id);
              const rarityColor = ACHIEVEMENT_RARITY_COLORS[ach.rarity];
              return (
                <div key={ach.id} className="p-2 rounded text-center transition-all"
                  style={{ background: unlocked ? `${rarityColor}18` : '#050010', border: `1px solid ${unlocked ? rarityColor : '#150025'}`, opacity: unlocked ? 1 : 0.35 }}>
                  <div style={{ fontSize: '20px', filter: unlocked ? 'none' : 'grayscale(1)' }}>{ach.icon}</div>
                  <div className="font-pixel mt-1" style={{ fontSize: '6px', color: unlocked ? rarityColor : '#333' }}>{ach.name}</div>
                  <div className="font-mono mt-0.5" style={{ fontSize: '8px', color: '#444' }}>{ach.desc}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Level tier overview */}
        <div className="p-3 rounded mb-4" style={{ background: '#0a0018', border: '1px solid #1a0030' }}>
          <div className="font-pixel mb-2" style={{ fontSize: '8px', color: '#bf00ff' }}>📈 LEVEL TIERS</div>
          <div className="space-y-1">
            {LEVEL_TIERS.map(t => (
              <div key={t.name} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: t.color, boxShadow: profile.level >= t.minLevel ? `0 0 6px ${t.color}` : 'none', opacity: profile.level >= t.minLevel ? 1 : 0.3 }} />
                <div className="font-pixel" style={{ fontSize: '7px', color: profile.level >= t.minLevel ? t.color : '#333' }}>
                  LV{t.minLevel}+ {t.name}
                </div>
                {profile.level >= t.minLevel && <div className="font-pixel ml-auto" style={{ fontSize: '6px', color: '#444' }}>UNLOCKED</div>}
              </div>
            ))}
          </div>
        </div>

        {/* ── PROFILE CARD ── */}
        <div className="mb-4">
          <div className="font-pixel mb-2" style={{ fontSize: '8px', color: '#bf00ff' }}>🪪 PROFILE CARD</div>
          <div className="relative rounded overflow-hidden mb-3"
            style={{ border: `2px solid ${tier.color}40`, boxShadow: `0 0 20px ${tier.color}15` }}>
            <canvas ref={canvasRef} style={{ width: '100%', height: 'auto', display: 'block' }} />
            {!cardReady && (
              <div className="absolute inset-0 flex items-center justify-center" style={{ background: '#0d001a' }}>
                <div className="flex gap-1">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="w-2 h-2 rounded-full animate-bounce"
                      style={{ background: tier.color, animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <button onClick={downloadCard} disabled={!cardReady}
              className="flex-1 font-pixel py-3 rounded transition-all hover:scale-[1.02] disabled:opacity-40"
              style={{ background: 'transparent', border: `2px solid ${tier.color}`, color: tier.color, fontSize: '8px' }}>
              📥 SAVE CARD
            </button>
            <button onClick={shareOnX}
              className="flex-1 font-pixel py-3 rounded transition-all hover:scale-[1.02] flex items-center justify-center gap-1"
              style={{ background: 'linear-gradient(135deg,#1d9bf030,#1d9bf010)', border: '2px solid #1d9bf0', color: '#1d9bf0', fontSize: '8px', boxShadow: '0 0 12px #1d9bf025' }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.261 5.635zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              SHARE ON X
            </button>
            <button onClick={copyLink}
              className="font-pixel px-4 py-3 rounded transition-all hover:scale-[1.02]"
              style={{ background: 'transparent', border: '1px solid #333', color: copied ? '#00ff41' : '#555', fontSize: '8px' }}>
              {copied ? '✓' : '🔗'}
            </button>
          </div>
          <div className="text-center mt-2 font-mono" style={{ fontSize: '9px', color: '#333' }}>
            Save card → attach to tweet for maximum flex 💪
          </div>
        </div>

        {/* Nav */}
        <div className="flex gap-3">
          <button onClick={() => setScreen('mode_select')}
            className="flex-1 font-pixel py-3 rounded transition-all hover:scale-[1.02]"
            style={{ background: 'transparent', border: '2px solid #00ffff', color: '#00ffff', fontSize: '8px' }}>
            ← BACK TO LOBBY
          </button>
          <button onClick={() => setScreen('leaderboard')}
            className="flex-1 font-pixel py-3 rounded transition-all hover:scale-[1.02]"
            style={{ background: 'transparent', border: '2px solid #ffd700', color: '#ffd700', fontSize: '8px' }}>
            🏆 LEADERBOARD
          </button>
        </div>

      </div>
    </div>
  );
}
