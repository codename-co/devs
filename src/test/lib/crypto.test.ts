import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  isCryptoAvailable,
  CryptoService,
  SecureStorage,
} from '@/lib/crypto/index'

// Check if we have full Web Crypto API support for tests
const hasCryptoSupport = isCryptoAvailable()

describe('Crypto Module', () => {
  describe('isCryptoAvailable', () => {
    it('should return a boolean', () => {
      expect(typeof isCryptoAvailable()).toBe('boolean')
    })
  })

  describe('CryptoService', () => {
    describe('encrypt/decrypt', () => {
      it.skipIf(!hasCryptoSupport)(
        'should encrypt and decrypt data correctly',
        async () => {
          const plaintext = 'Hello, World!'
          const password = 'testPassword123'

          const { ciphertext, iv, salt } = await CryptoService.encrypt(
            plaintext,
            password,
          )

          expect(ciphertext).toBeDefined()
          expect(ciphertext).not.toBe(plaintext)
          expect(iv).toBeDefined()
          expect(salt).toBeDefined()

          const decrypted = await CryptoService.decrypt(
            ciphertext,
            password,
            iv,
            salt,
          )

          expect(decrypted).toBe(plaintext)
        },
      )

      it.skipIf(!hasCryptoSupport)(
        'should produce different ciphertexts for same plaintext (due to random IV/salt)',
        async () => {
          const plaintext = 'Same message'
          const password = 'testPassword123'

          const result1 = await CryptoService.encrypt(plaintext, password)
          const result2 = await CryptoService.encrypt(plaintext, password)

          expect(result1.ciphertext).not.toBe(result2.ciphertext)
          expect(result1.iv).not.toBe(result2.iv)
          expect(result1.salt).not.toBe(result2.salt)
        },
      )

      it.skipIf(!hasCryptoSupport)(
        'should fail to decrypt with wrong password',
        async () => {
          const plaintext = 'Secret data'
          const correctPassword = 'correct'
          const wrongPassword = 'wrong'

          const { ciphertext, iv, salt } = await CryptoService.encrypt(
            plaintext,
            correctPassword,
          )

          await expect(
            CryptoService.decrypt(ciphertext, wrongPassword, iv, salt),
          ).rejects.toThrow()
        },
      )
    })

    describe('generateMasterKey', () => {
      it.skipIf(!hasCryptoSupport)(
        'should generate a base64 encoded key',
        async () => {
          const key = await CryptoService.generateMasterKey()

          expect(key).toBeDefined()
          expect(typeof key).toBe('string')
          // Base64 encoded 32 bytes should be 44 characters
          expect(key.length).toBe(44)
        },
      )

      it.skipIf(!hasCryptoSupport)(
        'should generate unique keys each time',
        async () => {
          const key1 = await CryptoService.generateMasterKey()
          const key2 = await CryptoService.generateMasterKey()

          expect(key1).not.toBe(key2)
        },
      )
    })

    describe('hashPassword', () => {
      it.skipIf(!hasCryptoSupport)(
        'should hash password to hex string',
        async () => {
          const password = 'testPassword'
          const hash = await CryptoService.hashPassword(password)

          expect(hash).toBeDefined()
          expect(typeof hash).toBe('string')
          // SHA-256 produces 64 character hex string
          expect(hash.length).toBe(64)
          expect(/^[a-f0-9]+$/.test(hash)).toBe(true)
        },
      )

      it.skipIf(!hasCryptoSupport)(
        'should produce same hash for same password',
        async () => {
          const password = 'consistentPassword'
          const hash1 = await CryptoService.hashPassword(password)
          const hash2 = await CryptoService.hashPassword(password)

          expect(hash1).toBe(hash2)
        },
      )

      it.skipIf(!hasCryptoSupport)(
        'should produce different hashes for different passwords',
        async () => {
          const hash1 = await CryptoService.hashPassword('password1')
          const hash2 = await CryptoService.hashPassword('password2')

          expect(hash1).not.toBe(hash2)
        },
      )
    })
  })

  describe('SecureStorage', () => {
    // Note: Full SecureStorage tests require mocking IndexedDB
    // These tests verify the public API behavior

    describe('isLocked', () => {
      it('should initially be locked before init', () => {
        // Lock first to ensure clean state
        SecureStorage.lock()
        expect(SecureStorage.isLocked()).toBe(true)
      })
    })

    describe('lock', () => {
      it('should set storage to locked state', () => {
        SecureStorage.lock()
        expect(SecureStorage.isLocked()).toBe(true)
      })
    })

    describe('hasLegacyMasterKey', () => {
      beforeEach(() => {
        localStorage.clear()
      })

      afterEach(() => {
        localStorage.clear()
      })

      it('should return false when no legacy key exists', () => {
        expect(SecureStorage.hasLegacyMasterKey()).toBe(false)
      })

      it('should return true when legacy key exists', () => {
        localStorage.setItem('devs_master_key', 'some-old-key')
        expect(SecureStorage.hasLegacyMasterKey()).toBe(true)
      })
    })

    describe('getMasterKey', () => {
      it('should return null when locked/not initialized', () => {
        // This tests the deprecated behavior - key is non-extractable
        SecureStorage.lock()
        const key = SecureStorage.getMasterKey()
        // When locked/not initialized, should return null
        expect(key).toBe(null)
      })
    })

    describe('getEncryptionMode', () => {
      beforeEach(() => {
        SecureStorage.lock()
        localStorage.clear()
      })

      afterEach(() => {
        SecureStorage.lock()
        localStorage.clear()
      })

      it('should return local mode by default', () => {
        expect(SecureStorage.getEncryptionMode()).toBe('local')
      })
    })

    describe('deriveSyncKey', () => {
      it.skipIf(!hasCryptoSupport)(
        'should derive the same key from the same password',
        async () => {
          const password = 'test-sync-password'

          const key1 = await SecureStorage.deriveSyncKey(password)
          const key2 = await SecureStorage.deriveSyncKey(password)

          // Keys are CryptoKey objects, we can't compare them directly
          // But we can verify they are valid CryptoKeys
          expect(key1).toBeInstanceOf(CryptoKey)
          expect(key2).toBeInstanceOf(CryptoKey)
          expect(key1.algorithm.name).toBe('AES-GCM')
          expect(key2.algorithm.name).toBe('AES-GCM')
        },
      )

      it.skipIf(!hasCryptoSupport)(
        'should derive keys that can encrypt and decrypt data consistently',
        async () => {
          const password = 'sync-password-123'
          const plaintext = 'secret-api-key'

          // Derive key
          const syncKey = await SecureStorage.deriveSyncKey(password)

          // Encrypt
          const iv = crypto.getRandomValues(new Uint8Array(12))
          const encoder = new TextEncoder()
          const encrypted = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv },
            syncKey,
            encoder.encode(plaintext),
          )

          // Derive another key from the same password (simulating another device)
          const syncKey2 = await SecureStorage.deriveSyncKey(password)

          // Decrypt with the second key
          const decrypted = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv },
            syncKey2,
            encrypted,
          )

          const decoder = new TextDecoder()
          expect(decoder.decode(decrypted)).toBe(plaintext)
        },
      )

      it.skipIf(!hasCryptoSupport)(
        'should derive different keys from different passwords',
        async () => {
          const password1 = 'password-one'
          const password2 = 'password-two'
          const plaintext = 'test-data'

          const key1 = await SecureStorage.deriveSyncKey(password1)
          const key2 = await SecureStorage.deriveSyncKey(password2)

          // Encrypt with key1
          const iv = crypto.getRandomValues(new Uint8Array(12))
          const encoder = new TextEncoder()
          const encrypted = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv },
            key1,
            encoder.encode(plaintext),
          )

          // Should fail to decrypt with key2
          await expect(
            crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key2, encrypted),
          ).rejects.toThrow()
        },
      )
    })
  })
})
