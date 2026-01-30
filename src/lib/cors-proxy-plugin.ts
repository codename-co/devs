/**
 * CORS Proxy Plugin for Vite
 *
 * A generic CORS proxy that allows fetching external resources from the browser.
 * Only accepts requests from allowed origins (devs.new or localhost).
 *
 * Usage: /api/proxy?url=https://example.com/resource
 */

import type { Plugin } from 'vite'

const PROXY_PATH = '/api/proxy'

/**
 * Validates that the request origin is allowed.
 * Allowed origins:
 * - https://devs.new (production)
 * - http://localhost:* (development)
 */
function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) {
    // Allow requests without origin (e.g., from curl, server-side)
    return true
  }

  try {
    const url = new URL(origin)
    // Allow devs.new (production)
    if (url.hostname === 'devs.new' && url.protocol === 'https:') {
      return true
    }
    // Allow localhost (development)
    if (url.hostname === 'localhost') {
      return true
    }
    // Allow 127.0.0.1 (development)
    if (url.hostname === '127.0.0.1') {
      return true
    }
    return false
  } catch {
    return false
  }
}

/**
 * Copy headers from the proxied response, excluding hop-by-hop headers.
 */
function getResponseHeaders(
  headers: Headers,
): Record<string, string | string[]> {
  const result: Record<string, string | string[]> = {}
  const hopByHop = [
    'connection',
    'keep-alive',
    'proxy-authenticate',
    'proxy-authorization',
    'te',
    'trailer',
    'transfer-encoding',
    'upgrade',
    'content-encoding', // Skip to avoid double-encoding issues
  ]

  headers.forEach((value, key) => {
    if (!hopByHop.includes(key.toLowerCase())) {
      result[key] = value
    }
  })

  return result
}

export function corsProxyPlugin(): Plugin {
  return {
    name: 'cors-proxy',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const reqUrl = req.url || ''

        // Only handle requests to the cors proxy endpoint
        if (!reqUrl.startsWith(PROXY_PATH)) {
          return next()
        }

        // Validate origin
        const origin = req.headers.origin
        if (!isAllowedOrigin(origin)) {
          console.warn(`[cors-proxy] Rejected request from origin: ${origin}`)
          res.statusCode = 403
          res.end(JSON.stringify({ error: 'Forbidden: Invalid origin' }))
          return
        }

        // Parse the URL parameter
        const urlParams = new URLSearchParams(reqUrl.replace(PROXY_PATH, ''))
        const targetUrl = urlParams.get('url')

        if (!targetUrl) {
          res.statusCode = 400
          res.end(JSON.stringify({ error: 'Missing url parameter' }))
          return
        }

        // Validate target URL
        try {
          new URL(targetUrl)
        } catch {
          res.statusCode = 400
          res.end(JSON.stringify({ error: 'Invalid target URL' }))
          return
        }

        try {
          console.log(`[cors-proxy] Proxying: ${targetUrl}`)

          // Forward the request to the target URL
          const response = await fetch(targetUrl, {
            method: req.method || 'GET',
            headers: {
              'User-Agent':
                'Mozilla/5.0 (compatible; DEVS-Proxy/1.0; +https://devs.new)',
            },
          })

          // Set CORS headers - only for validated origins
          if (origin) {
            res.setHeader('Access-Control-Allow-Origin', origin)
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
          }

          // Handle preflight requests
          if (req.method === 'OPTIONS') {
            res.statusCode = 204
            if (origin) {
              res.setHeader('Access-Control-Max-Age', '86400')
            }
            res.end()
            return
          }

          // Forward response status
          res.statusCode = response.status

          // Forward response headers
          const responseHeaders = getResponseHeaders(response.headers)
          for (const [key, value] of Object.entries(responseHeaders)) {
            res.setHeader(key, value)
          }

          // Forward response body
          const responseBody = await response.arrayBuffer()
          res.end(Buffer.from(responseBody))
        } catch (err) {
          console.error(`[cors-proxy] Error proxying ${targetUrl}:`, err)
          res.statusCode = 500
          res.end(
            JSON.stringify({
              error: 'Proxy error',
              message: err instanceof Error ? err.message : 'Unknown error',
            }),
          )
        }
      })
    },
  }
}
