import { LLMService, LLMMessage } from '@/lib/llm'
import { CredentialService } from '@/lib/credential-service'
import { useConversationStore } from '@/stores/conversationStore'
import { getDefaultAgent } from '@/stores/agentStore'
import { buildPinnedContextForChat } from '@/stores/pinnedMessageStore'
import { WorkflowOrchestrator } from '@/lib/orchestrator'
import { Agent, Message } from '@/types'
import { errorToast } from '@/lib/toast'
import {
  getKnowledgeAttachments,
  buildAgentInstructions,
} from '@/lib/agent-knowledge'
import { buildMemoryContextForChat } from '@/lib/memory-learning-service'
import { Lang, languages } from '@/i18n'
import {
  AgentLoop,
  shouldUseAgentLoop,
  type AgentLoopState,
} from '@/lib/agent-loop'
import { toolRegistry } from '@/lib/tools'
// TaskAnalyzer reserved for future use in agent loop complexity detection

export interface ChatSubmitOptions {
  prompt: string
  agent?: Agent | null
  conversationMessages?: Message[]
  includeHistory?: boolean
  clearResponseAfterSubmit?: boolean
  attachments?: Array<{
    name: string
    type: string
    size: number
    data: string // base64 encoded
  }>
  lang: Lang
  t: any
  onResponseUpdate: (response: string) => void
  onPromptClear: () => void
  onResponseClear?: () => void
  /** Enable agentic loop for complex queries with tool calling (default: true) */
  enableAgentLoop?: boolean
  /** Callback for agent loop state updates */
  onAgentLoopUpdate?: (state: AgentLoopState) => void
}

export interface ChatSubmitResult {
  success: boolean
  error?: string
}

