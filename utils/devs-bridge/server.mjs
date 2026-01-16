#!/usr/bin/env node
/**
 * DEVS Bridge Server
 *
 * HTTP proxy for OAuth token exchange and external API calls.
 * Keeps client secrets server-side and avoids CORS issues.
 *
 * Run with: ./server.mjs
 */
import http from 'node:http'
import winston from 'winston'

const HOST = process.env.HOST || '0.0.0.0'
const PORT = process.env.PORT || 4445
const LOG_LEVEL = process.env.LOG_LEVEL || 'info'

// OAuth secrets (only needed server-side)
const NOTION_CLIENT_ID = process.env.NOTION_CLIENT_ID || ''
const NOTION_CLIENT_SECRET = process.env.NOTION_CLIENT_SECRET || ''
const QONTO_CLIENT_ID = process.env.QONTO_CLIENT_ID || ''
const QONTO_CLIENT_SECRET = process.env.QONTO_CLIENT_SECRET || ''
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || ''
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || ''
const MICROSOFT_CLIENT_ID = process.env.MICROSOFT_CLIENT_ID || ''
const MICROSOFT_CLIENT_SECRET = process.env.MICROSOFT_CLIENT_SECRET || ''
const SLACK_CLIENT_ID = process.env.SLACK_CLIENT_ID || ''
const SLACK_CLIENT_SECRET = process.env.SLACK_CLIENT_SECRET || ''
const FIGMA_CLIENT_ID = process.env.FIGMA_CLIENT_ID || ''
const FIGMA_CLIENT_SECRET = process.env.FIGMA_CLIENT_SECRET || ''
const DROPBOX_CLIENT_ID = process.env.DROPBOX_CLIENT_ID || ''
const DROPBOX_CLIENT_SECRET = process.env.DROPBOX_CLIENT_SECRET || ''

// CORS headers for browser requests
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Notion-Version',
}

// Configure winston logger
const logger = winston.createLogger({
  level: LOG_LEVEL,
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.simple(),
  ),
  transports: [new winston.transports.Console()],
})

/**
 * Proxy an HTTP request to a target URL
 */
async function proxyRequest(req, res, targetUrl, options = {}) {
  try {
    // Read request body if present
    let body = null
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      const chunks = []
      for await (const chunk of req) {
        chunks.push(chunk)
      }
      body = Buffer.concat(chunks)
    }

    // Build headers, forwarding most from original request
    const headers = { ...options.headers }
    if (req.headers['content-type']) {
      headers['Content-Type'] = req.headers['content-type']
    }
    if (req.headers['authorization'] && !options.headers?.['Authorization']) {
      headers['Authorization'] = req.headers['authorization']
    }
    if (req.headers['notion-version']) {
      headers['Notion-Version'] = req.headers['notion-version']
    }

    logger.debug(`Proxying ${req.method} ${targetUrl}`)

    const response = await fetch(targetUrl, {
      method: req.method,
      headers,
      body,
    })

    // Forward response
    const responseBody = await response.text()
    res.writeHead(response.status, {
      ...CORS_HEADERS,
      'Content-Type':
        response.headers.get('content-type') || 'application/json',
    })
    res.end(responseBody)
  } catch (err) {
    logger.error(`Proxy error: ${err.message}`)
    res.writeHead(502, CORS_HEADERS)
    res.end(JSON.stringify({ error: 'Proxy error', message: err.message }))
  }
}

/**
 * Handle HTTP requests (proxy routes + health check)
 */
