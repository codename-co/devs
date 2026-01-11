/**
 * Page Menu Component
 *
 * Fixed top-right menu for global page actions
 */
import { Icon } from '@/components'
import { LocalBackupButton } from '@/features/local-backup'
import { SyncButton } from '@/features/sync'
import { useI18n, useUrl } from '@/i18n'
import {
  Button,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
  Tooltip,
} from '@heroui/react'
import { useNavigate } from 'react-router-dom'

export function PageMenu() {
  const { lang, t } = useI18n()
  const url = useUrl(lang)
  const navigate = useNavigate()

  return (
    <div className="absolute top-4 right-4 flex items-center gap-1">
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
                <Icon name="MoreHoriz" size="sm" />
              </Button>
            </DropdownTrigger>
          </span>
        </Tooltip>
        <DropdownMenu aria-label={t('More actions')}>
          <DropdownItem
            key="settings"
            startContent={<Icon name="Settings" size="sm" />}
            // description={t('App configuration')}
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
