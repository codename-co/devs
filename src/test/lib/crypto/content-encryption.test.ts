import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock SecureStorage to avoid IndexedDB dependency in tests.
// The encryption/decryption logic is tested via real Web Crypto API—
// we just bypass the key-storage layer.
let mockKey: CryptoKey | null = null

/** Convert Uint8Array to base64, chunk-safe for large buffers */
function uint8ToBase64(bytes: Uint8Array): string {
  let binary = ''
  const chunkSize = 8192
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize))
  }
  return btoa(binary)
}

/** Convert base64 to Uint8Array */
function base64ToUint8(b64: string): Uint8Array {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

vi.mock('@/lib/crypto/index', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/crypto/index')>(
      '@/lib/crypto/index',
    )

  return {
    ...actual,
    SecureStorage: {
      init: vi.fn(),
      encryptCredential: vi.fn(async (plaintext: string) => {
        if (!mockKey) {
          mockKey = await crypto.subtle.generateKey(
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt', 'decrypt'],
          )
        }
        const encoder = new TextEncoder()
        const iv = crypto.getRandomValues(new Uint8Array(12))
        const encrypted = await crypto.subtle.encrypt(
          { name: 'AES-GCM', iv },
          mockKey,
          encoder.encode(plaintext),
        )
        return {
          encrypted: uint8ToBase64(new Uint8Array(encrypted)),
          iv: uint8ToBase64(iv),
          salt: '',
          mode: 'local' as const,
        }
      }),
      decryptCredential: vi.fn(
        async (encrypted: string, iv: string, _salt: string) => {
          if (!mockKey) {
            throw new Error('No key available')
          }
          const decoder = new TextDecoder()
          const ivArray = base64ToUint8(iv)
          const ciphertextArray = base64ToUint8(encrypted)
          const decrypted = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: ivArray },
            mockKey,
            ciphertextArray,
          )
          return decoder.decode(decrypted)
        },
      ),
    },
  }
})

import {
  encryptField,
  decryptField,
  isEncryptedField,
  encryptFields,
  decryptFields,
  KNOWLEDGE_ENCRYPTED_FIELDS,
  MESSAGE_ENCRYPTED_FIELDS,
  CONVERSATION_ENCRYPTED_FIELDS,
  MEMORY_ENCRYPTED_FIELDS,
  ATTACHMENT_ENCRYPTED_FIELDS,
  encryptStringArray,
  decryptStringArray,
  encryptAttachments,
  decryptAttachments,
  type EncryptedField,
} from '@/lib/crypto/content-encryption'

