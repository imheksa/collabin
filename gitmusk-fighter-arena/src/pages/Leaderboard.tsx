import { useMemo, useState, useEffect, useCallback } from 'react';
import { useGameStore } from '../stores/gameStore';
import { DEMO_PROFILES } from '../data/mockProfiles';
import { calculateFighterStats } from '../utils/statsCalculator';
import { getAllLocalStats } from '../utils/leaderboard';
import { fetchLeaderboard, fetchSeasonInfo, LeaderboardResult, SeasonInfo } from '../utils/cloudSync';

const BADGE_META: Record<string, { color: string; emoji: string }> = {
  champ:  { color: '#ffd60a', emoji: '👑' },
  gold:   { color: '#ffb700', emoji: '🥇' },
  silver: { color: '#c0c0c0', emoji: '🥈' },
  bronze: { color: '#cd7f32', emoji: '🥉' },
};

function BadgeChip({ badge }: { badge: string }) {
  const m = badge.match(/^s(\d+)_(champ|gold|silver|bronze)$/);
  if (!m) return null;
  const meta = BADGE_META[m[2]];
  if (!meta) return null;
  return (
    <span style={{
      fontFamily: 'var(--pixel)', fontSize: '6px', padding: '1px 4px',
      color: meta.color, border: `1px solid ${meta.color}50`,
      background: `${meta.color}15`, whiteSpace: 'nowrap',
    }}>
      {meta.emoji}S{m[1]}
    </span>
  );
}

const RANK_COLORS = ['#ffd60a', '#c0c0c0', '#cd7f32', '#b026ff', '#00e5ff', '#ff2d75', '#00ff9d', '#b026ff', '#00e5ff', '#ffd60a'];
const RANK_LABELS = ['👑', '🥈', '🥉', '4TH', '5TH', '6TH', '7TH', '8TH', '9TH', '10TH'];

function seedWins(username: string, power: number) {
  let hash = 0;
  for (const c of username) hash = (hash * 31 + c.charCodeAt(0)) & 0xffffffff;
  return {
    wins: 5 + (Math.abs(hash) % 20) + Math.floor(power / 8),
    losses: 2 + (Math.abs(hash >> 4) % 10),
    maxCombo: 3 + (Math.abs(hash >> 8) % 8),
  };
}

interface EntryRow {
  username: string;
  avatarUrl: string;
  wins: number;
  losses: number;
  pvpWins: number;
  seasonWins: number;
  seasonPvpWins: number;
  maxCombo: number;
  power: number;
  color: string;
  archetype: string;
  level: number;
  badges: string[];
}

const AUTO_REFRESH_MS = 60 * 60 * 1000; // 1 hour

