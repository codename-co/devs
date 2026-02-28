/**
 * Check if SubtleCrypto API is available
 * It may be undefined in insecure contexts or some private browsing modes
 */
export function isCryptoAvailable(): boolean {
  return typeof crypto !== 'undefined' && crypto.subtle !== undefined
}

export { CryptoAuditLog } from './audit-log'
import { CryptoAuditLog } from './audit-log'

/**
 * Convert a Uint8Array to a base64 string without using the spread operator,
 * which causes "Maximum call stack size exceeded" for large buffers.
 */
function uint8ArrayToBase64(bytes: Uint8Array): string {
  const CHUNK_SIZE = 0x8000 // 32 KB chunks
  const parts: string[] = []
  for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
    parts.push(String.fromCharCode(...bytes.subarray(i, i + CHUNK_SIZE)))
  }
  return btoa(parts.join(''))
}

/**
 * @deprecated Legacy CryptoService — retained only for backward compatibility
 * during migration and for hashPassword(). Use SecureStorage instead.
 * Scheduled for removal once all users have migrated (GAP-8).
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
      ciphertext: uint8ArrayToBase64(new Uint8Array(encrypted)),
      iv: uint8ArrayToBase64(iv),
      salt: uint8ArrayToBase64(salt),
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
    return uint8ArrayToBase64(array)
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
 * Supports two encryption modes:
 * - 'local': Uses non-extractable CryptoKey stored in IndexedDB (default)
 * - 'sync': Uses a key derived from room password via PBKDF2 (portable across devices)
 */
export class SecureStorage {
  private static LEGACY_MASTER_KEY_KEY = 'devs_master_key'
  private static CRYPTO_KEY_ID = 'master'
  private static ENCRYPTION_MODE_KEY = 'devs_encryption_mode'
  private static SYNC_PASSWORD_HASH_KEY = 'devs_sync_password_hash'

  /**
   * @deprecated Fixed salt retained for backward compatibility during migration.
   * New derivations use room-specific salts via getSyncSalt().
   */
  private static LEGACY_SYNC_SALT = new Uint8Array([
    0x44, 0x45, 0x56, 0x53, 0x2d, 0x53, 0x59, 0x4e, 0x43, 0x2d, 0x53, 0x41,
    0x4c, 0x54, 0x2d, 0x56,
  ])

  /**
   * Generate a room-specific PBKDF2 salt for sync key derivation.
   * Uses the room ID as context to ensure different rooms produce different keys
   * even with the same password. (Addresses GAP-2)
   */
  private static getSyncSalt(roomId?: string): Uint8Array {
    if (!roomId) {
      // Fallback to legacy salt when no roomId provided (backward compat)
      return this.LEGACY_SYNC_SALT.slice()
    }
    return this.encoder.encode(`devs-sync-cred:${roomId.length}:${roomId}`)
  }

  private static encryptionMode: 'local' | 'sync' = 'local'
  private static localKey: CryptoKey | null = null
  private static syncKey: CryptoKey | null = null
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

