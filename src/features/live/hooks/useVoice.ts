/**
 * useVoice Hook
 *
 * React hook for using voice services (STT, TTS, Gemini Live)
 * Provides a unified interface for speech recognition and synthesis
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  STTProvider,
  TTSProvider,
  STTProviderType,
  TTSProviderType,
  STTResult,
  TTSVoice,
  GeminiLiveConfig,
} from '../lib/types'
import { createSTTProvider } from '../lib/stt'
import { createTTSProvider } from '../lib/tts'
import { GeminiLiveProvider } from '../lib/gemini-live'

export interface UseVoiceOptions {
  // STT options
  sttProvider?: STTProviderType
  sttModelId?: string
  language?: string

  // TTS options
  ttsProvider?: TTSProviderType
  ttsModelId?: string
  ttsVoiceId?: string
  ttsDtype?: 'fp32' | 'fp16' | 'q8' | 'q4' | 'q4f16'

  // Gemini Live options (for bidirectional mode)
  geminiApiKey?: string
  geminiModel?: string
  systemInstruction?: string

  // Callbacks
  onTranscript?: (result: STTResult) => void
  onFinalTranscript?: (text: string) => void
  onSpeechEnd?: () => void
  onError?: (error: Error) => void
  onLoadingProgress?: (progress: { status: string; progress?: number }) => void
}

export interface UseVoiceReturn {
  // State
  isRecording: boolean
  isSpeaking: boolean
  isSTTReady: boolean
  isTTSReady: boolean
  isGeminiConnected: boolean
  isLoading: boolean
  transcript: string
  error: Error | null

  // STT actions
  startRecording: () => Promise<void>
  stopRecording: () => Promise<void>
  toggleRecording: () => Promise<void>

  // TTS actions
  speak: (text: string) => Promise<void>
  stopSpeaking: () => void
  getVoices: () => Promise<TTSVoice[]>
  /** Get the TTS AnalyserNode for audio visualization (if available) */
  getTTSAnalyser: () => AnalyserNode | null

  // Gemini Live actions
  connectGeminiLive: (config?: Partial<GeminiLiveConfig>) => Promise<void>
  disconnectGeminiLive: () => Promise<void>
  sendTextToGemini: (text: string) => void

  // Provider management
  setSTTProvider: (type: STTProviderType) => Promise<void>
  setTTSProvider: (type: TTSProviderType) => Promise<void>

  // Model info
  sttProviderType: STTProviderType
  ttsProviderType: TTSProviderType
}

