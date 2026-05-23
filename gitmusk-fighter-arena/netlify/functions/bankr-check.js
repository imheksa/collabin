// Server-side proxy for Bankr /users/search — avoids browser CORS restrictions.
// Deployed automatically on Netlify. On GitHub Pages this endpoint returns 404
// and bankrClient falls back to direct browser calls.

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: CORS, body: '' };

  const { username } = event.queryStringParameters || {};
  if (!username) return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'username required' }) };

  const endpoints = [
    `https://api.bankr.bot/users/search?twitter=${encodeURIComponent(username)}`,
    `https://api.bankr.bot/users/search?username=${encodeURIComponent('@' + username)}`,
    `https://api.bankr.bot/users/${encodeURIComponent(username)}`,
    `https://api.bankr.bot/users/twitter/${encodeURIComponent(username)}`,
    `https://api.bankr.bot/addresses/resolve?handle=${encodeURIComponent('@' + username)}`,
  ];

  for (const url of endpoints) {
    try {
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!res.ok) continue;
      const data = await res.json();
      return { statusCode: 200, headers: CORS, body: JSON.stringify(data) };
    } catch {
      continue;
    }
  }

  return { statusCode: 404, headers: CORS, body: JSON.stringify({ found: false }) };
};
