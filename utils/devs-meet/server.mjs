#!/usr/bin/env node
/**
 * DEVS Meeting Bot Server
 *
 * A WebSocket server that bridges DEVS browser agents with Google Meet.
 * The "brain" (agent logic, LLM calls) stays in the browser.
 * This server is just the "body" that joins meetings and relays audio/transcripts.
 */
import http from 'node:http'
import winston from 'winston'
import { WebSocketServer, WebSocket } from 'ws'
import { MeetingBot } from './meet-bot.mjs'

const HOST = process.env.HOST || '0.0.0.0'
const PORT = process.env.PORT || 4445
const LOG_LEVEL = process.env.LOG_LEVEL || 'info'

// Configure winston logger
const logger = winston.createLogger({
  level: LOG_LEVEL,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.colorize(),
    winston.format.printf(({ timestamp, level, message }) => {
      return `${timestamp} ${level}: ${message}`
    }),
  ),
  transports: [new winston.transports.Console()],
})

// Active meeting sessions: sessionId -> { bot, clients }
const sessions = new Map()

const server = http.createServer((req, res) => {
  // Health check endpoint
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(
      JSON.stringify({
        status: 'ok',
        activeSessions: sessions.size,
        uptime: process.uptime(),
      }),
    )
    return
  }

  // List active sessions (for debugging)
  if (req.url === '/sessions') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(
      JSON.stringify({
        sessions: Array.from(sessions.keys()),
      }),
    )
    return
  }

  res.writeHead(200)
  res.end('DEVS Meeting Bot Server - Connect via WebSocket')
})

const wss = new WebSocketServer({ server })

wss.on('connection', async (ws, req) => {
  const url = new URL(req.url, `http://${req.headers.host}`)
  const sessionId = url.pathname.slice(1) || `session-${Date.now()}`

  logger.info(`New connection for session: ${sessionId}`)

  // Send connection acknowledgment
  sendMessage(ws, { type: 'connected', sessionId })

  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data.toString())
      await handleMessage(ws, sessionId, message)
    } catch (err) {
      logger.error(`Failed to parse message: ${err.message}`)
      sendMessage(ws, { type: 'error', error: 'Invalid message format' })
    }
  })

  ws.on('close', () => {
    logger.info(`Client disconnected from session: ${sessionId}`)
    cleanupSession(sessionId, ws)
  })

  ws.on('error', (err) => {
    logger.error(`WebSocket error in session ${sessionId}: ${err.message}`)
  })
})

/**
 * Handle incoming messages from DEVS browser
 */
async function handleMessage(ws, sessionId, message) {
  logger.debug(`Received message: ${JSON.stringify(message)}`)

  switch (message.type) {
    case 'join': {
      await handleJoin(ws, sessionId, message)
      break
    }

    case 'leave': {
      await handleLeave(sessionId)
      break
    }

    case 'speak': {
      await handleSpeak(sessionId, message)
      break
    }

    case 'chat': {
      await handleChat(sessionId, message)
      break
    }

    case 'react': {
      await handleReact(sessionId, message)
      break
    }

    case 'ping': {
      sendMessage(ws, { type: 'pong', timestamp: Date.now() })
      break
    }

    default:
      logger.warn(`Unknown message type: ${message.type}`)
      sendMessage(ws, {
        type: 'error',
        error: `Unknown message type: ${message.type}`,
      })
  }
}

/**
 * Join a Google Meet meeting
 */
async function handleJoin(ws, sessionId, message) {
  const { meetingUrl, botName, googleAuthToken } = message

  if (!meetingUrl) {
    sendMessage(ws, { type: 'error', error: 'meetingUrl is required' })
    return
  }

  // Check if session already exists
  if (sessions.has(sessionId)) {
    sendMessage(ws, { type: 'error', error: 'Session already active' })
    return
  }

  logger.info(`Joining meeting: ${meetingUrl} as "${botName || 'DEVS Agent'}"`)

  try {
    const bot = new MeetingBot({
      sessionId,
      meetingUrl,
      botName: botName || 'DEVS Agent',
      googleAuthToken,
      logger,
      onTranscript: (data) =>
        broadcastToSession(sessionId, { type: 'transcript', ...data }),
      onChat: (data) =>
        broadcastToSession(sessionId, { type: 'chat_message', ...data }),
      onParticipant: (data) =>
        broadcastToSession(sessionId, { type: 'participant', ...data }),
      onStatus: (data) =>
        broadcastToSession(sessionId, { type: 'status', ...data }),
      onError: (error) =>
        broadcastToSession(sessionId, { type: 'error', error }),
    })

    sessions.set(sessionId, { bot, clients: new Set([ws]) })

    await bot.join()

    sendMessage(ws, { type: 'joined', sessionId, meetingUrl })
  } catch (err) {
    logger.error(`Failed to join meeting: ${err.message}`)
    sendMessage(ws, { type: 'error', error: `Failed to join: ${err.message}` })
    sessions.delete(sessionId)
  }
}

