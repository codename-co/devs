import { Spinner } from '@/components/heroui-compat'

import { useI18n } from '@/i18n'
import { Icon } from '@/components'
import type { Session, SessionTurn } from '@/types'

interface MediaTurnProps {
  turn: SessionTurn
  session: Session
}

export function MediaTurn({ turn, session }: MediaTurnProps) {
  const { t } = useI18n()

  // Find image/video artifacts produced by this turn
  const mediaArtifacts = session.artifacts.filter(
    (a) =>
      turn.artifactIds.includes(a.id) &&
      (a.type === 'image' || a.type === 'video'),
  )

  if (turn.status === 'pending' || turn.status === 'running') {
    return (
      <div className="flex items-center gap-2 text-default-400 py-2">
        <Spinner size="sm" />
        <span className="text-sm">{t('Generating media…')}</span>
      </div>
    )
  }

  return (
    <div className="py-2">
      {turn.status === 'failed' && (
        <div className="flex items-center gap-2 text-danger">
          <Icon name="WarningTriangle" size="sm" />
          <span className="text-sm">{t('Generation failed')}</span>
        </div>
      )}
      {mediaArtifacts.length > 0 && (
        <div className="grid grid-cols-2 gap-2 max-w-md">
          {mediaArtifacts.map((artifact) => (
            <div
              key={artifact.id}
              className="rounded-lg overflow-hidden border border-default-200"
            >
              {artifact.type === 'image' && artifact.content && (
                <img
                  src={
                    artifact.content.startsWith('data:')
                      ? artifact.content
                      : `data:${artifact.mimeType || 'image/png'};base64,${artifact.content}`
                  }
                  alt={artifact.title}
                  className="w-full h-auto"
                />
              )}
              <p className="text-xs text-default-500 p-1 truncate">
                {artifact.title}
              </p>
            </div>
          ))}
        </div>
      )}
      {turn.status === 'completed' && mediaArtifacts.length === 0 && (
        <span className="text-sm text-default-500">{t('Media generated')}</span>
      )}
    </div>
  )
}
