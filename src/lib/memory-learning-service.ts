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
import { useAgentMemoryStore } from '@/stores/agentMemoryStore'
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

const EXTRACTION_SYSTEM_PROMPT = `You are a memory extraction specialist. Your task is to analyze conversations and extract learnable information that would be valuable for an AI agent to remember about the user or domain.

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
1. Only extract information that would be genuinely useful for future conversations
2. Avoid extracting trivial or one-time information
3. Be specific and actionable in the content
4. Extract keywords that would help retrieve this memory later
5. Assign confidence based on how clearly the information was communicated
6. **IMPORTANT**: Only extract NEW information explicitly shared by the user in their messages
7. **DO NOT** extract information that the assistant already knew or mentioned first
8. **DO NOT** extract information from any "Remembered Context" or memory sections - these are already stored

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
\`\`\``

const SYNTHESIS_SYSTEM_PROMPT = `You are a memory synthesis specialist. Your task is to create a comprehensive summary document of an agent's learned memories about a user.

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
Focus on actionable information that would help improve future interactions.`

// ============================================================================
// Memory Learning Service
// ============================================================================

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
      memories,
    } = useAgentMemoryStore.getState()

    const pendingEvents = getPendingLearningEvents(agentId)
    const createdMemories: AgentMemoryEntry[] = []

    // Get all existing memories for this agent (any status) to check for duplicates
    const existingMemories = memories.filter((m) => m.agentId === agentId)

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
    const { memories, getMemoryStats, createOrUpdateMemoryDocument } =
      useAgentMemoryStore.getState()

    // Get approved memories for this agent
    const agentMemories = memories.filter(
      (m) =>
        m.agentId === agentId &&
        (m.validationStatus === 'approved' ||
          m.validationStatus === 'auto_approved'),
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
   * Build context injection string from relevant memories
   * This is used to inject memories into chat context
   */
  static async buildMemoryContextForChat(
    agentId: string,
    userPrompt: string,
  ): Promise<string> {
    const { getRelevantMemoriesAsync, recordMemoryUsage } =
      useAgentMemoryStore.getState()

    // Extract keywords from user prompt (simple tokenization)
    const keywords = userPrompt
      .toLowerCase()
      .split(/\s+/)
      .filter((word) => word.length > 3)
      .slice(0, 10)

    // Get relevant memories (async to ensure loading from IndexedDB)
    const relevantMemories = await getRelevantMemoriesAsync(
      agentId,
      keywords,
      [],
      10,
    )

    if (relevantMemories.length === 0) {
      return ''
    }

    // Record usage for analytics
    for (const memory of relevantMemories) {
      await recordMemoryUsage(memory.id)
    }

    // Build context string
    const memoryContext = relevantMemories
      .map((m) => `• [${m.category}] ${m.title}: ${m.content}`)
      .join('\n')

    return /* md */ `## Remembered Context about the User

The following information was learned from previous conversations and may be relevant:

${memoryContext}

Use this context to provide more personalized and contextually relevant responses.

---

`
  }

  /**
   * Auto-approve high confidence memories after delay
   * Should be called periodically (e.g., daily)
   */
  static async autoApproveMaturedMemories(
    agentId: string,
    delayHours: number = 24,
  ): Promise<number> {
    const { memories, updateMemory } = useAgentMemoryStore.getState()

    const now = new Date()
    const cutoffDate = new Date(now.getTime() - delayHours * 60 * 60 * 1000)

    const memoriesToAutoApprove = memories.filter(
      (m) =>
        m.agentId === agentId &&
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
export const learnFromMessage =
  MemoryLearningService.learnFromMessage.bind(MemoryLearningService)
export const processPendingLearningEvents =
  MemoryLearningService.processPendingLearningEvents.bind(MemoryLearningService)
export const generateMemorySynthesis =
  MemoryLearningService.generateMemorySynthesis.bind(MemoryLearningService)
export const buildMemoryContextForChat =
  MemoryLearningService.buildMemoryContextForChat.bind(MemoryLearningService)
