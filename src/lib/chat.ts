import { LLMService, LLMMessage } from '@/lib/llm'
import { CredentialService } from '@/lib/credential-service'
import { useConversationStore } from '@/stores/conversationStore'
import { getDefaultAgent } from '@/stores/agentStore'
import { WorkflowOrchestrator } from '@/lib/orchestrator'
import { Agent, Message } from '@/types'
import { errorToast } from '@/lib/toast'
import {
  getKnowledgeAttachments,
  buildAgentInstructions,
} from '@/lib/agent-knowledge'
import {
  buildMemoryContextForChat,
  learnFromConversation,
  processPendingLearningEvents,
} from '@/lib/memory-learning-service'
import { Lang, languages } from '@/i18n'

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
  lang: Lang
  t: any
  onResponseUpdate: (response: string) => void
  onPromptClear: () => void
  onResponseClear?: () => void
  onMemoryLearningComplete?: (conversationId: string, agentId: string) => void
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
    lang,
    t,
    onResponseUpdate,
    onPromptClear,
    onResponseClear,
    onMemoryLearningComplete,
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

        onResponseUpdate('🚀 Starting autonomous task orchestration...\n\n')

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

        onResponseUpdate(orchestrationReport)

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
        const errorMessage = `❌ **Orchestration Failed**\n\n${error instanceof Error ? error.message : 'Unknown error occurred during task orchestration.'}`
        onResponseUpdate(errorMessage)

        // Save error message to conversation if conversation exists
        try {
          const { currentConversation, addMessage } =
            useConversationStore.getState()
          if (currentConversation) {
            await addMessage(currentConversation.id, {
              role: 'assistant',
              content: errorMessage,
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
    if (
      !conversation ||
      (selectedAgent && conversation.agentId !== selectedAgent.id)
    ) {
      conversation = await createConversation(agent.id, 'default')
    }

    // Save user message to conversation
    await addMessage(conversation.id, { role: 'user', content: prompt })

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
    )

    // Get relevant memories for this agent and prompt
    const memoryContext = await buildMemoryContextForChat(agent.id, prompt)

    const instructions = [
      enhancedInstructions,
      // Inject memory context if available
      memoryContext,
      `ALWAYS respond in ${languages[lang]} as this is the user's language.`,
    ]
      .filter(Boolean)
      .join('\n\n')

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
        })),
      )
    }

    // Convert user-provided attachments to LLMMessageAttachment format
    const userAttachments = attachments.map((file) => {
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
      }
    })

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

    // Call the LLM service with streaming
    let response = ''

    for await (const chunk of LLMService.streamChat(messages, config)) {
      console.debug('◁', chunk)
      response += chunk
      onResponseUpdate(response)
    }
    const timeend = Date.now()
    console.log('◀', { response })
    console.log(`LLM response time: ${(timeend - timestart) / 1000}s`)

    // Save assistant response to conversation
    await addMessage(conversation.id, {
      role: 'assistant',
      content: response,
      agentId: agent.id,
    })

    // Clear the prompt after successful submission
    onPromptClear()

    // Clear response if requested (for agent pages)
    if (clearResponseAfterSubmit && onResponseClear) {
      onResponseClear()
    }

    // Trigger memory learning in the background (don't await to not block UI)
    // This extracts learnable information from the conversation for human review
    triggerMemoryLearning(
      conversation.id,
      agent.id,
      lang,
      onMemoryLearningComplete,
    ).catch((err) => {
      console.warn('Memory learning failed (non-critical):', err)
    })

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

/**
 * Trigger memory learning from a conversation in the background
 * This is non-blocking and failures are logged but don't affect the user
 */
async function triggerMemoryLearning(
  conversationId: string,
  agentId: string,
  lang: Lang,
  onComplete?: (conversationId: string, agentId: string) => void,
): Promise<void> {
  try {
    // Extract learnings from the conversation
    await learnFromConversation(conversationId, agentId, lang)

    // Process pending events into memories (pending human review)
    await processPendingLearningEvents(agentId)

    console.log(`Memory learning completed for conversation ${conversationId}`)

    // Notify the UI that memory learning is complete
    if (onComplete) {
      onComplete(conversationId, agentId)
    }
  } catch (error) {
    // Log but don't throw - memory learning is non-critical
    console.error('Memory learning error:', error)
  }
}
