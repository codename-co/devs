import { memo } from 'react'
import { Button, Dropdown, Label } from '@heroui/react_3'
import { Icon } from '@/components'
import type { ThreadTag } from '@/lib/yjs'
import type { Thread } from '../types'
import type { CollectionLayout } from '../types'
import type { BoardColumnKey } from './ThreadBoardView'
import { ThreadListItem } from './ThreadListItem'
import { ThreadBoardView } from './ThreadBoardView'
import { CollectionView } from './CollectionView'

interface ThreadListProps {
  threads: Thread[]
  selectedThreadId: string | undefined
  /** All selected IDs for multi-select highlighting */
  selectedIds?: string[]
  onSelectThread: (id: string) => void
  /** Called on shift-click to add to preview stack */
  onShiftSelectThread?: (id: string) => void
  onCreateNew?: () => void
  isLoading: boolean
  search: string
  onSearchChange: (q: string) => void
  onToggleStar?: (id: string) => void
  onToggleRead?: (id: string) => void
  /** Called when a board card is dragged to a different status column */
  onStatusChange?: (threadId: string, newStatus: BoardColumnKey) => void
  searchInputRef?: React.RefObject<HTMLInputElement | null>
  className?: string
  createNewLabel?: string
  createNewSublabel?: string
  layout?: CollectionLayout
  onLayoutChange?: (layout: CollectionLayout) => void
  /** Tag definitions for # autocomplete in search */
  tags?: ThreadTag[]
}

export const ThreadList = memo(function ThreadList({
  threads,
  selectedThreadId,
  selectedIds,
  onSelectThread,
  onShiftSelectThread,
  onCreateNew,
  isLoading,
  search,
  onSearchChange,
  onToggleStar,
  onToggleRead,
  onStatusChange,
  searchInputRef,
  className,
  createNewLabel = 'New conversation',
  createNewSublabel = 'Start a new conversation',
  layout = 'list',
  onLayoutChange,
  tags,
}: ThreadListProps) {
  const layoutOptions: { id: CollectionLayout; label: string; icon: 'TableRows' | 'KanbanBoard' }[] = [
    { id: 'list', label: 'List', icon: 'TableRows' },
    { id: 'board', label: 'Board', icon: 'KanbanBoard' },
  ]

  const currentIcon = layoutOptions.find((o) => o.id === layout)?.icon ?? 'TableRows'

  const layoutToggle = onLayoutChange ? (
    <Dropdown>
      <Button isIconOnly size="sm" variant="ghost" aria-label="Change layout">
        <Icon name={currentIcon} size="sm" />
      </Button>
      <Dropdown.Popover placement="bottom end">
        <Dropdown.Menu
          selectionMode="single"
          selectedKeys={[layout]}
          onAction={(key) => onLayoutChange(key as CollectionLayout)}
        >
          {layoutOptions.map((opt) => (
            <Dropdown.Item key={opt.id} id={opt.id} textValue={opt.label}>
              <Icon name={opt.icon} size="sm" />
              <Label>{opt.label}</Label>
            </Dropdown.Item>
          ))}
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  ) : undefined

  const newCta = onCreateNew ? (
    <button
      type="button"
      onClick={onCreateNew}
      className="hover:bg-default-100 flex w-full items-center gap-3 rounded-2xl p-2 transition-colors"
    >
      <div className="bg-default-200 flex size-10 shrink-0 items-center justify-center rounded-full">
        <Icon name="Plus" size="sm" className="text-muted" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col text-left">
        <span className="text-foreground text-sm font-medium">
          {createNewLabel}
        </span>
        <span className="text-muted text-xs">{createNewSublabel}</span>
      </div>
    </button>
  ) : undefined

  if (layout === 'board') {
    return (
      <ThreadBoardView
        threads={threads}
        selectedId={selectedThreadId}
        selectedIds={selectedIds}
        onSelect={onSelectThread}
        onStatusChange={onStatusChange}
        className={className}
        layoutToggle={layoutToggle}
        search={search}
        onSearchChange={onSearchChange}
        searchInputRef={searchInputRef}
        isLoading={isLoading}
        tags={tags}
      />
    )
  }

  return (
    <CollectionView
      items={threads}
      selectedId={selectedThreadId}
      selectedIds={selectedIds}
      onSelect={onSelectThread}
      onShiftSelect={onShiftSelectThread}
      isLoading={isLoading}
      search={search}
      onSearchChange={onSearchChange}
      searchPlaceholder="Search tasks and conversations…"
      getItemId={(thread) => thread.id}
      getItemTextValue={(thread) => thread.title}
      renderItem={(thread) => (
        <ThreadListItem
          thread={thread}
          onToggleStar={onToggleStar}
          onToggleRead={onToggleRead}
        />
      )}
      emptyLabel="No threads yet"
      noMatchLabel="No matching threads"
      className={className}
      searchInputRef={searchInputRef}
      ariaLabel="Thread list"
      tags={tags}
      prependSlot={
        <div className="flex items-center gap-2">
          <div className="flex-1">{newCta}</div>
          {layoutToggle}
        </div>
      }
    />
  )
})
