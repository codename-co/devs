import { describe, it, expect, beforeAll } from 'vitest'
import {
  deriveEncryptionKey,
  encryptUpdate,
  decryptUpdate,
  isEncryptedUpdate,
  ENCRYPTION_VERSION,
  IV_LENGTH,
  VERSION_LENGTH,
  MIN_ENCRYPTED_LENGTH,
} from '@/lib/yjs/crypto'

describe('Sync Crypto', () => {
  describe('constants', () => {
    it('should have correct constant values', () => {
      expect(ENCRYPTION_VERSION).toBe(0x01)
      expect(IV_LENGTH).toBe(12)
      expect(VERSION_LENGTH).toBe(1)
      expect(MIN_ENCRYPTED_LENGTH).toBe(VERSION_LENGTH + IV_LENGTH + 16) // 29
    })
  })

  describe('deriveEncryptionKey', () => {
    it('should return a CryptoKey object', async () => {
      const key = await deriveEncryptionKey('password', 'room-1')
      expect(key).toBeInstanceOf(CryptoKey)
    })

    it('should be deterministic - same password and roomId produce equivalent keys', async () => {
      const key1 = await deriveEncryptionKey('password', 'room-1')
      const key2 = await deriveEncryptionKey('password', 'room-1')

      const data = new Uint8Array([1, 2, 3])
      const encrypted = await encryptUpdate(data, key1)
      const decrypted = await decryptUpdate(encrypted, key2)

      expect(decrypted).toEqual(data)
    })

    it('should produce different keys for different passwords', async () => {
      const key1 = await deriveEncryptionKey('password-a', 'room-1')
      const key2 = await deriveEncryptionKey('password-b', 'room-1')

      const data = new Uint8Array([1, 2, 3])
      const encrypted = await encryptUpdate(data, key1)

      await expect(decryptUpdate(encrypted, key2)).rejects.toThrow()
    })

    it('should produce different keys for different roomIds', async () => {
      const key1 = await deriveEncryptionKey('password', 'room-1')
      const key2 = await deriveEncryptionKey('password', 'room-2')

      const data = new Uint8Array([1, 2, 3])
      const encrypted = await encryptUpdate(data, key1)

      await expect(decryptUpdate(encrypted, key2)).rejects.toThrow()
    })

    it('should produce a non-extractable key', async () => {
      const key = await deriveEncryptionKey('password', 'room-1')
      expect(key.extractable).toBe(false)

      await expect(crypto.subtle.exportKey('raw', key)).rejects.toThrow()
    })

    it('should have correct usages (encrypt, decrypt)', async () => {
      const key = await deriveEncryptionKey('password', 'room-1')
      expect(key.usages).toContain('encrypt')
      expect(key.usages).toContain('decrypt')
    })

    it('should be AES-GCM with 256-bit length', async () => {
      const key = await deriveEncryptionKey('password', 'room-1')
      expect(key.algorithm.name).toBe('AES-GCM')
      expect((key.algorithm as AesKeyAlgorithm).length).toBe(256)
    })

    it('should use PBKDF2 (takes measurable time)', async () => {
      const start = performance.now()
      await deriveEncryptionKey('password', 'room-1')
      const elapsed = performance.now() - start
      expect(elapsed).toBeGreaterThan(1)
    })
  })

  describe('encryptUpdate', () => {
    let key: CryptoKey

    beforeAll(async () => {
      key = await deriveEncryptionKey('test-password', 'test-room')
    })

    it('should return a Uint8Array longer than input', async () => {
      const data = new Uint8Array([1, 2, 3])
      const encrypted = await encryptUpdate(data, key)

      expect(encrypted).toBeInstanceOf(Uint8Array)
      expect(encrypted.length).toBeGreaterThan(data.length)
    })

    it('should start with ENCRYPTION_VERSION byte', async () => {
      const data = new Uint8Array([1, 2, 3])
      const encrypted = await encryptUpdate(data, key)

      expect(encrypted[0]).toBe(ENCRYPTION_VERSION)
    })

    it('should produce output at least MIN_ENCRYPTED_LENGTH for minimal input', async () => {
      const data = new Uint8Array([])
      const encrypted = await encryptUpdate(data, key)

      expect(encrypted.length).toBeGreaterThanOrEqual(MIN_ENCRYPTED_LENGTH)
    })

    it('should produce different ciphertexts for the same data (random IV)', async () => {
      const data = new Uint8Array([1, 2, 3])
      const encrypted1 = await encryptUpdate(data, key)
      const encrypted2 = await encryptUpdate(data, key)

      // The IVs should differ, making the full output different
      const iv1 = encrypted1.slice(VERSION_LENGTH, VERSION_LENGTH + IV_LENGTH)
      const iv2 = encrypted2.slice(VERSION_LENGTH, VERSION_LENGTH + IV_LENGTH)

      expect(iv1).not.toEqual(iv2)
    })

    it('should encrypt empty updates', async () => {
      const data = new Uint8Array([])
      const encrypted = await encryptUpdate(data, key)

      expect(encrypted).toBeInstanceOf(Uint8Array)
      expect(encrypted.length).toBeGreaterThan(0)

      const decrypted = await decryptUpdate(encrypted, key)
      expect(decrypted).toEqual(data)
    })

    it('should encrypt large updates (100KB)', async () => {
      const data = new Uint8Array(100_000).fill(42)
      const encrypted = await encryptUpdate(data, key)

      expect(encrypted.length).toBeGreaterThan(data.length)

      const decrypted = await decryptUpdate(encrypted, key)
      expect(decrypted).toEqual(data)
    })
  })

  describe('decryptUpdate', () => {
    let key: CryptoKey

    beforeAll(async () => {
      key = await deriveEncryptionKey('test-password', 'test-room')
    })

    it('should round-trip: encrypt then decrypt returns original data', async () => {
      const data = new Uint8Array([10, 20, 30, 40, 50])
      const encrypted = await encryptUpdate(data, key)
      const decrypted = await decryptUpdate(encrypted, key)

      expect(decrypted).toEqual(data)
    })

    it('should work with various data sizes', async () => {
      const sizes = [
        { name: 'empty', data: new Uint8Array([]) },
        { name: '1 byte', data: new Uint8Array([0xff]) },
        { name: '1KB', data: new Uint8Array(1024).fill(0xab) },
        { name: '100KB', data: new Uint8Array(100_000).fill(42) },
      ]

      for (const { name, data } of sizes) {
        const encrypted = await encryptUpdate(data, key)
        const decrypted = await decryptUpdate(encrypted, key)
        expect(decrypted, `failed for size: ${name}`).toEqual(data)
      }
    })

    it('should throw on wrong key', async () => {
      const wrongKey = await deriveEncryptionKey('wrong-password', 'test-room')
      const data = new Uint8Array([1, 2, 3])
      const encrypted = await encryptUpdate(data, key)

      await expect(decryptUpdate(encrypted, wrongKey)).rejects.toThrow()
    })

    it('should throw on corrupted ciphertext', async () => {
      const data = new Uint8Array([1, 2, 3])
      const encrypted = await encryptUpdate(data, key)

      // Flip a byte in the ciphertext portion (after version + IV)
      const corrupted = new Uint8Array(encrypted)
      const ciphertextOffset = VERSION_LENGTH + IV_LENGTH
      corrupted[ciphertextOffset] ^= 0xff

      await expect(decryptUpdate(corrupted, key)).rejects.toThrow()
    })

    it('should throw on unsupported version', async () => {
      const data = new Uint8Array([1, 2, 3])
      const encrypted = await encryptUpdate(data, key)

      // Change version byte to unsupported value
      const modified = new Uint8Array(encrypted)
      modified[0] = 0xff

      await expect(decryptUpdate(modified, key)).rejects.toThrow()
    })

    it('should throw on truncated data (less than MIN_ENCRYPTED_LENGTH)', async () => {
      const truncated = new Uint8Array(MIN_ENCRYPTED_LENGTH - 1)
      truncated[0] = ENCRYPTION_VERSION

      await expect(decryptUpdate(truncated, key)).rejects.toThrow()
    })

    it('should throw on empty input', async () => {
      await expect(decryptUpdate(new Uint8Array([]), key)).rejects.toThrow()
    })
  })

  describe('isEncryptedUpdate', () => {
    let key: CryptoKey

    beforeAll(async () => {
      key = await deriveEncryptionKey('test-password', 'test-room')
    })

    it('should return true for encrypted data', async () => {
      const data = new Uint8Array([1, 2, 3])
      const encrypted = await encryptUpdate(data, key)

      expect(isEncryptedUpdate(encrypted)).toBe(true)
    })

    it('should return false for empty array', () => {
      expect(isEncryptedUpdate(new Uint8Array([]))).toBe(false)
    })

    it('should return false for data starting with wrong version', () => {
      const data = new Uint8Array([0x00, 0x01, 0x02, 0x03])
      expect(isEncryptedUpdate(data)).toBe(false)
    })

    it('should return false for plain Yjs updates (first byte != ENCRYPTION_VERSION)', () => {
      // Yjs updates typically start with 0x00 or other structural bytes
      const yjsLike = new Uint8Array([0x00, 0x05, 0x01, 0x00])
      expect(isEncryptedUpdate(yjsLike)).toBe(false)
    })

    it('should return false for data shorter than MIN_ENCRYPTED_LENGTH even with correct version byte', () => {
      const tooShort = new Uint8Array(MIN_ENCRYPTED_LENGTH - 1)
      tooShort[0] = ENCRYPTION_VERSION
      expect(isEncryptedUpdate(tooShort)).toBe(false)
    })

    it('should return true for data at MIN_ENCRYPTED_LENGTH with correct version byte', () => {
      const minimal = new Uint8Array(MIN_ENCRYPTED_LENGTH)
      minimal[0] = ENCRYPTION_VERSION
      expect(isEncryptedUpdate(minimal)).toBe(true)
    })
  })

  describe('cross-room isolation', () => {
    it('should not decrypt data encrypted with a different room key', async () => {
      const keyA = await deriveEncryptionKey('shared-password', 'room-a')
      const keyB = await deriveEncryptionKey('shared-password', 'room-b')

      const data = new Uint8Array([1, 2, 3])
      const encrypted = await encryptUpdate(data, keyA)

      await expect(decryptUpdate(encrypted, keyB)).rejects.toThrow()
    })

    it('should not decrypt data encrypted with a different password', async () => {
      const keyX = await deriveEncryptionKey('password-x', 'shared-room')
      const keyY = await deriveEncryptionKey('password-y', 'shared-room')

      const data = new Uint8Array([1, 2, 3])
      const encrypted = await encryptUpdate(data, keyX)

      await expect(decryptUpdate(encrypted, keyY)).rejects.toThrow()
    })
  })
})
