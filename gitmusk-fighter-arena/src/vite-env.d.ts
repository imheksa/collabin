/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_X_CLIENT_ID?: string;
  readonly VITE_REDIRECT_URI?: string;
  readonly VITE_TOKEN_PROXY_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
