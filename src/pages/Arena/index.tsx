/**
 * Battle Arena Page
 *
 * Main page for the Agent Battle feature where AI agents compete
 * in structured debates judged by an AI judge agent.
 */
import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Spinner, Button } from '@heroui/react'

import { useI18n } from '@/i18n'
import { Section, Container } from '@/components'
import { Icon } from '@/components/Icon'
import DefaultLayout from '@/layouts/Default'
import { HeaderProps } from '@/lib/types'
import { useBattle } from '@/features/battle/hooks'
import {
  BattleSetup,
  BattleBracket,
  BattleMatch,
  BattleResults,
} from '@/features/battle/components'
import { battleI18n } from '@/features/battle/i18n'
import { BattleConfig } from '@/features/battle/types'

export const ArenaPage = () => {
  const { t } = useI18n(battleI18n)
  const navigate = useNavigate()
  const { battleId } = useParams<{ battleId: string }>()

  const {
    battle,
    battles,
    isLoading,
    currentRound,
    currentMatch,
    isComplete,
    createBattle,
    startBattle,
    advanceRound,
    loadBattles,
  } = useBattle(battleId)

  // Load all battles on mount for the sidebar
  useEffect(() => {
    loadBattles()
  }, [loadBattles])

  const header: HeaderProps = {
    color: 'bg-warning-50',
    icon: {
      name: 'Crown',
      color: 'text-warning-500',
    },
    title: t('Arena'),
    subtitle: t('Battle Arena'),
  }

  // Handle battle creation
  const handleCreateBattle = async (config: BattleConfig) => {
    const newBattle = await createBattle(config)
    if (newBattle) {
      navigate(`/arena/match/${newBattle.id}`)
    }
  }

  // Handle starting the battle
  const handleStartBattle = async () => {
    await startBattle()
  }

  // Handle advancing to next round
  const handleAdvanceRound = async () => {
    await advanceRound()
  }

  // Handle new battle from results
  const handleNewBattle = () => {
    navigate('/arena')
  }

  // Render loading state
  if (isLoading) {
    return (
      <DefaultLayout header={header}>
        <Section>
          <Container>
            <div className="flex justify-center items-center min-h-[400px]">
              <Spinner size="lg" label={t('Waiting for response...')} />
            </div>
          </Container>
        </Section>
      </DefaultLayout>
    )
  }

  // Render based on battle state
  const renderContent = () => {
    // No battle selected - show setup
    if (!battle) {
      return <BattleSetup onStartBattle={handleCreateBattle} />
    }

    // Battle in setup phase
    if (battle.status === 'setup') {
      return (
        <div className="space-y-6">
          <BattleSetup
            onStartBattle={handleCreateBattle}
            isLoading={isLoading}
          />
          <div className="flex justify-center">
            <Button
              color="primary"
              size="lg"
              onPress={handleStartBattle}
              startContent={<Icon name="Play" className="w-5 h-5" />}
            >
              {t('Start Battle')}
            </Button>
          </div>
        </div>
      )
    }

    // Battle completed - show results
    if (battle.status === 'completed' || isComplete) {
      return <BattleResults battle={battle} onNewBattle={handleNewBattle} />
    }

    // Battle cancelled
    if (battle.status === 'cancelled') {
      return (
        <div className="text-center py-12">
          <Icon name="Xmark" className="w-16 h-16 text-danger mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">{t('Cancelled')}</h2>
          <p className="text-default-500 mb-6">{t('Battle not found')}</p>
          <Button color="primary" onPress={handleNewBattle}>
            {t('New Battle')}
          </Button>
        </div>
      )
    }

    // Check if current round is complete (all matches done, no pending matches)
    const isRoundComplete =
      currentRound &&
      !currentMatch &&
      currentRound.matches.every((m) => m.status === 'completed')

    // Battle in progress - show bracket and current match
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Icon name="Strategy" className="w-5 h-5 text-primary" />
            {t('Round')} {currentRound?.roundNumber || 1}
          </h3>
          <BattleBracket battle={battle} />
        </div>
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Icon name="Sparks" className="w-5 h-5 text-warning" />
            {t('vs')}
          </h3>
          {currentMatch ? (
            <BattleMatch battle={battle} match={currentMatch} />
          ) : isRoundComplete ? (
            // Round complete - show summary and next round button
            <div className="flex flex-col items-center justify-center p-8 bg-success-50 dark:bg-success-950/30 rounded-lg border border-success-200">
              <Icon
                name="CheckCircle"
                className="w-12 h-12 text-success mb-4"
              />
              <h4 className="text-lg font-semibold text-success-700 dark:text-success-300 mb-2">
                {t('Round')} {currentRound.roundNumber} {t('Completed')}
              </h4>
              <p className="text-default-500 mb-4 text-center">
                {currentRound.matches.length} {t('matches completed')}
              </p>
              <Button
                color="primary"
                size="lg"
                onPress={handleAdvanceRound}
                startContent={<Icon name="ArrowRight" className="w-5 h-5" />}
              >
                {t('Next Round')}
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-8 bg-default-50 dark:bg-default-900 rounded-lg border border-default-200">
              <Icon name="Clock" className="w-12 h-12 text-default-400 mb-4" />
              <p className="text-default-500">{t('Waiting for matches...')}</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Render past battles sidebar (optional - only if there are battles)
  const renderPastBattles = () => {
    if (!battles || battles.length === 0) return null

    // Filter out current battle
    const pastBattles = battles.filter((b) => b.id !== battleId).slice(0, 5)
    if (pastBattles.length === 0) return null

    return (
      <div className="mt-8 pt-8 border-t border-default-200">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Icon name="Clock" className="w-5 h-5" />
          {t('Match History')}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {pastBattles.map((pastBattle) => (
            <button
              key={pastBattle.id}
              onClick={() => navigate(`/arena/match/${pastBattle.id}`)}
              className="p-4 rounded-lg border border-default-200 hover:border-primary hover:bg-default-50 dark:hover:bg-default-900 transition-all text-left"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium truncate flex-1">
                  {pastBattle.topic}
                </span>
                <span
                  className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                    pastBattle.status === 'completed'
                      ? 'bg-success-100 text-success-700 dark:bg-success-950 dark:text-success-400'
                      : pastBattle.status === 'in_progress'
                        ? 'bg-primary-100 text-primary-700 dark:bg-primary-950 dark:text-primary-400'
                        : 'bg-default-100 text-default-600'
                  }`}
                >
                  {pastBattle.status === 'completed'
                    ? t('Completed')
                    : pastBattle.status === 'in_progress'
                      ? t('In Progress')
                      : pastBattle.status === 'setup'
                        ? t('Pending')
                        : t('Cancelled')}
                </span>
              </div>
              <p className="text-xs text-default-500">
                {pastBattle.teamA.agentIds.length} vs{' '}
                {pastBattle.teamB.agentIds.length} {t('agents')}
              </p>
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <DefaultLayout header={header}>
      <Section>
        <Container>
          {/* New Battle Button - always visible when viewing a battle */}
          {battle && (
            <div className="flex justify-end mb-4">
              <Button
                color="primary"
                variant="flat"
                onPress={handleNewBattle}
                startContent={<Icon name="Plus" className="w-4 h-4" />}
              >
                {t('New Battle')}
              </Button>
            </div>
          )}
          {renderContent()}
          {renderPastBattles()}
        </Container>
      </Section>
    </DefaultLayout>
  )
}

export default ArenaPage
