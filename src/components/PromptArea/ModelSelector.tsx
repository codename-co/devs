import {
  Button,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  DropdownSection,
  Tooltip,
} from '@heroui/react'
import { useNavigate } from 'react-router-dom'

import { Icon } from '../Icon'
import { useModelPicker } from './useModelPicker'

import { type Lang, useI18n } from '@/i18n'

interface ModelSelectorProps {
  lang: Lang
}

export function ModelSelector({ lang }: ModelSelectorProps) {
  const navigate = useNavigate()
  const { t, url } = useI18n(lang as any)

  const {
    credentials,
    selectedCredentialId,
    selectedCredential,
    setSelectedCredentialId,
    getProviderIcon,
    displayModelName,
  } = useModelPicker({ lang })

  if (credentials.length === 0) {
    return null
  }

  return (
    <Tooltip
      content={t('Select a model')}
      classNames={{
        base: 'pointer-events-none',
      }}
    >
      <Dropdown className="bg-white dark:bg-default-50 dark:text-white">
        <DropdownTrigger>
          <Button
            radius="full"
            variant="light"
            size="sm"
            startContent={
              <Icon
                name={getProviderIcon(selectedCredential?.provider || 'custom')}
                size="sm"
                className="hidden md:flex"
              />
            }
          >
            <span className="text-xs truncate max-w-16 md:max-w-48">
              {displayModelName(selectedCredential?.model) ||
                t('Select a model')}
            </span>
          </Button>
        </DropdownTrigger>
        <DropdownMenu
          aria-label="LLM Model selection"
          selectionMode="single"
          selectedKeys={selectedCredentialId ? [selectedCredentialId] : []}
          onAction={(key) => setSelectedCredentialId(key as string)}
        >
          <>
            {credentials.length > 0 && (
              <DropdownSection showDivider>
                {credentials.map((cred: any) => (
                  <DropdownItem
                    key={cred.id}
                    startContent={
                      <Icon name={getProviderIcon(cred.provider)} size="sm" />
                    }
                    description={cred.provider}
                    textValue={cred.model || cred.provider}
                  >
                    {displayModelName(cred.model) || cred.provider}
                  </DropdownItem>
                ))}
              </DropdownSection>
            )}
            <DropdownSection>
              <DropdownItem
                key="settings"
                startContent={<Icon name="Plus" size="sm" />}
                textValue={t('Add a model')}
                onPress={() => navigate(url('/settings#llm-models'))}
              >
                {t('Add a model')}
              </DropdownItem>
            </DropdownSection>
          </>
        </DropdownMenu>
      </Dropdown>
    </Tooltip>
  )
}
