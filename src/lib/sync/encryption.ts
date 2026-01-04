/**
 * End-to-End Encryption Module
 * Provides AES-GCM-256 encryption for synced data
 */

import type { EncryptedPayload } from '@/types'

const AES_ALGORITHM = { name: 'AES-GCM', length: 256 }
const IV_LENGTH = 12 // 96 bits for AES-GCM

/**
 * Generate a random encryption key
 */
export async function generateEncryptionKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    AES_ALGORITHM,
    true, // extractable for backup/sharing
    ['encrypt', 'decrypt']
  )
}

/**
 * Encrypt data with AES-GCM-256
 */
export async function encrypt(
  key: CryptoKey,
  data: string | object,
  keyId: string = 'default'
): Promise<EncryptedPayload> {
  // Convert data to string if object
  const plaintext = typeof data === 'string' ? data : JSON.stringify(data)
  const encoder = new TextEncoder()
  const plaintextBuffer = encoder.encode(plaintext)
  
  // Generate random IV
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH))
  
  // Encrypt
  const ciphertextBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    plaintextBuffer
  )
  
  return {
    ciphertext: bufferToBase64(ciphertextBuffer),
    iv: bufferToBase64(iv.buffer as ArrayBuffer),
    keyId
  }
}

/**
 * Decrypt data with AES-GCM-256
 */
export async function decrypt(
  key: CryptoKey,
  payload: EncryptedPayload
): Promise<string> {
  const ciphertextBuffer = base64ToBuffer(payload.ciphertext)
  const iv = base64ToBuffer(payload.iv)
  
  const plaintextBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertextBuffer
  )
  
  const decoder = new TextDecoder()
  return decoder.decode(plaintextBuffer)
}

/**
 * Decrypt and parse JSON data
 */
export async function decryptJSON<T>(
  key: CryptoKey,
  payload: EncryptedPayload
): Promise<T> {
  const plaintext = await decrypt(key, payload)
  return JSON.parse(plaintext) as T
}

/**
 * Export encryption key for storage/sharing
 */
export async function exportKey(key: CryptoKey): Promise<string> {
  const keyBuffer = await crypto.subtle.exportKey('raw', key)
  return bufferToBase64(keyBuffer)
}

/**
 * Import encryption key from storage
 */
export async function importKey(keyBase64: string): Promise<CryptoKey> {
  const keyBuffer = base64ToBuffer(keyBase64)
  return crypto.subtle.importKey(
    'raw',
    keyBuffer,
    AES_ALGORITHM,
    true,
    ['encrypt', 'decrypt']
  )
}

/**
 * Derive encryption key from password (for local storage encryption)
 */
export async function deriveKeyFromPassword(
  password: string,
  salt?: Uint8Array
): Promise<{ key: CryptoKey; salt: Uint8Array }> {
  const useSalt = salt || crypto.getRandomValues(new Uint8Array(16))
  
  const encoder = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  )
  
  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: useSalt.buffer as ArrayBuffer,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    AES_ALGORITHM,
    true,
    ['encrypt', 'decrypt']
  )
  
  return { key, salt: useSalt }
}

/**
 * Generate a random key ID
 */
export function generateKeyId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8))
  return bufferToHex(bytes)
}

/**
 * Hash data for integrity checking
 */
export async function hash(data: string | ArrayBuffer): Promise<string> {
  const buffer = typeof data === 'string' 
    ? new TextEncoder().encode(data)
    : data
  
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
  return bufferToHex(hashBuffer)
}

/**
 * Encrypt a file/blob
 */
export async function encryptBlob(
  key: CryptoKey,
  blob: Blob,
  keyId: string = 'default'
): Promise<{ payload: EncryptedPayload; mimeType: string }> {
  const buffer = await blob.arrayBuffer()
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH))
  
  const ciphertextBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    buffer
  )
  
  return {
    payload: {
      ciphertext: bufferToBase64(ciphertextBuffer),
      iv: bufferToBase64(iv.buffer as ArrayBuffer),
      keyId
    },
    mimeType: blob.type
  }
}

/**
 * Decrypt to a blob
 */
export async function decryptToBlob(
  key: CryptoKey,
  payload: EncryptedPayload,
  mimeType: string
): Promise<Blob> {
  const ciphertextBuffer = base64ToBuffer(payload.ciphertext)
  const iv = base64ToBuffer(payload.iv)
  
  const plaintextBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertextBuffer
  )
  
  return new Blob([plaintextBuffer], { type: mimeType })
}

// Helper functions
function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

function base64ToBuffer(base64: string): Uint8Array {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

function bufferToHex(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer)
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}
