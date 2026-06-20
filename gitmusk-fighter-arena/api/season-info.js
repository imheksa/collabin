const CORS = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || 'https://exarena.vercel.app',
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
    return res.status(200).json({ configured: false, season: 1, endsAt: null, daysLeft: 30 });
  }

  try {
    const upstream = await fetch(`${supabaseUrl}/rest/v1/season_config?id=eq.1&limit=1`, {
      headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
    });

    if (!upstream.ok) {
      return res.status(200).json({ configured: false, season: 1, endsAt: null, daysLeft: 30 });
    }

    const data = await upstream.json();
    const row = Array.isArray(data) ? data[0] : null;

    if (!row) {
      return res.status(200).json({ configured: true, season: 1, endsAt: null, daysLeft: 30 });
    }

    const endsAt = new Date(row.ends_at);
    const daysLeft = Math.max(0, Math.ceil((endsAt.getTime() - Date.now()) / 86400000));

    // Fetch last season's top 3 from season_history
    let lastSeasonTop3 = [];
    if (row.season_number > 1) {
      try {
        const histRes = await fetch(
          `${supabaseUrl}/rest/v1/season_history?season_number=eq.${row.season_number - 1}&order=rank.asc&limit=3&select=username,display_name,avatar_url,rank,wins,pvp_wins,badge`,
          { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } },
        );
        if (histRes.ok) {
          const histData = await histRes.json();
          lastSeasonTop3 = Array.isArray(histData) ? histData : [];
        }
      } catch { /* ignore */ }
    }

    return res.status(200).json({
      configured: true,
      season: row.season_number,
      startedAt: row.started_at,
      endsAt: row.ends_at,
      daysLeft,
      lastSeasonTop3,
    });
  } catch (err) {
    console.error('season-info error:', err);
    return res.status(200).json({ configured: false, season: 1, endsAt: null, daysLeft: 30 });
  }
}
