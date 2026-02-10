#!/usr/bin/env node
/**
 * DEVS CORS Proxy Server
 *
 * A production CORS proxy service that allows fetching external resources.
 * Only accepts requests from allowed origins (devs.new or localhost).
 *
 * ============================================================================
 * PRIVACY POLICY - DO NOT MODIFY
 * ============================================================================
 *
 * This service is designed with STRICT PRIVACY requirements:
 *
 * 1. NO LOGGING of any kind is permitted
 * 2. NO request URLs, origins, or user data may be recorded
 * 3. NO metrics that could identify user behavior
 * 4. NO third-party analytics or monitoring services
 * 5. NO persistent storage of request data
 *
 * This proxy operates as a pure pass-through with zero knowledge of:
 * - What URLs users are fetching
 * - Who is making requests
 * - When requests are made
 * - How often resources are accessed
 *
 * Any modification that introduces logging, metrics, or data collection
 * MUST be rejected during code review.
 *
 * Enforcement: Run `npm run lint:privacy` to verify no logging exists.
 *
 * ============================================================================
 *
 * Usage: GET /api/proxy?url=https://example.com/resource
 *
 * Run with: node server.mjs
 * Environment variables:
 *   - HOST: Bind address (default: 0.0.0.0)
 *   - PORT: Listen port (default: 3001)
 */

import http from 'node:http'
import https from 'node:https'
import { URL } from 'node:url'

const HOST = process.env.HOST || '0.0.0.0'
const PORT = process.env.PORT || 3001

const PROXY_PATH = '/api/proxy'

/**
 * Validates that the request origin is allowed.
 * Allowed origins:
 * - https://devs.new (production)
 * - http://localhost:* (development)
 *
 * NOTE: This validation does NOT log rejected origins for privacy.
 */
function isAllowedOrigin(origin) {
  if (!origin) {
    // Allow requests without origin (e.g., from curl, health checks)
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
 * Hop-by-hop headers that should not be forwarded.
 */
const HOP_BY_HOP_HEADERS = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
  'content-encoding', // Skip to avoid double-encoding issues
])

/**
 * Fetch a URL and return the response.
 * No logging of the target URL for privacy.
 *
 * @param {string} targetUrl - The URL to fetch
 * @param {Object} options - Request options
 * @param {string} options.method - HTTP method (GET, POST, etc.)
 * @param {Buffer|undefined} options.body - Request body for POST/PUT/PATCH
 * @param {Object} options.headers - Headers to forward
 */
async function fetchUrl(targetUrl, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(targetUrl)
    const protocol = url.protocol === 'https:' ? https : http
    const method = options.method || 'GET'

    const requestOptions = {
      method,
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; DEVS-Proxy/1.0; +https://devs.new)',
        ...options.headers,
      },
    }

    const req = protocol.request(requestOptions, (res) => {
      const chunks = []
      res.on('data', (chunk) => chunks.push(chunk))
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: Buffer.concat(chunks),
        })
      })
      res.on('error', reject)
    })

    req.on('error', reject)
    req.setTimeout(30000, () => {
      req.destroy()
      reject(new Error('Request timeout'))
    })

    // Write body for POST/PUT/PATCH requests
    if (options.body) {
      req.write(options.body)
    }

    req.end()
  })
}

/**
 * Handle incoming HTTP requests.
 * Privacy-first: No logging of request details.
 */
async function handleRequest(req, res) {
  const reqUrl = req.url || ''
  const origin = req.headers.origin

  // Health check endpoint
  if (reqUrl === '/health' || reqUrl === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ status: 'ok', service: 'devs-proxy' }))
    return
  }

  // Only handle requests to the cors proxy endpoint
  if (!reqUrl.startsWith(PROXY_PATH)) {
    res.writeHead(404, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Not found' }))
    return
  }

  // Validate origin (silently reject - no logging for privacy)
  if (!isAllowedOrigin(origin)) {
    res.writeHead(403, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Forbidden: Invalid origin' }))
    return
  }

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    })
    res.end()
    return
  }

  // Parse the URL parameter
  const queryString = reqUrl.slice(PROXY_PATH.length)
  const urlParams = new URLSearchParams(queryString)
  const targetUrl = urlParams.get('url')

  if (!targetUrl) {
    res.writeHead(400, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Missing url parameter' }))
    return
  }

  // Validate target URL
  try {
    new URL(targetUrl)
  } catch {
    res.writeHead(400, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Invalid target URL' }))
    return
  }

  try {
    // Collect request body for POST/PUT/PATCH requests
    let body
    if (
      req.method === 'POST' ||
      req.method === 'PUT' ||
      req.method === 'PATCH'
    ) {
      const chunks = []
      for await (const chunk of req) {
        chunks.push(chunk)
      }
      body = Buffer.concat(chunks)
    }

    // Build headers to forward
    const forwardHeaders = {}
    if (req.headers['content-type']) {
      forwardHeaders['Content-Type'] = req.headers['content-type']
    }
    if (req.headers['authorization']) {
      forwardHeaders['Authorization'] = req.headers['authorization']
    }
    if (body) {
      forwardHeaders['Content-Length'] = body.length
    }

    const response = await fetchUrl(targetUrl, {
      method: req.method,
      body,
      headers: forwardHeaders,
    })

    // Build response headers
    const responseHeaders = {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }

    // Forward response headers (excluding hop-by-hop)
    for (const [key, value] of Object.entries(response.headers)) {
      if (!HOP_BY_HOP_HEADERS.has(key.toLowerCase()) && value) {
        responseHeaders[key] = Array.isArray(value) ? value.join(', ') : value
      }
    }

    res.writeHead(response.status, responseHeaders)
    res.end(response.body)
  } catch {
    // Generic error response - no details logged for privacy
    const errorHeaders = { 'Content-Type': 'application/json' }
    if (origin) {
      errorHeaders['Access-Control-Allow-Origin'] = origin
    }
    res.writeHead(500, errorHeaders)
    res.end(JSON.stringify({ error: 'Proxy error' }))
  }
}

// Create and start server
const server = http.createServer(handleRequest)

server.listen(PORT, HOST)

// Graceful shutdown (silent - no logging)
process.on('SIGTERM', () => {
  server.close(() => process.exit(0))
})

process.on('SIGINT', () => {
  server.close(() => process.exit(0))
})
