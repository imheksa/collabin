const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'https://exarena.vercel.app';
const CORS = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const DEMO_USERNAMES = new Set(['elonmusk', 'VitalikButerin', 'cz_binance', 'cobie', 'KarpathyAI', 'nikitabier']);

// Clamp integer to [0, max] — prevents fraudulent large values
const safeInt = (v, max) => Math.min(Math.max(parseInt(v) || 0, 0), max);

// Only allow https avatar URLs to prevent SSRF / canvas taint
function sanitizeUrl(url) {
  if (!url || typeof url !== 'string') return '';
  try {
    const u = new URL(url);
    return u.protocol === 'https:' ? url.slice(0, 512) : '';
  } catch { return ''; }
}

// Sanitize plain string fields
const safeStr = (v, max = 100) =>
  typeof v === 'string' ? v.replace(/[<>"']/g, '').slice(0, max) : '';

export default async function handler(req, res) {
  Object.entries(CORS).forEach(([k, v]) => res.setHeader(k, v));

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(200).json({ ok: true, synced: false });
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const { username, displayName, avatarUrl, level, xp, wins, losses, pvpWins,
    maxCombo, winStreak, maxWinStreak, archetype, archetypeLabel, color,
    basePower, seasonWins, seasonLosses, seasonPvpWins, currentSeason } = body ?? {};

  if (!username || typeof username !== 'string' || !/^[a-zA-Z0-9_]{1,50}$/.test(username)) {
    return res.status(400).json({ error: 'Invalid username' });
  }
  if (DEMO_USERNAMES.has(username)) {
    return res.status(200).json({ ok: true, synced: false });
  }

  // Fetch current stats to enforce incremental constraints
  // (new wins can't jump by more than 1 compared to server record)
  let prevWins = 0, prevSeasonWins = 0, prevPvpWins = 0;
  try {
    const prevRes = await fetch(
      `${supabaseUrl}/rest/v1/player_stats?username=eq.${encodeURIComponent(username)}&select=wins,season_wins,pvp_wins&limit=1`,
      { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }
    );
    const prev = await prevRes.json();
    if (Array.isArray(prev) && prev[0]) {
      prevWins = prev[0].wins ?? 0;
      prevSeasonWins = prev[0].season_wins ?? 0;
      prevPvpWins = prev[0].pvp_wins ?? 0;
    }
  } catch { /* use defaults */ }

  // Wins can only go up by 1 per request (not jump by hundreds)
  const clampedWins = Math.min(safeInt(wins, 99999), prevWins + 1);
  const clampedSeasonWins = Math.min(safeInt(seasonWins, 99999), prevSeasonWins + 1);
  const clampedPvpWins = Math.min(safeInt(pvpWins, 99999), prevPvpWins + 1);

  try {
    const upstream = await fetch(`${supabaseUrl}/rest/v1/player_stats`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Prefer': 'resolution=merge-duplicates',
      },
      body: JSON.stringify({
        username,
        display_name: safeStr(displayName || username, 50),
        avatar_url: sanitizeUrl(avatarUrl),
        level: safeInt(level, 100),
        xp: safeInt(xp, 9999999),
        wins: clampedWins,
        losses: safeInt(losses, 99999),
        pvp_wins: clampedPvpWins,
        max_combo: safeInt(maxCombo, 999),
        win_streak: safeInt(winStreak, 9999),
        max_win_streak: safeInt(maxWinStreak, 9999),
        archetype: safeStr(archetype, 50),
        archetype_label: safeStr(archetypeLabel, 50),
        fighter_color: /^#[0-9a-fA-F]{6}$/.test(color) ? color : '#b026ff',
        base_power: safeInt(basePower, 999),
        season_number: safeInt(currentSeason, 999),
        season_wins: clampedSeasonWins,
        season_losses: safeInt(seasonLosses, 99999),
        season_pvp_wins: clampedPvpWins,
        updated_at: new Date().toISOString(),
      }),
    });

    if (!upstream.ok) {
      console.error('Supabase upsert error:', await upstream.text());
      return res.status(500).json({ error: 'Failed to save stats' });
    }

    return res.status(200).json({ ok: true, synced: true });
  } catch (err) {
    console.error('save-stats error:', err);
    return res.status(500).json({ error: 'Internal error' });
  }
}
