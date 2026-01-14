import { LLMService, LLMMessage, ToolDefinition, ToolCall } from '@/lib/llm'
import { CredentialService } from '@/lib/credential-service'
import { useConversationStore } from '@/stores/conversationStore'
import { getDefaultAgent } from '@/stores/agentStore'
import { buildPinnedContextForChat } from '@/stores/pinnedMessageStore'
import { TraceService } from '@/features/traces/trace-service'
import { ModelInfo } from '@/features/traces/types'
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
  defaultExecutor,
  registerKnowledgeTools,
  areKnowledgeToolsRegistered,
  registerMathTools,
  areMathToolsRegistered,
  registerCodeTools,
  areCodeToolsRegistered,
} from '@/lib/tool-executor'
import { KNOWLEDGE_TOOL_DEFINITIONS } from '@/lib/knowledge-tools'
import { MATH_TOOL_DEFINITIONS } from '@/lib/math-tools'
import { CODE_TOOL_DEFINITIONS } from '@/lib/code-tools'

// ============================================================================
// Tool Helpers
// ============================================================================

/** Maximum iterations for tool calling loop to prevent infinite loops */
const MAX_TOOL_ITERATIONS = 10

/**
 * Get all knowledge tool definitions.
 * Tools are universal: all agents have access to all knowledge tools by default.
 * This ensures pre-existing agents and new agents alike can use tools.
 */
function getAgentToolDefinitions(_agent: Agent): ToolDefinition[] {
  // Return all knowledge, math, and code tools - they are universally available to all agents
  return [
    ...Object.values(KNOWLEDGE_TOOL_DEFINITIONS),
    ...Object.values(MATH_TOOL_DEFINITIONS),
    ...Object.values(CODE_TOOL_DEFINITIONS),
  ]
}

/**
 * Parse tool calls from streaming response.
 * Tool calls are emitted as __TOOL_CALLS__[...json...] at the end of stream.
 */
function parseToolCallsFromStream(response: string): {
  content: string
  toolCalls: ToolCall[]
} {
  const toolCallMarker = '__TOOL_CALLS__'
  const markerIndex = response.indexOf(toolCallMarker)

  if (markerIndex === -1) {
    return { content: response, toolCalls: [] }
  }

  const content = response.substring(0, markerIndex)
  const toolCallsJson = response.substring(markerIndex + toolCallMarker.length)

  try {
    const toolCalls = JSON.parse(toolCallsJson) as ToolCall[]
    return { content, toolCalls }
  } catch (error) {
    console.error('Failed to parse tool calls from stream:', error)
    return { content: response, toolCalls: [] }
  }
}

/**
 * Execute tool calls and return formatted results.
 * Creates a trace for observability with individual spans per tool.
 * Returns both results and the trace ID for tracking.
 */
async function executeToolCalls(
  toolCalls: ToolCall[],
  context: {
    agentId?: string
    conversationId?: string
    taskId?: string
    primaryModel?: ModelInfo
  },
): Promise<{
  results: Array<{ toolCallId: string; result: string }>
  traceId: string
}> {
  // Ensure knowledge tools are registered
  if (!areKnowledgeToolsRegistered()) {
    registerKnowledgeTools()
  }

  // Ensure math tools are registered
  if (!areMathToolsRegistered()) {
    registerMathTools()
  }

  // Ensure code tools are registered
  if (!areCodeToolsRegistered()) {
    registerCodeTools()
  }

  // Create a trace for the tool execution batch
  const trace = TraceService.startTrace({
    name: `Tools: ${toolCalls.map((tc) => tc.function.name).join(', ')}`,
    agentId: context.agentId,
    conversationId: context.conversationId,
    taskId: context.taskId,
    primaryModel: context.primaryModel,
    input: toolCalls.map((tc) => tc.function.arguments).join('\n'),
  })

  const results: Array<{ toolCallId: string; result: string }> = []

  try {
    for (const toolCall of toolCalls) {
      const result = await defaultExecutor.execute(toolCall, {
        context: {
          agentId: context.agentId,
          conversationId: context.conversationId,
          taskId: context.taskId,
        },
        traceId: trace.id,
      })

      results.push({
        toolCallId: toolCall.id,
        result: defaultExecutor.formatResultForLLM(result),
      })
    }

    // End trace with success
    await TraceService.endTrace(trace.id, {
      status: 'completed',
      output: results.map((r) => r.result).join('\n'),
    })
  } catch (error) {
    // End trace with error
    await TraceService.endTrace(trace.id, {
      status: 'error',
      statusMessage: error instanceof Error ? error.message : String(error),
    })
    throw error
  }

  return { results, traceId: trace.id }
}

