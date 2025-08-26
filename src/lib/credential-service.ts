import { db } from '@/lib/db'
import { SecureStorage } from '@/lib/crypto'
import { LLMConfig, Credential } from '@/types'
import { errorToast } from './toast'

export class CredentialService {
  static async getDecryptedConfig(
    credentialId: string,
  ): Promise<LLMConfig | null> {
    try {
      const credential = await db.get('credentials', credentialId)
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
    const credentials = await db.getAll('credentials')

    if (provider) {
      return credentials.find((c) => c.provider === provider) || null
    }

    // Return the first credential by order (lowest order number = highest priority)
    return (
      credentials.sort((a, b) => {
        if (a.order === undefined && b.order === undefined) return 0
        if (a.order === undefined) return 1
        if (b.order === undefined) return -1
        return a.order - b.order
      })[0] || null
    )
  }

  static async getActiveConfig(provider?: string): Promise<LLMConfig | null> {
    const credential = await this.getActiveCredential(provider)
    if (!credential) return null

    return this.getDecryptedConfig(credential.id)
  }
}
