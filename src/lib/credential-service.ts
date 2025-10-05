import { SecureStorage } from '@/lib/crypto'
import { LLMConfig, Credential } from '@/types'
import { errorToast } from './toast'
import { useLLMModelStore } from '@/stores/llmModelStore'

export class CredentialService {
  static async getDecryptedConfig(
    credentialId: string,
  ): Promise<LLMConfig | null> {
    try {
      const { credentials } = useLLMModelStore.getState()
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

      return {
        provider: credential.provider,
        model: credential.model || '',
        apiKey,
        baseUrl: credential.baseUrl,
      }
    } catch (error) {
      console.error('Failed to decrypt credential:', error)
      return null
    }
  }

  static async getActiveCredential(
    provider?: string,
  ): Promise<Credential | null> {
    const { credentials, getSelectedCredential } = useLLMModelStore.getState()

    if (provider) {
      return credentials.find((c) => c.provider === provider) || null
    }

    // Use the selected credential from the store
    return getSelectedCredential()
  }

  static async getActiveConfig(provider?: string): Promise<LLMConfig | null> {
    const credential = await this.getActiveCredential(provider)
    if (!credential) return null

    return this.getDecryptedConfig(credential.id)
  }
}
