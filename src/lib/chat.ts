import { LLMService, LLMMessage, ToolDefinition, ToolCall } from '@/lib/llm'
import type { GroundingMetadata } from '@/lib/llm/types'
import { CredentialService } from '@/lib/credential-service'
import { useConversationStore } from '@/stores/conversationStore'
import { getDefaultAgent } from '@/stores/agentStore'
import { buildPinnedContextForChat } from '@/stores/pinnedMessageStore'
import { TraceService } from '@/features/traces/trace-service'
import { ModelInfo } from '@/features/traces/types'
import { WorkflowOrchestrator } from '@/lib/orchestrator'
import { Agent, Message } from '@/types'
import { notifyError } from '@/features/notifications'
import type { IconName } from '@/lib/types'

// ============================================================================
// Response Update Types
// ============================================================================

/** A structured status update with icon and i18n key */
export interface ResponseStatus {
  /** Icon name from iconoir-react */
  icon: IconName
  /** i18n translation key */
  i18nKey: string
  /** Optional variables for i18n interpolation */
  vars?: Record<string, string | number>
}

/** Response update can be either plain content or a status update */
export type ResponseUpdate =
  | { type: 'content'; content: string }
  | { type: 'status'; status: ResponseStatus }
import {
  getKnowledgeAttachments,
  buildAgentInstructions,
  CITATION_INSTRUCTIONS,
} from '@/lib/agent-knowledge'
import {
  buildMemoryContextForChat,
  learnFromMessage,
} from '@/lib/memory-learning-service'
import { userSettings } from '@/stores/userStore'
import { Lang, languages } from '@/i18n'
import {
  defaultExecutor,
  registerKnowledgeTools,
  areKnowledgeToolsRegistered,
  registerMathTools,
  areMathToolsRegistered,
  registerCodeTools,
  areCodeToolsRegistered,
  registerConnectorTools,
  areConnectorToolsRegistered,
  registerPresentationTools,
  arePresentationToolsRegistered,
  registerResearchTools,
  areResearchToolsRegistered,
  registerSkillTools,
  areSkillToolsRegistered,
} from '@/lib/tool-executor'
import { KNOWLEDGE_TOOL_DEFINITIONS } from '@/lib/knowledge-tools'
import { MATH_TOOL_DEFINITIONS } from '@/lib/math-tools'
import { CODE_TOOL_DEFINITIONS } from '@/lib/code-tools'
import { PRESENTATION_TOOL_DEFINITIONS } from '@/lib/presentation-tools'
import {
  WIKIPEDIA_SEARCH_TOOL_DEFINITION,
  WIKIPEDIA_ARTICLE_TOOL_DEFINITION,
  WIKIDATA_SEARCH_TOOL_DEFINITION,
  WIKIDATA_ENTITY_TOOL_DEFINITION,
  WIKIDATA_SPARQL_TOOL_DEFINITION,
  ARXIV_SEARCH_TOOL_DEFINITION,
  ARXIV_PAPER_TOOL_DEFINITION,
  SKILL_TOOL_DEFINITIONS,
} from '@/tools/plugins'
import { getToolDefinitionsForProvider } from '@/features/connectors/tools'
import { connectors as connectorsMap } from '@/lib/yjs/maps'
import type { Connector } from '@/features/connectors/types'
import { getEnabledSkills } from '@/stores/skillStore'

// ============================================================================
// Tool Helpers
// ============================================================================

/** Maximum iterations for tool calling loop to prevent infinite loops */
const MAX_TOOL_ITERATIONS = 10

