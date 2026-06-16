export const X_CLIENT_ID = import.meta.env.VITE_X_CLIENT_ID as string | undefined;

// Always use the current origin so OAuth callback lands on the same domain the
// user is on.  VITE_REDIRECT_URI can override this for local dev if needed.
export const REDIRECT_URI: string = (
  (import.meta.env.VITE_REDIRECT_URI as string | undefined) ||
  (typeof window !== 'undefined' ? window.location.origin : '')
).replace(/\/$/, '');

export const TOKEN_PROXY_URL: string =
  (import.meta.env.VITE_TOKEN_PROXY_URL as string | undefined) ??
  '/api/token-exchange';

export const OAUTH_ENABLED = Boolean(X_CLIENT_ID);
