/**
 * ConversationStepTracker Component
 *
 * Visually tracks all the steps of a conversation response in real-time.
 * Uses a compact HeroUI Accordion to display each step with a colored status
 * icon (running/success/failed), expandable content showing tool input/output,
 * and support for LLM-generated step titles.
 */

import { memo, useMemo } from 'react'
import { AccordionItem, Button, Chip, Spinner } from '@heroui/react'
import { Link, useLocation } from 'react-router-dom'
import { AccordionTracker, Icon } from '@/components'
import { useI18n } from '@/i18n'
import type {
  ResponseStatus,
  ToolCallResult,
  PendingToolCall,
} from '@/lib/chat'
import type { IconName } from '@/lib/types'
import type { MessageStep } from '@/types'
import localI18n from './i18n'

// ============================================================================
// Types
// ============================================================================

export type StepStatus = 'running' | 'completed' | 'failed'

export interface ConversationStep {
  /** Unique step id */
  id: string
  /** Icon from the ResponseStatus */
  icon: IconName
  /** i18n key from the status update */
  i18nKey: string
  /** Optional i18n interpolation variables */
  vars?: Record<string, string | number>
  /** Status of this step */
  status: StepStatus
  /** Timestamp when the step started */
  startedAt: number
  /** Timestamp when the step completed */
  completedAt?: number
  /** Optional LLM-generated title to replace the i18n key */
  title?: string
  /** Thinking/reasoning content extracted from <think> blocks */
  thinkingContent?: string
  /** Tool calls with their input/output (for expanding in the accordion) */
  toolCalls?: ToolCallResult[]
  /** Tool calls being executed (before results come back) for live display */
  pendingToolCalls?: PendingToolCall[]
}

// ============================================================================
// Helper: Create a step from a ResponseStatus
// ============================================================================

let stepCounter = 0

/**
 * Creates a new ConversationStep from a ResponseStatus update.
 * Call this from the parent when receiving status updates.
 */
export function createStepFromStatus(status: ResponseStatus): ConversationStep {
  stepCounter++
  return {
    id: `step-${Date.now()}-${stepCounter}`,
    icon: status.icon,
    i18nKey: status.i18nKey,
    vars: status.vars,
    status: 'running',
    startedAt: Date.now(),
    pendingToolCalls: status.pendingToolCalls,
  }
}

/**
 * Mark the last running step as completed.
 * Returns a new array (immutable update).
 */
export function completeLastStep(
  steps: ConversationStep[],
  status: StepStatus = 'completed',
): ConversationStep[] {
  const updated = [...steps]
  for (let i = updated.length - 1; i >= 0; i--) {
    if (updated[i].status === 'running') {
      updated[i] = {
        ...updated[i],
        status,
        completedAt: Date.now(),
      }
      break
    }
  }
  return updated
}

/**
 * Update a step's title (e.g. from an LLM-generated rename).
 */
export function updateStepTitle(
  steps: ConversationStep[],
  stepId: string,
  title: string,
): ConversationStep[] {
  return steps.map((s) => (s.id === stepId ? { ...s, title } : s))
}

/**
 * Add tool I/O data to the last running step.
 */
export function addToolDataToStep(
  steps: ConversationStep[],
  toolCalls: ToolCallResult[],
): ConversationStep[] {
  const updated = [...steps]
  for (let i = updated.length - 1; i >= 0; i--) {
    if (updated[i].status === 'running') {
      updated[i] = { ...updated[i], toolCalls }
      break
    }
  }
  return updated
}

/**
 * Update (append) thinking content for the "Thinking…" step.
 * Used to accumulate <think> block content during streaming.
 * Finds the step by i18nKey instead of status, so it works even after
 * the step has been marked as completed.
 */
export function updateStepThinkingContent(
  steps: ConversationStep[],
  thinkingContent: string,
): ConversationStep[] {
  const updated = [...steps]
  for (let i = 0; i < updated.length; i++) {
    if (updated[i].i18nKey === 'Thinking…') {
      updated[i] = { ...updated[i], thinkingContent }
      break
    }
  }
  return updated
}

// ============================================================================
// Converter: MessageStep[] → ConversationStep[]
// ============================================================================

/**
 * Converts persisted MessageStep[] from a Message into ConversationStep[]
 * for rendering in the tracker. The only difference is the icon type cast.
 */
export function messageStepsToConversationSteps(
  steps: MessageStep[],
): ConversationStep[] {
  return steps.map((s) => ({
    ...s,
    icon: s.icon as IconName,
    toolCalls: s.toolCalls,
  }))
}

// ============================================================================
// Status Icon Component
// ============================================================================

const StepStatusIcon = memo(({ status }: { status: StepStatus }) => {
  switch (status) {
    case 'running':
      return <Spinner size="sm" classNames={{ wrapper: 'w-4 h-4' }} />
    case 'completed':
      return (
        <Icon name="CheckCircleSolid" size="sm" className="text-gray-400/60" />
      )
    case 'failed':
      return (
        <Icon name="XmarkCircleSolid" size="sm" className="text-danger-400" />
      )
  }
})
StepStatusIcon.displayName = 'StepStatusIcon'

