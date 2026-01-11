/**
 * BattleMatch Component
 *
 * Live match view showing two agents facing off.
 * Displays progress, conversation messages, and status.
 */
import {
  Card,
  CardBody,
  CardHeader,
  Progress,
  Avatar,
  Chip,
  Divider,
  ScrollShadow,
  Button,
} from '@heroui/react'
import { useMemo, useEffect, useRef } from 'react'

import { Icon } from '@/components/Icon'
import { useI18n } from '@/i18n'
import { type LanguageCode } from '@/i18n/locales'
import { useAgents } from '@/hooks'
import { type Agent, type Message } from '@/types'
import { type Battle, type BattleMatch as BattleMatchType } from '../types'
import { battleI18n } from '../i18n'
import { useBattleMatch } from '../hooks'

interface BattleMatchProps {
  /** The battle context */
  battle: Battle
  /** The specific match to display */
  match: BattleMatchType
  /** Optional conversation messages for the match */
  messages?: Message[]
}

interface AgentFaceOffProps {
  agent: Agent | undefined
  isWinner?: boolean
  isLeft?: boolean
  teamColor: string
  lang: string
}

const AgentFaceOff = ({
  agent,
  isWinner,
  isLeft,
  teamColor,
  lang,
}: AgentFaceOffProps) => {
  const displayName =
    agent?.i18n?.[lang as LanguageCode]?.name || agent?.name || 'Unknown'

  return (
    <div
      className={`flex flex-col items-center gap-2 ${isLeft ? 'text-left' : 'text-right'}`}
    >
      <div className="relative">
        <Avatar
          size="lg"
          className={`
            ${teamColor === 'blue' ? 'bg-blue-100 text-blue-600' : 'bg-red-100 text-red-600'}
            ${isWinner ? 'ring-4 ring-success' : ''}
          `}
          icon={
            agent?.icon ? (
              <Icon name={agent.icon} className="w-8 h-8" />
            ) : (
              <Icon name="User" className="w-8 h-8" />
            )
          }
        />
        {isWinner && (
          <div className="absolute -top-2 -right-2 bg-success text-white rounded-full p-1">
            <Icon name="Crown" className="w-4 h-4" />
          </div>
        )}
      </div>
      <span className="font-semibold text-sm">{displayName}</span>
      {isWinner && (
        <Chip size="sm" color="success" variant="flat">
          Winner
        </Chip>
      )}
    </div>
  )
}

const StatusChip = ({
  status,
  t,
}: {
  status: BattleMatchType['status']
  t: (key: string) => string
}) => {
  const colorMap: Record<
    BattleMatchType['status'],
    'default' | 'primary' | 'warning' | 'success'
  > = {
    pending: 'default',
    in_progress: 'primary',
    judging: 'warning',
    completed: 'success',
  }

  const iconMap: Record<BattleMatchType['status'], string> = {
    pending: 'Clock',
    in_progress: 'Play',
    judging: 'Strategy',
    completed: 'CheckCircle',
  }

  return (
    <Chip
      color={colorMap[status]}
      variant="flat"
      startContent={<Icon name={iconMap[status] as any} className="w-4 h-4" />}
    >
      {t(status)}
    </Chip>
  )
}

