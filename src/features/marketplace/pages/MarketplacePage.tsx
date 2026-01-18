import { useEffect, useMemo, useState } from 'react'
import {
  Card,
  CardHeader,
  Chip,
  Listbox,
  ListboxItem,
  Spinner,
  Avatar,
  Input,
  Button,
  useDisclosure,
  Tooltip,
} from '@heroui/react'
import { Search } from 'iconoir-react'

import { Link } from 'react-router-dom'

import DefaultLayout from '@/layouts/Default'
import { Container, Section, Icon, Title } from '@/components'
import { useI18n, type LanguageCode } from '@/i18n'
import type { HeaderProps, IconName } from '@/lib/types'
import { useMarketplaceStore } from '../store'
import type {
  ExtensionColor,
  ExtensionType,
  MarketplaceExtension,
} from '../types'
import { ExtensionDetailModal } from '../components'
import localI18n from './i18n'

/**
 * Marketplace Page
 *
 * Browse and discover community-built extensions including
 * Apps, Agents, Connectors, and Tools.
 *
 * Extensions are displayed by category with their icons and colors.
 */

// Category metadata for display
const CATEGORY_META: Record<ExtensionType, { icon: IconName; label: string }> =
  {
    app: { icon: 'CubeScan', label: 'Apps' },
    agent: { icon: 'User', label: 'Agents' },
    connector: { icon: 'Puzzle', label: 'Connectors' },
    tool: { icon: 'Settings', label: 'Tools' },
  }

// Map extension color to HeroUI color
function getChipColor(
  color?: ExtensionColor,
): 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger' {
  switch (color) {
    case 'primary':
    case 'blue':
    case 'indigo':
      return 'primary'
    case 'secondary':
    case 'purple':
    case 'pink':
      return 'secondary'
    case 'success':
    case 'green':
    case 'teal':
      return 'success'
    case 'warning':
    case 'orange':
    case 'yellow':
      return 'warning'
    case 'danger':
    case 'red':
      return 'danger'
    default:
      return 'default'
  }
}

