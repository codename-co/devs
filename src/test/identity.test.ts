/**
 * Identity System Tests
 */

import { describe, it, expect } from 'vitest'
import {
  generateUserIdentity,
  exportIdentity,
  importIdentity,
  serializeIdentity,
  signData,
  verifySignature,
} from '@/lib/identity/user-identity'
import {
  generateDeviceIdentity,
  updateDeviceLastSeen,
} from '@/lib/identity/device-identity'
import {
  generateKeyExchangeKeyPair,
  deriveSharedSecret,
  encryptKeyForRecipient,
  decryptKeyFromSender,
  generateWorkspaceKey,
} from '@/lib/identity/key-exchange'

describe('User Identity', () => {
  describe('generateUserIdentity', () => {
    it('should generate a valid user identity with keys', async () => {
      const identity = await generateUserIdentity('Test User')

      expect(identity.id).toBeDefined()
      expect(identity.id.length).toBe(32) // 32 hex chars
      expect(identity.publicKey).toBeDefined()
      expect(identity.publicCryptoKey).toBeInstanceOf(CryptoKey)
      expect(identity.privateCryptoKey).toBeInstanceOf(CryptoKey)
      expect(identity.displayName).toBe('Test User')
      expect(identity.createdAt).toBeInstanceOf(Date)
    })

    it('should generate unique IDs for different identities', async () => {
      const identity1 = await generateUserIdentity()
      const identity2 = await generateUserIdentity()

      expect(identity1.id).not.toBe(identity2.id)
      expect(identity1.publicKey).not.toBe(identity2.publicKey)
    })

    it('should work without display name', async () => {
      const identity = await generateUserIdentity()

      expect(identity.id).toBeDefined()
      expect(identity.displayName).toBeUndefined()
    })
  })

  describe('exportIdentity / importIdentity', () => {
    it('should export and import identity with correct password', async () => {
      const original = await generateUserIdentity('Export Test')
      const password = 'test-password-123'

      const exported = await exportIdentity(original, password)
      expect(exported).toBeDefined()
      expect(typeof exported).toBe('string')

      const imported = await importIdentity(exported, password)

      expect(imported.id).toBe(original.id)
      expect(imported.publicKey).toBe(original.publicKey)
      expect(imported.displayName).toBe(original.displayName)
      expect(imported.publicCryptoKey).toBeInstanceOf(CryptoKey)
      expect(imported.privateCryptoKey).toBeInstanceOf(CryptoKey)
    })

    it('should fail import with wrong password', async () => {
      const original = await generateUserIdentity('Password Test')
      const exported = await exportIdentity(original, 'correct-password')

      await expect(importIdentity(exported, 'wrong-password')).rejects.toThrow()
    })
  })

  describe('serializeIdentity', () => {
    it('should serialize identity without crypto keys', async () => {
      const identity = await generateUserIdentity('Serialize Test')
      const serialized = serializeIdentity(identity)

      expect(serialized.id).toBe(identity.id)
      expect(serialized.publicKey).toBe(identity.publicKey)
      expect(serialized.displayName).toBe(identity.displayName)
      expect((serialized as any).publicCryptoKey).toBeUndefined()
      expect((serialized as any).privateCryptoKey).toBeUndefined()
    })
  })

  describe('signData / verifySignature', () => {
    it('should sign and verify data correctly', async () => {
      const identity = await generateUserIdentity()
      const data = new TextEncoder().encode('test message')
        .buffer as ArrayBuffer

      const signature = await signData(identity.privateCryptoKey, data)
      expect(signature).toBeDefined()
      expect(signature.byteLength).toBeGreaterThan(0)

      const isValid = await verifySignature(
        identity.publicCryptoKey,
        signature,
        data,
      )
      expect(isValid).toBe(true)
    })

    it('should fail verification with wrong data', async () => {
      const identity = await generateUserIdentity()
      const data = new TextEncoder().encode('test message')
        .buffer as ArrayBuffer
      const wrongData = new TextEncoder().encode('wrong message')
        .buffer as ArrayBuffer

      const signature = await signData(identity.privateCryptoKey, data)
      const isValid = await verifySignature(
        identity.publicCryptoKey,
        signature,
        wrongData,
      )

      expect(isValid).toBe(false)
    })

    it('should fail verification with wrong key', async () => {
      const identity1 = await generateUserIdentity()
      const identity2 = await generateUserIdentity()
      const data = new TextEncoder().encode('test message')
        .buffer as ArrayBuffer

      const signature = await signData(identity1.privateCryptoKey, data)
      const isValid = await verifySignature(
        identity2.publicCryptoKey,
        signature,
        data,
      )

      expect(isValid).toBe(false)
    })
  })
})

