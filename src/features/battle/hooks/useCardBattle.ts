/**
 * Card Battle Hook
 *
 * Manages trading card battle state including HP, energy, turns,
 * abilities, and battle flow. Handles damage calculation with element
 * effectiveness, critical hits, and status effects.
 *
 * @example
 * const {
 *   playerState,
 *   opponentState,
 *   battleStatus,
 *   startBattle,
 *   useAbility,
 *   defend,
 *   charge,
 *   endTurn,
 * } = useCardBattle(playerCard, opponentCard)
 */
import { useCallback, useState } from 'react'

import type {
  AgentCard,
  BattleAction,
  BattleActionResult,
  BattleAnnouncement,
  BattleCardState,
  BattleTurn,
  BattleVisualEffect,
  CardAbility,
  CardElement,
} from '../types'
import { ELEMENT_EFFECTIVENESS } from '../types'

// =============================================================================
// Types
// =============================================================================

type BattleStatus =
  | 'setup'
  | 'ready'
  | 'battling'
  | 'player_won'
  | 'opponent_won'
  | 'draw'

interface UseCardBattleReturn {
  // State
  playerState: BattleCardState | null
  opponentState: BattleCardState | null
  currentTurn: number
  isPlayerTurn: boolean
  turns: BattleTurn[]
  battleStatus: BattleStatus
  announcement: BattleAnnouncement | null
  activeEffect: BattleVisualEffect | null
  lastActionResult: BattleActionResult | null

