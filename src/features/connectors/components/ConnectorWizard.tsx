import React, { useState } from 'react'
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Card,
  CardBody,
  Switch,
  Input,
} from '@heroui/react'
import { Check } from 'iconoir-react'
import { Icon } from '@/components/Icon'
import { useI18n } from '@/i18n'
import { useConnectorStore } from '@/stores/connectorStore'
import { OAuthGateway } from '../oauth-gateway'
import { ProviderRegistry } from '../provider-registry'
import { SecureStorage } from '@/lib/crypto'
import { errorToast, successToast } from '@/lib/toast'
import { ConnectorIcon } from './ConnectorIcon'
import type {
  ConnectorCategory,
  AppConnectorProvider,
  OAuthResult,
  AccountInfo,
} from '../types'
import { APP_CONNECTOR_CONFIGS } from '../types'
import localI18n from '../pages/i18n'

interface ConnectorWizardProps {
  isOpen: boolean
  onClose: () => void
  category: ConnectorCategory
}

type WizardStep = 'select-provider' | 'authenticate' | 'configure' | 'complete'

/**
 * ConnectorWizard Component
 *
 * Multi-step wizard for adding new connectors:
 * 1. Select Provider - Choose which service to connect
 * 2. Authenticate - Complete OAuth flow
 * 3. Configure - Set sync preferences
 * 4. Complete - Confirmation and first sync
 */
