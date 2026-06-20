const BASE_RPC = 'https://mainnet.base.org';
const USDC_BASE = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

async function rpcCall(method: string, params: unknown[]): Promise<string> {
  const res = await fetch(BASE_RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', method, params, id: 1 }),
  });
  const { result, error } = await res.json();
  if (error) throw new Error(error.message);
  return result as string;
}

export async function getUsdcBalance(address: string): Promise<number> {
  const data = '0x70a08231' + address.slice(2).padStart(64, '0');
  const result = await rpcCall('eth_call', [{ to: USDC_BASE, data }, 'latest']);
  return parseInt(result, 16) / 1e6;
}

export async function getEthBalance(address: string): Promise<number> {
  const result = await rpcCall('eth_getBalance', [address, 'latest']);
  return parseInt(result, 16) / 1e18;
}

async function getEthPriceUsd(): Promise<number> {
  try {
    const res = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd',
    );
    const data = await res.json();
    return (data.ethereum?.usd as number) ?? 3000;
  } catch {
    return 3000;
  }
}

export interface WalletBalance {
  usdc: number;
  eth: number;
  ethPriceUsd: number;
  totalUsd: number;
}

export async function getWalletBalance(address: string): Promise<WalletBalance> {
  const [usdc, eth, ethPriceUsd] = await Promise.all([
    getUsdcBalance(address).catch(() => 0),
    getEthBalance(address).catch(() => 0),
    getEthPriceUsd(),
  ]);
  return { usdc, eth, ethPriceUsd, totalUsd: usdc + eth * ethPriceUsd };
}

export function isValidAddress(addr: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(addr);
}
