/**
 * MeetingBotPanel Component
 *
 * Main panel for the meeting bot interface, showing connection status,
 * meeting controls, and live transcript.
 */

import { useState, useCallback } from 'react'
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Input,
  Chip,
  Divider,
  Spinner,
} from '@heroui/react'
import { Icon } from '@/components'
import { useMeetingSession } from '../hooks/useMeetingSession'
import { MeetingControls } from './MeetingControls'
import { MeetingTranscript } from './MeetingTranscript'
import type { MeetMeetingInfo } from '@/features/connectors/providers/apps/google-meet'

export interface MeetingBotPanelProps {
  agentId: string
  agentName: string
  serverUrl?: string
  onTranscriptUpdate?: (transcript: string) => void
}

/**
 * Main meeting bot panel component
 */
export function MeetingBotPanel({
  agentId,
  agentName,
  serverUrl,
  onTranscriptUpdate,
}: MeetingBotPanelProps) {
  const [meetingUrl, setMeetingUrl] = useState('')
  const [showUpcoming, setShowUpcoming] = useState(true)

  const {
    status,
    transcript,
    participants,
    errorMessage,
    upcomingMeetings,
    loadingMeetings,
    connectorConnected,
    connect,
    joinMeeting,
    joinMeetingWithAuth,
    leaveMeeting,
    speak,
    sendChat,
    react,
    refreshMeetings,
  } = useMeetingSession({
    serverUrl,
    agentId,
    agentName,
    onTranscript: () => {
      // Build full transcript text for callback
      const fullTranscript = transcript
        .map((t) => `${t.speaker}: ${t.text}`)
        .join('\n')
      onTranscriptUpdate?.(fullTranscript)
    },
  })

  const handleJoinCustomMeeting = useCallback(async () => {
    if (!meetingUrl.trim()) return

    try {
      await connect()
      await joinMeeting(meetingUrl.trim())
    } catch (error) {
      console.error('Failed to join meeting:', error)
    }
  }, [meetingUrl, connect, joinMeeting])

  const handleJoinScheduledMeeting = useCallback(
    async (meeting: MeetMeetingInfo) => {
      try {
        await connect()
        await joinMeetingWithAuth(meeting)
      } catch (error) {
        console.error('Failed to join scheduled meeting:', error)
      }
    },
    [connect, joinMeetingWithAuth]
  )

  const getStatusColor = () => {
    switch (status) {
      case 'joined':
        return 'success'
      case 'joining':
      case 'waiting':
      case 'connecting':
        return 'warning'
      case 'error':
        return 'danger'
      default:
        return 'default'
    }
  }

  const getStatusLabel = () => {
    switch (status) {
      case 'disconnected':
        return 'Not Connected'
      case 'connecting':
        return 'Connecting...'
      case 'connected':
        return 'Ready'
      case 'joining':
        return 'Joining Meeting...'
      case 'waiting':
        return 'Waiting to be Admitted...'
      case 'joined':
        return 'In Meeting'
      case 'leaving':
        return 'Leaving...'
      case 'error':
        return 'Error'
      default:
        return status
    }
  }

  const isInMeeting = status === 'joined'
  const isConnecting = ['connecting', 'joining', 'waiting'].includes(status)

  return (
    <Card className="w-full">
      <CardHeader className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Icon name="GoogleMeet" size="lg" />
          <div>
            <h3 className="text-lg font-semibold">Meeting Bot</h3>
            <p className="text-sm text-default-500">
              {agentName} can join Google Meet meetings
            </p>
          </div>
        </div>
        <Chip color={getStatusColor()} variant="flat" size="sm">
          {getStatusLabel()}
        </Chip>
      </CardHeader>

      <Divider />

      <CardBody className="gap-4">
        {/* Error message */}
        {errorMessage && (
          <div className="p-3 bg-danger-50 dark:bg-danger-900/20 text-danger rounded-lg text-sm">
            <Icon name="WarningTriangle" size="sm" className="inline mr-2" />
            {errorMessage}
          </div>
        )}

        {/* Connector status */}
        {!connectorConnected && (
          <div className="p-3 bg-warning-50 dark:bg-warning-900/20 text-warning-700 dark:text-warning-400 rounded-lg text-sm">
            <Icon name="WarningTriangle" size="sm" className="inline mr-2" />
            Connect your Google account in{' '}
            <a href="/connectors" className="underline">
              Connectors
            </a>{' '}
            to join meetings with your identity.
          </div>
        )}

        {/* In-meeting view */}
        {isInMeeting ? (
          <>
            <MeetingControls
              onSpeak={speak}
              onSendChat={sendChat}
              onReact={react}
              onLeave={leaveMeeting}
              participants={participants}
            />

            <Divider />

            <MeetingTranscript
              transcript={transcript}
              agentName={agentName}
            />
          </>
        ) : (
          <>
            {/* Join by URL */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Join by Meeting URL</label>
              <div className="flex gap-2">
                <Input
                  placeholder="https://meet.google.com/xxx-xxxx-xxx"
                  value={meetingUrl}
                  onChange={(e) => setMeetingUrl(e.target.value)}
                  isDisabled={isConnecting}
                  startContent={<Icon name="Internet" size="sm" className="text-default-400" />}
                />
                <Button
                  color="primary"
                  isLoading={isConnecting}
                  isDisabled={!meetingUrl.trim() || isConnecting}
                  onPress={handleJoinCustomMeeting}
                >
                  Join
                </Button>
              </div>
            </div>

            {/* Upcoming meetings */}
            {connectorConnected && (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <button
                    className="text-sm font-medium flex items-center gap-1 hover:text-primary"
                    onClick={() => setShowUpcoming(!showUpcoming)}
                  >
                    <Icon
                      name={showUpcoming ? 'NavArrowDown' : 'NavArrowRight'}
                      size="sm"
                    />
                    Upcoming Meetings
                  </button>
                  <Button
                    size="sm"
                    variant="light"
                    isIconOnly
                    onPress={refreshMeetings}
                    isDisabled={loadingMeetings}
                  >
                    <Icon
                      name="RefreshDouble"
                      size="sm"
                      className={loadingMeetings ? 'animate-spin' : ''}
                    />
                  </Button>
                </div>

                {showUpcoming && (
                  <div className="space-y-2">
                    {loadingMeetings ? (
                      <div className="flex justify-center p-4">
                        <Spinner size="sm" />
                      </div>
                    ) : upcomingMeetings.length === 0 ? (
                      <p className="text-sm text-default-500 text-center py-4">
                        No upcoming meetings with Google Meet
                      </p>
                    ) : (
                      upcomingMeetings.map((meeting) => (
                        <div
                          key={meeting.id}
                          className="flex items-center justify-between p-3 bg-default-100 rounded-lg"
                        >
                          <div>
                            <p className="font-medium text-sm">{meeting.title}</p>
                            {meeting.startTime && (
                              <p className="text-xs text-default-500">
                                {meeting.startTime.toLocaleString()}
                              </p>
                            )}
                          </div>
                          <Button
                            size="sm"
                            color="primary"
                            variant="flat"
                            isDisabled={isConnecting}
                            onPress={() => handleJoinScheduledMeeting(meeting)}
                          >
                            Join
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </CardBody>
    </Card>
  )
}
