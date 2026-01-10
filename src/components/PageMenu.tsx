/**
 * Page Menu Component
 *
 * Fixed top-right menu for global page actions
 */
import { Icon } from '@/components'
import { LocalBackupButton } from '@/features/local-backup'
import { SyncButton } from '@/features/sync'
import { useI18n } from '@/i18n'
import {
  Button,
  Chip,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownSection,
  DropdownTrigger,
  Tooltip,
} from '@heroui/react'
import { useNavigate } from 'react-router-dom'

export function PageMenu() {
  const { t, url } = useI18n()
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
          {/* Main Features */}
          <DropdownSection showDivider>
            <DropdownItem
              key="voice"
              startContent={<Icon name="Voice" size="sm" />}
              description={t('Voice input mode')}
              endContent={
                <Chip size="sm" variant="flat" className="ml-2 align-middle">
                  Beta
                </Chip>
              }
              onPress={() => navigate(url('/voice'))}
            >
              {t('Voice')}
            </DropdownItem>
            <DropdownItem
              key="connectors"
              startContent={<Icon name="Puzzle" size="sm" />}
              description={t('Connect external services')}
              onPress={() => navigate(url('/knowledge/connectors'))}
            >
              {t('Connectors')}
            </DropdownItem>
            <DropdownItem
              key="memories"
              startContent={<Icon name="Brain" size="sm" />}
              description={t('Agent learned knowledge')}
              onPress={() => navigate(url('/knowledge/memories'))}
            >
              {t('Memories')}
            </DropdownItem>
            <DropdownItem
              key="files"
              startContent={<Icon name="Folder" size="sm" />}
              description={t('Manage your files')}
              onPress={() => navigate(url('/knowledge/files'))}
            >
              {t('Files')}
            </DropdownItem>
          </DropdownSection>

          {/* Settings & Admin */}
          <DropdownSection>
            <DropdownItem
              key="settings"
              startContent={<Icon name="Settings" size="sm" />}
              description={t('App configuration')}
              onPress={() => navigate(url('/settings'))}
            >
              {t('Settings')}
            </DropdownItem>
            <DropdownItem
              key="admin"
              startContent={<Icon name="Server" size="sm" />}
              description={t('Database management')}
              onPress={() => navigate(url('/admin/database'))}
            >
              {t('Admin')}
            </DropdownItem>
          </DropdownSection>
        </DropdownMenu>
      </Dropdown>
    </div>
  )
}
