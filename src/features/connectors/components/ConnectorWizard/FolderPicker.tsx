/**
 * FolderPicker Component
 *
 * Tree view for selecting folders/labels from a connected provider.
 * Supports multi-select with checkboxes and a "Sync All" option.
 * Also supports URL input mode for providers like Figma.
 *
 * Features:
 * - Hierarchical folder tree built from parentExternalId relationships
 * - Alphabetical sorting at every level
 * - Search by name (auto-expands matching branches)
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Button,
  Checkbox,
  Spinner,
  ScrollShadow,
  Textarea,
  Input,
} from '@heroui/react'
import { Icon } from '@/components'
import { useI18n } from '@/i18n'
import { ProviderRegistry } from '../../provider-registry'
import { getProvider } from '../../providers/apps'
import type {
  AppConnectorProvider,
  AppConnectorProviderInterface,
  ConnectorItem,
  OAuthResult,
} from '../../types'
import localI18n from '../../pages/i18n'

// =============================================================================
// Types
// =============================================================================

interface FolderPickerProps {
  provider: AppConnectorProvider
  oauthResult: OAuthResult
  onSelect: (folderIds: string[] | null) => void
  onSkip: () => void
}

interface FolderNode extends ConnectorItem {
  children: FolderNode[]
}

// =============================================================================
// Tree Helpers
// =============================================================================

/** Build a sorted hierarchy from a flat list of folders using parentExternalId */
function buildFolderTree(flatFolders: ConnectorItem[]): FolderNode[] {
  const nodeMap = new Map<string, FolderNode>()

  for (const item of flatFolders) {
    nodeMap.set(item.externalId, { ...item, children: [] })
  }

  const roots: FolderNode[] = []

  for (const node of nodeMap.values()) {
    if (node.parentExternalId && nodeMap.has(node.parentExternalId)) {
      nodeMap.get(node.parentExternalId)!.children.push(node)
    } else {
      roots.push(node)
    }
  }

  const sortNodes = (nodes: FolderNode[]): FolderNode[] =>
    nodes
      .sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
      )
      .map((n) => ({ ...n, children: sortNodes(n.children) }))

  return sortNodes(roots)
}

/**
 * Filter the tree by a search query.
 * Returns a new tree containing only matching nodes and their ancestors,
 * with all visible nodes marked as expanded.
 */
function filterTree(tree: FolderNode[], query: string): FolderNode[] {
  if (!query.trim()) return tree
  const lower = query.toLowerCase()

  const filterNode = (node: FolderNode): FolderNode | null => {
    const filteredChildren = node.children
      .map(filterNode)
      .filter(Boolean) as FolderNode[]
    if (node.name.toLowerCase().includes(lower) || filteredChildren.length > 0) {
      return { ...node, children: filteredChildren }
    }
    return null
  }

  return tree.map(filterNode).filter(Boolean) as FolderNode[]
}

// =============================================================================
// Component
// =============================================================================

/**
 * FolderPicker allows users to select which folders to sync
 *
 * @param provider - The connected provider
 * @param oauthResult - OAuth tokens for API calls
 * @param onSelect - Callback with selected folder IDs (null = sync all)
 * @param onSkip - Callback to skip folder selection
 */