/** Map tool names to i18n keys for status messages */
const TOOL_STATUS_I18N_KEYS: Record<string, string> = {
  // Knowledge tools
  search_knowledge: 'Searching knowledge base',
  read_document: 'Reading document',
  list_documents: 'Browsing documents',
  get_document_summary: 'Summarizing document',
  // Math & code tools
  calculate: 'Calculating',
  execute: 'Running code',
  // Gmail tools
  gmail_search: 'Searching Gmail',
  gmail_read: 'Reading email',
  gmail_list_labels: 'Listing Gmail labels',
  // Google Drive tools
  drive_search: 'Searching Google Drive',
  drive_read: 'Reading file from Drive',
  drive_list: 'Listing Drive files',
  // Google Calendar tools
  calendar_list_events: 'Listing calendar events',
  calendar_get_event: 'Getting calendar event',
  calendar_search: 'Searching calendar',
  // Google Tasks tools
  tasks_list: 'Listing tasks',
  tasks_get: 'Getting task details',
  tasks_list_tasklists: 'Listing task lists',
  // Notion tools
  notion_search: 'Searching Notion',
  notion_read_page: 'Reading Notion page',
  notion_query_database: 'Querying Notion database',
  // Skill tools
  activate_skill: 'Activating skill',
  read_skill_file: 'Reading skill file',
  run_skill_script: 'Running skill script',
}

/**
 * Get i18n key for tool status message.
 * Returns specific tool i18n key when a single tool type is used,
 * or generic 'Using tools…' for multiple different tools.
 * @param toolCalls - The tool calls being executed
 */
function getToolStatusI18nKey(toolCalls: ToolCall[]): string {
  if (toolCalls.length === 1) {
    const toolName = toolCalls[0].function.name
    const i18nKey = TOOL_STATUS_I18N_KEYS[toolName]
    return i18nKey
      ? `${i18nKey}…`
      : `Using tool: ${toolName.replace(/_/g, ' ')}…`
  }

  // Multiple tools - show unique tool types
  const uniqueToolNames = [...new Set(toolCalls.map((tc) => tc.function.name))]
  if (uniqueToolNames.length === 1) {
    const toolName = uniqueToolNames[0]
    const i18nKey = TOOL_STATUS_I18N_KEYS[toolName]
    return i18nKey
      ? `${i18nKey}…`
      : `Using tool: ${toolName.replace(/_/g, ' ')}…`
  }

  // Multiple different tools - give a summary
  return 'Using tools…'
}

/**
 * Get all knowledge tool definitions.
 * Tools are universal: all agents have access to all knowledge tools by default.
 * This ensures pre-existing agents and new agents alike can use tools.
 */
function getAgentToolDefinitions(_agent: Agent): ToolDefinition[] {
  // Return all knowledge, math, code, presentation, research, and skill tools - they are universally available to all agents
  const tools: ToolDefinition[] = [
    ...Object.values(KNOWLEDGE_TOOL_DEFINITIONS),
    ...Object.values(MATH_TOOL_DEFINITIONS),
    ...Object.values(CODE_TOOL_DEFINITIONS),
    ...Object.values(PRESENTATION_TOOL_DEFINITIONS),
    // Research tools
    WIKIPEDIA_SEARCH_TOOL_DEFINITION,
    WIKIPEDIA_ARTICLE_TOOL_DEFINITION,
    WIKIDATA_SEARCH_TOOL_DEFINITION,
    WIKIDATA_ENTITY_TOOL_DEFINITION,
    WIKIDATA_SPARQL_TOOL_DEFINITION,
    ARXIV_SEARCH_TOOL_DEFINITION,
    ARXIV_PAPER_TOOL_DEFINITION,
  ]

  // Add skill tools only if there are enabled skills
  const enabledSkills = getEnabledSkills()
  if (enabledSkills.length > 0) {
    tools.push(...Object.values(SKILL_TOOL_DEFINITIONS))
  }

  return tools
}

/**
 * Get connector tool definitions based on active connectors.
 * Only includes tools for connectors that are connected and active.
 * Enhances tool descriptions with available connector IDs so the LLM knows which to use.
 */
