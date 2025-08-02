import { useEffect, useState } from 'react'
import {
  addToast,
  Button,
  Card,
  CardBody,
  CardHeader,
  Input,
  Select,
  SelectItem,
  Tab,
  Tabs,
  Chip,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
} from '@heroui/react'
import { useI18n } from '@/i18n'
import DefaultLayout from '@/layouts/Default'
import type { HeaderProps, IconName } from '@/lib/types'
import { LLMProvider, Credential } from '@/types'
import { db } from '@/lib/db'
import { SecureStorage } from '@/lib/crypto'
import { LLMService } from '@/lib/llm'
import { Icon } from '@/components'

interface ProviderConfig {
  provider: LLMProvider
  name: string
  models: string[]
  icon: IconName
  color: string
  requiresBaseUrl?: boolean
  apiKeyFormat?: string
  apiKeyPlaceholder?: string
  noApiKey?: boolean
}

const PROVIDERS: ProviderConfig[] = [
  {
    provider: 'ollama',
    name: 'Ollama',
    models: [
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
    models: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'],
    icon: 'OpenAI',
    color: 'success',
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
  },
  {
    provider: 'google',
    name: 'Google AI',
    models: ['gemini-pro', 'gemini-pro-vision'],
    icon: 'Google',
    color: 'secondary',
  },
  {
    provider: 'vertex-ai',
    name: 'Google Vertex AI',
    models: ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-1.0-pro'],
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
    provider: 'litellm',
    name: 'LiteLLM Gateway',
    models: ['gpt-3.5-turbo', 'claude-2', 'command-nightly'],
    icon: 'Server',
    color: 'success',
    noApiKey: true,
    apiKeyPlaceholder: 'http://localhost:4000 (optional API key)',
    requiresBaseUrl: false,
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
  const { t } = useI18n()
  const { isOpen, onOpen, onOpenChange } = useDisclosure()
  const [credentials, setCredentials] = useState<Credential[]>([])
  const [selectedProvider, setSelectedProvider] =
    useState<LLMProvider>('openai')
  const [apiKey, setApiKey] = useState('')
  const [model, setModel] = useState('')
  const [baseUrl, setBaseUrl] = useState('')
  const [isValidating, setIsValidating] = useState(false)
  const [masterPassword, setMasterPassword] = useState('')
  const [isUnlocking, setIsUnlocking] = useState(false)

  const header: HeaderProps = {
    color: 'bg-default-50',
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
  }, [])

  const initializeSecurity = async () => {
    await SecureStorage.init()
  }

  const loadCredentials = async () => {
    await db.init()
    const creds = await db.getAll('credentials')
    setCredentials(creds)
  }

  const handleAddCredential = async () => {
    const providerConfig = PROVIDERS.find(
      (p) => p.provider === selectedProvider,
    )

    // For Ollama, API key is optional (it's actually the server URL)
    if (
      (!apiKey && !providerConfig?.noApiKey) ||
      !model ||
      (selectedProvider === 'custom' && !baseUrl)
    ) {
      addToast({
        title: 'Error',
        description: 'Please fill in all required fields',
        severity: 'danger',
      })
      return
    }

    setIsValidating(true)
    try {
      // Validate API key
      const isValid = await LLMService.validateApiKey(selectedProvider, apiKey)
      if (!isValid) {
        addToast({
          title: 'Error',
          description: 'Invalid API key',
          severity: 'danger',
        })
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

      addToast({
        title: 'Success',
        description: 'Credential added successfully',
        severity: 'success',
      })
    } catch (error) {
      addToast({
        title: 'Error',
        description: 'Failed to add credential',
        severity: 'danger',
      })
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
      addToast({
        title: 'Success',
        description: 'Credential deleted',
        severity: 'success',
      })
    } catch (error) {
      addToast({
        title: 'Error',
        description: 'Failed to delete credential',
        severity: 'danger',
      })
    }
  }

  const handleUnlock = async () => {
    if (!masterPassword) return

    setIsUnlocking(true)
    try {
      SecureStorage.unlock(masterPassword)
      setMasterPassword('')
      addToast({
        title: 'Success',
        description: 'Storage unlocked',
        severity: 'success',
      })
    } catch (error) {
      addToast({
        title: 'Error',
        description: 'Invalid password',
        severity: 'danger',
      })
    } finally {
      setIsUnlocking(false)
    }
  }

  const providerConfig = PROVIDERS.find((p) => p.provider === selectedProvider)

  return (
    <DefaultLayout title={t('Settings')} header={header}>
      <div className="space-y-6">
        {SecureStorage.isLocked() && (
          <Card>
            <CardBody className="flex flex-row items-center gap-4">
              <Icon name="Lock" className="h-5 w-5 text-warning" />
              <div className="flex-1">
                <p className="text-sm font-medium">Secure storage is locked</p>
                <p className="text-xs text-default-500">
                  Enter your master password to unlock
                </p>
              </div>
              <Input
                type="password"
                placeholder="Master password"
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
                Unlock
              </Button>
            </CardBody>
          </Card>
        )}

        <Card>
          <CardHeader className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">LLM Providers</h3>
              <p className="text-sm text-default-500">
                Manage your API credentials
              </p>
            </div>
            <Button
              color="primary"
              size="sm"
              startContent={<Icon name="Plus" className="h-4 w-4" />}
              onPress={onOpen}
              isDisabled={SecureStorage.isLocked()}
            >
              Add Provider
            </Button>
          </CardHeader>
          <CardBody>
            <div className="space-y-3">
              {credentials.length === 0 ? (
                <p className="text-center text-default-500 py-8">
                  No providers configured. Add one to get started.
                </p>
              ) : (
                credentials.map((cred) => {
                  const provider = PROVIDERS.find(
                    (p) => p.provider === cred.provider,
                  )
                  return (
                    <div
                      key={cred.id}
                      className="flex items-center justify-between p-4 bg-default-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <Icon
                          name={provider?.icon as any}
                          className={`h-5 w-5 text-${provider?.color}`}
                        />
                        <div>
                          <p className="font-medium">{provider?.name}</p>
                          <p className="text-sm text-default-500">
                            {cred.model}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Chip size="sm" color={provider?.color as any}>
                          {cred.provider}
                        </Chip>
                        <Button
                          isIconOnly
                          size="sm"
                          variant="light"
                          color="danger"
                          onPress={() => handleDeleteCredential(cred.id)}
                        >
                          <Icon name="Trash" className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </CardBody>
        </Card>

        <Modal isOpen={isOpen} onOpenChange={onOpenChange} placement="center">
          <ModalContent>
            {(onClose) => (
              <>
                <ModalHeader>Add LLM Provider</ModalHeader>
                <ModalBody>
                  <div className="space-y-4">
                    <Tabs
                      selectedKey={selectedProvider}
                      onSelectionChange={(key) =>
                        setSelectedProvider(key as LLMProvider)
                      }
                    >
                      {PROVIDERS.map((provider) => (
                        <Tab
                          key={provider.provider}
                          title={
                            <div className="flex items-center gap-2">
                              <Icon
                                name={provider.icon as any}
                                className="h-4 w-4"
                              />
                              {provider.name}
                            </div>
                          }
                        />
                      ))}
                    </Tabs>

                    <div>
                      <Input
                        label={
                          providerConfig?.noApiKey
                            ? 'Server URL (Optional)'
                            : 'API Key'
                        }
                        placeholder={
                          providerConfig?.apiKeyPlaceholder ||
                          'Enter your API key'
                        }
                        type={providerConfig?.noApiKey ? 'text' : 'password'}
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        isRequired={!providerConfig?.noApiKey}
                      />
                      {providerConfig?.apiKeyFormat && (
                        <p className="text-xs text-default-500 mt-1">
                          Format: {providerConfig.apiKeyFormat}
                        </p>
                      )}
                    </div>

                    {providerConfig?.requiresBaseUrl && (
                      <Input
                        label="Base URL"
                        placeholder="https://api.example.com/v1"
                        value={baseUrl}
                        onChange={(e) => setBaseUrl(e.target.value)}
                        isRequired
                      />
                    )}

                    <Select
                      label="Model"
                      placeholder="Select a model"
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      isRequired
                      isDisabled={providerConfig?.models.length === 0}
                    >
                      {providerConfig?.models.map((m) => (
                        <SelectItem key={m}>{m}</SelectItem>
                      )) || []}
                    </Select>

                    {providerConfig?.provider === 'custom' && (
                      <Input
                        label="Custom Model Name"
                        placeholder="Enter model name"
                        value={model}
                        onChange={(e) => setModel(e.target.value)}
                      />
                    )}
                  </div>
                </ModalBody>
                <ModalFooter>
                  <Button color="danger" variant="light" onPress={onClose}>
                    Cancel
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
                    Validate & Add
                  </Button>
                </ModalFooter>
              </>
            )}
          </ModalContent>
        </Modal>
      </div>
    </DefaultLayout>
  )
}
