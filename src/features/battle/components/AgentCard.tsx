/**
 * AgentCard Component
 *
 * A collectible trading card displaying an AI agent with their
 * portrait, stats, abilities, and visual effects. Features animated
 * borders, holographic effects for rare cards, and battle-ready styling.
 */
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Tooltip, Chip, Progress } from '@heroui/react'

import { Icon } from '@/components/Icon'
import {
  AgentCard as AgentCardType,
  CardElement,
  CardRarity,
  CardAbility,
} from '../types'

// =============================================================================
// Element Colors & Icons
// =============================================================================

const ELEMENT_CONFIG: Record<
  CardElement,
  { color: string; bgGradient: string; icon: string; glowColor: string }
> = {
  wisdom: {
    color: 'text-blue-500',
    bgGradient: 'from-blue-600 via-blue-500 to-indigo-600',
    icon: 'BookOpen',
    glowColor: 'rgba(59, 130, 246, 0.5)',
  },
  creativity: {
    color: 'text-purple-500',
    bgGradient: 'from-purple-600 via-pink-500 to-purple-600',
    icon: 'Palette',
    glowColor: 'rgba(168, 85, 247, 0.5)',
  },
  charisma: {
    color: 'text-amber-500',
    bgGradient: 'from-amber-500 via-orange-500 to-amber-600',
    icon: 'Star',
    glowColor: 'rgba(245, 158, 11, 0.5)',
  },
  strategy: {
    color: 'text-emerald-500',
    bgGradient: 'from-emerald-600 via-teal-500 to-emerald-600',
    icon: 'Strategy',
    glowColor: 'rgba(16, 185, 129, 0.5)',
  },
  nature: {
    color: 'text-green-500',
    bgGradient: 'from-green-600 via-lime-500 to-green-600',
    icon: 'Leaf',
    glowColor: 'rgba(34, 197, 94, 0.5)',
  },
  spirit: {
    color: 'text-violet-500',
    bgGradient: 'from-violet-600 via-purple-500 to-indigo-600',
    icon: 'SparksSolid',
    glowColor: 'rgba(139, 92, 246, 0.5)',
  },
  tech: {
    color: 'text-cyan-500',
    bgGradient: 'from-cyan-600 via-sky-500 to-cyan-600',
    icon: 'Chip',
    glowColor: 'rgba(6, 182, 212, 0.5)',
  },
  cosmic: {
    color: 'text-indigo-500',
    bgGradient: 'from-indigo-600 via-purple-600 to-pink-600',
    icon: 'Globe',
    glowColor: 'rgba(99, 102, 241, 0.5)',
  },
}

const RARITY_CONFIG: Record<
  CardRarity,
  { border: string; label: string; shine: boolean; holographic: boolean }
> = {
  common: {
    border: 'border-gray-400',
    label: 'Common',
    shine: false,
    holographic: false,
  },
  uncommon: {
    border: 'border-green-500',
    label: 'Uncommon',
    shine: false,
    holographic: false,
  },
  rare: {
    border: 'border-blue-500',
    label: 'Rare',
    shine: true,
    holographic: false,
  },
  epic: {
    border: 'border-purple-500',
    label: 'Epic',
    shine: true,
    holographic: true,
  },
  legendary: {
    border: 'border-amber-500',
    label: 'Legendary',
    shine: true,
    holographic: true,
  },
}

// =============================================================================
// Sub-components
// =============================================================================

interface StatBarProps {
  label: string
  value: number
  maxValue: number
  color: string
  icon: string
}

const StatBar = ({ label, value, maxValue, color, icon }: StatBarProps) => (
  <div className="flex items-center gap-2">
    <Icon name={icon as any} className={`w-3 h-3 ${color}`} />
    <span className="text-[10px] font-medium text-default-600 w-8">
      {label}
    </span>
    <Progress
      size="sm"
      value={(value / maxValue) * 100}
      className="flex-1 h-1.5"
      classNames={{
        indicator: `bg-gradient-to-r ${color}`,
      }}
    />
    <span className="text-[10px] font-bold text-default-700 w-6 text-right">
      {value}
    </span>
  </div>
)

