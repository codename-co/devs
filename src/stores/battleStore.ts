import { create } from 'zustand'
import { db } from '@/lib/db'
import { deleteFromYjs, syncToYjs } from '@/features/sync'
import { errorToast, successToast } from '@/lib/toast'
import type {
  Battle,
  BattleConfig,
  BattleMatch,
  BattleRound,
  BattleJudgment,
} from '@/features/battle/types'

interface BattleStore {
  battles: Battle[]
  currentBattle: Battle | null
  isLoading: boolean

  // CRUD operations
  loadBattles: () => Promise<void>
  loadBattle: (id: string) => Promise<void>
  createBattle: (config: BattleConfig) => Promise<Battle>
  updateBattle: (id: string, updates: Partial<Battle>) => Promise<void>
  deleteBattle: (id: string) => Promise<void>

  // Battle flow
  startBattle: (battleId: string) => Promise<void>
  advanceToNextRound: (battleId: string) => Promise<void>
  cancelBattle: (battleId: string) => Promise<void>

  // Match operations
  startMatch: (battleId: string, matchId: string) => Promise<void>
  setMatchJudging: (battleId: string, matchId: string) => Promise<void>
  completeMatch: (
    battleId: string,
    matchId: string,
    winnerId: string,
    judgment: BattleJudgment,
  ) => Promise<void>
  setMatchConversation: (
    battleId: string,
    matchId: string,
    conversationId: string,
  ) => Promise<void>

  // Queries
  getBattleById: (id: string) => Promise<Battle | null>
  getCurrentRound: (battleId: string) => BattleRound | null
  getCurrentMatch: (battleId: string) => BattleMatch | null
  getActiveMatches: (battleId: string) => BattleMatch[]

  clearCurrentBattle: () => void
}

