import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useThreads } from './hooks/useThreads'
import { useThreadSelection } from './hooks/useThreadSelection'
import { useReadStatus } from './hooks/useReadStatus'
import { useThreadTagDefinitions, useThreadTagMap } from './hooks/useThreadTags'
import { useConversationStore } from '@/stores/conversationStore'
import { useAgentsSeparated, getAgentById } from '@/stores/agentStore'
import { useActiveSpaceId, entityBelongsToSpace } from '@/stores/spaceStore'
import { useSessionStore } from '@/stores/sessionStore'
import { useTaskStore } from '@/stores/taskStore'
import {
  conversations as conversationsMap,
  tasks as tasksMap,
} from '@/lib/yjs'
import { setStudioEntryFavorite } from '@/features/studio/hooks/useStudioHistory'
import { submitChat } from '@/lib/chat'
import { GlobalSearch } from '@/features/search'
import { SettingsModal } from '@/components/SettingsModal'
import { useInspectorPanelStore } from '@/stores/inspectorPanelStore'
import { useI18n } from '@/i18n'
import type { PreviewItem } from '@/components/ArtifactPreviewCard'
import type { Artifact } from '@/types'
import { V2ShellContext } from './context'

/** Normalize a string for diacritics-insensitive search */
const norm = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
import { AgentsPage } from './pages/AgentsPage'
import { NewTaskPage } from './pages/NewTaskPage'
import { ThreadsPage } from './pages/ThreadsPage'

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
  const navigate = useNavigate()
  const location = useLocation()

  // Derive settings modal visibility from URL hash (e.g. #settings, #settings/traces/logs/:id)
  const isSettingsOpen = location.hash.startsWith('#settings')

  const {
    customAgents,
    builtInAgents,
    loading: isAgentsLoading,
  } = useAgentsSeparated()

  const openSettings = useCallback(
    () => navigate(`${location.pathname}${location.search}#settings`, { replace: true }),
    [navigate, location.pathname, location.search],
  )
  const closeSettings = useCallback(
    () => navigate(`${location.pathname}${location.search}`, { replace: true }),
    [navigate, location.pathname, location.search],
  )

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

  const { threads, isLoading } = useThreads()

  const tagDefinitions = useThreadTagDefinitions()
  const tagMap = useThreadTagMap()

  const deferredSearch = useDeferredValue(search)

  const filteredThreads = useMemo(() => {
    let result = threads
    if (!deferredSearch) return result

    // Extract is:xxx tokens, #tag-name tokens, and remaining free-text
    const isFilters: string[] = []
    const tagNames: string[] = []
    const freeText = norm(
      deferredSearch
        .replace(/is:(\w+)/gi, (_, token) => {
          isFilters.push(token.toLowerCase())
          return ''
        })
        .replace(/#(\S+)/g, (_, name) => {
          tagNames.push(norm(name))
          return ''
        })
        .trim(),
    )

    // Apply is: filters (AND logic — all must match)
    for (const token of isFilters) {
      switch (token) {
        case 'task':
          result = result.filter(
            (t) =>
              t.kind === 'task' ||
              (t.kind === 'session' && t.source.session?.intent === 'task'),
          )
          break
        case 'chat':
          result = result.filter(
            (t) =>
              t.kind === 'chat' ||
              (t.kind === 'session' &&
                (t.source.session?.intent === 'chat' ||
                  t.source.session?.intent === 'conversation')),
          )
          break
        case 'starred':
          result = result.filter((t) => t.starColor !== null)
          break
        case 'unread':
          result = result.filter((t) => t.unread)
          break
      }
    }

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

  const handleToggleRead = useCallback(() => {
    if (!selectedThreadId) return
    if (isRead(selectedThreadId)) markUnread(selectedThreadId)
    else markRead(selectedThreadId)
  }, [selectedThreadId, isRead, markRead, markUnread])

  const { loadConversation, setStarColor: setConversationStarColor } =
    useConversationStore()
  const { addTurn, setStarColor: setSessionStarColor } = useSessionStore()
  const { setStarColor: setTaskStarColor } = useTaskStore()
  const [replyingThreadIds, setReplyingThreadIds] = useState<Set<string>>(new Set())
  const [replyPrompts, setReplyPrompts] = useState<Record<string, string>>({})

  // Convenience helpers
  const setReplyingForThread = useCallback((threadId: string, replying: boolean) => {
    setReplyingThreadIds(prev => {
      const has = prev.has(threadId)
      if (replying === has) return prev
      const next = new Set(prev)
      if (replying) next.add(threadId)
      else next.delete(threadId)
      return next
    })
  }, [])
  const setReplyPromptForThread = useCallback((threadId: string, value: string) => {
    setReplyPrompts(prev => {
      if (prev[threadId] === value) return prev
      return { ...prev, [threadId]: value }
    })
  }, [])

  // Backward-compat aliases (use activeId)
  const isReplying = !!(activeId && replyingThreadIds.has(activeId))
  const replyPrompt = (activeId && replyPrompts[activeId]) || ''
  const setReplyPrompt = useCallback((value: string) => {
    if (activeId) setReplyPromptForThread(activeId, value)
  }, [activeId, setReplyPromptForThread])

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
      if (tasksMap.has(threadId)) {
        setTaskStarColor(threadId, color)
        return
      }

      // Session
      if (useSessionStore.getState().sessions.some((s) => s.id === threadId)) {
        setSessionStarColor(threadId, color)
        return
      }

      // Studio entry
      setStudioEntryFavorite(threadId, color !== null)
      // If it was a studio entry, the function handles the no-op internally

      // Conversation
      const convId = resolveConvId(threadId)
      if (convId) {
        setConversationStarColor(convId, color)
      }
    },
    [resolveConvId, setTaskStarColor, setSessionStarColor, setConversationStarColor],
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

      const session = useSessionStore.getState().sessions.find((s) => s.id === threadId)
      if (session) {
        const isStarred = !!(session.starColor || session.isPinned)
        handleSetStarColor(threadId, isStarred ? null : DEFAULT_STAR_COLOR)
        return
      }

      // Studio entry — check via thread data
      const thread = filteredThreads.find((t) => t.id === threadId)
      if (thread?.source.studioEntry) {
        handleSetStarColor(
          threadId,
          thread.source.studioEntry.isFavorite ? null : DEFAULT_STAR_COLOR,
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
    [resolveConvId, handleSetStarColor, filteredThreads],
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
    async (content: string, replyThreadId?: string) => {
      const targetThreadId = replyThreadId || selectedThreadId
      if (!targetThreadId) return

      // Resolve the thread for this reply
      const targetThread = selectedThreads.find((t) => t.id === targetThreadId) ?? activeThread

      // Session-backed threads use addTurn so useSessionExecution picks it up.
      // Check source.session rather than kind because sessions with intent
      // 'task'/'chat'/'media' are mapped to those kinds, not 'session'.
      if (targetThread?.source?.session) {
        const session = targetThread.source.session
        const agentId = session.primaryAgentId
        setReplyingForThread(targetThreadId, true)
        setReplyPromptForThread(targetThreadId, '')
        try {
          await addTurn(session.id, {
            prompt: content,
            intent: session.intent,
            agentId,
          })
        } finally {
          setReplyingForThread(targetThreadId, false)
        }
        return
      }

      const convId = resolveConvId(targetThreadId)
      if (!convId) return
      const conv = conversationsMap.get(convId)
      if (!conv) return

      // Resolve the agent for this conversation
      const agent = targetThread?.agent ?? getAgentById(conv.agentId)
      if (!agent) return

      setReplyingForThread(targetThreadId, true)
      setReplyPromptForThread(targetThreadId, '')

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
          onPromptClear: () => setReplyPromptForThread(targetThreadId, ''),
        })
      } finally {
        setReplyingForThread(targetThreadId, false)
      }
    },
    [
      selectedThreadId,
      selectedThreads,
      activeThread,
      addTurn,
      resolveConvId,
      setReplyingForThread,
      setReplyPromptForThread,
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

      if ((e.metaKey || e.ctrlKey) && e.key === ',') {
        e.preventDefault()
        if (isSettingsOpen) {
          closeSettings()
        } else {
          openSettings()
        }
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
  }, [goToNext, goToPrevious, deselect, handleToggleRead, handleToggleStar, isSettingsOpen, openSettings, closeSettings])

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
      replyingThreadIds,
      replyPrompts,
      setReplyPromptForThread,
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
      replyingThreadIds,
      replyPrompts,
      setReplyPromptForThread,
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
      ) : (
        <ThreadsPage />
      )}
      <GlobalSearch />
      <SettingsModal isOpen={isSettingsOpen} onClose={closeSettings} />
    </V2ShellContext.Provider>
  )
}