interface AbilitySlotProps {
  ability: CardAbility
  isDisabled?: boolean
  onClick?: () => void
}

const AbilitySlot = ({ ability, isDisabled, onClick }: AbilitySlotProps) => {
  const elementConfig = ELEMENT_CONFIG[ability.element]

  return (
    <Tooltip
      content={
        <div className="p-2 max-w-xs">
          <div className="font-bold text-sm">{ability.name}</div>
          <div className="text-xs text-default-500 mt-1">
            {ability.description}
          </div>
          <div className="flex gap-2 mt-2 text-xs">
            <span className="text-amber-500">⚡ {ability.cost}</span>
            <span className="text-red-500">💥 {ability.power}</span>
            {ability.cooldown > 0 && (
              <span className="text-blue-500">⏱ {ability.cooldown}</span>
            )}
          </div>
        </div>
      }
    >
      <motion.button
        onClick={onClick}
        disabled={isDisabled}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={`
          relative flex items-center gap-1.5 px-2 py-1 rounded-md
          bg-gradient-to-r ${elementConfig.bgGradient}
          text-white text-[10px] font-medium
          ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          transition-all duration-200
          hover:shadow-lg
        `}
        style={{
          boxShadow: isDisabled
            ? 'none'
            : `0 2px 8px ${elementConfig.glowColor}`,
        }}
      >
        <Icon name={elementConfig.icon as any} className="w-3 h-3" />
        <span className="truncate max-w-[60px]">{ability.name}</span>
        <span className="ml-auto text-amber-300">⚡{ability.cost}</span>
      </motion.button>
    </Tooltip>
  )
}

// =============================================================================
// Main Component
// =============================================================================

interface AgentCardProps {
  /** The card data to display */
  card: AgentCardType
  /** Whether the card is currently selected */
  isSelected?: boolean
  /** Whether to show full details or compact view */
  isCompact?: boolean
  /** Whether this card is in battle mode */
  isBattleMode?: boolean
  /** Current HP override (for battle state) */
  currentHp?: number
  /** Current energy override (for battle state) */
  currentEnergy?: number
  /** Callback when card is clicked */
  onClick?: () => void
  /** Callback when an ability is clicked */
  onAbilityClick?: (ability: CardAbility) => void
  /** Whether abilities are disabled */
  abilitiesDisabled?: boolean
  /** Animation state */
  animationState?: 'idle' | 'attack' | 'hurt' | 'victory' | 'knockout'
  /** Position for battle */
  position?: 'left' | 'right'
}

