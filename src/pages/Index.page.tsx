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
import { Agent } from '@/types'
import { submitChat } from '@/lib/chat'
import { PRODUCT } from '@/config/product'

export const IndexPage = () => {
  const { t, lang } = useI18n()
  const [prompt, setPrompt] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [response, setResponse] = useState<string>('')

  const onSubmit = async () => {
    if (!prompt.trim() || isSending) return

    setIsSending(true)
    setResponse('')

    await submitChat({
      prompt,
      agent: selectedAgent,
      includeHistory: false,
      clearResponseAfterSubmit: false,
      t,
      onResponseUpdate: setResponse,
      onPromptClear: () => setPrompt(''),
    })

    setIsSending(false)
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
          <Title subtitle={t('Delegate complex tasks to your own AI teams')}>
            {t('Let {productName} take it from here', {
              productName: PRODUCT.displayName,
            })}
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
