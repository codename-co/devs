import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Modal,
  ModalContent,
  ModalBody,
  Input,
  Listbox,
  ListboxItem,
  ListboxSection,
  Spinner,
} from '@heroui/react'

import { Icon } from '@/components/Icon'
import { useI18n, useUrl } from '@/i18n'
import { useSearchStore } from './searchStore'
import {
  globalSearch,
  type SearchResult,
  type SearchResultType,
  createDebouncedSearch,
} from './search-engine'
import { useConversations, useTasks } from '@/hooks'
import { formatConversationDate } from '@/lib/format'
import type { Conversation, Task } from '@/types'

const localI18n = {
  en: [
    'Search tasks, conversations and more…',
    'Search DEVS',
    'No results found',
    'New task',
    'agent',
    'conversation',
    'task',
    'file',
    'memory',
    'message',
    'methodology',
    'connector',
    'Agents',
    'Conversations',
    'Tasks',
    'Files',
    'Memories',
    'Messages',
    'Methodologies',
    'Connectors',
    'Recent',
  ] as const,
  ar: {
    'Search tasks, conversations and more…':
      'ابحث عن المهام والمحادثات والمزيد…',
    'Search DEVS': 'البحث في DEVS',
    'No results found': 'لم يتم العثور على نتائج',
    'New task': 'مهمة جديدة',
    agent: 'وكيل',
    conversation: 'محادثة',
    task: 'مهمة',
    file: 'ملف',
    memory: 'ذاكرة',
    message: 'رسالة',
    methodology: 'منهجية',
    connector: 'موصل',
    Agents: 'الوكلاء',
    Conversations: 'المحادثات',
    Tasks: 'المهام',
    Files: 'الملفات',
    Memories: 'الذكريات',
    Messages: 'الرسائل',
    Methodologies: 'المنهجيات',
    Connectors: 'الموصلات',
    Recent: 'الأخيرة',
  },
  de: {
    'Search tasks, conversations and more…':
      'Aufgaben, Konversationen und mehr suchen…',
    'Search DEVS': 'DEVS durchsuchen',
    'No results found': 'Keine Ergebnisse gefunden',
    'New task': 'Neue Aufgabe',
    agent: 'Agent',
    conversation: 'Konversation',
    task: 'Aufgabe',
    file: 'Datei',
    memory: 'Gedächtnis',
    message: 'Nachricht',
    methodology: 'Methodik',
    connector: 'Konnektor',
    Agents: 'Agenten',
    Conversations: 'Konversationen',
    Tasks: 'Aufgaben',
    Files: 'Dateien',
    Memories: 'Erinnerungen',
    Messages: 'Nachrichten',
    Methodologies: 'Methoden',
    Connectors: 'Konnektoren',
    Recent: 'Kürzlich',
  },
  es: {
    'Search tasks, conversations and more…':
      'Buscar tareas, conversaciones y más…',
    'Search DEVS': 'Buscar en DEVS',
    'No results found': 'No se encontraron resultados',
    'New task': 'Nueva tarea',
    agent: 'agente',
    conversation: 'conversación',
    task: 'tarea',
    file: 'archivo',
    memory: 'memoria',
    message: 'mensaje',
    methodology: 'metodología',
    connector: 'conector',
    Agents: 'Agentes',
    Conversations: 'Conversaciones',
    Tasks: 'Tareas',
    Files: 'Archivos',
    Memories: 'Memorias',
    Messages: 'Mensajes',
    Methodologies: 'Metodologías',
    Connectors: 'Conectores',
    Recent: 'Reciente',
  },
  fr: {
    'Search tasks, conversations and more…':
      'Rechercher tâches, conversations et plus…',
    'Search DEVS': 'Rechercher dans DEVS',
    'No results found': 'Aucun résultat trouvé',
    'New task': 'Nouvelle tâche',
    agent: 'agent',
    conversation: 'conversation',
    task: 'tâche',
    file: 'fichier',
    memory: 'mémoire',
    message: 'message',
    methodology: 'méthodologie',
    connector: 'connecteur',
    Agents: 'Agents',
    Conversations: 'Conversations',
    Tasks: 'Tâches',
    Files: 'Fichiers',
    Memories: 'Mémoires',
    Messages: 'Messages',
    Methodologies: 'Méthodologies',
    Connectors: 'Connecteurs',
    Recent: 'Récent',
  },
  ko: {
    'Search tasks, conversations and more…': '작업, 대화 등 검색…',
    'Search DEVS': 'DEVS 검색',
    'No results found': '결과를 찾을 수 없습니다',
    'New task': '새 작업',
    agent: '에이전트',
    conversation: '대화',
    task: '작업',
    file: '파일',
    memory: '기억',
    message: '메시지',
    methodology: '방법론',
    connector: '커넥터',
    Agents: '에이전트',
    Conversations: '대화',
    Tasks: '작업',
    Files: '파일',
    Memories: '기억',
    Messages: '메시지',
    Methodologies: '방법론',
    Connectors: '커넥터',
    Recent: '최근',
  },
}

