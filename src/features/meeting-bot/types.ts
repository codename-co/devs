/**
 * Meeting Bot Types
 */

/**
 * Status of the meeting bot connection
 */
export type MeetingBotStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'joining'
  | 'waiting'
  | 'joined'
  | 'leaving'
  | 'error'

/**
 * A transcript entry from the meeting
 */
export interface TranscriptEntry {
  id: string
  speaker: string
  text: string
  timestamp: Date
  isAgent?: boolean
}

/**
 * A participant in the meeting
 */
export interface MeetingParticipant {
  id: string
  name: string
  joinedAt: Date
  leftAt?: Date
}

/**
 * Meeting session state
 */
export interface MeetingSession {
  id: string
  meetingUrl: string
  agentId: string
  agentName: string
  status: MeetingBotStatus
  connectedAt?: Date
  joinedAt?: Date
  participants: MeetingParticipant[]
  transcript: TranscriptEntry[]
  errorMessage?: string
}

/**
 * Messages sent to the meeting bot server
 */
export type MeetingBotClientMessage =
  | { type: 'join'; meetingUrl: string; botName: string; googleAuthToken?: unknown }
  | { type: 'leave' }
  | { type: 'speak'; text?: string; audioBase64?: string }
  | { type: 'chat'; text: string }
  | { type: 'react'; emoji: string }
  | { type: 'ping' }

/**
 * Messages received from the meeting bot server
 */
export type MeetingBotServerMessage =
  | { type: 'connected'; sessionId: string }
  | { type: 'joined'; sessionId: string; meetingUrl: string }
  | { type: 'left'; sessionId: string }
  | { type: 'transcript'; speaker: string; text: string; timestamp: number; sessionId: string }
  | { type: 'chat_message'; sender: string; text: string; timestamp: number }
  | { type: 'chat_sent'; text: string }
  | { type: 'participant'; action: 'joined' | 'left'; name: string; id: string; timestamp: number; sessionId: string }
  | { type: 'status'; status: string; message: string }
  | { type: 'spoke'; text: string }
  | { type: 'reacted'; emoji: string }
  | { type: 'pong'; timestamp: number }
  | { type: 'error'; error: string }

/**
 * Configuration for the meeting bot
 */
export interface MeetingBotConfig {
  serverUrl: string
  agentId: string
  agentName: string
  onTranscript?: (entry: TranscriptEntry) => void
  onParticipantChange?: (participant: MeetingParticipant, action: 'joined' | 'left') => void
  onStatusChange?: (status: MeetingBotStatus, message?: string) => void
  onError?: (error: string) => void
}
