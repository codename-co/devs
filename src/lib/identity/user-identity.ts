/**
 * User Identity Management
 * Handles cryptographic keypair generation and user identity lifecycle
 */

import type { UserIdentity, UserIdentityWithKeys } from '@/types'

// Constants
const KEY_ALGORITHM = { name: 'ECDSA', namedCurve: 'P-256' }
const HASH_ALGORITHM = 'SHA-256'

/**
 * Generate a new user identity with cryptographic keypair
 */
export async function generateUserIdentity(displayName?: string): Promise<UserIdentityWithKeys> {
  // Generate ECDSA keypair
  const keyPair = await crypto.subtle.generateKey(
    KEY_ALGORITHM,
    true, // extractable
    ['sign', 'verify']
  )
  
  // Export public key to derive user ID
  const publicKeyBuffer = await crypto.subtle.exportKey('spki', keyPair.publicKey)
  const publicKeyBase64 = bufferToBase64(publicKeyBuffer)
  
  // Derive user ID from public key hash
  const hashBuffer = await crypto.subtle.digest(HASH_ALGORITHM, publicKeyBuffer)
  const userId = bufferToHex(hashBuffer).slice(0, 32) // First 32 chars
  
  return {
    id: userId,
    publicKey: publicKeyBase64,
    publicCryptoKey: keyPair.publicKey,
    privateCryptoKey: keyPair.privateKey,
    displayName,
    createdAt: new Date()
  }
}

/**
 * Export identity for backup/transfer (encrypts private key)
 */
export async function exportIdentity(
  identity: UserIdentityWithKeys,
  password: string
): Promise<string> {
  // Derive encryption key from password
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const encryptionKey = await deriveKeyFromPassword(password, salt.buffer as ArrayBuffer)
  
  // Export private key
  const privateKeyBuffer = await crypto.subtle.exportKey('pkcs8', identity.privateCryptoKey)
  
  // Encrypt private key
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encryptedPrivateKey = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    encryptionKey,
    privateKeyBuffer
  )
  
  // Create export payload
  const exportData = {
    version: 1,
    id: identity.id,
    publicKey: identity.publicKey,
    displayName: identity.displayName,
    createdAt: identity.createdAt.toISOString(),
    encryptedPrivateKey: bufferToBase64(encryptedPrivateKey),
    iv: bufferToBase64(iv.buffer as ArrayBuffer),
    salt: bufferToBase64(salt.buffer as ArrayBuffer)
  }
  
  return btoa(JSON.stringify(exportData))
}

/**
 * Import identity from backup
 */
export async function importIdentity(
  exportedData: string,
  password: string
): Promise<UserIdentityWithKeys> {
  const data = JSON.parse(atob(exportedData))
  
  if (data.version !== 1) {
    throw new Error('Unsupported identity export version')
  }
  
  // Derive decryption key
  const salt = base64ToBuffer(data.salt)
  const decryptionKey = await deriveKeyFromPassword(password, salt)
  
  // Decrypt private key
  const iv = base64ToBuffer(data.iv)
  const encryptedPrivateKey = base64ToBuffer(data.encryptedPrivateKey)
  
  const privateKeyBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    decryptionKey,
    encryptedPrivateKey
  )
  
  // Import keys
  const privateKey = await crypto.subtle.importKey(
    'pkcs8',
    privateKeyBuffer,
    KEY_ALGORITHM,
    true,
    ['sign']
  )
  
  const publicKey = await crypto.subtle.importKey(
    'spki',
    base64ToBuffer(data.publicKey),
    KEY_ALGORITHM,
    true,
    ['verify']
  )
  
  return {
    id: data.id,
    publicKey: data.publicKey,
    publicCryptoKey: publicKey,
    privateCryptoKey: privateKey,
    displayName: data.displayName,
    createdAt: new Date(data.createdAt)
  }
}

/**
 * Serialize identity for storage (without private key for CryptoKey)
 */
export function serializeIdentity(identity: UserIdentity): UserIdentity {
  return {
    id: identity.id,
    publicKey: identity.publicKey,
    displayName: identity.displayName,
    avatar: identity.avatar,
    createdAt: identity.createdAt
  }
}

/**
 * Sign data with user's private key
 */
export async function signData(
  privateKey: CryptoKey,
  data: ArrayBuffer
): Promise<ArrayBuffer> {
  return crypto.subtle.sign(
    { name: 'ECDSA', hash: HASH_ALGORITHM },
    privateKey,
    data
  )
}

/**
 * Verify signature with user's public key
 */
export async function verifySignature(
  publicKey: CryptoKey,
  signature: ArrayBuffer,
  data: ArrayBuffer
): Promise<boolean> {
  return crypto.subtle.verify(
    { name: 'ECDSA', hash: HASH_ALGORITHM },
    publicKey,
    signature,
    data
  )
}

// Helper functions
async function deriveKeyFromPassword(password: string, salt: ArrayBuffer): Promise<CryptoKey> {
  const encoder = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  )
  
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer as ArrayBuffer
}

function bufferToHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}
