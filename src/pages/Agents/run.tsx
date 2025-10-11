import { useEffect, useState, useMemo, useCallback, memo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Spinner,
  Chip,
  Card,
  CardBody,
  Accordion,
  AccordionItem,
  Button,
} from '@heroui/react'

import { useI18n } from '@/i18n'
import {
  Container,
  Icon,
  MarkdownRenderer,
  PromptArea,
  Section,
  Widget,
} from '@/components'
import DefaultLayout from '@/layouts/Default'
import type { HeaderProps } from '@/lib/types'
import { getAgentById } from '@/stores/agentStore'
import { Agent, Message, Artifact } from '@/types'
import { errorToast } from '@/lib/toast'
import { submitChat } from '@/lib/chat'
import { useConversationStore } from '@/stores/conversationStore'
import { useArtifactStore } from '@/stores/artifactStore'

// Component to display a single message with proper agent context
const MessageDisplay = memo(
  ({
    message,
    selectedAgent,
    getMessageAgent,
    detectContentType,
  }: {
    message: Message
    selectedAgent: Agent | null
    getMessageAgent: (message: Message) => Promise<Agent | null>
    detectContentType: (content: string) => string
  }) => {
    const [messageAgent, setMessageAgent] = useState<Agent | null>(null)

    useEffect(() => {
      if (message.role === 'assistant') {
        getMessageAgent(message).then(setMessageAgent)
      }
    }, [message, getMessageAgent])

    const displayAgent = messageAgent || selectedAgent
    const isFromDifferentAgent =
      messageAgent && messageAgent.id !== selectedAgent?.id

    return (
      <div
        key={message.id}
        aria-hidden="false"
        tabIndex={0}
        className="flex w-full gap-3"
      >
        <div className="relative flex-none -mt-1">
          <div className="relative inline-flex shrink-0">
            {message.role === 'assistant' && (
              <div className="border-1 border-primary-300 dark:border-default-200 hidden md:flex h-8 w-8 items-center justify-center rounded-full">
                <Icon
                  name={(displayAgent?.icon as any) || 'Sparks'}
                  className="w-4 h-4 text-primary-600"
                />
              </div>
            )}
          </div>
        </div>
        <div
          className={`rounded-medium text-foreground group relative overflow-hidden font-medium ${
            message.role === 'user'
              ? 'bg-default-100 px-4 py-3 ml-auto max-w-[80%]'
              : 'bg-transparent px-1 py-0'
          }`}
        >
          {/* Show agent name if different from current agent */}
          {isFromDifferentAgent && displayAgent && (
            <div className="mb-2">
              <Chip
                size="sm"
                variant="flat"
                color="primary"
                className="text-tiny"
              >
                {displayAgent.name}
              </Chip>
            </div>
          )}
          <div className="text-small text-left">
            <div className="prose prose-neutral text-medium break-words">
              {detectContentType(message.content) === 'marpit-presentation' ? (
                <Widget type="marpit" language="yaml" code={message.content} />
              ) : (
                <MarkdownRenderer
                  content={message.content}
                  className="prose dark:prose-invert prose-sm"
                />
              )}
            </div>
          </div>
        </div>
      </div>
    )
  },
)

MessageDisplay.displayName = 'MessageDisplay'

// Component to display artifacts in side panel
const ArtifactWidget = memo(({ artifact }: { artifact: Artifact }) => {
  const characterCount = artifact.content.length
  const statusColor =
    artifact.status === 'approved' || artifact.status === 'final'
      ? 'success'
      : artifact.status === 'rejected'
        ? 'danger'
        : 'warning'

  return (
    <Card className="mb-3">
      <CardBody className="p-3">
        <Accordion selectionMode="single" className="px-0">
          <AccordionItem
            key={artifact.id}
            aria-label={artifact.title}
            title={
              <div className="flex justify-between items-center w-full">
                <div className="flex flex-col items-start">
                  <span className="font-medium text-sm">{artifact.title}</span>
                  <div className="flex gap-2 mt-1">
                    <Chip
                      size="sm"
                      variant="flat"
                      color={statusColor}
                      className="text-tiny"
                    >
                      {artifact.status}
                    </Chip>
                    <Chip
                      size="sm"
                      variant="flat"
                      color="default"
                      className="text-tiny"
                    >
                      {artifact.type}
                    </Chip>
                  </div>
                </div>
                <div className="text-tiny text-default-500">
                  {characterCount.toLocaleString()} chars
                </div>
              </div>
            }
          >
            <div className="space-y-3">
              {artifact.description && (
                <div>
                  <span className="text-tiny font-medium text-default-700">
                    Description:
                  </span>
                  <p className="text-small text-default-600 mt-1">
                    {artifact.description}
                  </p>
                </div>
              )}
              <div>
                <span className="text-tiny font-medium text-default-700">
                  Content:
                </span>
                <div className="mt-1 p-2 bg-default-100 rounded-small max-h-48 overflow-y-auto">
                  <MarkdownRenderer
                    content={artifact.content}
                    className="prose dark:prose-invert prose-sm text-small"
                  />
                </div>
              </div>
              <div className="flex justify-between text-tiny text-default-500">
                <span>
                  Created: {new Date(artifact.createdAt).toLocaleDateString()}
                </span>
                <span>v{artifact.version}</span>
              </div>
            </div>
          </AccordionItem>
        </Accordion>
      </CardBody>
    </Card>
  )
})

