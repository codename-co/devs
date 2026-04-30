import { Chip } from '@heroui/react_3'
import { Icon } from '@/components'
import { useI18n } from '@/i18n'
import { useAgentMemories } from '@/stores/agentMemoryStore'
import { SectionCard, SectionEmpty } from '../shared/SectionCard'

interface MemorySectionProps {
  agentId: string
}

const categoryIcons: Record<string, string> = {
  fact: 'LightBulbOn',
  preference: 'Star',
  behavior: 'Activity',
  domain_knowledge: 'GraduationCap',
  relationship: 'Group',
  procedure: 'Strategy',
  correction: 'EditPencil',
}

const confidenceColors: Record<string, string> = {
  high: 'text-success',
  medium: 'text-warning',
  low: 'text-muted',
}

function formatRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return d.toLocaleDateString()
}

export function MemorySection({ agentId }: MemorySectionProps) {
  const { t } = useI18n()
  const memories = useAgentMemories(agentId)

  const visibleMemories = memories.filter(
    (m) =>
      m.validationStatus === 'approved' || m.validationStatus === 'auto_approved',
  )

  return (
    <SectionCard
      icon="Brain"
      title={t('Memories') as string}
      count={visibleMemories.length}
      defaultExpanded={false}
    >
      {visibleMemories.length === 0 ? (
        <SectionEmpty
          icon="Brain"
          message={t('No memories yet — this agent will learn from conversations')}
        />
      ) : (
        <div className="flex flex-col gap-2">
          {visibleMemories.slice(0, 10).map((memory) => (
            <div
              key={memory.id}
              className="flex flex-col gap-1.5 rounded-lg px-2 py-2 transition-colors hover:bg-default-100"
            >
              <div className="flex items-center gap-2">
                <Icon
                  name={(categoryIcons[memory.category] || 'LightBulbOn') as any}
                  size="xs"
                  className="text-muted shrink-0"
                />
                <span className="text-foreground flex-1 truncate text-xs font-medium">
                  {memory.title}
                </span>
                <Chip
                  size="sm"
                  variant="soft"
                  className={`shrink-0 text-xs ${confidenceColors[memory.confidence] ?? ''}`}
                >
                  {memory.confidence}
                </Chip>
              </div>
              <p className="text-foreground line-clamp-2 pl-4 text-xs leading-relaxed opacity-70">
                {memory.content}
              </p>
              <div className="flex items-center gap-2 pl-4">
                <Chip size="sm" variant="soft" className="text-xs">
                  {memory.category.replace('_', ' ')}
                </Chip>
                <span className="text-muted flex-1 text-right text-xs">
                  {formatRelativeTime(memory.learnedAt)}
                </span>
              </div>
            </div>
          ))}
          {visibleMemories.length > 10 && (
            <p className="text-muted px-2 text-xs">
              +{visibleMemories.length - 10} more memories
            </p>
          )}
        </div>
      )}
    </SectionCard>
  )
}
