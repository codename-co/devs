/**
 * CardBattlePage
 *
 * Main page for trading card battles between AI agents.
 * Integrates CardSelection, CardBattleField, and battle logic.
 */
import { useState, useCallback, useEffect, useRef } from 'react'
import { Button, Spinner } from '@heroui/react'
import { Section, Container } from '@/components'
import { Icon } from '@/components/Icon'
import DefaultLayout from '@/layouts/Default'
import { HeaderProps } from '@/lib/types'
import { useI18n } from '@/i18n'
import { battleI18n } from '../i18n'
import { AgentCard, CardAbility } from '../types'
import { CardCarousel } from '../components/CardCarousel'
import { CardBattleField } from '../components/CardBattleField'
import { useCardBattle } from '../hooks/useCardBattle'
import { battleLogicService } from '../services/battleLogicService'

export const CardBattlePage = () => {
  const { t } = useI18n(battleI18n)

  // State
  const [phase, setPhase] = useState<'selection' | 'battle' | 'results'>(
    'selection',
  )
  const [playerCard, setPlayerCard] = useState<AgentCard | null>(null)
  const [opponentCard, setOpponentCard] = useState<AgentCard | null>(null)
  const [isAutoPlay, setIsAutoPlay] = useState(false)
  const [totalDamageDealt, setTotalDamageDealt] = useState(0)
  const [turnsPlayed, setTurnsPlayed] = useState(0)
  const [isAIActing, setIsAIActing] = useState(false)

  // Battle hook
  const battle = useCardBattle(playerCard, opponentCard)

  // Ref to always have access to latest battle state in async callbacks
  const battleRef = useRef(battle)
  battleRef.current = battle

  const cardsRef = useRef({ playerCard, opponentCard })
  cardsRef.current = { playerCard, opponentCard }

  // When cards selected, start battle
  const handleBattleStart = useCallback(
    (player: AgentCard, opponent: AgentCard) => {
      setPlayerCard(player)
      setOpponentCard(opponent)
      setPhase('battle')
      setTotalDamageDealt(0)
      setTurnsPlayed(0)
      setIsAIActing(false)
      // Start battle after a short delay, passing cards directly to avoid stale closure
      setTimeout(() => battle.startBattle(player, opponent), 500)
    },
    [battle],
  )

  // AI turn execution - uses refs to access fresh state in async callbacks
  const executeAITurn = useCallback(() => {
    const { playerCard: pc, opponentCard: oc } = cardsRef.current
    const currentBattle = battleRef.current

    // Check we have the cards and battle is active
    if (!oc || !pc) return
    if (currentBattle.battleStatus !== 'battling') return
    if (!currentBattle.opponentState || !currentBattle.playerState) return

    // Mark AI as acting to prevent player input
    setIsAIActing(true)

    // End player turn first
    currentBattle.endTurn()

    // Schedule AI action with a delay for dramatic effect
    setTimeout(() => {
      const b = battleRef.current
      const cards = cardsRef.current

      // Re-check battle status in case something changed
      if (b.battleStatus !== 'battling') {
        setIsAIActing(false)
        return
      }

      if (
        !b.opponentState ||
        !b.playerState ||
        !cards.opponentCard ||
        !cards.playerCard
      ) {
        setIsAIActing(false)
        return
      }

      const aiAction = battleLogicService.selectAIAction(
        cards.opponentCard,
        b.opponentState,
        cards.playerCard,
        b.playerState,
      )

      // Execute the AI's chosen action
      if (aiAction.type === 'ability' && aiAction.ability) {
        b.useAbility(cards.opponentCard.id, aiAction.ability)
      } else if (aiAction.type === 'defend') {
        b.defend(cards.opponentCard.id)
      } else {
        b.charge(cards.opponentCard.id)
      }

      // End AI turn after action completes
      setTimeout(() => {
        const finalBattle = battleRef.current
        if (finalBattle.battleStatus === 'battling') {
          finalBattle.endTurn()
        }
        setTurnsPlayed((prev) => prev + 1)
        setIsAIActing(false)
      }, 500)
    }, 1000)
  }, [])

  // Handle player actions - use refs for battle to avoid stale closures
  const handleAbilityUse = useCallback(
    (cardId: string, ability: CardAbility) => {
      if (isAIActing) return // Prevent action during AI turn
      const power = ability.power || 0
      setTotalDamageDealt((prev) => prev + power)
      battleRef.current.useAbility(cardId, ability)
      // After player action, trigger AI turn
      setTimeout(() => executeAITurn(), 1000)
    },
    [executeAITurn, isAIActing],
  )

  const handleDefend = useCallback(
    (cardId: string) => {
      if (isAIActing) return
      battleRef.current.defend(cardId)
      setTimeout(() => executeAITurn(), 1000)
    },
    [executeAITurn, isAIActing],
  )

  const handleCharge = useCallback(
    (cardId: string) => {
      if (isAIActing) return
      battleRef.current.charge(cardId)
      setTimeout(() => executeAITurn(), 1000)
    },
    [executeAITurn, isAIActing],
  )

  // Check for battle end
  useEffect(() => {
    if (
      battle.battleStatus === 'player_won' ||
      battle.battleStatus === 'opponent_won'
    ) {
      setTimeout(() => setPhase('results'), 2000)
    }
  }, [battle.battleStatus])

  // New battle handler
  const handleNewBattle = useCallback(() => {
    setPhase('selection')
    setPlayerCard(null)
    setOpponentCard(null)
    setTotalDamageDealt(0)
    setTurnsPlayed(0)
    setIsAIActing(false)
    battle.resetBattle()
  }, [battle])

  // Header configuration
  const header: HeaderProps = {
    color: 'bg-warning-50',
    icon: { name: 'Crown', color: 'text-warning-500' },
    title: t('Arena'),
    subtitle: t('Arena Subtitle'),
  }

  // Determine winner
  const isVictory = battle.battleStatus === 'player_won'
  const playerHpRemaining = battle.playerState?.currentHp || 0

  return (
    <DefaultLayout header={header}>
      <Section>
        <Container>
          {/* Selection Phase */}
          {phase === 'selection' && (
            <CardCarousel onBattleStart={handleBattleStart} />
          )}

          {/* Battle Phase */}
          {phase === 'battle' &&
            playerCard &&
            opponentCard &&
            battle.playerState &&
            battle.opponentState && (
              <div className="space-y-6">
                {/* Auto-play toggle */}
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    variant={isAutoPlay ? 'solid' : 'bordered'}
                    color="secondary"
                    onPress={() => setIsAutoPlay(!isAutoPlay)}
                    startContent={<Icon name="Sparks" size="md" />}
                  >
                    {t('Auto Battle')}
                  </Button>
                </div>

                {/* Battle Field */}
                <CardBattleField
                  leftCard={battle.playerState}
                  rightCard={battle.opponentState}
                  currentTurn={battle.currentTurn}
                  maxTurns={30}
                  activeCardId={
                    battle.isPlayerTurn && !isAIActing
                      ? playerCard.id
                      : opponentCard.id
                  }
                  isAutoPlay={isAutoPlay}
                  turns={battle.turns}
                  onAbilityUse={handleAbilityUse}
                  onDefend={handleDefend}
                  onCharge={handleCharge}
                  onToggleAutoPlay={() => setIsAutoPlay(!isAutoPlay)}
                  isPlayerTurn={battle.isPlayerTurn && !isAIActing}
                  announcement={battle.announcement}
                  activeEffect={battle.activeEffect}
                  lastActionResult={battle.lastActionResult}
                />
              </div>
            )}

          {/* Results Phase */}
          {phase === 'results' && (
            <div className="flex min-h-[60vh] flex-col items-center justify-center space-y-8">
              {/* Victory/Defeat Banner */}
              <div
                className={`text-center ${isVictory ? 'text-success-500' : 'text-danger-500'}`}
              >
                <Icon
                  name={isVictory ? 'Crown' : 'WarningTriangle'}
                  size="5xl"
                  className="mx-auto mb-4"
                />
                <h1 className="mb-2 text-6xl font-bold">
                  {isVictory ? t('Victory') : t('Defeat')}
                </h1>
                <p className="text-xl text-default-600">
                  {isVictory
                    ? t('Victory Description')
                    : t('Defeat Description')}
                </p>
              </div>

              {/* Battle Statistics */}
              <div className="grid w-full max-w-md grid-cols-3 gap-4 rounded-xl bg-default-100 p-6">
                <div className="text-center">
                  <Icon
                    name="Heart"
                    size="lg"
                    className="mx-auto mb-2 text-danger-500"
                  />
                  <p className="text-2xl font-bold">{playerHpRemaining}</p>
                  <p className="text-sm text-default-500">{t('HP')}</p>
                </div>
                <div className="text-center">
                  <Icon
                    name="RefreshDouble"
                    size="lg"
                    className="mx-auto mb-2 text-primary-500"
                  />
                  <p className="text-2xl font-bold">{turnsPlayed}</p>
                  <p className="text-sm text-default-500">{t('Turns')}</p>
                </div>
                <div className="text-center">
                  <Icon
                    name="Sparks"
                    size="lg"
                    className="mx-auto mb-2 text-warning-500"
                  />
                  <p className="text-2xl font-bold">{totalDamageDealt}</p>
                  <p className="text-sm text-default-500">{t('Damage')}</p>
                </div>
              </div>

              {/* Cards involved */}
              {playerCard && opponentCard && (
                <div className="flex items-center gap-8">
                  <div className="text-center">
                    <div
                      className={`rounded-lg border-2 p-4 ${isVictory ? 'border-success-500 bg-success-50' : 'border-default-300 bg-default-50'}`}
                    >
                      <p className="font-semibold">{playerCard.name}</p>
                      <p className="text-sm text-default-500">
                        {t('Your Card')}
                      </p>
                    </div>
                  </div>
                  <Icon
                    name="Strategy"
                    size="xl"
                    className="text-default-400"
                  />
                  <div className="text-center">
                    <div
                      className={`rounded-lg border-2 p-4 ${!isVictory ? 'border-success-500 bg-success-50' : 'border-default-300 bg-default-50'}`}
                    >
                      <p className="font-semibold">{opponentCard.name}</p>
                      <p className="text-sm text-default-500">
                        {t('Opponent')}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Play Again Button */}
              <Button
                size="lg"
                color="primary"
                variant="shadow"
                onPress={handleNewBattle}
                startContent={<Icon name="RefreshDouble" size="md" />}
                className="px-8"
              >
                {t('New Battle')}
              </Button>
            </div>
          )}

          {/* Loading State */}
          {battle.battleStatus === 'setup' && phase === 'battle' && (
            <div className="flex min-h-[40vh] flex-col items-center justify-center">
              <Spinner size="lg" color="primary" />
              <p className="mt-4 text-default-600">
                {t('Waiting for response...')}
              </p>
            </div>
          )}
        </Container>
      </Section>
    </DefaultLayout>
  )
}

export default CardBattlePage
