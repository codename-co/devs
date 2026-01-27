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
  Tab,
  Tabs,
  Textarea,
} from '@heroui/react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { languages, useI18n } from '@/i18n'
import DefaultLayout from '@/layouts/Default'
import { HeaderProps } from '@/lib/types'
import { Message, Tool } from '@/types'
import {
  Container,
  Section,
  Title,
  MarkdownRenderer,
  AgentKnowledgePicker,
  AgentToolsPicker,
  getKnowledgeToolNames,
  Icon,
} from '@/components'
import { createAgent } from '@/stores/agentStore'
import { LLMService, LLMMessage } from '@/lib/llm'
import { CredentialService } from '@/lib/credential-service'
import { buildAgentInstructions } from '@/lib/agent-knowledge'
import { AgentAppearancePicker } from '@/components'
import type { IconName } from '@/lib/types'
import type { AgentColor } from '@/types'
import localI18n from './i18n'

interface AgentConfig {
  name: string
  role: string
  instructions?: string
  temperature?: number
}

type CreationMode = 'meta' | 'manual'

// Meta-prompting system prompt for agent generation
const META_PROMPT_SYSTEM = `You are an expert AI agent designer. Your role is to help users create specialized AI agents by understanding their needs and generating appropriate agent configurations.

## Your Task

Based on the user's description of what they want, generate a complete agent profile as a JSON object.

## Required Output Format

Your response must be a valid JSON object with exactly this structure:

\`\`\`json
{
  "name": "string",
  "role": "string",
  "instructions": "multi-line string"
}
\`\`\`

Where:
- **name**: A memorable, professional name for the agent that reflects its purpose
- **role**: A concise description of what the agent does (1-2 sentences)
- **instructions**: Comprehensive instructions defining the agent's personality, expertise, capabilities, constraints, and communication style. Should be detailed enough to guide the agent's behavior effectively.

## Guidelines

1. **Understand the Request**: Carefully analyze what the user needs
2. **Name Appropriately**: Choose a name that's memorable and reflects the agent's purpose
3. **Define Clear Role**: The role should immediately convey what the agent does
4. **Write Detailed Instructions**: Include:
   - Core expertise and knowledge domains
   - Communication style and tone
   - Specific capabilities and limitations
   - How to approach tasks
   - Any constraints or guidelines

## Important

- Always respond with a valid JSON object
- Make the agent feel authentic and specialized
- Tailor the personality to match the domain
- RESPOND IN THE SAME LANGUAGE AS THE USER'S REQUEST`

