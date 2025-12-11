import { LLMService, LLMMessage } from '@/lib/llm'
import { CredentialService } from '@/lib/credential-service'
import type { Message } from '@/types'

export class MessageDescriptionGenerator {
  private static readonly DESCRIPTION_GENERATION_PROMPT = `You are a message description generator. Create a concise, descriptive summary (5-10 words) for this conversation message that captures its key point or purpose.

Rules:
- Maximum 10 words, minimum 5 words
- Be specific and descriptive
- Focus on the main point or answer
- Avoid generic phrases
- Use sentence case
- No quotes or special formatting

Examples:
- "explains how to optimize database queries"
- "provides solution for TypeScript compilation error"
- "outlines steps to build authentication system"
- "recommends best practices for React hooks"

Message Content: {messageContent}

Respond with ONLY the description (5-10 words), nothing else.`

  private static readonly KEYWORD_EXTRACTION_PROMPT = `Extract 3-5 key technical terms or concepts from this message that would be useful for finding it later.

Rules:
- 3-5 keywords only
- Technical terms, concepts, or important nouns
- No common words (the, is, how, etc.)
- Comma-separated
- Lowercase

Message: {messageContent}

Respond with ONLY the comma-separated keywords, nothing else.`

  /**
   * Generate a description and keywords for a pinned message
   */
  static async generateDescription(
    messageContent: string,
    conversationContext?: Message[],
  ): Promise<{
    description: string
    keywords: string[]
  }> {
    try {
      // Get LLM config
      const config = await CredentialService.getActiveConfig()
      if (!config) {
        console.warn(
          'No LLM provider configured for description generation, using fallback',
        )
        return this.createFallbackDescription(messageContent)
      }

      // Prepare context string if available
      let contextString = ''
      if (conversationContext && conversationContext.length > 0) {
        const recentMessages = conversationContext
          .slice(-3)
          .map((m) => `${m.role}: ${m.content}`)
          .join('\n')
        contextString = `\n\nRecent context:\n${recentMessages}`
      }

      // Generate description
      const descriptionMessages: LLMMessage[] = [
        {
          role: 'system',
          content: this.DESCRIPTION_GENERATION_PROMPT.replace(
            '{messageContent}',
            messageContent + contextString,
          ),
        },
        {
          role: 'user',
          content: messageContent,
        },
      ]

      let descriptionResponse = ''
      try {
        for await (const chunk of LLMService.streamChat(
          descriptionMessages,
          config,
        )) {
          descriptionResponse += chunk
        }
      } catch (llmError) {
        console.warn('LLM description generation failed:', llmError)
        return this.createFallbackDescription(messageContent)
      }

      const description = this.cleanDescription(descriptionResponse.trim())

      // Validate description
      const wordCount = description.split(/\s+/).length
      if (wordCount < 5 || wordCount > 15) {
        console.warn(
          'Description word count outside range, using fallback',
          description,
        )
        return this.createFallbackDescription(messageContent)
      }

      // Generate keywords
      const keywordMessages: LLMMessage[] = [
        {
          role: 'system',
          content: this.KEYWORD_EXTRACTION_PROMPT.replace(
            '{messageContent}',
            messageContent,
          ),
        },
        {
          role: 'user',
          content: messageContent,
        },
      ]

      let keywordResponse = ''
      try {
        for await (const chunk of LLMService.streamChat(
          keywordMessages,
          config,
        )) {
          keywordResponse += chunk
        }
      } catch (llmError) {
        console.warn('LLM keyword extraction failed:', llmError)
        return {
          description,
          keywords: this.extractFallbackKeywords(messageContent),
        }
      }

      const keywords = this.cleanKeywords(keywordResponse.trim())

      return {
        description,
        keywords,
      }
    } catch (error) {
      console.error('Error generating message description:', error)
      return this.createFallbackDescription(messageContent)
    }
  }

  /**
   * Create a fallback description from the message content
   */
  private static createFallbackDescription(
    content: string,
  ): { description: string; keywords: string[] } {
    if (!content || content.trim().length === 0) {
      return {
        description: 'important conversation message',
        keywords: [],
      }
    }

    const cleaned = content.trim()

    // Try to extract a meaningful description from the first sentence
    const firstSentence = cleaned.split(/[.!?]+/)[0]?.trim() || cleaned

    // Create a simple description
    let description = firstSentence
    const words = description.split(/\s+/)

    if (words.length > 10) {
      description = words.slice(0, 10).join(' ')
    }

    // Make it lowercase and add a verb if it doesn't have one
    description = description.toLowerCase()
    if (!this.startsWithVerb(description)) {
      description = 'explains ' + description
    }

    const keywords = this.extractFallbackKeywords(content)

    return {
      description,
      keywords,
    }
  }

  /**
   * Extract simple keywords from content as fallback
   */
  private static extractFallbackKeywords(content: string): string[] {
    // Remove common words and extract potential keywords
    const commonWords = new Set([
      'the',
      'is',
      'are',
      'was',
      'were',
      'be',
      'been',
      'being',
      'have',
      'has',
      'had',
      'do',
      'does',
      'did',
      'will',
      'would',
      'should',
      'could',
      'can',
      'may',
      'might',
      'must',
      'shall',
      'a',
      'an',
      'and',
      'or',
      'but',
      'in',
      'on',
      'at',
      'to',
      'for',
      'of',
      'with',
      'by',
      'from',
      'about',
      'as',
      'into',
      'through',
      'during',
      'before',
      'after',
      'above',
      'below',
      'between',
      'under',
      'over',
      'how',
      'what',
      'when',
      'where',
      'why',
      'which',
      'who',
      'whom',
      'this',
      'that',
      'these',
      'those',
      'i',
      'you',
      'he',
      'she',
      'it',
      'we',
      'they',
      'them',
      'their',
      'my',
      'your',
      'his',
      'her',
      'its',
      'our',
    ])

    const words = content
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 3 && !commonWords.has(w))

    // Get unique words and take up to 5
    const uniqueWords = Array.from(new Set(words))
    return uniqueWords.slice(0, 5)
  }

  /**
   * Check if description starts with a verb
   */
  private static startsWithVerb(text: string): boolean {
    const verbs = [
      'explains',
      'describes',
      'provides',
      'shows',
      'demonstrates',
      'outlines',
      'details',
      'discusses',
      'presents',
      'suggests',
      'recommends',
      'proposes',
      'analyzes',
      'examines',
      'compares',
      'contrasts',
      'evaluates',
      'reviews',
      'summarizes',
      'defines',
      'clarifies',
      'illustrates',
    ]

    const lower = text.toLowerCase()
    return verbs.some((verb) => lower.startsWith(verb))
  }

  /**
   * Clean and validate LLM-generated description
   */
  private static cleanDescription(description: string): string {
    return (
      description
        .replace(/^["']|["']$/g, '') // Remove quotes
        .replace(/\n/g, ' ') // Replace newlines with spaces
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim()
        // Ensure it starts with lowercase (unless it's a proper noun)
        .replace(/^[A-Z]/, (match) => match.toLowerCase())
    )
  }

  /**
   * Clean and validate LLM-generated keywords
   */
  private static cleanKeywords(keywordString: string): string[] {
    return keywordString
      .split(/[,\n]+/) // Split by comma or newline
      .map((k) => k.trim().toLowerCase())
      .filter((k) => k.length > 0 && k.length < 30) // Reasonable length
      .slice(0, 5) // Max 5 keywords
  }
}
