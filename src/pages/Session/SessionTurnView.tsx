import { Chip, Spinner } from '@heroui/react'

import { Icon, MessageBubble } from '@/components'
import type { Session, SessionTurn } from '@/types'

import { ConversationTurn } from './turns/ConversationTurn'
import { TaskTurn } from './turns/TaskTurn'
import { MediaTurn } from './turns/MediaTurn'
import { AppTurn } from './turns/AppTurn'
import { AgentTurn } from './turns/AgentTurn'

interface SessionTurnViewProps {
  turn: SessionTurn
  session: Session
  index: number
}

const statusIcons: Record<string, string> = {
  pending: 'Clock',
  running: 'RefreshDouble',
  completed: 'Check',
  failed: 'WarningTriangle',
}

const statusColors: Record<
  string,
  'default' | 'primary' | 'success' | 'danger'
> = {
  pending: 'default',
  running: 'primary',
  completed: 'success',
  failed: 'danger',
}

export function SessionTurnView({ turn, session }: SessionTurnViewProps) {
  return (
    <div className="flex flex-col gap-2">
      {/* Turn header */}
      <div className="flex items-center gap-2">
        <MessageBubble
          message={{
            id: turn.id,
            content: turn.prompt,
            role: 'user',
            timestamp: new Date(turn.createdAt),
          }}
        />
        <p className="text-sm flex-1 min-w-0 truncate">{turn.prompt}</p>
        <Chip
          size="sm"
          variant="flat"
          color={statusColors[turn.status]}
          startContent={
            turn.status === 'running' ? (
              <Spinner size="sm" className="scale-50" />
            ) : (
              <Icon name={statusIcons[turn.status] as any} size="xs" />
            )
          }
        >
          {turn.status}
        </Chip>
      </div>

      {/* Intent-specific render */}
      <div className="ml-11">
        {(turn.intent === 'chat' || turn.intent === 'conversation') && (
          <ConversationTurn turn={turn} session={session} />
        )}
        {turn.intent === 'task' && <TaskTurn turn={turn} session={session} />}
        {turn.intent === 'media' && <MediaTurn turn={turn} session={session} />}
        {turn.intent === 'app' && <AppTurn turn={turn} session={session} />}
        {turn.intent === 'agent' && <AgentTurn turn={turn} session={session} />}
      </div>
    </div>
  )
}
