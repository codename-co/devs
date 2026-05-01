import {
  ArtifactPanel,
  Sidebar,
  ThreadList,
  ThreadPreview,
  PreviewStack,
  WorkspaceLayout,
} from '../components'
import type { BoardColumnKey } from '../components'
import type { Thread } from '../types'
import type { PreviewMode } from '../components/ThreadPreview'
import type { Artifact } from '@/types'
import type { CollectionLayout } from '../types'
import { useV2Shell } from '../context'
import { useI18n } from '@/i18n'
import { useNavigate } from 'react-router-dom'
import { memo, useCallback, useState } from 'react'
import { Drawer } from '@heroui/react_3'
import type { ThreadFilter } from '../types'
import { useTaskStore } from '@/stores/taskStore'
import { submitBackground } from '@/lib/orchestrator/engine'

/**
 * Tasks view — task list + preview + optional
 * artifact panel. Derives all state from V2ShellContext.
 */
export function ThreadsPage() {
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
    replyingThreadIds,
    replyPrompts,
    setReplyPromptForThread,
    isReplying,
    replyPrompt,
    setReplyPrompt,
    handleSelectArtifact,
    inspectedItem,
    closeInspectedPanel,
    openSettings,
    searchInputRef,
    tagDefinitions,
  } = useV2Shell()

  const navigate = useNavigate()
  const { t, url } = useI18n()

  const [previewMode, setPreviewMode] = useState<PreviewMode>('feed')
  const [collectionLayout, setCollectionLayout] =
    useState<CollectionLayout>('list')

  const togglePreviewMode = useCallback(() => {
    setPreviewMode((prev) => (prev === 'feed' ? 'transcript' : 'feed'))
  }, [])

  const handleCreateNew = useCallback(() => {
    navigate(url(''))
  }, [navigate, url])

  /** Handle drag & drop status change on the board */
  const handleStatusChange = useCallback(
    (threadId: string, newStatus: BoardColumnKey) => {
      const thread = filteredThreads.find((t) => t.id === threadId)
      const task = thread?.source.task
      if (!task) return

      const statusMap: Record<BoardColumnKey, string> = {
        pending: 'pending',
        in_progress: 'in_progress',
        completed: 'completed',
        failed: 'failed',
      }

      const newTaskStatus = statusMap[newStatus]
      if (newTaskStatus === task.status) return

      // Update the task status
      useTaskStore.getState().updateTask(task.id, {
        status: newTaskStatus as any,
        ...(newTaskStatus === 'pending' ? { assignedAgentId: undefined } : {}),
        ...(newTaskStatus === 'completed' ? { completedAt: new Date() } : {}),
      })

      // Side effect: kick off orchestration when moved to "in progress"
      if (newStatus === 'in_progress' && task.description) {
        submitBackground(task.description, task.id)
      }
    },
    [filteredThreads],
  )

  const hasPanel = inspectedItem !== null
  const hasSelection = selectedIds.length > 0
  const isBoardLayout = collectionLayout === 'board'

  /** The active thread for the board drawer (only the last selected) */
  const activeThread =
    selectedThreads.find((t) => t.id === activeId) ?? selectedThreads[0]

  const previewContent =
    selectedThreads.length > 0 ? (
      <PreviewStack>
        {selectedThreads.map((thread) => {
          const isActive = thread.id === activeId
          const isPinned = pinnedIds.includes(thread.id)
          return (
            <PinnableThreadPreview
              key={thread.id}
              thread={thread}
              isPinned={isPinned}
              isActive={isActive}
              isReplying={replyingThreadIds.has(thread.id)}
              replyPrompt={replyPrompts[thread.id] ?? ''}
              pagination={isActive ? pagination : undefined}
              goToPrevious={isActive ? goToPrevious : undefined}
              goToNext={isActive ? goToNext : undefined}
              onDeselect={deselect}
              onRemove={removeItem}
              onTogglePin={togglePin}
              onToggleStar={handleToggleStar}
              onReply={handleReply}
              onReplyPromptChange={setReplyPromptForThread}
              onSelectArtifact={handleSelectArtifact}
              mode={previewMode}
              onMarkRead={markRead}
              onToggleTranscript={togglePreviewMode}
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
        mode={previewMode}
        onToggleTranscript={togglePreviewMode}
      />
    )

  return (
    <>
      <WorkspaceLayout
        sidebar={
          <Sidebar
            activeFilter={filter}
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
            createNewLabel={t('New task')}
            createNewSublabel={t('Start a new task')}
            isLoading={isLoading}
            search={search}
            onSearchChange={setSearch}
            onToggleStar={handleToggleStarById}
            onToggleRead={handleToggleReadById}
            onStatusChange={handleStatusChange}
            searchInputRef={searchInputRef}
            className={
              isBoardLayout ? 'flex' : hasSelection ? 'hidden md:flex' : 'flex'
            }
            layout={collectionLayout}
            onLayoutChange={setCollectionLayout}
            tags={tagDefinitions}
          />
        }
        preview={
          isBoardLayout ? undefined : (
            <div
              className={`min-h-0 min-w-0 ${hasSelection ? '' : 'hidden md:block'}`}
            >
              {previewContent}
            </div>
          )
        }
        auxiliary={
          hasPanel && !isBoardLayout ? (
            <ArtifactPanel item={inspectedItem} onClose={closeInspectedPanel} />
          ) : undefined
        }
      />

      {/* Board mode: preview in a right-side drawer */}
      {isBoardLayout && (
        <Drawer.Backdrop
          isOpen={hasSelection}
          onOpenChange={(open) => {
            if (!open) deselect()
          }}
          // variant="transparent"
          variant="blur"
        >
          <Drawer.Content
            placement="bottom"
            className="w-full max-w-4xl m-auto"
          >
            <Drawer.Dialog className="h-full">
              <Drawer.CloseTrigger />
              <Drawer.Body className="p-0">
                {activeThread && (
                  <ThreadPreview
                    thread={activeThread}
                    isPinned={false}
                    isActive
                    onClose={deselect}
                    onDeselect={deselect}
                    isStarred={activeThread.starColor !== null}
                    starColor={activeThread.starColor}
                    onToggleStar={handleToggleStar}
                    onReply={handleReply}
                    isReplying={isReplying}
                    replyPrompt={replyPrompt}
                    onReplyPromptChange={setReplyPrompt}
                    onSelectArtifact={handleSelectArtifact}
                    mode={previewMode}
                    onMarkRead={markRead}
                    onToggleTranscript={togglePreviewMode}
                    pagination={pagination}
                    goToPrevious={goToPrevious}
                    goToNext={goToNext}
                  />
                )}
              </Drawer.Body>
            </Drawer.Dialog>
          </Drawer.Content>
        </Drawer.Backdrop>
      )}
    </>
  )
}

/**
 * Wrapper that memoizes per-thread callbacks so ThreadPreview (memo) doesn't
 * re-render just because inline arrows are recreated.
 */
const PinnableThreadPreview = memo(function PinnableThreadPreview({
  thread,
  isPinned,
  isActive,
  isReplying,
  replyPrompt,
  pagination,
  goToPrevious,
  goToNext,
  onDeselect,
  onRemove,
  onTogglePin,
  onToggleStar,
  onReply,
  onReplyPromptChange,
  onSelectArtifact,
  mode,
  onMarkRead,
  onToggleTranscript,
}: {
  thread: Thread
  isPinned: boolean
  isActive: boolean
  isReplying: boolean
  replyPrompt: string
  pagination?: { current: number; total: number }
  goToPrevious?: () => void
  goToNext?: () => void
  onDeselect: () => void
  onRemove: (id: string) => void
  onTogglePin: (id: string) => void
  onToggleStar: () => void
  onReply: (content: string, threadId?: string) => Promise<void>
  onReplyPromptChange: (threadId: string, value: string) => void
  onSelectArtifact: (artifact: Artifact) => void
  mode: PreviewMode
  onMarkRead: (id: string) => void
  onToggleTranscript: () => void
}) {
  const threadId = thread.id

  const handleClose = useCallback(() => onRemove(threadId), [onRemove, threadId])
  const handleTogglePin = useCallback(() => onTogglePin(threadId), [onTogglePin, threadId])
  const handleReply = useCallback(
    (content: string) => onReply(content, threadId),
    [onReply, threadId],
  )
  const handlePromptChange = useCallback(
    (value: string) => onReplyPromptChange(threadId, value),
    [onReplyPromptChange, threadId],
  )

  return (
    <ThreadPreview
      thread={thread}
      isPinned={isPinned}
      isActive={isActive}
      onClose={handleClose}
      onTogglePin={handleTogglePin}
      pagination={pagination}
      goToPrevious={goToPrevious}
      goToNext={goToNext}
      onDeselect={onDeselect}
      isStarred={thread.starColor !== null}
      starColor={thread.starColor}
      onToggleStar={onToggleStar}
      onReply={handleReply}
      isReplying={isReplying}
      replyPrompt={replyPrompt}
      onReplyPromptChange={handlePromptChange}
      onSelectArtifact={onSelectArtifact}
      mode={mode}
      onMarkRead={onMarkRead}
      onToggleTranscript={onToggleTranscript}
    />
  )
})
