/**
 * Encryption Module Tests
 */

import { describe, it, expect } from 'vitest'
import {
  generateEncryptionKey,
  encrypt,
  decrypt,
  decryptJSON,
  exportKey,
  importKey,
  deriveKeyFromPassword,
  generateKeyId,
  hash,
  encryptBlob,
  decryptToBlob
} from '@/lib/sync/encryption'

describe('Encryption', () => {
  describe('generateEncryptionKey', () => {
    it('should generate AES-GCM-256 key', async () => {
      const key = await generateEncryptionKey()
      
      expect(key).toBeInstanceOf(CryptoKey)
      expect(key.algorithm.name).toBe('AES-GCM')
      expect((key.algorithm as AesKeyAlgorithm).length).toBe(256)
    })
    
    it('should generate unique keys', async () => {
      const key1 = await generateEncryptionKey()
      const key2 = await generateEncryptionKey()
      
      const exported1 = await exportKey(key1)
      const exported2 = await exportKey(key2)
      
      expect(exported1).not.toBe(exported2)
    })
  })
  
  describe('encrypt / decrypt', () => {
    it('should encrypt and decrypt string', async () => {
      const key = await generateEncryptionKey()
      const plaintext = 'Hello, World!'
      
      const encrypted = await encrypt(key, plaintext)
      
      expect(encrypted.ciphertext).toBeDefined()
      expect(encrypted.iv).toBeDefined()
      expect(encrypted.keyId).toBe('default')
      expect(encrypted.ciphertext).not.toBe(plaintext)
      
      const decrypted = await decrypt(key, encrypted)
      expect(decrypted).toBe(plaintext)
    })
    
    it('should encrypt and decrypt object', async () => {
      const key = await generateEncryptionKey()
      const data = { name: 'test', value: 123, nested: { a: 1 } }
      
      const encrypted = await encrypt(key, data)
      const decrypted = await decrypt(key, encrypted)
      
      expect(JSON.parse(decrypted)).toEqual(data)
    })
    
    it('should use custom keyId', async () => {
      const key = await generateEncryptionKey()
      const encrypted = await encrypt(key, 'test', 'custom-key-id')
      
      expect(encrypted.keyId).toBe('custom-key-id')
    })
    
    it('should fail decryption with wrong key', async () => {
      const key1 = await generateEncryptionKey()
      const key2 = await generateEncryptionKey()
      
      const encrypted = await encrypt(key1, 'secret')
      
      await expect(decrypt(key2, encrypted)).rejects.toThrow()
    })
    
    it('should produce different ciphertext for same plaintext', async () => {
      const key = await generateEncryptionKey()
      const plaintext = 'test'
      
      const encrypted1 = await encrypt(key, plaintext)
      const encrypted2 = await encrypt(key, plaintext)
      
      // Different IVs should produce different ciphertext
      expect(encrypted1.ciphertext).not.toBe(encrypted2.ciphertext)
      expect(encrypted1.iv).not.toBe(encrypted2.iv)
    })
  })
  
  describe('decryptJSON', () => {
    it('should decrypt and parse typed JSON', async () => {
      const key = await generateEncryptionKey()
      interface TestData {
        name: string
        count: number
      }
      const data: TestData = { name: 'test', count: 42 }
      
      const encrypted = await encrypt(key, data)
      const decrypted = await decryptJSON<TestData>(key, encrypted)
      
      expect(decrypted.name).toBe('test')
      expect(decrypted.count).toBe(42)
    })
  })
  
  describe('exportKey / importKey', () => {
    it('should export and import key', async () => {
      const original = await generateEncryptionKey()
      const exported = await exportKey(original)
      
      expect(typeof exported).toBe('string')
      expect(exported.length).toBeGreaterThan(0)
      
      const imported = await importKey(exported)
      expect(imported).toBeInstanceOf(CryptoKey)
      
      // Verify imported key works
      const encrypted = await encrypt(original, 'test')
      const decrypted = await decrypt(imported, encrypted)
      expect(decrypted).toBe('test')
    })
  })
  
  describe('deriveKeyFromPassword', () => {
    it('should derive key from password', async () => {
      const { key, salt } = await deriveKeyFromPassword('my-password')
      
      expect(key).toBeInstanceOf(CryptoKey)
      expect(salt).toBeInstanceOf(Uint8Array)
      expect(salt.length).toBe(16)
    })
    
    it('should derive same key with same password and salt', async () => {
      const { key: key1, salt } = await deriveKeyFromPassword('my-password')
      const { key: key2 } = await deriveKeyFromPassword('my-password', salt)
      
      // Test by encrypting/decrypting
      const encrypted = await encrypt(key1, 'test')
      const decrypted = await decrypt(key2, encrypted)
      expect(decrypted).toBe('test')
    })
    
    it('should derive different keys for different passwords', async () => {
      const { key: key1, salt } = await deriveKeyFromPassword('password1')
      const { key: key2 } = await deriveKeyFromPassword('password2', salt)
      
      const encrypted = await encrypt(key1, 'test')
      await expect(decrypt(key2, encrypted)).rejects.toThrow()
    })
  })
  
  describe('generateKeyId', () => {
    it('should generate 16-char hex string', () => {
      const keyId = generateKeyId()
      
      expect(keyId.length).toBe(16)
      expect(/^[0-9a-f]+$/.test(keyId)).toBe(true)
    })
    
    it('should generate unique IDs', () => {
      const ids = new Set(Array.from({ length: 100 }, () => generateKeyId()))
      expect(ids.size).toBe(100)
    })
  })
  
  describe('hash', () => {
    it('should hash string data', async () => {
      const hashValue = await hash('test data')
      
      expect(typeof hashValue).toBe('string')
      expect(hashValue.length).toBe(64) // SHA-256 = 32 bytes = 64 hex chars
    })
    
    it('should produce consistent hash', async () => {
      const hash1 = await hash('same data')
      const hash2 = await hash('same data')
      
      expect(hash1).toBe(hash2)
    })
    
    it('should produce different hash for different data', async () => {
      const hash1 = await hash('data 1')
      const hash2 = await hash('data 2')
      
      expect(hash1).not.toBe(hash2)
    })
  })
  
  describe('encryptBlob / decryptToBlob', () => {
    // Skip in jsdom environment - Blob.arrayBuffer() not supported
    it.skip('should encrypt and decrypt blob', async () => {
      const key = await generateEncryptionKey()
      const content = 'blob content'
      const blob = new Blob([content], { type: 'text/plain' })
      
      const { payload, mimeType } = await encryptBlob(key, blob)
      
      expect(payload.ciphertext).toBeDefined()
      expect(mimeType).toBe('text/plain')
      
      const decryptedBlob = await decryptToBlob(key, payload, mimeType)
      const decryptedContent = await decryptedBlob.text()
      
      expect(decryptedContent).toBe(content)
      expect(decryptedBlob.type).toBe('text/plain')
    })
  })
})
