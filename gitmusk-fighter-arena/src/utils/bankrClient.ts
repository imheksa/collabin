const BANKR = 'https://api.bankr.bot';

interface BankrUser {
  address?: string;
  evm_address?: string;
  wallet_address?: string;
  base_address?: string;
  twitter_username?: string;
  username?: string;
}

async function tryGet(url: string): Promise<unknown> {
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}

async function tryPost(url: string, body: unknown): Promise<unknown> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}

function extractAddress(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null;
  const d = data as Record<string, unknown>;

  // Direct address fields
  for (const key of ['address', 'evm_address', 'wallet_address', 'base_address', 'result']) {
    const val = d[key];
    if (typeof val === 'string' && /^0x[0-9a-fA-F]{40}$/.test(val)) return val;
  }

  // Nested: data.address, data[0].address, users[0].address, etc.
  for (const key of ['data', 'user', 'users', 'result']) {
    const nested = d[key];
    if (Array.isArray(nested) && nested.length > 0) {
      const found = extractAddress(nested[0]);
      if (found) return found;
    }
    if (nested && typeof nested === 'object') {
      const found = extractAddress(nested);
      if (found) return found;
    }
  }

  return null;
}

export async function resolveXHandleToAddress(username: string): Promise<string | null> {
  const handle = username.replace(/^@/, '');

  const strategies: Array<() => Promise<unknown>> = [
    // 1. /users/search — public endpoint, search by twitter username
    () => tryGet(`${BANKR}/users/search?twitter=${encodeURIComponent(handle)}`),
    () => tryGet(`${BANKR}/users/search?username=${encodeURIComponent('@' + handle)}`),
    () => tryGet(`${BANKR}/users/search?handle=${encodeURIComponent('@' + handle)}`),

    // 2. /addresses/resolve — resolve social handles (public helper endpoint)
    () => tryPost(`${BANKR}/addresses/resolve`, { handle: `@${handle}`, platform: 'twitter' }),
    () => tryPost(`${BANKR}/addresses/resolve`, { handle: `@${handle}` }),
    () => tryGet(`${BANKR}/addresses/resolve?handle=${encodeURIComponent('@' + handle)}`),

    // 3. Direct user profile lookup
    () => tryGet(`${BANKR}/users/${encodeURIComponent(handle)}`),
    () => tryGet(`${BANKR}/users/twitter/${encodeURIComponent(handle)}`),
  ];

  for (const strategy of strategies) {
    try {
      const data = await strategy();
      const addr = extractAddress(data);
      if (addr) return addr;
    } catch {
      // try next
    }
  }

  return null;
}

export async function getBankrPortfolio(apiKey: string): Promise<BankrUser & { portfolio?: unknown }> {
  const res = await fetch(`${BANKR}/wallet/portfolio`, {
    headers: { 'X-API-Key': apiKey, Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`Bankr API ${res.status}`);
  return res.json();
}
