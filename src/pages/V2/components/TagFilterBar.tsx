import { useCallback } from 'react'
import { Chip } from '@heroui/react_3'
import type { ThreadTag } from '@/lib/yjs'

interface TagFilterBarProps {
  tags: ThreadTag[]
  selectedIds: Set<string>
  onSelectionChange: (ids: Set<string>) => void
}

/**
 * Horizontal row of tag chips for filtering the thread list.
 * Supports multi-select with OR logic. Only rendered when tags exist.
 */
export function TagFilterBar({
  tags,
  selectedIds,
  onSelectionChange,
}: TagFilterBarProps) {
  if (tags.length === 0) return null

  const handleToggle = useCallback(
    (tagId: string) => {
      const next = new Set(selectedIds)
      if (next.has(tagId)) next.delete(tagId)
      else next.add(tagId)
      onSelectionChange(next)
    },
    [selectedIds, onSelectionChange],
  )

  const hasActive = selectedIds.size > 0

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {tags.map((tag) => {
        const isActive = selectedIds.has(tag.id)
        return (
          <button
            key={tag.id}
            type="button"
            onClick={() => handleToggle(tag.id)}
            className="cursor-pointer"
          >
            <Chip
              size="sm"
              variant={isActive ? 'primary' : 'secondary'}
              color={tag.color}
              className={`transition-opacity ${!isActive && hasActive ? 'opacity-50' : ''}`}
            >
              {tag.name}
            </Chip>
          </button>
        )
      })}
      {hasActive && (
        <button
          type="button"
          onClick={() => onSelectionChange(new Set())}
          className="text-muted hover:text-foreground cursor-pointer text-xs underline"
        >
          Clear
        </button>
      )}
    </div>
  )
}
