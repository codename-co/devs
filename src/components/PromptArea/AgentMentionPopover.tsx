import { Listbox, ListboxItem, ListboxSection } from '@heroui/react'
import { useEffect, useCallback, useMemo } from 'react'

import { Icon } from '../Icon'

import { useI18n, type Lang } from '@/i18n'
import { type Agent } from '@/types'
import { agentCategoryNames } from '@/lib/agents'

interface AgentMentionPopoverProps {
  lang: Lang
  agents: Agent[]
  selectedIndex: number
  onSelect: (agent: Agent) => void
  onClose: () => void
}

// Get category for an agent based on tags (same logic as agentStore)
function getAgentCategory(agent: Agent): string {
  if (agent.id === 'devs') {
    return 'default'
  }
  const firstTag = agent.tags?.[0]
  const validCategories = [
    'scientist',
    'advisor',
    'artist',
    'philosopher',
    'musician',
    'developer',
    'writer',
  ]
  return firstTag && validCategories.includes(firstTag) ? firstTag : 'other'
}

export function AgentMentionPopover({
  lang,
  agents,
  selectedIndex,
  onSelect,
  onClose,
}: AgentMentionPopoverProps) {
  const { t } = useI18n(lang as any)

  // Scroll selected item into view
  useEffect(() => {
    const selectedElement = document.querySelector(
      '[data-testid="agent-mention-popover"] [data-selected="true"]',
    )
    selectedElement?.scrollIntoView({
      block: 'nearest',
      behavior: 'smooth',
    })
  }, [selectedIndex])

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const popover = document.querySelector(
        '[data-testid="agent-mention-popover"]',
      )
      if (popover && !popover.contains(e.target as Node)) {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  // Group agents by category for display
  const agentsByCategory = useMemo(() => {
    const grouped: Record<string, Agent[]> = {}

    agents.forEach((agent) => {
      const category = getAgentCategory(agent)
      if (!grouped[category]) {
        grouped[category] = []
      }
      grouped[category].push(agent)
    })

    return grouped
  }, [agents])

  const orderedCategories = useMemo(() => {
    const order = [
      'default',
      'developer',
      'scientist',
      'advisor',
      'writer',
      'artist',
      'philosopher',
      'musician',
      'other',
    ]
    return order.filter((cat) => agentsByCategory[cat]?.length > 0)
  }, [agentsByCategory])

  // Calculate global index for an agent
  const getGlobalIndex = useCallback(
    (agent: Agent): number => {
      return agents.findIndex((a) => a.id === agent.id)
    },
    [agents],
  )

  const handleAction = useCallback(
    (key: React.Key) => {
      const agent = agents.find((a) => a.id === key)
      if (agent) {
        onSelect(agent)
      }
    },
    [agents, onSelect],
  )

  if (agents.length === 0) {
    return (
      <div
        className="absolute bottom-full left-0 mb-2 w-80 max-h-64 overflow-y-auto bg-content1 rounded-lg shadow-lg border border-default-200 p-4 z-50"
        data-testid="agent-mention-popover"
      >
        <p className="text-default-500 text-sm">{t('No agents found')}</p>
      </div>
    )
  }

  return (
    <div
      className="absolute bottom-full left-0 mb-2 w-80 max-h-64 overflow-y-auto bg-content1 rounded-lg shadow-lg border border-default-200 z-50"
      data-testid="agent-mention-popover"
    >
      <Listbox
        aria-label={t('Select an agent')}
        selectionMode="single"
        selectedKeys={agents[selectedIndex] ? [agents[selectedIndex].id] : []}
        onAction={handleAction}
      >
        {orderedCategories.map((category) => (
          <ListboxSection
            key={category}
            title={t((agentCategoryNames as any)[category] ?? category)}
            classNames={{
              heading: 'text-xs font-semibold text-default-500 px-2 py-1',
            }}
          >
            {agentsByCategory[category].map((agent) => {
              const globalIndex = getGlobalIndex(agent)
              const isSelected = globalIndex === selectedIndex

              return (
                <ListboxItem
                  key={agent.id}
                  data-selected={isSelected}
                  description={
                    agent.i18n?.[lang]?.desc ?? agent.desc ?? agent.role
                  }
                  startContent={<Icon name={agent.icon ?? 'User'} size="md" />}
                  className={isSelected ? 'bg-default-100' : ''}
                  textValue={agent.i18n?.[lang]?.name ?? agent.name}
                >
                  {agent.i18n?.[lang]?.name ?? agent.name}
                </ListboxItem>
              )
            })}
          </ListboxSection>
        ))}
      </Listbox>
    </div>
  )
}
