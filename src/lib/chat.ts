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
import { Lang, languages } from '@/i18n'

export interface ChatSubmitOptions {
  prompt: string
  agent?: Agent | null
  conversationMessages?: Message[]
  includeHistory?: boolean
  clearResponseAfterSubmit?: boolean
  lang: Lang
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
    lang,
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

        let orchestrationReport = `# Task Orchestration Complete\n\n`
        orchestrationReport += `✅ **Status**: ${result.success ? 'Success' : 'Failed'}\n`
        orchestrationReport += `🆔 **Workflow ID**: ${result.workflowId}\n`
        orchestrationReport += `📋 **Main Task**: ${result.mainTaskId}\n`

        if (result.subTaskIds.length > 0) {
          orchestrationReport += `🔧 **Sub-tasks**: ${result.subTaskIds.length} tasks\n`
        }

        orchestrationReport += `📄 **Artifacts Generated**: ${result.artifacts.length}\n\n`

        if (result.artifacts.length > 0) {
          orchestrationReport += `## Generated Artifacts\n\n`
          for (const artifact of result.artifacts) {
            orchestrationReport += `### ${artifact.title}\n`
            orchestrationReport += `**Type**: ${artifact.type} | **Status**: ${artifact.status}\n`
            orchestrationReport += `**Description**: ${artifact.description}\n\n`
            orchestrationReport += `\`\`\`${artifact.format}\n${artifact.content}\n\`\`\`\n\n`
          }
        }

        if (result.errors && result.errors.length > 0) {
          orchestrationReport += `## Issues Encountered\n\n`
          result.errors.forEach((error) => {
            orchestrationReport += `⚠️ ${error}\n`
          })
        }

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

    const instructions = [
      enhancedInstructions,
      `ALWAYS respond in ${languages[lang]} as this is the user's language.`,
    ].join('\n\n')

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

    messages.push({
      role: 'user',
      content: prompt,
      attachments:
        knowledgeAttachments.length > 0 ? knowledgeAttachments : undefined,
    })

    // Call the LLM service with streaming
    let fullResponse = ''

    for await (const chunk of LLMService.streamChat(messages, config)) {
      console.debug('▷', chunk)
      fullResponse += chunk
      onResponseUpdate(fullResponse)
    }
    console.log('▶', fullResponse)

    // Save assistant response to conversation
    await addMessage(conversation.id, {
      role: 'assistant',
      content: fullResponse,
      agentId: agent.id,
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
