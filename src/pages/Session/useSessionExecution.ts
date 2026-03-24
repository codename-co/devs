import { useCallback, useEffect, useRef, useState } from 'react'
import type { Agent, Session } from '@/types'
import { useSessionStore } from '@/stores/sessionStore'
import { useConversationStore } from '@/stores/conversationStore'
import { useTaskStore } from '@/stores/taskStore'
import { getAgentById, getAgentByIdAsync } from '@/stores/agentStore'
import { submitChat, type ResponseUpdate } from '@/lib/chat'
import {
  type ConversationStep,
  createStepFromStatus,
  completeLastStep,
  addToolDataToStep,
} from '@/pages/Agents/ConversationStepTracker'
import type { Lang } from '@/i18n'

export interface SessionExecutionState {
  /** Accumulated streaming response text */
  response: string
  /** Live conversation steps (tool calls, thinking, etc.) */
  conversationSteps: ConversationStep[]
  /** Whether the LLM pipeline is currently running */
  isSending: boolean
}

/**
 * Hook that detects when a session is in 'starting' state and kicks off
 * the appropriate LLM pipeline (conversation or task orchestration).
 *
 * `submitChat` already dispatches to the orchestrator when agent.id === 'devs',
 * so we don't need separate pipeline logic here.
 *
 * Returns live streaming state for the SessionTimeline to render.
 */
export function useSessionExecution(
  session: Session | undefined,
  lang: Lang,
  t: any,
): SessionExecutionState {
  const { updateSession } = useSessionStore()
  // Guard against running the pipeline more than once per session
  const executingRef = useRef<string | null>(null)

  // Live streaming state
  const [response, setResponse] = useState('')
  const [conversationSteps, setConversationSteps] = useState<
    ConversationStep[]
  >([])
  const [isSending, setIsSending] = useState(false)

  const execute = useCallback(
    async (s: Session) => {
      // Resolve the primary agent
      let agent: Agent | undefined | null = getAgentById(s.primaryAgentId)
      if (!agent) {
        agent = await getAgentByIdAsync(s.primaryAgentId)
      }
      if (!agent) {
        await updateSession(s.id, { status: 'failed' })
        return
      }

      // Transition to 'running'
      await updateSession(s.id, { status: 'running' })

      // Initialize streaming state
      setIsSending(true)
      setResponse('')
      setConversationSteps([
        createStepFromStatus({ icon: 'Sparks', i18nKey: 'Thinking…' }),
      ])

      const controller = new AbortController()

      // Retrieve any skill / connector mentions stored on the session
      const activatedSkills = s.mentionedSkills
        ? s.mentionedSkills.map((name) => ({ name, skillMdContent: '' }))
        : undefined
      const activatedConnectors = s.mentionedConnectors
        ? s.mentionedConnectors.map((name) => ({
            name,
            provider: '',
          }))
        : undefined

      // Track whether we've already linked the conversation to this session
      let conversationLinked = false

      /** Link the conversation to the session on the first callback */
      const linkConversation = () => {
        if (conversationLinked) return
        const { currentConversation } = useConversationStore.getState()
        if (currentConversation) {
          conversationLinked = true
          updateSession(s.id, { conversationId: currentConversation.id })
        }
      }

      try {
        const result = await submitChat({
          prompt: s.prompt,
          agent,
          conversationMessages: [],
          includeHistory: false,
          attachments: s.attachments,
          activatedSkills,
          activatedConnectors,
          lang,
          t,
          signal: controller.signal,
          onResponseUpdate: (update: ResponseUpdate) => {
            // Link the conversation as soon as the first update arrives
            linkConversation()

            if (update.type === 'content') {
              setResponse(update.content)
              // Mark previous running step as completed when content arrives
              setConversationSteps((prev) => completeLastStep(prev))
            } else if (update.type === 'tool_results') {
              // Attach tool I/O data to the last running step
              setConversationSteps((prev) =>
                addToolDataToStep(prev, update.toolCalls),
              )
            } else {
              // Complete previous running step before adding new one
              setConversationSteps((prev) => {
                const completed = completeLastStep(prev)
                return [...completed, createStepFromStatus(update.status)]
              })
            }
          },
          onPromptClear: () => {
            // No-op — prompt already consumed
          },
        })

        // Ensure conversation is linked even if no onResponseUpdate fired
        linkConversation()

        // For the devs orchestrator, link the main task to the session.
        const finalUpdates: Partial<Session> = {
          status: result.success ? 'completed' : 'failed',
          completedAt: new Date().toISOString(),
        }

        const { currentConversation } = useConversationStore.getState()
        if (currentConversation?.workflowId) {
          const workflowTasks = useTaskStore
            .getState()
            .getTasksByWorkflow(currentConversation.workflowId)
          const mainTask = workflowTasks.find((t) => !t.parentTaskId)
          if (mainTask) {
            finalUpdates.taskId = mainTask.id
          }
        }

        await updateSession(s.id, finalUpdates)
      } catch (error) {
        console.error('Session execution failed:', error)
        await updateSession(s.id, { status: 'failed' })
      } finally {
        // Clear streaming state
        setIsSending(false)
        setResponse('')
        setConversationSteps([])
      }
    },
    [lang, t, updateSession],
  )

  useEffect(() => {
    if (!session) return
    if (session.status !== 'starting') return
    if (executingRef.current === session.id) return

    executingRef.current = session.id
    execute(session)
  }, [session, execute])

  return { response, conversationSteps, isSending }
}
