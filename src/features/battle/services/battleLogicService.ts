/**
 * Battle Logic Service
 *
 * Centralized battle logic for trading card battles.
 * Handles damage calculation, AI decisions, and game rules.
 */

import type {
  AgentCard,
  CardAbility,
  CardElement,
  BattleCardState,
  StatusEffect,
} from '../types'
import { ELEMENT_EFFECTIVENESS } from '../types'

/**
 * Battle logic service - handles all battle mechanics
 */
export const battleLogicService = {
  /**
   * Calculate damage from an ability
   *
   * Formula:
   * baseDamage = ability.power * 0.5
   * attackMultiplier = attacker.attack / 50 (normalized to ~1.0)
   * defenseMultiplier = 100 / (100 + defender.defense)
   * elementMultiplier = effectiveness lookup
   * critMultiplier = 1.5 if critical, 1.0 otherwise
   * defenseBuffMultiplier = 0.5 if defender has defense_up, 1.0 otherwise
   *
   * finalDamage = floor(baseDamage * all multipliers)
   */
  calculateDamage(
    ability: CardAbility,
    attacker: BattleCardState,
    defender: BattleCardState,
    attackerCard: AgentCard,
    defenderCard: AgentCard,
  ): {
    damage: number
    isCritical: boolean
    effectiveness: 'super' | 'normal' | 'weak'
  } {
    // Base damage from ability power
    const baseDamage = ability.power * 0.5

    // Attack multiplier (normalized around 1.0 with 50 attack)
    const attackMultiplier = attacker.card.currentStats.attack / 50

    // Defense multiplier (diminishing returns formula)
    const defenseMultiplier = 100 / (100 + defender.card.currentStats.defense)

    // Element effectiveness
    const elementMultiplier = this.getElementEffectiveness(
      ability.element,
      defenderCard.element,
    )
    let effectiveness: 'super' | 'normal' | 'weak' = 'normal'
    if (elementMultiplier > 1) {
      effectiveness = 'super'
    } else if (elementMultiplier < 1) {
      effectiveness = 'weak'
    }

    // Critical hit calculation (10% base chance, boosted by speed difference)
    const speedDiff =
      attackerCard.currentStats.speed - defenderCard.currentStats.speed
    const critChance = Math.min(0.4, 0.1 + Math.max(0, speedDiff) / 200)
    const isCritical = Math.random() < critChance
    const critMultiplier = isCritical ? 1.5 : 1.0

    // Check for defense buff on defender
    const hasDefenseBuff = defender.statusEffects.some(
      (effect) => effect.type === 'defense_up' && effect.duration > 0,
    )
    const defenseBuffMultiplier = hasDefenseBuff ? 0.5 : 1.0

    // Check for attack debuff on attacker
    const hasAttackDebuff = attacker.statusEffects.some(
      (effect) => effect.type === 'attack_down' && effect.duration > 0,
    )
    const attackDebuffMultiplier = hasAttackDebuff ? 0.7 : 1.0

    // Calculate final damage
    const finalDamage = Math.floor(
      baseDamage *
        attackMultiplier *
        defenseMultiplier *
        elementMultiplier *
        critMultiplier *
        defenseBuffMultiplier *
        attackDebuffMultiplier,
    )

    // Ensure minimum damage of 1 if ability has power
    return {
      damage: ability.power > 0 ? Math.max(1, finalDamage) : 0,
      isCritical,
      effectiveness,
    }
  },

  /**
   * Get element effectiveness multiplier
   * Returns: 1.5 for super effective, 0.75 for not effective, 1.0 for neutral
   */
  getElementEffectiveness(
    attackerElement: CardElement,
    defenderElement: CardElement,
  ): number {
    // Same element = neutral
    if (attackerElement === defenderElement) {
      return 1.0
    }

    // Check if attacker's element is super effective against defender
    const strongAgainst = ELEMENT_EFFECTIVENESS[attackerElement] || []
    if (strongAgainst.includes(defenderElement)) {
      return 1.5
    }

    // Check if defender's element is strong against attacker (reverse lookup)
    const defenderStrongAgainst = ELEMENT_EFFECTIVENESS[defenderElement] || []
    if (defenderStrongAgainst.includes(attackerElement)) {
      return 0.75
    }

    // Neutral matchup
    return 1.0
  },

  /**
   * Check if ability can be used (enough energy, not on cooldown)
   */
  canUseAbility(ability: CardAbility, cardState: BattleCardState): boolean {
    // Check energy cost
    if (cardState.currentEnergy < ability.cost) {
      return false
    }

    // Check cooldown
    const cooldownRemaining = cardState.cooldowns[ability.id] || 0
    if (cooldownRemaining > 0) {
      return false
    }

    // Check for stun effect
    const isStunned = cardState.statusEffects.some(
      (effect) => effect.type === 'stun' && effect.duration > 0,
    )
    if (isStunned) {
      return false
    }

    return true
  },

  /**
   * Apply ability effect (heal, buff, debuff, etc.)
   * Returns updated states for both attacker and defender
   */
  applyAbilityEffect(
    ability: CardAbility,
    attacker: BattleCardState,
    defender: BattleCardState,
  ): { attackerState: BattleCardState; defenderState: BattleCardState } {
    let newAttackerState = { ...attacker }
    let newDefenderState = { ...defender }

    // Deduct energy cost
    newAttackerState.currentEnergy = Math.max(
      0,
      newAttackerState.currentEnergy - ability.cost,
    )

    // Set cooldown
    if (ability.cooldown > 0) {
      newAttackerState.cooldowns = {
        ...newAttackerState.cooldowns,
        [ability.id]: ability.cooldown,
      }
    }

    // Apply effect based on type
    switch (ability.effect) {
      case 'heal': {
        const healAmount = Math.floor(ability.power * 0.8)
        const maxHp = newAttackerState.card.baseStats.maxHp
        newAttackerState.currentHp = Math.min(
          maxHp,
          newAttackerState.currentHp + healAmount,
        )
        break
      }

      case 'buff_attack': {
        const existingBuff = newAttackerState.statusEffects.find(
          (e) => e.type === 'attack_up',
        )
        if (existingBuff) {
          existingBuff.duration = Math.max(existingBuff.duration, 3)
        } else {
          newAttackerState.statusEffects = [
            ...newAttackerState.statusEffects,
            {
              type: 'attack_up',
              duration: 3,
              intensity: ability.power / 20,
              sourceCardId: attacker.card.id,
            },
          ]
        }
        break
      }

      case 'buff_defense': {
        const existingBuff = newAttackerState.statusEffects.find(
          (e) => e.type === 'defense_up',
        )
        if (existingBuff) {
          existingBuff.duration = Math.max(existingBuff.duration, 3)
        } else {
          newAttackerState.statusEffects = [
            ...newAttackerState.statusEffects,
            {
              type: 'defense_up',
              duration: 3,
              intensity: ability.power / 20,
              sourceCardId: attacker.card.id,
            },
          ]
        }
        break
      }

      case 'debuff_attack': {
        const existingDebuff = newDefenderState.statusEffects.find(
          (e) => e.type === 'attack_down',
        )
        if (existingDebuff) {
          existingDebuff.duration = Math.max(existingDebuff.duration, 3)
        } else {
          newDefenderState.statusEffects = [
            ...newDefenderState.statusEffects,
            {
              type: 'attack_down',
              duration: 3,
              intensity: ability.power / 20,
              sourceCardId: attacker.card.id,
            },
          ]
        }
        break
      }

      case 'debuff_defense': {
        const existingDebuff = newDefenderState.statusEffects.find(
          (e) => e.type === 'defense_down',
        )
        if (existingDebuff) {
          existingDebuff.duration = Math.max(existingDebuff.duration, 3)
        } else {
          newDefenderState.statusEffects = [
            ...newDefenderState.statusEffects,
            {
              type: 'defense_down',
              duration: 3,
              intensity: ability.power / 20,
              sourceCardId: attacker.card.id,
            },
          ]
        }
        break
      }

      case 'stun': {
        // Stun has a chance to apply based on power
        const stunChance = ability.power / 100
        if (Math.random() < stunChance) {
          newDefenderState.statusEffects = [
            ...newDefenderState.statusEffects,
            {
              type: 'stun',
              duration: 1,
              intensity: 1,
              sourceCardId: attacker.card.id,
            },
          ]
        }
        break
      }

      case 'drain': {
        // Drain heals for a portion of damage dealt
        // Damage is calculated separately, this just adds the heal component
        const drainAmount = Math.floor(ability.power * 0.3)
        const maxHp = newAttackerState.card.baseStats.maxHp
        newAttackerState.currentHp = Math.min(
          maxHp,
          newAttackerState.currentHp + drainAmount,
        )
        break
      }

      case 'shield': {
        newAttackerState.statusEffects = [
          ...newAttackerState.statusEffects,
          {
            type: 'shield',
            duration: 2,
            intensity: ability.power,
            sourceCardId: attacker.card.id,
          },
        ]
        break
      }

      case 'burn': {
        const existingBurn = newDefenderState.statusEffects.find(
          (e) => e.type === 'burn',
        )
        if (existingBurn) {
          existingBurn.duration = Math.max(existingBurn.duration, 3)
        } else {
          newDefenderState.statusEffects = [
            ...newDefenderState.statusEffects,
            {
              type: 'burn',
              duration: 3,
              intensity: ability.power / 20,
              sourceCardId: attacker.card.id,
            },
          ]
        }
        break
      }

      case 'critical_boost': {
        // Boost crit chance for next few turns (handled in damage calculation)
        newAttackerState.statusEffects = [
          ...newAttackerState.statusEffects,
          {
            type: 'speed_up', // Using speed_up as proxy for crit boost
            duration: 3,
            intensity: ability.power / 10,
            sourceCardId: attacker.card.id,
            // Note: In a full implementation, add a 'crit_boost' status type
          },
        ]
        break
      }

      case 'damage':
      default:
        // Pure damage abilities are handled in calculateDamage
        break
    }

    return { attackerState: newAttackerState, defenderState: newDefenderState }
  },

  /**
   * AI: Select best action for opponent
   *
   * Priority order:
   * 1. If HP < 30% and have healing ability with enough energy → heal
   * 2. If have super-effective ability with enough energy → use it
   * 3. If energy < 2 → charge
   * 4. If HP < 50% and no good offensive options → defend
   * 5. Use highest damage ability that can be afforded
   * 6. If nothing else → charge
   */
  selectAIAction(
    aiCard: AgentCard,
    aiState: BattleCardState,
    playerCard: AgentCard,
    playerState: BattleCardState,
  ): { type: 'ability' | 'defend' | 'charge'; ability?: CardAbility } {
    const maxHp = aiCard.baseStats.maxHp
    const hpPercent = aiState.currentHp / maxHp
    const currentEnergy = aiState.currentEnergy

    // Get usable abilities
    const usableAbilities = aiCard.abilities.filter((ability) =>
      this.canUseAbility(ability, aiState),
    )

    // Find healing abilities
    const healingAbilities = usableAbilities.filter(
      (ability) => ability.effect === 'heal' || ability.effect === 'drain',
    )

    // Priority 1: Heal if HP is critical
    if (hpPercent < 0.3 && healingAbilities.length > 0) {
      // Pick the healing ability with highest power
      const bestHeal = healingAbilities.reduce((best, current) =>
        current.power > best.power ? current : best,
      )
      return { type: 'ability', ability: bestHeal }
    }

    // Find super-effective abilities
    const superEffectiveAbilities = usableAbilities.filter((ability) => {
      const effectiveness = this.getElementEffectiveness(
        ability.element,
        playerCard.element,
      )
      return (
        effectiveness > 1 && (ability.effect === 'damage' || !ability.effect)
      )
    })

    // Priority 2: Use super-effective ability
    if (superEffectiveAbilities.length > 0) {
      const bestSuperEffective = superEffectiveAbilities.reduce(
        (best, current) => (current.power > best.power ? current : best),
      )
      return { type: 'ability', ability: bestSuperEffective }
    }

    // Priority 3: Charge if low on energy
    if (currentEnergy < 2) {
      return { type: 'charge' }
    }

    // Get offensive abilities (damage-dealing)
    const offensiveAbilities = usableAbilities.filter(
      (ability) =>
        ability.power > 0 &&
        (ability.effect === 'damage' ||
          !ability.effect ||
          ability.effect === 'drain'),
    )

    // Priority 4: Defend if HP is low and no good offensive options
    if (hpPercent < 0.5 && offensiveAbilities.length === 0) {
      return { type: 'defend' }
    }

    // Priority 5: Use highest damage ability
    if (offensiveAbilities.length > 0) {
      // Calculate expected damage for each ability
      const abilitiesWithDamage = offensiveAbilities.map((ability) => {
        const { damage } = this.calculateDamage(
          ability,
          aiState,
          playerState,
          aiCard,
          playerCard,
        )
        return { ability, expectedDamage: damage }
      })

      // Sort by expected damage
      abilitiesWithDamage.sort((a, b) => b.expectedDamage - a.expectedDamage)
      return { type: 'ability', ability: abilitiesWithDamage[0].ability }
    }

    // Priority 6: Use any usable ability (buffs, debuffs)
    if (usableAbilities.length > 0) {
      // Prefer buffs when healthy, debuffs when not
      const buffAbilities = usableAbilities.filter(
        (a) =>
          a.effect === 'buff_attack' ||
          a.effect === 'buff_defense' ||
          a.effect === 'shield',
      )
      const debuffAbilities = usableAbilities.filter(
        (a) =>
          a.effect === 'debuff_attack' ||
          a.effect === 'debuff_defense' ||
          a.effect === 'burn',
      )

      if (hpPercent > 0.6 && debuffAbilities.length > 0) {
        return { type: 'ability', ability: debuffAbilities[0] }
      }
      if (buffAbilities.length > 0) {
        return { type: 'ability', ability: buffAbilities[0] }
      }
      return { type: 'ability', ability: usableAbilities[0] }
    }

    // Default: Charge
    return { type: 'charge' }
  },

  /**
   * Check win condition
   * Returns which player won, 'draw' if both knocked out, or null if battle continues
   */
  checkWinCondition(
    playerState: BattleCardState,
    opponentState: BattleCardState,
  ): 'player_won' | 'opponent_won' | 'draw' | null {
    const playerKO = playerState.currentHp <= 0 || playerState.isKnockedOut
    const opponentKO =
      opponentState.currentHp <= 0 || opponentState.isKnockedOut

    if (playerKO && opponentKO) {
      return 'draw'
    }
    if (opponentKO) {
      return 'player_won'
    }
    if (playerKO) {
      return 'opponent_won'
    }

    return null
  },

  /**
   * Process status effects at end of turn
   * - burn: deal 5% max HP damage
   * - defense_up: reduce duration, remove if 0
   * - Other buffs/debuffs: reduce duration
   */
  processStatusEffects(state: BattleCardState): BattleCardState {
    let newState = { ...state }
    const maxHp = state.card.baseStats.maxHp
    const updatedEffects: StatusEffect[] = []

    for (const effect of state.statusEffects) {
      // Process effect
      switch (effect.type) {
        case 'burn': {
          // Deal 5% max HP damage
          const burnDamage = Math.floor(maxHp * 0.05)
          newState.currentHp = Math.max(0, newState.currentHp - burnDamage)
          break
        }
        case 'poison': {
          // Deal 3% max HP damage (less than burn)
          const poisonDamage = Math.floor(maxHp * 0.03)
          newState.currentHp = Math.max(0, newState.currentHp - poisonDamage)
          break
        }
        // Other effects don't have per-turn damage
        default:
          break
      }

      // Reduce duration
      const newDuration = effect.duration - 1

      // Keep effect if duration > 0
      if (newDuration > 0) {
        updatedEffects.push({
          ...effect,
          duration: newDuration,
        })
      }
    }

    // Update cooldowns
    const updatedCooldowns: Record<string, number> = {}
    for (const [abilityId, cooldown] of Object.entries(state.cooldowns)) {
      if (cooldown > 1) {
        updatedCooldowns[abilityId] = cooldown - 1
      }
      // Remove from record if cooldown reaches 0
    }

    newState.statusEffects = updatedEffects
    newState.cooldowns = updatedCooldowns

    // Check if knocked out
    if (newState.currentHp <= 0) {
      newState.isKnockedOut = true
    }

    return newState
  },

  /**
   * Calculate energy regeneration
   * Default regeneration is 1 energy per turn
   */
  regenerateEnergy(
    state: BattleCardState,
    amount: number = 1,
  ): BattleCardState {
    const maxEnergy = state.card.baseStats.maxEnergy
    return {
      ...state,
      currentEnergy: Math.min(maxEnergy, state.currentEnergy + amount),
    }
  },
}

export default battleLogicService