export function AgentsNewPage() {
  const navigate = useNavigate()
  const { lang, t } = useI18n(localI18n)

  const header: HeaderProps = {
    color: 'bg-warning-50',
    icon: {
      name: 'SparkSolid',
      color: 'text-warning-300',
    },
    title: t('Agent Builder'),
    subtitle: t('Design and configure your custom specialized AI agent'),
  }

  // Creation mode state
  const [creationMode, setCreationMode] = useState<CreationMode>('meta')

  // Meta-prompting state
  const [metaPrompt, setMetaPrompt] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationError, setGenerationError] = useState('')
  const [generatedPreview, setGeneratedPreview] = useState('')

  // Form state
  const [name, setName] = useState('')
  const [role, setRole] = useState('')
  const [instructions, setInstructions] = useState('')
  const [temperature, setTemperature] = useState(0.7)
  const [selectedKnowledgeIds, setSelectedKnowledgeIds] = useState<string[]>([])
  const [selectedTools, setSelectedTools] = useState<Tool[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  // Appearance state
  const [icon, setIcon] = useState<IconName | undefined>()
  const [color, setColor] = useState<AgentColor | undefined>()
  const [portrait, setPortrait] = useState<string | undefined>()

  // Chat state (for preview)
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

  // Meta-prompting: Generate agent from description
  const generateAgentFromDescription = async () => {
    if (!metaPrompt.trim() || isGenerating) return

    setIsGenerating(true)
    setGenerationError('')
    setGeneratedPreview('')

    try {
      const config = await CredentialService.getActiveConfig()
      if (!config) {
        throw new Error(
          t('No LLM provider configured. Please configure one in Settings.'),
        )
      }

      const systemPrompt = META_PROMPT_SYSTEM

      const llmMessages: LLMMessage[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: metaPrompt.trim() },
      ]

      let response = ''
      for await (const chunk of LLMService.streamChat(llmMessages, config)) {
        response += chunk
        setGeneratedPreview(response)
      }

      // Parse JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error(
          t('Failed to generate agent configuration. Please try again.'),
        )
      }

      const agentProfile = JSON.parse(jsonMatch[0])

      // Validate required fields
      if (!agentProfile.name || !agentProfile.role) {
        throw new Error(
          t('Generated configuration is missing required fields.'),
        )
      }

      // Fill form with generated values
      setName(agentProfile.name)
      setRole(agentProfile.role)
      setInstructions(agentProfile.instructions || '')

      // Switch to manual mode to show filled form
      setCreationMode('manual')
    } catch (error) {
      console.error('Failed to generate agent:', error)
      setGenerationError(
        error instanceof Error
          ? error.message
          : t('Failed to generate agent. Please try again.'),
      )
    } finally {
      setIsGenerating(false)
    }
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
        tools: selectedTools.length > 0 ? selectedTools : undefined,
        icon,
        color,
        portrait,
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
    setSelectedTools([])
    setIcon(undefined)
    setColor(undefined)
    setPortrait(undefined)
    setError('')
    setSuccess(false)
    setMessages([])
    setMetaPrompt('')
    setGenerationError('')
    setGeneratedPreview('')
    setCreationMode('meta')
  }

  const isFormValid = name.trim() && role.trim()
  const isPreviewEnabled = name.trim()

  return (
    <DefaultLayout title={String(header.title)} header={header}>
      <Section>
        <Container>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Side - Agent Creation */}
            <div className="space-y-6">
              <Tabs
                selectedKey={creationMode}
                onSelectionChange={(key) =>
                  setCreationMode(key as CreationMode)
                }
                aria-label={t('Creation mode')}
                color="primary"
                variant="bordered"
                classNames={{
                  tabList: 'w-full',
                }}
              >
                <Tab
                  key="meta"
                  title={
                    <div className="flex items-center gap-2">
                      <Icon name="Sparks" className="w-4 h-4" />
                      <span>{t('Describe Your Agent')}</span>
                    </div>
                  }
                >
                  {/* Meta-prompting Mode */}
                  <div className="space-y-6 pt-4">
                    <div>
                      <p className="text-small text-default-500">
                        {t(
                          "Tell us what kind of agent you want, and we'll create it for you.",
                        )}
                      </p>
                    </div>

                    {generationError && (
                      <Alert color="danger">{generationError}</Alert>
                    )}

                    <Textarea
                      label={t('What agent do you need?')}
                      value={metaPrompt}
                      onValueChange={setMetaPrompt}
                      isDisabled={isGenerating}
                      placeholder={t(
                        'e.g., A friendly cooking assistant who specializes in Italian cuisine and can suggest wine pairings...',
                      )}
                      minRows={4}
                      description={t(
                        'Describe the agent you want to create. Be as specific as you like!',
                      )}
                    />

                    {isGenerating && generatedPreview && (
                      <Card>
                        <CardBody>
                          <div className="flex items-center gap-2 mb-2">
                            <Spinner size="sm" />
                            <span className="text-small text-default-500">
                              {t('Generating agent...')}
                            </span>
                          </div>
                          <div className="text-sm text-default-600 whitespace-pre-wrap max-h-48 overflow-y-auto">
                            {generatedPreview}
                          </div>
                        </CardBody>
                      </Card>
                    )}

                    <div className="flex gap-4">
                      <Button
                        color="primary"
                        onPress={generateAgentFromDescription}
                        isDisabled={isGenerating || !metaPrompt.trim()}
                        isLoading={isGenerating}
                        startContent={
                          !isGenerating && (
                            <Icon name="Sparks" className="w-4 h-4" />
                          )
                        }
                      >
                        {isGenerating
                          ? t('Generating...')
                          : t('Generate Agent')}
                      </Button>

                      <Button
                        variant="light"
                        onPress={() => setCreationMode('manual')}
                        isDisabled={isGenerating}
                      >
                        {t('Or configure manually')}
                      </Button>
                    </div>
                  </div>
                </Tab>

                <Tab
                  key="manual"
                  title={
                    <div className="flex items-center gap-2">
                      <Icon name="Settings" className="w-4 h-4" />
                      <span>{t('Manual Configuration')}</span>
                    </div>
                  }
                >
                  {/* Manual Mode - Original Form */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault()
                      handleCreateAgent()
                    }}
                    className="space-y-6 pt-4"
                  >
                    <div>
                      <p className="text-small text-default-500">
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
                      placeholder={t(
                        'e.g., Performs magic tricks and illusions',
                      )}
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

                    <AgentAppearancePicker
                      icon={icon}
                      color={color}
                      portrait={portrait}
                      name={name}
                      role={role}
                      instructions={instructions}
                      onIconChange={setIcon}
                      onColorChange={setColor}
                      onPortraitChange={setPortrait}
                      showPortraitOption={true}
                    />

                    <Accordion>
                      <AccordionItem title={t('Advanced Configuration')}>
                        <div className="space-y-4 p-4 border rounded-md">
                          <AgentKnowledgePicker
                            selectedKnowledgeIds={selectedKnowledgeIds}
                            onSelectionChange={setSelectedKnowledgeIds}
                          />

                          <AgentToolsPicker
                            selectedToolNames={getKnowledgeToolNames(
                              selectedTools,
                            )}
                            onSelectionChange={setSelectedTools}
                          />

                          <p className="text-xs text-default-500">
                            {t('Configure advanced settings for your agent')}
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
                              setTemperature(
                                Array.isArray(value) ? value[0] : value,
                              )
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
                </Tab>
              </Tabs>
            </div>

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
                          {t(
                            'The chat will use your current form configuration',
                          )}
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
