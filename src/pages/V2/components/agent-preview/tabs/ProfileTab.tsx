import { useState, useCallback, useRef, useEffect } from 'react'
import { Input, ScrollShadow, TextArea } from '@heroui/react_3'
import { Icon, MarkdownRenderer } from '@/components'
import { useI18n } from '@/i18n'
import { updateAgent } from '@/stores/agentStore'
import type { Agent } from '@/types'

interface ProfileTabProps {
  agent: Agent
  isCustom: boolean
  onStartConversation: (agent: Agent) => void
}

export function ProfileTab({
  agent,
  isCustom,
  onStartConversation,
}: ProfileTabProps) {
  const { lang, t } = useI18n()
  const examples = agent.i18n?.[lang]?.examples ?? agent.examples

  return (
    <ScrollShadow hideScrollBar className="min-h-0 flex-1 overflow-y-auto">
      <div className="flex flex-col gap-5 py-1">
        {/* Role */}
        <ProfileSection icon="UserCircle" label="Role">
          {isCustom ? (
            <EditableField
              value={agent.role}
              placeholder="Describe the agent's role..."
              onSave={(v) => updateAgent(agent.id, { role: v })}
            />
          ) : (
            <p className="text-foreground text-sm leading-relaxed">
              {agent.role}
            </p>
          )}
        </ProfileSection>

        {/* Instructions */}
        <ProfileSection icon="PageEdit" label="Instructions">
          {isCustom ? (
            <EditableTextarea
              value={agent.instructions || ''}
              placeholder="Write the agent's system instructions..."
              onSave={(v) => updateAgent(agent.id, { instructions: v })}
            />
          ) : agent.instructions ? (
            <div className="text-foreground text-sm leading-relaxed">
              <MarkdownRenderer content={agent.instructions} />
            </div>
          ) : (
            <p className="text-muted text-sm italic">No instructions</p>
          )}
        </ProfileSection>

        {/* Tags */}
        {/* <ProfileSection icon="Tag" label="Tags">
          {agent.tags && agent.tags.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {agent.tags.map((tag) => (
                <Chip key={tag} size="sm" variant="soft" className="text-xs">
                  {tag}
                </Chip>
              ))}
            </div>
          ) : (
            <p className="text-muted text-sm italic">No tags</p>
          )}
        </ProfileSection> */}

        {/* Stats */}
        {((agent.tools && agent.tools.length > 0) ||
          (agent.knowledgeItemIds && agent.knowledgeItemIds.length > 0)) && (
          <div className="flex flex-wrap gap-4 text-xs">
            {agent.tools && agent.tools.length > 0 && (
              <div className="flex items-center gap-1.5">
                <Icon name="Tools" size="sm" className="text-muted" />
                <span className="text-muted">{t('Tools') as string}:</span>
                <span className="text-foreground font-medium">
                  {agent.tools.length}
                </span>
              </div>
            )}
            {agent.knowledgeItemIds && agent.knowledgeItemIds.length > 0 && (
              <div className="flex items-center gap-1.5">
                <Icon name="Book" size="sm" className="text-muted" />
                <span className="text-muted">{t('Knowledge') as string}:</span>
                <span className="text-foreground font-medium">
                  {agent.knowledgeItemIds.length}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Examples */}
        {examples && examples.length > 0 && (
          <ProfileSection icon="ChatBubble" label="Example prompts">
            <div className="flex flex-col gap-1.5">
              {examples.slice(0, 3).map((ex) => (
                <button
                  key={ex.id}
                  type="button"
                  className="bg-default-100 hover:bg-default-200 cursor-pointer rounded-lg px-3 py-2 text-left text-xs transition-colors"
                  onClick={() => onStartConversation(agent)}
                >
                  {ex.title || ex.prompt}
                </button>
              ))}
            </div>
          </ProfileSection>
        )}
      </div>
    </ScrollShadow>
  )
}

/* ─── Helpers ──────────────────────────────────────────────── */

function ProfileSection({
  icon,
  label,
  children,
}: {
  icon: string
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        <Icon name={icon as any} size="sm" className="text-muted" />
        <span className="text-muted text-xs font-medium uppercase tracking-wide">
          {label}
        </span>
      </div>
      {children}
    </div>
  )
}

/** Click-to-edit single-line field */
function EditableField({
  value,
  placeholder,
  onSave,
}: {
  value: string
  placeholder: string
  onSave: (value: string) => void
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setDraft(value)
  }, [value])

  useEffect(() => {
    if (isEditing) inputRef.current?.focus()
  }, [isEditing])

  const commit = useCallback(() => {
    const trimmed = draft.trim()
    if (trimmed && trimmed !== value) {
      onSave(trimmed)
    } else {
      setDraft(value)
    }
    setIsEditing(false)
  }, [draft, value, onSave])

  if (!isEditing) {
    return (
      <button
        type="button"
        className="text-foreground hover:bg-default-100 -mx-2 cursor-pointer rounded-lg px-2 py-1 text-left text-sm leading-relaxed transition-colors"
        onClick={() => setIsEditing(true)}
      >
        {value || <span className="text-muted italic">{placeholder}</span>}
      </button>
    )
  }

  return (
    <Input
      ref={inputRef}
      variant="secondary"
      value={draft}
      placeholder={placeholder}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') commit()
        if (e.key === 'Escape') {
          setDraft(value)
          setIsEditing(false)
        }
      }}
      className="-mx-1"
    />
  )
}

/** Click-to-edit multiline field */
function EditableTextarea({
  value,
  placeholder,
  onSave,
}: {
  value: string
  placeholder: string
  onSave: (value: string) => void
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    setDraft(value)
  }, [value])

  useEffect(() => {
    if (isEditing) textareaRef.current?.focus()
  }, [isEditing])

  const commit = useCallback(() => {
    const trimmed = draft.trim()
    if (trimmed !== value) {
      onSave(trimmed)
    }
    setIsEditing(false)
  }, [draft, value, onSave])

  if (!isEditing) {
    return (
      <button
        type="button"
        className="text-foreground hover:bg-default-100 -mx-2 cursor-pointer rounded-lg px-2 py-1 text-left text-sm leading-relaxed transition-colors"
        onClick={() => setIsEditing(true)}
      >
        {value ? (
          <MarkdownRenderer content={value} />
        ) : (
          <span className="text-muted italic">{placeholder}</span>
        )}
      </button>
    )
  }

  return (
    <div className="-mx-1 flex flex-col gap-1.5">
      <TextArea
        ref={textareaRef}
        variant="secondary"
        value={draft}
        placeholder={placeholder}
        rows={8}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            setDraft(value)
            setIsEditing(false)
          }
        }}
        style={{ resize: 'vertical' }}
      />
      <p className="text-muted text-[10px]">
        Esc to cancel &middot; click outside to save
      </p>
    </div>
  )
}
