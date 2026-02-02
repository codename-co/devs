/**
 * One-Time IndexedDB Migration
 *
 * Migrates existing data from the legacy IndexedDB database to Yjs.
 * Only runs once, tracked via localStorage. Skips if Yjs already has
 * data (e.g., from peer sync).
 */
import { db } from '@/lib/db'

import { transact } from './doc'
import { agents, conversations, knowledge, tasks, artifacts, memories } from './maps'

const MIGRATION_KEY = 'devs-yjs-first-migrated'
const MIGRATION_VERSION = '1'

/**
 * Check if migration has already been completed.
 */
function isMigrated(): boolean {
  return localStorage.getItem(MIGRATION_KEY) === MIGRATION_VERSION
}

/**
 * Check if Yjs already has data (from peer sync).
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
 * Mark migration as complete.
 */
function markMigrated(): void {
  localStorage.setItem(MIGRATION_KEY, MIGRATION_VERSION)
}

/**
 * Migrate all data from legacy IndexedDB to Yjs.
 * This is a one-time operation that preserves all existing data.
 */
export async function migrateFromIndexedDB(): Promise<void> {
  // Skip if already migrated
  if (isMigrated()) {
    return
  }

  // Skip if Yjs already has data from peer sync
  if (hasExistingData()) {
    markMigrated()
    return
  }

  // Wait for database to be ready
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

  // Fetch all data from IndexedDB
  const [
    existingAgents,
    existingConversations,
    existingKnowledge,
    existingTasks,
    existingArtifacts,
    existingMemories,
  ] = await Promise.all([
    db.getAll('agents'),
    db.getAll('conversations'),
    db.getAll('knowledgeItems'),
    db.getAll('tasks'),
    db.getAll('artifacts'),
    db.getAll('agentMemories'),
  ])

  // Migrate in a single transaction
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
