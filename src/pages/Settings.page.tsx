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
} from '@heroui/react'
import { useNavigate } from 'react-router-dom'
import { useI18n, languages } from '@/i18n'
import type { Lang } from '@/i18n/utils'
import { useUrl } from '@/i18n/utils'
import DefaultLayout from '@/layouts/Default'
import type { HeaderProps, IconName } from '@/lib/types'
import { LLMProvider, Credential, LangfuseConfig } from '@/types'
import { db } from '@/lib/db'
import { SecureStorage } from '@/lib/crypto'
import { LLMService } from '@/lib/llm'
import { Container, Icon, Section, Title } from '@/components'
import { EasySetupExport } from '@/components/EasySetupExport'
import { errorToast, successToast } from '@/lib/toast'
import { userSettings } from '@/stores/userStore'
import { PRODUCT } from '@/config/product'
import { useBackgroundImage } from '@/hooks/useBackgroundImage'

interface ProviderConfig {
  provider: LLMProvider
  name: string
  models: string[]
  icon: IconName
  color: string
  requiresBaseUrl?: boolean
  apiKeyFormat?: string
  apiKeyPlaceholder?: string
  apiKeyPage?: string
  noApiKey?: boolean
}

const PROVIDERS: ProviderConfig[] = [
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
    color: 'default',
    noApiKey: true,
    apiKeyPlaceholder: 'http://localhost:11434',
  },
  {
    provider: 'openai',
    name: 'OpenAI',
    models: ['gpt-5-2025-08-07', 'gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'],
    icon: 'OpenAI',
    color: 'success',
    apiKeyPage: 'https://platform.openai.com/api-keys',
  },
  {
    provider: 'anthropic',
    name: 'Anthropic',
    models: [
      'claude-3-7-sonnet-20250219',
      'claude-sonnet-4-20250514',
      'claude-opus-4-20250514',
    ],
    icon: 'Anthropic',
    color: 'primary',
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
    color: 'secondary',
  },
  {
    provider: 'vertex-ai',
    name: 'Google Vertex AI',
    models: [
      'google/gemini-2.5-flash',
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
    color: 'secondary',
    apiKeyFormat: 'LOCATION:PROJECT_ID:API_KEY',
    apiKeyPlaceholder: 'us-central1:my-project:your-api-key',
  },
  {
    provider: 'mistral',
    name: 'Mistral AI',
    models: ['mistral-medium', 'mistral-small', 'mistral-tiny'],
    icon: 'MistralAI',
    color: 'warning',
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
    color: 'primary',
  },
  {
    provider: 'deepseek',
    name: 'DeepSeek',
    models: ['deepseek-chat', 'deepseek-coder'],
    icon: 'DeepSeek',
    color: 'secondary',
  },
  {
    provider: 'grok',
    name: 'Grok (X.AI)',
    models: ['grok-beta'],
    icon: 'X',
    color: 'default',
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
    color: 'warning',
  },
  {
    provider: 'custom',
    name: 'Custom/Local',
    models: [],
    icon: 'Server',
    color: 'default',
    requiresBaseUrl: true,
  },
]

