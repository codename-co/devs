/**
 * ConnectorSettingsInline Component
 *
 * Inline (non-modal) version of ConnectorSettingsModal for embedding
 * within the Settings modal. Displays connector account info, tools,
 * sync settings, and disconnect option.
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
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
import { useSettingsLabel } from '@/pages/Settings/SettingsContext'
import { CustomRadio } from '@/features/sync/components/CustomRadio'

// =============================================================================
// Types
// =============================================================================

interface ConnectorSettingsInlineProps {
  connector: Connector
  onClose: () => void
  onDisconnect?: (connectorId: string) => void
  onReconnect?: (connector: Connector) => void
}

interface FolderNode extends ConnectorItem {
  children?: FolderNode[]
  isExpanded?: boolean
  isLoading?: boolean
}

// =============================================================================
// Component
// =============================================================================

export function ConnectorSettingsInline({
  connector,
  onClose,
  onDisconnect,
  onReconnect,
}: ConnectorSettingsInlineProps) {
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
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false)

  const provider = connector.provider as AppConnectorProvider | undefined
  const config = provider ? getProvider(provider) : null
  const isUrlInputMode = config?.folderPickerType === 'url-input'

  // Push connector name + icon into the Settings header breadcrumb
  useSettingsLabel(config?.name || connector.name, config?.icon as any)

  // Get selected folder names for summary
  const selectedFolderNames = useMemo(() => {
    if (syncAll || selectedIds.size === 0) return []
    return folders
      .filter((f) => selectedIds.has(f.externalId))
      .map((f) => f.name)
  }, [folders, selectedIds, syncAll])

  // Initialize state from connector
  useEffect(() => {
    setSyncEnabled(connector.syncEnabled)
    if (connector.syncFolders && connector.syncFolders.length > 0) {
      setSyncAll(false)
      setSelectedIds(new Set(connector.syncFolders))
      if (isUrlInputMode) {
        setUrlInput(connector.syncFolders.join('\n'))
      }
    } else {
      setSyncAll(true)
      setSelectedIds(new Set())
      setUrlInput('')
    }
  }, [connector.id, isUrlInputMode])

  // Helper to refresh token and update connector
  const refreshAndUpdateToken = useCallback(
    async (
      providerInstance: AppConnectorProviderInterface,
      currentConnector: Connector,
    ): Promise<Connector> => {
      if (!currentConnector.encryptedRefreshToken) {
        throw new Error('NO_REFRESH_TOKEN')
      }

      infoToast(t('Refreshing access token...'), t('Please wait'))

      const refreshResult =
        await providerInstance.refreshToken(currentConnector)

      await SecureStorage.init()
      const {
        encrypted: encryptedToken,
        iv,
        salt,
      } = await SecureStorage.encryptCredential(refreshResult.accessToken)

      const tokenExpiresAt = refreshResult.expiresIn
        ? new Date(Date.now() + refreshResult.expiresIn * 1000)
        : undefined

      await updateConnector(currentConnector.id, {
        encryptedToken,
        tokenExpiresAt,
        status: 'connected',
        errorMessage: undefined,
      })

      storeEncryptionMetadata(currentConnector.id, iv, salt, false)

      return {
        ...currentConnector,
        encryptedToken,
        tokenExpiresAt,
        status: 'connected',
      }
    },
    [updateConnector, t],
  )

  // Fetch folders when component mounts
  useEffect(() => {
    const fetchFolders = async () => {
      if (!connector || !provider) return

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

        try {
          const result = await providerInstance.list(currentConnector, {
            filter: { mimeType: 'application/vnd.google-apps.folder' },
          })

          const folderNodes: FolderNode[] = result.items
            .filter((item: ConnectorItem) => item.type === 'folder')
            .map((item: ConnectorItem) => ({
              ...item,
              isExpanded: false,
              isLoading: false,
            }))

          setFolders(folderNodes)
        } catch (fetchErr) {
          if (fetchErr instanceof AuthenticationError) {
            try {
              currentConnector = await refreshAndUpdateToken(
                providerInstance,
                currentConnector,
              )

              const result = await providerInstance.list(currentConnector, {
                filter: { mimeType: 'application/vnd.google-apps.folder' },
              })

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
              const isNoRefreshToken =
                refreshErr instanceof Error &&
                (refreshErr.message === 'NO_REFRESH_TOKEN' ||
                  refreshErr.message.includes('No refresh token'))

              setError(
                isNoRefreshToken
                  ? t(
                      'Your session has expired. Please disconnect and reconnect this service. To avoid this in the future, revoke access at myaccount.google.com/permissions before reconnecting.',
                    )
                  : t('Your access token has expired. Please reconnect.'),
              )
              setIsTokenExpired(true)

              await updateConnector(connector.id, {
                status: 'expired',
                errorMessage: isNoRefreshToken
                  ? 'No refresh token available - reconnection required'
                  : 'Token refresh failed',
              })
            }
          } else {
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
  }, [connector.id, provider, isUrlInputMode])

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

  // Parse URL input
  const parseUrlInput = useCallback((input: string): string[] => {
    return input
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
  }, [])

  const parsedUrls = useMemo(
    () => parseUrlInput(urlInput),
    [urlInput, parseUrlInput],
  )

  // Save settings
  const handleSave = useCallback(async () => {
    setIsSaving(true)
    try {
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

  return (
    <div className="flex flex-col h-full">
      {/* Content */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-4">
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

        {/* Available Tools */}
        {connector.provider &&
          (() => {
            const tools = getToolDefinitionsForProvider(connector.provider)
            if (tools.length === 0) return null

            return (
              <Accordion variant="light" className="px-0" isCompact>
                <AccordionItem
                  key="tools"
                  aria-label={t('Agent Tools')}
                  title={
                    <div className="flex items-center gap-2">
                      <Icon name="Puzzle" size="sm" className="text-primary" />
                      <span className="text-sm font-medium">
                        {t('Agent Tools')}
                      </span>
                    </div>
                  }
                  subtitle={
                    <span className="text-xs text-default-400">
                      {t('{n} tools available for AI agents', {
                        n: tools.length,
                      })}
                    </span>
                  }
                >
                  <div className="space-y-1">
                    {tools.map((tool) => (
                      <div
                        key={tool.function.name}
                        className="flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-default-100"
                      >
                        <Icon
                          name="Terminal"
                          size="sm"
                          className="text-primary shrink-0 w-3 h-3"
                        />
                        <span className="text-xs font-mono text-default-700 truncate">
                          {tool.function.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </AccordionItem>
              </Accordion>
            )
          })()}

        <Divider />

        {/* Sync Settings */}
        <Accordion
          variant="light"
          className="px-0"
          defaultExpandedKeys={syncEnabled ? ['sync'] : []}
        >
          <AccordionItem
            key="sync"
            aria-label={t('Knowledge Base Sync')}
            title={
              <div className="flex items-center gap-2">
                <Icon
                  name="CloudDownload"
                  size="sm"
                  className={syncEnabled ? 'text-primary' : 'text-default-400'}
                />
                <span className="text-sm font-medium">
                  {t('Knowledge Base Sync')}
                </span>
                <Chip
                  size="sm"
                  variant="flat"
                  color={syncEnabled ? 'success' : 'default'}
                >
                  {syncEnabled ? t('Enabled') : t('Disabled')}
                </Chip>
              </div>
            }
            subtitle={
              <span className="text-xs text-default-400">
                {t('Optionally sync content to your knowledge base')}
              </span>
            }
          >
            <div className="space-y-4 pt-2">
              {/* Sync Toggle */}
              <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-default-100">
                <div>
                  <p className="text-sm font-medium">
                    {t('Enable Automatic Sync')}
                  </p>
                  <p className="text-xs text-default-500">
                    {t('Automatically sync new and updated content')}
                  </p>
                </div>
                <Switch
                  isSelected={syncEnabled}
                  onValueChange={setSyncEnabled}
                  aria-label={t('Enable Sync')}
                />
              </div>

              {/* Folder/URL Selection */}
              {syncEnabled && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{t('Sync Settings')}</p>
                    {isUrlInputMode
                      ? parsedUrls.length > 0 && (
                          <Chip size="sm" variant="flat" color="primary">
                            {t('{n} items to sync', {
                              n: parsedUrls.length,
                            })}
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
                                      onPress={() => onReconnect(connector)}
                                      startContent={
                                        <Icon name="RefreshDouble" size="sm" />
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
              )}
            </div>
          </AccordionItem>
        </Accordion>

        {/* Disconnect Section */}
        {onDisconnect && (
          <>
            <Divider />
            <div className="space-y-3">
              {!showDisconnectConfirm ? (
                <Button
                  variant="light"
                  color="danger"
                  className="w-full"
                  startContent={<Icon name="Xmark" className="w-4 h-4" />}
                  onPress={() => setShowDisconnectConfirm(true)}
                >
                  {t('Disconnect')}
                </Button>
              ) : (
                <Card
                  shadow="none"
                  className="bg-danger-50 dark:bg-danger-900/20"
                >
                  <CardBody className="p-4 space-y-3">
                    <p className="text-sm text-danger">
                      {t(
                        'Are you sure you want to disconnect this service? This will remove all synced data.',
                      )}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="flat"
                        onPress={() => setShowDisconnectConfirm(false)}
                      >
                        {t('Cancel')}
                      </Button>
                      <Button
                        size="sm"
                        color="danger"
                        onPress={() => onDisconnect(connector.id)}
                      >
                        {t('Disconnect')}
                      </Button>
                    </div>
                  </CardBody>
                </Card>
              )}
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="flex justify-end gap-2 pt-4 border-t border-default-200 mt-4">
        <Button variant="flat" size="sm" onPress={onClose}>
          {t('Close')}
        </Button>
        <Button
          color="primary"
          size="sm"
          onPress={handleSave}
          isLoading={isSaving}
        >
          {t('Save')}
        </Button>
      </div>
    </div>
  )
}
