import { useMemo } from 'react';
import { useGameStore } from '../stores/gameStore';
import {
  getProfile, getCombatModifiers, getLevelTier,
  xpProgressInLevel, xpNeededForNextLevel, xpForLevel,
  ACHIEVEMENTS, ACHIEVEMENT_RARITY_COLORS, LEVEL_TIERS,
} from '../utils/playerProfile';

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

export function Profile() {
  const { player1, setScreen, playerProfile: storeProfile, setPlayerProfile } = useGameStore();

  const username = player1?.profile.username ?? '';
  const profile = useMemo(() => {
    const p = getProfile(username);
    if (!storeProfile || storeProfile.username !== username) {
      setPlayerProfile(p);
    }
    return p;
  }, [username]);

  const mods = useMemo(() => getCombatModifiers(profile), [profile]);
  const tier = getLevelTier(profile.level);
  const xpProgress = xpProgressInLevel(profile.xp, profile.level);
  const xpNeeded = xpNeededForNextLevel(profile.level);
  const xpIntoLevel = profile.xp - xpForLevel(profile.level);
  const totalMatches = profile.wins + profile.losses;
  const winRate = totalMatches > 0 ? Math.round((profile.wins / totalMatches) * 100) : 0;

  // ATK modifier as percentage relative to base
  const atkPct = Math.round((mods.attackMult - 1) * 100);
  // DEF modifier (how much less damage taken)
  const defPct = Math.round((1 - mods.defenseMult) * 100);

  const unlockedAchs = profile.achievements;
  const nextTier = LEVEL_TIERS.find(t => t.minLevel > profile.level);

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
                <img
                  src={player1?.profile.avatarUrl}
                  className="w-full h-full object-cover"
                  onError={e => { (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/pixel-art/svg?seed=${username}`; }}
                />
              </div>
              {/* Level badge */}
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
              {/* XP bar */}
              <div className="mb-1">
                <div className="flex justify-between mb-0.5">
                  <span className="font-pixel" style={{ fontSize: '6px', color: '#555' }}>XP</span>
                  <span className="font-pixel" style={{ fontSize: '6px', color: tier.color }}>
                    {xpIntoLevel} / {xpNeeded}
                  </span>
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
            <ModifierBadge
              label="ATK BOOST"
              value={`${atkPct >= 0 ? '+' : ''}${atkPct}%`}
              positive={atkPct >= 0}
            />
            <ModifierBadge
              label="DMG SHIELD"
              value={`${defPct >= 0 ? '-' : '+'}${Math.abs(defPct)}%`}
              positive={defPct >= 0}
            />
            <ModifierBadge
              label="WIN STK"
              value={`${profile.winStreak}x`}
              positive={profile.winStreak > 0}
            />
            <ModifierBadge
              label="XP BOOST"
              value={`${Math.round((mods.xpMult - 1) * 100)}%`}
              positive={mods.xpMult > 1}
            />
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
            { label: 'WINS',     value: profile.wins,        color: '#00ff41' },
            { label: 'LOSSES',   value: profile.losses,      color: '#ff4040' },
            { label: 'WIN RATE', value: `${winRate}%`,       color: winRate >= 60 ? '#00ff41' : winRate >= 40 ? '#ffaa00' : '#ff4040' },
            { label: 'MAX COMBO',value: `${profile.maxCombo}x`, color: '#ffff00' },
          ].map(s => (
            <div key={s.label} className="text-center p-3 rounded" style={{ background: '#0a0018', border: '1px solid #1a0030' }}>
              <div className="font-pixel" style={{ fontSize: '6px', color: '#555' }}>{s.label}</div>
              <div className="font-pixel mt-1" style={{ fontSize: '13px', color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Streak history */}
        <div className="p-3 rounded mb-4" style={{ background: '#0a0018', border: '1px solid #1a0030' }}>
          <div className="font-pixel mb-2" style={{ fontSize: '8px', color: '#bf00ff' }}>🔥 STREAKS</div>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <div className="font-pixel" style={{ fontSize: '6px', color: '#555' }}>CURRENT WIN STK</div>
              <div className="font-pixel mt-1" style={{ fontSize: '14px', color: profile.winStreak > 0 ? '#00ff41' : '#333' }}>
                {profile.winStreak}x
              </div>
            </div>
            <div className="text-center">
              <div className="font-pixel" style={{ fontSize: '6px', color: '#555' }}>BEST WIN STK</div>
              <div className="font-pixel mt-1" style={{ fontSize: '14px', color: '#ffd700' }}>{profile.maxWinStreak}x</div>
            </div>
            <div className="text-center">
              <div className="font-pixel" style={{ fontSize: '6px', color: '#555' }}>LOSS STREAK</div>
              <div className="font-pixel mt-1" style={{ fontSize: '14px', color: profile.lossStreak > 0 ? '#ff4040' : '#333' }}>
                {profile.lossStreak}x
              </div>
            </div>
          </div>
        </div>

        {/* Achievements */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="font-pixel" style={{ fontSize: '8px', color: '#bf00ff' }}>🏅 ACHIEVEMENTS</div>
            <div className="font-pixel" style={{ fontSize: '7px', color: '#555' }}>
              {unlockedAchs.length}/{ACHIEVEMENTS.length}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {ACHIEVEMENTS.map(ach => {
              const unlocked = unlockedAchs.includes(ach.id);
              const rarityColor = ACHIEVEMENT_RARITY_COLORS[ach.rarity];
              return (
                <div key={ach.id}
                  className="p-2 rounded text-center transition-all"
                  style={{
                    background: unlocked ? `${rarityColor}18` : '#050010',
                    border: `1px solid ${unlocked ? rarityColor : '#150025'}`,
                    opacity: unlocked ? 1 : 0.35,
                  }}>
                  <div style={{ fontSize: '20px', filter: unlocked ? 'none' : 'grayscale(1)' }}>{ach.icon}</div>
                  <div className="font-pixel mt-1" style={{ fontSize: '6px', color: unlocked ? rarityColor : '#333' }}>
                    {ach.name}
                  </div>
                  <div className="font-mono mt-0.5" style={{ fontSize: '8px', color: '#444' }}>
                    {ach.desc}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Level progression overview */}
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
                {profile.level >= t.minLevel && (
                  <div className="font-pixel ml-auto" style={{ fontSize: '6px', color: '#444' }}>UNLOCKED</div>
                )}
              </div>
            ))}
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
