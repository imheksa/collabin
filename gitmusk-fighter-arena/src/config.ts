export const X_CLIENT_ID = import.meta.env.VITE_X_CLIENT_ID as string | undefined;

// Strip trailing slash so it always matches X Developer Portal exactly.
// Fallback uses origin only (no pathname) to avoid the trailing-slash mismatch
// that window.location.origin + window.location.pathname produces at root ("/").
export const REDIRECT_URI: string = (
  (import.meta.env.VITE_REDIRECT_URI as string | undefined) ??
  (typeof window !== 'undefined' ? window.location.origin : '')
).replace(/\/$/, '');

export const TOKEN_PROXY_URL: string =
  (import.meta.env.VITE_TOKEN_PROXY_URL as string | undefined) ??
  '/api/token-exchange';

export const OAUTH_ENABLED = Boolean(X_CLIENT_ID);
