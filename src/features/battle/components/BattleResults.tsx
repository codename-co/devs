/**
 * BattleResults Component
 *
 * Final results display showing champion, standings, and match history.
 */
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Chip,
  Divider,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
} from '@heroui/react'
import { useMemo } from 'react'

import { Icon } from '@/components/Icon'
import { useI18n } from '@/i18n'
import { type LanguageCode } from '@/i18n/locales'
import { useAgents } from '@/hooks'
import { type Agent } from '@/types'
import { type Battle } from '../types'
import { battleI18n } from '../i18n'

interface BattleResultsProps {
  /** The completed battle */
  battle: Battle
  /** Callback to view a specific match conversation */
  onViewConversation?: (conversationId: string) => void
  /** Callback to start a new battle */
  onNewBattle?: () => void
  /** Callback to share results */
  onShareResults?: () => void
}

interface Standing {
  agentId: string
  position: number
  wins: number
  losses: number
  totalScore: number
  roundEliminated?: number
}

export const BattleResults = ({
  battle,
  onViewConversation,
  onNewBattle,
  onShareResults,
}: BattleResultsProps) => {
  const { t, lang } = useI18n(battleI18n)
  const agents = useAgents()

  const getAgentDisplayName = (agentId: string): string => {
    const agent = agents.find((a) => a.id === agentId)
    return agent?.i18n?.[lang as LanguageCode]?.name || agent?.name || 'Unknown'
  }

  const getAgent = (agentId: string): Agent | undefined => {
    return agents.find((a) => a.id === agentId)
  }

  // Calculate standings
  const standings = useMemo((): Standing[] => {
    const allAgentIds = [...battle.teamA.agentIds, ...battle.teamB.agentIds]

    const standingsMap = new Map<string, Standing>()

    // Initialize standings
    allAgentIds.forEach((agentId) => {
      standingsMap.set(agentId, {
        agentId,
        position: 0,
        wins: 0,
        losses: 0,
        totalScore: 0,
        roundEliminated: undefined,
      })
    })

    // Calculate stats from all rounds
    battle.rounds.forEach((round) => {
      round.matches.forEach((match) => {
        if (match.status !== 'completed' || !match.winnerId) return

        const winnerId = match.winnerId
        const loserId =
          match.agentAId === winnerId ? match.agentBId : match.agentAId

        // Update winner
        const winnerStanding = standingsMap.get(winnerId)
        if (winnerStanding) {
          winnerStanding.wins++
          if (match.judgment) {
            const score = match.judgment.scores.find(
              (s) => s.agentId === winnerId,
            )
            if (score) winnerStanding.totalScore += score.total
          }
        }

        // Update loser
        const loserStanding = standingsMap.get(loserId)
        if (loserStanding) {
          loserStanding.losses++
          loserStanding.roundEliminated = round.roundNumber
          if (match.judgment) {
            const score = match.judgment.scores.find(
              (s) => s.agentId === loserId,
            )
            if (score) loserStanding.totalScore += score.total
          }
        }
      })
    })

    // Sort by wins (desc), then by total score (desc)
    const sortedStandings = Array.from(standingsMap.values()).sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins
      return b.totalScore - a.totalScore
    })

    // Assign positions
    sortedStandings.forEach((standing, idx) => {
      standing.position = idx + 1
    })

    return sortedStandings
  }, [battle])

  // Get champion
  const champion = useMemo(() => {
    if (!battle.championAgentId) return null
    return getAgent(battle.championAgentId)
  }, [battle.championAgentId, agents])

  // Get match history
  const matchHistory = useMemo(() => {
    return battle.rounds.flatMap((round) =>
      round.matches
        .filter((match) => match.status === 'completed')
        .map((match) => ({
          ...match,
          roundNumber: round.roundNumber,
        })),
    )
  }, [battle.rounds])

  const getPositionBadge = (position: number) => {
    if (position === 1) {
      return (
        <Chip
          startContent={<Icon name="Crown" className="w-4 h-4" />}
          color="warning"
          variant="flat"
          className="bg-amber-100 text-amber-700"
        >
          1st
        </Chip>
      )
    }
    if (position === 2) {
      return (
        <Chip
          color="default"
          variant="flat"
          className="bg-gray-200 text-gray-700"
        >
          2nd
        </Chip>
      )
    }
    if (position === 3) {
      return (
        <Chip
          color="default"
          variant="flat"
          className="bg-orange-100 text-orange-700"
        >
          3rd
        </Chip>
      )
    }
    return (
      <Chip color="default" variant="flat">
        {position}th
      </Chip>
    )
  }

  return (
    <div className="space-y-6">
      {/* Champion Showcase */}
      {champion && (
        <Card className="bg-gradient-to-br from-amber-100 via-yellow-50 to-amber-100 dark:from-amber-950/50 dark:via-yellow-950/30 dark:to-amber-950/50 border-2 border-amber-400 overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0wIDBoNDB2NDBIMHoiLz48cGF0aCBkPSJNMjAgMjBsLTgtOC0yIDItOC04IDIgMiA4IDggOC04IDIgMi04IDggOCA4LTIgMiA4LTgtMi0yLTgtOC04IDgtMi0yIDgtOHoiIGZpbGw9IiNmYmJmMjQiIGZpbGwtb3BhY2l0eT0iLjEiLz48L2c+PC9zdmc+')] opacity-30" />
          <CardBody className="items-center py-8 relative">
            <div className="absolute top-4 left-4">
              <Icon
                name="SparksSolid"
                className="w-8 h-8 text-amber-400 animate-pulse"
              />
            </div>
            <div className="absolute top-4 end-4">
              <Icon
                name="SparksSolid"
                className="w-8 h-8 text-amber-400 animate-pulse"
              />
            </div>

            <Icon name="Crown" className="w-16 h-16 text-amber-500 mb-4" />
            <h2 className="text-2xl font-bold text-amber-800 dark:text-amber-200 mb-2">
              {t('Champion')}
            </h2>
            <div className="flex items-center gap-3">
              {champion.icon && (
                <Icon name={champion.icon} className="w-10 h-10" />
              )}
              <span className="text-3xl font-bold">
                {champion.i18n?.[lang as LanguageCode]?.name || champion.name}
              </span>
            </div>
            <p className="text-sm text-amber-600 dark:text-amber-400 mt-2">
              {t('Topic')}: {battle.topic}
            </p>
          </CardBody>
        </Card>
      )}

      {/* Final Standings */}
      <Card>
        <CardHeader className="flex gap-3">
          <Icon name="Star" className="w-6 h-6 text-primary" />
          <h3 className="text-lg font-bold">{t('Final Standings')}</h3>
        </CardHeader>
        <Divider />
        <CardBody>
          <Table aria-label={t('Final Standings')}>
            <TableHeader>
              <TableColumn>{t('Position')}</TableColumn>
              <TableColumn>{t('Agent')}</TableColumn>
              <TableColumn>{t('Wins')}</TableColumn>
              <TableColumn>{t('Losses')}</TableColumn>
              <TableColumn>{t('Total Score')}</TableColumn>
            </TableHeader>
            <TableBody>
              {standings.map((standing) => {
                const agent = getAgent(standing.agentId)
                return (
                  <TableRow key={standing.agentId}>
                    <TableCell>{getPositionBadge(standing.position)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {agent?.icon && (
                          <Icon name={agent.icon} className="w-5 h-5" />
                        )}
                        <span className="font-medium">
                          {getAgentDisplayName(standing.agentId)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Chip size="sm" color="success" variant="flat">
                        {standing.wins}
                      </Chip>
                    </TableCell>
                    <TableCell>
                      <Chip size="sm" color="danger" variant="flat">
                        {standing.losses}
                      </Chip>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono">{standing.totalScore}</span>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardBody>
      </Card>

      {/* Match History */}
      <Card>
        <CardHeader className="flex gap-3">
          <Icon name="ChatLines" className="w-6 h-6 text-primary" />
          <h3 className="text-lg font-bold">{t('Match History')}</h3>
        </CardHeader>
        <Divider />
        <CardBody className="gap-3">
          {matchHistory.length === 0 ? (
            <p className="text-default-500 text-center py-4">
              {t('No completed matches')}
            </p>
          ) : (
            matchHistory.map((match) => {
              const agentA = getAgent(match.agentAId)
              const agentB = getAgent(match.agentBId)
              const winner = getAgent(match.winnerId || '')

              return (
                <Card
                  key={match.id}
                  className="bg-default-50 dark:bg-default-100"
                >
                  <CardBody className="flex-row items-center justify-between gap-4 py-3">
                    <div className="flex items-center gap-4 flex-1">
                      <Chip size="sm" variant="flat">
                        {t('Round')} {match.roundNumber}
                      </Chip>

                      <div className="flex items-center gap-2">
                        {agentA?.icon && (
                          <Icon name={agentA.icon} className="w-4 h-4" />
                        )}
                        <span
                          className={
                            match.winnerId === match.agentAId
                              ? 'font-bold text-success'
                              : ''
                          }
                        >
                          {getAgentDisplayName(match.agentAId)}
                        </span>
                      </div>

                      <span className="text-default-400">vs</span>

                      <div className="flex items-center gap-2">
                        {agentB?.icon && (
                          <Icon name={agentB.icon} className="w-4 h-4" />
                        )}
                        <span
                          className={
                            match.winnerId === match.agentBId
                              ? 'font-bold text-success'
                              : ''
                          }
                        >
                          {getAgentDisplayName(match.agentBId)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {winner && (
                        <Chip
                          size="sm"
                          color="success"
                          variant="flat"
                          startContent={
                            <Icon name="Crown" className="w-3 h-3" />
                          }
                        >
                          {getAgentDisplayName(match.winnerId!)}
                        </Chip>
                      )}

                      {match.conversationId && onViewConversation && (
                        <Button
                          size="sm"
                          variant="light"
                          startContent={
                            <Icon name="ChatBubble" className="w-4 h-4" />
                          }
                          onPress={() =>
                            onViewConversation(match.conversationId!)
                          }
                        >
                          {t('View')}
                        </Button>
                      )}
                    </div>
                  </CardBody>
                </Card>
              )
            })
          )}
        </CardBody>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3 justify-center">
        {onShareResults && (
          <Button
            variant="bordered"
            startContent={<Icon name="Share" className="w-5 h-5" />}
            onPress={onShareResults}
          >
            {t('Share Results')}
          </Button>
        )}

        {onNewBattle && (
          <Button
            color="primary"
            startContent={<Icon name="Plus" className="w-5 h-5" />}
            onPress={onNewBattle}
          >
            {t('New Battle')}
          </Button>
        )}
      </div>
    </div>
  )
}