async function handleHttpRequest(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`)
  const path = url.pathname

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS_HEADERS)
    res.end()
    return
  }

  // Health check
  if (path === '/' || path === '/health') {
    res.writeHead(200, { ...CORS_HEADERS, 'Content-Type': 'text/plain' })
    res.end('DEVS Bridge Server')
    return
  }

  // === GOOGLE OAUTH PROXY ===
  if (path.startsWith('/api/google/')) {
    const googlePath = path.replace('/api/google/', '')
    const targetUrl = `https://oauth2.googleapis.com/${googlePath}${url.search}`

    // For token endpoint, inject client credentials into the body
    if (googlePath === 'token' && GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
      logger.info('Google OAuth token request (injecting client credentials)')

      // Read and modify the request body to add client credentials
      const chunks = []
      for await (const chunk of req) {
        chunks.push(chunk)
      }
      const originalBody = Buffer.concat(chunks).toString()
      const params = new URLSearchParams(originalBody)
      params.set('client_id', GOOGLE_CLIENT_ID)
      params.set('client_secret', GOOGLE_CLIENT_SECRET)

      try {
        const response = await fetch(targetUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: params.toString(),
        })
        const responseBody = await response.text()
        res.writeHead(response.status, {
          ...CORS_HEADERS,
          'Content-Type':
            response.headers.get('content-type') || 'application/json',
        })
        res.end(responseBody)
        return
      } catch (err) {
        logger.error(`Google proxy error: ${err.message}`)
        res.writeHead(502, CORS_HEADERS)
        res.end(JSON.stringify({ error: 'Proxy error', message: err.message }))
        return
      }
    }

    return proxyRequest(req, res, targetUrl)
  }

  // === NOTION PROXY ===
  if (path.startsWith('/api/notion/')) {
    const notionPath = path.replace('/api/notion/', '')
    const targetUrl = `https://api.notion.com/v1/${notionPath}${url.search}`

    // Special handling for OAuth token endpoint - add Basic Auth
    const options = {}
    if (
      notionPath === 'oauth/token' &&
      NOTION_CLIENT_ID &&
      NOTION_CLIENT_SECRET
    ) {
      const credentials = Buffer.from(
        `${NOTION_CLIENT_ID}:${NOTION_CLIENT_SECRET}`,
      ).toString('base64')
      options.headers = { Authorization: `Basic ${credentials}` }
      logger.info('Notion OAuth token request (adding Basic Auth)')
    }

    return proxyRequest(req, res, targetUrl, options)
  }

  // === QONTO PROXY ===
  if (path.startsWith('/api/qonto/')) {
    let targetUrl
    const options = {}

    if (path.startsWith('/api/qonto/oauth/')) {
      // OAuth endpoints
      const oauthPath = path.replace('/api/qonto/oauth/', '')
      targetUrl = `https://oauth.qonto.com/${oauthPath}${url.search}`

      // For token endpoint, inject client credentials into the body (client_secret_post)
      if (oauthPath.includes('token')) {
        logger.info('Qonto OAuth token request detected')
        logger.debug(`QONTO_CLIENT_ID set: ${!!QONTO_CLIENT_ID}`)
        logger.debug(`QONTO_CLIENT_SECRET set: ${!!QONTO_CLIENT_SECRET}`)

        if (!QONTO_CLIENT_ID || !QONTO_CLIENT_SECRET) {
          logger.error('Qonto OAuth credentials not configured!')
          res.writeHead(500, CORS_HEADERS)
          res.end(
            JSON.stringify({
              error: 'Server misconfiguration: Qonto credentials not set',
            }),
          )
          return
        }

        logger.info(
          'Qonto OAuth token request (injecting client credentials via client_secret_post)',
        )

        // Read and modify the request body to add client credentials
        const chunks = []
        for await (const chunk of req) {
          chunks.push(chunk)
        }
        const originalBody = Buffer.concat(chunks).toString()
        logger.debug(`Original body: ${originalBody}`)

        const params = new URLSearchParams(originalBody)
        params.set('client_id', QONTO_CLIENT_ID)
        params.set('client_secret', QONTO_CLIENT_SECRET)

        logger.debug(`Target URL: ${targetUrl}`)
        logger.debug(`Modified body params: ${[...params.keys()].join(', ')}`)

        try {
          const response = await fetch(targetUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params.toString(),
          })
          const responseBody = await response.text()
          logger.debug(`Qonto response status: ${response.status}`)
          logger.debug(`Qonto response: ${responseBody.substring(0, 200)}...`)

          res.writeHead(response.status, {
            ...CORS_HEADERS,
            'Content-Type':
              response.headers.get('content-type') || 'application/json',
          })
          res.end(responseBody)
          return
        } catch (err) {
          logger.error(`Qonto proxy error: ${err.message}`)
          res.writeHead(502, CORS_HEADERS)
          res.end(
            JSON.stringify({ error: 'Proxy error', message: err.message }),
          )
          return
        }
      }
    } else if (path.startsWith('/api/qonto/v2/')) {
      // API endpoints
      const apiPath = path.replace('/api/qonto/', '')
      targetUrl = `https://thirdparty.qonto.com/${apiPath}${url.search}`
    } else {
      res.writeHead(404, CORS_HEADERS)
      res.end(JSON.stringify({ error: 'Unknown Qonto endpoint' }))
      return
    }

    return proxyRequest(req, res, targetUrl, options)
  }

  // === SLACK PROXY ===
  if (path.startsWith('/api/slack/')) {
    const slackPath = path.replace('/api/slack/', '')
    const targetUrl = `https://slack.com/api/${slackPath}${url.search}`

    // For OAuth token endpoint, inject client credentials into the body
    if (
      slackPath === 'oauth.v2.access' &&
      SLACK_CLIENT_ID &&
      SLACK_CLIENT_SECRET
    ) {
      logger.info('Slack OAuth token request (injecting client credentials)')

      // Read and modify the request body to add client credentials
      const chunks = []
      for await (const chunk of req) {
        chunks.push(chunk)
      }
      const originalBody = Buffer.concat(chunks).toString()
      const params = new URLSearchParams(originalBody)
      params.set('client_id', SLACK_CLIENT_ID)
      params.set('client_secret', SLACK_CLIENT_SECRET)

      try {
        const response = await fetch(targetUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: params.toString(),
        })
        const responseBody = await response.text()
        res.writeHead(response.status, {
          ...CORS_HEADERS,
          'Content-Type':
            response.headers.get('content-type') || 'application/json',
        })
        res.end(responseBody)
        return
      } catch (err) {
        logger.error(`Slack proxy error: ${err.message}`)
        res.writeHead(502, CORS_HEADERS)
        res.end(JSON.stringify({ error: 'Proxy error', message: err.message }))
        return
      }
    }

    return proxyRequest(req, res, targetUrl)
  }

  // === MICROSOFT OAUTH PROXY ===
  if (path.startsWith('/api/microsoft/')) {
    const msPath = path.replace('/api/microsoft/', '')
    const targetUrl = `https://login.microsoftonline.com/common/${msPath}${url.search}`

    // For token endpoint, inject client credentials into the body
    if (
      msPath === 'oauth2/v2.0/token' &&
      MICROSOFT_CLIENT_ID &&
      MICROSOFT_CLIENT_SECRET
    ) {
      logger.info(
        'Microsoft OAuth token request (injecting client credentials)',
      )

      // Read and modify the request body to add client credentials
      const chunks = []
      for await (const chunk of req) {
        chunks.push(chunk)
      }
      const originalBody = Buffer.concat(chunks).toString()
      const params = new URLSearchParams(originalBody)
      params.set('client_id', MICROSOFT_CLIENT_ID)
      params.set('client_secret', MICROSOFT_CLIENT_SECRET)

      try {
        const response = await fetch(targetUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: params.toString(),
        })
        const responseBody = await response.text()
        res.writeHead(response.status, {
          ...CORS_HEADERS,
          'Content-Type':
            response.headers.get('content-type') || 'application/json',
        })
        res.end(responseBody)
        return
      } catch (err) {
        logger.error(`Microsoft proxy error: ${err.message}`)
        res.writeHead(502, CORS_HEADERS)
        res.end(JSON.stringify({ error: 'Proxy error', message: err.message }))
        return
      }
    }

    return proxyRequest(req, res, targetUrl)
  }

  // === FIGMA PROXY ===
  if (path.startsWith('/api/figma/')) {
    const figmaPath = path.replace('/api/figma/', '')
    const targetUrl = `https://api.figma.com/v1/${figmaPath}${url.search}`

    // For OAuth token and refresh endpoints, add Basic Auth with client credentials
    if (
      (figmaPath === 'oauth/token' || figmaPath === 'oauth/refresh') &&
      FIGMA_CLIENT_ID &&
      FIGMA_CLIENT_SECRET
    ) {
      logger.info(`Figma OAuth ${figmaPath} request (adding Basic Auth)`)

      const credentials = Buffer.from(
        `${FIGMA_CLIENT_ID}:${FIGMA_CLIENT_SECRET}`,
      ).toString('base64')

      // Read the request body
      const chunks = []
      for await (const chunk of req) {
        chunks.push(chunk)
      }
      const originalBody = Buffer.concat(chunks).toString()

      try {
        const response = await fetch(targetUrl, {
          method: 'POST',
          headers: {
            Authorization: `Basic ${credentials}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: originalBody,
        })
        const responseBody = await response.text()
        res.writeHead(response.status, {
          ...CORS_HEADERS,
          'Content-Type':
            response.headers.get('content-type') || 'application/json',
        })
        res.end(responseBody)
        return
      } catch (err) {
        logger.error(`Figma proxy error: ${err.message}`)
        res.writeHead(502, CORS_HEADERS)
        res.end(JSON.stringify({ error: 'Proxy error', message: err.message }))
        return
      }
    }

    return proxyRequest(req, res, targetUrl)
  }

  // === DROPBOX OAUTH PROXY ===
  if (path.startsWith('/api/dropbox/')) {
    const dropboxPath = path.replace('/api/dropbox/', '')
    const targetUrl = `https://api.dropboxapi.com/${dropboxPath}${url.search}`

    // For token endpoint, inject client credentials into the body
    if (
      dropboxPath === 'oauth2/token' &&
      DROPBOX_CLIENT_ID &&
      DROPBOX_CLIENT_SECRET
    ) {
      logger.info('Dropbox OAuth token request (injecting client credentials)')

      // Read and modify the request body to add client credentials
      const chunks = []
      for await (const chunk of req) {
        chunks.push(chunk)
      }
      const originalBody = Buffer.concat(chunks).toString()
      const params = new URLSearchParams(originalBody)
      params.set('client_id', DROPBOX_CLIENT_ID)
      params.set('client_secret', DROPBOX_CLIENT_SECRET)

      try {
        const response = await fetch(targetUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: params.toString(),
        })
        const responseBody = await response.text()
        res.writeHead(response.status, {
          ...CORS_HEADERS,
          'Content-Type':
            response.headers.get('content-type') || 'application/json',
        })
        res.end(responseBody)
        return
      } catch (err) {
        logger.error(`Dropbox proxy error: ${err.message}`)
        res.writeHead(502, CORS_HEADERS)
        res.end(JSON.stringify({ error: 'Proxy error', message: err.message }))
        return
      }
    }

    return proxyRequest(req, res, targetUrl)
  }

  // Unknown route
  res.writeHead(404, CORS_HEADERS)
  res.end(JSON.stringify({ error: 'Not found' }))
}

const server = http.createServer(handleHttpRequest)

const start = () => {
  server.listen(PORT, HOST, () => {
    logger.info(`DEVS Bridge running on http://${HOST}:${PORT}`)
    logger.info(`  - Google proxy: /api/google/*`)
    logger.info(`  - Notion proxy: /api/notion/*`)
    logger.info(`  - Qonto proxy: /api/qonto/*`)
    logger.info(`  - Slack proxy: /api/slack/*`)
    logger.info(`  - Microsoft proxy: /api/microsoft/*`)
    logger.info(`  - Figma proxy: /api/figma/*`)
    logger.info(`  - Dropbox proxy: /api/dropbox/*`)
  })
}

server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') {
    logger.error('Address in use, retrying…')
    setTimeout(() => {
      server.close()
      start()
    }, 1000)
  }
})

start()
