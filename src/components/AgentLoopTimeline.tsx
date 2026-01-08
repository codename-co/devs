/**
 * AgentLoopTimeline
 *
 * A visual timeline component that shows real-time progress of the agent loop.
 * Inspired by Manus and Perplexity's UX - showing what's happening as it happens.
 */

import { memo, useEffect, useRef, useState } from 'react'
import { Card, CardBody, Chip, Progress, Spinner, Tooltip } from '@heroui/react'
import { motion, AnimatePresence } from 'framer-motion'

import { Icon } from './Icon'
import type { IconName } from '@/lib/types'
import type {
  AgentLoopState,
  AgentLoopStep,
  AgentObservation,
} from '@/lib/agent-loop'

// =============================================================================
// Types
// =============================================================================

interface AgentLoopTimelineProps {
  state: AgentLoopState | null
  isStreaming?: boolean
  className?: string
}

type StepPhase = 'planning' | 'executing' | 'observing' | 'complete' | 'error'

// =============================================================================
// Helper Functions
// =============================================================================

function getStepPhase(step: AgentLoopStep, isCurrentStep: boolean): StepPhase {
  if (!isCurrentStep) return 'complete'
  if (step.observations && step.observations.length > 0) return 'observing'
  if (step.actions?.toolCalls?.length) return 'executing'
  return 'planning'
}

function getPhaseIcon(phase: StepPhase): IconName {
  switch (phase) {
    case 'planning':
      return 'Brain'
    case 'executing':
      return 'Play'
    case 'observing':
      return 'Search'
    case 'complete':
      return 'Check'
    case 'error':
      return 'WarningTriangle'
    default:
      return 'Circle'
  }
}

function getToolIcon(toolName: string): IconName {
  const toolIconMap: Record<string, IconName> = {
    web_search: 'Search',
    knowledge_query: 'Book',
    artifact_create: 'EditPencil',
    code_execute: 'Code',
    file_read: 'Page',
    file_write: 'Page',
  }
  return toolIconMap[toolName] || 'Settings'
}

function formatDuration(ms?: number): string {
  if (!ms) return ''
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

// =============================================================================
// Sub-components
// =============================================================================

/**
 * A pulsing dot that indicates active processing
 */
const PulsingDot = memo(() => (
  <motion.div
    className="w-2 h-2 bg-primary rounded-full"
    animate={{
      scale: [1, 1.5, 1],
      opacity: [1, 0.5, 1],
    }}
    transition={{
      duration: 1.5,
      repeat: Infinity,
      ease: 'easeInOut',
    }}
  />
))
PulsingDot.displayName = 'PulsingDot'

/**
 * Timeline connector line between steps
 */
const TimelineConnector = memo(({ isActive }: { isActive: boolean }) => (
  <div className="absolute left-4 top-8 bottom-0 w-px">
    <motion.div
      className={`h-full ${isActive ? 'bg-primary' : 'bg-default-200'}`}
      initial={{ height: 0 }}
      animate={{ height: '100%' }}
      transition={{ duration: 0.3 }}
    />
  </div>
))
TimelineConnector.displayName = 'TimelineConnector'

/**
 * Tool execution indicator
 */
const ToolBadge = memo(
  ({
    name,
    status,
    duration,
  }: {
    name: string
    status: 'pending' | 'running' | 'success' | 'error'
    duration?: number
  }) => {
    const statusColors: Record<
      string,
      'default' | 'primary' | 'success' | 'danger'
    > = {
      pending: 'default',
      running: 'primary',
      success: 'success',
      error: 'danger',
    }

    return (
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        className="inline-flex items-center gap-2"
      >
        <Chip
          size="sm"
          variant="flat"
          color={statusColors[status]}
          startContent={
            status === 'running' ? (
              <Spinner size="sm" color="current" />
            ) : (
              <Icon name={getToolIcon(name)} className="w-3 h-3" />
            )
          }
        >
          {name.replace(/_/g, ' ')}
        </Chip>
        {duration && (
          <span className="text-tiny text-default-400">
            {formatDuration(duration)}
          </span>
        )}
      </motion.div>
    )
  },
)
ToolBadge.displayName = 'ToolBadge'

/**
 * Observation result display
 */
const ObservationCard = memo(
  ({ observation }: { observation: AgentObservation }) => {
    const [isExpanded, setIsExpanded] = useState(false)
    const contentPreview =
      observation.content.length > 150
        ? `${observation.content.substring(0, 150)}...`
        : observation.content

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-2"
      >
        <Card
          className={`${
            observation.success
              ? 'bg-success-50 dark:bg-success-900/20 border-success-200 dark:border-success-800'
              : 'bg-danger-50 dark:bg-danger-900/20 border-danger-200 dark:border-danger-800'
          } border`}
          shadow="none"
          isPressable
          onPress={() => setIsExpanded(!isExpanded)}
        >
          <CardBody className="py-2 px-3">
            <div className="flex items-start gap-2">
              <Icon
                name={observation.success ? 'Check' : 'Xmark'}
                className={`w-4 h-4 mt-0.5 ${
                  observation.success ? 'text-success-600' : 'text-danger-600'
                }`}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-tiny font-semibold text-default-700">
                    {observation.source}
                  </span>
                  {observation.duration && (
                    <span className="text-tiny text-default-400">
                      {formatDuration(observation.duration)}
                    </span>
                  )}
                </div>
                <p className="text-tiny text-default-600 mt-1 whitespace-pre-wrap break-words">
                  {isExpanded ? observation.content : contentPreview}
                </p>
                {observation.content.length > 150 && (
                  <button
                    className="text-tiny text-primary hover:underline mt-1"
                    onClick={(e) => {
                      e.stopPropagation()
                      setIsExpanded(!isExpanded)
                    }}
                  >
                    {isExpanded ? 'Show less' : 'Show more'}
                  </button>
                )}
              </div>
            </div>
          </CardBody>
        </Card>
      </motion.div>
    )
  },
)
ObservationCard.displayName = 'ObservationCard'