export const AgentCard = ({
  card,
  isSelected = false,
  isCompact = false,
  isBattleMode = false,
  currentHp,
  currentEnergy,
  onClick,
  onAbilityClick,
  abilitiesDisabled = false,
  animationState = 'idle',
  position = 'left',
}: AgentCardProps) => {
  const [isHovered, setIsHovered] = useState(false)

  const elementConfig = ELEMENT_CONFIG[card.element]
  const rarityConfig = RARITY_CONFIG[card.rarity]

  // Use battle state HP/energy if provided
  const displayHp = currentHp ?? card.currentStats.hp
  const displayEnergy = currentEnergy ?? card.currentStats.energy
  const hpPercent = (displayHp / card.currentStats.maxHp) * 100

  // Animation variants - use 'as const' for framer-motion typing
  const cardVariants = {
    idle: { x: 0, y: 0, rotate: 0 },
    attack: {
      x: position === 'left' ? 50 : -50,
      y: 0,
      rotate: position === 'left' ? 5 : -5,
      transition: { duration: 0.3, ease: 'easeOut' as const },
    },
    hurt: {
      x: position === 'left' ? -20 : 20,
      filter: 'brightness(1.5)',
      transition: { duration: 0.1, repeat: 3, repeatType: 'reverse' as const },
    },
    victory: {
      y: -20,
      scale: 1.05,
      transition: {
        duration: 0.5,
        repeat: Infinity,
        repeatType: 'reverse' as const,
      },
    },
    knockout: {
      rotate: 90,
      opacity: 0.5,
      y: 50,
      transition: { duration: 0.8 },
    },
  }

  const cardSize = isCompact ? 'w-36 h-52' : 'w-64 h-96'

  return (
    <motion.div
      variants={cardVariants}
      animate={animationState}
      initial="idle"
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      whileHover={!isBattleMode ? { scale: 1.02, y: -5 } : undefined}
      className={`
        relative ${cardSize}
        rounded-xl overflow-hidden
        cursor-pointer select-none
        transition-all duration-300
        ${isSelected ? 'ring-4 ring-primary ring-offset-2' : ''}
      `}
      style={{
        perspective: '1000px',
      }}
    >
      {/* Card Background with Element Gradient */}
      <div
        className={`
          absolute inset-0 bg-gradient-to-br ${elementConfig.bgGradient}
          opacity-90
        `}
      />

      {/* Holographic Effect for Epic/Legendary */}
      {rarityConfig.holographic && (
        <motion.div
          className="absolute inset-0 pointer-events-none z-10"
          animate={{
            background: [
              'linear-gradient(45deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.3) 50%, rgba(255,255,255,0) 100%)',
              'linear-gradient(45deg, rgba(255,255,255,0) 100%, rgba(255,255,255,0.3) 150%, rgba(255,255,255,0) 200%)',
            ],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'linear',
          }}
          style={{
            backgroundSize: '200% 200%',
          }}
        />
      )}

      {/* Card Frame */}
      <div
        className={`
          absolute inset-1 rounded-lg
          bg-gradient-to-b from-gray-900/90 via-gray-800/95 to-gray-900/90
          border-2 ${rarityConfig.border}
          ${rarityConfig.shine ? 'shadow-inner' : ''}
        `}
      >
        {/* Card Header */}
        <div className="relative p-2">
          {/* Name & Level */}
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <h3
                className={`
                  font-bold truncate
                  ${isCompact ? 'text-xs' : 'text-sm'}
                  text-white
                `}
              >
                {card.name}
              </h3>
              {!isCompact && (
                <p className="text-[10px] text-gray-400 truncate">
                  {card.title}
                </p>
              )}
            </div>
            <div className="flex items-center gap-1 ml-2">
              <Chip
                size="sm"
                variant="flat"
                className={`
                  ${elementConfig.color} bg-black/30
                  ${isCompact ? 'text-[8px] h-4 min-w-0 px-1' : 'text-[10px]'}
                `}
              >
                <Icon name={elementConfig.icon as any} className="w-3 h-3" />
              </Chip>
              <span
                className={`
                  font-bold text-amber-400
                  ${isCompact ? 'text-[10px]' : 'text-xs'}
                `}
              >
                Lv.{card.level}
              </span>
            </div>
          </div>

          {/* HP Bar */}
          <div className="mt-1.5">
            <div className="flex justify-between text-[10px] mb-0.5">
              <span className="text-red-400 font-medium">HP</span>
              <span className="text-gray-300">
                {displayHp}/{card.currentStats.maxHp}
              </span>
            </div>
            <div className="h-2 bg-black/50 rounded-full overflow-hidden">
              <motion.div
                className={`
                  h-full rounded-full
                  ${hpPercent > 50 ? 'bg-gradient-to-r from-green-500 to-emerald-400' : ''}
                  ${hpPercent > 25 && hpPercent <= 50 ? 'bg-gradient-to-r from-yellow-500 to-amber-400' : ''}
                  ${hpPercent <= 25 ? 'bg-gradient-to-r from-red-500 to-rose-400' : ''}
                `}
                initial={{ width: 0 }}
                animate={{ width: `${hpPercent}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
            </div>
          </div>
        </div>

        {/* Card Artwork */}
        <div
          className={`
            relative mx-2
            ${isCompact ? 'h-20' : 'h-36'}
            rounded-lg overflow-hidden
            bg-black/30
            border border-white/10
          `}
        >
          {card.artworkUrl ? (
            <img
              src={card.artworkUrl}
              alt={card.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Icon
                name={elementConfig.icon as any}
                className={`${isCompact ? 'w-12 h-12' : 'w-20 h-20'} ${elementConfig.color} opacity-50`}
              />
            </div>
          )}

          {/* Rarity Badge */}
          <div className="absolute top-1 right-1">
            <Chip
              size="sm"
              className={`
                text-[8px] h-4 px-1.5
                bg-black/60 backdrop-blur-sm
                ${rarityConfig.border.replace('border-', 'text-')}
              `}
            >
              {rarityConfig.label}
            </Chip>
          </div>
        </div>

        {/* Stats Section */}
        {!isCompact && (
          <div className="px-2 py-1.5 space-y-1">
            <StatBar
              label="ATK"
              value={card.currentStats.attack}
              maxValue={100}
              color="from-red-500 to-orange-500"
              icon="Lightning"
            />
            <StatBar
              label="DEF"
              value={card.currentStats.defense}
              maxValue={100}
              color="from-blue-500 to-cyan-500"
              icon="Shield"
            />
            <StatBar
              label="SPD"
              value={card.currentStats.speed}
              maxValue={100}
              color="from-green-500 to-emerald-500"
              icon="Bolt"
            />
          </div>
        )}

        {/* Energy Bar */}
        <div className="px-2 mt-1">
          <div className="flex gap-0.5">
            {Array.from({ length: card.currentStats.maxEnergy }).map((_, i) => (
              <motion.div
                key={i}
                className={`
                  flex-1 h-2 rounded-sm
                  ${
                    i < displayEnergy
                      ? 'bg-gradient-to-t from-amber-500 to-yellow-400'
                      : 'bg-gray-700'
                  }
                `}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: i * 0.1 }}
              />
            ))}
          </div>
          <div className="text-[8px] text-amber-400 text-center mt-0.5">
            ⚡ {displayEnergy}/{card.currentStats.maxEnergy}
          </div>
        </div>

        {/* Abilities Section */}
        {!isCompact && (
          <div className="px-2 py-1.5 space-y-1">
            {card.abilities.slice(0, 3).map((ability) => (
              <AbilitySlot
                key={ability.id}
                ability={ability}
                isDisabled={abilitiesDisabled || ability.cost > displayEnergy}
                onClick={() => onAbilityClick?.(ability)}
              />
            ))}
          </div>
        )}

        {/* Flavor Text (only if not battle mode) */}
        {!isCompact && !isBattleMode && card.flavorText && (
          <div className="absolute bottom-1 left-2 right-2">
            <p className="text-[8px] text-gray-500 italic text-center line-clamp-2">
              "{card.flavorText}"
            </p>
          </div>
        )}
      </div>

      {/* Glow Effect on Hover */}
      <AnimatePresence>
        {isHovered && !isBattleMode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 pointer-events-none"
            style={{
              boxShadow: `0 0 30px 10px ${elementConfig.glowColor}`,
            }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// =============================================================================
// Card Back Component
// =============================================================================

interface CardBackProps {
  size?: 'compact' | 'full'
  onClick?: () => void
}

export const CardBack = ({ size = 'full', onClick }: CardBackProps) => {
  const cardSize = size === 'compact' ? 'w-36 h-52' : 'w-64 h-96'

  return (
    <motion.div
      onClick={onClick}
      whileHover={{ scale: 1.02, y: -5 }}
      className={`
        relative ${cardSize}
        rounded-xl overflow-hidden
        cursor-pointer select-none
        bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-900
        border-2 border-amber-500/50
      `}
    >
      {/* Pattern */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      {/* Center Logo */}
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
        >
          <Icon name="SparksSolid" className="w-16 h-16 text-amber-500/50" />
        </motion.div>
      </div>

      {/* DEVS Text */}
      <div className="absolute bottom-4 left-0 right-0 text-center">
        <span className="text-lg font-bold text-amber-500/70 tracking-widest">
          DEVS
        </span>
      </div>
    </motion.div>
  )
}

export default AgentCard
