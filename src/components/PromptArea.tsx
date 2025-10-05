import {
  Button,
  Chip,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Textarea,
  type TextAreaProps,
  Tooltip,
  Image,
} from '@heroui/react'
import {
  forwardRef,
  useEffect,
  useRef,
  useState,
  useMemo,
  useCallback,
} from 'react'

import { AgentPicker } from './AgentPicker'
import { Icon } from './Icon'

import { type Lang, useTranslations } from '@/i18n'
import { cn, getFileIcon } from '@/lib/utils'
import { type Agent, type KnowledgeItem, type Credential } from '@/types'
import { type IconName } from '@/lib/types'
import { getDefaultAgent } from '@/stores/agentStore'
import { db } from '@/lib/db'
import { isLandscape, isMobileDevice, isSmallHeight } from '@/lib/device'
import { formatBytes } from '@/lib/format'
import { useLLMModelStore } from '@/stores/llmModelStore'

interface PromptAreaProps
  extends Omit<TextAreaProps, 'onFocus' | 'onBlur' | 'onKeyDown'> {
  lang: Lang
  onSend?: () => void
  isSending?: boolean
  onFilesChange?: (files: File[]) => void
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
      onSend,
      onValueChange,
      onFilesChange,
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
    const [prompt, setPrompt] = useState('')
    const [isRecording, setIsRecording] = useState(false)
    const [isSpeechRecognitionSupported, setIsSpeechRecognitionSupported] =
      useState(false)
    const [selectedFiles, setSelectedFiles] = useState<File[]>([])
    const [isDragOver, setIsDragOver] = useState(false)
    const [isFocused, setIsFocused] = useState(false)
    const [knowledgeItems, setKnowledgeItems] = useState<KnowledgeItem[]>([])
    const [loadingKnowledge, setLoadingKnowledge] = useState(false)
    const [credentials, setCredentials] = useState<Credential[]>([])
    const recognitionRef = useRef<SpeechRecognition | null>(null)
    const finalTranscriptRef = useRef('')
    const fileInputRef = useRef<HTMLInputElement>(null)

    const t = useTranslations(lang)

    // LLM model store
    const {
      selectedCredentialId,
      setSelectedCredentialId,
      getSelectedCredential,
    } = useLLMModelStore()
    const selectedCredential = getSelectedCredential(credentials)

    // Provider icon mapping
    const PROVIDER_ICONS: Record<string, IconName> = {
      local: 'OpenInBrowser',
      ollama: 'Ollama',
      openai: 'OpenAI',
      anthropic: 'Anthropic',
      google: 'Google',
      'vertex-ai': 'GoogleCloud',
      mistral: 'MistralAI',
      openrouter: 'OpenRouter',
      deepseek: 'DeepSeek',
      grok: 'X',
      huggingface: 'HuggingFace',
      custom: 'Server',
    }

    // Set default agent if none selected
    const currentAgent = selectedAgent || getDefaultAgent()

    // Set default agent in useEffect to avoid setState during render
    useEffect(() => {
      if (!selectedAgent && onAgentChange) {
        onAgentChange(getDefaultAgent())
      }
    }, [selectedAgent, onAgentChange])

    // Load knowledge items on demand
    const loadKnowledgeItems = useCallback(async () => {
      setLoadingKnowledge(true)
      try {
        if (!db.isInitialized()) {
          await db.init()
        }

        if (!db.hasStore('knowledgeItems')) {
          setKnowledgeItems([])
          return
        }

        const items = await db.getAll('knowledgeItems')
        // Only show files, not folders
        const fileItems = items.filter((item) => item.type === 'file')
        // Sort by most recently modified
        fileItems.sort(
          (a, b) =>
            new Date(b.lastModified).getTime() -
            new Date(a.lastModified).getTime(),
        )
        setKnowledgeItems(fileItems.slice(0, 20)) // Limit to 20 items for performance
      } catch (error) {
        console.error('Error loading knowledge items:', error)
        setKnowledgeItems([])
      } finally {
        setLoadingKnowledge(false)
      }
    }, [])

    // Load credentials
    const loadCredentials = useCallback(async () => {
      try {
        if (!db.isInitialized()) {
          await db.init()
        }

        if (!db.hasStore('credentials')) {
          setCredentials([])
          return
        }

        const creds = await db.getAll('credentials')
        // Sort by order
        const sortedCreds = creds.sort((a, b) => {
          if (a.order === undefined && b.order === undefined) return 0
          if (a.order === undefined) return 1
          if (b.order === undefined) return -1
          return a.order - b.order
        })
        setCredentials(sortedCreds)
      } catch (error) {
        console.error('Error loading credentials:', error)
        setCredentials([])
      }
    }, [])

    // Load credentials on mount
    useEffect(() => {
      loadCredentials()
    }, [loadCredentials])

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

    const handleMicClick = useCallback(() => {
      const recognition = recognitionRef.current

      if (!recognition) return

      if (isRecording) {
        recognition.stop()
      } else {
        recognition.start()
      }
      setIsRecording(!isRecording)
    }, [isRecording])

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
          onSend?.()
        }
        onKeyDown?.(event)
      },
      [onSend, onKeyDown],
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

    const renderKnowledgePreview = useCallback((item: KnowledgeItem) => {
      if (
        item.fileType === 'image' &&
        item.content?.startsWith('data:image/')
      ) {
        return (
          <Image
            src={item.content}
            alt={item.name}
            className="w-6 h-6 rounded object-cover"
            loading="lazy"
          />
        )
      }

      return <Icon name={getFileIcon(item.mimeType || '') as any} size="sm" />
    }, [])

    const getDropdownItems = useMemo(() => {
      const items = [
        <DropdownItem
          key="upload"
          startContent={<Icon name="Upload" size="sm" />}
        >
          {t('Upload new file')}
        </DropdownItem>,
        <DropdownItem
          key="knowledge"
          startContent={<Icon name="Database" size="sm" />}
          onPress={loadKnowledgeItems}
        >
          {t('Choose from knowledge base')}
        </DropdownItem>,
      ]

      if (loadingKnowledge) {
        items.push(
          <DropdownItem key="loading" isDisabled>
            <div className="flex items-center gap-2 pl-4">
              <Icon name="Settings" className="animate-spin" size="sm" />
              Loading knowledge base...
            </div>
          </DropdownItem>,
        )
      } else if (knowledgeItems.length === 0) {
        items.push(
          <DropdownItem key="empty" isDisabled>
            <div className="flex items-center gap-2 text-default-500 pl-4">
              <Icon name="Folder" size="sm" />
              No files in knowledge base
            </div>
          </DropdownItem>,
        )
      } else {
        knowledgeItems.slice(0, 10).forEach((item) => {
          items.push(
            <DropdownItem
              key={`knowledge-${item.id}`}
              startContent={
                <div className="pl-4">{renderKnowledgePreview(item)}</div>
              }
              endContent={
                <Chip size="sm" variant="flat" className="text-xs">
                  {formatBytes(item.size || 0, lang)}
                </Chip>
              }
              description={
                <div className="text-xs text-default-500 truncate max-w-32">
                  {item.path.replace(/^\//, '')}
                </div>
              }
              textValue={item.name}
              className="py-1"
            >
              <div className="font-medium truncate max-w-32">{item.name}</div>
            </DropdownItem>,
          )
        })
      }

      return items
    }, [
      t,
      loadingKnowledge,
      knowledgeItems,
      loadKnowledgeItems,
      renderKnowledgePreview,
    ])

    const displayModelName = useCallback(
      (model: string | undefined): string => {
        if (!model) return ''

        // Handle common model name patterns and make them more readable
        // Remove provider prefixes and common separators
        return (
          model
            .replace(/.*\//, '') // Remove everything before last slash
            .replace(/[_-]+/g, ' ') // Replace underscores and hyphens with space
            .replace(/\s+/g, ' ') // Collapse multiple spaces
            // .replace(
            //   /(?!\w)(?<version>([\s\.]\d{1,2})+)(?!\w)/,
            //   (_, p) => ' ' + p.trim().replace(/\s/g, `.`),
            // ) // Standardize version notation
            .replace(
              /(\d{4})(\d{2})(\d{2})(?!\w)/,
              (match, p1, p2, p3) =>
                `(${new Date(p1, p2, p3).toLocaleDateString(lang)})`,
            ) // Format dates like 20240115 to 2024-01-15
            // .replace(/[-_]/g, '-')
            .trim()
        )
      },
      [],
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
                      ({formatBytes(file.size, lang)})
                    </span>
                  </span>
                </Chip>
              ))}
            </div>
          )}

          <Textarea
            ref={ref}
            data-testid="prompt-input"
            className="pb-20 bg-content2 rounded-lg"
            classNames={{
              input: 'p-1',
              inputWrapper: 'shadow-none -mb-20 pb-12 bg-default-200',
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

                <Dropdown className="bg-white dark:bg-default-50 dark:text-white">
                  <DropdownTrigger>
                    <Button isIconOnly radius="full" variant="light" size="sm">
                      <Icon name="Attachment" size="sm" />
                    </Button>
                  </DropdownTrigger>
                  <DropdownMenu
                    aria-label="File attachment options"
                    onAction={(key) => {
                      if (key === 'upload') {
                        handlePaperclipClick()
                      } else if (
                        typeof key === 'string' &&
                        key.startsWith('knowledge-')
                      ) {
                        const itemId = key.replace('knowledge-', '')
                        const item = knowledgeItems.find(
                          (item) => item.id === itemId,
                        )
                        if (item) {
                          handleKnowledgeFileSelect(item)
                        }
                      }
                    }}
                  >
                    {getDropdownItems}
                  </DropdownMenu>
                </Dropdown>

                <Dropdown
                  className="bg-white dark:bg-default-50 dark:text-white"
                  isDisabled={disabledAgentPicker}
                >
                  <DropdownTrigger>
                    <Button
                      data-testid="agent-picker"
                      radius="full"
                      variant="light"
                      size="sm"
                    >
                      <Icon name={currentAgent.icon ?? 'User'} size="md" />
                      {currentAgent.i18n?.[lang]?.name ?? currentAgent.name}
                    </Button>
                  </DropdownTrigger>
                  <AgentPicker
                    disabled={disabledAgentPicker}
                    selectedAgent={currentAgent}
                    onAgentChange={onAgentChange}
                  />
                </Dropdown>

                {/* LLM Model Selector */}
                {credentials.length > 0 && (
                  <Dropdown className="bg-white dark:bg-default-50 dark:text-white">
                    <DropdownTrigger>
                      {/* <Tooltip content={t('Collapse sidebar')}> */}
                      <Button
                        radius="full"
                        variant="light"
                        size="sm"
                        startContent={
                          <Icon
                            name={
                              PROVIDER_ICONS[
                                selectedCredential?.provider || 'custom'
                              ]
                            }
                            size="sm"
                          />
                        }
                      >
                        <span className="text-xs truncate max-w-48">
                          {displayModelName(selectedCredential?.model) ||
                            t('Select Model')}
                        </span>
                      </Button>
                      {/* </Tooltip> */}
                    </DropdownTrigger>
                    <DropdownMenu
                      aria-label="LLM Model selection"
                      selectedKeys={
                        selectedCredentialId ? [selectedCredentialId] : []
                      }
                      onAction={(key) => setSelectedCredentialId(key as string)}
                    >
                      {credentials.map((cred) => (
                        <DropdownItem
                          key={cred.id}
                          startContent={
                            <Icon
                              name={PROVIDER_ICONS[cred.provider]}
                              size="sm"
                            />
                          }
                          description={cred.provider}
                          textValue={cred.model || cred.provider}
                        >
                          {displayModelName(cred.model) || cred.provider}
                        </DropdownItem>
                      ))}
                    </DropdownMenu>
                  </Dropdown>
                )}
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
                      data-testid="submit-button"
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
