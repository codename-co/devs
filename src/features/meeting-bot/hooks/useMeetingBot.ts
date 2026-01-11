/**
 * useMeetingBot Hook
 *
 * React hook for managing the meeting bot connection and state.
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { MeetingBotBridge } from '../meet-bridge'
import type {
  MeetingBotStatus,
  TranscriptEntry,
  MeetingParticipant,
  MeetingSession,
} from '../types'

export interface UseMeetingBotOptions {
  serverUrl?: string
  agentId: string
  agentName: string
  onTranscript?: (entry: TranscriptEntry) => void
  onAgentShouldRespond?: (entry: TranscriptEntry) => Promise<string | null>
}

export interface UseMeetingBotReturn {
  status: MeetingBotStatus
  session: MeetingSession | null
  transcript: TranscriptEntry[]
  participants: MeetingParticipant[]
  errorMessage: string | null
  connect: () => Promise<void>
  disconnect: () => void
  joinMeeting: (meetingUrl: string, googleAuthToken?: unknown) => Promise<void>
  leaveMeeting: () => void
  speak: (text: string) => void
  sendChat: (text: string) => void
  react: (emoji: string) => void
}

/**
 * Hook for managing meeting bot connection and interactions
 */
export function useMeetingBot(
  options: UseMeetingBotOptions,
): UseMeetingBotReturn {
  const [status, setStatus] = useState<MeetingBotStatus>('disconnected')
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([])
  const [participants, setParticipants] = useState<MeetingParticipant[]>([])
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [session, setSession] = useState<MeetingSession | null>(null)

  const bridgeRef = useRef<MeetingBotBridge | null>(null)

  // Initialize bridge
  useEffect(() => {
    bridgeRef.current = new MeetingBotBridge({
      serverUrl: options.serverUrl,
      agentId: options.agentId,
      agentName: options.agentName,
      onTranscript: (entry) => {
        setTranscript((prev) => [...prev, entry])
        options.onTranscript?.(entry)

        // Check if agent should respond
        if (!entry.isAgent && options.onAgentShouldRespond) {
          options.onAgentShouldRespond(entry).then((response) => {
            if (response && bridgeRef.current) {
              // Send response via chat (safer than TTS for now)
              bridgeRef.current.sendChat(response)

              // Add agent response to transcript
              setTranscript((prev) => [
                ...prev,
                {
                  id: `agent-${Date.now()}`,
                  speaker: options.agentName,
                  text: response,
                  timestamp: new Date(),
                  isAgent: true,
                },
              ])
            }
          })
        }
      },
      onParticipantChange: (participant, action) => {
        if (action === 'joined') {
          setParticipants((prev) => [...prev, participant])
        } else {
          setParticipants((prev) =>
            prev.map((p) =>
              p.id === participant.id
                ? { ...p, leftAt: participant.leftAt }
                : p,
            ),
          )
        }
      },
      onStatusChange: (newStatus, message) => {
        setStatus(newStatus)
        if (message) {
          setSession((prev) => (prev ? { ...prev, status: newStatus } : null))
        }
        if (newStatus === 'error') {
          setErrorMessage(message || 'Unknown error')
        } else {
          setErrorMessage(null)
        }
      },
      onError: (error) => {
        setErrorMessage(error)
      },
    })

    return () => {
      bridgeRef.current?.disconnect()
    }
  }, [options.serverUrl, options.agentId, options.agentName])

  const connect = useCallback(async () => {
    if (!bridgeRef.current) return
    await bridgeRef.current.connect()
  }, [])

  const disconnect = useCallback(() => {
    bridgeRef.current?.disconnect()
    setSession(null)
    setTranscript([])
    setParticipants([])
  }, [])

  const joinMeeting = useCallback(
    async (meetingUrl: string, googleAuthToken?: unknown) => {
      if (!bridgeRef.current) return

      // Create session
      const newSession: MeetingSession = {
        id: bridgeRef.current.getSessionId() || `session-${Date.now()}`,
        meetingUrl,
        agentId: options.agentId,
        agentName: options.agentName,
        status: 'joining',
        connectedAt: new Date(),
        participants: [],
        transcript: [],
      }
      setSession(newSession)

      // Reset state
      setTranscript([])
      setParticipants([])

      await bridgeRef.current.joinMeeting(meetingUrl, googleAuthToken)
    },
    [options.agentId, options.agentName],
  )

  const leaveMeeting = useCallback(() => {
    bridgeRef.current?.leaveMeeting()
  }, [])

  const speak = useCallback((text: string) => {
    bridgeRef.current?.speak(text)
  }, [])

  const sendChat = useCallback((text: string) => {
    bridgeRef.current?.sendChat(text)
  }, [])

  const react = useCallback((emoji: string) => {
    bridgeRef.current?.react(emoji)
  }, [])

  return {
    status,
    session,
    transcript,
    participants,
    errorMessage,
    connect,
    disconnect,
    joinMeeting,
    leaveMeeting,
    speak,
    sendChat,
    react,
  }
}
