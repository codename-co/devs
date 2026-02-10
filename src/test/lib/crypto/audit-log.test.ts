import { describe, it, expect, beforeEach } from 'vitest'
import { CryptoAuditLog, type CryptoOperation } from '@/lib/crypto/audit-log'

describe('CryptoAuditLog', () => {
  beforeEach(() => {
    CryptoAuditLog.clear()
  })

  describe('log', () => {
    it('should add an entry', () => {
      CryptoAuditLog.log('encrypt_credential', true)
      expect(CryptoAuditLog.size).toBe(1)
    })

    it('should store operation, success, and timestamp', () => {
      const before = new Date()
      CryptoAuditLog.log('decrypt_credential', false, {
        error: 'bad key',
      })
      const after = new Date()

      const entries = CryptoAuditLog.getEntries()
      expect(entries).toHaveLength(1)
      expect(entries[0].operation).toBe('decrypt_credential')
      expect(entries[0].success).toBe(false)
      expect(entries[0].error).toBe('bad key')
      const ts = new Date(entries[0].timestamp)
      expect(ts.getTime()).toBeGreaterThanOrEqual(before.getTime())
      expect(ts.getTime()).toBeLessThanOrEqual(after.getTime())
    })

    it('should accept optional metadata', () => {
      CryptoAuditLog.log('key_rotation', true, {
        detail: 'scheduled',
      })

      const entry = CryptoAuditLog.getEntries()[0]
      expect(entry.detail).toBe('scheduled')
    })

    it('should respect the max buffer size', () => {
      // The max is 500 entries — fill beyond that
      for (let i = 0; i < 510; i++) {
        CryptoAuditLog.log('encrypt_credential', true)
      }
      expect(CryptoAuditLog.size).toBe(500)
    })
  })

  describe('getEntries', () => {
    it('should return entries in insertion order', () => {
      CryptoAuditLog.log('encrypt_credential', true)
      CryptoAuditLog.log('decrypt_credential', true)
      CryptoAuditLog.log('key_rotation', true)

      const ops = CryptoAuditLog.getEntries().map((e) => e.operation)
      expect(ops).toEqual([
        'encrypt_credential',
        'decrypt_credential',
        'key_rotation',
      ])
    })
  })

  describe('getFailures', () => {
    it('should return only failed entries', () => {
      CryptoAuditLog.log('encrypt_credential', true)
      CryptoAuditLog.log('decrypt_failure', false, {
        error: 'corrupt',
      })
      CryptoAuditLog.log('encrypt_credential', true)
      CryptoAuditLog.log('encrypt_failure', false, {
        error: 'timeout',
      })

      const failures = CryptoAuditLog.getFailures()
      expect(failures).toHaveLength(2)
      expect(failures[0].operation).toBe('decrypt_failure')
      expect(failures[1].operation).toBe('encrypt_failure')
    })

    it('should return empty array when no failures', () => {
      CryptoAuditLog.log('encrypt_credential', true)
      expect(CryptoAuditLog.getFailures()).toHaveLength(0)
    })
  })

  describe('export', () => {
    it('should return a JSON string of all entries', () => {
      CryptoAuditLog.log('key_generation', true)
      const json = CryptoAuditLog.export()
      const parsed = JSON.parse(json)
      expect(Array.isArray(parsed)).toBe(true)
      expect(parsed).toHaveLength(1)
      expect(parsed[0].operation).toBe('key_generation')
    })
  })

  describe('clear', () => {
    it('should remove all entries', () => {
      CryptoAuditLog.log('encrypt_credential', true)
      CryptoAuditLog.log('decrypt_credential', true)
      expect(CryptoAuditLog.size).toBe(2)

      CryptoAuditLog.clear()
      expect(CryptoAuditLog.size).toBe(0)
      expect(CryptoAuditLog.getEntries()).toHaveLength(0)
    })
  })

  describe('size', () => {
    it('should reflect the current number of entries', () => {
      expect(CryptoAuditLog.size).toBe(0)
      CryptoAuditLog.log('encrypt_credential', true)
      expect(CryptoAuditLog.size).toBe(1)
      CryptoAuditLog.log('decrypt_credential', false)
      expect(CryptoAuditLog.size).toBe(2)
    })
  })

  describe('operation types', () => {
    const allOps: CryptoOperation[] = [
      'encrypt_credential',
      'decrypt_credential',
      'encrypt_content',
      'decrypt_content',
      'key_generation',
      'key_rotation',
      'key_derivation',
      'sync_mode_enable',
      'sync_mode_disable',
      'sync_mode_restore',
      'legacy_migration',
      'decrypt_failure',
      'encrypt_failure',
    ]

    it('should accept all defined operation types', () => {
      for (const op of allOps) {
        CryptoAuditLog.log(op, true)
      }
      expect(CryptoAuditLog.size).toBe(allOps.length)
    })
  })
})
