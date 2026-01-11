/**
 * Battle Feature Types
 *
 * Type definitions for the Agent Battle system - a trading card battle
 * game where AI agents compete as collectible cards with unique abilities,
 * stats, and special moves. Features animated battles, card generation,
 * and tournament-style competitions.
 */

// =============================================================================
// AGENT CARDS - Collectible trading cards
// =============================================================================

/**
 * Card rarity determines visual effects, power scaling, and generation quality
 */
export type CardRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'

/**
 * Card element type - affects abilities and battle mechanics
 */
export type CardElement =
  | 'wisdom' // Knowledge, analysis, logic
  | 'creativity' // Art, imagination, innovation
  | 'charisma' // Persuasion, leadership, influence
  | 'strategy' // Planning, tactics, foresight
  | 'nature' // Science, physics, natural laws
  | 'spirit' // Philosophy, ethics, consciousness
  | 'tech' // Technology, computation, engineering
  | 'cosmic' // Space, universe, abstract concepts

/**
 * Element effectiveness matrix (rock-paper-scissors style)
 */
export const ELEMENT_EFFECTIVENESS: Record<CardElement, CardElement[]> = {
  wisdom: ['creativity', 'spirit'], // Wisdom analyzes creativity, grounds spirit
  creativity: ['tech', 'strategy'], // Creativity disrupts tech, outmaneuvers strategy
  charisma: ['wisdom', 'nature'], // Charisma sways wisdom, humanizes nature
  strategy: ['charisma', 'cosmic'], // Strategy counters charisma, predicts cosmic
  nature: ['strategy', 'tech'], // Nature overcomes strategy, degrades tech
  spirit: ['nature', 'charisma'], // Spirit transcends nature, purifies charisma
  tech: ['spirit', 'wisdom'], // Tech simulates spirit, augments wisdom
  cosmic: ['wisdom', 'creativity'], // Cosmic encompasses wisdom, inspires creativity
}

/**
 * Card ability - special moves that can be used during battle
 */
export interface CardAbility {
  /** Unique identifier */
  id: string
  /** Display name */
  name: string
  /** Description of the ability's effect */
  description: string
  /** Element type of the ability */
  element: CardElement
  /** Base damage/effect power (0-100) */
  power: number
  /** Energy cost to use (0-5) */
  cost: number
  /** Cooldown in turns (0 = can use every turn) */
  cooldown: number
  /** Special effect type */
  effect?: AbilityEffect
  /** Animation style for battle visuals */
  animation: AbilityAnimation
}

/**
 * Special effects abilities can have
 */
export type AbilityEffect =
  | 'damage' // Direct damage
  | 'heal' // Restore HP
  | 'buff_attack' // Increase attack
  | 'buff_defense' // Increase defense
  | 'debuff_attack' // Reduce enemy attack
  | 'debuff_defense' // Reduce enemy defense
  | 'stun' // Skip enemy turn
  | 'drain' // Damage + heal
  | 'shield' // Absorb damage
  | 'reflect' // Return portion of damage
  | 'burn' // Damage over time
  | 'confuse' // Random target
  | 'critical_boost' // Increase crit chance

/**
 * Animation types for abilities
 */
export type AbilityAnimation =
  | 'beam' // Energy beam
  | 'slash' // Physical strike
  | 'explosion' // Area burst
  | 'wave' // Spreading wave
  | 'vortex' // Spinning vortex
  | 'lightning' // Electric bolts
  | 'heal_glow' // Healing aura
  | 'shield_dome' // Protective dome
  | 'particle_swarm' // Particle effects
  | 'cosmic_rift' // Dimensional tear
  | 'fire_burst' // Fire explosion
  | 'ice_shards' // Ice projectiles

/**
 * Card stats - the core attributes of an agent card
 */
export interface CardStats {
  /** Health Points - how much damage can be taken (50-200) */
  hp: number
  /** Maximum HP */
  maxHp: number
  /** Attack power - increases ability damage (10-100) */
  attack: number
  /** Defense - reduces incoming damage (10-100) */
  defense: number
  /** Speed - determines turn order (10-100) */
  speed: number
  /** Energy - resource for using abilities (starts at 3, max 5) */
  energy: number
  /** Maximum energy */
  maxEnergy: number
}

/**
 * Agent Card - the core battle unit for trading card battles
 */
