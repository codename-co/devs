import { memo, useEffect, useRef, useState } from 'react'
import { Chip, ScrollShadow, Tooltip } from '@heroui/react_3'
import { Icon } from '@/components'
import type { TranscriptEvent } from './TranscriptView'

/**
 * Track which event IDs have already been rendered so new ones can animate in.
 * Returns a Set of IDs that are appearing for the first time this render.
 */
function useNewEventIds(events: TranscriptEvent[]): Set<string> {
  const seenRef = useRef(new Set<string>())
  const [newIds, setNewIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    const fresh = new Set<string>()
    for (const ev of events) {
      if (!seenRef.current.has(ev.id)) {
        fresh.add(ev.id)
        seenRef.current.add(ev.id)
      }
    }
    if (fresh.size > 0) {
      setNewIds(fresh)
      // Clear after the animation completes (matches CSS duration)
      const timer = setTimeout(() => setNewIds(new Set()), 500)
      return () => clearTimeout(timer)
    }
  }, [events])

  return newIds
}

// ── Role styling ──────────────────────────────────────────────────────

const ROLE_CHIP: Record<
  TranscriptEvent['role'],
  { label: string; color: 'default' | 'warning' | 'accent' }
> = {
  user: { label: 'User', color: 'warning' },
  tool: { label: 'Tool', color: 'default' },
  agent: { label: 'Agent', color: 'accent' },
  system: { label: 'System', color: 'default' },
}

const ROLE_BAR_COLOR: Record<TranscriptEvent['role'], string> = {
  user: 'bg-warning-400',
  tool: 'bg-default-400',
  agent: 'bg-primary-300',
  system: 'bg-default-300',
}

// ── Formatting helpers ────────────────────────────────────────────────

