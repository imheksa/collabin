import { useMemo, useState, useEffect, useCallback } from 'react';
import { useGameStore } from '../stores/gameStore';
import { DEMO_PROFILES } from '../data/mockProfiles';
import { calculateFighterStats } from '../utils/statsCalculator';
import { getAllLocalStats } from '../utils/leaderboard';
import { fetchLeaderboard, fetchSeasonInfo, LeaderboardResult, SeasonInfo, SeasonHistoryEntry } from '../utils/cloudSync';

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
  mmr: number;
}

type ViewMode = 'season' | 'global' | 'pvp';

// Global Power = MMR + (Season Wins × 10) + (P2P Wins × 15)
const calcGlobal = (e: EntryRow) => e.mmr + e.seasonWins * 10 + e.pvpWins * 15;

const AUTO_REFRESH_MS = 60 * 60 * 1000;

function LastSeasonStrip({ top3, season, full = false }: { top3: SeasonHistoryEntry[]; season: number; full?: boolean }) {
  const COLORS = ['#ffd60a', '#c0c0c0', '#cd7f32'];
  const LABELS = ['👑', '🥈', '🥉'];

  if (top3.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <div style={{ fontFamily: 'var(--pixel)', fontSize: '28px', color: 'var(--txt-dim)' }}>🏆</div>
        <div style={{ fontFamily: 'var(--pixel)', fontSize: '9px', color: 'var(--txt-dim)', letterSpacing: '.12em' }}>
          NO RECORDS FOR SEASON {season}
        </div>
      </div>
    );
  }

  // Full view: use the same podium layout (silver-left · gold-center · bronze-right)
  if (full) {
    const order = [
      { e: top3[1], realIdx: 1 },
      { e: top3[0], realIdx: 0 },
      { e: top3[2], realIdx: 2 },
    ];
    return (
      <div>
        <div style={{ fontFamily: 'var(--pixel)', fontSize: '8px', color: 'var(--txt-dim)', textAlign: 'center', marginBottom: '16px', letterSpacing: '.1em' }}>
          ◆ SEASON {season} CHAMPIONS ◆
        </div>
        <div className="grid grid-cols-3 gap-3">
          {order.map(({ e, realIdx }) => {
            if (!e) return <div key={realIdx} />;
            return (
              <div key={e.username} className="g-panel text-center" style={{
                borderColor: COLORS[realIdx],
                boxShadow: `inset 0 0 0 4px var(--void), 0 0 0 4px var(--void), 0 0 24px ${COLORS[realIdx]}60`,
                padding: '16px 12px',
                transform: realIdx === 0 ? 'translateY(-8px)' : 'none',
                opacity: 0.9,
              }}>
                <div className="corners">
                  <i style={{ background: COLORS[realIdx] }}></i>
                  <i style={{ background: COLORS[realIdx] }}></i>
                  <i style={{ background: COLORS[realIdx] }}></i>
                  <i style={{ background: COLORS[realIdx] }}></i>
                </div>
                <div style={{ fontFamily: 'var(--pixel)', fontSize: realIdx === 0 ? '22px' : '16px', color: COLORS[realIdx], marginBottom: '8px' }}>
                  {LABELS[realIdx]}
                </div>
                <div className="w-10 h-10 mx-auto overflow-hidden mb-2" style={{ border: `3px solid ${COLORS[realIdx]}` }}>
                  <img src={e.avatarUrl} className="w-full h-full object-cover"
                    onError={ev => { (ev.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/pixel-art/svg?seed=${e.username}`; }} />
                </div>
                <div style={{ fontFamily: 'var(--pixel)', fontSize: '8px', color: '#fff', marginBottom: '4px' }}>
                  @{e.username.slice(0, 8)}
                </div>
                <div style={{ fontFamily: 'var(--pixel)', fontSize: '10px', color: 'var(--neon-grn)', marginTop: '4px' }}>
                  {e.wins}W
                  <span style={{ fontSize: '6px', color: 'var(--txt-dim)', marginLeft: '3px' }}>S{season}</span>
                </div>
                {e.badge && <div className="mt-1"><BadgeChip badge={e.badge} /></div>}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return null;
}

export function Leaderboard() {
  const { setScreen, player1, setAutoMatchmake } = useGameStore();
  const [cloudResult, setCloudResult] = useState<LeaderboardResult | null>(null);
  const [seasonInfo, setSeasonInfo] = useState<SeasonInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<ViewMode>('season');
  const [seasonView, setSeasonView] = useState<'current' | 'last'>('current');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const apiSort = (m: ViewMode): 'wins' | 'pvp' | 'mmr' =>
    m === 'pvp' ? 'pvp' : m === 'global' ? 'mmr' : 'wins';

  const loadData = useCallback(async (m: ViewMode = mode, refresh = false) => {
    setLoading(true);
    const [result, season] = await Promise.all([fetchLeaderboard(apiSort(m)), fetchSeasonInfo(refresh)]);
    setCloudResult(result);
    setSeasonInfo(season);
    setLastUpdated(new Date());
    setLoading(false);
  }, [mode]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    const id = setInterval(() => loadData(mode, true), AUTO_REFRESH_MS);
    return () => clearInterval(id);
  }, [loadData, mode]);

  const handleModeChange = (m: ViewMode) => {
    setMode(m);
    loadData(m);
  };

  const { entries, isLive } = useMemo<{ entries: EntryRow[]; isLive: boolean }>(() => {
    const localStats = getAllLocalStats();

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
        mmr: e.mmr ?? 500,
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
            mmr: 500,
          });
        }
      }

      const hasActivity = mode === 'pvp'
        ? rows.some(r => r.pvpWins > 0)
        : mode === 'global'
        ? rows.some(r => r.mmr !== 500 || r.seasonWins > 0 || r.pvpWins > 0)
        : rows.some(r => r.seasonWins > 0);
      if (!hasActivity) return { entries: [], isLive: true };

      const sorted = mode === 'pvp'
        ? [...rows].sort((a, b) => b.pvpWins - a.pvpWins || b.seasonWins - a.seasonWins)
        : mode === 'global'
        ? [...rows].sort((a, b) => calcGlobal(b) - calcGlobal(a))
        : [...rows].sort((a, b) => b.seasonWins - a.seasonWins || b.wins - a.wins);

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
        mmr: 500,
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
          mmr: 500,
        });
      }
    }

    return {
      entries: rows.sort((a, b) => b.wins - a.wins || b.power - a.power).slice(0, 10),
      isLive: false,
    };
  }, [cloudResult, player1, mode]);

  const allRanked = useMemo(() => {
    if (!cloudResult?.configured || cloudResult.entries.length === 0) return [];
    return cloudResult.entries.map((e, idx) => ({
      rank: idx + 1,
      username: e.username,
      displayName: e.displayName,
      avatarUrl: e.avatarUrl,
      seasonWins: e.seasonWins,
      seasonPvpWins: e.seasonPvpWins,
      pvpWins: e.pvpWins,
      wins: e.wins,
      losses: e.losses,
      archetype: e.archetypeLabel,
      color: e.color,
      power: e.basePower,
      level: e.level,
      badges: e.badges,
      mmr: e.mmr ?? 500,
    }));
  }, [cloudResult]);

  const searchResults = searchQuery.trim().length >= 2
    ? allRanked.filter(r => r.username.toLowerCase().includes(searchQuery.toLowerCase()))
    : [];

  const myUsername = player1?.profile.username;
  const myRank = entries.findIndex(e => e.username === myUsername) + 1;
  const top3 = entries.slice(0, 3);
  const rest = entries.slice(3);

  const tabs: { key: ViewMode; label: string; sub: string; color: string; bg: string }[] = [
    { key: 'season', label: '🏆 SEASON',  sub: `S${seasonInfo?.season ?? ''} · current & past`,   color: 'var(--neon-p)',   bg: 'rgba(176,38,255,.2)' },
    { key: 'global', label: '🌐 GLOBAL',  sub: 'MMR + S.Wins + P2P', color: 'var(--neon-yel)', bg: 'rgba(255,214,10,.2)' },
    { key: 'pvp',    label: '⚔ P2P MODE', sub: 'player vs player',  color: '#00ccff',         bg: 'rgba(0,204,255,.2)'  },
  ];

  const scoreLabel = (e: EntryRow) => {
    if (mode === 'global') return `${calcGlobal(e)} PWR`;
    if (mode === 'pvp') return `${e.pvpWins}W P2P`;
    return `${e.seasonWins}W S${seasonInfo?.season ?? ''}`;
  };

  const scoreColor = mode === 'global' ? 'var(--neon-yel)' : mode === 'pvp' ? '#00ccff' : 'var(--neon-grn)';

  return (
    <div className="gscreen flex flex-col items-center p-4 py-8">
      <div className="w-full max-w-2xl">

        {/* Nav */}
        <nav className="g-nav" style={{ position: 'relative', marginBottom: '28px' }}>
          <div className="logo"><div className="badge">X</div>FIGHTER ARENA</div>
          <div className="flex items-center gap-2">
            {!loading && (
              <>
                <div style={{
                  fontFamily: 'var(--pixel)', fontSize: '8px', padding: '6px 10px',
                  background: isLive ? 'rgba(0,255,65,.12)' : 'rgba(128,128,128,.12)',
                  border: `2px solid ${isLive ? 'var(--neon-grn)' : 'var(--panel-line)'}`,
                  color: isLive ? 'var(--neon-grn)' : 'var(--txt-dim)', lineHeight: 1,
                }}>
                  {isLive ? '● LIVE' : '○ DEMO'}
                </div>
                <button onClick={() => loadData(mode, true)} style={{
                  fontFamily: 'var(--pixel)', fontSize: '8px', padding: '6px 10px',
                  background: 'var(--void)', border: '2px solid var(--neon-b)',
                  color: 'var(--neon-b)', cursor: 'pointer', lineHeight: 1,
                }}>↻ REFRESH</button>
              </>
            )}
            <button onClick={() => setScreen(player1 ? 'mode_select' : 'landing')} style={{
              fontFamily: 'var(--pixel)', fontSize: '8px', padding: '6px 10px',
              background: 'var(--void)', border: '2px solid var(--neon-b)',
              color: 'var(--neon-b)', cursor: 'pointer', lineHeight: 1,
            }}>← BACK</button>
          </div>
        </nav>

        {/* Header */}
        <div className="text-center mb-6">
          <span className="g-eyebrow" style={{ color: 'var(--neon-yel)' }}>// LIVE TOURNAMENTS</span>
          <div style={{ fontFamily: 'var(--pixel)', fontSize: '24px', color: 'var(--neon-yel)', textShadow: '3px 3px 0 var(--neon-pink), 6px 6px 0 var(--void)' }}>
            GLOBAL RANKINGS
          </div>
          <div className="flex items-center justify-center gap-3 mt-2 flex-wrap">
            <div style={{ fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--txt-dim)' }}>↻ auto-refresh 1h</div>
            {seasonInfo?.configured && <>
              <div style={{ width: '1px', height: '10px', background: 'var(--panel-line)' }} />
              <div style={{ fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--txt-dim)' }}>
                ◆ S{seasonInfo.season}{seasonInfo.daysLeft > 0 ? ` · ${seasonInfo.daysLeft}d left` : ''}
              </div>
            </>}
            {lastUpdated && <>
              <div style={{ width: '1px', height: '10px', background: 'var(--panel-line)' }} />
              <div style={{ fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--txt-dim)' }}>
                updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </>}
          </div>
          {myRank > 0 && (
            <div className="mt-1" style={{ fontFamily: 'var(--pixel)', fontSize: '9px', color: 'var(--neon-grn)' }}>
              YOUR RANK: #{myRank}
            </div>
          )}

          {/* 3 Main Tabs */}
          <div className="flex gap-3 justify-center mt-5 flex-wrap">
            {tabs.map(tab => {
              const isActive = mode === tab.key;
              return (
                <button key={tab.key} onClick={() => handleModeChange(tab.key)} style={{
                  fontFamily: 'var(--pixel)', cursor: 'pointer', padding: '8px 18px',
                  background: isActive ? tab.bg : 'transparent',
                  border: `2px solid ${isActive ? tab.color : 'var(--panel-line)'}`,
                  color: isActive ? tab.color : 'var(--txt-dim)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px',
                  transition: 'all .15s',
                }}>
                  <span style={{ fontSize: '9px' }}>{tab.label}</span>
                  <span style={{ fontSize: '6px', opacity: 0.7, letterSpacing: '.08em' }}>{tab.sub}</span>
                </button>
              );
            })}
          </div>

          {/* Season sub-tabs: Current / Last */}
          {mode === 'season' && seasonInfo?.configured && (
            <div className="flex gap-2 justify-center mt-3">
              <button onClick={() => setSeasonView('current')} style={{
                fontFamily: 'var(--pixel)', fontSize: '7px', padding: '4px 16px', cursor: 'pointer',
                background: seasonView === 'current' ? 'rgba(176,38,255,.15)' : 'transparent',
                border: `2px solid ${seasonView === 'current' ? 'var(--neon-p)' : 'var(--panel-line)'}`,
                color: seasonView === 'current' ? 'var(--neon-p)' : 'var(--txt-dim)',
              }}>◆ S{seasonInfo.season} CURRENT{seasonInfo.daysLeft > 0 ? ` · ${seasonInfo.daysLeft}d` : ''}</button>
              <button onClick={() => setSeasonView('last')} style={{
                fontFamily: 'var(--pixel)', fontSize: '7px', padding: '4px 16px', cursor: 'pointer',
                background: seasonView === 'last' ? 'rgba(192,192,192,.12)' : 'transparent',
                border: `2px solid ${seasonView === 'last' ? '#c0c0c0' : 'var(--panel-line)'}`,
                color: seasonView === 'last' ? '#c0c0c0' : 'var(--txt-dim)',
              }}>🏆 S{seasonInfo.season - 1} LAST SEASON</button>
            </div>
          )}

          {/* Global formula hint */}
          {mode === 'global' && (
            <div style={{ fontFamily: 'var(--mono)', fontSize: '9px', color: 'var(--txt-dim)', marginTop: '8px' }}>
              PWR = MMR + (Season Wins × 10) + (P2P Wins × 15)
            </div>
          )}
        </div>

        {/* Crowd bar */}
        <div style={{ height: '40px', marginBottom: '28px', background: 'repeating-linear-gradient(90deg,transparent 0 6px,rgba(176,38,255,.4) 6px 8px,transparent 8px 14px,rgba(0,229,255,.4) 14px 16px)', maskImage: 'linear-gradient(180deg,transparent 0%,#000 60%)' }} />

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="flex gap-2">
              {[0, 1, 2].map(i => (
                <div key={i} className="w-3 h-3 animate-bounce" style={{ background: 'var(--neon-p)', animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          </div>
        ) : mode === 'season' && seasonView === 'last' ? (
          <LastSeasonStrip
            top3={seasonInfo?.lastSeasonTop3 ?? []}
            season={seasonInfo?.season ? seasonInfo.season - 1 : 0}
            full
          />
        ) : isLive && entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div style={{ fontFamily: 'var(--pixel)', fontSize: '32px', color: 'var(--neon-p)', textShadow: '0 0 20px var(--neon-p)' }}>⚔</div>
            <div style={{ fontFamily: 'var(--pixel)', fontSize: '10px', color: '#fff', letterSpacing: '.15em' }}>
              {mode === 'pvp' ? 'NO P2P MATCHES YET' : mode === 'global' ? 'NO GLOBAL DATA YET' : `SEASON ${seasonInfo?.season} HAS BEGUN`}
            </div>
            <div style={{ fontFamily: 'var(--body)', fontSize: '13px', color: 'var(--txt-dim)', textAlign: 'center' }}>
              {mode === 'pvp' ? 'Challenge another player to claim the first P2P rank!' : 'No fighters on the board yet.\nBe the first to claim the throne!'}
            </div>
          </div>
        ) : (
          <>
            {/* Top 3 Podium */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              {[
                { entry: top3[1], realIdx: 1 },
                { entry: top3[0], realIdx: 0 },
                { entry: top3[2], realIdx: 2 },
              ].map(({ entry: e, realIdx }) => {
                if (!e) return <div key={realIdx} />;
                const isMe = e.username === myUsername;
                const winRate = e.wins + e.losses > 0 ? Math.round((e.wins / (e.wins + e.losses)) * 100) : 0;
                return (
                  <div key={e.username} className="g-panel text-center" style={{
                    borderColor: RANK_COLORS[realIdx],
                    boxShadow: `inset 0 0 0 4px var(--void), 0 0 0 4px var(--void), 0 0 24px ${RANK_COLORS[realIdx]}60`,
                    padding: '16px 12px',
                    transform: realIdx === 0 ? 'translateY(-8px)' : 'none',
                  }}>
                    <div className="corners">
                      <i style={{ background: RANK_COLORS[realIdx] }}></i>
                      <i style={{ background: RANK_COLORS[realIdx] }}></i>
                      <i style={{ background: RANK_COLORS[realIdx] }}></i>
                      <i style={{ background: RANK_COLORS[realIdx] }}></i>
                    </div>
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
                    <div style={{ fontFamily: 'var(--pixel)', fontSize: '10px', color: scoreColor }}>
                      {scoreLabel(e)}
                    </div>
                    {mode === 'global' && isLive && (
                      <div style={{ fontFamily: 'var(--mono)', fontSize: '7px', color: 'var(--txt-dim)', marginTop: '2px' }}>
                        {e.mmr}MMR · {e.seasonWins}S · {e.pvpWins}P2P
                      </div>
                    )}
                    <div style={{ fontFamily: 'var(--mono)', fontSize: '9px', color: winRate >= 60 ? 'var(--neon-grn)' : winRate >= 40 ? 'var(--neon-yel)' : 'var(--neon-pink)' }}>
                      {winRate}%
                    </div>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--txt-dim)' }}>
                      {e.maxCombo}x COMBO
                    </div>
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
            {rest.length > 0 && (
              <div className="g-panel dark mb-4" style={{ padding: '0' }}>
                {rest.map((e, i) => {
                  const rank = i + 3;
                  const isMe = e.username === myUsername;
                  const winRate = e.wins + e.losses > 0 ? Math.round((e.wins / (e.wins + e.losses)) * 100) : 0;
                  return (
                    <div key={e.username} className="flex items-center gap-3 px-4 py-3" style={{
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
                        {mode === 'global' && isLive && (
                          <div style={{ fontFamily: 'var(--mono)', fontSize: '7px', color: 'var(--txt-dim)' }}>
                            {e.mmr}MMR · {e.seasonWins}S · {e.pvpWins}P2P
                          </div>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0 flex items-center gap-3">
                        <div style={{ fontFamily: 'var(--pixel)', fontSize: '9px', color: scoreColor }}>
                          {scoreLabel(e)}
                        </div>
                        <div style={{ fontFamily: 'var(--pixel)', fontSize: '9px', color: 'var(--neon-pink)' }}>{e.losses}L</div>
                        <div style={{ fontFamily: 'var(--pixel)', fontSize: '9px', color: winRate >= 60 ? 'var(--neon-grn)' : winRate >= 40 ? 'var(--neon-yel)' : 'var(--neon-pink)' }}>
                          {winRate}%
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

          </>
        )}

        {/* Player search */}
        {isLive && (
          <div className="mb-4 mt-4">
            <div style={{ fontFamily: 'var(--pixel)', fontSize: '7px', color: 'var(--txt-dim)', marginBottom: '8px', letterSpacing: '.1em' }}>
              🔍 FIND PLAYER
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by username..."
              style={{
                width: '100%', fontFamily: 'var(--mono)', fontSize: '12px',
                padding: '8px 12px', background: 'rgba(255,255,255,.04)',
                border: '2px solid var(--panel-line)', color: '#fff',
                outline: 'none', boxSizing: 'border-box',
              }}
            />
            {searchQuery.trim().length >= 2 && (
              <div className="mt-2">
                {searchResults.length === 0 ? (
                  <div style={{ fontFamily: 'var(--pixel)', fontSize: '7px', color: 'var(--txt-dim)', padding: '12px', textAlign: 'center' }}>
                    NO PLAYER FOUND
                  </div>
                ) : (
                  <div className="g-panel dark" style={{ padding: '0' }}>
                    {searchResults.map(r => {
                      const isMe = r.username === myUsername;
                      const winRate = r.wins + r.losses > 0 ? Math.round((r.wins / (r.wins + r.losses)) * 100) : 0;
                      const rRow: EntryRow = { ...r, power: r.power, color: r.color, archetype: r.archetype, level: r.level, badges: r.badges, maxCombo: 0, mmr: r.mmr };
                      return (
                        <div key={r.username} className="flex items-center gap-3 px-4 py-3" style={{
                          background: isMe ? 'rgba(255,214,10,.06)' : 'transparent',
                          borderLeft: isMe ? '4px solid var(--neon-yel)' : '4px solid transparent',
                          borderBottom: '2px solid var(--panel-line)',
                        }}>
                          <div style={{ fontFamily: 'var(--pixel)', fontSize: '8px', color: r.rank <= 10 ? RANK_COLORS[r.rank - 1] : 'var(--txt-dim)', width: '40px', textAlign: 'center', flexShrink: 0 }}>
                            #{r.rank}
                          </div>
                          <div className="w-8 h-8 overflow-hidden flex-shrink-0" style={{ border: `2px solid ${r.color}` }}>
                            <img src={r.avatarUrl} className="w-full h-full object-cover"
                              onError={ev => { (ev.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/pixel-art/svg?seed=${r.username}`; }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span style={{ fontFamily: 'var(--pixel)', fontSize: '8px', color: isMe ? 'var(--neon-yel)' : '#fff' }}>
                                @{r.username}{isMe ? ' ★' : ''}
                              </span>
                              {r.badges.slice(0, 2).map(b => <BadgeChip key={b} badge={b} />)}
                            </div>
                            <div style={{ fontFamily: 'var(--pixel)', fontSize: '6px', color: r.color }}>
                              {r.archetype.toUpperCase().slice(0, 12)} · PWR {r.power} · LV{r.level}
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0 flex items-center gap-3">
                            <div style={{ fontFamily: 'var(--pixel)', fontSize: '9px', color: scoreColor }}>
                              {scoreLabel(rRow)}
                            </div>
                            <div style={{ fontFamily: 'var(--pixel)', fontSize: '9px', color: 'var(--neon-pink)' }}>{r.losses}L</div>
                            <div style={{ fontFamily: 'var(--pixel)', fontSize: '9px', color: winRate >= 60 ? 'var(--neon-grn)' : winRate >= 40 ? 'var(--neon-yel)' : 'var(--neon-pink)' }}>
                              {winRate}%
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Bottom nav */}
        <div className="flex gap-3">
          {player1 && (
            <button onClick={() => { setAutoMatchmake(true); setScreen('mode_select'); }} className="g-btn full" style={{ fontSize: '11px' }}>▶ PLAY NOW</button>
          )}
          <button onClick={() => setScreen(player1 ? 'mode_select' : 'landing')} className="g-btn ghost sm">← BACK</button>
        </div>
      </div>
    </div>
  );
}
