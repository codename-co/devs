/**
 * useMeetingSession Hook
 *
 * React hook for managing meeting sessions with Google Meet connector integration.
 */

import { useState, useCallback, useEffect } from 'react'
import { useConnectorStore } from '@/stores/connectorStore'
import { useMeetingBot, type UseMeetingBotOptions } from './useMeetingBot'
import type { MeetMeetingInfo } from '@/features/connectors/providers/apps/google-meet'

export interface UseMeetingSessionOptions extends Omit<UseMeetingBotOptions, 'agentId' | 'agentName'> {
  agentId: string
  agentName: string
}

export interface UseMeetingSessionReturn extends ReturnType<typeof useMeetingBot> {
  upcomingMeetings: MeetMeetingInfo[]
  loadingMeetings: boolean
  connectorConnected: boolean
  refreshMeetings: () => Promise<void>
  joinMeetingWithAuth: (meeting: MeetMeetingInfo) => Promise<void>
}

/**
 * Hook for managing meeting sessions with full Google Meet connector integration
 */
export function useMeetingSession(options: UseMeetingSessionOptions): UseMeetingSessionReturn {
  const [upcomingMeetings, setUpcomingMeetings] = useState<MeetMeetingInfo[]>([])
  const [loadingMeetings, setLoadingMeetings] = useState(false)

  const { connectors } = useConnectorStore()

  // Find Google Meet connector
  const meetConnector = connectors.find((c) => c.provider === 'google-meet' && c.status === 'connected')
  const connectorConnected = !!meetConnector

  // Initialize meeting bot hook
  const meetingBot = useMeetingBot(options)

  // Load upcoming meetings when connector is available
  const refreshMeetings = useCallback(async () => {
    if (!meetConnector) {
      setUpcomingMeetings([])
      return
    }

    setLoadingMeetings(true)

    try {
      // Dynamically import the provider
      const { GoogleMeetProvider } = await import('@/features/connectors/providers/apps/google-meet')
      const provider = new GoogleMeetProvider()

      const meetings = await provider.listUpcomingMeetings(meetConnector, 10)
      setUpcomingMeetings(meetings)
    } catch (error) {
      console.error('Failed to load upcoming meetings:', error)
      setUpcomingMeetings([])
    } finally {
      setLoadingMeetings(false)
    }
  }, [meetConnector])

  // Load meetings on connector change
  useEffect(() => {
    if (connectorConnected) {
      refreshMeetings()
    }
  }, [connectorConnected, refreshMeetings])

  // Join meeting with authentication from connector
  const joinMeetingWithAuth = useCallback(
    async (meeting: MeetMeetingInfo) => {
      if (!meetConnector) {
        throw new Error('Google Meet connector not connected')
      }

      try {
        // Get auth data from connector
        const { GoogleMeetProvider } = await import('@/features/connectors/providers/apps/google-meet')
        const provider = new GoogleMeetProvider()

        const authData = await provider.getMeetAuthData(meetConnector)

        // Join meeting with auth token
        await meetingBot.joinMeeting(meeting.meetUrl, authData)
      } catch (error) {
        console.error('Failed to join meeting with auth:', error)
        // Fall back to joining without auth (guest mode)
        await meetingBot.joinMeeting(meeting.meetUrl)
      }
    },
    [meetConnector, meetingBot]
  )

  return {
    ...meetingBot,
    upcomingMeetings,
    loadingMeetings,
    connectorConnected,
    refreshMeetings,
    joinMeetingWithAuth,
  }
}
