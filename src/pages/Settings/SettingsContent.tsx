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
  Select,
  SelectItem,
  Textarea,
  Tooltip,
  Switch,
} from '@heroui/react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useI18n, useUrl, languages, type Lang } from '@/i18n'
import { LLMProvider, Credential } from '@/types'
import {
  langfuseConfig as langfuseConfigMap,
  LangfuseConfigEntry,
} from '@/lib/yjs/maps'
import { SecureStorage } from '@/lib/crypto'
import { Container, Icon, Title } from '@/components'
import { useAddLLMProviderModal } from '@/components/AddLLMProviderModal'
import { errorToast, successToast } from '@/lib/toast'
import { userSettings } from '@/stores/userStore'
import { useLLMModelStore } from '@/stores/llmModelStore'
import { PRODUCT } from '@/config/product'
import { useBackgroundImage } from '@/hooks/useBackgroundImage'
import { useHashHighlight } from '@/hooks/useHashHighlight'
import {
  getCacheInfo,
  clearModelCache,
  type CacheInfo,
} from '@/lib/llm/cache-manager'
import localI18n from './i18n'
import { formatBytes } from '@/lib/format'
import { PROVIDERS } from './providers'

interface SettingsContentProps {
  isModal?: boolean
}

export const SettingsContent = ({ isModal = false }: SettingsContentProps) => {
  const { lang, t, url } = useI18n(localI18n)
  const navigate = useNavigate()
  const location = useLocation()
  const openAddProviderModal = useAddLLMProviderModal((state) => state.open)
  const { handleImageFile, setBackgroundImage } = useBackgroundImage()

  // Use the LLM Model Store
  const credentials = useLLMModelStore((state) => state.credentials)
  const loadCredentials = useLLMModelStore((state) => state.loadCredentials)
  const deleteCredential = useLLMModelStore((state) => state.deleteCredential)
  const setAsDefault = useLLMModelStore((state) => state.setAsDefault)

  const [masterPassword, setMasterPassword] = useState('')
  const [isUnlocking, setIsUnlocking] = useState(false)
  const [masterKey, setMasterKey] = useState<string | null>(null)
  const [isRegeneratingKey, setIsRegeneratingKey] = useState(false)
  const [cacheInfo, setCacheInfo] = useState<CacheInfo | null>(null)
  const [isClearingCache, setIsClearingCache] = useState(false)

  // Langfuse state
  const [langfuseConfig, setLangfuseConfig] =
    useState<LangfuseConfigEntry | null>(null)
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
  const speechToTextEnabled = userSettings((state) => state.speechToTextEnabled)
  const setSpeechToTextEnabled = userSettings(
    (state) => state.setSpeechToTextEnabled,
  )
  const hideDefaultAgents = userSettings((state) => state.hideDefaultAgents)
  const setHideDefaultAgents = userSettings(
    (state) => state.setHideDefaultAgents,
  )
  const autoMemoryLearning = userSettings(
    (state) => state.autoMemoryLearning ?? false,
  )
  const setAutoMemoryLearning = userSettings(
    (state) => state.setAutoMemoryLearning,
  )
  const globalSystemInstructions = userSettings(
    (state) => state.globalSystemInstructions ?? '',
  )
  const setGlobalSystemInstructions = userSettings(
    (state) => state.setGlobalSystemInstructions,
  )

  // Define valid accordion keys for each section
  const mainAccordionKeys = [
    'general',
    'providers',
    'conversational',
    'security',
  ]
  const advancedAccordionKeys = ['langfuse', 'easysetup', 'traces', 'database']

  // Use the hash highlight hook for element-level deep linking
  // Hash format: #section or #section/element
  const { activeSection, getHighlightClasses } = useHashHighlight()

  // Accordion selection state based on URL hash
  const [mainSelectedKeys, setMainSelectedKeys] = useState<Set<string>>(
    new Set(),
  )
  const [advancedSelectedKeys, setAdvancedSelectedKeys] = useState<Set<string>>(
    new Set(),
  )

  // Sync accordion state with active section from hash
  useEffect(() => {
    if (!activeSection) {
      setMainSelectedKeys(new Set())
      setAdvancedSelectedKeys(new Set())
      return
    }

    if (mainAccordionKeys.includes(activeSection)) {
      setMainSelectedKeys(new Set([activeSection]))
      setAdvancedSelectedKeys(new Set())
    } else if (advancedAccordionKeys.includes(activeSection)) {
      setMainSelectedKeys(new Set())
      setAdvancedSelectedKeys(new Set([activeSection]))
    }
  }, [activeSection])

  // Handle main accordion selection change
  const handleMainSelectionChange = (keys: 'all' | Set<React.Key>) => {
    if (keys === 'all') return
    const newKeys = new Set(Array.from(keys).map(String))
    setMainSelectedKeys(newKeys)
    setAdvancedSelectedKeys(new Set())

    // Update URL hash
    const selectedKey = Array.from(newKeys)[0]
    if (selectedKey) {
      navigate(`${location.pathname}#${selectedKey}`, { replace: true })
    } else {
      navigate(location.pathname, { replace: true })
    }
  }

  // Handle advanced accordion selection change
  const handleAdvancedSelectionChange = (keys: 'all' | Set<React.Key>) => {
    if (keys === 'all') return
    const newKeys = new Set(Array.from(keys).map(String))
    setAdvancedSelectedKeys(newKeys)
    setMainSelectedKeys(new Set())

    // Update URL hash
    const selectedKey = Array.from(newKeys)[0]
    if (selectedKey) {
      navigate(`${location.pathname}#${selectedKey}`, { replace: true })
    } else {
      navigate(location.pathname, { replace: true })
    }
  }

  const handleLanguageChange = (newLanguage: Lang) => {
    setLanguage(newLanguage)
    if (!isModal) {
      const newUrl = useUrl(newLanguage)
      const settingsPath = newUrl('/settings')
      // Preserve hash when navigating to new language
      navigate(settingsPath + location.hash)
    }
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

  const initializeSecurity = async () => {
    await SecureStorage.init()
  }

  const loadMasterKey = () => {
    const key = SecureStorage.getMasterKey()
    setMasterKey(key)
  }

  const loadLangfuseConfig = async () => {
    try {
      const configs = Array.from(langfuseConfigMap.values())
      const config = configs[0]

      if (config) {
        setLangfuseConfig(config)
        setLangfuseHost(config.host)
        setLangfusePublicKey(config.publicKey)
        setLangfuseEnabled(config.enabled)

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
      const { encrypted, iv, salt } =
        await SecureStorage.encryptCredential(langfuseSecretKey)

      const config: LangfuseConfigEntry = {
        id: langfuseConfig?.id || `langfuse-${Date.now()}`,
        host: langfuseHost,
        publicKey: langfusePublicKey,
        encryptedSecretKey: encrypted,
        enabled: langfuseEnabled,
        timestamp: new Date(),
      }

      localStorage.setItem(`${config.id}-iv`, iv)
      localStorage.setItem(`${config.id}-salt`, salt)

      if (langfuseConfig) {
        langfuseConfigMap.set(config.id, config)
      } else {
        langfuseConfigMap.set(config.id, config)
      }

      setLangfuseConfig(config)

      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'LANGFUSE_CONFIG_UPDATED',
        })
      }

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
      langfuseConfigMap.delete(langfuseConfig.id)
      localStorage.removeItem(`${langfuseConfig.id}-iv`)
      localStorage.removeItem(`${langfuseConfig.id}-salt`)

      setLangfuseConfig(null)
      setLangfuseHost('')
      setLangfusePublicKey('')
      setLangfuseSecretKey('')
      setLangfuseEnabled(false)

      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'LANGFUSE_CONFIG_UPDATED',
        })
      }

      const { LangfuseService } = await import('@/lib/langfuse-service')
      await LangfuseService.reinitialize()

      successToast('Langfuse configuration deleted')
    } catch (error) {
      console.error('Failed to delete Langfuse configuration:', error)
      errorToast('Failed to delete Langfuse configuration')
    }
  }

  const handleCopyMasterKey = async () => {
    // Non-extractable keys cannot be copied - this is now a security feature
    successToast(
      t(
        'Your encryption key is stored securely and cannot be extracted for maximum security',
      ),
    )
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

  const handleModalOpen = () => {
    openAddProviderModal()
  }

  const findProvider = (provider: LLMProvider) =>
    PROVIDERS(lang, t).find((p) => p.provider === provider)

  const CredentialCard = ({
    credential,
    index,
  }: {
    credential: Credential
    index: number
  }) => {
    const provider = findProvider(credential.provider)
    const isDefault = index === 0
    const providerModels = provider?.models || []
    const modelCount =
      providerModels instanceof Promise
        ? '...'
        : Array.isArray(providerModels)
          ? providerModels.length
          : 0

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
            <p className="text-sm text-default-500">
              {modelCount} {t('models available')}
            </p>
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
    <>
      {SecureStorage.isLocked() && (
        <Container className={isModal ? 'px-4' : ''}>
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

      <Container className={isModal ? 'px-4' : ''}>
        {/* LLM Providers - Most important, users need this first */}
        <Accordion
          selectionMode="single"
          variant="bordered"
          selectedKeys={mainSelectedKeys}
          onSelectionChange={handleMainSelectionChange}
        >
          {/* Settings - Platform personalization options */}
          <AccordionItem
            key="general"
            data-testid="general-settings"
            title={t('Settings')}
            subtitle={t('Make the platform your own')}
            startContent={<Icon name="Settings" className="h-5 w-7" />}
            classNames={{ content: 'pl-8 mb-4' }}
          >
            <div className="space-y-6 p-2">
              <Select
                id="interface-language"
                label={t('Interface Language')}
                selectedKeys={[lang]}
                onSelectionChange={(keys) => {
                  const selectedLang = Array.from(keys)[0] as Lang
                  if (selectedLang && selectedLang !== lang) {
                    handleLanguageChange(selectedLang)
                  }
                }}
                className={getHighlightClasses(
                  'interface-language',
                  'max-w-xs mr-3',
                )}
              >
                {Object.entries(languages).map(([key, name]) => (
                  <SelectItem key={key} textValue={name}>
                    {name}
                  </SelectItem>
                ))}
              </Select>

              <Select
                id="theme"
                label={t('Theme')}
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
                className={getHighlightClasses('theme', 'max-w-xs mr-3')}
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
                id="platform-name"
                label={t('Platform Name')}
                placeholder={PRODUCT.displayName}
                value={platformName || ''}
                onChange={(e) => setPlatformName(e.target.value)}
                className={getHighlightClasses(
                  'platform-name',
                  'max-w-xs mr-3',
                )}
              />

              <div
                id="background-image"
                className={getHighlightClasses('background-image', 'p-2 -m-2')}
              >
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
                    startContent={<Icon name="PagePlus" className="h-4 w-4" />}
                    onPress={() =>
                      document.getElementById('background-image-input')?.click()
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
            startContent={<Icon name="Brain" className="h-5 w-7" />}
            classNames={{ content: 'pl-8 mb-4' }}
          >
            <div className="space-y-4 p-2">
              <div
                id="add-provider"
                className={getHighlightClasses(
                  'add-provider',
                  'flex justify-end p-2 -m-2',
                )}
              >
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

          {/* Conversational Features */}
          <AccordionItem
            key="conversational"
            data-testid="conversational-settings"
            title={t('Conversational Features')}
            subtitle={t('Configure how you interact with agents')}
            startContent={<Icon name="ChatBubble" className="h-5 w-7" />}
            classNames={{ content: 'pl-8 mb-4' }}
          >
            <div className="space-y-6 p-2">
              <div
                id="speech-to-text"
                className={getHighlightClasses(
                  'speech-to-text',
                  'max-w-xs mr-3 p-2 -m-2',
                )}
              >
                <Switch
                  isSelected={speechToTextEnabled}
                  onChange={(e) => setSpeechToTextEnabled(e.target.checked)}
                  size="sm"
                >
                  {t('Enable Speech-to-Text')}
                </Switch>
                <p className="text-xs text-default-500 mt-1 ml-7">
                  {t(
                    'Allow voice input using your device microphone in the prompt area',
                  )}
                </p>
              </div>

              <div
                id="auto-memory-learning"
                className={getHighlightClasses(
                  'auto-memory-learning',
                  'max-w-xs mr-3 p-2 -m-2',
                )}
              >
                <Switch
                  isSelected={autoMemoryLearning}
                  onChange={(e) => setAutoMemoryLearning(e.target.checked)}
                  size="sm"
                >
                  {t('Auto Memory Learning')}
                </Switch>
                <p className="text-xs text-default-500 mt-1 ml-7">
                  {t(
                    'Automatically extract learnable information from conversations to build agent memory',
                  )}
                </p>
              </div>

              <div
                id="hide-default-agents"
                className={getHighlightClasses(
                  'hide-default-agents',
                  'max-w-xs mr-3 p-2 -m-2',
                )}
              >
                <Switch
                  isSelected={hideDefaultAgents}
                  onChange={(e) => setHideDefaultAgents(e.target.checked)}
                  size="sm"
                >
                  {t('Hide Default Agents')}
                </Switch>
                <p className="text-xs text-default-500 mt-1 ml-7">
                  {t(
                    'Only show your custom agents in the agent picker and agents page',
                  )}
                </p>
              </div>

              <div
                id="global-system-instructions"
                className={getHighlightClasses(
                  'global-system-instructions',
                  'mr-3 p-2 -m-2',
                )}
              >
                <label className="text-sm font-medium text-default-600">
                  {t('Global System Instructions')}
                </label>
                <p className="text-xs text-default-500 mb-2">
                  {t(
                    "These instructions will be prepended to every agent's instructions",
                  )}
                </p>
                <Textarea
                  placeholder={t(
                    'Enter global instructions that apply to all agents...',
                  )}
                  value={globalSystemInstructions}
                  onChange={(e) =>
                    setGlobalSystemInstructions(e.target.value || undefined)
                  }
                  minRows={3}
                  maxRows={10}
                  className="max-w-xl"
                />
              </div>
            </div>
          </AccordionItem>

          {/* Security - Secure Storage */}
          <AccordionItem
            key="security"
            data-testid="security-settings"
            title={t('Secure Storage')}
            subtitle={t('Manage your encryption keys and secure storage')}
            startContent={<Icon name="Lock" className="h-5 w-7" />}
            classNames={{ content: 'pl-8 mb-4' }}
          >
            <div className="space-y-4 p-2">
              <p className="text-sm text-default-500 mb-3">
                {t(
                  'Your encryption key is stored securely using non-extractable browser cryptography. The key cannot be read or exported—it can only be used for encryption operations.',
                )}
              </p>

              <div
                id="master-key"
                className={getHighlightClasses(
                  'master-key',
                  'flex flex-col gap-3 p-2 -m-2',
                )}
              >
                <div className="flex items-center gap-2">
                  <Input
                    label={t('Encryption Key Status')}
                    value={
                      masterKey
                        ? t('Secure (Non-extractable)')
                        : t('Not initialized')
                    }
                    readOnly
                    className="flex-1"
                    startContent={
                      <Icon
                        name={masterKey ? 'CheckCircle' : 'WarningCircle'}
                        className={`h-4 w-4 ${masterKey ? 'text-success' : 'text-warning'}`}
                      />
                    }
                    endContent={
                      <div className="flex gap-1">
                        <Tooltip
                          content={t(
                            'Non-extractable keys provide maximum security - they cannot be stolen even if an attacker gains access to your browser',
                          )}
                        >
                          <Button
                            isIconOnly
                            size="sm"
                            variant="light"
                            onPress={handleCopyMasterKey}
                          >
                            <Icon name="InfoCircle" className="h-4 w-4" />
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

        {/* Advanced Settings Section */}
        <Title size="xl" className="text-gray-500 mt-6">
          {t('Advanced Settings')}
        </Title>

        <Accordion
          selectionMode="single"
          variant="bordered"
          selectedKeys={advancedSelectedKeys}
          onSelectionChange={handleAdvancedSelectionChange}
        >
          {/* Integrations - Langfuse */}
          <AccordionItem
            key="langfuse"
            data-testid="langfuse-integration"
            title={
              <>
                Langfuse Integration
                <Chip size="sm" variant="flat" className="ml-2 align-middle">
                  Beta
                </Chip>
              </>
            }
            subtitle="Configure Langfuse for LLM request tracking and analytics"
            startContent={<Icon name="Langfuse" className="h-5 w-7" />}
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
                        startContent={<Icon name="Trash" className="h-4 w-4" />}
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

          {/* <AccordionItem
            key="easysetup"
            data-testid="easy-setup"
            title={t('Share the platform')}
            subtitle={t(
              'Export the platform settings to another device or share it with others',
            )}
            startContent={<Icon name="Share" className="h-5 w-7" />}
            classNames={{ content: 'pl-8 mb-4' }}
          >
            <EasySetupExport />
          </AccordionItem> */}

          <AccordionItem
            key="traces"
            data-testid="traces"
            title={t('Traces and Metrics')}
            subtitle={t('Observe and analyze traces and metrics')}
            startContent={<Icon name="Activity" className="h-5 w-7" />}
            indicator={<Icon name="ArrowRight" className="h-4 w-4" />}
            onPress={() => navigate(url('/traces'))}
          />

          <AccordionItem
            key="database"
            data-testid="database-management"
            title={t('Database Management')}
            subtitle={t('Export, import, or clear your local database')}
            startContent={<Icon name="Database" className="h-5 w-7" />}
            indicator={<Icon name="ArrowRight" className="h-4 w-4" />}
            onPress={() => navigate(url('/admin/database'))}
          />
        </Accordion>
      </Container>
    </>
  )
}