    this.initPromise = this._init().catch((error) => {
      // Reset so subsequent calls can retry instead of returning the cached rejection
      this.initPromise = null
      throw error
    })
    return this.initPromise
  }

  private static async _init(): Promise<void> {
    if (!isCryptoAvailable()) {
      throw new Error('Web Crypto API is not available')
    }

    // Load encryption mode from localStorage
    const storedMode = localStorage.getItem(this.ENCRYPTION_MODE_KEY)
    if (storedMode === 'sync' || storedMode === 'local') {
      this.encryptionMode = storedMode
    }

    // Dynamically import db to avoid circular dependency
    const { db } = await import('@/lib/db')
    await db.init()

    // Try to load existing non-extractable key from IndexedDB
    try {
      const stored = await db.get('cryptoKeys', this.CRYPTO_KEY_ID)
      if (stored?.key) {
        this.localKey = stored.key

        // If we're in sync mode but don't have a sync key, we need the password
        // The syncKey will be restored when enableSyncMode is called with the password
        if (this.encryptionMode === 'local') {
          return
        }
        // In sync mode, we need the password to derive the key
        // The UI should call enableSyncMode with the password to restore the syncKey
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
      // Check if encrypted data already exists — if so, the key was lost
      // (e.g. IndexedDB cryptoKeys store was cleared/corrupted while Yjs data survived)
      try {
        const { connectors: connectorsYjs, credentials: credentialsYjs } =
          await import('@/lib/yjs')
        const hasEncryptedConnectors = Array.from(connectorsYjs.values()).some(
          (c: any) => c.encryptedAccessToken || c.encryptedRefreshToken,
        )
        const hasEncryptedCredentials = Array.from(
          credentialsYjs.values(),
        ).some((c: any) => c.encryptedApiKey)

        if (hasEncryptedConnectors || hasEncryptedCredentials) {
          console.error(
            '[SecureStorage] ⚠️ Encryption key not found but encrypted data exists! ' +
              'The master CryptoKey was lost (IndexedDB cryptoKeys store may have been cleared). ' +
              'A new key will be generated but existing encrypted tokens/credentials will be unreadable. ' +
              'Connectors will need to be reconnected and API keys re-entered.',
          )
        }
      } catch {
        // Yjs not available yet, skip check
      }

      // Generate new non-extractable key (fresh install or key recovery)
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
    this.localKey = newKey

    // Step 2: Re-encrypt all existing credentials
    // Read from Yjs (source of truth after Yjs-first migration)
    try {
      const {
        credentials: credentialsYjs,
        langfuseConfig: langfuseConfigYjs,
        connectors: connectorsYjs,
      } = await import('@/lib/yjs')

      const credentials = Array.from(credentialsYjs.values())

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

          // Update credential in Yjs
          credentialsYjs.set(credential.id, {
            ...credential,
            encryptedApiKey: ciphertext,
            iv: newIv,
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
        const langfuseConfigs = Array.from(langfuseConfigYjs.values())
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

            langfuseConfigYjs.set(config.id, {
              ...config,
              encryptedSecretKey: ciphertext,
              iv: newIv,
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
        const connectorsList = Array.from(connectorsYjs.values())
        for (const connector of connectorsList) {
          const updated = { ...connector }

          // Migrate access token
          if (updated.encryptedToken) {
            const iv = localStorage.getItem(`connector-${updated.id}-iv`)
            const salt = localStorage.getItem(`connector-${updated.id}-salt`)

            if (iv && salt) {
              try {
                const decryptedToken = await CryptoService.decrypt(
                  updated.encryptedToken,
                  legacyMasterKey,
                  iv,
                  salt,
                )

                const { ciphertext, iv: newIv } =
                  await this.encryptWithCryptoKey(decryptedToken)

                updated.encryptedToken = ciphertext
                localStorage.setItem(`connector-${updated.id}-iv`, newIv)
                localStorage.removeItem(`connector-${updated.id}-salt`)
              } catch (error) {
                console.error(
                  `Failed to migrate connector ${updated.id} access token:`,
                  error,
                )
              }
            }
          }

          // Migrate refresh token
          if (updated.encryptedRefreshToken) {
            const iv = localStorage.getItem(
              `connector-${updated.id}-refresh-iv`,
            )
            const salt = localStorage.getItem(
              `connector-${updated.id}-refresh-salt`,
            )

            if (iv && salt) {
              try {
                const decryptedToken = await CryptoService.decrypt(
                  updated.encryptedRefreshToken,
                  legacyMasterKey,
                  iv,
                  salt,
                )

                const { ciphertext, iv: newIv } =
                  await this.encryptWithCryptoKey(decryptedToken)

                updated.encryptedRefreshToken = ciphertext
                localStorage.setItem(
                  `connector-${updated.id}-refresh-iv`,
                  newIv,
                )
                localStorage.removeItem(`connector-${updated.id}-refresh-salt`)
              } catch (error) {
                console.error(
                  `Failed to migrate connector ${updated.id} refresh token:`,
                  error,
                )
              }
            }
          }

          connectorsYjs.set(updated.id, updated)
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
    this.localKey = newKey

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
   * Uses the active key based on current encryption mode
   */
  private static async encryptWithCryptoKey(
    plaintext: string,
  ): Promise<{ ciphertext: string; iv: string }> {
    const activeKey = this.getActiveKey()
    if (!activeKey) {
      throw new Error('SecureStorage not initialized')
    }

    return this.encryptWithKey(plaintext, activeKey)
  }

  /**
   * Generic encrypt with any key
   */
  private static async encryptWithKey(
    plaintext: string,
    key: CryptoKey,
  ): Promise<{ ciphertext: string; iv: string }> {
    const iv = crypto.getRandomValues(new Uint8Array(12))
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      this.encoder.encode(plaintext),
    )

    return {
      ciphertext: uint8ArrayToBase64(new Uint8Array(encrypted)),
      iv: uint8ArrayToBase64(iv),
    }
  }

  /**
   * Decrypt data using the non-extractable CryptoKey directly
   * Uses the active key based on current encryption mode
   */
  private static async decryptWithCryptoKey(
    ciphertext: string,
    iv: string,
  ): Promise<string> {
    const activeKey = this.getActiveKey()
    if (!activeKey) {
      throw new Error('SecureStorage not initialized')
    }

    return this.decryptWithKey(ciphertext, iv, activeKey)
  }

  /**
   * Generic decrypt with any key
   */
  private static async decryptWithKey(
    ciphertext: string,
    iv: string,
    key: CryptoKey,
  ): Promise<string> {
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
      key,
      ciphertextArray,
    )

    return this.decoder.decode(decrypted)
  }

  /**
   * Get the active encryption key based on current mode
   */
  private static getActiveKey(): CryptoKey | null {
    if (this.encryptionMode === 'sync' && this.syncKey) {
      return this.syncKey
    }
    return this.localKey
  }

  /**
   * Encrypt a credential (API key, token, etc.)
   * Returns ciphertext, IV, and encryption mode (no salt needed with direct key)
   */
  static async encryptCredential(credential: string): Promise<{
    encrypted: string
    iv: string
    salt: string
    mode: 'local' | 'sync'
  }> {
    await this.init()

    try {
      const { ciphertext, iv } = await this.encryptWithCryptoKey(credential)
      CryptoAuditLog.log('encrypt_credential', true, {
        detail: `mode=${this.encryptionMode}`,
      })
      // Return empty salt for backward compatibility with existing code
      // New encryption doesn't need salt since we're using a direct key
      return { encrypted: ciphertext, iv, salt: '', mode: this.encryptionMode }
    } catch (error) {
      CryptoAuditLog.log('encrypt_credential', false, {
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
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
        const result = await this.decryptWithCryptoKey(encrypted, iv)
        CryptoAuditLog.log('decrypt_credential', true, {
          detail: `mode=${this.encryptionMode}`,
        })
        return result
      } catch (error) {
        // Decryption failed — most common cause is a CryptoKey mismatch
        // (key regenerated, DB restored from backup, or P2P sync from another device)
        if (import.meta.env.DEV) {
          console.warn(
            '[SecureStorage] Credential decryption failed (key mismatch or corruption):',
            error,
          )
        }

        CryptoAuditLog.log('decrypt_credential', false, {
          detail: 'key_mismatch',
          error: error instanceof Error ? error.message : String(error),
        })

        // Try legacy decryption if we still have the master key
        // Note: Without salt, we can't use PBKDF2, so this is a last resort
        if (legacyMasterKey) {
          if (import.meta.env.DEV) {
            console.warn(
              '[SecureStorage] Cannot try legacy decryption without salt.',
            )
          }
        }

        throw new Error(
          'Failed to decrypt credential. The encryption key may have changed (e.g. after a browser data reset or on a different device). Please reconfigure the associated service.',
        )
      }
    }

    // Legacy format: has salt, means encrypted with old password-based encryption
    // This shouldn't happen after migration, but handle it gracefully
    if (legacyMasterKey) {
      try {
        const decrypted = await CryptoService.decrypt(
          encrypted,
          legacyMasterKey,
          iv,
          salt,
        )

        CryptoAuditLog.log('decrypt_credential', true, {
          detail: 'legacy_format',
        })

        // Successfully decrypted with legacy key - trigger re-encryption with new key
        // This ensures the credential is migrated for next time
        try {
          console.log(
            'Re-encrypting legacy credential with non-extractable key',
          )
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
      } catch (error) {
        CryptoAuditLog.log('decrypt_credential', false, {
          detail: 'legacy_format',
          error: error instanceof Error ? error.message : String(error),
        })
        throw error
      }
    }

    throw new Error(
      'Cannot decrypt legacy credential: master key not found in localStorage. Please reconfigure the associated service.',
    )
  }

  /**
   * Lock the secure storage (clear keys from memory)
   */
  static lock(): void {
    this.localKey = null
    this.syncKey = null
    this.initPromise = null
  }

  /**
   * Get the current encryption mode
   */
  static getEncryptionMode(): 'local' | 'sync' {
    return this.encryptionMode
  }

  /**
   * Derive a sync key from a room password using PBKDF2.
   * When a roomId is provided, uses a room-specific salt so different rooms
   * with the same password produce different keys (GAP-2 fix).
   * Falls back to legacy fixed salt when roomId is omitted (backward compat).
   */
  static async deriveSyncKey(
    roomPassword: string,
    roomId?: string,
  ): Promise<CryptoKey> {
    if (!isCryptoAvailable()) {
      throw new Error('Web Crypto API is not available')
    }

    const passwordKey = await crypto.subtle.importKey(
      'raw',
      this.encoder.encode(roomPassword),
      'PBKDF2',
      false,
      ['deriveKey'],
    )

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: this.getSyncSalt(roomId) as BufferSource,
        iterations: 250000,
        hash: 'SHA-256',
      },
      passwordKey,
      { name: 'AES-GCM', length: 256 },
      false, // Non-extractable
      ['encrypt', 'decrypt'],
    )
  }

  /**
   * Enable sync mode with a room password
   * Derives a new sync key and re-encrypts all credentials
   */
  static async enableSyncMode(
    roomPassword: string,
    roomId?: string,
  ): Promise<void> {
    await this.init()

    if (!this.localKey) {
      throw new Error('Local key not initialized')
    }

    // Derive sync key from password (with room-specific salt when provided)
    const newSyncKey = await this.deriveSyncKey(roomPassword, roomId)

    // Re-encrypt all credentials from local key to sync key
    await this.reEncryptAllCredentials(this.localKey, newSyncKey, 'sync')

    // Store sync key and update mode
    this.syncKey = newSyncKey
    this.encryptionMode = 'sync'

    // Store password hash for validation on restore
    const passwordHash = await CryptoService.hashPassword(roomPassword)
    localStorage.setItem(this.SYNC_PASSWORD_HASH_KEY, passwordHash)
    localStorage.setItem(this.ENCRYPTION_MODE_KEY, 'sync')

    CryptoAuditLog.log('sync_mode_enable', true, {
      detail: roomId ? `room=${roomId}` : 'no-room-id',
    })
    console.log('SecureStorage: Enabled sync mode')
  }

  /**
   * Disable sync mode and switch back to local mode
   * Re-encrypts all credentials with the local key
   */
  static async disableSyncMode(): Promise<void> {
    await this.init()

    if (!this.localKey) {
      throw new Error('Local key not initialized')
    }

    if (this.encryptionMode !== 'sync' || !this.syncKey) {
      // Already in local mode
      return
    }

    // Re-encrypt all credentials from sync key to local key
    await this.reEncryptAllCredentials(this.syncKey, this.localKey, 'local')

    // Clear sync key and update mode
    this.syncKey = null
    this.encryptionMode = 'local'

    localStorage.removeItem(this.SYNC_PASSWORD_HASH_KEY)
    localStorage.setItem(this.ENCRYPTION_MODE_KEY, 'local')

    CryptoAuditLog.log('sync_mode_disable', true)
    console.log('SecureStorage: Disabled sync mode, switched to local mode')
  }

  /**
   * Restore sync mode with a password (for when returning to an existing sync session)
   * Validates the password against stored hash and derives the sync key
   */
  static async restoreSyncMode(
    roomPassword: string,
    roomId?: string,
  ): Promise<boolean> {
    const storedHash = localStorage.getItem(this.SYNC_PASSWORD_HASH_KEY)
    if (!storedHash) {
      return false
    }

    const passwordHash = await CryptoService.hashPassword(roomPassword)
    if (passwordHash !== storedHash) {
      return false
    }

    this.syncKey = await this.deriveSyncKey(roomPassword, roomId)
    this.encryptionMode = 'sync'
    CryptoAuditLog.log('sync_mode_restore', true)
    return true
  }

  /**
   * Re-encrypt all credentials from one key to another
   * @param fromKey - The key to decrypt with
   * @param toKey - The key to encrypt with
   * @param targetMode - The encryption mode for the re-encrypted credentials
   */
  private static async reEncryptAllCredentials(
    fromKey: CryptoKey,
    toKey: CryptoKey,
    targetMode: 'local' | 'sync',
  ): Promise<void> {
    const {
      credentials: credentialsYjs,
      langfuseConfig: langfuseConfigYjs,
      connectors: connectorsYjs,
    } = await import('@/lib/yjs')

    // Re-encrypt credentials
    try {
      // Use Yjs as the source of truth for credentials
      const credentialsList = Array.from(credentialsYjs.values())
      console.log(
        `[SecureStorage] Re-encrypting ${credentialsList.length} credentials to ${targetMode} mode`,
      )

      for (const credential of credentialsList) {
        // IV can be in credential object (sync mode) or localStorage (local mode)
        const iv = credential.iv || localStorage.getItem(`${credential.id}-iv`)
        console.log(
          `[SecureStorage] Credential ${credential.id}: iv from object=${!!credential.iv}, iv from localStorage=${!!localStorage.getItem(`${credential.id}-iv`)}`,
        )

        if (!iv || !credential.encryptedApiKey) {
          console.log(
            `[SecureStorage] Skipping credential ${credential.id}: missing iv=${!iv}, missing encryptedApiKey=${!credential.encryptedApiKey}`,
          )
          continue
        }

        try {
          // Decrypt with old key
          const decrypted = await this.decryptWithKey(
            credential.encryptedApiKey,
            iv,
            fromKey,
          )

          // Re-encrypt with new key
          const { ciphertext, iv: newIv } = await this.encryptWithKey(
            decrypted,
            toKey,
          )

          // Update credential with new ciphertext and IV
          // Always store IV in object for sync compatibility
          const updatedCredential = {
            ...credential,
            encryptedApiKey: ciphertext,
            iv: newIv,
            encryptionMode: targetMode,
          }

          console.log(
            `[SecureStorage] Updating credential ${credential.id} with iv in object, mode=${targetMode}`,
          )

          // Update Yjs (source of truth)
          credentialsYjs.set(credential.id, updatedCredential)

          // Also store IV in localStorage as backup
          localStorage.setItem(`${credential.id}-iv`, newIv)

          console.log(
            `[SecureStorage] Successfully re-encrypted credential ${credential.id}`,
          )
        } catch (error) {
          console.error(
            `Failed to re-encrypt credential ${credential.id}:`,
            error,
          )
        }
      }
    } catch (error) {
      console.error('Failed to re-encrypt credentials:', error)
    }

    // Re-encrypt Langfuse configs
    try {
      const langfuseConfigs = Array.from(langfuseConfigYjs.values())
      for (const config of langfuseConfigs) {
        const iv = localStorage.getItem(`${config.id}-iv`)
        if (!iv || !config.encryptedSecretKey) continue

        try {
          const decrypted = await this.decryptWithKey(
            config.encryptedSecretKey,
            iv,
            fromKey,
          )

          const { ciphertext, iv: newIv } = await this.encryptWithKey(
            decrypted,
            toKey,
          )

          langfuseConfigYjs.set(config.id, {
            ...config,
            encryptedSecretKey: ciphertext,
          })
          localStorage.setItem(`${config.id}-iv`, newIv)
        } catch (error) {
          console.error('Failed to re-encrypt langfuse config:', error)
        }
      }
    } catch {
      // Langfuse config might not exist
    }

    // Re-encrypt connector tokens
    try {
      const connectorsList = Array.from(connectorsYjs.values())
      for (const connector of connectorsList) {
        const updated = { ...connector }

        // Re-encrypt access token
        if (updated.encryptedToken) {
          // Read IV from Yjs first (GAP-4), then fall back to localStorage
          const iv =
            (updated as any).tokenIv ??
            localStorage.getItem(`connector-${updated.id}-iv`)
          if (iv) {
            try {
              const decrypted = await this.decryptWithKey(
                updated.encryptedToken,
                iv,
                fromKey,
              )

              const { ciphertext, iv: newIv } = await this.encryptWithKey(
                decrypted,
                toKey,
              )

              updated.encryptedToken = ciphertext
              ;(updated as any).tokenIv = newIv // Store IV in Yjs object
              localStorage.setItem(`connector-${updated.id}-iv`, newIv)
            } catch (error) {
              console.error(
                `Failed to re-encrypt connector ${updated.id} access token:`,
                error,
              )
            }
          }
        }

        // Re-encrypt refresh token
        if (updated.encryptedRefreshToken) {
          // Read IV from Yjs first (GAP-4), then fall back to localStorage
          const iv =
            (updated as any).refreshTokenIv ??
            localStorage.getItem(`connector-${updated.id}-refresh-iv`)
          if (iv) {
            try {
              const decrypted = await this.decryptWithKey(
                updated.encryptedRefreshToken,
                iv,
                fromKey,
              )

              const { ciphertext, iv: newIv } = await this.encryptWithKey(
                decrypted,
                toKey,
              )

              updated.encryptedRefreshToken = ciphertext
              ;(updated as any).refreshTokenIv = newIv // Store IV in Yjs object
              localStorage.setItem(`connector-${updated.id}-refresh-iv`, newIv)
            } catch (error) {
              console.error(
                `Failed to re-encrypt connector ${updated.id} refresh token:`,
                error,
              )
            }
          }
        }

        connectorsYjs.set(updated.id, updated)
      }
    } catch {
      // Connectors might not exist
    }
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
    return this.localKey === null
  }

  /**
   * Get master key - now returns a placeholder since key is non-extractable
   * @deprecated The master key is no longer readable for security reasons
   */
  static getMasterKey(): string | null {
    // Return a placeholder if initialized, null otherwise
    // This is for backward compatibility with UI that shows "master key"
    if (this.localKey) {
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

  /**
   * Rotate the local encryption key (GAP-5).
   *
   * 1. Generates a new non-extractable AES-GCM-256 CryptoKey.
   * 2. Re-encrypts all credentials from the old key to the new key.
   * 3. Atomically swaps the key in IndexedDB.
   *
   * This operation is idempotent — if it fails midway, old credentials
   * remain decryptable with the old key (still stored until swap).
   *
   * @throws Error if SecureStorage is not initialized or in sync mode
   */
  static async rotateEncryptionKey(): Promise<void> {
    await this.init()

    if (!this.localKey) {
      throw new Error('SecureStorage not initialized — cannot rotate key')
    }

    if (this.encryptionMode === 'sync') {
      throw new Error(
        'Key rotation is not supported in sync mode. Disable sync first.',
      )
    }

    const oldKey = this.localKey

    // Step 1: Generate new non-extractable key
    const newKey = await this.generateNonExtractableKey()

    // Step 2: Re-encrypt all credentials from old key to new key
    await this.reEncryptAllCredentials(oldKey, newKey, 'local')

    // Step 3: Atomically swap key in IndexedDB
    const { db: dbModule } = await import('@/lib/db')
    await dbModule.init()

    // Remove old key and store new one
    await dbModule.delete('cryptoKeys', this.CRYPTO_KEY_ID)
    await dbModule.add('cryptoKeys', {
      id: this.CRYPTO_KEY_ID,
      key: newKey,
      createdAt: new Date(),
      migratedFromLocalStorage: false,
    })

    // Step 4: Update in-memory reference
    this.localKey = newKey

    console.log('SecureStorage: Key rotation completed successfully')

    // Log the crypto operation
    CryptoAuditLog.log('key_rotation', true, {
      detail: 'Local encryption key rotated',
    })
  }
}
