import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { Button, Chip, Card, CardBody, Spinner } from '@heroui/react'
import { Folder, Plus, RefreshDouble } from 'iconoir-react'

import { Title, Icon } from '@/components'
import { useI18n } from '@/i18n'
import { useConnectorStore } from '@/features/connectors/stores'
import {
  ConnectorCard,
  ConnectorWizard,
  ConnectorSettingsModal,
} from '@/features/connectors/components'
import { successToast, warningToast } from '@/lib/toast'
import { notifyError } from '@/features/notifications'
import {
  getAllWatchers,
  watchFolder,
  unwatchFolder,
  reconnectFolder,
  onWatchersChanged,
  onSyncEvent,
  deleteFilesByWatchId,
  type FolderWatcher,
  type SyncEvent,
} from '@/lib/knowledge-sync'
import type { Connector } from '@/features/connectors/types'
import localI18n from './i18n'

/**
 * Sources Component
 *
 * Unified management of all sync sources:
 * - Local synced folders (File System API)
 * - Connected app connectors (Google Drive, Notion, etc.)
 */
export const Sources: React.FC = () => {
  const { t } = useI18n(localI18n)

  // Connector store
  const {
    connectors,
    isLoading: isConnectorsLoading,
    isInitialized,
    initialize: initializeConnectors,
    getAppConnectors,
    deleteConnector,
    validateConnectorTokens,
  } = useConnectorStore()

  // Local state
  const [watchedFolders, setWatchedFolders] = useState<FolderWatcher[]>([])
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'error'>(
    'idle',
  )
  const [showWizard, setShowWizard] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [selectedConnector, setSelectedConnector] = useState<Connector | null>(
    null,
  )
  const [unwatchingFolderId, setUnwatchingFolderId] = useState<string | null>(
    null,
  )
  const [showUnwatchConfirm, setShowUnwatchConfirm] = useState(false)

  // Connected app connectors
  const appConnectors = useMemo(
    () => getAppConnectors(),
    [connectors, getAppConnectors],
  )

  // Keep a stable reference to t for use in effects
  const tRef = useRef(t)
  tRef.current = t

  // Load watched folders (stable callback)
  const loadWatchedFolders = useCallback(() => {
    setWatchedFolders(getAllWatchers())
  }, [])

  // Initialize
  useEffect(() => {
    if (!isInitialized) {
      initializeConnectors()
    }
    loadWatchedFolders()

    // Validate connector tokens after initialization
    // This checks if tokens have expired and updates status accordingly
    if (isInitialized) {
      validateConnectorTokens()
    }

    // Subscribe to watcher changes
    const unsubscribeWatchers = onWatchersChanged(() => {
      loadWatchedFolders()
    })

    // Subscribe to sync events
    const unsubscribeSync = onSyncEvent((event: SyncEvent) => {
      switch (event.type) {
        case 'sync_start':
          setSyncStatus('syncing')
          break
        case 'sync_complete':
          setSyncStatus('idle')
          if (event.fileCount && event.fileCount > 0) {
            successToast(
              tRef.current('Synced {n} files', { n: event.fileCount }),
            )
          }
          break
        case 'sync_error':
          setSyncStatus('error')
          notifyError({
            title: 'Sync Error',
            description: tRef.current('Sync error: {error}', {
              error: event.error,
            }),
          })
          break
      }
    })

    return () => {
      unsubscribeWatchers()
      unsubscribeSync()
    }
  }, [
    isInitialized,
    initializeConnectors,
    loadWatchedFolders,
    validateConnectorTokens,
  ])

  // Add local folder
  const handleAddFolder = async () => {
    if (!window.showDirectoryPicker) {
      warningToast(
        t(
          'Directory picker is not supported in this browser. Please use a modern browser like Chrome or Edge.',
        ),
      )
      return
    }

    try {
      setSyncStatus('syncing')
      const dirHandle = await window.showDirectoryPicker()
      await watchFolder(dirHandle as any)
      loadWatchedFolders()
      setSyncStatus('idle')
      successToast(
        t('Folder "{name}" is now being synced.', { name: dirHandle.name }),
      )
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        setSyncStatus('idle')
        return
      }
      console.error('Directory picker error:', error)
      setSyncStatus('error')
    }
  }

  // Stop watching folder
  const handleStopWatching = (watcherId: string) => {
    setUnwatchingFolderId(watcherId)
    setShowUnwatchConfirm(true)
  }

  const confirmStopWatching = async (keepFiles: boolean) => {
    if (!unwatchingFolderId) return

    try {
      if (!keepFiles) {
        await deleteFilesByWatchId(unwatchingFolderId)
      }
      await unwatchFolder(unwatchingFolderId)
      loadWatchedFolders()
      successToast(t('Folder sync stopped'))
    } catch (error) {
      console.error('Failed to stop watching folder:', error)
      notifyError({
        title: 'Folder Sync Error',
        description: t('Failed to stop watching folder'),
      })
    } finally {
      setUnwatchingFolderId(null)
      setShowUnwatchConfirm(false)
    }
  }

  // Reconnect folder
  const handleReconnect = async (watcherId: string) => {
    try {
      setSyncStatus('syncing')
      await reconnectFolder(watcherId)
      loadWatchedFolders()
      setSyncStatus('idle')
      successToast(t('Folder reconnected'))
    } catch (error) {
      console.error('Failed to reconnect folder:', error)
      setSyncStatus('error')
      notifyError({
        title: 'Reconnect Failed',
        description: t('Failed to reconnect folder'),
      })
    }
  }

  // Disconnect connector
  const handleDisconnect = async (connector: Connector) => {
    await deleteConnector(connector.id)
    successToast(t('Connector disconnected'))
  }

  // Open connector settings
  const handleSettings = (connector: Connector) => {
    setSelectedConnector(connector)
    setShowSettings(true)
  }

  const hasAnySources = watchedFolders.length > 0 || appConnectors.length > 0
  const isLoading = isConnectorsLoading && !isInitialized

  return (
    <div className="py-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <p className="text-default-500">
            {t(
              'Manage synced folders and connected apps that import content into your knowledge base.',
            )}
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <Spinner size="lg" />
        </div>
      ) : !hasAnySources ? (
        <EmptyState
          onAddFolder={handleAddFolder}
          onAddConnector={() => setShowWizard(true)}
        />
      ) : (
        <div className="space-y-8">
          {/* Local Folders Section */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <Title level={2}>
                <Icon name="Folder" className="inline w-5 h-5 mr-2" />
                {t('Local Folders')}
                {watchedFolders.length > 0 && (
                  <span className="ml-2 text-lg text-default-500">
                    ({watchedFolders.length})
                  </span>
                )}
              </Title>
              <Button
                size="sm"
                variant="flat"
                startContent={<Plus className="w-4 h-4" />}
                onPress={handleAddFolder}
              >
                {t('Add Folder')}
              </Button>
            </div>

            {syncStatus !== 'idle' && (
              <Chip
                color={syncStatus === 'syncing' ? 'primary' : 'danger'}
                size="sm"
                variant="flat"
                className="mb-3"
              >
                {syncStatus === 'syncing' ? t('Syncing…') : t('Sync Error')}
              </Chip>
            )}

            {watchedFolders.length === 0 ? (
              <Card className="bg-default-50">
                <CardBody className="py-8 text-center">
                  <Folder className="w-10 h-10 mx-auto mb-3 text-default-300" />
                  <p className="text-default-500 text-sm">
                    {t('No local folders synced yet.')}
                  </p>
                  <Button
                    size="sm"
                    variant="light"
                    color="primary"
                    className="mt-3"
                    onPress={handleAddFolder}
                  >
                    {t('Sync a folder')}
                  </Button>
                </CardBody>
              </Card>
            ) : (
              <div className="space-y-2">
                {watchedFolders.map((watcher) => (
                  <FolderCard
                    key={watcher.id}
                    watcher={watcher}
                    onStopWatching={() => handleStopWatching(watcher.id)}
                    onReconnect={() => handleReconnect(watcher.id)}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Connected Apps Section */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <Title level={2}>
                <Icon name="Puzzle" className="inline w-5 h-5 mr-2" />
                {t('Connected Apps')}
                {appConnectors.length > 0 && (
                  <span className="ml-2 text-lg text-default-500">
                    ({appConnectors.length})
                  </span>
                )}
              </Title>
              <Button
                size="sm"
                variant="flat"
                startContent={<Plus className="w-4 h-4" />}
                onPress={() => setShowWizard(true)}
              >
                {t('Add App')}
              </Button>
            </div>

            {appConnectors.length === 0 ? (
              <Card className="bg-default-50">
                <CardBody className="py-8 text-center">
                  <Icon
                    name="Puzzle"
                    className="w-10 h-10 mx-auto mb-3 text-default-300"
                  />
                  <p className="text-default-500 text-sm">
                    {t('No apps connected yet.')}
                  </p>
                  <Button
                    size="sm"
                    variant="light"
                    color="primary"
                    className="mt-3"
                    onPress={() => setShowWizard(true)}
                  >
                    {t('Connect an app')}
                  </Button>
                </CardBody>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {appConnectors.map((connector) => (
                  <ConnectorCard
                    key={connector.id}
                    connector={connector}
                    onClick={() => handleSettings(connector)}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {/* Unwatch Confirmation Modal */}
      {showUnwatchConfirm && (
        <UnwatchConfirmModal
          onKeepFiles={() => confirmStopWatching(true)}
          onDeleteFiles={() => confirmStopWatching(false)}
          onCancel={() => {
            setShowUnwatchConfirm(false)
            setUnwatchingFolderId(null)
          }}
        />
      )}

      {/* Add Connector Wizard */}
      {showWizard && (
        <ConnectorWizard
          isOpen={showWizard}
          onClose={() => setShowWizard(false)}
          category="app"
        />
      )}

      {/* Connector Settings Modal */}
      <ConnectorSettingsModal
        isOpen={showSettings}
        onClose={() => {
          setShowSettings(false)
          setSelectedConnector(null)
        }}
        connector={selectedConnector}
        onDisconnect={(connectorId) => {
          const connector = appConnectors.find((c) => c.id === connectorId)
          if (connector) {
            handleDisconnect(connector)
            setShowSettings(false)
            setSelectedConnector(null)
          }
        }}
      />
    </div>
  )
}

/**
 * Empty state when no sources configured
 */
function EmptyState({
  onAddFolder,
  onAddConnector,
}: {
  onAddFolder: () => void
  onAddConnector: () => void
}) {
  const { t } = useI18n(localI18n)

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center mb-4">
        <RefreshDouble className="w-8 h-8 text-primary-500" />
      </div>
      <h3 className="text-lg font-medium mb-2">{t('No sync sources yet')}</h3>
      <p className="text-default-500 max-w-md mb-6">
        {t(
          'Add local folders or connect apps like Google Drive and Notion to automatically sync content to your knowledge base.',
        )}
      </p>
      <div className="flex gap-3">
        <Button
          variant="flat"
          onPress={onAddFolder}
          startContent={<Folder className="w-4 h-4" />}
        >
          {t('Sync a folder')}
        </Button>
        <Button
          color="primary"
          onPress={onAddConnector}
          startContent={<Plus className="w-4 h-4" />}
        >
          {t('Connect an app')}
        </Button>
      </div>
    </div>
  )
}

/**
 * Folder card component
 */
function FolderCard({
  watcher,
  onStopWatching,
  onReconnect,
}: {
  watcher: FolderWatcher
  onStopWatching: () => void
  onReconnect: () => void
}) {
  const { t } = useI18n(localI18n)

  return (
    <div className="flex items-center justify-between p-3 bg-default-50 rounded-lg">
      <div className="flex items-center space-x-3">
        <div className="relative">
          <Folder
            className={`w-5 h-5 ${watcher.isActive ? 'text-warning' : 'text-default-400'}`}
          />
          <div
            className={`absolute -top-1 -end-1 w-3 h-3 rounded-full ${
              watcher.isActive ? 'bg-success' : 'bg-danger'
            }`}
          />
        </div>
        <div>
          <p
            className={`font-medium ${watcher.isActive ? '' : 'text-default-500'}`}
          >
            {watcher.basePath}
          </p>
          <p className="text-sm text-default-500">
            {watcher.isActive
              ? t('Last sync: {time}', {
                  time: watcher.lastSync.toLocaleTimeString(),
                })
              : t('Disconnected')}
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        {watcher.isActive ? (
          <Button
            size="sm"
            variant="light"
            color="danger"
            onPress={onStopWatching}
          >
            {t('Stop syncing')}
          </Button>
        ) : (
          <>
            <Button
              size="sm"
              variant="light"
              color="primary"
              onPress={onReconnect}
            >
              {watcher.directoryHandle ? t('Grant Access') : t('Reconnect')}
            </Button>
            <Button
              size="sm"
              variant="light"
              color="danger"
              onPress={onStopWatching}
            >
              {t('Remove')}
            </Button>
          </>
        )}
      </div>
    </div>
  )
}

/**
 * Unwatch confirmation modal
 */
function UnwatchConfirmModal({
  onKeepFiles,
  onDeleteFiles,
  onCancel,
}: {
  onKeepFiles: () => void
  onDeleteFiles: () => void
  onCancel: () => void
}) {
  const { t } = useI18n(localI18n)

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="max-w-md">
        <CardBody className="p-6">
          <h3 className="text-lg font-semibold mb-2">
            {t('Stop Syncing Folder')}
          </h3>
          <p className="text-default-500 mb-6">
            {t('Do you want to keep the synced files in your knowledge base?')}
          </p>
          <div className="flex gap-3 justify-end">
            <Button variant="flat" onPress={onCancel}>
              {t('Cancel')}
            </Button>
            <Button variant="flat" color="danger" onPress={onDeleteFiles}>
              {t('Delete Files')}
            </Button>
            <Button color="primary" onPress={onKeepFiles}>
              {t('Keep Files')}
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}