export function useVoice(options: UseVoiceOptions = {}): UseVoiceReturn {
  const {
    sttProvider: initialSTTProvider = 'web-speech',
    sttModelId,
    language,
    ttsProvider: initialTTSProvider = 'web-speech',
    ttsModelId,
    ttsVoiceId,
    ttsDtype = 'q8',
    geminiApiKey,
    geminiModel,
    systemInstruction,
    onTranscript,
    onFinalTranscript,
    onSpeechEnd,
    onError,
    onLoadingProgress,
  } = options

  // State
  const [isRecording, setIsRecording] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isSTTReady, setIsSTTReady] = useState(false)
  const [isTTSReady, setIsTTSReady] = useState(false)
  const [isGeminiConnected, setIsGeminiConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [error, setError] = useState<Error | null>(null)
  const [sttProviderType, setSTTProviderType] =
    useState<STTProviderType>(initialSTTProvider)
  const [ttsProviderType, setTTSProviderType] =
    useState<TTSProviderType>(initialTTSProvider)

  // Refs for providers (avoid recreation on each render)
  const sttRef = useRef<STTProvider | null>(null)
  const ttsRef = useRef<TTSProvider | null>(null)
  const geminiRef = useRef<GeminiLiveProvider | null>(null)
  const cleanupRef = useRef<(() => void)[]>([])

  // Initialize STT provider
  const initSTT = useCallback(
    async (type: STTProviderType) => {
      try {
        setIsLoading(true)
        setError(null)

        // Cleanup existing
        if (sttRef.current) {
          await sttRef.current.dispose()
        }

        // Create new provider
        sttRef.current = createSTTProvider(type, { modelId: sttModelId })

        // Set progress callback if supported
        if ('setProgressCallback' in sttRef.current) {
          ;(sttRef.current as any).setProgressCallback((progress: any) => {
            onLoadingProgress?.(progress)
          })
        }

        // Initialize
        await sttRef.current.initialize()

        // Subscribe to results
        const unsubResult = sttRef.current.onResult((result) => {
          setTranscript(result.text)
          onTranscript?.(result)
          if (result.isFinal) {
            onFinalTranscript?.(result.text)
          }
        })

        const unsubError = sttRef.current.onError((err) => {
          setError(err)
          onError?.(err)
        })

        cleanupRef.current.push(unsubResult, unsubError)

        setIsSTTReady(true)
        setSTTProviderType(type)
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err))
        setError(error)
        onError?.(error)
      } finally {
        setIsLoading(false)
      }
    },
    [sttModelId, onTranscript, onFinalTranscript, onError, onLoadingProgress],
  )

  // Initialize TTS provider
  const initTTS = useCallback(
    async (type: TTSProviderType) => {
      try {
        setIsLoading(true)
        setError(null)

        // Cleanup existing
        if (ttsRef.current) {
          await ttsRef.current.dispose()
        }

        // Create new provider
        ttsRef.current = createTTSProvider(type, {
          modelId: ttsModelId,
          dtype: ttsDtype,
        })

        // Set progress callback if supported
        if ('setProgressCallback' in ttsRef.current) {
          ;(ttsRef.current as any).setProgressCallback((progress: any) => {
            onLoadingProgress?.(progress)
          })
        }

        // Initialize
        await ttsRef.current.initialize()

        // Subscribe to end events
        const unsubEnd = ttsRef.current.onEnd(() => {
          setIsSpeaking(false)
          onSpeechEnd?.()
        })

        cleanupRef.current.push(unsubEnd)

        setIsTTSReady(true)
        setTTSProviderType(type)
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err))
        setError(error)
        onError?.(error)
      } finally {
        setIsLoading(false)
      }
    },
    [ttsModelId, ttsDtype, onSpeechEnd, onError, onLoadingProgress],
  )

  // Initialize on mount
  useEffect(() => {
    initSTT(initialSTTProvider)
    initTTS(initialTTSProvider)

    return () => {
      // Cleanup subscriptions
      cleanupRef.current.forEach((cleanup) => cleanup())
      cleanupRef.current = []

      // Dispose providers
      sttRef.current?.dispose()
      ttsRef.current?.dispose()
      geminiRef.current?.disconnect()
    }
  }, []) // Only run once on mount

  // STT actions
  const startRecording = useCallback(async () => {
    if (!sttRef.current || isRecording) return

    try {
      setTranscript('')
      await sttRef.current.start({
        language,
        continuous: true,
        interimResults: true,
      })
      setIsRecording(true)
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      setError(error)
      onError?.(error)
    }
  }, [isRecording, language, onError])

  const stopRecording = useCallback(async () => {
    if (!sttRef.current || !isRecording) return

    try {
      await sttRef.current.stop()
      setIsRecording(false)
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      setError(error)
      onError?.(error)
    }
  }, [isRecording, onError])

  const toggleRecording = useCallback(async () => {
    if (isRecording) {
      await stopRecording()
    } else {
      await startRecording()
    }
  }, [isRecording, startRecording, stopRecording])

  // TTS actions
  const speak = useCallback(
    async (text: string) => {
      if (!ttsRef.current) return

      try {
        setIsSpeaking(true)
        await ttsRef.current.speak(text, { voiceId: ttsVoiceId })
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err))
        setError(error)
        onError?.(error)
        setIsSpeaking(false)
      }
    },
    [ttsVoiceId, onError],
  )

  const stopSpeaking = useCallback(() => {
    ttsRef.current?.stop()
    setIsSpeaking(false)
  }, [])

  const getVoices = useCallback(async (): Promise<TTSVoice[]> => {
    if (!ttsRef.current) return []
    return ttsRef.current.getVoices()
  }, [])

  // Get TTS analyser for audio visualization
  const getTTSAnalyser = useCallback((): AnalyserNode | null => {
    if (!ttsRef.current) return null
    return ttsRef.current.getAnalyser?.() ?? null
  }, [])

  // Gemini Live actions
  const connectGeminiLive = useCallback(
    async (config?: Partial<GeminiLiveConfig>) => {
      const apiKey = config?.apiKey || geminiApiKey
      if (!apiKey) {
        throw new Error('Gemini API key is required')
      }

      try {
        setIsLoading(true)

        if (!geminiRef.current) {
          geminiRef.current = new GeminiLiveProvider()
        }

        // Subscribe to state changes
        const unsubState = geminiRef.current.onStateChange((connected) => {
          setIsGeminiConnected(connected)
        })

        cleanupRef.current.push(unsubState)

        await geminiRef.current.connect({
          apiKey,
          model: config?.model || geminiModel,
          systemInstruction: config?.systemInstruction || systemInstruction,
          responseModalities: ['AUDIO', 'TEXT'],
        })
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err))
        setError(error)
        onError?.(error)
      } finally {
        setIsLoading(false)
      }
    },
    [geminiApiKey, geminiModel, systemInstruction, onError],
  )

  const disconnectGeminiLive = useCallback(async () => {
    await geminiRef.current?.disconnect()
    setIsGeminiConnected(false)
  }, [])

  const sendTextToGemini = useCallback((text: string) => {
    geminiRef.current?.sendText(text)
  }, [])

  // Provider management
  const setSTTProvider = useCallback(
    async (type: STTProviderType) => {
      if (isRecording) {
        await stopRecording()
      }
      await initSTT(type)
    },
    [isRecording, stopRecording, initSTT],
  )

  const setTTSProvider = useCallback(
    async (type: TTSProviderType) => {
      if (isSpeaking) {
        stopSpeaking()
      }
      await initTTS(type)
    },
    [isSpeaking, stopSpeaking, initTTS],
  )

  return {
    // State
    isRecording,
    isSpeaking,
    isSTTReady,
    isTTSReady,
    isGeminiConnected,
    isLoading,
    transcript,
    error,

    // STT actions
    startRecording,
    stopRecording,
    toggleRecording,

    // TTS actions
    speak,
    stopSpeaking,
    getVoices,
    getTTSAnalyser,

    // Gemini Live actions
    connectGeminiLive,
    disconnectGeminiLive,
    sendTextToGemini,

    // Provider management
    setSTTProvider,
    setTTSProvider,

    // Model info
    sttProviderType,
    ttsProviderType,
  }
}
