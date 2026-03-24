import { useEffect, useState } from 'react'
import { Spinner } from '@heroui/react'

import { useI18n } from '@/i18n'
import { getAgentById } from '@/stores/agentStore'
import type { Agent, Session, SessionTurn } from '@/types'

interface ConversationTurnProps {
  turn: SessionTurn
  session: Session
}

export function ConversationTurn({ turn }: ConversationTurnProps) {
  const { t } = useI18n()
  const [agent, setAgent] = useState<Agent | null>(null)

  useEffect(() => {
    const resolved = getAgentById(turn.agentId)
    if (resolved) setAgent(resolved)
  }, [turn.agentId])

  if (turn.status === 'pending' || turn.status === 'running') {
    return (
      <div className="flex items-center gap-2 text-default-400 py-2">
        <Spinner size="sm" />
        <span className="text-sm">
          {agent?.name ?? (t as any)('Agent')} {(t as any)('is thinking…')}
        </span>
      </div>
    )
  }

  // Once completed, the conversation content will be in the linked conversation
  // For now, show a placeholder indicating the turn was handled
  return (
    <div className="py-2">
      <div className="text-sm text-default-500">
        {turn.status === 'completed' && (
          <span>
            {agent?.name ?? (t as any)('Agent')} {(t as any)('responded')}
          </span>
        )}
        {turn.status === 'failed' && (
          <span className="text-danger">{(t as any)('Turn failed')}</span>
        )}
      </div>
    </div>
  )
}
