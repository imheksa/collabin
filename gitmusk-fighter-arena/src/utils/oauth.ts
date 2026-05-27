function base64url(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

export function generateCodeVerifier(): string {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return base64url(arr.buffer);
}

export async function generateCodeChallenge(verifier: string): Promise<string> {
  const data = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return base64url(digest);
}

export async function startXOAuth(clientId: string, redirectUri: string): Promise<void> {
  const verifier = generateCodeVerifier();
  const challenge = await generateCodeChallenge(verifier);
  const state = generateCodeVerifier();

  sessionStorage.setItem('oauth_code_verifier', verifier);
  sessionStorage.setItem('oauth_state', state);

  const url = new URL('https://twitter.com/i/oauth2/authorize');
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('scope', 'users.read tweet.read');
  url.searchParams.set('state', state);
  url.searchParams.set('code_challenge', challenge);
  url.searchParams.set('code_challenge_method', 'S256');

  window.location.href = url.toString();
}
