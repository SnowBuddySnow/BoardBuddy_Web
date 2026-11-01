/// <reference types="vite/client" />

declare const __APP_VERSION__: string;

interface ImportMetaEnv {
  readonly VITE_GLITCHTIP_DSN?: string;
  readonly VITE_OBSERVABILITY_ENVIRONMENT?: 'staging' | 'production';
}
