import { LLMConfig, Credential, LLMProvider } from '@/types'
import { errorToast } from './toast'
import { useLLMModelStore } from '@/stores/llmModelStore'

/**
 * Providers that don't require API keys (local/browser-based)
 */
const NO_CREDENTIAL_PROVIDERS: LLMProvider[] = ['local', 'ollama']

export class CredentialService {
  /**
   * Check if a provider requires API key credentials
   */
  static requiresCredentials(provider: LLMProvider): boolean {
    return !NO_CREDENTIAL_PROVIDERS.includes(provider)
  }

  static async getDecryptedConfig(
    credentialId: string,
  ): Promise<LLMConfig | null> {
    const { credentials, selectedModels } = useLLMModelStore.getState()
    const credential = credentials.find((c) => c.id === credentialId)
    if (!credential) return null

    try {
      // Get the selected model for this provider
      const model =
        selectedModels[credential.provider] || credential.model || ''

      // For local/browser providers that don't need API keys, skip decryption
      if (!this.requiresCredentials(credential.provider)) {
        return {
          provider: credential.provider,
          model,
          baseUrl: credential.baseUrl,
        }
      }

      // IV can be stored in credential object (for sync mode) or localStorage (local mode)
      const iv = credential.iv || localStorage.getItem(`${credentialId}-iv`)
      const salt = localStorage.getItem(`${credentialId}-salt`) ?? '' // Salt is empty after migration to non-extractable keys

      const { SecureStorage } = await import('@/lib/crypto')
      const currentEncryptionMode = SecureStorage.getEncryptionMode()
      const credentialEncryptionMode = credential.encryptionMode || 'local'

      console.log(`[CredentialService] Getting config for ${credentialId}:`, {
        hasIvInObject: !!credential.iv,
        hasIvInLocalStorage: !!localStorage.getItem(`${credentialId}-iv`),
        iv: iv ? `${iv.substring(0, 10)}...` : null,
        currentEncryptionMode,
        credentialEncryptionMode,
      })

      // Check for encryption mode mismatch
      // If credential was encrypted with 'local' key on another device, we can't decrypt it
      if (
        credentialEncryptionMode === 'local' &&
        currentEncryptionMode === 'local'
      ) {
        // Check if this credential was created on a different device by trying to find its IV in localStorage
        // If IV is only in the object (not in localStorage), it was synced from another device
        const hasLocalIv = !!localStorage.getItem(`${credentialId}-iv`)
        if (!hasLocalIv && credential.iv) {
          console.error(
            'Credential was encrypted on a different device with local key',
          )
          errorToast(
            'This provider was configured on another device and cannot be accessed here. To sync providers across devices, enable password-protected sync.',
          )
          return null
        }
      }

      if (!iv) {
        console.error('Missing encryption metadata for credential:', {
          credentialId,
          credential: { ...credential, encryptedApiKey: '[REDACTED]' },
        })
        errorToast(
          'Missing encryption metadata for credential. Please reconfigure your AI provider.',
        )
        return null
      }

      const apiKey = await SecureStorage.decryptCredential(
        credential.encryptedApiKey,
        iv,
        salt,
      )

      return {
        provider: credential.provider,
        model,
        apiKey,
        baseUrl: credential.baseUrl,
      }
    } catch (error) {
      console.error('Failed to decrypt credential:', error)

      // Check if this is likely a sync issue (credential from another device)
      if (credential.iv && !localStorage.getItem(`${credentialId}-iv`)) {
        errorToast(
          'This provider was configured on another device. Enable password-protected sync to share providers across devices.',
        )
      } else {
        errorToast(
          'Failed to decrypt API key. Your credential may be corrupted. Please reconfigure your AI provider in Settings.',
        )
      }
      return null
    }
  }

  static async getActiveCredential(
    provider?: LLMProvider,
  ): Promise<Credential | null> {
    const { getSelectedProvider, getCredentialForProvider } =
      useLLMModelStore.getState()

    if (provider) {
      return getCredentialForProvider(provider)
    }

    // Use the selected provider from the store
    return getSelectedProvider()
  }

  static async getActiveConfig(
    provider?: LLMProvider,
  ): Promise<LLMConfig | null> {
    const credential = await this.getActiveCredential(provider)
    if (!credential) return null

    return this.getDecryptedConfig(credential.id)
  }

  /**
   * Get the currently selected model for a provider
   */
  static getSelectedModel(provider?: LLMProvider): string | null {
    const { getSelectedModel } = useLLMModelStore.getState()
    return getSelectedModel(provider)
  }

  /**
   * Set the selected model for a provider
   */
  static setSelectedModel(provider: LLMProvider, model: string): void {
    const { setSelectedModel } = useLLMModelStore.getState()
    setSelectedModel(provider, model)
  }
}
