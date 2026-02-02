/**
 * Local Backup Button Component
 *
 * Header icon button with popover for local backup settings
 * Icon states:
 * - FloppyDisk: Disabled
 * - RefreshDouble: Enabled
 * - RefreshDouble + spinning: Syncing
 */
import {
  Button,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Popover,
  PopoverContent,
} from '@heroui/react'
import { useState, useEffect, useCallback } from 'react'

import '../types/file-system.d'
import {
  useFolderSyncStore,
  tryReconnectFolderSync,
} from '../stores/folderSyncStore'
import { Icon } from '@/components/Icon'
import { PageMenuButton } from '@/components/PageMenuButton'
import { PageMenuPanel } from '@/components/PageMenuPanel'
import { useI18n } from '@/i18n'
import { localI18n } from '../i18n'
import * as yjsMaps from '@/lib/yjs/maps'

/**
 * Check if File System Access API is supported
 */
function isFileSystemAccessSupported(): boolean {
  return 'showDirectoryPicker' in window
}

export function LocalBackupButton() {
  const { t, lang } = useI18n(localI18n)
  const {
    isEnabled,
    isInitializing,
    isSyncing,
    error,
    basePath,
    lastSync,
    syncStats,
    syncAgents,
    syncConversations,
    syncMemories,
    syncKnowledge,
    syncTasks,
    syncStudio,
    syncFullExport,
    enableSync,
    disableSync,
    triggerSync,
    updateSyncOptions,
    clearError,
  } = useFolderSyncStore()

  const [needsPermission, setNeedsPermission] = useState(false)
  const [pendingHandle, setPendingHandle] =
    useState<FileSystemDirectoryHandle | null>(null)
  const [isPopoverOpen, setIsPopoverOpen] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)

  // Check if we need to use the download fallback (Safari, Firefox, etc.)
  const useFallbackDownload = !isFileSystemAccessSupported()

  // Try to reconnect on mount
  useEffect(() => {
    if (isEnabled && !basePath) {
      tryReconnectFolderSync().then((success) => {
        if (!success && isEnabled) {
          setNeedsPermission(true)
        }
      })
    }
  }, [isEnabled, basePath])

  // Handle folder selection
  const handleSelectFolder = useCallback(async () => {
    if (!isFileSystemAccessSupported() || !window.showDirectoryPicker) {
      return
    }

    try {
      const directoryHandle = await window.showDirectoryPicker({
        mode: 'readwrite',
        startIn: 'documents',
      })

      // Check permission
      const permission = await directoryHandle.queryPermission({
        mode: 'readwrite',
      })

      if (permission === 'granted') {
        await enableSync(directoryHandle)
        setNeedsPermission(false)
      } else if (permission === 'prompt') {
        setPendingHandle(directoryHandle)
        setNeedsPermission(true)
      }
    } catch (err) {
      // User cancelled or error
      if ((err as DOMException).name !== 'AbortError') {
        console.error('Failed to select folder:', err)
      }
    }
  }, [enableSync])

  // Keyboard shortcut: Cmd+S (or Ctrl+S)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        if (isEnabled && !needsPermission) {
          triggerSync()
        } else if (!isEnabled) {
          handleSelectFolder()
        }
      }
    }

    // Use capture phase to ensure shortcut works even when focus is in form fields
    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [isEnabled, needsPermission, triggerSync, handleSelectFolder])

  // Handle permission grant
  const handleGrantPermission = useCallback(async () => {
    if (pendingHandle) {
      try {
        const permission = await pendingHandle.requestPermission({
          mode: 'readwrite',
        })
        if (permission === 'granted') {
          await enableSync(pendingHandle)
          setNeedsPermission(false)
          setPendingHandle(null)
        }
      } catch (err) {
        console.error('Failed to get permission:', err)
      }
    } else if (isEnabled) {
      // Try to reconnect with stored handle
      handleSelectFolder()
    }
  }, [pendingHandle, isEnabled, enableSync, handleSelectFolder])

  // Handle download fallback for browsers without File System Access API
  const handleDownloadBackup = useCallback(async () => {
    setIsDownloading(true)
    try {
      // Export all Yjs maps to JSON
      const exportData: Record<string, unknown[] | Record<string, unknown>> = {}
      const mapNames = [
        'agents',
        'conversations',
        'knowledge',
        'tasks',
        'artifacts',
        'memories',
        'preferences',
        'credentials',
        'studioEntries',
        'workflows',
        'battles',
        'pinnedMessages',
        'traces',
        'spans',
        'tracingConfig',
        'connectors',
        'connectorSyncStates',
        'notifications',
        'memoryLearningEvents',
        'agentMemoryDocuments',
        'sharedContexts',
        'installedExtensions',
        'customExtensions',
        'langfuseConfig',
      ] as const

      for (const mapName of mapNames) {
        try {
          const map = yjsMaps[mapName as keyof typeof yjsMaps]
          if (map && typeof map.toJSON === 'function') {
            const mapData = map.toJSON()
            // Convert map object to array for backward compatibility
            exportData[mapName] = Object.values(mapData)
          }
        } catch (error) {
          console.warn(`Failed to export map ${mapName}:`, error)
          exportData[mapName] = []
        }
      }

      // Add metadata
      const fullExportData = {
        _meta: {
          exportedAt: new Date().toISOString(),
          source: 'yjs',
          version: 1,
          maps: mapNames.length,
          compressed: true,
        },
        ...exportData,
      }

      const jsonString = JSON.stringify(fullExportData)

      // Compress using native CompressionStream (gzip)
      const stream = new Blob([jsonString]).stream()
      const compressedStream = stream.pipeThrough(new CompressionStream('gzip'))
      const compressedBlob = await new Response(compressedStream).blob()

      const url = URL.createObjectURL(compressedBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = `devs-backup-${new Date().toISOString().split('T')[0]}.json.gz`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Failed to download backup:', error)
    } finally {
      setIsDownloading(false)
    }
  }, [])

  // Build sync options value
  const syncOptionsValue: string[] = []
  if (syncAgents) syncOptionsValue.push('agents')
  if (syncConversations) syncOptionsValue.push('conversations')
  if (syncMemories) syncOptionsValue.push('memories')
  if (syncKnowledge) syncOptionsValue.push('knowledge')
  if (syncTasks) syncOptionsValue.push('tasks')
  if (syncStudio) syncOptionsValue.push('studio')
  if (syncFullExport) syncOptionsValue.push('fullExport')

  // Handle dropdown selection
  const handleSelectionChange = (keys: Set<string> | 'all') => {
    if (keys === 'all') {
      updateSyncOptions({
        syncAgents: true,
        syncConversations: true,
        syncMemories: true,
        syncKnowledge: true,
        syncTasks: true,
        syncStudio: true,
        syncFullExport: true,
      })
    } else {
      const selected = Array.from(keys)
      updateSyncOptions({
        syncAgents: selected.includes('agents'),
        syncConversations: selected.includes('conversations'),
        syncMemories: selected.includes('memories'),
        syncKnowledge: selected.includes('knowledge'),
        syncTasks: selected.includes('tasks'),
        syncStudio: selected.includes('studio'),
        syncFullExport: selected.includes('fullExport'),
      })
    }
  }

  // Determine tooltip text
  const getTooltipText = () => {
    if (isSyncing) return t('Backing up...')
    if (isEnabled) return t('Local Backup Active')
    return t('Local Backup')
  }

  // Get status text
  const getStatusText = () => {
    // if (isSyncing) return t('Backing up...')
    if (isEnabled) return t('Active')
    return t('Disabled')
  }

  // Get status color
  const getStatusColor = () => {
    if (isEnabled) return 'success'
    return 'default'
  }

  return (
    <Popover
      placement="bottom"
      isOpen={isPopoverOpen}
      onOpenChange={setIsPopoverOpen}
    >
      <PageMenuButton
        icon="FloppyDisk"
        tooltip={getTooltipText()}
        ariaLabel={t('Local Backup')}
        showBadge={isEnabled && !useFallbackDownload}
        badgePulsing={isSyncing}
        tooltipDisabled={isPopoverOpen}
        shortcutKeys={['command']}
        shortcutKey="S"
      />
      <PopoverContent>
        <PageMenuPanel
          title={t('Local Backup')}
          actions={
            !useFallbackDownload ? (
              <Dropdown>
                <DropdownTrigger>
                  <Button
                    size="sm"
                    variant="light"
                    isIconOnly
                    aria-label={t('What to backup:')}
                  >
                    <Icon name="ControlSlider" className="h-4 w-4" />
                  </Button>
                </DropdownTrigger>
                <DropdownMenu
                  aria-label={t('What to backup:')}
                  selectionMode="multiple"
                  selectedKeys={new Set(syncOptionsValue)}
                  onSelectionChange={(keys) =>
                    handleSelectionChange(keys as Set<string>)
                  }
                  closeOnSelect={false}
                >
                  <DropdownItem isDisabled key="what">
                    {t('What to backup:')}
                  </DropdownItem>
                  <DropdownItem
                    key="agents"
                    startContent={<Icon name="Sparks" className="h-4 w-4" />}
                  >
                    {t('Agents')}
                  </DropdownItem>
                  <DropdownItem
                    key="conversations"
                    startContent={
                      <Icon name="ChatBubble" className="h-4 w-4" />
                    }
                  >
                    {t('Conversations')}
                  </DropdownItem>
                  <DropdownItem
                    key="memories"
                    startContent={<Icon name="Brain" className="h-4 w-4" />}
                  >
                    {t('Memories')}
                  </DropdownItem>
                  <DropdownItem
                    key="knowledge"
                    startContent={<Icon name="Book" className="h-4 w-4" />}
                  >
                    {t('Knowledge')}
                  </DropdownItem>
                  <DropdownItem
                    key="tasks"
                    startContent={
                      <Icon name="TriangleFlagTwoStripes" className="h-4 w-4" />
                    }
                  >
                    {t('Tasks')}
                  </DropdownItem>
                  <DropdownItem
                    key="studio"
                    startContent={
                      <Icon name="MediaImage" className="h-4 w-4" />
                    }
                  >
                    {t('Studio')}
                  </DropdownItem>
                  <DropdownItem
                    key="fullExport"
                    startContent={
                      <Icon name="DatabaseExport" className="h-4 w-4" />
                    }
                  >
                    {t('Full Export')}
                  </DropdownItem>
                </DropdownMenu>
              </Dropdown>
            ) : undefined
          }
          status={
            isEnabled && !useFallbackDownload
              ? {
                  text: getStatusText(),
                  color: getStatusColor(),
                  tooltip: basePath || undefined,
                  onClose: disableSync,
                  closeLabel: t('Stop Backup'),
                }
              : undefined
          }
          description={
            useFallbackDownload
              ? t(
                  'Your browser does not support automatic folder sync. You can download a backup file instead.',
                )
              : !isEnabled && !needsPermission
                ? t(
                    'Your conversations are yours. Keep them safe on your device—no cloud surprises, no vanishing chats.',
                  )
                : undefined
          }
        >
          {/* Backup status when enabled - only for browsers with File System Access API */}
          {isEnabled && !needsPermission && !useFallbackDownload && (
            <div className="flex flex-col gap-2">
              {/* Last backup time */}
              {lastSync && (
                <div className="text-xs text-default-500">
                  {t('Last backup:')}{' '}
                  <span className="text-default-700 font-medium">
                    {new Date(lastSync).toLocaleString(lang, {
                      dateStyle: 'long',
                      timeStyle: 'medium',
                    })}
                  </span>
                </div>
              )}

              {/* Sync stats */}
              {syncStats && (
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-default-500">
                  {syncAgents && syncStats.agents > 0 && (
                    <span>
                      <span className="font-medium text-default-700">
                        {syncStats.agents}
                      </span>{' '}
                      {t('Agents').toLowerCase()}
                    </span>
                  )}
                  {syncConversations && syncStats.conversations > 0 && (
                    <span>
                      <span className="font-medium text-default-700">
                        {syncStats.conversations}
                      </span>{' '}
                      {t('Conversations').toLowerCase()}
                    </span>
                  )}
                  {syncMemories && syncStats.memories > 0 && (
                    <span>
                      <span className="font-medium text-default-700">
                        {syncStats.memories}
                      </span>{' '}
                      {t('Memories').toLowerCase()}
                    </span>
                  )}
                  {syncKnowledge && syncStats.knowledge > 0 && (
                    <span>
                      <span className="font-medium text-default-700">
                        {syncStats.knowledge}
                      </span>{' '}
                      {t('Knowledge').toLowerCase()}
                    </span>
                  )}
                  {syncTasks && syncStats.tasks > 0 && (
                    <span>
                      <span className="font-medium text-default-700">
                        {syncStats.tasks}
                      </span>{' '}
                      {t('Tasks').toLowerCase()}
                    </span>
                  )}
                  {syncStudio && syncStats.studio > 0 && (
                    <span>
                      <span className="font-medium text-default-700">
                        {syncStats.studio}
                      </span>{' '}
                      {t('Studio').toLowerCase()}
                    </span>
                  )}
                  {syncFullExport && syncStats.fullExport && (
                    <span>
                      <Icon
                        name="DatabaseExport"
                        className="h-3 w-3 inline mr-1"
                      />
                      {t('Full Export')}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Error display */}
          {error && (
            <div className="flex items-center justify-between p-2 bg-danger-50 rounded-lg">
              <div className="flex items-center gap-2 text-danger-700">
                <Icon name="WarningTriangle" className="h-4 w-4" />
                <span className="text-xs">{error}</span>
              </div>
              <Button
                size="sm"
                variant="light"
                isIconOnly
                onPress={clearError}
                aria-label="Dismiss"
              >
                <Icon name="Xmark" className="h-3 w-3" />
              </Button>
            </div>
          )}

          {/* Permission needed */}
          {needsPermission && !useFallbackDownload && (
            <div className="flex items-center justify-between gap-2 p-2 bg-warning-50 rounded-lg">
              <div className="flex items-center gap-2 text-warning-700">
                <Icon name="Lock" className="h-4 w-4" />
                <span className="text-xs">{t('Permission required')}</span>
              </div>
              <Button
                color="warning"
                size="sm"
                variant="flat"
                onPress={handleGrantPermission}
              >
                {t('Grant Permission')}
              </Button>
            </div>
          )}

          {/* Not enabled state - folder selection for supported browsers */}
          {!isEnabled && !needsPermission && !useFallbackDownload && (
            <Button
              color="primary"
              variant="flat"
              size="sm"
              onPress={handleSelectFolder}
              isLoading={isInitializing}
              isDisabled={syncOptionsValue.length === 0}
              startContent={
                !isInitializing && <Icon name="Folder" className="h-4 w-4" />
              }
            >
              {t('Select Folder')}
            </Button>
          )}

          {/* Download fallback for Safari and other browsers without File System Access API */}
          {useFallbackDownload && (
            <Button
              color="primary"
              variant="flat"
              size="sm"
              onPress={handleDownloadBackup}
              isLoading={isDownloading}
              startContent={
                !isDownloading && <Icon name="Download" className="h-4 w-4" />
              }
            >
              {t('Download Backup')}
            </Button>
          )}
        </PageMenuPanel>
      </PopoverContent>
    </Popover>
  )
}
