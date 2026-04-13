import { useEffect, useRef } from 'react'
import { Chip, Spinner } from '@heroui/react_3'
import { MessageBubble } from '@/components/chat'
import { SystemPromptDisclosure } from './SystemPromptDisclosure'
import { useLiveValue } from '@/lib/yjs'
import { sessions as sessionsMap } from '@/lib/yjs'
import { useSessionExecution } from '@/pages/Session/useSessionExecution'
import { useI18n } from '@/i18n'
import type { Message } from '@/types'
import type { Thread } from '../types'

interface SessionPreviewContentProps {
  thread: Thread
}

const STATUS_COLORS: Record<
  string,
  'default' | 'accent' | 'success' | 'danger'
> = {
  starting: 'default',
  running: 'accent',
  completed: 'success',
  failed: 'danger',
}

export function SessionPreviewContent({ thread }: SessionPreviewContentProps) {
  const { lang, t } = useI18n()
  const session = useLiveValue(sessionsMap, thread.id)
  const { response, conversationSteps, isSending } = useSessionExecution(
    session,
    lang,
    t,
  )

  // Auto-scroll to bottom during streaming
  const scrollRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (isSending && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [isSending, response])

  if (!session) {
    return (
      <div className="text-muted flex items-center justify-center p-8 text-sm">
        Session not found
      </div>
    )
  }

  // Build messages from the thread (which reads the linked conversation reactively)
  const historicalMessages = thread.messages

  // Build a synthetic streaming message when the LLM is running
  const streamingMessage: Message | null =
    isSending && response
      ? {
          id: '__streaming__',
          role: 'assistant',
          content: response,
          timestamp: new Date(),
          agentId: session.primaryAgentId,
        }
      : null

  return (
    <div ref={scrollRef} className="flex flex-col gap-4">
      {/* Session status */}
      {session.status !== 'completed' && (
        <div className="flex items-center gap-2">
          {(session.status === 'starting' || session.status === 'running') && (
            <Spinner size="sm" />
          )}
          <Chip
            size="sm"
            variant="soft"
            color={STATUS_COLORS[session.status] ?? 'default'}
          >
            {session.status}
          </Chip>
        </div>
      )}

      {/* Historical messages */}
      {historicalMessages.map((msg, idx) => {
        if (idx === 0 && msg.role === 'system') {
          return <SystemPromptDisclosure key={msg.id} content={msg.content} />
        }

        const bubbleMessage: Message = {
          id: msg.id,
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp,
          agentId: msg.agent?.id,
          steps: msg.steps,
          traceIds: msg.traceIds,
        }
        return (
          <MessageBubble
            key={msg.id}
            message={bubbleMessage}
            agent={msg.agent}
            showAgentChip={msg.role === 'assistant'}
            size="sm"
          />
        )
      })}

      {/* Streaming message */}
      {streamingMessage && (
        <MessageBubble
          message={streamingMessage}
          agent={thread.agent}
          showAgentChip
          size="sm"
          isStreaming
          liveSteps={conversationSteps}
        />
      )}

      {/* Thinking indicator when no content yet */}
      {isSending && !response && (
        <div className="flex items-center gap-2 px-2 py-3">
          <Spinner size="sm" />
          <span className="text-muted text-sm">{t('Thinking…')}</span>
        </div>
      )}
    </div>
  )
}
