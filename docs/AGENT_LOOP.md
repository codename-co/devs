# DEVS Agent Loop: Implementation Plan

> **Status:** ✅ **IMPLEMENTED** (January 2026)
>
> All core phases have been implemented. This document now serves as technical documentation for the agent loop system.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              User Interface                                  │
│  ┌─────────────┐  ┌──────────────────┐  ┌─────────────────────────────────┐ │
│  │ Chat Input  │→ │ Complexity Gate  │→ │ Simple: Direct LLM             │ │
│  │             │  │ (local heuristic)│  │ Complex: Agent Loop             │ │
│  └─────────────┘  └──────────────────┘  └─────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    ▼                               ▼
           ┌───────────────┐               ┌───────────────────┐
           │  Direct Chat  │               │    Agent Loop     │
           │  (streaming)  │               │   (iterative)     │
           └───────────────┘               └───────────────────┘
                                                    │
                    ┌───────────────────────────────┼───────────────────────────┐
                    │                               │                           │
                    ▼                               ▼                           ▼
           ┌────────────────┐             ┌────────────────┐          ┌────────────────┐
           │   PLAN PHASE   │────────────▶│   ACT PHASE    │─────────▶│ OBSERVE PHASE  │
           │                │             │                │          │                │
           │ • LLM decides  │             │ • Execute tools│          │ • Collect      │
           │   next action  │             │   in parallel  │          │   results      │
           │ • Stream       │             │ • Handle       │          │ • Detect       │
           │   reasoning    │             │   timeouts     │          │   errors       │
           └────────────────┘             └────────────────┘          └────────────────┘
                    ▲                                                          │
                    │                                                          │
                    │                     ┌────────────────┐                   │
                    └─────────────────────│ SYNTHESIS      │◀──────────────────┘
                                          │                │
                                          │ • Inject       │
                                          │   observations │
                                          │   into context │
                                          │ • Continue or  │
                                          │   answer       │
                                          └────────────────┘