export function Leaderboard() {
  const { setScreen, player1 } = useGameStore();
  const [cloudResult, setCloudResult] = useState<LeaderboardResult | null>(null);
  const [seasonInfo, setSeasonInfo] = useState<SeasonInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [sortMode, setSortMode] = useState<'wins' | 'pvp'>('wins');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadData = useCallback(async (sort: 'wins' | 'pvp' = sortMode, refresh = false) => {
    setLoading(true);
    const [result, season] = await Promise.all([fetchLeaderboard(sort), fetchSeasonInfo(refresh)]);
    setCloudResult(result);
    setSeasonInfo(season);
    setLastUpdated(new Date());
    setLoading(false);
  }, [sortMode]);

  useEffect(() => { loadData(); }, [loadData]);

  // Auto-refresh every hour
  useEffect(() => {
    const id = setInterval(() => loadData(sortMode, true), AUTO_REFRESH_MS);
    return () => clearInterval(id);
  }, [loadData, sortMode]);

  const handleSortChange = (mode: 'wins' | 'pvp') => {
    setSortMode(mode);
    loadData(mode);
  };

  const { entries, isLive } = useMemo<{ entries: EntryRow[]; isLive: boolean }>(() => {
    const localStats = getAllLocalStats();

    // If Supabase is configured but leaderboard is empty (e.g. new season just started),
    // show live empty state instead of misleading demo data.
    if (cloudResult?.configured && cloudResult.entries.length === 0) {
      return { entries: [], isLive: true };
    }

    if (cloudResult?.configured && cloudResult.entries.length > 0) {
      const cloudUsernames = new Set(cloudResult.entries.map(e => e.username));
      const rows: EntryRow[] = cloudResult.entries.map(e => ({
        username: e.username,
        avatarUrl: e.avatarUrl,
        wins: e.wins,
        losses: e.losses,
        pvpWins: e.pvpWins,
        seasonWins: e.seasonWins,
        seasonPvpWins: e.seasonPvpWins,
        maxCombo: e.maxCombo,
        power: e.basePower,
        color: e.color,
        archetype: e.archetypeLabel,
        level: e.level,
        badges: e.badges,
      }));

      if (player1 && !cloudUsernames.has(player1.profile.username)) {
        const local = localStats[player1.profile.username];
        if (local && (local.wins > 0 || local.losses > 0)) {
          rows.push({
            username: player1.profile.username,
            avatarUrl: player1.profile.avatarUrl,
            wins: local.wins,
            losses: local.losses,
            pvpWins: 0,
            seasonWins: 0,
            seasonPvpWins: 0,
            maxCombo: local.maxCombo,
            power: player1.stats.basePower,
            color: player1.stats.color,
            archetype: player1.stats.archetypeLabel,
            level: 1,
            badges: [],
          });
        }
      }

      const sorted = sortMode === 'pvp'
        ? rows.sort((a, b) => b.pvpWins - a.pvpWins || b.wins - a.wins)
        : rows.sort((a, b) => b.wins - a.wins || b.power - a.power);
      return { entries: sorted.slice(0, 10), isLive: true };
    }

    // Fallback: seeded demo + local stats
    const rows = DEMO_PROFILES.map(p => {
      const stats = calculateFighterStats(p);
      const local = localStats[p.username];
      const seeded = seedWins(p.username, stats.basePower);
      return {
        username: p.username,
        avatarUrl: p.avatarUrl,
        wins: (local?.wins ?? 0) + seeded.wins,
        losses: (local?.losses ?? 0) + seeded.losses,
        pvpWins: 0,
        seasonWins: 0,
        seasonPvpWins: 0,
        maxCombo: Math.max(local?.maxCombo ?? 0, seeded.maxCombo),
        power: stats.basePower,
        color: stats.color,
        archetype: stats.archetypeLabel,
        level: 1,
        badges: [],
      };
    });

    if (player1 && !DEMO_PROFILES.find(p => p.username === player1.profile.username)) {
      const local = localStats[player1.profile.username];
      if (local && (local.wins > 0 || local.losses > 0)) {
        rows.push({
          username: player1.profile.username,
          avatarUrl: player1.profile.avatarUrl,
          wins: local.wins,
          losses: local.losses,
          pvpWins: 0,
          seasonWins: 0,
          seasonPvpWins: 0,
          maxCombo: local.maxCombo,
          power: player1.stats.basePower,
          color: player1.stats.color,
          archetype: player1.stats.archetypeLabel,
          level: 1,
          badges: [],
        });
      }
    }

    return {
      entries: rows.sort((a, b) => b.wins - a.wins || b.power - a.power).slice(0, 10),
      isLive: false,
    };
  }, [cloudResult, player1, sortMode]);

  const myUsername = player1?.profile.username;
  const myRank = entries.findIndex(e => e.username === myUsername) + 1;

  const top3 = entries.slice(0, 3);
  const rest = entries.slice(3);

  return (
    <div className="gscreen flex flex-col items-center p-4 py-8">
      <div className="w-full max-w-2xl">

        {/* Nav */}
        <nav className="g-nav" style={{ position: 'relative', marginBottom: '28px' }}>
          <div className="logo"><div className="badge">X</div>FIGHTER ARENA</div>
          <button onClick={() => setScreen(player1 ? 'mode_select' : 'landing')} className="g-btn ghost sm">← BACK</button>
        </nav>

        {/* Header */}
        <div className="text-center mb-8">
          <span className="g-eyebrow" style={{ color: 'var(--neon-yel)' }}>// LIVE TOURNAMENTS</span>
          <div style={{ fontFamily: 'var(--pixel)', fontSize: '24px', color: 'var(--neon-yel)', textShadow: '3px 3px 0 var(--neon-pink), 6px 6px 0 var(--void)' }}>
            GLOBAL RANKINGS
          </div>
          <div className="flex items-center justify-center gap-3 mt-2">
            {loading ? (
              <div style={{ fontFamily: 'var(--pixel)', fontSize: '7px', color: 'var(--txt-dim)' }}>
                LOADING...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div style={{
                  fontFamily: 'var(--pixel)', fontSize: '7px', padding: '3px 8px',
                  background: isLive ? 'rgba(0,255,65,.12)' : 'rgba(128,128,128,.12)',
                  border: `2px solid ${isLive ? 'var(--neon-grn)' : 'var(--panel-line)'}`,
                  color: isLive ? 'var(--neon-grn)' : 'var(--txt-dim)',
                }}>
                  {isLive ? '● LIVE' : '○ DEMO'}
                </div>
                <button onClick={() => loadData(sortMode, true)} className="g-btn ghost sm" style={{ fontSize: '8px', padding: '3px 8px' }}>
                  ↻ REFRESH
                </button>
              </div>
            )}
          </div>
          {/* Info: refresh cadence + season duration */}
          <div className="flex items-center justify-center gap-3 mt-2 flex-wrap">
            <div style={{ fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--txt-dim)' }}>
              ↻ auto-refresh every 1h
            </div>
            <div style={{ width: '1px', height: '10px', background: 'var(--panel-line)' }} />
            <div style={{ fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--txt-dim)' }}>
              📅 1 season = 30 days
            </div>
            {lastUpdated && (
              <>
                <div style={{ width: '1px', height: '10px', background: 'var(--panel-line)' }} />
                <div style={{ fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--txt-dim)' }}>
                  updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </>
            )}
          </div>
          {myRank > 0 && (
            <div className="mt-2" style={{ fontFamily: 'var(--pixel)', fontSize: '9px', color: 'var(--neon-grn)' }}>
              YOUR RANK: #{myRank}
            </div>
          )}
          {/* Sort tabs */}
          <div className="flex gap-2 justify-center mt-3">
            {(['wins', 'pvp'] as const).map(mode => (
              <button key={mode} onClick={() => handleSortChange(mode)} style={{
                fontFamily: 'var(--pixel)', fontSize: '8px', padding: '4px 14px', cursor: 'pointer',
                background: sortMode === mode ? (mode === 'pvp' ? 'rgba(0,204,255,.2)' : 'rgba(176,38,255,.2)') : 'transparent',
                border: `2px solid ${sortMode === mode ? (mode === 'pvp' ? '#00ccff' : 'var(--neon-p)') : 'var(--panel-line)'}`,
                color: sortMode === mode ? (mode === 'pvp' ? '#00ccff' : 'var(--neon-p)') : 'var(--txt-dim)',
              }}>
                {mode === 'pvp' ? '⚔ P2P WINS' : '★ ALL WINS'}
              </button>
            ))}
          </div>
          {seasonInfo?.configured && (
            <div className="mt-2 flex items-center justify-center gap-3">
              <div style={{ fontFamily: 'var(--pixel)', fontSize: '8px', color: 'var(--neon-yel)', background: 'rgba(255,214,10,.1)', border: '2px solid rgba(255,214,10,.4)', padding: '3px 10px' }}>
                SEASON {seasonInfo.season}
              </div>
              {seasonInfo.daysLeft > 0 ? (
                <div style={{ fontFamily: 'var(--pixel)', fontSize: '7px', color: 'var(--txt-dim)' }}>
                  {seasonInfo.daysLeft}d LEFT
                </div>
              ) : (
                <div style={{ fontFamily: 'var(--pixel)', fontSize: '7px', color: 'var(--neon-pink)' }}>
                  RESETTING...
                </div>
              )}
            </div>
          )}
        </div>

        {/* Crowd bar */}
        <div style={{ height: '40px', marginBottom: '32px', background: 'repeating-linear-gradient(90deg,transparent 0 6px,rgba(176,38,255,.4) 6px 8px,transparent 8px 14px,rgba(0,229,255,.4) 14px 16px)', maskImage: 'linear-gradient(180deg,transparent 0%,#000 60%)' }} />

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="flex gap-2">
              {[0, 1, 2].map(i => (
                <div key={i} className="w-3 h-3 animate-bounce" style={{ background: 'var(--neon-p)', animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          </div>
        ) : isLive && entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <div style={{ fontFamily: 'var(--pixel)', fontSize: '28px', color: 'var(--neon-p)', textShadow: '0 0 20px var(--neon-p)' }}>⚔</div>
            <div style={{ fontFamily: 'var(--pixel)', fontSize: '10px', color: '#fff', letterSpacing: '.15em' }}>SEASON {seasonInfo?.season ?? 2} HAS BEGUN</div>
            <div style={{ fontFamily: 'var(--body)', fontSize: '14px', color: 'var(--txt-dim)', textAlign: 'center' }}>
              No fighters on the board yet.<br />Login with X and be the first to compete!
            </div>
            <button onClick={() => setScreen('login')} className="g-btn mt-2" style={{ fontSize: '10px' }}>⚡ FIGHT NOW</button>
          </div>
        ) : (
          <>
            {/* Top 3 podium */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              {[top3[1], top3[0], top3[2]].filter(Boolean).map((e, podiumIdx) => {
                const realIdx = podiumIdx === 0 ? 1 : podiumIdx === 1 ? 0 : 2;
                const isMe = e.username === myUsername;
                const winRate = e.wins + e.losses > 0 ? Math.round((e.wins / (e.wins + e.losses)) * 100) : 0;
                return (
                  <div key={e.username}
                    className="g-panel text-center"
                    style={{
                      borderColor: RANK_COLORS[realIdx],
                      boxShadow: `inset 0 0 0 4px var(--void), 0 0 0 4px var(--void), 0 0 24px ${RANK_COLORS[realIdx]}60`,
                      padding: '16px 12px',
                      transform: realIdx === 0 ? 'translateY(-8px)' : 'none',
                    }}>
                    <div className="corners"><i style={{ background: RANK_COLORS[realIdx] }}></i><i style={{ background: RANK_COLORS[realIdx] }}></i><i style={{ background: RANK_COLORS[realIdx] }}></i><i style={{ background: RANK_COLORS[realIdx] }}></i></div>
                    <div style={{ fontFamily: 'var(--pixel)', fontSize: realIdx === 0 ? '22px' : '16px', color: RANK_COLORS[realIdx], marginBottom: '8px' }}>
                      {RANK_LABELS[realIdx]}
                    </div>
                    <div className="w-10 h-10 mx-auto overflow-hidden mb-2" style={{ border: `3px solid ${e.color}` }}>
                      <img src={e.avatarUrl} className="w-full h-full object-cover"
                        onError={ev => { (ev.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/pixel-art/svg?seed=${e.username}`; }} />
                    </div>
                    <div style={{ fontFamily: 'var(--pixel)', fontSize: '8px', color: isMe ? 'var(--neon-yel)' : '#fff', marginBottom: '4px' }}>
                      @{e.username.slice(0, 8)}{isMe ? ' ★' : ''}
                    </div>
                    <div style={{ fontFamily: 'var(--pixel)', fontSize: '7px', color: e.color, marginBottom: '6px' }}>
                      {e.archetype.toUpperCase().slice(0, 10)}
                    </div>
                    {isLive && (
                      <div style={{ fontFamily: 'var(--pixel)', fontSize: '6px', color: 'var(--txt-dim)', marginBottom: '4px' }}>
                        LV{e.level}
                      </div>
                    )}
                    {isLive ? (
                      <div style={{ fontFamily: 'var(--pixel)', fontSize: '10px', color: 'var(--neon-grn)' }}>
                        {sortMode === 'pvp' ? e.seasonPvpWins : e.seasonWins}W
                        <span style={{ fontSize: '6px', color: 'var(--txt-dim)', marginLeft: '3px' }}>S{seasonInfo?.season ?? 1}</span>
                      </div>
                    ) : (
                      <div style={{ fontFamily: 'var(--pixel)', fontSize: '9px', color: 'var(--neon-grn)' }}>{e.wins}W</div>
                    )}
                    <div style={{ fontFamily: 'var(--mono)', fontSize: '9px', color: winRate >= 60 ? 'var(--neon-grn)' : winRate >= 40 ? 'var(--neon-yel)' : 'var(--neon-pink)' }}>{winRate}%</div>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--txt-dim)' }}>{e.maxCombo}x COMBO</div>
                    {e.badges.length > 0 && (
                      <div className="flex flex-wrap gap-1 justify-center mt-1">
                        {e.badges.slice(0, 3).map(b => <BadgeChip key={b} badge={b} />)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Ranks 4-10 */}
            <div className="g-panel dark mb-4" style={{ padding: '0' }}>
              {rest.map((e, i) => {
                const rank = i + 3;
                const isMe = e.username === myUsername;
                const winRate = e.wins + e.losses > 0 ? Math.round((e.wins / (e.wins + e.losses)) * 100) : 0;
                return (
                  <div key={e.username}
                    className="flex items-center gap-3 px-4 py-3"
                    style={{
                      background: isMe ? 'rgba(255,214,10,.06)' : 'transparent',
                      borderLeft: isMe ? '4px solid var(--neon-yel)' : '4px solid transparent',
                      borderBottom: '2px solid var(--panel-line)',
                    }}>
                    <div style={{ fontFamily: 'var(--pixel)', fontSize: '8px', color: RANK_COLORS[rank], width: '36px', textAlign: 'center', flexShrink: 0 }}>
                      {RANK_LABELS[rank]}
                    </div>
                    <div className="w-8 h-8 overflow-hidden flex-shrink-0" style={{ border: `2px solid ${e.color}`, boxShadow: `0 0 6px ${e.color}60` }}>
                      <img src={e.avatarUrl} className="w-full h-full object-cover"
                        onError={ev => { (ev.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/pixel-art/svg?seed=${e.username}`; }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span style={{ fontFamily: 'var(--pixel)', fontSize: '8px', color: isMe ? 'var(--neon-yel)' : '#fff' }}>
                          @{e.username.slice(0, 10)}{isMe ? ' ★' : ''}
                        </span>
                        {e.badges.slice(0, 2).map(b => <BadgeChip key={b} badge={b} />)}
                      </div>
                      <div style={{ fontFamily: 'var(--pixel)', fontSize: '6px', color: e.color }}>
                        {e.archetype.toUpperCase().slice(0, 12)} · PWR {e.power}{isLive ? ` · LV${e.level}` : ''}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 flex items-center gap-3">
                      {isLive ? (
                        <div style={{ fontFamily: 'var(--pixel)', fontSize: '9px', color: 'var(--neon-grn)' }}>
                          {sortMode === 'pvp' ? e.seasonPvpWins : e.seasonWins}W
                        </div>
                      ) : (
                        <div style={{ fontFamily: 'var(--pixel)', fontSize: '9px', color: 'var(--neon-grn)' }}>{e.wins}W</div>
                      )}
                      <div style={{ fontFamily: 'var(--pixel)', fontSize: '9px', color: 'var(--neon-pink)' }}>{e.losses}L</div>
                      <div style={{ fontFamily: 'var(--pixel)', fontSize: '9px', color: winRate >= 60 ? 'var(--neon-grn)' : winRate >= 40 ? 'var(--neon-yel)' : 'var(--neon-pink)' }}>
                        {winRate}%
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Bottom nav */}
        <div className="flex gap-3">
          {player1 && (
            <button onClick={() => setScreen('mode_select')} className="g-btn full" style={{ fontSize: '11px' }}>▶ PLAY NOW</button>
          )}
          <button onClick={() => setScreen(player1 ? 'mode_select' : 'landing')} className="g-btn ghost sm">← BACK</button>
        </div>
      </div>
    </div>
  );
}
