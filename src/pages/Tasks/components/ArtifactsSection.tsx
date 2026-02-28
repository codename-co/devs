import { memo } from 'react'

import { useI18n } from '@/i18n'
import { Icon, Title, ArtifactCard } from '@/components'
import type { Artifact as ArtifactType } from '@/types'

export const ArtifactsSection = memo(
  ({ artifacts }: { artifacts: ArtifactType[] }) => {
    const { t } = useI18n()

    if (!artifacts.length) return null

    return (
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3 text-default-500">
          <Icon name="Page" size="sm" />
          <Title level={5}>
            {t('Artifacts')} ({artifacts.length})
          </Title>
        </div>
        <div className="space-y-2">
          {artifacts.map((artifact) => (
            <ArtifactCard key={artifact.id} artifact={artifact} />
          ))}
        </div>
      </div>
    )
  },
)

ArtifactsSection.displayName = 'ArtifactsSection'
