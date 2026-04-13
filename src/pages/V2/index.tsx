import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useThreads } from './hooks/useThreads'
import { useThreadSelection } from './hooks/useThreadSelection'
import { useReadStatus } from './hooks/useReadStatus'
import { useThreadTagDefinitions, useThreadTagMap } from './hooks/useThreadTags'
import { useConversationStore } from '@/stores/conversationStore'
import { useAgentsSeparated, getAgentById } from '@/stores/agentStore'
import { useActiveSpaceId, entityBelongsToSpace } from '@/stores/spaceStore'
import { useSessionStore } from '@/stores/sessionStore'
import {
  conversations as conversationsMap,
  tasks as tasksMap,
  sessions as sessionsMap,
  studioEntries as studioEntriesMap,
} from '@/lib/yjs'
import { submitChat } from '@/lib/chat'
import { GlobalSearch } from '@/features/search'
import { SettingsModal } from '@/components/SettingsModal'
import { useInspectorPanelStore } from '@/stores/inspectorPanelStore'
import { useI18n } from '@/i18n'
import type { PreviewItem } from '@/components/ArtifactPreviewCard'
import type { NavItem } from './types'
import type { Artifact } from '@/types'
import { V2ShellContext } from './context'

/** Normalize a string for diacritics-insensitive search */
const norm = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
import { AgentsPage } from './pages/AgentsPage'
import { ConversationsPage } from './pages/ConversationsPage'
import { NewTaskPage } from './pages/NewTaskPage'
import { ThreadsPage } from './pages/ThreadsPage'

const NAV_ITEMS: Omit<NavItem, 'count'>[] = [
  { id: 'inbox', label: 'Threads', icon: 'MultiBubble', color: 'primary' },
  { id: 'tasks', label: 'Tasks', icon: 'PcCheck', color: 'secondary' },
  {
    id: 'conversations',
    label: 'Conversations',
    icon: 'ChatBubble',
  },
  { id: 'starred', label: 'Starred', icon: 'Star', color: 'warning' },
  { id: 'agents', label: 'Agents', icon: 'Group' },
]

export const V2Page = () => {
  const { markRead, markUnread, isRead } = useReadStatus()
  return <V2Shell markRead={markRead} markUnread={markUnread} isRead={isRead} />
}

