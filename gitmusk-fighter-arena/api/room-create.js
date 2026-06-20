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
  const { username, fighterData } = body ?? {};
  if (!username || !fighterData) return res.status(400).json({ error: 'username and fighterData required' });
  if (typeof username !== 'string' || !/^[a-zA-Z0-9_]{1,50}$/.test(username)) return res.status(400).json({ error: 'Invalid username' });
  if (JSON.stringify(fighterData).length > 5000) return res.status(400).json({ error: 'fighterData too large' });

  const insertRes = await fetch(`${process.env.SUPABASE_URL}/rest/v1/matches`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: key,
      Authorization: `Bearer ${key}`,
      Prefer: 'return=representation',
    },
    body: JSON.stringify({
      player1_username: username,
      player1_data: fighterData,
      status: 'pending',
      updated_at: new Date().toISOString(),
    }),
  });

  const [match] = await insertRes.json();
  return res.status(200).json({ matchId: match.id });
}
