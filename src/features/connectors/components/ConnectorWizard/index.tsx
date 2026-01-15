/**
 * ConnectorWizard Component
 *
 * Multi-step wizard for adding new connectors with OAuth authentication.
 * Steps: Provider Selection → OAuth → Folder Selection → Success
 */

import { useState, useCallback, useEffect } from 'react'
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Progress,
} from '@heroui/react'
import { useI18n } from '@/i18n'
import { useConnectorStore } from '@/stores/connectorStore'
import { useOAuth } from '@/hooks/useOAuth'
import { SecureStorage } from '@/lib/crypto'
import { ProviderGrid } from './ProviderGrid'
import { OAuthStep } from './OAuthStep'
import { FolderPicker } from './FolderPicker'
import { SuccessStep } from './SuccessStep'
import { PROVIDER_CONFIG } from '../../providers/apps'
import { storeEncryptionMetadata } from '../../connector-provider'
import { SyncEngine } from '../../sync-engine'
import type {
  AppConnectorProvider,
  ConnectorCategory,
  OAuthResult,
  AccountInfo,
} from '../../types'
import localI18n from '../../pages/i18n'

// =============================================================================
// Types
// =============================================================================

type WizardStep = 'select' | 'auth' | 'folders' | 'success'

interface ConnectorWizardProps {
  isOpen: boolean
  onClose: () => void
  category: ConnectorCategory
  initialProvider?: AppConnectorProvider | null
}

// Step configuration for progress indicator
const STEPS: { key: WizardStep; label: string }[] = [
  { key: 'select', label: 'Select' },
  { key: 'auth', label: 'Connect' },
  { key: 'folders', label: 'Folders' },
  { key: 'success', label: 'Done' },
]

// =============================================================================
// Component
// =============================================================================

/**
 * ConnectorWizard - Multi-step modal for adding OAuth-based connectors
 *
 * @param isOpen - Whether the modal is open
 * @param onClose - Callback to close the modal
 * @param category - Connector category (currently only 'app' supported)
 * @param initialProvider - Optional pre-selected provider
 */
