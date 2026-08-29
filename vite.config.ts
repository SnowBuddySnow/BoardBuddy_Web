import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import packageMetadata from './package.json' with { type: 'json' }

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '')

  // A hosted frontend must select its backend explicitly. Failing the build is
  // safer than silently connecting a production frontend to staging.
  if (env.VERCEL === '1' && !env.VITE_API_BASE_URL) {
    throw new Error('VITE_API_BASE_URL must be configured for this Vercel environment')
  }
  if (env.VERCEL === '1' && !env.VITE_API_BASE_URL.startsWith('https://')) {
    throw new Error('VITE_API_BASE_URL must use HTTPS on Vercel')
  }

  const buildSha = env.VERCEL_GIT_COMMIT_SHA || env.VITE_BUILD_SHA
  const buildVersion = buildSha
    ? `${packageMetadata.version}+${buildSha.slice(0, 7)}`
    : packageMetadata.version

  return {
    plugins: [react()],
    define: {
      __APP_VERSION__: JSON.stringify(buildVersion),
    },
    server: {
      proxy: {
        '/api': {
          target: 'http://localhost:8080',
          changeOrigin: true,
          secure: false,
        },
      },
    },
  }
})
