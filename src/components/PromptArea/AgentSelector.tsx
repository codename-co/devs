import {
  Button,
  Popover,
  PopoverTrigger,
  PopoverContent,
  Tooltip,
} from '@heroui/react'
import { useState } from 'react'

import { AgentPicker } from './AgentPicker'
import { Icon } from '../Icon'

import { useI18n, type Lang } from '@/i18n'
import { type Agent } from '@/types'
import { isSmallWidth } from '@/lib/device'

interface AgentSelectorProps {
  lang: Lang
  disabled?: boolean
  selectedAgent: Agent
  onAgentChange?: (agent: Agent | null) => void
}

export function AgentSelector({
  lang,
  disabled,
  selectedAgent,
  onAgentChange,
}: AgentSelectorProps) {
  const { t } = useI18n(lang as any)
  const [isOpen, setIsOpen] = useState(false)

  const handleAgentChange = (agent: Agent | null) => {
    onAgentChange?.(agent)
    setIsOpen(false)
  }

  return (
    <Tooltip
      content={t('Select an agent')}
      classNames={{
        base: 'pointer-events-none',
      }}
    >
      <Popover
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        placement="bottom-start"
        classNames={{
          content:
            'bg-white dark:bg-default-50 dark:text-white max-w-[94dvw] p-0',
        }}
        isKeyboardDismissDisabled={false}
      >
        <PopoverTrigger>
          <Button
            data-testid="agent-picker"
            isIconOnly={isSmallWidth()}
            radius="full"
            variant="light"
            size="sm"
            isDisabled={disabled}
          >
            <Icon
              name={selectedAgent.icon ?? 'User'}
              size="md"
              className="text-default-500 dark:text-default-600"
            />
            <span className="hidden min-[36em]:inline-flex">
              {selectedAgent.i18n?.[lang]?.name ?? selectedAgent.name}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent>
          <AgentPicker
            selectedAgent={selectedAgent}
            onAgentChange={handleAgentChange}
          />
        </PopoverContent>
      </Popover>
    </Tooltip>
  )
}
