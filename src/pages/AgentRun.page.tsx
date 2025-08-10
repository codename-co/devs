import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Avatar, Spinner } from '@heroui/react'

import { useI18n } from '@/i18n'
import {
  Container,
  Icon,
  MarkdownRenderer,
  PromptArea,
  Section,
} from '@/components'
import DefaultLayout from '@/layouts/Default'
import type { HeaderProps } from '@/lib/types'
import { getAgentById } from '@/stores/agentStore'
import { Agent, Message } from '@/types'
import { errorToast } from '@/lib/toast'
import { submitChat } from '@/lib/chat'
import { useConversationStore } from '@/stores/conversationStore'

export const AgentRunPage = () => {
  const { t, lang } = useI18n()
  const location = useLocation()
  const navigate = useNavigate()

  const [prompt, setPrompt] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [response, setResponse] = useState<string>('')
  const [conversationMessages, setConversationMessages] = useState<Message[]>(
    [],
  )

  const {
    currentConversation,
    createConversation,
    loadConversation,
    clearCurrentConversation,
  } = useConversationStore()

  const header: HeaderProps = {
    icon: {
      name: (selectedAgent?.icon as any) || 'Sparks',
      color: 'text-primary-300 dark:text-primary-600',
    },
    title: selectedAgent?.name,
    // subtitle: selectedAgent?.desc || t('AI Assistant'),
  }

  // Parse the hash to get agentId and optional conversationId
  const parseHash = () => {
    const hash = location.hash.replace('#', '')
    const parts = hash.split('/')
    return {
      agentId: parts[0] || 'default',
      conversationId: parts[1] || null,
    }
  }

  const { agentId, conversationId } = parseHash()

  // Load agent and conversation on mount
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)

      try {
        // Load the specified agent
        const agent = await getAgentById(agentId)
        if (!agent) {
          errorToast(`Agent "${agentId}" not found`)
          navigate('/')
          return
        }
        setSelectedAgent(agent)

        // If conversationId is provided, try to load that specific conversation
        if (conversationId) {
          try {
            await loadConversation(conversationId)
            // The conversation will be set in the store, but we also want to display its messages
            if (currentConversation?.messages) {
              setConversationMessages(currentConversation.messages)
            }
          } catch (error) {
            console.warn(
              `Conversation ${conversationId} not found, will create new one when user sends first message`,
            )
            setConversationMessages([])
          }
        } else {
          // Clear current conversation since we're starting with a specific agent
          clearCurrentConversation()
          setConversationMessages([])
        }
      } catch (error) {
        console.error('Error loading agent/conversation:', error)
        errorToast('Failed to load agent or conversation')
        navigate('/')
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [agentId, conversationId, loadConversation, createConversation, navigate])

  // Update conversation messages when currentConversation changes
  useEffect(() => {
    if (currentConversation?.messages) {
      setConversationMessages(currentConversation.messages)
    }
  }, [currentConversation])

  const onSubmit = async () => {
    if (!prompt.trim() || isSending || !selectedAgent) return

    setIsSending(true)
    setResponse('')

    await submitChat({
      prompt,
      agent: selectedAgent,
      conversationMessages,
      includeHistory: true,
      clearResponseAfterSubmit: true,
      lang,
      t,
      onResponseUpdate: setResponse,
      onPromptClear: () => setPrompt(''),
      onResponseClear: () => setResponse(''),
    })

    setIsSending(false)
  }

  if (isLoading) {
    return (
      <DefaultLayout header={header}>
        <Section mainClassName="text-center">
          <div className="flex flex-col items-center justify-center min-h-[50vh]">
            <Spinner size="lg" />
            <p className="mt-4 text-default-500">
              {t('Loading agent and conversation…')}
            </p>
          </div>
        </Section>
      </DefaultLayout>
    )
  }

  return (
    <DefaultLayout title={selectedAgent?.name} header={header}>
      <Section>
        <Container>
          <details className="my-4 ml-7">
            <summary className="cursor-pointer">{t('System Prompt')}</summary>
            <div className="ml-5">
              <MarkdownRenderer
                content={
                  selectedAgent?.instructions || t('No system prompt defined.')
                }
                className="prose dark:prose-invert prose-sm"
              />
            </div>
          </details>
          {/* Display conversation history */}
          {conversationMessages.length > 0 && (
            <div className="duration-600 relative flex flex-col gap-6">
              {conversationMessages
                .filter((msg) => msg.role !== 'system')
                .map((message) => (
                  <div
                    key={message.id}
                    aria-hidden="false"
                    tabIndex={0}
                    className="flex w-full gap-3"
                  >
                    <div className="relative flex-none pt-0.5">
                      <div className="relative inline-flex shrink-0">
                        {message.role === 'user' ? (
                          <Avatar
                            size="sm"
                            showFallback
                            name="U"
                            classNames={{
                              base: 'bg-default text-default-foreground',
                              fallback: 'text-tiny',
                            }}
                          />
                        ) : (
                          <div className="border-1 border-primary-300 dark:border-default-200 flex h-8 w-8 items-center justify-center rounded-full">
                            <Icon
                              name={(selectedAgent?.icon as any) || 'Sparks'}
                              className="w-4 h-4 text-primary-600"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                    <div
                      className={`rounded-medium text-foreground group relative w-full overflow-hidden font-medium ${
                        message.role === 'user'
                          ? 'bg-default-100 px-4 py-3'
                          : 'bg-transparent px-1 py-0'
                      }`}
                    >
                      <div className="text-small text-left">
                        <div className="prose prose-neutral text-medium break-words">
                          <MarkdownRenderer
                            content={message.content}
                            className="prose dark:prose-invert prose-sm"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              <span
                aria-hidden="true"
                className="w-px h-px block"
                style={{ marginLeft: '0.25rem', marginTop: '3rem' }}
              />

              {/* Display streaming response */}
              {response && (
                <>
                  <div
                    aria-hidden="false"
                    tabIndex={0}
                    className="flex w-full gap-3"
                  >
                    <div className="relative flex-none">
                      <div className="border-1 border-default-300 dark:border-default-200 flex h-7 w-7 items-center justify-center rounded-full">
                        <Icon
                          name={(selectedAgent?.icon as any) || 'Sparks'}
                          className="w-4 h-4 text-default-600"
                        />
                      </div>
                    </div>
                    <div className="rounded-medium text-foreground group relative w-full overflow-hidden font-medium bg-transparent px-1 py-0">
                      <div className="text-small">
                        <div className="prose prose-neutral text-medium break-words">
                          <MarkdownRenderer
                            content={response}
                            className="prose dark:prose-invert prose-sm"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  <span
                    aria-hidden="true"
                    className="w-px h-px block"
                    style={{ marginLeft: '0.25rem', marginTop: '3rem' }}
                  />
                </>
              )}
            </div>
          )}
        </Container>

        <PromptArea
          lang={lang}
          autoFocus={!conversationId} // Only autofocus for new conversations
          className="max-w-4xl mx-auto"
          value={prompt}
          onValueChange={setPrompt}
          onSend={onSubmit}
          isSending={isSending}
          selectedAgent={selectedAgent}
          onAgentChange={setSelectedAgent}
          placeholder={
            conversationMessages.length > 0
              ? t('Continue the conversation…')
              : t(`Start chatting with {agentName}…`, {
                  agentName: selectedAgent?.name || t('this agent'),
                })
          }
        />
      </Section>
    </DefaultLayout>
  )
}
