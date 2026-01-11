/**
 * Battle Management Hook
 *
 * Main hook for managing battle tournaments. Provides access to battle state,
 * creation, progression, and computed values like current round/match.
 *
 * @example
 * const { battle, createBattle, startBattle, advanceRound, isComplete, champion } = useBattle(battleId)
 */
import { useCallback, useEffect } from 'react'

import { useBattleStore } from '@/stores/battleStore'
import { battleService } from '../services/battleService'
import type { BattleConfig } from '../types'

/**
 * Hook for managing battle tournaments.
 *
 * @param battleId - Optional ID to load a specific battle
 * @returns Battle state and management functions
 */
export function useBattle(battleId?: string) {
  const store = useBattleStore()

  // Load battle when ID changes
  useEffect(() => {
    if (battleId) {
      store.loadBattle(battleId)
    }
  }, [battleId])

  // Create a new battle
  const createBattle = useCallback(async (config: BattleConfig) => {
    return store.createBattle(config)
  }, [])

  // Start the battle (generate first round matchups)
  const startBattle = useCallback(async () => {
    if (!store.currentBattle) return
    await store.startBattle(store.currentBattle.id)
  }, [store.currentBattle])

  // Progress to next round
  const advanceRound = useCallback(async () => {
    if (!store.currentBattle) return
    await store.advanceToNextRound(store.currentBattle.id)
  }, [store.currentBattle])

  // Get computed values
  const currentRound = store.currentBattle
    ? store.getCurrentRound(store.currentBattle.id)
    : null
  const currentMatch = store.currentBattle
    ? store.getCurrentMatch(store.currentBattle.id)
    : null
  const isComplete = store.currentBattle
    ? battleService.isTournamentComplete(store.currentBattle)
    : false
  const champion = store.currentBattle
    ? battleService.getChampion(store.currentBattle)
    : null

  return {
    battle: store.currentBattle,
    battles: store.battles,
    isLoading: store.isLoading,
    currentRound,
    currentMatch,
    isComplete,
    champion,
    createBattle,
    startBattle,
    advanceRound,
    cancelBattle: () =>
      store.currentBattle && store.cancelBattle(store.currentBattle.id),
    loadBattles: store.loadBattles,
  }
}
