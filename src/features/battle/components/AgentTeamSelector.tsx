/**
 * AgentTeamSelector Component
 *
 * A component for selecting agents for a team in a battle.
 * Displays available agents as selectable cards/chips with add/remove functionality.
 */
import { Card, CardBody, Chip, ScrollShadow } from '@heroui/react'

import { Icon } from '@/components/Icon'
import { useI18n } from '@/i18n'
import { type LanguageCode } from '@/i18n/locales'
import { useAllAgents } from '@/hooks'
import { type Agent } from '@/types'
import { battleI18n } from '../i18n'

interface AgentTeamSelectorProps {
  /** IDs of currently selected agents */
  selectedAgentIds: string[]
  /** Callback when selection changes */
  onSelectionChange: (ids: string[]) => void
  /** Display name for the team */
  teamName: string
  /** Color theme for the team (e.g., 'blue', 'red') */
  teamColor: string
  /** Agent IDs to exclude from selection (e.g., already selected by other team) */
  excludeAgentIds?: string[]
}

export const AgentTeamSelector = ({
  selectedAgentIds,
  onSelectionChange,
  teamName,
  teamColor,
  excludeAgentIds = [],
}: AgentTeamSelectorProps) => {
  const { t, lang } = useI18n(battleI18n)
  const agents = useAllAgents()

  // Filter out excluded agents and already selected ones for available list
  const availableAgents = agents.filter(
    (agent) =>
      !excludeAgentIds.includes(agent.id) &&
      !selectedAgentIds.includes(agent.id) &&
      !agent.deletedAt,
  )

  // Get selected agent objects
  const selectedAgents = agents.filter((agent) =>
    selectedAgentIds.includes(agent.id),
  )

  const handleSelectAgent = (agentId: string) => {
    if (!selectedAgentIds.includes(agentId)) {
      onSelectionChange([...selectedAgentIds, agentId])
    }
  }

  const handleRemoveAgent = (agentId: string) => {
    onSelectionChange(selectedAgentIds.filter((id) => id !== agentId))
  }

  const getAgentDisplayName = (agent: Agent) => {
    return agent.i18n?.[lang as LanguageCode]?.name || agent.name
  }

  const colorClasses: Record<string, string> = {
    blue: 'border-blue-500 bg-blue-50 dark:bg-blue-950/30',
    red: 'border-red-500 bg-red-50 dark:bg-red-950/30',
    green: 'border-green-500 bg-green-50 dark:bg-green-950/30',
    purple: 'border-purple-500 bg-purple-50 dark:bg-purple-950/30',
  }

  const chipColorClasses: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200',
    red: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200',
    green:
      'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200',
    purple:
      'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200',
  }

  return (
    <Card
      className={`border-2 ${colorClasses[teamColor] || colorClasses.blue}`}
    >
      <CardBody className="gap-4">
        {/* Team Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon name="User" className="w-5 h-5" />
            <h3 className="font-semibold text-lg">{teamName}</h3>
          </div>
          <Chip
            size="sm"
            variant="flat"
            className={chipColorClasses[teamColor] || chipColorClasses.blue}
          >
            {selectedAgentIds.length} {t('agents')}
          </Chip>
        </div>

        {/* Selected Agents */}
        {selectedAgents.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selectedAgents.map((agent) => (
              <Chip
                key={agent.id}
                variant="solid"
                color={teamColor === 'red' ? 'danger' : 'primary'}
                onClose={() => handleRemoveAgent(agent.id)}
                avatar={
                  agent.icon ? (
                    <div className="flex items-center justify-center w-full h-full">
                      <Icon name={agent.icon} className="w-3 h-3" />
                    </div>
                  ) : undefined
                }
              >
                {getAgentDisplayName(agent)}
              </Chip>
            ))}
          </div>
        )}

        {/* Available Agents */}
        <div className="space-y-2">
          <p className="text-sm text-default-500">{t('Available Agents')}</p>
          <ScrollShadow className="max-h-48">
            <div className="flex flex-wrap gap-2">
              {availableAgents.length === 0 ? (
                <p className="text-sm text-default-400 italic">
                  {t('No available agents')}
                </p>
              ) : (
                availableAgents.map((agent) => (
                  <Chip
                    key={agent.id}
                    variant="bordered"
                    className="cursor-pointer hover:bg-default-100 transition-colors"
                    onClick={() => handleSelectAgent(agent.id)}
                    startContent={
                      agent.icon ? (
                        <Icon name={agent.icon} className="w-3 h-3" />
                      ) : (
                        <Icon name="Plus" className="w-3 h-3" />
                      )
                    }
                  >
                    {getAgentDisplayName(agent)}
                  </Chip>
                ))
              )}
            </div>
          </ScrollShadow>
        </div>
      </CardBody>
    </Card>
  )
}
