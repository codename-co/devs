import { ArtifactPreviewCard } from '@/components/ArtifactPreviewCard'
import type { Artifact } from '@/types'

interface ThreadAttachmentsProps {
  artifacts: Artifact[]
  onSelectArtifact?: (artifact: Artifact) => void
}

export function ThreadAttachments({
  artifacts,
  onSelectArtifact,
}: ThreadAttachmentsProps) {
  if (artifacts.length === 0) return null

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-muted text-xs font-medium uppercase tracking-wide">
        Attachments ({artifacts.length})
      </h3>
      <div className="space-y-2">
        {artifacts.map((a) => (
          <ArtifactPreviewCard
            key={a.id}
            item={{ kind: 'artifact', artifact: a }}
            onPress={() => onSelectArtifact?.(a)}
          />
        ))}
      </div>
    </div>
  )
}
