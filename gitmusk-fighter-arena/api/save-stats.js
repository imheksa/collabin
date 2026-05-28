const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

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
  const { username, displayName, avatarUrl, level, xp, wins, losses, pvpWins, maxCombo, winStreak, maxWinStreak, archetype, archetypeLabel, color, basePower } = body ?? {};

  if (!username) return res.status(400).json({ error: 'username required' });

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
        display_name: displayName ?? username,
        avatar_url: avatarUrl ?? '',
        level: level ?? 1,
        xp: xp ?? 0,
        wins: wins ?? 0,
        losses: losses ?? 0,
        pvp_wins: pvpWins ?? 0,
        max_combo: maxCombo ?? 0,
        win_streak: winStreak ?? 0,
        max_win_streak: maxWinStreak ?? 0,
        archetype: archetype ?? '',
        archetype_label: archetypeLabel ?? '',
        fighter_color: color ?? '#b026ff',
        base_power: basePower ?? 0,
        updated_at: new Date().toISOString(),
      }),
    });

    if (!upstream.ok) {
      const err = await upstream.text();
      console.error('Supabase upsert error:', err);
      return res.status(500).json({ error: 'Failed to save stats' });
    }

    return res.status(200).json({ ok: true, synced: true });
  } catch (err) {
    console.error('save-stats error:', err);
    return res.status(500).json({ error: 'Internal error' });
  }
}
