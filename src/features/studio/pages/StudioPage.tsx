/**
 * Image Generation Page
 *
 * Streamlined image generation experience with a clean, focused interface.
 * Centered prompt area with generated images gallery below.
 */

import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Button,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Drawer,
  DrawerContent,
  DrawerBody,
  Input,
  addToast,
  Chip,
} from '@heroui/react'

import { Container, Filter, Icon, Section, Title } from '@/components'
import DefaultLayout from '@/layouts/Default'
import { useI18n, useUrl } from '@/i18n'
import { motion } from 'framer-motion'
import {
  createTransition,
  fadeInUp,
  scaleIn,
  SPRING_CONFIG,
} from '@/lib/motion'
import { useLLMModelStore } from '@/stores/llmModelStore'
import { userSettings } from '@/stores/userStore'
import { CredentialService } from '@/lib/credential-service'
import { useSyncReady } from '@/hooks'

import { ImagePromptArea } from '../components/ImagePromptArea'
import { PresetGrid } from '../components/PresetGrid'
import { SettingsPanel } from '../components/SettingsPanel'
import { GeneratedImageCard } from '../components/GeneratedImageCard'
import { GeneratedVideoCard } from '../components/GeneratedVideoCard'
import { StudioBackground } from '../components/StudioBackground'
import { useImageGeneration } from '../hooks/useImageGeneration'
import { useVideoGeneration } from '../hooks/useVideoGeneration'
import { useImagePresets } from '../hooks/useImagePresets'
import { useStudioHistory } from '../hooks/useStudioHistory'
import {
  ImageProvider,
  GeneratedImage,
  GeneratedVideo,
  ImageModel,
  getDefaultModelForProvider,
  MediaType,
  VideoModel,
  VideoProvider,
  VideoGenerationSettings,
  DEFAULT_VIDEO_SETTINGS,
} from '../types'
import localI18n from '../i18n'

