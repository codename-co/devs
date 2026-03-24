import { Spinner } from '@heroui/react'

import { useI18n } from '@/i18n'
import { Icon } from '@/components'
import type { Session, SessionTurn } from '@/types'

interface AppTurnProps {
  turn: SessionTurn
  session: Session
}

export function AppTurn({ turn, session }: AppTurnProps) {
  const { t } = useI18n()

  const appArtifacts = session.artifacts.filter(
    (a) =>
      turn.artifactIds.includes(a.id) &&
      (a.type === 'app' || a.type === 'website'),
  )

  if (turn.status === 'pending' || turn.status === 'running') {
    return (
      <div className="flex items-center gap-2 text-default-400 py-2">
        <Spinner size="sm" />
        <span className="text-sm">{(t as any)('Building app…')}</span>
      </div>
    )
  }

  return (
    <div className="py-2">
      {turn.status === 'failed' && (
        <div className="flex items-center gap-2 text-danger">
          <Icon name="WarningTriangle" size="sm" />
          <span className="text-sm">{(t as any)('App build failed')}</span>
        </div>
      )}
      {appArtifacts.length > 0 &&
        appArtifacts.map((artifact) => (
          <div
            key={artifact.id}
            className="rounded-lg border border-default-200 p-3"
          >
            <div className="flex items-center gap-2 mb-1">
              <Icon name="Code" size="sm" className="text-secondary" />
              <span className="text-sm font-medium">{artifact.title}</span>
            </div>
            {artifact.preview && (
              <p className="text-xs text-default-500">{artifact.preview}</p>
            )}
          </div>
        ))}
      {turn.status === 'completed' && appArtifacts.length === 0 && (
        <span className="text-sm text-default-500">
          {(t as any)('App generated')}
        </span>
      )}
    </div>
  )
}
