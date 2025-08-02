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
import { Agent } from '@/types'

export const IndexPage = () => {
  const { t, lang } = useI18n()
  const [prompt, setPrompt] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [response, setResponse] = useState<string>('')
  const [error, setError] = useState<string>('')

  const onSubmit = async () => {
    if (!prompt.trim() || isSending) return

    setIsSending(true)
    setError('')
    setResponse('')

    try {
      // Get the active LLM configuration
      const config = await CredentialService.getActiveConfig()
      if (!config) {
        setError(
          t('No LLM provider configured. Please configure one in Settings.'),
        )
        return
      }

      // Prepare messages for the LLM
      const messages: LLMMessage[] = [
        {
          role: 'system',
          content:
            selectedAgent?.instructions || 'You are a helpful assistant.',
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

      // Clear the prompt after successful submission
      setPrompt('')
    } catch (err) {
      console.error('Error calling LLM:', err)
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsSending(false)
    }
  }

  return (
    <DefaultLayout>
      <Section mainClassName="text-center">
        <div className="flex flex-col items-center">
          <Icon
            size="4xl"
            name="SparksSolid"
            className="mb-6 text-primary-200 dark:text-primary-700"
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
          className="my-16"
          value={prompt}
          onValueChange={setPrompt}
          onSend={onSubmit}
          isSending={isSending}
          selectedAgent={selectedAgent}
          onAgentChange={setSelectedAgent}
        />

        {/* Display error if any */}
        {error && (
          <div className="mt-4 p-4 bg-danger-50 dark:bg-danger-900/20 text-danger-700 dark:text-danger-300 rounded-lg">
            {error}
          </div>
        )}

        {/* Display response */}
        {response && (
          <div className="mt-8 p-6 bg-content2 rounded-lg text-left max-w-4xl mx-auto">
            <MarkdownRenderer
              content={response}
              className="prose dark:prose-invert max-w-none whitespace-pre-wrap"
            />
          </div>
        )}
      </Section>
    </DefaultLayout>
  )
}
