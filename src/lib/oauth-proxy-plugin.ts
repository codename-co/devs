/**
 * OAuth Proxy Plugin for Vite
 *
 * A unified proxy plugin that handles all OAuth-related proxy configurations.
 * Each connector can define its own proxy configuration, making connectors fully self-contained.
 *
 * Problem: Vite's http-proxy has a race condition where trying to read the request body
 * asynchronously (via req.on('data')) and then modify headers causes ERR_HTTP_HEADERS_SENT
 * because the proxy has already started sending the request by the time the body is buffered.
 *
 * Solution: This plugin intercepts requests as middleware (before Vite's proxy),
 * properly buffers the request body when needed, applies modifications, makes a direct
 * fetch() call to the target, and returns the response to the client.
 */

import type { Plugin } from 'vite'
import type { IncomingMessage } from 'node:http'

export type CredentialInjection =
  | {
      /** Inject credentials into request body as form parameters */
      type: 'body'
      clientId: string
      clientSecret: string
    }
  | {
      /** Inject credentials as Basic Auth header */
      type: 'basic-auth'
      clientId: string
      clientSecret: string
    }
  | {
      /** No credential injection, just proxy */
      type: 'none'
    }

export interface ProxyRoute {
  /** URL path prefix to match (e.g., '/api/google') */
  pathPrefix: string
  /** Additional path pattern to match for credential injection (e.g., '/token') */
  pathMatch?: string
  /** Target base URL to proxy to */
  target: string
  /** Path to prepend to the rewritten URL (e.g., '/v1' for Notion) */
  targetPathPrefix?: string
  /** How to inject credentials */
  credentials: CredentialInjection
}

// Helper to buffer request body
function bufferBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk: Buffer) => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks).toString()))
    req.on('error', reject)
  })
}

// Copy headers from IncomingMessage, excluding hop-by-hop headers
function getForwardHeaders(req: IncomingMessage): Record<string, string> {
  const headers: Record<string, string> = {}
  const hopByHop = [
    'connection',
    'keep-alive',
    'proxy-authenticate',
    'proxy-authorization',
    'te',
    'trailer',
    'transfer-encoding',
    'upgrade',
    'host',
  ]

  for (const [key, value] of Object.entries(req.headers)) {
    if (value && !hopByHop.includes(key.toLowerCase())) {
      headers[key] = Array.isArray(value) ? value.join(', ') : value
    }
  }

  return headers
}

export function oauthProxyPlugin(routes: ProxyRoute[]): Plugin {
  return {
    name: 'oauth-proxy',
    configureServer(server) {
      // Add middleware before Vite's internal middleware
      server.middlewares.use(async (req, res, next) => {
        const url = req.url || ''

        // Find matching route
        const route = routes.find((r) => url.startsWith(r.pathPrefix))

        if (!route) {
          return next()
        }

        // Check if this specific request needs credential injection
        const needsCredentials =
          !route.pathMatch || url.includes(route.pathMatch)

        try {
          // Build target URL
          const pathSuffix = url.replace(
            new RegExp(`^${route.pathPrefix}`),
            '',
          )
          const targetUrl = `${route.target}${route.targetPathPrefix || ''}${pathSuffix}`

          // Prepare headers
          const headers = getForwardHeaders(req)

          // Handle based on credential type
          let body: string | undefined

          if (needsCredentials && route.credentials.type === 'body') {
            // Buffer body and inject credentials
            const originalBody = await bufferBody(req)
            const params = new URLSearchParams(originalBody)
            params.set('client_id', route.credentials.clientId)
            params.set('client_secret', route.credentials.clientSecret)
            body = params.toString()
            headers['content-type'] = 'application/x-www-form-urlencoded'
            headers['content-length'] = Buffer.byteLength(body).toString()
          } else if (
            needsCredentials &&
            route.credentials.type === 'basic-auth'
          ) {
            // Add Basic Auth header
            const credentials = Buffer.from(
              `${route.credentials.clientId}:${route.credentials.clientSecret}`,
            ).toString('base64')
            headers['authorization'] = `Basic ${credentials}`
            // Buffer body for forwarding
            if (
              req.method !== 'GET' &&
              req.method !== 'HEAD' &&
              req.method !== 'OPTIONS'
            ) {
              body = await bufferBody(req)
            }
          } else {
            // No credential injection, just buffer body if needed
            if (
              req.method !== 'GET' &&
              req.method !== 'HEAD' &&
              req.method !== 'OPTIONS'
            ) {
              body = await bufferBody(req)
            }
          }

          // Make the request
          const response = await fetch(targetUrl, {
            method: req.method || 'GET',
            headers,
            body,
          })

          // Forward response status and headers
          res.statusCode = response.status
          response.headers.forEach((value, key) => {
            // Skip content-encoding to avoid double-encoding issues
            if (key.toLowerCase() !== 'content-encoding') {
              res.setHeader(key, value)
            }
          })

          // Forward response body
          const responseBody = await response.arrayBuffer()
          res.end(Buffer.from(responseBody))
        } catch (err) {
          console.error(`Proxy error for ${route.pathPrefix}:`, err)
          res.statusCode = 500
          res.end(JSON.stringify({ error: 'Proxy error' }))
        }
      })
    },
  }
}
