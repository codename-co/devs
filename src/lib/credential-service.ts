import { SecureStorage } from '@/lib/crypto'
import { LLMConfig, Credential, LLMProvider } from '@/types'
import { errorToast } from './toast'
import { useLLMModelStore } from '@/stores/llmModelStore'

export class CredentialService {
  static async getDecryptedConfig(
    credentialId: string,
  ): Promise<LLMConfig | null> {
    try {
      const { credentials, selectedModels } = useLLMModelStore.getState()
      const credential = credentials.find((c) => c.id === credentialId)
      if (!credential) return null

      const iv = localStorage.getItem(`${credentialId}-iv`)
      const salt = localStorage.getItem(`${credentialId}-salt`)

      if (!iv || !salt) {
        console.error('Missing encryption metadata for credential')
        errorToast(
          'Missing encryption metadata for credential. Please reconfigure your LLM provider.',
        )
        return null
      }

      const apiKey = await SecureStorage.decryptCredential(
        credential.encryptedApiKey,
        iv,
        salt,
      )

      // Get the selected model for this provider
      const model =
        selectedModels[credential.provider] || credential.model || ''

      return {
        provider: credential.provider,
        model,
        apiKey,
        baseUrl: credential.baseUrl,
      }
    } catch (error) {
      console.error('Failed to decrypt credential:', error)
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
