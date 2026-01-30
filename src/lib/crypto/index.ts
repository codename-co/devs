/**
 * Check if SubtleCrypto API is available
 * It may be undefined in insecure contexts or some private browsing modes
 */
export function isCryptoAvailable(): boolean {
  return typeof crypto !== 'undefined' && crypto.subtle !== undefined
}

/**
 * Legacy CryptoService for backward compatibility during migration
 * Uses password-based key derivation (PBKDF2)
 */
export class CryptoService {
  private static encoder = new TextEncoder()
  private static decoder = new TextDecoder()

  private static assertCryptoAvailable(): void {
    if (!isCryptoAvailable()) {
      throw new Error(
        'Web Crypto API is not available. This may be due to an insecure context (non-HTTPS) or private browsing mode restrictions.',
      )
    }
  }

  private static async deriveKey(
    password: string,
    salt: Uint8Array,
  ): Promise<CryptoKey> {
    this.assertCryptoAvailable()
    const passwordKey = await crypto.subtle.importKey(
      'raw',
      this.encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveKey'],
    )

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: 100000,
        hash: 'SHA-256',
      },
      passwordKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt'],
    )
  }

  static async encrypt(
    plaintext: string,
    password: string,
  ): Promise<{
    ciphertext: string
    iv: string
    salt: string
  }> {
    this.assertCryptoAvailable()
    const salt = crypto.getRandomValues(new Uint8Array(16))
    const iv = crypto.getRandomValues(new Uint8Array(12))
    const key = await this.deriveKey(password, salt)

    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      this.encoder.encode(plaintext),
    )

    return {
      ciphertext: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
      iv: btoa(String.fromCharCode(...iv)),
      salt: btoa(String.fromCharCode(...salt)),
    }
  }

  static async decrypt(
    ciphertext: string,
    password: string,
    iv: string,
    salt: string,
  ): Promise<string> {
    this.assertCryptoAvailable()
    const saltArray = new Uint8Array(
      atob(salt)
        .split('')
        .map((c) => c.charCodeAt(0)),
    )
    const ivArray = new Uint8Array(
      atob(iv)
        .split('')
        .map((c) => c.charCodeAt(0)),
    )
    const ciphertextArray = new Uint8Array(
      atob(ciphertext)
        .split('')
        .map((c) => c.charCodeAt(0)),
    )

    const key = await this.deriveKey(password, saltArray)

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: ivArray },
      key,
      ciphertextArray,
    )

    return this.decoder.decode(decrypted)
  }

  /**
   * @deprecated Use SecureStorage with non-extractable keys instead
   */
  static async generateMasterKey(): Promise<string> {
    const array = new Uint8Array(32)
    crypto.getRandomValues(array)
    return btoa(String.fromCharCode(...array))
  }

  static async hashPassword(password: string): Promise<string> {
    this.assertCryptoAvailable()
    const msgBuffer = this.encoder.encode(password)
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
  }
}

/**
 * Secure storage using non-extractable CryptoKey stored in IndexedDB
 */
export class SecureStorage {
  private static LEGACY_MASTER_KEY_KEY = 'devs_master_key'
  private static CRYPTO_KEY_ID = 'master'
  private static cryptoKey: CryptoKey | null = null
  private static initPromise: Promise<void> | null = null
  private static encoder = new TextEncoder()
  private static decoder = new TextDecoder()

  /**
   * Initialize SecureStorage with non-extractable CryptoKey
   * Handles migration from legacy localStorage master key
   */
  static async init(): Promise<void> {
    // Prevent concurrent initialization
    if (this.initPromise) {
      return this.initPromise
    }

    this.initPromise = this._init()
    return this.initPromise
  }

  private static async _init(): Promise<void> {
    if (!isCryptoAvailable()) {
      throw new Error('Web Crypto API is not available')
    }

    // Dynamically import db to avoid circular dependency
    const { db } = await import('@/lib/db')
    await db.init()

    // Try to load existing non-extractable key from IndexedDB
    try {
      const stored = await db.get('cryptoKeys', this.CRYPTO_KEY_ID)
      if (stored?.key) {
        this.cryptoKey = stored.key
        return
      }
    } catch {
      // Store might not exist yet, continue with initialization
    }

    // Check if we need to migrate from legacy localStorage master key
    const legacyMasterKey = localStorage.getItem(this.LEGACY_MASTER_KEY_KEY)

    if (legacyMasterKey) {
      // Migration path: re-encrypt all credentials with new non-extractable key
      await this.migrateFromLegacyMasterKey(legacyMasterKey, db)
    } else {
      // Fresh installation: generate new non-extractable key
      await this.generateAndStoreNewKey(db, false)
    }
  }

