/**
 * MeetingTranscript Component
 *
 * Displays the live transcript from the meeting.
 */

import { useRef, useEffect } from 'react'
import { ScrollShadow } from '@heroui/react'
import type { TranscriptEntry } from '../types'

export interface MeetingTranscriptProps {
  transcript: TranscriptEntry[]
  agentName?: string
  maxHeight?: string
}

/**
 * Meeting transcript component with auto-scroll
 */
export function MeetingTranscript({
  transcript,
  agentName: _agentName,
  maxHeight = '300px',
}: MeetingTranscriptProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [transcript])

  if (transcript.length === 0) {
    return (
      <div className="text-center py-8 text-default-500">
        <p className="text-sm">Waiting for transcript...</p>
        <p className="text-xs mt-1">
          Make sure captions are enabled in the meeting
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium">Live Transcript</h4>
      <ScrollShadow
        ref={scrollRef}
        className="space-y-2 pr-2"
        style={{ maxHeight }}
      >
        {transcript.map((entry) => (
          <div
            key={entry.id}
            className={`p-2 rounded-lg ${
              entry.isAgent
                ? 'bg-primary-100 dark:bg-primary-900/30 ml-4'
                : 'bg-default-100 mr-4'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <span
                className={`text-xs font-medium ${
                  entry.isAgent ? 'text-primary' : 'text-default-600'
                }`}
              >
                {entry.speaker}
              </span>
              <span className="text-xs text-default-400">
                {entry.timestamp.toLocaleTimeString()}
              </span>
            </div>
            <p className="text-sm">{entry.text}</p>
          </div>
        ))}
      </ScrollShadow>
    </div>
  )
}
