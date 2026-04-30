import { useCallback, useEffect, useRef, useState } from 'react'
import type { Agent, Session, SessionTurn } from '@/types'
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
 * Also watches for new pending turns (follow-up messages) and executes them
 * through the same pipeline with conversation history.
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
  const { updateSession, updateTurn } = useSessionStore()
  // Guard against running the pipeline more than once per session
  const executingRef = useRef<string | null>(null)
  // Guard against running multiple turns concurrently
  const executingTurnRef = useRef<string | null>(null)

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

      // Always start with a clean slate so a new conversation is created
      // instead of reusing the previous session's conversation.
      useConversationStore.getState().clearCurrentConversation()

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
          onConversationCreated: (conversationId: string) => {
            // Link the conversation to the session immediately so
            // useThreads never shows a duplicate standalone conversation.
            updateSession(s.id, { conversationId })
          },
          onResponseUpdate: (update: ResponseUpdate) => {
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

  /** Execute a follow-up turn within an existing session conversation. */
  const executeTurn = useCallback(
    async (s: Session, turn: SessionTurn) => {
      // Resolve agent for this turn
      let agent: Agent | undefined | null = getAgentById(turn.agentId)
      if (!agent) {
        agent = await getAgentByIdAsync(turn.agentId)
      }
      if (!agent) {
        await updateTurn(s.id, turn.id, { status: 'failed' })
        return
      }

      // Mark turn as running
      await updateTurn(s.id, turn.id, { status: 'running' })

      // Initialize streaming state
      setIsSending(true)
      setResponse('')
      setConversationSteps([
        createStepFromStatus({ icon: 'Sparks', i18nKey: 'Thinking…' }),
      ])

      const controller = new AbortController()

      // Load conversation history so the LLM has full context
      const { loadConversation } = useConversationStore.getState()
      let conversationMessages: import('@/types').Message[] = []
      if (s.conversationId) {
        const conv = await loadConversation(s.conversationId)
        if (conv?.messages) {
          // Include all non-system messages as history
          conversationMessages = conv.messages.filter(
            (m) => m.role !== 'system',
          )
        }
      }

      try {
        const result = await submitChat({
          prompt: turn.prompt,
          agent,
          conversationMessages,
          includeHistory: true,
          lang,
          t,
          signal: controller.signal,
          onResponseUpdate: (update: ResponseUpdate) => {
            if (update.type === 'content') {
              setResponse(update.content)
              setConversationSteps((prev) => completeLastStep(prev))
            } else if (update.type === 'tool_results') {
              setConversationSteps((prev) =>
                addToolDataToStep(prev, update.toolCalls),
              )
            } else {
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

        // Link task if the orchestrator produced one during this turn
        const turnUpdates: Partial<import('@/types').SessionTurn> = {
          status: result.success ? 'completed' : 'failed',
          completedAt: new Date().toISOString(),
        }
        const { currentConversation } = useConversationStore.getState()
        if (currentConversation?.workflowId) {
          const workflowTasks = useTaskStore
            .getState()
            .getTasksByWorkflow(currentConversation.workflowId)
          const mainTask = workflowTasks.find((wt) => !wt.parentTaskId)
          if (mainTask) {
            turnUpdates.taskId = mainTask.id
          }
        }
        await updateTurn(s.id, turn.id, turnUpdates)
      } catch (error) {
        console.error('Turn execution failed:', error)
        await updateTurn(s.id, turn.id, { status: 'failed' })
      } finally {
        executingTurnRef.current = null
        setIsSending(false)
        setResponse('')
        setConversationSteps([])
      }
    },
    [lang, t, updateTurn],
  )

  // Kick off initial session execution
  useEffect(() => {
    if (!session) return
    if (session.status !== 'starting') return
    if (executingRef.current === session.id) return

    executingRef.current = session.id
    execute(session)
  }, [session, execute])

  // Watch for new pending turns and execute them
  useEffect(() => {
    if (!session) return
    // Don't process turns while the initial prompt is still executing
    if (session.status === 'starting' || session.status === 'running') return
    // Don't start a new turn if one is already executing
    if (executingTurnRef.current) return

    const pendingTurn = session.turns.find((t) => t.status === 'pending')
    if (!pendingTurn) return

    executingTurnRef.current = pendingTurn.id
    executeTurn(session, pendingTurn)
  }, [session, executeTurn])

  return { response, conversationSteps, isSending }
}
