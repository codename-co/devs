import {
  Button,
  Link,
  Listbox,
  ListboxItem,
  ListboxSection,
  ScrollShadow,
  Tooltip,
} from '@heroui/react'

import { useI18n } from '@/i18n'
import { userSettings } from '@/stores/userStore'
import { useConversationStore } from '@/stores/conversationStore'

import { Icon } from './Icon'
import { Title } from './Title'
import { PRODUCT } from '@/config/product'
import clsx from 'clsx'
import { useEffect } from 'react'

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

const ConversationList = () => {
  const { t, url } = useI18n()
  const { conversations, loadConversations, getConversationTitle } =
    useConversationStore()

  useEffect(() => {
    // Load conversations from the database when component mounts
    loadConversations()
  }, [loadConversations])

  if (conversations.length === 0) {
    return null
  }

  // Sort conversations by timestamp, most recent first
  const sortedConversations = [...conversations].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  )

  return (
    <Listbox aria-label={t('Conversations history')}>
      <ListboxSection title={t('CONVERSATIONS')}>
        {[
          ...sortedConversations.slice(0, 5).map((conversation) => (
            <ListboxItem
              key={conversation.id}
              className="dark:text-gray-200 dark:hover:text-grey-500"
              href={url(
                `/agents/run#${conversation.agentId}/${conversation.id}`,
              )}
              textValue={getConversationTitle(conversation)}
            >
              <div className="flex items-center gap-2">
                <Icon name="ChatLines" />
                <span className="truncate">
                  {getConversationTitle(conversation)}
                </span>
              </div>
            </ListboxItem>
          )),
          conversations.length > 0 && (
            <ListboxItem
              key="view-all"
              className="dark:text-gray-200 dark:hover:text-grey-500"
              href={url('/conversations')}
            >
              {t('View all history')}
            </ListboxItem>
          ),
        ].filter((item) => !!item)}
      </ListboxSection>
    </Listbox>
  )
}

export const AppDrawer = () => {
  const isCollapsed = userSettings((state) => state.isDrawerCollapsed)

  return (
    <aside className={clsx('flex-0 h-screen z-10', isCollapsed && 'fixed')}>
      <div
        id="app-drawer"
        className="h-full"
        data-state={isCollapsed ? 'collapsed' : 'expanded'}
      >
        <CollapsedDrawer className="drawer-collapsed" />
        <ExpandedDrawer className="drawer-expanded" />
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
      className={`group w-18 p-4 h-screen z-50 pointer-events-none flex flex-col transition-all duration-200 border-r border-transparent hover:bg-gray-50 hover:dark:bg-content1 hover:border-default-200 dark:hover:bg-content1 ${className} hover:pointer-events-auto`}
    >
      <div className="flex flex-col items-center overflow-y-auto overflow-x-hidden">
        <Tooltip content={t('Expand sidebar')} placement="right">
          <Button
            isIconOnly
            variant="light"
            onPress={() => userSettings.getState().toggleDrawer()}
            className="mb-4 pointer-events-auto"
            aria-label={t('Expand sidebar')}
          >
            <Icon name="SidebarExpand" className="opacity-40 dark:opacity-60" />
          </Button>
        </Tooltip>

        <div className="w-full opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          {/* Collapsed Navigation Icons */}
          <nav className="flex flex-col w-full">
            <Tooltip content={t('New Chat')} placement="right">
              <Button
                as={Link}
                href={url('/')}
                isIconOnly
                color="primary"
                variant="light"
                className="w-full"
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
            {/* <Tooltip content={t('Missions')} placement="right">
                <Button
                  as={Link}
                  href={url('/missions')}
                  isIconOnly
                  color="secondary"
                  variant="light"
                  className="w-full"
                  aria-label={t('Missions')}
                >
                  <Icon name="TriangleFlagTwoStripes" />
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
            <Tooltip content={t('Conversations history')} placement="right">
              <Button
                as={Link}
                href={url('/conversations')}
                isIconOnly
                variant="light"
                className="w-full"
                aria-label={t('Conversations history')}
              >
                <Icon name="ChatBubble" />
              </Button>
            </Tooltip>
            {/* <Tooltip content={t('Knowledge')} placement="right">
                <Button
                  as={Link}
                  href={url('/knowledge')}
                  isIconOnly
                  variant="light"
                  className="w-full"
                  aria-label={t('Knowledge')}
                >
                  <Icon name="Brain" />
                </Button>
              </Tooltip> */}
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
                className="w-full"
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

      {/* Product name at bottom */}
      <div className="mt-auto pt-4 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
        <Title
          as="div"
          size="sm"
          className="text-center text-default-400 dark:text-default-500"
          aria-label={PRODUCT.name}
        >
          {PRODUCT.displayName}
        </Title>
      </div>
    </div>
  )
}

