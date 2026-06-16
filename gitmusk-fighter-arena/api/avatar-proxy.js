// Proxy X (Twitter) avatar images to bypass canvas CORS restrictions.
// Usage: /api/avatar-proxy?url=<encoded-avatar-url>
export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    return res.status(200).end();
  }

  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'Missing url param' });

  let avatarUrl;
  try {
    avatarUrl = decodeURIComponent(url);
  } catch {
    return res.status(400).json({ error: 'Invalid url param' });
  }

  // Only allow known X/Twitter CDN domains
  const allowed = ['pbs.twimg.com', 'abs.twimg.com', 'si0.twimg.com'];
  let parsedHost;
  try {
    parsedHost = new URL(avatarUrl).hostname;
  } catch {
    return res.status(400).json({ error: 'Invalid url' });
  }
  if (!allowed.includes(parsedHost)) {
    return res.status(403).json({ error: 'Domain not allowed' });
  }

  try {
    const upstream = await fetch(avatarUrl, {
      headers: { 'User-Agent': 'ExArena/1.0' },
      signal: AbortSignal.timeout(5000),
    });
    if (!upstream.ok) return res.status(502).json({ error: 'Upstream error' });

    const contentType = upstream.headers.get('content-type') || 'image/jpeg';
    const buffer = await upstream.arrayBuffer();

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.status(200).send(Buffer.from(buffer));
  } catch {
    res.status(502).json({ error: 'Failed to fetch avatar' });
  }
}
