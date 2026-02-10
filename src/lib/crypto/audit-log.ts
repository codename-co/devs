/**
 * Crypto Audit Log (GAP-7)
 *
 * Provides structured logging for cryptographic operations to enable
 * forensic analysis of potential security incidents. Logs are stored
 * in-memory with a configurable retention limit and can be exported.
 *
 * Logged operations include:
 * - Credential encryption / decryption
 * - Key generation / rotation / derivation
 * - Sync mode transitions
 * - Failed crypto operations (wrong key, corruption, etc.)
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CryptoOperation =
  | 'encrypt_credential'
  | 'decrypt_credential'
  | 'encrypt_content'
  | 'decrypt_content'
  | 'key_generation'
  | 'key_rotation'
  | 'key_derivation'
  | 'sync_mode_enable'
  | 'sync_mode_disable'
  | 'sync_mode_restore'
  | 'legacy_migration'
  | 'decrypt_failure'
  | 'encrypt_failure'

export interface CryptoAuditEntry {
  /** ISO-8601 timestamp */
  timestamp: string
  /** Type of crypto operation */
  operation: CryptoOperation
  /** Whether the operation succeeded */
  success: boolean
  /** Optional metadata (no sensitive data — never log keys or plaintext) */
  detail?: string
  /** Error message if the operation failed */
  error?: string
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/** Maximum number of audit entries to retain in memory. */
const MAX_ENTRIES = 500

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

/**
 * In-memory audit log for cryptographic operations.
 *
 * Design decisions:
 * - In-memory only — no persistence to avoid creating a new attack surface.
 * - Capped circular buffer — prevents unbounded memory growth.
 * - No sensitive data — never logs keys, plaintext, or ciphertext.
 */
export class CryptoAuditLog {
  private static entries: CryptoAuditEntry[] = []

  /**
   * Record a crypto operation.
   *
   * @param operation — The type of operation.
   * @param success  — Whether it succeeded.
   * @param meta     — Optional extra context (detail / error).
   */
  static log(
    operation: CryptoOperation,
    success: boolean,
    meta?: { detail?: string; error?: string },
  ): void {
    const entry: CryptoAuditEntry = {
      timestamp: new Date().toISOString(),
      operation,
      success,
      ...(meta?.detail ? { detail: meta.detail } : {}),
      ...(meta?.error ? { error: meta.error } : {}),
    }

    this.entries.push(entry)

    // Trim oldest entries when over the limit
    if (this.entries.length > MAX_ENTRIES) {
      this.entries = this.entries.slice(-MAX_ENTRIES)
    }

    // Also emit to console in development for visibility
    if (import.meta.env.DEV) {
      const icon = success ? '🔐' : '⚠️'
      console.debug(
        `${icon} [CryptoAudit] ${operation}${meta?.detail ? ` — ${meta.detail}` : ''}${meta?.error ? ` — ERROR: ${meta.error}` : ''}`,
      )
    }
  }

  /**
   * Get all audit entries (most recent last).
   */
  static getEntries(): readonly CryptoAuditEntry[] {
    return this.entries
  }

  /**
   * Get entries filtered by operation type.
   */
  static getEntriesByOperation(operation: CryptoOperation): CryptoAuditEntry[] {
    return this.entries.filter((e) => e.operation === operation)
  }

  /**
   * Get only failed operations — useful for incident investigation.
   */
  static getFailures(): CryptoAuditEntry[] {
    return this.entries.filter((e) => !e.success)
  }

  /**
   * Export audit log as a JSON string for external analysis.
   */
  static export(): string {
    return JSON.stringify(this.entries, null, 2)
  }

  /**
   * Clear all audit entries.
   */
  static clear(): void {
    this.entries = []
  }

  /**
   * Get the count of entries currently in the log.
   */
  static get size(): number {
    return this.entries.length
  }
}
