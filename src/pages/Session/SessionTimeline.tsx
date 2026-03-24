import { useEffect, useMemo, useState } from 'react'
import { Chip, Divider, Spinner } from '@heroui/react'

import { useI18n } from '@/i18n'
import { Icon } from '@/components'
import { MessageBubble } from '@/components/chat/MessageBubble'
import type { Conversation, Message, Session } from '@/types'
import { useLiveValue, conversations } from '@/lib/yjs'
import { getAgentById } from '@/stores/agentStore'
import { useConversationStore } from '@/stores/conversationStore'
import type { SessionExecutionState } from './useSessionExecution'

import { SessionTurnView } from './SessionTurnView'

interface SessionTimelineProps {
  session: Session
  executionState: SessionExecutionState
}

const intentLabels: Record<string, string> = {
  conversation: 'Chat',
  task: 'Task',
  media: 'Studio',
  app: 'App',
  agent: 'Agent',
}

const intentColors: Record<
  string,
  'primary' | 'success' | 'warning' | 'secondary' | 'danger'
> = {
  conversation: 'primary',
  task: 'success',
  media: 'warning',
  app: 'secondary',
  agent: 'danger',
}

export function SessionTimeline({
  session,
  executionState,
}: SessionTimelineProps) {
  const { t } = useI18n()
  const { loadConversation } = useConversationStore()
  const { response, conversationSteps, isSending } = executionState

  // Observe raw Yjs data for reactivity (triggers re-render on changes)
  const rawConversation = useLiveValue(conversations, session.conversationId)

  // Decrypt into local state
  const [conversation, setConversation] = useState<Conversation | null>(null)
  useEffect(() => {
    if (!rawConversation || !session.conversationId) {
      setConversation(null)
      return
    }
    loadConversation(session.conversationId).then((decrypted) => {
      if (decrypted) setConversation(decrypted)
    })
  }, [rawConversation])

  // Build timeline items: historical messages + live streaming message
  const assistantMessages = useMemo(() => {
    const historical =
      conversation?.messages?.filter((m) => m.role === 'assistant') ?? []

    // Inject a synthetic streaming message while the LLM is generating
    if (isSending) {
      const streamingMessage: Message = {
        id: '__streaming__',
        role: 'assistant',
        content: response || '',
        timestamp: new Date(),
        agentId: session.primaryAgentId,
      }
      return [...historical, streamingMessage]
    }

    return historical
  }, [conversation, isSending, response, session.primaryAgentId])

  return (
    <div className="flex flex-col gap-6 max-w-3xl mx-auto w-full">
      {/* Initial prompt display */}
      <div className="flex flex-col gap-2">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-default-200 flex items-center justify-center shrink-0 mt-0.5">
            <Icon name="User" size="sm" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-default-500 mb-1">
              {(t as any)('You')}
            </p>
            <p className="text-base whitespace-pre-wrap break-words">
              {session.prompt}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <Chip
                size="sm"
                variant="flat"
                color={intentColors[session.intent]}
              >
                {intentLabels[session.intent] || session.intent}
              </Chip>
              {session.attachments && session.attachments.length > 0 && (
                <Chip size="sm" variant="flat" color="default">
                  {session.attachments.length} {(t as any)('file(s)')}
                </Chip>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Turns */}
      {session.turns.map((turn, index) => (
        <div key={turn.id}>
          <Divider className="my-2" />
          <SessionTurnView turn={turn} session={session} index={index} />
        </div>
      ))}

      {/* Conversation messages — rendered live with steps, tool calls, etc. */}
      {assistantMessages.map((message) => {
        const agent = message.agentId ? getAgentById(message.agentId) : null
        const isStreaming = message.id === '__streaming__'
        return (
          <div key={message.id}>
            <Divider className="my-2" />
            <MessageBubble
              message={message}
              agent={agent}
              showAgentChip
              isStreaming={isStreaming}
              liveSteps={isStreaming ? conversationSteps : undefined}
            />
          </div>
        )
      })}

      {/* Loading indicator while running with no messages yet */}
      {(session.status === 'running' || session.status === 'starting') &&
        assistantMessages.length === 0 && (
          <div className="flex items-center gap-2 text-default-400 justify-center py-4">
            <Spinner size="sm" />
            <span className="text-sm">{(t as any)('Thinking…')}</span>
          </div>
        )}

      {/* Artifacts summary */}
      {session.artifacts.length > 0 && (
        <>
          <Divider className="my-2" />
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium text-default-500">
              {(t as any)('Artifacts')} ({session.artifacts.length})
            </p>
            <div className="flex gap-2 flex-wrap">
              {session.artifacts.map((artifact) => (
                <Chip
                  key={artifact.id}
                  size="sm"
                  variant="flat"
                  color="primary"
                  startContent={<Icon name="Page" size="xs" />}
                >
                  {artifact.title}
                </Chip>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
