/**
 * OAuth Callback Page
 *
 * This page handles the OAuth callback from external providers.
 * It extracts the authorization code and state from the URL,
 * then sends them back to the opener window via postMessage.
 *
 * When Cross-Origin-Opener-Policy (COOP) severs the window.opener link
 * (e.g., after navigating through Google's auth pages), this page falls
 * back to BroadcastChannel API to communicate with the opener.
 */

import { useEffect, useState } from 'react'
import { Spinner } from '@heroui/react'

/** Must match the channel name in oauth-gateway.ts */
const OAUTH_BROADCAST_CHANNEL = 'devs-oauth-callback'

/**
 * Send an OAuth callback message to the opener using the best available channel.
 * Tries postMessage first (fastest), then falls back to BroadcastChannel
 * which works even when COOP has severed the window.opener reference.
 */
function sendCallbackMessage(message: Record<string, unknown>): boolean {
  let sent = false

  // 1. Try postMessage (direct window reference, fastest)
  if (window.opener) {
    try {
      window.opener.postMessage(message, window.location.origin)
      sent = true
    } catch {
      // window.opener exists but postMessage blocked - fall through to BroadcastChannel
    }
  }

  // 2. Always also send via BroadcastChannel as a reliable fallback
  // This handles the case where COOP severed window.opener during the OAuth redirect chain
  try {
    const bc = new BroadcastChannel(OAUTH_BROADCAST_CHANNEL)
    bc.postMessage(message)
    // Close after a short delay to ensure the message is delivered
    setTimeout(() => bc.close(), 100)
    sent = true
  } catch {
    // BroadcastChannel not supported
  }

  return sent
}

export function OAuthCallbackPage() {
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>(
    'processing',
  )
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    const handleCallback = () => {
      const params = new URLSearchParams(window.location.search)

      // Check for error from provider
      const error = params.get('error')
      const errorDescription = params.get('error_description')

      if (error) {
        setStatus('error')
        setErrorMessage(errorDescription || error)

        sendCallbackMessage({
          type: 'oauth_callback',
          error,
          error_description: errorDescription,
        })

        // Close popup after a short delay to show error
        setTimeout(() => {
          window.close()
        }, 2000)
        return
      }

      // Get authorization code and state
      const code = params.get('code')
      const state = params.get('state')

      if (!code) {
        setStatus('error')
        setErrorMessage('No authorization code received')

        sendCallbackMessage({
          type: 'oauth_callback',
          error: 'no_code',
          error_description: 'No authorization code received',
        })

        setTimeout(() => {
          window.close()
        }, 2000)
        return
      }

      // Send code and state to opener window via all available channels
      const sent = sendCallbackMessage({
        type: 'oauth_callback',
        code,
        state,
      })

      if (sent) {
        setStatus('success')

        // Close popup after successful callback
        setTimeout(() => {
          window.close()
        }, 500)
      } else {
        // Neither postMessage nor BroadcastChannel worked
        setStatus('error')
        setErrorMessage(
          'This page should only be accessed via the OAuth popup flow',
        )
      }
    }

    handleCallback()
  }, [])

  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <div className="text-center">
        {status === 'processing' && (
          <>
            <Spinner size="lg" className="mb-4" />
            <p className="text-foreground-500">Processing authentication...</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="mb-4 text-4xl">✓</div>
            <p className="text-success">Authentication successful!</p>
            <p className="text-foreground-500 text-sm mt-2">
              This window will close automatically...
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="mb-4 text-4xl">✗</div>
            <p className="text-danger">Authentication failed</p>
            {errorMessage && (
              <p className="text-foreground-500 text-sm mt-2">{errorMessage}</p>
            )}
            <p className="text-foreground-500 text-sm mt-2">
              This window will close automatically...
            </p>
          </>
        )}
      </div>
    </div>
  )
}

export default OAuthCallbackPage
