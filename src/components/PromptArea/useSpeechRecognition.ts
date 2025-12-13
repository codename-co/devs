import { useState, useEffect, useRef, useCallback } from 'react'
import { warningToast } from '@/lib/toast'

type SpeechRecognitionErrorCode =
  | 'no-speech'
  | 'aborted'
  | 'audio-capture'
  | 'network'
  | 'not-allowed'
  | 'service-not-allowed'
  | 'bad-grammar'
  | 'language-not-supported'

interface UseSpeechRecognitionOptions {
  lang?: string
  onTranscript?: (transcript: string) => void
  onFinalTranscript?: () => void
  onError?: (error: SpeechRecognitionErrorCode) => void
}

interface UseSpeechRecognitionReturn {
  isRecording: boolean
  isSupported: boolean
  startRecording: () => void
  stopRecording: () => void
  toggleRecording: () => void
}

export function useSpeechRecognition({
  lang,
  onTranscript,
  onFinalTranscript,
  onError,
}: UseSpeechRecognitionOptions = {}): UseSpeechRecognitionReturn {
  const [isRecording, setIsRecording] = useState(false)
  const [isSupported, setIsSupported] = useState(false)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const finalTranscriptRef = useRef('')

  // Store callbacks in refs to avoid effect re-runs
  const onTranscriptRef = useRef(onTranscript)
  const onFinalTranscriptRef = useRef(onFinalTranscript)
  const onErrorRef = useRef(onError)

  // Update refs when callbacks change
  useEffect(() => {
    onTranscriptRef.current = onTranscript
    onFinalTranscriptRef.current = onFinalTranscript
    onErrorRef.current = onError
  })

  // Check support once on mount
  useEffect(() => {
    if (typeof window === 'undefined') return

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition

    setIsSupported(!!SpeechRecognition)
  }, [])

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window === 'undefined') return

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition

    if (!SpeechRecognition) {
      console.warn('Speech recognition not supported')
      return
    }

    const recognition = new SpeechRecognition()

    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = lang || navigator.language || 'en-US'

    recognition.onstart = () => {
      finalTranscriptRef.current = ''
    }

    recognition.onresult = (event: any) => {
      let finalTranscript = ''
      let interimTranscript = ''

      for (let i = 0; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript

        console.debug('🎙', transcript)
        if (event.results[i].isFinal) {
          finalTranscript += transcript
        } else {
          interimTranscript += transcript
        }
      }
      finalTranscriptRef.current = finalTranscript
      const newTranscript = finalTranscript + interimTranscript

      onTranscriptRef.current?.(newTranscript)

      if (finalTranscript) {
        recognition.stop()
        onFinalTranscriptRef.current?.()
      }
    }

    recognition.onerror = (event: any) => {
      const errorCode = event.error as SpeechRecognitionErrorCode
      console.error('Speech recognition error:', errorCode)
      setIsRecording(false)

      // Provide user-friendly error messages
      switch (errorCode) {
        case 'network':
          warningToast(
            'Speech recognition unavailable',
            'Please check your internet connection and try again',
          )
          break
        case 'not-allowed':
        case 'service-not-allowed':
          warningToast(
            'Microphone access denied',
            'Please allow microphone access in your browser settings',
          )
          break
        case 'audio-capture':
          warningToast(
            'No microphone found',
            'Please connect a microphone and try again',
          )
          break
        case 'no-speech':
          // Silent error - no speech detected is not necessarily an error
          break
        case 'aborted':
          // User aborted, no need to show error
          break
        default:
          warningToast('Speech recognition error', errorCode)
      }

      onErrorRef.current?.(errorCode)
    }

    recognition.onend = () => {
      setIsRecording(false)
      if (finalTranscriptRef.current.trim()) {
        onFinalTranscriptRef.current?.()
      }
    }

    recognitionRef.current = recognition

    return () => {
      recognition.stop()
    }
  }, [lang])

  const startRecording = useCallback(() => {
    const recognition = recognitionRef.current
    if (!recognition || isRecording) return

    recognition.start()
    setIsRecording(true)
  }, [isRecording])

  const stopRecording = useCallback(() => {
    const recognition = recognitionRef.current
    if (!recognition || !isRecording) return

    recognition.stop()
    setIsRecording(false)
  }, [isRecording])

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording()
    } else {
      startRecording()
    }
  }, [isRecording, startRecording, stopRecording])

  return {
    isRecording,
    isSupported,
    startRecording,
    stopRecording,
    toggleRecording,
  }
}
