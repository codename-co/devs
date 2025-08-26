import { LLMService, LLMMessage } from '@/lib/llm'
import { CredentialService } from '@/lib/credential-service'
import type { Conversation } from '@/types'

export class ConversationTitleGenerator {
  private static readonly TITLE_GENERATION_PROMPT = `You are a conversation title generator. Create a concise, descriptive title (maximum 60 characters) for this conversation based on the initial user message and context.

Rules:
- Maximum 60 characters
- Be specific and descriptive
- Avoid generic phrases like "Help with" or "Question about"
- Focus on the main topic or task
- Use title case
- No quotes or special formatting

Examples:
- "Build React Dashboard Component" 
- "Optimize Database Query Performance"
- "Write Historical Fiction Story"
- "Debug TypeScript Error in API"

User Message: {userMessage}

Respond with ONLY the title, nothing else.`

  /**
   * Generate a dynamic title for a conversation using LLM summarization
   */
  static async generateTitle(conversation: Conversation): Promise<string> {
    try {
      // Find the first meaningful user message
      const firstUserMessage = conversation.messages.find(
        (msg) => msg.role === 'user' && msg.content.trim().length > 0,
      )

      if (!firstUserMessage) {
        return 'New Conversation'
      }

      // If the message is already short enough and clear, use it
      const content = firstUserMessage.content.trim()
      if (content.length <= 50 && this.isGoodTitle(content)) {
        return this.formatTitle(content)
      }

      // Get LLM config
      const config = await CredentialService.getActiveConfig()
      if (!config) {
        console.warn('No LLM provider configured for title generation, using fallback')
        return this.createFallbackTitle(content)
      }

      // Prepare messages for LLM
      const messages: LLMMessage[] = [
        {
          role: 'system',
          content: this.TITLE_GENERATION_PROMPT.replace('{userMessage}', content),
        },
        {
          role: 'user',
          content: content,
        },
      ]

      // Generate title using LLM
      let response = ''
      try {
        for await (const chunk of LLMService.streamChat(messages, config)) {
          response += chunk
        }
      } catch (llmError) {
        console.warn('LLM title generation failed:', llmError)
        return this.createFallbackTitle(content)
      }

      const title = this.cleanTitle(response.trim())
      
      // Validate the generated title
      if (title.length === 0 || title.length > 60) {
        return this.createFallbackTitle(content)
      }

      return title
    } catch (error) {
      console.error('Error generating conversation title:', error)
      return this.createFallbackTitle(conversation.messages[0]?.content || 'New Conversation')
    }
  }

  /**
   * Generate a title immediately after the first user message is added
   */
  static async generateTitleForNewConversation(
    _conversationId: string,
    firstUserMessage: string,
  ): Promise<string> {
    try {
      const content = firstUserMessage.trim()
      
      // If message is short and clear, use it directly
      if (content.length <= 50 && this.isGoodTitle(content)) {
        return this.formatTitle(content)
      }

      // Get LLM config
      const config = await CredentialService.getActiveConfig()
      if (!config) {
        return this.createFallbackTitle(content)
      }

      // Generate title with LLM
      const messages: LLMMessage[] = [
        {
          role: 'system',
          content: this.TITLE_GENERATION_PROMPT.replace('{userMessage}', content),
        },
        {
          role: 'user',
          content: content,
        },
      ]

      let response = ''
      for await (const chunk of LLMService.streamChat(messages, config)) {
        response += chunk
      }

      const title = this.cleanTitle(response.trim())
      return title.length > 0 && title.length <= 60 
        ? title 
        : this.createFallbackTitle(content)
        
    } catch (error) {
      console.error('Error generating title for new conversation:', error)
      return this.createFallbackTitle(firstUserMessage)
    }
  }

  /**
   * Create a fallback title from the user message
   */
  private static createFallbackTitle(content: string): string {
    if (!content || content.trim().length === 0) {
      return 'New Conversation'
    }

    const cleaned = content.trim()
    
    // Try to extract a meaningful title from the first sentence
    const firstSentence = cleaned.split(/[.!?]+/)[0]?.trim() || cleaned
    
    if (firstSentence.length <= 50) {
      return this.formatTitle(firstSentence)
    }

    // Truncate at word boundary
    const words = firstSentence.split(' ')
    let title = ''
    
    for (const word of words) {
      if ((title + ' ' + word).length > 50) {
        break
      }
      title = title ? title + ' ' + word : word
    }

    return title || cleaned.substring(0, 47) + '...'
  }

  /**
   * Check if a string would make a good title as-is
   */
  private static isGoodTitle(text: string): boolean {
    const lower = text.toLowerCase()
    
    // Avoid very generic starts
    const genericStarts = [
      'help me',
      'can you',
      'please',
      'i need',
      'how to',
      'what is',
      'explain',
    ]

    return !genericStarts.some(start => lower.startsWith(start))
  }

  /**
   * Format a title with proper capitalization
   */
  private static formatTitle(text: string): string {
    return text
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
  }

  /**
   * Clean and validate LLM-generated title
   */
  private static cleanTitle(title: string): string {
    return title
      .replace(/^["']|["']$/g, '') // Remove quotes
      .replace(/\n/g, ' ') // Replace newlines with spaces
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()
  }
}