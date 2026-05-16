/**
 * Privacy Mode — Fetch interceptor (defense-in-depth).
 *
 * When privacy mode is active, this patches `window.fetch` to block all
 * outgoing requests to non-local hosts. This complements the service worker
 * blocking — if the SW is not yet installed or bypassed, this layer catches it.
 *
 * @module lib/privacy-fetch-guard
 */

import { isPrivacyModeActive, isLocalUrl } from '@/lib/privacy'

const originalFetch = window.fetch.bind(window)

/**
 * Guarded fetch that blocks non-local requests when privacy mode is active.
 */
function privacyGuardedFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  if (isPrivacyModeActive()) {
    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.href
          : input.url

    try {
      const parsed = new URL(url, window.location.origin)
      const isSameOrigin = parsed.origin === window.location.origin
      if (!isSameOrigin && !isLocalUrl(parsed.origin)) {
        console.warn(
          `[Privacy] 🔒 Blocked outgoing fetch to ${parsed.hostname} (privacy mode)`,
        )
        return Promise.resolve(
          new Response(
            JSON.stringify({
              error:
                'Privacy mode is enabled. Outgoing network requests are blocked.',
              blocked: true,
            }),
            {
              status: 403,
              statusText: 'Blocked by Privacy Mode',
              headers: { 'Content-Type': 'application/json' },
            },
          ),
        )
      }
    } catch {
      // If URL parsing fails, allow it (relative URLs are same-origin)
    }
  }

  return originalFetch(input, init)
}

/**
 * Install the privacy-mode fetch guard.
 * Call once at app initialization.
 */
export function installPrivacyFetchGuard(): void {
  window.fetch = privacyGuardedFetch as typeof window.fetch
}
