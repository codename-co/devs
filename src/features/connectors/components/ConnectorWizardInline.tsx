/**
 * ConnectorWizardInline Component
 *
 * Inline (non-modal) version of the ConnectorWizard for embedding
 * within the Settings modal. Same 4-step wizard flow:
 * Provider Selection → OAuth → Folder Selection → Success
 */

import { useState, useCallback, useEffect } from 'react'
import { Button, Progress } from '@heroui/react'
import { useI18n } from '@/i18n'
import { useConnectorStore } from '../stores'
import { useOAuth } from '@/hooks/useOAuth'
import { SecureStorage } from '@/lib/crypto'
import { ProviderGrid } from './ConnectorWizard/ProviderGrid'
import { OAuthStep } from './ConnectorWizard/OAuthStep'
import { FolderPicker } from './ConnectorWizard/FolderPicker'
import { SuccessStep } from './ConnectorWizard/SuccessStep'
import { getProvider } from '../providers/apps'
import { storeEncryptionMetadata } from '../connector-provider'
import { SyncEngine } from '../sync-engine'
import type {
  AppConnectorProvider,
  ConnectorCategory,
  OAuthResult,
  AccountInfo,
} from '../types'
import localI18n from '../pages/i18n'
import { useSettingsLabel } from '@/pages/Settings/SettingsContext'

// =============================================================================
// Types
// =============================================================================

type WizardStep = 'select' | 'auth' | 'folders' | 'success'

interface ConnectorWizardInlineProps {
  category: ConnectorCategory
  initialProvider?: AppConnectorProvider | null
  onClose: () => void
}

const STEPS: { key: WizardStep; label: string }[] = [
  { key: 'select', label: 'Select' },
  { key: 'auth', label: 'Connect' },
  { key: 'folders', label: 'Folders' },
  { key: 'success', label: 'Done' },
]

// =============================================================================
// Component
// =============================================================================