export const BattleMatch = ({
  battle,
  match,
  messages: propMessages = [],
}: BattleMatchProps) => {
  const { t, lang } = useI18n(battleI18n)
  const agents = useAgents()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Hook for running the match - provides live messages during battle
  const {
    isRunning,
    progress: matchProgress,
    messages: liveMessages,
    currentTurn,
    totalTurns,
    streamingContent,
    streamingAgentId,
    runMatch,
  } = useBattleMatch(battle.id, match.id)

  // Use live messages when running, otherwise use prop messages
  const messages = isRunning
    ? liveMessages
    : propMessages.length > 0
      ? propMessages
      : liveMessages

  const agentA = useMemo(
    () => agents.find((a) => a.id === match.agentAId),
    [agents, match.agentAId],
  )

  const agentB = useMemo(
    () => agents.find((a) => a.id === match.agentBId),
    [agents, match.agentBId],
  )

  // Calculate progress - use hook progress when running
  const progress = useMemo(() => {
    if (isRunning) return matchProgress
    if (match.status === 'completed') return 100
    if (match.status === 'pending') return 0
    if (match.status === 'judging') return 90
    // Calculate based on messages
    const totalTurns = battle.turnsPerConversation
    const currentTurns = messages.length
    return Math.min(80, (currentTurns / totalTurns) * 80)
  }, [
    match.status,
    messages.length,
    battle.turnsPerConversation,
    isRunning,
    matchProgress,
  ])

  // Auto-scroll to latest message or streaming content
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, streamingContent])

  const getAgentDisplayName = (agentId: string) => {
    const agent = agents.find((a) => a.id === agentId)
    return agent?.i18n?.[lang as LanguageCode]?.name || agent?.name || 'Unknown'
  }

  return (
    <Card className="w-full">
      <CardHeader className="flex-col gap-4">
        {/* Agent Face-off */}
        <div className="flex items-center justify-between w-full gap-4">
          <AgentFaceOff
            agent={agentA}
            isWinner={match.winnerId === match.agentAId}
            isLeft
            teamColor="blue"
            lang={lang}
          />

          <div className="flex flex-col items-center gap-2">
            <span className="text-2xl font-bold text-default-400">VS</span>
            <StatusChip
              status={match.status}
              t={t as unknown as (key: string) => string}
            />
          </div>

          <AgentFaceOff
            agent={agentB}
            isWinner={match.winnerId === match.agentBId}
            isLeft={false}
            teamColor="red"
            lang={lang}
          />
        </div>

        {/* Progress - show during running or in_progress */}
        {(isRunning ||
          (match.status !== 'pending' && match.status !== 'completed')) && (
          <div className="w-full space-y-2">
            <div className="flex justify-between text-xs text-default-500">
              <span>
                {t('Turn')} {isRunning ? currentTurn : messages.length}{' '}
                {t('of')} {isRunning ? totalTurns : battle.turnsPerConversation}
              </span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress
              value={progress}
              color={match.status === 'judging' ? 'warning' : 'primary'}
              className="w-full"
              isIndeterminate={match.status === 'judging' && !isRunning}
            />
          </div>
        )}
      </CardHeader>

      <Divider />

      <CardBody className="gap-4">
        {/* Run Match Button - shown when match is pending */}
        {match.status === 'pending' && !isRunning && (
          <div className="flex justify-center py-4">
            <Button
              color="primary"
              size="lg"
              onPress={runMatch}
              startContent={<Icon name="Play" className="w-5 h-5" />}
            >
              {t('Run Match')}
            </Button>
          </div>
        )}

        {/* Running indicator */}
        {isRunning && (
          <div className="flex flex-col items-center py-4 gap-3">
            <div className="flex items-center gap-2 text-primary">
              <Icon name="Sparks" className="w-5 h-5 animate-pulse" />
              <span className="font-medium">{t('Match in progress...')}</span>
            </div>
            <Progress
              value={matchProgress}
              color="primary"
              className="w-full max-w-md"
              showValueLabel
            />
          </div>
        )}

        {/* Winner Announcement */}
        {match.status === 'completed' && match.winnerId && (
          <Card className="bg-gradient-to-r from-success-100 to-success-50 dark:from-success-950/50 dark:to-success-900/30 border border-success-200">
            <CardBody className="items-center py-4">
              <Icon name="Crown" className="w-8 h-8 text-success mb-2" />
              <h3 className="text-lg font-bold text-success-700 dark:text-success-300">
                {t('Winner')}: {getAgentDisplayName(match.winnerId)}
              </h3>
              {match.judgment?.reasoning && (
                <p className="text-sm text-default-600 mt-2 text-center max-w-md">
                  {match.judgment.reasoning}
                </p>
              )}
            </CardBody>
          </Card>
        )}

        {/* Conversation Messages */}
        <div className="space-y-2">
          <h4 className="font-semibold flex items-center gap-2">
            <Icon name="ChatLines" className="w-5 h-5" />
            {t('Conversation')}
          </h4>

          <ScrollShadow className="max-h-96">
            {messages.length === 0 && !streamingContent ? (
              <div className="flex flex-col items-center justify-center py-8 text-default-400">
                <Icon name="ChatBubble" className="w-12 h-12 mb-2" />
                <p>
                  {match.status === 'pending'
                    ? t('Match has not started yet')
                    : t('No messages yet')}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((message, idx) => {
                  const isAgentA = message.agentId === match.agentAId
                  const agent = isAgentA ? agentA : agentB

                  return (
                    <div
                      key={message.id}
                      className={`flex gap-3 ${isAgentA ? '' : 'flex-row-reverse'}`}
                    >
                      <Avatar
                        size="sm"
                        className={
                          isAgentA
                            ? 'bg-blue-100 text-blue-600'
                            : 'bg-red-100 text-red-600'
                        }
                        icon={
                          agent?.icon ? (
                            <Icon name={agent.icon} className="w-4 h-4" />
                          ) : undefined
                        }
                      />
                      <div
                        className={`
                        flex-1 max-w-[80%] p-3 rounded-lg
                        ${isAgentA ? 'bg-blue-50 dark:bg-blue-950/30' : 'bg-red-50 dark:bg-red-950/30'}
                      `}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-semibold">
                            {agent?.i18n?.[lang as LanguageCode]?.name ||
                              agent?.name}
                          </span>
                          <span className="text-xs text-default-400">
                            {t('Turn')} {idx + 1}
                          </span>
                        </div>
                        <p className="text-sm whitespace-pre-wrap">
                          {message.content}
                        </p>
                      </div>
                    </div>
                  )
                })}

                {/* Live Streaming Message */}
                {isRunning && streamingContent && streamingAgentId && (
                  <div
                    className={`flex gap-3 ${streamingAgentId === match.agentAId ? '' : 'flex-row-reverse'}`}
                  >
                    <Avatar
                      size="sm"
                      className={
                        streamingAgentId === match.agentAId
                          ? 'bg-blue-100 text-blue-600'
                          : 'bg-red-100 text-red-600'
                      }
                      icon={
                        (streamingAgentId === match.agentAId ? agentA : agentB)
                          ?.icon ? (
                          <Icon
                            name={
                              (streamingAgentId === match.agentAId
                                ? agentA
                                : agentB)!.icon!
                            }
                            className="w-4 h-4"
                          />
                        ) : undefined
                      }
                    />
                    <div
                      className={`
                      flex-1 max-w-[80%] p-3 rounded-lg
                      ${streamingAgentId === match.agentAId ? 'bg-blue-50 dark:bg-blue-950/30' : 'bg-red-50 dark:bg-red-950/30'}
                      border-2 border-primary animate-pulse
                    `}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold">
                          {(streamingAgentId === match.agentAId
                            ? agentA
                            : agentB
                          )?.i18n?.[lang as LanguageCode]?.name ||
                            (streamingAgentId === match.agentAId
                              ? agentA
                              : agentB
                            )?.name}
                        </span>
                        <span className="text-xs text-default-400">
                          {t('Turn')} {currentTurn}
                        </span>
                        <span className="text-xs text-primary animate-pulse">
                          ●
                        </span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">
                        {streamingContent}
                      </p>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            )}
          </ScrollShadow>
        </div>

        {/* Judgment Scores */}
        {match.status === 'completed' && match.judgment && (
          <div className="space-y-2">
            <h4 className="font-semibold flex items-center gap-2">
              <Icon name="Strategy" className="w-5 h-5" />
              {t('Judgment Scores')}
            </h4>
            <div className="grid grid-cols-2 gap-4">
              {match.judgment.scores.map((score) => {
                const agent = agents.find((a) => a.id === score.agentId)
                const isWinner = score.agentId === match.winnerId

                return (
                  <Card
                    key={score.agentId}
                    className={isWinner ? 'border-2 border-success' : ''}
                  >
                    <CardBody className="gap-2">
                      <div className="flex items-center gap-2">
                        {agent?.icon && (
                          <Icon name={agent.icon} className="w-4 h-4" />
                        )}
                        <span className="font-medium">
                          {agent?.i18n?.[lang as LanguageCode]?.name ||
                            agent?.name}
                        </span>
                        {isWinner && (
                          <Chip size="sm" color="success" variant="flat">
                            {t('Winner')}
                          </Chip>
                        )}
                      </div>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-default-500">
                            {t('Argument Quality')}
                          </span>
                          <span>{score.argumentQuality}/10</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-default-500">
                            {t('Persuasiveness')}
                          </span>
                          <span>{score.persuasiveness}/10</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-default-500">
                            {t('Creativity')}
                          </span>
                          <span>{score.creativity}/10</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-default-500">
                            {t('Responsiveness')}
                          </span>
                          <span>{score.responsiveness}/10</span>
                        </div>
                        <Divider className="my-1" />
                        <div className="flex justify-between font-semibold">
                          <span>{t('Total')}</span>
                          <span>{score.total}/40</span>
                        </div>
                      </div>
                    </CardBody>
                  </Card>
                )
              })}
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  )
}
