/**
 * Card Generation Service
 *
 * Service for generating collectible trading cards for agents with AI-generated artwork,
 * stats derived from agent characteristics, and unique abilities based on
 * the agent's role and personality.
 */

import { v4 as uuid } from 'uuid'

import { LLMService, LLMMessage } from '@/lib/llm'
import { CredentialService } from '@/lib/credential-service'
import { type Agent } from '@/types'
import { ImageGenerationService } from '@/features/studio/services/image-generation-service'
import {
  AgentCard,
  CardAbility,
  CardElement,
  CardRarity,
  CardStats,
  CardFrameStyle,
  AbilityAnimation,
  AbilityEffect,
} from '../types'

// =============================================================================
// Constants & Configuration
// =============================================================================

/**
 * Base stats by rarity level
 */
const BASE_STATS_BY_RARITY: Record<
  CardRarity,
  { hp: number; attack: number; defense: number; speed: number }
> = {
  common: { hp: 80, attack: 40, defense: 40, speed: 40 },
  uncommon: { hp: 100, attack: 50, defense: 50, speed: 50 },
  rare: { hp: 120, attack: 60, defense: 60, speed: 60 },
  epic: { hp: 150, attack: 75, defense: 75, speed: 75 },
  legendary: { hp: 200, attack: 90, defense: 90, speed: 90 },
}

/**
 * Number of abilities by rarity
 */
const ABILITY_COUNT_BY_RARITY: Record<CardRarity, number> = {
  common: 2,
  uncommon: 2,
  rare: 3,
  epic: 3,
  legendary: 4,
}

/**
 * Frame styles by rarity
 */
const FRAME_STYLE_BY_RARITY: Record<CardRarity, CardFrameStyle> = {
  common: 'classic',
  uncommon: 'elemental',
  rare: 'elemental',
  epic: 'holographic',
  legendary: 'golden',
}

/**
 * Keywords that map to elements for agent analysis
 */
const ELEMENT_KEYWORDS: Record<CardElement, string[]> = {
  wisdom: [
    'knowledge',
    'learn',
    'understand',
    'analyze',
    'research',
    'study',
    'education',
    'scholar',
    'professor',
    'teacher',
    'academic',
    'intellectual',
  ],
  creativity: [
    'art',
    'create',
    'design',
    'imagine',
    'invent',
    'innovate',
    'artist',
    'musician',
    'writer',
    'creative',
    'compose',
    'paint',
  ],
  charisma: [
    'lead',
    'influence',
    'persuade',
    'speak',
    'present',
    'negotiate',
    'motivate',
    'inspire',
    'charm',
    'social',
    'diplomat',
    'politician',
  ],
  strategy: [
    'plan',
    'strategy',
    'tactic',
    'chess',
    'game',
    'military',
    'general',
    'manage',
    'organize',
    'execute',
    'coordinate',
    'logistics',
  ],
  nature: [
    'science',
    'nature',
    'biology',
    'physics',
    'chemistry',
    'environment',
    'animal',
    'plant',
    'ecology',
    'natural',
    'organic',
    'earth',
  ],
  spirit: [
    'philosophy',
    'spirit',
    'soul',
    'ethics',
    'moral',
    'wisdom',
    'enlighten',
    'meditate',
    'consciousness',
    'zen',
    'spiritual',
    'transcend',
  ],
  tech: [
    'technology',
    'computer',
    'code',
    'program',
    'engineer',
    'software',
    'hardware',
    'digital',
    'cyber',
    'AI',
    'robot',
    'machine',
  ],
  cosmic: [
    'space',
    'universe',
    'cosmic',
    'star',
    'galaxy',
    'astronomy',
    'quantum',
    'dimension',
    'infinite',
    'abstract',
    'theoretical',
    'relativity',
  ],
}

/**
 * Prompt template for generating card abilities with LLM
 */