async function getConnectorToolDefinitions(): Promise<ToolDefinition[]> {
  try {
    const connectors = Array.from(connectorsMap.values())
    console.log(
      '▶ connectors from Yjs:',
      connectors.map((c) => ({
        id: c.id,
        provider: c.provider,
        status: c.status,
      })),
    )
    const activeConnectors = connectors.filter((c) =>
      ['connected', 'syncing'].includes(c.status),
    )
    console.log('▶ active connectors:', activeConnectors.length)

    if (activeConnectors.length === 0) {
      return []
    }

    // Group active connectors by provider
    const connectorsByProvider = new Map<string, Connector[]>()
    for (const connector of activeConnectors) {
      const existing = connectorsByProvider.get(connector.provider) || []
      existing.push(connector)
      connectorsByProvider.set(connector.provider, existing)
    }

    // Get unique providers from active connectors
    const activeProviders = [...connectorsByProvider.keys()]
    console.log('▶ active providers:', activeProviders)

    // Get tools for each active provider, enhancing with connector IDs
    const tools: ToolDefinition[] = []
    for (const provider of activeProviders) {
      const providerConnectors = connectorsByProvider.get(provider) || []
      const providerTools = getToolDefinitionsForProvider(provider)
      console.log(`▶ tools for ${provider}:`, providerTools.length)

      // Enhance each tool with available connector IDs for this provider
      const enhancedTools = providerTools.map((tool) => {
        const connectorInfo = providerConnectors
          .map(
            (c) =>
              `"${c.id}"${c.accountEmail ? ` (${c.accountEmail})` : c.name ? ` (${c.name})` : ''}`,
          )
          .join(', ')

        // Deep clone the tool definition to avoid mutating the original
        const enhancedTool: ToolDefinition = JSON.parse(JSON.stringify(tool))

        // Enhance the connector_id parameter description with available IDs
        if (enhancedTool.function.parameters?.properties?.connector_id) {
          const originalDesc =
            enhancedTool.function.parameters.properties.connector_id
              .description || ''
          enhancedTool.function.parameters.properties.connector_id.description = `${originalDesc}. Available connector IDs: ${connectorInfo}`
        }

        return enhancedTool
      })

      tools.push(...enhancedTools)
    }

    return tools
  } catch (error) {
    console.error('Failed to get connector tool definitions:', error)
    return []
  }
}

/**
 * Parse tool calls and grounding metadata from streaming response.
 * Tool calls are emitted as __TOOL_CALLS__[...json...] at the end of stream.
 * Grounding metadata is emitted as __GROUNDING_METADATA__{...json...} at the end of stream.
 */
function parseToolCallsFromStream(response: string): {
  content: string
  toolCalls: ToolCall[]
  groundingMetadata?: GroundingMetadata
} {
  let content = response
  let toolCalls: ToolCall[] = []
  let groundingMetadata: GroundingMetadata | undefined

  // Extract grounding metadata (appears at end of stream from Google provider)
  const groundingMarker = '__GROUNDING_METADATA__'
  const groundingIndex = content.indexOf(groundingMarker)
  if (groundingIndex !== -1) {
    const groundingJson = content.substring(
      groundingIndex + groundingMarker.length,
    )
    content = content.substring(0, groundingIndex)
    try {
      groundingMetadata = JSON.parse(groundingJson) as GroundingMetadata
    } catch (error) {
      console.error('Failed to parse grounding metadata from stream:', error)
    }
  }

  // Extract tool calls
  const toolCallMarker = '__TOOL_CALLS__'
  const markerIndex = content.indexOf(toolCallMarker)
  if (markerIndex !== -1) {
    const toolCallsJson = content.substring(markerIndex + toolCallMarker.length)
    content = content.substring(0, markerIndex)
    try {
      toolCalls = JSON.parse(toolCallsJson) as ToolCall[]
    } catch (error) {
      console.error('Failed to parse tool calls from stream:', error)
    }
  }

  return { content, toolCalls, groundingMetadata }
}

