/**
 * Page Menu Component
 *
 * Fixed top-right menu for global page actions
 */
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Button,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
  Kbd,
  Tooltip,
} from '@heroui/react'

import { Icon } from '@/components'
import { LocalBackupButton } from '@/features/local-backup'
import { NotificationButton } from '@/features/notifications'
import { SyncButton } from '@/features/sync'
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

  // Register Cmd+, / Ctrl+, shortcut for settings
  useSettingsShortcut()

  return (
    <div className="absolute top-4 end-4 flex items-center gap-1">
      {supplementalActions}
      <NotificationButton />
      <SyncButton />
      <LocalBackupButton />

      {/* More Actions Menu */}
      <Dropdown placement="bottom-end">
        <Tooltip content={t('More actions')}>
          <span className="inline-flex">
            <DropdownTrigger>
              <Button
                variant="light"
                isIconOnly
                aria-label={t('More actions')}
                className="opacity-70 hover:opacity-100"
              >
                <Icon name="MoreVert" size="sm" />
              </Button>
            </DropdownTrigger>
          </span>
        </Tooltip>
        <DropdownMenu aria-label={t('More actions')}>
          <DropdownItem
            key="traces"
            startContent={<Icon name="Activity" size="sm" />}
            onPress={() => navigate(url('/traces'))}
          >
            {t('Traces and Metrics')}
          </DropdownItem>
          <DropdownItem
            key="settings"
            startContent={<Icon name="Settings" size="sm" />}
            // description={t('App configuration')}
            endContent={
              <Kbd keys={['command']} className="ms-2 text-xs">
                ,
              </Kbd>
            }
            onPress={() => navigate(url('/settings'))}
          >
            {t('App configuration')}
          </DropdownItem>
          <DropdownItem
            key="admin"
            startContent={<Icon name="Database" size="sm" />}
            onPress={() => navigate(url('/admin/database'))}
          >
            {t('Database management')}
          </DropdownItem>
        </DropdownMenu>
      </Dropdown>
    </div>
  )
}
/**
 * Hook to register global Cmd+, (Mac) or Ctrl+, (Windows/Linux) keyboard shortcut for settings
 */
function useSettingsShortcut(): void {
  const { lang } = useI18n()
  const url = useUrl(lang)
  const navigate = useNavigate()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+, (Mac) or Ctrl+, (Windows/Linux)
      if ((e.metaKey || e.ctrlKey) && e.key === ',') {
        e.preventDefault()
        navigate(url('/settings'))
      }
    }

    // Use capture phase to ensure shortcut works even when focus is in form fields
    document.addEventListener('keydown', handleKeyDown, true)
    return () => document.removeEventListener('keydown', handleKeyDown, true)
  }, [navigate, url])
}
