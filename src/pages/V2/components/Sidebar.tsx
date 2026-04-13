import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Icon, Title } from '@/components'
import { useI18n, useUrl } from '@/i18n'
import { formatNumber } from '@/lib/number'
import { uuidToBase64url } from '@/lib/url'
import { DEFAULT_SPACE_ID } from '@/types'
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
  Chip,
  Kbd,
  Link,
  ListBox,
  ScrollShadow,
  Select,
  Separator,
  Tooltip,
} from '@heroui/react_3'
import type { NavItem } from '../types'
import { PRODUCT } from '@/config/product'

function getInnerV2PathSegment(pathname: string): string {
  const segments = pathname.split('/').filter(Boolean)
  const v2Idx = segments.indexOf('v2')
  if (v2Idx === -1) return 'home'
  return segments[v2Idx + 1] || 'home'
}

// --- Shared hooks ---

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
      <Link href={url('/v2')} className="flex-1">
        {/* <Icon
          name="Devs"
          size="lg"
          className="text-default-400 dark:text-white mt-1 ms-2.5 me-1.5"
        /> */}
        <Title
          level={3}
          as="span"
          size="lg"
          data-testid="platform-name"
          aria-label={customPlatformName || PRODUCT.name}
        >
          {/* devs */}
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
    // Strip any existing /spaces/<encoded> segment
    const stripped = pathname.replace(/\/spaces\/[A-Za-z0-9_-]+/, '')
    if (!spaceId || spaceId === DEFAULT_SPACE_ID) {
      navigate(stripped + search + hash)
    } else {
      // Insert /spaces/<encoded> right after the optional /:lang prefix
      const langMatch = stripped.match(/^\/([a-z]{2})(\/|$)/)
      const prefix = langMatch
        ? `/${langMatch[1]}/spaces/${uuidToBase64url(spaceId)}`
        : `/spaces/${uuidToBase64url(spaceId)}`
      const rest = langMatch
        ? stripped.slice(langMatch[0].length - (langMatch[2] ? 1 : 0))
        : stripped
      navigate(prefix + rest + search + hash)
    }
  }
}