/**
 * Reasoning text with streaming effect
 */
const ReasoningText = memo(
  ({ text, isStreaming }: { text: string; isStreaming: boolean }) => {
    const [displayText, setDisplayText] = useState(text)

    useEffect(() => {
      setDisplayText(text)
    }, [text])

    if (!displayText) return null

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-small text-default-600 italic mt-2 leading-relaxed"
      >
        "{displayText}
        {isStreaming && (
          <motion.span
            animate={{ opacity: [1, 0] }}
            transition={{ duration: 0.5, repeat: Infinity }}
          >
            |
          </motion.span>
        )}
        "
      </motion.div>
    )
  },
)
ReasoningText.displayName = 'ReasoningText'

/**
 * Single step in the timeline
 */
const TimelineStep = memo(
  ({
    step,
    isCurrentStep,
    isLastStep,
  }: {
    step: AgentLoopStep
    isCurrentStep: boolean
    isLastStep: boolean
  }) => {
    const phase = getStepPhase(step, isCurrentStep)
    const phaseIcon = getPhaseIcon(phase)

    const phaseLabels: Record<StepPhase, string> = {
      planning: 'Thinking...',
      executing: 'Running tools',
      observing: 'Processing results',
      complete: 'Done',
      error: 'Error',
    }

    const hasToolCalls =
      step.actions?.toolCalls && step.actions.toolCalls.length > 0

    return (
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
        className="relative pl-10 pb-4"
      >
        {/* Timeline node */}
        <div className="absolute left-0 top-0 flex items-center justify-center">
          <motion.div
            className={`w-8 h-8 rounded-full flex items-center justify-center ${
              isCurrentStep
                ? 'bg-primary text-white'
                : phase === 'error'
                  ? 'bg-danger text-white'
                  : 'bg-default-100 text-default-600'
            }`}
            animate={
              isCurrentStep
                ? {
                    boxShadow: [
                      '0 0 0 0 rgba(0, 114, 245, 0.4)',
                      '0 0 0 10px rgba(0, 114, 245, 0)',
                    ],
                  }
                : {}
            }
            transition={{ duration: 1.5, repeat: isCurrentStep ? Infinity : 0 }}
          >
            {isCurrentStep && phase !== 'complete' ? (
              <Spinner size="sm" color="current" />
            ) : (
              <Icon name={phaseIcon} className="w-4 h-4" />
            )}
          </motion.div>
        </div>

        {/* Connector to next step */}
        {!isLastStep && <TimelineConnector isActive={!isCurrentStep} />}

        {/* Step content */}
        <div className="min-w-0">
          {/* Step header */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-default-900">
              Step {step.stepNumber}
            </span>
            <Chip
              size="sm"
              variant="flat"
              color={
                isCurrentStep
                  ? 'primary'
                  : phase === 'error'
                    ? 'danger'
                    : 'success'
              }
            >
              {phaseLabels[phase]}
            </Chip>
            {step.duration && (
              <span className="text-tiny text-default-400">
                {formatDuration(step.duration)}
              </span>
            )}
          </div>

          {/* Reasoning */}
          {step.plan.reasoning && (
            <ReasoningText
              text={step.plan.reasoning}
              isStreaming={isCurrentStep && phase === 'planning'}
            />
          )}

          {/* Tool calls */}
          {hasToolCalls && (
            <div className="mt-3 flex flex-wrap gap-2">
              {step.actions!.toolCalls.map((toolCall, idx) => {
                const observation = step.observations?.[idx]
                let status: 'pending' | 'running' | 'success' | 'error' =
                  'pending'
                if (observation) {
                  status = observation.success ? 'success' : 'error'
                } else if (isCurrentStep && phase === 'executing') {
                  status = 'running'
                }

                return (
                  <ToolBadge
                    key={toolCall.id}
                    name={toolCall.name}
                    status={status}
                    duration={observation?.duration}
                  />
                )
              })}
            </div>
          )}

          {/* Observations */}
          {step.observations && step.observations.length > 0 && (
            <div className="mt-3 space-y-2">
              {step.observations.map((obs, idx) => (
                <ObservationCard key={idx} observation={obs} />
              ))}
            </div>
          )}

          {/* Synthesis hint */}
          {step.synthesis?.nextStepHint && !isCurrentStep && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-tiny text-default-400 mt-2 italic"
            >
              → {step.synthesis.nextStepHint}
            </motion.p>
          )}
        </div>
      </motion.div>
    )
  },
)
TimelineStep.displayName = 'TimelineStep'

