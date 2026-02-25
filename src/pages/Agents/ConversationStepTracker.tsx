/**
 * ConversationStepTracker Component
 *
 * Visually tracks all the steps of a conversation response in real-time.
 * Uses a compact HeroUI Accordion to display each step with a colored status
 * icon (running/success/failed), expandable content showing tool input/output,
 * and support for LLM-generated step titles.
 */

import { memo, useMemo } from 'react'
import { Accordion, AccordionItem, Button, Chip, Spinner } from '@heroui/react'
import { Link, useLocation } from 'react-router-dom'
import { Icon } from '@/components'
import { useI18n } from '@/i18n'
import type { ResponseStatus, ToolCallResult } from '@/lib/chat'
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
  /** Tool calls with their input/output (for expanding in the accordion) */
  toolCalls?: ToolCallResult[]
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
      <div className="space-y-3 py-1">
        {toolCalls.map((tc, idx) => (
          <div key={idx} className="space-y-1.5">
            {/* Tool chip */}
            <Chip size="sm" startContent={<Icon name="Code" size="sm" />}>
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
 */
export const ConversationStepTracker = memo(
  ({ steps, className = '', traceIds }: ConversationStepTrackerProps) => {
    const { t } = useI18n(localI18n)
    const location = useLocation()

    // Count statuses for summary chip
    const summary = useMemo(() => {
      const completed = steps.filter((s) => s.status === 'completed').length
      const failed = steps.filter((s) => s.status === 'failed').length
      const running = steps.filter((s) => s.status === 'running').length
      return { completed, failed, running, total: steps.length }
    }, [steps])

    if (steps.length === 0) return null

    // If there's only one step and it's running, show inline (no accordion)
    if (steps.length === 1 && steps[0].status === 'running') {
      const step = steps[0]
      const label = step.title || t(step.i18nKey as any, step.vars)
      return (
        <div
          className={`flex items-center gap-2 text-sm text-default-500 ${className}`}
        >
          <Spinner size="sm" classNames={{ wrapper: 'w-4 h-4' }} />
          <span className="italic font-medium">{label}</span>
        </div>
      )
    }

    return (
      <div className={`${className}`}>
        {/* Summary chip */}
        <div className="flex items-center gap-2 mb-1">
          <Icon name="ListSelect" size="sm" className="text-default-400" />
          <span className="text-tiny font-medium text-default-500">
            {t('Steps' as any)}
          </span>
          {summary.running > 0 && (
            <Chip size="sm" color="primary" variant="flat">
              {summary.running} {summary.running === 1 ? 'running' : 'running'}
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

        <Accordion
          isCompact
          fullWidth={false}
          showDivider={false}
          variant="light"
          className="px-0 gap-0"
          selectionMode="multiple"
          itemClasses={{
            // base: 'py-0',
            title: 'text-sm font-medium',
            trigger:
              'py-1.5 px-2 rounded-md hover:bg-default-100 data-[hover=true]:bg-default-100',
            content: 'px-2 pb-2 pt-0',
            indicator: 'text-sm text-default-600 rotate-90',
          }}
        >
          {steps.map((step) => {
            const label = step.title || t(step.i18nKey as any, step.vars)
            const hasDetails = step.toolCalls && step.toolCalls.length > 0

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
                        : step.status === 'running'
                          ? 'text-default-700'
                          : 'text-default-500'
                    }`}
                  >
                    {label}
                  </span>
                }
              >
                <ToolIOContent toolCalls={step.toolCalls} t={t} />
              </AccordionItem>
            )
          })}
        </Accordion>

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