// ============================================================================
// Chat Submit Options
// ============================================================================

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

    // Get tool definitions from agent's configured tools
    const toolDefinitions = getAgentToolDefinitions(agent)
    const hasTools = toolDefinitions.length > 0

    // Build config with tools if the agent has any enabled
    const llmConfig = hasTools
      ? { ...config, tools: toolDefinitions, tool_choice: 'auto' as const }
      : config

    // Call the LLM service with streaming and handle tool calls
    let response = ''
    let finalContent = ''
    let toolIterations = 0
    const workingMessages = [...messages]

    // Tool execution loop - continues until we get a response without tool calls
    while (toolIterations < MAX_TOOL_ITERATIONS) {
      toolIterations++
      response = ''

      for await (const chunk of LLMService.streamChat(
        workingMessages,
        llmConfig,
        {
          agentId: agent.id,
          conversationId: conversation.id,
        },
      )) {
        console.debug('◁', chunk)
        response += chunk

        // Only show content to user, not the tool call markers
        const { content } = parseToolCallsFromStream(response)
        onResponseUpdate(content)
      }

      // Parse the final response for tool calls
      const { content, toolCalls } = parseToolCallsFromStream(response)
      finalContent = content

      // If no tool calls, we're done
      if (toolCalls.length === 0) {
        console.log('✓ No tool calls, conversation complete')
        break
      }

      console.log(
        `🔧 Executing ${toolCalls.length} tool call(s):`,
        toolCalls.map((tc) => tc.function.name),
      )

      // Show user that tools are being executed
      onResponseUpdate(finalContent + '\n\n🔧 *Searching knowledge base...*')

      // Execute the tool calls
      const { results: toolResults } = await executeToolCalls(toolCalls, {
        agentId: agent.id,
        conversationId: conversation.id,
        primaryModel: {
          provider: config.provider,
          model: config.model,
          temperature: config.temperature,
          maxTokens: config.maxTokens,
        },
      })

      console.log('🔧 Tool results:', toolResults)

      // Add assistant message with tool calls to the conversation
      // Note: We need to format this as the LLM expects for tool results
      workingMessages.push({
        role: 'assistant',
        content: finalContent || '',
      })

      // Add tool results as user message (this is a simplification -
      // proper tool result format would require extending LLMMessage)
      const toolResultsText = toolResults
        .map((r) => `[Tool Result for ${r.toolCallId}]:\n${r.result}`)
        .join('\n\n')

      workingMessages.push({
        role: 'user',
        content: `Here are the results from the tools you requested:\n\n${toolResultsText}\n\nPlease use this information to answer my original question.`,
      })

      // Update display to show we're continuing
      onResponseUpdate(
        finalContent + '\n\n📚 *Found relevant information, processing...*',
      )
    }

    if (toolIterations >= MAX_TOOL_ITERATIONS) {
      console.warn('⚠️ Max tool iterations reached')
    }

    const timeend = Date.now()
    console.log('◀', { finalContent })
    console.log(`LLM response time: ${(timeend - timestart) / 1000}s`)

    // Query all traces created during this message generation
    // This captures both LLM traces and tool traces
    const allTracesForMessage = await TraceService.getTraces({
      conversationId: conversation.id,
      startDate: new Date(timestart),
      endDate: new Date(timeend + 1000), // Add 1s buffer for async completion
    })
    const allTraceIds = allTracesForMessage.map((t) => t.id)

    // Save assistant response to conversation (with all trace IDs from this generation)
    await addMessage(conversation.id, {
      role: 'assistant',
      content: finalContent,
      agentId: agent.id,
      ...(allTraceIds.length > 0 && { traceIds: allTraceIds }),
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
