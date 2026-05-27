// Vercel serverless function — token exchange proxy for X OAuth 2.0

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function setCors(res) {
  Object.entries(CORS).forEach(([k, v]) => res.setHeader(k, v));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    if (req.body) {
      resolve(typeof req.body === 'string' ? req.body : new URLSearchParams(req.body).toString());
      return;
    }
    let data = '';
    req.on('data', chunk => { data += chunk.toString(); });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  setCors(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    res.setHeader('Content-Type', 'application/json');
    return res.status(405).end(JSON.stringify({ error: 'Method Not Allowed' }));
  }

  try {
    const body = await readBody(req);

    const headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
    const clientId = process.env.X_CLIENT_ID;
    const clientSecret = process.env.X_CLIENT_SECRET;
    if (clientId && clientSecret) {
      headers['Authorization'] =
        'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    }

    const upstream = await fetch('https://api.twitter.com/2/oauth2/token', {
      method: 'POST',
      headers,
      body,
    });

    const data = await upstream.json();
    res.setHeader('Content-Type', 'application/json');
    return res.status(upstream.status).end(JSON.stringify(data));
  } catch (err) {
    res.setHeader('Content-Type', 'application/json');
    return res.status(500).end(JSON.stringify({ error: 'Token exchange failed', detail: String(err) }));
  }
}
