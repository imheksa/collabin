// Proxy for Twitter/X avatar images — adds CORS headers so canvas can drawImage()
// without tainting the canvas. Falls back to unavatar.io.

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': 'public, max-age=3600',
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: { ...CORS, 'Content-Type': 'text/plain' }, body: '' };
  }

  const { username } = event.queryStringParameters || {};
  if (!username || !/^[a-zA-Z0-9_]{1,50}$/.test(username)) {
    return { statusCode: 400, headers: CORS, body: 'invalid username' };
  }

  const sources = [
    `https://unavatar.io/twitter/${encodeURIComponent(username)}`,
    `https://unavatar.io/x/${encodeURIComponent(username)}`,
  ];

  for (const url of sources) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'GitMusk-Fighter-Arena/1.0' },
        redirect: 'follow',
      });
      if (!res.ok) continue;

      const contentType = res.headers.get('content-type') || 'image/jpeg';
      const buffer = await res.arrayBuffer();
      const body = Buffer.from(buffer).toString('base64');

      return {
        statusCode: 200,
        headers: { ...CORS, 'Content-Type': contentType },
        body,
        isBase64Encoded: true,
      };
    } catch {
      continue;
    }
  }

  return { statusCode: 404, headers: CORS, body: 'avatar not found' };
};
