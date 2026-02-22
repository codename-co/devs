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
import { AboutModal } from './AboutModal'
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
import {
  useMarketplaceStore,
  type InstalledExtension,
} from '@/features/marketplace'
import { getAppPrimaryPageUrl } from '@/features/marketplace/store'
import { getExtensionColorClass } from '@/features/marketplace/utils'

const AgentList = () => {
  const { lang, t } = useI18n()
  const url = useUrl(lang)

  // TODO: Fetch agents from store or API
  const agents: any[] = []

  if (agents.length === 0) {
    return null
  }

  return (
    <Listbox aria-label={t('Agents')}>
      <ListboxSection title={t('AGENTS')}>
        {[
          ...(agents
            .reverse?.()
            .slice(0, 5)
            .map((agent) => (
              <ListboxItem
                key={agent.id}
                className="dark:text-gray-200 dark:hover:text-grey-500"
                href={`/agents/run/${agent.slug}`}
                textValue={agent.name}
              >
                <div className="flex items-center gap-2">
                  <span className="truncate">{agent.name}</span>
                </div>
              </ListboxItem>
            )) ?? []),
          agents.length > 0 && (
            <ListboxItem
              key="view-all"
              className="dark:text-gray-200 dark:hover:text-grey-500"
              href={url('/agents')}
            >
              {t('View all agents')}
            </ListboxItem>
          ),
        ].filter((item) => !!item)}
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
    className="fixed inset-0 bg-black opacity-40 dark:opacity-70 -z-1 pointer-events-auto"
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
        'pointer-events-none flex-0 h-full md:h-screen z-50 fixed md:relative dark:bg-default-50',
      )}
    >
      <div
        id="app-drawer"
        data-testid="app-drawer"
        className={clsx('h-full', isCollapsed && 'fixed')}
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
          width: 73px; /* Collapsed width */
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

  return (
    <div
      className={`group w-18 p-2 lg:p-4 h-full z-50 flex flex-col transition-all duration-200 border-e border-transparent hover:bg-gray-50 dark:hover:bg-content1 hover:border-default-200 ${className} hover:pointer-events-auto`}
    >
      <div className="flex flex-col items-center overflow-y-auto overflow-x-hidden no-scrollbar">
        <Tooltip content={t('Expand sidebar')} placement="right">
          <Button
            data-testid="menu-button"
            isIconOnly
            variant="light"
            onPress={() => userSettings.getState().toggleDrawer()}
            className="mb-4 pointer-events-auto backdrop-blur-xs backdrop-brightness-120"
            aria-label={t('Expand sidebar')}
          >
            <Icon name="SidebarExpand" className="opacity-40 dark:opacity-60" />
          </Button>
        </Tooltip>

        <div className="w-full opacity-0 transition-opacity duration-200 group-hover:opacity-100">
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
                <Icon name="TriangleFlagTwoStripes" />
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

      {/* Progress indicator and settings at bottom */}
      <div className="mt-auto pt-4 hidden lg:flex flex-col items-center gap-2">
        <ProgressIndicator />
        <Tooltip content={t('Settings')} placement="right">
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
  const [showAboutModal, setShowAboutModal] = useState(false)
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
      className={`fixed w-64 bg-gray-50 dark:bg-content1 p-3 border-e border-default-200 dark:border-default-200 h-full flex flex-col ${className}`}
    >
      <ScrollShadow
        hideScrollBar
        className="pointer-events-auto flex flex-col overflow-y-auto flex-1 p-0.5"
      >
        <div className="mb-3.5 flex items-center p-0.5">
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
          <Link href={url('')}>
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
        </div>

        {/* Navigation */}
        <nav className="mb-4">
          <Listbox aria-label={t('Main navigation')} variant="flat">
            <ListboxSection showDivider>
              <ListboxItem
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
              </ListboxItem>

              {/* Search Button - conditionally rendered */}
              <ListboxItem
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
              </ListboxItem>
              {/* <ListboxItem
                href={url('/knowledge')}
                variant="faded"
                color="primary"
                className={cn(
                  'dark:text-gray-200 dark:hover:text-primary-600 [.is-active]:bg-default-100',
                  isCurrentPath('/knowledge') && 'is-active',
                )}
                startContent={
                  <Icon
                    name="Book"
                    className="text-primary dark:text-primary-600"
                  />
                }
              >
                {t('Knowledge')}
              </ListboxItem> */}
              <ListboxItem
                href={url('/agents')}
                variant="faded"
                color="warning"
                className={cn(
                  'dark:text-gray-200 dark:hover:text-warning-500 [.is-active]:bg-default-100',
                  isCurrentPath('/agents') && 'is-active',
                )}
                startContent={<Icon name="Sparks" className="text-warning" />}
                // endContent={
                //   <Tooltip content={t('New Agent')} placement="right">
                //     <span
                //       role="button"
                //       tabIndex={0}
                //       className="inline-flex items-center justify-center w-6 h-6 rounded-small bg-warning/20 text-warning hover:bg-warning/30 cursor-pointer transition-colors"
                //       aria-label={t('New Agent')}
                //       onClick={(e) => {
                //         e.preventDefault()
                //         e.stopPropagation()
                //         navigate(url('/agents/new'))
                //       }}
                //       onKeyDown={(e) => {
                //         if (e.key === 'Enter' || e.key === ' ') {
                //           e.preventDefault()
                //           e.stopPropagation()
                //           navigate(url('/agents/new'))
                //         }
                //       }}
                //     >
                //       <Icon name="Plus" />
                //     </span>
                //   </Tooltip>
                // }
                textValue={t('Agents')}
              >
                {t('Agents')}
              </ListboxItem>
              <ListboxItem
                href={url('/tasks')}
                variant="faded"
                color="secondary"
                className={cn(
                  'dark:text-gray-200 dark:hover:text-secondary-600 [.is-active]:bg-default-100',
                  isCurrentPath('/tasks') && 'is-active',
                )}
                startContent={
                  <Icon
                    name="TriangleFlagTwoStripes"
                    className="text-secondary dark:text-secondary-600"
                  />
                }
                // endContent={
                //   <Tooltip content={t('New Task')} placement="right">
                //     <span
                //       role="button"
                //       tabIndex={0}
                //       className="inline-flex items-center justify-center w-6 h-6 rounded-small bg-secondary/20 text-secondary hover:bg-secondary/30 cursor-pointer transition-colors"
                //       aria-label={t('New Task')}
                //       onClick={(e) => {
                //         e.preventDefault()
                //         e.stopPropagation()
                //         navigate(url(''))
                //       }}
                //       onKeyDown={(e) => {
                //         if (e.key === 'Enter' || e.key === ' ') {
                //           e.preventDefault()
                //           e.stopPropagation()
                //           navigate(url(''))
                //         }
                //       }}
                //     >
                //       <Icon name="Plus" />
                //     </span>
                //   </Tooltip>
                // }
              >
                {t('Tasks')}
              </ListboxItem>
              <ListboxItem
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
              </ListboxItem>
            </ListboxSection>

            <ListboxSection
              title={t('APPLICATIONS')}
              classNames={{
                heading: 'ms-[34px]',
              }}
            >
              {[
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
                  // Get localized name if available
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

          <AgentList />
          {/* <TaskList /> */}
          {/* <ConversationList /> */}
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
      <nav className="pointer-events-auto w-full flex flex-col mt-4 gap-2">
        {/* Progress indicator and Organization/Product name at bottom */}
        <AboutModal
          isOpen={showAboutModal}
          onClose={() => setShowAboutModal(false)}
        />

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
          {/* About */}
          <Tooltip content={t('About')} placement="top">
            <Button
              isIconOnly
              variant="light"
              size="sm"
              onPress={() => setShowAboutModal(true)}
              aria-label={t('About')}
            >
              <ProgressIndicator />
            </Button>
          </Tooltip>

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
