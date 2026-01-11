/**
 * BattleBracket Component
 *
 * Tournament bracket visualization showing the battle tree structure.
 * Highlights current round/match and shows winners.
 */
import { Card, CardBody, Chip } from '@heroui/react'
import { useMemo } from 'react'

import { Icon } from '@/components/Icon'
import { useI18n } from '@/i18n'
import { type LanguageCode } from '@/i18n/locales'
import { useAgents } from '@/hooks'
import { type Agent } from '@/types'
import { type Battle, type BattleMatch as BattleMatchType } from '../types'
import { battleI18n } from '../i18n'

interface BattleBracketProps {
  /** The battle to display */
  battle: Battle
  /** Callback when a match is clicked */
  onMatchClick?: (matchId: string) => void
}

interface BracketNodeProps {
  agentId: string
  isWinner?: boolean
  isActive?: boolean
  agents: Agent[]
  lang: string
}

const BracketNode = ({
  agentId,
  isWinner,
  isActive,
  agents,
  lang,
}: BracketNodeProps) => {
  const agent = agents.find((a) => a.id === agentId)
  const displayName = agent?.i18n?.[lang as LanguageCode]?.name || agent?.name || 'Unknown'

  return (
    <div
      className={`
        flex items-center gap-2 px-3 py-2 rounded-lg border-2 min-w-32
        ${isWinner ? 'border-success bg-success-50 dark:bg-success-950/30' : ''}
        ${isActive && !isWinner ? 'border-primary bg-primary-50 dark:bg-primary-950/30 animate-pulse' : ''}
        ${!isWinner && !isActive ? 'border-default-200 bg-default-50 dark:bg-default-900' : ''}
      `}
    >
      {agent?.icon && <Icon name={agent.icon} className="w-4 h-4 shrink-0" />}
      <span className="text-sm font-medium truncate">{displayName}</span>
      {isWinner && (
        <Icon name="Check" className="w-4 h-4 text-success ml-auto shrink-0" />
      )}
    </div>
  )
}

interface MatchCardProps {
  match: BattleMatchType
  roundNumber: number
  isCurrentRound: boolean
  onClick?: () => void
  agents: Agent[]
  lang: string
  t: (key: string) => string
}

const MatchCard = ({
  match,
  roundNumber,
  isCurrentRound,
  onClick,
  agents,
  lang,
  t,
}: MatchCardProps) => {
  const isActive = isCurrentRound && match.status === 'in_progress'
  const isJudging = match.status === 'judging'

  return (
    <Card
      className={`
        cursor-pointer transition-all hover:scale-105
        ${isActive ? 'ring-2 ring-primary' : ''}
        ${isJudging ? 'ring-2 ring-warning' : ''}
      `}
      isPressable={!!onClick}
      onPress={onClick}
    >
      <CardBody className="gap-2 p-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-default-500">
            {t('Round')} {roundNumber}
          </span>
          <Chip
            size="sm"
            variant="flat"
            color={
              match.status === 'completed'
                ? 'success'
                : match.status === 'in_progress'
                  ? 'primary'
                  : match.status === 'judging'
                    ? 'warning'
                    : 'default'
            }
          >
            {t(match.status)}
          </Chip>
        </div>

        {/* Agent A */}
        <BracketNode
          agentId={match.agentAId}
          isWinner={match.winnerId === match.agentAId}
          isActive={isActive}
          agents={agents}
          lang={lang}
        />

        {/* VS Divider */}
        <div className="flex items-center gap-2 py-1">
          <div className="flex-1 h-px bg-default-200" />
          <span className="text-xs font-bold text-default-400">VS</span>
          <div className="flex-1 h-px bg-default-200" />
        </div>

        {/* Agent B */}
        <BracketNode
          agentId={match.agentBId}
          isWinner={match.winnerId === match.agentBId}
          isActive={isActive}
          agents={agents}
          lang={lang}
        />
      </CardBody>
    </Card>
  )
}

export const BattleBracket = ({ battle, onMatchClick }: BattleBracketProps) => {
  const { t, lang } = useI18n(battleI18n)
  const agents = useAgents()

  // Find current round
  const currentRoundIndex = useMemo(() => {
    const idx = battle.rounds.findIndex(
      (r) => r.status === 'in_progress' || r.status === 'pending',
    )
    return idx >= 0 ? idx : battle.rounds.length - 1
  }, [battle.rounds])

  // Get champion agent
  const championAgent = useMemo(() => {
    if (!battle.championAgentId) return null
    return agents.find((a) => a.id === battle.championAgentId)
  }, [battle.championAgentId, agents])

  if (battle.rounds.length === 0) {
    return (
      <Card>
        <CardBody className="items-center justify-center py-12">
          <Icon name="Strategy" className="w-12 h-12 text-default-300 mb-4" />
          <p className="text-default-500">{t('No matches yet')}</p>
        </CardBody>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Champion Display */}
      {battle.status === 'completed' && championAgent && (
        <Card className="bg-gradient-to-r from-amber-100 to-yellow-100 dark:from-amber-950/50 dark:to-yellow-950/50 border-2 border-amber-400">
          <CardBody className="items-center py-6">
            <Icon name="Crown" className="w-10 h-10 text-amber-500 mb-2" />
            <h3 className="text-lg font-bold text-amber-700 dark:text-amber-300">
              {t('Champion')}
            </h3>
            <div className="flex items-center gap-2 mt-2">
              {championAgent.icon && (
                <Icon name={championAgent.icon} className="w-6 h-6" />
              )}
              <span className="text-xl font-bold">
                {championAgent.i18n?.[lang as LanguageCode]?.name || championAgent.name}
              </span>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Bracket Rounds */}
      <div className="flex flex-col lg:flex-row gap-6 overflow-x-auto pb-4">
        {battle.rounds.map((round, roundIndex) => (
          <div key={round.id} className="flex flex-col gap-4 min-w-64">
            {/* Round Header */}
            <div
              className={`
              flex items-center gap-2 px-3 py-2 rounded-lg
              ${roundIndex === currentRoundIndex ? 'bg-primary-100 dark:bg-primary-900/30' : 'bg-default-100 dark:bg-default-800'}
            `}
            >
              <Icon name="TriangleFlagTwoStripes" className="w-4 h-4" />
              <span className="font-semibold">
                {roundIndex === battle.rounds.length - 1
                  ? t('Finals')
                  : t('Round') + ' ' + round.roundNumber}
              </span>
              {round.status === 'completed' && (
                <Icon name="CheckCircle" className="w-4 h-4 text-success ml-auto" />
              )}
              {round.status === 'in_progress' && (
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse ml-auto" />
              )}
            </div>

            {/* Matches */}
            <div className="flex flex-col gap-4">
              {round.matches.map((match) => (
                <div key={match.id} className="relative">
                  <MatchCard
                    match={match}
                    roundNumber={round.roundNumber}
                    isCurrentRound={roundIndex === currentRoundIndex}
                    onClick={onMatchClick ? () => onMatchClick(match.id) : undefined}
                    agents={agents}
                    lang={lang}
                    t={t as unknown as (key: string) => string}
                  />

                  {/* Connector Line (for non-last rounds) */}
                  {roundIndex < battle.rounds.length - 1 && (
                    <div className="hidden lg:block absolute top-1/2 -right-6 w-6 h-px bg-default-300" />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
