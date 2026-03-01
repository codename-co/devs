import { memo, useMemo } from 'react'
import { Chip } from '@heroui/react'

import { useI18n } from '@/i18n'
import { MessageBubble } from '@/components/chat'
import type { Agent, Message, Task, Conversation } from '@/types'
import type { SubTaskStreamingState } from '@/hooks/useOrchestrationStreaming'
import type { ConversationStep } from '../../Agents/ConversationStepTracker'
import type { PendingToolCall } from '@/lib/chat'

export const SubTaskConversation = memo(
  ({
    subTask,
    conversations,
    agentCache,
    onCopy,
    streaming,
  }: {
    subTask: Task
    conversations: Conversation[]
    agentCache: Record<string, Agent>
    onCopy: (content: string) => void
    /** Live streaming state for this sub-task (undefined when not streaming). */
    streaming?: SubTaskStreamingState
  }) => {
    const { t } = useI18n()
    const agent = subTask.assignedAgentId
      ? agentCache[subTask.assignedAgentId]
      : null

    const subTaskConversations = useMemo(
      () => conversations.filter((c) => c.workflowId === subTask.workflowId),
      [conversations, subTask.workflowId],
    )

    const messages = useMemo(() => {
      const msgs: Message[] = []
      for (const conv of subTaskConversations) {
        for (const msg of conv.messages) {
          if (msg.role !== 'system') {
            msgs.push(msg)
          }
        }
      }
      return msgs.sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      )
    }, [subTaskConversations])

    const stepsDone = subTask.steps.filter(
      (s) => s.status === 'completed',
    ).length

    // Build live steps from streaming tool call data
    const liveSteps: ConversationStep[] = useMemo(() => {
      if (!streaming?.isStreaming) return []
      const steps: ConversationStep[] = []

      // Thinking step (when thinking data is available)
      if (streaming.isThinking && streaming.thinkingContent) {
        steps.push({
          id: `thinking-${streaming.taskId}`,
          icon: 'Brain',
          i18nKey: 'Thinking…',
          status: 'running',
          startedAt: Date.now(),
          thinkingContent: streaming.thinkingContent,
        })
      }

      // Tool call steps
      if (streaming.toolCalls && streaming.toolCalls.length > 0) {
        const pendingToolCalls: PendingToolCall[] = streaming.toolCalls.map(
          (tc) => ({
            name: tc.toolName,
            input: tc.input,
          }),
        )
        steps.push({
          id: `tools-${streaming.taskId}`,
          icon: 'Wrench',
          i18nKey: 'Using tools…',
          status: streaming.toolCalls.some((tc) => tc.status === 'running')
            ? 'running'
            : 'completed',
          startedAt: Date.now(),
          pendingToolCalls,
        })
      }

      return steps
    }, [streaming])

    return (
      <div className="space-y-3">
        {subTask.description && (
          <p className="text-sm text-default-600 whitespace-pre-wrap">
            {subTask.description}
          </p>
        )}

        {subTask.steps.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-tiny text-default-500">
              {t('Steps')}: {stepsDone}/{subTask.steps.length}
            </span>
            {subTask.steps.map((step) => (
              <Chip
                key={step.id}
                size="sm"
                variant="flat"
                color={
                  step.status === 'completed'
                    ? 'success'
                    : step.status === 'failed'
                      ? 'danger'
                      : step.status === 'in_progress'
                        ? 'primary'
                        : 'default'
                }
                className="text-tiny"
              >
                {step.name}
              </Chip>
            ))}
          </div>
        )}

        {messages.length > 0 ? (
          <div className="flex flex-col gap-4 pl-2 border-l-2 border-default-200">
            {messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                agent={msg.agentId ? agentCache[msg.agentId] : agent}
                showAgentChip={msg.role === 'assistant'}
                onCopy={onCopy}
              />
            ))}
            {/* Streaming message — shown while the agent is producing output */}
            {streaming?.isStreaming && (
              <MessageBubble
                key="__streaming__"
                message={{
                  id: '__streaming__',
                  role: 'assistant',
                  content: streaming.content || '',
                  timestamp: new Date(),
                  agentId: streaming.agentId,
                }}
                agent={
                  streaming.agentId
                    ? (agentCache[streaming.agentId] ?? agent)
                    : agent
                }
                showAgentChip
                isStreaming
                liveSteps={liveSteps}
                onCopy={onCopy}
              />
            )}
          </div>
        ) : streaming?.isStreaming ? (
          <div className="flex flex-col gap-4 pl-2 border-l-2 border-default-200">
            <MessageBubble
              key="__streaming__"
              message={{
                id: '__streaming__',
                role: 'assistant',
                content: streaming.content || '',
                timestamp: new Date(),
                agentId: streaming.agentId,
              }}
              agent={
                streaming.agentId
                  ? (agentCache[streaming.agentId] ?? agent)
                  : agent
              }
              showAgentChip
              isStreaming
              liveSteps={liveSteps}
              onCopy={onCopy}
            />
          </div>
        ) : (
          <p className="text-sm text-default-400 italic">
            {t('No conversation messages yet.')}
          </p>
        )}
      </div>
    )
  },
)

SubTaskConversation.displayName = 'SubTaskConversation'
