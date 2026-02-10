import { Icon, PageMenuButton, Section } from '@/components'
import { AgentSelector } from '@/components/PromptArea/AgentSelector'
import { useI18n } from '@/i18n'
import localI18n from '../i18n'
import { useVoice } from '../hooks/useVoice'
import { getAvailableSTTProviders } from '../lib'
import type { STTProviderType, TTSProviderType } from '../lib/types'
import { VoiceSettingsPanel } from '../components/VoiceSettingsPanel'
import DefaultLayout from '@/layouts/Default'
import { userSettings } from '@/stores/userStore'
import { getAgentBySlugAsync, getDefaultAgent } from '@/stores/agentStore'
import { useConversationStore } from '@/stores/conversationStore'
import { CredentialService } from '@/lib/credential-service'
import { LLMService, type LLMMessage } from '@/lib/llm'
import { buildAgentInstructions } from '@/lib/agent-knowledge'
import { buildMemoryContextForChat } from '@/lib/memory-learning-service'
import { languages } from '@/i18n'
import type { Agent, Message } from '@/types'
import {
  Button,
  Popover,
  PopoverContent,
  Progress,
  Tooltip,
} from '@heroui/react'
import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { VoiceWaveform } from '../components'

export const LivePage = () => {
  const { lang, t } = useI18n(localI18n)
  const location = useLocation()
  const navigate = useNavigate()

  const {
    kokoroVoiceId,
    setKokoroVoiceId,
    sttProvider: savedSTTProvider,
    setSTTProvider: setSavedSTTProvider,
    ttsProvider: savedTTSProvider,
    setTTSProvider: setSavedTTSProvider,
    liveAutoSpeak,
    setLiveAutoSpeak,
  } = userSettings()

  const [loadingProgress, setLoadingProgress] = useState<{
    status: string
    progress?: number
  } | null>(null)

  // Agent selection state
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [isAgentLoading, setIsAgentLoading] = useState(true)

  // Chat state
  const [isGenerating, setIsGenerating] = useState(false)
  const [aiResponse, setAiResponse] = useState('')
  const [conversationMessages, setConversationMessages] = useState<Message[]>(
    [],
  )
  const conversationIdRef = useRef<string | null>(null)

  // Parse agent slug from URL hash
  const agentSlug = useMemo(() => {
    const hash = location.hash.replace('#', '')
    return hash || 'devs'
  }, [location.hash])

  // Load agent from slug
  useEffect(() => {
    const loadAgent = async () => {
      setIsAgentLoading(true)
      try {
        const agent = await getAgentBySlugAsync(agentSlug)
        if (agent) {
          setSelectedAgent(agent)
        } else {
          // Fallback to default agent
          setSelectedAgent(getDefaultAgent())
        }
      } catch (error) {
        console.error('Error loading agent:', error)
        setSelectedAgent(getDefaultAgent())
      } finally {
        setIsAgentLoading(false)
      }
    }
    loadAgent()
  }, [agentSlug])

  // Handle agent change - update URL hash
  const handleAgentChange = useCallback(
    (agent: Agent | null) => {
      if (agent) {
        setSelectedAgent(agent)
        navigate(`#${agent.slug}`, { replace: true })
        // Clear conversation when switching agents
        setConversationMessages([])
        conversationIdRef.current = null
        setAiResponse('')
      }
    },
    [navigate],
  )

  // Auto-speak setting (default to true)
  const autoSpeak = liveAutoSpeak ?? true

  // Selected Kokoro voice (default to af_heart - the highest quality voice)
  const selectedVoiceId = kokoroVoiceId || 'af_heart'

  // Ref to store the pending transcript to submit
  const pendingTranscriptRef = useRef<string | null>(null)

  // Voice hook with configurable providers
  const {
    isRecording,
    isSpeaking,
    isSTTReady,
    isTTSReady,
    isLoading,
    transcript,
    error,
    toggleRecording,
    speak,
    stopSpeaking,
    setSTTProvider,
    setTTSProvider,
    sttProviderType,
    ttsProviderType,
    getTTSAnalyser,
  } = useVoice({
    sttProvider: savedSTTProvider || 'web-speech', // Use saved or default to browser native
    ttsProvider: savedTTSProvider || 'web-speech', // Use saved or default to browser native
    ttsVoiceId: selectedVoiceId, // Use selected Kokoro voice
    language: lang,
    onLoadingProgress: (progress) => {
      setLoadingProgress(progress)
    },
    onFinalTranscript: (text) => {
      // Store the transcript to be processed after render
      if (text.trim()) {
        pendingTranscriptRef.current = text
      }
    },
    onError: (err) => {
      console.error('[Voice] Error:', err)
    },
  })

  // TTS Analyser ref for waveform visualization during AI speech
  const ttsAnalyserRef = useRef<AnalyserNode | null>(null)

  // Keep TTS analyser ref updated
  useEffect(() => {
    ttsAnalyserRef.current = getTTSAnalyser()
  }, [getTTSAnalyser, isSpeaking, isTTSReady])

  // Submit transcript to LLM for text generation
  const handleSubmitToLLM = useCallback(
    async (userMessage: string) => {
      if (!selectedAgent || isGenerating) return

      setIsGenerating(true)
      setAiResponse('')

      try {
        // Get the active LLM configuration
        const config = await CredentialService.getActiveConfig()
        if (!config) {
          console.error('No LLM provider configured')
          setIsGenerating(false)
          return
        }

        // Get or create conversation
        const { currentConversation, createConversation, addMessage } =
          useConversationStore.getState()

        let conversation = currentConversation
        if (
          !conversation ||
          conversation.agentId !== selectedAgent.id ||
          conversationIdRef.current !== conversation.id
        ) {
          conversation = await createConversation(selectedAgent.id, 'live')
          conversationIdRef.current = conversation.id
        }

        // Build agent instructions
        const baseInstructions =
          selectedAgent.instructions || 'You are a helpful assistant.'
        const enhancedInstructions = await buildAgentInstructions(
          baseInstructions,
          selectedAgent.knowledgeItemIds,
        )

        // Get relevant memories
        const memoryContext = await buildMemoryContextForChat(
          selectedAgent.id,
          userMessage,
        )

        const instructions = [
          enhancedInstructions,
          memoryContext,
          `ALWAYS respond in ${languages[lang]} as this is the user's language.`,
          `Keep your responses concise and conversational, suitable for voice interaction.`,
        ]
          .filter(Boolean)
          .join('\n\n')

        // Save user message
        await addMessage(conversation.id, {
          role: 'user',
          content: userMessage,
        })

        // Update local state
        const userMsg: Message = {
          id: crypto.randomUUID(),
          role: 'user',
          content: userMessage,
          timestamp: new Date(),
        }
        setConversationMessages((prev) => [...prev, userMsg])

        // Prepare messages for LLM
        const messages: LLMMessage[] = [
          { role: 'system', content: instructions },
          ...conversationMessages.map((msg) => ({
            role: msg.role,
            content: msg.content,
          })),
          { role: 'user', content: userMessage },
        ]

        // Stream the response
        let response = ''
        for await (const chunk of LLMService.streamChat(messages, config, {
          agentId: selectedAgent.id,
          conversationId: conversation.id,
          tags: ['voice'],
        })) {
          response += chunk
          setAiResponse(response)
        }

        // Save assistant response
        await addMessage(conversation.id, {
          role: 'assistant',
          content: response,
          agentId: selectedAgent.id,
        })

        // Update local state
        const assistantMsg: Message = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: response,
          timestamp: new Date(),
          agentId: selectedAgent.id,
        }
        setConversationMessages((prev) => [...prev, assistantMsg])

        // Auto-speak the response if enabled
        if (autoSpeak && isTTSReady && response) {
          // Strip markdown for speech
          const textToSpeak = response
            .replace(/```[\s\S]*?```/g, '') // Remove code blocks
            .replace(/`[^`]+`/g, '') // Remove inline code
            .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove bold
            .replace(/\*([^*]+)\*/g, '$1') // Remove italic
            .replace(/#+\s/g, '') // Remove headers
            .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links
            .trim()

          if (textToSpeak) {
            await speak(textToSpeak)
          }
        }
      } catch (error) {
        console.error('Error generating response:', error)
      } finally {
        setIsGenerating(false)
      }
    },
    [
      selectedAgent,
      isGenerating,
      conversationMessages,
      lang,
      autoSpeak,
      isTTSReady,
      speak,
    ],
  )

  // Process pending transcript when agent is ready
  useEffect(() => {
    if (
      pendingTranscriptRef.current &&
      selectedAgent &&
      !isGenerating &&
      !isAgentLoading
    ) {
      const text = pendingTranscriptRef.current
      pendingTranscriptRef.current = null
      handleSubmitToLLM(text)
    }
  }, [selectedAgent, isGenerating, isAgentLoading, handleSubmitToLLM])

  // Available providers
  const sttProviders = useMemo(
    () => getAvailableSTTProviders(lang, (key: string) => t(key as any)),
    [lang, t],
  )

  // If current STT provider is disabled, switch to the first available non-disabled provider
  useEffect(() => {
    const currentProvider = sttProviders.find((p) => p.type === sttProviderType)
    if (currentProvider?.isDisabled) {
      // Find the first non-disabled provider
      const fallbackProvider = sttProviders.find((p) => !p.isDisabled)
      if (fallbackProvider) {
        setSTTProvider(fallbackProvider.type)
      }
    }
  }, [lang, sttProviders, sttProviderType, setSTTProvider])

  // Check if current provider is supported
  const isSupported = isSTTReady || !isLoading

  // Handle provider change
  const handleSTTProviderChange = async (type: string) => {
    const providerType = type as STTProviderType
    await setSTTProvider(providerType)
    setSavedSTTProvider(providerType)
  }

  const handleTTSProviderChange = async (type: string) => {
    const providerType = type as TTSProviderType
    await setTTSProvider(providerType)
    setSavedTTSProvider(providerType)
  }

  // Handle speak button - speaks the AI response
  const handleSpeak = async () => {
    if (isSpeaking) {
      stopSpeaking()
    } else if (aiResponse) {
      // Strip markdown for speech
      const textToSpeak = aiResponse
        .replace(/```[\s\S]*?```/g, '') // Remove code blocks
        .replace(/`[^`]+`/g, '') // Remove inline code
        .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove bold
        .replace(/\*([^*]+)\*/g, '$1') // Remove italic
        .replace(/#+\s/g, '') // Remove headers
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links
        .trim()

      if (textToSpeak) {
        await speak(textToSpeak)
      }
    }
  }

  return (
    <DefaultLayout
      showBackButton={false}
      pageMenuActions={
        <>
          {/* Agent Selector */}
          {selectedAgent && !isAgentLoading && (
            <AgentSelector
              lang={lang}
              selectedAgent={selectedAgent}
              onAgentChange={handleAgentChange}
            />
          )}

          {/* Voice Settings */}
          <Popover placement="bottom-end">
            <PageMenuButton
              icon="Settings"
              tooltip={t('Voice Settings')}
              ariaLabel={t('Voice Settings')}
            />
            <PopoverContent className="p-0">
              <VoiceSettingsPanel
                autoSpeak={autoSpeak}
                onAutoSpeakChange={setLiveAutoSpeak}
                sttProviderType={sttProviderType}
                onSTTProviderChange={handleSTTProviderChange}
                ttsProviderType={ttsProviderType}
                onTTSProviderChange={handleTTSProviderChange}
                selectedVoiceId={selectedVoiceId}
                onVoiceChange={setKokoroVoiceId}
              />
            </PopoverContent>
          </Popover>
        </>
      }
    >
      <Section mainClassName="flex flex-col items-center justify-end min-h-full gap-8 relative pb-16">
        {/* Voice waveform visualization - Full width background */}
        <div className="absolute inset-0 flex items-center pointer-events-none overflow-hidden">
          <VoiceWaveform
            isActive={isRecording || isSpeaking}
            width={2000}
            height={4000}
            color="hsl(var(--heroui-primary))"
            lineWidth={2}
            className="w-full h-auto min-w-full"
            ttsAnalyserRef={ttsAnalyserRef}
          />
        </div>

        {/* Loading progress indicator */}
        {isLoading && loadingProgress && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-content1 rounded-lg p-4 shadow-lg min-w-64">
            <p className="text-sm text-default-500 mb-2">
              {loadingProgress.status}
            </p>
            {loadingProgress.progress !== undefined && (
              <Progress
                value={loadingProgress.progress * 100}
                size="sm"
                color="primary"
              />
            )}
          </div>
        )}

        {/* Error display */}
        {error && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-danger-50 text-danger rounded-lg p-4 shadow-lg max-w-md">
            <p className="text-sm">{error.message}</p>
          </div>
        )}

        {/* AI Response display */}
        {aiResponse && (
          <div className="text-center text-xl font-medium px-4 max-w-4xl relative z-10 text-primary-600 dark:text-primary-400">
            {aiResponse}
          </div>
        )}

        {/* Transcript / User speech display */}
        <div className="text-center text-2xl font-medium min-h-16 px-4 max-w-4xl relative z-10">
          {isRecording && transcript ? (
            <span className="text-default-700">{transcript}</span>
          ) : isGenerating ? (
            <span className="text-default-400 animate-pulse">
              {t('Thinking…')}
            </span>
          ) : isRecording ? (
            <span className="text-default-400">{t('Listening…')}</span>
          ) : (
            transcript && <span className="text-default-500">{transcript}</span>
          )}
        </div>

        {/* Main controls */}
        <div className="flex justify-center items-center gap-4 w-full relative z-10">
          {/* Stop generation button */}
          {isGenerating && (
            <Tooltip content={t('Stop')} placement="top">
              <Button
                isIconOnly
                color="danger"
                radius="full"
                variant="ghost"
                size="lg"
                onPress={() => setIsGenerating(false)}
                className="min-w-16 min-h-16"
              >
                <Icon name="X" size="2xl" />
              </Button>
            </Tooltip>
          )}

          {/* TTS Play button - for AI response */}
          {aiResponse && isTTSReady && !isGenerating && (
            <Tooltip
              content={isSpeaking ? t('Stop speaking') : t('Speak transcript')}
              placement="top"
            >
              <Button
                isIconOnly
                color={isSpeaking ? 'warning' : 'secondary'}
                radius="full"
                variant="ghost"
                size="lg"
                onPress={handleSpeak}
                className="min-w-16 min-h-16"
              >
                <Icon name={isSpeaking ? 'Pause' : 'Voice'} size="2xl" />
              </Button>
            </Tooltip>
          )}

          {/* Main record button */}
          <Tooltip content={t('Speak to microphone')} placement="bottom">
            <Button
              isIconOnly
              color={isRecording ? 'primary' : 'default'}
              isDisabled={!isSupported || isGenerating}
              radius="full"
              variant="ghost"
              size="lg"
              onPress={toggleRecording}
              className="min-w-48 min-h-48"
            >
              {isRecording ? (
                <Icon name="DevsAnimated" size="5xl" className="devs-whole" />
              ) : isLoading || isGenerating ? (
                <Icon
                  name="RefreshDouble"
                  size="4xl"
                  className="animate-spin"
                />
              ) : (
                <Icon name="Voice" size="4xl" />
              )}
            </Button>
          </Tooltip>
        </div>
      </Section>
    </DefaultLayout>
  )
}
