/**
 * @module pages/AuthCallback
 *
 * Handles the OAuth2 PKCE callback from the OIDC provider (Keycloak, Okta, etc.).
 *
 * After the user authenticates with the IdP, they are redirected to
 * `/auth/callback?code=...&state=...`. This page exchanges the code
 * for tokens, establishes the session, and redirects to the app.
 */

import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { authService } from '@/features/auth/auth-service'
import { isTeams } from '@/lib/teams/config'

export function AuthCallbackPage() {
  const [searchParams] = useSearchParams()
  const [error, setError] = useState<string | null>(null)
  const handled = useRef(false)

  useEffect(() => {
    // Prevent double-execution in React strict mode
    if (handled.current) return
    handled.current = true

    if (!isTeams) {
      window.location.href = '/'
      return
    }

    authService
      .handleCallback(searchParams)
      .then(() => {
        // Redirect to root — LanguageRedirect handles the lang prefix
        window.location.href = '/'
      })
      .catch((err) => {
        console.error('[auth] Callback error:', err)
        setError(err instanceof Error ? err.message : 'Authentication failed')
      })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center">
          <p className="text-lg font-medium text-danger">Authentication failed</p>
          <p className="text-sm text-default-500">{error}</p>
          <button
            className="text-sm text-primary underline"
            onClick={() => { window.location.href = '/' }}
          >
            Back to DEVS
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-sm text-default-500">Signing in&hellip;</p>
      </div>
    </div>
  )
}
