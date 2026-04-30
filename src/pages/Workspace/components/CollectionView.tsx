import { useCallback, useMemo, useRef } from 'react'
import {
  Button,
  Dropdown,
  Kbd,
  Label,
  ListBox,
  ListLayout,
  ScrollShadow,
  SearchField,
  Skeleton,
  Virtualizer,
} from '@heroui/react_3'
import { Icon } from '@/components'
import type { ThreadTag } from '@/lib/yjs'
import { useDebouncedSearch } from '../hooks/useDebouncedSearch'
import { useTagMention } from '../hooks/useTagMention'
import { TagMentionPopover } from './TagMentionPopover'

/** Search filter presets — inserted/removed as `is:xxx` tokens in the search string */
const SEARCH_FILTERS = [
  { id: 'task', label: 'Tasks', icon: 'PcCheck' as const },
  { id: 'conversation', label: 'Conversations', icon: 'ChatBubble' as const },
  { id: 'starred', label: 'Starred', icon: 'Star' as const },
  { id: 'unread', label: 'Unread', icon: 'Mail' as const },
]

/** Extract active `is:xxx` tokens from a search string */
function parseIsTokens(value: string): Set<string> {
  const tokens = new Set<string>()
  const re = /is:(\w+)/gi
  let match
  while ((match = re.exec(value)) !== null) {
    tokens.add(match[1].toLowerCase())
  }
  return tokens
}

/** Toggle an `is:xxx` token in a search string */
function toggleIsToken(value: string, token: string): string {
  const prefix = `is:${token}`
  const re = new RegExp(`\\bis:${token}\\b\\s*`, 'gi')
  if (re.test(value)) {
    // Remove the token
    return value.replace(re, '').trim()
  }
  // Add the token
  return value ? `${prefix} ${value}` : prefix
}

interface CollectionViewProps<T> {
  items: T[]
  selectedId?: string
  /** All selected IDs (for highlighting pinned items in multi-select) */
  selectedIds?: string[]
  onSelect: (id: string) => void
  /** Called on shift-click to add an item to the preview stack */
  onShiftSelect?: (id: string) => void
  isLoading?: boolean
  search: string
  onSearchChange: (q: string) => void
  searchPlaceholder: string
  getItemId: (item: T) => string
  getItemTextValue: (item: T) => string
  renderItem: (item: T, isSelected: boolean) => React.ReactNode
  emptyLabel: string
  noMatchLabel: string
  className?: string
  searchInputRef?: React.RefObject<HTMLInputElement | null>
  ariaLabel?: string
  showSearchShortcutHint?: boolean
  virtualized?: boolean
  /** Rendered between the search field and the scrollable list */
  prependSlot?: React.ReactNode
  /** Tag definitions for # autocomplete */
  tags?: ThreadTag[]
}

