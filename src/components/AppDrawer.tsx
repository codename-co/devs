import {
  Button,
  Link,
  Listbox,
  ListboxItem,
  ListboxSection,
  ScrollShadow,
  Tooltip,
  DropdownMenu,
  DropdownItem,
  DropdownTrigger,
  Dropdown,
  DropdownSection,
  Modal,
  ModalContent,
  ModalBody,
  ModalHeader,
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
import { SyncSettings } from '@/features/sync'
import { PRODUCT } from '@/config/product'
import clsx from 'clsx'
import { useState, useEffect, memo } from 'react'
import { cn, isCurrentPath } from '@/lib/utils'
import { useSyncStore } from '@/features/sync'
import { useNavigate } from 'react-router-dom'

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
                href={`/agents/run#${agent.slug}`}
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
  const isCollapsed = userSettings((state) => state.isDrawerCollapsed)
  const [showSettingsModal, setShowSettingsModal] = useState(false)

  const [isMobile, setIsMobile] = useState(false)

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
          onOpenSettings={() => setShowSettingsModal(true)}
        />
        <ExpandedDrawer
          className="drawer-expanded"
          onOpenSettings={() => setShowSettingsModal(true)}
        />
        {!isCollapsed && isMobile && <BackDrop />}

        {/* Settings Modal - rendered at AppDrawer level */}
        <SettingsModal
          isOpen={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
        />

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
  onOpenSettings,
}: {
  className?: string
  onOpenSettings: () => void
}) => {
  const { lang, t } = useI18n()
  const url = useUrl(lang)

  return (
    <div
      className={`group w-18 p-2 lg:p-4 h-full z-50 flex flex-col transition-all duration-200 border-r border-transparent hover:bg-gray-50 dark:hover:bg-content1 hover:border-default-200 ${className} hover:pointer-events-auto`}
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
            <Tooltip content={t('Knowledge')} placement="right">
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
            </Tooltip>
            <Tooltip content={t('Methodologies')} placement="right">
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
            <Tooltip content={t('Settings')} placement="right">
              <Button
                isIconOnly
                variant="light"
                className={cn(
                  'w-full text-gray-500 dark:text-gray-400 [.is-active]:bg-default-100',
                  isCurrentPath('/settings') && 'is-active',
                )}
                aria-label={t('Settings')}
                onPress={onOpenSettings}
              >
                <Icon name="Settings" />
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
  onOpenSettings,
}: {
  className?: string
  onOpenSettings: () => void
}) => {
  const { lang, t } = useI18n()
  const url = useUrl(lang)
  const navigate = useNavigate()
  const customPlatformName = userSettings((state) => state.platformName)
  const isDarkTheme = userSettings((state) => state.isDarkTheme())
  const setTheme = userSettings((state) => state.setTheme)
  const setLanguage = userSettings((state) => state.setLanguage)
  const [showAboutModal, setShowAboutModal] = useState(false)
  const [showSyncModal, setShowSyncModal] = useState(false)
  const [isLanguagePopoverOpen, setIsLanguagePopoverOpen] = useState(false)

  // Sync state for indicator
  const { enabled: syncEnabled, status: syncStatus, peerCount } = useSyncStore()

  return (
    <div
      className={`fixed w-64 bg-gray-50 dark:bg-content1 p-3 border-r border-default-200 dark:border-default-200 h-full flex flex-col ${className}`}
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
            </ListboxSection>
            <ListboxSection showDivider>
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
              </ListboxItem>
              <ListboxItem
                href={url('/methodologies')}
                variant="faded"
                color="success"
                className={cn(
                  'dark:text-gray-200 dark:hover:text-success-500 [.is-active]:bg-default-100',
                  isCurrentPath('/methodologies') && 'is-active',
                )}
                startContent={<Icon name="Strategy" className="text-success" />}
                // endContent={
                //   <Tooltip content={t('New Methodology')} placement="right">
                //     <span
                //       role="button"
                //       tabIndex={0}
                //       className="inline-flex items-center justify-center w-6 h-6 rounded-small bg-success/20 text-success hover:bg-success/30 cursor-pointer transition-colors"
                //       aria-label={t('New Methodology')}
                //       onClick={(e) => {
                //         e.preventDefault()
                //         e.stopPropagation()
                //         navigate(url('/methodologies/new'))
                //       }}
                //       onKeyDown={(e) => {
                //         if (e.key === 'Enter' || e.key === ' ') {
                //           e.preventDefault()
                //           e.stopPropagation()
                //           navigate(url('/methodologies/new'))
                //         }
                //       }}
                //     >
                //       <Icon name="Plus" />
                //     </span>
                //   </Tooltip>
                // }
              >
                {t('Methodologies')}
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

              {/* <ListboxItem
                  href={url('/teams')}
                  variant="faded"
                  color="success"
                  startContent={<Icon name="Community" color="success" />}
                  endContent={
                    <Tooltip content={t('New Team')} placement="right">
                      <Button
                        isIconOnly
                        size="sm"
                        variant="flat"
                        color="success"
                        aria-label={t('New Team')}
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          navigate(url('/teams/new'))
                        }}
                      >
                        <Icon name="Plus" />
                      </Button>
                    </Tooltip>
                  }
                >
                  {t('Teams')}
                </ListboxItem> */}
            </ListboxSection>
            <ListboxItem
              href={url('/conversations')}
              variant="faded"
              className={cn(
                '[.is-active]:bg-default-100',
                isCurrentPath('/conversations') && 'is-active',
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

        {/* Sync Modal */}
        <Modal
          size="3xl"
          scrollBehavior="inside"
          placement="bottom-center"
          isOpen={showSyncModal}
          onClose={() => setShowSyncModal(false)}
          backdrop="blur"
        >
          <ModalContent>
            <ModalHeader>{t('Synchronization')}</ModalHeader>
            <ModalBody className="pb-6">
              <SyncSettings />
            </ModalBody>
          </ModalContent>
        </Modal>

        {/* Language Selector Popover */}
        <Popover
          isOpen={isLanguagePopoverOpen}
          onOpenChange={setIsLanguagePopoverOpen}
          placement="top-end"
          offset={10}
        >
          <PopoverTrigger>
            <span className="absolute bottom-16 right-4 w-0 h-0" />
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
                  const pathWithoutLang = currentPath
                    .replace(/^\/(en|ar|de|es|fr|ko)/, '')
                    .replace(/^\/$/, '')
                  const newPath =
                    selectedLang === 'en'
                      ? pathWithoutLang || '/'
                      : `/${selectedLang}${pathWithoutLang || ''}`
                  navigate(newPath)
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
            content={isDarkTheme ? t('Light') : t('Dark')}
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
          <Tooltip content={t('Settings')} placement="top">
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

          {/* More Menu */}
          <Dropdown placement="top-end">
            <DropdownTrigger>
              <Button
                isIconOnly
                variant="light"
                size="sm"
                aria-label={t('More')}
              >
                <Icon
                  name="Menu"
                  className="text-gray-500 dark:text-gray-400"
                  size="sm"
                />
              </Button>
            </DropdownTrigger>
            <DropdownMenu aria-label={t('More')}>
              <DropdownSection showDivider>
                <DropdownItem
                  key="sync"
                  startContent={
                    <span className="relative">
                      {syncEnabled && (
                        <span
                          className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full ${
                            syncStatus === 'connected'
                              ? peerCount > 0
                                ? 'bg-success'
                                : 'bg-warning'
                              : 'bg-default-400'
                          }`}
                        />
                      )}
                      <Icon
                        name={syncEnabled ? 'CloudSync' : 'CloudXmark'}
                        size="sm"
                      />
                    </span>
                  }
                  endContent={
                    <span className="text-tiny text-default-400 flex items-center gap-1">
                      {syncEnabled
                        ? syncStatus === 'connected'
                          ? t('Syncing')
                          : t('Connecting...')
                        : t('Offline')}
                      <Icon
                        name="NavArrowRight"
                        size="sm"
                        className="w-3 h-3"
                      />
                    </span>
                  }
                  onPress={() => setShowSyncModal(true)}
                >
                  {t('Sync')}
                </DropdownItem>
                <DropdownItem
                  key="language"
                  startContent={<Icon name="Language" size="sm" />}
                  endContent={
                    <span className="text-tiny text-default-400 flex items-center gap-1">
                      {languages[lang]}
                      <Icon
                        name="NavArrowRight"
                        size="sm"
                        className="w-3 h-3"
                      />
                    </span>
                  }
                  onPress={() => setIsLanguagePopoverOpen(true)}
                  closeOnSelect={false}
                >
                  {t('Language')}
                </DropdownItem>
              </DropdownSection>
              <DropdownSection showDivider>
                <DropdownItem
                  key="github"
                  startContent={<Icon name="GitHub" size="sm" />}
                  endContent={
                    <Icon
                      name="OpenNewWindow"
                      size="sm"
                      className="text-gray-400"
                    />
                  }
                  onPress={() =>
                    window.open(
                      'https://github.com/codename-co/devs',
                      '_blank',
                      'noopener,noreferrer',
                    )
                  }
                >
                  {t('Open Source')}
                </DropdownItem>
              </DropdownSection>
              <DropdownItem
                key="privacy"
                href={url('/privacy')}
                startContent={<Icon name="Lock" size="sm" />}
              >
                {t('Privacy')}
              </DropdownItem>
              <DropdownItem
                key="terms"
                href={url('/terms')}
                startContent={<Icon name="Page" size="sm" />}
              >
                {t('Terms')}
              </DropdownItem>
              {/* Version and Build Info */}
              <DropdownItem
                key="metadata"
                isDisabled
                classNames={{
                  title: 'text-xs text-center',
                }}
              >
                v{__APP_VERSION__}
                <span className="mx-1">·</span>
                <time dateTime={new Date(__BUILD_TIME__).toISOString()}>
                  {new Date(__BUILD_TIME__).toLocaleString(lang, {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  })}
                </time>
              </DropdownItem>
            </DropdownMenu>
          </Dropdown>
        </div>
      </nav>
    </div>
  )
}
