/**
 * CardCarousel Component
 *
 * A visually stunning 3D carousel for selecting agent battle cards.
 * Features a horizontal "roulette" style with perspective effects,
 * smooth animations, and gamified interactions.
 */
import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { motion, AnimatePresence, useAnimation } from 'framer-motion'
import { Button, Spinner, Chip } from '@heroui/react'

import { Icon } from '@/components/Icon'
import { useAllAgents } from '@/hooks'
import { type Agent } from '@/types'
import { type LanguageCode } from '@/i18n/locales'
import { useI18n } from '@/i18n'
import { cardGenerationService } from '../services/cardGenerationService'
import { type AgentCard } from '../types'
import { AgentCard as AgentCardComponent, CardBack } from './AgentCard'
import { battleI18n } from '../i18n'

// =============================================================================
// Types
// =============================================================================

interface CardCarouselProps {
  onBattleStart: (playerCard: AgentCard, opponentCard: AgentCard) => void
  onCancel?: () => void
}

interface CardSlot {
  agent: Agent | null
  card: AgentCard | null
  isGenerating: boolean
  error: string | null
}

// =============================================================================
// Constants
// =============================================================================

const CARD_SPACING = 60 // Space between card centers when fanned
const VISIBLE_CARDS = 7 // Number of cards visible in the carousel
const CENTER_SCALE = 1.15 // Scale of the center card
const EDGE_SCALE = 0.7 // Scale of edge cards
const EDGE_OPACITY = 0.5 // Opacity of edge cards
const ROTATION_ANGLE = 8 // Rotation angle for side cards in degrees

// =============================================================================
// Component
// =============================================================================