// ============================================================================
// Tool I/O Content (expanded accordion body)
// ============================================================================

const ToolIOContent = memo(
  ({
    toolCalls,
    t,
  }: {
    toolCalls?: ToolCallResult[]
    t: (key: any) => string
  }) => {
    if (!toolCalls || toolCalls.length === 0) {
      return (
        <p className="text-tiny text-default-400 italic py-1">
          {t('No details available' as any)}
        </p>
      )
    }

    const formatValue = (val: unknown): string => {
      if (val === null || val === undefined) return '—'
      if (typeof val === 'string') {
        return val.length > 500 ? val.slice(0, 500) + '…' : val
      }
      try {
        const json = JSON.stringify(val, null, 2)
        return json.length > 800 ? json.slice(0, 800) + '…' : json
      } catch {
        return String(val)
      }
    }

    return (
      <div className="space-y-3 py-1 ps-5">
        {toolCalls.map((tc, idx) => (
          <div key={idx} className="space-y-1.5">
            {/* Tool chip */}
            <Chip
              size="sm"
              startContent={<Icon name="Terminal" size="sm" />}
              variant="flat"
            >
              {tc.name}
            </Chip>
            {/* Input */}
            {tc.input && Object.keys(tc.input).length > 0 && (
              <div>
                <span className="text-tiny font-semibold text-default-500 uppercase tracking-wider">
                  {t('Input' as any)}
                </span>
                <pre className="text-tiny bg-default-100 dark:bg-default-50/50 rounded-md p-2 mt-1 overflow-x-auto whitespace-pre-wrap break-all font-mono text-default-600 max-h-40 overflow-y-auto">
                  {Object.entries(tc.input)
                    .map(([k, v]) => `${k}: ${formatValue(v)}`)
                    .join('\n')}
                </pre>
              </div>
            )}
            {/* Output */}
            {tc.output !== undefined && tc.output !== null && (
              <div>
                <span className="text-tiny font-semibold text-default-500 uppercase tracking-wider">
                  {t('Output' as any)}
                </span>
                <pre className="text-tiny bg-default-100 dark:bg-default-50/50 rounded-md p-2 mt-1 overflow-x-auto whitespace-pre-wrap break-all font-mono text-default-600 max-h-40 overflow-y-auto">
                  {formatValue(tc.output)}
                </pre>
              </div>
            )}
            {/* Separator between tool calls */}
            {idx < toolCalls.length - 1 && (
              <hr className="border-default-200 mt-2" />
            )}
          </div>
        ))}
      </div>
    )
  },
)
ToolIOContent.displayName = 'ToolIOContent'

// ============================================================================
// Pending Tool Info (displayed while tool is executing)
// ============================================================================

/** Extract the most meaningful parameter from a tool call's input */
const getToolDetail = (tc: PendingToolCall): string | null => {
  const { input } = tc
  if (input.query && typeof input.query === 'string') return input.query
  if (input.expression && typeof input.expression === 'string')
    return input.expression
  if (input.document_id && typeof input.document_id === 'string')
    return input.document_id
  if (input.skill_name && typeof input.skill_name === 'string')
    return input.skill_name
  if (input.code && typeof input.code === 'string')
    return input.code.slice(0, 80)
  if (input.folder_id && typeof input.folder_id === 'string')
    return input.folder_id
  return null
}

/** Display pending tool call details during execution */
const PendingToolInfo = memo(
  ({ toolCalls }: { toolCalls: PendingToolCall[] }) => {
    if (!toolCalls || toolCalls.length === 0) return null

    return (
      <div className="ml-6 mt-1.5 space-y-1">
        {toolCalls.map((tc, idx) => {
          const detail = getToolDetail(tc)
          const displayName = tc.name.replace(/_/g, ' ')

          return (
            <div
              key={idx}
              className="flex items-center gap-1.5 text-xs text-default-400"
            >
              <Icon
                name="NavArrowRight"
                className="w-3 h-3 flex-shrink-0 animate-pulse"
              />
              <span className="font-medium">{displayName}</span>
              {detail && (
                <span className="italic truncate max-w-[250px]">
                  &ldquo;
                  {detail.length > 60 ? detail.slice(0, 60) + '…' : detail}
                  &rdquo;
                </span>
              )}
            </div>
          )
        })}
      </div>
    )
  },
)
PendingToolInfo.displayName = 'PendingToolInfo'

/** Render a running step inline (outside accordion) */
const RunningStepInline = memo(
  ({
    step,
    t,
  }: {
    step: ConversationStep
    t: (key: any, vars?: any) => string
  }) => {
    const label = step.title || t(step.i18nKey as any, step.vars)

    return (
      <div>
        <div className="flex items-center gap-2 text-sm text-default-500">
          <Spinner size="sm" classNames={{ wrapper: 'w-4 h-4' }} />
          <span className="italic font-medium">{label}</span>
        </div>
        {step.pendingToolCalls && step.pendingToolCalls.length > 0 && (
          <PendingToolInfo toolCalls={step.pendingToolCalls} />
        )}
        {step.thinkingContent && (
          <details className="mt-1 ml-6">
            <summary className="cursor-pointer text-xs text-default-400 select-none">
              {t('Thoughts' as any)}
            </summary>
            <div className="ml-2 mt-1 text-xs text-default-400 whitespace-pre-wrap max-h-40 overflow-y-auto">
              {step.thinkingContent}
            </div>
          </details>
        )}
      </div>
    )
  },
)
RunningStepInline.displayName = 'RunningStepInline'