ArtifactWidget.displayName = 'ArtifactWidget'

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
  const [agentCache, setAgentCache] = useState<Record<string, Agent>>({})
  const [_conversationArtifacts, setConversationArtifacts] = useState<
    Artifact[]
  >([])

  const {
    currentConversation,
    createConversation,
    loadConversation,
    clearCurrentConversation,
  } = useConversationStore()

  const { artifacts, loadArtifacts } = useArtifactStore()

  const [showSystemPrompt, setShowSystemPrompt] = useState(false)

  const header: HeaderProps = useMemo(
    () => ({
      icon: {
        name: (selectedAgent?.icon as any) || 'Sparks',
        color: 'text-primary-300 dark:text-primary-600',
      },
      title: selectedAgent?.i18n?.[lang]?.name ?? selectedAgent?.name ?? '…',
      subtitle: (
        <>
          <Button
            variant={showSystemPrompt ? 'solid' : 'light'}
            size="sm"
            startContent={<Icon name="Terminal" />}
            onPress={() => setShowSystemPrompt((v) => !v)}
          >
            {t('System Prompt')}
          </Button>
          {showSystemPrompt && (
            <div className="mt-4 max-h-96 overflow-y-auto">
              <MarkdownRenderer
                content={
                  selectedAgent?.instructions || t('No system prompt defined.')
                }
                className="prose dark:prose-invert prose-sm text-default-700"
              />
            </div>
          )}
        </>
      ),
      // subtitle: selectedAgent?.desc || t('AI Assistant'),
    }),
    [selectedAgent?.icon, selectedAgent?.name, showSystemPrompt],
  )

  // Parse the hash to get agentId and optional conversationId
  const parseHash = useCallback(() => {
    const hash = location.hash.replace('#', '')
    const parts = hash.split('/')
    return {
      agentId: parts[0] || 'default',
      conversationId: parts[1] || null,
    }
  }, [location.hash])

  const { agentId, conversationId } = useMemo(() => parseHash(), [parseHash])

  // Helper function to detect content type
  const detectContentType = useCallback((content: string) => {
    // Check for Marpit presentation by looking for YAML frontmatter with marp: true
    const yamlFrontmatterRegex = /^---\s*\n([\s\S]*?)\n---/
    const match = content.match(yamlFrontmatterRegex)

    if (match) {
      const frontmatter = match[1]
      if (
        frontmatter.includes('marp: true') ||
        frontmatter.includes('marp:true')
      ) {
        return 'marpit-presentation'
      }
    }

    return 'markdown'
  }, [])

  // Helper function to get agent for a message
  const getMessageAgent = useCallback(
    async (message: Message): Promise<Agent | null> => {
      if (message.role !== 'assistant') return null

      const messageAgentId = message.agentId || selectedAgent?.id
      if (!messageAgentId) return selectedAgent

      // Check cache first
      if (agentCache[messageAgentId]) {
        return agentCache[messageAgentId]
      }

      // Fetch and cache the agent
      try {
        const agent = await getAgentById(messageAgentId)
        if (agent) {
          setAgentCache((prev) => ({ ...prev, [messageAgentId]: agent }))
          return agent
        }
      } catch (error) {
        console.warn(`Failed to load agent ${messageAgentId}:`, error)
      }

      return selectedAgent
    },
    [selectedAgent, agentCache],
  )

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

        // Check for pending prompt from Index page
        const pendingPrompt = sessionStorage.getItem('pendingPrompt')
        const pendingAgentData = sessionStorage.getItem('pendingAgent')

        if (pendingPrompt && pendingAgentData) {
          const pendingAgent = JSON.parse(pendingAgentData)

          // Clear the session storage
          sessionStorage.removeItem('pendingPrompt')
          sessionStorage.removeItem('pendingAgent')

          // Set the prompt and auto-submit if the agent matches
          if (pendingAgent.id === agent.id) {
            setPrompt(pendingPrompt)

            // Auto-submit after a short delay to ensure everything is loaded
            setTimeout(() => {
              handleAutoSubmit(pendingPrompt, agent)
            }, 100)
          }
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

  // Load artifacts on mount
  useEffect(() => {
    loadArtifacts()
  }, [loadArtifacts])

  // Update conversation artifacts when artifacts or current conversation changes
  useEffect(() => {
    if (!currentConversation || !artifacts.length) {
      setConversationArtifacts([])
      return
    }

    // Get artifacts created by any agent participating in this conversation
    const participatingAgents = currentConversation.participatingAgents || [
      currentConversation.agentId,
    ]
    const relatedArtifacts = artifacts.filter((artifact) =>
      participatingAgents.includes(artifact.agentId),
    )

    setConversationArtifacts(relatedArtifacts)
  }, [artifacts, currentConversation])

  // Auto-submit handler for prompts from Index page
  const handleAutoSubmit = useCallback(
    async (promptText: string, agent: Agent) => {
      if (isSending) return

      setIsSending(true)
      setResponse('')

      await submitChat({
        prompt: promptText,
        agent,
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
    },
    [isSending, conversationMessages, lang, t],
  )

  const onSubmit = useCallback(async () => {
    if (!prompt.trim() || isSending || !selectedAgent) return

    setIsSending(true)
    setPrompt('')
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
  }, [prompt, isSending, selectedAgent, conversationMessages, lang, t])

  if (isLoading) {
    return (
      <DefaultLayout header={header}>
        <Section mainClassName="text-center">
          <div className="flex flex-col items-center justify-center min-h-[50vh]">
            <Spinner size="lg" color="primary" />
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
        {/* <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 max-w-7xl mx-auto"> */}
        <div className="gap-6 mx-auto">
          {/* Main conversation area */}
          <div
          // className="lg:col-span-3"
          >
            <Container>
              {/* Display conversation history */}
              {conversationMessages.length > 0 && (
                <div className="duration-600 relative flex flex-col gap-6">
                  {conversationMessages
                    .filter((msg) => msg.role !== 'system')
                    .map((message) => (
                      <MessageDisplay
                        key={message.id}
                        message={message}
                        selectedAgent={selectedAgent}
                        getMessageAgent={getMessageAgent}
                        detectContentType={detectContentType}
                      />
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
                              {detectContentType(response) ===
                              'marpit-presentation' ? (
                                <Widget
                                  type="marpit"
                                  language="yaml"
                                  code={response}
                                />
                              ) : (
                                <MarkdownRenderer
                                  content={response}
                                  className="prose dark:prose-invert prose-sm"
                                />
                              )}
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
          </div>

          {/* Artifacts side panel */}
          {/* {conversationArtifacts.length > 0 && (
            <div className="lg:col-span-1 order-first lg:order-last">
              <div className="sticky top-4">
                <Card className="mb-4">
                  <CardBody className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Icon
                        name="PageSearch"
                        className="w-5 h-5 text-primary"
                      />
                      <h3 className="text-medium font-semibold">
                        {t('Artifacts')}
                      </h3>
                      <Chip
                        size="sm"
                        variant="flat"
                        color="primary"
                        className="text-tiny"
                      >
                        {conversationArtifacts.length}
                      </Chip>
                    </div>

                    {conversationArtifacts.length > 0 ? (
                      <div className="space-y-3">
                        {conversationArtifacts
                          .sort(
                            (a, b) =>
                              new Date(b.updatedAt).getTime() -
                              new Date(a.updatedAt).getTime(),
                          )
                          .map((artifact) => (
                            <ArtifactWidget
                              key={artifact.id}
                              artifact={artifact}
                            />
                          ))}
                      </div>
                    ) : (
                      <div className="text-center py-6">
                        <Icon
                          name="PageSearch"
                          className="w-8 h-8 text-default-300 mx-auto mb-2"
                        />
                        <p className="text-small text-default-500">
                          {t('No artifacts created yet')}
                        </p>
                      </div>
                    )}
                  </CardBody>
                </Card>
              </div>
            </div>
          )} */}
        </div>

        <PromptArea
          lang={lang}
          autoFocus={!conversationId} // Only autofocus for new conversations
          className="max-w-4xl mx-auto mt-6"
          value={prompt}
          onValueChange={setPrompt}
          onSend={onSubmit}
          isSending={isSending}
          selectedAgent={selectedAgent}
          onAgentChange={setSelectedAgent}
          disabledAgentPicker
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
