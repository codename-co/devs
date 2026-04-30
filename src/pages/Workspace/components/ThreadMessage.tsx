import { memo, useMemo } from 'react'
import { Avatar } from '@heroui/react'
import { Disclosure } from '@heroui/react_3'
import { AgentAvatar, Icon, MarkdownRenderer } from '@/components'
import { useI18n } from '@/i18n'
import {
  ConversationStepTracker,
  messageStepsToConversationSteps,
} from '@/pages/Agents/ConversationStepTracker'
import { stripMarkdown, truncate } from '../lib/thread-utils'
import type { ThreadMessage as TMessage } from '../types'
import { formatDateTime, formatMessageTime } from '@/lib/date'

interface ThreadMessageProps {
  message: TMessage
  isLast: boolean
  defaultExpanded: boolean
}

/**
 * A single message rendered as a Disclosure (collapsible card),
 * matching the stacked-email pattern in Gmail / Apple Mail.
 *
 * Collapsed: compact row — avatar · name · snippet · time
 * Expanded:  full header + markdown body
 */
export const ThreadMessage = memo(function ThreadMessage({
  message,
  isLast,
  defaultExpanded,
}: ThreadMessageProps) {
  const { lang } = useI18n()
  const agent = message.agent
  const isUser = message.role === 'user'

  const displayName = isUser ? 'You' : (agent?.name ?? 'Assistant')

  const snippet = message.content
    ? truncate(stripMarkdown(message.content), 100)
    : ''

  const steps = useMemo(
    () =>
      message.steps?.length
        ? messageStepsToConversationSteps(message.steps)
        : [],
    [message.steps],
  )

  const avatar =
    !isUser && agent ? (
      <AgentAvatar agent={agent} size="md" />
    ) : (
      <Avatar
        size="sm"
        showFallback
        name={isUser ? 'You' : 'A'}
        fallback={
          <Icon
            name={isUser ? 'User' : 'QuestionMark'}
            size="sm"
            className="text-inherit"
          />
        }
        classNames={{
          base: 'flex-shrink-0',
          fallback: 'flex items-center justify-center',
        }}
      />
    )

  return (
    <Disclosure
      id={message.id}
      {...(isLast
        ? {
            isExpanded: true,
            //isDisabled: true
          }
        : { defaultExpanded })}
      className={`group ${!isLast ? 'border-separator border-b' : ''}`}
    >
      {/* Collapsed / trigger row */}
      <Disclosure.Heading>
        <Disclosure.Trigger className="flex w-full items-center gap-3 px-1 py-3 text-left">
          {avatar}
          <span className="text-foreground shrink-0 text-sm font-medium">
            {displayName}
          </span>
          {/* Collapsed snippet — hidden when expanded via group CSS */}
          <span className="text-muted min-w-0 flex-1 truncate text-xs group-data-[expanded=true]:hidden">
            {snippet}
          </span>
          <div className="ml-auto flex shrink-0 items-center gap-3">
            <time
              className="text-muted text-xs"
              title={formatDateTime(message.timestamp, lang)}
            >
              {formatMessageTime(message.timestamp, lang)}
            </time>
            {!isLast && (
              <Disclosure.Indicator className="text-muted h-4 w-4 shrink-0 transition-transform" />
            )}
          </div>
        </Disclosure.Trigger>
      </Disclosure.Heading>

      {/* Expanded body */}
      <Disclosure.Content>
        <Disclosure.Body className="pb-4 pl-1 pr-1">
          {/* Full header when expanded */}
          {/* <div className="mb-3 flex items-start justify-between">
            <div className="flex items-center gap-3">
              {avatar}
              <div className="flex flex-col">
                <span className="text-foreground text-sm font-medium leading-tight">
                  {displayName}
                </span>
                {!isUser && agent && (
                  <span className="text-muted text-xs leading-tight">
                    @
                    {agent.slug ??
                      agent.name?.replace(/\s+/g, '-').toLowerCase()}
                  </span>
                )}
              </div>
            </div>
            <span className="text-muted shrink-0 text-xs">
              {formatDateTime(message.timestamp, lang)}
            </span>
          </div> */}

          {/* Tool call steps */}
          {message.role === 'assistant' && steps.length > 0 && (
            <div className="pl-7 mb-2">
              <ConversationStepTracker
                steps={steps}
                traceIds={message.traceIds}
              />
            </div>
          )}

          {/* Message content */}
          <div className="text-foreground pl-7 text-sm leading-relaxed">
            {message.content ? (
              <MarkdownRenderer content={message.content} />
            ) : (
              <span className="text-muted italic">Empty message</span>
            )}
          </div>
        </Disclosure.Body>
      </Disclosure.Content>
    </Disclosure>
  )
})
