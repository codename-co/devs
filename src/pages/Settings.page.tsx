import { useEffect, useState } from 'react'
import {
  Button,
  Card,
  CardBody,
  Input,
  Select,
  SelectItem,
  Chip,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Tooltip,
  ButtonGroup,
} from '@heroui/react'
import { useI18n } from '@/i18n'
import DefaultLayout from '@/layouts/Default'
import type { HeaderProps, IconName } from '@/lib/types'
import { LLMProvider, Credential } from '@/types'
import { db } from '@/lib/db'
import { SecureStorage } from '@/lib/crypto'
import { LLMService } from '@/lib/llm'
import { Container, Icon, Section } from '@/components'
import { errorToast, successToast } from '@/lib/toast'

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
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)

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
      errorToast('Please fill in all required fields')
      return
    }

    setIsValidating(true)
    try {
      // Validate API key
      const isValid = await LLMService.validateApiKey(selectedProvider, apiKey)
      if (!isValid) {
        errorToast('Invalid API key')
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

      successToast('Credential added successfully')
    } catch (error) {
      errorToast('Failed to add credential')
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
      successToast('Credential deleted')
    } catch (error) {
      errorToast('Failed to delete credential')
    }
  }

  const handleUnlock = async () => {
    if (!masterPassword) return

    setIsUnlocking(true)
    try {
      SecureStorage.unlock(masterPassword)
      setMasterPassword('')
      successToast('Storage unlocked')
    } catch (error) {
      errorToast('Invalid password')
    } finally {
      setIsUnlocking(false)
    }
  }

  const handleExportDatabase = async () => {
    setIsExporting(true)
    try {
      await db.init()

      const dbData: Record<string, any> = {}
      const stores = [
        'agents',
        'workflows',
        'conversations',
        'knowledge',
        'credentials',
        'artifacts',
      ]

      for (const store of stores) {
        try {
          dbData[store] = await db.getAll(store as any)
        } catch (error) {
          console.warn(`Failed to export store ${store}:`, error)
          dbData[store] = []
        }
      }

      const dataBlob = new Blob([JSON.stringify(dbData, null, 2)], {
        type: 'application/json',
      })

      const url = URL.createObjectURL(dataBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = `devs-database-export-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      successToast('Database exported successfully')
    } catch (error) {
      errorToast('Failed to export database')
      console.error('Export error:', error)
    } finally {
      setIsExporting(false)
    }
  }

  const handleImportDatabase = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsImporting(true)
    try {
      const text = await file.text()
      const dbData = JSON.parse(text)

      await db.init()

      const stores = [
        'agents',
        'workflows',
        'conversations',
        'knowledge',
        'credentials',
        'artifacts',
      ]
      let importedCount = 0

      for (const store of stores) {
        if (dbData[store] && Array.isArray(dbData[store])) {
          for (const item of dbData[store]) {
            try {
              await db.add(store as any, item)
              importedCount++
            } catch (error) {
              console.warn(`Failed to import item in ${store}:`, error)
            }
          }
        }
      }

      await loadCredentials()
      successToast(`Database imported successfully (${importedCount} items)`)
    } catch (error) {
      errorToast('Failed to import database - invalid file format')
      console.error('Import error:', error)
    } finally {
      setIsImporting(false)
      event.target.value = ''
    }
  }

  const handleClearDatabase = async () => {
    if (
      !confirm(
        'Are you sure you want to clear all data? This action cannot be undone.',
      )
    ) {
      return
    }

    try {
      await db.init()

      const stores = [
        'agents',
        'workflows',
        'conversations',
        'knowledge',
        'credentials',
        'artifacts',
      ]

      for (const store of stores) {
        try {
          const items = await db.getAll(store as any)
          for (const item of items) {
            await db.delete(store as any, (item as any).id)
          }
        } catch (error) {
          console.warn(`Failed to clear store ${store}:`, error)
        }
      }

      await loadCredentials()
      successToast('Database cleared successfully')
    } catch (error) {
      errorToast('Failed to clear database')
      console.error('Clear error:', error)
    }
  }

  const providerConfig = PROVIDERS.find((p) => p.provider === selectedProvider)

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
                    Secure storage is locked
                  </p>
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
          </Container>
        )}

        <Container>
          {/* <Card>
          <CardHeader className="flex justify-between items-center"> */}
          <div className="flex justify-between items-center">
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
          </div>
          {/* </CardHeader>
          <CardBody> */}
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
                        <p className="text-sm text-default-500">{cred.model}</p>
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
          {/* </CardBody>
        </Card> */}
        </Container>

        <Container>
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">Database Management</h3>
              <p className="text-sm text-default-500">
                Export, import, or clear your local database
              </p>
            </div>
          </div>

          <input
            type="file"
            accept=".json"
            onChange={handleImportDatabase}
            style={{ display: 'none' }}
            id="import-file-input"
          />

          <ButtonGroup>
            <Tooltip content="Dump your entire database to a JSON file">
              <Button
                variant="flat"
                onPress={handleExportDatabase}
                isLoading={isExporting}
                startContent={
                  <Icon name="ArrowRight" className="h-4 w-4 rotate-90" />
                }
              >
                Backup database
              </Button>
            </Tooltip>
            <Tooltip content="Restore your database from a JSON file">
              <Button
                variant="flat"
                onPress={() =>
                  document.getElementById('import-file-input')?.click()
                }
                isLoading={isImporting}
                startContent={
                  <Icon name="ArrowRight" className="h-4 w-4 -rotate-90" />
                }
              >
                Restore database
              </Button>
            </Tooltip>
            <Tooltip content="Clear all data from the database">
              <Button
                variant="flat"
                color="danger"
                onPress={handleClearDatabase}
                startContent={<Icon name="Trash" className="h-4 w-4" />}
              >
                Clear database
              </Button>
            </Tooltip>
          </ButtonGroup>
        </Container>

        <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
          <ModalContent>
            {(onClose) => (
              <>
                <ModalHeader>Add LLM Provider</ModalHeader>
                <ModalBody>
                  <div className="space-y-4">
                    <Select
                      label="Select Provider"
                      defaultSelectedKeys={PROVIDERS[0].provider}
                      onChange={(e) =>
                        setSelectedProvider(e.target.value as LLMProvider)
                      }
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
                        <SelectItem key={m} textValue={m}>
                          {m}
                        </SelectItem>
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
      </Section>
    </DefaultLayout>
  )
}
