import {
  DropdownMenu,
  DropdownSection,
  DropdownItem,
  type DropdownMenuProps,
} from '@heroui/react'
import { type Agent } from '@/types'
import { loadAllAgents, getAgentsByCategory } from '@/stores/agentStore'
import { Icon } from './Icon'
import { useI18n } from '@/i18n'
import { useState, useEffect } from 'react'

interface AgentPickerProps extends Omit<DropdownMenuProps, 'children'> {
  selectedAgent?: Agent | null
  onAgentChange?: (agent: Agent | null) => void
}

export function AgentPicker({
  selectedAgent,
  onAgentChange,
  ...props
}: AgentPickerProps) {
  const { t, lang } = useI18n()
  const [availableAgents, setAvailableAgents] = useState<Agent[]>([])
  const [agentsByCategory, setAgentsByCategory] = useState<Record<string, Agent[]>>({})
  const [orderedCategories, setOrderedCategories] = useState<string[]>([])

  useEffect(() => {
    const loadAgents = async () => {
      const agents = await loadAllAgents()
      setAvailableAgents(agents)
      
      const { agentsByCategory: categorized, orderedCategories: ordered } = await getAgentsByCategory(lang)
      setAgentsByCategory(categorized)
      setOrderedCategories(ordered)
    }
    loadAgents()
  }, [lang])

  const handleSelectionChange = (keys: 'all' | Set<React.Key>) => {
    if (keys === 'all') return

    const selectedKey = Array.from(keys)[0] as string
    const agent = availableAgents.find((a) => a.id === selectedKey) || null
    onAgentChange?.(agent)
  }

  // Define category display names
  const categoryNames: Record<string, string> = {
    scientist: t('Scientists'),
    advisor: t('Advisors'),
    artist: t('Artists'),
    philosopher: t('Philosophers'),
    musician: t('Musicians'),
    writer: t('Writers'),
    other: t('Other Agents'),
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
      {orderedCategories.map((category) => (
        <DropdownSection key={category} title={categoryNames[category]}>
          {agentsByCategory[category].map((agent) => (
            <DropdownItem
              key={agent.id}
              description={agent.i18n?.[lang]?.desc ?? agent.desc ?? agent.role}
              startContent={<Icon name={agent.icon ?? 'User'} size="lg" />}
              className="truncate"
              textValue={agent.i18n?.[lang]?.name ?? agent.name}
            >
              {agent.i18n?.[lang]?.name ?? agent.name}
            </DropdownItem>
          ))}
        </DropdownSection>
      ))}
    </DropdownMenu>
  )
}
