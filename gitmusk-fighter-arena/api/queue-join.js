const CORS = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || 'https://exarena.vercel.app',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export default async function handler(req, res) {
  Object.entries(CORS).forEach(([k, v]) => res.setHeader(k, v));
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return res.status(500).json({ error: 'Supabase not configured' });

  let body;
  try { body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body; } catch (e) { return res.status(400).json({ error: 'Invalid JSON' }); }
  const { username, fighterData, mmr: myMmr, ranked = false } = body ?? {};
  if (!username || !fighterData) return res.status(400).json({ error: 'username and fighterData required' });
  if (typeof username !== 'string' || !/^[a-zA-Z0-9_]{1,50}$/.test(username)) return res.status(400).json({ error: 'Invalid username' });
  if (JSON.stringify(fighterData).length > 5000) return res.status(400).json({ error: 'fighterData too large' });

  const headers = {
    'Content-Type': 'application/json',
    apikey: key,
    Authorization: `Bearer ${key}`,
  };

  // Find a waiting player (not same user, created within 90s)
  const sinceTs = new Date(Date.now() - 90000).toISOString();
  const candidateLimit = ranked ? 10 : 1;
  const findRes = await fetch(
    `${url}/rest/v1/match_queue?status=eq.waiting&username=neq.${encodeURIComponent(username)}&created_at=gte.${sinceTs}&order=created_at.asc&limit=${candidateLimit}`,
    { headers }
  );
  const candidates = await findRes.json();

  // For ranked queue: prefer opponent within ±150 MMR, fallback to closest
  let waiting = [];
  if (Array.isArray(candidates) && candidates.length > 0) {
    if (ranked && myMmr !== undefined) {
      const MMR_RANGE = 150;
      const inRange = candidates.filter(w => {
        const oppMmr = w.fighter_data?.profile?.mmr ?? 500;
        return Math.abs(oppMmr - myMmr) <= MMR_RANGE;
      });
      waiting = inRange.length > 0 ? [inRange[0]] : [candidates[0]];
    } else {
      waiting = [candidates[0]];
    }
  }

  if (waiting.length > 0) {
    const waiter = waiting[0];

    // Atomically claim the waiter — only succeeds if still 'waiting'
    // Prevents race condition where two players both try to match the same waiter
    const claimRes = await fetch(
      `${url}/rest/v1/match_queue?id=eq.${waiter.id}&status=eq.waiting`,
      {
        method: 'PATCH',
        headers: { ...headers, Prefer: 'return=representation' },
        body: JSON.stringify({ status: 'matched' }),
      }
    );
    const claimed = await claimRes.json();

    if (!Array.isArray(claimed) || claimed.length === 0) {
      // Another player claimed this waiter first — insert self into queue
      const insertRes = await fetch(`${url}/rest/v1/match_queue`, {
        method: 'POST',
        headers: { ...headers, Prefer: 'return=representation' },
        body: JSON.stringify({ username, fighter_data: fighterData }),
      });
      const [row] = await insertRes.json();
      return res.status(200).json({ matched: false, queueId: row.id });
    }

    // Create match
    const matchRes = await fetch(`${url}/rest/v1/matches`, {
      method: 'POST',
      headers: { ...headers, Prefer: 'return=representation' },
      body: JSON.stringify({
        player1_username: waiter.username,
        player2_username: username,
        player1_data: waiter.fighter_data,
        player2_data: fighterData,
        status: 'active',
        updated_at: new Date().toISOString(),
      }),
    });
    const [match] = await matchRes.json();

    // Update waiter's queue row with match_id
    await fetch(`${url}/rest/v1/match_queue?id=eq.${waiter.id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ match_id: match.id }),
    });

    return res.status(200).json({
      matched: true,
      matchId: match.id,
      isHost: false,
      opponentData: waiter.fighter_data,
      opponentUsername: waiter.username,
    });
  }

  // No match found — insert into queue
  const insertRes = await fetch(`${url}/rest/v1/match_queue`, {
    method: 'POST',
    headers: { ...headers, Prefer: 'return=representation' },
    body: JSON.stringify({ username, fighter_data: fighterData }),
  });
  const [row] = await insertRes.json();

  return res.status(200).json({ matched: false, queueId: row.id });
}