export const useBattleStore = create<BattleStore>((set, get) => ({
  battles: [],
  currentBattle: null,
  isLoading: false,

  loadBattles: async () => {
    set({ isLoading: true })
    try {
      if (!db.isInitialized()) {
        await db.init()
      }
      const battles = await db.getAll('battles')
      set({ battles, isLoading: false })
    } catch (error) {
      errorToast('Failed to load battles', error)
      set({ isLoading: false })
    }
  },

  loadBattle: async (id: string) => {
    set({ isLoading: true })
    try {
      if (!db.isInitialized()) {
        await db.init()
      }
      const battle = await db.get('battles', id)
      if (battle) {
        set({ currentBattle: battle, isLoading: false })
      } else {
        errorToast('Battle not found', 'The requested battle could not be found')
        set({ isLoading: false })
      }
    } catch (error) {
      errorToast('Failed to load battle', error)
      set({ isLoading: false })
    }
  },

  createBattle: async (config: BattleConfig) => {
    set({ isLoading: true })
    try {
      if (!db.isInitialized()) {
        await db.init()
      }

      const battle: Battle = {
        id: crypto.randomUUID(),
        status: 'setup',
        topic: config.topic,
        judgeAgentId: config.judgeAgentId,
        turnsPerConversation: config.turnsPerConversation ?? 8,
        customJudgingCriteria: config.customJudgingCriteria,
        teamA: {
          ...config.teamA,
          color: 'blue',
        },
        teamB: {
          ...config.teamB,
          color: 'red',
        },
        rounds: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      await db.add('battles', battle)
      syncToYjs('battles', battle)

      const updatedBattles = [...get().battles, battle]
      set({
        battles: updatedBattles,
        currentBattle: battle,
        isLoading: false,
      })

      return battle
    } catch (error) {
      errorToast('Failed to create battle', error)
      set({ isLoading: false })
      throw error
    }
  },

  updateBattle: async (id: string, updates: Partial<Battle>) => {
    set({ isLoading: true })
    try {
      if (!db.isInitialized()) {
        await db.init()
      }

      const battle = await db.get('battles', id)
      if (!battle) {
        throw new Error('Battle not found')
      }

      const updatedBattle: Battle = {
        ...battle,
        ...updates,
        id,
        updatedAt: new Date(),
      }

      await db.update('battles', updatedBattle)
      syncToYjs('battles', updatedBattle)

      const { battles, currentBattle } = get()
      const updatedBattles = battles.map((b) =>
        b.id === id ? updatedBattle : b,
      )

      set({
        battles: updatedBattles,
        currentBattle: currentBattle?.id === id ? updatedBattle : currentBattle,
        isLoading: false,
      })
    } catch (error) {
      errorToast('Failed to update battle', error)
      set({ isLoading: false })
    }
  },

  deleteBattle: async (id: string) => {
    set({ isLoading: true })
    try {
      if (!db.isInitialized()) {
        await db.init()
      }
      await db.delete('battles', id)
      deleteFromYjs('battles', id)

      const { battles, currentBattle } = get()
      const updatedBattles = battles.filter((b) => b.id !== id)

      set({
        battles: updatedBattles,
        currentBattle: currentBattle?.id === id ? null : currentBattle,
        isLoading: false,
      })

      successToast('Battle deleted successfully')
    } catch (error) {
      errorToast('Failed to delete battle', error)
      set({ isLoading: false })
    }
  },

  startBattle: async (battleId: string) => {
    set({ isLoading: true })
    try {
      if (!db.isInitialized()) {
        await db.init()
      }

      const battle = await db.get('battles', battleId)
      if (!battle) {
        throw new Error('Battle not found')
      }

      // Validate teams have equal number of agents
      if (battle.teamA.agentIds.length !== battle.teamB.agentIds.length) {
        throw new Error('Teams must have equal number of agents')
      }

      if (battle.teamA.agentIds.length === 0) {
        throw new Error('Teams must have at least one agent')
      }

      // Generate first round matchups (pair agents from team A with team B)
      const matches: BattleMatch[] = battle.teamA.agentIds.map(
        (agentAId, index) => ({
          id: crypto.randomUUID(),
          status: 'pending' as const,
          agentAId,
          agentBId: battle.teamB.agentIds[index],
        }),
      )

      const firstRound: BattleRound = {
        id: crypto.randomUUID(),
        roundNumber: 1,
        status: 'pending',
        matches,
      }

      const updatedBattle: Battle = {
        ...battle,
        status: 'in_progress',
        rounds: [firstRound],
        updatedAt: new Date(),
      }

      await db.update('battles', updatedBattle)
      syncToYjs('battles', updatedBattle)

      const { battles, currentBattle } = get()
      const updatedBattles = battles.map((b) =>
        b.id === battleId ? updatedBattle : b,
      )

      set({
        battles: updatedBattles,
        currentBattle:
          currentBattle?.id === battleId ? updatedBattle : currentBattle,
        isLoading: false,
      })

      successToast('Battle started!')
    } catch (error) {
      errorToast('Failed to start battle', error)
      set({ isLoading: false })
      throw error
    }
  },

  advanceToNextRound: async (battleId: string) => {
    set({ isLoading: true })
    try {
      if (!db.isInitialized()) {
        await db.init()
      }

      const battle = await db.get('battles', battleId)
      if (!battle) {
        throw new Error('Battle not found')
      }

      const currentRound = battle.rounds[battle.rounds.length - 1]
      if (!currentRound || currentRound.status !== 'completed') {
        throw new Error('Current round must be completed to advance')
      }

      // Get winners from current round
      const winners = currentRound.matches
        .filter((m) => m.winnerId)
        .map((m) => m.winnerId!)

      // If only one winner, battle is complete
      if (winners.length <= 1) {
        const updatedBattle: Battle = {
          ...battle,
          status: 'completed',
          championAgentId: winners[0],
          completedAt: new Date(),
          updatedAt: new Date(),
        }

        await db.update('battles', updatedBattle)
        syncToYjs('battles', updatedBattle)

        const { battles, currentBattle } = get()
        const updatedBattles = battles.map((b) =>
          b.id === battleId ? updatedBattle : b,
        )

        set({
          battles: updatedBattles,
          currentBattle:
            currentBattle?.id === battleId ? updatedBattle : currentBattle,
          isLoading: false,
        })

        successToast('Battle completed! Champion determined!')
        return
      }

      // Create next round with winners paired up
      const nextMatches: BattleMatch[] = []
      for (let i = 0; i < winners.length; i += 2) {
        if (i + 1 < winners.length) {
          nextMatches.push({
            id: crypto.randomUUID(),
            status: 'pending',
            agentAId: winners[i],
            agentBId: winners[i + 1],
          })
        } else {
          // Odd number of winners - bye round (auto-advance)
          // For simplicity, this agent advances automatically
          nextMatches.push({
            id: crypto.randomUUID(),
            status: 'completed',
            agentAId: winners[i],
            agentBId: winners[i], // Same agent = bye
            winnerId: winners[i],
          })
        }
      }

      const nextRound: BattleRound = {
        id: crypto.randomUUID(),
        roundNumber: currentRound.roundNumber + 1,
        status: 'pending',
        matches: nextMatches,
      }

      const updatedBattle: Battle = {
        ...battle,
        rounds: [...battle.rounds, nextRound],
        updatedAt: new Date(),
      }

      await db.update('battles', updatedBattle)
      syncToYjs('battles', updatedBattle)

      const { battles, currentBattle } = get()
      const updatedBattles = battles.map((b) =>
        b.id === battleId ? updatedBattle : b,
      )

      set({
        battles: updatedBattles,
        currentBattle:
          currentBattle?.id === battleId ? updatedBattle : currentBattle,
        isLoading: false,
      })

      successToast(`Round ${nextRound.roundNumber} started!`)
    } catch (error) {
      errorToast('Failed to advance to next round', error)
      set({ isLoading: false })
      throw error
    }
  },

  cancelBattle: async (battleId: string) => {
    set({ isLoading: true })
    try {
      if (!db.isInitialized()) {
        await db.init()
      }

      const battle = await db.get('battles', battleId)
      if (!battle) {
        throw new Error('Battle not found')
      }

      const updatedBattle: Battle = {
        ...battle,
        status: 'cancelled',
        updatedAt: new Date(),
      }

      await db.update('battles', updatedBattle)
      syncToYjs('battles', updatedBattle)

      const { battles, currentBattle } = get()
      const updatedBattles = battles.map((b) =>
        b.id === battleId ? updatedBattle : b,
      )

      set({
        battles: updatedBattles,
        currentBattle:
          currentBattle?.id === battleId ? updatedBattle : currentBattle,
        isLoading: false,
      })

      successToast('Battle cancelled')
    } catch (error) {
      errorToast('Failed to cancel battle', error)
      set({ isLoading: false })
      throw error
    }
  },

  startMatch: async (battleId: string, matchId: string) => {
    set({ isLoading: true })
    try {
      if (!db.isInitialized()) {
        await db.init()
      }

      const battle = await db.get('battles', battleId)
      if (!battle) {
        throw new Error('Battle not found')
      }

      const updatedRounds = battle.rounds.map((round) => {
        const matchIndex = round.matches.findIndex((m) => m.id === matchId)
        if (matchIndex === -1) return round

        const updatedMatches = [...round.matches]
        updatedMatches[matchIndex] = {
          ...updatedMatches[matchIndex],
          status: 'in_progress',
          startedAt: new Date(),
        }

        return {
          ...round,
          status: 'in_progress' as const,
          startedAt: round.startedAt || new Date(),
          matches: updatedMatches,
        }
      })

      const updatedBattle: Battle = {
        ...battle,
        rounds: updatedRounds,
        updatedAt: new Date(),
      }

      await db.update('battles', updatedBattle)
      syncToYjs('battles', updatedBattle)

      const { battles, currentBattle } = get()
      const updatedBattles = battles.map((b) =>
        b.id === battleId ? updatedBattle : b,
      )

      set({
        battles: updatedBattles,
        currentBattle:
          currentBattle?.id === battleId ? updatedBattle : currentBattle,
        isLoading: false,
      })
    } catch (error) {
      errorToast('Failed to start match', error)
      set({ isLoading: false })
      throw error
    }
  },

  setMatchJudging: async (battleId: string, matchId: string) => {
    try {
      if (!db.isInitialized()) {
        await db.init()
      }

      const battle = await db.get('battles', battleId)
      if (!battle) {
        throw new Error('Battle not found')
      }

      const updatedRounds = battle.rounds.map((round) => {
        const matchIndex = round.matches.findIndex((m) => m.id === matchId)
        if (matchIndex === -1) return round

        const updatedMatches = [...round.matches]
        updatedMatches[matchIndex] = {
          ...updatedMatches[matchIndex],
          status: 'judging' as const,
        }

        return {
          ...round,
          matches: updatedMatches,
        }
      })

      const updatedBattle: Battle = {
        ...battle,
        rounds: updatedRounds,
        updatedAt: new Date(),
      }

      await db.update('battles', updatedBattle)
      syncToYjs('battles', updatedBattle)

      const { battles, currentBattle } = get()
      const updatedBattles = battles.map((b) =>
        b.id === battleId ? updatedBattle : b,
      )

      set({
        battles: updatedBattles,
        currentBattle:
          currentBattle?.id === battleId ? updatedBattle : currentBattle,
      })
    } catch (error) {
      console.error('Failed to set match judging status', error)
      // Don't throw - this is a non-critical status update
    }
  },

  completeMatch: async (
    battleId: string,
    matchId: string,
    winnerId: string,
    judgment: BattleJudgment,
  ) => {
    set({ isLoading: true })
    try {
      if (!db.isInitialized()) {
        await db.init()
      }

      const battle = await db.get('battles', battleId)
      if (!battle) {
        throw new Error('Battle not found')
      }

      const updatedRounds = battle.rounds.map((round) => {
        const matchIndex = round.matches.findIndex((m) => m.id === matchId)
        if (matchIndex === -1) return round

        const updatedMatches = [...round.matches]
        updatedMatches[matchIndex] = {
          ...updatedMatches[matchIndex],
          status: 'completed',
          winnerId,
          judgment,
          completedAt: new Date(),
        }

        // Check if all matches in round are completed
        const allCompleted = updatedMatches.every(
          (m) => m.status === 'completed',
        )

        return {
          ...round,
          status: allCompleted ? ('completed' as const) : round.status,
          completedAt: allCompleted ? new Date() : round.completedAt,
          matches: updatedMatches,
        }
      })

      const updatedBattle: Battle = {
        ...battle,
        rounds: updatedRounds,
        updatedAt: new Date(),
      }

      await db.update('battles', updatedBattle)
      syncToYjs('battles', updatedBattle)

      const { battles, currentBattle } = get()
      const updatedBattles = battles.map((b) =>
        b.id === battleId ? updatedBattle : b,
      )

      set({
        battles: updatedBattles,
        currentBattle:
          currentBattle?.id === battleId ? updatedBattle : currentBattle,
        isLoading: false,
      })

      successToast('Match completed!')
    } catch (error) {
      errorToast('Failed to complete match', error)
      set({ isLoading: false })
      throw error
    }
  },

  setMatchConversation: async (
    battleId: string,
    matchId: string,
    conversationId: string,
  ) => {
    set({ isLoading: true })
    try {
      if (!db.isInitialized()) {
        await db.init()
      }

      const battle = await db.get('battles', battleId)
      if (!battle) {
        throw new Error('Battle not found')
      }

      const updatedRounds = battle.rounds.map((round) => {
        const matchIndex = round.matches.findIndex((m) => m.id === matchId)
        if (matchIndex === -1) return round

        const updatedMatches = [...round.matches]
        updatedMatches[matchIndex] = {
          ...updatedMatches[matchIndex],
          conversationId,
        }

        return {
          ...round,
          matches: updatedMatches,
        }
      })

      const updatedBattle: Battle = {
        ...battle,
        rounds: updatedRounds,
        updatedAt: new Date(),
      }

      await db.update('battles', updatedBattle)
      syncToYjs('battles', updatedBattle)

      const { battles, currentBattle } = get()
      const updatedBattles = battles.map((b) =>
        b.id === battleId ? updatedBattle : b,
      )

      set({
        battles: updatedBattles,
        currentBattle:
          currentBattle?.id === battleId ? updatedBattle : currentBattle,
        isLoading: false,
      })
    } catch (error) {
      errorToast('Failed to set match conversation', error)
      set({ isLoading: false })
      throw error
    }
  },

  getBattleById: async (id: string) => {
    try {
      if (!db.isInitialized()) {
        await db.init()
      }
      return (await db.get('battles', id)) || null
    } catch (error) {
      errorToast('Failed to get battle', error)
      return null
    }
  },

  getCurrentRound: (battleId: string) => {
    const { battles, currentBattle } = get()
    const battle =
      currentBattle?.id === battleId
        ? currentBattle
        : battles.find((b) => b.id === battleId)

    if (!battle || battle.rounds.length === 0) return null
    return battle.rounds[battle.rounds.length - 1]
  },

  getCurrentMatch: (battleId: string) => {
    const currentRound = get().getCurrentRound(battleId)
    if (!currentRound) return null

    // Return first non-completed match
    return (
      currentRound.matches.find(
        (m) => m.status === 'pending' || m.status === 'in_progress',
      ) || null
    )
  },

  getActiveMatches: (battleId: string) => {
    const currentRound = get().getCurrentRound(battleId)
    if (!currentRound) return []

    return currentRound.matches.filter(
      (m) => m.status === 'pending' || m.status === 'in_progress',
    )
  },

  clearCurrentBattle: () => {
    set({ currentBattle: null })
  },
}))
