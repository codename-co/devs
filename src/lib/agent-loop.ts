/**
 * Agent Loop Engine
 *
 * Implements a Plan→Act→Observe→Synthesize agentic loop that enables
 * autonomous multi-step task execution with tool calling capabilities.
 *
 * This replaces single-shot LLM calls with an iterative reasoning loop
 * that can:
 * - Plan: Analyze the task and decide on next actions
 * - Act: Execute tool calls in parallel
 * - Observe: Process results and update context
 * - Synthesize: Inject observations and decide whether to continue
 */

import { LLMService, LLMMessage, LLMResponse } from '@/lib/llm'
import type { ToolDefinition, ToolCall, ToolResult } from '@/lib/llm/tool-types'
import { CredentialService } from '@/lib/credential-service'
import type { Agent, LLMConfig } from '@/types'

// =============================================================================
// Multilingual Tool Trigger Patterns
// =============================================================================

/**
 * Multilingual tool trigger patterns
 * Each language has phrases that indicate the user wants tool assistance
 */
const TOOL_TRIGGERS: Record<string, string[]> = {
  // English
  en: [
    'search',
    'look up',
    'find out',
    'research',
    'look for',
    'calculate',
    'compute',
    'run code',
    'execute',
    'create a',
    'generate a',
    'write a',
    'make a',
    'from my',
    'in my files',
    'in my documents',
    'in my knowledge',
    'step by step',
    'help me',
    'can you',
    'what is the latest',
    'what are the latest',
    'recent news',
    'summarize',
    'analyze',
    'compare',
  ],
  // French
  fr: [
    'cherche',
    'recherche',
    'trouve',
    'trouver',
    'calcule',
    'calculer',
    'exécute',
    'exécuter le code',
    'crée',
    'créer',
    'génère',
    'générer',
    'écris',
    'écrire',
    'rédige',
    'dans mes fichiers',
    'dans mes documents',
    'dans ma base',
    'étape par étape',
    'aide-moi',
    'peux-tu',
    'pouvez-vous',
    'quelles sont les dernières',
    'actualités récentes',
    'résume',
    'résumer',
    'analyse',
    'analyser',
    'compare',
    'comparer',
  ],
  // German
  de: [
    'suche',
    'suchen',
    'finde',
    'finden',
    'recherchiere',
    'berechne',
    'berechnen',
    'führe aus',
    'code ausführen',
    'erstelle',
    'erstellen',
    'generiere',
    'schreibe',
    'schreiben',
    'in meinen dateien',
    'in meinen dokumenten',
    'schritt für schritt',
    'hilf mir',
    'kannst du',
    'können sie',
    'was sind die neuesten',
    'aktuelle nachrichten',
    'fasse zusammen',
    'zusammenfassen',
    'analysiere',
    'vergleiche',
  ],
  // Spanish
  es: [
    'busca',
    'buscar',
    'encuentra',
    'encontrar',
    'investiga',
    'calcula',
    'calcular',
    'ejecuta',
    'ejecutar código',
    'crea',
    'crear',
    'genera',
    'generar',
    'escribe',
    'escribir',
    'redacta',
    'en mis archivos',
    'en mis documentos',
    'paso a paso',
    'ayúdame',
    'puedes',
    'puede',
    'cuáles son las últimas',
    'noticias recientes',
    'resume',
    'resumir',
    'analiza',
    'analizar',
    'compara',
    'comparar',
  ],
  // Arabic
  ar: [
    'ابحث',
    'بحث',
    'جد',
    'اعثر',
    'احسب',
    'حساب',
    'نفذ',
    'شغل الكود',
    'أنشئ',
    'إنشاء',
    'ولد',
    'اكتب',
    'كتابة',
    'في ملفاتي',
    'في مستنداتي',
    'خطوة بخطوة',
    'ساعدني',
    'هل يمكنك',
    'ما هي آخر',
    'أحدث الأخبار',
    'لخص',
    'تلخيص',
    'حلل',
    'تحليل',
    'قارن',
    'مقارنة',
  ],
  // Korean
  ko: [
    '검색',
    '찾아',
    '찾기',
    '조사',
    '계산',
    '계산해',
    '코드 실행',
    '실행',
    '만들어',
    '생성',
    '작성',
    '써줘',
    '내 파일',
    '내 문서',
    '단계별',
    '도와줘',
    '할 수 있어',
    '최신',
    '최근 뉴스',
    '요약',
    '분석',
    '비교',
  ],
}