describe('Content Encryption', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    // Generate a fresh key for each test suite run
    mockKey = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt'],
    )
  })

  // ==========================================================================
  // isEncryptedField
  // ==========================================================================

  describe('isEncryptedField', () => {
    it('should return true for valid EncryptedField objects', () => {
      expect(isEncryptedField({ ct: 'abc', iv: 'def' })).toBe(true)
    })

    it('should return false for plain strings', () => {
      expect(isEncryptedField('hello')).toBe(false)
    })

    it('should return false for null/undefined', () => {
      expect(isEncryptedField(null)).toBe(false)
      expect(isEncryptedField(undefined)).toBe(false)
    })

    it('should return false for objects missing ct or iv', () => {
      expect(isEncryptedField({ ct: 'abc' })).toBe(false)
      expect(isEncryptedField({ iv: 'def' })).toBe(false)
      expect(isEncryptedField({})).toBe(false)
    })

    it('should return false for objects with non-string ct or iv', () => {
      expect(isEncryptedField({ ct: 123, iv: 'def' })).toBe(false)
      expect(isEncryptedField({ ct: 'abc', iv: 456 })).toBe(false)
    })
  })

  // ==========================================================================
  // encryptField / decryptField
  // ==========================================================================

  describe('encryptField', () => {
    it('should return null for null/undefined/empty input', async () => {
      expect(await encryptField(null)).toBeNull()
      expect(await encryptField(undefined)).toBeNull()
      expect(await encryptField('')).toBeNull()
    })

    it('should encrypt a string and return EncryptedField', async () => {
      const result = await encryptField('Hello, World!')
      expect(result).not.toBeNull()
      expect(result!.ct).toBeDefined()
      expect(result!.iv).toBeDefined()
      expect(typeof result!.ct).toBe('string')
      expect(typeof result!.iv).toBe('string')
      // Ciphertext must differ from plaintext
      expect(result!.ct).not.toBe('Hello, World!')
    })

    it('should produce different ciphertexts for same plaintext (random IV)', async () => {
      const r1 = await encryptField('same text')
      const r2 = await encryptField('same text')
      expect(r1!.ct).not.toBe(r2!.ct)
      expect(r1!.iv).not.toBe(r2!.iv)
    })
  })

  describe('decryptField', () => {
    it('should round-trip encrypt/decrypt correctly', async () => {
      const plaintext = 'Sensitive email content from Gmail connector'
      const encrypted = await encryptField(plaintext)
      expect(encrypted).not.toBeNull()
      const decrypted = await decryptField(encrypted!)
      expect(decrypted).toBe(plaintext)
    })

    it('should handle unicode content correctly', async () => {
      const plaintext = '日本語テスト 🔒 émojis et accents'
      const encrypted = await encryptField(plaintext)
      const decrypted = await decryptField(encrypted!)
      expect(decrypted).toBe(plaintext)
    })

    it('should handle large content (100KB)', async () => {
      const plaintext = 'A'.repeat(100 * 1024) // 100KB of text
      const encrypted = await encryptField(plaintext)
      const decrypted = await decryptField(encrypted!)
      expect(decrypted).toBe(plaintext)
    })

    it('should fail with corrupted ciphertext', async () => {
      const encrypted = await encryptField('test data')
      const corrupted: EncryptedField = {
        ct: encrypted!.ct.slice(0, -4) + 'XXXX',
        iv: encrypted!.iv,
      }
      await expect(decryptField(corrupted)).rejects.toThrow()
    })
  })

  // ==========================================================================
  // encryptFields / decryptFields (object-level)
  // ==========================================================================

  describe('encryptFields', () => {
    it('should encrypt specified string fields', async () => {
      const obj = {
        id: 'item-1',
        content: 'My secret document',
        description: 'A classified file',
        path: '/public/file.txt',
      }

      const encrypted = await encryptFields(obj, ['content', 'description'])

      // _encrypted flag must be set
      expect(encrypted._encrypted).toBe(true)
      // Encrypted fields should be EncryptedField objects
      expect(isEncryptedField(encrypted.content)).toBe(true)
      expect(isEncryptedField(encrypted.description)).toBe(true)
      // Non-encrypted fields should be unchanged
      expect(encrypted.id).toBe('item-1')
      expect(encrypted.path).toBe('/public/file.txt')
    })

    it('should skip undefined/null/empty fields', async () => {
      const obj = {
        id: 'item-2',
        content: 'some content',
        description: undefined as string | undefined,
        transcript: '',
      }

      const encrypted = await encryptFields(obj, [
        'content',
        'description',
        'transcript',
      ])

      expect(isEncryptedField(encrypted.content)).toBe(true)
      // undefined/empty should remain as-is
      expect(encrypted.description).toBeUndefined()
      expect(encrypted.transcript).toBe('')
    })
  })

  describe('decryptFields', () => {
    it('should round-trip object encrypt/decrypt', async () => {
      const original = {
        id: 'item-3',
        content: 'Budget report Q4 2025',
        description: 'Financial summary',
        path: '/emails/inbox',
      }

      const encrypted = await encryptFields(original, [
        'content',
        'description',
      ])
      const decrypted = await decryptFields(encrypted, [
        'content',
        'description',
      ])

      expect(decrypted.content).toBe('Budget report Q4 2025')
      expect(decrypted.description).toBe('Financial summary')
      expect(decrypted.id).toBe('item-3')
      expect(decrypted.path).toBe('/emails/inbox')
      // _encrypted flag should be removed after decryption
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((decrypted as any)._encrypted).toBeUndefined()
    })

    it('should pass through unencrypted objects as-is (backward compat)', async () => {
      const legacyObj = {
        id: 'old-item',
        content: 'plaintext content from before encryption',
        description: 'old description',
      }

      // No _encrypted flag → should return as-is
      const result = await decryptFields(legacyObj, ['content', 'description'])

      expect(result.content).toBe('plaintext content from before encryption')
      expect(result.description).toBe('old description')
    })

    it('should handle mixed fields (some encrypted, some plain)', async () => {
      const obj = {
        id: 'item-4',
        content: 'only this is encrypted',
        description: undefined as string | undefined,
        path: '/test',
      }

      const encrypted = await encryptFields(obj, ['content', 'description'])
      const decrypted = await decryptFields(encrypted, [
        'content',
        'description',
      ])

      expect(decrypted.content).toBe('only this is encrypted')
      expect(decrypted.description).toBeUndefined()
    })
  })

  // ==========================================================================
  // Entity field constants
  // ==========================================================================

  describe('Entity field constants', () => {
    it('should define knowledge encrypted fields', () => {
      expect(KNOWLEDGE_ENCRYPTED_FIELDS).toEqual([
        'content',
        'transcript',
        'description',
      ])
    })

    it('should define message encrypted fields including pinnedDescription', () => {
      expect(MESSAGE_ENCRYPTED_FIELDS).toEqual(['content', 'pinnedDescription'])
    })

    it('should define conversation encrypted fields including title', () => {
      expect(CONVERSATION_ENCRYPTED_FIELDS).toEqual(['summary', 'title'])
    })

    it('should define memory encrypted fields', () => {
      expect(MEMORY_ENCRYPTED_FIELDS).toEqual(['content', 'title'])
    })

    it('should define attachment encrypted fields', () => {
      expect(ATTACHMENT_ENCRYPTED_FIELDS).toEqual(['data', 'name'])
    })
  })

  // ==========================================================================
  // KnowledgeItem simulation
  // ==========================================================================

  describe('KnowledgeItem encryption simulation', () => {
    it('should encrypt and decrypt a KnowledgeItem-like object', async () => {
      const knowledgeItem = {
        id: 'ki-001',
        name: 'Q4 Budget Email',
        type: 'file' as const,
        content: 'Hi team, attached is the Q4 budget review...',
        contentHash: 'abc123',
        mimeType: 'text/plain',
        path: '/Gmail/Inbox',
        description: 'Email from CFO about budget',
        transcript: 'Transcribed audio attachment',
        createdAt: new Date(),
        lastModified: new Date(),
      }

      const encrypted = await encryptFields(knowledgeItem, [
        ...KNOWLEDGE_ENCRYPTED_FIELDS,
      ])

      // Verify encryption happened
      expect(encrypted._encrypted).toBe(true)
      expect(isEncryptedField(encrypted.content)).toBe(true)
      expect(isEncryptedField(encrypted.description)).toBe(true)
      expect(isEncryptedField(encrypted.transcript)).toBe(true)
      // Non-sensitive fields untouched
      expect(encrypted.id).toBe('ki-001')
      expect(encrypted.name).toBe('Q4 Budget Email')
      expect(encrypted.contentHash).toBe('abc123')
      expect(encrypted.path).toBe('/Gmail/Inbox')

      // Decrypt and verify
      const decrypted = await decryptFields(encrypted, [
        ...KNOWLEDGE_ENCRYPTED_FIELDS,
      ])
      expect(decrypted.content).toBe(
        'Hi team, attached is the Q4 budget review...',
      )
      expect(decrypted.description).toBe('Email from CFO about budget')
      expect(decrypted.transcript).toBe('Transcribed audio attachment')
    })
  })

  // ==========================================================================
  // Message encryption simulation
  // ==========================================================================

  describe('Message encryption simulation', () => {
    it('should encrypt message content including tool results', async () => {
      const message = {
        id: 'msg-001',
        role: 'assistant' as const,
        content: 'Based on the Gmail search results, your latest email says...',
        agentId: 'agent-1',
        timestamp: new Date(),
      }

      const encrypted = await encryptFields(message, [
        ...MESSAGE_ENCRYPTED_FIELDS,
      ])
      expect(isEncryptedField(encrypted.content)).toBe(true)
      expect(encrypted.role).toBe('assistant')

      const decrypted = await decryptFields(encrypted, [
        ...MESSAGE_ENCRYPTED_FIELDS,
      ])
      expect(decrypted.content).toBe(
        'Based on the Gmail search results, your latest email says...',
      )
    })
  })

  // ==========================================================================
  // AgentMemoryEntry encryption simulation
  // ==========================================================================

  describe('AgentMemoryEntry encryption simulation', () => {
    it('should encrypt memory content and title', async () => {
      const memory = {
        id: 'mem-001',
        agentId: 'agent-1',
        category: 'facts' as const,
        title: 'User prefers dark mode',
        content: 'The user mentioned they always use dark mode on all devices',
        confidence: 'high' as const,
        keywords: ['dark mode', 'preferences'],
        tags: ['ui'],
        validationStatus: 'approved' as const,
        version: 1,
        usageCount: 3,
        createdAt: new Date(),
        updatedAt: new Date(),
        learnedAt: new Date(),
        sourceConversationIds: [],
        sourceMessageIds: [],
      }

      const encrypted = await encryptFields(memory, [
        ...MEMORY_ENCRYPTED_FIELDS,
      ])
      expect(isEncryptedField(encrypted.content)).toBe(true)
      expect(isEncryptedField(encrypted.title)).toBe(true)
      // Non-encrypted fields intact
      expect(encrypted.keywords).toEqual(['dark mode', 'preferences'])
      expect(encrypted.agentId).toBe('agent-1')

      const decrypted = await decryptFields(encrypted, [
        ...MEMORY_ENCRYPTED_FIELDS,
      ])
      expect(decrypted.title).toBe('User prefers dark mode')
      expect(decrypted.content).toBe(
        'The user mentioned they always use dark mode on all devices',
      )
    })
  })

  // ==========================================================================
  // String Array Encryption (quickReplies)
  // ==========================================================================

  describe('encryptStringArray / decryptStringArray', () => {
    it('should return undefined for undefined input', async () => {
      expect(await encryptStringArray(undefined)).toBeUndefined()
      expect(await decryptStringArray(undefined)).toBeUndefined()
    })

    it('should return empty array for empty input', async () => {
      const result = await encryptStringArray([])
      expect(result).toEqual([])
    })

    it('should encrypt each string in the array', async () => {
      const replies = ['Tell me more', 'How does that work?', 'Thanks!']
      const encrypted = await encryptStringArray(replies)

      expect(encrypted).toBeDefined()
      expect(encrypted!.length).toBe(3)

      // Each element should be an EncryptedField
      for (const item of encrypted!) {
        expect(isEncryptedField(item)).toBe(true)
      }
    })

    it('should round-trip encrypt/decrypt an array of strings', async () => {
      const replies = ['Tell me more', 'How does that work?', 'Thanks!']
      const encrypted = await encryptStringArray(replies)
      const decrypted = await decryptStringArray(
        encrypted as (string | EncryptedField)[],
      )

      expect(decrypted).toEqual(replies)
    })

    it('should handle mixed encrypted/plain arrays (backward compat)', async () => {
      // Simulate an array with some plain strings (legacy data)
      const mixed: (string | EncryptedField)[] = [
        'plain text reply',
        (await encryptField('encrypted reply'))!,
      ]

      const decrypted = await decryptStringArray(mixed)
      expect(decrypted).toEqual(['plain text reply', 'encrypted reply'])
    })

    it('should handle unicode in string arrays', async () => {
      const replies = ['日本語の返信', 'Réponse en français 🇫🇷']
      const encrypted = await encryptStringArray(replies)
      const decrypted = await decryptStringArray(
        encrypted as (string | EncryptedField)[],
      )
      expect(decrypted).toEqual(replies)
    })
  })

  // ==========================================================================
  // Attachment Encryption
  // ==========================================================================

  describe('encryptAttachments / decryptAttachments', () => {
    it('should return empty array for undefined/empty input', async () => {
      expect(await encryptAttachments(undefined)).toEqual([])
      expect(await encryptAttachments([])).toEqual([])
      expect(await decryptAttachments(undefined)).toEqual([])
      expect(await decryptAttachments([])).toEqual([])
    })

    it('should encrypt attachment data and name fields', async () => {
      const attachments = [
        {
          type: 'image' as const,
          name: 'photo.png',
          data: 'base64encodedcontent==',
          mimeType: 'image/png',
          size: 1024,
        },
      ]

      const encrypted = await encryptAttachments(attachments)

      expect(encrypted.length).toBe(1)
      // data and name should be encrypted
      expect(isEncryptedField(encrypted[0].data)).toBe(true)
      expect(isEncryptedField(encrypted[0].name)).toBe(true)
      // Non-encrypted fields should remain
      expect(encrypted[0].type).toBe('image')
      expect(encrypted[0].mimeType).toBe('image/png')
      expect(encrypted[0].size).toBe(1024)
    })

    it('should round-trip encrypt/decrypt attachments', async () => {
      const attachments = [
        {
          type: 'document' as const,
          name: 'report.pdf',
          data: 'JVBERi0xLjQKMSAwIG9iago=',
          mimeType: 'application/pdf',
          size: 2048,
        },
        {
          type: 'text' as const,
          name: 'notes.txt',
          data: 'VGhpcyBpcyBhIHRlc3Q=',
          mimeType: 'text/plain',
          size: 256,
        },
      ]

      const encrypted = await encryptAttachments(attachments)
      const decrypted = await decryptAttachments(encrypted)

      expect(decrypted.length).toBe(2)
      expect(decrypted[0].name).toBe('report.pdf')
      expect(decrypted[0].data).toBe('JVBERi0xLjQKMSAwIG9iago=')
      expect(decrypted[0].mimeType).toBe('application/pdf')
      expect(decrypted[1].name).toBe('notes.txt')
      expect(decrypted[1].data).toBe('VGhpcyBpcyBhIHRlc3Q=')
    })

    it('should handle attachments without data field', async () => {
      const attachments = [
        {
          type: 'image' as const,
          name: 'photo.png',
          mimeType: 'image/png',
        },
      ]

      const encrypted = await encryptAttachments(
        attachments as { data?: string; name?: string }[],
      )
      const decrypted = await decryptAttachments(encrypted)

      expect(decrypted[0].name).toBe('photo.png')
      expect(decrypted[0].data).toBeUndefined()
    })
  })

  // ==========================================================================
  // Full Conversation Encryption Simulation
  // ==========================================================================

  describe('Full conversation encryption simulation', () => {
    it('should encrypt all sensitive conversation fields', async () => {
      const conversation = {
        id: 'conv-001',
        agentId: 'agent-1',
        participatingAgents: ['agent-1'],
        workflowId: 'wf-1',
        timestamp: new Date(),
        updatedAt: new Date(),
        title: 'Discussion about project architecture',
        summary: 'We talked about microservices vs monolith',
        messages: [
          {
            id: 'msg-1',
            role: 'user' as const,
            content: 'What architecture should I use?',
            timestamp: new Date(),
            attachments: [
              {
                type: 'document' as const,
                name: 'architecture.md',
                data: 'IyBBcmNoaXRlY3R1cmU=',
                mimeType: 'text/markdown',
                size: 512,
              },
            ],
          },
          {
            id: 'msg-2',
            role: 'assistant' as const,
            content: 'I recommend a modular monolith approach.',
            timestamp: new Date(),
            pinnedDescription: 'Key architecture recommendation',
          },
        ],
        quickReplies: ['Tell me more', 'What about scaling?'],
      }

      // Encrypt message fields
      const encryptedMsgs = await Promise.all(
        conversation.messages.map(async (msg) => {
          const encrypted = await encryptFields(msg, [
            ...MESSAGE_ENCRYPTED_FIELDS,
          ])
          if (msg.attachments) {
            ;(encrypted as typeof msg).attachments = await encryptAttachments(
              msg.attachments,
            )
          }
          return encrypted
        }),
      )

      // Encrypt conversation-level fields
      const encryptedConv = await encryptFields(
        {
          ...conversation,
          messages: encryptedMsgs,
          quickReplies: await encryptStringArray(conversation.quickReplies),
        },
        [...CONVERSATION_ENCRYPTED_FIELDS],
      )

      // Verify all sensitive fields are encrypted
      expect(isEncryptedField(encryptedConv.title)).toBe(true)
      expect(isEncryptedField(encryptedConv.summary)).toBe(true)
      expect(
        isEncryptedField(
          (encryptedConv.messages[0] as unknown as Record<string, unknown>)
            .content,
        ),
      ).toBe(true)
      expect(
        isEncryptedField(
          (encryptedConv.messages[1] as unknown as Record<string, unknown>)
            .content,
        ),
      ).toBe(true)
      expect(
        isEncryptedField(
          (encryptedConv.messages[1] as unknown as Record<string, unknown>)
            .pinnedDescription,
        ),
      ).toBe(true)

      // Verify quickReplies elements are encrypted
      for (const reply of encryptedConv.quickReplies as unknown[]) {
        expect(isEncryptedField(reply)).toBe(true)
      }

      // Verify attachment data and name are encrypted
      const encAttachments = (
        encryptedConv.messages[0] as unknown as Record<string, unknown>
      ).attachments as Record<string, unknown>[]
      expect(isEncryptedField(encAttachments[0].data)).toBe(true)
      expect(isEncryptedField(encAttachments[0].name)).toBe(true)

      // Non-sensitive fields should remain plain
      expect(encryptedConv.id).toBe('conv-001')
      expect(encryptedConv.agentId).toBe('agent-1')

      // Now decrypt everything
      const decryptedMsgs = await Promise.all(
        encryptedConv.messages.map(async (msg) => {
          const decrypted = await decryptFields(msg, [
            ...MESSAGE_ENCRYPTED_FIELDS,
          ])
          if ((msg as unknown as Record<string, unknown>).attachments) {
            ;(decrypted as (typeof conversation.messages)[0]).attachments =
              (await decryptAttachments(
                (msg as unknown as Record<string, unknown>).attachments as {
                  data?: string
                  name?: string
                }[],
              )) as (typeof conversation.messages)[0]['attachments']
          }
          return decrypted
        }),
      )

      const decryptedConv = await decryptFields(
        {
          ...encryptedConv,
          messages: decryptedMsgs,
          quickReplies: await decryptStringArray(
            encryptedConv.quickReplies as (string | EncryptedField)[],
          ),
        },
        [...CONVERSATION_ENCRYPTED_FIELDS],
      )

      // Verify round-trip
      expect(decryptedConv.title).toBe('Discussion about project architecture')
      expect(decryptedConv.summary).toBe(
        'We talked about microservices vs monolith',
      )
      expect(decryptedConv.messages[0].content).toBe(
        'What architecture should I use?',
      )
      expect(decryptedConv.messages[1].content).toBe(
        'I recommend a modular monolith approach.',
      )
      expect(
        (decryptedConv.messages[1] as unknown as Record<string, unknown>)
          .pinnedDescription,
      ).toBe('Key architecture recommendation')
      expect(decryptedConv.quickReplies).toEqual([
        'Tell me more',
        'What about scaling?',
      ])
      expect(
        (decryptedConv.messages[0] as (typeof conversation.messages)[0])
          .attachments![0].name,
      ).toBe('architecture.md')
      expect(
        (decryptedConv.messages[0] as (typeof conversation.messages)[0])
          .attachments![0].data,
      ).toBe('IyBBcmNoaXRlY3R1cmU=')
    })
  })
})
