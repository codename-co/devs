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

import { ImagePromptArea } from '../components/ImagePromptArea'
import { PresetGrid } from '../components/PresetGrid'
import { SettingsPanel } from '../components/SettingsPanel'
import { GeneratedImageCard } from '../components/GeneratedImageCard'
import { StudioBackground } from '../components/StudioBackground'
import { useImageGeneration } from '../hooks/useImageGeneration'
import { useImagePresets } from '../hooks/useImagePresets'
import { useStudioHistory } from '../hooks/useStudioHistory'
import {
  ImageProvider,
  GeneratedImage,
  ImageModel,
  getDefaultModelForProvider,
} from '../types'
import localI18n from '../i18n'

export function StudioPage() {
  const { lang, t } = useI18n(localI18n)
  const navigate = useNavigate()
  const url = useUrl(lang)

  // Track streaming images separately from history
  const [streamingImages, setStreamingImages] = useState<GeneratedImage[]>([])
  const [currentGenerationPrompt, setCurrentGenerationPrompt] =
    useState<string>('')
  // Use a ref to avoid stale closure in callbacks
  const currentGenerationPromptRef = useRef<string>('')

  // Hooks
  const { isGenerating, progress, error, generate, downloadImage } =
    useImageGeneration({
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
      },
      onGenerationError: () => {
        addToast({
          title: t('Failed to generate image'),
          description: error || undefined,
          color: 'danger',
        })
        // Clear streaming state on error
        setStreamingImages([])
        setCurrentGenerationPrompt('')
        currentGenerationPromptRef.current = ''
      },
    })

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

  const { history, addToHistory, toggleFavorite } = useStudioHistory()

  // Local state
  const [prompt, setPrompt] = useState('')
  const [referenceImage, setReferenceImage] = useState<File | null>(null)
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false)
  const [savePresetName, setSavePresetName] = useState('')
  const [savePresetDescription, setSavePresetDescription] = useState('')
  const [selectedProvider, setSelectedProvider] =
    useState<ImageProvider | null>(null)
  const [selectedModel, setSelectedModel] = useState<ImageModel | null>(null)

  // Computed values
  const favoriteImages = useMemo(
    () =>
      history
        .filter((entry) => entry.isFavorite)
        .flatMap((entry) =>
          entry.images.map((image) => ({
            image,
            entryId: entry.id,
            prompt: entry.prompt,
          })),
        ),
    [history],
  )

  const historyImagesCount = useMemo(
    () => history.reduce((sum, entry) => sum + entry.images.length, 0),
    [history],
  )

  // Get credentials from the LLM model store
  const credentials = useLLMModelStore((state) => state.credentials)
  const loadCredentials = useLLMModelStore((state) => state.loadCredentials)

  // Load credentials on mount
  useEffect(() => {
    loadCredentials()
  }, [loadCredentials])

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
    }
  }, [selectedProvider, selectedModel, providerCredentials])

  // Handle generation
  const handleGenerate = useCallback(
    async (promptText: string) => {
      const config = await getProviderConfig()
      if (!config) {
        addToast({
          title: t('Configure your image provider in Settings to get started'),
          color: 'warning',
          endContent: (
            <Button
              size="sm"
              color="warning"
              variant="flat"
              onPress={() => navigate(url('/settings'))}
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

      // Build settings with reference image if present
      let settingsWithReference = { ...currentSettings }
      if (referenceImage) {
        try {
          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => {
              const result = reader.result as string
              // Extract base64 data without the data URL prefix
              const base64Data = result.split(',')[1]
              resolve(base64Data)
            }
            reader.onerror = reject
            reader.readAsDataURL(referenceImage)
          })
          settingsWithReference = {
            ...settingsWithReference,
            referenceImageBase64: base64,
            referenceImageMimeType: referenceImage.type,
          }
        } catch (err) {
          console.error('Failed to convert reference image to base64:', err)
        }
      }

      await generate(promptText, settingsWithReference, config)
    },
    [
      generate,
      currentSettings,
      referenceImage,
      getProviderConfig,
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
      setReferenceImage(file)
    } catch (err) {
      console.error('Failed to set reference image:', err)
    }
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
                subtitle={t('Create stunning visuals with AI')}
                className="text-2xl md:text-3xl font-bold mb-2 flex items-center justify-center gap-2"
              >
                <Icon
                  name="MediaImagePlus"
                  size="3xl"
                  className="text-danger"
                />
                {t('Studio')}
              </Title>
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
              referenceImage={referenceImage}
              onReferenceImageChange={setReferenceImage}
              provider={selectedProvider}
              model={selectedModel}
              availableProviders={availableProviders}
              onModelChange={handleModelChange}
            />
          </motion.div>

          {/* History section header with title and filter */}
          {historyImagesCount > 0 && (
            <motion.div
              className="flex items-center justify-between mb-6"
              {...fadeInUp(30)}
              transition={createTransition(0.4, { duration: 0.7 })}
            >
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold">
                  {t('Generated visuals')}
                </h2>
                <Chip size="sm" variant="flat">
                  {historyImagesCount}
                </Chip>
              </div>
              <Filter
                label={t('All')}
                options={[
                  { key: 'all', label: t('All'), count: historyImagesCount },
                  {
                    key: 'favorites',
                    label: t('Favorites only'),
                    count: favoriteImages.length,
                    icon: 'HeartSolid',
                  },
                ]}
                selectedKey={showFavoritesOnly ? 'favorites' : 'all'}
                onSelectionChange={(key) =>
                  setShowFavoritesOnly(key === 'favorites')
                }
                showCounts="all"
              />
            </motion.div>
          )}

          {/* Gallery content - shows streaming images first, then history */}
          <motion.div
            className="min-h-[300px]"
            {...fadeInUp(30)}
            transition={createTransition(0.5, { duration: 0.7 })}
          >
            {history.length === 0 &&
            streamingImages.length === 0 &&
            !isGenerating ? null : showFavoritesOnly &&
              favoriteImages.length === 0 ? (
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
                {/* Skeleton placeholder while generating and no images yet */}
                {isGenerating &&
                  streamingImages.length === 0 &&
                  !showFavoritesOnly && (
                    <div className="aspect-square rounded-lg bg-default-100 animate-pulse flex items-center justify-center">
                      <Icon
                        name="MediaImage"
                        size="lg"
                        className="text-default-300"
                      />
                    </div>
                  )}
                {/* Streaming images appear first (inline with history) */}
                {!showFavoritesOnly &&
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
                {/* History images */}
                {showFavoritesOnly
                  ? favoriteImages.map(({ image, entryId, prompt }) => (
                      <GeneratedImageCard
                        key={image.id}
                        lang={lang}
                        image={image}
                        prompt={prompt}
                        onDownload={() => downloadImage(image)}
                        onUseAsReference={() => handleUseAsReference(image)}
                        onFavorite={() => toggleFavorite(entryId)}
                        isFavorite={true}
                      />
                    ))
                  : history.flatMap((entry) =>
                      entry.images.map((image) => (
                        <GeneratedImageCard
                          key={image.id}
                          lang={lang}
                          image={image}
                          prompt={entry.prompt}
                          onDownload={() => downloadImage(image)}
                          onUseAsReference={() => handleUseAsReference(image)}
                          onFavorite={() => toggleFavorite(entry.id)}
                          isFavorite={entry.isFavorite}
                        />
                      )),
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
    </DefaultLayout>
  )
}
