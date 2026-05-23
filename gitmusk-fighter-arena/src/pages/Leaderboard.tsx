import { useMemo } from 'react';
import { useGameStore } from '../stores/gameStore';
import { DEMO_PROFILES } from '../data/mockProfiles';
import { calculateFighterStats } from '../utils/statsCalculator';
import { getAllLocalStats } from '../utils/leaderboard';

const RANK_COLORS = ['#ffd700', '#c0c0c0', '#cd7f32', '#bf00ff', '#00ffff'];
const RANK_LABELS = ['👑', '🥈', '🥉', '4TH', '5TH', '6TH', '7TH', '8TH', '9TH', '10TH'];

// Stable seeded "record" for demo profiles so leaderboard isn't empty on first load
function seedWins(username: string, power: number): { wins: number; losses: number; maxCombo: number } {
  let hash = 0;
  for (const c of username) hash = (hash * 31 + c.charCodeAt(0)) & 0xffffffff;
  const wins = 5 + (Math.abs(hash) % 20) + Math.floor(power / 8);
  const losses = 2 + (Math.abs(hash >> 4) % 10);
  const maxCombo = 3 + (Math.abs(hash >> 8) % 8);
  return { wins, losses, maxCombo };
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
      const maxCombo = Math.max(local?.maxCombo ?? 0, seeded.maxCombo);
      return { username: p.username, avatarUrl: p.avatarUrl, wins, losses, maxCombo, power: stats.basePower, color: stats.color, archetype: stats.archetypeLabel };
    });

    // If current player has local stats and isn't in demo profiles, add them
    if (player1 && !DEMO_PROFILES.find(p => p.username === player1.profile.username)) {
      const local = localStats[player1.profile.username];
      if (local && (local.wins > 0 || local.losses > 0)) {
        rows.push({
          username: player1.profile.username,
          avatarUrl: player1.profile.avatarUrl,
          wins: local.wins,
          losses: local.losses,
          maxCombo: local.maxCombo,
          power: player1.stats.basePower,
          color: player1.stats.color,
          archetype: player1.stats.archetypeLabel,
        });
      }
    }

    return rows.sort((a, b) => b.wins - a.wins || b.power - a.power).slice(0, 10);
  }, [player1]);

  const myUsername = player1?.profile.username;
  const myRank = entries.findIndex(e => e.username === myUsername) + 1;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-arena-bg p-4">
      <div className="w-full max-w-lg">

        {/* Header */}
        <div className="text-center mb-6">
          <div className="font-pixel text-2xl mb-1" style={{ color: '#ffd700', textShadow: '0 0 20px #ffd700' }}>
            🏆 LEADERBOARD
          </div>
          <div className="font-mono text-gray-500" style={{ fontSize: '10px' }}>
            TOP FIGHTERS · GLOBAL RANKINGS
          </div>
          {myRank > 0 && (
            <div className="mt-2 font-pixel" style={{ fontSize: '8px', color: '#00ff41' }}>
              YOUR RANK: #{myRank}
            </div>
          )}
        </div>

        {/* Table */}
        <div className="rounded overflow-hidden mb-4" style={{ border: '2px solid #2a0050' }}>
          {/* Table header */}
          <div className="grid grid-cols-[2rem_1fr_3rem_3rem_3rem] gap-0 px-3 py-2"
            style={{ background: '#0d001a', borderBottom: '1px solid #2a0050' }}>
            {['#', 'FIGHTER', 'W', 'L', 'COMBO'].map(h => (
              <div key={h} className="font-pixel text-center" style={{ fontSize: '7px', color: '#666' }}>{h}</div>
            ))}
          </div>

          {entries.map((e, i) => {
            const isMe = e.username === myUsername;
            const rankColor = RANK_COLORS[i] ?? '#444';
            const winRate = e.wins + e.losses > 0 ? Math.round((e.wins / (e.wins + e.losses)) * 100) : 0;
            return (
              <div key={e.username}
                className="grid grid-cols-[2rem_1fr_3rem_3rem_3rem] gap-0 px-3 py-3 items-center transition-all"
                style={{
                  background: isMe ? '#1a0040' : i % 2 === 0 ? '#0a0018' : '#080014',
                  borderLeft: isMe ? '3px solid #ffd700' : '3px solid transparent',
                  borderBottom: '1px solid #150028',
                }}>

                {/* Rank */}
                <div className="font-pixel text-center" style={{ fontSize: i < 3 ? '12px' : '8px', color: rankColor }}>
                  {RANK_LABELS[i]}
                </div>

                {/* Fighter */}
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded overflow-hidden flex-shrink-0"
                    style={{ border: `1px solid ${e.color}`, boxShadow: `0 0 4px ${e.color}` }}>
                    <img src={e.avatarUrl} className="w-full h-full object-cover"
                      onError={ev => { (ev.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/pixel-art/svg?seed=${e.username}`; }} />
                  </div>
                  <div className="min-w-0">
                    <div className="font-pixel truncate" style={{ fontSize: '8px', color: isMe ? '#ffd700' : '#fff' }}>
                      @{e.username.slice(0, 10)}{isMe ? ' ★' : ''}
                    </div>
                    <div className="font-pixel" style={{ fontSize: '6px', color: e.color }}>
                      {e.archetype.toUpperCase().slice(0, 10)} · PWR {e.power}
                    </div>
                    <div className="font-pixel" style={{ fontSize: '6px', color: winRate >= 60 ? '#00ff41' : winRate >= 40 ? '#ffaa00' : '#ff4040' }}>
                      {winRate}% WR
                    </div>
                  </div>
                </div>

                {/* W / L / Combo */}
                <div className="font-pixel text-center" style={{ fontSize: '9px', color: '#00ff41' }}>{e.wins}</div>
                <div className="font-pixel text-center" style={{ fontSize: '9px', color: '#ff4040' }}>{e.losses}</div>
                <div className="font-pixel text-center" style={{ fontSize: '9px', color: '#ffff00' }}>{e.maxCombo}x</div>
              </div>
            );
          })}
        </div>

        {/* Season info */}
        <div className="text-center p-3 rounded mb-4"
          style={{ background: '#0d001a', border: '1px solid #2a0050' }}>
          <div className="font-pixel mb-1" style={{ fontSize: '7px', color: '#bf00ff' }}>SEASON 1 · MAY 2026</div>
          <div className="font-mono" style={{ fontSize: '10px', color: '#555' }}>
            Rankings update after each match. Win more to climb!
          </div>
        </div>

        {/* Nav */}
        <div className="flex gap-3">
          <button onClick={() => setScreen(player1 ? 'mode_select' : 'landing')}
            className="flex-1 font-pixel py-3 rounded transition-all hover:scale-[1.02]"
            style={{ background: 'transparent', border: '2px solid #00ffff', color: '#00ffff', fontSize: '8px' }}>
            ← BACK
          </button>
          {player1 && (
            <button onClick={() => setScreen('mode_select')}
              className="flex-1 font-pixel py-3 rounded transition-all hover:scale-[1.02]"
              style={{ background: 'linear-gradient(135deg, #00ffff20, #0080ff20)', border: '2px solid #00ffff', color: '#00ffff', fontSize: '8px' }}>
              ▶ PLAY NOW
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
