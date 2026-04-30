import { Icon } from '@/components'
import { useI18n } from '@/i18n'
import { getKnowledgeItem } from '@/stores/knowledgeStore'
import { SectionCard, SectionEmpty } from '../shared/SectionCard'
import type { Agent } from '@/types'

interface KnowledgeSectionProps {
  agent: Agent
}

function getFileIcon(fileType?: string): string {
  switch (fileType) {
    case 'image':
      return 'MediaImage'
    case 'document':
      return 'Page'
    default:
      return 'Page'
  }
}

function formatSize(bytes?: number): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function KnowledgeSection({ agent }: KnowledgeSectionProps) {
  const { t } = useI18n()
  const ids = agent.knowledgeItemIds ?? []
  const items = ids
    .map((id) => getKnowledgeItem(id))
    .filter((item) => item != null)

  return (
    <SectionCard icon="Book" title={t('Knowledge') as string} count={items.length}>
      {items.length === 0 ? (
        <SectionEmpty
          icon="Book"
          message={t('No knowledge items assigned')}
        />
      ) : (
        <div className="flex flex-col gap-1">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-default-100"
            >
              <Icon
                name={getFileIcon(item.fileType) as any}
                size="sm"
                className="text-muted shrink-0"
              />
              <span className="text-foreground flex-1 truncate text-xs">
                {item.name}
              </span>
              {item.size != null && item.size > 0 && (
                <span className="text-muted shrink-0 text-xs">
                  {formatSize(item.size)}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  )
}
