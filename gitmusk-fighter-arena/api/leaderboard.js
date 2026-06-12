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

  if (!supabaseUrl || !supabaseKey) {
    return res.status(200).json({ entries: [], configured: false });
  }

  const DEMO_USERNAMES = ['elonmusk', 'VitalikButerin', 'cz_binance', 'cobie', 'KarpathyAI', 'nikitabier'];

  try {
    const sort = req.query?.sort;
    const sortBy = sort === 'pvp' ? 'season_pvp_wins.desc,pvp_wins.desc'
                 : sort === 'mmr' ? 'mmr.desc,wins.desc'
                 : 'season_wins.desc,wins.desc';
    const params = new URLSearchParams({
      select: 'username,display_name,avatar_url,level,wins,losses,pvp_wins,season_wins,season_pvp_wins,max_combo,win_streak,archetype_label,fighter_color,base_power,badges,mmr',
      order: sortBy,
      limit: '25',
    });
    // Exclude demo/AI profiles — only real X-authenticated players on the leaderboard
    params.append('username', `not.in.(${DEMO_USERNAMES.join(',')})`);

    const upstream = await fetch(`${supabaseUrl}/rest/v1/player_stats?${params}`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
      },
    });

    if (!upstream.ok) {
      const err = await upstream.text();
      console.error('Supabase leaderboard error:', err);
      return res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }

    const data = await upstream.json();
    return res.status(200).json({ entries: Array.isArray(data) ? data : [], configured: true });
  } catch (err) {
    console.error('leaderboard error:', err);
    return res.status(500).json({ error: 'Internal error' });
  }
}
