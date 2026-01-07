/**
 * OAuth Callback Page
 *
 * This page handles the OAuth callback from external providers.
 * It extracts the authorization code and state from the URL,
 * then sends them back to the opener window via postMessage.
 */

import { useEffect, useState } from 'react'
import { Spinner } from '@heroui/react'

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

        // Send error to opener
        if (window.opener) {
          window.opener.postMessage(
            {
              type: 'oauth_callback',
              error,
              error_description: errorDescription,
            },
            window.location.origin,
          )
        }

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

        if (window.opener) {
          window.opener.postMessage(
            {
              type: 'oauth_callback',
              error: 'no_code',
              error_description: 'No authorization code received',
            },
            window.location.origin,
          )
        }

        setTimeout(() => {
          window.close()
        }, 2000)
        return
      }

      // Send code and state to opener window
      if (window.opener) {
        window.opener.postMessage(
          {
            type: 'oauth_callback',
            code,
            state,
          },
          window.location.origin,
        )

        setStatus('success')

        // Close popup after successful callback
        setTimeout(() => {
          window.close()
        }, 500)
      } else {
        // No opener - user may have navigated directly
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
