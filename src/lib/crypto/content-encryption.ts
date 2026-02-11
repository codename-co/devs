/**
 * Content Encryption Service
 *
 * Provides field-level AES-GCM-256 encryption for user content stored in Yjs maps.
 * This ensures that sensitive data (emails, files, conversations, memories) is
 * encrypted at rest in IndexedDB.
 *
 * Uses the same SecureStorage key infrastructure as credential encryption —
 * non-extractable CryptoKey in local mode, PBKDF2-derived key in sync mode.
 *
 * Wire format per field: { value: base64(ciphertext), iv: base64(iv) }
 *
 * @module lib/crypto/content-encryption
 */

import { SecureStorage } from './index'

// ============================================================================
// Types
// ============================================================================

/**
 * An encrypted field value with its initialization vector.
 * Stored in Yjs alongside the original field name.
 */
export interface EncryptedField {
  /** Base64-encoded AES-GCM ciphertext */
  ct: string
  /** Base64-encoded 12-byte initialization vector */
  iv: string
}

/**
 * Marker interface: an object whose sensitive fields have been encrypted.
 * The `_encrypted` flag indicates whether the object's fields are encrypted.
 */
export interface EncryptedObject {
  _encrypted?: boolean
}

// ============================================================================
// Core API
// ============================================================================

/**
 * Encrypt a single string field using AES-GCM-256.
 *
 * Returns an EncryptedField containing base64-encoded ciphertext and IV,
 * or null if the input is null/undefined/empty.
 *
 * @param plaintext - The plaintext string to encrypt.
 * @returns The encrypted field, or null for empty/missing input.
 */
export async function encryptField(
  plaintext: string | undefined | null,
): Promise<EncryptedField | null> {
  if (plaintext === undefined || plaintext === null || plaintext === '') {
    return null
  }

  const result = await SecureStorage.encryptCredential(plaintext)
  return {
    ct: result.encrypted,
    iv: result.iv,
  }
}

/**
 * Decrypt a single encrypted field back to its original string.
 *
 * @param field - The encrypted field (ciphertext + IV).
 * @returns The decrypted plaintext string.
 * @throws If decryption fails (wrong key, corrupted data).
 */
export async function decryptField(field: EncryptedField): Promise<string> {
  return SecureStorage.decryptCredential(field.ct, field.iv, '')
}

/**
 * Check whether a value is an EncryptedField (has ct + iv properties).
 */
export function isEncryptedField(value: unknown): value is EncryptedField {
  return (
    typeof value === 'object' &&
    value !== null &&
    'ct' in value &&
    'iv' in value &&
    typeof (value as EncryptedField).ct === 'string' &&
    typeof (value as EncryptedField).iv === 'string'
  )
}

// ============================================================================
// Object-Level Encryption Helpers
// ============================================================================

/**
 * Encrypt specified fields of an object.
 *
 * For each field name in `fieldNames`, if the field exists and is a non-empty
 * string, it is replaced with an EncryptedField. The original field value is
 * removed and replaced with the encrypted version.
 *
 * Sets `_encrypted: true` on the returned object.
 *
 * @param obj - The object containing plaintext fields.
 * @param fieldNames - Names of string fields to encrypt.
 * @returns A new object with the specified fields encrypted.
 */
export async function encryptFields<T extends object>(
  obj: T,
  fieldNames: string[],
): Promise<T & EncryptedObject> {
  const result = { ...obj } as T & EncryptedObject
  const record = obj as Record<string, unknown>

  const encryptionPromises = fieldNames.map(async (fieldName) => {
    const value = record[fieldName]
    if (typeof value === 'string' && value !== '') {
      const encrypted = await encryptField(value)
      if (encrypted) {
        return { fieldName, encrypted }
      }
    }
    return null
  })

  const results = await Promise.all(encryptionPromises)

  for (const entry of results) {
    if (entry) {
      // Store encrypted field value — the field now holds an EncryptedField
      // instead of a string. TypeScript type is widened intentionally.
      ;(result as Record<string, unknown>)[entry.fieldName] = entry.encrypted
    }
  }

  ;(result as EncryptedObject)._encrypted = true
  return result
}

/**
 * Decrypt specified fields of an object.
 *
 * For each field name in `fieldNames`, if the field holds an EncryptedField
 * (detected via `isEncryptedField`), it is decrypted back to a string.
 *
 * If the field is already a plain string (not encrypted), it is returned as-is.
 * This provides backward compatibility with pre-encryption data.
 *
 * Removes the `_encrypted` flag from the returned object.
 *
 * @param obj - The object containing encrypted fields.
 * @param fieldNames - Names of fields to decrypt.
 * @returns A new object with the specified fields decrypted.
 */
