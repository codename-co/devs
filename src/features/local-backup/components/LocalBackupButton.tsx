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
  Chip,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Popover,
  PopoverTrigger,
  PopoverContent,
  Tooltip,
  Kbd,
} from '@heroui/react'
import { useState, useEffect, useCallback } from 'react'

import '../types/file-system.d'
import {
  useFolderSyncStore,
  tryReconnectFolderSync,
} from '../stores/folderSyncStore'
import { Icon } from '@/components/Icon'
import { useI18n } from '@/i18n'
import { localI18n } from '../i18n'

/**
 * Check if File System Access API is supported
 */
function isFileSystemAccessSupported(): boolean {
  return 'showDirectoryPicker' in window
}

export function LocalBackupButton() {
  const { t } = useI18n(localI18n)
  const {
    isEnabled,
    isInitializing,
    isSyncing,
    error,
    basePath,
    syncAgents,
    syncConversations,
    syncMemories,
    syncKnowledge,
    syncTasks,
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

      // Close popover immediately after folder is chosen
      setIsPopoverOpen(false)

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

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
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

  // Build label for selected options
  const getSelectedLabel = () => {
    const items = []
    if (syncAgents) items.push(t('Agents'))
    if (syncConversations) items.push(t('Conversations'))
    if (syncMemories) items.push(t('Memories'))
    if (syncKnowledge) items.push(t('Knowledge'))
    if (syncTasks) items.push(t('Tasks'))
    if (items.length === 0) return '—'
    return items.join(', ')
  }

  // Handle dropdown selection
  const handleSelectionChange = (keys: Set<string> | 'all') => {
    if (keys === 'all') {
      updateSyncOptions({
        syncAgents: true,
        syncConversations: true,
        syncMemories: true,
      })
    } else {
      const selected = Array.from(keys)
      updateSyncOptions({
        syncAgents: selected.includes('agents'),
        syncConversations: selected.includes('conversations'),
        syncMemories: selected.includes('memories'),
      })
    }
  }

  // Determine icon based on state
  const getIconName = () => {
    return isEnabled || isSyncing ? 'RefreshDouble' : 'FloppyDisk'
  }

  // Determine tooltip text
  const getTooltipText = () => {
    if (isSyncing) return t('Backing up...')
    if (isEnabled) return t('Local Backup Active')
    return t('Local Backup')
  }

  // Don't render if File System Access API is not supported
  if (!isFileSystemAccessSupported()) {
    return null
  }

  return (
    <Popover
      placement="bottom-end"
      isOpen={isPopoverOpen}
      onOpenChange={setIsPopoverOpen}
    >
      <Tooltip
        content={
          <span className="flex items-center gap-2">
            {getTooltipText()}
            <Kbd keys={['command']}>S</Kbd>
          </span>
        }
        isDisabled={isPopoverOpen}
      >
        <span className="inline-flex">
          <PopoverTrigger>
            <Button
              variant="light"
              isIconOnly
              aria-label={t('Local Backup')}
              className="dark:hover:bg-default-300"
            >
              <Icon
                name={getIconName()}
                className={
                  'size-4 lg:size-5 opacity-40 ' +
                  (isSyncing ? 'animate-spin' : undefined)
                }
              />
            </Button>
          </PopoverTrigger>
        </span>
      </Tooltip>
      <PopoverContent className="max-w-84">
        <div className="flex flex-col gap-3 p-3">
          <div className="flex items-center gap-2">
            <span className="font-medium">{t('Local Backup')}</span>
          </div>

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
            <div className="flex flex-col gap-3">
              <p className="text-sm text-default-500">
                {t('Backup your data to a local folder on your device.')}
              </p>

              {/* Type selector dropdown */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-default-600">
                  {t('What to backup:')}
                </span>
                <Dropdown>
                  <DropdownTrigger>
                    <Button
                      size="sm"
                      variant="flat"
                      endContent={
                        <Icon name="NavArrowDown" className="h-3 w-3" />
                      }
                    >
                      <span className="truncate max-w-[120px]">
                        {getSelectedLabel()}
                      </span>
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
                    <DropdownItem key="agents">{t('Agents')}</DropdownItem>
                    <DropdownItem key="conversations">
                      {t('Conversations')}
                    </DropdownItem>
                    <DropdownItem key="memories">{t('Memories')}</DropdownItem>
                    <DropdownItem key="knowledge">
                      {t('Knowledge')}
                    </DropdownItem>
                    <DropdownItem key="tasks">{t('Tasks')}</DropdownItem>
                  </DropdownMenu>
                </Dropdown>
              </div>

              <Button
                color="primary"
                onPress={handleSelectFolder}
                isLoading={isInitializing}
                isDisabled={syncOptionsValue.length === 0}
                startContent={
                  !isInitializing && <Icon name="Folder" className="h-4 w-4" />
                }
              >
                {t('Select Folder')}
              </Button>
            </div>
          )}

          {/* Enabled state */}
          {isEnabled && !needsPermission && (
            <div className="flex items-center justify-between gap-3">
              <Tooltip content={basePath || 'Unknown'}>
                <Chip
                  size="sm"
                  variant="flat"
                  color="success"
                  classNames={{
                    content: 'max-w-[120px] truncate',
                  }}
                >
                  {basePath || 'Unknown'}
                </Chip>
              </Tooltip>
              <div className="flex items-center gap-1">
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
                <Tooltip content={t('Stop Backup')}>
                  <Button
                    size="sm"
                    variant="light"
                    isIconOnly
                    color="danger"
                    onPress={disableSync}
                    aria-label={t('Stop Backup')}
                  >
                    <Icon name="Xmark" className="h-4 w-4" />
                  </Button>
                </Tooltip>
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
