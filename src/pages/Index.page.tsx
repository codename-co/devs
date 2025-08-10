import { useI18n } from '@/i18n'
import {
  Icon,
  MarkdownRenderer,
  PromptArea,
  Section,
  Title,
} from '@/components'
import DefaultLayout from '@/layouts/Default'
import { useState } from 'react'
import { LLMService, LLMMessage } from '@/lib/llm'
import { CredentialService } from '@/lib/credential-service'
import { useConversationStore } from '@/stores/conversationStore'
import { getDefaultAgent } from '@/stores/agentStore'
import { Agent } from '@/types'
import { errorToast } from '@/lib/toast'

export const IndexPage = () => {
  const { t, lang } = useI18n()
  const [prompt, setPrompt] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [response, setResponse] = useState<string>('')

  const { currentConversation, createConversation, addMessage } =
    useConversationStore()

  const onSubmit = async () => {
    if (!prompt.trim() || isSending) return

    setIsSending(true)
    setResponse('')

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
        return
      }

      // Create or continue conversation for the selected agent
      const agent = selectedAgent || getDefaultAgent()
      let conversation = currentConversation
      if (!conversation || conversation.agentId !== agent.id) {
        conversation = await createConversation(agent.id, 'default')
      }

      // Save user message to conversation
      await addMessage(conversation.id, { role: 'user', content: prompt })

      // Prepare messages for the LLM
      const messages: LLMMessage[] = [
        {
          role: 'system',
          content:
            (selectedAgent || getDefaultAgent()).instructions ||
            'You are a helpful assistant.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ]

      // Call the LLM service with streaming
      let fullResponse = ''

      for await (const chunk of LLMService.streamChat(messages, config)) {
        fullResponse += chunk
        setResponse(fullResponse)
      }

      // Save assistant response to conversation
      await addMessage(conversation.id, {
        role: 'assistant',
        content: fullResponse,
      })

      // Clear the prompt after successful submission
      setPrompt('')
    } catch (err) {
      console.error('Error calling LLM:', err)
      errorToast(
        t('Failed to get response from LLM. Please try again later.'),
        err,
      )
      // Optionally, you can log the error to an external service here
      // e.g., Sentry.captureException(err)
    } finally {
      setIsSending(false)
    }
  }

  return (
    <DefaultLayout showBackButton={false}>
      <Section mainClassName="text-center">
        <div className="flex flex-col items-center">
          <Icon
            size="4xl"
            name="SparksSolid"
            className="mb-4 sm:my-6 text-primary-200 dark:text-primary-700"
          />
          <Title
            subtitle={t(
              'Delegate to adaptive AI teams that form, collaborate, and deliver automatically',
            )}
          >
            {t('Let AI agents take it from here')}
          </Title>
        </div>

        <PromptArea
          lang={lang}
          autoFocus
          className="my-8 sm:my-16"
          value={prompt}
          onValueChange={setPrompt}
          onSend={onSubmit}
          isSending={isSending}
          selectedAgent={selectedAgent}
          onAgentChange={setSelectedAgent}
        />

        {/* Display response */}
        {response && (
          <div className="mt-8 p-6 bg-content2 rounded-lg text-left max-w-4xl mx-auto">
            <MarkdownRenderer
              content={response}
              className="prose dark:prose-invert"
            />
          </div>
        )}
      </Section>
    </DefaultLayout>
  )
}
