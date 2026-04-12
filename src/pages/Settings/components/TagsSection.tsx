import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button, Input } from '@heroui/react'
import { Icon } from '@/components'
import { useI18n } from '@/i18n'
import {
  threadTags,
  useLiveMap,
  type ThreadTag,
} from '@/lib/yjs'
import {
  updateThreadTag,
  TAG_PALETTE,
} from '@/pages/V2/hooks/useThreadTags'
import { entityBelongsToSpace, useActiveSpaceId } from '@/stores/spaceStore'
import { DEFAULT_SPACE_ID } from '@/types'
import { nanoid } from 'nanoid'
import { useSettingsScope } from '../SettingsContext'
import localI18n from '../i18n'

/**
 * Resolve the effective spaceId to filter/create tags for,
 * based on the Settings scope (global vs space).
 */
function useTagSpaceId(): string {
  const scope = useSettingsScope()
  const activeSpaceId = useActiveSpaceId()
  return scope === 'space' ? activeSpaceId : DEFAULT_SPACE_ID
}

/** All tag definitions for a given spaceId. */
function useTagsForSpace(spaceId: string): ThreadTag[] {
  const all = useLiveMap(threadTags)
  return useMemo(
    () => all.filter((t) => entityBelongsToSpace(t.spaceId, spaceId)),
    [all, spaceId],
  )
}

/** Find or create a tag for a given color in the specified space. */
function ensureTagForColor(
  color: ThreadTag['color'],
  spaceId: string,
  existing: ThreadTag[],
): ThreadTag {
  const found = existing.find((t) => t.color === color)
  if (found) return found
  const palette = TAG_PALETTE.find((p) => p.color === color)!
  const tag: ThreadTag = {
    id: nanoid(),
    name: palette.defaultName,
    color,
    spaceId: spaceId === DEFAULT_SPACE_ID ? undefined : spaceId,
  }
  threadTags.set(tag.id, tag)
  return tag
}

export function TagsSection() {
  const { t } = useI18n(localI18n)
  const spaceId = useTagSpaceId()
  const spaceTags = useTagsForSpace(spaceId)

  return (
    <div className="space-y-4">
      <p className="text-sm text-default-500">
        {t('Customize the labels for your tag colors')}
      </p>
      <div className="flex flex-col gap-3">
        {TAG_PALETTE.map(({ color, defaultName, dotClass }) => {
          const tag = spaceTags.find((t) => t.color === color)
          return (
            <TagRow
              key={color}
              dotClass={dotClass}
              defaultName={defaultName}
              currentName={tag?.name ?? defaultName}
              tagExists={!!tag}
              onRename={(name) => {
                const existing = ensureTagForColor(color, spaceId, spaceTags)
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
