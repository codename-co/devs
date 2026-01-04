/**
 * Key Exchange for Workspace Sharing
 * Implements ECDH key agreement for sharing workspace keys
 */

// Use P-256 for ECDH (X25519 not widely supported in Web Crypto)
const ECDH_ALGORITHM = { name: 'ECDH', namedCurve: 'P-256' }
const AES_ALGORITHM = { name: 'AES-GCM', length: 256 }

/**
 * Generate an ECDH keypair for key exchange
 */
export async function generateKeyExchangeKeyPair(): Promise<CryptoKeyPair> {
  return crypto.subtle.generateKey(ECDH_ALGORITHM, true, ['deriveBits'])
}

/**
 * Derive a shared secret from ECDH key exchange
 */
export async function deriveSharedSecret(
  privateKey: CryptoKey,
  publicKey: CryptoKey,
): Promise<CryptoKey> {
  // Derive bits using ECDH
  const sharedBits = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: publicKey },
    privateKey,
    256,
  )

  // Import as AES key
  return crypto.subtle.importKey('raw', sharedBits, AES_ALGORITHM, false, [
    'encrypt',
    'decrypt',
  ])
}

/**
 * Encrypt a workspace key for a specific recipient
 */
export async function encryptKeyForRecipient(
  workspaceKey: CryptoKey,
  recipientPublicKey: CryptoKey,
  senderPrivateKey: CryptoKey,
): Promise<{ encryptedKey: string; iv: string }> {
  // Derive shared secret
  const sharedSecret = await deriveSharedSecret(
    senderPrivateKey,
    recipientPublicKey,
  )

  // Export workspace key
  const workspaceKeyBuffer = await crypto.subtle.exportKey('raw', workspaceKey)

  // Encrypt with shared secret
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encryptedKey = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    sharedSecret,
    workspaceKeyBuffer,
  )

  return {
    encryptedKey: bufferToBase64(encryptedKey),
    iv: bufferToBase64(iv.buffer as ArrayBuffer),
  }
}

/**
 * Decrypt a workspace key received from another user
 */
export async function decryptKeyFromSender(
  encryptedKey: string,
  iv: string,
  senderPublicKey: CryptoKey,
  recipientPrivateKey: CryptoKey,
): Promise<CryptoKey> {
  // Derive shared secret
  const sharedSecret = await deriveSharedSecret(
    recipientPrivateKey,
    senderPublicKey,
  )

  // Decrypt workspace key
  const decryptedKeyBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: base64ToBuffer(iv) },
    sharedSecret,
    base64ToBuffer(encryptedKey),
  )

  // Import as AES key
  return crypto.subtle.importKey(
    'raw',
    decryptedKeyBuffer,
    AES_ALGORITHM,
    true,
    ['encrypt', 'decrypt'],
  )
}

/**
 * Generate a new workspace encryption key
 */
export async function generateWorkspaceKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    AES_ALGORITHM,
    true, // extractable for sharing
    ['encrypt', 'decrypt'],
  )
}

/**
 * Import a public key from base64 string for key exchange
 */
export async function importPublicKeyForExchange(
  publicKeyBase64: string,
): Promise<CryptoKey> {
  const keyBuffer = base64ToBuffer(publicKeyBase64)
  return crypto.subtle.importKey('spki', keyBuffer, ECDH_ALGORITHM, true, [])
}

/**
 * Export public key to base64 for sharing
 */
export async function exportPublicKeyForExchange(
  publicKey: CryptoKey,
): Promise<string> {
  const keyBuffer = await crypto.subtle.exportKey('spki', publicKey)
  return bufferToBase64(keyBuffer)
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

function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer as ArrayBuffer
}
