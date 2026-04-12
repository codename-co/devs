import { useCallback, useMemo } from 'react'
import { Tooltip } from '@heroui/react_3'
import { Icon } from '@/components'
import type { ThreadTag } from '@/lib/yjs'
import {
  useThreadTagDefinitions,
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
 * macOS-style inline tag picker — a row of colored dots.
 * Clicking a dot instantly toggles that color tag on the thread.
 * Active tags show a small checkmark overlay.
 */
export function TagPicker({ threadId, threadTagIds }: TagPickerProps) {
  const allTags = useThreadTagDefinitions()
  const threadTagSet = useMemo(() => new Set(threadTagIds), [threadTagIds])

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

  return (
    <div className="flex items-center gap-1">
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
