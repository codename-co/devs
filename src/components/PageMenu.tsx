/**
 * Page Menu Component
 *
 * Fixed top-right menu for global page actions
 */
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, ButtonGroup, Tooltip } from '@heroui/react'

import { Icon } from '@/components'
import { LocalBackupButton } from '@/features/local-backup'
import { NotificationButton } from '@/features/notifications'
import { SyncButton, useSyncStore } from '@/features/sync'
import { useI18n, useUrl } from '@/i18n'

export interface PageMenuProps {
  /**
   * Optional supplemental action items to be rendered before the default menu items.
   * Typically buttons or other interactive elements.
   */
  supplementalActions?: React.ReactNode
}

export function PageMenu({ supplementalActions }: PageMenuProps = {}) {
  const { lang, t } = useI18n()
  const url = useUrl(lang)
  const navigate = useNavigate()
  const [showExtendedActions, setShowExtendedActions] = useState(false)
  const syncEnabled = useSyncStore((state) => state.enabled)

  // Register Cmd+, / Ctrl+, shortcut for settings
  useSettingsShortcut()

  return (
    <div className="absolute top-4 end-4 z-20 flex items-center gap-1">
      <ButtonGroup variant="light" isIconOnly>
        {supplementalActions}
      </ButtonGroup>
      <ButtonGroup className="opacity-70 *:hover:opacity-100">
        <NotificationButton />

        {/* Show SyncButton by default when sync is enabled */}
        {syncEnabled && <SyncButton />}

        {/* Extended Actions */}
        {showExtendedActions && (
          <>
            <Tooltip content={t('Traces')}>
              <Button
                isIconOnly
                variant="light"
                aria-label={t('Traces')}
                onPress={() => navigate(url('/#settings/traces'))}
              >
                <Icon name="Activity" size="sm" />
              </Button>
            </Tooltip>
            {/* Only show SyncButton in extended menu if not already visible */}
            {!syncEnabled && <SyncButton />}
            <LocalBackupButton />
          </>
        )}

        {/* Toggle Extended Actions */}
        <Tooltip
          content={
            showExtendedActions
              ? t('Hide extended actions')
              : t('Show extended actions')
          }
        >
          <Button
            isIconOnly
            variant="light"
            aria-label={
              showExtendedActions
                ? t('Hide extended actions')
                : t('Show extended actions')
            }
            aria-pressed={showExtendedActions}
            onPress={() => setShowExtendedActions(!showExtendedActions)}
          >
            <Icon
              name={showExtendedActions ? 'NavArrowRight' : 'NavArrowLeft'}
              size="sm"
            />
          </Button>
        </Tooltip>
      </ButtonGroup>
    </div>
  )
}
/**
 * Hook to register global Cmd+, (Mac) or Ctrl+, (Windows/Linux) keyboard shortcut for settings
 */
function useSettingsShortcut(): void {
  const navigate = useNavigate()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+, (Mac) or Ctrl+, (Windows/Linux)
      if ((e.metaKey || e.ctrlKey) && e.key === ',') {
        e.preventDefault()
        navigate(`${window.location.pathname}#settings`, { replace: true })
      }
    }

    // Use capture phase to ensure shortcut works even when focus is in form fields
    document.addEventListener('keydown', handleKeyDown, true)
    return () => document.removeEventListener('keydown', handleKeyDown, true)
  }, [navigate])
}
