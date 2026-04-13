import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Card,
  Chip,
  Kbd,
  ScrollShadow,
  SearchField,
  Skeleton,
} from '@heroui/react_3'
import { AgentAvatar, Icon } from '@/components'
import type { ThreadTag } from '@/lib/yjs'
import type { Thread } from '../types'
import {
  formatRelativeTime,
  stripMarkdown,
  truncate,
} from '../lib/thread-utils'
import { useTagMention } from '../hooks/useTagMention'
import { TagMentionPopover } from './TagMentionPopover'

/** Kanban-style column definition */
interface BoardColumn {
  key: string
  label: string
  color: 'default' | 'accent' | 'warning' | 'success' | 'danger'
}

/** Task statuses that map to board columns */
export type BoardColumnKey = 'pending' | 'in_progress' | 'completed' | 'failed'

const COLUMNS: BoardColumn[] = [
  { key: 'pending', label: 'To do', color: 'default' },
  { key: 'in_progress', label: 'In progress', color: 'accent' },
  { key: 'completed', label: 'Done', color: 'success' },
  { key: 'failed', label: 'Failed', color: 'danger' },
]

const DEBOUNCE_MS = 200
const DRAG_MIME = 'application/x-devs-thread-id'

/** Resolve the board column key for a thread */
function getColumnKey(thread: Thread): string {
  const status = thread.source.task?.status
  if (!status) return 'pending'
  if (status === 'claimed') return 'in_progress'
  return status
}

interface ThreadBoardViewProps {
  threads: Thread[]
  selectedId?: string
  selectedIds?: string[]
  onSelect: (id: string) => void
  /** Called when a card is dragged to a different column */
  onStatusChange?: (threadId: string, newStatus: BoardColumnKey) => void
  className?: string
  layoutToggle?: React.ReactNode
  search: string
  onSearchChange: (q: string) => void
  searchInputRef?: React.RefObject<HTMLInputElement | null>
  isLoading?: boolean
  /** Tag definitions for # autocomplete */
  tags?: ThreadTag[]
}

