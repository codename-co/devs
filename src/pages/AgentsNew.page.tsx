import {
  Accordion,
  AccordionItem,
  Alert,
  Button,
  Card,
  CardBody,
  CardHeader,
  Input,
  Slider,
  Spinner,
  Textarea,
} from '@heroui/react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useI18n } from '@/i18n'
import DefaultLayout from '@/layouts/Default'
import { HeaderProps } from '@/lib/types'
import { Message } from '@/types'
import {
  Container,
  Section,
  Title,
  MarkdownRenderer,
  AgentKnowledgePicker,
} from '@/components'
import { createAgent } from '@/stores/agentStore'
import { LLMService, LLMMessage } from '@/lib/llm'
import { CredentialService } from '@/lib/credential-service'
import { buildAgentInstructions } from '@/lib/agent-knowledge'
import { languages } from '@/i18n'

interface AgentConfig {
  name: string
  role: string
  instructions?: string
  temperature?: number
}

export function AgentsNewPage() {
  const navigate = useNavigate()
  const { lang, t } = useI18n()

  const header: HeaderProps = {
    color: 'bg-warning-50',
    icon: {
      name: 'SparkSolid',
      color: 'text-warning-300',
    },
    title: t('Agent Builder'),
    subtitle: t('Design and configure your custom specialized AI agent'),
  }

  // Form state
  const [name, setName] = useState('')
  const [role, setRole] = useState('')
  const [instructions, setInstructions] = useState('')
  const [temperature, setTemperature] = useState(0.7)
  const [selectedKnowledgeIds, setSelectedKnowledgeIds] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  // Chat state
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Current agent config for testing
  const currentAgentConfig: AgentConfig = {
    name: name || 'New Agent',
    role: role || 'AI Assistant',
    instructions: instructions || 'You are a helpful AI assistant.',
    temperature: temperature,
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleCreateAgent = async () => {
    if (!isFormValid) return

    setIsSubmitting(true)
    setError('')
    setSuccess(false)

    try {
      // Create the agent using the store
      await createAgent({
        name,
        role,
        instructions,
        temperature,
        tags: ['custom'],
        knowledgeItemIds: selectedKnowledgeIds,
      })

      setSuccess(true)

      // Redirect to agents list after a delay
      setTimeout(() => {
        navigate('/agents')
      }, 2000)
    } catch (error) {
      console.error(error)
      setError(
        error instanceof Error ? error.message : 'Failed to create agent',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    const userInput = input.trim()
    setInput('')
    setIsLoading(true)

    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: '',
      timestamp: new Date(),
    }

    // Add assistant message placeholder
    setMessages((prev) => [...prev, assistantMessage])

    try {
      // Get the active LLM configuration
      const config = await CredentialService.getActiveConfig()
      if (!config) {
        throw new Error(
          'No LLM provider configured. Please configure one in Settings.',
        )
      }

      // Build enhanced instructions with knowledge context
      const baseInstructions =
        currentAgentConfig.instructions || 'You are a helpful AI assistant.'
      const enhancedInstructions = await buildAgentInstructions(
        baseInstructions,
        selectedKnowledgeIds,
      )

      const instructions = [
        enhancedInstructions,
        `ALWAYS respond in ${languages[lang]} as this is the user's language.`,
      ].join('\n\n')

      // Prepare messages for the LLM
      const llmMessages: LLMMessage[] = [
        {
          role: 'system',
          content: instructions,
        },
      ]

      // Include conversation history
      if (messages.length > 0) {
        llmMessages.push(
          ...messages.map((msg) => ({
            role: msg.role as 'user' | 'assistant',
            content: msg.content,
          })),
        )
      }

      llmMessages.push({
        role: 'user',
        content: userInput,
      })

      // Stream the response
      let fullResponse = ''
      for await (const chunk of LLMService.streamChat(llmMessages, config)) {
        fullResponse += chunk
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessage.id
              ? { ...msg, content: fullResponse }
              : msg,
          ),
        )
      }
    } catch (error) {
      console.error('Failed to get AI response:', error)
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Sorry, I encountered an error. Please make sure you have configured an LLM provider in Settings.'

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessage.id
            ? { ...msg, content: errorMessage }
            : msg,
        ),
      )
    } finally {
      setIsLoading(false)
    }
  }

  const clearChat = () => {
    setMessages([])
  }

  const resetForm = () => {
    setName('')
    setRole('')
    setInstructions('')
    setTemperature(0.7)
    setSelectedKnowledgeIds([])
    setError('')
    setSuccess(false)
    setMessages([])
  }

  const isFormValid = name.trim() && role.trim()
  const isPreviewEnabled = name.trim()

  return (
    <DefaultLayout title={String(header.title)} header={header}>
      <Section>
        <Container>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Side - Agent Creation Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleCreateAgent()
              }}
              className="space-y-6"
            >
              <div>
                <Title level={3}>{t('Agent Profile')}</Title>
                <p className="text-small text-default-500 mt-2">
                  {t("Define your agent's personality and capabilities")}
                </p>
              </div>

              {error && <Alert color="danger">{error}</Alert>}

              {success && (
                <Alert color="success">
                  {t(
                    'Agent created successfully! Redirecting to agents list...',
                  )}
                </Alert>
              )}

              <Input
                label={t('Name')}
                value={name}
                onValueChange={setName}
                isRequired
                isDisabled={isSubmitting}
                placeholder={t('e.g., Mike the Magician')}
                description={t('A friendly name for your agent')}
              />

              <Input
                label={t('Role')}
                value={role}
                onValueChange={setRole}
                isRequired
                isDisabled={isSubmitting}
                placeholder={t('e.g., Performs magic tricks and illusions')}
                description={t('What does your agent do?')}
              />

              <Textarea
                label={t('Instructions')}
                value={instructions}
                onValueChange={setInstructions}
                isDisabled={isSubmitting}
                placeholder={t(
                  "Detailed instructions for the agent's personality, skills, constraints, and goals…",
                )}
                minRows={5}
                description={t(
                  "Detailed instructions for the agent's behavior",
                )}
              />

              <Accordion>
                <AccordionItem title={t('Advanced Configuration')}>
                  <div className="space-y-4 p-4 border rounded-md">
                    <AgentKnowledgePicker
                      selectedKnowledgeIds={selectedKnowledgeIds}
                      onSelectionChange={setSelectedKnowledgeIds}
                    />

                    <p className="text-xs text-default-500">
                      Configure advanced settings for your agent. The LLM
                      provider and model will use your active configuration from
                      Settings.
                    </p>

                    <Slider
                      label={t('Temperature')}
                      className="max-w-md"
                      maxValue={2}
                      minValue={0}
                      showSteps={true}
                      size="sm"
                      step={0.1}
                      value={temperature}
                      onChange={(value) =>
                        setTemperature(Array.isArray(value) ? value[0] : value)
                      }
                      isDisabled={isSubmitting}
                    />
                    <p className="text-xs text-default-500">
                      {t(
                        'Lower values = more focused, Higher values = more creative',
                      )}
                    </p>
                  </div>
                </AccordionItem>
              </Accordion>

              <div className="flex gap-4">
                <Button
                  type="submit"
                  color="primary"
                  isDisabled={isSubmitting || !isFormValid}
                  isLoading={isSubmitting}
                >
                  {isSubmitting ? t('Creating...') : t('Create Agent')}
                </Button>

                <Button
                  type="button"
                  variant="bordered"
                  onPress={resetForm}
                  isDisabled={isSubmitting}
                >
                  {t('Reset Form')}
                </Button>
              </div>
            </form>

            {/* Right Side - Live Chat Preview */}
            {isPreviewEnabled && (
              <Card className="h-full">
                <CardHeader>
                  <div className="flex justify-between items-center w-full">
                    <Title level={3}>{t('Live Preview')}</Title>
                    <Button
                      onPress={clearChat}
                      isDisabled={isLoading}
                      variant="flat"
                      size="sm"
                    >
                      {t('Clear')}
                    </Button>
                  </div>
                </CardHeader>
                <CardBody className="flex flex-col p-0">
                  {/* Chat Messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[400px]">
                    {messages.length === 0 && (
                      <div className="text-center text-default-500 py-8">
                        <p>{t('Start a conversation to test your agent')}</p>
                        <p className="text-sm mt-2">
                          The chat will use your current form configuration and
                          active LLM provider from Settings
                        </p>
                      </div>
                    )}

                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${
                          message.role === 'user'
                            ? 'justify-end'
                            : 'justify-start'
                        }`}
                      >
                        <div
                          className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                            message.role === 'user'
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-content2 text-foreground'
                          }`}
                        >
                          {message.role === 'user' ? (
                            <p className="text-sm">{message.content}</p>
                          ) : (
                            <MarkdownRenderer
                              content={message.content}
                              className="text-sm"
                            />
                          )}
                          <p className="text-xs opacity-70 mt-1">
                            {message.timestamp.toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    ))}

                    {isLoading && (
                      <div className="flex justify-start">
                        <div className="bg-content2 text-foreground px-4 py-2 rounded-lg">
                          <Spinner size="sm" />
                        </div>
                      </div>
                    )}

                    <div ref={messagesEndRef} />
                  </div>

                  {/* Chat Input */}
                  <div className="p-4 border-t">
                    <div className="flex gap-2">
                      <Input
                        value={input}
                        onValueChange={setInput}
                        placeholder={t('Ask {agentName} something…', {
                          agentName: currentAgentConfig.name,
                        })}
                        isDisabled={isLoading || !isPreviewEnabled}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault()
                            sendMessage()
                          }
                        }}
                      />
                      <Button
                        onPress={sendMessage}
                        isDisabled={
                          isLoading || !input.trim() || !isPreviewEnabled
                        }
                        color="primary"
                      >
                        {t('Send')}
                      </Button>
                    </div>
                  </div>
                </CardBody>
              </Card>
            )}
          </div>
        </Container>
      </Section>
    </DefaultLayout>
  )
}