export function ConnectorWizard({
  isOpen,
  onClose,
  category,
  initialProvider = null,
}: ConnectorWizardProps) {
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
              name: PROVIDER_CONFIG[selectedProvider]?.name || selectedProvider,
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
    ) => {
      console.log('[ConnectorWizard] Creating connector with:', {
        provider,
        hasAccessToken: !!result.accessToken,
        hasRefreshToken: !!result.refreshToken,
        expiresIn: result.expiresIn,
      })

      try {
        // Ensure SecureStorage is initialized
        await SecureStorage.init()

        // Encrypt the access token
        const {
          encrypted: encryptedToken,
          iv,
          salt,
        } = await SecureStorage.encryptCredential(result.accessToken)

        console.log('[ConnectorWizard] Token encrypted:', {
          encryptedLength: encryptedToken.length,
          iv: iv.substring(0, 10) + '...',
          salt: salt.substring(0, 10) + '...',
        })

        // Encrypt refresh token if available
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

        // Calculate token expiry time
        const tokenExpiresAt = result.expiresIn
          ? new Date(Date.now() + result.expiresIn * 1000)
          : undefined

        // Check if provider supports sync
        const providerSyncSupported =
          PROVIDER_CONFIG[provider]?.syncSupported !== false

        // Create the connector in the store
        const id = await addConnector({
          category: 'app',
          provider,
          name: PROVIDER_CONFIG[provider]?.name || provider,
          encryptedToken,
          encryptedRefreshToken,
          tokenExpiresAt,
          scopes: result.scope?.split(' ') || [],
          accountId: info?.id,
          accountEmail: info?.email,
          syncEnabled: providerSyncSupported,
          syncFolders: folderIds || undefined,
          status: 'connected',
        })

        // Store encryption metadata in localStorage using the returned connector ID
        storeEncryptionMetadata(id, iv, salt, false)

        // Store refresh token encryption metadata if available
        if (refreshIv && refreshSalt) {
          storeEncryptionMetadata(id, refreshIv, refreshSalt, true)
        }

        console.log('[ConnectorWizard] Connector created:', {
          id,
          encryptedTokenLength: encryptedToken.length,
          hasRefreshToken: !!encryptedRefreshToken,
        })

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

      // Check if provider supports sync - skip folders step if not
      const providerConfig = selectedProvider
        ? PROVIDER_CONFIG[selectedProvider]
        : null
      const providerSyncSupported = providerConfig?.syncSupported !== false

      if (providerSyncSupported) {
        setStep('folders')
      } else {
        // For non-sync providers (like Google Meet, Google Calendar),
        // create the connector directly without folder selection
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
          } catch (error) {
            // Error already logged in createConnector
            // TODO: Show error toast
          }
        }
      }
    },
    [selectedProvider, createConnector],
  )

  // Handle folder selection and create connector
  const handleFolderSelect = useCallback(
    async (folderIds: string[] | null) => {
      if (!selectedProvider || !oauthResult) {
        console.error('[ConnectorWizard] Missing data:', {
          selectedProvider,
          oauthResult,
          hasAccessToken: !!oauthResult?.accessToken,
        })
        return
      }

      try {
        const id = await createConnector(
          selectedProvider,
          oauthResult,
          accountInfo,
          folderIds,
        )
        setSelectedFolders(folderIds)
        setConnectorId(id)
        setStep('success')
      } catch (error) {
        // Error already logged in createConnector
        // TODO: Show error toast
      }
    },
    [selectedProvider, oauthResult, accountInfo, createConnector],
  )

  // Handle folder skip (sync everything)
  const handleFolderSkip = useCallback(() => {
    handleFolderSelect(null)
  }, [handleFolderSelect])

  // Handle start sync
  const handleStartSync = useCallback(async () => {
    if (connectorId) {
      // Close the modal first for better UX
      onClose()

      // Start sync in the background
      try {
        await SyncEngine.sync(connectorId)
      } catch (error) {
        console.error('Failed to start sync:', error)
        // Error handling is done by SyncEngine which updates connector status
      }
    } else {
      onClose()
    }
  }, [connectorId, onClose])

  // Handle close and reset
  const handleClose = useCallback(() => {
    // Reset state
    setStep(initialProvider ? 'auth' : 'select')
    setSelectedProvider(initialProvider)
    setOauthResult(null)
    setAccountInfo(null)
    setSelectedFolders(null)
    setConnectorId(null)
    oauth.reset()
    onClose()
  }, [initialProvider, oauth, onClose])

  // Handle back navigation
  const handleBack = useCallback(() => {
    switch (step) {
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
  }, [step, oauth])

  // Reset when modal opens with initial provider
  useEffect(() => {
    if (isOpen) {
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
    }
  }, [isOpen, initialProvider])

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      size="2xl"
      scrollBehavior="inside"
    >
      <ModalContent>
        {() => (
          <>
            {/* Header with progress */}
            <ModalHeader className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span>{getStepTitle()}</span>
                <span className="text-xs text-default-400 font-normal">
                  {t('Step {current} of {total}', {
                    current: currentStepIndex + 1,
                    total: STEPS.length,
                  })}
                </span>
              </div>
              <Progress
                value={progressValue}
                size="sm"
                color="primary"
                className="w-full"
                aria-label={t('Wizard progress')}
              />
            </ModalHeader>

            {/* Body */}
            <ModalBody>
              {/* Step 1: Provider Selection */}
              {step === 'select' && (
                <ProviderGrid
                  category={category}
                  onSelect={handleProviderSelect}
                />
              )}

              {/* Step 2: OAuth Authentication */}
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

              {/* Step 3: Folder Selection */}
              {step === 'folders' && selectedProvider && oauthResult && (
                <FolderPicker
                  provider={selectedProvider}
                  oauthResult={oauthResult}
                  onSelect={handleFolderSelect}
                  onSkip={handleFolderSkip}
                />
              )}

              {/* Step 4: Success */}
              {step === 'success' && selectedProvider && (
                <SuccessStep
                  provider={selectedProvider}
                  accountInfo={accountInfo}
                  selectedFolders={selectedFolders}
                  onStartSync={handleStartSync}
                  onDone={handleClose}
                />
              )}
            </ModalBody>

            {/* Footer */}
            <ModalFooter>
              {step === 'select' && (
                <Button variant="flat" onPress={handleClose}>
                  {t('Cancel')}
                </Button>
              )}

              {step === 'auth' && (
                <>
                  <Button variant="flat" onPress={handleBack}>
                    {t('Back')}
                  </Button>
                  <Button variant="flat" onPress={handleClose}>
                    {t('Cancel')}
                  </Button>
                </>
              )}

              {/* Folders and Success steps have their own action buttons */}
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  )
}

export default ConnectorWizard
