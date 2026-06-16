// Proxy X (Twitter) avatar images to bypass canvas CORS restrictions.
// Usage: /api/avatar-proxy?url=<encoded-avatar-url>

const ALLOWED_HOSTS = ['pbs.twimg.com', 'abs.twimg.com', 'si0.twimg.com'];

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
  let parsedHost;
  try {
    parsedHost = new URL(avatarUrl).hostname;
  } catch {
    return res.status(400).json({ error: 'Invalid url' });
  }
  if (!ALLOWED_HOSTS.includes(parsedHost)) {
    return res.status(403).json({ error: 'Domain not allowed' });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);

  try {
    const upstream = await fetch(avatarUrl, {
      headers: { 'User-Agent': 'ExArena/1.0' },
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!upstream.ok) return res.status(502).json({ error: 'Upstream error' });

    const contentType = upstream.headers.get('content-type') || 'image/jpeg';
    const arrayBuf = await upstream.arrayBuffer();

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.status(200).send(Buffer.from(arrayBuf));
  } catch (err) {
    clearTimeout(timer);
    res.status(502).json({ error: 'Failed to fetch avatar' });
  }
}
