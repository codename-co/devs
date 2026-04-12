import { useCallback, useEffect, useRef, useState } from 'react'
import { Button, Input } from '@heroui/react'
import { Icon } from '@/components'
import { useI18n } from '@/i18n'
import {
  useThreadTagDefinitions,
  updateThreadTag,
  findOrCreateTagForColor,
  TAG_PALETTE,
} from '@/pages/V2/hooks/useThreadTags'
import localI18n from '../i18n'

export function TagsSection() {
  const { t } = useI18n(localI18n)
  const allTags = useThreadTagDefinitions()

  return (
    <div className="space-y-4">
      <p className="text-sm text-default-500">
        {t('Customize the labels for your tag colors')}
      </p>
      <div className="flex flex-col gap-3">
        {TAG_PALETTE.map(({ color, defaultName, dotClass }) => {
          const tag = allTags.find((t) => t.color === color)
          return (
            <TagRow
              key={color}
              dotClass={dotClass}
              defaultName={defaultName}
              currentName={tag?.name ?? defaultName}
              tagExists={!!tag}
              onRename={(name) => {
                // Ensure tag exists before renaming
                const existing = findOrCreateTagForColor(color, allTags)
                updateThreadTag(existing.id, { name })
              }}
              onReset={() => {
                if (tag) updateThreadTag(tag.id, { name: defaultName })
              }}
            />
          )
        })}
      </div>
    </div>
  )
}

function TagRow({
  dotClass,
  defaultName,
  currentName,
  tagExists,
  onRename,
  onReset,
}: {
  dotClass: string
  defaultName: string
  currentName: string
  tagExists: boolean
  onRename: (name: string) => void
  onReset: () => void
}) {
  const { t } = useI18n(localI18n)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(currentName)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setDraft(currentName)
  }, [currentName])

  useEffect(() => {
    if (editing) inputRef.current?.select()
  }, [editing])

  const save = useCallback(() => {
    const name = draft.trim() || defaultName
    onRename(name)
    setDraft(name)
    setEditing(false)
  }, [draft, defaultName, onRename])

  const isCustom = currentName !== defaultName && tagExists

  return (
    <div className="flex items-center gap-3">
      <span className={`size-4 shrink-0 rounded-full ${dotClass}`} />
      {editing ? (
        <Input
          ref={inputRef}
          size="sm"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => {
            if (e.key === 'Enter') save()
            if (e.key === 'Escape') {
              setDraft(currentName)
              setEditing(false)
            }
          }}
          className="max-w-xs"
        />
      ) : (
        <button
          type="button"
          onClick={() => {
            setDraft(currentName)
            setEditing(true)
          }}
          className="cursor-pointer text-left text-sm hover:underline"
        >
          {currentName}
          {isCustom && (
            <span className="text-default-400 ml-2">({defaultName})</span>
          )}
        </button>
      )}
      {isCustom && !editing && (
        <Button
          isIconOnly
          size="sm"
          variant="light"
          onPress={onReset}
          aria-label={t('Reset to default')}
        >
          <Icon name="Undo" className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  )
}
