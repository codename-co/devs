import { Agent, Credential } from '@/types'

export interface EasySetupData {
  /** Version for future compatibility - use single char */
  v: string
  /** Encrypted data (requires password) - stored as encrypted string */
  d: string
  /** Non-sensitive data (can be shared openly) */
  p: {
    /** Agents array - only essential fields */
    a: Array<{
      /** Name */
      n: string
      /** Role */
      r: string
      /** Instructions */
      i: string
      /** Temperature */
      t?: number
    }>
    /** Platform name */
    n?: string
  }
}

export interface SetupEncryptionOptions {
  password: string
  salt?: string
}

export class EasySetupCrypto {
  private static ALGORITHM = 'AES-GCM'
  private static KEY_LENGTH = 256
  private static IV_LENGTH = 12
  private static SALT_LENGTH = 16
  private static ITERATIONS = 100000

  /**
   * Generate a cryptographic key from password and salt
   */
  private static async deriveKey(
    password: string,
    salt: Uint8Array,
  ): Promise<CryptoKey> {
    const encoder = new TextEncoder()
    const passwordBuffer = encoder.encode(password)

    const passwordKey = await crypto.subtle.importKey(
      'raw',
      passwordBuffer,
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey'],
    )

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: new Uint8Array(salt),
        iterations: this.ITERATIONS,
        hash: 'SHA-256',
      },
      passwordKey,
      { name: this.ALGORITHM, length: this.KEY_LENGTH },
      false,
      ['encrypt', 'decrypt'],
    )
  }

  /**
   * Encrypt data using password
   */
  static async encrypt(
    data: any,
    options: SetupEncryptionOptions,
  ): Promise<string> {
    const encoder = new TextEncoder()
    const jsonData = JSON.stringify(data)

    // Generate or use provided salt
    const salt = options.salt
      ? (() => {
          const binaryString = atob(options.salt)
          const bytes = new Uint8Array(binaryString.length)
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i)
          }
          return bytes
        })()
      : crypto.getRandomValues(new Uint8Array(this.SALT_LENGTH))

    // Generate IV
    const iv = crypto.getRandomValues(new Uint8Array(this.IV_LENGTH))

    // Derive key from password
    const key = await this.deriveKey(options.password, salt)

    // Encrypt data
    const encryptedBuffer = await crypto.subtle.encrypt(
      { name: this.ALGORITHM, iv: iv },
      key,
      encoder.encode(jsonData),
    )

    // Combine salt + iv + encrypted data
    const combined = new Uint8Array(
      salt.length + iv.length + encryptedBuffer.byteLength,
    )
    combined.set(salt)
    combined.set(iv, salt.length)
    combined.set(new Uint8Array(encryptedBuffer), salt.length + iv.length)

    // Return as base64 - convert without spreading to avoid stack overflow
    let binaryString = ''
    for (let i = 0; i < combined.length; i++) {
      binaryString += String.fromCharCode(combined[i])
    }
    return btoa(binaryString)
  }

  /**
   * Decrypt data using password
   */
  static async decrypt(encryptedData: string, password: string): Promise<any> {
    const decoder = new TextDecoder()
    const binaryString = atob(encryptedData)
    const combined = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      combined[i] = binaryString.charCodeAt(i)
    }

    // Extract salt, iv, and encrypted data
    const salt = combined.slice(0, this.SALT_LENGTH)
    const iv = combined.slice(
      this.SALT_LENGTH,
      this.SALT_LENGTH + this.IV_LENGTH,
    )
    const encrypted = combined.slice(this.SALT_LENGTH + this.IV_LENGTH)

    // Derive key from password
    const key = await this.deriveKey(password, salt)

    try {
      // Decrypt data
      const decryptedBuffer = await crypto.subtle.decrypt(
        { name: this.ALGORITHM, iv: iv },
        key,
        encrypted,
      )

      const jsonData = decoder.decode(decryptedBuffer)
      return JSON.parse(jsonData)
    } catch (error) {
      throw new Error('Invalid password or corrupted data')
    }
  }
}

/**
 * Unicode-safe base64 encoding for browser environments
 */
