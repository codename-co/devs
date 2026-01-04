import {
  Button,
  ButtonGroup,
  Chip,
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
import { AgentMentionPopover } from './AgentMentionPopover'
import { useAgentMention } from './useAgentMention'
import { MethodologyMentionPopover } from './MethodologyMentionPopover'
import { useMethodologyMention } from './useMethodologyMention'

import { useI18n } from '@/i18n'
import { type LanguageCode } from '@/i18n/locales'
import { cn, getFileIcon } from '@/lib/utils'
import { type Agent, type KnowledgeItem } from '@/types'
import type { Methodology } from '@/types/methodology.types'
import { getDefaultAgent } from '@/stores/agentStore'
import {
  isLandscape,
  isMobileDevice,
  isSmallHeight,
  isSmallWidth,
} from '@/lib/device'
import { formatBytes } from '@/lib/format'
import { userSettings } from '@/stores/userStore'

interface PromptAreaProps
  extends Omit<TextAreaProps, 'onFocus' | 'onBlur' | 'onKeyDown'> {
  lang: LanguageCode
  onSubmitToAgent?: (
    cleanedPrompt?: string,
    mentionedAgent?: Agent,
    mentionedMethodology?: Methodology,
  ) => void
  onSubmitTask?: (
    cleanedPrompt?: string,
    mentionedAgent?: Agent,
    mentionedMethodology?: Methodology,
  ) => void
  isSending?: boolean
  onFilesChange?: (files: File[]) => void
  defaultPrompt?: string
  onAgentChange?: (agent: Agent | null) => void
  onMethodologyChange?: (methodology: Methodology | null) => void
  disabledAgentPicker?: boolean
  disabledMention?: boolean
  selectedAgent?: Agent | null
  selectedMethodology?: Methodology | null
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
      onMethodologyChange,
      disabledAgentPicker,
      disabledMention,
      selectedAgent,
      selectedMethodology,
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
    const speechToTextEnabled = userSettings(
      (state) => state.speechToTextEnabled,
    )

    // Parse URL fragment for prompt parameter
    const { prompt: urlPrompt } = useUrlFragment()

    // Set default agent if none selected
    const currentAgent = selectedAgent || getDefaultAgent()

    // Define handlePromptChange before useAgentMention to avoid circular dependency
    const handlePromptChange = useCallback(
      (value: string) => {
        setPrompt(value)
        if (onValueChange) {
          onValueChange(value)
        }
      },
      [onValueChange],
    )

    // Agent mention hook for @ autocomplete
    const {
      showMentionPopover: showAgentMentionPopover,
      filteredAgents,
      selectedIndex: agentSelectedIndex,
      handleMentionSelect: handleAgentMentionSelect,
      handleKeyNavigation: handleAgentKeyNavigation,
      closeMentionPopover: closeAgentMentionPopover,
      extractMentionedAgents,
      removeMentionsFromPrompt: removeAgentMentionsFromPrompt,
    } = useAgentMention({
      lang,
      prompt,
      onPromptChange: handlePromptChange,
    })

    // Methodology mention hook for # autocomplete
    const {
      showMentionPopover: showMethodologyMentionPopover,
      filteredMethodologies,
      selectedIndex: methodologySelectedIndex,
      handleMentionSelect: handleMethodologyMentionSelect,
      handleKeyNavigation: handleMethodologyKeyNavigation,
      closeMentionPopover: closeMethodologyMentionPopover,
      extractMentionedMethodologies,
      removeMentionsFromPrompt: removeMethodologyMentionsFromPrompt,
    } = useMethodologyMention({
      lang,
      prompt,
      onPromptChange: handlePromptChange,
    })

    useEffect(() => {
      setPrompt(defaultPrompt)
      onValueChange?.(defaultPrompt)
    }, [defaultPrompt, onValueChange])

    // Sync internal state with controlled value prop
    useEffect(() => {
      if (props.value !== undefined && props.value !== prompt) {
        setPrompt(props.value as string)
      }
    }, [props.value])

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

    // Handle submission with @mention and #mention processing
    const handleSubmitWithMentions = useCallback(
      (
        submitFn?: (
          cleanedPrompt?: string,
          mentionedAgent?: Agent,
          mentionedMethodology?: Methodology,
        ) => void,
      ) => {
        if (!submitFn) return

        // Extract mentioned agents
        const mentionedAgents = extractMentionedAgents()

        // If exactly one agent is mentioned, auto-select it
        const mentionedAgent =
          mentionedAgents.length === 1 ? mentionedAgents[0] : undefined
        if (mentionedAgent) {
          onAgentChange?.(mentionedAgent)
        }

        // Extract mentioned methodologies
        const mentionedMethodologies = extractMentionedMethodologies()

        // If exactly one methodology is mentioned, auto-select it
        const mentionedMethodology =
          mentionedMethodologies.length === 1
            ? mentionedMethodologies[0]
            : undefined
        if (mentionedMethodology) {
          onMethodologyChange?.(mentionedMethodology)
        }

        // Remove @mentions and #mentions from the prompt before submission
        let cleanedPrompt = removeAgentMentionsFromPrompt(prompt)
        cleanedPrompt = removeMethodologyMentionsFromPrompt(cleanedPrompt)

        // Update local state (for UI consistency)
        if (cleanedPrompt !== prompt) {
          setPrompt(cleanedPrompt)
          onValueChange?.(cleanedPrompt)
        }

        // Close mention popovers if open
        closeAgentMentionPopover()
        closeMethodologyMentionPopover()

        // Pass the cleaned prompt and mentioned agent/methodology directly to the submit function
        submitFn(cleanedPrompt, mentionedAgent, mentionedMethodology)
      },
      [
        prompt,
        extractMentionedAgents,
        extractMentionedMethodologies,
        removeAgentMentionsFromPrompt,
        removeMethodologyMentionsFromPrompt,
        onAgentChange,
        onMethodologyChange,
        onValueChange,
        closeAgentMentionPopover,
        closeMethodologyMentionPopover,
      ],
    )

    const handleKeyDown = useCallback(
      (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
        // Handle agent mention popover keyboard navigation first
        if (handleAgentKeyNavigation(event)) {
          return
        }

        // Handle methodology mention popover keyboard navigation
        if (handleMethodologyKeyNavigation(event)) {
          return
        }

        if (event.key === 'Enter' && !event.shiftKey) {
          event.preventDefault()
          handleSubmitWithMentions(onSubmitToAgent)
        }
        onKeyDown?.(event)
      },
      [
        handleAgentKeyNavigation,
        handleMethodologyKeyNavigation,
        handleSubmitWithMentions,
        onSubmitToAgent,
        onKeyDown,
      ],
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
        id="prompt-area"
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
          {/* Agent mention autocomplete popover */}
          {!disabledMention && showAgentMentionPopover && (
            <AgentMentionPopover
              lang={lang}
              agents={filteredAgents}
              selectedIndex={agentSelectedIndex}
              onSelect={handleAgentMentionSelect}
              onClose={closeAgentMentionPopover}
            />
          )}

          {/* Methodology mention autocomplete popover */}
          {!disabledMention && showMethodologyMentionPopover && (
            <MethodologyMentionPopover
              lang={lang}
              methodologies={filteredMethodologies}
              selectedIndex={methodologySelectedIndex}
              onSelect={handleMethodologyMentionSelect}
              onClose={closeMethodologyMentionPopover}
            />
          )}

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
              inputWrapper: `shadow-none -mb-20 pb-12 ${selectedFiles.length ? 'pb-20' : ''} bg-default-200 !ring-0 !ring-offset-0`,
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
                <div className="mb-2 flex flex-wrap gap-2 p-2 absolute start-0 bottom-8">
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
                        <span className="absolute end-2 pl-2 pr-4">
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

          <div className="absolute z-10 bottom-0 inset-x-px p-1 sm:p-2 rounded-b-lg">
            <div className="flex flex-wrap justify-between items-end gap-1">
              <div className="flex items-center gap-1">
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
              </div>

              <div className="flex items-center gap-2">
                <ModelSelector lang={lang} />

                {speechToTextEnabled && (!prompt.trim() || isRecording) && (
                  <Tooltip
                    content={t('Speak to microphone')}
                    placement="bottom"
                  >
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

                <ButtonGroup variant="flat">
                  {selectedAgent?.id === 'devs' && onSubmitTask && (
                    <Tooltip content={t('Send prompt')} placement="bottom">
                      <Button
                        data-testid="submit-button"
                        isIconOnly={isSmallWidth()}
                        disabled={props.isSending}
                        color={!prompt.trim() ? 'default' : 'primary'}
                        className={cn(
                          'rtl:rotate-180',
                          canSubmit && 'dark:bg-white dark:text-black',
                        )}
                        radius="md"
                        variant="solid"
                        size="sm"
                        isDisabled={!canSubmit}
                        isLoading={props.isSending}
                        onPress={() => handleSubmitWithMentions(onSubmitTask)}
                      >
                        <Icon name="ArrowRight" size="sm" />
                      </Button>
                    </Tooltip>
                  )}

                  {selectedAgent?.id !== 'devs' && onSubmitToAgent && (
                    <Tooltip content={t('Send prompt')} placement="bottom">
                      <Button
                        type="submit"
                        data-testid="submit-agent-button"
                        isIconOnly={isSmallWidth()}
                        disabled={props.isSending}
                        color={!prompt.trim() ? 'default' : 'primary'}
                        className={cn(
                          'rtl:rotate-180',
                          canSubmit && 'dark:bg-white dark:text-black',
                        )}
                        radius="md"
                        variant="solid"
                        size="sm"
                        isDisabled={!canSubmit}
                        isLoading={props.isSending}
                        onPress={() =>
                          handleSubmitWithMentions(onSubmitToAgent)
                        }
                      >
                        <Icon name="ArrowRight" size="sm" />
                      </Button>
                    </Tooltip>
                  )}
                </ButtonGroup>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  },
)
