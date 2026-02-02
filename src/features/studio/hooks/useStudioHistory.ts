/**
 * useStudioHistory Hook
 *
 * React hook for managing studio history with Yjs persistence.
 * Uses Yjs maps for consistent data management.
 */

import { useState, useCallback, useEffect } from 'react'
import { studioEntries } from '@/lib/yjs'
import { useFolderSyncStore } from '@/features/local-backup/stores/folderSyncStore'
import { folderSyncService } from '@/features/local-backup/lib/local-backup-service'
import {
  StudioEntry,
  GeneratedImage,
  ImageGenerationSettings,
  GeneratedVideo,
  VideoGenerationSettings,
} from '../types'

const MAX_HISTORY_ENTRIES = 100

/**
 * Get all history entries
 */
function getAllHistory(): StudioEntry[] {
  const entries = Array.from(studioEntries.values())
  // Sort by date descending (newest first)
  return entries.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )
}

/**
 * Save a history entry
 */
function saveEntry(entry: StudioEntry): void {
  console.debug('[StudioHistory] Saving entry to Yjs:', entry.id)
  studioEntries.set(entry.id, entry)
}

/**
 * Delete a history entry
 */
function deleteEntry(id: string): void {
  studioEntries.delete(id)
}

/**
 * Clear all history
 */
