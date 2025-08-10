import {
  Accordion,
  AccordionItem,
  Alert,
  Button,
  Card,
  CardBody,
  CardHeader,
  Input,
  Select,
  SelectItem,
  Slider,
  Spinner,
  Textarea,
} from '@heroui/react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import DefaultLayout from '@/layouts/Default'
import { HeaderProps } from '@/lib/types'
import { LLMProvider, Message } from '@/types'
import { Container, Section, Title, MarkdownRenderer } from '@/components'
import { createAgent } from '@/stores/agentStore'

interface LLMModel {
  id: string
  name: string
  provider: LLMProvider
}

interface AgentConfig {
  name: string
  role: string
  instructions?: string
  temperature?: number
  provider?: LLMProvider
  model?: string
}

export function AgentsNewPage() {
  const navigate = useNavigate()

  const header: HeaderProps = {
    color: 'bg-warning-50',
    icon: {
      name: 'SparkSolid',
      color: 'text-warning-300',
    },
    title: 'Agent Builder',
    subtitle: 'Design and configure your custom specialized AI agent',
  }

  // Form state
  const [name, setName] = useState('')
  const [role, setRole] = useState('')
  const [instructions, setInstructions] = useState('')
  const [selectedProvider, setSelectedProvider] = useState<LLMProvider>('openai')
  const [selectedModel, setSelectedModel] = useState('')
  const [temperature, setTemperature] = useState(0.7)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [availableModels, setAvailableModels] = useState<LLMModel[]>([])

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
    provider: selectedProvider,
    model: selectedModel,
  }

  useEffect(() => {
    fetchAvailableModels()
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const fetchAvailableModels = async () => {
    // Mock available models for now
    const mockModels: LLMModel[] = [
      { id: 'gpt-4', name: 'GPT-4', provider: 'openai' },
      { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', provider: 'openai' },
      { id: 'claude-3-sonnet', name: 'Claude 3 Sonnet', provider: 'anthropic' },
      { id: 'gemini-pro', name: 'Gemini Pro', provider: 'google' },
    ]
    setAvailableModels(mockModels)
    setSelectedModel(mockModels[0]?.id || '')
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
      })

      setSuccess(true)

      // Redirect to agents list after a delay
      setTimeout(() => {
        navigate('/agents')
      }, 2000)
    } catch (error) {
      console.error(error)
      setError(error instanceof Error ? error.message : 'Failed to create agent')
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

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    // Simulate AI response
    setTimeout(() => {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Hello! I'm ${currentAgentConfig.name}, your ${currentAgentConfig.role}. ${currentAgentConfig.instructions || 'How can I help you today?'}`,
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, assistantMessage])
      setIsLoading(false)
    }, 1000)
  }

  const clearChat = () => {
    setMessages([])
  }

  const resetForm = () => {
    setName('')
    setRole('')
    setInstructions('')
    setSelectedProvider('openai')
    setSelectedModel(availableModels[0]?.id || '')
    setTemperature(0.7)
    setError('')
    setSuccess(false)
    setMessages([])
  }

  const isFormValid = name.trim() && role.trim()
  const isPreviewEnabled = name.trim()

  return (
    <DefaultLayout title={header.title} header={header}>
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
                <Title level={3}>Agent Profile</Title>
                <p className="text-small text-default-500 mt-2">
                  Define your agent's personality and capabilities
                </p>
              </div>

              {error && <Alert color="danger">{error}</Alert>}

              {success && (
                <Alert color="success">
                  Agent created successfully! Redirecting to agents list...
                </Alert>
              )}

              <Input
                label="Name"
                value={name}
                onValueChange={setName}
                isRequired
                isDisabled={isSubmitting}
                placeholder="e.g., Mike the Magician"
                description="A friendly name for your agent"
              />

              <Input
                label="Role"
                value={role}
                onValueChange={setRole}
                isRequired
                isDisabled={isSubmitting}
                placeholder="e.g., Performs magic tricks and illusions"
                description="What does your agent do?"
              />

              <Textarea
                label="Instructions"
                value={instructions}
                onValueChange={setInstructions}
                isDisabled={isSubmitting}
                placeholder="Detailed instructions for the agent's personality, skills, constraints, and goals…"
                minRows={5}
                description="Detailed instructions for the agent's behavior"
              />

              <Accordion>
                <AccordionItem title="Advanced Configuration">
                  <div className="space-y-4 p-4 border rounded-md">
                    <p className="text-xs text-default-500">
                      Configure advanced settings for your agent
                    </p>

                    <Select
                      label="Provider"
                      selectedKeys={[selectedProvider]}
                      onSelectionChange={(keys) =>
                        setSelectedProvider(Array.from(keys)[0] as LLMProvider)
                      }
                      isDisabled={isSubmitting}
                    >
                      <SelectItem key="openai">OpenAI</SelectItem>
                      <SelectItem key="anthropic">Anthropic</SelectItem>
                      <SelectItem key="google">Google AI</SelectItem>
                      <SelectItem key="mistral">Mistral</SelectItem>
                    </Select>

                    <Select
                      label="Model"
                      selectedKeys={selectedModel ? [selectedModel] : []}
                      onSelectionChange={(keys) =>
                        setSelectedModel(Array.from(keys)[0] as string)
                      }
                      isDisabled={isSubmitting}
                    >
                      {availableModels
                        .filter(model => model.provider === selectedProvider)
                        .map((model) => (
                          <SelectItem key={model.id}>
                            {model.name}
                          </SelectItem>
                        ))}
                    </Select>

                    <Slider
                      label="Temperature"
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
                      Lower values = more focused, Higher values = more creative
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
                  {isSubmitting ? 'Creating...' : 'Create Agent'}
                </Button>

                <Button
                  type="button"
                  variant="bordered"
                  onPress={resetForm}
                  isDisabled={isSubmitting}
                >
                  Reset Form
                </Button>
              </div>
            </form>

            {/* Right Side - Live Chat Preview */}
            {isPreviewEnabled && (
              <Card className="h-full">
                <CardHeader>
                  <div className="flex justify-between items-center w-full">
                    <Title level={3}>Live Preview</Title>
                    <Button
                      onPress={clearChat}
                      isDisabled={isLoading}
                      variant="flat"
                      size="sm"
                    >
                      Clear
                    </Button>
                  </div>
                </CardHeader>
                <CardBody className="flex flex-col p-0">
                  {/* Chat Messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[400px]">
                    {messages.length === 0 && (
                      <div className="text-center text-default-500 py-8">
                        <p>Start a conversation to test your agent</p>
                        <p className="text-sm mt-2">
                          The chat will use your current form configuration
                        </p>
                      </div>
                    )}

                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${
                          message.role === 'user' ? 'justify-end' : 'justify-start'
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
                        placeholder={`Ask ${currentAgentConfig.name} something…`}
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
                        isDisabled={isLoading || !input.trim() || !isPreviewEnabled}
                        color="primary"
                      >
                        Send
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