const ABILITY_GENERATION_PROMPT = `You are a game designer creating abilities for a collectible trading card game.

Create {abilityCount} unique abilities for this agent:
Name: {agentName}
Role: {agentRole}
Element: {element}
Description: {agentDescription}

Each ability should:
1. Be thematic to the agent's personality and expertise
2. Have a creative, memorable name
3. Include a short description (max 50 chars)
4. Have appropriate power (20-80), cost (1-4), and cooldown (0-2)

Respond in JSON format:
{
  "abilities": [
    {
      "name": "Ability Name",
      "description": "Short description of effect",
      "power": 50,
      "cost": 2,
      "cooldown": 1,
      "effect": "damage|heal|buff_attack|buff_defense|debuff_attack|debuff_defense|stun|drain|shield|burn",
      "animation": "beam|slash|explosion|wave|vortex|lightning|heal_glow|shield_dome|particle_swarm|cosmic_rift"
    }
  ]
}

Be creative and match abilities to the agent's character!`

/**
 * Prompt template for generating card artwork
 */
const ARTWORK_PROMPT_TEMPLATE = `Create a trading card game character portrait for:
Character: {agentName}
Title: {title}
Element: {element}
Style: {style}

The image should be:
- A dramatic, powerful portrait suitable for a collectible card game
- Showing the character's upper body and face
- With magical/elemental effects matching their element ({element})
- High quality, detailed, professional trading card game art style
- Dynamic pose suggesting their personality
- Rich colors with dramatic lighting
- Background with elemental effects ({elementEffects})

Art style: Digital illustration, fantasy trading card game art, highly detailed, dramatic lighting, vibrant colors`

// =============================================================================
// Card Generation Service
// =============================================================================

