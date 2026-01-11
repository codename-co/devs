/**
 * CardBattleField Component
 *
 * The main battle arena where trading card battles take place.
 * Features animated card combat, visual effects, HP bars, energy management,
 * and dramatic attack animations.
 */
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button, Chip } from '@heroui/react'

import { Icon } from '@/components/Icon'
import { useI18n } from '@/i18n'
import { battleI18n } from '../i18n'
import { AgentCard as AgentCardComponent } from './AgentCard'
import {
  CardAbility,
  BattleTurn,
  BattleCardState,
  BattleActionResult,
  BattleVisualEffect,
  BattleAnnouncement,
  CardElement,
} from '../types'

// =============================================================================
// Constants
// =============================================================================

const ELEMENT_COLORS: Record<CardElement, string> = {
  wisdom: '#3b82f6',
  creativity: '#a855f7',
  charisma: '#f59e0b',
  strategy: '#10b981',
  nature: '#22c55e',
  spirit: '#8b5cf6',
  tech: '#06b6d4',
  cosmic: '#6366f1',
}

// =============================================================================
// Sub-components
// =============================================================================

interface BattleAnnouncementDisplayProps {
  announcement?: BattleAnnouncement | null
}

const BattleAnnouncementDisplay = ({
  announcement,
}: BattleAnnouncementDisplayProps) => {
  if (!announcement) return null

  const styleClasses: Record<BattleAnnouncement['style'], string> = {
    normal: 'bg-default-800 text-white',
    critical: 'bg-gradient-to-r from-red-600 to-orange-500 text-white',
    knockout: 'bg-gradient-to-r from-purple-600 to-red-600 text-white',
    victory: 'bg-gradient-to-r from-amber-500 to-yellow-400 text-black',
    super_effective:
      'bg-gradient-to-r from-green-500 to-emerald-400 text-white',
  }

  // Get animation props based on type - use 'as const' for proper types
  const getAnimationProps = () => {
    switch (announcement.animation) {
      case 'bounce':
        return {
          initial: { scale: 0, opacity: 0 },
          animate: { scale: 1, opacity: 1 },
          exit: { scale: 0, opacity: 0 },
          transition: { type: 'spring' as const, damping: 15 },
        }
      case 'shake':
        return {
          initial: { x: -50, opacity: 0 },
          animate: { x: 0, opacity: 1 },
          exit: { x: 50, opacity: 0 },
          transition: { duration: 0.5 },
        }
      case 'slide':
        return {
          initial: { y: -50, opacity: 0 },
          animate: { y: 0, opacity: 1 },
          exit: { y: 50, opacity: 0 },
        }
      default:
        return {
          initial: { opacity: 0 },
          animate: { opacity: 1 },
          exit: { opacity: 0 },
        }
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        className="absolute inset-x-0 top-1/3 z-50 flex justify-center"
        {...getAnimationProps()}
      >
        <div
          className={`
            px-8 py-4 rounded-xl
            ${styleClasses[announcement.style]}
            text-2xl md:text-4xl font-bold
            shadow-2xl
            border-2 border-white/20
          `}
        >
          {announcement.text}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

interface DamageNumberProps {
  value: number
  isCritical: boolean
  isHealing: boolean
  position: 'left' | 'right'
}

const DamageNumber = ({
  value,
  isCritical,
  isHealing,
  position,
}: DamageNumberProps) => (
  <motion.div
    className={`
      absolute z-40
      ${position === 'left' ? 'left-1/4' : 'right-1/4'}
      top-1/3
      text-4xl md:text-6xl font-black
      ${isHealing ? 'text-green-400' : isCritical ? 'text-yellow-400' : 'text-red-500'}
      drop-shadow-lg
    `}
    initial={{ y: 0, opacity: 1, scale: 1 }}
    animate={{
      y: -100,
      opacity: 0,
      scale: isCritical ? 1.5 : 1,
    }}
    transition={{ duration: 1, ease: 'easeOut' }}
  >
    {isHealing ? '+' : '-'}
    {value}
    {isCritical && <span className="block text-lg text-center">CRITICAL!</span>}
  </motion.div>
)

interface EffectAnimationProps {
  effect: BattleVisualEffect
}

const EffectAnimation = ({ effect }: EffectAnimationProps) => {
  const getEffectStyles = () => {
    switch (effect.type) {
      case 'damage_flash':
        return {
          className: 'bg-red-500/30',
          animation: {
            opacity: [0, 1, 0],
            transition: { duration: effect.duration / 1000 },
          },
        }
      case 'heal_glow':
        return {
          className: 'bg-green-500/30',
          animation: {
            opacity: [0, 0.5, 0],
            scale: [1, 1.1, 1],
            transition: { duration: effect.duration / 1000 },
          },
        }
      case 'critical_explosion':
        return {
          className: 'bg-yellow-500/40',
          animation: {
            opacity: [0, 1, 0],
            scale: [0.5, 2, 2.5],
            transition: { duration: effect.duration / 1000 },
          },
        }
      case 'shield_pulse':
        return {
          className: 'border-4 border-blue-400',
          animation: {
            opacity: [0, 1, 0],
            scale: [1, 1.2, 1],
            borderWidth: ['4px', '8px', '4px'],
            transition: { duration: effect.duration / 1000 },
          },
        }
      default:
        return {
          className: 'bg-white/20',
          animation: { opacity: [0, 1, 0] },
        }
    }
  }

  const { className, animation } = getEffectStyles()

  const positionClasses = {
    left: 'left-0 w-1/2',
    right: 'right-0 w-1/2',
    center: 'left-1/4 right-1/4',
    both: 'inset-0',
  }

  return (
    <motion.div
      className={`
        absolute ${positionClasses[effect.target]} inset-y-0
        ${className}
        rounded-xl
        pointer-events-none
        z-30
      `}
      animate={animation}
    />
  )
}

interface AbilityAnimationProps {
  ability: CardAbility
  from: 'left' | 'right'
  isActive: boolean
}

const AbilityAnimation = ({
  ability,
  from,
  isActive,
}: AbilityAnimationProps) => {
  if (!isActive) return null

  const color = ELEMENT_COLORS[ability.element]

  const animations: Record<string, any> = {
    beam: {
      initial: { scaleX: 0, opacity: 0 },
      animate: {
        scaleX: 1,
        opacity: [0, 1, 1, 0],
        transition: { duration: 0.5, times: [0, 0.2, 0.8, 1] },
      },
    },
    slash: {
      initial: { rotate: from === 'left' ? -45 : 45, scale: 0, opacity: 0 },
      animate: {
        scale: [0, 1.5, 0],
        opacity: [0, 1, 0],
        transition: { duration: 0.4 },
      },
    },
    explosion: {
      initial: { scale: 0, opacity: 0 },
      animate: {
        scale: [0, 2, 3],
        opacity: [0, 1, 0],
        transition: { duration: 0.6 },
      },
    },
    wave: {
      initial: { scale: 0.5, opacity: 0, x: from === 'left' ? -100 : 100 },
      animate: {
        scale: [0.5, 1.5, 2],
        opacity: [0, 1, 0],
        x: from === 'left' ? [0, 50, 150] : [0, -50, -150],
        transition: { duration: 0.6 },
      },
    },
    vortex: {
      initial: { rotate: 0, scale: 0, opacity: 0 },
      animate: {
        rotate: 720,
        scale: [0, 1.5, 0],
        opacity: [0, 1, 0],
        transition: { duration: 0.8 },
      },
    },
    lightning: {
      initial: { opacity: 0, y: -100 },
      animate: {
        opacity: [0, 1, 1, 0],
        y: [-100, 0, 0, 0],
        transition: { duration: 0.3, times: [0, 0.2, 0.8, 1] },
      },
    },
    heal_glow: {
      initial: { scale: 0.8, opacity: 0 },
      animate: {
        scale: [0.8, 1.2, 1],
        opacity: [0, 0.8, 0],
        transition: { duration: 0.8 },
      },
    },
    shield_dome: {
      initial: { scale: 0, opacity: 0 },
      animate: {
        scale: [0, 1, 1.1, 1],
        opacity: [0, 0.8, 0.6, 0],
        transition: { duration: 1 },
      },
    },
    particle_swarm: {
      initial: { opacity: 0 },
      animate: {
        opacity: [0, 1, 0],
        transition: { duration: 1, staggerChildren: 0.1 },
      },
    },
    cosmic_rift: {
      initial: { scaleY: 0, opacity: 0 },
      animate: {
        scaleY: [0, 1, 1, 0],
        opacity: [0, 1, 1, 0],
        transition: { duration: 0.8 },
      },
    },
    fire_burst: {
      initial: { scale: 0, opacity: 0 },
      animate: {
        scale: [0, 1.5, 2],
        opacity: [0, 1, 0],
        transition: { duration: 0.5 },
      },
    },
    ice_shards: {
      initial: { scale: 0, rotate: 0, opacity: 0 },
      animate: {
        scale: [0, 1, 1.5],
        rotate: [0, 15, -15],
        opacity: [0, 1, 0],
        transition: { duration: 0.6 },
      },
    },
  }

  const anim = animations[ability.animation] || animations.beam

  return (
    <motion.div
      className={`
        absolute inset-0 z-30
        flex items-center justify-center
        pointer-events-none
      `}
    >
      <motion.div
        className="w-64 h-64"
        style={{
          background: `radial-gradient(circle, ${color}88 0%, ${color}00 70%)`,
          filter: `drop-shadow(0 0 20px ${color})`,
        }}
        {...anim}
      />
    </motion.div>
  )
}

// =============================================================================
// Main Component
// =============================================================================

interface CardBattleFieldProps {
  /** Left side card state */
  leftCard: BattleCardState
  /** Right side card state */
  rightCard: BattleCardState
  /** Current turn number */
  currentTurn: number
  /** Maximum turns */
  maxTurns: number
  /** Whose turn is it */
  activeCardId: string
  /** Is the battle running automatically */
  isAutoPlay: boolean
  /** Battle history */
  turns: BattleTurn[]
  /** Callback when an ability is used */
  onAbilityUse?: (cardId: string, ability: CardAbility) => void
  /** Callback when defend is chosen */
  onDefend?: (cardId: string) => void
  /** Callback when charge is chosen */
  onCharge?: (cardId: string) => void
  /** Callback to toggle auto-play */
  onToggleAutoPlay?: () => void
  /** Is this player's turn (for interactive battles) */
  isPlayerTurn?: boolean
  /** Current announcement to display */
  announcement?: BattleAnnouncement | null
  /** Active visual effect */
  activeEffect?: BattleVisualEffect | null
  /** Recent action result for damage numbers */
  lastActionResult?: BattleActionResult | null
  /** Active ability animation */
  activeAbility?: { ability: CardAbility; from: 'left' | 'right' } | null
}

export const CardBattleField = ({
  leftCard,
  rightCard,
  currentTurn,
  maxTurns,
  activeCardId,
  isAutoPlay,
  turns,
  onAbilityUse,
  onDefend,
  onCharge,
  onToggleAutoPlay,
  isPlayerTurn,
  announcement,
  activeEffect,
  lastActionResult,
  activeAbility,
}: CardBattleFieldProps) => {
  const { t } = useI18n(battleI18n)
  const [showDamageNumber, setShowDamageNumber] = useState(false)
  const [screenShake, setScreenShake] = useState(false)

  // Trigger screen shake on damage
  useEffect(() => {
    if (lastActionResult?.damage && lastActionResult.damage > 0) {
      setScreenShake(true)
      setShowDamageNumber(true)

      const shakeTimer = setTimeout(() => setScreenShake(false), 200)
      const damageTimer = setTimeout(() => setShowDamageNumber(false), 1000)

      return () => {
        clearTimeout(shakeTimer)
        clearTimeout(damageTimer)
      }
    }
  }, [lastActionResult])

  const isLeftActive = activeCardId === leftCard.card.id
  const isRightActive = activeCardId === rightCard.card.id

  // Get animation state for cards
  const getCardAnimation = (
    cardState: BattleCardState,
    isActive: boolean,
  ): 'idle' | 'attack' | 'hurt' | 'victory' | 'knockout' => {
    if (cardState.isKnockedOut) return 'knockout'
    if (lastActionResult?.knockedOutCardId === cardState.card.id) return 'hurt'
    if (activeAbility && isActive) return 'attack'
    if (lastActionResult && !isActive && lastActionResult.damage) return 'hurt'
    return 'idle'
  }

  return (
    <motion.div
      className={`
        relative w-full h-[600px] md:h-[700px]
        bg-gradient-to-b from-indigo-950 via-purple-950 to-gray-950
        rounded-2xl overflow-hidden
        border-2 border-purple-500/30
      `}
      animate={screenShake ? { x: [-5, 5, -5, 5, 0] } : {}}
      transition={{ duration: 0.2 }}
    >
      {/* Background Effects */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_rgba(147,51,234,0.3),_transparent_70%)]" />
        <motion.div
          className="absolute inset-0"
          animate={{
            backgroundPosition: ['0% 0%', '100% 100%'],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            repeatType: 'reverse',
          }}
          style={{
            backgroundImage:
              'url("data:image/svg+xml,%3Csvg width="20" height="20" xmlns="http://www.w3.org/2000/svg"%3E%3Ccircle cx="1" cy="1" r="1" fill="%23fff" fill-opacity="0.3"/%3E%3C/svg%3E")',
          }}
        />
      </div>

      {/* Turn Indicator */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20">
        <div className="flex items-center gap-4">
          <Chip
            variant="flat"
            className="bg-black/50 backdrop-blur-sm text-white"
          >
            {t('Turn')} {currentTurn}/{maxTurns}
          </Chip>
          <Button
            size="sm"
            variant={isAutoPlay ? 'solid' : 'bordered'}
            color={isAutoPlay ? 'primary' : 'default'}
            onPress={onToggleAutoPlay}
            startContent={
              <Icon name={isAutoPlay ? 'Pause' : 'Play'} className="w-4 h-4" />
            }
          >
            {isAutoPlay ? t('Pause') : t('Auto')}
          </Button>
        </div>
      </div>

      {/* VS Badge */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
        <motion.div
          className="text-4xl md:text-6xl font-black text-amber-400/80"
          animate={{
            scale: [1, 1.1, 1],
            textShadow: [
              '0 0 10px rgba(251,191,36,0.5)',
              '0 0 30px rgba(251,191,36,0.8)',
              '0 0 10px rgba(251,191,36,0.5)',
            ],
          }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          VS
        </motion.div>
      </div>

      {/* Left Card (Player) */}
      <div
        className={`
          absolute left-4 md:left-12 top-1/2 -translate-y-1/2
          ${isLeftActive ? 'z-20' : 'z-10'}
        `}
      >
        <motion.div
          animate={{
            y: isLeftActive ? -10 : 0,
            scale: isLeftActive ? 1.05 : 1,
          }}
        >
          <AgentCardComponent
            card={leftCard.card}
            isBattleMode
            currentHp={leftCard.currentHp}
            currentEnergy={leftCard.currentEnergy}
            animationState={getCardAnimation(leftCard, isLeftActive)}
            position="left"
            onAbilityClick={(ability) =>
              isPlayerTurn &&
              isLeftActive &&
              onAbilityUse?.(leftCard.card.id, ability)
            }
            abilitiesDisabled={!isPlayerTurn || !isLeftActive || isAutoPlay}
          />
        </motion.div>

        {/* Action Buttons (only show on player's turn) */}
        {isPlayerTurn && isLeftActive && !isAutoPlay && (
          <motion.div
            className="flex gap-2 mt-4 justify-center"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Button
              size="sm"
              variant="flat"
              color="primary"
              onPress={() => onDefend?.(leftCard.card.id)}
              startContent={<Icon name="Lock" className="w-4 h-4" />}
            >
              {t('Defend')}
            </Button>
            <Button
              size="sm"
              variant="flat"
              color="warning"
              onPress={() => onCharge?.(leftCard.card.id)}
              startContent={<Icon name="Sparks" className="w-4 h-4" />}
            >
              {t('Charge')}
            </Button>
          </motion.div>
        )}

        {/* Active Turn Indicator */}
        {isLeftActive && (
          <motion.div
            className="absolute -top-8 left-1/2 -translate-x-1/2"
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 1, repeat: Infinity }}
          >
            <Icon name="NavArrowDown" className="w-8 h-8 text-amber-400" />
          </motion.div>
        )}
      </div>

      {/* Right Card (Opponent) */}
      <div
        className={`
          absolute right-4 md:right-12 top-1/2 -translate-y-1/2
          ${isRightActive ? 'z-20' : 'z-10'}
        `}
      >
        <motion.div
          animate={{
            y: isRightActive ? -10 : 0,
            scale: isRightActive ? 1.05 : 1,
          }}
        >
          <AgentCardComponent
            card={rightCard.card}
            isBattleMode
            currentHp={rightCard.currentHp}
            currentEnergy={rightCard.currentEnergy}
            animationState={getCardAnimation(rightCard, isRightActive)}
            position="right"
            abilitiesDisabled
          />
        </motion.div>

        {/* Active Turn Indicator */}
        {isRightActive && (
          <motion.div
            className="absolute -top-8 left-1/2 -translate-x-1/2"
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 1, repeat: Infinity }}
          >
            <Icon name="NavArrowDown" className="w-8 h-8 text-amber-400" />
          </motion.div>
        )}
      </div>

      {/* Ability Animation */}
      {activeAbility && (
        <AbilityAnimation
          ability={activeAbility.ability}
          from={activeAbility.from}
          isActive
        />
      )}

      {/* Visual Effects */}
      {activeEffect && <EffectAnimation effect={activeEffect} />}

      {/* Damage Numbers */}
      {showDamageNumber && lastActionResult?.damage && (
        <DamageNumber
          value={lastActionResult.damage}
          isCritical={lastActionResult.isCritical || false}
          isHealing={false}
          position={
            lastActionResult.action.targetCardId === leftCard.card.id
              ? 'left'
              : 'right'
          }
        />
      )}
      {showDamageNumber && lastActionResult?.healing && (
        <DamageNumber
          value={lastActionResult.healing}
          isCritical={false}
          isHealing
          position={
            lastActionResult.action.sourceCardId === leftCard.card.id
              ? 'left'
              : 'right'
          }
        />
      )}

      {/* Announcement Overlay */}
      <BattleAnnouncementDisplay announcement={announcement} />

      {/* Battle Log (bottom) */}
      <div className="absolute bottom-4 left-4 right-4 z-20">
        <div className="bg-black/60 backdrop-blur-sm rounded-lg p-3 max-h-32 overflow-y-auto">
          <h4 className="text-xs font-semibold text-default-400 mb-2">
            {t('Battle Log')}
          </h4>
          <div className="space-y-1">
            {turns.slice(-5).map((turn, index) => (
              <div
                key={index}
                className="text-xs text-default-300 flex items-center gap-2"
              >
                <span className="text-default-500">
                  {t('Turn')} {turn.turnNumber}:
                </span>
                <span>{turn.commentary || 'Action taken'}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Element Effectiveness Indicator */}
      {lastActionResult?.effectiveness && (
        <motion.div
          className="absolute top-20 left-1/2 -translate-x-1/2 z-30"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
        >
          <Chip
            color={
              lastActionResult.effectiveness === 'super_effective'
                ? 'success'
                : lastActionResult.effectiveness === 'not_effective'
                  ? 'danger'
                  : 'default'
            }
            variant="solid"
          >
            {lastActionResult.effectiveness === 'super_effective' &&
              t('Super Effective!')}
            {lastActionResult.effectiveness === 'not_effective' &&
              t('Not Very Effective...')}
          </Chip>
        </motion.div>
      )}
    </motion.div>
  )
}

export default CardBattleField
