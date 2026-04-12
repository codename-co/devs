import { useCallback, useMemo, useRef, useState } from 'react'
import { Button, Tooltip } from '@heroui/react_3'
import { Icon } from '@/components'
import type { ThreadTag } from '@/lib/yjs'
import {
  useThreadTagDefinitions,
  useThreadTagMap,
  addTagToThread,
  removeTagFromThread,
  findOrCreateTagForColor,
  TAG_PALETTE,
} from '../hooks/useThreadTags'

interface TagPickerProps {
  threadId: string
  /** Current tag IDs on the thread */
  threadTagIds: string[]
}

/**
 * macOS-style tag picker with two states:
 * - **Collapsed** (default): shows only the active tag dots + a Label button
 * - **Expanded**: shows the full color palette for toggling tags
 *
 * Clicking the Label icon (or any active dot area) enters edit mode.
 * Clicking outside or pressing Escape exits edit mode.
 */
export function TagPicker({ threadId, threadTagIds }: TagPickerProps) {
  const allTags = useThreadTagDefinitions()
  const tagMap = useThreadTagMap()
  const threadTagSet = useMemo(() => new Set(threadTagIds), [threadTagIds])
  const [editing, setEditing] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleToggle = useCallback(
    (color: ThreadTag['color']) => {
      const tag = findOrCreateTagForColor(color, allTags)
      if (threadTagSet.has(tag.id)) {
        removeTagFromThread(threadId, tag.id)
      } else {
        addTagToThread(threadId, tag.id)
      }
    },
    [threadId, allTags, threadTagSet],
  )

  const handleBlur = useCallback(
    (e: React.FocusEvent) => {
      // Close if focus leaves the container entirely
      if (!containerRef.current?.contains(e.relatedTarget as Node)) {
        setEditing(false)
      }
    },
    [],
  )

  // Resolve active tags to their palette entries for display
  const activeDots = useMemo(() => {
    return threadTagIds
      .map((id) => {
        const tag = tagMap.get(id)
        if (!tag) return null
        const palette = TAG_PALETTE.find((p) => p.color === tag.color)
        return palette ? { ...palette, name: tag.name } : null
      })
      .filter(Boolean) as { color: ThreadTag['color']; defaultName: string; dotClass: string; name: string }[]
  }, [threadTagIds, tagMap])

  // Expanded: full palette
  if (editing) {
    return (
      <div
        ref={containerRef}
        className="flex items-center gap-1"
        onBlur={handleBlur}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setEditing(false)
        }}
      >
        {TAG_PALETTE.map(({ color, defaultName, dotClass }) => {
          const tag = allTags.find((t) => t.color === color)
          const isActive = tag ? threadTagSet.has(tag.id) : false
          const label = tag?.name ?? defaultName
          return (
            <Tooltip key={color} delay={0}>
              <button
                type="button"
                onClick={() => handleToggle(color)}
                className={`relative flex size-3.5 shrink-0 items-center justify-center rounded-full transition-transform hover:scale-125 ${dotClass}`}
                aria-label={isActive ? `Remove tag ${label}` : `Add tag ${label}`}
              >
                {isActive && (
                  <Icon
                    name="Check"
                    className="size-2.5 text-white drop-shadow-sm"
                  />
                )}
              </button>
              <Tooltip.Content>
                <p className="text-xs">{label}</p>
              </Tooltip.Content>
            </Tooltip>
          )
        })}
      </div>
    )
  }

  // Collapsed: active tag dots + Label trigger
  return (
    <div className="flex items-center gap-1">
      {activeDots.map(({ color, dotClass, name }) => (
        <Tooltip key={color} delay={0}>
          <span className={`size-2.5 shrink-0 rounded-full ${dotClass}`} />
          <Tooltip.Content>
            <p className="text-xs">{name}</p>
          </Tooltip.Content>
        </Tooltip>
      ))}
      <Tooltip delay={0}>
        <Button
          isIconOnly
          size="sm"
          variant="ghost"
          className="text-muted hover:text-foreground size-6"
          aria-label="Edit tags"
          onPress={() => setEditing(true)}
        >
          <Icon name="Label" className="size-3.5" />
        </Button>
        <Tooltip.Content>
          <p className="text-xs">Tags</p>
        </Tooltip.Content>
      </Tooltip>
    </div>
  )
}
