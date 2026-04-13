import { memo } from 'react'
import { Chip } from '@heroui/react_3'
import { AgentAvatar, Icon } from '@/components'
import type { Agent } from '@/types'
import { CollectionView } from './CollectionView'

interface AgentCollectionProps {
  agents: Agent[]
  selectedAgentId?: string
  /** All selected IDs for multi-select highlighting */
  selectedIds?: string[]
  onSelectAgent: (id: string) => void
  /** Called on shift-click to add to preview stack */
  onShiftSelectAgent?: (id: string) => void
  onCreateAgent?: () => void
  isLoading: boolean
  search: string
  onSearchChange: (q: string) => void
  customAgentIds: Set<string>
  searchPlaceholder: string
  emptyLabel: string
  noMatchLabel: string
  className?: string
  searchInputRef?: React.RefObject<HTMLInputElement | null>
}

export const AgentCollection = memo(function AgentCollection({
  agents,
  selectedAgentId,
  selectedIds,
  onSelectAgent,
  onShiftSelectAgent,
  onCreateAgent,
  isLoading,
  search,
  onSearchChange,
  customAgentIds,
  searchPlaceholder,
  emptyLabel,
  noMatchLabel,
  className,
  searchInputRef,
}: AgentCollectionProps) {
  const newAgentCta = onCreateAgent ? (
    <button
      type="button"
      onClick={onCreateAgent}
      className={`flex w-full items-center gap-3 rounded-2xl p-2 transition-colors ${
        selectedAgentId === 'new'
          ? 'bg-default-200'
          : 'hover:bg-default-100'
      }`}
    >
      <div className="bg-default-200 flex size-10 shrink-0 items-center justify-center rounded-full">
        <Icon name="Plus" size="sm" className="text-muted" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col text-left">
        <span className="text-foreground text-sm font-medium">New agent</span>
        <span className="text-muted text-xs">Create a custom agent</span>
      </div>
    </button>
  ) : undefined

  return (
    <div
      className={`h-full min-h-0 flex-col gap-4 overflow-clip ${className ?? 'flex'}`}
    >
      {/* Agent list */}
      <div className="min-h-0 flex-1">
        <CollectionView
          items={agents}
          selectedId={selectedAgentId}
          selectedIds={selectedIds}
          onSelect={onSelectAgent}
          onShiftSelect={onShiftSelectAgent}
          isLoading={isLoading}
          search={search}
          onSearchChange={onSearchChange}
          searchPlaceholder={searchPlaceholder}
          getItemId={(agent) => agent.id}
          getItemTextValue={(agent) => agent.name}
          prependSlot={newAgentCta}
          renderItem={(agent) => (
            <div className="flex w-full items-center gap-3 rounded-2xl p-2">
              <AgentAvatar agent={agent} size="md" />
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="text-foreground truncate text-sm font-medium">
                  {agent.name}
                </span>
                <span className="text-muted truncate text-xs">
                  {agent.role}
                </span>
              </div>
              {!customAgentIds.has(agent.id) && (
                <Chip size="sm" variant="soft" className="shrink-0 text-[10px]">
                  Built-in
                </Chip>
              )}
            </div>
          )}
          emptyLabel={emptyLabel}
          noMatchLabel={noMatchLabel}
          searchInputRef={searchInputRef}
          ariaLabel="Agent list"
          showSearchShortcutHint
        />
      </div>
    </div>
  )
})