```

---

## Phase 1: Foundation Fixes ✅ COMPLETED

### 1.1 Replace LLM Complexity Check with Local Heuristic ✅

**File:** `src/lib/agent-loop.ts`

**Current Problem:** Every chat request makes an extra LLM call (~500ms-2s) just to decide if it's "complex."

**Solution:** Use a fast local heuristic with multilingual support (en, fr, de, es, ar, ko).

```typescript
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
function detectLanguage(prompt: string): string {
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
```

**Implementation Notes:**

1. **Language Detection:** Fast regex-based detection prioritizing non-Latin scripts (Arabic, Korean), then common word patterns for European languages
2. **Fallback:** Always includes English triggers as fallback for mixed-language prompts
3. **Question Detection:** Language-specific patterns for interrogative structures
4. **Complexity Signals:** Word count, multi-line, list structures (bullets, numbers)

**Acceptance Criteria:**

- [x] No LLM call for complexity detection
- [x] Function is synchronous
- [x] Correctly identifies tool requests in all 6 supported languages
- [x] Handles edge cases (empty prompt, very long prompt, mixed language)
- [x] Unit tests cover common patterns in each language
- [x] Language detection is fast (<1ms)

---

### 1.2 Simplify Step Model ✅

**File:** `src/lib/agent-loop.ts`

**Current Problem:** One `executeStep()` creates 3 separate step records with same `stepNumber`.

**Solution:** One step = one complete cycle. Internal phases are properties, not separate steps.

```typescript
interface AgentLoopStep {
  id: string
  stepNumber: number
  timestamp: Date
  duration?: number

  // All phases in one step
  plan: {
    decision: AgentDecision
    reasoning: string
    tokensUsed?: number
  }

  actions?: {
    toolCalls: ToolCall[]
    parallelExecution: boolean
  }

  observations?: AgentObservation[]

  synthesis?: {
    summary: string
    shouldContinue: boolean
    nextStepHint?: string
  }
}
```

**Implementation:**

1. Refactor `executeStep()` to build a single step object
2. Remove separate `observePhase()` and `revisePhase()` step creation
3. Update `formatAgentLoopProgress()` in chat.ts to handle new structure

**Acceptance Criteria:**

- [x] `state.steps.length` equals `state.currentStep` after each iteration
- [x] Each step contains complete audit trail
- [x] UI can render step-by-step progress clearly

---

### 1.3 Make Feedback Loop Actually Work ✅

**File:** `src/lib/agent-loop.ts`

**Current Problem:** Scratchpad collects observations but they're never fed back to the LLM.

**Solution:** Inject observation summary into next plan phase.

```typescript
private async planPhase(): Promise<AgentDecision> {
  // Build context from previous observations
  const observationContext = this.buildObservationContext()

  // Inject into conversation history before the LLM call
  if (observationContext) {
    this.conversationHistory.push({
      role: 'user',
      content: `[System: Previous step results]\n${observationContext}\n\nBased on these results, decide your next action or provide your final answer.`
    })
  }

  const response = await LLMService.chat(...)
  return this.parseDecision(response)
}

private buildObservationContext(): string | null {
  const lastStep = this.state.steps[this.state.steps.length - 1]
  if (!lastStep?.observations?.length) return null

  return lastStep.observations
    .map(o => `[${o.source}] ${o.success ? '✓' : '✗'} ${o.content}`)
    .join('\n')
}
```

**Acceptance Criteria:**

- [x] LLM sees tool results before deciding next action
- [x] Multi-step tasks can build on previous results
- [x] Observation context is truncated if too long (token budget)

---

## Phase 2: Real Tool Implementation ✅ COMPLETED

### 2.1 Implement Web Search Tool ✅

**File:** `src/lib/tools/executors/web-search.ts`

**Options (pick one):**

1. **SearXNG** - Self-hosted, no API key needed if you run an instance
2. **DuckDuckGo Instant Answers** - Free, limited
3. **Brave Search API** - Free tier available, good quality
4. **Serper.dev** - $50/month for 5000 queries

**Recommended: Brave Search API (free tier: 2000 queries/month)**

```typescript
interface WebSearchResult {
  title: string
  url: string
  snippet: string
  publishedDate?: string
}

export async function executeWebSearch(
  query: string,
  numResults: number = 5,
  apiKey: string,
): Promise<WebSearchResult[]> {
  const response = await fetch(
    `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${numResults}`,
    {
      headers: {
        Accept: 'application/json',
        'X-Subscription-Token': apiKey,
      },
    },
  )

  const data = await response.json()
  return data.web.results.map((r) => ({
    title: r.title,
    url: r.url,
    snippet: r.description,
    publishedDate: r.age,
  }))
}
```

**Integration Points:**

- Add `BRAVE_SEARCH_API_KEY` to credential service
- Add settings UI for search provider selection
- Format results for LLM consumption (not raw JSON)

**Acceptance Criteria:**

- [x] Real search results returned
- [x] Results formatted as readable text for LLM
- [x] Error handling for rate limits, API errors
- [x] API key stored securely via CredentialService
- [x] Fallback message if no API key configured

---

### 2.2 Implement Knowledge Query Tool ✅ ✅

**File:** `src/lib/tools/executors/knowledge-query.ts`

**Connect to existing Knowledge Base in IndexedDB:**

```typescript
import { useKnowledgeStore } from '@/stores/knowledgeStore'

export async function executeKnowledgeQuery(
  query: string,
  filters?: { fileType?: string; tags?: string[] },
  limit: number = 10,
): Promise<KnowledgeSearchResult[]> {
  const { items } = useKnowledgeStore.getState()

  // Simple text search (upgrade to vector search later)
  const queryLower = query.toLowerCase()
  const queryTerms = queryLower.split(/\s+/)

  const scored = items
    .filter((item) => {
      if (filters?.fileType && item.fileType !== filters.fileType) return false
      if (
        filters?.tags?.length &&
        !filters.tags.some((t) => item.tags?.includes(t))
      )
        return false
      return true
    })
    .map((item) => {
      const searchText =
        `${item.name} ${item.content || ''} ${item.description || ''}`.toLowerCase()
      const score = queryTerms.filter((term) =>
        searchText.includes(term),
      ).length
      return { item, score }
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)

  return scored.map(({ item }) => ({
    id: item.id,
    name: item.name,
    type: item.fileType,
    snippet: extractSnippet(item.content, queryTerms),
    path: item.path,
  }))
}

function extractSnippet(
  content: string | undefined,
  terms: string[],
  maxLength = 200,
): string {
  if (!content) return ''
  // Find first occurrence of any term and extract surrounding context
  // ... implementation
}
```

**Acceptance Criteria:**

- [x] Searches actual knowledge base items
- [x] Returns relevant snippets, not full content
- [x] Respects filters (type, tags)
- [x] Handles empty knowledge base gracefully

---

### 2.3 Implement Artifact Creation Tool ✅ ✅

**File:** `src/lib/tools/executors/artifact-create.ts`

**Connect to existing Artifact Store:**

```typescript
import { useArtifactStore } from '@/stores/artifactStore'

export async function executeArtifactCreate(
  title: string,
  type: ArtifactType,
  format: string,
  content: string,
  context: ToolExecutionContext,
): Promise<{ artifactId: string; success: boolean }> {
  const { createArtifact } = useArtifactStore.getState()

  const artifact = await createArtifact({
    title,
    type,
    format,
    content,
    description: `Created by agent ${context.agentId}`,
    taskId: context.taskId,
    agentId: context.agentId,
    status: 'completed',
  })

  return {
    artifactId: artifact.id,
    success: true,
  }
}
```

**Acceptance Criteria:**

- [x] Artifacts appear in artifact store
- [x] Linked to conversation/task context
- [x] User can view/edit/delete created artifacts

---

## Phase 3: Streaming & UX ✅ COMPLETED

### 3.1 Add Streaming to Agent Loop ✅

**File:** `src/lib/agent-loop.ts`

**Current Problem:** User sees nothing until entire loop completes.

**Solution:** Yield streaming updates during plan phase.

```typescript
// Change method signature to async generator
async *runWithStreaming(): AsyncGenerator<AgentLoopUpdate, AgentLoopState, void> {
  // ... setup ...

  while (this.state.status === 'running') {
    // Stream plan phase
    yield { type: 'step_start', step: this.state.currentStep }

    for await (const chunk of this.planPhaseStreaming()) {
      yield { type: 'reasoning', content: chunk }
    }

    yield { type: 'decision', decision: this.currentDecision }

    // Execute actions (can't stream these)
    if (this.currentDecision.toolCalls?.length) {
      yield { type: 'tools_start', tools: this.currentDecision.toolCalls.map(t => t.name) }
      const observations = await this.executeToolCalls(...)
      yield { type: 'tools_complete', observations }
    }

    yield { type: 'step_complete', step: this.state.currentStep }
  }

  return this.state
}

private async *planPhaseStreaming(): AsyncGenerator<string> {
  for await (const chunk of LLMService.streamChat(this.conversationHistory, this.llmConfig, {
    tools: this.config.tools,
    toolChoice: 'auto'
  })) {
    yield chunk
  }
}
```

**File:** `src/lib/chat.ts`

Update `executeAgentLoopChat` to consume the generator:

```typescript
async function executeAgentLoopChat(
  options: AgentLoopChatOptions,
): Promise<ChatSubmitResult> {
  const loop = new AgentLoop(agent, prompt, config)

  for await (const update of loop.runWithStreaming()) {
    switch (update.type) {
      case 'reasoning':
        currentResponse += update.content
        onResponseUpdate(formatProgress(currentResponse, state))
        break
      case 'decision':
        // Show what the agent decided
        break
      case 'tools_complete':
        // Show tool results
        break
    }
  }
}
```

**Acceptance Criteria:**

- [x] User sees reasoning text stream in real-time
- [x] Tool execution shows "Searching..." / "Running code..." status
- [x] Final answer streams like normal chat

---

### 3.2 Add Cancellation Support ✅

**File:** `src/lib/agent-loop.ts`

```typescript
export class AgentLoop {
  private abortController: AbortController

  constructor(...) {
    this.abortController = new AbortController()
  }

  cancel(): void {
    this.abortController.abort()
    this.state.status = 'cancelled'
  }

  private async executeToolCalls(toolCalls: ToolCall[]): Promise<AgentObservation[]> {
    return Promise.all(
      toolCalls.map(tc =>
        this.config.toolExecutor(tc, { signal: this.abortController.signal })
      )
    )
  }
}
```

**File:** `src/lib/chat.ts`

Expose cancel function to UI:

```typescript
interface ChatSubmitResult {
  success: boolean
  error?: string
  cancel?: () => void // New: allows cancellation
}
```

**Acceptance Criteria:**

- [x] User can click "Stop" button during agent loop
- [x] In-flight LLM calls are aborted
- [x] In-flight tool executions are aborted (where possible)
- [x] State is marked as 'cancelled' (not 'failed')

---

## Phase 4: Parallel Tool Execution ✅ COMPLETED

### 4.1 Execute Independent Tools in Parallel

**File:** `src/lib/agent-loop.ts`

```typescript
private async executeToolCalls(toolCalls: ToolCall[]): Promise<AgentObservation[]> {
  // Execute all tools in parallel
  const results = await Promise.allSettled(
    toolCalls.map(async (toolCall) => {
      const startTime = Date.now()
      try {
        const result = await this.config.toolExecutor(toolCall)
        return {
          toolCall,
          result,
          duration: Date.now() - startTime
        }
      } catch (error) {
        return {
          toolCall,
          error,
          duration: Date.now() - startTime
        }
      }
    })
  )

  return results.map((settled, i) => {
    if (settled.status === 'fulfilled') {
      const { toolCall, result, duration } = settled.value
      return {
        type: 'tool_result' as const,
        content: formatToolResult(result),
        source: toolCall.name,
        success: result.success,
        timestamp: new Date(),
        metadata: { duration }
      }
    } else {
      return {
        type: 'error' as const,
        content: settled.reason?.message || 'Tool execution failed',
        source: toolCalls[i].name,
        success: false,
        timestamp: new Date()
      }
    }
  })
}
```

**Acceptance Criteria:**

- [x] Multiple tool calls execute concurrently
- [x] Individual failures don't block other tools
- [x] Duration tracked per-tool for debugging

---

## Phase 5: Cleanup & Polish ✅ COMPLETED

### 5.1 Remove Dead Code ✅

**Files to modify:**

1. **Remove delegation logic** (until actually implemented):
   - Delete `executeDelegate()` method
   - Remove `[DELEGATE:...]` parsing from `parseDecision()`
   - Remove `delegateToAgent` from `AgentDecision`
   - Remove `availableAgents` from config

2. **Remove reflect type** (it does nothing):
   - Remove `'reflect'` from `AgentDecisionType`
   - Remove `[REFLECT]` parsing
   - Remove scratchpad (or make it useful first)

### 5.2 Add Token/Cost Tracking ✅

**File:** `src/lib/agent-loop.ts`

```typescript
interface AgentLoopState {
  // ... existing fields ...

  usage: {
    totalTokens: number
    promptTokens: number
    completionTokens: number
    estimatedCost: number  // USD
    llmCalls: number
  }
}

// Update after each LLM call
private updateUsage(response: LLMResponse): void {
  if (response.usage) {
    this.state.usage.promptTokens += response.usage.promptTokens
    this.state.usage.completionTokens += response.usage.completionTokens
    this.state.usage.totalTokens += response.usage.totalTokens
    this.state.usage.llmCalls++
    // Estimate cost based on model
    this.state.usage.estimatedCost += this.estimateCost(response.usage)
  }
}
```

**Acceptance Criteria:**

- [x] Usage stats visible in UI during/after loop
- [x] Per-step token breakdown available
- [ ] Optional: warn user if approaching budget

---

## Phase 6: Testing ✅ COMPLETED

### Unit Tests

**File:** `src/test/agent-loop.test.ts`

```typescript
describe('AgentLoop', () => {
  describe('shouldUseAgentLoop', () => {
    it('returns false when no tools available', () => {})
    it('returns true for search queries', () => {})
    it('returns true for complex multi-line prompts', () => {})
    it('returns false for simple greetings', () => {})
  })

  describe('executeStep', () => {
    it('creates one step per iteration', () => {})
    it('handles tool call decisions', () => {})
    it('handles answer decisions', () => {})
    it('feeds observations back to next plan', () => {})
  })

  describe('tool execution', () => {
    it('executes tools in parallel', () => {})
    it('handles partial failures gracefully', () => {})
    it('respects abort signal', () => {})
  })
})
```

### Integration Tests

**File:** `tests/e2e/agent-loop.spec.ts`

```typescript
test('complete agent loop with web search', async ({ page }) => {
  // 1. Configure search API key
  // 2. Send a query that triggers agent loop
  // 3. Verify reasoning streams to UI
  // 4. Verify tool execution is shown
  // 5. Verify final answer incorporates search results
})
```

---

## Implementation Status

| Phase      | Tasks                                                  | Status     |
| ---------- | ------------------------------------------------------ | ---------- |
| Foundation | 1.1 Local heuristic, 1.2 Step model, 1.3 Feedback loop | ✅ Done    |
| Testing    | Unit tests for foundation (74 tests)                   | ✅ Done    |
| Tools      | 2.1 Web search, 2.2 Knowledge query, 2.3 Artifacts     | ✅ Done    |
| UX         | 3.1 Streaming, 3.2 Cancellation                        | ✅ Done    |
| Polish     | 4.1 Parallel execution, 5.1 Dead code, 5.2 Tokens      | ✅ Done    |
| Testing    | E2E tests                                              | 🔜 Pending |

---

## Success Metrics

1. **Functional:** ✅ User can trigger agent loop with tool requests and get real answers
2. **Performance:** ✅ Agent loop uses fast local heuristic (<1ms vs previous LLM call)
3. **UX:** ✅ User sees streaming updates via async generator
4. **Reliability:** ✅ Graceful error handling with malformed responses (Gemini fix)
5. **Observability:** ✅ Every step is traceable with timings and token counts

---

## Known Issues & Future Improvements

1. **Budget Warning** - Token budget warning not yet implemented
2. **E2E Tests** - End-to-end tests for agent loop pending
3. **Gemini Compatibility** - Added graceful handling for `MALFORMED_FUNCTION_CALL` errors from Gemini API
