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

function buildOAuthUrl(clientId: string, redirectUri: string, state: string, challenge: string): string {
  const url = new URL('https://twitter.com/i/oauth2/authorize');
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('scope', 'users.read tweet.read');
  url.searchParams.set('state', state);
  url.searchParams.set('code_challenge', challenge);
  url.searchParams.set('code_challenge_method', 'S256');
  return url.toString();
}

function storePkce(verifier: string, state: string) {
  // Write to both: sessionStorage is tab-specific (prevents multi-tab collisions on desktop),
  // localStorage is the mobile fallback (sessionStorage is cleared during cross-origin redirects on iOS).
  try { sessionStorage.setItem('oauth_code_verifier', verifier); } catch { /* ignore */ }
  try { sessionStorage.setItem('oauth_state', state); } catch { /* ignore */ }
  localStorage.setItem('oauth_code_verifier', verifier);
  localStorage.setItem('oauth_state', state);
}

/**
 * Opens X OAuth in a popup window. Returns the popup Window handle,
 * or null if the popup was blocked (caller should fall back to redirect).
 * The actual callback is handled in App.tsx via postMessage.
 */
export async function startXOAuthPopup(clientId: string, redirectUri: string): Promise<Window | null> {
  const verifier = generateCodeVerifier();
  const challenge = await generateCodeChallenge(verifier);
  const state = generateCodeVerifier();
  storePkce(verifier, state);

  const oauthUrl = buildOAuthUrl(clientId, redirectUri, state, challenge);
  const w = screen.width;
  const h = screen.height;
  const pw = Math.min(600, w);
  const ph = Math.min(750, h);
  const left = Math.round((w - pw) / 2);
  const top = Math.round((h - ph) / 4);

  const popup = window.open(
    oauthUrl,
    'x_oauth_popup',
    `width=${pw},height=${ph},left=${left},top=${top},menubar=no,toolbar=no,location=yes,resizable=yes,scrollbars=yes`,
  );
  return popup;
}

/**
 * Fallback: navigate the current window to X OAuth (for mobile / popup-blocked).
 */
export async function startXOAuth(clientId: string, redirectUri: string): Promise<void> {
  const verifier = generateCodeVerifier();
  const challenge = await generateCodeChallenge(verifier);
  const state = generateCodeVerifier();
  storePkce(verifier, state);

  window.location.href = buildOAuthUrl(clientId, redirectUri, state, challenge);
}