export const ThreadBoardView = memo(function ThreadBoardView({
  threads,
  selectedId,
  selectedIds,
  onSelect,
  onStatusChange,
  className,
  layoutToggle,
  search,
  onSearchChange,
  searchInputRef,
  isLoading = false,
  tags = [],
}: ThreadBoardViewProps) {
  const [inputValue, setInputValue] = useState(search)
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const [dropTarget, setDropTarget] = useState<string | null>(null)
  const localInputRef = useRef<HTMLInputElement>(null)
  const effectiveInputRef = searchInputRef ?? localInputRef

  useEffect(() => {
    setInputValue(search)
  }, [search])

  useEffect(() => () => clearTimeout(timeoutRef.current), [])

  const handleSearchChange = useCallback(
    (value: string) => {
      setInputValue(value)
      clearTimeout(timeoutRef.current)
      timeoutRef.current = setTimeout(() => onSearchChange(value), DEBOUNCE_MS)
    },
    [onSearchChange],
  )

  const tagMention = useTagMention({
    tags,
    inputValue,
    onInputValueChange: handleSearchChange,
    inputRef: effectiveInputRef,
  })

  const tagMap = useMemo(() => {
    const m = new Map<string, ThreadTag>()
    for (const tag of tags) m.set(tag.id, tag)
    return m
  }, [tags])

  const grouped = useMemo(() => {
    const map = new Map<string, Thread[]>()
    for (const col of COLUMNS) map.set(col.key, [])
    for (const thread of threads) {
      const key = getColumnKey(thread)
      const bucket = map.get(key)
      if (bucket) bucket.push(thread)
      else map.get('pending')!.push(thread)
    }
    return map
  }, [threads])

  const handleDragOver = useCallback(
    (e: React.DragEvent, colKey: string) => {
      if (!e.dataTransfer.types.includes(DRAG_MIME)) return
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'
      if (dropTarget !== colKey) setDropTarget(colKey)
    },
    [dropTarget],
  )

  const handleDragLeave = useCallback(
    (e: React.DragEvent, colKey: string) => {
      // Only clear if actually leaving the column (not entering a child)
      const related = e.relatedTarget as HTMLElement | null
      const currentTarget = e.currentTarget as HTMLElement
      if (!related || !currentTarget.contains(related)) {
        if (dropTarget === colKey) setDropTarget(null)
      }
    },
    [dropTarget],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent, colKey: string) => {
      e.preventDefault()
      setDropTarget(null)
      const threadId = e.dataTransfer.getData(DRAG_MIME)
      if (!threadId || !onStatusChange) return
      // Only fire if the thread is actually moving to a different column
      const thread = threads.find((t) => t.id === threadId)
      if (thread && getColumnKey(thread) !== colKey) {
        onStatusChange(threadId, colKey as BoardColumnKey)
      }
    },
    [onStatusChange, threads],
  )

  return (
    <div
      className={`flex h-full min-h-0 flex-col overflow-clip px-4 pb-6 pt-4 ${className ?? ''}`}
    >
      {/* Search + layout toggle row */}
      <div className="flex items-center gap-2 pb-4">
        <div className="relative flex-1">
          <SearchField
            name="board-search"
            variant="primary"
            value={inputValue}
            onChange={handleSearchChange}
          >
            <SearchField.Group>
              <SearchField.SearchIcon />
              <SearchField.Input
                ref={effectiveInputRef}
                placeholder="Search tasks and conversations…"
                onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                  tagMention.handleKeyNavigation(e)
                }}
              />
              <SearchField.ClearButton />
              <span className="me-1.5">
                <Kbd>
                  <Kbd.Abbr keyValue="command" title="Command">
                    ⌘
                  </Kbd.Abbr>
                  <Kbd.Content>K</Kbd.Content>
                </Kbd>
              </span>
            </SearchField.Group>
          </SearchField>
          {tagMention.showPopover && (
            <TagMentionPopover
              tags={tagMention.filteredTags}
              selectedIndex={tagMention.selectedIndex}
              onSelect={tagMention.handleSelect}
              onClose={tagMention.closePopover}
            />
          )}
        </div>
        {layoutToggle}
      </div>

      {/* Board columns */}
      {isLoading ? (
        <div className="flex flex-1 gap-4 overflow-x-auto">
          {COLUMNS.map((col) => (
            <div key={col.key} className="flex w-72 shrink-0 flex-col gap-3">
              <Skeleton className="h-6 w-24 rounded" />
              <div className="bg-default-50 dark:bg-default-50/50 flex flex-1 flex-col gap-2 rounded-xl p-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-28 w-full rounded-xl" />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-1 gap-4 overflow-x-auto">
          {COLUMNS.map((col) => {
            const items = grouped.get(col.key) ?? []
            const isOver = dropTarget === col.key
            return (
              <div
                key={col.key}
                className="flex h-full w-72 shrink-0 flex-col gap-3"
                onDragOver={(e) => handleDragOver(e, col.key)}
                onDragLeave={(e) => handleDragLeave(e, col.key)}
                onDrop={(e) => handleDrop(e, col.key)}
              >
                {/* Column header */}
                <div className="flex items-center gap-2 px-1">
                  <Chip size="sm" variant="soft" color={col.color}>
                    {col.label}
                  </Chip>
                  <span className="text-muted text-xs">{items.length}</span>
                </div>

                {/* Column body */}
                <ScrollShadow
                  hideScrollBar
                  className={`flex-1 overflow-y-auto rounded-xl p-2 transition-colors ${
                    isOver
                      ? 'bg-accent-100/50 ring-accent ring-2 dark:bg-accent-900/30'
                      : 'bg-default-50 dark:bg-default-50/50'
                  }`}
                >
                  <div className="flex flex-col gap-2">
                    {items.length === 0 ? (
                      <p className="text-muted px-2 py-8 text-center text-xs">
                        {isOver ? 'Drop here' : 'No items'}
                      </p>
                    ) : (
                      items.map((thread) => {
                        const isSelected =
                          thread.id === selectedId ||
                          (selectedIds?.includes(thread.id) ?? false)
                        return (
                          <BoardCard
                            key={thread.id}
                            thread={thread}
                            isSelected={isSelected}
                            onSelect={onSelect}
                            draggable={!!thread.source.task}
                            tagMap={tagMap}
                          />
                        )
                      })
                    )}
                  </div>
                </ScrollShadow>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
})

/** Individual card inside a board column */
const BoardCard = memo(function BoardCard({
  thread,
  isSelected,
  onSelect,
  draggable = false,
  tagMap,
}: {
  thread: Thread
  isSelected: boolean
  onSelect: (id: string) => void
  draggable?: boolean
  tagMap: Map<string, ThreadTag>
}) {
  const agent = thread.agent
  const snippet = truncate(stripMarkdown(thread.snippet), 100)

  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      e.dataTransfer.setData(DRAG_MIME, thread.id)
      e.dataTransfer.effectAllowed = 'move'
    },
    [thread.id],
  )

  return (
    <button
      type="button"
      onClick={() => onSelect(thread.id)}
      className={`w-full text-left ${draggable ? 'cursor-grab active:cursor-grabbing' : ''}`}
      draggable={draggable}
      onDragStart={handleDragStart}
    >
      <Card
        className={`w-full transition-shadow hover:shadow-md ${isSelected ? 'ring-accent ring-2' : ''}`}
      >
        <Card.Header className="pb-1">
          <div className="flex w-full items-start gap-2">
            <Card.Title className="min-w-0 flex-1 text-sm leading-snug">
              {thread.title}
            </Card.Title>
            {thread.starColor && (
              <span
                className="size-2 shrink-0 rounded-full"
                style={{ backgroundColor: thread.starColor }}
              />
            )}
          </div>
        </Card.Header>

        <Card.Content className="py-0">
          {snippet && (
            <p className="text-muted text-xs leading-relaxed">{snippet}</p>
          )}
        </Card.Content>

        <Card.Footer className="pt-2">
          <div className="flex w-full flex-col gap-1.5">
            {thread.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {thread.tags.map((tagId) => {
                  const tag = tagMap.get(tagId)
                  if (!tag) return null
                  return (
                    <Chip key={tagId} size="sm" variant="soft" color={tag.color}>
                      {tag.name}
                    </Chip>
                  )
                })}
              </div>
            )}
            <div className="flex w-full items-center gap-2">
              {agent ? (
                <AgentAvatar agent={agent} size="sm" />
              ) : (
                <div className="bg-default-200 flex size-5 shrink-0 items-center justify-center rounded-full">
                  <Icon name="User" size="xs" />
                </div>
              )}
              <span className="text-muted min-w-0 flex-1 truncate text-xs">
                {thread.kind === 'media'
                  ? 'Studio'
                  : (agent?.name ?? 'Unknown agent')}
              </span>
              {thread.artifacts.length > 0 && (
                <Icon
                  size="xs"
                  name="Attachment"
                  className="text-muted shrink-0"
                />
              )}
              <span className="text-muted shrink-0 text-[10px]">
                {formatRelativeTime(thread.updatedAt)}
              </span>
            </div>
          </div>
        </Card.Footer>
      </Card>
    </button>
  )
})
