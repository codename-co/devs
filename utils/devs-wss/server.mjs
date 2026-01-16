#!/usr/bin/env node
/**
 * DEVS Y-WebSocket Server
 *
 * A minimal WebSocket server for Yjs document synchronization.
 * Run with: ./server.mjs
 */
import http from 'node:http'
import winston from 'winston'
import { WebSocketServer, WebSocket } from 'ws'

const HOST = process.env.HOST || '0.0.0.0'
const PORT = process.env.PORT || 4444
const LOG_LEVEL = process.env.LOG_LEVEL || 'info'

// Configure winston logger
const logger = winston.createLogger({
  level: LOG_LEVEL,
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.simple(),
  ),
  transports: [new winston.transports.Console()],
})

// Store documents and their connections
const docs = new Map()

const server = http.createServer((req, res) => {
  res.writeHead(200)
  res.end('DEVS Y-WebSocket Sync Server')
})

const wss = new WebSocketServer({ server })

wss.on('connection', (ws, req) => {
  const url = new URL(req.url, `http://${req.headers.host}`)
  const roomName = url.pathname.slice(1) || 'default'

  logger.info(`New connection to room: ${roomName}`)

  // Get or create room
  if (!docs.has(roomName)) {
    docs.set(roomName, {
      clients: new Set(),
      state: null, // Store latest state
    })
  }

  const room = docs.get(roomName)
  room.clients.add(ws)

  logger.info(`Room ${roomName} now has ${room.clients.size} clients`)

  // Send current state to new client if we have one
  if (room.state) {
    logger.debug(
      `Sending existing state to new client (${room.state.length} bytes)`,
    )
    ws.send(room.state)
  }

  ws.on('message', (message) => {
    // Store the state
    room.state = message

    logger.debug(
      `Broadcasting message to ${room.clients.size - 1} other clients (${message.length} bytes)`,
    )

    // Broadcast to all other clients in the room
    room.clients.forEach((client) => {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(message)
      }
    })
  })

  ws.on('close', () => {
    room.clients.delete(ws)
    logger.info(
      `Client disconnected from room ${roomName}. ${room.clients.size} clients remaining`,
    )

    // Clean up empty rooms
    if (room.clients.size === 0) {
      docs.delete(roomName)
      logger.debug(`Room ${roomName} deleted (empty)`)
    }
  })

  ws.on('error', (err) => {
    logger.error(`WebSocket error: ${err.message}`)
  })
})

const start = () => {
  server.listen(PORT, HOST, () => {
    logger.info(`DEVS Y-WebSocket server running on ws://${HOST}:${PORT}`)
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
