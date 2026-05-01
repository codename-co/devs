import { memo, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Icon, Title } from '@/components'
import { useI18n, useUrl } from '@/i18n'
import {
  ALL_SPACES_ID,
  ALL_SPACES_URL_SEGMENT,
  DEFAULT_SPACE_ID,
} from '@/types'
import { userSettings } from '@/stores/userStore'
import {
  useSpaces,
  useActiveSpaceId,
  setActiveSpaceId,
  createSpace,
  entityBelongsToSpace,
} from '@/stores/spaceStore'
import { useMarketplaceStore } from '@/features/marketplace'
import { getAppPrimaryPageUrl } from '@/features/marketplace/store'
import { getExtensionColorClass } from '@/features/marketplace/utils'
import {
  Button,
  Kbd,
  Link,
  ListBox,
  ScrollShadow,
  Select,
  Separator,
  Tooltip,
} from '@heroui/react_3'
import type { ThreadFilter } from '../types'
import { PRODUCT } from '@/config/product'
import { uuidToBase64url } from '@/lib/url'
import { NotificationButtonV3 } from '@/features/notifications'

// --- Shared hooks ---

const KNOWN_LANGS = ['en', 'fr', 'de', 'es', 'ar', 'ko']

/**
 * Derive which sidebar item is "active" from the current URL pathname.
 * Returns one of: 'home' | 'inbox' | 'agents' | 'marketplace' | extensionId | null
 */
function useActiveNavItem(installedApps: ReturnType<typeof useInstalledApps>) {
  const { pathname } = useLocation()

  return useMemo(() => {
    const segments = pathname.split('/').filter(Boolean)
    // Strip lang prefix
    if (segments.length > 0 && KNOWN_LANGS.includes(segments[0]))
      segments.shift()
    // Strip spaces/:id prefix
    if (segments.length >= 2 && segments[0] === 'spaces') segments.splice(0, 2)

    const first = segments[0] ?? 'home'

    // Core filters
    if (first === 'inbox') return 'inbox'
    if (first === 'agents') return 'agents'
    if (first === 'marketplace') return 'marketplace'
    if (!first || first === 'home') return 'home'

    // Check installed app page keys
    for (const app of installedApps) {
      const ext = app.extension
      if (ext.pages) {
        for (const pageKey of Object.keys(ext.pages)) {
          if (first === pageKey) return ext.id
        }
      }
    }

    return null
  }, [pathname, installedApps])
}

function useInstalledApps() {
  const installed = useMarketplaceStore((state) => state.installed)
  const activeSpaceId = useActiveSpaceId()
  return useMemo(
    () =>
      Array.from(installed.values()).filter(
        (ext) =>
          ext.enabled &&
          ext.extension.type === 'app' &&
          entityBelongsToSpace(ext.spaceId, activeSpaceId),
      ),
    [installed, activeSpaceId],
  )
}

function useThemeToggle() {
  const isDarkTheme = userSettings((state) => state.isDarkTheme())
  const setTheme = userSettings((state) => state.setTheme)
  const toggle = () => setTheme(isDarkTheme ? 'light' : 'dark')
  return { isDarkTheme, toggle }
}

// --- Shared subcomponents ---

function BrandHeader({ trailing }: { trailing: React.ReactNode }) {
  const { lang } = useI18n()
  const url = useUrl(lang)
  const customPlatformName = userSettings((state) => state.platformName)

  return (
    <>
      <Link href={url('')} className="flex-1">
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
      <span className="ml-auto">{trailing}</span>
    </>
  )
}

// --- Space switcher ---

function useSpaceNavigate() {
  const navigate = useNavigate()
  const location = useLocation()

  return (spaceId: string) => {
    setActiveSpaceId(spaceId)

    const { pathname, search, hash } = location
    const stripped = pathname.replace(/\/spaces\/[A-Za-z0-9_-]+/, '')
    if (!spaceId || spaceId === DEFAULT_SPACE_ID) {
      navigate(stripped + search + hash)
      return
    }

    const segment =
      spaceId === ALL_SPACES_ID
        ? ALL_SPACES_URL_SEGMENT
        : uuidToBase64url(spaceId)

    const langMatch = stripped.match(/^\/([a-z]{2})(\/|$)/)
    const prefix = langMatch
      ? `/${langMatch[1]}/spaces/${segment}`
      : `/spaces/${segment}`
    const rest = langMatch
      ? stripped.slice(langMatch[0].length - (langMatch[2] ? 1 : 0))
      : stripped
    navigate(prefix + rest + search + hash)
  }
}

