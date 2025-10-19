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
  Select,
  SelectItem,
  DropdownSection,
} from '@heroui/react'

import { Lang, languages, useI18n, useUrl } from '@/i18n'
import { userSettings } from '@/stores/userStore'

import { Icon } from './Icon'
import { Title } from './Title'
import { ProgressIndicator } from './ProgressIndicator'
import { AboutModal } from './AboutModal'
import { PRODUCT } from '@/config/product'
import clsx from 'clsx'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const AgentList = () => {
  const { t, url } = useI18n()

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
                href={`/agents/run#${agent.id}`}
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

export const AppDrawer = () => {
  const isCollapsed = userSettings((state) => state.isDrawerCollapsed)

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
        'pointer-events-none flex-0 h-full md:h-screen z-200 fixed md:relative dark:bg-default-50',
      )}
    >
      <div
        id="app-drawer"
        data-testid="app-drawer"
        className={clsx('h-full', isCollapsed && 'fixed')}
        data-state={isCollapsed ? 'collapsed' : 'expanded'}
      >
        <CollapsedDrawer className="drawer-collapsed" />
        <ExpandedDrawer className="drawer-expanded" />
        {!isCollapsed && isMobile && <BackDrop />}

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
}

const CollapsedDrawer = ({ className }: { className?: string }) => {
  const { t, url } = useI18n()

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
                href={url('/')}
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
                className="w-full"
                aria-label={t('Agents')}
              >
                <Icon name="Sparks" />
              </Button>
            </Tooltip>
            <Tooltip content={t('Methodologies')} placement="right">
              <Button
                as={Link}
                href={url('/methodologies')}
                isIconOnly
                color="success"
                variant="light"
                className="w-full"
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
                className="w-full dark:text-secondary-600"
                aria-label={t('Tasks')}
              >
                <Icon name="TriangleFlagTwoStripes" />
              </Button>
            </Tooltip>
            <Tooltip content={t('Knowledge')} placement="right">
              <Button
                as={Link}
                href={url('/knowledge')}
                isIconOnly
                color="danger"
                variant="light"
                className="w-full dark:text-danger-600"
                aria-label={t('Knowledge')}
              >
                <Icon name="Brain" />
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
                className="w-full text-gray-500  dark:text-gray-400"
                aria-label={t('Conversations history')}
              >
                <Icon name="ChatBubble" />
              </Button>
            </Tooltip>
            {/* <Tooltip content={t('Connectors')} placement="right">
                <Button
                  as={Link}
                  href={url('/connectors')}
                  isIconOnly
                  variant="light"
                  className="w-full"
                  aria-label={t('Connectors')}
                >
                  <Icon name="Puzzle" />
                </Button>
              </Tooltip> */}
            <Tooltip content={t('Settings')} placement="right">
              <Button
                as={Link}
                href={url('/settings')}
                isIconOnly
                variant="light"
                className="w-full text-gray-500 dark:text-gray-400"
                aria-label={t('Settings')}
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

      {/* Progress indicator and Product name at bottom */}
      <div className="mt-auto pt-4 hidden lg:block">
        <ProgressIndicator />
      </div>
    </div>
  )
}