/**
 * Leave the meeting
 */
async function handleLeave(sessionId) {
  const session = sessions.get(sessionId)
  if (!session) {
    logger.warn(`No active session: ${sessionId}`)
    return
  }

  logger.info(`Leaving meeting for session: ${sessionId}`)

  try {
    await session.bot.leave()
  } catch (err) {
    logger.error(`Error leaving meeting: ${err.message}`)
  }

  broadcastToSession(sessionId, { type: 'left', sessionId })
  sessions.delete(sessionId)
}

/**
 * Speak text in the meeting (TTS)
 */
async function handleSpeak(sessionId, message) {
  const session = sessions.get(sessionId)
  if (!session) {
    logger.warn(`No active session for speak: ${sessionId}`)
    return
  }

  const { text, audioBase64 } = message

  try {
    if (audioBase64) {
      // Play pre-generated audio
      await session.bot.playAudio(audioBase64)
    } else if (text) {
      // Use browser's built-in TTS or inject text
      await session.bot.speak(text)
    }
    broadcastToSession(sessionId, { type: 'spoke', text })
  } catch (err) {
    logger.error(`Failed to speak: ${err.message}`)
    broadcastToSession(sessionId, {
      type: 'error',
      error: `Failed to speak: ${err.message}`,
    })
  }
}

/**
 * Send a chat message in the meeting
 */
async function handleChat(sessionId, message) {
  const session = sessions.get(sessionId)
  if (!session) return

  try {
    await session.bot.sendChat(message.text)
    broadcastToSession(sessionId, { type: 'chat_sent', text: message.text })
  } catch (err) {
    logger.error(`Failed to send chat: ${err.message}`)
  }
}

/**
 * Send a reaction emoji
 */
async function handleReact(sessionId, message) {
  const session = sessions.get(sessionId)
  if (!session) return

  try {
    await session.bot.react(message.emoji)
    broadcastToSession(sessionId, { type: 'reacted', emoji: message.emoji })
  } catch (err) {
    logger.error(`Failed to react: ${err.message}`)
  }
}

/**
 * Broadcast message to all clients in a session
 */
function broadcastToSession(sessionId, message) {
  const session = sessions.get(sessionId)
  if (!session) return

  session.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      sendMessage(client, message)
    }
  })
}

/**
 * Send a JSON message to a WebSocket client
 */
function sendMessage(ws, message) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message))
  }
}

/**
 * Cleanup session when client disconnects
 */
function cleanupSession(sessionId, ws) {
  const session = sessions.get(sessionId)
  if (!session) return

  session.clients.delete(ws)

  // If no more clients, leave the meeting
  if (session.clients.size === 0) {
    logger.info(`No clients remaining, leaving meeting: ${sessionId}`)
    session.bot.leave().catch((err) => {
      logger.error(`Error during cleanup leave: ${err.message}`)
    })
    sessions.delete(sessionId)
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, shutting down...')

  // Leave all meetings
  for (const [sessionId, session] of sessions) {
    try {
      await session.bot.leave()
    } catch (err) {
      logger.error(`Error leaving session ${sessionId}: ${err.message}`)
    }
  }

  server.close(() => {
    logger.info('Server closed')
    process.exit(0)
  })
})

server.listen(PORT, HOST, () => {
  logger.info(`DEVS Meeting Bot server running on ws://${HOST}:${PORT}`)
  logger.info(`Health check: http://${HOST}:${PORT}/health`)
})
