/**
 * Iterative Agent Runner
 *
 * Replaces the single-shot `executeTaskWithAgent` with a full agentic loop.
 * Each agent can reason, call tools, observe results, and iterate until
 * the task is complete or the turn budget is exhausted.
 *
 * Pattern: reason → act (tool call) → observe → decide → loop
 *
 * This is the core execution primitive for the orchestration engine.
 * Every orchestrated task flows through this runner.
 *
 * @module lib/orchestrator/agent-runner
 */

import { LLMService, LLMMessage, ToolDefinition, ToolCall } from '@/lib/llm'
import { CredentialService } from '@/lib/credential-service'
import {
  getKnowledgeAttachments,
  buildAgentInstructions,
} from '@/lib/agent-knowledge'
import { buildMemoryContextForChat } from '@/lib/memory-learning-service'
import { buildSkillInstructions } from '@/lib/skills/skill-prompt'
import {
  defaultExecutor,
  registerKnowledgeTools,
  areKnowledgeToolsRegistered,
  registerMathTools,
  areMathToolsRegistered,
  registerCodeTools,
  areCodeToolsRegistered,
  registerResearchTools,
  areResearchToolsRegistered,
  registerSkillTools,
  areSkillToolsRegistered,
  registerConnectorTools,
  areConnectorToolsRegistered,
  registerPresentationTools,
  arePresentationToolsRegistered,
} from '@/lib/tool-executor'
import { KNOWLEDGE_TOOL_DEFINITIONS } from '@/lib/knowledge-tools'
import { MATH_TOOL_DEFINITIONS } from '@/lib/math-tools'
import { CODE_TOOL_DEFINITIONS } from '@/lib/code-tools'
import { PRESENTATION_TOOL_DEFINITIONS } from '@/lib/presentation-tools'
import { getToolDefinitionsForProvider } from '@/features/connectors/tools'
import { connectors as connectorsMap } from '@/lib/yjs/maps'
import type { Connector } from '@/features/connectors/types'
import {
  WIKIPEDIA_SEARCH_TOOL_DEFINITION,
  WIKIPEDIA_ARTICLE_TOOL_DEFINITION,
  WIKIDATA_SEARCH_TOOL_DEFINITION,
  WIKIDATA_ENTITY_TOOL_DEFINITION,
  ARXIV_SEARCH_TOOL_DEFINITION,
  ARXIV_PAPER_TOOL_DEFINITION,
  SKILL_TOOL_DEFINITIONS,
} from '@/tools/plugins'
import { userSettings } from '@/stores/userStore'
import type {
  Agent,
  AgentScope,
  AgentTurnResult,
  IsolatedExecutionConfig,
  LLMConfig,
  Task,
} from '@/types'

// ============================================================================
// Constants
// ============================================================================

/** Default maximum turns for the agentic loop */
const DEFAULT_MAX_TURNS = 15

/** Minimum turns — even restricted agents get at least this many */
const MIN_TURNS = 1

// ============================================================================
// Connector Tool Helpers
// ============================================================================

/**
 * Dynamically collects tool definitions for active connectors.
 * Only includes tools for connectors that are connected and active.
 * Enhances tool descriptions with available connector IDs so the LLM knows which to use.
 */