const ExpandedDrawer = ({ className }: { className?: string }) => {
  const { t, url } = useI18n()

  return (
    <div
      className={`w-64 bg-gray-50 dark:bg-content1 p-4 border-r border-default-200 dark:border-default-300 h-screen pointer-events-none flex flex-col ${className}`}
    >
      <ScrollShadow
        hideScrollBar
        className="pointer-events-auto flex flex-col overflow-y-auto flex-1"
      >
        <div className="mb-2 flex items-center justify-between ml-2">
          <Title level={3} as="div" size="lg" aria-label={PRODUCT.name}>
            {PRODUCT.displayName}
          </Title>
          <Tooltip content={t('Collapse sidebar')} placement="right">
            <Button
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
          </Tooltip>
        </div>

        {/* Navigation */}
        <nav className="mb-4">
          <Listbox aria-label={t('Main navigation')} variant="flat">
            <ListboxSection showDivider>
              <ListboxItem
                href={url('/')}
                color="primary"
                className="dark:text-gray-200 dark:hover:text-primary-500"
                startContent={<Icon name="ChatPlusIn" />}
                textValue={t('Chat with AI')}
              >
                {t('Chat with AI')}
              </ListboxItem>
            </ListboxSection>
            <ListboxSection showDivider>
              <ListboxItem
                href={url('/agents')}
                color="warning"
                className="dark:text-gray-200 dark:hover:text-warning-500"
                startContent={<Icon name="Sparks" color="warning" />}
                endContent={
                  <Tooltip content={t('New Agent')} placement="right">
                    <Button
                      isIconOnly
                      size="sm"
                      variant="flat"
                      color="warning"
                      aria-label={t('New Agent')}
                      onPress={() => {
                        window.location.href = url('/agents/new')
                      }}
                    >
                      <Icon name="Plus" />
                    </Button>
                  </Tooltip>
                }
                textValue={t('Agents')}
              >
                {t('Agents')}
              </ListboxItem>
              {/* <ListboxItem
                  href={url('/missions')}
                  color="secondary"
                  startContent={
                    <Icon name="TriangleFlagTwoStripes" color="secondary" />
                  }
                  endContent={
                    <Tooltip content={t('New Mission')} placement="right">
                      <Button
                        isIconOnly
                        size="sm"
                        variant="flat"
                        color="secondary"
                        aria-label={t('New Mission')}
                        onClick={(e) => {
                          e.preventDefault()
                          window.location.href = url('/missions/new')
                        }}
                      >
                        <Icon name="Plus" />
                      </Button>
                    </Tooltip>
                  }
                >
                  {t('Missions')}
                </ListboxItem> */}
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
                          window.location.href = url('/teams/new')
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
                href={url('/knowledge')}
                startContent={<Icon name="Brain" />}
              >
                {t('Knowledge')}
              </ListboxItem> */}
            {/* <ListboxItem
                href={url('/connectors')}
                startContent={<Icon name="Puzzle" />}
              >
                {t('Connectors')}
              </ListboxItem> */}
            <ListboxItem
              className="dark:text-gray-200 dark:hover:text-grey-500"
              href={url('/settings')}
              startContent={<Icon name="Settings" />}
              textValue={t('Settings')}
            >
              {t('Settings')}
            </ListboxItem>
          </Listbox>

          <AgentList />
          <ConversationList />
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
      {/* Organization/Product name at bottom */}
      <div className="mt-auto pt-2">
        <Title
          as="div"
          size="lg"
          className="text-center text-default-400 dark:text-default-500"
          aria-label={PRODUCT.name}
        >
          {PRODUCT.displayName}
        </Title>
      </div>
    </div>
  )
}