function SpaceSwitcher({ isCollapsed }: { isCollapsed?: boolean }) {
  const { t } = useI18n()
  const allSpaces = useSpaces()
  const activeId = useActiveSpaceId()
  const [isCreating, setIsCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const navigateToSpace = useSpaceNavigate()

  useEffect(() => {
    if (isCreating) {
      const id = requestAnimationFrame(() => {
        inputRef.current?.focus()
        inputRef.current?.select()
      })
      return () => cancelAnimationFrame(id)
    }
  }, [isCreating])

  const activeSpace = allSpaces.find((w) => w.id === activeId) ?? allSpaces[0]

  const handleCreate = () => {
    const trimmed = newName.trim()
    if (!trimmed) {
      setIsCreating(false)
      return
    }
    const ws = createSpace(trimmed)
    navigateToSpace(ws.id)
    setNewName('')
    setIsCreating(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleCreate()
    } else if (e.key === 'Escape') {
      setIsCreating(false)
      setNewName('')
    }
  }

  const handleSelectionChange = (key: React.Key | null) => {
    if (key === '__new__') {
      setIsCreating(true)
    } else if (key) {
      navigateToSpace(key as string)
    }
  }

  if (isCreating) {
    return (
      <div className="px-0.5">
        <input
          ref={inputRef}
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleCreate}
          placeholder={t('Space name')}
          className="bg-default/40 text-foreground placeholder:text-muted w-full rounded-lg px-2.5 py-1.5 text-sm outline-none"
          autoFocus
          maxLength={60}
        />
      </div>
    )
  }

  const collapsedIcon = activeId === ALL_SPACES_ID ? 'Cubes' : (activeSpace?.icon ?? 'Cube')
  const spaceOptions = (
    <Select.Popover>
      <ListBox>
        <ListBox.Item isDisabled>
          {t('Select a space')}
          <ListBox.ItemIndicator />
        </ListBox.Item>
        {allSpaces.map((ws) => (
          <ListBox.Item key={ws.id} id={ws.id} textValue={ws.name}>
            <Icon
              name={ws.id === ALL_SPACES_ID ? 'Cubes' : (ws.icon ?? 'Cube')}
              className="text-muted"
              size="sm"
            />
            {ws.id === ALL_SPACES_ID ? t('All spaces') : ws.name}
            {ws.id === activeId && (
              <ListBox.ItemIndicator className="ms-auto">
                <Icon name="Check" className="text-primary" size="sm" />
              </ListBox.ItemIndicator>
            )}
          </ListBox.Item>
        ))}
        <Separator />
        <ListBox.Item id="__new__" textValue={t('New Space')}>
          <Icon name="Plus" className="text-primary" size="sm" />
          <span className="text-primary">{t('New Space')}</span>
        </ListBox.Item>
      </ListBox>
    </Select.Popover>
  )

  if (isCollapsed) {
    return (
      <Select
        aria-label={t('Space')}
        selectedKey={activeId}
        onSelectionChange={handleSelectionChange}
      >
        <Tooltip delay={0}>
          <Select.Trigger
            className="hover:bg-default/40 inline-flex h-8 w-8 items-center justify-center rounded-lg outline-none"
            aria-label={activeSpace?.name ?? 'Space'}
          >
            <Icon name={collapsedIcon} className="text-muted" size="sm" />
          </Select.Trigger>
          <Tooltip.Content placement="right">
            {activeSpace?.name ?? 'Space'}
          </Tooltip.Content>
        </Tooltip>
        {spaceOptions}
      </Select>
    )
  }

  return (
    <div className="px-0.5">
      <Select
        aria-label={t('Space')}
        selectedKey={activeId}
        onSelectionChange={handleSelectionChange}
        fullWidth
      >
        <Select.Trigger>
          <Select.Value className="flex items-center gap-2" />
          <Select.Indicator>
            <Icon
              name="ArrowSeparateVertical"
              className="text-muted"
              size="sm"
            />
          </Select.Indicator>
        </Select.Trigger>
        {spaceOptions}
      </Select>
    </div>
  )
}

