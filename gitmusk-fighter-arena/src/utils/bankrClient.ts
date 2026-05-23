const BANKR_API = 'https://api.bankr.bot';

export async function resolveXHandleToAddress(username: string): Promise<string | null> {
  const handle = username.startsWith('@') ? username : `@${username}`;

  const attempts = [
    () => fetch(`${BANKR_API}/addresses/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ handle, platform: 'twitter' }),
    }),
    () => fetch(`${BANKR_API}/addresses/resolve?handle=${encodeURIComponent(handle)}`),
    () => fetch(`${BANKR_API}/users/search?username=${encodeURIComponent(username)}`),
  ];

  for (const attempt of attempts) {
    try {
      const res = await attempt();
      if (!res.ok) continue;
      const data = await res.json();
      const addr =
        data.address ??
        data.wallet_address ??
        data.evm_address ??
        data.result?.address ??
        data.data?.address;
      if (typeof addr === 'string' && addr.startsWith('0x') && addr.length === 42) {
        return addr;
      }
    } catch {
      // CORS or network — try next
    }
  }

  return null;
}
