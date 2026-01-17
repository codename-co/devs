/**
 * ConnectorSettingsModal Component
 *
 * Modal for editing connector settings, particularly folder sync configuration.
 * Uses the existing stored authentication rather than re-authenticating.
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
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
  Accordion,
  AccordionItem,
  Chip,
  Card,
  CardBody,
  RadioGroup,
  Textarea,
  Avatar,
} from '@heroui/react'
import { Icon } from '@/components'
import { useI18n } from '@/i18n'
import { useConnectorStore } from '../stores'
import { ProviderRegistry } from '../provider-registry'
import { getProvider } from '../providers/apps'
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
import { getToolDefinitionsForProvider } from '../tools'
import localI18n from '../pages/i18n'
import { CustomRadio } from '@/features/sync/components/CustomRadio'

// =============================================================================
// Types
// =============================================================================

interface ConnectorSettingsModalProps {
  isOpen: boolean
  onClose: () => void
  onReconnect?: (connector: Connector) => void
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
  onReconnect,
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
  const [isTokenExpired, setIsTokenExpired] = useState(false)
  const [urlInput, setUrlInput] = useState('')

  const provider = connector?.provider as AppConnectorProvider | undefined
  const config = provider ? getProvider(provider) : null
  const isUrlInputMode = config?.folderPickerType === 'url-input'

  // Get selected folder names for summary
  const selectedFolderNames = useMemo(() => {
    if (syncAll || selectedIds.size === 0) return []
    return folders
      .filter((f) => selectedIds.has(f.externalId))
      .map((f) => f.name)
  }, [folders, selectedIds, syncAll])

  // Initialize state from connector
  useEffect(() => {
    if (connector) {
      setSyncEnabled(connector.syncEnabled)
      if (connector.syncFolders && connector.syncFolders.length > 0) {
        setSyncAll(false)
        setSelectedIds(new Set(connector.syncFolders))
        // For URL input mode, initialize the textarea with existing URLs
        if (isUrlInputMode) {
          setUrlInput(connector.syncFolders.join('\n'))
        }
      } else {
        setSyncAll(true)
        setSelectedIds(new Set())
        setUrlInput('')
      }
    }
    // Only re-initialize when connector ID changes
  }, [connector?.id, isUrlInputMode])

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

  // Fetch folders when modal opens (only for tree mode, not URL input mode)
  useEffect(() => {
    const fetchFolders = async () => {
      if (!isOpen || !connector || !provider) return

      // Skip fetching for URL input mode
      if (isUrlInputMode) {
        setIsLoading(false)
        return
      }

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
              setIsTokenExpired(true)

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
  }, [isOpen, connector?.id, provider, isUrlInputMode])

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
      setUrlInput('')
    }
  }, [])

  // Parse URL input into array of IDs/URLs
  const parseUrlInput = useCallback((input: string): string[] => {
    return input
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
  }, [])

  // Get parsed URLs count for display
  const parsedUrls = useMemo(
    () => parseUrlInput(urlInput),
    [urlInput, parseUrlInput],
  )

  // Save settings
  const handleSave = useCallback(async () => {
    if (!connector) return

    setIsSaving(true)
    try {
      // For URL input mode, parse the textarea content
      let syncFoldersValue: string[] | undefined
      if (isUrlInputMode) {
        syncFoldersValue = parsedUrls.length > 0 ? parsedUrls : undefined
      } else {
        syncFoldersValue = syncAll ? undefined : Array.from(selectedIds)
      }

      await updateConnector(connector.id, {
        syncEnabled,
        syncFolders: syncFoldersValue,
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
    isUrlInputMode,
    parsedUrls,
    updateConnector,
    onClose,
    t,
  ])

  // Render a folder item
  const renderFolder = useCallback(
    (folder: FolderNode) => {
      const isSelected = selectedIds.has(folder.externalId)

      return (
        <Checkbox
          key={folder.externalId}
          isSelected={isSelected}
          onValueChange={() => toggleFolder(folder.externalId)}
          classNames={{
            base: 'max-w-full w-full m-0 p-2 rounded-lg hover:bg-default-100 cursor-pointer',
            label: 'w-full',
          }}
        >
          <div className="flex items-center gap-2">
            <Icon name="Folder" className="text-warning" size="sm" />
            <span className="text-sm truncate">{folder.name}</span>
          </div>
        </Checkbox>
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

            <ModalBody className="gap-4">
              {/* Account Info */}
              {connector.accountEmail && (
                <Card shadow="none" className="bg-default-100">
                  <CardBody className="flex-row items-center gap-3">
                    {connector.accountPicture ? (
                      <Avatar src={connector.accountPicture} size="sm" />
                    ) : (
                      <Icon name="User" className="w-5 h-5 text-default-500" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {connector.accountEmail}
                      </p>
                      <p className="text-xs text-default-500">
                        {t('Connected Account')}
                      </p>
                    </div>
                    {connector.status === 'connected' && (
                      <Chip size="sm" color="success" variant="flat">
                        {t('Connected')}
                      </Chip>
                    )}
                    {connector.status === 'expired' && (
                      <Chip size="sm" color="danger" variant="flat">
                        {t('Expired')}
                      </Chip>
                    )}
                  </CardBody>
                </Card>
              )}

              {/* Sync Toggle */}
              <Card shadow="none" className="bg-default-100">
                <CardBody className="flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Icon
                      name="CloudDownload"
                      size="lg"
                      className={
                        'mx-1 ' +
                        (syncEnabled ? 'text-primary' : 'text-default-400')
                      }
                    />
                    <div>
                      <p className="font-medium">
                        {t('Enable Automatic Sync')}
                      </p>
                      <p className="text-xs text-default-500">
                        {t('Automatically sync new and updated content')}
                      </p>
                    </div>
                  </div>
                  <Switch
                    isSelected={syncEnabled}
                    onValueChange={setSyncEnabled}
                    aria-label={t('Enable Sync')}
                  />
                </CardBody>
              </Card>

              {/* Folder/URL Selection - Only shown when sync is enabled */}
              {syncEnabled && (
                <>
                  <Divider />
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{t('Sync Settings')}</p>
                      {isUrlInputMode
                        ? parsedUrls.length > 0 && (
                            <Chip size="sm" variant="flat" color="primary">
                              {t('{n} items to sync', { n: parsedUrls.length })}
                            </Chip>
                          )
                        : !syncAll &&
                          selectedIds.size > 0 && (
                            <Chip size="sm" variant="flat" color="primary">
                              {t('{n} folders selected', {
                                n: selectedIds.size,
                              })}
                            </Chip>
                          )}
                    </div>

                    {/* URL Input Mode (for Figma, etc.) */}
                    {isUrlInputMode ? (
                      <div className="space-y-3">
                        <p className="text-sm text-default-500">
                          {t('Paste file URLs or IDs from {name} to sync.', {
                            name: config?.name || provider,
                          })}
                        </p>
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
                          {config?.urlInputHelp ||
                            t('Enter file URLs or IDs, one per line')}
                        </p>
                      </div>
                    ) : (
                      <>
                        <RadioGroup
                          value={syncAll ? 'all' : 'select'}
                          onValueChange={(value) =>
                            toggleSyncAll(value === 'all')
                          }
                        >
                          <CustomRadio
                            size="sm"
                            value="all"
                            description={t(
                              'All files and folders will be synced automatically',
                            )}
                          >
                            {t('Sync everything')}
                          </CustomRadio>
                          <CustomRadio
                            size="sm"
                            value="select"
                            description={t(
                              'Choose which folders to sync or sync everything',
                            )}
                          >
                            {t('Select Folders')}
                          </CustomRadio>
                        </RadioGroup>

                        {/* Folder Tree - Shown when selecting specific folders */}
                        {!syncAll && (
                          <Card shadow="none" className="bg-default-50">
                            <CardBody className="p-3">
                              <ScrollShadow className="max-h-48">
                                {isLoading ? (
                                  <div className="flex flex-col items-center justify-center py-6 gap-2">
                                    <Spinner size="sm" />
                                    <span className="text-sm text-default-500">
                                      {t('Loading folders...')}
                                    </span>
                                  </div>
                                ) : error ? (
                                  <div className="flex flex-col items-center justify-center py-6 gap-3 text-center">
                                    <Icon
                                      name="WarningTriangle"
                                      className="w-8 h-8 text-danger"
                                    />
                                    <div>
                                      <p className="text-sm text-danger font-medium">
                                        {t('Connection failed')}
                                      </p>
                                      <p className="text-xs text-default-500 mt-1">
                                        {error}
                                      </p>
                                    </div>
                                    {isTokenExpired && onReconnect && (
                                      <Button
                                        color="primary"
                                        size="sm"
                                        onPress={() => {
                                          onClose()
                                          onReconnect(connector)
                                        }}
                                        startContent={
                                          <Icon
                                            name="RefreshDouble"
                                            size="sm"
                                          />
                                        }
                                      >
                                        {t('Reconnect')}
                                      </Button>
                                    )}
                                  </div>
                                ) : folders.length === 0 ? (
                                  <div className="flex flex-col items-center justify-center py-6 text-default-400 gap-2">
                                    <Icon
                                      name="Folder"
                                      className="w-8 h-8 opacity-50"
                                    />
                                    <p className="text-sm">
                                      {t('No folders found')}
                                    </p>
                                  </div>
                                ) : (
                                  <div className="space-y-1">
                                    {folders.map((folder) =>
                                      renderFolder(folder),
                                    )}
                                  </div>
                                )}
                              </ScrollShadow>

                              {/* Selected folders summary */}
                              {!isLoading &&
                                !error &&
                                selectedFolderNames.length > 0 && (
                                  <>
                                    <Divider className="my-3" />
                                    <div className="flex flex-wrap gap-1">
                                      {selectedFolderNames
                                        .slice(0, 5)
                                        .map((name) => (
                                          <Chip
                                            key={name}
                                            size="sm"
                                            variant="flat"
                                          >
                                            {name}
                                          </Chip>
                                        ))}
                                      {selectedFolderNames.length > 5 && (
                                        <Chip size="sm" variant="flat">
                                          +{selectedFolderNames.length - 5}
                                        </Chip>
                                      )}
                                    </div>
                                  </>
                                )}
                            </CardBody>
                          </Card>
                        )}
                      </>
                    )}
                  </div>
                </>
              )}

              {/* Available Tools */}
              {connector.provider &&
                (() => {
                  const tools = getToolDefinitionsForProvider(
                    connector.provider,
                  )
                  if (tools.length === 0) return null
                  return (
                    <>
                      <Divider />
                      <Accordion variant="light" className="px-0">
                        <AccordionItem
                          key="tools"
                          aria-label={t('Available Tools')}
                          title={
                            <div className="flex items-center gap-2">
                              <Icon
                                name="Puzzle"
                                size="sm"
                                className="text-default-400"
                              />
                              <span className="text-sm font-medium">
                                {t('Available Tools')}
                              </span>
                              <Chip size="sm" variant="flat">
                                {tools.length}
                              </Chip>
                            </div>
                          }
                        >
                          <div className="space-y-2">
                            {tools.map((tool) => (
                              <div
                                key={tool.function.name}
                                className="flex items-start gap-2 p-2 rounded-lg bg-default-100"
                              >
                                <Icon
                                  name="Terminal"
                                  size="sm"
                                  className="text-default-400 mt-0.5"
                                />
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-medium font-mono truncate">
                                    {tool.function.name}
                                  </p>
                                  <p className="text-xs text-default-500 line-clamp-1">
                                    {tool.function.description}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </AccordionItem>
                      </Accordion>
                    </>
                  )
                })()}
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
