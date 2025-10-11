import { useState, useEffect, useRef, useCallback } from 'react'

interface UseSpeechRecognitionOptions {
  lang?: string
  onTranscript?: (transcript: string) => void
  onFinalTranscript?: () => void
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
}: UseSpeechRecognitionOptions = {}): UseSpeechRecognitionReturn {
  const [isRecording, setIsRecording] = useState(false)
  const [isSupported, setIsSupported] = useState(false)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const finalTranscriptRef = useRef('')

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window === 'undefined') return

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition

    setIsSupported(!!SpeechRecognition)

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

      onTranscript?.(newTranscript)

      if (finalTranscript) {
        recognition.stop()
        onFinalTranscript?.()
      }
    }

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error', event.error)
      setIsRecording(false)
    }

    recognition.onend = () => {
      setIsRecording(false)
      if (finalTranscriptRef.current.trim()) {
        onFinalTranscript?.()
      }
    }

    recognitionRef.current = recognition

    return () => {
      recognition.stop()
    }
  }, [lang, onTranscript, onFinalTranscript])

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
