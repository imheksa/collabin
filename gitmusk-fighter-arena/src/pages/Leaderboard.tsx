import { useMemo } from 'react';
import { useGameStore } from '../stores/gameStore';
import { DEMO_PROFILES } from '../data/mockProfiles';
import { calculateFighterStats } from '../utils/statsCalculator';
import { getAllLocalStats } from '../utils/leaderboard';

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

export function Leaderboard() {
  const { setScreen, player1 } = useGameStore();

  const entries = useMemo(() => {
    const localStats = getAllLocalStats();
    const rows = DEMO_PROFILES.map(p => {
      const stats = calculateFighterStats(p);
      const local = localStats[p.username];
      const seeded = seedWins(p.username, stats.basePower);
      const wins = (local?.wins ?? 0) + seeded.wins;
      const losses = (local?.losses ?? 0) + seeded.losses;
      return { username: p.username, avatarUrl: p.avatarUrl, wins, losses, maxCombo: Math.max(local?.maxCombo ?? 0, seeded.maxCombo), power: stats.basePower, color: stats.color, archetype: stats.archetypeLabel };
    });
    if (player1 && !DEMO_PROFILES.find(p => p.username === player1.profile.username)) {
      const local = localStats[player1.profile.username];
      if (local && (local.wins > 0 || local.losses > 0)) {
        rows.push({ username: player1.profile.username, avatarUrl: player1.profile.avatarUrl, wins: local.wins, losses: local.losses, maxCombo: local.maxCombo, power: player1.stats.basePower, color: player1.stats.color, archetype: player1.stats.archetypeLabel });
      }
    }
    return rows.sort((a, b) => b.wins - a.wins || b.power - a.power).slice(0, 10);
  }, [player1]);

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
          {myRank > 0 && (
            <div className="mt-3" style={{ fontFamily: 'var(--pixel)', fontSize: '9px', color: 'var(--neon-grn)' }}>
              YOUR RANK: #{myRank}
            </div>
          )}
          <div className="mt-1" style={{ fontFamily: 'var(--body)', fontSize: '18px', color: 'var(--txt-dim)' }}>
            SEASON 1 · MAY 2026
          </div>
        </div>

        {/* Crowd bar */}
        <div style={{ height: '40px', marginBottom: '32px', background: 'repeating-linear-gradient(90deg,transparent 0 6px,rgba(176,38,255,.4) 6px 8px,transparent 8px 14px,rgba(0,229,255,.4) 14px 16px)', maskImage: 'linear-gradient(180deg,transparent 0%,#000 60%)' }} />

        {/* Top 3 podium */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[top3[1], top3[0], top3[2]].filter(Boolean).map((e, podiumIdx) => {
            const realIdx = podiumIdx === 0 ? 1 : podiumIdx === 1 ? 0 : 2;
            const isMe = e.username === myUsername;
            return (
              <div key={e.username}
                className="g-panel text-center"
                style={{
                  borderColor: RANK_COLORS[realIdx],
                  boxShadow: `inset 0 0 0 4px var(--void), 0 0 0 4px var(--void), 0 0 24px ${RANK_COLORS[realIdx]}60`,
                  padding: '16px 12px',
                  order: realIdx === 0 ? -1 : realIdx,
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
                  {e.archetype.toUpperCase().slice(0, 8)}
                </div>
                <div style={{ fontFamily: 'var(--pixel)', fontSize: '9px', color: 'var(--neon-grn)' }}>{e.wins}W</div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--txt-dim)' }}>{e.maxCombo}x COMBO</div>
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
                  <div style={{ fontFamily: 'var(--pixel)', fontSize: '8px', color: isMe ? 'var(--neon-yel)' : '#fff' }}>
                    @{e.username.slice(0, 12)}{isMe ? ' ★' : ''}
                  </div>
                  <div style={{ fontFamily: 'var(--pixel)', fontSize: '6px', color: e.color }}>{e.archetype.toUpperCase().slice(0, 12)} · PWR {e.power}</div>
                </div>
                <div className="text-right flex-shrink-0 flex gap-4">
                  <div style={{ fontFamily: 'var(--pixel)', fontSize: '9px', color: 'var(--neon-grn)' }}>{e.wins}W</div>
                  <div style={{ fontFamily: 'var(--pixel)', fontSize: '9px', color: 'var(--neon-pink)' }}>{e.losses}L</div>
                  <div style={{ fontFamily: 'var(--pixel)', fontSize: '9px', color: winRate >= 60 ? 'var(--neon-grn)' : winRate >= 40 ? 'var(--neon-yel)' : 'var(--neon-pink)' }}>
                    {winRate}%
                  </div>
                </div>
              </div>
            );
          })}
        </div>

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
