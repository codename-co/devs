import {
  Button,
  Kbd,
  Link,
  Listbox,
  ListboxItem,
  ListboxSection,
  ScrollShadow,
  Tooltip,
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@heroui/react'

import { languages, type LanguageCode, useI18n, useUrl } from '@/i18n'
import { userSettings } from '@/stores/userStore'

import { Icon } from './Icon'
import { Title } from './Title'
import { ProgressIndicator } from './ProgressIndicator'
import { SettingsModal } from './SettingsModal'
import {
  GlobalSearch,
  useGlobalSearchShortcut,
  useSearchStore,
  hasSearchableItems,
} from '@/features/search'
import { PRODUCT } from '@/config/product'
import clsx from 'clsx'
import { useState, useEffect, memo, useMemo } from 'react'
import { cn, isCurrentPath } from '@/lib/utils'
import { useNavigate, useLocation } from 'react-router-dom'
import { useConversationStore } from '@/stores/conversationStore'
import { getAgentById } from '@/stores/agentStore'
import { useAgents } from '@/stores/agentStore'
import { useSkills } from '@/stores/skillStore'
import {
  useMarketplaceStore,
  type InstalledExtension,
} from '@/features/marketplace'
import { getAppPrimaryPageUrl } from '@/features/marketplace/store'
import { getExtensionColorClass } from '@/features/marketplace/utils'
import {
  useLiveMap,
  useSyncReady,
  tasks as taskMap,
  knowledge as knowledgeMap,
  studioEntries as studioMap,
  connectors as connectorMap,
} from '@/lib/yjs'
import type { IconName } from '@/lib/types'
import { toEpoch } from '@/lib/date'

// ── Recent Activity types & helpers ──────────────────────────────────────────

interface ActivityItem {
  id: string
  type:
    | 'conversation'
    | 'task'
    | 'agent'
    | 'file'
    | 'studio'
    | 'connector'
    | 'skill'
  name: string
  icon: IconName
  href: string
  timestamp: number // ms since epoch for sorting
}

const ACTIVITY_ICONS: Record<ActivityItem['type'], IconName> = {
  conversation: 'ChatBubble',
  task: 'PcCheck',
  agent: 'Sparks',
  file: 'Page',
  studio: 'MediaImagePlus',
  connector: 'DataTransferBoth',
  skill: 'Puzzle',
}

const useRecentActivity = (lang: LanguageCode): ActivityItem[] => {
  const url = useUrl(lang)
  const conversations = useConversationStore((s) => s.conversations)
  const getTitle = useConversationStore((s) => s.getConversationTitle)
  const allTasks = useLiveMap(taskMap)
  const agents = useAgents()
  const allKnowledge = useLiveMap(knowledgeMap)
  const allStudio = useLiveMap(studioMap)
  const allConnectors = useLiveMap(connectorMap)
  const allSkills = useSkills()

  // Force a re-render once Yjs has finished hydrating from IndexedDB.
  // Without this, useLiveMap hooks may return stale (empty) snapshots
  // because the Y.Map.observe() events fired before React could process them.
  const yjsReady = useSyncReady()

  return useMemo(() => {
    const items: ActivityItem[] = []

    // Conversations
    for (const c of conversations) {
      const ts = toEpoch(c.updatedAt) || toEpoch(c.timestamp)
      if (!ts) continue
      const agent = c.agentId ? getAgentById(c.agentId) : undefined
      const slug = c.agentSlug || agent?.slug || 'devs'
      items.push({
        id: `conv-${c.id}`,
        type: 'conversation',
        name: getTitle(c) || 'Untitled',
        icon: ACTIVITY_ICONS.conversation,
        href: url(`/agents/run/${slug}/${c.id}`),
        timestamp: ts,
      })
    }

    // Tasks
    for (const t of allTasks) {
      const ts = toEpoch((t as any).updatedAt) || toEpoch((t as any).createdAt)
      if (!ts) continue
      items.push({
        id: `task-${(t as any).id}`,
        type: 'task',
        name: (t as any).title || 'Untitled task',
        icon: ACTIVITY_ICONS.task,
        href: url(`/tasks/${(t as any).id}`),
        timestamp: ts,
      })
    }

    // Agents (custom only — useAgents filters deleted)
    for (const a of agents) {
      const ts = toEpoch(a.updatedAt) || toEpoch(a.createdAt)
      if (!ts) continue
      items.push({
        id: `agent-${a.id}`,
        type: 'agent',
        name: a.name,
        icon: ACTIVITY_ICONS.agent,
        href: url(`/agents/run/${a.slug}`),
        timestamp: ts,
      })
    }

    // Knowledge / files
    for (const k of allKnowledge) {
      const ki = k as any
      if (ki.type === 'folder') continue
      const ts = toEpoch(ki.lastModified) || toEpoch(ki.createdAt)
      if (!ts) continue
      items.push({
        id: `file-${ki.id}`,
        type: 'file',
        name: ki.name || 'Untitled file',
        icon: ACTIVITY_ICONS.file,
        href: url(`/knowledge`),
        timestamp: ts,
      })
    }

    // Studio entries
    for (const s of allStudio) {
      const si = s as any
      const ts = toEpoch(si.createdAt)
      if (!ts) continue
      const label =
        si.prompt?.length > 40
          ? si.prompt.slice(0, 40) + '…'
          : si.prompt || 'Generation'
      items.push({
        id: `studio-${si.id}`,
        type: 'studio',
        name: label,
        icon: ACTIVITY_ICONS.studio,
        href: url(`/studio`),
        timestamp: ts,
      })
    }

    // Connectors
    for (const c of allConnectors) {
      const ci = c as any
      const ts =
        toEpoch(ci.lastSyncAt) || toEpoch(ci.updatedAt) || toEpoch(ci.createdAt)
      if (!ts) continue
      items.push({
        id: `conn-${ci.id}`,
        type: 'connector',
        name: ci.name || ci.provider || 'Connector',
        icon: ACTIVITY_ICONS.connector,
        href: url(`/#settings/connectors`),
        timestamp: ts,
      })
    }

    // Installed skills
    for (const sk of allSkills) {
      const ts = toEpoch(sk.updatedAt) || toEpoch(sk.installedAt)
      if (!ts) continue
      items.push({
        id: `skill-${sk.id}`,
        type: 'skill',
        name: sk.name,
        icon: ACTIVITY_ICONS.skill,
        href: url(`/#settings/skills`),
        timestamp: ts,
      })
    }

    // Sort descending by timestamp and take top 10
    items.sort((a, b) => b.timestamp - a.timestamp)
    return items.slice(0, 10)
  }, [
    conversations,
    getTitle,
    allTasks,
    agents,
    allKnowledge,
    allStudio,
    allConnectors,
    allSkills,
    url,
    yjsReady,
  ])
}

const RecentActivity = ({ lang }: { lang: LanguageCode }) => {
  const { t } = useI18n()
  const items = useRecentActivity(lang)

  if (items.length === 0) return null

  return (
    <Listbox aria-label={t('Recent activity')} variant="flat">
      <ListboxSection
        title={t('Recent activity')}
        classNames={{ heading: 'ms-[4px]' }}
      >
        {items.map((item) => (
          <ListboxItem
            key={item.id}
            href={item.href}
            variant="faded"
            startContent={<Icon name={item.icon} size="sm" />}
            textValue={item.name}
            classNames={{ title: 'truncate' }}
          >
            <span className="text-small">{item.name}</span>
          </ListboxItem>
        ))}
      </ListboxSection>
    </Listbox>
  )
}

// const ConversationList = () => {
//   const { t, url } = useI18n()
//   const { conversations, loadConversations, getConversationTitle } =
//     useConversationStore()

//   useEffect(() => {
//     // Load conversations from the database when component mounts
//     loadConversations()
//   }, [loadConversations])

//   if (conversations.length === 0) {
//     return null
//   }

//   // Sort conversations by timestamp, most recent first
//   const sortedConversations = [...conversations].sort(
//     (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
//   )

//   return (
//     <Listbox aria-label={t('Conversations history')}>
//       <ListboxSection title={t('CONVERSATIONS')}>
//         {[
//           ...sortedConversations.slice(0, 5).map((conversation) => (
//             <ListboxItem
//               key={conversation.id}
//               className="dark:text-gray-200 dark:hover:text-grey-500"
//               href={url(
//                 `/agents/run#${conversation.agentId}/${conversation.id}`,
//               )}
//               textValue={getConversationTitle(conversation)}
//             >
//               <div className="flex items-center gap-2">
//                 <Icon name="ChatLines" />
//                 <span className="truncate">
//                   {getConversationTitle(conversation)}
//                 </span>
//               </div>
//             </ListboxItem>
//           )),
//           conversations.length > 0 && (
//             <ListboxItem
//               key="view-all"
//               className="dark:text-gray-200 dark:hover:text-grey-500"
//               href={url('/conversations')}
//             >
//               {t('View all history')}
//             </ListboxItem>
//           ),
//         ].filter((item) => !!item)}
//       </ListboxSection>
//     </Listbox>
//   )
// }

// const TaskList = () => {
//   const { t, url } = useI18n()
//   const { tasks, loadTasks } = useTaskStore()

//   useEffect(() => {
//     // Load tasks from the database when component mounts
//     loadTasks()
//   }, [loadTasks])

//   if (tasks.length === 0) {
//     return null
//   }

//   // Sort tasks by updatedAt timestamp, most recent first
//   const sortedTasks = [...tasks].sort(
//     (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
//   )

//   // Helper function to get task status color
//   const getTaskStatusColor = (status: string) => {
//     switch (status) {
//       case 'completed':
//         return 'text-success'
//       case 'in_progress':
//         return 'text-primary'
//       case 'failed':
//         return 'text-danger'
//       default:
//         return 'text-default-500'
//     }
//   }

//   // Helper function to get task status icon
//   const getTaskStatusIcon = (status: string) => {
//     switch (status) {
//       case 'completed':
//         return 'CheckCircle'
//       case 'in_progress':
//         return 'Circle'
//       case 'failed':
//         return 'Circle'
//       default:
//         return 'Circle'
//     }
//   }

//   return (
//     <Listbox aria-label={t('Recent tasks')}>
//       <ListboxSection title={t('TASKS')}>
//         {[
//           ...sortedTasks.slice(0, 5).map((task) => (
//             <ListboxItem
//               key={task.id}
//               className="dark:text-gray-200 dark:hover:text-grey-500"
//               href={url(`/tasks/${task.id}`)}
//               textValue={task.title}
//             >
//               <div className="flex items-center gap-2">
//                 <Icon
//                   name={getTaskStatusIcon(task.status) as any}
//                   className={`w-4 h-4 ${getTaskStatusColor(task.status)}`}
//                 />
//                 <div className="flex-1 min-w-0">
//                   <span className="truncate text-small font-medium">
//                     {task.title}
//                   </span>
//                   <div className="flex items-center gap-1 mt-0.5">
//                     <span
//                       className={`text-tiny ${getTaskStatusColor(task.status)}`}
//                     >
//                       {task.status.replace('_', ' ')}
//                     </span>
//                     {task.complexity === 'complex' && (
//                       <span className="text-tiny text-warning">• complex</span>
//                     )}
//                   </div>
//                 </div>
//               </div>
//             </ListboxItem>
//           )),
//           tasks.length > 0 && (
//             <ListboxItem
//               key="view-all"
//               className="dark:text-gray-200 dark:hover:text-grey-500"
//               href={url('/tasks')}
//             >
//               {t('View all tasks')}
//             </ListboxItem>
//           ),
//         ].filter((item) => !!item)}
//       </ListboxSection>
//     </Listbox>
//   )
// }

const BackDrop = () => (
  <div
    className="fixed inset-0 bg-black opacity-40 dark:opacity-70 -z-1"
    onClick={userSettings.getState().toggleDrawer}
  />
)

export const AppDrawer = memo(() => {
  const { lang } = useI18n()
  const isCollapsed = userSettings((state) => state.isDrawerCollapsed)

  const openSearch = useSearchStore((state) => state.open)

  const navigate = useNavigate()
  const location = useLocation()

  const [isMobile, setIsMobile] = useState(false)
  const [hasSearchable, setHasSearchable] = useState(false)

  // Derive settings modal visibility from URL hash (e.g. #settings, #settings/providers)
  const showSettingsModal = location.hash.startsWith('#settings')

  const openSettings = () => {
    navigate(`${location.pathname}#settings`, { replace: true })
  }

  const closeSettings = () => {
    navigate(location.pathname, { replace: true })
  }

  // Load conversations count
  const conversationsCount = useConversationStore(
    (state) => state.conversations.length,
  )
  const loadConversations = useConversationStore(
    (state) => state.loadConversations,
  )

  // Marketplace installed apps
  const installed = useMarketplaceStore((state) => state.installed)
  const installedApps = useMemo(
    () =>
      Array.from(installed.values()).filter(
        (ext) => ext.enabled && ext.extension.type === 'app',
      ),
    [installed],
  )
  const loadExtensions = useMarketplaceStore((state) => state.loadExtensions)
  const loadInstalledExtensions = useMarketplaceStore(
    (state) => state.loadInstalledExtensions,
  )

  // Register Cmd+K shortcut for global search
  useGlobalSearchShortcut()

  useEffect(() => {
    const checkViewport = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkViewport()
    window.addEventListener('resize', checkViewport)

    return () => window.removeEventListener('resize', checkViewport)
  }, [])

  useEffect(() => {
    if (isMobile && !userSettings.getState().isDrawerCollapsed) {
      userSettings.getState().toggleDrawer()
    }
  }, [isMobile])

  // Load conversations, marketplace extensions, and check searchable items on mount
  useEffect(() => {
    loadConversations()
    loadExtensions()
    loadInstalledExtensions()
    hasSearchableItems().then(setHasSearchable)
  }, [loadConversations, loadExtensions, loadInstalledExtensions])

  return (
    <aside
      className={clsx(
        'flex-0 h-full md:h-screen z-50 fixed md:relative',
        !isCollapsed && '-me-4',
      )}
    >
      <div
        id="app-drawer"
        data-testid="app-drawer"
        className={clsx('h-full')}
        data-state={isCollapsed ? 'collapsed' : 'expanded'}
      >
        <CollapsedDrawer
          className="drawer-collapsed"
          onOpenSearch={openSearch}
          onOpenSettings={openSettings}
          hasConversations={conversationsCount > 0}
          hasSearchable={hasSearchable}
          installedApps={installedApps}
          lang={lang}
        />
        <ExpandedDrawer
          className="drawer-expanded"
          onOpenSearch={openSearch}
          onOpenSettings={openSettings}
          hasConversations={conversationsCount > 0}
          hasSearchable={hasSearchable}
          installedApps={installedApps}
          lang={lang}
        />
        {!isCollapsed && isMobile && <BackDrop />}

        {/* Global Search Modal - rendered at AppDrawer level */}
        <GlobalSearch />

        {/* Settings Modal */}
        <SettingsModal isOpen={showSettingsModal} onClose={closeSettings} />

        <style>{
          /* CSS */ `
        #app-drawer {
          transition: width 0.1s ease-in-out;
        }
        #app-drawer[data-state="collapsed"] {
          width: 56px; /* Collapsed width */
        }
        #app-drawer[data-state="expanded"] {
          width: 256px; /* Expanded width */
        }
        #app-drawer[data-state="collapsed"] .drawer-expanded {
          display: none;
        }
        #app-drawer[data-state="expanded"] .drawer-collapsed {
          display: none;
        }
      `
        }</style>
      </div>
    </aside>
  )
})
AppDrawer.displayName = 'AppDrawer'

const CollapsedDrawer = ({
  className,
  onOpenSearch,
  hasConversations,
  installedApps,
  lang,
}: {
  className?: string
  onOpenSearch: () => void
  onOpenSettings: () => void
  hasConversations: boolean
  hasSearchable: boolean
  installedApps: InstalledExtension[]
  lang: LanguageCode
}) => {
  const { t } = useI18n()
  const url = useUrl(lang)

  return (
    <div
      className={`group w-18 p-4 lg:p-4 h-full z-50 fixed flex flex-col transition-all duration-200 border-e border-transparent ${className}`}
    >
      <div className="flex flex-col items-center overflow-y-auto overflow-x-hidden no-scrollbar -mt-4 md:mt-0">
        <Tooltip content={t('Expand sidebar')} placement="right">
          <Button
            data-testid="menu-button"
            isIconOnly
            variant="light"
            onPress={() => userSettings.getState().toggleDrawer()}
            className="mb-4 backdrop-blur-xs"
            aria-label={t('Expand sidebar')}
          >
            <Icon name="SidebarExpand" className="opacity-40 dark:opacity-60" />
          </Button>
        </Tooltip>

        <div>
          {/* Collapsed Navigation Icons */}
          <nav className="flex flex-col w-full">
            <Tooltip content={t('New chat')} placement="right">
              <Button
                as={Link}
                href={url('')}
                isIconOnly
                color="primary"
                variant="light"
                className="w-full dark:text-white"
                aria-label={t('Chat')}
              >
                <Icon name="ChatPlusIn" />
              </Button>
            </Tooltip>
            <Tooltip
              content={
                <span className="flex items-center gap-2">
                  {t('Search')}
                  <Kbd keys={['command']}>K</Kbd>
                </span>
              }
              placement="right"
            >
              <Button
                isIconOnly
                variant="light"
                className="w-full text-default-500"
                aria-label={t('Search')}
                onPress={onOpenSearch}
              >
                <Icon name="Search" />
              </Button>
            </Tooltip>
            {/* <Tooltip content={t('Knowledge')} placement="right">
              <Button
                as={Link}
                href={url('/knowledge')}
                isIconOnly
                color="primary"
                variant="light"
                className={cn(
                  'w-full text-primary-600 [.is-active]:bg-default-100',
                  isCurrentPath('/knowledge') && 'is-active',
                )}
                aria-label={t('Knowledge')}
              >
                <Icon name="Book" />
              </Button>
            </Tooltip> */}
            <Tooltip content={t('Agents')} placement="right">
              <Button
                as={Link}
                href={url('/agents')}
                isIconOnly
                color="warning"
                variant="light"
                className={cn(
                  'w-full [.is-active]:bg-default-100',
                  isCurrentPath('/agents') && 'is-active',
                )}
                aria-label={t('Agents')}
              >
                <Icon name="Sparks" />
              </Button>
            </Tooltip>
            <Tooltip content={t('Tasks')} placement="right">
              <Button
                as={Link}
                href={url('/tasks')}
                isIconOnly
                color="secondary"
                variant="light"
                className={cn(
                  'w-full text-secondary-600 [.is-active]:bg-default-100',
                  isCurrentPath('/tasks') && 'is-active',
                )}
                aria-label={t('Tasks')}
              >
                <Icon name="PcCheck" />
              </Button>
            </Tooltip>
            <Tooltip content={t('Library')} placement="right">
              <Button
                as={Link}
                href={url('/library')}
                isIconOnly
                color="success"
                variant="light"
                className={cn(
                  'w-full text-success-600 dark:text-success-300 [.is-active]:bg-default-100',
                  isCurrentPath('/library') && 'is-active',
                )}
                aria-label={t('Library')}
              >
                <Icon name="BookStack" />
              </Button>
            </Tooltip>
            {hasConversations && (
              <Tooltip content={t('Conversations history')} placement="right">
                <Button
                  as={Link}
                  href={url('/conversations')}
                  isIconOnly
                  variant="light"
                  className={cn(
                    'w-full text-gray-500 dark:text-gray-400 [.is-active]:bg-default-100',
                    isCurrentPath('/conversations') && 'is-active',
                  )}
                  aria-label={t('Conversations history')}
                >
                  <Icon name="ChatBubble" />
                </Button>
              </Tooltip>
            )}
            <Tooltip content={t('Studio')} placement="right">
              <Button
                as={Link}
                href={url('/studio')}
                isIconOnly
                variant="light"
                className={cn(
                  'w-full text-pink-500 dark:text-pink-400 [.is-active]:bg-default-100',
                  isCurrentPath('/studio') && 'is-active',
                )}
                aria-label={t('Studio')}
              >
                <Icon name="MediaImagePlus" />
              </Button>
            </Tooltip>
            <Tooltip content={t('Live')} placement="right">
              <Button
                as={Link}
                href={url('/live')}
                isIconOnly
                variant="light"
                className={cn(
                  'w-full text-cyan-500 dark:text-cyan-400 [.is-active]:bg-default-100',
                  isCurrentPath('/live') && 'is-active',
                )}
                aria-label={t('Live')}
              >
                <Icon name="Voice" />
              </Button>
            </Tooltip>
            {/* <Tooltip content={t('Methodologies')} placement="right">
              <Button
                as={Link}
                href={url('/methodologies')}
                isIconOnly
                color="success"
                variant="light"
                className={cn(
                  'w-full [.is-active]:bg-default-100',
                  isCurrentPath('/methodologies') && 'is-active',
                )}
                aria-label={t('Methodologies')}
              >
                <Icon name="Strategy" />
              </Button>
            </Tooltip> */}
            {/* <Tooltip content={t('Arena')} placement="right">
              <Button
                as={Link}
                href={url('/arena')}
                isIconOnly
                color="warning"
                variant="light"
                className={cn(
                  'w-full text-amber-500 [.is-active]:bg-default-100',
                  isCurrentPath('/arena') && 'is-active',
                )}
                aria-label={t('Arena')}
              >
                <Icon name="Crown" />
              </Button>
            </Tooltip> */}
            {/* <Tooltip content={t('Teams')} placement="right">
                <Button
                  as={Link}
                  href={url('/teams')}
                  isIconOnly
                  color="success"
                  variant="light"
                  className="w-full"
                  aria-label={t('Teams')}
                >
                  <Icon name="Community" />
                </Button>
              </Tooltip> */}
            {
              // Installed Marketplace Apps
              installedApps.map((installedApp) => {
                const ext = installedApp.extension
                const extPath = getAppPrimaryPageUrl(ext.id)
                // Get localized name if available
                const localizedName =
                  ext.i18n?.[lang as keyof typeof ext.i18n]?.name || ext.name
                const iconColorClass = getExtensionColorClass(ext.color)
                return (
                  <Tooltip
                    key={ext.id}
                    content={localizedName}
                    placement="right"
                  >
                    <Button
                      as={Link}
                      href={url(extPath)}
                      isIconOnly
                      variant="light"
                      className={cn(
                        'w-full [.is-active]:bg-default-100',
                        isCurrentPath(extPath) && 'is-active',
                      )}
                      aria-label={localizedName}
                    >
                      <Icon
                        name={ext.icon || 'Puzzle'}
                        className={iconColorClass}
                      />
                    </Button>
                  </Tooltip>
                )
              })
            }
            <Tooltip content={t('Marketplace')} placement="right">
              <Button
                as={Link}
                href={url('/marketplace')}
                isIconOnly
                color="warning"
                variant="light"
                className="w-full"
                aria-label={t('Marketplace')}
              >
                <Icon name="HexagonPlus" />
              </Button>
            </Tooltip>
          </nav>

          {/* <div className="mt-4 pt-4 border-t border-default-200 float-end">
            <Tooltip content={t('Upgrade to Pro')} placement="right">
              <Button
                as={Link}
                href={url('/upgrade')}
                isIconOnly
                color="warning"
                variant="flat"
                aria-label={t('Upgrade to Pro')}
              >
                <Icon name="Star" />
              </Button>
            </Tooltip>
          </div> */}
        </div>
      </div>

      {/* Progress indicator at bottom */}
      <div className="mt-auto pt-4 hidden lg:flex flex-col items-center gap-2">
        <ProgressIndicator />
      </div>
    </div>
  )
}

const ExpandedDrawer = ({
  className,
  onOpenSearch,
  onOpenSettings,
  hasConversations,
  installedApps,
  lang,
}: {
  className?: string
  onOpenSearch: () => void
  onOpenSettings: () => void
  hasConversations: boolean
  hasSearchable: boolean
  installedApps: InstalledExtension[]
  lang: LanguageCode
}) => {
  const { t } = useI18n()
  const url = useUrl(lang)
  const navigate = useNavigate()
  const customPlatformName = userSettings((state) => state.platformName)
  const isDarkTheme = userSettings((state) => state.isDarkTheme())
  const setTheme = userSettings((state) => state.setTheme)
  const setLanguage = userSettings((state) => state.setLanguage)
  const [isLanguagePopoverOpen, setIsLanguagePopoverOpen] = useState(false)

  // Register Cmd/Ctrl + Shift + L shortcut for theme toggle
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.metaKey || e.ctrlKey) &&
        e.shiftKey &&
        e.key.toLowerCase() === 'l'
      ) {
        e.preventDefault()
        setTheme(isDarkTheme ? 'light' : 'dark')
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isDarkTheme, setTheme])

  return (
    <div
      className={`bg-[var(--devs-bg)] dark:bg-default-50 fixed w-64 py-3 px-2 h-full flex flex-col ${className}`}
    >
      <ScrollShadow
        hideScrollBar
        className="flex flex-col overflow-y-auto flex-1 p-0.5"
      >
        <div className="mb-3.5 flex items-center p-0.5 justify-between">
          <Link href={url('')}>
            <Icon
              name="Devs"
              className="text-primary-300 dark:text-white ms-3 me-1.5"
            />
            <Title
              level={3}
              as="span"
              size="lg"
              data-testid="platform-name"
              aria-label={customPlatformName || PRODUCT.name}
            >
              {customPlatformName || PRODUCT.displayName}
            </Title>
          </Link>

          {/* <Tooltip content={t('Collapse sidebar')} placement="right"> */}
          <Button
            data-testid="menu-button-collapse"
            isIconOnly
            variant="light"
            onPress={() => userSettings.getState().toggleDrawer()}
            aria-label={t('Collapse sidebar')}
          >
            <Icon
              name="SidebarCollapse"
              className="opacity-40 dark:opacity-60"
            />
          </Button>
          {/* </Tooltip> */}
        </div>

        {/* Navigation */}
        <nav>
          <Listbox aria-label={t('Main navigation')} variant="flat">
            <ListboxSection>
              {[
                <ListboxItem
                  key="new-chat"
                  href={url('')}
                  variant="faded"
                  color="primary"
                  className="dark:text-gray-200 dark:hover:text-primary-500 [.is-active]:bg-primary-50"
                  startContent={
                    <Icon
                      name="ChatPlusIn"
                      className="text-primary-400 dark:text-white"
                    />
                  }
                  textValue={t('New chat')}
                >
                  {t('New chat')}
                </ListboxItem>,
                // Search Button
                <ListboxItem
                  key="search"
                  variant="faded"
                  className="dark:text-gray-200 dark:hover:text-primary-500 [.is-active]:bg-primary-50"
                  startContent={
                    <Icon name="Search" className="text-default-700" />
                  }
                  endContent={
                    <Kbd keys={['command']} className="ms-auto text-xs">
                      K
                    </Kbd>
                  }
                  onPress={onOpenSearch}
                >
                  {t('Search')}
                </ListboxItem>,
                <ListboxItem
                  key="agents"
                  href={url('/agents')}
                  variant="faded"
                  color="warning"
                  className={cn(
                    'dark:text-gray-200 dark:hover:text-warning-500 [.is-active]:bg-default-100',
                    isCurrentPath('/agents') && 'is-active',
                  )}
                  startContent={<Icon name="Sparks" className="text-warning" />}
                  textValue={t('Agents')}
                >
                  {t('Agents')}
                </ListboxItem>,
                <ListboxItem
                  key="tasks"
                  href={url('/tasks')}
                  variant="faded"
                  color="secondary"
                  className={cn(
                    'dark:text-gray-200 dark:hover:text-secondary-600 [.is-active]:bg-default-100',
                    isCurrentPath('/tasks') && 'is-active',
                  )}
                  startContent={
                    <Icon
                      name="PcCheck"
                      className="text-secondary dark:text-secondary-600"
                    />
                  }
                >
                  {t('Tasks')}
                </ListboxItem>,
                <ListboxItem
                  key="library"
                  href={url('/library')}
                  variant="faded"
                  // color="success"
                  className={cn(
                    // 'dark:text-gray-200 dark:hover:text-success-500 [.is-active]:bg-default-100',
                    isCurrentPath('/library') && 'is-active',
                  )}
                  startContent={
                    <Icon
                      name="BookStack"
                      className="text-success-600 dark:text-success-300"
                    />
                  }
                >
                  {t('Library')}
                </ListboxItem>,
                <ListboxItem
                  key="conversations"
                  href={url('/conversations')}
                  variant="faded"
                  className={cn(
                    '[.is-active]:bg-default-100',
                    isCurrentPath('/conversations') && 'is-active',
                    !hasConversations && 'hidden',
                  )}
                  startContent={
                    <Icon
                      name="ChatBubble"
                      className="text-gray-500 dark:text-gray-400"
                    />
                  }
                >
                  {t('Conversations')}
                </ListboxItem>,
                <ListboxItem
                  key="studio"
                  href={url('/studio')}
                  variant="faded"
                  className={cn(
                    '[.is-active]:bg-default-100',
                    isCurrentPath('/studio') && 'is-active',
                  )}
                  startContent={
                    <Icon
                      name="MediaImagePlus"
                      className="text-pink-500 dark:text-pink-400"
                    />
                  }
                >
                  {t('Studio')}
                </ListboxItem>,
                <ListboxItem
                  key="live"
                  href={url('/live')}
                  variant="faded"
                  className={cn(
                    '[.is-active]:bg-default-100',
                    isCurrentPath('/live') && 'is-active',
                  )}
                  startContent={
                    <Icon
                      name="Voice"
                      className="text-cyan-500 dark:text-cyan-400"
                    />
                  }
                >
                  {t('Live')}
                </ListboxItem>,
                // Installed Marketplace Apps
                ...installedApps.map((installedApp) => {
                  const ext = installedApp.extension
                  const extPath = getAppPrimaryPageUrl(ext.id)
                  const localizedName =
                    ext.i18n?.[lang as keyof typeof ext.i18n]?.name || ext.name
                  const iconColorClass = getExtensionColorClass(ext.color)
                  return (
                    <ListboxItem
                      key={ext.id}
                      href={url(extPath)}
                      variant="faded"
                      className={cn(
                        'dark:text-gray-200 [.is-active]:bg-default-100',
                        isCurrentPath(extPath) && 'is-active',
                      )}
                      startContent={
                        <Icon
                          name={ext.icon || 'Puzzle'}
                          className={iconColorClass}
                        />
                      }
                    >
                      {localizedName}
                    </ListboxItem>
                  )
                }),
                <ListboxItem
                  key="marketplace"
                  href={url('/marketplace')}
                  variant="faded"
                  color="warning"
                  className={cn(
                    'dark:text-gray-200 dark:hover:text-yellow-500 [.is-active]:bg-default-100',
                    isCurrentPath('/marketplace') && 'is-active',
                  )}
                  startContent={
                    <Icon name="HexagonPlus" className="text-yellow-500" />
                  }
                >
                  {t('Marketplace')}
                </ListboxItem>,
              ]}
            </ListboxSection>
          </Listbox>

          <RecentActivity lang={lang} />
        </nav>

        {/* Upgrade Action - Desktop */}
        {/* <Button
          href={url('/upgrade')}
          color="warning"
          variant="flat"
          startContent={<Icon name="Star" />}
          aria-label={t('Upgrade to Pro')}
        >
          {t('Upgrade to Pro')}
        </Button> */}
      </ScrollShadow>

      {/* Bottom navigation */}
      <nav className="w-full flex flex-col mt-4 gap-2">
        {/* Progress indicator and Organization/Product name at bottom */}

        {/* Language Selector Popover */}
        <Popover
          isOpen={isLanguagePopoverOpen}
          onOpenChange={setIsLanguagePopoverOpen}
          placement="top-end"
          offset={10}
        >
          <PopoverTrigger>
            <span className="absolute bottom-16 end-4 w-0 h-0" />
          </PopoverTrigger>
          <PopoverContent className="p-1">
            <Listbox
              aria-label={t('Language')}
              selectionMode="single"
              selectedKeys={new Set([lang])}
              onSelectionChange={(keys) => {
                const selectedLang = Array.from(keys)[0] as LanguageCode
                if (selectedLang) {
                  setLanguage(selectedLang)
                  setIsLanguagePopoverOpen(false)
                  // Navigate to the same path in the new language
                  const currentPath = window.location.pathname
                  const currentHash = window.location.hash
                  const pathWithoutLang = currentPath
                    .replace(/^\/(en|ar|de|es|fr|ko)/, '')
                    .replace(/^\/$/, '')
                  const newPath =
                    selectedLang === 'en'
                      ? pathWithoutLang || '/'
                      : `/${selectedLang}${pathWithoutLang || ''}`
                  navigate(newPath + currentHash)
                }
              }}
            >
              {(Object.entries(languages) as [LanguageCode, string][]).map(
                ([code, name]) => (
                  <ListboxItem
                    key={code}
                    textValue={name}
                    className={lang === code ? 'bg-primary-50' : ''}
                  >
                    {name}
                  </ListboxItem>
                ),
              )}
            </Listbox>
          </PopoverContent>
        </Popover>

        {/* Quick Actions Bar */}
        <div className="flex items-center justify-between gap-1 px-1">
          {/* Progress Indicator */}
          {/* <div className="flex items-center">
            <ProgressIndicator />
          </div> */}

          {/* Theme Toggle */}
          <Tooltip
            content={
              <span className="flex items-center gap-2">
                {isDarkTheme ? t('Light') : t('Dark')}
                <Kbd keys={['command', 'shift']}>L</Kbd>
              </span>
            }
            placement="top"
          >
            <Button
              isIconOnly
              variant="light"
              size="sm"
              onPress={() => setTheme(isDarkTheme ? 'light' : 'dark')}
              aria-label={t('Theme')}
            >
              <Icon
                name={isDarkTheme ? 'SunLight' : 'HalfMoon'}
                className="text-gray-500 dark:text-gray-400"
                size="sm"
              />
            </Button>
          </Tooltip>

          {/* Settings */}
          <Tooltip
            content={
              <span className="flex items-center gap-2">
                {t('Settings')}
                <Kbd keys={['command']}>,</Kbd>
              </span>
            }
            placement="top"
          >
            <Button
              isIconOnly
              variant="light"
              size="sm"
              onPress={onOpenSettings}
              aria-label={t('Settings')}
            >
              <Icon
                name="Settings"
                className="text-gray-500 dark:text-gray-400"
                size="sm"
              />
            </Button>
          </Tooltip>
        </div>
      </nav>
    </div>
  )
}