export const ConnectorWizard: React.FC<ConnectorWizardProps> = ({
  isOpen,
  onClose,
  category,
}) => {
  const { t } = useI18n(localI18n)

  // Wizard state
  const [currentStep, setCurrentStep] = useState<WizardStep>('select-provider')
  const [selectedProvider, setSelectedProvider] =
    useState<AppConnectorProvider | null>(null)
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const [oauthResult, setOauthResult] = useState<OAuthResult | null>(null)
  const [accountInfo, setAccountInfo] = useState<AccountInfo | null>(null)

  // Configuration state
  const [connectorName, setConnectorName] = useState('')
  const [syncEnabled, setSyncEnabled] = useState(true)
  const [syncInterval, setSyncInterval] = useState(30)

  // Store
  const { addConnector } = useConnectorStore()

  // Reset wizard on close
  const handleClose = () => {
    setCurrentStep('select-provider')
    setSelectedProvider(null)
    setIsAuthenticating(false)
    setOauthResult(null)
    setAccountInfo(null)
    setConnectorName('')
    setSyncEnabled(true)
    setSyncInterval(30)
    onClose()
  }

  // Get available providers for the category
  const getAvailableProviders = (): AppConnectorProvider[] => {
    if (category === 'app') {
      return ProviderRegistry.getRegisteredAppProviders()
    }
    return []
  }

  // Step 1: Provider Selection
  const handleProviderSelect = (provider: AppConnectorProvider) => {
    setSelectedProvider(provider)
    const config = APP_CONNECTOR_CONFIGS[provider]
    setConnectorName(config.name)
    setCurrentStep('authenticate')
  }

  // Step 2: Authentication
  const handleAuthenticate = async () => {
    if (!selectedProvider) return

    setIsAuthenticating(true)
    try {
      // Initiate OAuth flow
      const result = await OAuthGateway.authenticate(selectedProvider)
      setOauthResult(result)

      // Get account info
      const provider = await ProviderRegistry.getAppProvider(selectedProvider)
      const account = await provider.getAccountInfo(result.accessToken)
      setAccountInfo(account)

      // If account email is available, use it in the connector name
      if (account.email) {
        const config = APP_CONNECTOR_CONFIGS[selectedProvider]
        setConnectorName(`${config.name} (${account.email})`)
      }

      successToast(t('Successfully authenticated'))
      setCurrentStep('configure')
    } catch (error) {
      console.error('Authentication error:', error)
      errorToast(
        t('Authentication failed'),
        error instanceof Error ? error.message : t('Unknown error'),
      )
    } finally {
      setIsAuthenticating(false)
    }
  }

  // Step 3: Configuration & Save
  const handleComplete = async () => {
    if (!selectedProvider || !oauthResult) return

    setIsAuthenticating(true)
    try {
      // Encrypt tokens
      const encryptedToken = await SecureStorage.encryptCredential(
        oauthResult.accessToken,
      )
      const encryptedRefreshToken = oauthResult.refreshToken
        ? await SecureStorage.encryptCredential(oauthResult.refreshToken)
        : undefined

      // Calculate token expiration
      const tokenExpiresAt = oauthResult.expiresIn
        ? new Date(Date.now() + oauthResult.expiresIn * 1000)
        : undefined

      // Create connector
      await addConnector({
        category: 'app',
        provider: selectedProvider,
        name: connectorName,
        encryptedToken: encryptedToken.encrypted,
        encryptedRefreshToken: encryptedRefreshToken?.encrypted,
        tokenExpiresAt,
        scopes: oauthResult.scope.split(' ').filter(Boolean),
        accountId: accountInfo?.id,
        accountEmail: accountInfo?.email,
        syncEnabled,
        syncInterval,
        status: 'connected',
      })

      successToast(t('{name} connected successfully', { name: connectorName }))
      setCurrentStep('complete')

      // Close modal after a brief delay
      setTimeout(() => {
        handleClose()
      }, 1500)
    } catch (error) {
      console.error('Failed to save connector:', error)
      errorToast(
        t('Failed to save connector'),
        error instanceof Error ? error.message : t('Unknown error'),
      )
    } finally {
      setIsAuthenticating(false)
    }
  }

  // Render provider selection grid
  const renderProviderSelection = () => {
    const providers = getAvailableProviders()

    return (
      <div className="py-4">
        <p className="text-sm text-default-500 mb-4">
          {t('Choose a service to connect to your knowledge base')}
        </p>
        <div className="grid grid-cols-2 gap-3">
          {providers.map((provider) => {
            const config = APP_CONNECTOR_CONFIGS[provider]
            return (
              <Card
                key={provider}
                isPressable
                isHoverable
                onPress={() => handleProviderSelect(provider)}
                className="border border-default-200 hover:border-primary transition-colors"
              >
                <CardBody className="flex flex-row items-center gap-3 p-4">
                  <ConnectorIcon provider={provider} size={32} />
                  <div className="flex flex-col">
                    <p className="font-semibold">{config.name}</p>
                    <p className="text-xs text-default-400">
                      {config.capabilities.includes('read') && 'Read'}
                      {config.capabilities.includes('search') && ' • Search'}
                    </p>
                  </div>
                </CardBody>
              </Card>
            )
          })}
        </div>
      </div>
    )
  }

  // Render authentication step
  const renderAuthentication = () => {
    if (!selectedProvider) return null

    const config = APP_CONNECTOR_CONFIGS[selectedProvider]

    return (
      <div className="py-4 text-center">
        <div className="mb-6 flex justify-center">
          <ConnectorIcon provider={selectedProvider} size={64} />
        </div>
        <h3 className="text-lg font-semibold mb-2">
          {t('Connect to {name}', { name: config.name })}
        </h3>
        <p className="text-sm text-default-500 mb-6 max-w-md mx-auto">
          {t(
            'You will be redirected to {name} to authorize DEVS to access your data. Your credentials are never stored on our servers.',
            { name: config.name },
          )}
        </p>

        <div className="bg-default-100 rounded-lg p-4 mb-6 text-left max-w-md mx-auto">
          <p className="text-xs font-semibold text-default-700 mb-2">
            {t('This connector will be able to:')}
          </p>
          <ul className="text-xs text-default-600 space-y-1">
            {config.capabilities.includes('read') && (
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-success shrink-0 mt-0.5" />
                <span>{t('Read your files and content')}</span>
              </li>
            )}
            {config.capabilities.includes('search') && (
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-success shrink-0 mt-0.5" />
                <span>{t('Search your content')}</span>
              </li>
            )}
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 text-success shrink-0 mt-0.5" />
              <span>{t('Sync changes automatically')}</span>
            </li>
          </ul>
        </div>

        <Button
          color="primary"
          size="lg"
          onPress={handleAuthenticate}
          isLoading={isAuthenticating}
          startContent={
            !isAuthenticating && <Icon name="Lock" className="w-4 h-4" />
          }
        >
          {isAuthenticating
            ? t('Authenticating...')
            : t('Connect {name}', { name: config.name })}
        </Button>
      </div>
    )
  }

  // Render configuration step
  const renderConfiguration = () => {
    if (!selectedProvider) return null

    const config = APP_CONNECTOR_CONFIGS[selectedProvider]

    return (
      <div className="py-4 space-y-4">
        {/* Success indicator */}
        <div className="flex items-center gap-3 p-3 bg-success-50 dark:bg-success-900/20 rounded-lg">
          <div className="w-10 h-10 rounded-full bg-success flex items-center justify-center">
            <Check className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-success-700 dark:text-success">
              {t('Authentication successful')}
            </p>
            {accountInfo?.email && (
              <p className="text-sm text-success-600 dark:text-success-300">
                {t('Connected as {email}', { email: accountInfo.email })}
              </p>
            )}
          </div>
        </div>

        {/* Connector name */}
        <div>
          <Input
            label={t('Connector Name')}
            placeholder={config.name}
            value={connectorName}
            onValueChange={setConnectorName}
            description={t('Give this connector a memorable name')}
          />
        </div>

        {/* Sync settings */}
        <div className="border border-default-200 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-sm">
                {t('Enable Automatic Sync')}
              </p>
              <p className="text-xs text-default-500">
                {t('Automatically sync new and updated content')}
              </p>
            </div>
            <Switch isSelected={syncEnabled} onValueChange={setSyncEnabled} />
          </div>

          {syncEnabled && (
            <div>
              <Input
                type="number"
                label={t('Sync Interval (minutes)')}
                value={syncInterval.toString()}
                onValueChange={(val) => setSyncInterval(parseInt(val) || 30)}
                min={5}
                max={1440}
                description={t('How often to check for changes')}
              />
            </div>
          )}
        </div>
      </div>
    )
  }

  // Render completion step
  const renderComplete = () => {
    return (
      <div className="py-8 text-center">
        <div className="mb-4 flex justify-center">
          <div className="w-16 h-16 rounded-full bg-success flex items-center justify-center">
            <Check className="w-8 h-8 text-white" />
          </div>
        </div>
        <h3 className="text-lg font-semibold mb-2">{t('Connector Added')}</h3>
        <p className="text-sm text-default-500 mb-4">
          {t('{name} has been successfully connected', { name: connectorName })}
        </p>
        {syncEnabled && (
          <p className="text-xs text-default-400">
            {t('Automatic sync will begin shortly')}
          </p>
        )}
      </div>
    )
  }

  // Get step title
  const getStepTitle = () => {
    switch (currentStep) {
      case 'select-provider':
        return t('Select a Service')
      case 'authenticate':
        return t('Authenticate')
      case 'configure':
        return t('Configure Connector')
      case 'complete':
        return t('Complete')
      default:
        return t('Add Connector')
    }
  }

  // Check if we can proceed to next step
  const canProceed = () => {
    if (currentStep === 'configure') {
      return connectorName.trim().length > 0
    }
    return false
  }

  return (
    <Modal
      size="2xl"
      isOpen={isOpen}
      onClose={handleClose}
      backdrop="blur"
      isDismissable={currentStep !== 'authenticate' || !isAuthenticating}
      hideCloseButton={currentStep === 'authenticate' && isAuthenticating}
      classNames={{
        base: 'max-h-[90vh]',
      }}
    >
      <ModalContent>
        <ModalHeader className="flex items-center gap-2 border-b border-default-200">
          <Icon name="Plus" className="h-5 w-5 text-primary" />
          <span>{getStepTitle()}</span>
        </ModalHeader>

        <ModalBody className="py-2">
          {currentStep === 'select-provider' && renderProviderSelection()}
          {currentStep === 'authenticate' && renderAuthentication()}
          {currentStep === 'configure' && renderConfiguration()}
          {currentStep === 'complete' && renderComplete()}
        </ModalBody>

        <ModalFooter className="border-t border-default-200">
          {currentStep === 'select-provider' && (
            <Button variant="light" onPress={handleClose}>
              {t('Cancel')}
            </Button>
          )}

          {currentStep === 'authenticate' && !isAuthenticating && (
            <Button
              variant="light"
              onPress={() => setCurrentStep('select-provider')}
            >
              {t('Back')}
            </Button>
          )}

          {currentStep === 'configure' && (
            <>
              <Button
                variant="light"
                onPress={() => setCurrentStep('authenticate')}
                isDisabled={isAuthenticating}
              >
                {t('Back')}
              </Button>
              <Button
                color="primary"
                onPress={handleComplete}
                isLoading={isAuthenticating}
                isDisabled={!canProceed()}
              >
                {isAuthenticating ? t('Saving...') : t('Complete Setup')}
              </Button>
            </>
          )}
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
