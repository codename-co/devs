import {
  DropdownMenu,
  DropdownSection,
  DropdownItem,
  type DropdownMenuProps,
} from '@heroui/react'
import { type Agent } from '@/types'
import { loadAllAgents } from '@/stores/agentStore'
import { Icon } from './Icon'
import { useI18n } from '@/i18n'

interface AgentPickerProps extends Omit<DropdownMenuProps, 'children'> {
  selectedAgent?: Agent | null
  onAgentChange?: (agent: Agent | null) => void
}

const availableAgents: Agent[] = await loadAllAgents()

export function AgentPicker({
  selectedAgent,
  onAgentChange,
  ...props
}: AgentPickerProps) {
  const { t } = useI18n()

  const handleSelectionChange = (keys: 'all' | Set<React.Key>) => {
    if (keys === 'all') return

    const selectedKey = Array.from(keys)[0] as string
    const agent = availableAgents.find((a) => a.id === selectedKey) || null
    onAgentChange?.(agent)
  }

  return (
    <DropdownMenu
      aria-label="Agent selection"
      selectionMode="single"
      selectedKeys={selectedAgent ? new Set([selectedAgent.id]) : new Set()}
      onSelectionChange={handleSelectionChange}
      {...props}
    >
      <DropdownSection title={t('Available Agents')} showDivider>
        {availableAgents.map((agent) => (
          <DropdownItem
            key={agent.id}
            description={agent.instructions}
            startContent={
              <Icon name={agent.id === 'devs' ? 'Group' : 'User'} size="sm" />
            }
          >
            {agent.name}
          </DropdownItem>
        ))}
      </DropdownSection>
    </DropdownMenu>
  )
}
