import {
  Button,
  ButtonGroup,
  Chip,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
  Textarea,
  type TextAreaProps,
  Tooltip,
} from '@heroui/react'
import {
  forwardRef,
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from 'react'

import { Icon } from '../Icon'
import { useSpeechRecognition } from './useSpeechRecognition'
import { useUrlFragment } from './useUrlFragment'
import { ModelSelector } from './ModelSelector'
import { AgentSelector } from './AgentSelector'
import { AttachmentSelector } from './AttachmentSelector'

import { useI18n } from '@/i18n'
import { type LanguageCode } from '@/i18n/locales'
import { cn, getFileIcon } from '@/lib/utils'
import { type Agent, type KnowledgeItem } from '@/types'
import { getDefaultAgent } from '@/stores/agentStore'
import { isLandscape, isMobileDevice, isSmallHeight } from '@/lib/device'
import { formatBytes } from '@/lib/format'

interface PromptAreaProps
  extends Omit<TextAreaProps, 'onFocus' | 'onBlur' | 'onKeyDown'> {
  lang: LanguageCode
  onSubmitToAgent?: () => void
  onSubmitTask?: () => void
  isSending?: boolean
  onFilesChange?: (files: File[]) => void
  defaultPrompt?: string
  onAgentChange?: (agent: Agent | null) => void
  disabledAgentPicker?: boolean
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
      onSubmitToAgent,
      onSubmitTask,
      onValueChange,
      onFilesChange,
      defaultPrompt = '',
      onAgentChange,
      disabledAgentPicker,
      selectedAgent,
      onFocus,
      onBlur,
      onKeyDown,
      ...props
    },
    ref,
  ) {
    const { t } = useI18n(lang as any)

    const [prompt, setPrompt] = useState(defaultPrompt)
    const [selectedFiles, setSelectedFiles] = useState<File[]>([])
    const [isDragOver, setIsDragOver] = useState(false)
    const [isFocused, setIsFocused] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Parse URL fragment for prompt parameter
    const { prompt: urlPrompt } = useUrlFragment()

    // Set default agent if none selected
    const currentAgent = selectedAgent || getDefaultAgent()

    useEffect(() => {
      setPrompt(defaultPrompt)
    }, [defaultPrompt])

    // Set default agent in useEffect to avoid setState during render
    useEffect(() => {
      if (!selectedAgent && onAgentChange) {
        onAgentChange(getDefaultAgent())
      }
    }, [selectedAgent, onAgentChange])

    // Populate prompt from URL fragment
    useEffect(() => {
      if (urlPrompt && !prompt) {
        setPrompt(urlPrompt)
        onValueChange?.(urlPrompt)

        // Clear the URL fragment after loading
        if (window.location.hash) {
          window.history.replaceState(
            null,
            '',
            window.location.pathname + window.location.search,
          )
        }
      }
    }, [urlPrompt, prompt, onValueChange])

    // Speech recognition hook
    const {
      isRecording,
      isSupported: isSpeechRecognitionSupported,
      toggleRecording,
    } = useSpeechRecognition({
      lang,
      onTranscript: (transcript) => {
        setPrompt(transcript)
        onValueChange?.(transcript)
      },
      onFinalTranscript: () => {
        onSubmitToAgent?.()
      },
    })

    const handlePromptChange = useCallback(
      (value: string) => {
        setPrompt(value)
        if (onValueChange) {
          onValueChange(value)
        }
      },
      [onValueChange],
    )

    const handleKeyDown = useCallback(
      (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (event.key === 'Enter' && !event.shiftKey) {
          event.preventDefault()
          onSubmitToAgent?.()
        }
        onKeyDown?.(event)
      },
      [onSubmitToAgent, onKeyDown],
    )

    const handleFileSelection = useCallback(
      (files: FileList | null) => {
        if (!files) return

        const fileArray = Array.from(files)
        const newFiles = [...selectedFiles, ...fileArray]

        setSelectedFiles(newFiles)
        onFilesChange?.(newFiles)
      },
      [selectedFiles, onFilesChange],
    )

    const handleFileInputChange = useCallback(
      (event: React.ChangeEvent<HTMLInputElement>) => {
        handleFileSelection(event.target.files)
        event.target.value = ''
      },
      [handleFileSelection],
    )

    const handlePaperclipClick = useCallback(() => {
      fileInputRef.current?.click()
    }, [])

    const handleRemoveFile = useCallback(
      (index: number) => {
        const newFiles = selectedFiles.filter((_, i) => i !== index)

        setSelectedFiles(newFiles)
        onFilesChange?.(newFiles)
      },
      [selectedFiles, onFilesChange],
    )

    const handleKnowledgeFileSelect = useCallback(
      async (item: KnowledgeItem) => {
        // Convert KnowledgeItem to File for consistency
        try {
          let fileData: BlobPart
          let mimeType = item.mimeType || 'application/octet-stream'

          if (item.content?.startsWith('data:')) {
            // Handle data URLs (for images and binary files)
            const response = await fetch(item.content)
            fileData = await response.blob()
            // Extract mime type from data URL if available
            const dataUrlMatch = item.content.match(/^data:([^;]+)/)
            if (dataUrlMatch) {
              mimeType = dataUrlMatch[1]
            }
          } else {
            // Handle text content
            fileData = new Blob([item.content || ''], { type: mimeType })
          }

          const file = new File([fileData], item.name, {
            type: mimeType,
            lastModified: new Date(item.lastModified).getTime(),
          })

          const newFiles = [...selectedFiles, file]
          setSelectedFiles(newFiles)
          onFilesChange?.(newFiles)
        } catch (error) {
          console.error('Error converting knowledge item to file:', error)
        }
      },
      [selectedFiles, onFilesChange],
    )

    const handleDragEnter = useCallback((event: React.DragEvent) => {
      event.preventDefault()
      event.stopPropagation() // Prevent background drag handlers from interfering
      setIsDragOver(true)
    }, [])

    const handleDragOver = useCallback((event: React.DragEvent) => {
      event.preventDefault()
      event.stopPropagation() // Prevent background drag handlers from interfering
    }, [])

    const handleDragLeave = useCallback((event: React.DragEvent) => {
      event.preventDefault()
      event.stopPropagation() // Prevent background drag handlers from interfering
      setIsDragOver(false)
    }, [])

    const handleDrop = useCallback(
      (event: React.DragEvent) => {
        event.preventDefault()
        event.stopPropagation() // Prevent background drag handlers from interfering
        setIsDragOver(false)
        handleFileSelection(event.dataTransfer.files)
      },
      [handleFileSelection],
    )

    const handleFocus = useCallback(
      (e: React.FocusEvent<HTMLTextAreaElement>) => {
        setIsFocused(true)
        onFocus?.(e)
      },
      [onFocus],
    )

    const handleBlur = useCallback(
      (e: React.FocusEvent<HTMLTextAreaElement>) => {
        setIsFocused(false)
        onBlur?.(e)
      },
      [onBlur],
    )

    const canSubmit = useMemo(
      () => prompt.trim().length > 0 && !isRecording,
      [prompt, isRecording],
    )

    return (
      <div
        data-testid="prompt-area"
        className={cn(
          'w-full max-w-4xl mx-auto relative p-[3px] prompt-area',
          isDragOver && 'ring-2 ring-primary ring-offset-2 rounded-lg',
          isFocused && 'animate-gradient-border',
          className,
        )}
        onDragEnter={handleDragEnter}
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

          <Textarea
            ref={ref}
            data-testid="prompt-input"
            className="pb-20 bg-content2 rounded-lg"
            classNames={{
              input: 'p-1',
              inputWrapper: `shadow-none -mb-20 pb-12 ${selectedFiles.length ? 'pb-20' : ''} bg-default-200`,
            }}
            maxRows={7}
            minRows={
              isMobileDevice() && isLandscape() && isSmallHeight() ? 1 : 3
            }
            placeholder={
              isDragOver ? t('Drop files here…') : t('Need something done?')
            }
            size="lg"
            value={prompt}
            onBlur={handleBlur as any}
            onFocus={handleFocus as any}
            onKeyDown={handleKeyDown as any}
            onValueChange={handlePromptChange}
            endContent={
              // Selected files display
              selectedFiles.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-2 p-2 absolute left-0 bottom-8">
                  {selectedFiles.map((file, index) => (
                    <Chip
                      key={index}
                      variant="bordered"
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
                        <span className="absolute right-2 pl-2 pr-4">
                          ({formatBytes(file.size, lang)})
                        </span>
                      </span>
                    </Chip>
                  ))}
                </div>
              )
            }
            {...props}
          />

          <div className="absolute z-10 bottom-0 inset-x-px p-2 rounded-b-lg">
            <div className="flex flex-wrap justify-between items-end gap-2">
              <div className="flex items-center gap-2">
                <AttachmentSelector
                  lang={lang}
                  onFileUpload={handlePaperclipClick}
                  onKnowledgeFileSelect={handleKnowledgeFileSelect}
                />

                <AgentSelector
                  lang={lang}
                  disabled={disabledAgentPicker}
                  selectedAgent={currentAgent}
                  onAgentChange={onAgentChange}
                />

                <ModelSelector lang={lang} />
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
                      onPress={toggleRecording}
                    >
                      {isRecording ? (
                        <Icon name="MicrophoneSpeaking" size="sm" />
                      ) : (
                        <Icon name="Microphone" size="sm" />
                      )}
                    </Button>
                  </Tooltip>
                )}

                {canSubmit && (
                  <ButtonGroup variant="flat">
                    <Tooltip content={t('Send prompt')} placement="bottom">
                      <Button
                        data-testid="submit-button"
                        isIconOnly
                        disabled={props.isSending}
                        color={!prompt.trim() ? 'default' : 'primary'}
                        radius="full"
                        variant="solid"
                        size="sm"
                        isLoading={props.isSending}
                        onPress={onSubmitToAgent}
                      >
                        <Icon name="ArrowRight" size="sm" />
                      </Button>
                    </Tooltip>
                    <Dropdown placement="bottom-end">
                      <DropdownTrigger>
                        <Button
                          isIconOnly
                          size="sm"
                          variant="light"
                          className="w-full"
                          aria-label={t('Chat')}
                        >
                          <Icon name="MoreVert" size="sm" />
                        </Button>
                      </DropdownTrigger>
                      <DropdownMenu aria-label="Submit options">
                        <DropdownItem
                          key="task"
                          color="secondary"
                          variant="flat"
                          startContent={
                            <Icon
                              name="TriangleFlagTwoStripes"
                              size="sm"
                              color="secondary"
                            />
                          }
                          description={t('New Task')}
                          onPress={onSubmitTask}
                        />
                      </DropdownMenu>
                    </Dropdown>
                  </ButtonGroup>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  },
)
