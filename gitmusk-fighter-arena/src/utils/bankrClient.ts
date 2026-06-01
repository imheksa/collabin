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
  bankrClub: boolean;
}

// ─── Public user lookup (no API key required) ────────────────────────────────────

export interface BankrUserData {
  address: string | null;
  bankrClub: boolean;
  /** true if at least one endpoint responded (even without an address) */
  reachable: boolean;
}

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

function extractClubStatus(data: unknown): boolean {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  for (const key of ['bankrClub', 'bankr_club', 'club']) {
    const club = d[key];
    if (club && typeof club === 'object') {
      return (club as Record<string, unknown>)['active'] === true;
    }
    if (typeof club === 'boolean') return club;
  }
  for (const key of ['user', 'data', 'result']) {
    const n = d[key];
    if (n && typeof n === 'object') { const r = extractClubStatus(n); if (r) return r; }
  }
  for (const key of ['users', 'results']) {
    const arr = d[key];
    if (Array.isArray(arr) && arr.length > 0) { const r = extractClubStatus(arr[0]); if (r) return r; }
  }
  return false;
}

const ENDPOINTS = (handle: string) => [
  `/.netlify/functions/bankr-check?username=${encodeURIComponent(handle)}`,
  `${BANKR}/users/search?twitter=${encodeURIComponent(handle)}`,
  `${BANKR}/users/search?username=${encodeURIComponent('@' + handle)}`,
  `${BANKR}/users/${encodeURIComponent(handle)}`,
  `${BANKR}/users/twitter/${encodeURIComponent(handle)}`,
  `${BANKR}/addresses/resolve?handle=${encodeURIComponent('@' + handle)}`,
];

export async function lookupBankrUserData(username: string): Promise<BankrUserData> {
  const handle = username.replace(/^@/, '');
  let reachable = false;
  for (const url of ENDPOINTS(handle)) {
    try {
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!res.ok) continue;
      reachable = true; // API responded — if no address found, user is truly not linked
      const data = await res.json();
      const address = extractAddress(data);
      if (address) return { address, bankrClub: extractClubStatus(data), reachable: true };
    } catch { /* CORS or network — try next */ }
  }
  return { address: null, bankrClub: false, reachable };
}

export async function lookupBankrUser(username: string): Promise<string | null> {
  return lookupBankrUserData(username).then(d => d.address);
}

export async function checkBankrExists(username: string): Promise<boolean> {
  return lookupBankrUserData(username).then(d => d.address !== null);
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
    bankrClub: me.bankrClub?.active === true,
  };
}