  /**
   * Migrate from legacy localStorage master key to non-extractable CryptoKey
   * Re-encrypts all existing credentials with the new key
   */
  private static async migrateFromLegacyMasterKey(
    legacyMasterKey: string,
    db: any,
  ): Promise<void> {
    console.log(
      'SecureStorage: Migrating from legacy localStorage master key to non-extractable CryptoKey',
    )

    // Step 1: Generate new non-extractable key
    const newKey = await this.generateNonExtractableKey()
    this.cryptoKey = newKey

    // Step 2: Re-encrypt all existing credentials
    try {
      const credentials = await db.getAll('credentials')

      for (const credential of credentials) {
        const iv = localStorage.getItem(`${credential.id}-iv`)
        const salt = localStorage.getItem(`${credential.id}-salt`)

        if (!iv || !salt || !credential.encryptedApiKey) {
          continue
        }

        try {
          // Decrypt with legacy master key
          const decryptedApiKey = await CryptoService.decrypt(
            credential.encryptedApiKey,
            legacyMasterKey,
            iv,
            salt,
          )

          // Re-encrypt with new non-extractable key
          const { ciphertext, iv: newIv } =
            await this.encryptWithCryptoKey(decryptedApiKey)

          // Update credential in database
          await db.update('credentials', {
            ...credential,
            encryptedApiKey: ciphertext,
          })

          // Update IV in localStorage (salt is not needed with direct key)
          localStorage.setItem(`${credential.id}-iv`, newIv)
          localStorage.removeItem(`${credential.id}-salt`)
        } catch (error) {
          console.error(`Failed to migrate credential ${credential.id}:`, error)
          // Continue with other credentials
        }
      }

      // Step 3: Re-encrypt Langfuse config if exists
      try {
        const langfuseConfigs = await db.getAll('langfuse_config')
        for (const config of langfuseConfigs) {
          const iv = localStorage.getItem(`${config.id}-iv`)
          const salt = localStorage.getItem(`${config.id}-salt`)

          if (!iv || !salt || !config.encryptedSecretKey) {
            continue
          }

          try {
            const decryptedSecretKey = await CryptoService.decrypt(
              config.encryptedSecretKey,
              legacyMasterKey,
              iv,
              salt,
            )

            const { ciphertext, iv: newIv } =
              await this.encryptWithCryptoKey(decryptedSecretKey)

            await db.update('langfuse_config', {
              ...config,
              encryptedSecretKey: ciphertext,
            })

            localStorage.setItem(`${config.id}-iv`, newIv)
            localStorage.removeItem(`${config.id}-salt`)
          } catch (error) {
            console.error(`Failed to migrate langfuse config:`, error)
          }
        }
      } catch {
        // Langfuse config might not exist
      }

      // Step 4: Re-encrypt connector tokens if exists
      try {
        const connectors = await db.getAll('connectors')
        for (const connector of connectors) {
          // Migrate access token
          if (connector.encryptedAccessToken) {
            const iv = localStorage.getItem(`connector-${connector.id}-iv`)
            const salt = localStorage.getItem(`connector-${connector.id}-salt`)

            if (iv && salt) {
              try {
                const decryptedToken = await CryptoService.decrypt(
                  connector.encryptedAccessToken,
                  legacyMasterKey,
                  iv,
                  salt,
                )

                const { ciphertext, iv: newIv } =
                  await this.encryptWithCryptoKey(decryptedToken)

                connector.encryptedAccessToken = ciphertext
                localStorage.setItem(`connector-${connector.id}-iv`, newIv)
                localStorage.removeItem(`connector-${connector.id}-salt`)
              } catch (error) {
                console.error(
                  `Failed to migrate connector ${connector.id} access token:`,
                  error,
                )
              }
            }
          }

          // Migrate refresh token
          if (connector.encryptedRefreshToken) {
            const iv = localStorage.getItem(
              `connector-${connector.id}-refresh-iv`,
            )
            const salt = localStorage.getItem(
              `connector-${connector.id}-refresh-salt`,
            )

            if (iv && salt) {
              try {
                const decryptedToken = await CryptoService.decrypt(
                  connector.encryptedRefreshToken,
                  legacyMasterKey,
                  iv,
                  salt,
                )

                const { ciphertext, iv: newIv } =
                  await this.encryptWithCryptoKey(decryptedToken)

                connector.encryptedRefreshToken = ciphertext
                localStorage.setItem(
                  `connector-${connector.id}-refresh-iv`,
                  newIv,
                )
                localStorage.removeItem(
                  `connector-${connector.id}-refresh-salt`,
                )
              } catch (error) {
                console.error(
                  `Failed to migrate connector ${connector.id} refresh token:`,
                  error,
                )
              }
            }
          }

          await db.update('connectors', connector)
        }
      } catch {
        // Connectors might not exist
      }
    } catch (error) {
      console.error('Failed to migrate credentials:', error)
      // Continue anyway - new credentials will use the new key
    }

    // Step 5: Store new key in IndexedDB
    await db.add('cryptoKeys', {
      id: this.CRYPTO_KEY_ID,
      key: newKey,
      createdAt: new Date(),
      migratedFromLocalStorage: true,
    })

    // Step 6: Remove legacy master key from localStorage
    localStorage.removeItem(this.LEGACY_MASTER_KEY_KEY)

    console.log(
      'SecureStorage: Migration complete. Legacy master key removed from localStorage.',
    )
  }

