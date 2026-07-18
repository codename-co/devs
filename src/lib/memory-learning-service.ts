/**
 * Memory Learning Service
 *
 * This service is responsible for:
 * 1. Extracting learnable information from conversations
 * 2. Processing learning events into memories
 * 3. Generating memory synthesis documents
 * 4. Managing the learning workflow with human review
 */

import { LLMService, LLMMessage } from '@/lib/llm'
import { CredentialService } from '@/lib/credential-service'
import {
  useAgentMemoryStore,
  getMemoriesByAgentId,
  getMemoriesByAgentIdDecrypted,
  getGlobalMemoriesDecrypted,
} from '@/stores/agentMemoryStore'
import { useConversationStore } from '@/stores/conversationStore'
import { Lang, languages } from '@/i18n'
import type {
  Conversation,
  AgentMemoryEntry,
  MemoryLearningEvent,
  MemoryCategory,
  MemoryConfidence,
  AgentMemoryDocument,
} from '@/types'

// ============================================================================
// Types
// ============================================================================

interface ExtractedLearning {
  category: MemoryCategory
  title: string
  content: string
  confidence: MemoryConfidence
  keywords: string[]
  sourceMessageIndices: number[]
}

interface LearningExtractionResult {
  learnings: ExtractedLearning[]
  summary: string
}

interface SynthesisResult {
  synthesis: string
  memoriesByCategory: Record<MemoryCategory, number>
  memoriesByConfidence: Record<MemoryConfidence, number>
}

// ============================================================================
// Prompts
// ============================================================================

const EXTRACTION_SYSTEM_PROMPT = /* md */ `You are a memory extraction specialist. Your task is to analyze conversations and extract learnable information that would be valuable for an AI agent to remember about the user or domain.

## Categories of Learnings:
- **fact**: Factual information about the user, their work, preferences, or domain
- **preference**: User preferences, likes/dislikes, preferred ways of working
- **behavior**: Patterns in how the user interacts, communicates, or makes decisions
- **domain_knowledge**: Specific knowledge about the user's domain/industry/field
- **relationship**: Relationships between people, concepts, or entities mentioned
- **procedure**: How the user likes certain tasks to be done, workflows, processes
- **correction**: Corrections to assumptions or previous information

## Confidence Levels:
- **high**: Explicitly stated by user or strongly evident from context
- **medium**: Reasonably inferred from conversation patterns
- **low**: Tentatively inferred, might need validation

## Guidelines:
1. Extract information that would help personalize FUTURE interactions
2. Focus on information with lasting value about the user, not conversation-specific details
3. Be specific and actionable in the content
4. Extract keywords that would help retrieve this memory later
5. Assign confidence based on how clearly the information was communicated
6. **DO NOT** extract information from any "Remembered Context" or memory sections - these are already stored

## What TO extract:
- User's name, job title, company, or location (if they share it about themselves)
- Technologies, tools, or frameworks the user works with regularly
- User's preferences about communication style or how they want help
- Ongoing projects or goals the user is working toward
- Key relationships (their team, clients, collaborators) with context about the relationship

## What NOT to extract:
- Names or entities merely mentioned in the conversation without context about their relationship to the user
- Temporary or one-off requests (e.g., "translate this text")
- Information the assistant provided (only extract what the USER shared)
- Generic facts that don't tell us anything specific about this user

Respond in JSON format:
\`\`\`json
{
  "learnings": [
    {
      "category": "fact|preference|behavior|domain_knowledge|relationship|procedure|correction",
      "title": "Short descriptive title (max 60 chars)",
      "content": "Detailed description of what was learned",
      "confidence": "high|medium|low",
      "keywords": ["keyword1", "keyword2"],
      "sourceMessageIndices": [0, 2, 5]
    }
  ],
  "summary": "Brief summary of the conversation's key learnable points"
}
\`\`\`

If no learnable information is found, return:
\`\`\`json
{
  "learnings": [],
  "summary": "No significant learnable information in this conversation"
}
\`\`\`
`

const SYNTHESIS_SYSTEM_PROMPT = /* md */ `You are a memory synthesis specialist. Your task is to create a comprehensive summary document of an agent's learned memories about a user.

This document serves as the agent's "working memory" - a persistent reference that helps the agent maintain continuity across conversations.

## Structure your synthesis as follows:

# Agent Memory Synthesis

## Key Facts
- Important factual information about the user

## Preferences & Style
- How the user likes to work, communicate, receive information

## Domain Context
- Relevant domain knowledge and context

## Relationships & Connections
- Important relationships and connections mentioned

## Procedures & Workflows
- How the user prefers certain tasks to be done

## Recent Updates
- Notable recent learnings or corrections

## Confidence Notes
- Any information with lower confidence that may need validation

Write in clear, concise language. Use bullet points for readability.
Focus on actionable information that would help improve future interactions.
`

