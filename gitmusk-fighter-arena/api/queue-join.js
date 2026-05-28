const CORS = {
  'Access-Control-Allow-Origin': '*',
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

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const { username, fighterData } = body ?? {};
  if (!username || !fighterData) return res.status(400).json({ error: 'username and fighterData required' });

  const headers = {
    'Content-Type': 'application/json',
    apikey: key,
    Authorization: `Bearer ${key}`,
  };

  // Find a waiting player (not same user, created within 90s)
  const sinceTs = new Date(Date.now() - 90000).toISOString();
  const findRes = await fetch(
    `${url}/rest/v1/match_queue?status=eq.waiting&username=neq.${encodeURIComponent(username)}&created_at=gte.${sinceTs}&order=created_at.asc&limit=1`,
    { headers }
  );
  const waiting = await findRes.json();

  if (Array.isArray(waiting) && waiting.length > 0) {
    const waiter = waiting[0];

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

    // Update waiter's queue row
    await fetch(`${url}/rest/v1/match_queue?id=eq.${waiter.id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ status: 'matched', match_id: match.id }),
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
