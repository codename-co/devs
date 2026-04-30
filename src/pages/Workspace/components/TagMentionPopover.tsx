import { useEffect, useCallback } from 'react'
import { Chip, ListBox } from '@heroui/react_3'
import type { ThreadTag } from '@/lib/yjs'

interface TagMentionPopoverProps {
  tags: ThreadTag[]
  selectedIndex: number
  onSelect: (tag: ThreadTag) => void
  onClose: () => void
}

export function TagMentionPopover({
  tags,
  selectedIndex,
  onSelect,
  onClose,
}: TagMentionPopoverProps) {
  // Scroll selected item into view
  useEffect(() => {
    const el = document.querySelector(
      '[data-testid="tag-mention-popover"] [data-selected="true"]',
    )
    el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [selectedIndex])

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const popover = document.querySelector(
        '[data-testid="tag-mention-popover"]',
      )
      if (popover && !popover.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  const handleAction = useCallback(
    (key: React.Key) => {
      const tag = tags.find((t) => t.id === key)
      if (tag) onSelect(tag)
    },
    [tags, onSelect],
  )

  if (tags.length === 0) {
    return (
      <div
        className="bg-surface border-divider absolute top-full left-0 z-50 mt-1 w-64 rounded-lg border p-3 shadow-lg"
        data-testid="tag-mention-popover"
      >
        <p className="text-muted text-sm">No tags found</p>
      </div>
    )
  }

  return (
    <div
      className="bg-surface border-divider absolute top-full left-0 z-50 mt-1 max-h-52 w-64 overflow-y-auto rounded-lg border shadow-lg"
      data-testid="tag-mention-popover"
    >
      <ListBox
        aria-label="Select a tag"
        selectionMode="single"
        selectedKeys={tags[selectedIndex] ? [tags[selectedIndex].id] : []}
        onAction={handleAction}
      >
        {tags.map((tag, idx) => {
          const isSelected = idx === selectedIndex
          return (
            <ListBox.Item
              key={tag.id}
              id={tag.id}
              textValue={tag.name}
              data-selected={isSelected}
              className={isSelected ? 'bg-default-100' : ''}
              onPress={() => onSelect(tag)}
            >
              <div className="flex items-center gap-2">
                <Chip size="sm" variant="primary" color={tag.color}>
                  {tag.name}
                </Chip>
              </div>
            </ListBox.Item>
          )
        })}
      </ListBox>
    </div>
  )
}
