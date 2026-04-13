import { Chip } from '@heroui/react_3'
import { MessageBubble } from '@/components/chat'
import { MarkdownRenderer } from '@/components'
import type { Message } from '@/types'
import type { Thread } from '../types'
import { SystemPromptDisclosure } from './SystemPromptDisclosure'

interface ConversationPreviewContentProps {
  thread: Thread
}

export function ConversationPreviewContent({
  thread,
}: ConversationPreviewContentProps) {
  if (thread.messages.length === 0) {
    return (
      <div className="text-foreground text-sm leading-relaxed">
        <MarkdownRenderer content={thread.snippet || 'No content'} />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {thread.source.conversation?.summary && (
        <div className="rounded-lg bg-default-100 p-3">
          <div className="mb-2 flex items-center gap-2">
            <Chip size="sm" variant="soft" color="accent">
              Summary
            </Chip>
          </div>
          <div className="text-foreground text-sm leading-relaxed">
            <MarkdownRenderer content={thread.source.conversation.summary} />
          </div>
        </div>
      )}

      {thread.messages.map((msg, idx) => {
        if (idx === 0 && msg.role === 'system') {
          return <SystemPromptDisclosure key={msg.id} content={msg.content} />
        }

        const bubbleMessage: Message = {
          id: msg.id,
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp,
          agentId: msg.agent?.id,
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
    </div>
  )
}
