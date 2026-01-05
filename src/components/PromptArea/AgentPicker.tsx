import {
  DropdownMenu,
  DropdownSection,
  DropdownItem,
  type DropdownMenuProps,
} from '@heroui/react'
import { type Agent } from '@/types'
import { getAgentsByCategory } from '@/stores/agentStore'
import { Icon } from '../Icon'
import { useI18n } from '@/i18n'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { agentCategoryNames } from '@/lib/agents'

interface AgentPickerProps extends Omit<DropdownMenuProps, 'children'> {
  selectedAgent?: Agent | null
  onAgentChange?: (agent: Agent | null) => void
  disabled?: boolean
}

export function AgentPicker({
  selectedAgent,
  onAgentChange,
  disabled,
  ...props
}: AgentPickerProps) {
  const { lang, t } = useI18n()
  const [agentsByCategory, setAgentsByCategory] = useState<
    Record<string, Agent[]>
  >({})
  const [orderedCategories, setOrderedCategories] = useState<string[]>([])

  // Update categories when language changes
  useEffect(() => {
    const updateCategories = async () => {
      const { agentsByCategory: categorized, orderedCategories: ordered } =
        await getAgentsByCategory(lang)
      setAgentsByCategory(categorized)
      setOrderedCategories(ordered)
    }
    updateCategories()
  }, [lang])

  // Flatten all agents from categories for lookup
  const allAgents = useMemo(() => {
    return Object.values(agentsByCategory).flat()
  }, [agentsByCategory])

  const handleSelectionChange = useCallback(
    (keys: 'all' | Set<React.Key>) => {
      if (keys === 'all') return

      const selectedKey = Array.from(keys)[0] as string
      const agent = allAgents.find((a) => a.id === selectedKey) || null
      onAgentChange?.(agent)
    },
    [allAgents, onAgentChange],
  )

  // Define category displ
  return (
    <DropdownMenu
      aria-label="Agent selection"
      disallowEmptySelection
      selectionMode="single"
      selectedKeys={selectedAgent ? [selectedAgent.id] : undefined}
      onSelectionChange={handleSelectionChange}
      className="max-w-96 max-h-96 overflow-y-auto"
      {...props}
    >
      {orderedCategories.map((category) => (
        <DropdownSection
          key={category}
          title={t((agentCategoryNames as any)[category] ?? category)}
        >
          {agentsByCategory[category]?.map((agent) => (
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
