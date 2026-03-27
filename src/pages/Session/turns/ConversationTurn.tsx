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
          {agent?.name ?? t('Agent')} {t('is thinking…')}
        </span>
      </div>
    )
  }

  // When completed, the response is rendered as a MessageBubble by SessionTimeline.
  // Only show feedback for failures.
  if (turn.status === 'failed') {
    return (
      <div className="py-2">
        <span className="text-sm text-danger">{t('Turn failed')}</span>
      </div>
    )
  }

  return null
}