/**
 * Question indicators by language
 */
const QUESTION_MARKERS: Record<string, RegExp> = {
  en: /\?$|^(what|where|when|who|why|how|which|can you|could you|would you)/i,
  fr: /\?$|^(qu'est-ce|quel|quelle|quels|quelles|où|quand|qui|pourquoi|comment|peux-tu|pouvez-vous)/i,
  de: /\?$|^(was|wo|wann|wer|warum|wie|welche|welcher|kannst du|können sie)/i,
  es: /\?$|^(qué|cuál|cuáles|dónde|cuándo|quién|por qué|cómo|puedes|puede)/i,
  ar: /؟$|^(ما|ماذا|أين|متى|من|لماذا|كيف|هل)/,
  ko: /\?$|.*(뭐|무엇|어디|언제|누구|왜|어떻게|할 수)/,
}

/**
 * Detect probable language from prompt (simple heuristic)
 */
export function detectLanguage(prompt: string): string {
  // Arabic: contains Arabic characters
  if (/[\u0600-\u06FF]/.test(prompt)) return 'ar'
  // Korean: contains Hangul
  if (/[\uAC00-\uD7AF\u1100-\u11FF]/.test(prompt)) return 'ko'
  // German: common patterns (imperfect but fast)
  if (/\b(ich|und|der|die|das|ist|für|nicht|ein|eine)\b/i.test(prompt))
    return 'de'
  // French: common patterns
  if (/\b(je|et|le|la|les|est|pour|pas|un|une|dans|que|qui)\b/i.test(prompt))
    return 'fr'
  // Spanish: common patterns
  if (/\b(yo|y|el|la|los|las|es|para|no|un|una|en|que|qué)\b/i.test(prompt))
    return 'es'
  // Default to English
  return 'en'
}

/**
 * Check if a prompt should use the agent loop based on complexity
 * Fast local heuristic - NO LLM call
 */
export function shouldUseAgentLoop(prompt: string, hasTools: boolean): boolean {
  if (!hasTools) return false
  if (!prompt || prompt.trim().length === 0) return false

  const promptLower = prompt.toLowerCase()
  const wordCount = prompt.split(/\s+/).length

  // Detect language
  const lang = detectLanguage(prompt)

  // Get triggers for detected language + English fallback
  const triggers = [
    ...TOOL_TRIGGERS[lang],
    ...(lang !== 'en' ? TOOL_TRIGGERS.en : []),
  ]

  // Check for tool trigger phrases
  const hasToolTrigger = triggers.some((t) => promptLower.includes(t))

  // Check if it's a question (using language-specific patterns)
  const questionPattern = QUESTION_MARKERS[lang] || QUESTION_MARKERS.en
  const isQuestion = questionPattern.test(prompt)

  // Complexity indicators
  const isLongPrompt = wordCount > 15
  const hasMultipleLines = prompt.includes('\n')
  const hasListStructure =
    /^\s*[-*•]\s/m.test(prompt) || /^\s*\d+[.)]\s/m.test(prompt)

  // Decision logic:
  // 1. Explicit tool trigger → use agent loop
  // 2. Question + (long OR has structure) → use agent loop
  // 3. Multi-line with structure → use agent loop
  return (
    hasToolTrigger ||
    (isQuestion && (isLongPrompt || hasListStructure)) ||
    (hasMultipleLines && hasListStructure)
  )
}

// =============================================================================
// Agent Decision Types
// =============================================================================

/**
 * Types of decisions an agent can make during the loop
 */
export type AgentDecisionType =
  | 'tool_call' // Execute one or more tools
  | 'answer' // Provide final answer to user

