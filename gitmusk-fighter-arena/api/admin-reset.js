// Admin endpoint: force-reset leaderboard season stats immediately.
// Protected by ADMIN_SECRET env var. If not set, any request is accepted.
//
// Usage (browser): https://exarena.vercel.app/api/admin-reset?secret=YOUR_SECRET
// Usage (curl):    curl -X POST https://exarena.vercel.app/api/admin-reset -d '{"secret":"YOUR_SECRET"}'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

export default async function handler(req, res) {
  Object.entries(CORS).forEach(([k, v]) => res.setHeader(k, v));
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const adminSecret = process.env.ADMIN_SECRET;
  if (adminSecret) {
    const querySecret = req.query?.secret;
    const bodySecret = typeof req.body === 'string'
      ? JSON.parse(req.body || '{}').secret
      : (req.body?.secret ?? null);
    if (querySecret !== adminSecret && bodySecret !== adminSecret) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return res.status(500).json({ error: 'Supabase not configured' });

  const h = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
    Prefer: 'return=minimal',
  };

  try {
    // 1. Read current season number
    const cfgRes = await fetch(`${url}/rest/v1/season_config?id=eq.1&limit=1`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    const cfgData = await cfgRes.json();
    const cfg = Array.isArray(cfgData) ? cfgData[0] : null;
    const currentSeason = cfg?.season_number ?? 1;

    // 2. Zero out all season stats for every player
    await fetch(`${url}/rest/v1/player_stats?username=not.is.null`, {
      method: 'PATCH',
      headers: h,
      body: JSON.stringify({
        season_wins: 0,
        season_losses: 0,
        season_pvp_wins: 0,
        win_streak: 0,
        current_season: currentSeason + 1,
      }),
    });

    // 3. Advance season config — new 30-day window starting now
    const now = new Date().toISOString();
    const nextEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    if (cfg) {
      await fetch(`${url}/rest/v1/season_config?id=eq.1`, {
        method: 'PATCH',
        headers: h,
        body: JSON.stringify({
          season_number: currentSeason + 1,
          started_at: now,
          ends_at: nextEnd,
        }),
      });
    }

    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json({
      ok: true,
      message: `✅ Season ${currentSeason} cleared. Season ${currentSeason + 1} started!`,
      newSeason: currentSeason + 1,
      endsAt: nextEnd,
    });
  } catch (err) {
    console.error('admin-reset error:', err);
    return res.status(500).json({ error: 'Internal error', detail: String(err) });
  }
}
