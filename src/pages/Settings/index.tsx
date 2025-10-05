import { useEffect, useState } from 'react'
import {
  Accordion,
  AccordionItem,
  Alert,
  Button,
  Card,
  CardBody,
  Checkbox,
  Chip,
  Input,
  Link,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Select,
  SelectItem,
  Tooltip,
  useDisclosure,
  CardHeader,
} from '@heroui/react'
import { useNavigate } from 'react-router-dom'
import { useI18n, useUrl, languages, type Lang } from '@/i18n'
import DefaultLayout from '@/layouts/Default'
import type { HeaderProps, IconName } from '@/lib/types'
import { LLMProvider, Credential, LangfuseConfig } from '@/types'
import { db } from '@/lib/db'
import { SecureStorage } from '@/lib/crypto'
import {
  AnthropicProvider,
  LLMService,
  LocalLLMProvider,
  OpenAIProvider,
  VertexAIProvider,
} from '@/lib/llm'
import { Container, Icon, Section, Title } from '@/components'
import { EasySetupExport } from '@/components/EasySetup/EasySetupExport'
import { errorToast, successToast } from '@/lib/toast'
import { userSettings } from '@/stores/userStore'
import { useLLMModelStore } from '@/stores/llmModelStore'
import { PRODUCT } from '@/config/product'
import { useBackgroundImage } from '@/hooks/useBackgroundImage'
import {
  getCacheInfo,
  clearModelCache,
  type CacheInfo,
} from '@/lib/llm/cache-manager'
import localI18n from './i18n'
import {
  availableMemory,
  deviceName,
  getVideoCardInfo,
  isWebGPUSupported,
} from '@/lib/device'
import { formatBytes } from '@/lib/format'

interface ProviderConfig {
  provider: LLMProvider
  name: string
  models: string[] | Promise<string[]>
  icon: IconName
  requiresBaseUrl?: boolean
  apiKeyFormat?: string
  apiKeyPlaceholder?: string
  apiKeyPage?: string
  noApiKey?: boolean
  noServerUrl?: boolean
  moreDetails?: () => React.ReactNode
}