export function MarketplacePage() {
  const { lang, t } = useI18n(localI18n)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedExtension, setSelectedExtension] =
    useState<MarketplaceExtension | null>(null)
  const { isOpen, onOpen, onClose } = useDisclosure()

  // Load extensions
  const extensions = useMarketplaceStore((state) => state.extensions)
  const customExtensions = useMarketplaceStore(
    (state) => state.customExtensions,
  )
  const installed = useMarketplaceStore((state) => state.installed)
  const isLoading = useMarketplaceStore((state) => state.isLoading)
  const loadExtensions = useMarketplaceStore((state) => state.loadExtensions)
  const loadInstalledExtensions = useMarketplaceStore(
    (state) => state.loadInstalledExtensions,
  )
  const loadCustomExtensions = useMarketplaceStore(
    (state) => state.loadCustomExtensions,
  )
  const isInstalled = useMarketplaceStore((state) => state.isInstalled)

  useEffect(() => {
    loadExtensions()
    loadInstalledExtensions()
    loadCustomExtensions()
  }, [loadExtensions, loadInstalledExtensions, loadCustomExtensions])

  // Installed extensions list
  const installedExtensions = useMemo(
    () => Array.from(installed.values()).filter((ext) => ext.enabled),
    [installed],
  )

  // Convert custom extensions to MarketplaceExtension format for display
  const customAsMarketplace = useMemo((): MarketplaceExtension[] => {
    return customExtensions
      .filter((ext) => ext.enabled)
      .map((ext) => ({
        ...ext,
        // Mark as custom for display purposes
      }))
  }, [customExtensions])

  // Combine marketplace and custom extensions
  const allExtensions = useMemo(() => {
    return [...extensions, ...customAsMarketplace]
  }, [extensions, customAsMarketplace])

  // Group extensions by type/category
  const extensionsByCategory = useMemo(() => {
    const grouped: Record<ExtensionType, MarketplaceExtension[]> = {
      app: [],
      agent: [],
      connector: [],
      tool: [],
    }
    allExtensions.forEach((ext) => {
      const type = ext.type || 'app'
      if (grouped[type]) {
        grouped[type].push(ext)
      }
    })
    return grouped
  }, [allExtensions])

  // Filter extensions based on search and category
  const filteredExtensions = useMemo(() => {
    let result = allExtensions

    // Filter by category
    if (
      selectedCategory !== 'all' &&
      selectedCategory !== 'installed' &&
      selectedCategory !== 'custom'
    ) {
      result = extensionsByCategory[selectedCategory as ExtensionType] || []
    } else if (selectedCategory === 'installed') {
      result = installedExtensions.map((inst) => inst.extension)
    } else if (selectedCategory === 'custom') {
      result = customAsMarketplace
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter((ext) => {
        const localizedName =
          ext.i18n?.[lang as LanguageCode]?.name?.toLowerCase() ||
          ext.name.toLowerCase()
        const localizedDesc =
          ext.i18n?.[lang as LanguageCode]?.description?.toLowerCase() ||
          ext.description?.toLowerCase() ||
          ''
        return localizedName.includes(query) || localizedDesc.includes(query)
      })
    }

    return result
  }, [
    allExtensions,
    extensionsByCategory,
    installedExtensions,
    customAsMarketplace,
    selectedCategory,
    searchQuery,
    lang,
  ])

  // Check if an extension is custom (AI-generated)
  const isCustomExtension = (id: string) => {
    return customExtensions.some((ext) => ext.id === id)
  }

  // Count extensions per category
  const categoryCounts = useMemo(() => {
    return {
      all: allExtensions.length,
      app: extensionsByCategory.app.length,
      agent: extensionsByCategory.agent.length,
      connector: extensionsByCategory.connector.length,
      tool: extensionsByCategory.tool.length,
      installed: installedExtensions.length,
      custom: customAsMarketplace.length,
    }
  }, [
    allExtensions.length,
    extensionsByCategory,
    installedExtensions.length,
    customAsMarketplace.length,
  ])

  const header: HeaderProps = {
    icon: {
      name: 'HexagonPlus',
      color: 'text-warning-400 dark:text-warning-500',
    },
    title: t('Marketplace'),
    subtitle: t('Expand your platform capabilities with community extensions'),
  }

  // Handle opening extension detail modal
  const handleOpenExtensionDetail = (ext: MarketplaceExtension) => {
    setSelectedExtension(ext)
    onOpen()
  }

  const handleCloseModal = () => {
    onClose()
    setSelectedExtension(null)
  }

  // Render extension card
  const renderExtensionCard = (
    ext: (typeof extensions)[0],
    isInstalledExt: boolean,
  ) => {
    const localizedName = ext.i18n?.[lang as LanguageCode]?.name || ext.name
    const localizedDescription =
      ext.i18n?.[lang as LanguageCode]?.description || ext.description
    const categoryMeta = CATEGORY_META[ext.type || 'app']
    const chipColor = getChipColor(ext.color)
    const isCustom = isCustomExtension(ext.id)

    return (
      <Card
        key={ext.id}
        shadow="sm"
        isPressable
        onPress={() => handleOpenExtensionDetail(ext)}
      >
        <CardHeader className="gap-4">
          <Avatar
            icon={<Icon name={ext.icon || categoryMeta.icon} />}
            color={chipColor}
            size="lg"
            radius="lg"
            isBordered={isInstalledExt}
          />
          <div style={{ flex: 1 }}>
            {isCustom && (
              <Tooltip content={t('AI-generated')}>
                <Chip
                  size="sm"
                  color="secondary"
                  variant="flat"
                  className="float-end"
                >
                  <Icon name="Sparks" size="sm" />
                </Chip>
              </Tooltip>
            )}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <span style={{ fontWeight: 600, fontSize: 16 }}>
                {localizedName}
              </span>
              {ext.featured && (
                <Chip size="sm" color="warning" variant="flat">
                  ★
                </Chip>
              )}
            </div>
            <p className="text-sm text-muted-foreground text-start line-clamp-2">
              {localizedDescription || t('No description found')}
            </p>
          </div>
        </CardHeader>
      </Card>
    )
  }

  return (
    <DefaultLayout header={header}>
      <Section>
        <Container>
          {/* Hero Banner */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-warning-100 to-warning-50 dark:from-warning-900/30 dark:to-warning-950/20 p-8 mb-8">
            <div className="relative z-10">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                <div className="flex flex-col gap-3">
                  <Title level={2}>{t('Supercharge your AI workflows')}</Title>
                  <div className="flex flex-wrap gap-4 text-sm text-default-600 dark:text-default-400">
                    <div className="flex items-center gap-2">
                      <Icon name="Check" className="text-success" />
                      <span>{t('One-click install')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Icon name="Check" className="text-success" />
                      <span>{t('Community-driven')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Icon name="Check" className="text-success" />
                      <span>{t('100% open source')}</span>
                    </div>
                  </div>
                </div>
                <div className="flex-shrink-0">
                  <Button
                    color="warning"
                    variant="shadow"
                    startContent={<Icon name="Code" />}
                    as={Link}
                    to="/marketplace/new"
                  >
                    {t('Build my own extension')}
                  </Button>
                </div>
              </div>
            </div>
            {/* Decorative background pattern */}
            <div className="absolute top-0 right-0 w-64 h-64 opacity-10 dark:opacity-5">
              <Icon name="HexagonPlus" className="w-full h-full" />
            </div>
          </div>

          {/* Main layout with vertical tabs on left */}
          <div style={{ display: 'flex', gap: 32 }}>
            {/* Category Listbox */}
            <div style={{ maxWidth: 240, flexShrink: 0 }}>
              <Listbox
                aria-label={t('Categories')}
                selectedKeys={[selectedCategory]}
                selectionMode="single"
                onSelectionChange={(keys) => {
                  const selected = Array.from(keys)[0] as string
                  if (selected) setSelectedCategory(selected)
                }}
                variant="flat"
              >
                <ListboxItem
                  key="all"
                  startContent={<Icon name="ViewGrid" />}
                  endContent={
                    <Chip size="sm" variant="flat">
                      {categoryCounts.all}
                    </Chip>
                  }
                >
                  {t('All')}
                </ListboxItem>
                <ListboxItem
                  key="app"
                  startContent={<Icon name="CubeScan" />}
                  endContent={
                    <Chip size="sm" variant="flat">
                      {categoryCounts.app}
                    </Chip>
                  }
                >
                  {t('Apps')}
                </ListboxItem>
                <ListboxItem
                  key="agent"
                  startContent={<Icon name="User" />}
                  endContent={
                    <Chip size="sm" variant="flat">
                      {categoryCounts.agent}
                    </Chip>
                  }
                >
                  {t('Agents')}
                </ListboxItem>
                <ListboxItem
                  key="connector"
                  startContent={<Icon name="Puzzle" />}
                  endContent={
                    <Chip size="sm" variant="flat">
                      {categoryCounts.connector}
                    </Chip>
                  }
                >
                  {t('Connectors')}
                </ListboxItem>
                <ListboxItem
                  key="tool"
                  startContent={<Icon name="Settings" />}
                  endContent={
                    <Chip size="sm" variant="flat">
                      {categoryCounts.tool}
                    </Chip>
                  }
                >
                  {t('Tools')}
                </ListboxItem>
                <ListboxItem
                  key="custom"
                  startContent={<Icon name="Sparks" />}
                  endContent={
                    <Chip size="sm" variant="flat">
                      {categoryCounts.custom}
                    </Chip>
                  }
                >
                  {t('My extensions')}
                </ListboxItem>
                <ListboxItem
                  key="installed"
                  startContent={<Icon name="Check" />}
                  endContent={
                    <Chip size="sm" variant="flat">
                      {categoryCounts.installed}
                    </Chip>
                  }
                >
                  {t('Installed')}
                </ListboxItem>
              </Listbox>
            </div>

            {/* Content area */}
            <div style={{ flex: 1, minWidth: 0 }}>
              {/* Search */}
              <Input
                placeholder={t('Search extensions...')}
                value={searchQuery}
                onValueChange={setSearchQuery}
                startContent={<Search />}
                size="sm"
                isClearable
                onClear={() => setSearchQuery('')}
                className="mb-8"
              />
              {/* Loading State */}
              {isLoading && (
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'center',
                    padding: 48,
                  }}
                >
                  <Spinner size="lg" />
                </div>
              )}

              {/* Empty State */}
              {!isLoading && filteredExtensions.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 px-8">
                  <div className="w-16 h-16 rounded-full bg-default-100 flex items-center justify-center mb-4">
                    <Icon
                      name={searchQuery ? 'Search' : 'HexagonPlus'}
                      size="xl"
                      className="text-default-400"
                    />
                  </div>
                  <p className="text-lg font-semibold mb-1">
                    {t('No extensions found')}
                  </p>
                  <p className="text-sm text-default-500 text-center max-w-xs">
                    {searchQuery
                      ? t('Try a different search term')
                      : t('Browse the marketplace to find useful extensions')}
                  </p>
                </div>
              )}

              {/* Extensions Grid */}
              {!isLoading && filteredExtensions.length > 0 && (
                <div className="grid gap-4 md:grid-cols-2">
                  {filteredExtensions.map((ext) =>
                    renderExtensionCard(ext, isInstalled(ext.id)),
                  )}
                </div>
              )}
            </div>
          </div>
        </Container>
      </Section>

      {/* Extension Detail Modal */}
      <ExtensionDetailModal
        extension={selectedExtension}
        isOpen={isOpen}
        onClose={handleCloseModal}
      />
    </DefaultLayout>
  )
}

export default MarketplacePage
