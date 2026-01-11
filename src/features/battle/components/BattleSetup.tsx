/**
 * BattleSetup Component
 *
 * Configuration form for creating battles.
 * Allows users to set topic, select teams, choose judge, and configure settings.
 */
import {
  Card,
  CardBody,
  CardHeader,
  Textarea,
  Select,
  SelectItem,
  Button,
  Accordion,
  AccordionItem,
  Input,
  Divider,
} from '@heroui/react'
import { useState, useMemo } from 'react'

import { Icon } from '@/components/Icon'
import { useI18n } from '@/i18n'
import { type LanguageCode } from '@/i18n/locales'
import { useAllAgents } from '@/hooks'
import { type Agent } from '@/types'
import { type BattleConfig } from '../types'
import { AgentTeamSelector } from './AgentTeamSelector'
import { battleI18n } from '../i18n'

interface BattleSetupProps {
  /** Callback when battle is started */
  onStartBattle: (config: BattleConfig) => void
  /** Whether the battle is currently being created */
  isLoading?: boolean
}

export const BattleSetup = ({
  onStartBattle,
  isLoading = false,
}: BattleSetupProps) => {
  const { t, lang } = useI18n(battleI18n)
  const agents = useAllAgents()

  // Form state
  const [topic, setTopic] = useState('')
  const [teamAAgentIds, setTeamAAgentIds] = useState<string[]>([])
  const [teamBAgentIds, setTeamBAgentIds] = useState<string[]>([])
  const [judgeAgentId, setJudgeAgentId] = useState<string>('')
  const [turnsPerConversation, setTurnsPerConversation] = useState(8)
  const [customJudgingCriteria, setCustomJudgingCriteria] = useState('')

  // Filter out agents already selected as judge
  const availableAgents = useMemo(
    () => agents.filter((agent) => !agent.deletedAt),
    [agents],
  )

  const getAgentDisplayName = (agent: Agent) => {
    return agent.i18n?.[lang as LanguageCode]?.name || agent.name
  }

  // Validation
  const isValidConfig = useMemo(() => {
    return (
      topic.trim().length > 0 &&
      teamAAgentIds.length > 0 &&
      teamBAgentIds.length > 0 &&
      teamAAgentIds.length === teamBAgentIds.length &&
      judgeAgentId.length > 0
    )
  }, [topic, teamAAgentIds, teamBAgentIds, judgeAgentId])

  const handleStartBattle = () => {
    if (!isValidConfig) return

    const config: BattleConfig = {
      topic: topic.trim(),
      judgeAgentId,
      teamA: {
        name: t('Team A'),
        agentIds: teamAAgentIds,
      },
      teamB: {
        name: t('Team B'),
        agentIds: teamBAgentIds,
      },
      turnsPerConversation,
      customJudgingCriteria: customJudgingCriteria.trim() || undefined,
    }

    onStartBattle(config)
  }

  // Exclude agents from the other team and the judge
  const teamAExcluded = [...teamBAgentIds, judgeAgentId].filter(Boolean)
  const teamBExcluded = [...teamAAgentIds, judgeAgentId].filter(Boolean)

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader className="flex gap-3">
        <Icon name="Strategy" className="w-8 h-8 text-primary" />
        <div className="flex flex-col">
          <h2 className="text-xl font-bold">{t('Battle Setup')}</h2>
          <p className="text-small text-default-500">
            {t('Configure your agent battle')}
          </p>
        </div>
      </CardHeader>
      <Divider />
      <CardBody className="gap-6">
        {/* Topic Input */}
        <Textarea
          label={t('Battle Topic')}
          placeholder={t('Enter the topic for the debate...')}
          description={t('What should the agents debate about?')}
          value={topic}
          onValueChange={setTopic}
          minRows={2}
          maxRows={4}
          isRequired
        />

        {/* Teams Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Team A */}
          <AgentTeamSelector
            teamName={t('Team A')}
            teamColor="blue"
            selectedAgentIds={teamAAgentIds}
            onSelectionChange={setTeamAAgentIds}
            excludeAgentIds={teamAExcluded}
          />

          {/* Team B */}
          <AgentTeamSelector
            teamName={t('Team B')}
            teamColor="red"
            selectedAgentIds={teamBAgentIds}
            onSelectionChange={setTeamBAgentIds}
            excludeAgentIds={teamBExcluded}
          />
        </div>

        {/* Team Balance Warning */}
        {teamAAgentIds.length !== teamBAgentIds.length &&
          (teamAAgentIds.length > 0 || teamBAgentIds.length > 0) && (
            <div className="flex items-center gap-2 p-3 bg-warning-50 dark:bg-warning-950/30 rounded-lg border border-warning-200 dark:border-warning-800">
              <Icon
                name="WarningTriangle"
                className="w-5 h-5 text-warning-600"
              />
              <p className="text-sm text-warning-700 dark:text-warning-300">
                {t('Teams must have the same number of agents')} ({t('Team A')}:{' '}
                {teamAAgentIds.length}, {t('Team B')}: {teamBAgentIds.length})
              </p>
            </div>
          )}

        {/* Judge Selection */}
        <Select
          label={t('Judge Agent')}
          placeholder={t('Select a judge agent')}
          description={t(
            'This agent will evaluate debates and determine winners',
          )}
          selectedKeys={judgeAgentId ? [judgeAgentId] : []}
          onSelectionChange={(keys) => {
            const selected = Array.from(keys)[0] as string
            setJudgeAgentId(selected || '')
          }}
          isRequired
        >
          {availableAgents
            .filter(
              (agent) =>
                !teamAAgentIds.includes(agent.id) &&
                !teamBAgentIds.includes(agent.id),
            )
            .map((agent) => (
              <SelectItem
                key={agent.id}
                startContent={
                  agent.icon ? (
                    <Icon name={agent.icon} className="w-4 h-4" />
                  ) : undefined
                }
              >
                {getAgentDisplayName(agent)}
              </SelectItem>
            ))}
        </Select>

        {/* Advanced Settings */}
        <Accordion variant="bordered">
          <AccordionItem
            key="advanced"
            aria-label={t('Advanced settings')}
            title={t('Advanced settings')}
            startContent={<Icon name="Settings" className="w-5 h-5" />}
          >
            <div className="space-y-4 pb-4">
              <Input
                type="number"
                label={t('Turns per Conversation')}
                description={t('Number of message exchanges per match')}
                value={turnsPerConversation.toString()}
                onValueChange={(val) =>
                  setTurnsPerConversation(Math.max(2, parseInt(val) || 8))
                }
                min={2}
                max={20}
              />

              <Textarea
                label={t('Custom Judging Criteria')}
                placeholder={t(
                  'Optional: Add custom criteria for the judge...',
                )}
                description={t(
                  'Additional instructions for the judge when evaluating debates',
                )}
                value={customJudgingCriteria}
                onValueChange={setCustomJudgingCriteria}
                minRows={2}
              />
            </div>
          </AccordionItem>
        </Accordion>

        {/* Start Button */}
        <Button
          color="primary"
          size="lg"
          onPress={handleStartBattle}
          isDisabled={!isValidConfig}
          isLoading={isLoading}
          startContent={!isLoading && <Icon name="Play" className="w-5 h-5" />}
          className="w-full md:w-auto md:self-end"
        >
          {t('Start Battle')}
        </Button>
      </CardBody>
    </Card>
  )
}