const MEMORY_COMPACTION_SYSTEM_PROMPT = /* md */ `You are a memory editor. You are given an agent's long-term memory document (markdown) about a user. Rewrite it to be a clean, compact, deduplicated set of durable notes.

Rules:
- Merge duplicates and near-duplicates into a single note.
- Remove one-off/transient details, resolved tasks, and anything not durably useful.
- Keep durable facts about the user, their preferences, ongoing goals/projects, key relationships, and corrections.
- Prefer short bullet points grouped under a few simple headings.
- Do NOT invent information. Only reorganise and condense what is present.
- Keep the user's language.
- Return ONLY the cleaned markdown document, with no preamble, explanation, or code fences.
`

const AUTO_CAPTURE_SYSTEM_PROMPT = /* md */ `You maintain an AI agent's long-term memory about a user. Given the agent's CURRENT MEMORY and the LATEST EXCHANGE, decide whether the user revealed something durable and worth remembering for future conversations.

Extract ONLY new, durable information that is NOT already in CURRENT MEMORY:
- the user's name, role, company, location (about themselves)
- stable preferences (communication style, tools, ways of working)
- ongoing goals or projects
- key relationships (team, clients) with context
- corrections to something previously remembered

Do NOT extract:
- one-off or transient requests
- anything already present in CURRENT MEMORY
- information the assistant provided (only what the USER shared)
- generic facts that don't characterise this user

Output format:
- If there is nothing new and durable, output exactly: NONE
- Otherwise output one short markdown bullet per new fact ("- ..."), and nothing else. No preamble, no code fences.
`

// ============================================================================
// Memory Learning Service
// ============================================================================

/**
 * Reserved key in the `agentMemoryDocuments` map for the global memory document
 * — shared across all agents and injected into every conversation. The
 * double-underscore prefix avoids collision with real agent ids.
 */
export const GLOBAL_MEMORY_AGENT_ID = '__global__'

export class MemoryLearningService {
  /**
   * Extract learnable information from a conversation
   */
  static async extractLearningsFromConversation(
    conversation: Conversation,
    _agentId: string,
    lang?: Lang,
  ): Promise<LearningExtractionResult> {
    const config = await CredentialService.getActiveConfig()
    if (!config) {
      console.warn('No LLM config available for memory extraction')
      return { learnings: [], summary: 'No LLM config available' }
    }

    // Filter out system messages and only include user/assistant exchanges
    const relevantMessages = conversation.messages.filter(
      (msg) => msg.role === 'user' || msg.role === 'assistant',
    )

    // Skip if conversation is too short
    if (relevantMessages.length < 2) {
      return { learnings: [], summary: 'Conversation too short for extraction' }
    }

    // Build conversation text for analysis, excluding system prompts
    // Also strip any injected memory context sections from messages
    const conversationText = relevantMessages
      .map((msg, idx) => {
        let content = msg.content

        // Remove injected memory context sections that start with "## Remembered Context"
        // These are added by buildMemoryContextForChat and shouldn't be re-learned
        content = content.replace(
          /## Remembered Context about the User[\s\S]*?---\s*/g,
          '',
        )

        return `[${idx}] ${msg.role.toUpperCase()}: ${content.trim()}`
      })
      .filter((text) => text.length > 0)
      .join('\n\n')

    // Build system prompt with language instruction
    const languageInstruction = lang
      ? `\n\nIMPORTANT: Extract and write all learnings (title, content, summary) in ${languages[lang]} as this is the user's preferred language.`
      : ''

    const messages: LLMMessage[] = [
      {
        role: 'system',
        content: EXTRACTION_SYSTEM_PROMPT + languageInstruction,
      },
      {
        role: 'user',
        content: `Analyze this conversation and extract learnable information:\n\n${conversationText}`,
      },
    ]

    try {
      const response = await LLMService.chat(messages, {
        ...config,
        temperature: 0.3, // Lower temperature for more consistent extraction
        maxTokens: 2000,
      })

      return this.parseExtractionResponse(response.content)
    } catch (error) {
      console.error('Failed to extract learnings:', error)
      return { learnings: [], summary: 'Extraction failed' }
    }
  }