export const cardGenerationService = {
  /**
   * Determine the most appropriate element for an agent based on their
   * name, role, and instructions.
   */
  determineElement(agent: Agent): CardElement {
    const textToAnalyze =
      `${agent.name} ${agent.role} ${agent.instructions}`.toLowerCase()

    let bestElement: CardElement = 'wisdom'
    let highestScore = 0

    for (const [element, keywords] of Object.entries(ELEMENT_KEYWORDS)) {
      const score = keywords.reduce((acc, keyword) => {
        return acc + (textToAnalyze.includes(keyword.toLowerCase()) ? 1 : 0)
      }, 0)

      if (score > highestScore) {
        highestScore = score
        bestElement = element as CardElement
      }
    }

    return bestElement
  },

  /**
   * Determine rarity based on agent characteristics
   */
  determineRarity(agent: Agent): CardRarity {
    // Historical figures and famous personalities get higher rarity
    const famousNames = [
      'einstein',
      'newton',
      'da vinci',
      'shakespeare',
      'aristotle',
      'plato',
      'hawking',
      'confucius',
      'napoleon',
      'lincoln',
    ]
    const agentNameLower = agent.name.toLowerCase()

    if (famousNames.some((name) => agentNameLower.includes(name))) {
      return 'legendary'
    }

    // Longer, more detailed instructions suggest more complex agents
    const instructionLength = agent.instructions?.length || 0
    if (instructionLength > 2000) return 'epic'
    if (instructionLength > 1000) return 'rare'
    if (instructionLength > 500) return 'uncommon'
    return 'common'
  },

  /**
   * Generate base stats for a card based on rarity and agent characteristics
   */
  generateStats(
    agent: Agent,
    rarity: CardRarity,
    level: number = 1,
  ): CardStats {
    const baseStats = BASE_STATS_BY_RARITY[rarity]

    // Add some variation based on agent role
    const roleLower = agent.role?.toLowerCase() || ''
    let attackMod = 0
    let defenseMod = 0
    let speedMod = 0

    // Aggressive roles get more attack
    if (
      roleLower.includes('developer') ||
      roleLower.includes('engineer') ||
      roleLower.includes('warrior')
    ) {
      attackMod = 10
    }

    // Analytical roles get more defense
    if (
      roleLower.includes('analyst') ||
      roleLower.includes('researcher') ||
      roleLower.includes('advisor')
    ) {
      defenseMod = 10
    }

    // Creative roles get more speed
    if (
      roleLower.includes('creative') ||
      roleLower.includes('artist') ||
      roleLower.includes('designer')
    ) {
      speedMod = 10
    }

    // Apply level scaling (1% per level)
    const levelMultiplier = 1 + (level - 1) * 0.01

    const hp = Math.round(baseStats.hp * levelMultiplier)
    const attack = Math.round((baseStats.attack + attackMod) * levelMultiplier)
    const defense = Math.round(
      (baseStats.defense + defenseMod) * levelMultiplier,
    )
    const speed = Math.round((baseStats.speed + speedMod) * levelMultiplier)

    // Energy is fixed by rarity
    const maxEnergy = rarity === 'legendary' ? 5 : rarity === 'epic' ? 4 : 3

    return {
      hp,
      maxHp: hp,
      attack,
      defense,
      speed,
      energy: maxEnergy,
      maxEnergy,
    }
  },

  /**
   * Generate abilities for a card using LLM
   */
  async generateAbilities(
    agent: Agent,
    element: CardElement,
    rarity: CardRarity,
  ): Promise<CardAbility[]> {
    const abilityCount = ABILITY_COUNT_BY_RARITY[rarity]

    // Get active LLM config
    const config = await CredentialService.getActiveConfig()

    if (!config) {
      // Fallback to default abilities if no API key
      return this.generateDefaultAbilities(element, abilityCount)
    }

    try {
      const prompt = ABILITY_GENERATION_PROMPT.replace(
        '{abilityCount}',
        String(abilityCount),
      )
        .replace('{agentName}', agent.name)
        .replace('{agentRole}', agent.role || 'AI Assistant')
        .replace('{element}', element)
        .replace('{agentDescription}', agent.instructions?.slice(0, 500) || '')

      const messages: LLMMessage[] = [{ role: 'user', content: prompt }]

      const response = await LLMService.chat(messages, {
        ...config,
        maxTokens: 1000,
        temperature: 0.8,
      })

      // Parse the JSON response
      const jsonMatch = response.content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        return parsed.abilities.map((ability: any, index: number) => ({
          id: uuid(),
          name: ability.name || `Ability ${index + 1}`,
          description: ability.description || 'A powerful ability',
          element,
          power: Math.min(100, Math.max(10, ability.power || 50)),
          cost: Math.min(5, Math.max(1, ability.cost || 2)),
          cooldown: Math.min(3, Math.max(0, ability.cooldown || 0)),
          effect: (ability.effect || 'damage') as AbilityEffect,
          animation: (ability.animation || 'beam') as AbilityAnimation,
        }))
      }
    } catch (error) {
      console.warn(
        'Failed to generate abilities with LLM, using defaults:',
        error,
      )
    }

    return this.generateDefaultAbilities(element, abilityCount)
  },

  /**
   * Generate default abilities without LLM
   */
  generateDefaultAbilities(element: CardElement, count: number): CardAbility[] {
    const defaultAbilities: Record<CardElement, CardAbility[]> = {
      wisdom: [
        {
          id: uuid(),
          name: 'Knowledge Strike',
          description: 'Attack with accumulated wisdom',
          element: 'wisdom',
          power: 50,
          cost: 2,
          cooldown: 0,
          effect: 'damage',
          animation: 'beam',
        },
        {
          id: uuid(),
          name: 'Mind Shield',
          description: 'Protect with mental fortitude',
          element: 'wisdom',
          power: 30,
          cost: 2,
          cooldown: 1,
          effect: 'shield',
          animation: 'shield_dome',
        },
        {
          id: uuid(),
          name: 'Enlightenment',
          description: 'Boost attack through insight',
          element: 'wisdom',
          power: 40,
          cost: 3,
          cooldown: 2,
          effect: 'buff_attack',
          animation: 'heal_glow',
        },
      ],
      creativity: [
        {
          id: uuid(),
          name: 'Creative Burst',
          description: 'Unleash creative energy',
          element: 'creativity',
          power: 55,
          cost: 2,
          cooldown: 0,
          effect: 'damage',
          animation: 'explosion',
        },
        {
          id: uuid(),
          name: 'Inspire',
          description: 'Boost abilities through inspiration',
          element: 'creativity',
          power: 35,
          cost: 2,
          cooldown: 1,
          effect: 'buff_attack',
          animation: 'particle_swarm',
        },
        {
          id: uuid(),
          name: 'Artistic Vision',
          description: 'Confuse with abstract visions',
          element: 'creativity',
          power: 45,
          cost: 3,
          cooldown: 2,
          effect: 'confuse',
          animation: 'vortex',
        },
      ],
      charisma: [
        {
          id: uuid(),
          name: 'Persuasive Strike',
          description: 'Attack with convincing force',
          element: 'charisma',
          power: 45,
          cost: 2,
          cooldown: 0,
          effect: 'damage',
          animation: 'wave',
        },
        {
          id: uuid(),
          name: 'Rally',
          description: 'Boost defense with motivation',
          element: 'charisma',
          power: 35,
          cost: 2,
          cooldown: 1,
          effect: 'buff_defense',
          animation: 'heal_glow',
        },
        {
          id: uuid(),
          name: 'Demoralize',
          description: 'Weaken enemy resolve',
          element: 'charisma',
          power: 40,
          cost: 3,
          cooldown: 2,
          effect: 'debuff_attack',
          animation: 'wave',
        },
      ],
      strategy: [
        {
          id: uuid(),
          name: 'Tactical Strike',
          description: 'Calculated precision attack',
          element: 'strategy',
          power: 60,
          cost: 3,
          cooldown: 1,
          effect: 'damage',
          animation: 'slash',
        },
        {
          id: uuid(),
          name: 'Fortify',
          description: 'Strategic defense boost',
          element: 'strategy',
          power: 40,
          cost: 2,
          cooldown: 1,
          effect: 'buff_defense',
          animation: 'shield_dome',
        },
        {
          id: uuid(),
          name: 'Analyze',
          description: 'Find enemy weaknesses',
          element: 'strategy',
          power: 35,
          cost: 2,
          cooldown: 2,
          effect: 'debuff_defense',
          animation: 'beam',
        },
      ],
      nature: [
        {
          id: uuid(),
          name: 'Natural Force',
          description: "Harness nature's power",
          element: 'nature',
          power: 50,
          cost: 2,
          cooldown: 0,
          effect: 'damage',
          animation: 'wave',
        },
        {
          id: uuid(),
          name: 'Regenerate',
          description: 'Heal with natural energy',
          element: 'nature',
          power: 40,
          cost: 3,
          cooldown: 2,
          effect: 'heal',
          animation: 'heal_glow',
        },
        {
          id: uuid(),
          name: 'Poison Spore',
          description: 'Apply damaging toxin',
          element: 'nature',
          power: 30,
          cost: 2,
          cooldown: 1,
          effect: 'burn',
          animation: 'particle_swarm',
        },
      ],
      spirit: [
        {
          id: uuid(),
          name: 'Soul Strike',
          description: 'Attack the spirit directly',
          element: 'spirit',
          power: 55,
          cost: 2,
          cooldown: 0,
          effect: 'damage',
          animation: 'cosmic_rift',
        },
        {
          id: uuid(),
          name: 'Spirit Drain',
          description: 'Absorb enemy energy',
          element: 'spirit',
          power: 35,
          cost: 3,
          cooldown: 2,
          effect: 'drain',
          animation: 'vortex',
        },
        {
          id: uuid(),
          name: 'Transcend',
          description: 'Temporary invulnerability',
          element: 'spirit',
          power: 50,
          cost: 4,
          cooldown: 3,
          effect: 'shield',
          animation: 'heal_glow',
        },
      ],
      tech: [
        {
          id: uuid(),
          name: 'Laser Beam',
          description: 'High-tech energy attack',
          element: 'tech',
          power: 60,
          cost: 2,
          cooldown: 0,
          effect: 'damage',
          animation: 'beam',
        },
        {
          id: uuid(),
          name: 'System Upgrade',
          description: 'Boost all stats temporarily',
          element: 'tech',
          power: 30,
          cost: 3,
          cooldown: 2,
          effect: 'buff_attack',
          animation: 'particle_swarm',
        },
        {
          id: uuid(),
          name: 'EMP Blast',
          description: 'Stun the enemy',
          element: 'tech',
          power: 40,
          cost: 3,
          cooldown: 2,
          effect: 'stun',
          animation: 'lightning',
        },
      ],
      cosmic: [
        {
          id: uuid(),
          name: 'Cosmic Ray',
          description: 'Channel universal energy',
          element: 'cosmic',
          power: 65,
          cost: 3,
          cooldown: 1,
          effect: 'damage',
          animation: 'cosmic_rift',
        },
        {
          id: uuid(),
          name: 'Gravity Well',
          description: 'Slow and damage enemy',
          element: 'cosmic',
          power: 40,
          cost: 2,
          cooldown: 1,
          effect: 'debuff_attack',
          animation: 'vortex',
        },
        {
          id: uuid(),
          name: 'Star Shield',
          description: 'Reflect incoming damage',
          element: 'cosmic',
          power: 35,
          cost: 3,
          cooldown: 2,
          effect: 'reflect',
          animation: 'shield_dome',
        },
      ],
    }

    return defaultAbilities[element].slice(0, count)
  },

  /**
   * Generate card artwork using image generation service
   * Note: This requires proper provider configuration in the Studio feature.
   * If no provider is configured, returns undefined and card uses placeholder.
   */
  async generateArtwork(
    agent: Agent,
    element: CardElement,
    rarity: CardRarity,
  ): Promise<string | undefined> {
    try {
      // Try to get an image generation provider
      let config = await CredentialService.getActiveConfig('google')
      let provider:
        | 'openai'
        | 'google'
        | 'stability'
        | 'together'
        | 'fal'
        | 'replicate' = 'google'

      // Try other providers if Google not available
      if (!config) {
        for (const p of [
          'openai',
          'stability',
          'together',
          'fal',
          'replicate',
        ] as const) {
          config = await CredentialService.getActiveConfig(p)
          if (config) {
            provider = p
            break
          }
        }
      }

      if (!config) {
        console.warn('No image generation API key available')
        return undefined
      }

      const elementEffects: Record<CardElement, string> = {
        wisdom:
          'glowing books, ethereal blue light, swirling knowledge symbols',
        creativity: 'paint splashes, rainbow colors, artistic brush strokes',
        charisma: 'golden aura, radiant light, inspiring presence',
        strategy: 'chess pieces, tactical maps, green military effects',
        nature: 'leaves, vines, natural green energy, flowers',
        spirit: 'purple ethereal flames, mystical symbols, transcendent glow',
        tech: 'circuit patterns, holographic displays, cyan digital effects',
        cosmic: 'stars, galaxies, space nebulae, dimensional rifts',
      }

      const styleByRarity: Record<CardRarity, string> = {
        common: 'clean, simple, professional',
        uncommon: 'detailed, polished, quality',
        rare: 'highly detailed, impressive, premium',
        epic: 'stunning, masterwork, exceptional detail',
        legendary: 'breathtaking, legendary, maximum detail, golden accents',
      }

      const prompt = ARTWORK_PROMPT_TEMPLATE.replace('{agentName}', agent.name)
        .replace('{title}', agent.role || 'AI Agent')
        .replace('{element}', element)
        .replace('{element}', element)
        .replace('{style}', styleByRarity[rarity])
        .replace('{elementEffects}', elementEffects[element])

      // Use the image generation service
      const response = await ImageGenerationService.generate(
        prompt,
        {
          aspectRatio: '3:4', // Card portrait aspect ratio
          quality: rarity === 'legendary' ? 'hd' : 'standard',
          style: 'digital-art',
          lighting: 'dramatic',
          colorPalette: 'vibrant',
          composition: 'portrait',
          count: 1,
        },
        {
          provider,
          apiKey: config.apiKey!,
        },
      )

      if (response.images.length > 0) {
        // Return either URL or base64
        return response.images[0].url || response.images[0].base64
      }
    } catch (error) {
      console.error('Failed to generate card artwork:', error)
    }

    return undefined
  },

  /**
   * Generate a title/epithet based on the element
   */
  generateTitle(element: CardElement): string {
    const titles: Record<CardElement, string[]> = {
      wisdom: [
        'The Sage',
        'Master of Knowledge',
        'The Enlightened',
        'Keeper of Secrets',
      ],
      creativity: [
        'The Visionary',
        'Master of Arts',
        'The Innovator',
        'Creator Supreme',
      ],
      charisma: [
        'The Influential',
        'Voice of Nations',
        'The Persuader',
        'Leader of Many',
      ],
      strategy: [
        'The Tactician',
        'Master Strategist',
        'The Planner',
        'Commander Supreme',
      ],
      nature: [
        'Force of Nature',
        'The Natural One',
        'Keeper of Balance',
        "Earth's Champion",
      ],
      spirit: [
        'The Transcendent',
        'Soul Keeper',
        'The Enlightened One',
        'Spirit Walker',
      ],
      tech: ['The Innovator', 'Digital Master', 'Tech Prodigy', 'The Engineer'],
      cosmic: [
        'Star Walker',
        'The Infinite',
        'Cosmic Entity',
        'Master of Space',
      ],
    }

    const elementTitles = titles[element]
    return elementTitles[Math.floor(Math.random() * elementTitles.length)]
  },

  /**
   * Generate flavor text for the card
   */
  generateFlavorText(agent: Agent, element: CardElement): string {
    // Use first sentence of instructions or generate generic text
    if (agent.instructions) {
      const firstSentence = agent.instructions.split(/[.!?]/)[0]
      if (firstSentence && firstSentence.length < 100) {
        return firstSentence.trim()
      }
    }

    const genericFlavor: Record<CardElement, string[]> = {
      wisdom: ['Knowledge is the ultimate power.', 'Wisdom guides the path.'],
      creativity: ['Creation knows no bounds.', 'Art shapes reality.'],
      charisma: ['Words move mountains.', 'Leadership inspires all.'],
      strategy: ['Victory through planning.', 'Every move calculated.'],
      nature: ['Nature always finds a way.', 'Balance in all things.'],
      spirit: ['The spirit transcends all.', 'Inner peace, outer strength.'],
      tech: ['Innovation drives progress.', 'Technology reshapes worlds.'],
      cosmic: ['The universe holds infinite secrets.', 'Beyond the stars.'],
    }

    const texts = genericFlavor[element]
    return texts[Math.floor(Math.random() * texts.length)]
  },

  /**
   * Main function to generate a complete agent card
   */
  async generateCard(
    agent: Agent,
    options?: {
      targetRarity?: CardRarity
      elementOverride?: CardElement
      generateArtwork?: boolean
      level?: number
    },
  ): Promise<AgentCard> {
    const element = options?.elementOverride || this.determineElement(agent)
    const rarity = options?.targetRarity || this.determineRarity(agent)
    const level = options?.level || 1

    const stats = this.generateStats(agent, rarity, level)
    const abilities = await this.generateAbilities(agent, element, rarity)

    let artworkUrl: string | undefined
    if (options?.generateArtwork !== false) {
      artworkUrl = await this.generateArtwork(agent, element, rarity)
    }

    const card: AgentCard = {
      id: uuid(),
      agentId: agent.id,
      name: agent.name,
      title: this.generateTitle(element),
      element,
      rarity,
      baseStats: { ...stats },
      currentStats: stats,
      abilities,
      artworkUrl,
      frameStyle: FRAME_STYLE_BY_RARITY[rarity],
      flavorText: this.generateFlavorText(agent, element),
      createdAt: new Date(),
      level,
      xp: 0,
    }

    return card
  },

  /**
   * Generate cards for multiple agents (for team setup)
   */
  async generateCards(
    agents: Agent[],
    options?: {
      generateArtwork?: boolean
    },
  ): Promise<AgentCard[]> {
    const cards: AgentCard[] = []

    for (const agent of agents) {
      const card = await this.generateCard(agent, {
        generateArtwork: options?.generateArtwork,
      })
      cards.push(card)
    }

    return cards
  },
}

export default cardGenerationService
