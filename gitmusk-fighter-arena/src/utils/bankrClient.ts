const BANKR = 'https://api.bankr.bot';

export interface BankrWalletInfo {
  success: boolean;
  wallets: Array<{ chain: string; address: string }>;
  socialAccounts: Array<{ platform: string; username: string }>;
  bankrClub?: { active: boolean };
  leaderboard?: { score: number; rank: number };
}

export interface BankrTokenBalance {
  network: string;
  token: {
    balance: number;
    balanceUSD: number;
    baseToken: { name: string; address: string; symbol: string; price: number };
  };
}

export interface BankrChainBalance {
  nativeBalance: string;
  nativeUsd: string;
  tokenBalances: BankrTokenBalance[];
  total: string;
}

export interface BankrPortfolio {
  success: boolean;
  evmAddress: string;
  solAddress?: string;
  balances: Record<string, BankrChainBalance>;
}

export interface BankrWalletData {
  evmAddress: string;
  twitterUsername: string | null;
  baseUsd: number;
  usdc: number;
  eth: number;
  ethUsd: number;
  leaderboardRank?: number;
}

// ─── Public user lookup (no API key required) ────────────────────────────────

function extractAddress(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null;
  const d = data as Record<string, unknown>;

  for (const key of ['address', 'evm_address', 'evmAddress', 'wallet_address', 'walletAddress']) {
    const v = d[key];
    if (typeof v === 'string' && /^0x[0-9a-fA-F]{40}$/.test(v)) return v;
  }
  for (const key of ['user', 'data', 'result']) {
    const n = d[key];
    if (n && typeof n === 'object') { const r = extractAddress(n); if (r) return r; }
  }
  for (const key of ['users', 'results']) {
    const arr = d[key];
    if (Array.isArray(arr) && arr.length > 0) { const r = extractAddress(arr[0]); if (r) return r; }
  }
  return null;
}

export async function lookupBankrUser(username: string): Promise<string | null> {
  const handle = username.replace(/^@/, '');

  const endpoints = [
    // Via Netlify proxy (avoids CORS on GitHub Pages)
    `/.netlify/functions/bankr-check?username=${encodeURIComponent(handle)}`,
    // Direct public endpoints
    `${BANKR}/users/search?twitter=${encodeURIComponent(handle)}`,
    `${BANKR}/users/search?username=${encodeURIComponent('@' + handle)}`,
    `${BANKR}/users/${encodeURIComponent(handle)}`,
    `${BANKR}/users/twitter/${encodeURIComponent(handle)}`,
    `${BANKR}/addresses/resolve?handle=${encodeURIComponent('@' + handle)}`,
  ];

  for (const url of endpoints) {
    try {
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!res.ok) continue;
      const data = await res.json();
      const addr = extractAddress(data);
      if (addr) return addr;
    } catch {
      // CORS or network — try next
    }
  }
  return null;
}

// ─── Authenticated key-based connection ──────────────────────────────────────

async function bankrGet<T>(path: string, apiKey: string): Promise<T> {
  const res = await fetch(`${BANKR}${path}`, {
    headers: { 'X-API-Key': apiKey, Accept: 'application/json' },
  });
  if (res.status === 401 || res.status === 403) throw new Error('Invalid or expired API key.');
  if (!res.ok) throw new Error(`Bankr API error ${res.status}`);
  return res.json() as Promise<T>;
}

export async function connectBankrKey(
  apiKey: string,
  expectedUsername?: string,
): Promise<BankrWalletData> {
  const key = apiKey.trim();
  if (!key.startsWith('bk_')) throw new Error('Key must start with bk_');

  const [me, portfolio] = await Promise.all([
    bankrGet<BankrWalletInfo>('/wallet/me', key),
    bankrGet<BankrPortfolio>('/wallet/portfolio?chains=base', key),
  ]);

  const evmWallet = me.wallets?.find(w => w.chain === 'evm');
  if (!evmWallet?.address) throw new Error('No EVM wallet on this Bankr account.');

  const twitter = me.socialAccounts?.find(s => s.platform === 'twitter');
  const twitterUsername = twitter?.username ?? null;

  if (expectedUsername && twitterUsername &&
    twitterUsername.toLowerCase() !== expectedUsername.toLowerCase()) {
    throw new Error(`Key belongs to @${twitterUsername}, not @${expectedUsername}.`);
  }

  const base = portfolio.balances?.base;
  const baseUsd = parseFloat(base?.total ?? '0');
  const eth = parseFloat(base?.nativeBalance ?? '0');
  const ethUsd = parseFloat(base?.nativeUsd ?? '0');

  let usdc = 0;
  for (const tb of base?.tokenBalances ?? []) {
    if (tb.token?.baseToken?.symbol?.toUpperCase() === 'USDC') usdc = tb.token.balance;
  }

  return {
    evmAddress: evmWallet.address,
    twitterUsername,
    baseUsd,
    usdc,
    eth,
    ethUsd,
    leaderboardRank: me.leaderboard?.rank,
  };
}

export async function checkBankrExists(username: string): Promise<boolean> {
  return lookupBankrUser(username).then(addr => addr !== null);
}