const ExpandedDrawer = ({ className }: { className?: string }) => {
  const { lang, t, url } = useI18n()
  const navigate = useNavigate()
  const customPlatformName = userSettings((state) => state.platformName)
  const isDarkTheme = userSettings((state) => state.isDarkTheme())
  const setTheme = userSettings((state) => state.setTheme)
  const theme = userSettings((state) => state.theme)
  const [showAboutModal, setShowAboutModal] = useState(false)

  const setLanguage = userSettings((state) => state.setLanguage)

  const handleLanguageChange = (newLanguage: Lang) => {
    // Update the language setting in the store
    setLanguage(newLanguage)

    // Generate the URL for the new language using useUrl from that language context
    const newUrl = useUrl(newLanguage)
    const currentPath =
      window.location.pathname + window.location.search + window.location.hash
    const path = currentPath.replace(`/${lang}`, '')
    const newPath = newUrl(path)

    // Navigate to the new URL
    navigate(newPath)
  }

  return (
    <div
      className={`fixed w-64 bg-gray-50 dark:bg-content1 p-3 border-r border-default-200 dark:border-default-300 h-full flex flex-col ${className}`}
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
          <Title
            level={3}
            as="div"
            size="lg"
            data-testid="platform-name"
            aria-label={customPlatformName || PRODUCT.name}
          >
            {customPlatformName || PRODUCT.displayName}
          </Title>
        </div>

        {/* Navigation */}
        <nav className="mb-4">
          <Listbox aria-label={t('Main navigation')} variant="flat">
            <ListboxSection showDivider>
              <ListboxItem
                href={url('')}
                color="primary"
                className="dark:text-gray-200 dark:hover:text-primary-500"
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
                color="warning"
                className="dark:text-gray-200 dark:hover:text-warning-500"
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
                href={url('/methodologies')}
                color="success"
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
                color="secondary"
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
                href={url('/knowledge')}
                color="danger"
                startContent={
                  <Icon
                    name="Brain"
                    className="text-danger dark:text-danger-600"
                  />
                }
              >
                {t('Knowledge')}
              </ListboxItem>

              {/* <ListboxItem
                  href={url('/teams')}
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
            {/* <ListboxItem
                href={url('/connectors')}
                startContent={<Icon name="Puzzle" />}
              >
                {t('Connectors')}
              </ListboxItem> */}
            <ListboxItem
              href={url('/conversations')}
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
      <nav className="pointer-events-auto w-full flex flex-row mt-4 items-center">
        {/* Progress indicator and Organization/Product name at bottom */}
        <AboutModal
          isOpen={showAboutModal}
          onClose={() => setShowAboutModal(false)}
        />

        {/* Quick Actions Menu */}
        <Dropdown placement="top" aria-label={PRODUCT.name}>
          <DropdownTrigger>
            <Button
              endContent={
                <Tooltip content={t('Quick Actions')} placement="top-end">
                  <Icon
                    name="NavArrowDown"
                    className="opacity-40 dark:opacity-60 -mr-3"
                  />
                </Tooltip>
              }
              size="lg"
              variant="light"
              className="w-full justify-between"
              aria-label={t('Quick Actions')}
            >
              <Title
                as="div"
                size="lg"
                className="text-default-400 dark:text-default-500 flex items-center gap-2 -ml-3"
                aria-label={PRODUCT.name}
              >
                <ProgressIndicator />
                {PRODUCT.displayName}
              </Title>
            </Button>
          </DropdownTrigger>
          <DropdownMenu aria-label={t('Quick Actions')}>
            <DropdownSection showDivider>
              <DropdownItem
                key="about"
                startContent={<Icon name="Devs" size="sm" color="grey" />}
                onClick={() => setShowAboutModal(true)}
              >
                {t('About')}
              </DropdownItem>
              <DropdownItem
                key="settings"
                href={url('/settings')}
                startContent={<Icon name="Settings" size="sm" />}
              >
                {t('Settings')}
              </DropdownItem>
              <DropdownItem
                key="open"
                startContent={<Icon name="GitHub" size="sm" />}
                endContent={<Icon name="ArrowRight" size="sm" color="grey" />}
                href="https://github.com/codename-co/devs"
                hrefLang="en"
                target="_blank"
                onClick={() => {
                  window.open('https://github.com/codename-co/devs', '_blank')
                }}
              >
                {t('Open Source')}
              </DropdownItem>
            </DropdownSection>
            <DropdownItem
              key="lang"
              closeOnSelect={false}
              // startContent={<Icon name="Language" />}
              onPress={() => {
                setLanguage(lang === 'en' ? 'es' : 'en')
              }}
            >
              <Select
                selectedKeys={[lang]}
                onSelectionChange={(keys) => {
                  const selectedLang = Array.from(keys)[0] as Lang
                  if (selectedLang && selectedLang !== lang) {
                    handleLanguageChange(selectedLang)
                  }
                }}
                classNames={{
                  mainWrapper: '-ml-0.5',
                }}
                size="sm"
                variant="underlined"
              >
                {Object.entries(languages).map(([key, name]) => (
                  <SelectItem key={key} textValue={name}>
                    {name}
                  </SelectItem>
                ))}
              </Select>
            </DropdownItem>
            <DropdownItem
              key="theme"
              closeOnSelect={false}
              // startContent={<Icon name="LightBulbOn" />}
              shortcut={theme === 'light' ? t('Light') : t('Dark')}
              onPress={() => {
                setTheme(isDarkTheme ? 'light' : 'dark')
              }}
            >
              {t('Theme')}
            </DropdownItem>
          </DropdownMenu>
        </Dropdown>
      </nav>
    </div>
  )
}
