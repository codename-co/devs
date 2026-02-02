import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type {
  Battle,
  BattleConfig,
  BattleJudgment,
} from '@/features/battle/types'
import { createMockYMap, createMockToast, resetMockYMap } from './mocks'

// Create mocks
const mockBattlesMap = createMockYMap<Battle>()
const mockToast = createMockToast()

// Setup global mocks
vi.mock('@/lib/yjs', () => ({
  battles: mockBattlesMap,
}))
vi.mock('@/lib/toast', () => mockToast)

// We need to dynamically import the module to reset its state between tests
let battleStore: typeof import('@/stores/battleStore')

/**
 * Helper to create a valid BattleConfig
 */
function createBattleConfig(
  overrides: Partial<BattleConfig> = {},
): BattleConfig {
  return {
    topic: 'Is TypeScript better than JavaScript?',
    judgeAgentId: 'judge-agent-1',
    teamA: {
      name: 'Team Alpha',
      agentIds: ['agent-1', 'agent-2'],
    },
    teamB: {
      name: 'Team Beta',
      agentIds: ['agent-3', 'agent-4'],
    },
    turnsPerConversation: 8,
    ...overrides,
  }
}

/**
 * Helper to create a mock Battle object
 */
function createMockBattle(overrides: Partial<Battle> = {}): Battle {
  return {
    id: 'battle-123',
    status: 'setup',
    topic: 'Is TypeScript better than JavaScript?',
    judgeAgentId: 'judge-agent-1',
    turnsPerConversation: 8,
    teamA: {
      name: 'Team Alpha',
      agentIds: ['agent-1', 'agent-2'],
      color: 'blue',
    },
    teamB: {
      name: 'Team Beta',
      agentIds: ['agent-3', 'agent-4'],
      color: 'red',
    },
    rounds: [],
    createdAt: new Date('2026-01-10'),
    updatedAt: new Date('2026-01-10'),
    ...overrides,
  }
}

/**
 * Helper to create a mock BattleJudgment
 */
function createMockJudgment(winnerId: string): BattleJudgment {
  return {
    winnerId,
    scores: [
      {
        agentId: winnerId,
        argumentQuality: 8,
        persuasiveness: 9,
        creativity: 7,
        responsiveness: 8,
        total: 32,
      },
    ],
    reasoning: 'Agent presented compelling arguments.',
    highlights: ['Strong opening argument', 'Effective rebuttal'],
  }
}