  // Actions
  startBattle: (
    playerCard?: AgentCard | null,
    opponentCard?: AgentCard | null,
  ) => void
  useAbility: (cardId: string, ability: CardAbility) => void
  defend: (cardId: string) => void
  charge: (cardId: string) => void
  endTurn: () => void
  resetBattle: () => void
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Create initial battle state for a card
 */
function createBattleCardState(
  card: AgentCard,
  position: 'left' | 'right',
): BattleCardState {
  return {
    card,
    currentHp: card.baseStats.hp,
    currentEnergy: card.baseStats.energy,
    statusEffects: [],
    cooldowns: {},
    isKnockedOut: false,
    position,
  }
}

/**
 * Get element effectiveness multiplier
 */
function getElementMultiplier(
  attackerElement: CardElement,
  defenderElement: CardElement,
): number {
  const effectiveAgainst = ELEMENT_EFFECTIVENESS[attackerElement]
  if (effectiveAgainst?.includes(defenderElement)) {
    return 2.0 // Super effective
  }

  // Check if defender is effective against attacker (not effective)
  const defenderEffective = ELEMENT_EFFECTIVENESS[defenderElement]
  if (defenderEffective?.includes(attackerElement)) {
    return 0.5 // Not effective
  }

  return 1.0 // Neutral
}

/**
 * Calculate damage from an ability
 */
function calculateDamage(
  attacker: BattleCardState,
  defender: BattleCardState,
  ability: CardAbility,
  elementMultiplier: number,
): { damage: number; isCritical: boolean } {
  // Check for critical hit (10% chance)
  const isCritical = Math.random() < 0.1
  const criticalMultiplier = isCritical ? 1.5 : 1.0

  // Check if defender has defense buff (50% damage reduction)
  const hasDefenseBuff = defender.statusEffects.some(
    (effect) => effect.type === 'defense_up',
  )
  const defenseMultiplier = hasDefenseBuff ? 0.5 : 1.0

  // Base damage formula
  const baseDamage =
    ability.power *
    (attacker.card.currentStats.attack / defender.card.currentStats.defense) *
    elementMultiplier

  const finalDamage = Math.round(
    baseDamage * criticalMultiplier * defenseMultiplier,
  )

  return {
    damage: Math.max(1, finalDamage), // Minimum 1 damage
    isCritical,
  }
}

/**
 * Create an announcement configuration
 */
function createAnnouncement(
  text: string,
  style: BattleAnnouncement['style'],
  animation: BattleAnnouncement['animation'],
  duration: number = 2000,
): BattleAnnouncement {
  return { text, style, duration, animation }
}

/**
 * Create a visual effect configuration
 */
function createVisualEffect(
  type: BattleVisualEffect['type'],
  target: BattleVisualEffect['target'],
  colors: string[],
  intensity: number = 0.8,
  duration: number = 500,
): BattleVisualEffect {
  return { type, duration, colors, intensity, target }
}

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * Hook for managing trading card battle state
 */
export function useCardBattle(
  playerCard: AgentCard | null,
  opponentCard: AgentCard | null,
): UseCardBattleReturn {
  // Battle state
  const [playerState, setPlayerState] = useState<BattleCardState | null>(null)
  const [opponentState, setOpponentState] = useState<BattleCardState | null>(
    null,
  )
  const [currentTurn, setCurrentTurn] = useState(1)
  const [isPlayerTurn, setIsPlayerTurn] = useState(true)
  const [turns, setTurns] = useState<BattleTurn[]>([])
  const [battleStatus, setBattleStatus] = useState<BattleStatus>('setup')

  // Visual state
  const [announcement, setAnnouncement] = useState<BattleAnnouncement | null>(
    null,
  )
  const [activeEffect, setActiveEffect] = useState<BattleVisualEffect | null>(
    null,
  )
  const [lastActionResult, setLastActionResult] =
    useState<BattleActionResult | null>(null)

  /**
   * Show an announcement with auto-clear
   */
  const showAnnouncement = useCallback(
    (newAnnouncement: BattleAnnouncement) => {
      setAnnouncement(newAnnouncement)
      setTimeout(() => setAnnouncement(null), newAnnouncement.duration)
    },
    [],
  )

  /**
   * Show a visual effect with auto-clear
   */
  const showEffect = useCallback((effect: BattleVisualEffect) => {
    setActiveEffect(effect)
    setTimeout(() => setActiveEffect(null), effect.duration)
  }, [])

  /**
   * Initialize battle state
   */
  const startBattle = useCallback(
    (
      overridePlayerCard?: AgentCard | null,
      overrideOpponentCard?: AgentCard | null,
    ) => {
      const actualPlayerCard = overridePlayerCard ?? playerCard
      const actualOpponentCard = overrideOpponentCard ?? opponentCard

      if (!actualPlayerCard || !actualOpponentCard) {
        console.warn('Cannot start battle: missing cards')
        return
      }

      // Initialize card states
      setPlayerState(createBattleCardState(actualPlayerCard, 'left'))
      setOpponentState(createBattleCardState(actualOpponentCard, 'right'))
      setCurrentTurn(1)
      setIsPlayerTurn(true)
      setTurns([])
      setBattleStatus('battling')
      setLastActionResult(null)

      // Show battle start announcement
      showAnnouncement(
        createAnnouncement('Battle Start!', 'normal', 'bounce', 2000),
      )
    },
    [playerCard, opponentCard, showAnnouncement],
  )

  /**
   * Execute an ability
   */
  const useAbility = useCallback(
    (cardId: string, ability: CardAbility) => {
      if (battleStatus !== 'battling') return
      if (!playerState || !opponentState) return

      const isPlayerAction = cardId === playerState.card.id
      const attacker = isPlayerAction ? playerState : opponentState
      const defender = isPlayerAction ? opponentState : playerState

      // Check energy cost
      if (attacker.currentEnergy < ability.cost) {
        return // Not enough energy
      }

      // Calculate element effectiveness
      const elementMultiplier = getElementMultiplier(
        ability.element,
        defender.card.element,
      )

      // Calculate damage
      const { damage, isCritical } = calculateDamage(
        attacker,
        defender,
        ability,
        elementMultiplier,
      )

      // Create action record
      const action: BattleAction = {
        type: 'ability',
        abilityId: ability.id,
        sourceCardId: cardId,
        targetCardId: defender.card.id,
        turn: currentTurn,
        timestamp: new Date(),
      }

      // Determine effectiveness label
      let effectiveness: BattleActionResult['effectiveness'] = 'normal'
      if (elementMultiplier >= 2.0) {
        effectiveness = 'super_effective'
      } else if (elementMultiplier <= 0.5) {
        effectiveness = 'not_effective'
      }

      // Create result
      const result: BattleActionResult = {
        action,
        damage,
        isCritical,
        effectiveness,
        knockedOutCardId:
          defender.currentHp - damage <= 0 ? defender.card.id : undefined,
      }

      setLastActionResult(result)

      // Update attacker energy
      const newAttackerState: BattleCardState = {
        ...attacker,
        currentEnergy: attacker.currentEnergy - ability.cost,
      }

      // Update defender HP and remove defense buff if present
      const newDefenderHp = Math.max(0, defender.currentHp - damage)
      const newDefenderState: BattleCardState = {
        ...defender,
        currentHp: newDefenderHp,
        isKnockedOut: newDefenderHp <= 0,
        statusEffects: defender.statusEffects.filter(
          (effect) => effect.type !== 'defense_up',
        ),
      }

      // Update states
      if (isPlayerAction) {
        setPlayerState(newAttackerState)
        setOpponentState(newDefenderState)
      } else {
        setOpponentState(newAttackerState)
        setPlayerState(newDefenderState)
      }

      // Create turn record
      const turn: BattleTurn = {
        turnNumber: currentTurn,
        activeCardId: cardId,
        action,
        result,
        timestamp: new Date(),
      }

      setTurns((prev) => [...prev, turn])

      // Show announcements
      if (effectiveness === 'super_effective') {
        showAnnouncement(
          createAnnouncement('Super Effective!', 'super_effective', 'shake'),
        )
        showEffect(
          createVisualEffect(
            'element_burst',
            isPlayerAction ? 'right' : 'left',
            ['#ffcc00', '#ff6600'],
          ),
        )
      }

      if (isCritical) {
        setTimeout(
          () => {
            showAnnouncement(
              createAnnouncement('Critical Hit!', 'critical', 'shake'),
            )
            showEffect(
              createVisualEffect(
                'critical_explosion',
                isPlayerAction ? 'right' : 'left',
                ['#ff0000', '#ff4444'],
              ),
            )
          },
          effectiveness === 'super_effective' ? 1500 : 0,
        )
      }

      // Show damage effect
      showEffect(
        createVisualEffect(
          'damage_flash',
          isPlayerAction ? 'right' : 'left',
          ['#ff0000'],
          0.6,
        ),
      )

      // Check for knockout
      if (newDefenderHp <= 0) {
        const isPlayerVictory = !isPlayerAction ? false : true
        setTimeout(
          () => {
            setBattleStatus(isPlayerVictory ? 'player_won' : 'opponent_won')
            showAnnouncement(
              createAnnouncement(
                isPlayerVictory ? 'Victory!' : 'Defeat!',
                isPlayerVictory ? 'victory' : 'knockout',
                'bounce',
                3000,
              ),
            )
            showEffect(
              createVisualEffect(
                'knockout_shatter',
                isPlayerAction ? 'right' : 'left',
                ['#333333', '#666666'],
              ),
            )
          },
          isCritical ? 2000 : 500,
        )
      }
    },
    [
      battleStatus,
      playerState,
      opponentState,
      currentTurn,
      showAnnouncement,
      showEffect,
    ],
  )

  /**
   * Defend action - skip turn but gain defense buff
   */
  const defend = useCallback(
    (cardId: string) => {
      if (battleStatus !== 'battling') return
      if (!playerState || !opponentState) return

      const isPlayerAction = cardId === playerState.card.id
      const actor = isPlayerAction ? playerState : opponentState

      // Create defense buff status effect
      const defenseBuff = {
        type: 'defense_up' as const,
        duration: 1,
        intensity: 50,
        sourceCardId: cardId,
      }

      // Create action
      const action: BattleAction = {
        type: 'defend',
        sourceCardId: cardId,
        turn: currentTurn,
        timestamp: new Date(),
      }

      // Update state with defense buff
      const newState: BattleCardState = {
        ...actor,
        statusEffects: [...actor.statusEffects, defenseBuff],
      }

      if (isPlayerAction) {
        setPlayerState(newState)
      } else {
        setOpponentState(newState)
      }

      // Create turn record
      const turn: BattleTurn = {
        turnNumber: currentTurn,
        activeCardId: cardId,
        action,
        timestamp: new Date(),
      }

      setTurns((prev) => [...prev, turn])
      setLastActionResult({ action })

      // Show defend effect
      showEffect(
        createVisualEffect('shield_pulse', isPlayerAction ? 'left' : 'right', [
          '#4488ff',
          '#88aaff',
        ]),
      )
    },
    [battleStatus, playerState, opponentState, currentTurn, showEffect],
  )

  /**
   * Charge action - skip turn but restore 2 energy
   */
  const charge = useCallback(
    (cardId: string) => {
      if (battleStatus !== 'battling') return
      if (!playerState || !opponentState) return

      const isPlayerAction = cardId === playerState.card.id
      const actor = isPlayerAction ? playerState : opponentState

      // Create action
      const action: BattleAction = {
        type: 'charge',
        sourceCardId: cardId,
        turn: currentTurn,
        timestamp: new Date(),
      }

      // Update energy (cap at max)
      const maxEnergy = actor.card.baseStats.maxEnergy
      const newEnergy = Math.min(maxEnergy, actor.currentEnergy + 2)

      const newState: BattleCardState = {
        ...actor,
        currentEnergy: newEnergy,
      }

      if (isPlayerAction) {
        setPlayerState(newState)
      } else {
        setOpponentState(newState)
      }

      // Create turn record
      const turn: BattleTurn = {
        turnNumber: currentTurn,
        activeCardId: cardId,
        action,
        timestamp: new Date(),
      }

      setTurns((prev) => [...prev, turn])
      setLastActionResult({ action })

      // Show charge effect
      showEffect(
        createVisualEffect('buff_sparkle', isPlayerAction ? 'left' : 'right', [
          '#ffff00',
          '#ffcc00',
        ]),
      )
    },
    [battleStatus, playerState, opponentState, currentTurn, showEffect],
  )

  /**
   * End current turn and switch to next player
   */
  const endTurn = useCallback(() => {
    if (battleStatus !== 'battling') return
    if (!playerState || !opponentState) return

    // Check win conditions
    if (opponentState.isKnockedOut) {
      setBattleStatus('player_won')
      showAnnouncement(
        createAnnouncement('Victory!', 'victory', 'bounce', 3000),
      )
      return
    }

    if (playerState.isKnockedOut) {
      setBattleStatus('opponent_won')
      showAnnouncement(
        createAnnouncement('Defeat!', 'knockout', 'bounce', 3000),
      )
      return
    }

    // Regenerate 1 energy for the next active player
    const nextIsPlayerTurn = !isPlayerTurn
    const nextActiveState = nextIsPlayerTurn ? playerState : opponentState
    const maxEnergy = nextActiveState.card.baseStats.maxEnergy
    const newEnergy = Math.min(maxEnergy, nextActiveState.currentEnergy + 1)

    const regeneratedState: BattleCardState = {
      ...nextActiveState,
      currentEnergy: newEnergy,
      // Decrement status effect durations
      statusEffects: nextActiveState.statusEffects
        .map((effect) => ({
          ...effect,
          duration: effect.duration - 1,
        }))
        .filter((effect) => effect.duration > 0),
    }

    if (nextIsPlayerTurn) {
      setPlayerState(regeneratedState)
    } else {
      setOpponentState(regeneratedState)
    }

    // Switch turns
    setIsPlayerTurn(nextIsPlayerTurn)
    setCurrentTurn((prev) => prev + 1)
  }, [battleStatus, playerState, opponentState, isPlayerTurn, showAnnouncement])

  /**
   * Reset all battle state
   */
  const resetBattle = useCallback(() => {
    setPlayerState(null)
    setOpponentState(null)
    setCurrentTurn(1)
    setIsPlayerTurn(true)
    setTurns([])
    setBattleStatus('setup')
    setAnnouncement(null)
    setActiveEffect(null)
    setLastActionResult(null)
  }, [])

  return {
    // State
    playerState,
    opponentState,
    currentTurn,
    isPlayerTurn,
    turns,
    battleStatus,
    announcement,
    activeEffect,
    lastActionResult,

    // Actions
    startBattle,
    useAbility,
    defend,
    charge,
    endTurn,
    resetBattle,
  }
}
