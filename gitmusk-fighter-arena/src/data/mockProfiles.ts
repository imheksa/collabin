import { XProfile } from '../types';

export const DEMO_PROFILES: XProfile[] = [
  {
    username: 'elonmusk',
    displayName: 'Elon Musk',
    bio: 'CEO @Tesla @SpaceX @X. Mars, free speech, doge to the moon.',
    avatarUrl: 'https://unavatar.io/twitter/elonmusk',
    followers: 185000000,
    following: 750,
    tweetCount: 45000,
    accountAgeDays: 5840,
    twitterScore: 98,
    verified: 'gold',
    isDemo: true,
  },
  {
    username: 'VitalikButerin',
    displayName: 'Vitalik Buterin',
    bio: 'Ethereum co-founder. Building the decentralized future. AI, crypto, philosophy.',
    avatarUrl: 'https://unavatar.io/twitter/VitalikButerin',
    followers: 5800000,
    following: 380,
    tweetCount: 22000,
    accountAgeDays: 4380,
    twitterScore: 87,
    verified: 'none',
    isDemo: true,
  },
  {
    username: 'cz_binance',
    displayName: 'CZ 🔶 BNB',
    bio: 'Ex-CEO @Binance. #BNB. Investor. Builder. DO NOT DM me about Binance.',
    avatarUrl: 'https://unavatar.io/twitter/cz_binance',
    followers: 9200000,
    following: 510,
    tweetCount: 18500,
    accountAgeDays: 3800,
    twitterScore: 92,
    verified: 'gold',
    isDemo: true,
  },
  {
    username: 'cobie',
    displayName: 'Cobie',
    bio: 'Crypto. Options trading. dgaf about your bags. @UpOnly. Degen since 2017.',
    avatarUrl: 'https://unavatar.io/twitter/cobie',
    followers: 890000,
    following: 1200,
    tweetCount: 67000,
    accountAgeDays: 2920,
    twitterScore: 81,
    verified: 'blue',
    isDemo: true,
  },
  {
    username: 'KarpathyAI',
    displayName: 'Andrej Karpathy',
    bio: 'AI/ML researcher. Ex-OpenAI, ex-Tesla AI. Neural nets, LLMs, AI agents.',
    avatarUrl: 'https://unavatar.io/twitter/karpathy',
    followers: 950000,
    following: 200,
    tweetCount: 4500,
    accountAgeDays: 3650,
    twitterScore: 84,
    verified: 'none',
    isDemo: true,
  },
  {
    username: 'nikitabier',
    displayName: 'Nikita Bier',
    bio: 'Built TBH (acq. Facebook), Gas (acq. Discord). Consumer product obsessive. Viral app guy.',
    avatarUrl: 'https://unavatar.io/twitter/nikitabier',
    followers: 480000,
    following: 890,
    tweetCount: 12000,
    accountAgeDays: 3500,
    twitterScore: 80,
    verified: 'blue',
    isDemo: true,
  },
];

export function generateCustomProfile(username: string): XProfile {
  const seed = username.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const rng = (min: number, max: number) => min + ((seed * 1103515245 + 12345) % (max - min));

  const followers = rng(500, 50000);
  const tweetCount = rng(100, 10000);
  const accountAgeDays = rng(30, 3000);
  const twitterScore = Math.min(99, 30 + Math.floor(Math.log10(followers + 1) * 10));

  return {
    username,
    displayName: username,
    bio: 'Crypto. Building. Degen.',
    avatarUrl: `https://api.dicebear.com/7.x/pixel-art/svg?seed=${username}`,
    followers,
    following: rng(50, 2000),
    tweetCount,
    accountAgeDays,
    twitterScore,
    verified: 'none',
    isDemo: true,
  };
}
