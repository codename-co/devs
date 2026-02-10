/**
 * @module yjs/migrate
 *
 * One-Time Legacy IndexedDB → Yjs Migration
 *
 * When DEVS transitioned from a plain IndexedDB storage layer to the
 * Yjs-first architecture, existing users already had data persisted in
 * the legacy `devs` IndexedDB database (managed by `src/lib/db`).  This
 * module provides a **one-shot migration** that copies all legacy
 * records into the corresponding Yjs maps so they become part of the
 * CRDT document and benefit from P2P sync.
 *
 * ## How it works
 *
 * 1. On app startup, `migrateFromIndexedDB()` is called.
 * 2. If the migration flag (`localStorage` key) is already set → skip.
 * 3. If Yjs maps already contain data (e.g. synced from a peer) → skip
 *    and set the flag so we don't check again.
 * 4. Otherwise, read every record from the legacy DB and write it into
 *    the Yjs maps inside a single `transact()` call for atomicity.
 * 5. Set the flag so the migration never runs again.
 *
 * ## Idempotency
 *
 * The migration is safe to call multiple times — the `localStorage`
 * flag short-circuits on subsequent runs in < 1 ms.
 */
import { db } from '@/lib/db'

import { transact } from './doc'
import {
  agents,
  conversations,
  knowledge,
  tasks,
  artifacts,
  memories,
} from './maps'

/** `localStorage` key used to track whether migration has run. */
const MIGRATION_KEY = 'devs-yjs-first-migrated'

/** Bump this when a new migration pass is needed in a future release. */
const MIGRATION_VERSION = '1'

/**
 * Check if migration has already been completed by comparing the stored
 * version against {@link MIGRATION_VERSION}.
 *
 * @returns `true` if the current migration version has already run.
 */
function isMigrated(): boolean {
  return localStorage.getItem(MIGRATION_KEY) === MIGRATION_VERSION
}

/**
 * Check if any Yjs map already contains data.
 *
 * This catches the case where a peer has already synced data into the
 * document before the migration had a chance to run — migrating on top
 * would create duplicates.
 *
 * @returns `true` if at least one map is non-empty.
 */
function hasExistingData(): boolean {
  return (
    agents.size > 0 ||
    conversations.size > 0 ||
    knowledge.size > 0 ||
    tasks.size > 0 ||
    artifacts.size > 0 ||
    memories.size > 0
  )
}

/**
 * Persist the migration flag so subsequent app starts skip the process.
 */
function markMigrated(): void {
  localStorage.setItem(MIGRATION_KEY, MIGRATION_VERSION)
}

/**
 * Migrate all data from the legacy IndexedDB database into Yjs maps.
 *
 * This is a **one-time, idempotent** operation.  On first run it reads
 * every entity from the legacy `db` helper and writes them into the
 * corresponding Yjs maps inside a single transaction.  The migration
 * flag in `localStorage` prevents re-execution on subsequent loads.
 *
 * The function is safe to `await` at application startup — it resolves
 * in < 1 ms on repeat visits thanks to the early `isMigrated()` check.
 *
 * @returns A promise that resolves once migration is complete (or skipped).
 */
export async function migrateFromIndexedDB(): Promise<void> {
  // Fast path — already migrated on a previous session
  if (isMigrated()) {
    return
  }

  // If Yjs already has data (e.g. replayed from a peer), skip migration
  // to avoid duplicating records.
  if (hasExistingData()) {
    markMigrated()
    return
  }

  // The legacy DB is initialised asynchronously — poll until ready.
  if (!db.isInitialized()) {
    await new Promise<void>((resolve) => {
      const check = () => {
        if (db.isInitialized()) {
          resolve()
        } else {
          setTimeout(check, 50)
        }
      }
      check()
    })
  }

  // Fetch every entity type in parallel from the legacy store.
  // Stores may no longer exist (removed in DB version 21), so wrap
  // each call to return an empty array on failure.
  const safeGetAll = async (storeName: string) => {
    try {
      if (!db.hasStore(storeName)) return []
      return await db.getAll(storeName as any)
    } catch {
      return []
    }
  }

  const [
    existingAgents,
    existingConversations,
    existingKnowledge,
    existingTasks,
    existingArtifacts,
    existingMemories,
  ] = await Promise.all([
    safeGetAll('agents'),
    safeGetAll('conversations'),
    safeGetAll('knowledgeItems'),
    safeGetAll('tasks'),
    safeGetAll('artifacts'),
    safeGetAll('agentMemories'),
  ])

  // Write all records in a single Yjs transaction so observers see one
  // atomic update and the CRDT generates minimal overhead.
  transact(() => {
    for (const agent of existingAgents) {
      agents.set(agent.id, agent)
    }

    for (const conversation of existingConversations) {
      conversations.set(conversation.id, conversation)
    }

    for (const item of existingKnowledge) {
      knowledge.set(item.id, item)
    }

    for (const task of existingTasks) {
      tasks.set(task.id, task)
    }

    for (const artifact of existingArtifacts) {
      artifacts.set(artifact.id, artifact)
    }

    for (const memory of existingMemories) {
      memories.set(memory.id, memory)
    }
  })

  markMigrated()
}
