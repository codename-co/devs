import { Fragment, useEffect, useMemo, useState } from 'react'
import { Chip, Spinner } from '@/components/heroui-compat'

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

  // Split assistant messages into groups: initial prompt responses + per-turn responses
  const { initialMessages, turnMessages, streamingMessage, totalCount } =
    useMemo(() => {
      const historical =
        conversation?.messages?.filter((m) => m.role === 'assistant') ?? []

      const streaming: Message | undefined = isSending
        ? {
            id: '__streaming__',
            role: 'assistant',
            content: response || '',
            timestamp: new Date(),
            agentId: session.primaryAgentId,
          }
        : undefined

      const turns = session.turns
      const toTime = (d: Date | string) => new Date(d).getTime()

      if (turns.length === 0) {
        return {
          initialMessages: historical,
          turnMessages: [] as Message[][],
          streamingMessage: streaming,
          totalCount: historical.length + (streaming ? 1 : 0),
        }
      }

      // Messages before first turn → responses to the initial prompt
      const firstTurnTime = toTime(turns[0].createdAt)
      const initial = historical.filter(
        (m) => toTime(m.timestamp) < firstTurnTime,
      )

      // Messages per turn (between turn[i].createdAt and turn[i+1].createdAt)
      const perTurn = turns.map((turn, i) => {
        const turnStart = toTime(turn.createdAt)
        const turnEnd =
          i < turns.length - 1 ? toTime(turns[i + 1].createdAt) : Infinity
        return historical.filter(
          (m) =>
            toTime(m.timestamp) >= turnStart && toTime(m.timestamp) < turnEnd,
        )
      })

      return {
        initialMessages: initial,
        turnMessages: perTurn,
        streamingMessage: streaming,
        totalCount: historical.length + (streaming ? 1 : 0),
      }
    }, [
      conversation,
      isSending,
      response,
      session.primaryAgentId,
      session.turns,
    ])

  const renderMessage = (message: Message) => {
    const agent = message.agentId ? getAgentById(message.agentId) : null
    const isStreaming = message.id === '__streaming__'
    return (
      <MessageBubble
        key={message.id}
        message={message}
        agent={agent}
        showAgentChip
        isStreaming={isStreaming}
        liveSteps={isStreaming ? conversationSteps : undefined}
      />
    )
  }

  return (
    <div className="flex flex-col gap-6 max-w-3xl mx-auto w-full">
      {/* Initial prompt display */}
      <div className="flex flex-col gap-2">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <MessageBubble
              message={{
                role: 'user',
                content: session.prompt,
                id: 'aa',
                timestamp: new Date(),
              }}
            />
            <div className="flex items-center gap-2 mt-2">
              <Chip
                size="sm"
                variant="soft"
                color={intentColors[session.intent]}
              >
                {intentLabels[session.intent] || session.intent}
              </Chip>
              {session.attachments && session.attachments.length > 0 && (
                <Chip size="sm" variant="soft" color="default">
                  {session.attachments.length} {t('file(s)')}
                </Chip>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Assistant messages responding to the initial prompt */}
      {initialMessages.map(renderMessage)}

      {/* Streaming message when there are no turns yet */}
      {session.turns.length === 0 &&
        streamingMessage &&
        renderMessage(streamingMessage)}

      {/* Turns interleaved with their corresponding assistant messages */}
      {session.turns.map((turn, index) => (
        <Fragment key={turn.id}>
          <SessionTurnView turn={turn} session={session} index={index} />
          {turnMessages[index]?.map(renderMessage)}
          {/* Streaming message belongs to the latest turn */}
          {index === session.turns.length - 1 &&
            streamingMessage &&
            renderMessage(streamingMessage)}
        </Fragment>
      ))}

      {/* Loading indicator while running with no messages yet */}
      {(session.status === 'running' || session.status === 'starting') &&
        totalCount === 0 && (
          <div className="flex items-center gap-2 text-default-400 justify-center py-4">
            <Spinner size="sm" />
            <span className="text-sm">{t('Thinking…')}</span>
          </div>
        )}

      {/* Artifacts summary */}
      {session.artifacts.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-default-500">
            {t('Artifacts')} ({session.artifacts.length})
          </p>
          <div className="flex gap-2 flex-wrap">
            {session.artifacts.map((artifact) => (
              <Chip
                key={artifact.id}
                size="sm"
                variant="soft"
                color="accent"
                startContent={<Icon name="Page" size="xs" />}
              >
                {artifact.title}
              </Chip>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
