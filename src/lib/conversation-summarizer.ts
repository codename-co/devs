import { LLMService, LLMMessage } from '@/lib/llm'
import { CredentialService } from '@/lib/credential-service'
import type { Conversation } from '@/types'

export class ConversationSummarizer {
  private static readonly SUMMARY_GENERATION_PROMPT = `You are a conversation summarizer. Create a comprehensive summary of this conversation in markdown format.

Your summary should include:
1. **Main Topic**: What was the primary focus of this conversation?
2. **Key Points**: What were the most important points discussed? (bullet points)
3. **Decisions Made**: What decisions or conclusions were reached? (if any)
4. **Outcomes**: What was accomplished or delivered? (if applicable)
5. **Follow-up Items**: What should be done next? (if applicable)

Rules:
- Use markdown formatting
- Be concise but comprehensive
- Focus on actionable insights
- Maximum 500 words
- Use bullet points for lists
- Use proper headings (##)

Conversation to summarize:
{conversationContent}

Provide the summary in markdown format:`

  /**
   * Generate a comprehensive summary for a conversation
   */
  static async summarizeConversation(
    conversation: Conversation,
  ): Promise<string> {
    try {
      // Get LLM config
      const config = await CredentialService.getActiveConfig()
      if (!config) {
        console.warn(
          'No AI provider configured for summarization, using fallback',
        )
        return this.createFallbackSummary(conversation)
      }

      // Prepare conversation content
      const conversationContent =
        this.formatConversationForSummary(conversation)

      // If conversation is too short, use fallback
      if (conversation.messages.filter((m) => m.role !== 'system').length < 3) {
        return this.createFallbackSummary(conversation)
      }

      // Generate summary
      const messages: LLMMessage[] = [
        {
          role: 'system',
          content: this.SUMMARY_GENERATION_PROMPT.replace(
            '{conversationContent}',
            conversationContent,
          ),
        },
        {
          role: 'user',
          content:
            'Please provide a comprehensive summary of this conversation.',
        },
      ]

      let summaryResponse = ''
      try {
        for await (const chunk of LLMService.streamChat(messages, config)) {
          summaryResponse += chunk
        }
      } catch (llmError) {
        console.warn('LLM summarization failed:', llmError)
        return this.createFallbackSummary(conversation)
      }

      const summary = summaryResponse.trim()

      // Validate summary
      if (summary.length === 0 || summary.length > 5000) {
        return this.createFallbackSummary(conversation)
      }

      return summary
    } catch (error) {
      console.error('Error generating conversation summary:', error)
      return this.createFallbackSummary(conversation)
    }
  }

  /**
   * Format conversation messages for summary generation
   */
  private static formatConversationForSummary(
    conversation: Conversation,
  ): string {
    const messages = conversation.messages
      .filter((m) => m.role !== 'system') // Exclude system messages
      .map((m) => {
        const role = m.role === 'user' ? 'User' : 'Assistant'
        // Truncate very long messages
        const content =
          m.content.length > 1000
            ? m.content.substring(0, 1000) + '... [truncated]'
            : m.content
        return `${role}: ${content}`
      })
      .join('\n\n')

    return messages
  }

  /**
   * Create a fallback summary from the conversation
   */
  private static createFallbackSummary(conversation: Conversation): string {
    const userMessages = conversation.messages.filter((m) => m.role === 'user')
    const assistantMessages = conversation.messages.filter(
      (m) => m.role === 'assistant',
    )

    const firstUserMessage =
      userMessages[0]?.content || 'No user messages found'
    const messageCount = conversation.messages.filter(
      (m) => m.role !== 'system',
    ).length

    return `## Conversation Summary

**Main Topic**: ${conversation.title || this.extractTopicFromMessage(firstUserMessage)}

**Message Count**: ${messageCount} messages (${userMessages.length} from user, ${assistantMessages.length} from assistant)

**First Message**: ${this.truncateText(firstUserMessage, 200)}

**Date**: ${new Date(conversation.timestamp).toLocaleDateString()}

*This is an auto-generated summary. For more detailed information, please review the full conversation.*`
  }

  /**
   * Extract a topic from the first message
   */
  private static extractTopicFromMessage(message: string): string {
    // Try to get the first sentence
    const firstSentence = message.split(/[.!?]+/)[0]?.trim()

    if (!firstSentence || firstSentence.length > 100) {
      return this.truncateText(message, 80)
    }

    return firstSentence
  }

  /**
   * Truncate text to a specific length
   */
  private static truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) {
      return text
    }

    const truncated = text.substring(0, maxLength)
    const lastSpace = truncated.lastIndexOf(' ')

    if (lastSpace > maxLength * 0.8) {
      return truncated.substring(0, lastSpace) + '...'
    }

    return truncated + '...'
  }
}