  /**
   * Parse the LLM response for learning extraction
   */
  private static parseExtractionResponse(
    content: string,
  ): LearningExtractionResult {
    try {
      // Extract JSON from response (handle markdown code blocks)
      let jsonStr = content.trim()

      // Strip markdown code fences if present
      // Handle ```json ... ``` or ``` ... ```
      const codeBlockMatch = jsonStr.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/m)
      if (codeBlockMatch) {
        jsonStr = codeBlockMatch[1].trim()
      } else {
        // Try to find code block anywhere in the content
        const inlineCodeBlock = jsonStr.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
        if (inlineCodeBlock) {
          jsonStr = inlineCodeBlock[1].trim()
        } else {
          // Fall back to finding raw JSON object
          const jsonObjectMatch = jsonStr.match(/\{[\s\S]*\}/)
          if (jsonObjectMatch) {
            jsonStr = jsonObjectMatch[0]
          }
        }
      }

      if (!jsonStr || !jsonStr.startsWith('{')) {
        console.warn('No JSON found in extraction response')
        return { learnings: [], summary: 'Could not parse response' }
      }

      // First try parsing the JSON as-is (most LLM responses are valid JSON)
      let parsed: any
      try {
        parsed = JSON.parse(jsonStr)
      } catch {
        // Only attempt sanitization if direct parsing fails
        console.debug('Direct JSON parse failed, attempting sanitization')
        const sanitized = this.sanitizeJson(jsonStr)
        parsed = JSON.parse(sanitized)
      }

      // Validate and sanitize the response
      const learnings: ExtractedLearning[] = (parsed.learnings || [])
        .filter(
          (l: any) =>
            l.category &&
            l.title &&
            l.content &&
            l.confidence &&
            Array.isArray(l.keywords),
        )
        .map((l: any) => ({
          category: l.category as MemoryCategory,
          title: String(l.title).slice(0, 100),
          content: String(l.content),
          confidence: l.confidence as MemoryConfidence,
          keywords: l.keywords.map(String),
          sourceMessageIndices: l.sourceMessageIndices || [],
        }))

      return {
        learnings,
        summary: parsed.summary || 'Extraction complete',
      }
    } catch (error) {
      console.error('Failed to parse extraction response:', error)
      console.debug('Raw content:', content)
      return { learnings: [], summary: 'Parse error' }
    }
  }

  /**
   * Attempt to sanitize malformed JSON from LLM responses
   */
  private static sanitizeJson(jsonStr: string): string {
    let result = jsonStr.trim()

    // Remove any leading/trailing text that's not part of the JSON
    const firstBrace = result.indexOf('{')
    const lastBrace = result.lastIndexOf('}')
    if (firstBrace !== -1 && lastBrace !== -1) {
      result = result.slice(firstBrace, lastBrace + 1)
    }

    // Fix common issues:

    // 1. Handle values with unbalanced single quotes (e.g., Aristotle' -> "Aristotle")
    // Match: "key": value' or "key": value'text'
    result = result.replace(
      /"(\w+)":\s*([^",\[\]{}]+?)'/g,
      (_, key, value) => `"${key}": "${value.trim()}"`,
    )

    // 2. Replace single quotes used for strings with double quotes
    // Handle: 'value' -> "value"
    result = result.replace(/:\s*'([^']*)'/g, ': "$1"')
    result = result.replace(/,\s*'([^']*)'/g, ', "$1"')
    result = result.replace(/\[\s*'([^']*)'/g, '["$1"')
    result = result.replace(/'(\s*[,\]\}])/g, '"$1')

    // 3. Remove trailing commas before ] or }
    result = result.replace(/,(\s*[}\]])/g, '$1')

    // 4. Fix unquoted string values that look like identifiers
    // Match pattern: "key": unquotedValue, or "key": unquotedValue}
    result = result.replace(
      /"(\w+)":\s*([a-zA-Z_][a-zA-Z0-9_\s]*[a-zA-Z0-9_])\s*([,}\]])/g,
      (_match, key, value, ending) => {
        // Don't quote booleans, null, or numbers
        const trimmedValue = value.trim()
        if (
          ['true', 'false', 'null'].includes(trimmedValue) ||
          !isNaN(Number(trimmedValue))
        ) {
          return `"${key}": ${trimmedValue}${ending}`
        }
        return `"${key}": "${trimmedValue}"${ending}`
      },
    )

    // 5. Fix completely unquoted string values (handle multi-word)
    // Match: "key": Some Unquoted Text,
    result = result.replace(
      /"(\w+)":\s+([A-Z][^",\[\]{}]*?)(\s*[,}\]])/g,
      (match, key, value, ending) => {
        const trimmedValue = value.trim()
        // Skip if already looks like a valid JSON value
        if (
          trimmedValue.startsWith('"') ||
          trimmedValue.startsWith('[') ||
          trimmedValue.startsWith('{') ||
          ['true', 'false', 'null'].includes(trimmedValue) ||
          !isNaN(Number(trimmedValue))
        ) {
          return match
        }
        return `"${key}": "${trimmedValue}"${ending}`
      },
    )

    return result
  }

  /**
   * Process a conversation and create learning events
   */
  static async learnFromConversation(
    conversationId: string,
    agentId: string,
    lang?: Lang,
  ): Promise<MemoryLearningEvent[]> {
    const conversationStore = useConversationStore.getState()
    let conversation = conversationStore.conversations.find(
      (c) => c.id === conversationId,
    )

    // If not found in memory, try loading from IndexedDB
    if (!conversation) {
      await conversationStore.loadConversation(conversationId)
      // After loading, check currentConversation
      const updatedState = useConversationStore.getState()
      if (updatedState.currentConversation?.id === conversationId) {
        conversation = updatedState.currentConversation
      }
    }

    if (!conversation) {
      console.warn(
        `Conversation ${conversationId} not found in memory or database`,
      )
      return []
    }

    // Extract learnings
    const { learnings, summary } = await this.extractLearningsFromConversation(
      conversation,
      agentId,
      lang,
    )

    if (learnings.length === 0) {
      console.log(`No learnings extracted from conversation ${conversationId}`)
      return []
    }

    // Create learning events
    const { createLearningEvent } = useAgentMemoryStore.getState()
    const events: MemoryLearningEvent[] = []

    for (const learning of learnings) {
      const event = await createLearningEvent({
        agentId,
        conversationId,
        rawExtraction: JSON.stringify(learning),
        suggestedCategory: learning.category,
        suggestedConfidence: learning.confidence,
      })
      events.push(event)
    }

    console.log(
      `Created ${events.length} learning events from conversation. Summary: ${summary}`,
    )
    return events
  }

  /**
   * Extract learnable information from a single message turn (user message + assistant response)
   */
  static async learnFromMessage(
    userMessage: string,
    assistantMessage: string,
    agentId: string,
    conversationId: string,
    lang?: Lang,
  ): Promise<MemoryLearningEvent[]> {
    const config = await CredentialService.getActiveConfig()
    if (!config) {
      console.warn('No LLM config available for memory extraction')
      return []
    }

    // Build the turn text for analysis
    const turnText = `[0] USER: ${userMessage.trim()}\n\n[1] ASSISTANT: ${assistantMessage.trim()}`

    // Build system prompt with language instruction
    const languageInstruction = lang
      ? `\n\nIMPORTANT: Extract and write all learnings (title, content, summary) in ${languages[lang]} as this is the user's preferred language.`
      : ''

    const messages: LLMMessage[] = [
      {
        role: 'system',
        content: EXTRACTION_SYSTEM_PROMPT + languageInstruction,
      },
      {
        role: 'user',
        content: `Analyze this conversation turn and extract learnable information:\n\n${turnText}`,
      },
    ]

    try {
      const response = await LLMService.chat(messages, {
        ...config,
        temperature: 0.3,
        maxTokens: 2000,
      })

      const { learnings, summary } = this.parseExtractionResponse(
        response.content,
      )

      if (learnings.length === 0) {
        console.log(`No learnings extracted from message turn`)
        return []
      }

      // Create learning events
      const { createLearningEvent } = useAgentMemoryStore.getState()
      const events: MemoryLearningEvent[] = []

      for (const learning of learnings) {
        const event = await createLearningEvent({
          agentId,
          conversationId,
          rawExtraction: JSON.stringify(learning),
          suggestedCategory: learning.category,
          suggestedConfidence: learning.confidence,
        })
        events.push(event)
      }

      console.log(
        `Created ${events.length} learning events from message turn. Summary: ${summary}`,
      )
      return events
    } catch (error) {
      console.error('Failed to learn from message:', error)
      return []
    }
  }

  /**
   * Check if a memory is a duplicate of an existing one
   * Compares title and content similarity
   */
  private static isDuplicateMemory(
    newLearning: ExtractedLearning,
    existingMemories: AgentMemoryEntry[],
  ): boolean {
    const normalizeText = (text: string) =>
      text.toLowerCase().trim().replace(/\s+/g, ' ')

    const newTitle = normalizeText(newLearning.title)
    const newContent = normalizeText(newLearning.content)

    for (const existing of existingMemories) {
      const existingTitle = normalizeText(existing.title)
      const existingContent = normalizeText(existing.content)

      // Exact title match
      if (newTitle === existingTitle) {
        console.log(
          `Duplicate memory detected (title match): "${newLearning.title}"`,
        )
        return true
      }

      // Exact content match
      if (newContent === existingContent) {
        console.log(
          `Duplicate memory detected (content match): "${newLearning.title}"`,
        )
        return true
      }

      // High similarity check - if new content is contained in existing or vice versa
      if (
        newContent.length > 20 &&
        (existingContent.includes(newContent) ||
          newContent.includes(existingContent))
      ) {
        console.log(
          `Duplicate memory detected (content overlap): "${newLearning.title}"`,
        )
        return true
      }

      // Check if title is very similar (one is substring of other)
      if (
        newTitle.length > 10 &&
        (existingTitle.includes(newTitle) || newTitle.includes(existingTitle))
      ) {
        console.log(
          `Duplicate memory detected (title similarity): "${newLearning.title}"`,
        )
        return true
      }
    }

    return false
  }

  /**
   * Process pending learning events into memories
   * This creates memories in "pending" validation status for human review
   */
  static async processPendingLearningEvents(
    agentId: string,
  ): Promise<AgentMemoryEntry[]> {
    const {
      getPendingLearningEvents,
      createMemory,
      markLearningEventProcessed,
    } = useAgentMemoryStore.getState()

    const pendingEvents = getPendingLearningEvents(agentId)
    const createdMemories: AgentMemoryEntry[] = []

    // Get all existing memories for this agent (any status) to check for duplicates
    const existingMemories = getMemoriesByAgentId(agentId)

    for (const event of pendingEvents) {
      try {
        const learning: ExtractedLearning = JSON.parse(event.rawExtraction)

        // Check for duplicates against existing memories and already created ones
        const allMemoriesToCheck = [...existingMemories, ...createdMemories]
        if (this.isDuplicateMemory(learning, allMemoriesToCheck)) {
          // Mark as processed but don't create memory
          await markLearningEventProcessed(
            event.id,
            undefined,
            'Duplicate of existing memory',
          )
          continue
        }

        // Create memory from learning event
        const memory = await createMemory({
          agentId,
          category: learning.category,
          title: learning.title,
          content: learning.content,
          confidence: learning.confidence,
          validationStatus: 'pending', // Requires human review
          sourceConversationIds: [event.conversationId],
          sourceMessageIds: [], // Could be enhanced to track specific messages
          learnedAt: new Date(),
          tags: [],
          keywords: learning.keywords,
        })

        // Mark event as processed
        await markLearningEventProcessed(event.id, memory.id)
        createdMemories.push(memory)
      } catch (error) {
        console.error(`Failed to process learning event ${event.id}:`, error)
        await markLearningEventProcessed(
          event.id,
          undefined,
          `Processing failed: ${error}`,
        )
      }
    }

    return createdMemories
  }

  /**
   * Generate a synthesis document for an agent's memories
   */
  static async generateMemorySynthesis(
    agentId: string,
  ): Promise<SynthesisResult> {
    const { getMemoryStats, createOrUpdateMemoryDocument } =
      useAgentMemoryStore.getState()

    // Get approved memories for this agent
    const agentMemories = getMemoriesByAgentId(agentId).filter(
      (m) =>
        m.validationStatus === 'approved' ||
        m.validationStatus === 'auto_approved',
    )

    if (agentMemories.length === 0) {
      return {
        synthesis: 'No validated memories yet.',
        memoriesByCategory: {
          fact: 0,
          preference: 0,
          behavior: 0,
          domain_knowledge: 0,
          relationship: 0,
          procedure: 0,
          correction: 0,
        },
        memoriesByConfidence: { high: 0, medium: 0, low: 0 },
      }
    }

    const config = await CredentialService.getActiveConfig()
    if (!config) {
      throw new Error('No LLM config available for synthesis')
    }

    // Build memory list for synthesis
    const memoryText = agentMemories
      .map(
        (m) =>
          `[${m.category.toUpperCase()}] (${m.confidence} confidence)\n${m.title}: ${m.content}`,
      )
      .join('\n\n---\n\n')

    const messages: LLMMessage[] = [
      { role: 'system', content: SYNTHESIS_SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Create a synthesis document from these ${agentMemories.length} memories:\n\n${memoryText}`,
      },
    ]

    try {
      const response = await LLMService.chat(messages, {
        ...config,
        temperature: 0.4,
        maxTokens: 3000,
      })

      const stats = getMemoryStats(agentId)

      // Update the memory document
      await createOrUpdateMemoryDocument(agentId, {
        synthesis: response.content,
        lastSynthesisAt: new Date(),
        totalMemories: stats.total,
        memoriesByCategory: stats.byCategory,
        memoriesByConfidence: stats.byConfidence,
        pendingReviewCount: stats.pendingReview,
      })

      return {
        synthesis: response.content,
        memoriesByCategory: stats.byCategory,
        memoriesByConfidence: stats.byConfidence,
      }
    } catch (error) {
      console.error('Failed to generate synthesis:', error)
      throw error
    }
  }

  /**
   * Get the current memory synthesis for an agent
   */
  static async getMemorySynthesis(
    agentId: string,
  ): Promise<AgentMemoryDocument | null> {
    const { loadMemoryDocument } = useAgentMemoryStore.getState()
    return loadMemoryDocument(agentId)
  }

  /**
   * Build context injection string from memory documents.
   *
   * Injects TWO documents: the global memory (shared across all agents) and the
   * agent-specific memory. Both are small, curated markdown docs injected whole
   * at the start of every conversation (see docs/more/MEMORY.md).
   *
   * The second argument (previously the user prompt, used for relevance scoring)
   * is kept for backward compatibility with existing callers but is ignored.
   */
  static async buildMemoryContextForChat(
    agentId: string,
    _userPrompt?: string,
  ): Promise<string> {
    const [globalMem, agentMem] = await Promise.all([
      this.readAgentMemory(GLOBAL_MEMORY_AGENT_ID),
      agentId === GLOBAL_MEMORY_AGENT_ID
        ? Promise.resolve('')
        : this.readAgentMemory(agentId),
    ])

    const sections: string[] = []
    if (globalMem.trim()) {
      sections.push(`### Shared (applies to all agents)\n\n${globalMem.trim()}`)
    }
    if (agentMem.trim()) {
      sections.push(`### Your own notes\n\n${agentMem.trim()}`)
    }
    if (sections.length === 0) return ''

    return /* md */ `## What you remember about the user

The following notes were saved from previous conversations. Treat them as
background knowledge and use them to stay consistent and personalised. If the
user contradicts or updates something here, prefer the newer information. Do not
mention these notes or that you are "remembering" — just use them naturally.

${sections.join('\n\n')}

---

`
  }

  // ==========================================================================
  // Memory Document (agent-directed, KISS)
  // ==========================================================================

  /** Reserved key for the global (all-agents) memory document. */
  static readonly GLOBAL_MEMORY_AGENT_ID = GLOBAL_MEMORY_AGENT_ID

  /** Soft cap on the memory document size, in characters (~a few hundred tokens). */
  static readonly MAX_MEMORY_CHARS = 4000

  /**
   * Read the agent's memory document (markdown).
   *
   * Lazily migrates legacy per-entry memories: if the document is empty but the
   * agent has approved/auto-approved memories from the old pipeline, they are
   * flattened into the document once so existing users keep their memory.
   */
  static async readAgentMemory(agentId: string): Promise<string> {
    const { loadMemoryDocument } = useAgentMemoryStore.getState()
    const doc = await loadMemoryDocument(agentId)
    const synthesis = doc?.synthesis?.trim() || ''
    if (synthesis) return synthesis

    // Lazy migration from legacy memories
    const flattened = await this.flattenLegacyMemories(agentId)
    if (flattened) {
      await this.writeAgentMemory(agentId, flattened)
      return flattened
    }
    return ''
  }

  /** Overwrite the agent's memory document. */
  static async writeAgentMemory(
    agentId: string,
    content: string,
  ): Promise<void> {
    const { createOrUpdateMemoryDocument } = useAgentMemoryStore.getState()
    await createOrUpdateMemoryDocument(agentId, {
      synthesis: content.trim(),
      lastSynthesisAt: new Date(),
    })
  }

  /**
   * Apply an agent-directed memory operation used by the `remember` tool.
   * Returns a short human-readable status for the LLM.
   */
  static async applyMemoryOperation(
    agentId: string,
    action: 'view' | 'append' | 'replace' | 'delete',
    args: { content?: string; find?: string },
  ): Promise<string> {
    const current = await this.readAgentMemory(agentId)

    if (action === 'view') {
      return current || '(memory is empty)'
    }

    let next = current

    if (action === 'append') {
      const note = (args.content || '').trim()
      if (!note) return 'Nothing to append: `content` was empty.'
      next = current ? `${current}\n${note}` : note
    } else if (action === 'replace') {
      const find = (args.find || '').trim()
      const content = (args.content || '').trim()
      if (!find) return 'Cannot replace: `find` was empty.'
      if (!current.includes(find)) {
        return `Cannot replace: text not found in memory. Current memory:\n${current || '(empty)'}`
      }
      next = current.split(find).join(content)
    } else if (action === 'delete') {
      const find = (args.find || '').trim()
      if (!find) return 'Cannot delete: `find` was empty.'
      if (!current.includes(find)) {
        return `Cannot delete: text not found in memory. Current memory:\n${current || '(empty)'}`
      }
      // Remove the matched text and tidy up leftover blank lines
      next = current
        .split(find)
        .join('')
        .replace(/\n{3,}/g, '\n\n')
        .trim()
    }

    next = next.trim()

    if (next.length > this.MAX_MEMORY_CHARS) {
      return `Memory is full (${next.length}/${this.MAX_MEMORY_CHARS} chars). Consolidate it first: use action "replace" or "delete" to remove or merge less important notes before adding new ones.`
    }

    await this.writeAgentMemory(agentId, next)
    return `Memory updated. It now contains ${next.length} characters.`
  }

  /**
   * Flatten legacy approved memories into a single markdown document.
   * Returns '' when there is nothing to migrate.
   */
  private static async flattenLegacyMemories(
    agentId: string,
  ): Promise<string> {
    let entries
    try {
      entries =
        agentId === GLOBAL_MEMORY_AGENT_ID
          ? await getGlobalMemoriesDecrypted()
          : await getMemoriesByAgentIdDecrypted(agentId)
    } catch {
      return ''
    }

    const approved = entries.filter(
      (m) =>
        m.validationStatus === 'approved' ||
        m.validationStatus === 'auto_approved',
    )
    if (approved.length === 0) return ''

    const lines = approved
      .map((m) => {
        const title = typeof m.title === 'string' ? m.title.trim() : ''
        const content = typeof m.content === 'string' ? m.content.trim() : ''
        if (title && content) return `- ${title}: ${content}`
        return `- ${title || content}`
      })
      .filter((l) => l.trim() !== '-')

    if (lines.length === 0) return ''
    return `# What I remember\n\n${lines.join('\n')}`
  }

  /**
   * Compact the agent's memory document with a single LLM pass: merge
   * duplicates, drop stale/one-off notes, and keep it concise and under budget
   * while preserving durable facts, preferences, goals and corrections.
   *
   * KISS: this is an occasional, user- or size-triggered operation — NOT a
   * per-turn call. Returns the compacted document (also persisted).
   */
  static async compactAgentMemory(agentId: string): Promise<string> {
    const current = await this.readAgentMemory(agentId)
    if (!current.trim()) return ''

    const config = await CredentialService.getActiveConfig()
    if (!config) {
      console.warn('No LLM config available for memory compaction')
      return current
    }

    const messages: LLMMessage[] = [
      { role: 'system', content: MEMORY_COMPACTION_SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Compact this memory document. Keep it under ${this.MAX_MEMORY_CHARS} characters. Return ONLY the cleaned markdown, no commentary:\n\n${current}`,
      },
    ]

    try {
      const response = await LLMService.chat(messages, {
        ...config,
        temperature: 0.2,
        maxTokens: 1500,
      })

      let compacted = response.content.trim()
      // Strip accidental markdown code fences around the whole doc
      const fenced = compacted.match(/^```(?:markdown|md)?\s*([\s\S]*?)\s*```$/m)
      if (fenced) compacted = fenced[1].trim()

      // Never let compaction lose everything or blow the budget
      if (!compacted) return current
      if (compacted.length > this.MAX_MEMORY_CHARS) {
        compacted = compacted.slice(0, this.MAX_MEMORY_CHARS).trim()
      }

      await this.writeAgentMemory(agentId, compacted)
      return compacted
    } catch (error) {
      console.error('Failed to compact memory:', error)
      return current
    }
  }

  /**
   * Opt-in auto-capture: after a conversation turn, make a SINGLE LLM call to
   * extract any new durable facts the user shared and append them to the memory
   * document. This is the cheap, document-based replacement for the old
   * per-turn extraction → event → review pipeline (see docs/more/MEMORY.md).
   *
   * Returns the notes that were added (empty array when nothing was captured).
   */
  static async autoCaptureToMemory(
    userMessage: string,
    assistantMessage: string,
    agentId: string,
    lang?: Lang,
  ): Promise<string[]> {
    const config = await CredentialService.getActiveConfig()
    if (!config) return []

    const current = await this.readAgentMemory(agentId)

    const languageInstruction = lang
      ? `\n\nWrite the notes in ${languages[lang]}.`
      : ''

    const messages: LLMMessage[] = [
      {
        role: 'system',
        content: AUTO_CAPTURE_SYSTEM_PROMPT + languageInstruction,
      },
      {
        role: 'user',
        content: `CURRENT MEMORY:\n${current || '(empty)'}\n\nLATEST EXCHANGE:\nUSER: ${userMessage.trim()}\nASSISTANT: ${assistantMessage.trim()}`,
      },
    ]

    let out: string
    try {
      const response = await LLMService.chat(messages, {
        ...config,
        temperature: 0.2,
        maxTokens: 500,
      })
      out = response.content.trim()
    } catch (error) {
      console.warn('Auto-capture failed (non-critical):', error)
      return []
    }

    if (!out || /^NONE\.?$/i.test(out)) return []

    // Keep only bullet lines, drop anything already present (case-insensitive).
    const normalize = (s: string) =>
      s
        .replace(/^[-*]\s*/, '')
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim()
    const existing = new Set(
      current.split('\n').map(normalize).filter(Boolean),
    )

    const newNotes = out
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => /^[-*]\s+/.test(l))
      .map((l) => `- ${l.replace(/^[-*]\s*/, '').trim()}`)
      .filter((l) => l.length > 2 && !existing.has(normalize(l)))

    if (newNotes.length === 0) return []

    const next = (current ? `${current}\n` : '') + newNotes.join('\n')
    if (next.length > this.MAX_MEMORY_CHARS) {
      // Don't overflow the budget silently; leave compaction to the user/agent.
      console.log('Auto-capture skipped: memory document is at its size budget.')
      return []
    }

    await this.writeAgentMemory(agentId, next.trim())
    return newNotes
  }

  /**
   * Auto-approve high confidence memories after delay
   * Should be called periodically (e.g., daily)
   */
  static async autoApproveMaturedMemories(
    agentId: string,
    delayHours: number = 24,
  ): Promise<number> {
    const { updateMemory } = useAgentMemoryStore.getState()

    const now = new Date()
    const cutoffDate = new Date(now.getTime() - delayHours * 60 * 60 * 1000)

    const memoriesToAutoApprove = getMemoriesByAgentId(agentId).filter(
      (m) =>
        m.validationStatus === 'pending' &&
        m.confidence === 'high' &&
        new Date(m.learnedAt) < cutoffDate,
    )

    for (const memory of memoriesToAutoApprove) {
      await updateMemory(memory.id, {
        validationStatus: 'auto_approved',
        reviewedAt: new Date(),
        reviewedBy: 'auto',
        reviewNotes: `Auto-approved after ${delayHours}h (high confidence)`,
      })
    }

    if (memoriesToAutoApprove.length > 0) {
      console.log(
        `Auto-approved ${memoriesToAutoApprove.length} high-confidence memories for agent ${agentId}`,
      )
    }

    return memoriesToAutoApprove.length
  }

  /**
   * Merge similar or duplicate memories
   */
  static async findAndMergeSimilarMemories(_agentId: string): Promise<number> {
    // This is a placeholder for future implementation
    // Would use semantic similarity to find and merge duplicate memories
    console.log('Memory merging not yet implemented')
    return 0
  }
}

// Export convenience functions
export const learnFromConversation =
  MemoryLearningService.learnFromConversation.bind(MemoryLearningService)
export const learnFromMessage = MemoryLearningService.learnFromMessage.bind(
  MemoryLearningService,
)
export const processPendingLearningEvents =
  MemoryLearningService.processPendingLearningEvents.bind(MemoryLearningService)
export const generateMemorySynthesis =
  MemoryLearningService.generateMemorySynthesis.bind(MemoryLearningService)
export const buildMemoryContextForChat =
  MemoryLearningService.buildMemoryContextForChat.bind(MemoryLearningService)
export const readAgentMemory =
  MemoryLearningService.readAgentMemory.bind(MemoryLearningService)
export const writeAgentMemory =
  MemoryLearningService.writeAgentMemory.bind(MemoryLearningService)
export const applyMemoryOperation =
  MemoryLearningService.applyMemoryOperation.bind(MemoryLearningService)
export const compactAgentMemory =
  MemoryLearningService.compactAgentMemory.bind(MemoryLearningService)
export const autoCaptureToMemory =
  MemoryLearningService.autoCaptureToMemory.bind(MemoryLearningService)
