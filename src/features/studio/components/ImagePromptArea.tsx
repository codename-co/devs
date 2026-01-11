/**
 * ImagePromptArea Component
 *
 * Specialized prompt area for image generation, forked from the main PromptArea
 * but optimized for image generation workflows with preset integration.
 */

import {
  Button,
  ButtonGroup,
  Textarea,
  type TextAreaProps,
  Tooltip,
  Spinner,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  DropdownSection,
} from '@heroui/react'
import {
  forwardRef,
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from 'react'

import { Icon } from '@/components/Icon'
import { type Lang, useI18n } from '@/i18n'
import { cn } from '@/lib/utils'
import {
  isLandscape,
  isMobileDevice,
  isSmallHeight,
  isSmallWidth,
} from '@/lib/device'
import {
  ImageGenerationSettings,
  ImagePreset,
  ImageProvider,
  ImageModel,
  IMAGE_MODELS_BY_PROVIDER,
} from '../types'

interface ImagePromptAreaProps
  extends Omit<TextAreaProps, 'onFocus' | 'onBlur' | 'onKeyDown'> {
  lang: Lang
  /** Callback when user submits for generation */
  onGenerate?: (prompt: string) => void
  /** Whether generation is in progress */
  isGenerating?: boolean
  /** Generation progress (0-100) */
  progress?: number
  /** Current settings for display */
  settings?: ImageGenerationSettings
  /** Active preset for display */
  activePreset?: ImagePreset | null
  /** Callback to open settings panel */
  onOpenSettings?: () => void
  /** Callback to open preset selector */
  onOpenPresets?: () => void
  /** Reference image file */
  referenceImage?: File | null
  /** Callback when reference image changes */
  onReferenceImageChange?: (file: File | null) => void
  /** Placeholder text override */
  placeholder?: string
  /** Current provider */
  provider?: ImageProvider | null
  /** Current model */
  model?: ImageModel | null
  /** Available providers (from credentials) */
  availableProviders?: ImageProvider[]
  /** Callback when model changes */
  onModelChange?: (provider: ImageProvider, model: ImageModel) => void
  onFocus?: React.FocusEventHandler<HTMLTextAreaElement>
  onBlur?: React.FocusEventHandler<HTMLTextAreaElement>
  onKeyDown?: React.KeyboardEventHandler<HTMLTextAreaElement>
}

export const ImagePromptArea = forwardRef<
  HTMLTextAreaElement,
  ImagePromptAreaProps
>(function ImagePromptArea(
  {
    className,
    lang,
    onGenerate,
    onValueChange,
    isGenerating = false,
    progress = 0,
    settings,
    activePreset,
    onOpenSettings,
    onOpenPresets,
    referenceImage,
    onReferenceImageChange,
    placeholder,
    provider,
    model,
    availableProviders = [],
    onModelChange,
    onFocus,
    onBlur,
    onKeyDown,
    ...props
  },
  ref,
) {
  const { t } = useI18n(lang as any)

  const [prompt, setPrompt] = useState((props.value as string) || '')
  const [isDragOver, setIsDragOver] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handlePromptChange = useCallback(
    (value: string) => {
      setPrompt(value)
      onValueChange?.(value)
    },
    [onValueChange],
  )

  // Sync with controlled value
  useEffect(() => {
    if (props.value !== undefined && props.value !== prompt) {
      setPrompt(props.value as string)
    }
  }, [props.value])

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Enter (without shift) triggers generation
      if (event.key === 'Enter' && !event.shiftKey && !isGenerating) {
        event.preventDefault()
        if (prompt.trim()) {
          onGenerate?.(prompt)
        }
      }
      onKeyDown?.(event)
    },
    [prompt, isGenerating, onGenerate, onKeyDown],
  )

  const handleReferenceImageSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (file && file.type.startsWith('image/')) {
        onReferenceImageChange?.(file)
      }
      event.target.value = ''
    },
    [onReferenceImageChange],
  )

  const handleImageClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleRemoveReferenceImage = useCallback(() => {
    onReferenceImageChange?.(null)
  }, [onReferenceImageChange])

  const handleDragEnter = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.stopPropagation()
    setIsDragOver(true)
  }, [])

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.stopPropagation()
  }, [])

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.stopPropagation()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback(
    async (event: React.DragEvent) => {
      event.preventDefault()
      event.stopPropagation()
      setIsDragOver(false)

      // First, try to get a file from the drop (e.g., from file system)
      const file = event.dataTransfer.files?.[0]
      if (file && file.type.startsWith('image/')) {
        onReferenceImageChange?.(file)
        return
      }

      // Try to get image URL from drag data (for images dragged from the same page)
      // Check for data URL first (from canvas or blob URLs)
      const htmlData = event.dataTransfer.getData('text/html')
      const urlData = event.dataTransfer.getData('text/uri-list') || event.dataTransfer.getData('text/plain')

      let imageUrl: string | null = null

      // Extract image src from HTML if present
      if (htmlData) {
        const imgMatch = htmlData.match(/<img[^>]+src=["']([^"']+)["']/i)
        if (imgMatch) {
          imageUrl = imgMatch[1]
        }
      }

      // Fall back to URL data
      if (!imageUrl && urlData) {
        // Check if it looks like an image URL
        if (urlData.match(/\.(jpg|jpeg|png|gif|webp|svg|bmp)(\?|$)/i) ||
            urlData.startsWith('data:image/') ||
            urlData.startsWith('blob:')) {
          imageUrl = urlData
        }
      }

      // If we found an image URL, fetch it and convert to File
      if (imageUrl) {
        try {
          const response = await fetch(imageUrl)
          const blob = await response.blob()
          
          if (blob.type.startsWith('image/')) {
            // Generate a filename from the URL or use a default
            const urlParts = imageUrl.split('/')
            const filename = urlParts[urlParts.length - 1]?.split('?')[0] || 'dropped-image'
            const extension = blob.type.split('/')[1] || 'png'
            const finalFilename = filename.includes('.') ? filename : `${filename}.${extension}`
            
            const imageFile = new File([blob], finalFilename, { type: blob.type })
            onReferenceImageChange?.(imageFile)
          }
        } catch (error) {
          console.warn('Failed to load dropped image:', error)
        }
      }
    },
    [onReferenceImageChange],
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

  const canGenerate = useMemo(
    () => prompt.trim().length > 0 && !isGenerating,
    [prompt, isGenerating],
  )

  // Format settings badge text
  const settingsBadge = useMemo(() => {
    if (activePreset) {
      return activePreset.icon
        ? `${activePreset.icon} ${activePreset.name}`
        : activePreset.name
    }
    if (settings) {
      const parts = []
      if (settings.style !== 'none' && settings.style !== 'natural') {
        parts.push(settings.style)
      }
      if (settings.aspectRatio !== '1:1') {
        parts.push(settings.aspectRatio)
      }
      if (settings.quality !== 'standard') {
        parts.push(settings.quality)
      }
      return parts.length > 0 ? parts.join(' • ') : null
    }
    return null
  }, [activePreset, settings])

  return (
    <div
      data-testid="image-prompt-area"
      className={cn(
        'w-full max-w-4xl mx-auto relative p-[3px]',
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
        {/* Hidden file input for reference image */}
        <input
          ref={fileInputRef}
          accept="image/*"
          className="hidden"
          type="file"
          onChange={handleReferenceImageSelect}
        />

        <Textarea
          ref={ref}
          data-testid="image-prompt-input"
          className="pb-16 bg-content2 rounded-lg"
          classNames={{
            input: 'p-1',
            inputWrapper: `shadow-none -mb-16 pb-8 bg-default-200 !ring-0 !ring-offset-0 ${referenceImage ? 'pl-16' : ''}`,
          }}
          maxRows={5}
          minRows={isMobileDevice() && isLandscape() && isSmallHeight() ? 1 : 2}
          placeholder={
            isDragOver
              ? t('Drop reference image here…')
              : placeholder || t('Describe the image you want to create…')
          }
          size="lg"
          value={prompt}
          onBlur={handleBlur as any}
          onFocus={handleFocus as any}
          onKeyDown={handleKeyDown as any}
          onValueChange={handlePromptChange}
          {...props}
        />

        {/* Reference image preview - inside the prompt area on the left */}
        {referenceImage && (
          <div className="absolute top-2 left-2 z-20">
            <div className="relative group">
              <img
                src={URL.createObjectURL(referenceImage)}
                alt="Reference"
                className="h-12 w-12 object-cover rounded-lg border-2 border-default-300"
              />
              <button
                type="button"
                onClick={handleRemoveReferenceImage}
                className="absolute -top-1 -right-1 p-0.5 rounded-full bg-danger text-white opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Icon name="Xmark" size="sm" />
              </button>
            </div>
          </div>
        )}

        {/* Progress bar */}
        {isGenerating && progress > 0 && (
          <div className="absolute top-0 left-0 right-0 h-1 bg-default-200 rounded-t-lg overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {/* Bottom toolbar */}
        <div className="absolute z-10 bottom-0 inset-x-px p-1 sm:p-2 rounded-b-lg">
          <div className="flex flex-wrap justify-between items-end gap-1">
            {/* Left side: Settings & Presets */}
            <div className="flex items-center gap-1">
              {/* Preset button */}
              <Tooltip content={t('Image presets')} placement="bottom">
                <Button
                  isIconOnly
                  variant="light"
                  size="sm"
                  radius="full"
                  onPress={onOpenPresets}
                >
                  <Icon name="Sparks" size="sm" className="text-default-500" />
                </Button>
              </Tooltip>

              {/* Settings button */}
              <Tooltip content={t('Image settings')} placement="bottom">
                <Button
                  isIconOnly
                  variant="light"
                  size="sm"
                  radius="full"
                  onPress={onOpenSettings}
                >
                  <Icon
                    name="Settings"
                    size="sm"
                    className="text-default-500"
                  />
                </Button>
              </Tooltip>

              {/* Reference image button */}
              <Tooltip content={t('Add reference image')} placement="bottom">
                <Button
                  isIconOnly
                  variant="light"
                  size="sm"
                  radius="full"
                  onPress={handleImageClick}
                >
                  <Icon
                    name="MediaImage"
                    size="sm"
                    className="text-default-500"
                  />
                </Button>
              </Tooltip>

              {/* Active preset/settings badge */}
              {settingsBadge && (
                <div className="hidden sm:flex items-center px-2 py-1 bg-default-100 rounded-full">
                  <span className="text-xs text-default-600 truncate max-w-32">
                    {settingsBadge}
                  </span>
                </div>
              )}
            </div>

            {/* Right side: Model selector & Generate button */}
            <div className="flex items-center gap-2">
              {/* Image count indicator */}
              {settings && settings.count > 1 && (
                <span className="text-xs text-default-500">
                  ×{settings.count}
                </span>
              )}

              {/* Model selector dropdown */}
              {availableProviders.length > 0 && (
                <Dropdown>
                  <DropdownTrigger>
                    <Button
                      size="sm"
                      variant="flat"
                      className="min-w-0 px-2 h-8"
                      endContent={<Icon name="NavArrowDown" size="sm" />}
                    >
                      <span className="text-xs truncate max-w-24">
                        {model
                          ? IMAGE_MODELS_BY_PROVIDER[
                              provider || 'openai'
                            ]?.find((m) => m.id === model)?.name || model
                          : t('Select model')}
                      </span>
                    </Button>
                  </DropdownTrigger>
                  <DropdownMenu
                    aria-label={t('Select image model')}
                    selectionMode="single"
                    selectedKeys={
                      model ? new Set([`${provider}:${model}`]) : new Set()
                    }
                    onSelectionChange={(keys) => {
                      const key = Array.from(keys)[0] as string
                      if (key) {
                        const [prov, ...modelParts] = key.split(':')
                        const modelId = modelParts.join(':') as ImageModel
                        onModelChange?.(prov as ImageProvider, modelId)
                      }
                    }}
                  >
                    {availableProviders.map((prov) => (
                      <DropdownSection
                        key={prov}
                        title={prov.charAt(0).toUpperCase() + prov.slice(1)}
                        showDivider={
                          availableProviders.indexOf(prov) <
                          availableProviders.length - 1
                        }
                      >
                        {IMAGE_MODELS_BY_PROVIDER[prov]?.map((m) => (
                          <DropdownItem
                            key={`${prov}:${m.id}`}
                            description={m.description}
                          >
                            {m.name}
                          </DropdownItem>
                        )) || []}
                      </DropdownSection>
                    ))}
                  </DropdownMenu>
                </Dropdown>
              )}

              <ButtonGroup variant="flat">
                <Tooltip content={t('Generate image')} placement="bottom">
                  <Button
                    data-testid="generate-button"
                    isIconOnly={isSmallWidth()}
                    disabled={isGenerating || !prompt.trim()}
                    color={!prompt.trim() ? 'default' : 'primary'}
                    className={cn(
                      canGenerate && 'dark:bg-white dark:text-black',
                    )}
                    radius="md"
                    variant="solid"
                    size="sm"
                    isDisabled={!canGenerate}
                    onPress={() => onGenerate?.(prompt)}
                  >
                    {isGenerating ? (
                      <Spinner size="sm" color="current" />
                    ) : (
                      <>
                        <Icon name="Sparks" size="sm" />
                        {!isSmallWidth() && (
                          <span className="ml-1">{t('Generate')}</span>
                        )}
                      </>
                    )}
                  </Button>
                </Tooltip>
              </ButtonGroup>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
})
