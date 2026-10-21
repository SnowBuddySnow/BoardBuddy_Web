import { beforeEach, describe, expect, it, vi } from 'vitest'

const init = vi.fn()
vi.mock('@sentry/react', () => ({ init }))

describe('initializeObservability', () => {
  beforeEach(() => {
    vi.resetModules()
    init.mockReset()
    vi.stubGlobal('__APP_VERSION__', '1.0.0+abcdef0')
    vi.stubEnv('VITE_GLITCHTIP_DSN', '')
    vi.stubEnv('VITE_OBSERVABILITY_ENVIRONMENT', '')
  })

  it('does not initialize without a DSN', async () => {
    const { initializeObservability } = await import('./observability')

    expect(initializeObservability()).toBe(false)
    expect(init).not.toHaveBeenCalled()
  })

  it('removes identity and request details before sending', async () => {
    vi.stubEnv('VITE_GLITCHTIP_DSN', 'https://public@example.test/1')
    vi.stubEnv('VITE_OBSERVABILITY_ENVIRONMENT', 'staging')
    const { initializeObservability } = await import('./observability')

    expect(initializeObservability()).toBe(true)
    const options = init.mock.calls[0][0]
    expect(options.tracesSampleRate).toBe(0)
    const sanitized = options.beforeSend({
      user: { id: '42', email: 'person@example.test' },
      request: {
        url: 'https://stg.boardbuddy.kr/callback?code=secret#fragment',
        headers: { Authorization: 'Bearer secret' },
        cookies: { session: 'secret' },
        data: 'private',
        query_string: 'code=secret',
      },
    })

    expect(sanitized.user).toBeUndefined()
    expect(sanitized.request).toEqual({
      url: 'https://stg.boardbuddy.kr/callback',
      headers: undefined,
      cookies: undefined,
      data: undefined,
      query_string: undefined,
    })
  })
})