export interface AgentCard {
  /** Unique identifier */
  id: string
  /** Reference to the agent this card represents */
  agentId: string
  /** Display name for the card */
  name: string
  /** Card title/epithet (e.g., "The Genius", "Master of Logic") */
  title: string
  /** Element type of this card */
  element: CardElement
  /** Rarity level */
  rarity: CardRarity
  /** Base stats (before buffs/debuffs) */
  baseStats: CardStats
  /** Current stats (with modifiers) */
  currentStats: CardStats
  /** Available abilities (2-4 based on rarity) */
  abilities: CardAbility[]
  /** Generated card artwork URL */
  artworkUrl?: string
  /** Card frame/border style */
  frameStyle: CardFrameStyle
  /** Flavor text / lore */
  flavorText: string
  /** When this card was generated */
  createdAt: Date
  /** Card level (1-100, affects stats) */
  level: number
  /** Experience points towards next level */
  xp: number
}

/**
 * Card frame visual styles
 */
export type CardFrameStyle =
  | 'classic' // Traditional card border
  | 'holographic' // Shiny holographic effect
  | 'cosmic' // Space/galaxy themed
  | 'elemental' // Based on card element
  | 'golden' // Prestigious gold border
  | 'dark' // Dark/shadow themed
  | 'crystal' // Crystalline border
  | 'nature' // Organic/natural border

/**
 * Card generation request - for creating new agent cards via studio
 */
export interface CardGenerationRequest {
  /** Agent to create card for */
  agentId: string
  /** Desired rarity (affects generation quality) */
  targetRarity: CardRarity
  /** Optional custom art style */
  artStyle?: string
  /** Optional custom element override */
  elementOverride?: CardElement
}

// =============================================================================
// BATTLE MECHANICS - Turn-based card combat
// =============================================================================

/**
 * Battle action types
 */
export type BattleActionType =
  | 'ability' // Use an ability
  | 'defend' // Defensive stance (50% damage reduction, +1 energy)
  | 'charge' // Skip turn to gain +2 energy
  | 'forfeit' // Surrender the match

/**
 * A single battle action
 */
export interface BattleAction {
  /** Action type */
  type: BattleActionType
  /** Ability ID if using an ability */
  abilityId?: string
  /** Card performing the action */
  sourceCardId: string
  /** Target card (if applicable) */
  targetCardId?: string
  /** Turn number when action was taken */
  turn: number
  /** Timestamp */
  timestamp: Date
}

/**
 * Result of a battle action
 */
export interface BattleActionResult {
  /** The action that was performed */
  action: BattleAction
  /** Damage dealt (if any) */
  damage?: number
  /** Was it a critical hit? */
  isCritical?: boolean
  /** Healing done (if any) */
  healing?: number
  /** Status effects applied */
  statusEffects?: StatusEffect[]
  /** Element effectiveness modifier */
  effectiveness?: 'super_effective' | 'normal' | 'not_effective'
  /** Miss/dodge */
  missed?: boolean
  /** Card that was knocked out (if any) */
  knockedOutCardId?: string
}

/**
 * Status effects that can be applied to cards
 */
export interface StatusEffect {
  /** Effect type */
  type:
    | 'burn'
    | 'freeze'
    | 'stun'
    | 'poison'
    | 'confusion'
    | 'attack_up'
    | 'attack_down'
    | 'defense_up'
    | 'defense_down'
    | 'speed_up'
    | 'speed_down'
    | 'shield'
  /** Remaining duration in turns */
  duration: number
  /** Effect power/intensity */
  intensity: number
  /** Source card that applied this effect */
  sourceCardId: string
}

/**
 * Turn data for battle visualization
 */
export interface BattleTurn {
  /** Turn number */
  turnNumber: number
  /** Which card's turn it is */
  activeCardId: string
  /** Action taken this turn */
  action?: BattleAction
  /** Result of the action */
  result?: BattleActionResult
  /** AI-generated commentary for this turn */
  commentary?: string
  /** Timestamp */
  timestamp: Date
}

/**
 * Card state during battle (for tracking HP, effects, etc.)
 */
export interface BattleCardState {
  /** The card */
  card: AgentCard
  /** Current HP */
  currentHp: number
  /** Current energy */
  currentEnergy: number
  /** Active status effects */
  statusEffects: StatusEffect[]
  /** Abilities on cooldown (abilityId -> turns remaining) */
  cooldowns: Record<string, number>
  /** Is this card knocked out? */
  isKnockedOut: boolean
  /** Position on the battlefield (for animations) */
  position: 'left' | 'right'
}

// =============================================================================
// ORIGINAL BATTLE TYPES (enhanced for card game)
// =============================================================================

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
  /** Card battle data (for animated card battles) */
  cardBattleData?: CardBattleData
}

/**
 * Card battle specific data for a match
 */
