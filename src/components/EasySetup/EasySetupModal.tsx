import { useEffect, useState } from 'react'
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
  Chip,
  Progress,
} from '@heroui/react'
import { Icon } from '@/components'
import { EasySetupData, EasySetupCrypto } from '@/lib/easy-setup'
import { useI18n } from '@/i18n'
import localI18n from './i18n'

interface EasySetupModalProps {
  isOpen: boolean
  onClose: () => void
  setupData: EasySetupData
  onSetupComplete: () => void
}

export const EasySetupModal = ({
  isOpen,
  onClose,
  setupData,
  onSetupComplete,
}: EasySetupModalProps) => {
  const [password, setPassword] = useState('')
  const [isDecrypting, setIsDecrypting] = useState(false)
  const [isInitializing, setIsInitializing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentStep, setCurrentStep] = useState<
    'password' | 'preview' | 'initializing'
  >('password')
  const [decryptedData, setDecryptedData] = useState<any>(null)
  const { t } = useI18n(localI18n)

  useEffect(() => {
    ;(async () => {
      // Only auto-decrypt if no password is required (empty password works)
      const decrypted = await handleDecrypt(false)
      if (decrypted) {
        await handleInitialize(decrypted)
      }
    })()
  }, [])

  const handleDecrypt = async (withErrors = true) => {
    setIsDecrypting(true)
    setError(null)

    try {
      const decrypted = await EasySetupCrypto.decrypt(setupData.d, password)
      console.debug({ decrypted })
      setDecryptedData(decrypted)
      console.debug('<decryptedData> set', { decrypted })
      // setCurrentStep('preview')
      setCurrentStep('initializing')
      return decrypted
    } catch (err) {
      withErrors && setError('Invalid password or corrupted data' + err)
      return false
    } finally {
      setIsDecrypting(false)
    }
  }

  const handleInitialize = async (dataToUse?: any) => {
    const data = dataToUse || decryptedData
    if (!data) {
      console.debug('<decryptedData> not set', { decryptedData, dataToUse })
      setError('No decrypted data available')
      return
    }

    setIsInitializing(true)
    setCurrentStep('initializing')

    try {
      // Import the setup logic
      const { initializeEasySetup } = await import('@/lib/easy-setup-db')

      console.debug({ setupData, data })
      await initializeEasySetup(setupData, data)

      // Success! Clean up and close
      onSetupComplete()
    } catch (err) {
      setError(
        'Failed to initialize setup: ' +
          (err instanceof Error ? err.message : String(err)),
      )
      // setCurrentStep('preview')
      setCurrentStep('initializing')
    } finally {
      setIsInitializing(false)
    }
  }

  const handleClose = () => {
    setPassword('')
    setError(null)
    setCurrentStep('password')
    setDecryptedData(null)
    onClose()
  }

  const renderPasswordStep = () => (
    <>
      <ModalHeader className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <Icon name="DatabaseRestore" />
          {t('Platform Preparation')} {setupData.p.n}
          {/* <span className="text-sm text-gray-600">1/3</span> */}
        </div>
      </ModalHeader>
      <ModalBody>
        <div className="space-y-4">
          <Input
            type="password"
            label={t('Password')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleDecrypt()}
            isInvalid={!!error}
            errorMessage={error}
            autoFocus
          />
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="light" onPress={handleClose}>
          {t('Cancel')}
        </Button>
        <Button
          color="primary"
          onPress={async () => {
            const decrypted = await handleDecrypt()
            if (decrypted) {
              await handleInitialize(decrypted)
            }
          }}
          isLoading={isDecrypting}
        >
          {t('Continue')}
        </Button>
      </ModalFooter>
    </>
  )

  const renderPreviewStep = () => (
    <>
      <ModalHeader className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <Icon name="DatabaseRestore" />
          {t('Platform Preparation')} {setupData.p.n}
          {/* <span className="text-sm text-gray-600">2/3</span> */}
        </div>
      </ModalHeader>
      <ModalBody>
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {setupData.p.a.length > 0 && (
            <div>
              <h4 className="font-medium mb-2">
                {t('Agents')} ({setupData.p.a.length})
              </h4>
              <div className="space-y-2">
                {setupData.p.a.map((agent, index) => (
                  <p key={index} className="font-medium">
                    {agent.n}
                  </p>
                ))}
              </div>
            </div>
          )}

          {decryptedData?.c && (
            <div>
              <h4 className="font-medium mb-2">{t('AI Providers')}</h4>
              <div className="space-y-1">
                {decryptedData.c.map((cred: any, index: number) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    <Icon name="Lock" size="sm" />
                    <span>{cred.p}</span>
                    {cred.m && (
                      <Chip size="sm" variant="flat">
                        {cred.m}
                      </Chip>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="light" onPress={() => setCurrentStep('password')}>
          {t('Back')}
        </Button>
        <Button color="primary" onPress={handleInitialize}>
          {t('Continue')}
        </Button>
      </ModalFooter>
    </>
  )

  const renderInitializingStep = () => (
    <>
      <ModalHeader className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <Icon name="DatabaseRestore" />
          {t('Platform Preparation')} {setupData.p.n}
          {/* <span className="text-sm text-gray-600">3/3</span> */}
        </div>
      </ModalHeader>
      <ModalBody>
        <div className="text-center space-y-4">
          <Progress
            size="sm"
            isIndeterminate
            color="primary"
            className="max-w-md"
            aria-label="Initializing platform"
          />
          <p className="text-gray-600">{t('Setting the platform up…')}</p>
          {error && <div className="text-red-500 text-sm">{error}</div>}
        </div>
      </ModalBody>
    </>
  )

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      size="lg"
      isDismissable={!isInitializing}
      placement="bottom-center"
    >
      <ModalContent>
        {currentStep === 'password' && renderPasswordStep()}
        {currentStep === 'preview' && renderPreviewStep()}
        {currentStep === 'initializing' && renderInitializingStep()}
      </ModalContent>
    </Modal>
  )
}
