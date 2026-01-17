/**
 * FolderPicker Component
 *
 * Tree view for selecting folders/labels from a connected provider.
 * Supports multi-select with checkboxes and a "Sync All" option.
 * Also supports URL input mode for providers like Figma.
 */

import { useState, useEffect, useCallback } from 'react'
import {
  Button,
  Checkbox,
  Spinner,
  ScrollShadow,
  Textarea,
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
  children?: FolderNode[]
  isExpanded?: boolean
  isLoading?: boolean
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

  const [folders, setFolders] = useState<FolderNode[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [syncAll, setSyncAll] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [urlInput, setUrlInput] = useState('')

  const config = getProvider(provider)
  const isUrlInputMode = config?.folderPickerType === 'url-input'

  // Fetch root folders on mount (only for tree mode)
  useEffect(() => {
    // Skip fetching for URL input mode
    if (isUrlInputMode) {
      setIsLoading(false)
      setSyncAll(false) // URL input mode requires explicit input
      return
    }

    const fetchFolders = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const providerInstance =
          await ProviderRegistry.get<AppConnectorProviderInterface>(provider)

        // Use listWithToken to list folders with the raw OAuth token
        // (token hasn't been stored/encrypted yet during wizard flow)
        const result = await providerInstance.listWithToken(
          oauthResult.accessToken,
          {
            filter: { mimeType: 'application/vnd.google-apps.folder' },
          },
        )

        // Convert to FolderNode format
        const folderNodes: FolderNode[] = result.items
          .filter((item: ConnectorItem) => item.type === 'folder')
          .map((item: ConnectorItem) => ({
            ...item,
            isExpanded: false,
            isLoading: false,
          }))

        setFolders(folderNodes)
      } catch (err) {
        console.error('Failed to fetch folders:', err)
        setError(err instanceof Error ? err.message : 'Failed to load folders')
      } finally {
        setIsLoading(false)
      }
    }

    fetchFolders()
  }, [provider, oauthResult])

  // Toggle folder selection
  const toggleFolder = useCallback((folderId: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(folderId)) {
        newSet.delete(folderId)
      } else {
        newSet.add(folderId)
      }
      return newSet
    })
    // Deselect "Sync All" when selecting specific folders
    setSyncAll(false)
  }, [])

  // Toggle sync all
  const toggleSyncAll = useCallback((checked: boolean) => {
    setSyncAll(checked)
    if (checked) {
      setSelectedIds(new Set())
    }
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
      // For URL input mode, parse the textarea content
      const urls = parseUrlInput(urlInput)
      onSelect(urls.length > 0 ? urls : null)
    } else if (syncAll) {
      onSelect(null) // null means sync everything
    } else {
      onSelect(Array.from(selectedIds))
    }
  }, [isUrlInputMode, urlInput, parseUrlInput, syncAll, selectedIds, onSelect])

  // Check if continue is disabled
  const isContinueDisabled = isUrlInputMode
    ? parseUrlInput(urlInput).length === 0
    : !syncAll && selectedIds.size === 0

  // Expand folder to load children
  const expandFolder = useCallback(async (folderId: string) => {
    setFolders((prev) =>
      prev.map((folder) => {
        if (folder.externalId === folderId) {
          return { ...folder, isExpanded: !folder.isExpanded }
        }
        return folder
      }),
    )
  }, [])

  // Render a folder item
  const renderFolder = (folder: FolderNode, depth = 0) => {
    const isSelected = selectedIds.has(folder.externalId)

    return (
      <div key={folder.externalId} className="select-none">
        <div
          className={`flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-default-100 cursor-pointer transition-colors ${
            isSelected ? 'bg-primary-50 dark:bg-primary-900/20' : ''
          }`}
          style={{ paddingLeft: `${depth * 16 + 12}px` }}
        >
          {folder.children && folder.children.length > 0 ? (
            <button
              onClick={() => expandFolder(folder.externalId)}
              className="w-5 h-5 flex items-center justify-center text-default-400 hover:text-default-600"
            >
              <Icon
                name={folder.isExpanded ? 'NavArrowDown' : 'NavArrowRight'}
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

        {folder.isExpanded &&
          folder.children?.map((child) => renderFolder(child, depth + 1))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
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
            classNames={{
              label: 'text-sm',
            }}
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
            classNames={{
              input: 'font-mono text-sm',
            }}
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
          ) : folders.length === 0 ? (
            <div className="text-center py-8 text-default-400">
              <Icon name="Folder" className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">{t('No folders found')}</p>
            </div>
          ) : (
            <div className="space-y-1">
              {folders.map((folder) => renderFolder(folder))}
            </div>
          )}
        </ScrollShadow>
      )}

      {/* Selection Summary (tree mode) */}
      {!isUrlInputMode && !syncAll && selectedIds.size > 0 && (
        <p className="text-xs text-default-500 text-center">
          {t('{n} folders selected', { n: selectedIds.size })}
        </p>
      )}

      {/* Actions */}
      <div className="flex justify-between pt-4">
        <Button variant="flat" onPress={onSkip}>
          {t('Skip')}
        </Button>
        <Button
          color="primary"
          onPress={handleContinue}
          isDisabled={isContinueDisabled}
        >
          {t('Continue')}
        </Button>
      </div>
    </div>
  )
}

export default FolderPicker
