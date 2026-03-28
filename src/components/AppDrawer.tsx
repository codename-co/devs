import { Button, Kbd, Link, ListBox, ScrollShadow, Tooltip, Popover } from '@/components/heroui-compat'

import { languages, type LanguageCode, useI18n, useUrl } from '@/i18n'
import { userSettings } from '@/stores/userStore'

import { Icon } from './Icon'
import { Title } from './Title'
// import { ProgressIndicator } from './ProgressIndicator'
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
import { useRecentActivity } from '@/hooks/useRecentActivity'

const RecentActivity = ({ lang }: { lang: LanguageCode }) => {
  const { t } = useI18n()
  const items = useRecentActivity(lang)
  const location = useLocation()

  if (items.length === 0) return null

  return (
    <ListBox aria-label={t('Recent activity')} variant="flat">
      <ListBox.Section
        title={t('Recent activity')}
        classNames={{ heading: 'ms-[4px]' }}
      >
        {items.map((item) => {
          // Check if this item's href matches the current path
          const isActive =
            location.pathname === item.href ||
            location.pathname.startsWith(item.href + '/')

          return (
            <ListBox.Item
              id={item.id}
              href={item.href}
              variant="faded"
              textValue={item.name}
              classNames={{ title: 'truncate' }}
              className={cn(
                '[.is-active]:bg-default-100',
                isActive && 'is-active',
              )}
            >
              <span className="text-small">{item.name}</span>
            </ListBox.Item>
          )
        })}
      </ListBox.Section>
    </ListBox>
  )
}

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
        isMobile && 'pointer-events-none',
      )}
    >
      <div
        id="app-drawer"
        data-testid="app-drawer"
        className={clsx('h-full ', isMobile ? 'pointer-events-none' : '')}
        data-state={isCollapsed ? 'collapsed' : 'expanded'}
      >
        <CollapsedDrawer
          className="drawer-collapsed"
          onOpenSearch={openSearch}
          onOpenSettings={openSettings}
          installedApps={installedApps}
          lang={lang}
        />
        <ExpandedDrawer
          className="drawer-expanded"
          onOpenSearch={openSearch}
          onOpenSettings={openSettings}
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
  onOpenSettings,
  installedApps,
  lang,
}: {
  className?: string
  onOpenSearch: () => void
  onOpenSettings: () => void
  installedApps: InstalledExtension[]
  lang: LanguageCode
}) => {
  const { t } = useI18n()
  const url = useUrl(lang)

  return (
    <div
      className={`group w-18 p-4 lg:p-4 !pt-6 h-full z-50 fixed flex flex-col transition-all duration-200 border-e border-transparent pointer-events-none ${className}`}
    >
      <div className="flex flex-col items-center overflow-y-auto overflow-x-hidden no-scrollbar -mt-4 md:mt-0 pointer-events-auto">
        <Tooltip content={t('Expand sidebar')} placement="right">
          <Button
            data-testid="menu-button"
            isIconOnly
            variant="ghost"
            onPress={() => userSettings.getState().toggleDrawer()}
            className="mb-4 backdrop-blur-xs"
            aria-label={t('Expand sidebar')}
          >
            <Icon name="SidebarExpand" className="opacity-40 dark:opacity-60" />
          </Button>
        </Tooltip>

        <div>
          {/* Collapsed Navigation Icons */}
          <nav className="hidden md:flex flex-col w-full">
            <Tooltip content={t('New Task')} placement="right">
              <Button
                as={Link}
                href={url('')}
                isIconOnly
                color="primary"
                variant="ghost"
                className="w-full dark:text-white"
                aria-label={t('New Task')}
              >
                <Icon name="PlusCircle" />
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
                variant="ghost"
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
                variant="ghost"
                className={cn(
                  'w-full text-primary-600 [.is-active]:bg-default-100',
                  isCurrentPath('/knowledge') && 'is-active',
                )}
                aria-label={t('Knowledge')}
              >
                <Icon name="Book" />
              </Button>
            </Tooltip> */}
            {/* <Tooltip content={t('Agents')} placement="right">
              <Button
                as={Link}
                href={url('/agents')}
                isIconOnly
                color="warning"
                variant="ghost"
                className={cn(
                  'w-full [.is-active]:bg-default-100',
                  isCurrentPath('/agents') && 'is-active',
                )}
                aria-label={t('Agents')}
              >
                <Icon name="Sparks" />
              </Button>
            </Tooltip> */}
            <Tooltip content={t('History')} placement="right">
              <Button
                as={Link}
                href={url('/history')}
                isIconOnly
                variant="ghost"
                className={cn(
                  'w-full text-gray-500 dark:text-gray-400 [.is-active]:bg-default-100',
                  isCurrentPath('/history') && 'is-active',
                )}
                aria-label={t('History')}
              >
                <Icon name="ClockRotateRight" />
              </Button>
            </Tooltip>
            {/* <Tooltip content={t('Studio')} placement="right">
              <Button
                as={Link}
                href={url('/studio')}
                isIconOnly
                variant="ghost"
                className={cn(
                  'w-full text-pink-500 dark:text-pink-400 [.is-active]:bg-default-100',
                  isCurrentPath('/studio') && 'is-active',
                )}
                aria-label={t('Studio')}
              >
                <Icon name="MediaImagePlus" />
              </Button>
            </Tooltip> */}
            {/* <Tooltip content={t('Live')} placement="right">
              <Button
                as={Link}
                href={url('/live')}
                isIconOnly
                variant="ghost"
                className={cn(
                  'w-full text-cyan-500 dark:text-cyan-400 [.is-active]:bg-default-100',
                  isCurrentPath('/live') && 'is-active',
                )}
                aria-label={t('Live')}
              >
                <Icon name="Voice" />
              </Button>
            </Tooltip> */}
            {/* <Tooltip content={t('Methodologies')} placement="right">
              <Button
                as={Link}
                href={url('/methodologies')}
                isIconOnly
                color="success"
                variant="ghost"
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
                variant="ghost"
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
                  variant="ghost"
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
                      variant="ghost"
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
                variant="ghost"
                className="w-full"
                aria-label={t('Marketplace')}
              >
                <Icon name="HexagonPlus" />
              </Button>
            </Tooltip>
          </nav>
        </div>
      </div>

      <div className="mt-auto pt-4 hidden lg:flex flex-col items-center gap-2 pointer-events-auto">
        {/* Progress indicator at bottom */}
        {/* <ProgressIndicator /> */}
        <Tooltip
          content={
            <span className="flex items-center gap-2">
              {t('Settings')}
              <Kbd keys={['command']}>,</Kbd>
            </span>
          }
          placement="right"
        >
          <Button
            isIconOnly
            variant="ghost"
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
  installedApps,
  lang,
}: {
  className?: string
  onOpenSearch: () => void
  onOpenSettings: () => void
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
      className={`bg-[var(--devs-bg)] dark:bg-default-50 fixed w-64 py-3 !pt-5 px-2 h-full flex flex-col pointer-events-auto ${className}`}
    >
      <ScrollShadow
        hideScrollBar
        className="flex flex-col overflow-y-auto flex-1 p-0.5"
      >
        <div className="mb-3.5 flex items-center p-0.5 justify-between">
          <Link href={url('')}>
            <Icon
              name="Devs"
              size="lg"
              className="text-default-400 dark:text-white mt-1 ms-2.5 me-1.5"
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
            variant="ghost"
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
          <ListBox aria-label={t('Main navigation')} variant="flat">
            <ListBox.Section>
              {[
                <ListBox.Item
                  id="new-task"
                  href={url('')}
                  variant="faded"
                  color="primary"
                  className="dark:text-gray-200 dark:hover:text-primary-500 [.is-active]:bg-primary-50"
                  textValue={t('New Task')}
                >
                  {t('New Task')}
                </ListBox.Item>,
                // Search Button
                <ListBox.Item
                  id="search"
                  variant="faded"
                  className="dark:text-gray-200 dark:hover:text-primary-500 [.is-active]:bg-primary-50"
                  onPress={onOpenSearch}
                >
                  {t('Search')}
                </ListBox.Item>,
                // <ListBox.Item
                //   id="agents"
                //   href={url('/agents')}
                //   variant="faded"
                //   color="warning"
                //   className={cn(
                //     'dark:text-gray-200 dark:hover:text-warning-500 [.is-active]:bg-default-100',
                //     isCurrentPath('/agents') && 'is-active',
                //   )}
                //
                //   textValue={t('Agents')}
                // >
                //   {t('Agents')}
                // </ListBox.Item>,
                <ListBox.Item
                  id="history"
                  href={url('/history')}
                  variant="faded"
                  className={cn(
                    '[.is-active]:bg-default-100',
                    isCurrentPath('/history') && 'is-active',
                  )}
                >
                  {t('History')}
                </ListBox.Item>,
                // <ListBox.Item
                //   id="studio"
                //   href={url('/studio')}
                //   variant="faded"
                //   className={cn(
                //     '[.is-active]:bg-default-100',
                //     isCurrentPath('/studio') && 'is-active',
                //   )}
                //
                // >
                //   {t('Studio')}
                // </ListBox.Item>,
                // <ListBox.Item
                //   id="live"
                //   href={url('/live')}
                //   variant="faded"
                //   className={cn(
                //     '[.is-active]:bg-default-100',
                //     isCurrentPath('/live') && 'is-active',
                //   )}
                //
                // >
                //   {t('Live')}
                // </ListBox.Item>,
                // Installed Marketplace Apps
                ...installedApps.map((installedApp) => {
                  const ext = installedApp.extension
                  const extPath = getAppPrimaryPageUrl(ext.id)
                  const localizedName =
                    ext.i18n?.[lang as keyof typeof ext.i18n]?.name || ext.name
                  const iconColorClass = getExtensionColorClass(ext.color)
                  return (
                    <ListBox.Item
                      id={ext.id}
                      href={url(extPath)}
                      variant="faded"
                      className={cn(
                        'dark:text-gray-200 [.is-active]:bg-default-100',
                        isCurrentPath(extPath) && 'is-active',
                      )}
                    >
                      {localizedName}
                    </ListBox.Item>
                  )
                }),
                <ListBox.Item
                  id="marketplace"
                  href={url('/marketplace')}
                  variant="faded"
                  color="warning"
                  className={cn(
                    'dark:text-gray-200 dark:hover:text-yellow-500 [.is-active]:bg-default-100',
                    isCurrentPath('/marketplace') && 'is-active',
                  )}
                >
                  {t('Marketplace')}
                </ListBox.Item>,
              ]}
            </ListBox.Section>
          </ListBox>

          <RecentActivity lang={lang} />
        </nav>

        {/* Upgrade Action - Desktop */}
        {/* <Button
          href={url('/upgrade')}
          color="warning"
          variant="secondary"
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
          <Popover.Trigger>
            <span className="absolute bottom-16 end-4 w-0 h-0" />
          </Popover.Trigger>
          <Popover.Content className="p-1">
            <ListBox
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
                  <ListBox.Item
                    id={code}
                    textValue={name}
                    className={lang === code ? 'bg-primary-50' : ''}
                  >
                    {name}
                  </ListBox.Item>
                ),
              )}
            </ListBox>
          </Popover.Content>
        </Popover>

        {/* Quick Actions Bar */}
        <div className="flex items-center justify-end gap-1 px-1">
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
              variant="ghost"
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
              variant="ghost"
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
