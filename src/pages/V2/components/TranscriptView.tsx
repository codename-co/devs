import { memo, useCallback, useMemo, useState } from 'react'
import { traces as tracesMap } from '@/lib/yjs'
import { truncate } from '../lib/thread-utils'
import type { Thread, ThreadMessage as TMsg } from '../types'
import { TranscriptEventList } from './TranscriptEventList'
import { TranscriptEventDetail } from './TranscriptEventDetail'

// ── Public types ──────────────────────────────────────────────────────

export interface TranscriptEvent {
  id: string
  role: 'user' | 'tool' | 'agent' | 'system'
  label: string
  timestamp: number
  duration?: number
  tokenInfo?: { prompt: number; completion: number }
  content?: string
  toolUse?: { name: string; input: Record<string, unknown> }
  toolResult?: string
  agentName?: string
  status?: 'running' | 'completed' | 'failed'
}

// ── Helpers ───────────────────────────────────────────────────────────

function toMs(d: Date | string): number {
  return typeof d === 'string' ? new Date(d).getTime() : d.getTime()
}

/** Convert Thread messages into a flat, chronological event list */
function buildTranscriptEvents(messages: TMsg[]): TranscriptEvent[] {
  const events: TranscriptEvent[] = []

  for (const msg of messages) {
    if (msg.role === 'system') continue

    if (msg.role === 'user') {
      events.push({
        id: msg.id,
        role: 'user',
        label: truncate(msg.content, 60),
        timestamp: toMs(msg.timestamp),
        content: msg.content,
      })
      continue
    }

    // Assistant messages → extract tool steps first, then the message
    const steps = msg.steps ?? []
    for (const step of steps) {
      const toolCalls = step.toolCalls ?? []
      for (const tc of toolCalls) {
        events.push({
          id: `${msg.id}-${step.id}-${tc.name}`,
          role: 'tool',
          label: tc.name.replace(/_/g, ' '),
          timestamp: step.startedAt,
          duration:
            step.completedAt != null
              ? step.completedAt - step.startedAt
              : undefined,
          toolUse: { name: tc.name, input: tc.input },
          toolResult: tc.output ?? '(empty)',
          status: step.status,
        })
      }
    }

    // Resolve token info from traces (sync Yjs map read)
    let tokenInfo: { prompt: number; completion: number } | undefined
    if (msg.traceIds?.length) {
      let totalPrompt = 0
      let totalCompletion = 0
      for (const tid of msg.traceIds) {
        const trace = tracesMap.get(tid)
        if (trace) {
          totalPrompt += (trace as any).totalPromptTokens ?? 0
          totalCompletion += (trace as any).totalCompletionTokens ?? 0
        }
      }
      if (totalPrompt > 0 || totalCompletion > 0) {
        tokenInfo = { prompt: totalPrompt, completion: totalCompletion }
      }
    }

    events.push({
      id: msg.id,
      role: 'agent',
      label: 'Message',
      timestamp: toMs(msg.timestamp),
      content: msg.content,
      agentName: msg.agent?.name,
      tokenInfo,
    })
  }

  return events.sort((a, b) => a.timestamp - b.timestamp)
}

// ── Component ─────────────────────────────────────────────────────────

interface TranscriptViewProps {
  thread: Thread
}

export const TranscriptView = memo(function TranscriptView({
  thread,
}: TranscriptViewProps) {
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)

  const events = useMemo(
    () => buildTranscriptEvents(thread.messages),
    [thread.messages],
  )

  const selectedEvent = useMemo(
    () => events.find((e) => e.id === selectedEventId) ?? null,
    [events, selectedEventId],
  )

  const sessionStart = events.length > 0 ? events[0].timestamp : 0

  const handleSelectEvent = useCallback((id: string) => {
    setSelectedEventId((prev) => (prev === id ? null : id))
  }, [])

  const handleCloseDetail = useCallback(() => {
    setSelectedEventId(null)
  }, [])

  return (
    <div className="flex h-full min-h-0 gap-0">
      {/* Left panel — event list */}
      <div
        className={`flex min-h-0 shrink-0 flex-col border-r border-divider transition-all ${
          selectedEventId ? 'w-1/2' : 'w-full'
        }`}
      >
        <TranscriptEventList
          events={events}
          selectedEventId={selectedEventId}
          onSelectEvent={handleSelectEvent}
        />
      </div>

      {/* Right panel — event detail */}
      {selectedEventId && (
        <div className="flex min-h-0 flex-1 flex-col">
          <TranscriptEventDetail
            event={selectedEvent}
            sessionStart={sessionStart}
            onClose={handleCloseDetail}
          />
        </div>
      )}
    </div>
  )
})
