/**
 * Local Backup Button Component
 *
 * Header icon button with popover for local backup settings
 */
import { Popover, PopoverContent } from '@heroui/react'
import { useEffect, useState } from 'react'

import '../types/file-system.d'
import {
  tryReconnectFolderSync,
  useFolderSyncStore,
} from '../stores/folderSyncStore'
import { PageMenuButton } from '@/components/PageMenuButton'
import { useI18n } from '@/i18n'
import { localI18n } from '../i18n'
import { useNavigate } from 'react-router-dom'

/**
 * Check if File System Access API is supported
 */
function isFileSystemAccessSupported(): boolean {
  return 'showDirectoryPicker' in window
}

export function LocalBackupButton() {
  const { t } = useI18n(localI18n)
  const navigate = useNavigate()
  const { isEnabled, isSyncing, basePath } = useFolderSyncStore()

  const [_needsPermission, setNeedsPermission] = useState(false)
  const [isPopoverOpen, setIsPopoverOpen] = useState(false)

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

  // Keyboard shortcut: Cmd+S (or Ctrl+S)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        openSettings()
      }
    }

    // Use capture phase to ensure shortcut works even when focus is in form fields
    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [])

  // Determine tooltip text
  const getTooltipText = () => {
    if (isSyncing) return t('Backing up...')
    if (isEnabled) return t('Local Backup Active')
    return t('Local Backup')
  }

  const openSettings = () => {
    navigate(`${location.pathname}${location.search}#settings/local-backup`)
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
        onClick={openSettings}
      />
      <PopoverContent />
    </Popover>
  )
}