export const submitChat = async (
  options: ChatSubmitOptions,
): Promise<ChatSubmitResult> => {
  const {
    prompt,
    agent: selectedAgent,
    conversationMessages = [],
    includeHistory = false,
    clearResponseAfterSubmit = false,
    attachments = [],
    lang,
    t,
    onResponseUpdate,
    onPromptClear,
    onResponseClear,
    enableAgentLoop = true,
    onAgentLoopUpdate,
  } = options

  if (!prompt.trim()) {
    return { success: false, error: 'Empty prompt' }
  }

  try {
    // Get the active LLM configuration
    const config = await CredentialService.getActiveConfig()
    if (!config) {
      errorToast(
        t(
          'No LLM provider configured. Please [configure one in Settings]({path}).',
          {
            path: '/settings',
          },
          { allowJSX: true },
        ),
      )
      return { success: false, error: 'No LLM provider configured' }
    }

    const agent = selectedAgent || getDefaultAgent()

    // Validate agent for agent-specific pages
    if (selectedAgent === null) {
      return { success: false, error: 'No agent selected' }
    }

    // Check if this is the DEVS orchestrator agent - trigger autonomous orchestration
    if (agent.id === 'devs') {
      try {
        // First, save the user prompt to conversation before orchestration
        const { currentConversation, createConversation, addMessage } =
          useConversationStore.getState()

        let conversation = currentConversation
        if (
          !conversation ||
          (selectedAgent && conversation.agentId !== selectedAgent.id)
        ) {
          conversation = await createConversation(agent.id, 'orchestration')
        }

        // Save user message to conversation
        await addMessage(conversation.id, { role: 'user', content: prompt })

        onResponseUpdate('🚀 Starting autonomous task orchestration...\n\n')

        const result = await WorkflowOrchestrator.orchestrateTask(prompt)

        const orchestrationReport = [
          `# Task Orchestration Complete\n`,
          `✅ **Status**: ${result.success ? 'Success' : 'Failed'}`,
          `🆔 **Workflow ID**: ${result.workflowId}`,
          `📋 **Main Task**: ${result.mainTaskId}`,
          result.subTaskIds.length > 0
            ? `🔧 **Sub-tasks**: ${result.subTaskIds.length} tasks`
            : '',
          `📄 **Artifacts Generated**: ${result.artifacts.length}\n`,
          result.artifacts.length > 0
            ? [
                `## Generated Artifacts\n`,
                ...result.artifacts.map(
                  (artifact) =>
                    `### ${artifact.title}\n**Type**: ${artifact.type} | **Status**: ${artifact.status}\n**Description**: ${artifact.description}\n\n\`\`\`${artifact.format}\n${artifact.content}\n\`\`\``,
                ),
              ].join('\n')
            : '',
          result.errors?.length
            ? [
                `## Issues Encountered\n`,
                ...result.errors.map((error) => `⚠️ ${error}`),
              ].join('\n')
            : '',
        ]
          .filter(Boolean)
          .join('\n')

        onResponseUpdate(orchestrationReport)

        // Save the orchestration report as assistant message
        await addMessage(conversation.id, {
          role: 'assistant',
          content: orchestrationReport,
          agentId: agent.id,
        })

        // Clear the prompt after successful orchestration
        onPromptClear()

        return { success: result.success }
      } catch (error) {
        console.error('Orchestration failed:', error)
        const errorMessage = `❌ **Orchestration Failed**\n\n${error instanceof Error ? error.message : 'Unknown error occurred during task orchestration.'}`
        onResponseUpdate(errorMessage)

        // Save error message to conversation if conversation exists
        try {
          const { currentConversation, addMessage } =
            useConversationStore.getState()
          if (currentConversation) {
            await addMessage(currentConversation.id, {
              role: 'assistant',
              content: errorMessage,
              agentId: agent.id,
            })
          }
        } catch (saveError) {
          console.warn(
            'Failed to save error message to conversation:',
            saveError,
          )
        }

        return { success: false, error: 'Orchestration failed' }
      }
    }

    // Check if we should use the agent loop for this query
    const tools = toolRegistry.getToolDefinitions()
    console.log('▶', 'Available tools for agent loop:', tools)

    // Use fast local heuristic to determine if agent loop should be used
    const hasTools = tools.length > 0
    const useAgentLoopForQuery =
      enableAgentLoop && shouldUseAgentLoop(prompt, hasTools)
    console.log(
      '▶',
      'Agent loop decision:',
      useAgentLoopForQuery
        ? 'complex (use agent loop)'
        : 'simple (direct chat)',
    )

    if (useAgentLoopForQuery) {
      return executeAgentLoopChat({
        prompt,
        agent,
        lang,
        t,
        onResponseUpdate,
        onPromptClear,
        onAgentLoopUpdate,
      })
    }

    const { currentConversation, createConversation, addMessage } =
      useConversationStore.getState()

    // Create or continue conversation
    let conversation = currentConversation
    let isNewConversation = false
    if (
      !conversation ||
      (selectedAgent && conversation.agentId !== selectedAgent.id)
    ) {
      conversation = await createConversation(agent.id, 'default')
      isNewConversation = true
    }

    // Get knowledge attachments for the agent
    const knowledgeAttachments = await getKnowledgeAttachments(
      agent.knowledgeItemIds,
    )

    // Build instructions with knowledge context reference
    const baseInstructions =
      agent.instructions || 'You are a helpful assistant.'
    const enhancedInstructions = await buildAgentInstructions(
      baseInstructions,
      agent.knowledgeItemIds,
    )

    // Get relevant memories for this agent and prompt
    const memoryContext = await buildMemoryContextForChat(agent.id, prompt)

    // Get relevant pinned messages from previous conversations
    const pinnedContext = await buildPinnedContextForChat(
      agent.id,
      conversation.id,
      prompt,
    )

    const instructions = [
      enhancedInstructions,
      // Inject memory context if available
      memoryContext,
      // Inject pinned messages context if available
      pinnedContext,
      `ALWAYS respond in ${languages[lang]} as this is the user's language.`,
    ]
      .filter(Boolean)
      .join('\n\n')

    // Save the system prompt ONLY for new conversations (for transparency)
    if (isNewConversation) {
      await addMessage(conversation.id, {
        role: 'system',
        content: instructions,
      })
    }

    // Convert user-provided attachments to MessageAttachment format
    const userMessageAttachments = attachments.map((file) => {
      let type: 'image' | 'document' | 'text' = 'document'
      if (file.type.startsWith('image/')) {
        type = 'image'
      } else if (file.type.startsWith('text/')) {
        type = 'text'
      }

      return {
        type,
        name: file.name,
        data: file.data,
        mimeType: file.type,
        size: file.size,
      }
    })

    // Save user message to conversation (with attachments for persistence)
    await addMessage(conversation.id, {
      role: 'user',
      content: prompt,
      attachments:
        userMessageAttachments.length > 0 ? userMessageAttachments : undefined,
    })

    // Prepare messages for the LLM
    const messages: LLMMessage[] = [
      {
        role: 'system',
        content: instructions,
      },
    ]

    // Include conversation history if requested
    if (includeHistory && conversationMessages.length > 0) {
      messages.push(
        ...conversationMessages.map((msg) => ({
          role: msg.role,
          content: msg.content,
          // Include attachments from previous messages so LLM maintains context
          attachments: msg.attachments?.map((att) => ({
            type: att.type,
            name: att.name,
            data: att.data,
            mimeType: att.mimeType,
          })),
        })),
      )
    }

    // Convert attachments to LLMMessageAttachment format (without size field)
    const userAttachments = userMessageAttachments.map(
      ({ size: _, ...rest }) => rest,
    )

    // Merge knowledge attachments with user-provided attachments
    const allAttachments = [...knowledgeAttachments, ...userAttachments]

    messages.push({
      role: 'user',
      content: prompt,
      attachments: allAttachments.length > 0 ? allAttachments : undefined,
    })
    console.log('▶', 'messages:', messages)
    console.log('▶', 'prompt:', prompt)
    const timestart = Date.now()

    // Call the LLM service with streaming
    let response = ''

    for await (const chunk of LLMService.streamChat(messages, config)) {
      console.debug('◁', chunk)
      response += chunk
      onResponseUpdate(response)
    }
    const timeend = Date.now()
    console.log('◀', { response })
    console.log(`LLM response time: ${(timeend - timestart) / 1000}s`)

    // Save assistant response to conversation
    await addMessage(conversation.id, {
      role: 'assistant',
      content: response,
      agentId: agent.id,
    })

    // Clear the prompt after successful submission
    onPromptClear()

    // Clear response if requested (for agent pages)
    if (clearResponseAfterSubmit && onResponseClear) {
      onResponseClear()
    }

    // NOTE: Automatic memory learning has been disabled
    // Users can manually trigger learning from individual messages using the "Learn" button
    // This gives users full control over what gets learned and when
    //
    // Previous auto-trigger code (now disabled):
    // triggerMemoryLearning(
    //   conversation.id,
    //   agent.id,
    //   lang,
    //   onMemoryLearningComplete,
    // ).catch((err) => {
    //   console.warn('Memory learning failed (non-critical):', err)
    // })

    return { success: true }
  } catch (err) {
    console.error('Error calling LLM:', err)
    errorToast(
      t('Failed to get response from LLM. Please try again later.'),
      err,
    )
    return { success: false, error: 'LLM call failed' }
  }
}

