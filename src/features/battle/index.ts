/**
 * Battle Feature - Public API
 *
 * Battle arena feature for DEVS.
 * Enables AI agent vs agent competitions with tournament-style elimination
 * and trading card battles.
 */

// ============================================================================
// Pages
// ============================================================================
export { CardBattlePage } from './pages'

// ============================================================================
// Components
// ============================================================================
export {
  BattleSetup,
  BattleBracket,
  BattleMatch,
  BattleResults,
  AgentTeamSelector,
  AgentCard as AgentCardComponent,
  CardBattleField,
  CardSelection,
} from './components'

// ============================================================================
// Hooks
// ============================================================================
export { useBattle, useBattleMatch } from './hooks'
export { useCardBattle } from './hooks/useCardBattle'

// ============================================================================
// Services
// ============================================================================
export { battleService } from './services/battleService'
export { cardGenerationService } from './services/cardGenerationService'
export { battleLogicService } from './services/battleLogicService'

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
  // Card battle types
  CardElement,
  CardRarity,
  CardAbility,
  CardStats,
  AgentCard,
  BattleCardState,
} from './types'

// ============================================================================
// i18n
// ============================================================================
export { battleI18n } from './i18n'
