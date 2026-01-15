/**
 * ConnectorSettingsModal Component
 *
 * Modal for editing connector settings, particularly folder sync configuration.
 * Uses the existing stored authentication rather than re-authenticating.
 */

import { useState, useEffect, useCallback } from 'react'
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Checkbox,
  Spinner,
  ScrollShadow,
  Switch,
  Divider,
} from '@heroui/react'
import { Icon } from '@/components'
import { useI18n } from '@/i18n'
import { useConnectorStore } from '@/stores/connectorStore'
import { ProviderRegistry } from '../provider-registry'
import { PROVIDER_CONFIG } from '../providers/apps'
import {
  AuthenticationError,
  storeEncryptionMetadata,
} from '../connector-provider'
import { SecureStorage } from '@/lib/crypto'
import { successToast, errorToast, infoToast } from '@/lib/toast'
import type {
  Connector,
  AppConnectorProvider,
  AppConnectorProviderInterface,
  ConnectorItem,
} from '../types'
import localI18n from '../pages/i18n'

// =============================================================================
// Types
// =============================================================================

interface ConnectorSettingsModalProps {
  isOpen: boolean
  onClose: () => void
  connector: Connector | null
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
 * ConnectorSettingsModal - Edit settings for an existing connector
 *
 * @param isOpen - Whether the modal is open
 * @param onClose - Callback to close the modal
 * @param connector - The connector to edit settings for
 */
export function ConnectorSettingsModal({
  isOpen,
  onClose,
  connector,
}: ConnectorSettingsModalProps) {
  const { t } = useI18n(localI18n)
  const { updateConnector } = useConnectorStore()

  // State
  const [folders, setFolders] = useState<FolderNode[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [syncAll, setSyncAll] = useState(true)
  const [syncEnabled, setSyncEnabled] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const provider = connector?.provider as AppConnectorProvider | undefined
  const config = provider ? PROVIDER_CONFIG[provider] : null

  // Initialize state from connector
  useEffect(() => {
    if (connector) {
      setSyncEnabled(connector.syncEnabled)
      if (connector.syncFolders && connector.syncFolders.length > 0) {
        setSyncAll(false)
        setSelectedIds(new Set(connector.syncFolders))
      } else {
        setSyncAll(true)
        setSelectedIds(new Set())
      }
    }
    // Only re-initialize when connector ID changes
  }, [connector?.id])

  // Helper to refresh token and update connector
  const refreshAndUpdateToken = useCallback(
    async (
      providerInstance: AppConnectorProviderInterface,
      currentConnector: Connector,
    ): Promise<Connector> => {
      // Check if refresh token is available
      if (!currentConnector.encryptedRefreshToken) {
        throw new Error('NO_REFRESH_TOKEN')
      }

      console.log('[ConnectorSettingsModal] Refreshing expired token...')
      infoToast(t('Refreshing access token...'), t('Please wait'))

      // Refresh the token
      const refreshResult =
        await providerInstance.refreshToken(currentConnector)

      // Encrypt the new access token
      await SecureStorage.init()
      const {
        encrypted: encryptedToken,
        iv,
        salt,
      } = await SecureStorage.encryptCredential(refreshResult.accessToken)

      // Calculate new expiry time
      const tokenExpiresAt = refreshResult.expiresIn
        ? new Date(Date.now() + refreshResult.expiresIn * 1000)
        : undefined

      // Update the connector in the store
      await updateConnector(currentConnector.id, {
        encryptedToken,
        tokenExpiresAt,
        status: 'connected',
        errorMessage: undefined,
      })

      // Store new encryption metadata
      storeEncryptionMetadata(currentConnector.id, iv, salt, false)

      console.log('[ConnectorSettingsModal] Token refreshed successfully')

      // Return updated connector for retry
      return {
        ...currentConnector,
        encryptedToken,
        tokenExpiresAt,
        status: 'connected',
      }
    },
    [updateConnector, t],
  )

  // Fetch folders when modal opens
  useEffect(() => {
    const fetchFolders = async () => {
      if (!isOpen || !connector || !provider) return

      setIsLoading(true)
      setError(null)

      try {
        const providerInstance =
          await ProviderRegistry.get<AppConnectorProviderInterface>(provider)
        let currentConnector = connector

        // Try to fetch folders, handling token expiration
        try {
          const result = await providerInstance.list(currentConnector, {
            filter: { mimeType: 'application/vnd.google-apps.folder' },
          })

          // Convert to FolderNode format
          const folderNodes: FolderNode[] = result.items
            .filter((item: ConnectorItem) => item.type === 'folder')
            .map((item: ConnectorItem) => ({
              ...item,
              isExpanded: false,
              isLoading: false,
            }))

          setFolders(folderNodes)
        } catch (fetchErr) {
          // Check if it's an authentication error (token expired)
          if (fetchErr instanceof AuthenticationError) {
            console.log(
              '[ConnectorSettingsModal] Token expired, attempting refresh...',
            )

            try {
              // Refresh the token
              currentConnector = await refreshAndUpdateToken(
                providerInstance,
                currentConnector,
              )

              // Retry the request with the refreshed token
              const result = await providerInstance.list(currentConnector, {
                filter: { mimeType: 'application/vnd.google-apps.folder' },
              })

              // Convert to FolderNode format
              const folderNodes: FolderNode[] = result.items
                .filter((item: ConnectorItem) => item.type === 'folder')
                .map((item: ConnectorItem) => ({
                  ...item,
                  isExpanded: false,
                  isLoading: false,
                }))

              setFolders(folderNodes)
              successToast(
                t('Token refreshed'),
                t('Connection restored successfully'),
              )
            } catch (refreshErr) {
              console.error('Token refresh failed:', refreshErr)

              // Check if it's a missing refresh token error
              const isNoRefreshToken =
                refreshErr instanceof Error &&
                (refreshErr.message === 'NO_REFRESH_TOKEN' ||
                  refreshErr.message.includes('No refresh token'))

              // Show appropriate error message
              setError(
                isNoRefreshToken
                  ? t(
                      'Your session has expired. Please disconnect and reconnect this service. To avoid this in the future, revoke access at myaccount.google.com/permissions before reconnecting.',
                    )
                  : t('Your access token has expired. Please reconnect.'),
              )

              // Update connector status to expired
              await updateConnector(connector.id, {
                status: 'expired',
                errorMessage: isNoRefreshToken
                  ? 'No refresh token available - reconnection required'
                  : 'Token refresh failed',
              })
            }
          } else {
            // Re-throw non-authentication errors
            throw fetchErr
          }
        }
      } catch (err) {
        console.error('Failed to fetch folders:', err)
        setError(
          err instanceof Error ? err.message : t('Failed to load folders'),
        )
      } finally {
        setIsLoading(false)
      }
    }

    fetchFolders()
    // Only refetch when modal opens or connector ID changes, not on every connector object change
  }, [isOpen, connector?.id, provider])

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

  // Save settings
  const handleSave = useCallback(async () => {
    if (!connector) return

    setIsSaving(true)
    try {
      await updateConnector(connector.id, {
        syncEnabled,
        syncFolders: syncAll ? undefined : Array.from(selectedIds),
      })
      successToast(
        t('Settings saved'),
        t('Connector settings have been updated'),
      )
      onClose()
    } catch (err) {
      console.error('Failed to save settings:', err)
      errorToast(
        t('Failed to save'),
        err instanceof Error ? err.message : t('Unknown error'),
      )
    } finally {
      setIsSaving(false)
    }
  }, [
    connector,
    syncEnabled,
    syncAll,
    selectedIds,
    updateConnector,
    onClose,
    t,
  ])

  // Render a folder item
  const renderFolder = useCallback(
    (folder: FolderNode, depth = 0) => {
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
              <button className="w-5 h-5 flex items-center justify-center text-default-400 hover:text-default-600">
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
    },
    [selectedIds, toggleFolder],
  )

  if (!connector) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl" scrollBehavior="inside">
      <ModalContent>
        {() => (
          <>
            <ModalHeader className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                {config && (
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${config.color}20` }}
                  >
                    <Icon
                      name={config.icon as any}
                      className="w-4 h-4"
                      style={{ color: config.color }}
                    />
                  </div>
                )}
                <span>
                  {t('{name} Settings', {
                    name: config?.name || connector.name,
                  })}
                </span>
              </div>
            </ModalHeader>

            <ModalBody className="gap-6">
              {/* Account Info */}
              {connector.accountEmail && (
                <div className="flex items-center gap-3 p-3 bg-default-50 dark:bg-default-100/10 rounded-lg">
                  <Icon name="User" className="w-5 h-5 text-default-400" />
                  <div>
                    <p className="text-sm font-medium">
                      {t('Connected Account')}
                    </p>
                    <p className="text-xs text-default-500">
                      {connector.accountEmail}
                    </p>
                  </div>
                </div>
              )}

              {/* Sync Toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{t('Enable Sync')}</p>
                  <p className="text-xs text-default-500">
                    {t('Automatically sync content from this connector')}
                  </p>
                </div>
                <Switch
                  isSelected={syncEnabled}
                  onValueChange={setSyncEnabled}
                />
              </div>

              <Divider />

              {/* Folder Selection */}
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium mb-1">{t('Sync Settings')}</h3>
                  <p className="text-xs text-default-500">
                    {t('Choose which folders to sync or sync everything')}
                  </p>
                </div>

                {/* Sync All Option */}
                <div className="p-4 bg-default-50 dark:bg-default-100/10 rounded-lg">
                  <Checkbox
                    isSelected={syncAll}
                    onValueChange={toggleSyncAll}
                    classNames={{
                      label: 'text-sm',
                    }}
                  >
                    <div>
                      <span className="font-medium">
                        {t('Sync everything')}
                      </span>
                      <p className="text-xs text-default-400 mt-0.5">
                        {t(
                          'All files and folders will be synced automatically',
                        )}
                      </p>
                    </div>
                  </Checkbox>
                </div>

                {/* Folder Tree */}
                {!syncAll && (
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
                        <Icon
                          name="Folder"
                          className="w-8 h-8 mx-auto mb-2 opacity-50"
                        />
                        <p className="text-sm">{t('No folders found')}</p>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {folders.map((folder) => renderFolder(folder))}
                      </div>
                    )}
                  </ScrollShadow>
                )}

                {/* Selection Summary */}
                {!syncAll && selectedIds.size > 0 && (
                  <p className="text-xs text-default-500 text-center">
                    {t('{n} folders selected', { n: selectedIds.size })}
                  </p>
                )}
              </div>
            </ModalBody>

            <ModalFooter>
              <Button variant="flat" onPress={onClose}>
                {t('Cancel')}
              </Button>
              <Button color="primary" onPress={handleSave} isLoading={isSaving}>
                {t('Save')}
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  )
}

export default ConnectorSettingsModal