// --- Subcomponents ---

function ThemeToggleButton({ showKbd }: { showKbd?: boolean }) {
  const { t } = useI18n()
  const { isDarkTheme, toggle } = useThemeToggle()
  const label = isDarkTheme ? t('Light') : t('Dark')

  return (
    <Tooltip delay={0}>
      <Button
        isIconOnly
        variant="ghost"
        size="sm"
        onPress={toggle}
        aria-label={label}
      >
        <Icon
          name={isDarkTheme ? 'SunLight' : 'HalfMoon'}
          className="text-muted"
          size="sm"
        />
      </Button>
      <Tooltip.Content
        className={showKbd ? 'flex items-center gap-2' : ''}
        placement={showKbd ? undefined : 'right'}
      >
        {label}
        {showKbd && <Kbd>⇧⌘L</Kbd>}
      </Tooltip.Content>
    </Tooltip>
  )
}

function SettingsButton({
  onPress,
  showKbd,
}: {
  onPress: () => void
  showKbd?: boolean
}) {
  const { t } = useI18n()

  return (
    <Tooltip delay={0}>
      <Button
        isIconOnly
        variant="ghost"
        size="sm"
        onPress={onPress}
        aria-label={t('Settings')}
      >
        <Icon name="Settings" className="text-muted" size="sm" />
      </Button>
      <Tooltip.Content
        className={showKbd ? 'flex items-center gap-2' : ''}
        placement={showKbd ? undefined : 'right'}
      >
        {t('Settings')}
        {showKbd && <Kbd>⌘,</Kbd>}
      </Tooltip.Content>
    </Tooltip>
  )
}

function AboutButton({ showKbd }: { showKbd?: boolean }) {
  const { lang, t } = useI18n()
  const navigate = useNavigate()
  const url = useUrl(lang)

  return (
    <Tooltip delay={0}>
      <Button
        isIconOnly
        variant="ghost"
        size="sm"
        onPress={() => navigate(url('/about'))}
        aria-label={t('About')}
      >
        <Icon name="InfoCircle" className="text-muted" size="sm" />
      </Button>
      <Tooltip.Content
        className={showKbd ? 'flex items-center gap-2' : ''}
        placement={showKbd ? undefined : 'right'}
      >
        {t('About')}
      </Tooltip.Content>
    </Tooltip>
  )
}

// --- Main Sidebar ---