export const CardCarousel = ({
  onBattleStart,
  onCancel,
}: CardCarouselProps) => {
  const { t, lang } = useI18n(battleI18n)
  const agents = useAllAgents()

  // Filter available agents
  const availableAgents = useMemo(
    () => agents.filter((agent) => !agent.deletedAt),
    [agents],
  )

  // Carousel state
  const [selectedIndex, setSelectedIndex] = useState(
    Math.floor(availableAgents.length / 2),
  )
  const [isDragging, setIsDragging] = useState(false)
  const dragStartX = useRef(0)
  const dragStartIndex = useRef(0)

  // Card selection states (player = left, opponent = right)
  const [playerSlot, setPlayerSlot] = useState<CardSlot>({
    agent: null,
    card: null,
    isGenerating: false,
    error: null,
  })
  const [opponentSlot, setOpponentSlot] = useState<CardSlot>({
    agent: null,
    card: null,
    isGenerating: false,
    error: null,
  })

  // Which slot is being selected
  const [activeSelection, setActiveSelection] = useState<
    'player' | 'opponent' | null
  >('player')

  // Animation controls for particle effects
  const particleControls = useAnimation()

  // Get agent display name
  const getAgentDisplayName = useCallback(
    (agent: Agent) => agent.i18n?.[lang as LanguageCode]?.name || agent.name,
    [lang],
  )

  // Navigate carousel
  const navigateCarousel = useCallback(
    (direction: 'left' | 'right') => {
      setSelectedIndex((prev) => {
        if (direction === 'left') {
          return prev > 0 ? prev - 1 : availableAgents.length - 1
        } else {
          return prev < availableAgents.length - 1 ? prev + 1 : 0
        }
      })
    },
    [availableAgents.length],
  )

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (activeSelection === null) return

      if (e.key === 'ArrowLeft') {
        navigateCarousel('left')
      } else if (e.key === 'ArrowRight') {
        navigateCarousel('right')
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        handleSelectCard()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeSelection, navigateCarousel, selectedIndex])

  // Handle drag start
  const handleDragStart = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (activeSelection === null) return
      setIsDragging(true)
      dragStartX.current = 'touches' in e ? e.touches[0].clientX : e.clientX
      dragStartIndex.current = selectedIndex
    },
    [activeSelection, selectedIndex],
  )

  // Handle drag move
  const handleDragMove = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (!isDragging || activeSelection === null) return

      const currentX = 'touches' in e ? e.touches[0].clientX : e.clientX
      const deltaX = currentX - dragStartX.current
      const indexDelta = Math.round(-deltaX / CARD_SPACING)

      let newIndex = dragStartIndex.current + indexDelta
      // Clamp to valid range
      newIndex = Math.max(0, Math.min(availableAgents.length - 1, newIndex))
      setSelectedIndex(newIndex)
    },
    [isDragging, activeSelection, availableAgents.length],
  )

  // Handle drag end
  const handleDragEnd = useCallback(() => {
    setIsDragging(false)
  }, [])

  // Generate card from agent
  const generateCard = useCallback(
    async (agent: Agent, slot: 'player' | 'opponent') => {
      const setSlot = slot === 'player' ? setPlayerSlot : setOpponentSlot

      setSlot({
        agent,
        card: null,
        isGenerating: true,
        error: null,
      })

      // Trigger particle animation
      particleControls.start({
        scale: [1, 1.5, 0],
        opacity: [1, 0.8, 0],
        transition: { duration: 1.5 },
      })

      try {
        const card = await cardGenerationService.generateCard(agent, {
          generateArtwork: true,
        })

        setSlot({
          agent,
          card,
          isGenerating: false,
          error: null,
        })

        // Move to next selection phase
        if (slot === 'player') {
          setActiveSelection('opponent')
          setSelectedIndex(Math.floor(availableAgents.length / 2))
        } else {
          setActiveSelection(null)
        }
      } catch (error) {
        console.error('Failed to generate card:', error)
        setSlot({
          agent,
          card: null,
          isGenerating: false,
          error:
            error instanceof Error ? error.message : 'Failed to generate card',
        })
      }
    },
    [availableAgents.length, particleControls],
  )

  // Handle card selection
  const handleSelectCard = useCallback(() => {
    if (activeSelection === null) return

    const selectedAgent = availableAgents[selectedIndex]
    if (!selectedAgent) return

    // Don't allow selecting same agent for both slots
    if (
      activeSelection === 'opponent' &&
      playerSlot.agent?.id === selectedAgent.id
    ) {
      return
    }

    generateCard(selectedAgent, activeSelection)
  }, [
    activeSelection,
    availableAgents,
    selectedIndex,
    playerSlot.agent,
    generateCard,
  ])

  // Handle clicking directly on a card
  const handleCardClick = useCallback(
    (index: number) => {
      if (activeSelection === null) return

      if (index === selectedIndex) {
        handleSelectCard()
      } else {
        setSelectedIndex(index)
      }
    },
    [activeSelection, selectedIndex, handleSelectCard],
  )

  // Reset slot
  const handleResetSlot = useCallback((slot: 'player' | 'opponent') => {
    if (slot === 'player') {
      setPlayerSlot({
        agent: null,
        card: null,
        isGenerating: false,
        error: null,
      })
      setActiveSelection('player')
    } else {
      setOpponentSlot({
        agent: null,
        card: null,
        isGenerating: false,
        error: null,
      })
      setActiveSelection('opponent')
    }
  }, [])

  // Random selection
  const handleRandomSelect = useCallback(() => {
    if (activeSelection === null) return

    const eligibleAgents = availableAgents.filter(
      (agent) =>
        activeSelection === 'player' || agent.id !== playerSlot.agent?.id,
    )

    if (eligibleAgents.length === 0) return

    const randomIndex = Math.floor(Math.random() * eligibleAgents.length)
    const randomAgent = eligibleAgents[randomIndex]
    const agentIndex = availableAgents.findIndex((a) => a.id === randomAgent.id)

    setSelectedIndex(agentIndex)
    setTimeout(() => generateCard(randomAgent, activeSelection), 300)
  }, [activeSelection, availableAgents, playerSlot.agent, generateCard])

  // Start battle
  const canStartBattle = playerSlot.card && opponentSlot.card

  const handleStartBattle = useCallback(() => {
    if (playerSlot.card && opponentSlot.card) {
      onBattleStart(playerSlot.card, opponentSlot.card)
    }
  }, [playerSlot.card, opponentSlot.card, onBattleStart])

  // Calculate card position and style
  const getCardStyle = useCallback(
    (index: number) => {
      const offset = index - selectedIndex
      const absOffset = Math.abs(offset)

      // Position calculation - fan out from center
      const x = offset * CARD_SPACING

      // Scale calculation - larger in center
      const scale =
        absOffset === 0
          ? CENTER_SCALE
          : Math.max(EDGE_SCALE, CENTER_SCALE - absOffset * 0.1)

      // Rotation - tilt cards away from center
      const rotateY = offset * ROTATION_ANGLE

      // Z position - center card is closest
      const z = absOffset === 0 ? 100 : 100 - absOffset * 30

      // Opacity - fade edges
      const opacity =
        absOffset === 0 ? 1 : Math.max(EDGE_OPACITY, 1 - absOffset * 0.15)

      // Filter - blur distant cards
      const blur = absOffset > 2 ? `blur(${(absOffset - 2) * 2}px)` : 'none'

      return {
        x,
        scale,
        rotateY,
        z,
        opacity,
        filter: blur,
      }
    },
    [selectedIndex],
  )

  // Get visible cards range
  const visibleRange = useMemo(() => {
    const halfVisible = Math.floor(VISIBLE_CARDS / 2)
    const start = Math.max(0, selectedIndex - halfVisible - 2)
    const end = Math.min(
      availableAgents.length - 1,
      selectedIndex + halfVisible + 2,
    )
    return { start, end }
  }, [selectedIndex, availableAgents.length])

  // Get excluded agent (already selected)
  const excludedAgentId =
    activeSelection === 'opponent' ? playerSlot.agent?.id : null

  return (
    <div className="flex flex-col items-center py-8 overflow-hidden">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8 relative z-10"
      >
        <h1 className="text-4xl font-bold bg-gradient-to-r from-amber-400 via-orange-500 to-red-500 bg-clip-text text-transparent mb-2">
          {t('Card Battle')}
        </h1>
        <p className="text-gray-400">
          {activeSelection === 'player'
            ? t('Choose your champion')
            : activeSelection === 'opponent'
              ? t('Select your opponent')
              : t('Ready to battle!')}
        </p>
      </motion.div>

      {/* Main Battle Stage */}
      <div className="flex items-center justify-center gap-8 w-full max-w-6xl px-4 mb-8">
        {/* Player Card Slot */}
        <CardSlotDisplay
          slot={playerSlot}
          label={t('Your Card')}
          color="blue"
          isActive={activeSelection === 'player'}
          onReset={() => handleResetSlot('player')}
          t={t as (key: string) => string}
        />

        {/* VS Badge */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', duration: 0.8 }}
          className="relative z-20"
        >
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-red-500 via-orange-500 to-amber-500 flex items-center justify-center shadow-2xl shadow-orange-500/50">
            <span className="text-white font-bold text-2xl drop-shadow-lg">
              VS
            </span>
          </div>
          {/* Pulsing ring */}
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-orange-500/50"
            animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </motion.div>

        {/* Opponent Card Slot */}
        <CardSlotDisplay
          slot={opponentSlot}
          label={t('Opponent')}
          color="red"
          isActive={activeSelection === 'opponent'}
          onReset={() => handleResetSlot('opponent')}
          t={t as (key: string) => string}
        />
      </div>

      {/* Card Carousel */}
      <AnimatePresence mode="wait">
        {activeSelection !== null && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="relative w-full"
          >
            {/* Selection indicator */}
            <div className="text-center mb-4">
              <Chip
                variant="flat"
                color={activeSelection === 'player' ? 'primary' : 'danger'}
                startContent={<Icon name="NavArrowDown" className="w-4 h-4" />}
                className="animate-bounce"
              >
                {activeSelection === 'player'
                  ? t('Select your card')
                  : t('Select opponent card')}
              </Chip>
            </div>

            {/* Carousel Navigation Buttons */}
            <div className="absolute left-4 top-1/2 -translate-y-1/2 z-30">
              <Button
                isIconOnly
                variant="flat"
                size="lg"
                className="bg-white/10 backdrop-blur-sm hover:bg-white/20"
                onPress={() => navigateCarousel('left')}
              >
                <Icon name="NavArrowLeft" className="w-6 h-6 text-white" />
              </Button>
            </div>
            <div className="absolute end-4 top-1/2 -translate-y-1/2 z-30">
              <Button
                isIconOnly
                variant="flat"
                size="lg"
                className="bg-white/10 backdrop-blur-sm hover:bg-white/20"
                onPress={() => navigateCarousel('right')}
              >
                <Icon name="NavArrowRight" className="w-6 h-6 text-white" />
              </Button>
            </div>

            {/* Carousel Container */}
            <div
              className="relative h-[400px] -mt-40 flex items-center justify-center cursor-grab active:cursor-grabbing"
              onMouseDown={handleDragStart}
              onMouseMove={handleDragMove}
              onMouseUp={handleDragEnd}
              onMouseLeave={handleDragEnd}
              onTouchStart={handleDragStart}
              onTouchMove={handleDragMove}
              onTouchEnd={handleDragEnd}
              style={{ perspective: '1000px' }}
            >
              {/* Cards */}
              <div
                className="relative"
                style={{ transformStyle: 'preserve-3d' }}
              >
                {availableAgents.map((agent, index) => {
                  // Only render visible cards for performance
                  if (index < visibleRange.start || index > visibleRange.end) {
                    return null
                  }

                  const style = getCardStyle(index)
                  const isCenter = index === selectedIndex
                  const isDisabled = agent.id === excludedAgentId

                  return (
                    <motion.div
                      key={agent.id}
                      initial={false}
                      animate={{
                        x: style.x,
                        scale: style.scale,
                        rotateY: style.rotateY,
                        opacity: isDisabled ? 0.3 : style.opacity,
                        filter: style.filter,
                      }}
                      transition={{
                        type: 'spring',
                        stiffness: 300,
                        damping: 30,
                      }}
                      className={`absolute left-1/2 -translate-x-1/2 ${
                        isCenter ? 'z-20' : 'z-10'
                      } ${isDisabled ? 'pointer-events-none' : ''}`}
                      style={{
                        transformStyle: 'preserve-3d',
                        translateZ: style.z,
                      }}
                      onClick={() => !isDisabled && handleCardClick(index)}
                    >
                      <CarouselCard
                        agent={agent}
                        displayName={getAgentDisplayName(agent)}
                        isCenter={isCenter}
                        isDisabled={isDisabled}
                      />

                      {/* Selection glow for center card */}
                      {isCenter && (
                        <motion.div
                          className="absolute inset-0 rounded-xl pointer-events-none"
                          animate={{
                            boxShadow: [
                              '0 0 20px rgba(168, 85, 247, 0.3)',
                              '0 0 40px rgba(168, 85, 247, 0.6)',
                              '0 0 20px rgba(168, 85, 247, 0.3)',
                            ],
                          }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                        />
                      )}
                    </motion.div>
                  )
                })}
              </div>

              {/* Center indicator light */}
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-32 h-1 bg-gradient-to-r from-transparent via-purple-500 to-transparent rounded-full" />
            </div>

            {/* Agent info for selected card */}
            <motion.div
              key={selectedIndex}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mt-4"
            >
              <h3 className="text-xl font-bold text-white">
                {availableAgents[selectedIndex] &&
                  getAgentDisplayName(availableAgents[selectedIndex])}
              </h3>
              <p className="text-gray-400 text-sm">
                {availableAgents[selectedIndex]?.role || 'Agent'}
              </p>
            </motion.div>

            {/* Action buttons */}
            <div className="flex justify-center gap-4 mt-6">
              <Button
                color="secondary"
                variant="flat"
                size="lg"
                onPress={handleRandomSelect}
                startContent={<Icon name="Sparks" className="w-5 h-5" />}
              >
                {t('Random')}
              </Button>
              <Button
                color={activeSelection === 'player' ? 'primary' : 'danger'}
                size="lg"
                onPress={handleSelectCard}
                isDisabled={
                  availableAgents[selectedIndex]?.id === excludedAgentId
                }
                startContent={<Icon name="SparksSolid" className="w-5 h-5" />}
                className="px-8"
              >
                {t('Select This Card')}
              </Button>
            </div>

            {/* Keyboard hint */}
            <p className="text-center text-gray-500 text-xs mt-4">
              ← → {t('to navigate')} • Enter {t('to select')} •{' '}
              {t('Drag to scroll')}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Battle Start Section */}
      <AnimatePresence>
        {activeSelection === null && canStartBattle && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex flex-col items-center gap-6 mt-8"
          >
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <Button
                color="warning"
                size="lg"
                onPress={handleStartBattle}
                startContent={<Icon name="Play" className="w-6 h-6" />}
                className="px-12 py-6 text-xl font-bold shadow-2xl shadow-orange-500/50"
              >
                {t('Start Battle')}
              </Button>
            </motion.div>

            <Button
              variant="ghost"
              onPress={onCancel}
              className="text-gray-400"
            >
              {t('Cancel')}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cancel button when selecting */}
      {activeSelection !== null && onCancel && (
        <div className="mt-8">
          <Button variant="ghost" onPress={onCancel} className="text-gray-400">
            {t('Cancel')}
          </Button>
        </div>
      )}
    </div>
  )
}

// =============================================================================
// Sub-components
// =============================================================================

interface CardSlotDisplayProps {
  slot: CardSlot
  label: string
  color: 'blue' | 'red'
  isActive: boolean
  onReset: () => void
  t: (key: string) => string
}

const CardSlotDisplay = ({
  slot,
  label,
  color,
  isActive,
  onReset,
  t,
}: CardSlotDisplayProps) => {
  const borderColor = color === 'blue' ? 'border-blue-500' : 'border-red-500'
  const glowColor =
    color === 'blue' ? 'shadow-blue-500/50' : 'shadow-red-500/50'
  const textColor = color === 'blue' ? 'text-blue-400' : 'text-red-400'

  return (
    <motion.div
      className="flex flex-col items-center gap-3"
      animate={isActive ? { scale: [1, 1.02, 1] } : { scale: 1 }}
      transition={{ duration: 1.5, repeat: isActive ? Infinity : 0 }}
    >
      {/* Label */}
      <h3 className={`text-lg font-semibold ${textColor}`}>{label}</h3>

      {/* Card Container */}
      <div
        className={`
          relative w-56 h-80 rounded-xl overflow-hidden
          ${slot.card ? '' : `border-2 border-dashed ${borderColor}`}
          ${isActive ? `shadow-xl ${glowColor}` : ''}
          transition-all duration-300
        `}
      >
        {slot.isGenerating ? (
          // Generating state with animation
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
            {/* Card generation animation */}
            <motion.div
              className="relative"
              animate={{ rotateY: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            >
              <CardBack size="compact" />
            </motion.div>
            <div className="absolute bottom-8 flex flex-col items-center gap-2">
              <Spinner color={color === 'blue' ? 'primary' : 'danger'} />
              <span className="text-sm text-gray-400">
                {t('Generating card...')}
              </span>
            </div>

            {/* Magic particles */}
            {Array.from({ length: 8 }).map((_, i) => (
              <motion.div
                key={i}
                className={`absolute w-2 h-2 rounded-full ${
                  color === 'blue' ? 'bg-blue-400' : 'bg-red-400'
                }`}
                initial={{
                  x: 0,
                  y: 0,
                  opacity: 0,
                }}
                animate={{
                  x: Math.cos((i * Math.PI * 2) / 8) * 60,
                  y: Math.sin((i * Math.PI * 2) / 8) * 60,
                  opacity: [0, 1, 0],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  delay: i * 0.1,
                }}
              />
            ))}
          </div>
        ) : slot.card ? (
          // Card preview
          <motion.div
            initial={{ rotateY: 180, opacity: 0 }}
            animate={{ rotateY: 0, opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="flex items-center justify-center h-full"
          >
            <AgentCardComponent card={slot.card} />
          </motion.div>
        ) : slot.error ? (
          // Error state
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-800/80 p-4 text-center">
            <Icon name="WarningTriangle" className="w-8 h-8 text-danger mb-2" />
            <span className="text-sm text-danger">{slot.error}</span>
          </div>
        ) : (
          // Empty placeholder
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-gray-800/50 to-gray-900/50">
            <Icon name="Plus" className="w-12 h-12 text-gray-600" />
            <span className="text-sm text-gray-500 mt-2">
              {t('No card selected')}
            </span>
          </div>
        )}

        {/* Active selection indicator */}
        {isActive && !slot.card && !slot.isGenerating && (
          <motion.div
            className={`absolute inset-0 border-2 ${borderColor} rounded-xl`}
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        )}
      </div>

      {/* Change button when card is selected */}
      {slot.card && (
        <Button
          variant="flat"
          size="sm"
          onPress={onReset}
          startContent={<Icon name="RefreshDouble" className="w-4 h-4" />}
        >
          {t('Change')}
        </Button>
      )}
    </motion.div>
  )
}

interface CarouselCardProps {
  agent: Agent
  displayName: string
  isCenter: boolean
  isDisabled: boolean
}

const CarouselCard = ({
  agent,
  displayName,
  isCenter,
  isDisabled,
}: CarouselCardProps) => {
  return (
    <motion.div
      whileHover={!isDisabled && isCenter ? { scale: 1.05 } : undefined}
      whileTap={!isDisabled ? { scale: 0.98 } : undefined}
      className={`
        relative w-48 h-72 rounded-xl overflow-hidden cursor-pointer
        bg-gradient-to-br from-gray-800 via-gray-900 to-black
        border-2 ${isCenter ? 'border-purple-500' : 'border-gray-700'}
        shadow-xl
        ${isDisabled ? 'grayscale' : ''}
        transition-colors duration-200
      `}
    >
      {/* Card background pattern */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `radial-gradient(circle at 50% 50%, rgba(168, 85, 247, 0.3) 0%, transparent 70%)`,
        }}
      />

      {/* Agent icon */}
      <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
        <div
          className={`
            w-24 h-24 rounded-full
            bg-gradient-to-br from-purple-600/30 to-indigo-600/30
            flex items-center justify-center
            border-2 ${isCenter ? 'border-purple-400' : 'border-gray-600'}
            mb-4
          `}
        >
          <Icon
            name={(agent.icon as any) || 'Bot'}
            className={`w-12 h-12 ${isCenter ? 'text-purple-300' : 'text-gray-400'}`}
          />
        </div>

        <h4 className="text-white font-bold text-center line-clamp-2">
          {displayName}
        </h4>
        <p className="text-gray-400 text-xs text-center mt-1 line-clamp-1">
          {agent.role || 'Agent'}
        </p>
      </div>

      {/* Rarity shimmer for center card */}
      {isCenter && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          animate={{
            background: [
              'linear-gradient(45deg, transparent 0%, rgba(168, 85, 247, 0.1) 50%, transparent 100%)',
              'linear-gradient(45deg, transparent 100%, rgba(168, 85, 247, 0.1) 150%, transparent 200%)',
            ],
          }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}

      {/* Disabled overlay */}
      {isDisabled && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
          <Chip color="danger" size="sm">
            Already Selected
          </Chip>
        </div>
      )}

      {/* Card shine effect */}
      <div className="absolute top-0 left-0 end-0 h-1/3 bg-gradient-to-b from-white/5 to-transparent rounded-t-xl" />
    </motion.div>
  )
}

export default CardCarousel
