// Vercel serverless function — proxies X API /users/me to avoid browser CORS

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

function setCors(res) {
  Object.entries(CORS).forEach(([k, v]) => res.setHeader(k, v));
}

export default async function handler(req, res) {
  setCors(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    res.setHeader('Content-Type', 'application/json');
    return res.status(405).end(JSON.stringify({ error: 'Method Not Allowed' }));
  }

  const auth = req.headers['authorization'];
  if (!auth || !auth.startsWith('Bearer ')) {
    res.setHeader('Content-Type', 'application/json');
    return res.status(401).end(JSON.stringify({ error: 'Missing Bearer token' }));
  }

  try {
    const fields = 'public_metrics,created_at,description,profile_image_url,verified_type';
    const upstream = await fetch(
      `https://api.twitter.com/2/users/me?user.fields=${fields}`,
      { headers: { Authorization: auth } },
    );

    const data = await upstream.json();
    res.setHeader('Content-Type', 'application/json');
    return res.status(upstream.status).end(JSON.stringify(data));
  } catch (err) {
    res.setHeader('Content-Type', 'application/json');
    return res.status(500).end(JSON.stringify({ error: 'Profile fetch failed' }));
  }
}