export function CollectionView<T extends object>({
  items,
  selectedId,
  selectedIds,
  onSelect,
  onShiftSelect,
  isLoading = false,
  search,
  onSearchChange,
  searchPlaceholder,
  getItemId,
  getItemTextValue,
  renderItem,
  emptyLabel,
  noMatchLabel,
  className,
  searchInputRef,
  ariaLabel = 'Collection list',
  showSearchShortcutHint = true,
  virtualized = true,
  prependSlot,
  tags = [],
}: CollectionViewProps<T>) {
  const localInputRef = useRef<HTMLInputElement>(null)
  const effectiveInputRef = searchInputRef ?? localInputRef

  const [inputValue, setInputValue, flushInputValue] = useDebouncedSearch(
    search,
    onSearchChange,
  )

  const tagMention = useTagMention({
    tags,
    inputValue,
    onInputValueChange: setInputValue,
    inputRef: effectiveInputRef,
  })

  // Only pass the single active ID to ListBox's selectedKeys.
  // With selectionMode="single", passing multiple keys causes React Aria to
  // treat clicks on any already-selected key as a deselect (toggle-off),
  // firing onSelectionChange with an empty set and silently dropping the click.
  // Multi-select visual highlighting is handled separately via renderItem's
  // isSelected || selectedIds?.includes(id) check.
  const selectedKeys = useMemo(
    () => (selectedId ? [selectedId] : []),
    [selectedId],
  )

  /** Ref to track whether the last click was a shift-click (used to suppress onSelectionChange) */
  const shiftClickedRef = useRef(false)

  const listBox = (
    <ListBox
      aria-label={ariaLabel}
      selectionMode="single"
      className="gap-0 p-0"
      selectedKeys={selectedKeys}
      onSelectionChange={(keys) => {
        // Skip if this was triggered by a shift-click (we handle it separately)
        if (shiftClickedRef.current) {
          shiftClickedRef.current = false
          return
        }
        const selected = [...keys][0] as string | undefined
        if (selected) onSelect(selected)
      }}
      items={items}
    >
      {(item) => {
        const id = getItemId(item)
        return (
          <ListBox.Item
            key={id}
            id={id}
            textValue={getItemTextValue(item)}
            className="group relative flex min-h-0 w-full items-start gap-3 rounded-2xl bg-transparent p-3 hover:bg-transparent active:scale-100 data-[hovered=true]:bg-transparent data-[pressed=true]:scale-100 data-[selected=true]:bg-surface data-[selected=true]:shadow-sm"
            onClickCapture={(e: React.MouseEvent) => {
              if (e.shiftKey && onShiftSelect) {
                e.stopPropagation()
                shiftClickedRef.current = true
                onShiftSelect(id)
              }
            }}
          >
            {({ isSelected }) =>
              renderItem(
                item,
                isSelected || (selectedIds?.includes(id) ?? false),
              )
            }
          </ListBox.Item>
        )
      }}
    </ListBox>
  )

  const activeTokens = useMemo(() => parseIsTokens(inputValue), [inputValue])
  const hasActiveFilters = activeTokens.size > 0

  const handleFilterToggle = useCallback(
    (token: string) => {
      const newValue = toggleIsToken(inputValue, token)
      flushInputValue(newValue)
    },
    [inputValue, flushInputValue],
  )

  return (
    <div
      className={`h-full min-h-0 flex-col gap-4 overflow-clip px-4 pb-6 pt-4 ${className ?? 'flex'}`}
    >
      <div className="relative flex items-center gap-1.5">
        <SearchField
          name="collection-search"
          variant="primary"
          value={inputValue}
          onChange={setInputValue}
          className="flex-1"
        >
          <SearchField.Group>
            <SearchField.SearchIcon />
            <SearchField.Input
              ref={effectiveInputRef}
              placeholder={searchPlaceholder}
              onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                tagMention.handleKeyNavigation(e)
              }}
            />
            <SearchField.ClearButton />
            {showSearchShortcutHint && (
              <span className="me-1.5">
                <Kbd variant="light">
                  <Kbd.Abbr keyValue="command" title="Command">
                    ⌘
                  </Kbd.Abbr>
                  <Kbd.Content>K</Kbd.Content>
                </Kbd>
              </span>
            )}
          </SearchField.Group>
        </SearchField>
        <Dropdown>
          <Button
            isIconOnly
            size="sm"
            variant={hasActiveFilters ? 'secondary' : 'ghost'}
            aria-label="Filter threads"
          >
            <Icon name="FilterList" size="sm" />
          </Button>
          <Dropdown.Popover placement="bottom end">
            <Dropdown.Menu
              selectionMode="multiple"
              selectedKeys={activeTokens}
              onAction={(key) => handleFilterToggle(key as string)}
            >
              {SEARCH_FILTERS.map((f) => (
                <Dropdown.Item key={f.id} id={f.id} textValue={f.label}>
                  <Icon name={f.icon} size="sm" />
                  <Label>{f.label}</Label>
                  <Dropdown.ItemIndicator type="dot" />
                </Dropdown.Item>
              ))}
            </Dropdown.Menu>
          </Dropdown.Popover>
        </Dropdown>
        {tagMention.showPopover && (
          <TagMentionPopover
            tags={tagMention.filteredTags}
            selectedIndex={tagMention.selectedIndex}
            onSelect={tagMention.handleSelect}
            onClose={tagMention.closePopover}
          />
        )}
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3 p-3">
              <Skeleton className="size-9 shrink-0 rounded-full" />
              <div className="flex flex-1 flex-col gap-1.5">
                <Skeleton className="h-3.5 w-3/4 rounded" />
                <Skeleton className="h-3 w-1/2 rounded" />
                <Skeleton className="h-3 w-full rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-1 flex-col">
          {prependSlot}
          <div className="flex flex-1 items-center justify-center">
            <span className="text-muted text-sm">
              {inputValue ? noMatchLabel : emptyLabel}
            </span>
          </div>
        </div>
      ) : (
        <ScrollShadow hideScrollBar className="flex-1 overflow-y-auto">
          {prependSlot}
          {virtualized ? (
            <Virtualizer layout={ListLayout}>{listBox}</Virtualizer>
          ) : (
            listBox
          )}
        </ScrollShadow>
      )}
    </div>
  )
}
