/**
 * Battle Feature - Public API
 *
 * Battle arena feature for DEVS.
 * Enables AI agent vs agent competitions with tournament-style elimination.
 */

// ============================================================================
// Components
// ============================================================================
export {
  BattleSetup,
  BattleBracket,
  BattleMatch,
  BattleResults,
  AgentTeamSelector,
} from './components'

// ============================================================================
// Hooks
// ============================================================================
export { useBattle, useBattleMatch } from './hooks'

// ============================================================================
// Services
// ============================================================================
export { battleService } from './services/battleService'

// ============================================================================
// Types
// ============================================================================
export type {
  Battle,
  BattleConfig,
  BattleTeam,
  BattleRound,
  BattleMatch as BattleMatchType,
  BattleJudgment,
  AgentScore,
  BattleStatus,
  MatchStatus,
  RoundStatus,
} from './types'

// ============================================================================
// i18n
// ============================================================================
export { battleI18n } from './i18n'
