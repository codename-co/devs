import { useState } from 'react'
import { Button, Chip, TextArea } from '@heroui/react_3'
import { Icon, MarkdownRenderer } from '@/components'
import { useI18n } from '@/i18n'
import {
  useAgentMemories,
  useAgentMemoryDocument,
} from '@/stores/agentMemoryStore'
import { writeAgentMemory } from '@/lib/memory-learning-service'
import { successToast, errorToast } from '@/lib/toast'
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
  const memoryDocument = useAgentMemoryDocument(agentId)
  const memoryDoc = memoryDocument?.synthesis?.trim() || ''

  const visibleMemories = memories.filter(
    (m) =>
      m.validationStatus === 'approved' || m.validationStatus === 'auto_approved',
  )

  const isEmpty = !memoryDoc && visibleMemories.length === 0

  return (
    <SectionCard
      icon="Brain"
      title={t('Memories') as string}
      count={visibleMemories.length + (memoryDoc ? 1 : 0)}
      defaultExpanded={false}
    >
      <div className="flex flex-col gap-3">
        {/* Editable long-term memory document (KISS memory) */}
        <MemoryDocumentEditor
          agentId={agentId}
          doc={memoryDoc}
          showEmptyState={isEmpty}
        />

        {visibleMemories.length > 0 && (
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
      </div>
    </SectionCard>
  )
}

/**
 * Inline editor for an agent's long-term memory document. Shows the markdown
 * with an edit affordance; editing swaps in a HeroUI v3 TextArea with
 * Save / Cancel. Saving writes straight to the memory document.
 */
function MemoryDocumentEditor({
  agentId,
  doc,
  showEmptyState,
}: {
  agentId: string
  doc: string
  showEmptyState: boolean
}) {
  const { t } = useI18n()
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState(doc)
  const [isSaving, setIsSaving] = useState(false)

  const startEditing = () => {
    setDraft(doc)
    setIsEditing(true)
  }

  const save = async () => {
    setIsSaving(true)
    try {
      await writeAgentMemory(agentId, draft)
      successToast(t('Memory updated'))
      setIsEditing(false)
    } catch (error) {
      errorToast(t('Failed to update memory'), error)
    } finally {
      setIsSaving(false)
    }
  }

  if (isEditing) {
    return (
      <div className="flex flex-col gap-2">
        <TextArea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={8}
          autoFocus
          placeholder={t(
            'Write what this agent should remember, as short notes…',
          )}
          className="w-full rounded-lg border border-default-200 bg-default-50 p-2 font-mono text-xs"
        />
        <div className="flex items-center justify-end gap-2">
          <Button
            size="sm"
            variant="ghost"
            onPress={() => setIsEditing(false)}
            isDisabled={isSaving}
          >
            {t('Cancel')}
          </Button>
          <Button
            size="sm"
            variant="primary"
            onPress={save}
            isPending={isSaving}
          >
            {t('Save')}
          </Button>
        </div>
      </div>
    )
  }

  if (!doc) {
    return (
      <div className="flex flex-col gap-2">
        {showEmptyState && (
          <SectionEmpty
            icon="Brain"
            message={t(
              'No memories yet — this agent will learn from conversations',
            )}
          />
        )}
        <Button
          size="sm"
          variant="ghost"
          className="self-start"
          onPress={startEditing}
        >
          <Icon name="Plus" size="sm" />
          {t('Add a note')}
        </Button>
      </div>
    )
  }

  return (
    <div className="group/mem relative">
      <div className="text-foreground text-xs leading-relaxed opacity-80">
        <MarkdownRenderer content={doc} />
      </div>
      <Button
        size="sm"
        variant="ghost"
        isIconOnly
        aria-label={t('Edit memory')}
        className="absolute right-0 top-0 opacity-0 transition-opacity group-hover/mem:opacity-100"
        onPress={startEditing}
      >
        <Icon name="EditPencil" size="sm" />
      </Button>
    </div>
  )
}
