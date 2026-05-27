// Vercel serverless function: proxies X OAuth token exchange to avoid browser CORS

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export default async function handler(req, res) {
  // Preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).set(CORS).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const headers = { 'Content-Type': 'application/x-www-form-urlencoded' };

  const clientId = process.env.X_CLIENT_ID;
  const clientSecret = process.env.X_CLIENT_SECRET;
  if (clientSecret && clientId) {
    headers['Authorization'] =
      'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  }

  try {
    // req.body may be parsed by Vercel; re-serialize as URLSearchParams
    const body =
      typeof req.body === 'string'
        ? req.body
        : new URLSearchParams(req.body).toString();

    const upstream = await fetch('https://api.twitter.com/2/oauth2/token', {
      method: 'POST',
      headers,
      body,
    });

    const data = await upstream.json();

    return res
      .status(upstream.status)
      .set({ 'Content-Type': 'application/json', ...CORS })
      .json(data);
  } catch (err) {
    return res
      .status(500)
      .set(CORS)
      .json({ error: 'Token exchange failed', detail: String(err) });
  }
}
