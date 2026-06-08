// Called daily by Vercel cron. Resets the season when ends_at has passed.
// Protected by CRON_SECRET env var (Vercel sends it as Authorization: Bearer <secret>).
// Manual force-reset: POST /api/season-reset?force=true (still requires auth if CRON_SECRET is set).

export default async function handler(req, res) {
  // Allow Vercel cron (GET) and manual trigger (POST)
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    // Prevent accidental exposure if env var is missing
    return res.status(503).json({ error: 'CRON_SECRET not configured' });
  }
  const auth = req.headers['authorization'];
  const querySecret = req.query?.secret;
  if (auth !== `Bearer ${cronSecret}` && querySecret !== cronSecret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(200).json({ ok: false, reason: 'not configured' });
  }

  const forceReset = req.query?.force === 'true' || req.method === 'POST' && (req.body?.force === true || req.body?.force === 'true');

  const h = {
    apikey: supabaseKey,
    Authorization: `Bearer ${supabaseKey}`,
    'Content-Type': 'application/json',
  };

  try {
    // Read season config
    const cfgRes = await fetch(`${supabaseUrl}/rest/v1/season_config?id=eq.1&limit=1`, { headers: h });
    const cfgData = await cfgRes.json();
    const cfg = Array.isArray(cfgData) ? cfgData[0] : null;

    if (!cfg) return res.status(200).json({ ok: false, reason: 'no season_config row' });

    const endsAt = new Date(cfg.ends_at);
    if (!forceReset && Date.now() < endsAt.getTime()) {
      const daysLeft = Math.ceil((endsAt.getTime() - Date.now()) / 86400000);
      return res.status(200).json({ ok: false, reason: 'season not over', daysLeft, hint: 'Add ?force=true to reset immediately' });
    }

    const seasonNumber = cfg.season_number;

    const getBadge = (rank) => {
      if (rank === 1) return `s${seasonNumber}_champ`;
      if (rank <= 3) return `s${seasonNumber}_gold`;
      if (rank <= 6) return `s${seasonNumber}_silver`;
      return `s${seasonNumber}_bronze`;
    };

    // Top 10 by season wins (include badges so we can append)
    const top10Res = await fetch(
      `${supabaseUrl}/rest/v1/player_stats?select=username,display_name,avatar_url,season_wins,season_pvp_wins,badges&order=season_wins.desc,season_pvp_wins.desc&limit=10`,
      { headers: h },
    );
    const top10 = await top10Res.json();
    const qualifiers = Array.isArray(top10) ? top10.filter(p => (p.season_wins ?? 0) > 0) : [];

    if (qualifiers.length > 0) {
      // Insert snapshot into season_history
      const historyRows = qualifiers.map((p, i) => ({
        season_number: seasonNumber,
        username: p.username,
        display_name: p.display_name ?? p.username,
        avatar_url: p.avatar_url ?? '',
        rank: i + 1,
        wins: p.season_wins ?? 0,
        pvp_wins: p.season_pvp_wins ?? 0,
        badge: getBadge(i + 1),
        recorded_at: new Date().toISOString(),
      }));

      await fetch(`${supabaseUrl}/rest/v1/season_history`, {
        method: 'POST',
        headers: { ...h, Prefer: 'return=minimal' },
        body: JSON.stringify(historyRows),
      });

      // Append badge to each qualifier's badges array
      for (const [i, p] of qualifiers.entries()) {
        const newBadge = getBadge(i + 1);
        const existing = Array.isArray(p.badges) ? p.badges : [];
        if (existing.includes(newBadge)) continue;
        await fetch(
          `${supabaseUrl}/rest/v1/player_stats?username=eq.${encodeURIComponent(p.username)}`,
          {
            method: 'PATCH',
            headers: { ...h, Prefer: 'return=minimal' },
            body: JSON.stringify({ badges: [...existing, newBadge] }),
          },
        );
      }
    }

    // Zero out season stats for all players
    await fetch(`${supabaseUrl}/rest/v1/player_stats?username=not.is.null`, {
      method: 'PATCH',
      headers: { ...h, Prefer: 'return=minimal' },
      body: JSON.stringify({ season_wins: 0, season_losses: 0, season_pvp_wins: 0, win_streak: 0 }),
    });

    // Advance season config
    const now = new Date().toISOString();
    const nextEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const newSeasonNumber = seasonNumber + 1;
    const patchRes = await fetch(`${supabaseUrl}/rest/v1/season_config?id=eq.1`, {
      method: 'PATCH',
      headers: { ...h, Prefer: 'return=minimal' },
      body: JSON.stringify({ season_number: newSeasonNumber, started_at: now, ends_at: nextEnd }),
    });

    if (!patchRes.ok) {
      const errText = await patchRes.text();
      console.error('season_config PATCH failed:', patchRes.status, errText);
      return res.status(500).json({
        error: 'Failed to advance season_config',
        status: patchRes.status,
        detail: errText,
        hint: `Run SQL: UPDATE season_config SET season_number=${newSeasonNumber}, started_at=NOW(), ends_at=NOW()+INTERVAL '30 days' WHERE id=1;`,
      });
    }

    return res.status(200).json({
      ok: true,
      seasonReset: seasonNumber,
      newSeason: newSeasonNumber,
      winnersRecorded: qualifiers.length,
    });
  } catch (err) {
    console.error('season-reset error:', err);
    return res.status(500).json({ error: 'Internal error' });
  }
}