export async function decryptFields<T extends object>(
  obj: T,
  fieldNames: string[],
): Promise<T> {
  // Check whether any field actually needs decryption.
  // We no longer rely solely on the `_encrypted` flag because it may be
  // missing when data is round-tripped through Yjs or legacy storage.
  const record = obj as Record<string, unknown>
  const hasEncryptedFields = fieldNames.some((fn) =>
    isEncryptedField(record[fn]),
  )

  if (!hasEncryptedFields) {
    return obj
  }

  const result = { ...obj }

  const decryptionPromises = fieldNames.map(async (fieldName) => {
    const value = record[fieldName]
    if (isEncryptedField(value)) {
      try {
        const decrypted = await decryptField(value)
        return { fieldName, decrypted }
      } catch (error) {
        // Decryption failed (wrong key, uninitialised SecureStorage, etc.).
        // Replace with empty string so the field is never rendered as an object.
        console.warn(
          `[ContentEncryption] Failed to decrypt field "${fieldName}":`,
          error instanceof Error ? error.message : error,
        )
        return { fieldName, decrypted: '' }
      }
    }
    // Already a plain string or missing — no-op
    return null
  })

  const results = await Promise.all(decryptionPromises)

  for (const entry of results) {
    if (entry) {
      ;(result as Record<string, unknown>)[entry.fieldName] = entry.decrypted
    }
  }

  // Remove encryption marker from the decrypted view
  delete (result as EncryptedObject)._encrypted

  return result
}

/**
 * Safely extract a renderable string from a value that may be an EncryptedField.
 * Returns the value as-is if it is already a string, or a fallback for
 * encrypted / non-string values.  Use this in rendering code to prevent
 * `{ct, iv}` objects from being passed as React children.
 */
export function safeString(value: unknown, fallback: string = ''): string {
  if (typeof value === 'string') return value
  if (isEncryptedField(value)) return fallback
  if (value === null || value === undefined) return fallback
  return fallback
}

// ============================================================================
// Entity-Specific Encryption
// ============================================================================

/** Fields to encrypt on KnowledgeItem objects */
export const KNOWLEDGE_ENCRYPTED_FIELDS = [
  'content',
  'transcript',
  'description',
] as const

/** Fields to encrypt on Message objects */
export const MESSAGE_ENCRYPTED_FIELDS = [
  'content',
  'pinnedDescription',
] as const

/** Fields to encrypt on Conversation objects (top-level) */
export const CONVERSATION_ENCRYPTED_FIELDS = ['summary', 'title'] as const

/** Fields to encrypt on AgentMemoryEntry objects */
export const MEMORY_ENCRYPTED_FIELDS = ['content', 'title'] as const

// ============================================================================
// Array & Attachment Encryption Helpers
// ============================================================================

/**
 * Encrypt an array of strings (e.g. quickReplies).
 * Each string element is individually encrypted.
 *
 * @param arr - The string array to encrypt.
 * @returns Array of EncryptedField objects, or undefined if input is empty/undefined.
 */
export async function encryptStringArray(
  arr: string[] | undefined,
): Promise<(EncryptedField | string)[] | undefined> {
  if (!arr || arr.length === 0) return arr
  const results = await Promise.all(
    arr.map(async (item) => {
      if (typeof item === 'string' && item !== '') {
        const encrypted = await encryptField(item)
        return encrypted ?? item
      }
      return item
    }),
  )
  return results
}

/**
 * Decrypt an array that may contain EncryptedField objects back to strings.
 * Plain strings pass through unchanged (backward compatibility).
 *
 * @param arr - The array to decrypt.
 * @returns Array of plaintext strings, or undefined if input is empty/undefined.
 */
export async function decryptStringArray(
  arr: (EncryptedField | string)[] | undefined,
): Promise<string[] | undefined> {
  if (!arr || arr.length === 0) return arr as string[] | undefined
  const results = await Promise.all(
    arr.map(async (item) => {
      if (isEncryptedField(item)) {
        return decryptField(item)
      }
      return item as string
    }),
  )
  return results
}

/** Fields to encrypt on MessageAttachment objects */
export const ATTACHMENT_ENCRYPTED_FIELDS = ['data', 'name'] as const

/**
 * Encrypt sensitive fields in a message's attachments array.
 * Encrypts `data` (base64 file content) and `name` (original filename).
 *
 * @param attachments - Array of MessageAttachment objects.
 * @returns Array with encrypted data and name fields.
 */
export async function encryptAttachments<
  T extends { data?: string; name?: string },
>(attachments: T[] | undefined): Promise<T[]> {
  if (!attachments || attachments.length === 0) return attachments ?? []
  return Promise.all(
    attachments.map(
      (att) =>
        encryptFields(att, [...ATTACHMENT_ENCRYPTED_FIELDS]) as Promise<T>,
    ),
  )
}

/**
 * Decrypt sensitive fields in a message's attachments array.
 * Handles backward compatibility: unencrypted attachments pass through.
 *
 * @param attachments - Array of (possibly encrypted) attachment objects.
 * @returns Array with decrypted data and name fields.
 */
export async function decryptAttachments<
  T extends { data?: string; name?: string },
>(attachments: T[] | undefined): Promise<T[]> {
  if (!attachments || attachments.length === 0) return attachments ?? []
  return Promise.all(
    attachments.map(
      (att) =>
        decryptFields(att, [...ATTACHMENT_ENCRYPTED_FIELDS]) as Promise<T>,
    ),
  )
}
