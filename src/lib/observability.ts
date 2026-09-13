import * as Sentry from '@sentry/react'

const stripQueryAndFragment = (value: string | undefined): string | undefined => {
  if (!value) return value
  try {
    const url = new URL(value, window.location.origin)
    url.search = ''
    url.hash = ''
    return url.toString()
  } catch {
    return value.split(/[?#]/, 1)[0]
  }
}

export const initializeObservability = (): boolean => {
  const dsn = import.meta.env.VITE_GLITCHTIP_DSN
  const environment = import.meta.env.VITE_OBSERVABILITY_ENVIRONMENT
  if (!dsn || !environment) return false

  Sentry.init({
    dsn,
    environment,
    release: `boardbuddy-web@${__APP_VERSION__}`,
    sendDefaultPii: false,
    tracesSampleRate: 0,
    maxBreadcrumbs: 50,
    beforeSend(event) {
      return {
        ...event,
        user: undefined,
        request: event.request
          ? {
              ...event.request,
              cookies: undefined,
              data: undefined,
              headers: undefined,
              query_string: undefined,
              url: stripQueryAndFragment(event.request.url),
            }
          : undefined,
      }
    },
    beforeBreadcrumb(breadcrumb) {
      if (!breadcrumb.data) return breadcrumb
      const sanitizedData = { ...breadcrumb.data }
      if (typeof sanitizedData.url === 'string') {
        sanitizedData.url = stripQueryAndFragment(sanitizedData.url)
      }
      delete sanitizedData.request_body
      delete sanitizedData.response_body
      return { ...breadcrumb, data: sanitizedData }
    },
  })
  return true
}

export { Sentry }
