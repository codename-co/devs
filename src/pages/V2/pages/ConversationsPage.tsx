import {
  ArtifactPanel,
  ConversationPreviewContent,
  Sidebar,
  ThreadList,
  ThreadPreview,
  PreviewStack,
  WorkspaceLayout,
} from '../components'
import { useV2Shell } from '../context'
import { useCallback } from 'react'
import type { ThreadFilter } from '../types'

/**
 * Conversations view — conversation list + feed/custom-style preview + optional
 * artifact panel. Derives all state from V2ShellContext.
 */
export function ConversationsPage() {
  const {
    filter,
    selectedId,
    selectedIds,
    pinnedIds,
    activeId,
    setFilter,
    filteredThreads,
    selectedThreads,
    isLoading,
    search,
    setSearch,
    selectItem,
    addItem,
    removeItem,
    togglePin,
    deselect,
    pagination,
    goToPrevious,
    goToNext,
    handleToggleStar,
    handleToggleStarById,
    handleToggleReadById,
    markRead,
    handleReply,
    isReplying,
    replyPrompt,
    setReplyPrompt,
    handleSelectArtifact,
    inspectedItem,
    closeInspectedPanel,
    navItems,
    openSettings,
    searchInputRef,
    tagDefinitions,
  } = useV2Shell()

  const handleCreateNew = useCallback(() => {
    setFilter('home' as ThreadFilter)
  }, [setFilter])

  const hasPanel = inspectedItem !== null
  const hasSelection = selectedIds.length > 0

  const previewContent =
    selectedThreads.length > 0 ? (
      <PreviewStack>
        {selectedThreads.map((thread) => {
          const isActive = thread.id === activeId
          const isPinned = pinnedIds.includes(thread.id)
          return (
            <ThreadPreview
              key={thread.id}
              thread={thread}
              isPinned={isPinned}
              isActive={isActive}
              onClose={() => removeItem(thread.id)}
              onTogglePin={() => togglePin(thread.id)}
              pagination={isActive ? pagination : undefined}
              goToPrevious={isActive ? goToPrevious : undefined}
              goToNext={isActive ? goToNext : undefined}
              onDeselect={deselect}
              isStarred={thread.starColor !== null}
              starColor={thread.starColor}
              onToggleStar={handleToggleStar}
              onReply={handleReply}
              isReplying={isActive ? isReplying : false}
              replyPrompt={isActive ? replyPrompt : ''}
              onReplyPromptChange={isActive ? setReplyPrompt : undefined}
              onSelectArtifact={handleSelectArtifact}
              mode="custom"
              onMarkRead={markRead}
              renderCustomContent={(t) => (
                <ConversationPreviewContent thread={t} />
              )}
            />
          )
        })}
      </PreviewStack>
    ) : (
      <ThreadPreview
        thread={undefined}
        onDeselect={deselect}
        isStarred={false}
        starColor={null}
        onToggleStar={handleToggleStar}
        onReply={handleReply}
        className="hidden md:flex"
        onSelectArtifact={handleSelectArtifact}
        mode="custom"
        renderCustomContent={(t) => (
          <ConversationPreviewContent thread={t} />
        )}
      />
    )

  return (
    <WorkspaceLayout
      sidebar={
        <Sidebar
          items={navItems}
          activeItemId={filter}
          onFilterChange={(f) => setFilter(f as ThreadFilter)}
          onOpenSettings={openSettings}
        />
      }
      collection={
        <ThreadList
          threads={filteredThreads}
          selectedThreadId={selectedId}
          selectedIds={selectedIds}
          onSelectThread={selectItem}
          onShiftSelectThread={addItem}
          onCreateNew={handleCreateNew}
          createNewLabel="New conversation"
          createNewSublabel="Start a new conversation"
          isLoading={isLoading}
          search={search}
          onSearchChange={setSearch}
          onToggleStar={handleToggleStarById}
          onToggleRead={handleToggleReadById}
          searchInputRef={searchInputRef}
          className={hasSelection ? 'hidden md:flex' : 'flex'}
          tags={tagDefinitions}
        />
      }
      preview={
        <div
          className={`min-h-0 min-w-0 ${hasSelection ? '' : 'hidden md:block'}`}
        >
          {previewContent}
        </div>
      }
      auxiliary={
        hasPanel ? (
          <ArtifactPanel item={inspectedItem} onClose={closeInspectedPanel} />
        ) : undefined
      }
    />
  )
}