describe('Device Identity', () => {
  describe('generateDeviceIdentity', () => {
    it('should generate device identity linked to user', async () => {
      const userId = 'test-user-id'
      const { device, privateKey } = await generateDeviceIdentity(
        userId,
        'Test Device',
      )

      expect(device.id).toBeDefined()
      expect(device.id.length).toBe(16) // 16 hex chars
      expect(device.userId).toBe(userId)
      expect(device.name).toBe('Test Device')
      expect(device.publicKey).toBeDefined()
      expect(device.lastSeen).toBeInstanceOf(Date)
      expect(privateKey).toBeInstanceOf(CryptoKey)
    })

    it('should auto-detect device name if not provided', async () => {
      const { device } = await generateDeviceIdentity('user-id')

      expect(device.name).toBeDefined()
      expect(device.name.length).toBeGreaterThan(0)
    })
  })

  describe('updateDeviceLastSeen', () => {
    it('should update lastSeen timestamp', async () => {
      const { device } = await generateDeviceIdentity('user-id', 'Test')
      const originalTime = device.lastSeen

      // Wait a bit to ensure time difference
      await new Promise((resolve) => setTimeout(resolve, 10))

      const updated = updateDeviceLastSeen(device)

      expect(updated.lastSeen.getTime()).toBeGreaterThan(originalTime.getTime())
      expect(updated.id).toBe(device.id)
    })
  })
})

describe('Key Exchange', () => {
  describe('generateKeyExchangeKeyPair', () => {
    it('should generate ECDH keypair', async () => {
      const keyPair = await generateKeyExchangeKeyPair()

      expect(keyPair.publicKey).toBeInstanceOf(CryptoKey)
      expect(keyPair.privateKey).toBeInstanceOf(CryptoKey)
    })
  })

  describe('deriveSharedSecret', () => {
    it('should derive same shared secret from both sides', async () => {
      const aliceKeys = await generateKeyExchangeKeyPair()
      const bobKeys = await generateKeyExchangeKeyPair()

      const aliceShared = await deriveSharedSecret(
        aliceKeys.privateKey,
        bobKeys.publicKey,
      )
      const bobShared = await deriveSharedSecret(
        bobKeys.privateKey,
        aliceKeys.publicKey,
      )

      // Both should be usable AES keys
      expect(aliceShared).toBeInstanceOf(CryptoKey)
      expect(bobShared).toBeInstanceOf(CryptoKey)

      // Verify they produce same encryption result
      const testData = new TextEncoder().encode('test')
      const iv = crypto.getRandomValues(new Uint8Array(12))

      const aliceEncrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        aliceShared,
        testData,
      )

      const bobDecrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        bobShared,
        aliceEncrypted,
      )

      expect(new TextDecoder().decode(bobDecrypted)).toBe('test')
    })
  })

  describe('encryptKeyForRecipient / decryptKeyFromSender', () => {
    it('should encrypt and decrypt workspace key between users', async () => {
      const senderKeys = await generateKeyExchangeKeyPair()
      const recipientKeys = await generateKeyExchangeKeyPair()
      const workspaceKey = await generateWorkspaceKey()

      // Sender encrypts workspace key for recipient
      const { encryptedKey, iv } = await encryptKeyForRecipient(
        workspaceKey,
        recipientKeys.publicKey,
        senderKeys.privateKey,
      )

      expect(encryptedKey).toBeDefined()
      expect(iv).toBeDefined()

      // Recipient decrypts workspace key
      const decryptedKey = await decryptKeyFromSender(
        encryptedKey,
        iv,
        senderKeys.publicKey,
        recipientKeys.privateKey,
      )

      expect(decryptedKey).toBeInstanceOf(CryptoKey)

      // Verify the decrypted key works the same as original
      const testData = new TextEncoder().encode('workspace data')
      const testIv = crypto.getRandomValues(new Uint8Array(12))

      const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: testIv },
        workspaceKey,
        testData,
      )

      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: testIv },
        decryptedKey,
        encrypted,
      )

      expect(new TextDecoder().decode(decrypted)).toBe('workspace data')
    })
  })

  describe('generateWorkspaceKey', () => {
    it('should generate AES-GCM-256 key', async () => {
      const key = await generateWorkspaceKey()

      expect(key).toBeInstanceOf(CryptoKey)
      expect(key.algorithm.name).toBe('AES-GCM')
    })
  })
})