describe('battleStore', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    resetMockYMap(mockBattlesMap)

    // Reset module cache to clear internal state
    vi.resetModules()

    // Re-import the module fresh
    battleStore = await import('@/stores/battleStore')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ============================================
  // Store Initialization Tests
  // ============================================
  describe('Store initialization', () => {
    it('should have battles as empty array initially', () => {
      const state = battleStore.useBattleStore.getState()
      expect(state.battles).toEqual([])
    })

    it('should have currentBattle as null initially', () => {
      const state = battleStore.useBattleStore.getState()
      expect(state.currentBattle).toBeNull()
    })

    it('should have isLoading as false initially', () => {
      const state = battleStore.useBattleStore.getState()
      expect(state.isLoading).toBe(false)
    })
  })

  // ============================================
  // createBattle Tests
  // ============================================
  describe('createBattle', () => {
    it('should create a battle with valid config', async () => {
      const config = createBattleConfig()

      const battle = await battleStore.useBattleStore
        .getState()
        .createBattle(config)

      expect(battle).toBeDefined()
      expect(battle.topic).toBe(config.topic)
      expect(battle.judgeAgentId).toBe(config.judgeAgentId)
      expect(battle.teamA.name).toBe(config.teamA.name)
      expect(battle.teamA.agentIds).toEqual(config.teamA.agentIds)
      expect(battle.teamB.name).toBe(config.teamB.name)
      expect(battle.teamB.agentIds).toEqual(config.teamB.agentIds)
    })

    it('should generate unique IDs', async () => {
      const config = createBattleConfig()

      const battle1 = await battleStore.useBattleStore
        .getState()
        .createBattle(config)
      const battle2 = await battleStore.useBattleStore
        .getState()
        .createBattle(config)

      expect(battle1.id).toBeDefined()
      expect(battle2.id).toBeDefined()
      expect(battle1.id).not.toBe(battle2.id)
    })

    it('should set default turnsPerConversation to 8', async () => {
      const config = createBattleConfig({ turnsPerConversation: undefined })

      const battle = await battleStore.useBattleStore
        .getState()
        .createBattle(config)

      expect(battle.turnsPerConversation).toBe(8)
    })

    it('should respect custom turnsPerConversation', async () => {
      const config = createBattleConfig({ turnsPerConversation: 12 })

      const battle = await battleStore.useBattleStore
        .getState()
        .createBattle(config)

      expect(battle.turnsPerConversation).toBe(12)
    })

    it('should set team colors (blue for A, red for B)', async () => {
      const config = createBattleConfig()

      const battle = await battleStore.useBattleStore
        .getState()
        .createBattle(config)

      expect(battle.teamA.color).toBe('blue')
      expect(battle.teamB.color).toBe('red')
    })

    it('should set status to setup', async () => {
      const config = createBattleConfig()

      const battle = await battleStore.useBattleStore
        .getState()
        .createBattle(config)

      expect(battle.status).toBe('setup')
    })

    it('should initialize empty rounds array', async () => {
      const config = createBattleConfig()

      const battle = await battleStore.useBattleStore
        .getState()
        .createBattle(config)

      expect(battle.rounds).toEqual([])
    })

    it('should persist battle to database', async () => {
      const config = createBattleConfig()

      await battleStore.useBattleStore.getState().createBattle(config)

      expect(mockBattlesMap.set).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          topic: config.topic,
          judgeAgentId: config.judgeAgentId,
        }),
      )
    })

    it('should add battle to store state', async () => {
      const config = createBattleConfig()

      const battle = await battleStore.useBattleStore
        .getState()
        .createBattle(config)
      const state = battleStore.useBattleStore.getState()

      expect(state.battles).toContainEqual(battle)
    })

    it('should set currentBattle to newly created battle', async () => {
      const config = createBattleConfig()

      const battle = await battleStore.useBattleStore
        .getState()
        .createBattle(config)
      const state = battleStore.useBattleStore.getState()

      expect(state.currentBattle).toEqual(battle)
    })

    it('should set customJudgingCriteria when provided', async () => {
      const config = createBattleConfig({
        customJudgingCriteria: 'Focus on technical accuracy',
      })

      const battle = await battleStore.useBattleStore
        .getState()
        .createBattle(config)

      expect(battle.customJudgingCriteria).toBe('Focus on technical accuracy')
    })

    it('should set createdAt and updatedAt timestamps', async () => {
      const config = createBattleConfig()

      const battle = await battleStore.useBattleStore
        .getState()
        .createBattle(config)

      expect(battle.createdAt).toBeInstanceOf(Date)
      expect(battle.updatedAt).toBeInstanceOf(Date)
    })
  })

  // ============================================
  // startBattle Tests
  // ============================================
  describe('startBattle', () => {
    it('should validate teams have equal agents', async () => {
      const battle = createMockBattle({
        teamA: { name: 'Team A', agentIds: ['a1', 'a2'], color: 'blue' },
        teamB: { name: 'Team B', agentIds: ['b1', 'b2'], color: 'red' },
      })
      mockBattlesMap._data.set(battle.id, battle)

      await battleStore.useBattleStore.getState().startBattle(battle.id)

      expect(mockBattlesMap.set).toHaveBeenCalled()
    })

    it('should throw if teams have different sizes', async () => {
      const battle = createMockBattle({
        teamA: { name: 'Team A', agentIds: ['a1', 'a2', 'a3'], color: 'blue' },
        teamB: { name: 'Team B', agentIds: ['b1', 'b2'], color: 'red' },
      })
      mockBattlesMap._data.set(battle.id, battle)

      await expect(
        battleStore.useBattleStore.getState().startBattle(battle.id),
      ).rejects.toThrow('Teams must have equal number of agents')
    })

    it('should throw if teams are empty', async () => {
      const battle = createMockBattle({
        teamA: { name: 'Team A', agentIds: [], color: 'blue' },
        teamB: { name: 'Team B', agentIds: [], color: 'red' },
      })
      mockBattlesMap._data.set(battle.id, battle)

      await expect(
        battleStore.useBattleStore.getState().startBattle(battle.id),
      ).rejects.toThrow('Teams must have at least one agent')
    })

    it('should generate first round matchups', async () => {
      const battle = createMockBattle({
        teamA: { name: 'Team A', agentIds: ['a1', 'a2'], color: 'blue' },
        teamB: { name: 'Team B', agentIds: ['b1', 'b2'], color: 'red' },
      })
      mockBattlesMap._data.set(battle.id, battle)

      await battleStore.useBattleStore.getState().startBattle(battle.id)

      const setCall = mockBattlesMap.set.mock.calls[0]
      const updatedBattle = setCall[1] as Battle

      expect(updatedBattle.rounds).toHaveLength(1)
      expect(updatedBattle.rounds[0].matches).toHaveLength(2)
      expect(updatedBattle.rounds[0].matches[0].agentAId).toBe('a1')
      expect(updatedBattle.rounds[0].matches[0].agentBId).toBe('b1')
      expect(updatedBattle.rounds[0].matches[1].agentAId).toBe('a2')
      expect(updatedBattle.rounds[0].matches[1].agentBId).toBe('b2')
    })

    it('should change status to in_progress', async () => {
      const battle = createMockBattle()
      mockBattlesMap._data.set(battle.id, battle)

      await battleStore.useBattleStore.getState().startBattle(battle.id)

      const setCall = mockBattlesMap.set.mock.calls[0]
      const updatedBattle = setCall[1] as Battle

      expect(updatedBattle.status).toBe('in_progress')
    })

    it('should set first round with roundNumber 1', async () => {
      const battle = createMockBattle()
      mockBattlesMap._data.set(battle.id, battle)

      await battleStore.useBattleStore.getState().startBattle(battle.id)

      const setCall = mockBattlesMap.set.mock.calls[0]
      const updatedBattle = setCall[1] as Battle

      expect(updatedBattle.rounds[0].roundNumber).toBe(1)
    })

    it('should set matches with pending status', async () => {
      const battle = createMockBattle()
      mockBattlesMap._data.set(battle.id, battle)

      await battleStore.useBattleStore.getState().startBattle(battle.id)

      const setCall = mockBattlesMap.set.mock.calls[0]
      const updatedBattle = setCall[1] as Battle

      updatedBattle.rounds[0].matches.forEach((match) => {
        expect(match.status).toBe('pending')
      })
    })

    it('should throw if battle not found', async () => {
      // Don't set up any battle data - the map is empty

      await expect(
        battleStore.useBattleStore.getState().startBattle('non-existent'),
      ).rejects.toThrow('Battle not found')
    })

    it('should generate unique IDs for matches', async () => {
      const battle = createMockBattle()
      mockBattlesMap._data.set(battle.id, battle)

      await battleStore.useBattleStore.getState().startBattle(battle.id)

      const setCall = mockBattlesMap.set.mock.calls[0]
      const updatedBattle = setCall[1] as Battle

      const matchIds = updatedBattle.rounds[0].matches.map((m) => m.id)
      const uniqueIds = new Set(matchIds)
      expect(uniqueIds.size).toBe(matchIds.length)
    })
  })

  // ============================================
  // completeMatch Tests
  // ============================================
  describe('completeMatch', () => {
    it('should update match with winner and judgment', async () => {
      const battle = createMockBattle({
        status: 'in_progress',
        rounds: [
          {
            id: 'round-1',
            roundNumber: 1,
            status: 'in_progress',
            matches: [
              {
                id: 'match-1',
                status: 'in_progress',
                agentAId: 'agent-1',
                agentBId: 'agent-3',
              },
            ],
          },
        ],
      })
      mockBattlesMap._data.set(battle.id, battle)

      const judgment = createMockJudgment('agent-1')

      await battleStore.useBattleStore
        .getState()
        .completeMatch(battle.id, 'match-1', 'agent-1', judgment)

      const setCall = mockBattlesMap.set.mock.calls[0]
      const updatedBattle = setCall[1] as Battle
      const match = updatedBattle.rounds[0].matches[0]

      expect(match.winnerId).toBe('agent-1')
      expect(match.judgment).toEqual(judgment)
    })

    it('should set match status to completed', async () => {
      const battle = createMockBattle({
        status: 'in_progress',
        rounds: [
          {
            id: 'round-1',
            roundNumber: 1,
            status: 'in_progress',
            matches: [
              {
                id: 'match-1',
                status: 'in_progress',
                agentAId: 'agent-1',
                agentBId: 'agent-3',
              },
            ],
          },
        ],
      })
      mockBattlesMap._data.set(battle.id, battle)

      const judgment = createMockJudgment('agent-1')

      await battleStore.useBattleStore
        .getState()
        .completeMatch(battle.id, 'match-1', 'agent-1', judgment)

      const setCall = mockBattlesMap.set.mock.calls[0]
      const updatedBattle = setCall[1] as Battle
      const match = updatedBattle.rounds[0].matches[0]

      expect(match.status).toBe('completed')
    })

    it('should set completedAt timestamp on match', async () => {
      const battle = createMockBattle({
        status: 'in_progress',
        rounds: [
          {
            id: 'round-1',
            roundNumber: 1,
            status: 'in_progress',
            matches: [
              {
                id: 'match-1',
                status: 'in_progress',
                agentAId: 'agent-1',
                agentBId: 'agent-3',
              },
            ],
          },
        ],
      })
      mockBattlesMap._data.set(battle.id, battle)

      const judgment = createMockJudgment('agent-1')

      await battleStore.useBattleStore
        .getState()
        .completeMatch(battle.id, 'match-1', 'agent-1', judgment)

      const setCall = mockBattlesMap.set.mock.calls[0]
      const updatedBattle = setCall[1] as Battle
      const match = updatedBattle.rounds[0].matches[0]

      expect(match.completedAt).toBeInstanceOf(Date)
    })

    it('should mark round as completed when all matches are done', async () => {
      const battle = createMockBattle({
        status: 'in_progress',
        rounds: [
          {
            id: 'round-1',
            roundNumber: 1,
            status: 'in_progress',
            matches: [
              {
                id: 'match-1',
                status: 'in_progress',
                agentAId: 'agent-1',
                agentBId: 'agent-3',
              },
            ],
          },
        ],
      })
      mockBattlesMap._data.set(battle.id, battle)

      const judgment = createMockJudgment('agent-1')

      await battleStore.useBattleStore
        .getState()
        .completeMatch(battle.id, 'match-1', 'agent-1', judgment)

      const setCall = mockBattlesMap.set.mock.calls[0]
      const updatedBattle = setCall[1] as Battle

      expect(updatedBattle.rounds[0].status).toBe('completed')
    })

    it('should not mark round as completed if other matches pending', async () => {
      const battle = createMockBattle({
        status: 'in_progress',
        rounds: [
          {
            id: 'round-1',
            roundNumber: 1,
            status: 'in_progress',
            matches: [
              {
                id: 'match-1',
                status: 'in_progress',
                agentAId: 'agent-1',
                agentBId: 'agent-3',
              },
              {
                id: 'match-2',
                status: 'pending',
                agentAId: 'agent-2',
                agentBId: 'agent-4',
              },
            ],
          },
        ],
      })
      mockBattlesMap._data.set(battle.id, battle)

      const judgment = createMockJudgment('agent-1')

      await battleStore.useBattleStore
        .getState()
        .completeMatch(battle.id, 'match-1', 'agent-1', judgment)

      const setCall = mockBattlesMap.set.mock.calls[0]
      const updatedBattle = setCall[1] as Battle

      expect(updatedBattle.rounds[0].status).toBe('in_progress')
    })

    it('should throw if battle not found', async () => {
      // Don't set up any battle data - the map is empty

      const judgment = createMockJudgment('agent-1')

      await expect(
        battleStore.useBattleStore
          .getState()
          .completeMatch('non-existent', 'match-1', 'agent-1', judgment),
      ).rejects.toThrow('Battle not found')
    })
  })

  // ============================================
  // advanceToNextRound Tests
  // ============================================
  describe('advanceToNextRound', () => {
    it('should create new round with winners', async () => {
      const battle = createMockBattle({
        status: 'in_progress',
        rounds: [
          {
            id: 'round-1',
            roundNumber: 1,
            status: 'completed',
            matches: [
              {
                id: 'match-1',
                status: 'completed',
                agentAId: 'agent-1',
                agentBId: 'agent-3',
                winnerId: 'agent-1',
              },
              {
                id: 'match-2',
                status: 'completed',
                agentAId: 'agent-2',
                agentBId: 'agent-4',
                winnerId: 'agent-4',
              },
            ],
          },
        ],
      })
      mockBattlesMap._data.set(battle.id, battle)

      await battleStore.useBattleStore.getState().advanceToNextRound(battle.id)

      const setCall = mockBattlesMap.set.mock.calls[0]
      const updatedBattle = setCall[1] as Battle

      expect(updatedBattle.rounds).toHaveLength(2)
      expect(updatedBattle.rounds[1].roundNumber).toBe(2)
      expect(updatedBattle.rounds[1].matches).toHaveLength(1)
      expect(updatedBattle.rounds[1].matches[0].agentAId).toBe('agent-1')
      expect(updatedBattle.rounds[1].matches[0].agentBId).toBe('agent-4')
    })

    it('should handle final round and set champion', async () => {
      const battle = createMockBattle({
        status: 'in_progress',
        rounds: [
          {
            id: 'round-1',
            roundNumber: 1,
            status: 'completed',
            matches: [
              {
                id: 'match-1',
                status: 'completed',
                agentAId: 'agent-1',
                agentBId: 'agent-3',
                winnerId: 'agent-1',
              },
            ],
          },
        ],
      })
      mockBattlesMap._data.set(battle.id, battle)

      await battleStore.useBattleStore.getState().advanceToNextRound(battle.id)

      const setCall = mockBattlesMap.set.mock.calls[0]
      const updatedBattle = setCall[1] as Battle

      expect(updatedBattle.status).toBe('completed')
      expect(updatedBattle.championAgentId).toBe('agent-1')
      expect(updatedBattle.completedAt).toBeInstanceOf(Date)
    })

    it('should throw if current round not completed', async () => {
      const battle = createMockBattle({
        status: 'in_progress',
        rounds: [
          {
            id: 'round-1',
            roundNumber: 1,
            status: 'in_progress',
            matches: [
              {
                id: 'match-1',
                status: 'in_progress',
                agentAId: 'agent-1',
                agentBId: 'agent-3',
              },
            ],
          },
        ],
      })
      mockBattlesMap._data.set(battle.id, battle)

      await expect(
        battleStore.useBattleStore.getState().advanceToNextRound(battle.id),
      ).rejects.toThrow('Current round must be completed to advance')
    })

    it('should throw if battle has no rounds', async () => {
      const battle = createMockBattle({
        status: 'in_progress',
        rounds: [],
      })
      mockBattlesMap._data.set(battle.id, battle)

      await expect(
        battleStore.useBattleStore.getState().advanceToNextRound(battle.id),
      ).rejects.toThrow('Current round must be completed to advance')
    })

    it('should handle bye rounds for odd number of winners', async () => {
      const battle = createMockBattle({
        status: 'in_progress',
        rounds: [
          {
            id: 'round-1',
            roundNumber: 1,
            status: 'completed',
            matches: [
              {
                id: 'match-1',
                status: 'completed',
                agentAId: 'agent-1',
                agentBId: 'agent-3',
                winnerId: 'agent-1',
              },
              {
                id: 'match-2',
                status: 'completed',
                agentAId: 'agent-2',
                agentBId: 'agent-4',
                winnerId: 'agent-2',
              },
              {
                id: 'match-3',
                status: 'completed',
                agentAId: 'agent-5',
                agentBId: 'agent-6',
                winnerId: 'agent-5',
              },
            ],
          },
        ],
      })
      mockBattlesMap._data.set(battle.id, battle)

      await battleStore.useBattleStore.getState().advanceToNextRound(battle.id)

      const setCall = mockBattlesMap.set.mock.calls[0]
      const updatedBattle = setCall[1] as Battle

      expect(updatedBattle.rounds[1].matches).toHaveLength(2)
      // First match is regular
      expect(updatedBattle.rounds[1].matches[0].status).toBe('pending')
      // Second match is a bye (auto-completed)
      expect(updatedBattle.rounds[1].matches[1].status).toBe('completed')
      expect(updatedBattle.rounds[1].matches[1].winnerId).toBe('agent-5')
    })

    it('should throw if battle not found', async () => {
      // Don't set up any battle data - the map is empty

      await expect(
        battleStore.useBattleStore
          .getState()
          .advanceToNextRound('non-existent'),
      ).rejects.toThrow('Battle not found')
    })
  })

  // ============================================
  // Query Methods Tests
  // ============================================
  describe('Query methods', () => {
    describe('getCurrentRound', () => {
      it('should return current in_progress round', async () => {
        const battle = createMockBattle({
          id: 'battle-1',
          status: 'in_progress',
          rounds: [
            {
              id: 'round-1',
              roundNumber: 1,
              status: 'completed',
              matches: [],
            },
            {
              id: 'round-2',
              roundNumber: 2,
              status: 'in_progress',
              matches: [],
            },
          ],
        })

        // Set the battle in currentBattle
        battleStore.useBattleStore.setState({
          currentBattle: battle,
          battles: [battle],
        })

        const currentRound = battleStore.useBattleStore
          .getState()
          .getCurrentRound('battle-1')

        expect(currentRound).toBeDefined()
        expect(currentRound?.id).toBe('round-2')
        expect(currentRound?.roundNumber).toBe(2)
      })

      it('should return null if battle has no rounds', async () => {
        const battle = createMockBattle({
          id: 'battle-1',
          rounds: [],
        })

        battleStore.useBattleStore.setState({
          currentBattle: battle,
          battles: [battle],
        })

        const currentRound = battleStore.useBattleStore
          .getState()
          .getCurrentRound('battle-1')

        expect(currentRound).toBeNull()
      })

      it('should return null if battle not found', async () => {
        const currentRound = battleStore.useBattleStore
          .getState()
          .getCurrentRound('non-existent')

        expect(currentRound).toBeNull()
      })

      it('should return last round (most recent)', async () => {
        const battle = createMockBattle({
          id: 'battle-1',
          rounds: [
            { id: 'round-1', roundNumber: 1, status: 'completed', matches: [] },
            { id: 'round-2', roundNumber: 2, status: 'completed', matches: [] },
            { id: 'round-3', roundNumber: 3, status: 'pending', matches: [] },
          ],
        })

        battleStore.useBattleStore.setState({
          battles: [battle],
        })

        const currentRound = battleStore.useBattleStore
          .getState()
          .getCurrentRound('battle-1')

        expect(currentRound?.roundNumber).toBe(3)
      })
    })

    describe('getCurrentMatch', () => {
      it('should return first pending match', async () => {
        const battle = createMockBattle({
          id: 'battle-1',
          status: 'in_progress',
          rounds: [
            {
              id: 'round-1',
              roundNumber: 1,
              status: 'in_progress',
              matches: [
                {
                  id: 'match-1',
                  status: 'completed',
                  agentAId: 'a1',
                  agentBId: 'b1',
                  winnerId: 'a1',
                },
                {
                  id: 'match-2',
                  status: 'pending',
                  agentAId: 'a2',
                  agentBId: 'b2',
                },
                {
                  id: 'match-3',
                  status: 'pending',
                  agentAId: 'a3',
                  agentBId: 'b3',
                },
              ],
            },
          ],
        })

        battleStore.useBattleStore.setState({
          currentBattle: battle,
          battles: [battle],
        })

        const currentMatch = battleStore.useBattleStore
          .getState()
          .getCurrentMatch('battle-1')

        expect(currentMatch).toBeDefined()
        expect(currentMatch?.id).toBe('match-2')
      })

      it('should return first in_progress match', async () => {
        const battle = createMockBattle({
          id: 'battle-1',
          status: 'in_progress',
          rounds: [
            {
              id: 'round-1',
              roundNumber: 1,
              status: 'in_progress',
              matches: [
                {
                  id: 'match-1',
                  status: 'completed',
                  agentAId: 'a1',
                  agentBId: 'b1',
                  winnerId: 'a1',
                },
                {
                  id: 'match-2',
                  status: 'in_progress',
                  agentAId: 'a2',
                  agentBId: 'b2',
                },
                {
                  id: 'match-3',
                  status: 'pending',
                  agentAId: 'a3',
                  agentBId: 'b3',
                },
              ],
            },
          ],
        })

        battleStore.useBattleStore.setState({
          currentBattle: battle,
          battles: [battle],
        })

        const currentMatch = battleStore.useBattleStore
          .getState()
          .getCurrentMatch('battle-1')

        expect(currentMatch).toBeDefined()
        expect(currentMatch?.id).toBe('match-2')
      })

      it('should return null if all matches completed', async () => {
        const battle = createMockBattle({
          id: 'battle-1',
          status: 'in_progress',
          rounds: [
            {
              id: 'round-1',
              roundNumber: 1,
              status: 'completed',
              matches: [
                {
                  id: 'match-1',
                  status: 'completed',
                  agentAId: 'a1',
                  agentBId: 'b1',
                  winnerId: 'a1',
                },
                {
                  id: 'match-2',
                  status: 'completed',
                  agentAId: 'a2',
                  agentBId: 'b2',
                  winnerId: 'b2',
                },
              ],
            },
          ],
        })

        battleStore.useBattleStore.setState({
          currentBattle: battle,
          battles: [battle],
        })

        const currentMatch = battleStore.useBattleStore
          .getState()
          .getCurrentMatch('battle-1')

        expect(currentMatch).toBeNull()
      })

      it('should return null if no rounds', async () => {
        const battle = createMockBattle({
          id: 'battle-1',
          rounds: [],
        })

        battleStore.useBattleStore.setState({
          currentBattle: battle,
          battles: [battle],
        })

        const currentMatch = battleStore.useBattleStore
          .getState()
          .getCurrentMatch('battle-1')

        expect(currentMatch).toBeNull()
      })
    })

    describe('getActiveMatches', () => {
      it('should return non-completed matches', async () => {
        const battle = createMockBattle({
          id: 'battle-1',
          status: 'in_progress',
          rounds: [
            {
              id: 'round-1',
              roundNumber: 1,
              status: 'in_progress',
              matches: [
                {
                  id: 'match-1',
                  status: 'completed',
                  agentAId: 'a1',
                  agentBId: 'b1',
                  winnerId: 'a1',
                },
                {
                  id: 'match-2',
                  status: 'in_progress',
                  agentAId: 'a2',
                  agentBId: 'b2',
                },
                {
                  id: 'match-3',
                  status: 'pending',
                  agentAId: 'a3',
                  agentBId: 'b3',
                },
              ],
            },
          ],
        })

        battleStore.useBattleStore.setState({
          currentBattle: battle,
          battles: [battle],
        })

        const activeMatches = battleStore.useBattleStore
          .getState()
          .getActiveMatches('battle-1')

        expect(activeMatches).toHaveLength(2)
        expect(activeMatches.map((m) => m.id)).toEqual(['match-2', 'match-3'])
      })

      it('should return empty array if all matches completed', async () => {
        const battle = createMockBattle({
          id: 'battle-1',
          status: 'in_progress',
          rounds: [
            {
              id: 'round-1',
              roundNumber: 1,
              status: 'completed',
              matches: [
                {
                  id: 'match-1',
                  status: 'completed',
                  agentAId: 'a1',
                  agentBId: 'b1',
                  winnerId: 'a1',
                },
                {
                  id: 'match-2',
                  status: 'completed',
                  agentAId: 'a2',
                  agentBId: 'b2',
                  winnerId: 'b2',
                },
              ],
            },
          ],
        })

        battleStore.useBattleStore.setState({
          currentBattle: battle,
          battles: [battle],
        })

        const activeMatches = battleStore.useBattleStore
          .getState()
          .getActiveMatches('battle-1')

        expect(activeMatches).toHaveLength(0)
      })

      it('should return empty array if no rounds', async () => {
        const battle = createMockBattle({
          id: 'battle-1',
          rounds: [],
        })

        battleStore.useBattleStore.setState({
          currentBattle: battle,
          battles: [battle],
        })

        const activeMatches = battleStore.useBattleStore
          .getState()
          .getActiveMatches('battle-1')

        expect(activeMatches).toHaveLength(0)
      })

      it('should return empty array if battle not found', async () => {
        const activeMatches = battleStore.useBattleStore
          .getState()
          .getActiveMatches('non-existent')

        expect(activeMatches).toHaveLength(0)
      })
    })
  })

  // ============================================
  // Additional CRUD Tests
  // ============================================
  describe('loadBattles', () => {
    it('should load battles from database', async () => {
      const mockBattles = [
        createMockBattle({ id: 'battle-1' }),
        createMockBattle({ id: 'battle-2' }),
      ]
      mockBattlesMap._data.set('battle-1', mockBattles[0])
      mockBattlesMap._data.set('battle-2', mockBattles[1])

      await battleStore.useBattleStore.getState().loadBattles()

      const state = battleStore.useBattleStore.getState()
      expect(state.battles).toEqual(mockBattles)
    })

    it('should set isLoading to false after loading', async () => {
      // Map is already empty from reset

      await battleStore.useBattleStore.getState().loadBattles()

      const state = battleStore.useBattleStore.getState()
      expect(state.isLoading).toBe(false)
    })
  })

  describe('deleteBattle', () => {
    it('should remove battle from store', async () => {
      const battle = createMockBattle({ id: 'battle-to-delete' })
      battleStore.useBattleStore.setState({ battles: [battle] })

      await battleStore.useBattleStore
        .getState()
        .deleteBattle('battle-to-delete')

      const state = battleStore.useBattleStore.getState()
      expect(state.battles).toHaveLength(0)
    })

    it('should clear currentBattle if deleted', async () => {
      const battle = createMockBattle({ id: 'battle-to-delete' })
      battleStore.useBattleStore.setState({
        battles: [battle],
        currentBattle: battle,
      })

      await battleStore.useBattleStore
        .getState()
        .deleteBattle('battle-to-delete')

      const state = battleStore.useBattleStore.getState()
      expect(state.currentBattle).toBeNull()
    })

    it('should call mockBattlesMap.delete', async () => {
      const battle = createMockBattle({ id: 'battle-to-delete' })
      battleStore.useBattleStore.setState({ battles: [battle] })

      await battleStore.useBattleStore
        .getState()
        .deleteBattle('battle-to-delete')

      expect(mockBattlesMap.delete).toHaveBeenCalledWith('battle-to-delete')
    })
  })

  describe('clearCurrentBattle', () => {
    it('should set currentBattle to null', () => {
      const battle = createMockBattle()
      battleStore.useBattleStore.setState({ currentBattle: battle })

      battleStore.useBattleStore.getState().clearCurrentBattle()

      const state = battleStore.useBattleStore.getState()
      expect(state.currentBattle).toBeNull()
    })
  })

  describe('cancelBattle', () => {
    it('should set battle status to cancelled', async () => {
      const battle = createMockBattle({ status: 'in_progress' })
      mockBattlesMap._data.set(battle.id, battle)

      await battleStore.useBattleStore.getState().cancelBattle(battle.id)

      const setCall = mockBattlesMap.set.mock.calls[0]
      const updatedBattle = setCall[1] as Battle

      expect(updatedBattle.status).toBe('cancelled')
    })
  })

  describe('startMatch', () => {
    it('should set match status to in_progress', async () => {
      const battle = createMockBattle({
        status: 'in_progress',
        rounds: [
          {
            id: 'round-1',
            roundNumber: 1,
            status: 'pending',
            matches: [
              {
                id: 'match-1',
                status: 'pending',
                agentAId: 'agent-1',
                agentBId: 'agent-3',
              },
            ],
          },
        ],
      })
      mockBattlesMap._data.set(battle.id, battle)

      await battleStore.useBattleStore
        .getState()
        .startMatch(battle.id, 'match-1')

      const setCall = mockBattlesMap.set.mock.calls[0]
      const updatedBattle = setCall[1] as Battle

      expect(updatedBattle.rounds[0].matches[0].status).toBe('in_progress')
    })

    it('should set startedAt timestamp on match', async () => {
      const battle = createMockBattle({
        status: 'in_progress',
        rounds: [
          {
            id: 'round-1',
            roundNumber: 1,
            status: 'pending',
            matches: [
              {
                id: 'match-1',
                status: 'pending',
                agentAId: 'agent-1',
                agentBId: 'agent-3',
              },
            ],
          },
        ],
      })
      mockBattlesMap._data.set(battle.id, battle)

      await battleStore.useBattleStore
        .getState()
        .startMatch(battle.id, 'match-1')

      const setCall = mockBattlesMap.set.mock.calls[0]
      const updatedBattle = setCall[1] as Battle

      expect(updatedBattle.rounds[0].matches[0].startedAt).toBeInstanceOf(Date)
    })

    it('should set round status to in_progress', async () => {
      const battle = createMockBattle({
        status: 'in_progress',
        rounds: [
          {
            id: 'round-1',
            roundNumber: 1,
            status: 'pending',
            matches: [
              {
                id: 'match-1',
                status: 'pending',
                agentAId: 'agent-1',
                agentBId: 'agent-3',
              },
            ],
          },
        ],
      })
      mockBattlesMap._data.set(battle.id, battle)

      await battleStore.useBattleStore
        .getState()
        .startMatch(battle.id, 'match-1')

      const setCall = mockBattlesMap.set.mock.calls[0]
      const updatedBattle = setCall[1] as Battle

      expect(updatedBattle.rounds[0].status).toBe('in_progress')
    })
  })

  describe('setMatchConversation', () => {
    it('should set conversationId on match', async () => {
      const battle = createMockBattle({
        status: 'in_progress',
        rounds: [
          {
            id: 'round-1',
            roundNumber: 1,
            status: 'in_progress',
            matches: [
              {
                id: 'match-1',
                status: 'in_progress',
                agentAId: 'agent-1',
                agentBId: 'agent-3',
              },
            ],
          },
        ],
      })
      mockBattlesMap._data.set(battle.id, battle)

      await battleStore.useBattleStore
        .getState()
        .setMatchConversation(battle.id, 'match-1', 'conversation-123')

      const setCall = mockBattlesMap.set.mock.calls[0]
      const updatedBattle = setCall[1] as Battle

      expect(updatedBattle.rounds[0].matches[0].conversationId).toBe(
        'conversation-123',
      )
    })
  })
})
