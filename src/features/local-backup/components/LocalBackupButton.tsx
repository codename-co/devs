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

  // Don't render if File System Access API is not supported
  if (!isFileSystemAccessSupported()) {
    return null
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
        showBadge={isEnabled}
        badgePulsing={isSyncing}
        tooltipDisabled={isPopoverOpen}
        shortcutKeys={['command']}
        shortcutKey="S"
      />
      <PopoverContent>
        <PageMenuPanel
          title={t('Local Backup')}
          actions={
            <>
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
              {/* {isEnabled && !needsPermission && (
                <Tooltip content={t('Backup Now')}>
                  <Button
                    size="sm"
                    variant="light"
                    isIconOnly
                    onPress={() => triggerSync()}
                    isLoading={isSyncing}
                    aria-label={t('Backup Now')}
                  >
                    {!isSyncing && (
                      <Icon name="RefreshDouble" className="h-4 w-4" />
                    )}
                  </Button>
                </Tooltip>
              )} */}
            </>
          }
          status={
            isEnabled
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
            !isEnabled && !needsPermission
              ? t(
                  'Your conversations are yours. Keep them safe on your device—no cloud surprises, no vanishing chats.',
                )
              : undefined
          }
        >
          {/* Backup status when enabled */}
          {isEnabled && !needsPermission && (
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
          {needsPermission && (
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

          {/* Not enabled state */}
          {!isEnabled && !needsPermission && (
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
        </PageMenuPanel>
      </PopoverContent>
    </Popover>
  )
}