export const Sidebar = memo(function Sidebar({
  activeFilter,
  onFilterChange,
  onOpenSettings,
  className,
  isCollapsed: isCollapsedProp,
}: {
  activeFilter: ThreadFilter
  onFilterChange: (filter: ThreadFilter) => void
  onOpenSettings: () => void
  className?: string
  /** Override the store-based collapsed state. Useful for controlled contexts like tours. */
  isCollapsed?: boolean
}) {
  const { lang, t } = useI18n()
  const navigate = useNavigate()
  const url = useUrl(lang)
  const { toggle: toggleTheme } = useThemeToggle()
  const isCollapsedFromStore = userSettings(
    (state) => state.isV2SidebarCollapsed,
  )
  const isCollapsed =
    isCollapsedProp !== undefined ? isCollapsedProp : isCollapsedFromStore
  const installedApps = useInstalledApps()
  const activeNavItem = useActiveNavItem(installedApps)

  const [isMobileOpen, setIsMobileOpen] = useState(false)

  // Register Cmd/Ctrl + Shift + L shortcut for theme toggle
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.metaKey || e.ctrlKey) &&
        e.shiftKey &&
        e.key.toLowerCase() === 'l'
      ) {
        e.preventDefault()
        toggleTheme()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [toggleTheme])

  // Close mobile overlay on navigation
  useEffect(() => {
    setIsMobileOpen(false)
  }, [activeFilter])

  const toggleCollapse = () => userSettings.getState().toggleV2Sidebar()

  const handleFilterChange = (filter: ThreadFilter) => {
    onFilterChange(filter)
    setIsMobileOpen(false)
  }

  const isThreadsActive = activeNavItem === 'inbox'

  const sidebarContent = (
    <aside
      className={`border-separator h-full min-h-0 flex-col gap-3 overflow-clip border-r py-3 transition-[width,padding] duration-150 ease-in-out ${
        isCollapsed ? 'w-14 items-center px-1.5' : 'w-full px-3'
      } ${className ?? 'flex'}`}
    >
      {/* Brand + collapse toggle */}
      <div
        className={`flex items-center ${isCollapsed ? 'justify-center py-1' : 'gap-3 px-1 py-1'}`}
      >
        {isCollapsed ? (
          <Tooltip delay={0}>
            <Button
              isIconOnly
              variant="ghost"
              size="sm"
              onPress={toggleCollapse}
              aria-label={t('Expand sidebar')}
            >
              <Icon
                name="SidebarExpand"
                className="text-default-400 dark:text-white"
              />
            </Button>
            <Tooltip.Content placement="right">
              {t('Expand sidebar')}
            </Tooltip.Content>
          </Tooltip>
        ) : (
          <BrandHeader
            trailing={
              <Tooltip delay={0}>
                <Button
                  isIconOnly
                  variant="ghost"
                  size="sm"
                  onPress={toggleCollapse}
                  aria-label={t('Collapse sidebar')}
                >
                  <Icon
                    name="SidebarCollapse"
                    className="text-default-400 dark:text-white"
                  />
                </Button>
                <Tooltip.Content placement="right">
                  {t('Collapse sidebar')}
                </Tooltip.Content>
              </Tooltip>
            }
          />
        )}
      </div>

      {/* New Task CTA — collapsed mode only; expanded mode has it inline on the Threads row */}
      {isCollapsed && (
        <Tooltip delay={0}>
          <Button
            isIconOnly
            variant="primary"
            size="sm"
            onClick={() => onFilterChange('home')}
            aria-label={t('New Task')}
          >
            <Icon name="Plus" />
          </Button>
          <Tooltip.Content placement="right">
            {t('New Task')}
          </Tooltip.Content>
        </Tooltip>
      )}

      {/* Space switcher */}
      <SpaceSwitcher isCollapsed={isCollapsed} />

      {/* Navigation */}
      <ScrollShadow hideScrollBar className="min-h-0 flex-1 overflow-y-auto">
        {isCollapsed ? (
          <div className="flex flex-col items-center gap-1">
            {/* Threads (all) */}
            <Tooltip delay={0}>
              <Button
                isIconOnly
                variant={isThreadsActive ? 'secondary' : 'ghost'}
                size="sm"
                onPress={() => handleFilterChange('inbox')}
                aria-label={t('Threads')}
              >
                <Icon name="MultiBubble" className="text-primary" />
              </Button>
              <Tooltip.Content placement="right">{t('Threads')}</Tooltip.Content>
            </Tooltip>

            {/* Agents */}
            <Tooltip delay={0}>
              <Button
                isIconOnly
                variant={activeNavItem === 'agents' ? 'secondary' : 'ghost'}
                size="sm"
                onPress={() => handleFilterChange('agents')}
                aria-label={t('Agents')}
              >
                <Icon name="Group" />
              </Button>
              <Tooltip.Content placement="right">{t('Agents')}</Tooltip.Content>
            </Tooltip>

            <Separator className="my-1 w-8" />

            {/* Installed apps */}
            {installedApps.map((installedApp) => {
              const ext = installedApp.extension
              const extPath = getAppPrimaryPageUrl(ext.id)
              const localizedName =
                ext.i18n?.[lang as keyof typeof ext.i18n]?.name || ext.name
              const iconColorClass = getExtensionColorClass(ext.color)
              const isActive = activeNavItem === ext.id
              return (
                <Tooltip key={ext.id} delay={0}>
                  <Button
                    isIconOnly
                    variant={isActive ? 'secondary' : 'ghost'}
                    size="sm"
                    onPress={() => navigate(url(extPath))}
                    aria-label={localizedName}
                  >
                    <Icon
                      name={ext.icon || 'Puzzle'}
                      className={iconColorClass}
                    />
                  </Button>
                  <Tooltip.Content placement="right">
                    {localizedName}
                  </Tooltip.Content>
                </Tooltip>
              )
            })}
            <Tooltip delay={0}>
              <Button
                isIconOnly
                variant={
                  activeNavItem === 'marketplace' ? 'secondary' : 'ghost'
                }
                size="sm"
                onPress={() => navigate(url('/marketplace'))}
                aria-label={t('Marketplace')}
              >
                <Icon name="HexagonPlus" className="text-warning" />
              </Button>
              <Tooltip.Content placement="right">
                {t('Marketplace')}
              </Tooltip.Content>
            </Tooltip>
          </div>
        ) : (
          <ExpandedNav onFilterChange={handleFilterChange} />
        )}
      </ScrollShadow>

      {/* Bottom utility row */}
      <div
        className={`flex ${isCollapsed ? 'flex-col items-center gap-1' : 'items-center gap-1 px-1'}`}
      >
        <NotificationButtonV3 showKbd={!isCollapsed} />
        <ThemeToggleButton showKbd={!isCollapsed} />
        <AboutButton showKbd={!isCollapsed} />
        <SettingsButton onPress={onOpenSettings} showKbd={!isCollapsed} />
      </div>
    </aside>
  )

  // Close mobile drawer on Escape key
  useEffect(() => {
    if (!isMobileOpen) return
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMobileOpen(false)
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [isMobileOpen])

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden lg:flex h-full">{sidebarContent}</div>

      {/* Mobile burger trigger */}
      <div className="fixed top-3 left-3 z-50 lg:hidden">
        <Button
          isIconOnly
          variant="secondary"
          size="sm"
          onPress={() => setIsMobileOpen(true)}
          aria-label={t('Open menu')}
        >
          <Icon name="Menu" />
        </Button>
      </div>

      {/* Mobile overlay */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden" role="dialog" aria-modal="true">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsMobileOpen(false)}
            aria-hidden="true"
          />
          <div className="bg-background relative z-10 h-full w-72 shadow-2xl">
            <MobileDrawerContent
              onFilterChange={handleFilterChange}
              onOpenSettings={() => {
                setIsMobileOpen(false)
                onOpenSettings()
              }}
              onClose={() => setIsMobileOpen(false)}
            />
          </div>
        </div>
      )}
    </>
  )
})

