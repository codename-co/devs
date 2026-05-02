import { memo, useCallback, useMemo, useState } from 'react'
import { traces as tracesMap, modelLoadEvents as modelLoadEventsMap } from '@/lib/yjs'
import { useLiveMap } from '@/lib/yjs'
import { useI18n } from '@/i18n'
import { truncate } from '../lib/thread-utils'
import type { Thread, ThreadMessage as TMsg } from '../types'
import { TranscriptEventList } from './TranscriptEventList'
import { TranscriptEventDetail } from './TranscriptEventDetail'

// ── Public types ──────────────────────────────────────────────────────

export interface TranscriptEvent {
  id: string
  role: 'user' | 'tool' | 'agent' | 'system' | 'loading'
  label: string
  timestamp: number
  duration?: number
  tokenInfo?: { prompt: number; completion: number }
  content?: string
  toolUse?: { name: string; input: Record<string, unknown> }
  toolResult?: string
  agentName?: string
  status?: 'running' | 'completed' | 'failed'
  /** Model loading progress (0-100), present only for role === 'loading' */
  progress?: number
  /** Model identifier, present only for role === 'loading' */
  modelName?: string
  /** Model size in bytes, present only for role === 'loading' */
  modelSize?: number
}

// ── Helpers ───────────────────────────────────────────────────────────

function toMs(d: Date | string | number): number {
  if (typeof d === 'number') return d
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

  const { t } = useI18n()

  // Reactively read persisted model load events from Yjs
  const allLoadEvents = useLiveMap(modelLoadEventsMap)

  const events = useMemo(() => {
    const base = buildTranscriptEvents(thread.messages)

    // Determine the session timeframe to find overlapping load events
    const session = thread.source.session
    if (session && allLoadEvents.length > 0) {
      const sessionStart = toMs(session.createdAt)
      const sessionEnd = session.completedAt
        ? toMs(session.completedAt)
        : Date.now()

      for (const loadEvent of allLoadEvents) {
        // Include load events whose timeframe overlaps with this session
        const loadEnd = loadEvent.completedAt ?? Date.now()
        if (loadEvent.startedAt <= sessionEnd && loadEnd >= sessionStart) {
          const isRunning = !loadEvent.completedAt
          const label =
            loadEvent.status === 'downloading'
              ? t('Downloading model')
              : loadEvent.status === 'ready'
                ? t('Model loaded')
                : loadEvent.status === 'error'
                  ? t('Model load failed')
                  : t('Initializing model')

          base.push({
            id: `load-${loadEvent.id}`,
            role: 'loading',
            label,
            timestamp: loadEvent.startedAt,
            duration: loadEvent.completedAt
              ? loadEvent.completedAt - loadEvent.startedAt
              : undefined,
            status: isRunning
              ? 'running'
              : loadEvent.status === 'error'
                ? 'failed'
                : 'completed',
            progress: loadEvent.progress,
            modelName: loadEvent.modelName,
            modelSize: loadEvent.modelSize,
          })
        }
      }
    }

    return base.sort((a, b) => a.timestamp - b.timestamp)
  }, [thread.messages, thread.source.session, allLoadEvents, t])

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