async function getConnectorToolDefinitions(): Promise<ToolDefinition[]> {
  try {
    const connectors = Array.from(connectorsMap.values())
    const activeConnectors = connectors.filter((c: Connector) =>
      ['connected', 'syncing'].includes(c.status),
    )

    if (activeConnectors.length === 0) return []

    // Group active connectors by provider
    const connectorsByProvider = new Map<string, Connector[]>()
    for (const connector of activeConnectors) {
      const existing = connectorsByProvider.get(connector.provider) || []
      existing.push(connector)
      connectorsByProvider.set(connector.provider, existing)
    }

    const tools: ToolDefinition[] = []
    for (const [provider, providerConnectors] of connectorsByProvider) {
      const providerTools = getToolDefinitionsForProvider(provider)

      // Enhance each tool with available connector IDs for this provider
      const enhancedTools = providerTools.map((tool) => {
        const connectorInfo = providerConnectors
          .map(
            (c) =>
              `"${c.id}"${c.accountEmail ? ` (${c.accountEmail})` : c.name ? ` (${c.name})` : ''}`,
          )
          .join(', ')

        const enhancedTool: ToolDefinition = JSON.parse(JSON.stringify(tool))

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
    console.error(
      '[agent-runner] Failed to get connector tool definitions:',
      error,
    )
    return []
  }
}

// ============================================================================
// Tool Collection
// ============================================================================

/**
 * Collects and filters tool definitions based on agent scope.
 * Registers tool handlers on-demand (lazy registration).
 * Async because connector tool definitions require reading from Yjs.
 */
async function collectTools(scope?: AgentScope): Promise<ToolDefinition[]> {
  // Ensure tool handlers are registered
  if (!areKnowledgeToolsRegistered()) registerKnowledgeTools()
  if (!areMathToolsRegistered()) registerMathTools()
  if (!areCodeToolsRegistered()) registerCodeTools()
  if (!areResearchToolsRegistered()) registerResearchTools()
  if (!areSkillToolsRegistered()) registerSkillTools()
  if (!areConnectorToolsRegistered()) registerConnectorTools()
  if (!arePresentationToolsRegistered()) registerPresentationTools()

  // Gather all available tool definitions
  const allTools: ToolDefinition[] = [
    ...Object.values(KNOWLEDGE_TOOL_DEFINITIONS),
    ...Object.values(MATH_TOOL_DEFINITIONS),
    ...Object.values(CODE_TOOL_DEFINITIONS),
    ...Object.values(PRESENTATION_TOOL_DEFINITIONS),
    WIKIPEDIA_SEARCH_TOOL_DEFINITION,
    WIKIPEDIA_ARTICLE_TOOL_DEFINITION,
    WIKIDATA_SEARCH_TOOL_DEFINITION,
    WIKIDATA_ENTITY_TOOL_DEFINITION,
    ARXIV_SEARCH_TOOL_DEFINITION,
    ARXIV_PAPER_TOOL_DEFINITION,
    ...Object.values(SKILL_TOOL_DEFINITIONS),
  ]

  // Add connector tools (dynamic, based on active connectors)
  const connectorTools = await getConnectorToolDefinitions()
  allTools.push(...connectorTools)

  if (!scope) return allTools

  let filtered = allTools

  // Apply allowlist
  if (scope.allowedTools && scope.allowedTools.length > 0) {
    filtered = filtered.filter((t) =>
      scope.allowedTools!.includes(t.function.name),
    )
  }

  // Apply denylist
  if (scope.deniedTools && scope.deniedTools.length > 0) {
    filtered = filtered.filter(
      (t) => !scope.deniedTools!.includes(t.function.name),
    )
  }

  return filtered
}

// ============================================================================
// LLM Config Resolution
// ============================================================================

/**
 * Resolves the LLM configuration for an agent execution,
 * applying scope overrides (model, provider, temperature).
 */
async function resolveConfig(
  scope?: AgentScope,
  signal?: AbortSignal,
): Promise<LLMConfig> {
  const baseConfig = await CredentialService.getActiveConfig()
  if (!baseConfig) {
    throw new Error('No AI provider configured')
  }

  const config: LLMConfig = { ...baseConfig }

  // Apply scope overrides
  if (scope?.model) config.model = scope.model
  if (scope?.provider) config.provider = scope.provider
  if (scope?.temperature !== undefined) config.temperature = scope.temperature
  if (scope?.maxTokens) config.maxTokens = scope.maxTokens
  if (signal) config.signal = signal

  // Apply web search grounding setting
  const { enableWebSearchGrounding } = userSettings.getState()
  if (enableWebSearchGrounding) {
    ;(config as any).enableWebSearch = true
  }

  return config
}

// ============================================================================
// System Prompt Builder
// ============================================================================

/**
 * Builds a rich system prompt for an agent executing a task.
 * Includes: base instructions + knowledge + memories + skills + task context.
 */
async function buildSystemPrompt(
  agent: Agent,
  task: Task,
  dependencyOutputs?: Array<{ taskTitle: string; content: string }>,
): Promise<string> {
  const baseInstructions =
    agent.instructions || 'You are a helpful AI assistant.'

  // Build knowledge-enhanced instructions
  const enhancedInstructions = await buildAgentInstructions(
    baseInstructions,
    agent.knowledgeItemIds,
    agent.id,
  )

  // Inject relevant memories
  const memoryContext = await buildMemoryContextForChat(
    agent.id,
    task.description,
  )

  // Inject skill catalog
  const skillInstructions = await buildSkillInstructions(agent.id)

  // Build task context
  let taskContext = `\n\n## Current Task\n**Title:** ${task.title}\n**Description:** ${task.description}`

  if (task.requirements?.length > 0) {
    taskContext += `\n\n### Requirements\n`
    task.requirements.forEach((req) => {
      taskContext += `- [${req.priority.toUpperCase()}] (${req.type}): ${req.description}\n`
    })
  }

  // Inject dependency outputs (from upstream tasks)
  if (dependencyOutputs && dependencyOutputs.length > 0) {
    taskContext += `\n\n### Context from Previous Tasks\n`
    dependencyOutputs.forEach(({ taskTitle, content }) => {
      taskContext += `\n#### ${taskTitle}\n${content}\n`
    })
  }

  // Compose final system prompt
  const parts = [enhancedInstructions]
  if (memoryContext) parts.push(memoryContext)
  if (skillInstructions) parts.push(skillInstructions)
  parts.push(taskContext)

  parts.push(
    `\n\n## Execution Instructions\nYou are an autonomous agent executing a task. You have access to tools. Use them as needed to gather information, compute results, or produce deliverables. When you have fully addressed all requirements, provide your final deliverable. Be thorough and ensure all requirements are addressed.`,
  )

  return parts.join('\n')
}

// ============================================================================
// Core Agentic Loop
// ============================================================================

/**
 * Executes a single turn of the agentic loop.
 * Sends messages to LLM, collects response + tool calls,
 * executes tools, returns the turn result.
 */
async function executeTurn(
  messages: LLMMessage[],
  tools: ToolDefinition[],
  config: LLMConfig,
  context?: { agentId?: string; conversationId?: string; taskId?: string },
): Promise<AgentTurnResult> {
  // Pass tools via config so the LLM knows about available tools
  const configWithTools = {
    ...config,
    tools: tools.length > 0 ? tools : undefined,
  }

  // Use chat (not streamChat) to get tool calls
  const response = await LLMService.chat(messages, configWithTools, context)

  const content = response.content || ''
  const toolCalls: Array<{ name: string; input: Record<string, unknown> }> = []
  const toolResults: Array<{ name: string; output: string }> = []

  // Check for tool calls in response (LLMResponseWithTools uses snake_case)
  if (response.tool_calls?.length) {
    for (const call of response.tool_calls) {
      const toolName = call.function?.name || ''
      let toolInput: Record<string, unknown> = {}
      try {
        toolInput =
          typeof call.function?.arguments === 'string'
            ? JSON.parse(call.function.arguments)
            : call.function?.arguments || {}
      } catch {
        toolInput = {}
      }

      toolCalls.push({ name: toolName, input: toolInput })

      // Execute the tool
      try {
        const result = await defaultExecutor.execute(call as ToolCall)
        const output = result.success
          ? defaultExecutor.formatResultForLLM(result)
          : `Error: ${(result as any).error || 'Tool execution failed'}`
        toolResults.push({ name: toolName, output })
      } catch (err) {
        toolResults.push({
          name: toolName,
          output: `Error: ${err instanceof Error ? err.message : 'Unknown error'}`,
        })
      }
    }
  }

  // Determine if the agent considers the task complete
  // (no more tool calls = task is done)
  const isComplete = toolCalls.length === 0

  return {
    content,
    toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
    toolResults: toolResults.length > 0 ? toolResults : undefined,
    isComplete,
  }
}

// ============================================================================
// Public API
// ============================================================================

export interface AgentRunnerResult {
  success: boolean
  /** The final concatenated response */
  response: string
  /** Total turns consumed */
  turnsUsed: number
  /** All tool calls made across all turns */
  toolCallsLog: Array<{
    tool: string
    input: Record<string, unknown>
    output?: string
  }>
  /** Any errors encountered */
  errors?: string[]
}

/**
 * Runs an agent through an iterative agentic loop with tool support.
 *
 * This is the primary execution primitive for all orchestrated tasks.
 * It replaces the legacy `executeTaskWithAgent` single-shot pattern.
 *
 * Flow:
 * 1. Build system prompt (instructions + knowledge + memories + skills + task context)
 * 2. Collect tools (filtered by agent scope)
 * 3. Loop: send to LLM → if tool calls, execute them, feed results back → repeat
 * 4. Return final response when agent stops calling tools or budget exhausted
 */
export async function runAgent(
  config: IsolatedExecutionConfig,
): Promise<AgentRunnerResult> {
  const {
    task,
    agent,
    prompt,
    scope,
    dependencyOutputs,
    knowledgeItemIds,
    signal,
    onProgress,
    onContent,
  } = config

  const maxTurns = Math.max(MIN_TURNS, scope?.maxTurns ?? DEFAULT_MAX_TURNS)

  // 1. Build system prompt with fresh context
  const systemPrompt = await buildSystemPrompt(agent, task, dependencyOutputs)

  // 2. Collect tools (scoped)
  const tools = await collectTools(scope)

  // 3. Resolve LLM config with scope overrides
  const llmConfig = await resolveConfig(scope, signal)

  // 4. Initialize conversation with fresh context (CONTEXT ISOLATION)
  const messages: LLMMessage[] = [
    { role: 'system', content: systemPrompt },
    {
      role: 'user',
      content: prompt,
      attachments: await getKnowledgeAttachments(
        knowledgeItemIds || agent.knowledgeItemIds,
      ),
    },
  ]

  // 5. Agentic loop
  const allToolCalls: AgentRunnerResult['toolCallsLog'] = []
  let finalResponse = ''
  let turnsUsed = 0

  for (let turn = 0; turn < maxTurns; turn++) {
    // Check for cancellation
    if (signal?.aborted) {
      return {
        success: false,
        response: finalResponse,
        turnsUsed,
        toolCallsLog: allToolCalls,
        errors: ['Execution cancelled'],
      }
    }

    turnsUsed++

    // Execute one turn
    const turnResult = await executeTurn(messages, tools, llmConfig, {
      agentId: agent.id,
      taskId: task.id,
    })

    // Accumulate response
    if (turnResult.content) {
      finalResponse = turnResult.content // Last turn's content is the final response
    }

    // Report streaming content
    if (onContent && turnResult.content) {
      onContent(finalResponse)
    }

    // Report progress
    if (onProgress) {
      onProgress({
        turn: turnsUsed,
        content: turnResult.content,
        toolCall: turnResult.toolCalls?.[0]?.name,
      })
    }

    // If no tool calls, agent is done
    if (turnResult.isComplete) {
      break
    }

    // Add assistant message with tool calls to history
    messages.push({
      role: 'assistant',
      content: turnResult.content || '',
    })

    // Add tool results back to conversation
    if (turnResult.toolCalls && turnResult.toolResults) {
      for (let i = 0; i < turnResult.toolCalls.length; i++) {
        const tc = turnResult.toolCalls[i]
        const tr = turnResult.toolResults[i]

        allToolCalls.push({
          tool: tc.name,
          input: tc.input,
          output: tr?.output,
        })

        // Feed tool result back as a user message (tool result format)
        messages.push({
          role: 'user',
          content: `[Tool Result: ${tc.name}]\n${tr?.output || 'No output'}`,
        })
      }
    }
  }

  return {
    success: true,
    response: finalResponse,
    turnsUsed,
    toolCallsLog: allToolCalls,
  }
}

/**
 * Runs an agent in single-shot mode (no tool loop).
 * Used as a fast-path for simple tasks or when tools are not needed.
 */
export async function runAgentSingleShot(
  agent: Agent,
  task: Task,
  prompt: string,
  scope?: AgentScope,
  dependencyOutputs?: Array<{ taskTitle: string; content: string }>,
  signal?: AbortSignal,
  onContent?: (content: string) => void,
): Promise<AgentRunnerResult> {
  const systemPrompt = await buildSystemPrompt(agent, task, dependencyOutputs)
  const config = await resolveConfig(scope, signal)

  const messages: LLMMessage[] = [
    { role: 'system', content: systemPrompt },
    {
      role: 'user',
      content: prompt,
      attachments: await getKnowledgeAttachments(agent.knowledgeItemIds),
    },
  ]

  let response = ''
  for await (const chunk of LLMService.streamChat(messages, config, {
    agentId: agent.id,
    taskId: task.id,
  })) {
    response += chunk
    if (onContent) onContent(response)
  }

  return {
    success: true,
    response,
    turnsUsed: 1,
    toolCallsLog: [],
  }
}