/**
 * Header showing overall status
 */
const TimelineHeader = memo(
  ({ state, isStreaming }: { state: AgentLoopState; isStreaming: boolean }) => {
    const statusConfig: Record<
      AgentLoopState['status'],
      {
        color: 'primary' | 'success' | 'danger' | 'warning' | 'default'
        label: string
        icon: IconName
      }
    > = {
      running: { color: 'primary', label: 'Working...', icon: 'Sparks' },
      completed: { color: 'success', label: 'Completed', icon: 'Check' },
      failed: { color: 'danger', label: 'Failed', icon: 'Xmark' },
      paused: { color: 'warning', label: 'Paused', icon: 'Pause' },
      cancelled: { color: 'default', label: 'Cancelled', icon: 'Xmark' },
      awaiting_confirmation: {
        color: 'warning',
        label: 'Awaiting confirmation',
        icon: 'QuestionMark',
      },
    }

    const config = statusConfig[state.status]
    const progress = (state.currentStep / state.maxSteps) * 100

    return (
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <motion.div
              className={`w-10 h-10 rounded-full bg-${config.color}/20 flex items-center justify-center`}
              animate={state.status === 'running' ? { rotate: 360 } : {}}
              transition={{
                duration: 2,
                repeat: state.status === 'running' ? Infinity : 0,
                ease: 'linear',
              }}
            >
              <Icon
                name={config.icon}
                className={`w-5 h-5 text-${config.color}`}
              />
            </motion.div>
            <div>
              <h3 className="font-semibold text-default-900 flex items-center gap-2">
                Agent Loop
                {isStreaming && <PulsingDot />}
              </h3>
              <p className="text-small text-default-500">
                Step {state.currentStep} of {state.maxSteps}
              </p>
            </div>
          </div>

          <div className="text-right">
            <Chip size="sm" color={config.color} variant="flat">
              {config.label}
            </Chip>
            {state.usage.llmCalls > 0 && (
              <Tooltip
                content={
                  <div className="text-tiny p-1">
                    <div>
                      Tokens: {state.usage.totalTokens.toLocaleString()}
                    </div>
                    <div>LLM calls: {state.usage.llmCalls}</div>
                    <div>
                      Est. cost: ${state.usage.estimatedCost.toFixed(4)}
                    </div>
                  </div>
                }
              >
                <p className="text-tiny text-default-400 mt-1 cursor-help">
                  {state.usage.totalTokens.toLocaleString()} tokens · $
                  {state.usage.estimatedCost.toFixed(4)}
                </p>
              </Tooltip>
            )}
          </div>
        </div>

        <Progress
          size="sm"
          value={progress}
          color={config.color}
          className="max-w-full"
          aria-label="Agent loop progress"
        />
      </div>
    )
  },
)
TimelineHeader.displayName = 'TimelineHeader'

// =============================================================================
// Main Component
// =============================================================================

export const AgentLoopTimeline = memo(
  ({ state, isStreaming = false, className = '' }: AgentLoopTimelineProps) => {
    const containerRef = useRef<HTMLDivElement>(null)

    // Auto-scroll to bottom when new content appears
    useEffect(() => {
      if (containerRef.current && isStreaming) {
        containerRef.current.scrollTop = containerRef.current.scrollHeight
      }
    }, [state?.steps.length, state?.currentStep, isStreaming])

    if (!state) return null

    return (
      <motion.div
        ref={containerRef}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className={`bg-default-50 dark:bg-default-100/50 rounded-large p-4 border border-default-200 overflow-y-auto ${className}`}
      >
        <TimelineHeader state={state} isStreaming={isStreaming} />

        <AnimatePresence mode="popLayout">
          {state.steps.map((step, idx) => (
            <TimelineStep
              key={step.id}
              step={step}
              isCurrentStep={
                idx === state.steps.length - 1 && state.status === 'running'
              }
              isLastStep={idx === state.steps.length - 1}
            />
          ))}
        </AnimatePresence>

        {/* Waiting indicator when no steps yet */}
        {state.steps.length === 0 && state.status === 'running' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-3 text-default-500"
          >
            <Spinner size="sm" />
            <span className="text-small">Analyzing your request...</span>
          </motion.div>
        )}
      </motion.div>
    )
  },
)
AgentLoopTimeline.displayName = 'AgentLoopTimeline'