/**
 * A structured decision from the agent
 */
export interface AgentDecision {
  type: AgentDecisionType
  /** Reasoning behind this decision (for transparency) */
  reasoning: string
  /** Tool calls to execute (when type is 'tool_call') */
  toolCalls?: ToolCall[]
  /** Final answer content (when type is 'answer') */
  answer?: string
  /** Confidence level (0-1) */
  confidence: number
  /** Whether this requires human confirmation */
  requiresConfirmation?: boolean
}

/**
 * Observation from executing an action
 */
export interface AgentObservation {
  /** Type of observation */
  type: 'tool_result' | 'error' | 'human_feedback'
  /** The observation content */
  content: string
  /** Structured data if available */
  data?: Record<string, unknown>
  /** Source of observation */
  source: string
  /** Timestamp */
  timestamp: Date
  /** Whether this was successful */
  success: boolean
  /** Duration in ms */
  duration?: number
}

/**
 * A single step in the agent loop (unified model)
 * One step = one complete Plan→Act→Observe→Synthesize cycle
 */
export interface AgentLoopStep {
  id: string
  /** Step number in the loop */
  stepNumber: number
  /** Timestamp */
  timestamp: Date
  /** Duration in ms */
  duration?: number

  /** Plan phase: what the agent decided to do */
  plan: {
    decision: AgentDecision
    reasoning: string
    tokensUsed?: number
  }

  /** Actions taken (if any tools were called) */
  actions?: {
    toolCalls: ToolCall[]
    parallelExecution: boolean
  }

  /** Observations from tool execution */
  observations?: AgentObservation[]

  /** Synthesis: summary and continuation decision */
  synthesis?: {
    summary: string
    shouldContinue: boolean
    nextStepHint?: string
  }
}

/**
 * Usage tracking for the agent loop
 */
export interface AgentLoopUsage {
  totalTokens: number
  promptTokens: number
  completionTokens: number
  estimatedCost: number // USD
  llmCalls: number
}

/**
 * State of an agent loop execution
 */
export interface AgentLoopState {
  /** Unique ID for this loop execution */
  id: string
  /** The agent executing the loop */
  agentId: string
  /** Original user prompt */
  prompt: string
  /** Current status */
  status:
    | 'running'
    | 'completed'
    | 'failed'
    | 'paused'
    | 'cancelled'
    | 'awaiting_confirmation'
  /** All steps taken */
  steps: AgentLoopStep[]
  /** Current step number */
  currentStep: number
  /** Maximum steps allowed */
  maxSteps: number
  /** Final result if completed */
  result?: AgentDecision
  /** Error if failed */
  error?: string
  /** Start time */
  startedAt: Date
  /** End time if finished */
  completedAt?: Date
  /** Token/cost tracking */
  usage: AgentLoopUsage
}

/**
 * Configuration for the agent loop
 */
export interface AgentLoopConfig {
  /** Maximum number of loop iterations */
  maxSteps: number
  /** Temperature for LLM calls */
  temperature?: number
  /** Available tools */
  tools: ToolDefinition[]
  /** Tool executor function */
  toolExecutor: (
    toolCall: ToolCall,
    context?: { signal?: AbortSignal },
  ) => Promise<ToolResult>
  /** Callback for streaming updates */
  onUpdate?: (state: AgentLoopState) => void
  /** Callback for step completion */
  onStepComplete?: (step: AgentLoopStep) => void
  /** Whether to show internal reasoning to user */
  showReasoning?: boolean
  /** Whether to require human confirmation for tool calls */
  requireToolConfirmation?: boolean
}

/**
 * Update types for streaming
 */
export type AgentLoopUpdateType =
  | 'step_start'
  | 'reasoning'
  | 'decision'
  | 'tools_start'
  | 'tools_complete'
  | 'step_complete'
  | 'answer'
  | 'error'

export interface AgentLoopUpdate {
  type: AgentLoopUpdateType
  step?: number
  content?: string
  decision?: AgentDecision
  tools?: string[]
  observations?: AgentObservation[]
  error?: string
}

