/**
 * CommunicationTrace
 *
 * Timestamped, collapsible list of inter-agent messages for a workflow.
 * Looks like a compact group chat — agent name chip + type badge per message.
 * Auto-scrolls to latest. Collapsed when empty, expands when messages arrive.
 */

import { memo, useEffect, useRef, useMemo, useState } from 'react'
import { Chip } from '@heroui/react'

import { Icon } from '@/components'
import { useMailboxStore } from '@/stores/mailboxStore'
import { getAgentById } from '@/stores/agentStore'
import type { AgentMessage } from '@/types'

// ============================================================================
// Helpers
// ============================================================================

function formatTime(timestamp: string | Date): string {
  const d = typeof timestamp === 'string' ? new Date(timestamp) : timestamp
  return d.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function getAgentName(agentId: string): string {
  if (agentId === 'broadcast') return 'All'
  const agent = getAgentById(agentId)
  return agent?.name ?? agentId.slice(0, 8)
}

const TYPE_COLOR: Record<
  string,
  'primary' | 'warning' | 'success' | 'default'
> = {
  finding: 'success',
  status: 'primary',
}

// ============================================================================
// Component
// ============================================================================

interface CommunicationTraceProps {
  workflowId: string | undefined
}

export const CommunicationTrace = memo(
  ({ workflowId }: CommunicationTraceProps) => {
    const [isExpanded, setIsExpanded] = useState(false)
    const scrollRef = useRef<HTMLDivElement>(null)
    const prevCountRef = useRef(0)

    // Load messages from mailbox store
    const allMessages = useMailboxStore((s) => s.messages)
    const loadMessages = useMailboxStore((s) => s.loadMessages)

    // Ensure messages are loaded
    useEffect(() => {
      if (workflowId) loadMessages()
    }, [workflowId, loadMessages])

    const messages: AgentMessage[] = useMemo(() => {
      if (!workflowId) return []
      return allMessages
        .filter((m) => m.workflowId === workflowId)
        .sort(
          (a, b) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
        )
    }, [allMessages, workflowId])

    // Auto-expand when new messages arrive
    useEffect(() => {
      if (messages.length > 0 && messages.length > prevCountRef.current) {
        setIsExpanded(true)
      }
      prevCountRef.current = messages.length
    }, [messages.length])

    // Auto-scroll to bottom
    useEffect(() => {
      if (isExpanded && scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight
      }
    }, [messages.length, isExpanded])

    if (!workflowId || messages.length === 0) return null

    return (
      <div className="mb-4 border border-default-200 rounded-lg overflow-hidden">
        {/* Header — click to toggle */}
        <button
          type="button"
          className="w-full flex items-center gap-2 px-3 py-2 bg-default-50 hover:bg-default-100 transition-colors cursor-pointer"
          onClick={() => setIsExpanded((v) => !v)}
        >
          <Icon name="ChatBubble" size="sm" />
          <span className="text-sm font-medium">Agent Communications</span>
          <Chip size="sm" variant="flat" color="default">
            {messages.length}
          </Chip>
          <span className="ml-auto text-default-400 text-xs">
            {isExpanded ? '▾' : '▸'}
          </span>
        </button>

        {/* Message list */}
        {isExpanded && (
          <div
            ref={scrollRef}
            className="max-h-60 overflow-y-auto divide-y divide-default-100"
          >
            {messages.map((msg) => (
              <div key={msg.id} className="flex items-start gap-2 px-3 py-2">
                <span className="text-default-400 text-xs whitespace-nowrap mt-0.5">
                  {formatTime(msg.timestamp)}
                </span>
                <Chip
                  size="sm"
                  variant="flat"
                  color="secondary"
                  className="shrink-0"
                >
                  {getAgentName(msg.from)}
                </Chip>
                <span className="text-default-400 text-xs mt-0.5">→</span>
                <Chip
                  size="sm"
                  variant="flat"
                  color="default"
                  className="shrink-0"
                >
                  {getAgentName(msg.to)}
                </Chip>
                <Chip
                  size="sm"
                  variant="dot"
                  color={TYPE_COLOR[msg.type] ?? 'default'}
                  className="shrink-0"
                >
                  {msg.type}
                </Chip>
                <p className="text-sm text-default-600 line-clamp-2 flex-1">
                  {msg.content}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  },
)

CommunicationTrace.displayName = 'CommunicationTrace'