// ============================================================================
// Main Component
// ============================================================================

export interface ConversationStepTrackerProps {
  /** Current list of steps being tracked */
  steps: ConversationStep[]
  /** Optional className */
  className?: string
  /** Trace IDs associated with the message (for linking to trace details) */
  traceIds?: string[]
}

/**
 * ConversationStepTracker
 *
 * Displays a compact accordion of all conversation processing steps.
 * Each step shows a status icon (spinner/check/cross), title, duration,
 * and can be expanded to reveal tool input/output details.
 *
 * Running steps are always displayed inline (outside the accordion) for
 * maximum visibility, with pending tool call details shown when available.
 */
export const ConversationStepTracker = memo(
  ({ steps, className = '', traceIds }: ConversationStepTrackerProps) => {
    const { t } = useI18n(localI18n)
    const location = useLocation()

    // Separate completed/failed steps from running step
    const finishedSteps = useMemo(
      () => steps.filter((s) => s.status !== 'running'),
      [steps],
    )
    const runningStep = useMemo(
      () => steps.find((s) => s.status === 'running'),
      [steps],
    )

    // Count statuses for summary chip
    const summary = useMemo(() => {
      const completed = steps.filter((s) => s.status === 'completed').length
      const failed = steps.filter((s) => s.status === 'failed').length
      const running = steps.filter((s) => s.status === 'running').length
      return { completed, failed, running, total: steps.length }
    }, [steps])

    if (steps.length === 0) return null

    // Only one running step and nothing else → show inline
    if (steps.length === 1 && runningStep) {
      return (
        <div className={`${className}`}>
          <RunningStepInline step={runningStep} t={t} />
        </div>
      )
    }

    return (
      <div className={`${className}`}>
        {/* Completed/failed steps in accordion */}
        {finishedSteps.length > 0 && (
          <>
            {/* Summary chip */}
            <div className="flex items-center gap-2 mb-1">
              <Icon name="ListSelect" size="sm" className="text-default-400" />
              <span className="text-tiny font-medium text-default-500">
                {t('Steps' as any)}
              </span>
              {summary.running > 0 && (
                <Chip size="sm" color="primary" variant="flat">
                  {summary.running}{' '}
                  {summary.running === 1 ? 'running' : 'running'}
                </Chip>
              )}
              {summary.completed > 0 && (
                <Chip size="sm" variant="bordered">
                  {summary.completed}
                </Chip>
              )}
              {summary.failed > 0 && (
                <Chip size="sm" color="danger" variant="flat">
                  {summary.failed}
                </Chip>
              )}
            </div>

            <AccordionTracker>
              {finishedSteps.map((step) => {
                const label = step.title || t(step.i18nKey as any, step.vars)
                const hasDetails =
                  (step.toolCalls && step.toolCalls.length > 0) ||
                  !!step.thinkingContent

                return (
                  <AccordionItem
                    key={step.id}
                    aria-label={label}
                    isDisabled={!hasDetails}
                    hideIndicator={!hasDetails}
                    startContent={<StepStatusIcon status={step.status} />}
                    classNames={{
                      trigger: 'w-auto',
                    }}
                    title={
                      <span
                        className={`truncate ${
                          step.status === 'failed'
                            ? 'text-danger-600'
                            : 'text-default-500'
                        }`}
                      >
                        {label}
                      </span>
                    }
                  >
                    {step.thinkingContent && (
                      <div className="mb-2">
                        <div className="text-xs font-medium text-default-500 mb-1">
                          {t('Thoughts' as any)}
                        </div>
                        <div className="text-xs text-default-400 whitespace-pre-wrap max-h-40 overflow-y-auto rounded-md bg-default-50 p-2">
                          {step.thinkingContent}
                        </div>
                      </div>
                    )}
                    <ToolIOContent toolCalls={step.toolCalls} t={t} />
                  </AccordionItem>
                )
              })}
            </AccordionTracker>
          </>
        )}

        {/* Currently running step — always visible inline, outside accordion */}
        {runningStep && (
          <div className="mt-2">
            <RunningStepInline step={runningStep} t={t} />
          </div>
        )}

        {/* Trace details link */}
        {traceIds && traceIds.length > 0 && (
          <div className="mt-1 pl-2">
            <Button
              as={Link}
              to={`${location.pathname}${location.search}#settings/traces/logs/${traceIds[0]}`}
              size="sm"
              variant="light"
              className="text-tiny text-default-400 gap-1 h-6 min-w-0 px-2"
            >
              <Icon name="Activity" className="w-3 h-3" />
              <span>{t('View trace details' as any)}</span>
            </Button>
          </div>
        )}
      </div>
    )
  },
)
ConversationStepTracker.displayName = 'ConversationStepTracker'