export interface CardBattleData {
  /** Card state for agent A */
  cardA: BattleCardState
  /** Card state for agent B */
  cardB: BattleCardState
  /** All turns in this card battle */
  turns: BattleTurn[]
  /** Current turn number */
  currentTurn: number
  /** Maximum turns before draw */
  maxTurns: number
  /** Winner card ID (null if draw) */
  winnerCardId?: string
  /** Battle start timestamp */
  startedAt: Date
  /** Battle end timestamp */
  endedAt?: Date
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
  /** Champion's card (for display) */
  championCard?: AgentCard
  /** Timestamp when the battle was created */
  createdAt: Date
  /** Timestamp of the last update */
  updatedAt: Date
  /** Timestamp when the battle finished */
  completedAt?: Date
  /** Use card battle mode (animated trading card battles) */
  isCardBattle?: boolean
  /** All agent cards used in this battle */
  agentCards?: AgentCard[]
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
  /** Enable card battle mode */
  enableCardBattle?: boolean
}

// =============================================================================
// VISUAL EFFECTS & ANIMATIONS
// =============================================================================

/**
 * Battle visual effect configuration
 */
export interface BattleVisualEffect {
  /** Effect type */
  type:
    | 'damage_flash'
    | 'heal_glow'
    | 'buff_sparkle'
    | 'debuff_drip'
    | 'critical_explosion'
    | 'knockout_shatter'
    | 'element_burst'
    | 'shield_pulse'
  /** Duration in ms */
  duration: number
  /** Color(s) to use */
  colors: string[]
  /** Intensity (0-1) */
  intensity: number
  /** Target position */
  target: 'left' | 'right' | 'center' | 'both'
}

/**
 * Screen shake configuration for impacts
 */
export interface ScreenShake {
  /** Intensity (pixels) */
  intensity: number
  /** Duration in ms */
  duration: number
  /** Shake pattern */
  pattern: 'linear' | 'decay' | 'burst'
}

/**
 * Battle announcement configuration
 */
export interface BattleAnnouncement {
  /** Text to display */
  text: string
  /** Display style */
  style: 'normal' | 'critical' | 'knockout' | 'victory' | 'super_effective'
  /** Duration in ms */
  duration: number
  /** Animation */
  animation: 'fade' | 'slide' | 'bounce' | 'shake'
}

/**
 * Complete battle animation sequence
 */
export interface BattleAnimationSequence {
  /** Announcements to show */
  announcements: BattleAnnouncement[]
  /** Visual effects to play */
  effects: BattleVisualEffect[]
  /** Screen shakes */
  shakes: ScreenShake[]
  /** Card movements */
  cardAnimations: CardAnimation[]
  /** HP bar changes */
  hpChanges: HpBarAnimation[]
  /** Total sequence duration */
  totalDuration: number
}

/**
 * Card animation during battle
 */
export interface CardAnimation {
  /** Target card ID */
  cardId: string
  /** Animation type */
  type:
    | 'attack_forward'
    | 'attack_backward'
    | 'dodge'
    | 'hurt'
    | 'defend'
    | 'charge'
    | 'victory'
    | 'knockout'
    | 'idle'
  /** Duration in ms */
  duration: number
  /** Easing function */
  easing: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'bounce'
}

/**
 * HP bar animation
 */
export interface HpBarAnimation {
  /** Target card ID */
  cardId: string
  /** Starting HP percentage */
  fromPercent: number
  /** Ending HP percentage */
  toPercent: number
  /** Duration in ms */
  duration: number
  /** Show damage/heal number */
  showNumber?: number
  /** Number color */
  numberColor?: 'red' | 'green' | 'yellow'
}

// =============================================================================
// CARD COLLECTION & GALLERY
// =============================================================================

/**
 * Player's card collection
 */
export interface CardCollection {
  /** Collection owner (user ID or 'local') */
  ownerId: string
  /** All owned cards */
  cards: AgentCard[]
  /** Favorite cards */
  favoriteCardIds: string[]
  /** Cards organized into decks */
  decks: CardDeck[]
  /** Collection statistics */
  stats: CollectionStats
  /** When collection was created */
  createdAt: Date
  /** Last modification */
  updatedAt: Date
}

/**
 * A deck of cards for battle
 */
export interface CardDeck {
  /** Deck ID */
  id: string
  /** Deck name */
  name: string
  /** Card IDs in this deck */
  cardIds: string[]
  /** Cover card (shown as deck preview) */
  coverCardId?: string
  /** Whether this is the active deck */
  isActive: boolean
  /** Creation date */
  createdAt: Date
}

/**
 * Collection statistics
 */
export interface CollectionStats {
  /** Total cards owned */
  totalCards: number
  /** Cards by rarity */
  byRarity: Record<CardRarity, number>
  /** Cards by element */
  byElement: Record<CardElement, number>
  /** Total battles won */
  battlesWon: number
  /** Total battles played */
  battlesPlayed: number
  /** Highest level card */
  maxLevel: number
  /** Total XP earned */
  totalXp: number
}