function V2Shell({
  markRead,
  markUnread,
  isRead,
}: {
  markRead: (id: string) => void
  markUnread: (id: string) => void
  isRead: (id: string) => boolean
}) {
  const { lang, t } = useI18n()
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  const {
    customAgents,
    builtInAgents,
    loading: isAgentsLoading,
  } = useAgentsSeparated()

  const openSettings = useCallback(() => setIsSettingsOpen(true), [])
  const closeSettings = useCallback(() => setIsSettingsOpen(false), [])

  const {
    selectedThreadId,
    selectedIds,
    pinnedIds,
    activeId,
    filter,
    search,
    inspectSegment,
    selectThread,
    addToSelection,
    removeFromSelection,
    togglePinItem,
    setFilter,
    setSearch,
    setInspect,
    deselect,
  } = useThreadSelection()

  const { threads, isLoading } = useThreads(filter)

  const tagDefinitions = useThreadTagDefinitions()
  const tagMap = useThreadTagMap()

  const deferredSearch = useDeferredValue(search)

  const filteredThreads = useMemo(() => {
    let result = threads
    if (!deferredSearch) return result

    // Extract #tag-name tokens and remaining free-text
    const tagNames: string[] = []
    const freeText = norm(
      deferredSearch
        .replace(/#(\S+)/g, (_, name) => {
          tagNames.push(norm(name))
          return ''
        })
        .trim(),
    )

    // Resolve tag names → tag IDs
    if (tagNames.length > 0) {
      const matchedIds = new Set<string>()
      for (const [id, tag] of tagMap) {
        const tagNameNorm = norm(tag.name)
        const tagNameHyphenated = tagNameNorm.replace(/\s+/g, '-')
        if (
          tagNames.includes(tagNameNorm) ||
          tagNames.includes(tagNameHyphenated)
        )
          matchedIds.add(id)
      }
      // OR logic: thread must have at least one matching tag
      result = result.filter((thread) =>
        thread.tags.some((tagId) => matchedIds.has(tagId)),
      )
    }

    // Free-text filter (AND with tag filter)
    if (freeText) {
      result = result.filter(
        (thread) =>
          norm(thread.title).includes(freeText) ||
          (thread.agent?.name && norm(thread.agent.name).includes(freeText)) ||
          norm(thread.snippet).includes(freeText),
      )
    }

    return result
  }, [threads, deferredSearch, tagMap])

  const selectedThread = useMemo(
    () => filteredThreads.find((thread) => thread.id === selectedThreadId),
    [filteredThreads, selectedThreadId],
  )

  const selectedThreads = useMemo(
    () =>
      selectedIds
        .map((id) => filteredThreads.find((t) => t.id === id))
        .filter(Boolean) as typeof filteredThreads,
    [filteredThreads, selectedIds],
  )

  const activeThread = useMemo(
    () =>
      activeId ? filteredThreads.find((t) => t.id === activeId) : undefined,
    [filteredThreads, activeId],
  )

  const activeSpaceId = useActiveSpaceId()

  const allAgents = useMemo(
    () => [
      ...customAgents.filter((a) =>
        entityBelongsToSpace(a.spaceId, activeSpaceId),
      ),
      ...builtInAgents,
    ],
    [customAgents, builtInAgents, activeSpaceId],
  )

  const customAgentIds = useMemo(
    () => new Set(customAgents.map((agent) => agent.id)),
    [customAgents],
  )

  const filteredAgents = useMemo(() => {
    if (!deferredSearch) return allAgents
    const q = norm(deferredSearch)
    return allAgents.filter(
      (agent) =>
        norm(agent.name).includes(q) ||
        (agent.role && norm(agent.role).includes(q)) ||
        (agent.desc && norm(agent.desc).includes(q)) ||
        agent.tags?.some((tag) => norm(tag).includes(q)),
    )
  }, [allAgents, deferredSearch])

  const selectedAgent = useMemo(
    () =>
      filter === 'agents'
        ? (filteredAgents.find((agent) => agent.id === selectedThreadId) ??
          null)
        : null,
    [filter, filteredAgents, selectedThreadId],
  )

  const selectedAgents = useMemo(
    () =>
      filter === 'agents'
        ? (selectedIds
            .map((id) => filteredAgents.find((a) => a.id === id))
            .filter(Boolean) as typeof filteredAgents)
        : [],
    [filter, filteredAgents, selectedIds],
  )

  const activeAgent = useMemo(
    () =>
      filter === 'agents'
        ? (filteredAgents.find((a) => a.id === activeId) ?? null)
        : null,
    [filter, filteredAgents, activeId],
  )

  const activeCollectionIds = useMemo(
    () =>
      filter === 'agents'
        ? filteredAgents.map((agent) => agent.id)
        : filteredThreads.map((thread) => thread.id),
    [filter, filteredAgents, filteredThreads],
  )

  const selectedIndex = activeId ? activeCollectionIds.indexOf(activeId) : -1

  const navRef = useRef({ activeCollectionIds, selectedIndex })
  navRef.current = { activeCollectionIds, selectedIndex }

  const goToPrevious = useCallback(() => {
    const { activeCollectionIds: ids, selectedIndex: idx } = navRef.current
    if (idx > 0) selectThread(ids[idx - 1])
  }, [selectThread])

  const goToNext = useCallback(() => {
    const { activeCollectionIds: ids, selectedIndex: idx } = navRef.current
    if (idx < ids.length - 1) selectThread(ids[idx + 1])
    else if (idx === -1 && ids.length > 0) selectThread(ids[0])
  }, [selectThread])

  const pagination = useMemo(
    () => ({
      current: selectedIndex + 1,
      total: activeCollectionIds.length,
    }),
    [selectedIndex, activeCollectionIds.length],
  )

  const navItems = useMemo<NavItem[]>(() => {
    return NAV_ITEMS
    // const unread = threads.filter((thread) => thread.unread).length
    // return NAV_ITEMS.map((item) => ({
    //   ...item,
    //   // count: item.id === 'inbox' ? unread || undefined : undefined,
    // })) as NavItem[]
  }, [threads])

  const handleToggleRead = useCallback(() => {
    if (!selectedThreadId) return
    if (isRead(selectedThreadId)) markUnread(selectedThreadId)
    else markRead(selectedThreadId)
  }, [selectedThreadId, isRead, markRead, markUnread])

  const { loadConversation } = useConversationStore()
  const { addTurn } = useSessionStore()
  const [isReplying, setIsReplying] = useState(false)
  const [replyPrompt, setReplyPrompt] = useState('')

  const widgetCacheRef = useRef<Map<string, PreviewItem>>(new Map())

  const inspectedItem = useMemo<PreviewItem | null>(() => {
    if (!inspectSegment) return null
    if (inspectSegment.type === 'artifact' && activeThread) {
      const artifact = activeThread.artifacts.find(
        (a) => a.id === inspectSegment.id,
      )
      if (artifact) return { kind: 'artifact', artifact }
    }
    const cached = widgetCacheRef.current.get(inspectSegment.id)
    if (cached) return cached
    return null
  }, [inspectSegment, activeThread])

  const closeInspectedPanel = useCallback(() => setInspect(null), [setInspect])

  const handleSelectArtifact = useCallback(
    (artifact: Artifact) => setInspect({ type: 'artifact', id: artifact.id }),
    [setInspect],
  )

  useEffect(() => {
    const unsubscribe = useInspectorPanelStore.subscribe((state, prev) => {
      if (state.item && state.item !== prev.item) {
        if (state.item.type === 'widget') {
          const id = state.item.widgetId ?? `w-${Date.now()}`
          const preview: PreviewItem = {
            kind: 'widget',
            widget: {
              id,
              title: state.item.title ?? 'Widget',
              code: state.item.code,
              widgetType: state.item.widgetType,
              language: state.item.language,
            },
          }
          widgetCacheRef.current.set(id, preview)
          setInspect({ type: 'widget', id })
        } else if (state.item.type === 'artifact') {
          setInspect({ type: 'artifact', id: state.item.artifact.id })
        }
        useInspectorPanelStore.getState().close()
      }
    })
    return unsubscribe
  }, [setInspect])

  const resolveConvId = useCallback((threadId: string): string | undefined => {
    if (conversationsMap.has(threadId)) return threadId
    const task = tasksMap.get(threadId)
    return task?.conversationId ?? undefined
  }, [])

  /** Default amber color used when toggling star without a specific color */
  const DEFAULT_STAR_COLOR = '#F59E0B'

  const handleSetStarColor = useCallback(
    (threadId: string, color: string | null) => {
      // Task
      const task = tasksMap.get(threadId)
      if (task) {
        tasksMap.set(threadId, {
          ...task,
          starColor: color ?? undefined,
          isPinned: color !== null,
        })
        return
      }

      // Session
      const session = sessionsMap.get(threadId)
      if (session) {
        sessionsMap.set(threadId, {
          ...session,
          starColor: color ?? undefined,
          isPinned: color !== null,
        })
        return
      }

      // Studio entry
      const entry = studioEntriesMap.get(threadId)
      if (entry) {
        studioEntriesMap.set(threadId, {
          ...entry,
          isFavorite: color !== null,
        })
        return
      }

      // Conversation
      const convId = resolveConvId(threadId)
      if (!convId) return
      const conv = conversationsMap.get(convId)
      if (!conv) return
      conversationsMap.set(convId, {
        ...conv,
        starColor: color ?? undefined,
        isPinned: color !== null,
      })
    },
    [resolveConvId],
  )

  const handleToggleStarById = useCallback(
    (threadId: string) => {
      // Determine current starred state to toggle
      const task = tasksMap.get(threadId)
      if (task) {
        const isStarred = !!(task.starColor || task.isPinned)
        handleSetStarColor(threadId, isStarred ? null : DEFAULT_STAR_COLOR)
        return
      }

      const session = sessionsMap.get(threadId)
      if (session) {
        const isStarred = !!(session.starColor || session.isPinned)
        handleSetStarColor(threadId, isStarred ? null : DEFAULT_STAR_COLOR)
        return
      }

      const entry = studioEntriesMap.get(threadId)
      if (entry) {
        handleSetStarColor(
          threadId,
          entry.isFavorite ? null : DEFAULT_STAR_COLOR,
        )
        return
      }

      const convId = resolveConvId(threadId)
      if (!convId) return
      const conv = conversationsMap.get(convId)
      if (!conv) return
      const isStarred = !!(conv.starColor || conv.isPinned)
      handleSetStarColor(threadId, isStarred ? null : DEFAULT_STAR_COLOR)
    },
    [resolveConvId, handleSetStarColor],
  )

  const handleToggleStar = useCallback(() => {
    if (!selectedThreadId) return
    handleToggleStarById(selectedThreadId)
  }, [selectedThreadId, handleToggleStarById])

  const handleToggleReadById = useCallback(
    (threadId: string) => {
      if (isRead(threadId)) markUnread(threadId)
      else markRead(threadId)
    },
    [isRead, markRead, markUnread],
  )

  const handleReply = useCallback(
    async (content: string) => {
      if (!selectedThreadId) return

      // Session threads use addTurn so useSessionExecution picks it up
      if (activeThread?.kind === 'session' && activeThread.source.session) {
        const session = activeThread.source.session
        const agentId = session.primaryAgentId
        setIsReplying(true)
        setReplyPrompt('')
        try {
          await addTurn(session.id, {
            prompt: content,
            intent: session.intent,
            agentId,
          })
        } finally {
          setIsReplying(false)
        }
        return
      }

      const convId = resolveConvId(selectedThreadId)
      if (!convId) return
      const conv = conversationsMap.get(convId)
      if (!conv) return

      // Resolve the agent for this conversation
      const agent = activeThread?.agent ?? getAgentById(conv.agentId)
      if (!agent) return

      setIsReplying(true)
      setReplyPrompt('')

      try {
        // Load and decrypt the conversation into the store so submitChat can
        // find it as currentConversation (it reads from useConversationStore)
        const decryptedConv = await loadConversation(convId)

        // Build conversation history from decrypted messages (exclude system)
        const historyMessages = (decryptedConv?.messages ?? []).filter(
          (m) => m.role !== 'system',
        )

        await submitChat({
          prompt: content,
          agent,
          conversationMessages: historyMessages,
          includeHistory: true,
          lang,
          t,
          onResponseUpdate: () => {
            // Thread will auto-update via Yjs observer when assistant message is saved
          },
          onPromptClear: () => setReplyPrompt(''),
        })
      } finally {
        setIsReplying(false)
      }
    },
    [
      selectedThreadId,
      activeThread,
      addTurn,
      resolveConvId,
      loadConversation,
      lang,
      t,
    ],
  )

  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        searchInputRef.current?.focus()
        return
      }

      const target = e.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return
      }

      switch (e.key) {
        case 'j':
          e.preventDefault()
          goToPrevious()
          break
        case 'k':
          e.preventDefault()
          goToNext()
          break
        case 'Escape':
          e.preventDefault()
          deselect()
          break
        case 's':
          e.preventDefault()
          handleToggleStar()
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [goToNext, goToPrevious, deselect, handleToggleRead, handleToggleStar])

  const handleStartConversation = useCallback(
    (agent: { slug: string; id?: string }) => {
      setFilter('agents')
      if (agent.id) selectThread(agent.id)
    },
    [setFilter, selectThread],
  )

  const ctxValue = useMemo(
    () => ({
      filter,
      selectedIds,
      activeId,
      pinnedIds,
      selectedId: selectedThreadId,
      search,
      setSearch,
      setFilter,
      selectItem: selectThread,
      addItem: addToSelection,
      removeItem: removeFromSelection,
      togglePin: togglePinItem,
      deselect,
      inspectSegment,
      setInspect,
      goToNext,
      goToPrevious,
      pagination,
      navItems,
      openSettings,
      filteredThreads,
      selectedThreads,
      activeThread,
      selectedThread,
      isLoading,
      filteredAgents,
      selectedAgents,
      activeAgent,
      selectedAgent,
      customAgentIds,
      isAgentsLoading,
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
      handleStartConversation,
      searchInputRef,
      tagDefinitions,
    }),
    [
      filter,
      selectedIds,
      activeId,
      pinnedIds,
      selectedThreadId,
      search,
      setSearch,
      setFilter,
      selectThread,
      addToSelection,
      removeFromSelection,
      togglePinItem,
      deselect,
      inspectSegment,
      setInspect,
      goToNext,
      goToPrevious,
      pagination,
      navItems,
      openSettings,
      filteredThreads,
      selectedThreads,
      activeThread,
      selectedThread,
      isLoading,
      filteredAgents,
      selectedAgents,
      activeAgent,
      selectedAgent,
      customAgentIds,
      isAgentsLoading,
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
      handleStartConversation,
      searchInputRef,
      tagDefinitions,
    ],
  )

  return (
    <V2ShellContext.Provider value={ctxValue}>
      {filter === 'home' ? (
        <NewTaskPage />
      ) : filter === 'agents' ? (
        <AgentsPage />
      ) : filter === 'conversations' ? (
        <ConversationsPage />
      ) : (
        <ThreadsPage />
      )}
      <GlobalSearch />
      <SettingsModal isOpen={isSettingsOpen} onClose={closeSettings} />
    </V2ShellContext.Provider>
  )
}
