/**
 * LangfuseSection — Settings section for Langfuse LLM observability integration.
 *
 * Displays:
 *  - Enable/disable toggle
 *  - Host, public key, secret key configuration
 *  - Save / delete configuration actions
 *  - Status alerts
 */

import { useState, useEffect } from 'react'
import { Alert, Button, Checkbox, Input } from '@heroui/react'
import { Icon } from '@/components'
import { useI18n } from '@/i18n'
import { SecureStorage } from '@/lib/crypto'
import { errorToast, successToast } from '@/lib/toast'
import {
  langfuseConfig as langfuseConfigMap,
  LangfuseConfigEntry,
} from '@/lib/yjs/maps'
import localI18n from '../i18n'

export function LangfuseSection() {
  useI18n(localI18n)

  const [langfuseConfig, setLangfuseConfig] =
    useState<LangfuseConfigEntry | null>(null)
  const [langfuseHost, setLangfuseHost] = useState('')
  const [langfusePublicKey, setLangfusePublicKey] = useState('')
  const [langfuseSecretKey, setLangfuseSecretKey] = useState('')
  const [langfuseEnabled, setLangfuseEnabled] = useState(false)
  const [isSavingLangfuse, setIsSavingLangfuse] = useState(false)

  useEffect(() => {
    loadLangfuseConfig()
  }, [])

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

      langfuseConfigMap.set(config.id, config)
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

  return (
    <div data-testid="langfuse-integration" className="space-y-4">
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
          Langfuse is configured but disabled. Enable it to start tracking
          LLM requests.
        </Alert>
      )}

      {!langfuseConfig && !langfuseEnabled && (
        <Alert icon={<Icon name="LightBulbOn" />} variant="faded">
          Enable Langfuse tracking to monitor and analyze your LLM API
          usage, costs, and performance.
        </Alert>
      )}
    </div>
  )
}