function SpaceSwitcher({ isCollapsed }: { isCollapsed?: boolean }) {
  const { t } = useI18n()
  const allSpaces = useSpaces()
  const activeId = useActiveSpaceId()
  const [isCreating, setIsCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const navigateToSpace = useSpaceNavigate()

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

  if (isCollapsed) {
    return (
      <Tooltip delay={0}>
        <Button
          isIconOnly
          variant="ghost"
          size="sm"
          aria-label={activeSpace?.name ?? 'Space'}
        >
          <Icon name="Cube" className="text-muted" size="sm" />
        </Button>
        <Tooltip.Content placement="right">
          {activeSpace?.name ?? 'Space'}
        </Tooltip.Content>
      </Tooltip>
    )
  }

  if (isCreating) {
    return (
      <div className="px-0.5">
        <input
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

  return (
    <div className="px-0.5">
      <Select
        aria-label={t('Space')}
        selectedKey={activeId}
        onSelectionChange={handleSelectionChange}
        fullWidth
      >
        <Select.Trigger>
          {/* <Icon name="Folder" className="text-muted shrink-0" size="sm" /> */}
          <Select.Value className="flex items-center gap-2" />
          <Select.Indicator>
            <Icon
              name="ArrowSeparateVertical"
              className="text-muted"
              size="sm"
            />
          </Select.Indicator>
        </Select.Trigger>
        <Select.Popover>
          <ListBox>
            <ListBox.Item isDisabled>
              Select a space
              <ListBox.ItemIndicator />
            </ListBox.Item>
            {allSpaces.map((ws) => (
              <ListBox.Item key={ws.id} id={ws.id} textValue={ws.name}>
                <Icon name="Cube" className="text-muted" size="sm" />
                {ws.name}
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
      </Select>
    </div>
  )
}

function ExpandedNavListBox({
  items,
  activeItemId,
  onSelectionChange,
}: {
  items: NavItem[]
  activeItemId: string
  onSelectionChange: (id: string) => void
}) {
  const { lang, t } = useI18n()
  const url = useUrl(lang)
  const installedApps = useInstalledApps()

  const listItemClass =
    'group flex min-h-9 items-center gap-3 px-3 py-1.5 data-[selected=true]:bg-default'

  return (
    <ListBox
      aria-label="Main navigation"
      selectionMode="single"
      selectedKeys={[activeItemId]}
      onSelectionChange={(keys) => {
        const selected = [...keys][0] as string | undefined
        if (selected) onSelectionChange(selected)
      }}
    >
      {items.map((item) => (
        <ListBox.Item
          key={item.id}
          id={item.id}
          textValue={item.label}
          className={listItemClass}
        >
          <Icon
            name={item.icon}
            className={item.color ? `text-${item.color}` : ''}
          />
          <span className="flex-1 text-left text-sm font-medium">
            {item.label}
          </span>
          {item.count != null && item.count > 0 && (
            <Chip color="accent" size="sm" variant="soft">
              {formatNumber(item.count, lang)}
            </Chip>
          )}
        </ListBox.Item>
      ))}
      <Separator />
      <ListBox.Section>
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
              <Icon name={ext.icon || 'Puzzle'} className={iconColorClass} />
              <span className="flex-1 text-left text-sm font-medium">
                {localizedName}
              </span>
            </ListBox.Item>
          )
        })}
        <ListBox.Item href={url('/marketplace')} className={listItemClass}>
          <Icon name="HexagonPlus" className="text-warning" />
          <span className="flex-1 text-left text-sm font-medium">
            {t('Marketplace')}
          </span>
        </ListBox.Item>
      </ListBox.Section>
    </ListBox>
  )
}

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

// --- Main Sidebar ---

export function Sidebar({
  items,
  activeItemId,
  onFilterChange,
  onOpenSettings,
  className,
}: {
  items: NavItem[]
  activeItemId?: string
  onFilterChange: (filter: string) => void
  onOpenSettings: () => void
  className?: string
}) {
  const location = useLocation()
  const { lang, t } = useI18n()
  const navigate = useNavigate()
  const url = useUrl(lang)
  const { toggle: toggleTheme } = useThemeToggle()
  const isCollapsed = userSettings((state) => state.isV2SidebarCollapsed)
  const derivedActive = activeItemId ?? getInnerV2PathSegment(location.pathname)
  const installedApps = useInstalledApps()

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
  }, [derivedActive])

  const toggleCollapse = () => userSettings.getState().toggleV2Sidebar()

  const handleFilterChange = (filter: string) => {
    onFilterChange(filter)
    setIsMobileOpen(false)
  }

  const sidebarContent = (
    <aside
      className={`border-separator h-full min-h-0 flex-col gap-6 overflow-clip border-r py-3 transition-[width,padding] duration-150 ease-in-out ${
        isCollapsed ? 'w-14 items-center px-1.5' : 'w-full px-4'
      } ${className ?? 'flex'}`}
    >
      {/* Brand + collapse toggle */}
      <div
        className={`flex items-center ${isCollapsed ? 'justify-center px-0 py-2' : 'gap-3 px-1 py-2'}`}
      >
        {isCollapsed ? (
          <Tooltip delay={0}>
            <Button
              isIconOnly
              variant="ghost"
              size="sm"
              onPress={toggleCollapse}
              aria-label="Expand sidebar"
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
                  aria-label="Collapse sidebar"
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

      {/* Space switcher */}
      <SpaceSwitcher isCollapsed={isCollapsed} />

      {/* Navigation */}
      <ScrollShadow hideScrollBar className="min-h-0 flex-1 overflow-y-auto">
        {isCollapsed ? (
          <div className="flex flex-col items-center gap-1">
            {items.map((item) => (
              <Tooltip key={item.id} delay={0}>
                <Button
                  isIconOnly
                  variant={derivedActive === item.id ? 'secondary' : 'ghost'}
                  size="sm"
                  onPress={() => handleFilterChange(item.id)}
                  aria-label={item.label}
                  className="relative"
                >
                  <Icon
                    name={item.icon}
                    className={item.color ? `text-${item.color}` : ''}
                  />
                  {item.count != null && item.count > 0 && (
                    <span className="bg-accent text-accent-foreground absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold">
                      {item.count > 99 ? '99+' : item.count}
                    </span>
                  )}
                </Button>
                <Tooltip.Content placement="right">
                  {item.label}
                  {item.count != null && item.count > 0
                    ? ` (${formatNumber(item.count, lang)})`
                    : ''}
                </Tooltip.Content>
              </Tooltip>
            ))}
            <Separator className="my-1 w-8" />
            {installedApps.map((installedApp) => {
              const ext = installedApp.extension
              const extPath = getAppPrimaryPageUrl(ext.id)
              const localizedName =
                ext.i18n?.[lang as keyof typeof ext.i18n]?.name || ext.name
              const iconColorClass = getExtensionColorClass(ext.color)
              return (
                <Tooltip key={ext.id} delay={0}>
                  <Button
                    isIconOnly
                    variant="ghost"
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
                variant="ghost"
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
          <ExpandedNavListBox
            items={items}
            activeItemId={derivedActive}
            onSelectionChange={handleFilterChange}
          />
        )}
      </ScrollShadow>

      {/* Bottom actions */}
      <div className="flex flex-col gap-2">
        {isCollapsed ? (
          <div className="flex flex-col items-center gap-1">
            <Tooltip delay={0}>
              <Button
                isIconOnly
                variant="primary"
                size="sm"
                onClick={() => onFilterChange('home')}
                aria-label={t('New Task')}
              >
                <Icon name="EditPencil" />
              </Button>
              <Tooltip.Content placement="right">
                {t('New Task')}
              </Tooltip.Content>
            </Tooltip>
            <ThemeToggleButton />
            <SettingsButton onPress={onOpenSettings} />
          </div>
        ) : (
          <>
            <Tooltip delay={0}>
              <Button
                fullWidth
                variant="primary"
                onClick={() => onFilterChange('home')}
              >
                <Icon name="EditPencil" />
                {t('New Task')}
              </Button>
              <Tooltip.Content>
                <p>{t('New Task')}</p>
              </Tooltip.Content>
            </Tooltip>
            <div className="flex items-center justify-end gap-1">
              <ThemeToggleButton showKbd />
              <SettingsButton onPress={onOpenSettings} showKbd />
            </div>
          </>
        )}
      </div>
    </aside>
  )

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
          aria-label="Open menu"
        >
          <Icon name="Menu" />
        </Button>
      </div>

      {/* Mobile overlay */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="absolute inset-0 bg-black/40 dark:bg-black/70"
            onClick={() => setIsMobileOpen(false)}
          />
          <div className="bg-background relative z-10 h-full w-64 shadow-xl">
            <MobileDrawerContent
              items={items}
              activeItemId={derivedActive}
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
}

// --- Mobile drawer (always expanded) ---

function MobileDrawerContent({
  items,
  activeItemId,
  onFilterChange,
  onOpenSettings,
  onClose,
}: {
  items: NavItem[]
  activeItemId: string
  onFilterChange: (filter: string) => void
  onOpenSettings: () => void
  onClose: () => void
}) {
  const { t } = useI18n()

  return (
    <aside className="border-separator flex h-full min-h-0 flex-col gap-6 overflow-clip px-4 pb-6 pt-4">
      <BrandHeader
        trailing={
          <Button
            isIconOnly
            variant="ghost"
            size="sm"
            onPress={onClose}
            aria-label="Close menu"
          >
            <Icon name="Xmark" />
          </Button>
        }
      />

      {/* Space switcher */}
      <SpaceSwitcher />

      <ScrollShadow hideScrollBar className="min-h-0 flex-1 overflow-y-auto">
        <ExpandedNavListBox
          items={items}
          activeItemId={activeItemId}
          onSelectionChange={onFilterChange}
        />
      </ScrollShadow>

      <div className="flex flex-col gap-2">
        <Button
          fullWidth
          variant="primary"
          onClick={() => onFilterChange('home')}
        >
          <Icon name="EditPencil" />
          {t('New Task')}
        </Button>
        <div className="flex items-center justify-end gap-1">
          <ThemeToggleButton />
          <SettingsButton onPress={onOpenSettings} />
        </div>
      </div>
    </aside>
  )
}