export function ConnectorWizardInline({
  category,
  initialProvider = null,
  onClose,
}: ConnectorWizardInlineProps) {
  const { t } = useI18n(localI18n)
  const { addConnector } = useConnectorStore()

  // Wizard state
  const [step, setStep] = useState<WizardStep>(
    initialProvider ? 'auth' : 'select',
  )
  const [selectedProvider, setSelectedProvider] =
    useState<AppConnectorProvider | null>(initialProvider)
  const [oauthResult, setOauthResult] = useState<OAuthResult | null>(null)
  const [accountInfo, setAccountInfo] = useState<AccountInfo | null>(null)
  const [selectedFolders, setSelectedFolders] = useState<string[] | null>(null)
  const [connectorId, setConnectorId] = useState<string | null>(null)
  const [hasRefreshToken, setHasRefreshToken] = useState<boolean>(true)

  // OAuth hook
  const oauth = useOAuth(selectedProvider)

  // Calculate progress percentage
  const currentStepIndex = STEPS.findIndex((s) => s.key === step)
  const progressValue = ((currentStepIndex + 1) / STEPS.length) * 100

  // Get step title
  const getStepTitle = useCallback(() => {
    switch (step) {
      case 'select':
        return t('Add Connector')
      case 'auth':
        return selectedProvider
          ? t('Connect {name}', {
              name: getProvider(selectedProvider)?.name || selectedProvider,
            })
          : t('Connecting...')
      case 'folders':
        return t('Select Folders')
      case 'success':
        return t('Connected!')
      default:
        return t('Add Connector')
    }
  }, [step, selectedProvider, t])

  const title = getStepTitle()

  // Push the dynamic step title into the Settings header breadcrumb
  useSettingsLabel(title)

  // Handle provider selection
  const handleProviderSelect = useCallback((provider: AppConnectorProvider) => {
    setSelectedProvider(provider)
    setStep('auth')
  }, [])

  // Handle OAuth retry
  const handleOAuthRetry = useCallback(() => {
    oauth.reset()
  }, [oauth])

  // Create connector with encrypted tokens
  const createConnector = useCallback(
    async (
      provider: AppConnectorProvider,
      result: OAuthResult,
      info: AccountInfo | null,
      folderIds: string[] | null,
      enableSync: boolean = true,
    ) => {
      try {
        await SecureStorage.init()

        const {
          encrypted: encryptedToken,
          iv,
          salt,
        } = await SecureStorage.encryptCredential(result.accessToken)

        let encryptedRefreshToken: string | undefined
        let refreshIv: string | undefined
        let refreshSalt: string | undefined
        if (result.refreshToken) {
          const refreshResult = await SecureStorage.encryptCredential(
            result.refreshToken,
          )
          encryptedRefreshToken = refreshResult.encrypted
          refreshIv = refreshResult.iv
          refreshSalt = refreshResult.salt
        }

        const tokenExpiresAt = result.expiresIn
          ? new Date(Date.now() + result.expiresIn * 1000)
          : undefined

        const providerSyncSupported =
          getProvider(provider)?.syncSupported !== false

        const id = await addConnector({
          category: 'app',
          provider,
          name: getProvider(provider)?.name || provider,
          encryptedToken,
          encryptedRefreshToken,
          tokenExpiresAt,
          scopes: result.scope?.split(' ') || [],
          accountId: info?.id,
          accountEmail: info?.email,
          accountPicture: info?.picture,
          syncEnabled: providerSyncSupported && enableSync,
          syncFolders: folderIds || undefined,
          status: 'connected',
        })

        storeEncryptionMetadata(id, iv, salt, false)
        if (refreshIv && refreshSalt) {
          storeEncryptionMetadata(id, refreshIv, refreshSalt, true)
        }

        return id
      } catch (error) {
        console.error('Failed to create connector:', error)
        throw error
      }
    },
    [addConnector],
  )

  // Handle OAuth success
  const handleOAuthSuccess = useCallback(
    async (result: OAuthResult, info: AccountInfo | null) => {
      setOauthResult(result)
      setAccountInfo(info)
      setHasRefreshToken(!!result.refreshToken)

      const providerConfig = selectedProvider
        ? getProvider(selectedProvider)
        : null
      const providerSyncSupported = providerConfig?.syncSupported !== false

      if (providerSyncSupported) {
        setStep('folders')
      } else {
        if (selectedProvider) {
          try {
            const id = await createConnector(
              selectedProvider,
              result,
              info,
              null,
            )
            setSelectedFolders(null)
            setConnectorId(id)
            setStep('success')
          } catch {
            // Error already logged in createConnector
          }
        }
      }
    },
    [selectedProvider, createConnector],
  )

  // Handle folder selection and create connector
  const handleFolderSelect = useCallback(
    async (folderIds: string[] | null, enableSync: boolean = true) => {
      if (!selectedProvider || !oauthResult) return

      try {
        const id = await createConnector(
          selectedProvider,
          oauthResult,
          accountInfo,
          folderIds,
          enableSync,
        )
        setSelectedFolders(folderIds)
        setConnectorId(id)
        setStep('success')
      } catch {
        // Error already logged in createConnector
      }
    },
    [selectedProvider, oauthResult, accountInfo, createConnector],
  )

  // Handle folder skip
  const handleFolderSkip = useCallback(() => {
    handleFolderSelect(null, false)
  }, [handleFolderSelect])

  // Handle start sync
  const handleStartSync = useCallback(async () => {
    if (connectorId) {
      onClose()
      try {
        await SyncEngine.sync(connectorId)
      } catch (error) {
        console.error('Failed to start sync:', error)
      }
    } else {
      onClose()
    }
  }, [connectorId, onClose])

  // Handle back navigation
  const handleBack = useCallback(() => {
    switch (step) {
      case 'select':
        onClose()
        break
      case 'auth':
        setStep('select')
        setSelectedProvider(null)
        oauth.reset()
        break
      case 'folders':
        setStep('auth')
        oauth.reset()
        break
      default:
        break
    }
  }, [step, oauth, onClose])

  // Reset when initial provider changes
  useEffect(() => {
    if (initialProvider) {
      setSelectedProvider(initialProvider)
      setStep('auth')
    } else {
      setStep('select')
      setSelectedProvider(null)
    }
    setOauthResult(null)
    setAccountInfo(null)
    setSelectedFolders(null)
    setConnectorId(null)
    oauth.reset()
  }, [initialProvider])

  return (
    <div className="flex flex-col h-full">
      {/* Header with back button and progress */}
      <div className="flex flex-col gap-3 mb-4">
        <Progress
          value={progressValue}
          size="sm"
          color="primary"
          className="w-full"
          aria-label={t('Wizard progress')}
        />
      </div>

      {/* Step content */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {step === 'select' && (
          <ProviderGrid category={category} onSelect={handleProviderSelect} />
        )}

        {step === 'auth' && selectedProvider && (
          <OAuthStep
            provider={selectedProvider}
            status={oauth.status}
            error={oauth.error}
            onAuthenticate={oauth.authenticate}
            onRetry={handleOAuthRetry}
            onSuccess={handleOAuthSuccess}
            result={oauth.result}
            accountInfo={oauth.accountInfo}
          />
        )}

        {step === 'folders' && selectedProvider && oauthResult && (
          <FolderPicker
            provider={selectedProvider}
            oauthResult={oauthResult}
            onSelect={handleFolderSelect}
            onSkip={handleFolderSkip}
          />
        )}

        {step === 'success' && selectedProvider && (
          <SuccessStep
            provider={selectedProvider}
            accountInfo={accountInfo}
            selectedFolders={selectedFolders}
            hasRefreshToken={hasRefreshToken}
            onStartSync={handleStartSync}
            onDone={onClose}
          />
        )}
      </div>

      {/* Footer actions */}
      {step === 'auth' && (
        <div className="flex justify-end gap-2 pt-4 border-t border-default-200 mt-4">
          <Button variant="flat" size="sm" onPress={handleBack}>
            {t('Back')}
          </Button>
          <Button variant="flat" size="sm" onPress={onClose}>
            {t('Cancel')}
          </Button>
        </div>
      )}
    </div>
  )
}