export function FolderPicker({
  provider,
  oauthResult,
  onSelect,
  onSkip,
}: FolderPickerProps) {
  const { t } = useI18n(localI18n)

  const [flatFolders, setFlatFolders] = useState<ConnectorItem[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [syncAll, setSyncAll] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [urlInput, setUrlInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  const config = getProvider(provider)
  const isUrlInputMode = config?.folderPickerType === 'url-input'

  // Build sorted hierarchy from flat list
  const folderTree = useMemo(() => buildFolderTree(flatFolders), [flatFolders])

  // Apply search filter (auto-expands matching branches)
  const visibleTree = useMemo(
    () => filterTree(folderTree, searchQuery),
    [folderTree, searchQuery],
  )

  // Fetch ALL folders (all pages) on mount
  useEffect(() => {
    if (isUrlInputMode) {
      setIsLoading(false)
      setSyncAll(false)
      return
    }

    const fetchFolders = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const providerInstance =
          await ProviderRegistry.get<AppConnectorProviderInterface>(provider)

        const allItems: ConnectorItem[] = []
        let cursor: string | undefined = undefined

        // Paginate through all folders
        do {
          const result = await providerInstance.listWithToken(
            oauthResult.accessToken,
            {
              filter: { mimeType: 'application/vnd.google-apps.folder' },
              pageSize: 1000,
              cursor,
            },
          )
          allItems.push(
            ...result.items.filter((item) => item.type === 'folder'),
          )
          cursor = result.nextCursor
        } while (cursor)

        setFlatFolders(allItems)
      } catch (err) {
        console.error('Failed to fetch folders:', err)
        setError(err instanceof Error ? err.message : 'Failed to load folders')
      } finally {
        setIsLoading(false)
      }
    }

    fetchFolders()
  }, [provider, oauthResult, isUrlInputMode])

  // Toggle folder selection
  const toggleFolder = useCallback((folderId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(folderId)) {
        next.delete(folderId)
      } else {
        next.add(folderId)
      }
      return next
    })
    setSyncAll(false)
  }, [])

  // Toggle expand/collapse (only in non-search mode)
  const toggleExpanded = useCallback((folderId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(folderId)) {
        next.delete(folderId)
      } else {
        next.add(folderId)
      }
      return next
    })
  }, [])

  // Toggle sync all
  const toggleSyncAll = useCallback((checked: boolean) => {
    setSyncAll(checked)
    if (checked) setSelectedIds(new Set())
  }, [])

  // Parse URL input into array of IDs/URLs
  const parseUrlInput = useCallback((input: string): string[] => {
    return input
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
  }, [])

  // Handle continue
  const handleContinue = useCallback(() => {
    if (isUrlInputMode) {
      const urls = parseUrlInput(urlInput)
      onSelect(urls.length > 0 ? urls : null)
    } else if (syncAll) {
      onSelect(null)
    } else {
      onSelect(Array.from(selectedIds))
    }
  }, [isUrlInputMode, urlInput, parseUrlInput, syncAll, selectedIds, onSelect])

  const isContinueDisabled = isUrlInputMode
    ? parseUrlInput(urlInput).length === 0
    : !syncAll && selectedIds.size === 0

  // Render a folder node recursively
  const renderFolder = (folder: FolderNode, depth = 0): React.ReactNode => {
    const isSelected = selectedIds.has(folder.externalId)
    const hasChildren = folder.children.length > 0
    // When searching, all matching branches are expanded automatically
    const isExpanded = searchQuery.trim()
      ? true
      : expandedIds.has(folder.externalId)

    return (
      <div key={folder.externalId} className="select-none">
        <div
          className={`flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-default-100 cursor-pointer transition-colors ${
            isSelected ? 'bg-primary-50 dark:bg-primary-900/20' : ''
          }`}
          style={{ paddingLeft: `${depth * 16 + 12}px` }}
        >
          {hasChildren ? (
            <button
              onClick={() => toggleExpanded(folder.externalId)}
              className="w-5 h-5 flex items-center justify-center text-default-400 hover:text-default-600"
            >
              <Icon
                name={isExpanded ? 'NavArrowDown' : 'NavArrowRight'}
                className="w-4 h-4"
              />
            </button>
          ) : (
            <div className="w-5" />
          )}

          <Checkbox
            isSelected={isSelected}
            onValueChange={() => toggleFolder(folder.externalId)}
            size="sm"
          />

          <Icon name="Folder" className="w-4 h-4 text-warning" />

          <span
            className="text-sm flex-1 truncate"
            onClick={() => toggleFolder(folder.externalId)}
          >
            {folder.name}
          </span>
        </div>

        {isExpanded &&
          folder.children.map((child) => renderFolder(child, depth + 1))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="mb-6">
        <h3 className="text-lg font-medium mb-2">
          {isUrlInputMode
            ? t('Add files to sync')
            : t('Select folders to sync')}
        </h3>
        <p className="text-default-500 text-sm">
          {isUrlInputMode
            ? t('Paste file URLs or IDs from {name} to sync.', {
                name: config?.name || provider,
              })
            : t(
                'Choose which folders you want to sync from {name}, or sync everything.',
                { name: config?.name || provider },
              )}
        </p>
      </div>

      {/* Sync All Option (only for tree mode) */}
      {!isUrlInputMode && (
        <div className="p-4 bg-default-50 dark:bg-default-100/10 rounded-lg">
          <Checkbox
            isSelected={syncAll}
            onValueChange={toggleSyncAll}
            classNames={{ label: 'text-sm' }}
          >
            <div>
              <span className="font-medium">{t('Sync everything')}</span>
              <p className="text-xs text-default-400 mt-0.5">
                {t('All files and folders will be synced automatically')}
              </p>
            </div>
          </Checkbox>
        </div>
      )}

      {/* URL Input Mode (for Figma, etc.) */}
      {isUrlInputMode && (
        <div className="space-y-3">
          <Textarea
            value={urlInput}
            onValueChange={setUrlInput}
            placeholder={
              config?.urlInputPlaceholder ||
              t('Enter URLs or IDs (one per line)')
            }
            minRows={4}
            maxRows={8}
            classNames={{ input: 'font-mono text-sm' }}
          />
          <p className="text-xs text-default-400">
            {config?.urlInputHelp || t('Enter file URLs or IDs, one per line')}
          </p>
          {parseUrlInput(urlInput).length > 0 && (
            <p className="text-xs text-default-500 text-center">
              {t('{n} items to sync', { n: parseUrlInput(urlInput).length })}
            </p>
          )}
        </div>
      )}

      {/* Folder Tree (standard mode) */}
      {!isUrlInputMode && !syncAll && (
        <>
          {/* Search input */}
          {!isLoading && !error && flatFolders.length > 0 && (
            <Input
              size="sm"
              placeholder={t('Search folders...')}
              value={searchQuery}
              onValueChange={setSearchQuery}
              startContent={
                <Icon
                  name="Search"
                  className="w-4 h-4 text-default-400 pointer-events-none"
                />
              }
              isClearable
              onClear={() => setSearchQuery('')}
              classNames={{ inputWrapper: 'h-9' }}
            />
          )}

          <ScrollShadow className="max-h-64">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Spinner size="sm" />
                <span className="ml-2 text-sm text-default-500">
                  {t('Loading folders...')}
                </span>
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <Icon
                  name="WarningTriangle"
                  className="w-8 h-8 text-danger mx-auto mb-2"
                />
                <p className="text-sm text-danger">{error}</p>
              </div>
            ) : visibleTree.length === 0 ? (
              <div className="text-center py-8 text-default-400">
                <Icon
                  name="Folder"
                  className="w-8 h-8 mx-auto mb-2 opacity-50"
                />
                <p className="text-sm">{t('No folders found')}</p>
              </div>
            ) : (
              <div className="space-y-1">
                {visibleTree.map((folder) => renderFolder(folder))}
              </div>
            )}
          </ScrollShadow>
        </>
      )}

      {/* Selection Summary (tree mode) */}
      {!isUrlInputMode && !syncAll && selectedIds.size > 0 && (
        <p className="text-xs text-default-500 text-center">
          {t('{n} folders selected', { n: selectedIds.size })}
        </p>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-4 pt-4">
        {isContinueDisabled ? (
          <Button color="primary" onPress={onSkip}>
            {t('Skip')}
          </Button>
        ) : (
          <Button
            color="primary"
            onPress={handleContinue}
            isDisabled={isContinueDisabled}
          >
            {t('Continue')}
          </Button>
        )}
      </div>
    </div>
  )
}

export default FolderPicker