function formatElapsed(ms: number, startMs: number): string {
  const elapsed = Math.max(0, ms - startMs)
  const totalSeconds = Math.floor(elapsed / 1000)
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

function formatElapsedFull(ms: number, startMs: number): string {
  const elapsed = Math.max(0, ms - startMs)
  const totalSeconds = Math.floor(elapsed / 1000)
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function formatDuration(ms: number): string {
  return ms < 1000 ? `${Math.round(ms)}ms` : `${(ms / 1000).toFixed(1)}s`
}

function formatTokens(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n)
}

// ── Progress bar ──────────────────────────────────────────────────────

const ProgressBar = memo(function ProgressBar({
  events,
  sessionStart,
  sessionEnd,
  selectedEventId,
  onSelectEvent,
  newEventIds,
}: {
  events: TranscriptEvent[]
  sessionStart: number
  sessionEnd: number
  selectedEventId: string | null
  onSelectEvent: (id: string) => void
  newEventIds: Set<string>
}) {
  const totalDuration = Math.max(1, sessionEnd - sessionStart)

  // Minimum chip width as a percentage so point-in-time events (user prompts,
  // agent messages without an explicit duration) are visible but don't bleed
  // into the gap that belongs to idle/wait time between events.
  const MIN_CHIP_PCT = Math.max(1, (500 / totalDuration) * 100) // ≈ 0.5 s floor

  return (
    <div className="relative h-6 w-full rounded-sm bg-default-100">
      {events.map((ev, i) => {
        const start = ev.timestamp - sessionStart
        const left = (start / totalDuration) * 100
        const width =
          ev.duration != null
            ? Math.max(MIN_CHIP_PCT, (ev.duration / totalDuration) * 100)
            : MIN_CHIP_PCT
        const chip = ROLE_CHIP[ev.role]
        const isSelected = ev.id === selectedEventId
        const isNew = newEventIds.has(ev.id)

        return (
          <Tooltip key={ev.id} delay={0} closeDelay={0}>
            <Tooltip.Trigger
              className="absolute top-0 h-full cursor-pointer pr-0.5 origin-left"
              style={{
                left: `${left}%`,
                width: `${width}%`,
                minWidth: 6,
                zIndex: events.length - i,
                animation: isNew
                  ? 'transcript-bar-in 400ms cubic-bezier(0.34,1.56,0.64,1) both'
                  : undefined,
              }}
              onClick={() => onSelectEvent(ev.id)}
            >
              <div
                className={`${ROLE_BAR_COLOR[ev.role]} h-full w-full rounded-sm ring-offset-1 ring-offset-background ${
                  isSelected
                    ? 'ring-2 ring-primary-300'
                    : 'hover:ring-2 hover:ring-primary-100'
                }`}
              />
            </Tooltip.Trigger>
            <Tooltip.Content
              placement="bottom"
              className="flex items-center gap-1.5 px-2 py-1.5"
            >
              <Chip
                size="sm"
                variant="soft"
                color={chip.color}
                className="text-[10px]"
              >
                {chip.label}
              </Chip>
              <span className="text-xs font-medium">{ev.label}</span>
              {ev.duration != null && (
                <span className="text-muted text-[10px] tabular-nums">
                  {formatDuration(ev.duration)}
                </span>
              )}
              <span className="text-muted text-[10px]">&bull;</span>
              <span className="text-muted text-[10px] tabular-nums">
                {formatElapsedFull(ev.timestamp, sessionStart)}
              </span>
            </Tooltip.Content>
          </Tooltip>
        )
      })}
    </div>
  )
})

// ── Event row ─────────────────────────────────────────────────────────

const EventRow = memo(function EventRow({
  event,
  sessionStart,
  isSelected,
  isNew,
  onSelect,
}: {
  event: TranscriptEvent
  sessionStart: number
  isSelected: boolean
  isNew: boolean
  onSelect: () => void
}) {
  const chip = ROLE_CHIP[event.role]

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors ${
        isSelected ? 'bg-default-100' : 'hover:bg-default-50'
      }`}
      style={{
        animation: isNew
          ? 'transcript-row-in 400ms cubic-bezier(0.22,1,0.36,1) both'
          : undefined,
      }}
    >
      {/* Role chip */}
      <Chip
        size="sm"
        variant="soft"
        color={chip.color}
        className="shrink-0 text-[10px] min-w-[44px] justify-center"
      >
        {chip.label}
      </Chip>

      {/* Label */}
      <span className="text-foreground flex-1 truncate text-xs font-medium">
        {event.label}
      </span>

      {/* Token info (prompt / completion) */}
      {event.tokenInfo && (
        <span className="text-muted shrink-0 text-[10px] tabular-nums">
          <Icon
            name="Cpu"
            className="mr-0.5 inline h-3 w-3 align-[-2px] opacity-50"
          />
          {formatTokens(event.tokenInfo.prompt)} /{' '}
          {formatTokens(event.tokenInfo.completion)}
        </span>
      )}

      {/* Duration */}
      {event.duration != null && (
        <span className="text-muted shrink-0 text-[10px] tabular-nums">
          <Icon
            name="Timer"
            className="mr-0.5 inline h-3 w-3 align-[-2px] opacity-50"
          />
          {formatDuration(event.duration)}
        </span>
      )}

      {/* Timestamp */}
      <span className="text-muted shrink-0 text-[10px] tabular-nums">
        {formatElapsed(event.timestamp, sessionStart)}
      </span>
    </button>
  )
})

// ── Main component ────────────────────────────────────────────────────

interface TranscriptEventListProps {
  events: TranscriptEvent[]
  selectedEventId: string | null
  onSelectEvent: (id: string) => void
}

export const TranscriptEventList = memo(function TranscriptEventList({
  events,
  selectedEventId,
  onSelectEvent,
}: TranscriptEventListProps) {
  const newEventIds = useNewEventIds(events)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new events arrive
  useEffect(() => {
    if (newEventIds.size > 0 && scrollRef.current) {
      const el = scrollRef.current
      // Small delay so the new row is rendered before we scroll
      requestAnimationFrame(() => {
        el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
      })
    }
  }, [newEventIds])

  if (events.length === 0) {
    return (
      <div className="text-muted flex items-center justify-center p-6 text-xs">
        No events
      </div>
    )
  }

  const sessionStart = events[0].timestamp
  const lastEvent = events[events.length - 1]
  const sessionEnd =
    lastEvent.duration != null
      ? lastEvent.timestamp + lastEvent.duration
      : lastEvent.timestamp + 1000

  return (
    <div className="flex h-full flex-col gap-2">
      {/* Keyframes for entrance animations */}
      <style>{`
        @keyframes transcript-bar-in {
          from { transform: scaleX(0); opacity: 0; }
          to   { transform: scaleX(1); opacity: 1; }
        }
        @keyframes transcript-row-in {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Progress bar */}
      <div className="shrink-0 px-5 pt-2">
        <ProgressBar
          events={events}
          sessionStart={sessionStart}
          sessionEnd={sessionEnd}
          selectedEventId={selectedEventId}
          onSelectEvent={onSelectEvent}
          newEventIds={newEventIds}
        />
      </div>

      {/* Event list */}
      <ScrollShadow
        ref={scrollRef}
        hideScrollBar
        size={32}
        className="flex-1 overflow-y-auto px-5"
      >
        <div className="flex flex-col gap-0.5 pb-6">
          {events.map((event) => (
            <EventRow
              key={event.id}
              event={event}
              sessionStart={sessionStart}
              isSelected={event.id === selectedEventId}
              isNew={newEventIds.has(event.id)}
              onSelect={() => onSelectEvent(event.id)}
            />
          ))}
        </div>
      </ScrollShadow>
    </div>
  )
})