/**
 * Translation keys for each result type section
 */
const SECTION_TITLE_KEYS: Record<SearchResultType, string> = {
  agent: 'Agents',
  conversation: 'Conversations',
  task: 'Tasks',
  file: 'Files',
  memory: 'Memories',
  message: 'Messages',
  methodology: 'Methodologies',
  connector: 'Connectors',
}

/**
 * Get icon color class for result type
 */
function getIconColorClass(type: SearchResultType): string {
  const colors: Record<SearchResultType, string> = {
    agent: 'text-warning',
    conversation: 'text-default-500',
    task: 'text-secondary',
    file: 'text-primary',
    memory: 'text-success',
    message: 'text-default-400',
    methodology: 'text-success',
    connector: 'text-primary',
  }
  return colors[type]
}

export function GlobalSearch() {
  const { lang, t } = useI18n(localI18n)
  const url = useUrl(lang)
  const navigate = useNavigate()

  const {
    isOpen,
    query,
    results,
    isSearching,
    selectedIndex,
    close,
    setQuery,
    setResults,
    setIsSearching,
    selectNext,
    selectPrevious,
    reset,
  } = useSearchStore()

  const inputRef = useRef<HTMLInputElement>(null)

  // Load recent conversations and tasks for default view
  const conversations = useConversations()
  const tasks = useTasks()

  // Create debounced search
  const debouncedSearch = useMemo(
    () =>
      createDebouncedSearch(async (searchQuery: string) => {
        if (!searchQuery || searchQuery.length < 2) {
          setResults([])
          setIsSearching(false)
          return
        }

        setIsSearching(true)
        try {
          const searchResults = await globalSearch(searchQuery, lang)
          setResults(searchResults)
        } catch (error) {
          console.error('Search error:', error)
          setResults([])
        } finally {
          setIsSearching(false)
        }
      }, 200),
    [setResults, setIsSearching, lang],
  )

  // Handle query changes
  const handleQueryChange = useCallback(
    (value: string) => {
      setQuery(value)
      if (value.length >= 2) {
        setIsSearching(true)
      }
      debouncedSearch(value)
    },
    [debouncedSearch, setQuery, setIsSearching],
  )

  // Handle result selection
  const handleSelect = useCallback(
    (result: SearchResult) => {
      close()
      navigate(url(result.href))
    },
    [navigate, close, url],
  )

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          // Don't prevent default - let the Modal handle it for keyboard dismiss
          // But also call close explicitly for reliability
          close()
          break
        case 'ArrowDown':
          if (results.length === 0) return
          e.preventDefault()
          selectNext()
          break
        case 'ArrowUp':
          if (results.length === 0) return
          e.preventDefault()
          selectPrevious()
          break
        case 'Enter':
          if (results.length === 0) return
          e.preventDefault()
          if (results[selectedIndex]) {
            handleSelect(results[selectedIndex])
          }
          break
      }
    },
    [results, selectedIndex, handleSelect, close, selectNext, selectPrevious],
  )

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      reset()
    }
  }, [isOpen, reset])

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  // Group results by type for sectioned display
  const groupedResults = useMemo(() => {
    const groups = new Map<SearchResultType, SearchResult[]>()
    for (const result of results) {
      const existing = groups.get(result.type) || []
      existing.push(result)
      groups.set(result.type, existing)
    }
    return groups
  }, [results])

  // Get flat index for keyboard navigation
  const getFlatIndex = useCallback(
    (type: SearchResultType, indexInGroup: number): number => {
      let flatIndex = 0
      for (const [groupType, groupResults] of groupedResults) {
        if (groupType === type) {
          return flatIndex + indexInGroup
        }
        flatIndex += groupResults.length
      }
      return flatIndex
    },
    [groupedResults],
  )

  // Build recent history grouped by date (tasks and conversations combined)
  const groupedHistory = useMemo(() => {
    type HistoryItem = {
      id: string
      type: 'task' | 'conversation'
      title: string
      subtitle?: string
      href: string
      date: Date
    }

    // Combine tasks and conversations
    const items: HistoryItem[] = [
      ...tasks.map((task: Task) => ({
        id: task.id,
        type: 'task' as const,
        title: task.title,
        subtitle: task.description?.substring(0, 100),
        href: `/tasks/${task.id}`,
        date: new Date(task.updatedAt || task.createdAt),
      })),
      ...conversations.map((conv: Conversation) => ({
        id: conv.id,
        type: 'conversation' as const,
        title:
          conv.title ||
          conv.messages?.[0]?.content?.substring(0, 50) ||
          'Untitled',
        subtitle: conv.summary?.substring(0, 100),
        href: `/agents/run#${conv.agentSlug || conv.agentId}/${conv.id}`,
        date: new Date(conv.updatedAt || conv.timestamp),
      })),
    ]
      // Sort by date descending
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 40)

    // Group by date label
    const groups: { label: string; items: HistoryItem[] }[] = []
    const dateGroups = new Map<string, HistoryItem[]>()

    for (const item of items.slice(0, 15)) {
      const dateKey = formatConversationDate(item.date, lang)
      if (!dateGroups.has(dateKey)) {
        dateGroups.set(dateKey, [])
      }
      dateGroups.get(dateKey)!.push(item)
    }

    for (const [label, groupItems] of dateGroups) {
      groups.push({ label, items: groupItems })
    }

    return groups
  }, [tasks, conversations, lang])

  // Handle new task action
  const handleNewTask = useCallback(() => {
    close()
    navigate(url(''))
  }, [close, navigate, url])

  return (
    <Modal
      isOpen={isOpen}
      onClose={close}
      placement="top"
      size="lg"
      backdrop="blur"
      hideCloseButton
      isDismissable
      isKeyboardDismissDisabled={false}
      classNames={{
        base: 'mt-[10vh]',
        body: 'p-0',
      }}
    >
      <ModalContent>
        <ModalBody>
          <div className="p-2 border-b border-default-200">
            <Input
              ref={inputRef}
              autoFocus
              placeholder={t('Search tasks, conversations and more…')}
              value={query}
              onValueChange={handleQueryChange}
              onKeyDown={handleKeyDown}
              startContent={
                isSearching ? (
                  <Spinner size="md" color="default" />
                ) : (
                  <Icon name="Search" size="md" className="text-default-400" />
                )
              }
              endContent={
                query && (
                  <Icon
                    name="Xmark"
                    size="md"
                    className="cursor-pointer"
                    onClick={() => handleQueryChange('')}
                  />
                )
              }
              classNames={{
                input: 'text-base',
                inputWrapper: 'bg-transparent shadow-none',
              }}
            />
          </div>

          <div className="max-h-[60vh] overflow-y-auto p-2">
            {query.length < 2 ? (
              // Default view: New task action + recent history
              <>
                {/* New task action */}
                <Listbox aria-label={t('New task')} variant="flat">
                  <ListboxItem
                    key="new-task"
                    textValue={t('New task')}
                    startContent={<Icon name="Plus" className="text-primary" />}
                    onPress={handleNewTask}
                  >
                    <span className="text-sm font-medium">{t('New task')}</span>
                  </ListboxItem>
                </Listbox>

                {/* Recent history grouped by date */}
                {groupedHistory.length > 0 && (
                  <Listbox
                    aria-label={t('Recent')}
                    variant="flat"
                    className="mt-2"
                  >
                    {groupedHistory.map((group) => (
                      <ListboxSection
                        key={group.label}
                        title={group.label}
                        classNames={{
                          heading: 'font-semibold text-default-500 px-2',
                        }}
                      >
                        {group.items.map((item) => (
                          <ListboxItem
                            key={item.id}
                            textValue={item.title}
                            startContent={
                              <Icon
                                name={
                                  item.type === 'task'
                                    ? 'TriangleFlagTwoStripes'
                                    : 'ChatBubble'
                                }
                                className={
                                  item.type === 'task'
                                    ? 'text-secondary'
                                    : 'text-default-500'
                                }
                              />
                            }
                            onPress={() => {
                              close()
                              navigate(url(item.href))
                            }}
                          >
                            <div className="flex flex-col gap-0.5">
                              <span className="text-md font-medium truncate">
                                {item.title}
                              </span>
                              {item.subtitle && (
                                <span className="text-sm text-default-400 truncate">
                                  {item.subtitle}
                                </span>
                              )}
                            </div>
                          </ListboxItem>
                        ))}
                      </ListboxSection>
                    ))}
                  </Listbox>
                )}
              </>
            ) : results.length === 0 && !isSearching ? (
              <div className="text-center py-8 text-default-400">
                <Icon
                  name="PageSearch"
                  size="xl"
                  className="mx-auto mb-3 opacity-50"
                />
                <p className="text-sm">{t('No results found')}</p>
              </div>
            ) : (
              <Listbox
                aria-label={t('Search DEVS')}
                variant="flat"
                onAction={(key) => {
                  const result = results.find((r) => r.id === key)
                  if (result) handleSelect(result)
                }}
              >
                {Array.from(groupedResults.entries()).map(
                  ([type, groupResults]) => (
                    <ListboxSection
                      key={type}
                      title={t(SECTION_TITLE_KEYS[type] as any)}
                      classNames={{
                        heading: 'text-xs font-semibold text-default-500 px-2',
                      }}
                    >
                      {groupResults.map((result, indexInGroup) => {
                        const flatIndex = getFlatIndex(type, indexInGroup)
                        const isSelected = flatIndex === selectedIndex

                        return (
                          <ListboxItem
                            key={result.id}
                            textValue={result.title}
                            className={isSelected ? 'bg-default-100' : ''}
                            startContent={
                              <Icon
                                name={result.icon as any}
                                className={getIconColorClass(result.type)}
                              />
                            }
                          >
                            <div className="flex flex-col gap-0.5">
                              <span className="text-sm font-medium truncate">
                                {result.title}
                              </span>
                              {result.subtitle && (
                                <span className="text-xs text-default-400 truncate">
                                  {result.subtitle}
                                </span>
                              )}
                            </div>
                          </ListboxItem>
                        )
                      })}
                    </ListboxSection>
                  ),
                )}
              </Listbox>
            )}
          </div>
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}

/**
 * Hook to register global Cmd+K keyboard shortcut
 */
export function useGlobalSearchShortcut(): void {
  const open = useSearchStore((state) => state.open)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K (Mac) or Ctrl+K (Windows/Linux)
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        open()
      }
    }

    // Use capture phase to ensure shortcut works even when focus is in form fields
    document.addEventListener('keydown', handleKeyDown, true)
    return () => document.removeEventListener('keydown', handleKeyDown, true)
  }, [open])
}