  /**
   * Generate and store a new non-extractable CryptoKey
   */
  private static async generateAndStoreNewKey(
    db: any,
    migrated: boolean,
  ): Promise<void> {
    const newKey = await this.generateNonExtractableKey()
    this.cryptoKey = newKey

    await db.add('cryptoKeys', {
      id: this.CRYPTO_KEY_ID,
      key: newKey,
      createdAt: new Date(),
      migratedFromLocalStorage: migrated,
    })
  }

  /**
   * Generate a non-extractable AES-GCM 256-bit key
   * The key cannot be exported or read - only used for encrypt/decrypt operations
   */
  private static async generateNonExtractableKey(): Promise<CryptoKey> {
    return crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      false, // NON-EXTRACTABLE - key material cannot be read
      ['encrypt', 'decrypt'],
    )
  }

  /**
   * Encrypt data using the non-extractable CryptoKey directly
   */
  private static async encryptWithCryptoKey(
    plaintext: string,
  ): Promise<{ ciphertext: string; iv: string }> {
    if (!this.cryptoKey) {
      throw new Error('SecureStorage not initialized')
    }

    const iv = crypto.getRandomValues(new Uint8Array(12))
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      this.cryptoKey,
      this.encoder.encode(plaintext),
    )

    return {
      ciphertext: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
      iv: btoa(String.fromCharCode(...iv)),
    }
  }

  /**
   * Decrypt data using the non-extractable CryptoKey directly
   */
  private static async decryptWithCryptoKey(
    ciphertext: string,
    iv: string,
  ): Promise<string> {
    if (!this.cryptoKey) {
      throw new Error('SecureStorage not initialized')
    }

    const ivArray = new Uint8Array(
      atob(iv)
        .split('')
        .map((c) => c.charCodeAt(0)),
    )
    const ciphertextArray = new Uint8Array(
      atob(ciphertext)
        .split('')
        .map((c) => c.charCodeAt(0)),
    )

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: ivArray },
      this.cryptoKey,
      ciphertextArray,
    )

    return this.decoder.decode(decrypted)
  }

  /**
   * Encrypt a credential (API key, token, etc.)
   * Returns ciphertext and IV (no salt needed with direct key)
   */
  static async encryptCredential(
    credential: string,
  ): Promise<{ encrypted: string; iv: string; salt: string }> {
    await this.init()

    const { ciphertext, iv } = await this.encryptWithCryptoKey(credential)

    // Return empty salt for backward compatibility with existing code
    // New encryption doesn't need salt since we're using a direct key
    return { encrypted: ciphertext, iv, salt: '' }
  }

  /**
   * Decrypt a credential
   * Supports both new format (no salt) and legacy format (with salt, for migration period)
   * Uses fallback strategy to handle edge cases where migration may have partially failed
   */
  static async decryptCredential(
    encrypted: string,
    iv: string,
    salt: string,
  ): Promise<string> {
    await this.init()

    const legacyMasterKey = localStorage.getItem(this.LEGACY_MASTER_KEY_KEY)

    // New format: empty salt means encrypted with non-extractable key
    if (!salt || salt === '') {
      try {
        return await this.decryptWithCryptoKey(encrypted, iv)
      } catch (error) {
        // If decryption fails, we might have a credential that wasn't properly migrated
        // This can happen if: 1) migration failed silently, 2) DB was restored from backup
        console.warn(
          'Failed to decrypt with non-extractable key, checking for legacy format...',
          error,
        )

        // Try legacy decryption if we still have the master key
        // Note: Without salt, we can't use PBKDF2, so this is a last resort
        if (legacyMasterKey) {
          // Check if there's a salt stored with a different key pattern
          // (some older versions may have stored differently)
          console.warn(
            'Cannot try legacy decryption without salt. The credential may need to be re-configured.',
          )
        }

        throw new Error(
          'Failed to decrypt credential. The credential may be corrupted or from an incompatible version. Please reconfigure your LLM provider.',
        )
      }
    }

    // Legacy format: has salt, means encrypted with old password-based encryption
    // This shouldn't happen after migration, but handle it gracefully
    if (legacyMasterKey) {
      const decrypted = await CryptoService.decrypt(
        encrypted,
        legacyMasterKey,
        iv,
        salt,
      )

      // Successfully decrypted with legacy key - trigger re-encryption with new key
      // This ensures the credential is migrated for next time
      try {
        console.log('Re-encrypting legacy credential with non-extractable key')
        // Verify re-encryption would work (but don't save - that's the caller's responsibility)
        await this.encryptWithCryptoKey(decrypted)
        console.log(
          'Legacy credential decrypted successfully. Consider re-saving to migrate to new encryption.',
        )

        // Note: We return the decrypted value but the credential remains in legacy format
        // Full migration requires updating the database which is out of scope here
      } catch (reencryptError) {
        console.warn('Failed to prepare re-encryption:', reencryptError)
      }

      return decrypted
    }

    throw new Error(
      'Cannot decrypt legacy credential: master key not found in localStorage. Please reconfigure your LLM provider.',
    )
  }

  /**
   * Lock the secure storage (clear key from memory)
   */
  static lock(): void {
    this.cryptoKey = null
    this.initPromise = null
  }

  /**
   * Unlock is now a no-op since we use non-extractable keys
   * The key is automatically loaded from IndexedDB on init
   * @deprecated No longer needed with non-extractable keys
   */
  static unlock(_masterKey: string): void {
    // No-op - kept for backward compatibility
  }

  /**
   * Check if secure storage is locked
   */
  static isLocked(): boolean {
    return this.cryptoKey === null
  }

  /**
   * Get master key - now returns a placeholder since key is non-extractable
   * @deprecated The master key is no longer readable for security reasons
   */
  static getMasterKey(): string | null {
    // Return a placeholder if initialized, null otherwise
    // This is for backward compatibility with UI that shows "master key"
    if (this.cryptoKey) {
      return '[Non-extractable key stored securely in browser]'
    }
    return null
  }

  /**
   * Regenerate the master key
   * WARNING: This will invalidate all existing encrypted data!
   */
  static async regenerateMasterKey(): Promise<string> {
    const { db } = await import('@/lib/db')
    await db.init()

    // Delete old key
    try {
      await db.delete('cryptoKeys', this.CRYPTO_KEY_ID)
    } catch {
      // Key might not exist
    }

    // Generate and store new key
    await this.generateAndStoreNewKey(db, false)

    // Return placeholder since key is non-extractable
    return '[Non-extractable key regenerated]'
  }

  /**
   * Check if the system has been migrated to non-extractable keys
   */
  static async hasMigratedToNonExtractableKey(): Promise<boolean> {
    const { db } = await import('@/lib/db')
    await db.init()

    try {
      const stored = await db.get('cryptoKeys', this.CRYPTO_KEY_ID)
      return !!stored?.key
    } catch {
      return false
    }
  }

  /**
   * Check if there's a legacy master key that needs migration
   */
  static hasLegacyMasterKey(): boolean {
    return localStorage.getItem(this.LEGACY_MASTER_KEY_KEY) !== null
  }
}
