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
  // Group agents by their first tag
  const agentsByCategory = availableAgents.reduce(
    (acc, agent) => {
      if (agent.id === 'devs') {
        // Always put devs in its own "default" category
        acc['default'] = acc['default'] || []
        acc['default'].push(agent)
      } else {
        // Use the first tag as category, but only if it matches a categoryName
        const firstTag = agent.tags?.[0]
        const category =
          firstTag && categoryNames[firstTag] ? firstTag : 'other'
        acc[category] = acc[category] || []
        acc[category].push(agent)
      }
      return acc
    },
    {} as Record<string, Agent[]>,
  )

  // Sort agents within each category by name
  Object.values(agentsByCategory).forEach((agents) => {
    agents.sort((a, b) => {
      return (a.i18n?.[lang]?.name || a.name).localeCompare(
        b.i18n?.[lang]?.name || b.name,
      )
    })
  })

  // Order categories (default first, then alphabetically)
  const orderedCategories = Object.keys(agentsByCategory).sort((a, b) => {
    if (a === 'default') return -1
    if (b === 'default') return 1
    if (a === 'other') return 1
    if (b === 'other') return -1
    return a.localeCompare(b)
  })

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
            >
              {agent.i18n?.[lang]?.name ?? agent.name}
            </DropdownItem>
          ))}
        </DropdownSection>
      ))}
    </DropdownMenu>
  )
}
