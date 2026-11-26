import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { configDefaults } from 'vitest/config'
import packageMetadata from './package.json' with { type: 'json' }

function publishBuildInfo(revision: string | undefined): Plugin {
  return {
    name: 'boardbuddy-build-info',
    apply: 'build',
    generateBundle(_, bundle) {
      if (!revision || !/^[a-f0-9]{40}$/.test(revision)) return
      const entry = Object.values(bundle).find(file => file.type === 'chunk' && file.isEntry)
      if (!entry) this.error('Could not identify the BoardBuddy Web entry module')
      this.emitFile({
        type: 'asset',
        fileName: 'build-info.json',
        source: JSON.stringify({ revision, entry: `/${entry.fileName}` }),
      })
    },
  }
}

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
  if (env.VITE_GLITCHTIP_DSN && !env.VITE_GLITCHTIP_DSN.startsWith('https://')) {
    throw new Error('VITE_GLITCHTIP_DSN must use HTTPS')
  }
  if (env.VITE_GLITCHTIP_DSN && !['staging', 'production'].includes(env.VITE_OBSERVABILITY_ENVIRONMENT)) {
    throw new Error('VITE_OBSERVABILITY_ENVIRONMENT must be staging or production when GlitchTip is enabled')
  }

  const buildSha = env.VERCEL_GIT_COMMIT_SHA || env.VITE_BUILD_SHA
  const buildVersion = buildSha
    ? `${packageMetadata.version}+${buildSha.slice(0, 7)}`
    : packageMetadata.version

  return {
    // Keep independently configured browser fixtures from invalidating one another.
    cacheDir: env.BOARDBUDDY_VITE_CACHE_DIR || 'node_modules/.vite',
    plugins: [react(), publishBuildInfo(buildSha)],
    define: {
      __APP_VERSION__: JSON.stringify(buildVersion),
    },
    test: {
      exclude: [...configDefaults.exclude, 'e2e/**'],
      coverage: {
        provider: 'v8',
        include: ['src/**/*.{ts,tsx}'],
        exclude: ['**/*.test.{ts,tsx}', '**/*.d.ts'],
        reportsDirectory: 'output/test-results/coverage',
        reporter: ['text-summary', 'html', 'lcov'],
        reportOnFailure: true,
        thresholds: {
          lines: 58,
          branches: 53,
          'src/lib/axios.ts': { lines: 97, branches: 90 },
          'src/lib/naverOAuth.ts': { lines: 95, branches: 95 },
          'src/services/eventSave.ts': { lines: 60, branches: 60 },
        },
      },
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