// =============================================================================
// Agent Loop Chat Execution
// =============================================================================

interface AgentLoopChatOptions {
  prompt: string
  agent: Agent
  lang: Lang
  t: unknown
  onResponseUpdate: (response: string) => void
  onPromptClear: () => void
  onAgentLoopUpdate?: (state: AgentLoopState) => void
}

/**
 * Execute chat using the agent loop for complex queries with tool calling
 */
async function executeAgentLoopChat(
  options: AgentLoopChatOptions,
): Promise<ChatSubmitResult> {
  const {
    prompt,
    agent,
    // lang and t reserved for future i18n support in agent loop
    onResponseUpdate,
    onPromptClear,
    onAgentLoopUpdate,
  } = options

  try {
    const { currentConversation, createConversation, addMessage } =
      useConversationStore.getState()

    // Create or continue conversation
    let conversation = currentConversation
    if (!conversation || conversation.agentId !== agent.id) {
      conversation = await createConversation(agent.id, 'agent-loop')
    }

    // Save user message
    await addMessage(conversation.id, { role: 'user', content: prompt })

    // Get available tools
    const tools = toolRegistry.getToolDefinitions()

    // Create the tool executor
    const toolExecutor = toolRegistry.createExecutor({
      agentId: agent.id,
      conversationId: conversation.id,
    })

    // Create and run the agent loop
    const loop = new AgentLoop(agent, prompt, {
      maxSteps: 10,
      tools,
      toolExecutor,
      showReasoning: true,
      onUpdate: (state) => {
        onAgentLoopUpdate?.(state)
        // Stream reasoning to the user
        if (state.steps.length > 0) {
          const output = formatAgentLoopProgress(state)
          onResponseUpdate(output)
        }
      },
      onStepComplete: (step) => {
        console.log(
          `[AgentLoop] Step ${step.stepNumber} complete:`,
          step.plan.decision.type,
        )
      },
    })

    // Run the loop
    const finalState = await loop.run()

    // Format final response
    let finalResponse = ''
    if (finalState.result?.type === 'answer' && finalState.result.answer) {
      finalResponse = finalState.result.answer
    } else if (finalState.error) {
      finalResponse = `❌ **Agent Loop Error**\n\n${finalState.error}`
    } else {
      finalResponse = formatAgentLoopProgress(finalState)
    }

    onResponseUpdate(finalResponse)

    // Save assistant response
    await addMessage(conversation.id, {
      role: 'assistant',
      content: finalResponse,
      agentId: agent.id,
    })

    onPromptClear()

    return { success: finalState.status === 'completed' }
  } catch (error) {
    console.error('Agent loop execution failed:', error)
    const errorMessage = `❌ **Agent Loop Failed**\n\n${error instanceof Error ? error.message : 'Unknown error'}`
    onResponseUpdate(errorMessage)
    return { success: false, error: 'Agent loop failed' }
  }
}

