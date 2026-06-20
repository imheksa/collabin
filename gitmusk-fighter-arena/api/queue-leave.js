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
  if (!url || !key) return res.status(500).json({ ok: true });

  let body;
  try { body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body; } catch (e) { return res.status(400).json({ error: 'Invalid JSON' }); }
  const { queueId, username } = body ?? {};
  if (!queueId) return res.status(400).json({ error: 'queueId required' });
  if (!/^[0-9a-f-]{36}$/i.test(queueId)) return res.status(400).json({ error: 'Invalid queueId format' });

  const filter = `${url}/rest/v1/match_queue?id=eq.${encodeURIComponent(queueId)}&status=eq.waiting` +
    (username ? `&username=eq.${encodeURIComponent(username)}` : '');
  await fetch(filter, {
    method: 'DELETE',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
    },
  });

  return res.status(200).json({ ok: true });
}
