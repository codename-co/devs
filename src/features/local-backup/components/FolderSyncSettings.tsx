/**
 * Local Backup Settings Component
 *
 * Compact UI for enabling/disabling local folder backup
 */
import {
  Button,
  Chip,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Tooltip,
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

export function FolderSyncSettings() {
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

  // Check for File System Access API support
  if (!isFileSystemAccessSupported()) {
    return (
      <div className="flex flex-col gap-4 p-4 bg-warning-50 rounded-lg">
        <div className="flex items-center gap-2 text-warning-700">
          <Icon name="WarningTriangle" className="h-5 w-5" />
          <span className="font-medium">
            Folder sync is not supported in this browser
          </span>
        </div>
        <p className="text-sm text-warning-600">
          Please use Chrome, Edge, or another Chromium-based browser to use
          folder sync.
        </p>
      </div>
    )
  }

  // Build sync options value
  const syncOptionsValue: string[] = []
  if (syncAgents) syncOptionsValue.push('agents')
  if (syncConversations) syncOptionsValue.push('conversations')
  if (syncMemories) syncOptionsValue.push('memories')
  if (syncKnowledge) syncOptionsValue.push('knowledge')
  if (syncTasks) syncOptionsValue.push('tasks')
  if (syncFullExport) syncOptionsValue.push('fullExport')

  // Build label for selected options
  const getSelectedLabel = () => {
    const items = []
    if (syncAgents) items.push(t('Agents'))
    if (syncConversations) items.push(t('Conversations'))
    if (syncMemories) items.push(t('Memories'))
    if (syncKnowledge) items.push(t('Knowledge'))
    if (syncTasks) items.push(t('Tasks'))
    if (syncFullExport) items.push(t('Full Export'))
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
        syncKnowledge: true,
        syncTasks: true,
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
        syncFullExport: selected.includes('fullExport'),
      })
    }
  }

  return (
    <div className="flex flex-col gap-2">
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

      {/* Not enabled state - compact row */}
      {!isEnabled && !needsPermission && (
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Icon name="Folder" className="h-4 w-4 text-default-400 shrink-0" />
            <span className="text-sm text-default-600">
              {t('Local Backup')}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {/* Type selector dropdown */}
            <Dropdown>
              <DropdownTrigger>
                <Button
                  size="sm"
                  variant="light"
                  endContent={<Icon name="NavArrowDown" className="h-3 w-3" />}
                  className="min-w-[120px]"
                >
                  <span className="truncate">{getSelectedLabel()}</span>
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
                <DropdownItem key="knowledge">{t('Knowledge')}</DropdownItem>
                <DropdownItem key="tasks">{t('Tasks')}</DropdownItem>
                <DropdownItem key="fullExport">{t('Full Export')}</DropdownItem>
              </DropdownMenu>
            </Dropdown>
            <Button
              size="sm"
              color="primary"
              variant="flat"
              onPress={handleSelectFolder}
              isLoading={isInitializing}
              isDisabled={syncOptionsValue.length === 0}
              className="shrink-0"
            >
              {t('Select Folder')}
            </Button>
          </div>
        </div>
      )}

      {/* Enabled state - compact inline status */}
      {isEnabled && !needsPermission && (
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Icon name="Folder" className="h-4 w-4 text-success-500 shrink-0" />
            <span className="text-sm text-default-600">
              {t('Local Backup')}
            </span>
            <Tooltip content={basePath || 'Unknown'}>
              <Chip
                size="sm"
                variant="flat"
                color="success"
                classNames={{
                  content: 'max-w-[100px] truncate',
                }}
              >
                {basePath || 'Unknown'}
              </Chip>
            </Tooltip>
          </div>
          <div className="flex items-center gap-1">
            {/* Type selector dropdown */}
            <Dropdown>
              <DropdownTrigger>
                <Button
                  size="sm"
                  variant="light"
                  isIconOnly
                  aria-label={t('What to backup:')}
                >
                  <Icon name="Settings" className="h-4 w-4" />
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
                <DropdownItem key="knowledge">{t('Knowledge')}</DropdownItem>
                <DropdownItem key="tasks">{t('Tasks')}</DropdownItem>
                <DropdownItem key="fullExport">{t('Full Export')}</DropdownItem>
              </DropdownMenu>
            </Dropdown>
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
  )
}