// --- Expanded navigation (non-collapsed) ---

function ExpandedNav({
  onFilterChange,
}: {
  onFilterChange: (filter: ThreadFilter) => void
}) {
  const { lang, t } = useI18n()
  const url = useUrl(lang)
  const installedApps = useInstalledApps()
  const activeNavItem = useActiveNavItem(installedApps)

  const listItemClass =
    'group flex min-h-9 items-center gap-3 px-3 py-1.5 data-[selected=true]:bg-default'

  // Determine which primary nav key is selected
  const primarySelectedKeys = useMemo(() => {
    if (activeNavItem === 'inbox') return ['inbox']
    if (activeNavItem === 'agents') return ['agents']
    return [] // No primary nav item selected (app or marketplace is active)
  }, [activeNavItem])

  // Determine which app/marketplace key is selected
  const appsSelectedKeys = useMemo(() => {
    if (activeNavItem === 'marketplace') return ['__marketplace__']
    if (
      activeNavItem &&
      installedApps.some((a) => a.extension.id === activeNavItem)
    ) {
      return [activeNavItem]
    }
    return []
  }, [activeNavItem, installedApps])

  return (
    <div className="flex flex-col gap-3">
      {/* Primary: Threads */}
      <ListBox
        aria-label="Main navigation"
        selectionMode="single"
        selectedKeys={primarySelectedKeys}
        onSelectionChange={(keys) => {
          const selected = [...keys][0] as string | undefined
          if (selected === 'inbox') onFilterChange('inbox')
          else if (selected === 'agents') onFilterChange('agents')
        }}
      >
        <ListBox.Item
          key="inbox"
          id="inbox"
          textValue={t('Threads')}
          className={listItemClass}
        >
          <Icon name="MultiBubble" className="text-primary" />
          <span className="flex-1 text-left text-sm font-medium">{t('Threads')}</span>
          <button
            className="text-primary hover:bg-default-200 ml-auto rounded-md p-0.5 transition-colors"
            aria-label={t('New Task')}
            tabIndex={-1}
            onClick={(e) => {
              e.stopPropagation()
              onFilterChange('home')
            }}
            onPointerDown={(e) => e.stopPropagation()}
            onPointerUp={(e) => e.stopPropagation()}
          >
            <Icon name="Plus" size="sm" className="stroke-2" />
          </button>
        </ListBox.Item>
        <ListBox.Item
          key="agents"
          id="agents"
          textValue={t('Agents')}
          className={listItemClass}
        >
          <Icon name="Group" />
          <span className="flex-1 text-left text-sm font-medium">
            {t('Agents')}
          </span>
        </ListBox.Item>
      </ListBox>

      {installedApps.length > 0 && (
        <>
          <Separator />
          <ListBox
            aria-label="Installed apps"
            selectionMode="single"
            selectedKeys={appsSelectedKeys}
          >
            {installedApps.map((installedApp) => {
              const ext = installedApp.extension
              const extPath = getAppPrimaryPageUrl(ext.id)
              const localizedName =
                ext.i18n?.[lang as keyof typeof ext.i18n]?.name || ext.name
              const iconColorClass = getExtensionColorClass(ext.color)
              return (
                <ListBox.Item
                  key={ext.id}
                  id={ext.id}
                  href={url(extPath)}
                  textValue={localizedName}
                  className={listItemClass}
                >
                  <Icon
                    name={ext.icon || 'Puzzle'}
                    className={iconColorClass}
                  />
                  <span className="flex-1 text-left text-sm font-medium">
                    {localizedName}
                  </span>
                </ListBox.Item>
              )
            })}
            <ListBox.Item
              key="__marketplace__"
              id="__marketplace__"
              href={url('/marketplace')}
              className={listItemClass}
            >
              <Icon name="HexagonPlus" className="text-warning" />
              <span className="flex-1 text-left text-sm font-medium">
                {t('Marketplace')}
              </span>
            </ListBox.Item>
          </ListBox>
        </>
      )}
      {installedApps.length === 0 && (
        <>
          <Separator />
          <ListBox
            aria-label="Marketplace"
            selectionMode="single"
            selectedKeys={appsSelectedKeys}
          >
            <ListBox.Item
              key="__marketplace__"
              id="__marketplace__"
              href={url('/marketplace')}
              className={listItemClass}
            >
              <Icon name="HexagonPlus" className="text-warning" />
              <span className="flex-1 text-left text-sm font-medium">
                {t('Marketplace')}
              </span>
            </ListBox.Item>
          </ListBox>
        </>
      )}
    </div>
  )
}

// --- Mobile drawer (always expanded) ---

function MobileDrawerContent({
  onFilterChange,
  onOpenSettings,
  onClose,
}: {
  onFilterChange: (filter: ThreadFilter) => void
  onOpenSettings: () => void
  onClose: () => void
}) {
  const { t } = useI18n()

  return (
    <aside className="border-separator flex h-full min-h-0 flex-col gap-3 overflow-clip px-3 pb-6 pt-4">
      <div className="flex items-center gap-3 px-1 py-1">
        <BrandHeader
          trailing={
            <Button
              isIconOnly
              variant="ghost"
              size="sm"
              onPress={onClose}
              aria-label={t('Close menu')}
            >
              <Icon name="Xmark" />
            </Button>
          }
        />
      </div>

      {/* Space switcher */}
      <SpaceSwitcher />

      <ScrollShadow hideScrollBar className="min-h-0 flex-1 overflow-y-auto">
        <ExpandedNav onFilterChange={onFilterChange} />
      </ScrollShadow>

      {/* Bottom utility row */}
      <div className="flex items-center gap-1 px-1">
        <NotificationButtonV3 />
        <ThemeToggleButton />
        <AboutButton />
        <SettingsButton onPress={onOpenSettings} />
      </div>
    </aside>
  )
}