/**
 * Format grounding metadata web results as a markdown sources section.
 * Appends a formatted list of source links to the content.
 */
function formatGroundingSources(
  content: string,
  metadata: GroundingMetadata,
): string {
  if (
    !metadata.isGrounded ||
    !metadata.webResults ||
    metadata.webResults.length === 0
  ) {
    return content
  }

  // Deduplicate by URL
  const seen = new Set<string>()
  const uniqueResults = metadata.webResults.filter((r) => {
    if (seen.has(r.url)) return false
    seen.add(r.url)
    return true
  })

  if (uniqueResults.length === 0) return content

  const sourcesSection = uniqueResults
    .map((r, i) => `${i + 1}. [${r.title || r.url}](${r.url})`)
    .join('\n')

  return `${content.trimEnd()}\n\n---\n**Sources:**\n${sourcesSection}`
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

  // Ensure connector tools are registered
  if (!areConnectorToolsRegistered()) {
    registerConnectorTools()
  }

  // Ensure presentation tools are registered
  if (!arePresentationToolsRegistered()) {
    registerPresentationTools()
  }

  // Ensure research tools are registered
  if (!areResearchToolsRegistered()) {
    registerResearchTools()
  }

  // Ensure skill tools are registered
  if (!areSkillToolsRegistered()) {
    registerSkillTools()
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
  /** Skills explicitly activated by the user via /mention in the prompt */
  activatedSkills?: Array<{ name: string; skillMdContent: string }>
  lang: Lang
  t: any
  /** Callback for response updates - receives either content or status updates */
  onResponseUpdate: (update: ResponseUpdate) => void
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
    activatedSkills = [],
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
      notifyError({
        title: 'LLM Configuration Required',
        description: t(
          'No AI provider configured. Please configure one in Settings.',
        ),
        actionUrl: `${location.pathname}#settings/providers`,
        actionLabel: 'Open Settings',
      })
      return { success: false, error: 'No AI provider configured' }
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

        onResponseUpdate({
          type: 'status',
          status: {
            icon: 'Rocket',
            i18nKey: 'Starting autonomous task orchestration…',
          },
        })

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

        onResponseUpdate({ type: 'content', content: orchestrationReport })

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
        const errorDetails =
          error instanceof Error
            ? error.message
            : 'Unknown error occurred during task orchestration.'
        onResponseUpdate({
          type: 'status',
          status: {
            icon: 'WarningCircle',
            i18nKey: 'Orchestration failed: {error}',
            vars: { error: errorDetails },
          },
        })

        // Save error message to conversation if conversation exists
        try {
          const { currentConversation, addMessage } =
            useConversationStore.getState()
          if (currentConversation) {
            await addMessage(currentConversation.id, {
              role: 'assistant',
              content: `**Orchestration Failed**\n\n${errorDetails}`,
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
      agent.id,
    )

    // Get relevant memories for this agent and prompt
    const memoryContext = await buildMemoryContextForChat(agent.id, prompt)

    // Get relevant pinned messages from previous conversations
    const pinnedContext = await buildPinnedContextForChat(
      agent.id,
      conversation.id,
      prompt,
    )

    // Build instructions array
    // Citation instructions are always included since tools are always available
    const hasKnowledgeItems =
      agent.knowledgeItemIds && agent.knowledgeItemIds.length > 0

    // Build active skill instructions from user-mentioned /skills
    let activeSkillInstructions = ''
    if (activatedSkills.length > 0) {
      const skillBlocks = activatedSkills
        .map(
          (skill) =>
            `[ACTIVE_SKILL: ${skill.name}]\n${skill.skillMdContent}\n[/ACTIVE_SKILL]`,
        )
        .join('\n\n')
      activeSkillInstructions = `## User-Activated Skills

The user has explicitly requested the following skill(s). Follow their instructions carefully to complete the task.

${skillBlocks}`
    }

    const instructionParts = [
      enhancedInstructions,
      // Inject user-activated skill instructions
      activeSkillInstructions,
      // Inject memory context if available
      memoryContext,
      // Inject pinned messages context if available
      pinnedContext,
      // Add citation instructions if not already included via buildAgentInstructions
      !hasKnowledgeItems ? CITATION_INSTRUCTIONS : '',
      `ALWAYS respond in ${languages[lang]} as this is the user's language.`,
    ]

    const instructions = instructionParts.filter(Boolean).join('\n\n')

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
    // Add connector tools if any connectors are active
    const connectorTools = await getConnectorToolDefinitions()
    console.log(
      '▶ connector tools:',
      connectorTools.length,
      connectorTools.map((t) => t.function.name),
    )
    const allToolDefinitions = [...toolDefinitions, ...connectorTools]
    console.log(
      '▶ all tools:',
      allToolDefinitions.length,
      allToolDefinitions.map((t) => t.function.name),
    )
    const hasTools = allToolDefinitions.length > 0

    // Check if web search grounding is enabled in user settings
    const { enableWebSearchGrounding } = (
      await import('@/stores/userStore')
    ).userSettings.getState()

    // Build config with tools if the agent has any enabled
    const llmConfig = {
      ...config,
      ...(hasTools
        ? { tools: allToolDefinitions, tool_choice: 'auto' as const }
        : {}),
      ...(enableWebSearchGrounding ? { enableWebSearch: true } : {}),
    }

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
        console.debug('◁')
        // console.debug('◁', chunk)
        response += chunk

        // Only show content to user, not the tool call markers
        const { content } = parseToolCallsFromStream(response)
        onResponseUpdate({ type: 'content', content })
      }

      // Parse the final response for tool calls and grounding metadata
      const { content, toolCalls, groundingMetadata } =
        parseToolCallsFromStream(response)
      finalContent = content

      // If grounding metadata has web results, append formatted sources
      if (groundingMetadata) {
        finalContent = formatGroundingSources(finalContent, groundingMetadata)
        // Update the UI with the final content including sources
        onResponseUpdate({ type: 'content', content: finalContent })
      }

      // If no tool calls, we're done
      if (toolCalls.length === 0) {
        console.log('✓ No tool calls, conversation complete')
        break
      }

      console.log(
        `🔧 Executing ${toolCalls.length} tool call(s):`,
        toolCalls.map((tc) => tc.function.name),
      )

      // Show user that tools are being executed with appropriate message
      const toolStatusKey = getToolStatusI18nKey(toolCalls)
      // First send the content so far
      onResponseUpdate({ type: 'content', content: finalContent })
      // Then send the tool status
      onResponseUpdate({
        type: 'status',
        status: {
          icon: 'Tools',
          i18nKey: toolStatusKey,
        },
      })

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
      onResponseUpdate({ type: 'content', content: finalContent })
      onResponseUpdate({
        type: 'status',
        status: {
          icon: 'Book',
          i18nKey: 'Found relevant information, processing…',
        },
      })
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

    // Trigger automatic memory learning if enabled in settings
    // This runs asynchronously in the background and doesn't block the chat
    const autoMemoryLearning = userSettings.getState().autoMemoryLearning
    if (autoMemoryLearning && finalContent) {
      // Learn from the user's prompt and the assistant's response
      learnFromMessage(prompt, finalContent, agent.id, conversation.id, lang)
        .then((events) => {
          if (events.length > 0) {
            console.log(
              `📚 Auto-learned ${events.length} item(s) from conversation`,
            )
          }
        })
        .catch((err) => {
          console.warn('Memory learning failed (non-critical):', err)
        })
    }

    return { success: true }
  } catch (err) {
    console.error('Error calling LLM:', err)
    const errorMessage = err instanceof Error ? err.message : String(err)
    notifyError({
      title: 'LLM Request Failed',
      description: errorMessage,
    })
    return { success: false, error: errorMessage }
  }
}
