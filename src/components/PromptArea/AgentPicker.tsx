import { Listbox, ListboxSection, ListboxItem, Input } from '@heroui/react'
import { type Agent } from '@/types'
import { getAgentsByCategory } from '@/stores/agentStore'
import { Icon } from '../Icon'
import { AgentAvatar } from '../AgentAvatar'
import { useI18n, type LanguageCode } from '@/i18n'
import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { agentCategoryNames } from '@/lib/agents'

interface AgentPickerProps {
  selectedAgent?: Agent | null
  onAgentChange?: (agent: Agent | null) => void
}

export function AgentPicker({
  selectedAgent,
  onAgentChange,
}: AgentPickerProps) {
  const { lang, t } = useI18n()
  const [agentsByCategory, setAgentsByCategory] = useState<
    Record<string, Agent[]>
  >({})
  const [orderedCategories, setOrderedCategories] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus input when component mounts
  useEffect(() => {
    // Small delay to ensure popover is fully rendered
    const timer = setTimeout(() => {
      inputRef.current?.focus()
    }, 50)
    return () => clearTimeout(timer)
  }, [])

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

  // Filter agents based on search query (checking name and all i18n names)
  const filterAgent = useCallback(
    (agent: Agent, query: string): boolean => {
      const lowerQuery = query.toLowerCase()

      // Check main name
      if (agent.name.toLowerCase().includes(lowerQuery)) return true

      // Check localized name for current language
      const localizedName = agent.i18n?.[lang]?.name
      if (localizedName?.toLowerCase().includes(lowerQuery)) return true

      // Check all i18n names
      if (agent.i18n) {
        const i18nKeys = Object.keys(agent.i18n) as LanguageCode[]
        for (const langKey of i18nKeys) {
          const i18nName = agent.i18n[langKey]?.name
          if (i18nName?.toLowerCase().includes(lowerQuery)) return true
        }
      }

      return false
    },
    [lang],
  )

  // Filter categories and agents based on search query
  const filteredAgentsByCategory = useMemo(() => {
    if (!searchQuery.trim()) return agentsByCategory

    const filtered: Record<string, Agent[]> = {}
    for (const category of orderedCategories) {
      const agents = agentsByCategory[category]?.filter((agent) =>
        filterAgent(agent, searchQuery),
      )
      if (agents && agents.length > 0) {
        filtered[category] = agents
      }
    }
    return filtered
  }, [agentsByCategory, orderedCategories, searchQuery, filterAgent])

  // Get filtered categories (only those with matching agents)
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return orderedCategories
    return orderedCategories.filter(
      (category) =>
        filteredAgentsByCategory[category] &&
        filteredAgentsByCategory[category].length > 0,
    )
  }, [orderedCategories, filteredAgentsByCategory, searchQuery])

  // Show search when there are many agents
  const showSearch = useMemo(() => allAgents.length > 5, [allAgents])

  const handleSelectionChange = useCallback(
    (keys: 'all' | Set<React.Key>) => {
      if (keys === 'all') return

      const selectedKey = Array.from(keys)[0] as string
      const agent = allAgents.find((a) => a.id === selectedKey) || null
      onAgentChange?.(agent)
    },
    [allAgents, onAgentChange],
  )

  // Render agent item
  const renderAgentItem = useCallback(
    (agent: Agent) => (
      <ListboxItem
        key={agent.id}
        description={agent.i18n?.[lang]?.desc ?? agent.desc ?? agent.role}
        startContent={<AgentAvatar agent={agent} size="md" />}
        className="truncate"
        textValue={agent.i18n?.[lang]?.name ?? agent.name}
      >
        {agent.i18n?.[lang]?.name ?? agent.name}
      </ListboxItem>
    ),
    [lang],
  )

  return (
    <div className="w-96 max-w-[94dvw]">
      {showSearch && (
        <div className="p-2 border-b border-divider">
          <Input
            ref={inputRef}
            size="sm"
            placeholder={t('Search agents…')}
            value={searchQuery}
            onValueChange={setSearchQuery}
            startContent={
              <Icon name="Search" size="sm" className="text-default-400" />
            }
            classNames={{
              inputWrapper: 'h-8',
            }}
          />
        </div>
      )}
      <Listbox
        aria-label="Agent selection"
        disallowEmptySelection
        selectionMode="single"
        selectedKeys={selectedAgent ? new Set([selectedAgent.id]) : new Set()}
        onSelectionChange={handleSelectionChange}
        className="max-h-80 overflow-y-auto p-1"
      >
        {filteredCategories.length > 0 ? (
          filteredCategories.map((category) => {
            const agents = filteredAgentsByCategory[category]
            if (!agents || agents.length === 0) return null
            return (
              <ListboxSection
                key={category}
                title={t((agentCategoryNames as any)[category] ?? category)}
              >
                {agents.map(renderAgentItem)}
              </ListboxSection>
            )
          })
        ) : searchQuery ? (
          <ListboxItem key="no-results" isReadOnly textValue="No results">
            <span className="text-default-400 text-sm">
              {t('No agents found')}
            </span>
          </ListboxItem>
        ) : null}
      </Listbox>
    </div>
  )
}
