import { useCallback } from 'react'
import {
  AgentCollection,
  AgentPreview,
  PreviewStack,
  Sidebar,
  WorkspaceLayout,
} from '../components'
import { useV2Shell } from '../context'
import type { ThreadFilter } from '../types'

/**
 * Agents browser view — agent collection list + agent detail preview.
 * Derives all state from V2ShellContext.
 */
export function AgentsPage() {
  const {
    filter,
    selectedId,
    selectedIds,
    pinnedIds,
    activeId,
    setFilter,
    filteredAgents,
    selectedAgents,
    activeAgent,
    customAgentIds,
    isAgentsLoading,
    search,
    setSearch,
    selectItem,
    addItem,
    removeItem,
    togglePin,
    deselect,
    goToNext,
    goToPrevious,
    pagination,
    handleStartConversation,
    openSettings,
    searchInputRef,
  } = useV2Shell()

  const handleCreateAgent = useCallback(() => {
    selectItem('new')
  }, [selectItem])

  const handleCreated = useCallback(
    (agentId: string) => {
      selectItem(agentId)
    },
    [selectItem],
  )

  const hasSelection = selectedIds.length > 0

  const previewContent =
    selectedAgents.length > 0 ? (
      <PreviewStack>
        {selectedAgents.map((agent) => {
          const isActive = agent.id === activeId
          const isPinned = pinnedIds.includes(agent.id)
          return (
            <AgentPreview
              key={agent.id}
              agent={agent}
              selectedId={agent.id}
              isCustom={customAgentIds.has(agent.id)}
              isPinned={isPinned}
              isActive={isActive}
              onClose={() => removeItem(agent.id)}
              onTogglePin={() => togglePin(agent.id)}
              onStartConversation={handleStartConversation}
              onDeselect={deselect}
              onCreated={handleCreated}
              pagination={isActive ? pagination : undefined}
              goToPrevious={isActive ? goToPrevious : undefined}
              goToNext={isActive ? goToNext : undefined}
            />
          )
        })}
      </PreviewStack>
    ) : (
      <AgentPreview
        agent={activeAgent}
        selectedId={selectedId}
        isCustom={activeAgent ? customAgentIds.has(activeAgent.id) : false}
        onStartConversation={handleStartConversation}
        onDeselect={deselect}
        onCreated={handleCreated}
        pagination={pagination}
        goToPrevious={goToPrevious}
        goToNext={goToNext}
        className="hidden md:flex"
      />
    )

  return (
    <WorkspaceLayout
      sidebar={
        <Sidebar
          activeFilter={filter}
          onFilterChange={(f) => setFilter(f as ThreadFilter)}
          onOpenSettings={openSettings}
        />
      }
      collection={
        <AgentCollection
          agents={filteredAgents}
          selectedAgentId={selectedId}
          selectedIds={selectedIds}
          onSelectAgent={selectItem}
          onShiftSelectAgent={addItem}
          onCreateAgent={handleCreateAgent}
          isLoading={isAgentsLoading}
          search={search}
          onSearchChange={setSearch}
          customAgentIds={customAgentIds}
          searchPlaceholder="Search agents…"
          emptyLabel="No agents found"
          noMatchLabel="No agents found"
          searchInputRef={searchInputRef}
          className={hasSelection ? 'hidden md:flex' : 'flex'}
        />
      }
      preview={
        <div
          className={`min-h-0 min-w-0 ${hasSelection ? '' : 'hidden md:block'}`}
        >
          {previewContent}
        </div>
      }
    />
  )
}
