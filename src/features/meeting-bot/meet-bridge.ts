/**
 * Meeting Bot Bridge
 *
 * WebSocket bridge between DEVS browser and the devs-meet server.
 * Handles connection management, message passing, and reconnection.
 */

import type {
  MeetingBotConfig,
  MeetingBotStatus,
  MeetingBotClientMessage,
  MeetingBotServerMessage,
  TranscriptEntry,
  MeetingParticipant,
} from './types'

/**
 * Default devs-meet server URL
 */
const DEFAULT_SERVER_URL = 'ws://localhost:4445'

/**
 * Reconnection configuration
 */
const RECONNECT_DELAY_MS = 3000
const MAX_RECONNECT_ATTEMPTS = 5
const PING_INTERVAL_MS = 30000

/**
 * MeetingBotBridge - Manages WebSocket connection to devs-meet server
 */
export class MeetingBotBridge {
  private ws: WebSocket | null = null
  private config: MeetingBotConfig
  private sessionId: string | null = null
  private status: MeetingBotStatus = 'disconnected'
  private reconnectAttempts = 0
  private pingInterval: ReturnType<typeof setInterval> | null = null
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null

  constructor(
    config: Partial<MeetingBotConfig> &
      Pick<MeetingBotConfig, 'agentId' | 'agentName'>,
  ) {
    this.config = {
      serverUrl: DEFAULT_SERVER_URL,
      ...config,
    }
  }

  /**
   * Get current connection status
   */
  getStatus(): MeetingBotStatus {
    return this.status
  }

  /**
   * Get current session ID
   */
  getSessionId(): string | null {
    return this.sessionId
  }

  /**
   * Connect to the meeting bot server
   */
  async connect(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return
    }

    return new Promise((resolve, reject) => {
      this.setStatus('connecting')

      const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      const url = `${this.config.serverUrl}/${sessionId}`

      try {
        this.ws = new WebSocket(url)
      } catch (err) {
        this.setStatus('error', 'Failed to create WebSocket connection')
        reject(err)
        return
      }

      this.ws.onopen = () => {
        this.reconnectAttempts = 0
        this.startPing()
      }

      this.ws.onmessage = (event) => {
        try {
          const message: MeetingBotServerMessage = JSON.parse(event.data)
          this.handleMessage(message)

          // Resolve connect promise when we get connected confirmation
          if (message.type === 'connected') {
            this.sessionId = message.sessionId
            this.setStatus('connected')
            resolve()
          }
        } catch (err) {
          console.error('Failed to parse message:', err)
        }
      }

      this.ws.onerror = (event) => {
        console.error('WebSocket error:', event)
        this.config.onError?.('WebSocket connection error')
      }

      this.ws.onclose = (event) => {
        this.stopPing()

        if (event.wasClean) {
          this.setStatus('disconnected')
        } else {
          this.setStatus('error', 'Connection lost')
          this.attemptReconnect()
        }
      }

      // Timeout for initial connection
      setTimeout(() => {
        if (this.status === 'connecting') {
          reject(new Error('Connection timeout'))
          this.ws?.close()
        }
      }, 10000)
    })
  }

  /**
   * Disconnect from the server
   */
  disconnect(): void {
    this.stopPing()
    this.clearReconnectTimeout()

    if (this.ws) {
      this.ws.close(1000, 'Client disconnect')
      this.ws = null
    }

    this.sessionId = null
    this.setStatus('disconnected')
  }

  /**
   * Join a Google Meet meeting
   */
  async joinMeeting(
    meetingUrl: string,
    googleAuthToken?: unknown,
  ): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      await this.connect()
    }

    this.setStatus('joining')

    this.send({
      type: 'join',
      meetingUrl,
      botName: this.config.agentName,
      googleAuthToken,
    })
  }

  /**
   * Leave the current meeting
   */
  leaveMeeting(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return
    }

    this.send({ type: 'leave' })
    this.setStatus('leaving')
  }

  /**
   * Speak text in the meeting (TTS)
   */
  speak(text: string): void {
    this.send({ type: 'speak', text })
  }

  /**
   * Play audio in the meeting
   */
  playAudio(audioBase64: string): void {
    this.send({ type: 'speak', audioBase64 })
  }

  /**
   * Send a chat message in the meeting
   */
  sendChat(text: string): void {
    this.send({ type: 'chat', text })
  }

  /**
   * Send a reaction emoji
   */
  react(emoji: string): void {
    this.send({ type: 'react', emoji })
  }

  /**
   * Handle incoming messages from the server
   */
  private handleMessage(message: MeetingBotServerMessage): void {
    switch (message.type) {
      case 'connected':
        // Handled in connect()
        break

      case 'joined':
        this.setStatus('joined')
        break

      case 'left':
        this.setStatus('disconnected')
        break

      case 'transcript':
        const transcriptEntry: TranscriptEntry = {
          id: `${message.timestamp}-${Math.random().toString(36).substr(2, 9)}`,
          speaker: message.speaker,
          text: message.text,
          timestamp: new Date(message.timestamp),
          isAgent: message.speaker === this.config.agentName,
        }
        this.config.onTranscript?.(transcriptEntry)
        break

      case 'participant':
        const participant: MeetingParticipant = {
          id: message.id,
          name: message.name,
          joinedAt:
            message.action === 'joined'
              ? new Date(message.timestamp)
              : new Date(),
          leftAt:
            message.action === 'left' ? new Date(message.timestamp) : undefined,
        }
        this.config.onParticipantChange?.(participant, message.action)
        break

      case 'status':
        // Map server status to our status type
        const statusMap: Record<string, MeetingBotStatus> = {
          starting: 'connecting',
          navigating: 'connecting',
          'pre-join': 'joining',
          joining: 'joining',
          waiting: 'waiting',
          joined: 'joined',
          leaving: 'leaving',
          left: 'disconnected',
        }
        const mappedStatus = statusMap[message.status] || this.status
        this.setStatus(mappedStatus, message.message)
        break

      case 'error':
        this.setStatus('error', message.error)
        this.config.onError?.(message.error)
        break

      case 'spoke':
      case 'chat_sent':
      case 'chat_message':
      case 'reacted':
      case 'pong':
        // These are acknowledgments, no special handling needed
        break
    }
  }

  /**
   * Send a message to the server
   */
  private send(message: MeetingBotClientMessage): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('Cannot send message: WebSocket not connected')
      return
    }

    this.ws.send(JSON.stringify(message))
  }

  /**
   * Update status and notify callback
   */
  private setStatus(status: MeetingBotStatus, message?: string): void {
    this.status = status
    this.config.onStatusChange?.(status, message)
  }

  /**
   * Start ping interval to keep connection alive
   */
  private startPing(): void {
    this.stopPing()
    this.pingInterval = setInterval(() => {
      this.send({ type: 'ping' })
    }, PING_INTERVAL_MS)
  }

  /**
   * Stop ping interval
   */
  private stopPing(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval)
      this.pingInterval = null
    }
  }

  /**
   * Attempt to reconnect after connection loss
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      this.setStatus('error', 'Max reconnection attempts reached')
      return
    }

    this.reconnectAttempts++
    this.clearReconnectTimeout()

    this.reconnectTimeout = setTimeout(() => {
      console.log(
        `Attempting reconnect (${this.reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`,
      )
      this.connect().catch(() => {
        // Reconnect will be attempted again in onclose
      })
    }, RECONNECT_DELAY_MS)
  }

  /**
   * Clear reconnect timeout
   */
  private clearReconnectTimeout(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = null
    }
  }
}