export function StudioPage() {
  const { lang, t } = useI18n(localI18n)
  const navigate = useNavigate()
  const url = useUrl(lang)

  // Media type mode (image or video)
  const [mediaType, setMediaType] = useState<MediaType>('image')

  // Track streaming images separately from history
  const [streamingImages, setStreamingImages] = useState<GeneratedImage[]>([])
  const [currentGenerationPrompt, setCurrentGenerationPrompt] =
    useState<string>('')
  // Use a ref to avoid stale closure in callbacks
  const currentGenerationPromptRef = useRef<string>('')

  // Track video generation prompt for persistence
  const [_currentVideoPrompt, setCurrentVideoPrompt] = useState<string>('')
  const currentVideoPromptRef = useRef<string>('')

  // Track generated videos (removed - now using history)

  // Hooks - Image Generation
  const {
    isGenerating: isGeneratingImage,
    progress: imageProgress,
    error: imageError,
    generate: generateImage,
    downloadImage,
  } = useImageGeneration({
    onImageReceived: (image) => {
      // Add each streaming image as it arrives
      setStreamingImages((prev) => [image, ...prev])
    },
    onGenerationComplete: (response) => {
      if (response.images.length > 0) {
        // Use ref to get current prompt value (avoids stale closure)
        addToHistory(
          currentGenerationPromptRef.current,
          currentSettings,
          response.images,
        )
        addToast({
          title: t('Image generated successfully'),
          color: 'success',
        })
      }
      // Clear streaming images - they're now in history
      setStreamingImages([])
      setCurrentGenerationPrompt('')
      currentGenerationPromptRef.current = ''
      // Clear prompt area
      setPrompt('')
      setReferenceImages([])
    },
    onGenerationError: () => {
      addToast({
        title: t('Failed to generate image'),
        description: imageError || undefined,
        color: 'danger',
      })
      // Clear streaming state on error
      setStreamingImages([])
      setCurrentGenerationPrompt('')
      currentGenerationPromptRef.current = ''
    },
  })

  // Hooks - Video Generation
  const {
    isGenerating: isGeneratingVideo,
    progress: videoProgress,
    progressMessage: videoProgressMessage,
    error: videoError,
    generate: generateVideo,
    downloadVideo,
  } = useVideoGeneration({
    onGenerationComplete: (response) => {
      if (response.videos.length > 0) {
        // Use ref to get current prompt value (avoids stale closure)
        addVideoToHistory(
          currentVideoPromptRef.current,
          videoSettings,
          response.videos,
        )
        addToast({
          title: t('Video generated successfully'),
          color: 'success',
        })
      }
      // Clear video generation state
      setCurrentVideoPrompt('')
      currentVideoPromptRef.current = ''
      // Clear prompt area
      setPrompt('')
      setReferenceImages([])
    },
    onGenerationError: () => {
      addToast({
        title: t('Failed to generate video'),
        description: videoError || undefined,
        color: 'danger',
      })
      // Clear video generation state on error
      setCurrentVideoPrompt('')
      currentVideoPromptRef.current = ''
    },
    onProgressUpdate: (progress, message) => {
      // Progress updates are already handled by the hook state
      console.log(`Video progress: ${progress}% - ${message}`)
    },
  })

  // Combined states
  const isGenerating =
    mediaType === 'image' ? isGeneratingImage : isGeneratingVideo
  const progress = mediaType === 'image' ? imageProgress : videoProgress

  const {
    presets,
    customPresets,
    activePreset,
    currentSettings,
    applyPreset,
    updateSettings,
    resetSettings,
    saveAsPreset,
    deletePreset,
  } = useImagePresets()

  // Video settings state (setVideoSettings will be used when video settings panel is added)
  const [videoSettings] = useState<VideoGenerationSettings>(
    DEFAULT_VIDEO_SETTINGS,
  )

  const {
    history,
    addToHistory,
    addVideoToHistory,
    toggleFavorite,
    removeImage,
    removeVideo,
  } = useStudioHistory()

  // Local state
  const [prompt, setPrompt] = useState('')
  const [referenceImages, setReferenceImages] = useState<File[]>([])
  const [mediaFilter, setMediaFilter] = useState<
    'all' | 'images' | 'videos' | 'favorites'
  >('all')
  const [savePresetName, setSavePresetName] = useState('')
  const [savePresetDescription, setSavePresetDescription] = useState('')
  const [selectedProvider, setSelectedProvider] =
    useState<ImageProvider | null>(null)
  const [selectedModel, setSelectedModel] = useState<ImageModel | null>(null)
  const [selectedVideoProvider, setSelectedVideoProvider] =
    useState<VideoProvider | null>(null)
  const [selectedVideoModel, setSelectedVideoModel] =
    useState<VideoModel | null>(null)

  // Delete confirmation state
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean
    type: 'image' | 'video'
    entryId: string
    mediaId: string
  } | null>(null)

  // Computed values - unified favorite media (images and videos)
  const favoriteMedia = useMemo(() => {
    const items: Array<{
      type: 'image' | 'video'
      image?: GeneratedImage
      video?: GeneratedVideo
      entryId: string
      prompt: string
    }> = []

    history
      .filter((entry) => entry.isFavorite)
      .forEach((entry) => {
        if (entry.mediaType === 'video') {
          ;(entry.videos || []).forEach((video) => {
            items.push({
              type: 'video',
              video,
              entryId: entry.id,
              prompt: entry.prompt,
            })
          })
        } else {
          ;(entry.images || []).forEach((image) => {
            items.push({
              type: 'image',
              image,
              entryId: entry.id,
              prompt: entry.prompt,
            })
          })
        }
      })

    return items
  }, [history])

  // Unified media list combining images and videos, sorted by entry date
  const allMedia = useMemo(() => {
    const items: Array<{
      type: 'image' | 'video'
      image?: GeneratedImage
      video?: GeneratedVideo
      entryId: string
      prompt: string
      isFavorite?: boolean
      createdAt: Date
    }> = []

    history.forEach((entry) => {
      if (entry.mediaType === 'video') {
        ;(entry.videos || []).forEach((video) => {
          items.push({
            type: 'video',
            video,
            entryId: entry.id,
            prompt: entry.prompt,
            isFavorite: entry.isFavorite,
            createdAt: entry.createdAt,
          })
        })
      } else {
        ;(entry.images || []).forEach((image) => {
          items.push({
            type: 'image',
            image,
            entryId: entry.id,
            prompt: entry.prompt,
            isFavorite: entry.isFavorite,
            createdAt: entry.createdAt,
          })
        })
      }
    })

    // Sort by date descending (newest first)
    return items.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
  }, [history])

  // Get videos from history
  const historyVideos = useMemo(
    () =>
      history
        .filter((entry) => entry.mediaType === 'video')
        .flatMap((entry) =>
          (entry.videos || []).map((video) => ({
            video,
            entryId: entry.id,
            prompt: entry.prompt,
            isFavorite: entry.isFavorite,
          })),
        ),
    [history],
  )

  const historyImagesCount = useMemo(
    () =>
      history
        .filter((e) => e.mediaType !== 'video')
        .reduce((sum, entry) => sum + (entry.images?.length || 0), 0),
    [history],
  )

  const totalMediaCount = useMemo(
    () => historyImagesCount + historyVideos.length,
    [historyImagesCount, historyVideos.length],
  )

  // Get credentials from the LLM model store
  const credentials = useLLMModelStore((state) => state.credentials)
  const loadCredentials = useLLMModelStore((state) => state.loadCredentials)
  const isSyncReady = useSyncReady()

  // Load credentials once Yjs has hydrated from IndexedDB
  // Without this gate, loadCredentials may run before Yjs has data,
  // creating a default local provider and blocking the Yjs observer
  // from re-loading the real credentials via the isLoadingCredentials guard.
  useEffect(() => {
    if (isSyncReady) {
      loadCredentials()
    }
  }, [isSyncReady, loadCredentials])

  // Get available image providers from stored credentials
  const { availableProviders, providerCredentials } = useMemo<{
    availableProviders: ImageProvider[]
    providerCredentials: Map<ImageProvider, { id: string; model?: string }>
  }>(() => {
    const imageProviders: ImageProvider[] = [
      'openai',
      'google',
      'stability',
      'replicate',
      'together',
      'fal',
      'huggingface',
      'openai-compatible',
      'custom',
      'ollama',
    ]
    const availableProvs = credentials
      .filter((c) => imageProviders.includes(c.provider as ImageProvider))
      .map((c) => c.provider as ImageProvider)
    const credMap = new Map<ImageProvider, { id: string; model?: string }>()
    credentials.forEach((c) => {
      if (imageProviders.includes(c.provider as ImageProvider)) {
        credMap.set(c.provider as ImageProvider, { id: c.id, model: c.model })
      }
    })
    return {
      availableProviders: [...new Set(availableProvs)] as ImageProvider[],
      providerCredentials: credMap,
    }
  }, [credentials])

  // Get available video providers from stored credentials (currently only Google)
  const availableVideoProviders = useMemo<VideoProvider[]>(() => {
    // Video generation uses Google Veo which requires a Google API key
    const hasGoogle = credentials.some((c) => c.provider === 'google')
    return hasGoogle ? ['google'] : []
  }, [credentials])

  // Initialize video provider/model when Google credentials are available
  useEffect(() => {
    if (availableVideoProviders.length > 0 && !selectedVideoProvider) {
      setSelectedVideoProvider('google')
      setSelectedVideoModel('veo-3.1-generate-preview')
    }
  }, [availableVideoProviders, selectedVideoProvider])

  // Handle video model change
  const handleVideoModelChange = useCallback(
    (provider: VideoProvider, model: VideoModel) => {
      setSelectedVideoProvider(provider)
      setSelectedVideoModel(model)
    },
    [],
  )

  // Get user's default image generation settings
  const defaultImageProvider = userSettings(
    (state) => state.defaultImageProvider,
  )
  const defaultImageModel = userSettings((state) => state.defaultImageModel)
  const setDefaultImageProvider = userSettings(
    (state) => state.setDefaultImageProvider,
  )
  const setDefaultImageModel = userSettings(
    (state) => state.setDefaultImageModel,
  )

  // Initialize selected provider/model from user defaults or first available
  useEffect(() => {
    if (availableProviders.length > 0 && !selectedProvider) {
      // Try to use user's default provider if available
      const preferredProvider =
        defaultImageProvider &&
        availableProviders.includes(defaultImageProvider)
          ? defaultImageProvider
          : availableProviders[0]

      setSelectedProvider(preferredProvider)

      // Try to use user's default model if it matches the provider, otherwise use credential model or default
      const cred = providerCredentials.get(preferredProvider)
      const preferredModel =
        defaultImageProvider === preferredProvider && defaultImageModel
          ? defaultImageModel
          : (cred?.model as ImageModel) ||
            getDefaultModelForProvider(preferredProvider)

      setSelectedModel(preferredModel)
    }
  }, [
    availableProviders,
    selectedProvider,
    providerCredentials,
    defaultImageProvider,
    defaultImageModel,
  ])

  // Handle model change - also save as user default
  const handleModelChange = useCallback(
    (provider: ImageProvider, model: ImageModel) => {
      setSelectedProvider(provider)
      setSelectedModel(model)
      // Save as user's default
      setDefaultImageProvider(provider)
      setDefaultImageModel(model)
    },
    [setDefaultImageProvider, setDefaultImageModel],
  )

  // Modal states
  const {
    isOpen: isPresetsOpen,
    onOpen: onOpenPresets,
    onClose: onClosePresets,
  } = useDisclosure()
  const {
    isOpen: isSettingsOpen,
    onOpen: onOpenSettings,
    onClose: onCloseSettings,
  } = useDisclosure()
  const {
    isOpen: isSavePresetOpen,
    onOpen: onOpenSavePreset,
    onClose: onCloseSavePreset,
  } = useDisclosure()

  // Get API key from stored credentials using selected provider
  const getProviderConfig = useCallback(async () => {
    if (!selectedProvider || !selectedModel) return null

    const credentialInfo = providerCredentials.get(selectedProvider)
    if (!credentialInfo) return null

    // Decrypt the API key using CredentialService
    const config = await CredentialService.getDecryptedConfig(credentialInfo.id)
    if (!config) return null

    return {
      provider: selectedProvider,
      apiKey: config.apiKey || '',
      model: selectedModel,
      baseUrl: config.baseUrl,
    }
  }, [selectedProvider, selectedModel, providerCredentials])

  // Get video provider config (uses Google credentials)
  const getVideoProviderConfig = useCallback(async () => {
    // Video generation currently only supports Google
    const googleCred = providerCredentials.get('google')
    if (!googleCred) return null

    const config = await CredentialService.getDecryptedConfig(googleCred.id)
    if (!config) return null

    return {
      provider: 'google' as VideoProvider,
      apiKey: config.apiKey || '',
      model: selectedVideoModel || ('veo-3.1-generate-preview' as VideoModel),
    }
  }, [providerCredentials, selectedVideoModel])

  // Handle generation (image or video)
  const handleGenerate = useCallback(
    async (promptText: string) => {
      if (mediaType === 'video') {
        // Video generation
        const config = await getVideoProviderConfig()
        if (!config) {
          addToast({
            title: t(
              'Configure your video provider in Settings to get started',
            ),
            color: 'warning',
            endContent: (
              <Button
                size="sm"
                color="warning"
                variant="flat"
                onPress={() => navigate(url('/settings#providers'))}
              >
                {t('Go to Settings')}
              </Button>
            ),
          })
          return
        }

        setPrompt(promptText)

        // Store prompt for persistence callback
        setCurrentVideoPrompt(promptText)
        currentVideoPromptRef.current = promptText

        // Build video settings with reference images if present
        let settingsWithReference = { ...videoSettings }
        if (referenceImages.length > 0) {
          try {
            const convertedImages = await Promise.all(
              referenceImages.map(async (image) => {
                const base64 = await new Promise<string>((resolve, reject) => {
                  const reader = new FileReader()
                  reader.onload = () => {
                    const result = reader.result as string
                    const base64Data = result.split(',')[1]
                    resolve(base64Data)
                  }
                  reader.onerror = reject
                  reader.readAsDataURL(image)
                })
                return { base64, mimeType: image.type }
              }),
            )
            // Use first image for backward compatibility
            settingsWithReference = {
              ...settingsWithReference,
              referenceImageBase64: convertedImages[0].base64,
              referenceImageMimeType: convertedImages[0].mimeType,
              referenceImages: convertedImages,
            }
          } catch (err) {
            console.error('Failed to convert reference images to base64:', err)
          }
        }

        await generateVideo(promptText, settingsWithReference, config)
      } else {
        // Image generation
        const config = await getProviderConfig()
        if (!config) {
          addToast({
            title: t(
              'Configure your image provider in Settings to get started',
            ),
            color: 'warning',
            endContent: (
              <Button
                size="sm"
                color="warning"
                variant="flat"
                onPress={() => navigate(url('/settings#providers'))}
              >
                {t('Go to Settings')}
              </Button>
            ),
          })
          return
        }

        setPrompt(promptText)
        setCurrentGenerationPrompt(promptText)
        currentGenerationPromptRef.current = promptText
        setStreamingImages([]) // Clear any previous streaming images

        // Build settings with reference images if present
        let settingsWithReference = { ...currentSettings }
        if (referenceImages.length > 0) {
          try {
            const convertedImages = await Promise.all(
              referenceImages.map(async (image) => {
                const base64 = await new Promise<string>((resolve, reject) => {
                  const reader = new FileReader()
                  reader.onload = () => {
                    const result = reader.result as string
                    // Extract base64 data without the data URL prefix
                    const base64Data = result.split(',')[1]
                    resolve(base64Data)
                  }
                  reader.onerror = reject
                  reader.readAsDataURL(image)
                })
                return { base64, mimeType: image.type }
              }),
            )
            // Use first image for backward compatibility
            settingsWithReference = {
              ...settingsWithReference,
              referenceImageBase64: convertedImages[0].base64,
              referenceImageMimeType: convertedImages[0].mimeType,
              referenceImages: convertedImages,
            }
          } catch (err) {
            console.error('Failed to convert reference images to base64:', err)
          }
        }

        await generateImage(promptText, settingsWithReference, config)
      }
    },
    [
      mediaType,
      generateImage,
      generateVideo,
      currentSettings,
      videoSettings,
      referenceImages,
      getProviderConfig,
      getVideoProviderConfig,
      t,
      navigate,
      url,
    ],
  )

  // Handle preset selection from grid
  const handlePresetSelect = useCallback(
    (preset: any) => {
      applyPreset(preset)
      onClosePresets()
    },
    [applyPreset, onClosePresets],
  )

  // Handle save as preset
  const handleSavePreset = useCallback(() => {
    if (!savePresetName.trim()) return

    saveAsPreset(savePresetName, savePresetDescription || undefined)
    setSavePresetName('')
    setSavePresetDescription('')
    onCloseSavePreset()

    addToast({
      title: t('Preset saved'),
      color: 'success',
    })
  }, [
    savePresetName,
    savePresetDescription,
    saveAsPreset,
    onCloseSavePreset,
    t,
  ])

  // Handle use as reference
  const handleUseAsReference = useCallback(async (image: GeneratedImage) => {
    // Convert URL or base64 to File
    try {
      let blob: Blob
      if (image.base64) {
        const byteCharacters = atob(image.base64)
        const byteNumbers = new Array(byteCharacters.length)
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i)
        }
        blob = new Blob([new Uint8Array(byteNumbers)], {
          type: `image/${image.format}`,
        })
      } else {
        const response = await fetch(image.url)
        blob = await response.blob()
      }

      const file = new File([blob], `reference-${image.id}.${image.format}`, {
        type: `image/${image.format}`,
      })
      setReferenceImages((prev) => [...prev, file])
    } catch (err) {
      console.error('Failed to set reference image:', err)
    }
  }, [])

  // Handle delete media with confirmation
  const handleDeleteMedia = useCallback(
    (type: 'image' | 'video', entryId: string, mediaId: string) => {
      setDeleteConfirm({ isOpen: true, type, entryId, mediaId })
    },
    [],
  )

  // Confirm delete
  const handleConfirmDelete = useCallback(async () => {
    if (!deleteConfirm) return

    if (deleteConfirm.type === 'image') {
      await removeImage(deleteConfirm.entryId, deleteConfirm.mediaId)
    } else {
      await removeVideo(deleteConfirm.entryId, deleteConfirm.mediaId)
    }

    addToast({
      title: t('Media deleted'),
      color: 'success',
    })

    setDeleteConfirm(null)
  }, [deleteConfirm, removeImage, removeVideo, t])

  // Cancel delete
  const handleCancelDelete = useCallback(() => {
    setDeleteConfirm(null)
  }, [])

  return (
    <DefaultLayout showBackButton={false}>
      {/* Studio branded background */}
      <StudioBackground />
      <Section className="min-h-screen relative">
        <Container className="py-6 md:py-10 max-w-5xl relative z-10">
          {/* Hero section with prompt */}
          <motion.div
            className="text-center mb-8"
            {...fadeInUp(20)}
            transition={createTransition(0, {
              ...SPRING_CONFIG,
              duration: 0.8,
            })}
          >
            <motion.div
              {...scaleIn}
              transition={createTransition(0.1, {
                type: 'spring',
                damping: 20,
                stiffness: 100,
              })}
            >
              <Title
                subtitle={
                  mediaType === 'video'
                    ? t('Create stunning videos with AI')
                    : mediaType === 'music'
                      ? t('Create stunning music with AI')
                      : t('Create stunning images with AI')
                }
                className="flex items-center justify-center gap-2"
              >
                <Icon
                  name={
                    mediaType === 'video'
                      ? 'MediaVideo'
                      : mediaType === 'music'
                        ? 'MusicDoubleNote'
                        : 'MediaImagePlus'
                  }
                  size="3xl"
                  className="text-danger"
                />
                {t('Studio')}
              </Title>
            </motion.div>

            {/* Media type toggle */}
            <motion.div
              className="flex justify-center mt-4"
              {...fadeInUp(10)}
              transition={createTransition(0.15, { duration: 0.5 })}
            >
              <div className="flex gap-2 p-1 bg-default-100 rounded-xl">
                <Button
                  size="sm"
                  variant={mediaType === 'image' ? 'solid' : 'light'}
                  color={mediaType === 'image' ? 'primary' : 'default'}
                  onPress={() => setMediaType('image')}
                  startContent={<Icon name="MediaImage" size="sm" />}
                >
                  {t('Image')}
                </Button>
                <Button
                  size="sm"
                  variant={mediaType === 'video' ? 'solid' : 'light'}
                  color={mediaType === 'video' ? 'primary' : 'default'}
                  onPress={() => setMediaType('video')}
                  startContent={<Icon name="MediaVideo" size="sm" />}
                >
                  {t('Video')}
                </Button>
              </div>
            </motion.div>
          </motion.div>

          {/* Centered prompt area - the star of the show */}
          <motion.div
            className="mb-10"
            {...fadeInUp(30)}
            transition={createTransition(0.3, { duration: 0.7 })}
          >
            <ImagePromptArea
              lang={lang}
              value={prompt}
              onValueChange={setPrompt}
              onGenerate={handleGenerate}
              isGenerating={isGenerating}
              progress={progress}
              settings={currentSettings}
              activePreset={activePreset}
              onOpenSettings={onOpenSettings}
              onOpenPresets={onOpenPresets}
              referenceImages={referenceImages}
              onReferenceImagesChange={setReferenceImages}
              provider={selectedProvider}
              model={selectedModel}
              availableProviders={availableProviders}
              onModelChange={handleModelChange}
              mediaType={mediaType}
              videoProvider={selectedVideoProvider}
              videoModel={selectedVideoModel}
              availableVideoProviders={availableVideoProviders}
              onVideoModelChange={handleVideoModelChange}
            />
          </motion.div>

          {/* History section header with title and filter */}
          {(totalMediaCount > 0 || streamingImages.length > 0) && (
            <motion.div
              className="flex items-center justify-between mb-6"
              {...fadeInUp(30)}
              transition={createTransition(0.4, { duration: 0.7 })}
            >
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold">
                  {t('Generated media')}
                </h2>
                <Chip size="sm" variant="flat">
                  {totalMediaCount}
                </Chip>
              </div>
              <Filter
                label={t('All')}
                options={[
                  { key: 'all', label: t('All'), count: totalMediaCount },
                  {
                    key: 'images',
                    label: t('Images'),
                    count: historyImagesCount,
                    icon: 'MediaImage',
                  },
                  {
                    key: 'videos',
                    label: t('Videos'),
                    count: historyVideos.length,
                    icon: 'MediaVideo',
                  },
                  {
                    key: 'favorites',
                    label: t('Favorites'),
                    count: favoriteMedia.length,
                    icon: 'HeartSolid',
                  },
                ]}
                selectedKey={mediaFilter}
                onSelectionChange={(key) =>
                  setMediaFilter(
                    key as 'all' | 'images' | 'videos' | 'favorites',
                  )
                }
                showCounts="all"
              />
            </motion.div>
          )}

          {/* Gallery content - unified media gallery */}
          <motion.div
            className="min-h-[300px]"
            {...fadeInUp(30)}
            transition={createTransition(0.5, { duration: 0.7 })}
          >
            {/* Video Generation Progress */}
            {isGeneratingVideo && (
              <div className="mb-6 p-4 bg-default-100 rounded-lg">
                <div className="flex items-center gap-3 mb-2">
                  <Icon
                    name="MediaVideoPlus"
                    size="md"
                    className="text-primary animate-pulse"
                  />
                  <span className="font-medium">
                    {t('Generating video...')}
                  </span>
                </div>
                <div className="w-full bg-default-200 rounded-full h-2 mb-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${videoProgress}%` }}
                  />
                </div>
                <p className="text-sm text-default-500">
                  {videoProgressMessage}
                </p>
              </div>
            )}

            {/* Unified Media Gallery */}
            {totalMediaCount === 0 &&
            streamingImages.length === 0 &&
            !isGenerating ? null : mediaFilter === 'favorites' &&
              favoriteMedia.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 rounded-full bg-default-100 flex items-center justify-center mb-4">
                  <Icon name="Heart" size="lg" className="text-default-300" />
                </div>
                <p className="text-default-500 text-lg">
                  {t('No favorites yet')}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {/* Skeleton placeholder while generating and no media yet */}
                {isGenerating &&
                  streamingImages.length === 0 &&
                  mediaFilter !== 'favorites' && (
                    <div className="aspect-square rounded-lg bg-default-100 animate-pulse flex items-center justify-center">
                      <Icon
                        name={
                          mediaType === 'video' ? 'MediaVideo' : 'MediaImage'
                        }
                        size="lg"
                        className="text-default-300"
                      />
                    </div>
                  )}
                {/* Streaming images appear first (inline with history) */}
                {(mediaFilter === 'all' || mediaFilter === 'images') &&
                  streamingImages.map((image) => (
                    <GeneratedImageCard
                      key={image.id}
                      lang={lang}
                      image={image}
                      prompt={currentGenerationPrompt}
                      onDownload={() => downloadImage(image)}
                      onUseAsReference={() => handleUseAsReference(image)}
                      showActions={true}
                    />
                  ))}
                {/* All media (images and videos sorted by date) */}
                {mediaFilter === 'all' &&
                  allMedia.map((item) =>
                    item.type === 'video' && item.video ? (
                      <GeneratedVideoCard
                        key={item.video.id}
                        video={item.video}
                        lang={lang}
                        prompt={item.prompt}
                        onDownload={() => downloadVideo(item.video!)}
                        onDelete={() =>
                          handleDeleteMedia(
                            'video',
                            item.entryId,
                            item.video!.id,
                          )
                        }
                        onFavorite={() => toggleFavorite(item.entryId)}
                        isFavorite={item.isFavorite}
                      />
                    ) : item.image ? (
                      <GeneratedImageCard
                        key={item.image.id}
                        lang={lang}
                        image={item.image}
                        prompt={item.prompt}
                        onDownload={() => downloadImage(item.image!)}
                        onDelete={() =>
                          handleDeleteMedia(
                            'image',
                            item.entryId,
                            item.image!.id,
                          )
                        }
                        onUseAsReference={() =>
                          handleUseAsReference(item.image!)
                        }
                        onFavorite={() => toggleFavorite(item.entryId)}
                        isFavorite={item.isFavorite}
                      />
                    ) : null,
                  )}
                {/* Videos only filter */}
                {mediaFilter === 'videos' &&
                  historyVideos.map(
                    ({ video, entryId, isFavorite, prompt }) => (
                      <GeneratedVideoCard
                        key={video.id}
                        video={video}
                        lang={lang}
                        prompt={prompt}
                        onDownload={() => downloadVideo(video)}
                        onDelete={() =>
                          handleDeleteMedia('video', entryId, video.id)
                        }
                        onFavorite={() => toggleFavorite(entryId)}
                        isFavorite={isFavorite}
                      />
                    ),
                  )}
                {/* Favorite media (images and videos) */}
                {mediaFilter === 'favorites' &&
                  favoriteMedia.map((item) =>
                    item.type === 'video' && item.video ? (
                      <GeneratedVideoCard
                        key={item.video.id}
                        video={item.video}
                        lang={lang}
                        prompt={item.prompt}
                        onDownload={() => downloadVideo(item.video!)}
                        onDelete={() =>
                          handleDeleteMedia(
                            'video',
                            item.entryId,
                            item.video!.id,
                          )
                        }
                        onFavorite={() => toggleFavorite(item.entryId)}
                        isFavorite={true}
                      />
                    ) : item.image ? (
                      <GeneratedImageCard
                        key={item.image.id}
                        lang={lang}
                        image={item.image}
                        prompt={item.prompt}
                        onDownload={() => downloadImage(item.image!)}
                        onDelete={() =>
                          handleDeleteMedia(
                            'image',
                            item.entryId,
                            item.image!.id,
                          )
                        }
                        onUseAsReference={() =>
                          handleUseAsReference(item.image!)
                        }
                        onFavorite={() => toggleFavorite(item.entryId)}
                        isFavorite={true}
                      />
                    ) : null,
                  )}
                {/* Images only filter */}
                {mediaFilter === 'images' &&
                  allMedia
                    .filter((item) => item.type === 'image')
                    .map((item) =>
                      item.image ? (
                        <GeneratedImageCard
                          key={item.image.id}
                          lang={lang}
                          image={item.image}
                          prompt={item.prompt}
                          onDownload={() => downloadImage(item.image!)}
                          onDelete={() =>
                            handleDeleteMedia(
                              'image',
                              item.entryId,
                              item.image!.id,
                            )
                          }
                          onUseAsReference={() =>
                            handleUseAsReference(item.image!)
                          }
                          onFavorite={() => toggleFavorite(item.entryId)}
                          isFavorite={item.isFavorite}
                        />
                      ) : null,
                    )}
              </div>
            )}
          </motion.div>
        </Container>
      </Section>
      {/* Presets Modal */}
      <Modal
        isOpen={isPresetsOpen}
        onClose={onClosePresets}
        size="4xl"
        scrollBehavior="inside"
      >
        <ModalContent>
          <ModalHeader>{t('Image Presets')}</ModalHeader>
          <ModalBody className="pb-6">
            <PresetGrid
              lang={lang}
              presets={presets}
              customPresets={customPresets}
              activePreset={activePreset}
              onSelectPreset={handlePresetSelect}
              onDeletePreset={deletePreset}
            />
          </ModalBody>
        </ModalContent>
      </Modal>
      {/* Settings Drawer */}
      <Drawer
        isOpen={isSettingsOpen}
        onClose={onCloseSettings}
        placement="right"
        size="sm"
      >
        <DrawerContent>
          <DrawerBody className="p-4">
            <SettingsPanel
              lang={lang}
              settings={currentSettings}
              onSettingsChange={updateSettings}
              onReset={resetSettings}
              onSaveAsPreset={onOpenSavePreset}
              onClose={onCloseSettings}
            />
          </DrawerBody>
        </DrawerContent>
      </Drawer>
      {/* Save Preset Modal */}
      <Modal isOpen={isSavePresetOpen} onClose={onCloseSavePreset} size="md">
        <ModalContent>
          <ModalHeader>{t('Save Preset')}</ModalHeader>
          <ModalBody className="pb-6">
            <div className="space-y-4">
              <Input
                label={t('Preset name')}
                placeholder={t('My custom preset')}
                value={savePresetName}
                onValueChange={setSavePresetName}
                autoFocus
              />
              <Input
                label={t('Description (optional)')}
                placeholder=""
                value={savePresetDescription}
                onValueChange={setSavePresetDescription}
              />
              <div className="flex justify-end gap-2">
                <Button variant="flat" onPress={onCloseSavePreset}>
                  {t('Cancel')}
                </Button>
                <Button
                  color="primary"
                  onPress={handleSavePreset}
                  isDisabled={!savePresetName.trim()}
                >
                  {t('Save')}
                </Button>
              </div>
            </div>
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteConfirm?.isOpen ?? false}
        onClose={handleCancelDelete}
        size="sm"
      >
        <ModalContent>
          <ModalHeader className="flex items-center gap-2">
            <Icon name="Trash" size="md" className="text-danger" />
            {t('Delete media')}
          </ModalHeader>
          <ModalBody>
            <p className="text-default-600">
              {t(
                'Are you sure you want to permanently delete this media? This action cannot be undone.',
              )}
            </p>
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={handleCancelDelete}>
              {t('Cancel')}
            </Button>
            <Button color="danger" onPress={handleConfirmDelete}>
              {t('Delete')}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </DefaultLayout>
  )
}