/**
 * Format agent loop progress for display
 */
function formatAgentLoopProgress(state: AgentLoopState): string {
  const lines: string[] = []

  lines.push(`## Agent Loop Progress`)
  lines.push(`**Status:** ${state.status}`)
  lines.push(`**Steps:** ${state.currentStep}/${state.maxSteps}`)

  // Show usage info if available
  if (state.usage.llmCalls > 0) {
    lines.push(
      `**LLM Calls:** ${state.usage.llmCalls} | **Tokens:** ${state.usage.totalTokens} | **Est. Cost:** $${state.usage.estimatedCost.toFixed(4)}`,
    )
  }
  lines.push('')

  for (const step of state.steps) {
    const { plan, actions, observations, synthesis } = step

    // Show plan phase
    lines.push(`### Step ${step.stepNumber}: ${plan.decision.type}`)
    if (plan.reasoning) {
      const reasoningPreview =
        plan.reasoning.length > 200
          ? `${plan.reasoning.substring(0, 200)}...`
          : plan.reasoning
      lines.push(`> ${reasoningPreview}`)
    }

    // Show actions (tool calls)
    if (actions?.toolCalls?.length) {
      lines.push(`**Tools called:**`)
      for (const tc of actions.toolCalls) {
        lines.push(`- \`${tc.name}\``)
      }
    }

    // Show observations
    if (observations?.length) {
      for (const obs of observations) {
        const icon = obs.success ? '✓' : '✗'
        const contentPreview =
          obs.content.length > 100
            ? `${obs.content.substring(0, 100)}...`
            : obs.content
        lines.push(`${icon} **${obs.source}:** ${contentPreview}`)
        if (obs.duration) {
          lines.push(`  _(${obs.duration}ms)_`)
        }
      }
    }

    // Show synthesis hint
    if (synthesis?.nextStepHint) {
      lines.push(`_Next: ${synthesis.nextStepHint}_`)
    }

    lines.push('')
  }

  if (state.result?.type === 'answer' && state.result.answer) {
    lines.push('---')
    lines.push('## Final Answer')
    lines.push(state.result.answer)
  }

  return lines.join('\n')
}