function unicodeBtoa(str: string): string {
  // Convert string to UTF-8 bytes first, then encode
  const encoder = new TextEncoder()
  const bytes = encoder.encode(str)

  // Convert bytes to binary string without spreading (avoids stack overflow)
  let binaryString = ''
  for (let i = 0; i < bytes.length; i++) {
    binaryString += String.fromCharCode(bytes[i])
  }

  return btoa(binaryString)
}

/**
 * Unicode-safe base64 decoding for browser environments
 */
function unicodeAtob(base64: string): string {
  // Decode base64 to bytes, then convert to UTF-8 string
  const binaryString = atob(base64)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  const decoder = new TextDecoder()
  return decoder.decode(bytes)
}

/**
 * Encode setup data for URL sharing
 */
export function encodeSetupData(setupData: EasySetupData): string {
  const jsonString = JSON.stringify(setupData)
  const encoded = unicodeBtoa(jsonString)
  // Make URL-safe
  return encoded.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

/**
 * Decode setup data from URL parameter
 */
export function decodeSetupData(encodedData: string): EasySetupData {
  try {
    // Restore base64 padding and characters
    let base64 = encodedData.replace(/-/g, '+').replace(/_/g, '/')
    while (base64.length % 4) {
      base64 += '='
    }

    const jsonString = unicodeAtob(base64)
    const setupData: EasySetupData = JSON.parse(jsonString)

    // Validate structure
    if (!setupData.v || !setupData.p || !setupData.d) {
      throw new Error('Invalid setup data structure')
    }

    return setupData as EasySetupData
  } catch (error) {
    // Re-throw specific validation errors, otherwise use generic format error
    if (
      error instanceof Error &&
      error.message === 'Invalid setup data structure'
    ) {
      throw error
    }
    throw new Error('Invalid setup data format')
  }
}

/**
 * Providers that don't require API keys (local/browser-based)
 */
const NO_CREDENTIAL_PROVIDERS = ['local', 'ollama']

/**
 * Create setup data from current configuration
 */
export async function createSetupData(
  agents: Agent[],
  credentials: Credential[],
  password: string,
  platformName?: string,
): Promise<string> {
  // Decrypt API keys using master password before export
  const { SecureStorage } = await import('./crypto')

  const decryptedCredentials = await Promise.all(
    credentials.map(async (cred) => {
      // For local/browser providers that don't need API keys, skip decryption
      if (NO_CREDENTIAL_PROVIDERS.includes(cred.provider)) {
        return {
          p: cred.provider,
          k: '', // No API key needed for local providers
          ...(cred.baseUrl && { b: cred.baseUrl }),
          ...(cred.model && { m: cred.model }),
        }
      }

      // Get encryption metadata from localStorage
      const iv = localStorage.getItem(`${cred.id}-iv`)
      const salt = localStorage.getItem(`${cred.id}-salt`) ?? '' // Salt is empty after migration to non-extractable keys

      if (!iv) {
        throw new Error(
          `Missing encryption metadata for credential ${cred.provider}`,
        )
      }

      // Decrypt the API key using master password
      const decryptedApiKey = await SecureStorage.decryptCredential(
        cred.encryptedApiKey,
        iv,
        salt,
      )

      return {
        p: cred.provider,
        k: decryptedApiKey, // Store plaintext API key for export
        ...(cred.baseUrl && { b: cred.baseUrl }),
        ...(cred.model && { m: cred.model }),
      }
    }),
  )

  // Encrypt sensitive data with export password
  const encryptedData = await EasySetupCrypto.encrypt(
    {
      c: decryptedCredentials,
    },
    { password },
  )

  // Prepare public data - only essential fields
  const _agents = agents.map((agent) => ({
    n: agent.name,
    r: agent.role,
    i: agent.instructions,
    ...(agent.temperature !== undefined && { t: agent.temperature }),
  }))

  const setupData: EasySetupData = {
    v: '1',
    d: encryptedData,
    p: {
      a: _agents,
      ...(platformName && { n: platformName }),
    },
  }

  return encodeSetupData(setupData)
}
