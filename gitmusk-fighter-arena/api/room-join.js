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

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const { matchId, username, fighterData } = body ?? {};
  if (!matchId || !username || !fighterData) return res.status(400).json({ error: 'matchId, username, fighterData required' });

  const headers = {
    'Content-Type': 'application/json',
    apikey: key,
    Authorization: `Bearer ${key}`,
  };

  // Fetch the match to verify it's pending and get host data
  const fetchRes = await fetch(
    `${url}/rest/v1/matches?id=eq.${matchId}&status=eq.pending&select=player1_username,player1_data`,
    { headers }
  );
  const rows = await fetchRes.json();
  if (!Array.isArray(rows) || rows.length === 0) {
    return res.status(404).json({ error: 'Room not found or already started' });
  }
  const { player1_username, player1_data } = rows[0];

  // Update match with player2
  await fetch(`${url}/rest/v1/matches?id=eq.${matchId}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({
      player2_username: username,
      player2_data: fighterData,
      status: 'active',
      updated_at: new Date().toISOString(),
    }),
  });

  return res.status(200).json({ player1Username: player1_username, player1Data: player1_data });
}
