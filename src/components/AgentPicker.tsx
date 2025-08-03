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
  const { t, lang } = useI18n()

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
      selectedKeys={selectedAgent ? [selectedAgent.id] : undefined}
      onSelectionChange={handleSelectionChange}
      className="max-w-96 max-h-96 overflow-y-auto"
      {...props}
    >
      <DropdownSection title={t('Available Agents')}>
        {availableAgents
          .sort((a, b) => {
            // Put "devs" agent first
            if (a.id === 'devs') return -1
            if (b.id === 'devs') return 1

            // Sort others alphabetically by name
            return (a.i18n?.[lang]?.name || a.name).localeCompare(
              b.i18n?.[lang]?.name || b.name,
            )
          })
          .map((agent) => (
            <DropdownItem
              key={agent.id}
              description={agent.i18n?.[lang]?.desc ?? agent.desc ?? agent.role}
              startContent={agent.icon && <Icon name={agent.icon} size="lg" />}
              className="truncate"
            >
              {agent.i18n?.[lang]?.name ?? agent.name}
            </DropdownItem>
          ))}
      </DropdownSection>
    </DropdownMenu>
  )
}
