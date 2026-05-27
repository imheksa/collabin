const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

export default async function handler(req, res) {
  Object.entries(CORS).forEach(([k, v]) => res.setHeader(k, v));

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' });

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

  const username = req.query?.username;
  if (!username) return res.status(400).json({ error: 'username required' });

  if (!supabaseUrl || !supabaseKey) {
    return res.status(200).json({ profile: null, configured: false });
  }

  try {
    const upstream = await fetch(
      `${supabaseUrl}/rest/v1/player_stats?username=eq.${encodeURIComponent(username)}&limit=1`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
      }
    );

    if (!upstream.ok) {
      const err = await upstream.text();
      console.error('Supabase get-profile error:', err);
      return res.status(500).json({ error: 'Failed to fetch profile' });
    }

    const data = await upstream.json();
    const row = Array.isArray(data) ? data[0] : null;
    if (!row) return res.status(200).json({ profile: null, configured: true });

    return res.status(200).json({
      configured: true,
      profile: {
        username: row.username,
        xp: row.xp ?? 0,
        level: row.level ?? 1,
        wins: row.wins ?? 0,
        losses: row.losses ?? 0,
        maxCombo: row.max_combo ?? 0,
        winStreak: row.win_streak ?? 0,
        maxWinStreak: row.max_win_streak ?? 0,
        lossStreak: 0,
        achievements: [],
        matchHistory: [],
      },
    });
  } catch (err) {
    console.error('get-profile error:', err);
    return res.status(500).json({ error: 'Internal error' });
  }
}
