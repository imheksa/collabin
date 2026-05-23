import { XProfile, TickType } from '../types';
import { TOKEN_PROXY_URL } from '../config';

interface XApiUser {
  id: string;
  name: string;
  username: string;
  description?: string;
  profile_image_url?: string;
  verified_type?: 'Blue' | 'Business' | 'Government' | null;
  created_at: string;
  public_metrics?: {
    followers_count: number;
    following_count: number;
    tweet_count: number;
    listed_count: number;
  };
}

export async function exchangeCodeForToken(
  code: string,
  codeVerifier: string,
  clientId: string,
  redirectUri: string,
): Promise<string> {
  const body = new URLSearchParams({
    code,
    grant_type: 'authorization_code',
    client_id: clientId,
    redirect_uri: redirectUri,
    code_verifier: codeVerifier,
  });

  // Try proxy first (required on GitHub Pages — X token endpoint blocks CORS)
  // Fallback to direct call (works only when app is hosted on Netlify itself)
  const endpoints = [
    TOKEN_PROXY_URL,
    'https://api.twitter.com/2/oauth2/token',
  ].filter(Boolean);

  let lastError = '';
  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.access_token) return data.access_token;
        lastError = data.error_description ?? data.error ?? 'No access_token in response';
      } else {
        const err = await res.json().catch(() => ({}));
        lastError = err.error_description ?? err.error ?? `HTTP ${res.status}`;
      }
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
    }
  }

  // Actionable error message
  const isCors = lastError.includes('Failed to fetch') || lastError.includes('NetworkError');
  throw new Error(
    isCors
      ? 'Token exchange blocked by CORS. Deploy backend to Netlify and set VITE_TOKEN_PROXY_URL.'
      : `X login failed: ${lastError}`,
  );
}

export async function fetchXProfile(accessToken: string): Promise<XProfile> {
  const fields = 'public_metrics,created_at,description,profile_image_url,verified_type';
  const res = await fetch(
    `https://api.twitter.com/2/users/me?user.fields=${fields}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );

  if (!res.ok) throw new Error('Failed to fetch X profile');
  const { data }: { data: XApiUser } = await res.json();
  return mapXApiUser(data);
}

function mapXApiUser(user: XApiUser): XProfile {
  const accountAgeDays = Math.floor(
    (Date.now() - new Date(user.created_at).getTime()) / 86_400_000,
  );

  const m = user.public_metrics;
  const followers = m?.followers_count ?? 0;
  const following = m?.following_count ?? 0;
  const tweetCount = m?.tweet_count ?? 0;

  const followerScore = Math.min(40, Math.log10(followers + 1) * 10);
  const ageScore = Math.min(20, accountAgeDays / 180);
  const activityScore = Math.min(20, Math.log10(tweetCount + 1) * 6);
  const verifiedBonus = user.verified_type === 'Business' ? 20
    : user.verified_type === 'Blue' ? 10 : 0;
  const twitterScore = Math.min(100, Math.round(followerScore + ageScore + activityScore + verifiedBonus));

  const verified: TickType = user.verified_type === 'Business' ? 'gold'
    : user.verified_type === 'Blue' ? 'blue'
    : 'none';

  return {
    username: user.username,
    displayName: user.name,
    bio: user.description ?? '',
    avatarUrl: (user.profile_image_url ?? '').replace('_normal', '_400x400'),
    followers,
    following,
    tweetCount,
    accountAgeDays,
    twitterScore,
    verified,
  };
}
