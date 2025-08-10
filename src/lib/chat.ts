import { LLMService, LLMMessage } from '@/lib/llm'
import { CredentialService } from '@/lib/credential-service'
import { useConversationStore } from '@/stores/conversationStore'
import { getDefaultAgent } from '@/stores/agentStore'
import { Agent, Message } from '@/types'
import { errorToast } from '@/lib/toast'

export interface ChatSubmitOptions {
  prompt: string
  agent?: Agent | null
  conversationMessages?: Message[]
  includeHistory?: boolean
  clearResponseAfterSubmit?: boolean
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

    const { currentConversation, createConversation, addMessage } =
      useConversationStore.getState()

    // Create or continue conversation
    let conversation = currentConversation
    if (
      !conversation ||
      (selectedAgent && conversation.agentId !== selectedAgent.id)
    ) {
      conversation = await createConversation(agent.id, 'default')
    }

    // Save user message to conversation
    await addMessage(conversation.id, { role: 'user', content: prompt })

    // Prepare messages for the LLM
    const messages: LLMMessage[] = [
      {
        role: 'system',
        content: agent.instructions || 'You are a helpful assistant.',
      },
    ]

    // Include conversation history if requested
    if (includeHistory && conversationMessages.length > 0) {
      messages.push(
        ...conversationMessages.map((msg) => ({
          role: msg.role as 'user' | 'assistant' | 'system',
          content: msg.content,
        })),
      )
    }

    messages.push({
      role: 'user',
      content: prompt,
    })

    // Call the LLM service with streaming
    let fullResponse = ''

    for await (const chunk of LLMService.streamChat(messages, config)) {
      fullResponse += chunk
      onResponseUpdate(fullResponse)
    }

    // Save assistant response to conversation
    await addMessage(conversation.id, {
      role: 'assistant',
      content: fullResponse,
    })

    // Clear the prompt after successful submission
    onPromptClear()

    // Clear response if requested (for agent pages)
    if (clearResponseAfterSubmit && onResponseClear) {
      onResponseClear()
    }

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
