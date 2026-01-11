/**
 * Battle Feature Types
 *
 * Type definitions for the Agent Battle system, where teams of AI agents
 * compete in structured debates judged by an AI judge agent.
 */

/**
 * Status of a battle throughout its lifecycle.
 * - 'setup': Battle is being configured, teams are being formed
 * - 'in_progress': Battle rounds are actively being played
 * - 'completed': All rounds finished, champion determined
 * - 'cancelled': Battle was cancelled before completion
 */
export type BattleStatus = 'setup' | 'in_progress' | 'completed' | 'cancelled'

/**
 * Status of an individual match between two agents.
 * - 'pending': Match not yet started
 * - 'in_progress': Agents are actively debating
 * - 'judging': Debate finished, judge is evaluating
 * - 'completed': Winner has been determined
 */
export type MatchStatus = 'pending' | 'in_progress' | 'judging' | 'completed'

/**
 * Status of a battle round containing multiple matches.
 * - 'pending': Round not yet started
 * - 'in_progress': Matches are being played
 * - 'completed': All matches in round finished
 */
export type RoundStatus = 'pending' | 'in_progress' | 'completed'

/**
 * Represents a team of agents competing in a battle.
 */
export interface BattleTeam {
  /** Display name for the team */
  name: string
  /** Array of agent IDs belonging to this team */
  agentIds: string[]
  /** Optional color for UI display (e.g., 'blue', 'red') */
  color?: string
}

/**
 * Individual agent's score from a match judgment.
 * Each criterion is scored on a scale of 1-10.
 */
export interface AgentScore {
  /** ID of the agent being scored */
  agentId: string
  /** Quality of arguments presented (1-10) */
  argumentQuality: number
  /** How convincing the agent's position was (1-10) */
  persuasiveness: number
  /** Originality and creative approaches (1-10) */
  creativity: number
  /** How well the agent responded to opponent's points (1-10) */
  responsiveness: number
  /** Sum of all criteria scores */
  total: number
}

/**
 * Complete judgment for a match, rendered by the judge agent.
 */
export interface BattleJudgment {
  /** ID of the winning agent */
  winnerId: string
  /** Detailed scores for each participating agent */
  scores: AgentScore[]
  /** Judge's explanation of the decision */
  reasoning: string
  /** Notable moments or arguments from the debate */
  highlights: string[]
}

/**
 * A single match between two agents in a battle round.
 */
export interface BattleMatch {
  /** Unique identifier for the match */
  id: string
  /** Current status of the match */
  status: MatchStatus
  /** ID of the first competing agent */
  agentAId: string
  /** ID of the second competing agent */
  agentBId: string
  /** ID of the conversation where the debate takes place */
  conversationId?: string
  /** ID of the winning agent (set after judgment) */
  winnerId?: string
  /** Complete judgment with scores and reasoning */
  judgment?: BattleJudgment
  /** Timestamp when the match began */
  startedAt?: Date
  /** Timestamp when the match was completed */
  completedAt?: Date
}

/**
 * A round in the battle tournament, containing multiple matches.
 * Agents are eliminated each round until a champion remains.
 */
export interface BattleRound {
  /** Unique identifier for the round */
  id: string
  /** Sequential round number (1-based) */
  roundNumber: number
  /** Current status of the round */
  status: RoundStatus
  /** All matches in this round */
  matches: BattleMatch[]
  /** Timestamp when the round began */
  startedAt?: Date
  /** Timestamp when all matches completed */
  completedAt?: Date
}

/**
 * Main Battle entity representing a complete tournament.
 * Teams compete in rounds until one agent emerges as champion.
 */
export interface Battle {
  /** Unique identifier for the battle */
  id: string
  /** Current status of the battle */
  status: BattleStatus
  /** The debate topic for all matches */
  topic: string
  /** ID of the agent acting as judge */
  judgeAgentId: string
  /** Number of conversation turns per match */
  turnsPerConversation: number
  /** Optional custom criteria for the judge to use */
  customJudgingCriteria?: string
  /** First competing team */
  teamA: BattleTeam
  /** Second competing team */
  teamB: BattleTeam
  /** All rounds in the tournament */
  rounds: BattleRound[]
  /** ID of the final winning agent */
  championAgentId?: string
  /** Timestamp when the battle was created */
  createdAt: Date
  /** Timestamp of the last update */
  updatedAt: Date
  /** Timestamp when the battle finished */
  completedAt?: Date
}

/**
 * Configuration options for creating a new battle.
 * Used when initializing a battle before it starts.
 */
export interface BattleConfig {
  /** The debate topic for all matches */
  topic: string
  /** ID of the agent that will judge all matches */
  judgeAgentId: string
  /** First team configuration (color assigned automatically) */
  teamA: Omit<BattleTeam, 'color'>
  /** Second team configuration (color assigned automatically) */
  teamB: Omit<BattleTeam, 'color'>
  /** Number of conversation turns per match (default: 8) */
  turnsPerConversation?: number
  /** Optional custom judging criteria for the judge agent */
  customJudgingCriteria?: string
}
