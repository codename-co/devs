import {
  Button,
  Chip,
  Dropdown,
  DropdownTrigger,
  Textarea,
  type TextAreaProps,
  Tooltip,
} from '@heroui/react'
import { forwardRef, useEffect, useRef, useState } from 'react'

import { AgentPicker } from './AgentPicker'
import { Icon } from './Icon'

import { type Lang, useTranslations } from '@/i18n'
import { cn, formatFileSize, getFileIcon } from '@/lib/utils'
import { type Agent } from '@/types'
import { getDefaultAgent } from '@/stores/agentStore'

interface PromptAreaProps
  extends Omit<TextAreaProps, 'onFocus' | 'onBlur' | 'onKeyDown'> {
  lang: Lang
  onSend?: () => void
  isSending?: boolean
  onFilesChange?: (files: File[]) => void
  onAgentChange?: (agent: Agent | null) => void
  selectedAgent?: Agent | null
  onFocus?: React.FocusEventHandler<HTMLTextAreaElement>
  onBlur?: React.FocusEventHandler<HTMLTextAreaElement>
  onKeyDown?: React.KeyboardEventHandler<HTMLTextAreaElement>
}

export const PromptArea = forwardRef<HTMLTextAreaElement, PromptAreaProps>(
  function PromptArea(
    {
      className,
      lang,
      onSend,
      onValueChange,
      onFilesChange,
      onAgentChange,
      selectedAgent,
      onFocus,
      onBlur,
      onKeyDown,
      ...props
    },
    ref,
  ) {
    const [prompt, setPrompt] = useState('')
    const [isRecording, setIsRecording] = useState(false)
    const [isSpeechRecognitionSupported, setIsSpeechRecognitionSupported] =
      useState(false)
    const [selectedFiles, setSelectedFiles] = useState<File[]>([])
    const [isDragOver, setIsDragOver] = useState(false)
    const [isFocused, setIsFocused] = useState(false)
    const recognitionRef = useRef<SpeechRecognition | null>(null)
    const finalTranscriptRef = useRef('')
    const fileInputRef = useRef<HTMLInputElement>(null)

    const t = useTranslations(lang)

    // Set default agent if none selected
    const currentAgent = selectedAgent || getDefaultAgent()

    useEffect(() => {
      if (typeof window === 'undefined') return

      const SpeechRecognition =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition

      setIsSpeechRecognitionSupported(!!SpeechRecognition)

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
        const newPrompt = finalTranscript + interimTranscript

        setPrompt(newPrompt)
        if (onValueChange) {
          onValueChange(newPrompt)
        }

        if (finalTranscript) {
          recognition.stop()
          onSend?.()
        }
      }

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error', event.error)
        setIsRecording(false)
      }

      recognition.onend = () => {
        setIsRecording(false)
        if (finalTranscriptRef.current.trim()) {
          onSend?.()
        }
      }

      recognitionRef.current = recognition

      return () => {
        recognition.stop()
      }
    }, [onSend, onValueChange, lang])

    const handleMicClick = () => {
      const recognition = recognitionRef.current

      if (!recognition) return

      if (isRecording) {
        recognition.stop()
      } else {
        recognition.start()
      }
      setIsRecording(!isRecording)
    }

    const handlePromptChange = (value: string) => {
      setPrompt(value)
      if (onValueChange) {
        onValueChange(value)
      }
    }

    const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault()
        onSend?.()
      }
      onKeyDown?.(event)
    }

    const handleFileSelection = (files: FileList | null) => {
      if (!files) return

      const fileArray = Array.from(files)
      const newFiles = [...selectedFiles, ...fileArray]

      setSelectedFiles(newFiles)
      onFilesChange?.(newFiles)
    }

    const handleFileInputChange = (
      event: React.ChangeEvent<HTMLInputElement>,
    ) => {
      handleFileSelection(event.target.files)
      event.target.value = ''
    }

    const handlePaperclipClick = () => {
      fileInputRef.current?.click()
    }

    const handleRemoveFile = (index: number) => {
      const newFiles = selectedFiles.filter((_, i) => i !== index)

      setSelectedFiles(newFiles)
      onFilesChange?.(newFiles)
    }

    const handleDragOver = (event: React.DragEvent) => {
      event.preventDefault()
      setIsDragOver(true)
    }

    const handleDragLeave = (event: React.DragEvent) => {
      event.preventDefault()
      setIsDragOver(false)
    }

    const handleDrop = (event: React.DragEvent) => {
      event.preventDefault()
      setIsDragOver(false)
      handleFileSelection(event.dataTransfer.files)
    }

    const handleFocus = (e: React.FocusEvent<HTMLTextAreaElement>) => {
      setIsFocused(true)
      onFocus?.(e)
    }

    const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
      setIsFocused(false)
      onBlur?.(e)
    }

    return (
      <div
        className={cn(
          'w-full max-w-4xl mx-auto relative p-[3px]',
          isDragOver && 'ring-2 ring-primary ring-offset-2 rounded-lg',
          isFocused && 'animate-gradient-border',
          className,
        )}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <div className="relative rounded-lg">
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            multiple
            accept="*/*"
            className="hidden"
            type="file"
            onChange={handleFileInputChange}
          />

          {/* Selected files display */}
          {selectedFiles.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2 p-2">
              {selectedFiles.map((file, index) => (
                <Chip
                  key={index}
                  variant="flat"
                  onClose={() => handleRemoveFile(index)}
                >
                  <span
                    className="text-xs flex flex-row items-center gap-1 max-w-64 pr-16 overflow-hidden"
                    title={file.name}
                  >
                    <Icon
                      className="w-4"
                      name={getFileIcon(file.type) as any}
                    />
                    <span className="whitespace-nowrap overflow-hidden text-ellipsis">
                      {file.name.substring(0, 48)}
                    </span>
                    <span className="absolute right-2 bg-content2 pl-2 pr-4">
                      ({formatFileSize(file.size)})
                    </span>
                  </span>
                </Chip>
              ))}
            </div>
          )}

          <Textarea
            ref={ref}
            className="pb-20 bg-content2 rounded-lg"
            classNames={{
              input: 'p-1',
              inputWrapper: 'shadow-none -mb-20 pb-12',
            }}
            maxRows={7}
            minRows={3}
            placeholder={
              isDragOver ? t('Drop files here…') : t('Need something done?')
            }
            size="lg"
            value={prompt}
            onBlur={handleBlur as any}
            onFocus={handleFocus as any}
            onKeyDown={handleKeyDown as any}
            onValueChange={handlePromptChange}
            {...props}
          />

          <div className="absolute z-10 bottom-0 inset-x-px p-2 rounded-b-lg">
            <div className="flex flex-wrap justify-between items-end gap-2">
              <div className="flex items-center gap-2">
                {/*
                <Tooltip content={t('More actions')} placement="bottom">
                  <Button disabled isIconOnly radius="full" variant="light">
                    <Icon name="MoreHoriz" />
                  </Button>
                </Tooltip>
                */}

                <Tooltip
                  content={t('Attach a file or image')}
                  placement="bottom"
                >
                  <Button
                    isIconOnly
                    radius="full"
                    variant="light"
                    size="sm"
                    onPress={handlePaperclipClick}
                  >
                    <Icon name="Attachment" size="sm" />
                  </Button>
                </Tooltip>

                <Dropdown>
                  <DropdownTrigger>
                    <Button radius="full" variant="light" size="sm">
                      <Icon name={currentAgent.icon ?? 'User'} size="md" />
                      {currentAgent.i18n?.[lang]?.name ?? currentAgent.name}
                    </Button>
                  </DropdownTrigger>
                  <AgentPicker
                    selectedAgent={currentAgent}
                    onAgentChange={onAgentChange}
                  />
                </Dropdown>
              </div>

              <div className="flex items-center gap-2">
                {(!prompt.trim() || isRecording) && (
                  <Tooltip content={t('Use microphone')} placement="bottom">
                    <Button
                      isIconOnly
                      color={isRecording ? 'primary' : 'default'}
                      isDisabled={!isSpeechRecognitionSupported}
                      radius="full"
                      variant={isRecording ? 'solid' : 'light'}
                      size="sm"
                      onPress={handleMicClick}
                    >
                      {isRecording ? (
                        <Icon name="MicrophoneSpeaking" size="sm" />
                      ) : (
                        <Icon name="Microphone" size="sm" />
                      )}
                    </Button>
                  </Tooltip>
                )}

                {prompt.trim() && (
                  <Tooltip content={t('Send prompt')} placement="bottom">
                    <Button
                      isIconOnly
                      disabled={props.isSending}
                      color={!prompt.trim() ? 'default' : 'primary'}
                      radius="full"
                      variant="solid"
                      size="sm"
                      isLoading={props.isSending}
                      onPress={onSend}
                    >
                      <Icon name="ArrowRight" size="sm" />
                    </Button>
                  </Tooltip>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  },
)