// =============================================================================
// Cost estimation per model (USD per 1M tokens)
// =============================================================================

const MODEL_COSTS: Record<string, { input: number; output: number }> = {
  'gpt-4o': { input: 2.5, output: 10 },
  'gpt-4o-mini': { input: 0.15, output: 0.6 },
  'gpt-4-turbo': { input: 10, output: 30 },
  'gpt-4': { input: 30, output: 60 },
  'gpt-3.5-turbo': { input: 0.5, output: 1.5 },
  'claude-3-5-sonnet': { input: 3, output: 15 },
  'claude-3-5-haiku': { input: 0.25, output: 1.25 },
  'claude-3-opus': { input: 15, output: 75 },
  'claude-3-sonnet': { input: 3, output: 15 },
  'claude-3-haiku': { input: 0.25, output: 1.25 },
  'gemini-1.5-pro': { input: 1.25, output: 5 },
  'gemini-1.5-flash': { input: 0.075, output: 0.3 },
  'gemini-2.0-flash': { input: 0.1, output: 0.4 },
  // Default for unknown models
  default: { input: 1, output: 3 },
}

function estimateCost(
  promptTokens: number,
  completionTokens: number,
  model: string,
): number {
  const costs = MODEL_COSTS[model] || MODEL_COSTS.default
  return (
    (promptTokens * costs.input) / 1_000_000 +
    (completionTokens * costs.output) / 1_000_000
  )
}

// =============================================================================
// Agent Loop Engine
// =============================================================================

/**
 * The core agent loop engine with streaming support
 */
export class AgentLoop {
  private state: AgentLoopState
  private config: AgentLoopConfig
  private agent: Agent
  private llmConfig: LLMConfig | null = null
  private conversationHistory: LLMMessage[] = []
  private abortController: AbortController

  constructor(agent: Agent, prompt: string, config: AgentLoopConfig) {
    this.agent = agent
    this.config = config
    this.abortController = new AbortController()
    this.state = {
      id: crypto.randomUUID(),
      agentId: agent.id,
      prompt,
      status: 'running',
      steps: [],
      currentStep: 0,
      maxSteps: config.maxSteps,
      startedAt: new Date(),
      usage: {
        totalTokens: 0,
        promptTokens: 0,
        completionTokens: 0,
        estimatedCost: 0,
        llmCalls: 0,
      },
    }
  }

  /**
   * Get current state
   */
  getState(): AgentLoopState {
    return { ...this.state }
  }

  /**
   * Cancel the agent loop
   */
  cancel(): void {
    this.abortController.abort()
    this.state.status = 'cancelled'
    this.state.completedAt = new Date()
    this.notifyUpdate()
  }

  /**
   * Run the agent loop with streaming updates
   */
  async *runWithStreaming(): AsyncGenerator<
    AgentLoopUpdate,
    AgentLoopState,
    void
  > {
    try {
      // Initialize LLM config
      this.llmConfig = await CredentialService.getActiveConfig()
      if (!this.llmConfig) {
        yield { type: 'error', error: 'No LLM provider configured' }
        throw new Error('No LLM provider configured')
      }

      // Initialize conversation with system prompt
      this.initializeConversation()

      // Main loop
      while (
        this.state.status === 'running' &&
        this.state.currentStep < this.config.maxSteps &&
        !this.abortController.signal.aborted
      ) {
        const stepResult = await this.executeStepWithStreaming()

        // Yield all updates from this step
        for (const update of stepResult.updates) {
          yield update
        }

        // Check if we should stop
        if (this.state.result?.type === 'answer') {
          this.state.status = 'completed'
          yield { type: 'answer', content: this.state.result.answer }
          break
        }

        // Check for confirmation requirement
        if ((this.state.status as string) === 'awaiting_confirmation') {
          break
        }
      }

      // Handle max steps reached
      if (
        this.state.currentStep >= this.config.maxSteps &&
        this.state.status === 'running'
      ) {
        this.state.status = 'failed'
        this.state.error = 'Maximum steps reached without completing the task'
        yield { type: 'error', error: this.state.error }
      }

      // Handle cancellation
      if (
        this.abortController.signal.aborted &&
        this.state.status !== 'cancelled'
      ) {
        this.state.status = 'cancelled'
      }

      this.state.completedAt = new Date()
      this.notifyUpdate()
      return this.state
    } catch (error) {
      this.state.status = 'failed'
      this.state.error =
        error instanceof Error ? error.message : 'Unknown error'
      this.state.completedAt = new Date()
      this.notifyUpdate()
      yield { type: 'error', error: this.state.error }
      throw error
    }
  }

