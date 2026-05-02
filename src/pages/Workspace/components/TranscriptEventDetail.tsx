import { memo } from 'react'
import { Chip, ScrollShadow, Tooltip } from '@heroui/react_3'
import { Progress } from '@heroui/react'
import { Icon, MarkdownRenderer } from '@/components'
import { useI18n } from '@/i18n'
import type { TranscriptEvent } from './TranscriptView'

// ── Helpers ───────────────────────────────────────────────────────────

const ROLE_CHIP_STYLE: Record<
  TranscriptEvent['role'],
  { i18nKey: string; color: 'default' | 'warning' | 'accent'; className?: string }
> = {
  user: { i18nKey: 'User', color: 'default' },
  tool: { i18nKey: 'Tool', color: 'warning' },
  agent: { i18nKey: 'Agent', color: 'accent' },
  system: { i18nKey: 'System', color: 'default' },
  loading: { i18nKey: 'Model', color: 'default', className: 'bg-secondary text-secondary-foreground' },
}

function formatElapsed(ms: number, startMs: number): string {
  const elapsed = Math.max(0, ms - startMs)
  const totalSeconds = Math.floor(elapsed / 1000)
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

function formatDuration(ms: number): string {
  return ms < 1000 ? `${Math.round(ms)}ms` : `${(ms / 1000).toFixed(1)}s`
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

function formatValue(val: unknown): string {
  if (val === null || val === undefined) return '\u2014'
  if (typeof val === 'string') {
    return val.length > 1000 ? val.slice(0, 1000) + '\u2026' : val
  }
  try {
    const json = JSON.stringify(val, null, 2)
    return json.length > 1500 ? json.slice(0, 1500) + '\u2026' : json
  } catch {
    return String(val)
  }
}

// ── Component ─────────────────────────────────────────────────────────

interface TranscriptEventDetailProps {
  event: TranscriptEvent | null
  sessionStart: number
  onClose: () => void
}

export const TranscriptEventDetail = memo(function TranscriptEventDetail({
  event,
  sessionStart,
  onClose,
}: TranscriptEventDetailProps) {
  const { t } = useI18n()

  if (!event) {
    return (
      <div className="text-muted flex h-full items-center justify-center text-xs">
        {t('Select an event to view details')}
      </div>
    )
  }

  const chipStyle = ROLE_CHIP_STYLE[event.role]

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex shrink-0 items-start justify-between gap-2 border-b border-divider px-4 py-3">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <Chip
              size="sm"
              variant="soft"
              color={chipStyle.color}
              className={`text-[10px] ${chipStyle.className ?? ''}`}
            >
              {t(chipStyle.i18nKey as any)}
            </Chip>
            <span className="text-foreground text-sm font-semibold">
              {event.label}
            </span>
          </div>
          <div className="text-muted flex items-center gap-2 text-xs">
            <Tooltip delay={300} closeDelay={300}>
              <Tooltip.Trigger>
                <time className="tabular-nums">
                  {formatElapsed(event.timestamp, sessionStart)}
                </time>
              </Tooltip.Trigger>
              <Tooltip.Content placement="bottom">
                {new Date(event.timestamp).toLocaleString()}
              </Tooltip.Content>
            </Tooltip>
            {event.duration != null && (
              <>
                <span className="opacity-40">&middot;</span>
                <span className="flex items-center gap-0.5 tabular-nums">
                  <Icon name="Timer" className="h-3 w-3 opacity-60" />
                  {formatDuration(event.duration)}
                </span>
              </>
            )}
            {event.agentName && (
              <>
                <span className="opacity-40">&middot;</span>
                <span>{event.agentName}</span>
              </>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="text-muted hover:text-foreground shrink-0 rounded-lg p-1 transition-colors"
        >
          <Icon name="Xmark" size="sm" />
        </button>
      </div>

      {/* Content */}
      <ScrollShadow
        hideScrollBar
        size={24}
        className="flex-1 overflow-y-auto px-4 py-3"
      >
        {/* Tool event: Show tool use + tool result */}
        {event.role === 'tool' && (
          <div className="flex flex-col gap-4">
            {event.toolUse && (
              <div className="flex flex-col gap-1.5">
                <span className="text-muted text-xs font-medium uppercase tracking-wider">
                  {t('Tool use')}
                </span>
                <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded-xl bg-default-100 p-3 font-mono text-xs leading-relaxed text-foreground">
                  {JSON.stringify(event.toolUse.input, null, 2)}
                </pre>
              </div>
            )}
            {event.toolResult !== undefined && (
              <div className="flex flex-col gap-1.5">
                <span className="text-muted text-xs font-medium uppercase tracking-wider">
                  {t('Tool result')}
                </span>
                <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded-xl bg-default-100 p-3 font-mono text-xs leading-relaxed text-foreground max-h-[400px] overflow-y-auto"></pre>
              </div>
            )}
          </div>
        )}

        {/* User event: Show full prompt */}
        {event.role === 'user' && event.content && (
          <div className="text-foreground text-sm leading-relaxed">
            <MarkdownRenderer content={event.content} />
          </div>
        )}

        {/* Agent event: Show full response */}
        {event.role === 'agent' && event.content && (
          <div className="text-foreground text-sm leading-relaxed">
            <MarkdownRenderer content={event.content} />
          </div>
        )}

        {/* Loading event: Show model details and progress */}
        {event.role === 'loading' && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <Icon
                name="Brain"
                className={`h-6 w-6 shrink-0 ${
                  event.status === 'running'
                    ? 'text-secondary-foreground animate-pulse'
                    : event.status === 'failed'
                      ? 'text-danger'
                      : 'text-secondary-foreground'
                }`}
              />
              <div className="flex-1 min-w-0">
                <p className="text-foreground text-sm font-medium">
                  {event.label}
                </p>
                {event.modelName && (
                  <p className="text-muted text-xs mt-0.5 font-mono">
                    {event.modelName}
                  </p>
                )}
                {event.modelSize != null && event.modelSize > 0 && (
                  <p className="text-muted text-xs mt-0.5">
                    {formatBytes(event.modelSize)}
                  </p>
                )}
              </div>
            </div>
            {event.status === 'running' && (
              <Progress
                size="sm"
                value={event.progress ?? 0}
                color="secondary"
                className="w-full"
                aria-label={t('Initializing Local AI Model…')}
              />
            )}
          </div>
        )}

        {/* System event */}
        {event.role === 'system' && event.content && (
          <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded-xl bg-default-100 p-3 font-mono text-xs leading-relaxed text-foreground max-h-[400px] overflow-y-auto">
            {formatValue(event.content)}
          </pre>
        )}
      </ScrollShadow>
    </div>
  )
})
