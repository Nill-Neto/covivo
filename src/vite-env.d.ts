/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly APP_PUBLIC_URL?: string;
  readonly APP_PUBLIC_URL_ALIASES?: string;
  readonly ENABLE_BRAND_DOMAIN_REDIRECT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
