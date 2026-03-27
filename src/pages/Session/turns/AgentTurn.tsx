import { Card, CardBody, Spinner } from '@heroui/react'

import { useI18n } from '@/i18n'
import { Icon } from '@/components'
import type { Session, SessionTurn } from '@/types'

interface AgentTurnProps {
  turn: SessionTurn
  session: Session
}

export function AgentTurn({ turn, session }: AgentTurnProps) {
  const { t } = useI18n()

  const agentArtifacts = session.artifacts.filter(
    (a) => turn.artifactIds.includes(a.id) && a.type === 'agent',
  )

  if (turn.status === 'pending' || turn.status === 'running') {
    return (
      <div className="flex items-center gap-2 text-default-400 py-2">
        <Spinner size="sm" />
        <span className="text-sm">{t('Creating agent…')}</span>
      </div>
    )
  }

  return (
    <div className="py-2">
      {turn.status === 'failed' && (
        <div className="flex items-center gap-2 text-danger">
          <Icon name="WarningTriangle" size="sm" />
          <span className="text-sm">{t('Agent creation failed')}</span>
        </div>
      )}
      {agentArtifacts.length > 0 &&
        agentArtifacts.map((artifact) => (
          <Card key={artifact.id} shadow="sm" className="max-w-sm">
            <CardBody className="flex flex-row items-center gap-3 p-3">
              <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                <Icon name="BrainResearch" size="md" className="text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{artifact.title}</p>
                {artifact.preview && (
                  <p className="text-xs text-default-500 truncate">
                    {artifact.preview}
                  </p>
                )}
              </div>
            </CardBody>
          </Card>
        ))}

    </div>
  )
}
