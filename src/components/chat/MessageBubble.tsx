import { memo } from 'react'
import { Button, Chip, Spinner, Tooltip } from '@heroui/react'

import { useI18n } from '@/i18n'
import { Icon } from '@/components'
import type { IconName } from '@/lib/types'
import type { Agent, Message } from '@/types'
import { copyRichText } from '@/lib/clipboard'
import { successToast } from '@/lib/toast'
import {
  ConversationStepTracker,
  type ConversationStep,
  messageStepsToConversationSteps,
} from '@/pages/Agents/ConversationStepTracker'
import { MessageContent } from './MessageContent'

// ============================================================================
// MessageBubble — shared chat message display for agents & tasks pages
// ============================================================================

export interface MessageBubbleProps {
  message: Message
  /** Resolved agent for this message (looked up by parent) */
  agent?: Agent | null
  /** Visual size — 'sm' uses compact spacing and smaller text */
  size?: 'sm' | 'md'
  /** Always show the agent name chip — useful in cross-agent views */
  showAgentChip?: boolean
  /** Highlight as pinned */
  isPinned?: boolean
  /** Whether this message is currently streaming */
  isStreaming?: boolean
  /** Live conversation steps (streaming only) */
  liveSteps?: ConversationStep[]
  /** Copy callback — defaults to clipboard + toast */
  onCopy?: (content: string) => void
  /** Pin toggle callback */
  onPin?: (message: Message) => void
  /** Memory-learning callback */
  onLearn?: (message: Message) => void
  /** Is learning from this message right now */
  isLearning?: boolean
}

export const MessageBubble = memo(
  ({
    message,
    agent,
    size = 'md',
    showAgentChip,
    isPinned,
    isStreaming = false,
    liveSteps,
    onCopy,
    onPin,
    onLearn,
    isLearning,
  }: MessageBubbleProps) => {
    const isSmall = size === 'sm'
    const { t } = useI18n()

    // Resolve steps: live during streaming, persisted for historical
    const steps =
      isStreaming && liveSteps
        ? liveSteps
        : message.steps?.length
          ? messageStepsToConversationSteps(message.steps)
          : []

    const handleCopy = async () => {
      if (onCopy) {
        onCopy(message.content)
      } else {
        await copyRichText(message.content)
        successToast(t('Copied' as any))
      }
    }

    return (
      <div
        data-message-id={message.id}
        aria-hidden="false"
        tabIndex={0}
        className={`flex w-full group ${isSmall ? 'gap-2' : 'gap-3'} ${message.role === 'user' ? 'justify-end' : ''}`}
      >
        {/* User message: copy button on hover */}
        {message.role === 'user' && (
          <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
            <Tooltip content={t('Copy' as any)}>
              <Button
                size="sm"
                variant="light"
                color="default"
                isIconOnly
                onPress={handleCopy}
              >
                <Icon name="Copy" className="w-4 h-4" />
              </Button>
            </Tooltip>
          </div>
        )}

        <div
          className={`rounded-medium text-foreground relative overflow-hidden ${isSmall ? 'text-tiny' : 'font-medium'} ${
            message.role === 'user'
              ? `bg-default-100 max-w-[80%] ${isSmall ? 'px-3 py-2' : 'px-4 py-3'}`
              : `bg-transparent ${isSmall ? 'px-0.5 py-0' : 'px-1 py-0'}`
          } ${isPinned ? 'border-l-4 border-warning-400 pl-4' : ''}`}
        >
          {/* Pinned indicator chip */}
          {isPinned && (
            <div className={isSmall ? 'mb-1' : 'mb-2'}>
              <Chip
                size="sm"
                variant="flat"
                color="warning"
                startContent={<Icon name="Pin" className="w-3 h-3" />}
                className="text-tiny"
              >
                {t('Pinned' as any)}
              </Chip>
            </div>
          )}
          {/* Agent chip */}
          {showAgentChip && agent && message.role === 'assistant' && (
            <div className={isSmall ? 'mb-1' : 'mb-2'}>
              <Chip
                size="sm"
                variant="flat"
                color="primary"
                startContent={
                  agent.icon ? (
                    <Icon name={agent.icon as IconName} className="w-3 h-3" />
                  ) : undefined
                }
                className="text-tiny"
              >
                {agent.name}
              </Chip>
            </div>
          )}

          {/* Conversation steps */}
          {message.role === 'assistant' && steps.length > 0 && (
            <ConversationStepTracker
              steps={steps}
              className={isSmall ? 'mb-1' : 'mb-2'}
              traceIds={message.traceIds}
            />
          )}

          {/* Content */}
          {message.content ? (
            <MessageContent
              content={message.content}
              traceIds={message.traceIds || []}
              isStreaming={isStreaming}
            />
          ) : isStreaming && steps.length === 0 ? (
            <div className="flex items-center gap-1 py-2">
              <Spinner size="sm" classNames={{ wrapper: 'w-4 h-4' }} />
            </div>
          ) : null}

          {/* Assistant action buttons */}
          {!isStreaming && message.role === 'assistant' && (
            <div
              className={`flex flex-wrap items-center gap-1 ${isSmall ? 'mt-1' : 'mt-2'}`}
            >
              <Tooltip content={t('Copy' as any)}>
                <Button
                  size="sm"
                  variant="light"
                  color="default"
                  isIconOnly
                  onPress={handleCopy}
                >
                  <Icon name="Copy" className="w-4 h-4" />
                </Button>
              </Tooltip>
              {onLearn && (
                <Tooltip content={t('Learn from this message' as any)}>
                  <Button
                    size="sm"
                    variant="light"
                    isIconOnly
                    isLoading={isLearning}
                    onPress={() => onLearn(message)}
                  >
                    <Icon name="Brain" className="w-4 h-4" />
                  </Button>
                </Tooltip>
              )}
              {onPin && (
                <Tooltip
                  content={
                    isPinned
                      ? t('Unpin message' as any)
                      : t('Pin message' as any)
                  }
                >
                  <Button
                    size="sm"
                    variant={isPinned ? 'flat' : 'light'}
                    color={isPinned ? 'warning' : 'default'}
                    isIconOnly
                    onPress={() => onPin(message)}
                  >
                    <Icon
                      name={isPinned ? 'PinSlash' : 'Pin'}
                      className="w-4 h-4"
                    />
                  </Button>
                </Tooltip>
              )}
            </div>
          )}
        </div>
      </div>
    )
  },
)

MessageBubble.displayName = 'MessageBubble'