  /**
   * Run the agent loop until completion or max steps (non-streaming)
   */
  async run(): Promise<AgentLoopState> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    for await (const _update of this.runWithStreaming()) {
      // Consume updates but don't yield them
    }
    return this.state
  }

  /**
   * Resume after human confirmation
   */
  async resume(approved: boolean, feedback?: string): Promise<AgentLoopState> {
    if (this.state.status !== 'awaiting_confirmation') {
      throw new Error('Cannot resume: loop is not awaiting confirmation')
    }

    if (approved) {
      this.state.status = 'running'
      // Execute the pending tool calls
      const lastStep = this.state.steps[this.state.steps.length - 1]
      if (lastStep?.actions?.toolCalls) {
        const observations = await this.executeToolCallsParallel(
          lastStep.actions.toolCalls,
        )
        lastStep.observations = observations
        this.injectObservationsIntoContext(observations)
      }
      return this.run()
    } else {
      // Add feedback as observation and continue
      if (feedback) {
        const lastStep = this.state.steps[this.state.steps.length - 1]
        const observation: AgentObservation = {
          type: 'human_feedback',
          content: feedback,
          source: 'human',
          timestamp: new Date(),
          success: true,
        }
        if (!lastStep.observations) lastStep.observations = []
        lastStep.observations.push(observation)
        this.injectObservationsIntoContext([observation])
      }
      this.state.status = 'running'
      return this.run()
    }
  }

  /**
   * Initialize the conversation with system prompt
   */
  private initializeConversation(): void {
    const systemPrompt = this.buildSystemPrompt()
    this.conversationHistory = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: this.state.prompt },
    ]
  }

  /**
   * Build the system prompt for agentic operation
   */
  private buildSystemPrompt(): string {
    const toolDescriptions = this.config.tools
      .map((t) => `- ${t.name}: ${t.description}`)
      .join('\n')

    return `${this.agent.instructions}

You are operating in an agentic loop with the following capabilities:

## Available Tools
${toolDescriptions || 'No tools available'}

## Guidelines
- Break complex tasks into smaller steps
- Use tools to gather information before making assumptions
- Provide clear, actionable answers
- If you need more information, use the appropriate tool
- When you have gathered enough information, provide your final answer directly

## Response Format
When you need to use tools, make tool calls. The system will execute them and provide results.
When you have all the information needed, respond directly with your final answer to the user.`
  }

  /**
   * Execute a single step with streaming support
   */
  private async executeStepWithStreaming(): Promise<{
    step: AgentLoopStep
    updates: AgentLoopUpdate[]
  }> {
    this.state.currentStep++
    const stepId = crypto.randomUUID()
    const stepStart = Date.now()
    const updates: AgentLoopUpdate[] = []

    updates.push({ type: 'step_start', step: this.state.currentStep })

    // Build observation context from previous step
    this.buildAndInjectObservationContext()

    // Phase 1: Plan - Get decision from LLM
    const { decision, reasoning, response } = await this.planPhase()

    // Update usage tracking
    this.updateUsage(response)

    const step: AgentLoopStep = {
      id: stepId,
      stepNumber: this.state.currentStep,
      timestamp: new Date(),
      plan: {
        decision,
        reasoning,
        tokensUsed: response.usage?.totalTokens,
      },
    }

    updates.push({ type: 'reasoning', content: reasoning })
    updates.push({ type: 'decision', decision })

    // Handle answer decision
    if (decision.type === 'answer') {
      this.state.result = decision
      step.duration = Date.now() - stepStart
      step.synthesis = {
        summary: 'Final answer provided',
        shouldContinue: false,
      }
      this.state.steps.push(step)
      this.config.onStepComplete?.(step)
      this.notifyUpdate()
      updates.push({ type: 'step_complete', step: this.state.currentStep })
      return { step, updates }
    }

    // Check if confirmation is required for tool calls
    if (
      this.config.requireToolConfirmation &&
      decision.type === 'tool_call' &&
      decision.toolCalls?.length
    ) {
      step.actions = {
        toolCalls: decision.toolCalls,
        parallelExecution: true,
      }
      step.duration = Date.now() - stepStart
      this.state.steps.push(step)
      this.state.status = 'awaiting_confirmation'
      this.notifyUpdate()
      updates.push({ type: 'step_complete', step: this.state.currentStep })
      return { step, updates }
    }

    // Phase 2: Act - Execute tool calls in parallel
    if (decision.type === 'tool_call' && decision.toolCalls?.length) {
      step.actions = {
        toolCalls: decision.toolCalls,
        parallelExecution: true,
      }

      updates.push({
        type: 'tools_start',
        tools: decision.toolCalls.map((t) => t.name),
      })

      const observations = await this.executeToolCallsParallel(
        decision.toolCalls,
      )
      step.observations = observations

      updates.push({ type: 'tools_complete', observations })

      // Phase 3 & 4: Inject observations into context for next iteration
      this.injectObservationsIntoContext(observations)

      // Synthesis
      const allSuccessful = observations.every((o) => o.success)
      step.synthesis = {
        summary: this.summarizeObservations(observations),
        shouldContinue: true,
        nextStepHint: allSuccessful
          ? 'Continue processing with gathered information'
          : 'Some tools failed, consider alternative approaches',
      }
    }

    step.duration = Date.now() - stepStart
    this.state.steps.push(step)
    this.config.onStepComplete?.(step)
    this.notifyUpdate()
    updates.push({ type: 'step_complete', step: this.state.currentStep })

    return { step, updates }
  }

  /**
   * Build observation context from previous step and inject into conversation
   */
  private buildAndInjectObservationContext(): void {
    if (this.state.steps.length === 0) return

    const lastStep = this.state.steps[this.state.steps.length - 1]
    if (!lastStep.observations?.length) return

    // Observations are already injected via tool messages
    // This method is for any additional context summarization if needed
  }

  /**
   * Inject observations into conversation history as tool result messages
   */
  private injectObservationsIntoContext(
    observations: AgentObservation[],
  ): void {
    // Tool results are already added in executeToolCallsParallel
    // This is called for additional context or human feedback
    for (const obs of observations) {
      if (obs.type === 'human_feedback') {
        this.conversationHistory.push({
          role: 'user',
          content: `[Human Feedback]: ${obs.content}`,
        })
      }
    }
  }

  /**
   * Plan phase: decide what to do next
   */
  private async planPhase(): Promise<{
    decision: AgentDecision
    reasoning: string
    response: LLMResponse
  }> {
    if (!this.llmConfig) {
      throw new Error('LLM config not initialized')
    }

    // Make LLM call with tools
    const response = await LLMService.chat(
      this.conversationHistory,
      this.llmConfig,
      {
        tools: this.config.tools,
        toolChoice: 'auto',
      },
    )

    // Parse the decision from the response
    const decision = this.parseDecision(response)
    const reasoning = response.content || decision.reasoning

    return { decision, reasoning, response }
  }

  /**
   * Parse LLM response into a structured decision
   */
  private parseDecision(response: LLMResponse): AgentDecision {
    // If there are tool calls, it's a tool_call decision
    if (response.toolCalls?.length) {
      return {
        type: 'tool_call',
        reasoning: response.content || 'Executing tools',
        toolCalls: response.toolCalls,
        confidence: 0.8,
      }
    }

    // If there's content, it's an answer
    if (response.content) {
      return {
        type: 'answer',
        reasoning: 'Providing final answer',
        answer: response.content,
        confidence: 0.9,
      }
    }

    // Fallback to empty answer
    return {
      type: 'answer',
      reasoning: 'No response generated',
      answer: 'I apologize, but I was unable to generate a response.',
      confidence: 0.5,
    }
  }

  /**
   * Execute tool calls in parallel and collect results
   */
  private async executeToolCallsParallel(
    toolCalls: ToolCall[],
  ): Promise<AgentObservation[]> {
    const results = await Promise.allSettled(
      toolCalls.map(async (toolCall) => {
        const startTime = Date.now()
        try {
          const result = await this.config.toolExecutor(toolCall, {
            signal: this.abortController.signal,
          })
          return {
            toolCall,
            result,
            duration: Date.now() - startTime,
          }
        } catch (error) {
          return {
            toolCall,
            error,
            duration: Date.now() - startTime,
          }
        }
      }),
    )

    const observations: AgentObservation[] = []

    for (let i = 0; i < results.length; i++) {
      const settled = results[i]
      const toolCall = toolCalls[i]

      if (settled.status === 'fulfilled') {
        const { result, duration } = settled.value as {
          result: ToolResult
          duration: number
        }
        const content =
          typeof result.content === 'string'
            ? result.content
            : JSON.stringify(result.content, null, 2)

        observations.push({
          type: 'tool_result',
          content,
          data: typeof result.content === 'object' ? result.content : undefined,
          source: toolCall.name,
          timestamp: new Date(),
          success: result.success,
          duration,
        })

        // Add to conversation history as assistant tool call + tool result
        this.conversationHistory.push({
          role: 'assistant',
          content: '',
          toolCalls: [toolCall],
        })
        this.conversationHistory.push({
          role: 'tool',
          content,
          toolCallId: toolCall.id,
          toolName: toolCall.name,
        })
      } else {
        const errorMessage =
          settled.reason instanceof Error
            ? settled.reason.message
            : 'Tool execution failed'

        observations.push({
          type: 'error',
          content: errorMessage,
          source: toolCall.name,
          timestamp: new Date(),
          success: false,
        })

        // Add error to conversation history
        this.conversationHistory.push({
          role: 'assistant',
          content: '',
          toolCalls: [toolCall],
        })
        this.conversationHistory.push({
          role: 'tool',
          content: `Error: ${errorMessage}`,
          toolCallId: toolCall.id,
          toolName: toolCall.name,
        })
      }
    }

    return observations
  }

  /**
   * Summarize observations for synthesis
   */
  private summarizeObservations(observations: AgentObservation[]): string {
    return observations
      .map(
        (o) =>
          `[${o.source}] ${o.success ? '✓' : '✗'} ${o.content.substring(0, 100)}`,
      )
      .join('\n')
  }

  /**
   * Update usage tracking after an LLM call
   */
  private updateUsage(response: LLMResponse): void {
    if (response.usage) {
      this.state.usage.promptTokens += response.usage.promptTokens || 0
      this.state.usage.completionTokens += response.usage.completionTokens || 0
      this.state.usage.totalTokens += response.usage.totalTokens || 0
      this.state.usage.llmCalls++
      this.state.usage.estimatedCost += estimateCost(
        response.usage.promptTokens || 0,
        response.usage.completionTokens || 0,
        this.llmConfig?.model || 'default',
      )
    }
  }

  /**
   * Notify listeners of state updates
   */
  private notifyUpdate(): void {
    this.config.onUpdate?.(this.state)
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Create a simple agent loop for a single task
 */
export async function runAgentLoop(
  agent: Agent,
  prompt: string,
  tools: ToolDefinition[],
  toolExecutor: (toolCall: ToolCall) => Promise<ToolResult>,
  options: Partial<AgentLoopConfig> = {},
): Promise<AgentLoopState> {
  const loop = new AgentLoop(agent, prompt, {
    maxSteps: options.maxSteps ?? 10,
    tools,
    toolExecutor,
    ...options,
  })

  return loop.run()
}
