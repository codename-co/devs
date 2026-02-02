/**
 * Auto Backup Hook
 *
 * Automatically triggers local backup when synced data changes.
 * Uses the same Y.Map subscription pattern as useLive hooks for
 * instant reactivity to data changes.
 */
import { useEffect, useRef, useCallback } from 'react'

import {
  getAgentsMap,
  getConversationsMap,
  getKnowledgeMap,
  getMemoriesMap,
  getTasksMap,
} from '@/features/sync'
import { isReady } from '@/lib/yjs'
import { folderSyncService } from '../lib/local-backup-service'
import { useFolderSyncStore } from '../stores/folderSyncStore'

// Debounce delay for auto-backup (ms)
const AUTO_BACKUP_DEBOUNCE_MS = 2000

/**
 * Hook that automatically triggers backup when data changes.
 * Should be used once at the app level (e.g., in App.tsx or a provider).
 *
 * Only triggers backup when:
 * - Local backup is enabled
 * - Persistence is ready
 * - Relevant data has changed (based on sync options)
 */
export function useAutoBackup(): void {
  const {
    isEnabled,
    syncAgents,
    syncConversations,
    syncMemories,
    syncKnowledge,
    syncTasks,
  } = useFolderSyncStore()

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isSetupRef = useRef(false)

  // Debounced sync trigger
  const triggerDebouncedSync = useCallback(() => {
    if (!isEnabled || !folderSyncService.isActive()) {
      return
    }

    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    // Set new debounced sync
    debounceTimerRef.current = setTimeout(() => {
      debounceTimerRef.current = null
      folderSyncService.syncToFiles().catch((error) => {
        console.error('Auto-backup failed:', error)
      })
    }, AUTO_BACKUP_DEBOUNCE_MS)
  }, [isEnabled])

  useEffect(() => {
    if (!isEnabled || isSetupRef.current) {
      return
    }

    // Wait for persistence to be ready
    const waitForReady = () => {
      if (!isReady()) {
        const checkReady = setInterval(() => {
          if (isReady()) {
            clearInterval(checkReady)
            setupObservers()
          }
        }, 100)
        return () => clearInterval(checkReady)
      }
      return setupObservers()
    }

    const setupObservers = () => {
      const cleanupFns: (() => void)[] = []
      isSetupRef.current = true

      // Subscribe to agents changes
      if (syncAgents) {
        const agentsMap = getAgentsMap()
        const handler = () => triggerDebouncedSync()
        agentsMap.observeDeep(handler)
        cleanupFns.push(() => agentsMap.unobserveDeep(handler))
      }

      // Subscribe to conversations changes
      if (syncConversations) {
        const conversationsMap = getConversationsMap()
        const handler = () => triggerDebouncedSync()
        conversationsMap.observeDeep(handler)
        cleanupFns.push(() => conversationsMap.unobserveDeep(handler))
      }

      // Subscribe to memories changes
      if (syncMemories) {
        const memoriesMap = getMemoriesMap()
        const handler = () => triggerDebouncedSync()
        memoriesMap.observeDeep(handler)
        cleanupFns.push(() => memoriesMap.unobserveDeep(handler))
      }

      // Subscribe to knowledge changes
      if (syncKnowledge) {
        const knowledgeMap = getKnowledgeMap()
        const handler = () => triggerDebouncedSync()
        knowledgeMap.observeDeep(handler)
        cleanupFns.push(() => knowledgeMap.unobserveDeep(handler))
      }

      // Subscribe to tasks changes
      if (syncTasks) {
        const tasksMap = getTasksMap()
        const handler = () => triggerDebouncedSync()
        tasksMap.observeDeep(handler)
        cleanupFns.push(() => tasksMap.unobserveDeep(handler))
      }

      return () => {
        isSetupRef.current = false
        cleanupFns.forEach((cleanup) => cleanup())
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current)
          debounceTimerRef.current = null
        }
      }
    }

    return waitForReady()
  }, [
    isEnabled,
    syncAgents,
    syncConversations,
    syncMemories,
    syncKnowledge,
    syncTasks,
    triggerDebouncedSync,
  ])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])
}
