/**
 * SecuritySection — Settings section for encryption key management.
 *
 * Displays:
 *  - Encryption key status (non-extractable)
 *  - Info tooltip about key security
 *  - Regenerate master key action
 */

import { useState, useEffect } from 'react'
import { Button, Input, Tooltip } from '@heroui/react'
import { Icon } from '@/components'
import { useI18n } from '@/i18n'
import { SecureStorage } from '@/lib/crypto'
import { errorToast, successToast } from '@/lib/toast'
import { useHashHighlight } from '@/hooks/useHashHighlight'
import localI18n from '../i18n'

export function SecuritySection() {
  const { t } = useI18n(localI18n)
  const { getHighlightClasses } = useHashHighlight()

  const [masterKey, setMasterKey] = useState<string | null>(null)
  const [isRegeneratingKey, setIsRegeneratingKey] = useState(false)

  useEffect(() => {
    const init = async () => {
      await SecureStorage.init()
      setMasterKey(SecureStorage.getMasterKey())
    }
    init()
  }, [])

  const handleCopyMasterKey = async () => {
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

  return (
    <div data-testid="security-settings" className="space-y-4">
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
            size="sm"
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
  )
}
