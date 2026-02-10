/**
 * E2E encryption for Yjs sync updates using AES-GCM.
 *
 * Encrypts Yjs CRDT updates before they leave the client so the
 * WebSocket signaling server never sees plaintext document state.
 *
 * Wire format: [version(1)][iv(12)][ciphertext(N)]
 *
 * Uses Web Crypto API only — no external dependencies.
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Current wire-format version byte. */
export const ENCRYPTION_VERSION = 0x01

/** AES-GCM initialisation vector length in bytes. */
export const IV_LENGTH = 12

/** Version tag length in bytes. */
export const VERSION_LENGTH = 1

/** Minimum valid encrypted payload: version + IV + AES-GCM auth tag (16 bytes). */
export const MIN_ENCRYPTED_LENGTH = VERSION_LENGTH + IV_LENGTH + 16

/** PBKDF2 iteration count — meets OWASP 2023 recommendation (≥210K for SHA-256). */
const PBKDF2_ITERATIONS = 210_000

// ---------------------------------------------------------------------------
// Key Derivation
// ---------------------------------------------------------------------------

/**
 * Derives an AES-GCM-256 CryptoKey from a password and room ID.
 *
 * Uses PBKDF2 with 100 000 iterations and SHA-256.
 * The salt embeds the room ID with a **different** prefix
 * (`devs-e2e:`) than the one used for room-name derivation
 * (`devs-sync:`), ensuring cryptographic independence.
 *
 * @param password - User-supplied passphrase / sync secret.
 * @param roomId  - Unique room identifier used as salt context.
 * @returns A non-extractable AES-GCM CryptoKey.
 */
export async function deriveEncryptionKey(
  password: string,
  roomId: string,
): Promise<CryptoKey> {
  const encoder = new TextEncoder()

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveKey'],
  )

  const salt = encoder.encode(`devs-e2e:${roomId.length}:${roomId}`)

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false, // non-extractable
    ['encrypt', 'decrypt'],
  )
}

// ---------------------------------------------------------------------------
// Encrypt
// ---------------------------------------------------------------------------

/**
 * Encrypts a Yjs update using AES-GCM.
 *
 * A 1-byte version tag and a 12-byte random IV are prepended to the
 * ciphertext so that the receiver can decrypt without out-of-band data.
 *
 * @param update - Raw Yjs update (Uint8Array).
 * @param key    - AES-GCM CryptoKey from {@link deriveEncryptionKey}.
 * @returns Encrypted payload: `[version(1)][iv(12)][ciphertext(N)]`.
 */
export async function encryptUpdate(
  update: Uint8Array,
  key: CryptoKey,
): Promise<Uint8Array> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH))

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new Uint8Array(update),
  )

  const result = new Uint8Array(
    VERSION_LENGTH + IV_LENGTH + ciphertext.byteLength,
  )
  result[0] = ENCRYPTION_VERSION
  result.set(iv, VERSION_LENGTH)
  result.set(new Uint8Array(ciphertext), VERSION_LENGTH + IV_LENGTH)

  return result
}

// ---------------------------------------------------------------------------
// Decrypt
// ---------------------------------------------------------------------------

/**
 * Decrypts a previously encrypted Yjs update.
 *
 * Validates the version tag and extracts the IV from the wire format
 * before decrypting with AES-GCM.
 *
 * @param encrypted - Encrypted payload produced by {@link encryptUpdate}.
 * @param key       - The same AES-GCM CryptoKey used to encrypt.
 * @returns The original Yjs update (Uint8Array).
 * @throws {Error} If the version is unsupported, the data is too short,
 *                 or the key / ciphertext is invalid.
 */
export async function decryptUpdate(
  encrypted: Uint8Array,
  key: CryptoKey,
): Promise<Uint8Array> {
  if (encrypted.length < MIN_ENCRYPTED_LENGTH) {
    throw new Error(
      `Encrypted payload too short: expected at least ${MIN_ENCRYPTED_LENGTH} bytes, got ${encrypted.length}`,
    )
  }

  const version = encrypted[0]
  if (version !== ENCRYPTION_VERSION) {
    throw new Error(
      `Unsupported encryption version: 0x${version.toString(16).padStart(2, '0')}`,
    )
  }

  const iv = encrypted.slice(VERSION_LENGTH, VERSION_LENGTH + IV_LENGTH)
  const ciphertext = encrypted.slice(VERSION_LENGTH + IV_LENGTH)

  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext,
  )

  return new Uint8Array(plaintext)
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

/**
 * Checks whether a message looks like an encrypted update by inspecting
 * the version byte. Does **not** validate the ciphertext.
 *
 * @param data - Raw bytes received from the sync layer.
 * @returns `true` if the first byte matches {@link ENCRYPTION_VERSION}.
 */
export function isEncryptedUpdate(data: Uint8Array): boolean {
  return data.length >= MIN_ENCRYPTED_LENGTH && data[0] === ENCRYPTION_VERSION
}
