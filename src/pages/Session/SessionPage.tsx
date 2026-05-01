import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Chip, Spinner } from '@heroui/react'

import { useI18n } from '@/i18n'
import { PromptArea } from '@/components'
import type { PromptMode } from '@/components/PromptArea'
import RunLayout from '@/layouts/Run'
import type { HeaderProps } from '@/lib/types'
import { useSessionStore } from '@/stores/sessionStore'
import { getAgentById } from '@/stores/agentStore'
import { useLiveValue, sessions } from '@/lib/yjs'
import type { Agent, SessionIntent } from '@/types'

import { SessionTimeline } from './SessionTimeline'
import { useSessionExecution } from './useSessionExecution'

/** Map PromptMode to SessionIntent */
function modeToIntent(mode: PromptMode, agent?: Agent | null): SessionIntent {
  switch (mode) {
    case 'studio':
      return 'media'
    case 'app':
      return 'app'
    case 'agent':
      return 'agent'
    case 'live':
      return 'chat'
    case 'chat':
    default:
      return agent?.id === 'devs' ? 'task' : 'chat'
  }
}

export function SessionPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const { lang, t } = useI18n()

  // Reactive session from Yjs
  const session = useLiveValue(sessions, sessionId)

  const { addTurn } = useSessionStore()

  const [prompt, setPrompt] = useState('')
  const [mode, setMode] = useState<PromptMode>('chat')
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [isSending, setIsSending] = useState(false)

  // Kick off the LLM pipeline when session is in 'starting' state
  const executionState = useSessionExecution(session, lang, t)

  // Resolve the primary agent
  useEffect(() => {
    if (!session?.primaryAgentId) return
    const agent = getAgentById(session.primaryAgentId)
    if (agent) setSelectedAgent(agent)
  }, [session?.primaryAgentId])

  // Build header
  const header = useMemo<HeaderProps | undefined>(() => {
    if (!session) return undefined
    return {
      title:
        session.title ||
        session.prompt.slice(0, 60) + (session.prompt.length > 60 ? '…' : ''),
      subtitle: selectedAgent?.name,
      icon: selectedAgent?.icon
        ? {
            name: selectedAgent.icon,
            color: `text-${selectedAgent.color || 'primary'}`,
          }
        : undefined,
    }
  }, [session, selectedAgent])

  // Handle follow-up submission
  const handleFollowUp = useCallback(
    async (cleanedPrompt?: string) => {
      const text = cleanedPrompt ?? prompt
      if (!text.trim() || isSending) return

      setIsSending(true)
      try {
        const intent = modeToIntent(mode, selectedAgent)
        await addTurn(sessionId!, {
          prompt: text,
          intent,
          agentId: selectedAgent?.id ?? 'devs',
        })
        setPrompt('')
      } finally {
        setIsSending(false)
      }
    },
    [prompt, mode, selectedAgent, sessionId, isSending, addTurn],
  )

  if (!sessionId || !session) {
    return (
      <RunLayout header={{ title: t('Session') }}>
        <div className="flex items-center justify-center h-64">
          <Spinner size="lg" />
        </div>
      </RunLayout>
    )
  }

  return (
    <RunLayout title={session.title || 'Session'} header={header}>
      <div className="grow flex flex-col px-6 lg:px-8">
        <div className="flex-1 flex flex-col gap-4 py-4">
          {/* Status chip */}
          {session.status !== 'completed' && session.status !== 'failed' && (
            <div className="flex justify-center">
              <Chip
                size="sm"
                variant="flat"
                color={
                  session.status === 'starting'
                    ? 'warning'
                    : session.status === 'running'
                      ? 'primary'
                      : 'default'
                }
                startContent={
                  session.status === 'running' ||
                  session.status === 'starting' ? (
                    <Spinner size="sm" className="scale-50" />
                  ) : undefined
                }
              >
                {session.status === 'starting' && t('Starting…')}
                {session.status === 'running' && t('Working…')}
              </Chip>
            </div>
          )}

          {/* Timeline */}
          <SessionTimeline session={session} executionState={executionState} />
        </div>

        {/* Follow-up PromptArea */}
        <div className="sticky bottom-0 pb-4 bg-gradient-to-t from-background via-background to-transparent pt-8">
          <PromptArea
            lang={lang}
            className="max-w-3xl mx-auto"
            value={prompt}
            defaultPrompt=""
            onValueChange={setPrompt}
            onSubmitToAgent={handleFollowUp}
            isSending={isSending}
            selectedAgent={selectedAgent}
            onAgentChange={setSelectedAgent}
            mode={mode}
            onModeChange={setMode}
            withAttachmentSelector
            withModelSelector
            withAgentSelector
          />
        </div>
      </div>
    </RunLayout>
  )
}