export const SettingsPage = () => {
  const { lang, t, url } = useI18n()
  const navigate = useNavigate()
  const { isOpen, onOpen, onOpenChange } = useDisclosure()
  const { handleImageFile, setBackgroundImage } = useBackgroundImage()
  const [credentials, setCredentials] = useState<Credential[]>([])
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
    loadCredentials()
    initializeSecurity()
    loadMasterKey()
    loadLangfuseConfig()
  }, [])

  // Reset form when provider changes
  useEffect(() => {
    if (selectedProvider) {
      setModel('')
      setAvailableModels([])
      setUseManualModel(false)

      // Auto-fetch models for Ollama
      if (selectedProvider === 'ollama') {
        fetchAvailableModels('ollama', apiKey || undefined)
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

  const loadCredentials = async () => {
    await db.init()
    const creds = await db.getAll('credentials')

    // Sort credentials by order, with undefined orders at the end
    const sortedCreds = creds.sort((a, b) => {
      if (a.order === undefined && b.order === undefined) return 0
      if (a.order === undefined) return 1
      if (b.order === undefined) return -1
      return a.order - b.order
    })

    setCredentials(sortedCreds)
  }

  const updateCredentialOrder = async (
    credentialId: string,
    newOrder: number,
  ) => {
    try {
      await db.init()
      const credential = await db.get('credentials', credentialId)
      if (credential) {
        const updatedCredential = { ...credential, order: newOrder }
        await db.update('credentials', updatedCredential)
      }
    } catch (error) {
      console.error('Failed to update credential order:', error)
    }
  }

  const handleSetAsDefault = async (credentialId: string) => {
    const credentialIndex = credentials.findIndex((c) => c.id === credentialId)
    if (credentialIndex === -1 || credentialIndex === 0) return // Already default or not found

    // Update all credentials to shift their order
    for (let i = 0; i < credentials.length; i++) {
      let newOrder: number
      if (i < credentialIndex) {
        // Items before the moved item get +1 order
        newOrder = (credentials[i].order || i) + 1
      } else if (i === credentialIndex) {
        // The moved item becomes order 0 (first)
        newOrder = 0
      } else {
        // Items after remain the same
        newOrder = credentials[i].order || i
      }

      if (credentials[i].order !== newOrder) {
        await updateCredentialOrder(credentials[i].id, newOrder)
      }
    }

    // Reload credentials to reflect the new order
    await loadCredentials()
    successToast(t('Provider set as default'))
  }

  const handleAddCredential = async () => {
    if (!selectedProvider) {
      return
    }

    const providerConfig = PROVIDERS.find(
      (p) => p.provider === selectedProvider,
    )

    // For Ollama, API key is optional (it's actually the server URL)
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
      // Validate API key
      const isValid = await LLMService.validateApiKey(selectedProvider, apiKey)
      if (!isValid) {
        errorToast(t('Invalid API key'))
        setIsValidating(false)
        return
      }

      // For Ollama, use a dummy key if none provided
      const keyToEncrypt =
        apiKey || (providerConfig?.noApiKey ? 'ollama-no-key' : '')

      // Encrypt and store credential
      const { encrypted, iv, salt } =
        await SecureStorage.encryptCredential(keyToEncrypt)

      const credential: Credential = {
        id: `${selectedProvider}-${Date.now()}`,
        provider: selectedProvider,
        encryptedApiKey: encrypted,
        model,
        baseUrl:
          selectedProvider === 'custom'
            ? baseUrl
            : selectedProvider === 'ollama' && apiKey
              ? apiKey
              : undefined,
        timestamp: new Date(),
        order: credentials.length, // Set order to the end of the list
      }

      // Store additional encryption metadata
      localStorage.setItem(`${credential.id}-iv`, iv)
      localStorage.setItem(`${credential.id}-salt`, salt)

      await db.add('credentials', credential)
      await loadCredentials()

      // Reset form
      setApiKey('')
      setModel('')
      setBaseUrl('')
      onOpenChange()

      successToast(t('Credential added successfully'))
    } catch (error) {
      errorToast(t('Failed to add credential'))
      console.error(error)
    } finally {
      setIsValidating(false)
    }
  }

  const handleDeleteCredential = async (id: string) => {
    try {
      await db.delete('credentials', id)
      localStorage.removeItem(`${id}-iv`)
      localStorage.removeItem(`${id}-salt`)
      await loadCredentials()
      successToast(t('Credential deleted'))
    } catch (error) {
      errorToast(t('Failed to delete credential'))
    }
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
      setAvailableModels(config?.models || [])
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
          <Icon
            name={provider?.icon as any}
            className={`h-5 w-5 text-${provider?.color} dark:fill-white`}
          />
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
          <Chip size="sm" color={provider?.color as any}>
            {credential.provider}
          </Chip>
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
              title={t('General Settings')}
              subtitle={t('Configure your platform preferences')}
              startContent={<Icon name="Settings" className="h-5 w-5" />}
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
              title={t('LLM Providers')}
              subtitle={t('Manage your API credentials')}
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
              </div>
            </AccordionItem>

            <AccordionItem
              key="langfuse"
              title="Langfuse Integration"
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
            Advanced Settings
          </Title>
          <Accordion selectionMode="single" variant="bordered">
            <AccordionItem
              key="easysetup"
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
              title={t('Database Management')}
              subtitle={t('Export, import, or clear your local database')}
              startContent={<Icon name="Database" className="h-5 w-5" />}
              indicator={<Icon name="ArrowRight" className="h-4 w-4" />}
              onPress={() => navigate(url('/admin/database'))}
            />
          </Accordion>
        </Container>

        <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
          <ModalContent>
            {(onClose) => (
              <>
                <ModalHeader>{t('Add LLM Provider')}</ModalHeader>
                <ModalBody>
                  <div className="space-y-4">
                    <Select
                      label={t('Select Provider')}
                      defaultSelectedKeys={PROVIDERS[0].provider}
                      onChange={(e) =>
                        setSelectedProvider(e.target.value as LLMProvider)
                      }
                      startContent={
                        selectedProvider && (
                          <Icon
                            name={findProvider(selectedProvider)?.icon as any}
                            className="dark:fill-white"
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
                          startContent={
                            <Icon
                              name={provider.icon}
                              className="dark:fill-white"
                            />
                          }
                        >
                          {provider.name}
                        </SelectItem>
                      ))}
                    </Select>

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
                        type={providerConfig?.noApiKey ? 'text' : 'password'}
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

                    {providerConfig?.requiresBaseUrl && (
                      <Input
                        label={t('Base URL')}
                        placeholder={t('https://api.example.com/v1')}
                        value={baseUrl}
                        onChange={(e) => setBaseUrl(e.target.value)}
                        isRequired
                      />
                    )}

                    {/* Model Selection */}
                    {selectedProvider === 'ollama' && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="flat"
                            onPress={() =>
                              fetchAvailableModels(
                                'ollama',
                                apiKey || undefined,
                              )
                            }
                            isLoading={isFetchingModels}
                            startContent={
                              <Icon name="RefreshDouble" className="h-4 w-4" />
                            }
                          >
                            {t('Fetch Available Models')}
                          </Button>
                          {availableModels.length > 0 && (
                            <Button
                              size="sm"
                              variant="light"
                              onPress={() => setUseManualModel(!useManualModel)}
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
                            placeholder={t(
                              'Enter model name (e.g., llama2, mistral)',
                            )}
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

                    {selectedProvider !== 'ollama' &&
                      selectedProvider !== 'custom' && (
                        <Select
                          label={t('Model')}
                          placeholder={t('Select a model')}
                          value={model}
                          onChange={(e) => setModel(e.target.value)}
                          isRequired
                          isDisabled={providerConfig?.models.length === 0}
                        >
                          {providerConfig?.models.map((m) => (
                            <SelectItem key={m} textValue={m}>
                              {m}
                            </SelectItem>
                          )) || []}
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
                  </div>
                </ModalBody>
                <ModalFooter>
                  <Button color="danger" variant="light" onPress={onClose}>
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
