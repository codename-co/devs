/**
 * Sync Button Component
 *
 * Header icon button with popover for P2P sync settings
 * Icon states:
 * - CloudXmark: Disabled
 * - CloudSync: Enabled/Connecting
 * - CloudSync + spinning: Syncing
 */
import { Popover, PopoverContent } from '@heroui/react'
import { useState, useEffect } from 'react'

import { useSyncStore } from '../stores/syncStore'
import { PageMenuButton } from '@/components/PageMenuButton'
import { useI18n } from '@/i18n'
import { IconName } from '@/lib/types'
import { useNavigate } from 'react-router-dom'

export function SyncButton() {
  const { t } = useI18n()
  const navigate = useNavigate()

  const { enabled, status, peerCount, initialize } = useSyncStore()

  const [isPopoverOpen, setIsPopoverOpen] = useState(false)

  // Initialize sync store on mount
  useEffect(() => {
    initialize()
  }, [initialize])

  // Determine icon based on state
  const getIconName = (): IconName => {
    if (status === 'connected' || status === 'connecting') {
      return 'CloudSync'
    }
    return 'CloudXmark'
  }

  // Determine tooltip text
  const getTooltipText = () => {
    if (enabled) {
      if (status === 'connected') return t('Syncing')
      return t('Connecting...')
    }
    return t('Offline')
  }

  const isConnecting = status === 'connecting'
  const isConnected = status === 'connected'

  const openSettings = () => {
    navigate(`${location.pathname}${location.search}#settings/sync`)
  }

  return (
    <Popover
      placement="bottom"
      isOpen={isPopoverOpen}
      onOpenChange={setIsPopoverOpen}
    >
      <PageMenuButton
        icon={getIconName()}
        tooltip={getTooltipText()}
        ariaLabel={t('Sync')}
        isActive={isConnecting}
        showBadge={isConnected && peerCount > 0}
        tooltipDisabled={isPopoverOpen}
        onClick={openSettings}
      />
      <PopoverContent />
    </Popover>
  )
}