function clearAllHistory(): void {
  // Get all entries to sync deletions
  const entries = Array.from(studioEntries.values())
  // Clear all entries from Yjs
  for (const entry of entries) {
    studioEntries.delete(entry.id)
  }
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
  /** Add videos to history */
  addVideoToHistory: (
    prompt: string,
    settings: VideoGenerationSettings,
    videos: GeneratedVideo[],
  ) => Promise<StudioEntry>
  /** Toggle favorite status */
  toggleFavorite: (entryId: string) => Promise<void>
  /** Add tags to an entry */
  addTags: (entryId: string, tags: string[]) => Promise<void>
  /** Remove a history entry */
  removeEntry: (entryId: string) => Promise<void>
  /** Remove a specific image from a history entry */
  removeImage: (entryId: string, imageId: string) => Promise<void>
  /** Remove a specific video from a history entry */
  removeVideo: (entryId: string, videoId: string) => Promise<void>
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
  const {
    triggerSync,
    isEnabled: isBackupEnabled,
    syncStudio,
  } = useFolderSyncStore()

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

  // Subscribe to Yjs changes for P2P sync
  useEffect(() => {
    const observer = () => {
      const entries = getAllHistory()
      setHistory(entries)
    }
    studioEntries.observe(observer)
    return () => {
      studioEntries.unobserve(observer)
    }
  }, [])

  const loadHistory = useCallback(async () => {
    setIsLoading(true)
    try {
      const entries = getAllHistory()
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
        mediaType: 'image',
        settings,
        images,
        createdAt: new Date(),
      }

      saveEntry(entry)

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
          toRemove.forEach((e) => deleteEntry(e.id))

          return sorted.filter((e) => !toRemove.includes(e))
        }
        return newHistory
      })

      return entry
    },
    [triggerBackupSync],
  )

  // Add video to history
  const addVideoToHistory = useCallback(
    async (
      prompt: string,
      settings: VideoGenerationSettings,
      videos: GeneratedVideo[],
    ): Promise<StudioEntry> => {
      // Convert video blobs to base64 for persistence
      const videosWithBase64 = await Promise.all(
        videos.map(async (video) => {
          // If already has base64 or no blob, return as-is
          if (video.base64 || !video.blob) {
            // Remove blob before saving (it can't be serialized)
            const { blob: _blob, ...videoWithoutBlob } = video
            return videoWithoutBlob
          }

          // Convert blob to base64
          const blob = video.blob
          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => {
              const result = reader.result as string
              // Extract base64 data without the data URL prefix
              const base64Data = result.split(',')[1]
              resolve(base64Data)
            }
            reader.onerror = reject
            reader.readAsDataURL(blob)
          })

          // Return video with base64, without blob (blob can't be serialized)
          const { blob: _blob, ...videoWithoutBlob } = video
          return {
            ...videoWithoutBlob,
            base64,
          }
        }),
      )

      const entry: StudioEntry = {
        id: `studio-video-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        prompt,
        mediaType: 'video',
        videoSettings: settings,
        videos: videosWithBase64,
        createdAt: new Date(),
      }

      saveEntry(entry)

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
          toRemove.forEach((e) => deleteEntry(e.id))

          return sorted.filter((e) => !toRemove.includes(e))
        }
        return newHistory
      })

      return entry
    },
    [triggerBackupSync],
  )

  // Toggle favorite
  const toggleFavorite = useCallback(
    async (entryId: string) => {
      setHistory((prev) => {
        const updated = prev.map((entry) =>
          entry.id === entryId
            ? { ...entry, isFavorite: !entry.isFavorite }
            : entry,
        )

        // Save to Yjs
        const entry = updated.find((e) => e.id === entryId)
        if (entry) {
          saveEntry(entry)
          triggerBackupSync()
        }

        return updated
      })
    },
    [triggerBackupSync],
  )

  // Add tags
  const addTags = useCallback(
    async (entryId: string, tags: string[]) => {
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
          triggerBackupSync()
        }

        return updated
      })
    },
    [triggerBackupSync],
  )

  // Remove entry
  const removeEntry = useCallback(
    async (entryId: string) => {
      deleteEntry(entryId)
      setHistory((prev) => prev.filter((e) => e.id !== entryId))
      // Delete files from local backup
      folderSyncService.deleteStudioEntryFiles(entryId).catch(console.error)
      triggerBackupSync()
    },
    [triggerBackupSync],
  )

  // Remove a specific image from an entry
  const removeImage = useCallback(
    async (entryId: string, imageId: string) => {
      setHistory((prev) => {
        const entryIndex = prev.findIndex((e) => e.id === entryId)
        if (entryIndex === -1) return prev

        const entry = prev[entryIndex]
        const remainingImages = (entry.images || []).filter(
          (img) => img.id !== imageId,
        )

        // If no images left, delete the entire entry
        if (remainingImages.length === 0) {
          deleteEntry(entryId)
          // Delete all files from local backup
          folderSyncService.deleteStudioEntryFiles(entryId).catch(console.error)
          return prev.filter((e) => e.id !== entryId)
        }

        // Otherwise, update the entry with remaining images
        const updatedEntry = { ...entry, images: remainingImages }
        saveEntry(updatedEntry)
        // Delete the specific image file from local backup
        folderSyncService
          .deleteStudioImageFile(entryId, imageId)
          .catch(console.error)
        triggerBackupSync()

        const updated = [...prev]
        updated[entryIndex] = updatedEntry
        return updated
      })
    },
    [triggerBackupSync],
  )

  // Remove a specific video from an entry
  const removeVideo = useCallback(
    async (entryId: string, videoId: string) => {
      setHistory((prev) => {
        const entryIndex = prev.findIndex((e) => e.id === entryId)
        if (entryIndex === -1) return prev

        const entry = prev[entryIndex]
        const remainingVideos = (entry.videos || []).filter(
          (vid) => vid.id !== videoId,
        )

        // If no videos left, delete the entire entry
        if (remainingVideos.length === 0) {
          deleteEntry(entryId)
          // Delete all files from local backup
          folderSyncService.deleteStudioEntryFiles(entryId).catch(console.error)
          return prev.filter((e) => e.id !== entryId)
        }

        // Otherwise, update the entry with remaining videos
        const updatedEntry = { ...entry, videos: remainingVideos }
        saveEntry(updatedEntry)
        // Delete the specific video file from local backup
        // Note: Videos are stored similarly to images in the entry folder
        folderSyncService
          .deleteStudioImageFile(entryId, videoId)
          .catch(console.error)
        triggerBackupSync()

        const updated = [...prev]
        updated[entryIndex] = updatedEntry
        return updated
      })
    },
    [triggerBackupSync],
  )

  // Clear history
  const clearHistory = useCallback(async () => {
    clearAllHistory()
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
    addVideoToHistory,
    toggleFavorite,
    addTags,
    removeEntry,
    removeImage,
    removeVideo,
    clearHistory,
    searchHistory,
    refresh: loadHistory,
  }
}