export const SettingsPage = () => {
  const { lang, t, url } = useI18n(localI18n)
  const navigate = useNavigate()
  const { isOpen, onOpen, onOpenChange } = useDisclosure()
  const { handleImageFile, setBackgroundImage } = useBackgroundImage()

  // Use the LLM Model Store
  const credentials = useLLMModelStore((state) => state.credentials)
  const loadCredentials = useLLMModelStore((state) => state.loadCredentials)
  const addCredential = useLLMModelStore((state) => state.addCredential)
  const deleteCredential = useLLMModelStore((state) => state.deleteCredential)
  const setAsDefault = useLLMModelStore((state) => state.setAsDefault)

  const [selectedProvider, setSelectedProvider] = useState<LLMProvider>()
  const [apiKey, setApiKey] = useState('')
  const [model, setModel] = useState('')
  const [baseUrl, setBaseUrl] = useState('')
  const [isValidating, setIsValidating] = useState(false)
  const [masterPassword, setMasterPassword] = useState('')
  const [isUnlocking, setIsUnlocking] = useState(false)
  const [masterKey, setMasterKey] = useState<string | null>(null)
  const [isRegeneratingKey, setIsRegeneratingKey] = useState(false)
  const [availableModels, setAvailableModels] = useState<string[]>([])
  const [isFetchingModels, setIsFetchingModels] = useState(false)
  const [useManualModel, setUseManualModel] = useState(false)
  const [cacheInfo, setCacheInfo] = useState<CacheInfo | null>(null)
  const [isClearingCache, setIsClearingCache] = useState(false)

  // Langfuse state
  const [langfuseConfig, setLangfuseConfig] = useState<LangfuseConfig | null>(
    null,
  )
  const [langfuseHost, setLangfuseHost] = useState('')
  const [langfusePublicKey, setLangfusePublicKey] = useState('')
  const [langfuseSecretKey, setLangfuseSecretKey] = useState('')
  const [langfuseEnabled, setLangfuseEnabled] = useState(false)
  const [isSavingLangfuse, setIsSavingLangfuse] = useState(false)

  const setLanguage = userSettings((state) => state.setLanguage)
  const theme = userSettings((state) => state.theme)
  const setTheme = userSettings((state) => state.setTheme)
  const platformName = userSettings((state) => state.platformName)
  const setPlatformName = userSettings((state) => state.setPlatformName)

  const PROVIDERS: ProviderConfig[] = [
    {
      provider: 'local',
      name: 'Local (Browser)',
      models: new LocalLLMProvider().getAvailableModels(),
      icon: 'OpenInBrowser',
      noApiKey: true,
      noServerUrl: true,
      moreDetails: () => (
        <Alert variant="faded">
          <div className="flex flex-col gap-2">
            <p className="font-medium">
              {t('Local LLMs run entirely in your browser')}
            </p>
            <p className="text-sm text-default-600">
              {t(
                'No data is sent to external servers. Download happens at first use.',
              )}
              <br />
              <details>
                <summary>
                  {t('Requirements:')}
                  <Icon
                    name={
                      isWebGPUSupported() && Number(availableMemory) >= 8
                        ? 'CheckCircle'
                        : 'PcNoEntry'
                    }
                    color={
                      isWebGPUSupported() && Number(availableMemory) >= 8
                        ? 'green'
                        : 'red'
                    }
                    className="inline h-4 w-4 ml-1"
                  />
                </summary>
                <ul>
                  <li>
                    <Icon
                      name={isWebGPUSupported() ? 'CheckCircle' : 'PcNoEntry'}
                      color={isWebGPUSupported() ? 'green' : 'red'}
                      className="inline h-4 w-4 mr-1"
                    />
                    {t('WebGPU support')}
                  </li>
                  <li>
                    <Icon
                      name={
                        Number(availableMemory) >= 8
                          ? 'CheckCircle'
                          : 'PcNoEntry'
                      }
                      color={Number(availableMemory) >= 8 ? 'green' : 'red'}
                      className="inline h-4 w-4 mr-1"
                    />
                    {t('At least 8GB of RAM')}
                  </li>
                  <li>
                    <Icon name="QuestionMark" className="inline h-4 w-4 mr-1" />
                    {t('Storage space for model files (2-4GB)')}
                  </li>
                </ul>
              </details>
              <details>
                <summary>
                  {t('Your device:')} {deviceName()},{' '}
                  {formatBytes(Number(availableMemory) * 1_000_000_000, lang)}＋
                </summary>

                <ul>
                  {getVideoCardInfo()?.brand && (
                    <li>
                      {t('Brand: {brand}', {
                        brand: getVideoCardInfo()?.brand,
                      })}
                    </li>
                  )}
                  {getVideoCardInfo()?.model && (
                    <li>
                      {t('Model: {model}', {
                        model: getVideoCardInfo()?.model,
                      })}
                    </li>
                  )}
                  <li>
                    {t('Memory: {memory} or more (imprecise)', {
                      memory: formatBytes(
                        Number(availableMemory) * 1_000_000_000,
                        lang,
                      ),
                    })}
                  </li>
                  <li>
                    {t('Vendor: {vendor}', {
                      vendor: getVideoCardInfo()?.vendor,
                    })}
                  </li>
                </ul>
              </details>
            </p>
          </div>
        </Alert>
      ),
    },
    {
      provider: 'ollama',
      name: 'Ollama',
      models: [
        'gpt-oss:20b',
        'gpt-oss:120b',
        'deepseek-r1:8b',
        'gemma3:4b',
        'qwen3:8b',
        'llama2',
        'mistral',
        'codellama',
        'vicuna',
        'orca-mini',
      ],
      icon: 'Ollama',
      noApiKey: true,
      apiKeyPlaceholder: 'http://localhost:11434',
    },
    {
      provider: 'openai',
      name: 'OpenAI',
      models: [
        OpenAIProvider.DEFAULT_MODEL,
        'gpt-4',
        'gpt-4-turbo',
        'gpt-3.5-turbo',
      ],
      icon: 'OpenAI',
      apiKeyPage: 'https://platform.openai.com/api-keys',
    },
    {
      provider: 'anthropic',
      name: 'Anthropic',
      models: [
        AnthropicProvider.DEFAULT_MODEL,
        'claude-3-7-sonnet-20250219',
        'claude-sonnet-4-20250514',
        'claude-opus-4-20250514',
      ],
      icon: 'Anthropic',
      apiKeyPage: 'https://console.anthropic.com/settings/keys',
    },
    {
      provider: 'google',
      name: 'Google Gemini',
      models: [
        'gemini-2.5-pro',
        'gemini-2.5-flash',
        'gemini-2.5-flash-lite',
        'gemini-2.5-flash-image-preview',
      ],
      icon: 'Google',
    },
    {
      provider: 'vertex-ai',
      name: 'Vertex AI',
      models: [
        VertexAIProvider.DEFAULT_MODEL,
        'claude-sonnet-4-5@20250929',
        'google/gemini-2.5-flash-image-preview',
        'google/gemini-live-2.5-flash-preview-native-audio',
        'google/gemini-2.5-pro',
        'google/gemini-2.5-flash-lite',
        'google/veo-3.0-generate-001',
        'google/veo-3.0-fast-generate-001',
        'google/gemini-2.0-flash-001',
        'google/gemini-2.0-flash-lite-001',
      ],
      icon: 'GoogleCloud',
      apiKeyFormat: 'LOCATION:PROJECT_ID:API_KEY',
      apiKeyPlaceholder: 'us-central1:my-project:your-api-key',
    },
    {
      provider: 'mistral',
      name: 'Mistral AI',
      models: ['mistral-medium', 'mistral-small', 'mistral-tiny'],
      icon: 'MistralAI',
    },
    {
      provider: 'openrouter',
      name: 'OpenRouter',
      models: [
        'openai/gpt-4',
        'anthropic/claude-3-opus',
        'google/gemini-pro',
        'meta-llama/llama-3-70b',
      ],
      icon: 'OpenRouter',
    },
    {
      provider: 'deepseek',
      name: 'DeepSeek',
      models: ['deepseek-chat', 'deepseek-coder'],
      icon: 'DeepSeek',
    },
    {
      provider: 'grok',
      name: 'Grok (X.AI)',
      models: ['grok-beta'],
      icon: 'X',
    },
    {
      provider: 'huggingface',
      name: 'Hugging Face',
      models: [
        'meta-llama/Llama-2-7b-chat-hf',
        'mistralai/Mistral-7B-Instruct-v0.1',
        'google/flan-t5-xxl',
      ],
      icon: 'HuggingFace',
    },
    {
      provider: 'custom',
      name: 'Custom',
      models: [],
      icon: 'Server',
      requiresBaseUrl: true,
    },
  ]

  const handleLanguageChange = (newLanguage: Lang) => {
    // Update the language setting in the store
    setLanguage(newLanguage)

    // Generate the URL for the new language using useUrl from that language context
    const newUrl = useUrl(newLanguage)
    const settingsPath = newUrl('/settings')

    // Navigate to the new URL
    navigate(settingsPath)
  }

  const header: HeaderProps = {
    icon: {
      name: 'Settings',
      color: 'text-default-300',
    },
    title: t('Platform Settings'),
    subtitle: t(
      'Configure LLM providers, models and platform defaults for your organization',
    ),
  }

  useEffect(() => {
    const initialize = async () => {
      initializeSecurity()
      loadMasterKey()
      loadLangfuseConfig()
      loadCacheInfo()
      await loadCredentials()
    }
    initialize()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadCacheInfo = async () => {
    const info = await getCacheInfo()
    setCacheInfo(info)
  }

  const handleClearCache = async () => {
    if (
      !confirm(
        'Are you sure you want to clear all cached model files? They will need to be downloaded again on next use.',
      )
    ) {
      return
    }

    setIsClearingCache(true)
    try {
      const success = await clearModelCache()
      if (success) {
        successToast('Model cache cleared successfully')
        await loadCacheInfo()
      } else {
        errorToast('Failed to clear model cache')
      }
    } catch (error) {
      errorToast('Failed to clear model cache')
    } finally {
      setIsClearingCache(false)
    }
  }

  // Reset form when provider changes
  useEffect(() => {
    if (selectedProvider) {
      setModel('')
      setAvailableModels([])
      setUseManualModel(false)

      // Auto-fetch models for Ollama
      if (selectedProvider === 'ollama') {
        fetchAvailableModels('ollama', apiKey || undefined)
      } else if (selectedProvider === 'local') {
        // Load local models
        fetchAvailableModels('local')
      } else {
        // Load default models for other providers
        fetchAvailableModels(selectedProvider)
      }
    }
  }, [selectedProvider])

  // Re-fetch Ollama models when API key (server URL) changes
  useEffect(() => {
    if (selectedProvider === 'ollama' && apiKey) {
      fetchAvailableModels('ollama', apiKey)
    }
  }, [apiKey, selectedProvider])

  const initializeSecurity = async () => {
    await SecureStorage.init()
  }

  const loadMasterKey = () => {
    const key = SecureStorage.getMasterKey()
    setMasterKey(key)
  }

  const loadLangfuseConfig = async () => {
    try {
      await db.init()
      const configs = await db.getAll('langfuse_config')
      const config = configs[0] // Assuming single configuration

      if (config) {
        setLangfuseConfig(config)
        setLangfuseHost(config.host)
        setLangfusePublicKey(config.publicKey)
        setLangfuseEnabled(config.enabled)

        // Decrypt secret key
        const iv = localStorage.getItem(`${config.id}-iv`)
        const salt = localStorage.getItem(`${config.id}-salt`)

        if (iv && salt) {
          try {
            const decryptedSecretKey = await SecureStorage.decryptCredential(
              config.encryptedSecretKey,
              iv,
              salt,
            )
            setLangfuseSecretKey(decryptedSecretKey)
          } catch (error) {
            console.error('Failed to decrypt Langfuse secret key:', error)
          }
        }
      }
    } catch (error) {
      console.error('Failed to load Langfuse configuration:', error)
    }
  }

  const handleSaveLangfuseConfig = async () => {
    if (!langfuseHost || !langfusePublicKey || !langfuseSecretKey) {
      errorToast('Please fill in all Langfuse configuration fields')
      return
    }

    setIsSavingLangfuse(true)
    try {
      // Encrypt the secret key
      const { encrypted, iv, salt } =
        await SecureStorage.encryptCredential(langfuseSecretKey)

      const config: LangfuseConfig = {
        id: langfuseConfig?.id || `langfuse-${Date.now()}`,
        host: langfuseHost,
        publicKey: langfusePublicKey,
        encryptedSecretKey: encrypted,
        enabled: langfuseEnabled,
        timestamp: new Date(),
      }

      // Store encryption metadata
      localStorage.setItem(`${config.id}-iv`, iv)
      localStorage.setItem(`${config.id}-salt`, salt)

      if (langfuseConfig) {
        // Update existing config
        await db.update('langfuse_config', config)
      } else {
        // Add new config
        await db.add('langfuse_config', config)
      }

      setLangfuseConfig(config)

      // Notify service worker that configuration was updated
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'LANGFUSE_CONFIG_UPDATED',
        })
      }

      // Reinitialize the main thread Langfuse client
      const { LangfuseService } = await import('@/lib/langfuse-service')
      await LangfuseService.reinitialize()

      successToast('Langfuse configuration saved successfully')
    } catch (error) {
      console.error('Failed to save Langfuse configuration:', error)
      errorToast('Failed to save Langfuse configuration')
    } finally {
      setIsSavingLangfuse(false)
    }
  }

  const handleDeleteLangfuseConfig = async () => {
    if (!langfuseConfig) return

    if (
      !confirm('Are you sure you want to delete the Langfuse configuration?')
    ) {
      return
    }

    try {
      await db.delete('langfuse_config', langfuseConfig.id)
      localStorage.removeItem(`${langfuseConfig.id}-iv`)
      localStorage.removeItem(`${langfuseConfig.id}-salt`)

      // Clear state
      setLangfuseConfig(null)
      setLangfuseHost('')
      setLangfusePublicKey('')
      setLangfuseSecretKey('')
      setLangfuseEnabled(false)

      // Notify service worker that configuration was deleted
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'LANGFUSE_CONFIG_UPDATED',
        })
      }

      // Reinitialize the main thread Langfuse client
      const { LangfuseService } = await import('@/lib/langfuse-service')
      await LangfuseService.reinitialize()

      successToast('Langfuse configuration deleted')
    } catch (error) {
      console.error('Failed to delete Langfuse configuration:', error)
      errorToast('Failed to delete Langfuse configuration')
    }
  }

  const handleCopyMasterKey = async () => {
    if (!masterKey) return

    try {
      await navigator.clipboard.writeText(masterKey)
      successToast(t('Master key copied to clipboard'))
    } catch (error) {
      errorToast(t('Failed to copy master key'))
    }
  }

  const handleRegenerateMasterKey = async () => {
    if (
      !confirm(
        t(
          'Are you sure you want to regenerate the master key? This will invalidate all existing encrypted data.',
        ),
      )
    ) {
      return
    }

    setIsRegeneratingKey(true)
    try {
      const newKey = await SecureStorage.regenerateMasterKey()
      setMasterKey(newKey)
      successToast(t('Master key regenerated successfully'))
    } catch (error) {
      errorToast(t('Failed to regenerate master key'))
    } finally {
      setIsRegeneratingKey(false)
    }
  }

  const handleSetAsDefault = async (credentialId: string) => {
    await setAsDefault(credentialId)
    successToast(t('Provider set as default'))
  }

  const handleAddCredential = async () => {
    if (!selectedProvider) {
      return
    }

    const providerConfig = PROVIDERS.find(
      (p) => p.provider === selectedProvider,
    )

    // For Ollama and Local, API key is optional
    if (
      (!apiKey && !providerConfig?.noApiKey) ||
      !model ||
      (selectedProvider === 'custom' && !baseUrl)
    ) {
      errorToast(t('Please fill in all required fields'))
      return
    }

    setIsValidating(true)
    try {
      // For providers without API keys, use a dummy key
      const keyToEncrypt =
        apiKey || (providerConfig?.noApiKey ? `${selectedProvider}-no-key` : '')

      const success = await addCredential(
        selectedProvider,
        keyToEncrypt,
        model,
        baseUrl,
      )

      if (success) {
        // Reset form
        setApiKey('')
        setModel('')
        setBaseUrl('')
        onOpenChange()
      }
    } catch (error) {
      console.error(error)
    } finally {
      setIsValidating(false)
    }
  }

  const handleDeleteCredential = async (id: string) => {
    await deleteCredential(id)
  }

  const handleUnlock = async () => {
    if (!masterPassword) return

    setIsUnlocking(true)
    try {
      SecureStorage.unlock(masterPassword)
      setMasterPassword('')
      successToast(t('Storage unlocked'))
    } catch (error) {
      errorToast(t('Invalid password'))
    } finally {
      setIsUnlocking(false)
    }
  }

  const fetchAvailableModels = async (
    provider: LLMProvider,
    baseUrl?: string,
  ) => {
    if (provider !== 'ollama') {
      const config = PROVIDERS.find((p) => p.provider === provider)
      const models = config?.models
      // Handle Promise<string[]> for local provider
      const resolvedModels = models instanceof Promise ? await models : models
      setAvailableModels(resolvedModels || [])
      return
    }

    setIsFetchingModels(true)
    try {
      const config = baseUrl ? { baseUrl } : undefined
      const models = await LLMService.getAvailableModels(provider, config)
      setAvailableModels(models)
      setUseManualModel(false)
    } catch (error) {
      console.error('Failed to fetch models:', error)
      setAvailableModels([])
      setUseManualModel(true)
    } finally {
      setIsFetchingModels(false)
    }
  }

  const resetForm = () => {
    setSelectedProvider(undefined)
    setApiKey('')
    setModel('')
    setBaseUrl('')
    setAvailableModels([])
    setUseManualModel(false)
  }

  const handleModalOpen = () => {
    resetForm()
    onOpen()
  }

  const providerConfig = PROVIDERS.find((p) => p.provider === selectedProvider)

  const findProvider = (provider: LLMProvider) =>
    PROVIDERS.find((p) => p.provider === provider)

  // Simple Credential Card Component (no drag and drop)
  const CredentialCard = ({
    credential,
    index,
  }: {
    credential: Credential
    index: number
  }) => {
    const provider = findProvider(credential.provider)
    const isDefault = index === 0

    return (
      <Card
        className={`flex flex-row justify-between p-4 transition-all duration-200 hover:shadow-md ${
          isDefault ? 'ring-2 ring-primary ring-opacity-50' : ''
        }`}
      >
        <div className="flex items-center gap-8 px-4">
          <Icon name={provider?.icon as any} className="h-5 w-5" />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="font-medium">{provider?.name}</p>
              {isDefault && (
                <Chip size="sm" color="primary" variant="flat">
                  {t('Default Provider')}
                </Chip>
              )}
            </div>
            <p className="text-sm text-default-500">{credential.model}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isDefault && (
            <Button
              size="sm"
              variant="flat"
              color="primary"
              onPress={() => handleSetAsDefault(credential.id)}
            >
              {t('Set as Default')}
            </Button>
          )}
          <Button
            isIconOnly
            size="sm"
            variant="light"
            color="danger"
            onPress={() => handleDeleteCredential(credential.id)}
          >
            <Icon name="Trash" className="h-4 w-4" />
          </Button>
        </div>
      </Card>
    )
  }

  return (
    <DefaultLayout title={t('Settings')} header={header}>
      <Section>
        {SecureStorage.isLocked() && (
          <Container>
            <Card>
              <CardBody className="flex flex-row items-center gap-4">
                <Icon name="Lock" className="h-5 w-5 text-warning" />
                <div className="flex-1">
                  <p className="text-sm font-medium">
                    {t('Secure storage is locked')}
                  </p>
                  <p className="text-xs text-default-500">
                    {t('Enter your master password to unlock')}
                  </p>
                </div>
                <Input
                  type="password"
                  placeholder={t('Master password')}
                  value={masterPassword}
                  onChange={(e) => setMasterPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
                  className="w-48"
                />
                <Button
                  color="primary"
                  size="sm"
                  onPress={handleUnlock}
                  isLoading={isUnlocking}
                >
                  {t('Unlock')}
                </Button>
              </CardBody>
            </Card>
          </Container>
        )}

        <Container>
          <Accordion selectionMode="single" variant="bordered">
            <AccordionItem
              key="general"
              data-testid="general-settings"
              title={t('Appearance')}
              subtitle={t('Make the platform your own')}
              startContent={<Icon name="DesignPencil" className="h-5 w-5" />}
              classNames={{ content: 'pl-8 mb-4' }}
            >
              <div className="space-y-6 p-2">
                <Select
                  label={t('Interface Language')}
                  selectedKeys={[lang]}
                  onSelectionChange={(keys) => {
                    const selectedLang = Array.from(keys)[0] as Lang
                    if (selectedLang && selectedLang !== lang) {
                      handleLanguageChange(selectedLang)
                    }
                  }}
                  className="max-w-xs mr-3"
                >
                  {Object.entries(languages).map(([key, name]) => (
                    <SelectItem key={key} textValue={name}>
                      {name}
                    </SelectItem>
                  ))}
                </Select>

                <Select
                  label={t('Theme Mode')}
                  selectedKeys={[theme]}
                  onSelectionChange={(keys) => {
                    const selectedTheme = Array.from(keys)[0] as
                      | 'light'
                      | 'dark'
                      | 'system'
                    if (selectedTheme && selectedTheme !== theme) {
                      setTheme(selectedTheme)
                    }
                  }}
                  className="max-w-xs mr-3"
                >
                  <SelectItem key="system" textValue={t('System')}>
                    {t('System')}
                  </SelectItem>
                  <SelectItem key="light" textValue={t('Light')}>
                    {t('Light')}
                  </SelectItem>
                  <SelectItem key="dark" textValue={t('Dark')}>
                    {t('Dark')}
                  </SelectItem>
                </Select>

                <Input
                  label={t('Platform Name')}
                  placeholder={PRODUCT.displayName}
                  value={platformName || ''}
                  onChange={(e) => setPlatformName(e.target.value)}
                  className="max-w-xs mr-3"
                />

                <div>
                  <label className="text-sm font-medium text-default-600">
                    {t('Background Image')}
                  </label>
                  <p className="text-xs text-default-500 mb-3">
                    {t('Set a custom background image for the home page')}
                  </p>
                  <div className="flex gap-3 items-center">
                    <Button
                      variant="flat"
                      color="primary"
                      size="sm"
                      startContent={
                        <Icon name="PagePlus" className="h-4 w-4" />
                      }
                      onPress={() =>
                        document
                          .getElementById('background-image-input')
                          ?.click()
                      }
                    >
                      {userSettings((state) => state.backgroundImage)
                        ? t('Change Background')
                        : t('Upload Background')}
                    </Button>
                    {userSettings((state) => state.backgroundImage) && (
                      <Button
                        variant="flat"
                        color="danger"
                        size="sm"
                        startContent={<Icon name="Trash" className="h-4 w-4" />}
                        onPress={() => {
                          setBackgroundImage(undefined)
                          successToast(t('Background image removed'))
                        }}
                      >
                        {t('Remove')}
                      </Button>
                    )}
                  </div>
                  <input
                    type="file"
                    id="background-image-input"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        await handleImageFile(file)
                      }
                      e.target.value = ''
                    }}
                  />
                </div>
              </div>
            </AccordionItem>

            <AccordionItem
              key="providers"
              data-testid="llm-providers"
              title={t('LLM Providers')}
              subtitle={t(
                'Choose your LLM provider, manage your API credentials',
              )}
              startContent={<Icon name="Brain" className="h-5 w-5" />}
              classNames={{ content: 'pl-8 mb-4' }}
            >
              <div className="space-y-4 p-2">
                <div className="flex justify-end">
                  <Button
                    color="primary"
                    size="sm"
                    startContent={<Icon name="Plus" className="h-4 w-4" />}
                    onPress={handleModalOpen}
                    isDisabled={SecureStorage.isLocked()}
                  >
                    {t('Add Provider')}
                  </Button>
                </div>
                <div className="space-y-3">
                  {credentials.length === 0 ? (
                    <p className="text-center text-default-500 py-8">
                      {t('No providers configured. Add one to get started.')}
                    </p>
                  ) : (
                    credentials.map((cred, index) => (
                      <CredentialCard
                        key={cred.id}
                        credential={cred}
                        index={index}
                      />
                    ))
                  )}
                </div>

                {cacheInfo && cacheInfo.size > 0 && (
                  <div className="mt-6 pt-6 border-t border-default-200">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-sm font-medium">
                          {t('Local models cache')}
                        </p>
                        <p className="text-xs text-default-500">
                          {t('{files} files cached ({size})', {
                            files: cacheInfo.itemCount,
                            size: formatBytes(cacheInfo.size, lang),
                          })}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="flat"
                        color="danger"
                        onPress={handleClearCache}
                        isLoading={isClearingCache}
                        startContent={<Icon name="Trash" className="h-4 w-4" />}
                      >
                        {t('Clear cache')}
                      </Button>
                    </div>
                    <p className="text-xs text-default-500">
                      {t(
                        'Downloaded models are cached for 1 year to avoid re-downloading.',
                      )}
                    </p>
                  </div>
                )}
              </div>
            </AccordionItem>

            <AccordionItem
              key="langfuse"
              data-testid="langfuse-integration"
              title={
                <>
                  Langfuse Integration
                  <Chip
                    size="sm"
                    // color="warning"
                    variant="flat"
                    className="ml-2 align-middle"
                  >
                    Beta
                  </Chip>
                </>
              }
              subtitle="Configure Langfuse for LLM request tracking and analytics"
              startContent={<Icon name="Langfuse" className="h-5 w-5" />}
              classNames={{ content: 'pl-8 mb-4' }}
            >
              <div className="space-y-4 p-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="langfuse-enabled"
                    isSelected={langfuseEnabled}
                    onChange={(e) => setLangfuseEnabled(e.target.checked)}
                  >
                    Enable Langfuse Tracking
                  </Checkbox>
                </div>

                {langfuseEnabled && (
                  <div className="space-y-3">
                    <Input
                      label="Langfuse Host"
                      placeholder="https://your-langfuse-instance.com"
                      value={langfuseHost}
                      onChange={(e) => setLangfuseHost(e.target.value)}
                      isRequired
                      description="URL of your Langfuse instance"
                    />

                    <Input
                      label="Public Key"
                      placeholder="pk_..."
                      value={langfusePublicKey}
                      onChange={(e) => setLangfusePublicKey(e.target.value)}
                      isRequired
                      description="Langfuse public key from your project settings"
                    />

                    <Input
                      label="Secret Key"
                      placeholder="sk_..."
                      type="password"
                      value={langfuseSecretKey}
                      onChange={(e) => setLangfuseSecretKey(e.target.value)}
                      isRequired
                      description="Langfuse secret key from your project settings"
                    />

                    <div className="flex gap-2">
                      <Button
                        color="primary"
                        onPress={handleSaveLangfuseConfig}
                        isLoading={isSavingLangfuse}
                        isDisabled={
                          SecureStorage.isLocked() ||
                          !langfuseHost ||
                          !langfusePublicKey ||
                          !langfuseSecretKey
                        }
                        startContent={
                          <Icon name="CheckCircle" className="h-4 w-4" />
                        }
                      >
                        {langfuseConfig
                          ? 'Update Configuration'
                          : 'Save Configuration'}
                      </Button>

                      {langfuseConfig && (
                        <Button
                          color="danger"
                          variant="flat"
                          onPress={handleDeleteLangfuseConfig}
                          startContent={
                            <Icon name="Trash" className="h-4 w-4" />
                          }
                        >
                          Delete Configuration
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {langfuseConfig && !langfuseEnabled && (
                  <Alert color="warning">
                    Langfuse is configured but disabled. Enable it to start
                    tracking LLM requests.
                  </Alert>
                )}

                {!langfuseConfig && !langfuseEnabled && (
                  <Alert icon={<Icon name="LightBulbOn" />} variant="faded">
                    Enable Langfuse tracking to monitor and analyze your LLM API
                    usage, costs, and performance.
                  </Alert>
                )}
              </div>
            </AccordionItem>

            <AccordionItem
              key="security"
              data-testid="security-settings"
              title={t('Secure Storage')}
              subtitle={t('Manage your encryption keys and secure storage')}
              startContent={<Icon name="Lock" className="h-5 w-5" />}
              classNames={{ content: 'pl-8 mb-4' }}
            >
              <div className="space-y-4 p-2">
                <p className="text-sm text-default-500 mb-3">
                  {t(
                    'Your master key is used to encrypt all sensitive data stored locally. Keep it safe and secure.',
                  )}
                </p>

                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <Input
                      label={t('Master Key')}
                      value={masterKey || ''}
                      readOnly
                      type="password"
                      className="flex-1"
                      endContent={
                        <div className="flex gap-1">
                          <Tooltip content={t('Copy to clipboard')}>
                            <Button
                              isIconOnly
                              size="sm"
                              variant="light"
                              onPress={handleCopyMasterKey}
                              isDisabled={!masterKey}
                            >
                              <Icon name="Copy" className="h-4 w-4" />
                            </Button>
                          </Tooltip>
                        </div>
                      }
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="flat"
                      color="warning"
                      onPress={handleRegenerateMasterKey}
                      isLoading={isRegeneratingKey}
                      isDisabled={!masterKey}
                      startContent={
                        <Icon name="RefreshDouble" className="h-4 w-4" />
                      }
                    >
                      {t('Regenerate Master Key')}
                    </Button>
                  </div>
                </div>
              </div>
            </AccordionItem>
          </Accordion>

          <Title size="xl" className="text-gray-500">
            {t('Advanced Settings')}
          </Title>
          <Accordion selectionMode="single" variant="bordered">
            <AccordionItem
              key="easysetup"
              data-testid="easy-setup"
              title={t('Share the platform')}
              subtitle={t(
                'Export the platform settings to another device or share it with others',
              )}
              startContent={<Icon name="Share" className="h-5 w-5" />}
              classNames={{ content: 'pl-8 mb-4' }}
            >
              <EasySetupExport />
            </AccordionItem>
            <AccordionItem
              key="database"
              data-testid="database-management"
              title={t('Database Management')}
              subtitle={t('Export, import, or clear your local database')}
              startContent={<Icon name="Database" className="h-5 w-5" />}
              indicator={<Icon name="ArrowRight" className="h-4 w-4" />}
              onPress={() => navigate(url('/admin/database'))}
            />
          </Accordion>
        </Container>

        <Modal
          isOpen={isOpen}
          onOpenChange={onOpenChange}
          scrollBehavior="inside"
        >
          <ModalContent>
            {(onClose) => (
              <>
                <ModalHeader>{t('Add LLM Provider')}</ModalHeader>
                <ModalBody>
                  {!selectedProvider ? (
                    <p className="gap-2 flex flex-wrap">
                      {PROVIDERS.map((provider) => (
                        <Card
                          key={provider.provider}
                          className="inline-flex min-w-[8em] w-[calc(50%-0.25rem)] sm:w-auto h-[5em] flex-col hover:bg-primary-50"
                          isPressable
                          onPress={() =>
                            setSelectedProvider(
                              provider.provider as LLMProvider,
                            )
                          }
                        >
                          <CardHeader className="justify-center pb-0">
                            <Icon name={provider.icon} />
                          </CardHeader>
                          <CardBody className="text-center place-content-center text-sm">
                            {provider.name}
                          </CardBody>
                        </Card>
                      ))}
                    </p>
                  ) : (
                    <div className="space-y-4">
                      <Select
                        label={t('Select Provider')}
                        selectedKeys={[selectedProvider]}
                        onChange={(e) =>
                          setSelectedProvider(e.target.value as LLMProvider)
                        }
                        startContent={
                          selectedProvider && (
                            <Icon
                              name={findProvider(selectedProvider)?.icon as any}
                            />
                          )
                        }
                        className="w-full"
                        isRequired
                      >
                        {PROVIDERS.map((provider) => (
                          <SelectItem
                            key={provider.provider}
                            textValue={provider.name}
                            startContent={<Icon name={provider.icon} />}
                          >
                            {provider.name}
                          </SelectItem>
                        ))}
                      </Select>
                      {!(
                        providerConfig?.noApiKey && providerConfig?.noServerUrl
                      ) && (
                        <div>
                          <Input
                            label={
                              providerConfig?.noApiKey
                                ? t('Server URL (Optional)')
                                : t('API Key')
                            }
                            placeholder={
                              providerConfig?.apiKeyPlaceholder ||
                              t('Enter your API key')
                            }
                            type={
                              providerConfig?.noApiKey ? 'text' : 'password'
                            }
                            value={apiKey}
                            autoComplete="false"
                            onChange={(e) => setApiKey(e.target.value)}
                            isRequired={!providerConfig?.noApiKey}
                            description={
                              <Link
                                href={providerConfig?.apiKeyPage}
                                target="_blank"
                              >
                                {providerConfig?.apiKeyPage}
                              </Link>
                            }
                          />
                          {providerConfig?.apiKeyFormat && (
                            <p className="text-xs text-default-500 mt-1">
                              {t('Format:')} {providerConfig.apiKeyFormat}
                            </p>
                          )}
                        </div>
                      )}
                      {providerConfig?.requiresBaseUrl && (
                        <Input
                          label={t('Base URL')}
                          placeholder="https://api.example.com/v1"
                          value={baseUrl}
                          onChange={(e) => setBaseUrl(e.target.value)}
                          isRequired
                        />
                      )}
                      {/* Model Selection */}
                      {['ollama', 'local'].includes(
                        String(selectedProvider),
                      ) && (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="flat"
                              onPress={() =>
                                fetchAvailableModels(
                                  String(selectedProvider) as LLMProvider,
                                  apiKey || undefined,
                                )
                              }
                              isLoading={isFetchingModels}
                              startContent={
                                <Icon
                                  name="RefreshDouble"
                                  className="h-4 w-4"
                                />
                              }
                            >
                              {t('Fetch Available Models')}
                            </Button>
                            {availableModels.length > 0 && (
                              <Button
                                size="sm"
                                variant="light"
                                onPress={() =>
                                  setUseManualModel(!useManualModel)
                                }
                              >
                                {useManualModel
                                  ? t('Use Fetched Models')
                                  : t('Manual Input')}
                              </Button>
                            )}
                          </div>

                          {useManualModel || availableModels.length === 0 ? (
                            <Input
                              label={t('Model Name')}
                              placeholder={t('Enter model name')}
                              value={model}
                              onChange={(e) => setModel(e.target.value)}
                              isRequired
                              description={t(
                                'Enter the exact name of the model you want to use',
                              )}
                            />
                          ) : (
                            <Select
                              label={t('Available Models')}
                              placeholder={t('Select a model')}
                              value={model}
                              onChange={(e) => setModel(e.target.value)}
                              isRequired
                              isLoading={isFetchingModels}
                            >
                              {availableModels.map((m) => (
                                <SelectItem key={m} textValue={m}>
                                  {m}
                                </SelectItem>
                              ))}
                            </Select>
                          )}
                        </div>
                      )}
                      {!['ollama', 'local', 'custom'].includes(
                        String(selectedProvider),
                      ) && (
                        <Select
                          label={t('Model')}
                          placeholder={t('Select a model')}
                          value={model}
                          onChange={(e) => setModel(e.target.value)}
                          isRequired
                          isLoading={isFetchingModels}
                        >
                          {availableModels.map((m) => (
                            <SelectItem key={m} textValue={m}>
                              {m}
                            </SelectItem>
                          ))}
                        </Select>
                      )}
                      {providerConfig?.provider === 'custom' && (
                        <Input
                          label={t('Custom Model Name')}
                          placeholder={t('Enter model name')}
                          value={model}
                          onChange={(e) => setModel(e.target.value)}
                        />
                      )}
                      {providerConfig?.moreDetails?.()}
                    </div>
                  )}
                </ModalBody>
                <ModalFooter>
                  <Button variant="light" onPress={onClose}>
                    {t('Cancel')}
                  </Button>
                  <Button
                    color="primary"
                    onPress={handleAddCredential}
                    isLoading={isValidating}
                    isDisabled={
                      (!apiKey && !providerConfig?.noApiKey) ||
                      !model ||
                      (providerConfig?.requiresBaseUrl && !baseUrl)
                    }
                  >
                    {t('Validate & Add')}
                  </Button>
                </ModalFooter>
              </>
            )}
          </ModalContent>
        </Modal>
      </Section>
    </DefaultLayout>
  )
}
