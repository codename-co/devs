/**
 * useStudioHistory Hook
 *
 * React hook for managing studio history with IndexedDB persistence.
 * Uses the main devs-ai-platform database for consistent data management.
 */

import { useState, useCallback, useEffect } from 'react'
import { db } from '@/lib/db'
import { useFolderSyncStore } from '@/features/local-backup/stores/folderSyncStore'
import { StudioEntry, GeneratedImage, ImageGenerationSettings } from '../types'

const MAX_HISTORY_ENTRIES = 100

/**
 * Get all history entries
 */
async function getAllHistory(): Promise<StudioEntry[]> {
  await db.init()
  const entries = await db.getAll<'studioEntries'>('studioEntries')
  // Sort by date descending (newest first)
  return entries.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )
}

/**
 * Save a history entry
 */
async function saveEntry(entry: StudioEntry): Promise<void> {
  await db.init()
  await db.update('studioEntries', entry)
}

/**
 * Delete a history entry
 */
async function deleteEntry(id: string): Promise<void> {
  await db.init()
  await db.delete('studioEntries', id)
}

/**
 * Clear all history
 */
async function clearAllHistory(): Promise<void> {
  await db.init()
  await db.clear('studioEntries')
}

export interface UseStudioHistoryReturn {
  /** All history entries */
  history: StudioEntry[]
  /** Favorite entries only */
  favorites: StudioEntry[]
  /** Whether history is loading */
  isLoading: boolean
  /** Add images to history */
  addToHistory: (
    prompt: string,
    settings: ImageGenerationSettings,
    images: GeneratedImage[],
  ) => Promise<StudioEntry>
  /** Toggle favorite status */
  toggleFavorite: (entryId: string) => Promise<void>
  /** Add tags to an entry */
  addTags: (entryId: string, tags: string[]) => Promise<void>
  /** Remove a history entry */
  removeEntry: (entryId: string) => Promise<void>
  /** Clear all history */
  clearHistory: () => Promise<void>
  /** Search history by prompt */
  searchHistory: (query: string) => StudioEntry[]
  /** Refresh history from database */
  refresh: () => Promise<void>
}

export function useStudioHistory(): UseStudioHistoryReturn {
  const [history, setHistory] = useState<StudioEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  // Get backup sync function
  const { triggerSync, isEnabled: isBackupEnabled, syncStudio } = useFolderSyncStore()
  
  // Trigger backup sync if enabled
  const triggerBackupSync = useCallback(() => {
    if (isBackupEnabled && syncStudio) {
      triggerSync()
    }
  }, [isBackupEnabled, syncStudio, triggerSync])

  // Load history on mount
  useEffect(() => {
    loadHistory()
  }, [])

  const loadHistory = useCallback(async () => {
    setIsLoading(true)
    try {
      const entries = await getAllHistory()
      setHistory(entries)
    } catch (err) {
      console.error('Failed to load image history:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Favorites filter
  const favorites = history.filter((entry) => entry.isFavorite)

  // Add to history
  const addToHistory = useCallback(
    async (
      prompt: string,
      settings: ImageGenerationSettings,
      images: GeneratedImage[],
    ): Promise<StudioEntry> => {
      const entry: StudioEntry = {
        id: `studio-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        prompt,
        settings,
        images,
        createdAt: new Date(),
      }

      await saveEntry(entry)
      
      // Trigger local backup sync
      triggerBackupSync()

      // Update state
      setHistory((prev) => {
        const newHistory = [entry, ...prev]
        // Trim to max entries
        if (newHistory.length > MAX_HISTORY_ENTRIES) {
          // Remove oldest non-favorite entries
          const sorted = newHistory.sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          )
          const toRemove = sorted
            .filter((e) => !e.isFavorite)
            .slice(MAX_HISTORY_ENTRIES - 1)

          // Delete from DB
          toRemove.forEach((e) => deleteEntry(e.id).catch(console.error))

          return sorted.filter((e) => !toRemove.includes(e))
        }
        return newHistory
      })

      return entry
    },
    [triggerBackupSync],
  )

  // Toggle favorite
  const toggleFavorite = useCallback(async (entryId: string) => {
    setHistory((prev) => {
      const updated = prev.map((entry) =>
        entry.id === entryId
          ? { ...entry, isFavorite: !entry.isFavorite }
          : entry,
      )

      // Save to DB
      const entry = updated.find((e) => e.id === entryId)
      if (entry) {
        saveEntry(entry)
          .then(() => triggerBackupSync())
          .catch(console.error)
      }

      return updated
    })
  }, [triggerBackupSync])

  // Add tags
  const addTags = useCallback(async (entryId: string, tags: string[]) => {
    setHistory((prev) => {
      const updated = prev.map((entry) =>
        entry.id === entryId
          ? { ...entry, tags: [...new Set([...(entry.tags || []), ...tags])] }
          : entry,
      )

      // Save to DB
      const entry = updated.find((e) => e.id === entryId)
      if (entry) {
        saveEntry(entry)
          .then(() => triggerBackupSync())
          .catch(console.error)
      }

      return updated
    })
  }, [triggerBackupSync])

  // Remove entry
  const removeEntry = useCallback(async (entryId: string) => {
    await deleteEntry(entryId)
    setHistory((prev) => prev.filter((e) => e.id !== entryId))
    triggerBackupSync()
  }, [triggerBackupSync])

  // Clear history
  const clearHistory = useCallback(async () => {
    await clearAllHistory()
    setHistory([])
    triggerBackupSync()
  }, [triggerBackupSync])

  // Search history
  const searchHistory = useCallback(
    (query: string): StudioEntry[] => {
      if (!query.trim()) return history

      const lowerQuery = query.toLowerCase()
      return history.filter(
        (entry) =>
          entry.prompt.toLowerCase().includes(lowerQuery) ||
          entry.tags?.some((tag: string) =>
            tag.toLowerCase().includes(lowerQuery),
          ),
      )
    },
    [history],
  )

  return {
    history,
    favorites,
    isLoading,
    addToHistory,
    toggleFavorite,
    addTags,
    removeEntry,
    clearHistory,
    searchHistory,
    refresh: loadHistory,
  }
}
