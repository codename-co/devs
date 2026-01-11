/**
 * CardSelection Component
 *
 * Allows users to select two agents (player vs opponent) and generate
 * collectible battle cards from them before starting a card battle.
 */
import { useState, useCallback } from 'react'
import {
  Button,
  Card,
  CardBody,
  Spinner,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
} from '@heroui/react'

import { Icon } from '@/components/Icon'
import { useAllAgents } from '@/hooks'
import { type Agent } from '@/types'
import { type LanguageCode } from '@/i18n/locales'
import { useI18n } from '@/i18n'
import { cardGenerationService } from '../services/cardGenerationService'
import { type AgentCard } from '../types'
import { AgentCard as AgentCardComponent } from './AgentCard'
import { battleI18n } from '../i18n'

// =============================================================================
// Types
// =============================================================================

interface CardSelectionProps {
  onBattleStart: (playerCard: AgentCard, opponentCard: AgentCard) => void
  onCancel?: () => void
}

interface CardSlotState {
  agent: Agent | null
  card: AgentCard | null
  isGenerating: boolean
  error: string | null
}

// =============================================================================
// Component
// =============================================================================

export const CardSelection = ({
  onBattleStart,
  onCancel,
}: CardSelectionProps) => {
  const { t, lang } = useI18n(battleI18n)
  const agents = useAllAgents()

  // Card slot states
  const [playerSlot, setPlayerSlot] = useState<CardSlotState>({
    agent: null,
    card: null,
    isGenerating: false,
    error: null,
  })
  const [opponentSlot, setOpponentSlot] = useState<CardSlotState>({
    agent: null,
    card: null,
    isGenerating: false,
    error: null,
  })

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [activeSlot, setActiveSlot] = useState<'player' | 'opponent'>('player')

  // Filter available agents (exclude deleted)
  const availableAgents = agents.filter((agent) => !agent.deletedAt)

  // Get agent display name with i18n support
  const getAgentDisplayName = useCallback(
    (agent: Agent) => {
      return agent.i18n?.[lang as LanguageCode]?.name || agent.name
    },
    [lang],
  )

  // Generate card from selected agent
  const generateCard = useCallback(
    async (
      agent: Agent,
      slot: 'player' | 'opponent',
      withArtwork: boolean = true,
    ) => {
      const setSlot = slot === 'player' ? setPlayerSlot : setOpponentSlot

      setSlot({
        agent,
        card: null,
        isGenerating: true,
        error: null,
      })

      try {
        const card = await cardGenerationService.generateCard(agent, {
          generateArtwork: withArtwork,
        })

        setSlot({
          agent,
          card,
          isGenerating: false,
          error: null,
        })
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
    [],
  )

  // Handle agent selection from modal
  const handleAgentSelect = useCallback(
    (agent: Agent) => {
      setIsModalOpen(false)
      generateCard(agent, activeSlot)
    },
    [activeSlot, generateCard],
  )

  // Open agent picker modal
  const openAgentPicker = useCallback((slot: 'player' | 'opponent') => {
    setActiveSlot(slot)
    setIsModalOpen(true)
  }, [])

  // Select random opponent
  const selectRandomOpponent = useCallback(() => {
    // Exclude the player's agent if selected
    const excludeId = playerSlot.agent?.id
    const eligibleAgents = availableAgents.filter(
      (agent) => agent.id !== excludeId,
    )

    if (eligibleAgents.length === 0) return

    const randomIndex = Math.floor(Math.random() * eligibleAgents.length)
    const randomAgent = eligibleAgents[randomIndex]
    generateCard(randomAgent, 'opponent')
  }, [availableAgents, playerSlot.agent, generateCard])

  // Check if battle can start
  const canStartBattle = playerSlot.card && opponentSlot.card

  // Handle battle start
  const handleStartBattle = useCallback(() => {
    if (playerSlot.card && opponentSlot.card) {
      onBattleStart(playerSlot.card, opponentSlot.card)
    }
  }, [playerSlot.card, opponentSlot.card, onBattleStart])

  return (
    <div className="flex flex-col items-center gap-8 p-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-default-800 dark:text-default-100">
          {t('Card Battle')}
        </h2>
        <p className="text-default-500 mt-2">
          {t('Select agents to generate battle cards')}
        </p>
      </div>

      {/* Card Selection Area */}
      <div className="flex flex-col md:flex-row items-center justify-center gap-8 w-full max-w-4xl">
        {/* Player Card Slot */}
        <CardSlot
          label={t('Your Card')}
          slot={playerSlot}
          onSelect={() => openAgentPicker('player')}
          color="blue"
          t={t as (key: string) => string}
        />

        {/* VS Divider */}
        <div className="flex items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center shadow-lg">
            <span className="text-white font-bold text-xl">{t('VS')}</span>
          </div>
        </div>

        {/* Opponent Card Slot */}
        <CardSlot
          label={t('Opponent')}
          slot={opponentSlot}
          onSelect={() => openAgentPicker('opponent')}
          color="red"
          showRandomButton
          onRandom={selectRandomOpponent}
          t={t as (key: string) => string}
        />
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4">
        {onCancel && (
          <Button variant="flat" onPress={onCancel} size="lg">
            {t('Cancel')}
          </Button>
        )}
        <Button
          color="primary"
          size="lg"
          isDisabled={!canStartBattle}
          onPress={handleStartBattle}
          startContent={<Icon name="Play" className="w-5 h-5" />}
        >
          {t('Start Battle')}
        </Button>
      </div>

      {/* Agent Picker Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        size="3xl"
        scrollBehavior="inside"
      >
        <ModalContent>
          <ModalHeader className="flex flex-col gap-1">
            <span>{t('Select Agent')}</span>
            <span className="text-sm font-normal text-default-500">
              {t('Choose an agent to generate a battle card')}
            </span>
          </ModalHeader>
          <ModalBody className="pb-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {availableAgents.map((agent) => (
                <AgentPickerCard
                  key={agent.id}
                  agent={agent}
                  displayName={getAgentDisplayName(agent)}
                  onSelect={() => handleAgentSelect(agent)}
                  isDisabled={
                    (activeSlot === 'player' &&
                      agent.id === opponentSlot.agent?.id) ||
                    (activeSlot === 'opponent' &&
                      agent.id === playerSlot.agent?.id)
                  }
                />
              ))}
            </div>
          </ModalBody>
        </ModalContent>
      </Modal>
    </div>
  )
}

// =============================================================================
// Sub-components
// =============================================================================

interface CardSlotProps {
  label: string
  slot: CardSlotState
  onSelect: () => void
  color: 'blue' | 'red'
  showRandomButton?: boolean
  onRandom?: () => void
  t: (key: string) => string
}

const CardSlot = ({
  label,
  slot,
  onSelect,
  color,
  showRandomButton,
  onRandom,
  t,
}: CardSlotProps) => {
  const borderColor = color === 'blue' ? 'border-blue-500' : 'border-red-500'
  const bgColor =
    color === 'blue'
      ? 'bg-blue-50 dark:bg-blue-950/20'
      : 'bg-red-50 dark:bg-red-950/20'

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Label */}
      <h3
        className={`text-lg font-semibold ${
          color === 'blue'
            ? 'text-blue-600 dark:text-blue-400'
            : 'text-red-600 dark:text-red-400'
        }`}
      >
        {label}
      </h3>

      {/* Card Display Area */}
      <div
        className={`relative w-72 h-[420px] rounded-xl border-2 border-dashed ${borderColor} ${bgColor} flex items-center justify-center transition-all`}
      >
        {slot.isGenerating ? (
          // Loading state
          <div className="flex flex-col items-center gap-3">
            <Spinner
              size="lg"
              color={color === 'blue' ? 'primary' : 'danger'}
            />
            <span className="text-sm text-default-500">
              {t('Generating card & artwork...')}
            </span>
          </div>
        ) : slot.card ? (
          // Card preview - full size card
          <div className="flex items-center justify-center">
            <AgentCardComponent card={slot.card} />
          </div>
        ) : slot.error ? (
          // Error state
          <div className="flex flex-col items-center gap-2 p-4 text-center">
            <Icon name="WarningTriangle" className="w-8 h-8 text-danger" />
            <span className="text-sm text-danger">{slot.error}</span>
            <Button size="sm" variant="flat" onPress={onSelect}>
              {t('Try Again')}
            </Button>
          </div>
        ) : (
          // Empty state
          <div className="flex flex-col items-center gap-2">
            <Icon name="Plus" className="w-12 h-12 text-default-300" />
            <span className="text-sm text-default-400">
              {t('No card selected')}
            </span>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        {slot.card ? (
          <Button
            variant="flat"
            size="sm"
            onPress={onSelect}
            startContent={<Icon name="RefreshDouble" className="w-4 h-4" />}
          >
            {t('Change')}
          </Button>
        ) : (
          <Button
            variant="flat"
            size="sm"
            onPress={onSelect}
            isDisabled={slot.isGenerating}
            startContent={<Icon name="UserPlus" className="w-4 h-4" />}
          >
            {t('Select Agent')}
          </Button>
        )}
        {showRandomButton && (
          <Button
            variant="flat"
            size="sm"
            onPress={onRandom}
            isDisabled={slot.isGenerating}
            startContent={<Icon name="Sparks" className="w-4 h-4" />}
          >
            {t('Random')}
          </Button>
        )}
      </div>
    </div>
  )
}

interface AgentPickerCardProps {
  agent: Agent
  displayName: string
  onSelect: () => void
  isDisabled?: boolean
}

const AgentPickerCard = ({
  agent,
  displayName,
  onSelect,
  isDisabled,
}: AgentPickerCardProps) => {
  return (
    <Card
      isPressable={!isDisabled}
      isDisabled={isDisabled}
      onPress={onSelect}
      className={`transition-all hover:scale-105 ${
        isDisabled ? 'opacity-50 cursor-not-allowed' : ''
      }`}
    >
      <CardBody className="p-3 text-center">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-full bg-default-100 dark:bg-default-50/10 flex items-center justify-center">
            <Icon
              name={(agent.icon as any) || 'Bot'}
              className="w-6 h-6 text-default-600"
            />
          </div>
          <div>
            <p className="font-medium text-sm line-clamp-1">{displayName}</p>
            <p className="text-xs text-default-400 line-clamp-1">
              {agent.role || 'Agent'}
            </p>
          </div>
        </div>
      </CardBody>
    </Card>
  )
}

export default CardSelection
