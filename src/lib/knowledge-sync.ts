import { db } from './db'
import { KnowledgeItem, PersistedFolderWatcher } from '@/types'

export interface FolderWatcher {
  id: string
  directoryHandle: any // FileSystemDirectoryHandle has incomplete types
  basePath: string
  lastSync: Date
  isActive: boolean
}

export interface SyncEvent {
  type:
    | 'sync_start'
    | 'sync_complete'
    | 'file_added'
    | 'file_updated'
    | 'file_deleted'
    | 'sync_error'
  watcherId: string
  watcherPath: string
  fileName?: string
  fileCount?: number
  error?: string
  timestamp: Date
}

class KnowledgeSyncService {
  private watchers = new Map<string, FolderWatcher>()
  private syncInterval: NodeJS.Timeout | null = null
  private readonly SYNC_INTERVAL_MS = 30000 // 30 seconds
  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB limit
  private watcherChangeCallbacks: (() => void)[] = []
  private syncEventCallbacks: ((event: SyncEvent) => void)[] = []

  constructor() {
    this.startSyncLoop()
    this.restorePersistedWatchers()
  }

  // Generate SHA-256 hash for content deduplication
  async generateContentHash(content: string): Promise<string> {
    const encoder = new TextEncoder()
    const data = encoder.encode(content)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
  }

  // Detect file type based on extension and content
  private detectFileType(
    file: File,
    content?: string,
  ): 'document' | 'image' | 'text' {
    const fileName = file.name.toLowerCase()
    const mimeType = file.type.toLowerCase()

    // Image files
    if (
      mimeType.startsWith('image/') ||
      fileName.match(/\.(jpg|jpeg|png|gif|bmp|webp|svg|ico|tiff)$/i)
    ) {
      return 'image'
    }

    // Document files (binary or complex formats)
    if (
      mimeType.includes('pdf') ||
      mimeType.includes('word') ||
      mimeType.includes('powerpoint') ||
      mimeType.includes('presentation') ||
      mimeType.includes('spreadsheet') ||
      mimeType.includes('excel') ||
      fileName.match(
        /\.(pdf|doc|docx|ppt|pptx|xls|xlsx|odt|ods|odp|rtf|epub)$/i,
      )
    ) {
      return 'document'
    }

    // Check content for binary vs text
    if (content) {
      // If content starts with data: URL, it's likely binary
      if (content.startsWith('data:')) {
        // Check if it's an image data URL
        if (content.startsWith('data:image/')) {
          return 'image'
        }
        // Other binary data URLs are documents
        return 'document'
      }

      // Check for common binary file signatures in base64 content
      const binarySignatures = [
        'JVBERi', // PDF (%PDF)
        'UEsDB', // ZIP/Office files
        'R0lGOD', // GIF
        '/9j/', // JPEG
        'iVBORw0KGgo', // PNG
      ]

      if (binarySignatures.some((sig) => content.startsWith(sig))) {
        return content.startsWith('R0lGOD') ||
          content.startsWith('/9j/') ||
          content.startsWith('iVBORw0KGgo')
          ? 'image'
          : 'document'
      }
    }

    // Text files (default)
    return 'text'
  }

  // Check if content already exists by hash
  async isDuplicate(contentHash: string): Promise<KnowledgeItem | null> {
    try {
      const allItems = await db.getAll('knowledgeItems')
      return allItems.find((item) => item.contentHash === contentHash) || null
    } catch (error) {
      console.error('Error checking for duplicates:', error)
      return null
    }
  }

  // Add a file with deduplication check
  async addFileWithDeduplication(
    file: File,
    syncSource: 'manual' | 'filesystem_api' = 'manual',
  ): Promise<KnowledgeItem | null> {
    try {
      // Skip files that are too large
      if (file.size > this.MAX_FILE_SIZE) {
        console.warn(
          `File ${file.name} is too large (${file.size} bytes), skipping`,
        )
        return null
      }

      // Read file content
      const content = await this.readFileContent(file)

      // Detect file type based on extension and content
      const fileType = this.detectFileType(file, content)

      // Generate hash for deduplication
      const contentHash = await this.generateContentHash(content)

      // Check if file already exists
      const existing = await this.isDuplicate(contentHash)
      if (existing) {
        console.log(
          `File ${file.name} already exists (duplicate detected), skipping`,
        )
        return existing
      }

      // Create new knowledge item
      const item: KnowledgeItem = {
        id: crypto.randomUUID(),
        name: file.name,
        type: 'file',
        fileType,
        content,
        contentHash,
        mimeType: file.type,
        size: file.size,
        path: `/${file.name}`,
        lastModified: new Date(file.lastModified),
        createdAt: new Date(),
        syncSource,
        lastSyncCheck: new Date(),
      }

      // Ensure database is ready
      if (!db.isInitialized()) {
        await db.init()
      }

      if (!db.hasStore('knowledgeItems')) {
        await (db as any).resetDatabase()
      }

      await db.add('knowledgeItems', item)
      console.log(`Added new file: ${file.name}`)
      return item
    } catch (error) {
      console.error(`Error adding file ${file.name}:`, error)
      return null
    }
  }

  // Read file content with proper encoding detection
  private async readFileContent(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject

      // Read as text for text files, base64 for binary files
      if (
        file.type.startsWith('text/') ||
        file.type === 'application/json' ||
        file.type === 'application/javascript' ||
        file.name.match(/\.(md|txt|js|ts|jsx|tsx|css|html|xml|svg)$/i)
      ) {
        reader.readAsText(file)
      } else {
        reader.readAsDataURL(file)
      }
    })
  }

  // Register a folder for continuous synchronization
  async registerFolderWatch(
    directoryHandle: any,
    basePath?: string,
  ): Promise<string> {
    const watchId = crypto.randomUUID()
    const folderPath = basePath || directoryHandle.name

    const watcher: FolderWatcher = {
      id: watchId,
      directoryHandle,
      basePath: folderPath,
      lastSync: new Date(),
      isActive: true,
    }

    this.watchers.set(watchId, watcher)

    // Persist to database
    await this.persistFolderWatcher(watcher)

    // Perform initial sync
    await this.syncFolder(watcher)

    console.log(`Registered folder watcher for: ${folderPath}`)

    // Notify listeners about the new watcher
    this.notifyWatchersChanged()

    return watchId
  }

  // Remove a folder watcher
  async unregisterFolderWatch(watchId: string): Promise<void> {
    const watcher = this.watchers.get(watchId)
    if (watcher) {
      watcher.isActive = false
      this.watchers.delete(watchId)

      // Remove from persistent storage
      await this.removePersistentWatcher(watchId)

      console.log(`Unregistered folder watcher: ${watcher.basePath}`)

      // Notify listeners about the removed watcher
      this.notifyWatchersChanged()
    }
  }

  // Sync a single folder
  private async syncFolder(watcher: FolderWatcher): Promise<void> {
    if (!watcher.isActive) return

    try {
      console.log(`Syncing folder: ${watcher.basePath}`)

      // Emit sync start event
      this.emitSyncEvent({
        type: 'sync_start',
        watcherId: watcher.id,
        watcherPath: watcher.basePath,
        timestamp: new Date(),
      })

      // Track existing files before processing
      const existingFiles = await this.getFilesByWatchId(watcher.id)
      const processedPaths = new Set<string>()
      const syncStats = { added: 0, updated: 0, deleted: 0 }

      await this.processDirectoryRecursive(
        watcher.directoryHandle,
        watcher.basePath,
        watcher.id,
        processedPaths,
        syncStats,
      )

      // Clean up deleted files
      const deletedCount = await this.cleanupDeletedFiles(
        existingFiles,
        processedPaths,
        watcher.id,
      )
      syncStats.deleted = deletedCount

      watcher.lastSync = new Date()

      // Emit sync complete event
      this.emitSyncEvent({
        type: 'sync_complete',
        watcherId: watcher.id,
        watcherPath: watcher.basePath,
        fileCount: syncStats.added + syncStats.updated + syncStats.deleted,
        timestamp: new Date(),
      })

      // Notify watcher changes if any files were processed
      if (
        syncStats.added > 0 ||
        syncStats.updated > 0 ||
        syncStats.deleted > 0
      ) {
        this.notifyWatchersChanged()
      }
    } catch (error) {
      console.error(`Error syncing folder ${watcher.basePath}:`, error)

      // Emit sync error event
      this.emitSyncEvent({
        type: 'sync_error',
        watcherId: watcher.id,
        watcherPath: watcher.basePath,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date(),
      })

      // If we get a permission error, the folder might have been moved/deleted
      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        console.warn(
          `Lost access to folder ${watcher.basePath}, removing watcher`,
        )
        await this.unregisterFolderWatch(watcher.id)
      }
    }
  }

  // Process directory recursively
  private async processDirectoryRecursive(
    dirHandle: any,
    basePath: string,
    watchId: string,
    processedPaths?: Set<string>,
    syncStats?: { added: number; updated: number; deleted: number },
  ): Promise<void> {
    try {
      for await (const [name, handle] of dirHandle.entries()) {
        const fullPath = `/${basePath}/${name}`

        // Track this path as processed
        if (processedPaths) {
          processedPaths.add(fullPath)
        }

        if (handle.kind === 'file') {
          const file = await handle.getFile()

          // Check if file was modified since last sync
          const existingItem = await this.findItemByPath(fullPath)
          if (
            existingItem &&
            existingItem.lastModified >= new Date(file.lastModified)
          ) {
            // Update the lastSyncCheck timestamp even if file hasn't changed
            await db.update('knowledgeItems', {
              ...existingItem,
              lastSyncCheck: new Date(),
            })
            continue // File hasn't changed
          }

          if (existingItem) {
            // File exists but was modified - update it
            const content = await this.readFileContent(file)
            const fileType = this.detectFileType(file, content)
            const contentHash = await this.generateContentHash(content)

            const updatedItem: KnowledgeItem = {
              ...existingItem,
              content,
              fileType,
              contentHash,
              mimeType: file.type,
              size: file.size,
              lastModified: new Date(file.lastModified),
              lastSyncCheck: new Date(),
            }

            await db.update('knowledgeItems', updatedItem)
            console.log(`Updated existing file: ${file.name}`)

            // Track statistics and emit event
            if (syncStats) syncStats.updated++
            this.emitSyncEvent({
              type: 'file_updated',
              watcherId: watchId,
              watcherPath: basePath,
              fileName: file.name,
              timestamp: new Date(),
            })
          } else {
            // New file - add it with deduplication
            const item = await this.addFileWithDeduplication(
              file,
              'filesystem_api',
            )
            if (item) {
              // Update the path and watch ID for filesystem items
              const updatedItem: KnowledgeItem = {
                ...item,
                path: fullPath,
                watchId,
              }
              await db.update('knowledgeItems', updatedItem)
              console.log(`Added new file from filesystem: ${file.name}`)

              // Track statistics and emit event
              if (syncStats) syncStats.added++
              this.emitSyncEvent({
                type: 'file_added',
                watcherId: watchId,
                watcherPath: basePath,
                fileName: file.name,
                timestamp: new Date(),
              })
            }
          }
        } else if (handle.kind === 'directory') {
          // Create folder entry if it doesn't exist
          let folderItem = await this.findItemByPath(fullPath)
          if (!folderItem) {
            folderItem = {
              id: crypto.randomUUID(),
              name,
              type: 'folder',
              path: fullPath,
              lastModified: new Date(),
              createdAt: new Date(),
              syncSource: 'filesystem_api',
              watchId,
              lastSyncCheck: new Date(),
            }
            await db.add('knowledgeItems', folderItem)
          }

          // Recursively process subdirectory
          await this.processDirectoryRecursive(
            handle,
            `${basePath}/${name}`,
            watchId,
            processedPaths,
            syncStats,
          )
        }
      }
    } catch (error) {
      console.error(`Error processing directory ${basePath}:`, error)
    }
  }

  // Find knowledge item by path
  private async findItemByPath(path: string): Promise<KnowledgeItem | null> {
    try {
      const allItems = await db.getAll('knowledgeItems')
      return allItems.find((item) => item.path === path) || null
    } catch (error) {
      console.error('Error finding item by path:', error)
      return null
    }
  }

  // Get all files associated with a specific watcher
  private async getFilesByWatchId(watchId: string): Promise<KnowledgeItem[]> {
    try {
      const allItems = await db.getAll('knowledgeItems')
      return allItems.filter((item) => item.watchId === watchId)
    } catch (error) {
      console.error('Error getting files by watch ID:', error)
      return []
    }
  }

  // Clean up files that no longer exist in the filesystem
  private async cleanupDeletedFiles(
    existingFiles: KnowledgeItem[],
    processedPaths: Set<string>,
    watchId: string,
  ): Promise<number> {
    let deletedCount = 0

    for (const item of existingFiles) {
      if (!processedPaths.has(item.path)) {
        // File was not found during sync - it was deleted
        try {
          await db.delete('knowledgeItems', item.id)
          deletedCount++
          console.log(`Removed deleted file from sync: ${item.name}`)

          // Emit delete event
          this.emitSyncEvent({
            type: 'file_deleted',
            watcherId: watchId,
            watcherPath: item.path,
            fileName: item.name,
            timestamp: new Date(),
          })
        } catch (error) {
          console.error(`Error removing deleted file ${item.name}:`, error)
        }
      }
    }

    if (deletedCount > 0) {
      console.log(
        `Cleaned up ${deletedCount} deleted files for watcher ${watchId}`,
      )
    }

    return deletedCount
  }

  // Start the continuous sync loop
  private startSyncLoop(): void {
    if (this.syncInterval) return // Already running

    this.syncInterval = setInterval(async () => {
      if (this.watchers.size === 0) return

      console.log(
        `Running sync check for ${this.watchers.size} watched folders`,
      )

      for (const watcher of this.watchers.values()) {
        if (watcher.isActive) {
          await this.syncFolder(watcher)
        }
      }
    }, this.SYNC_INTERVAL_MS)

    console.log(
      `Started knowledge sync service (interval: ${this.SYNC_INTERVAL_MS}ms)`,
    )
  }

  // Stop the sync loop
  stopSyncLoop(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
      this.syncInterval = null
      console.log('Stopped knowledge sync service')
    }
  }

  // Get all active watchers
  getActiveWatchers(): FolderWatcher[] {
    return Array.from(this.watchers.values()).filter((w) => w.isActive)
  }

  // Get all watchers (including inactive/disconnected ones)
  getAllWatchers(): FolderWatcher[] {
    return Array.from(this.watchers.values())
  }

  // Subscribe to watcher changes
  onWatchersChanged(callback: () => void): () => void {
    this.watcherChangeCallbacks.push(callback)
    // Return unsubscribe function
    return () => {
      const index = this.watcherChangeCallbacks.indexOf(callback)
      if (index > -1) {
        this.watcherChangeCallbacks.splice(index, 1)
      }
    }
  }

  // Subscribe to sync events
  onSyncEvent(callback: (event: SyncEvent) => void): () => void {
    this.syncEventCallbacks.push(callback)
    // Return unsubscribe function
    return () => {
      const index = this.syncEventCallbacks.indexOf(callback)
      if (index > -1) {
        this.syncEventCallbacks.splice(index, 1)
      }
    }
  }

  // Emit sync events to subscribers
  private emitSyncEvent(event: SyncEvent): void {
    this.syncEventCallbacks.forEach((callback) => {
      try {
        callback(event)
      } catch (error) {
        console.error('Error in sync event callback:', error)
      }
    })
  }

  // Notify all subscribers about watcher changes
  private notifyWatchersChanged(): void {
    this.watcherChangeCallbacks.forEach((callback) => {
      try {
        callback()
      } catch (error) {
        console.error('Error in watcher change callback:', error)
      }
    })
  }

  // Clean up orphaned items (items whose folders are no longer watched)
  async cleanupOrphanedItems(): Promise<number> {
    try {
      const allItems = await db.getAll('knowledgeItems')
      const activeWatchIds = new Set(Array.from(this.watchers.keys()))

      let cleanupCount = 0
      for (const item of allItems) {
        if (
          item.syncSource === 'filesystem_api' &&
          item.watchId &&
          !activeWatchIds.has(item.watchId)
        ) {
          await db.delete('knowledgeItems', item.id)
          cleanupCount++
        }
      }

      if (cleanupCount > 0) {
        console.log(`Cleaned up ${cleanupCount} orphaned knowledge items`)
      }

      return cleanupCount
    } catch (error) {
      console.error('Error cleaning up orphaned items:', error)
      return 0
    }
  }

  // Save folder watcher to persistent storage
  private async persistFolderWatcher(watcher: FolderWatcher): Promise<void> {
    try {
      if (!db.isInitialized()) {
        await db.init()
      }

      const persistedWatcher: PersistedFolderWatcher = {
        id: watcher.id,
        basePath: watcher.basePath,
        lastSync: watcher.lastSync,
        isActive: watcher.isActive,
        createdAt: new Date(),
      }

      await db.add('folderWatchers', persistedWatcher)
      console.log(`Persisted folder watcher: ${watcher.basePath}`)
    } catch (error) {
      console.error('Error persisting folder watcher:', error)
    }
  }

  // Remove folder watcher from persistent storage
  private async removePersistentWatcher(watchId: string): Promise<void> {
    try {
      if (!db.isInitialized()) {
        await db.init()
      }

      await db.delete('folderWatchers', watchId)
      console.log(`Removed persistent folder watcher: ${watchId}`)
    } catch (error) {
      console.error('Error removing persistent folder watcher:', error)
    }
  }

  // Restore persisted folder watchers on startup
  private async restorePersistedWatchers(): Promise<void> {
    try {
      // Wait a bit for the database to be fully initialized
      // await new Promise(resolve => setTimeout(resolve, 1000))

      if (!db.isInitialized()) {
        await db.init()
      }

      // Check if folderWatchers store exists
      if (!db.hasStore('folderWatchers')) {
        console.log('FolderWatchers store not available, skipping restoration')
        return
      }

      const persistedWatchers = await db.getAll('folderWatchers')

      if (persistedWatchers.length > 0) {
        console.log(
          `Found ${persistedWatchers.length} persisted folder watchers`,
        )

        // For each persisted watcher, we need to re-request folder access
        for (const persistedWatcher of persistedWatchers) {
          if (persistedWatcher.isActive) {
            await this.requestFolderReaccess(persistedWatcher)
          }
        }

        // Notify any listeners that watchers have been restored
        this.notifyWatchersChanged()
      }
    } catch (error) {
      console.error('Error restoring persisted folder watchers:', error)
    }
  }

  // Request re-access to a previously selected folder
  private async requestFolderReaccess(
    persistedWatcher: PersistedFolderWatcher,
  ): Promise<void> {
    try {
      // We can't automatically restore folder access due to security restrictions
      // Instead, we'll create a "pending" watcher that prompts the user to re-select the folder
      console.log(
        `Found previously watched folder: ${persistedWatcher.basePath}`,
      )

      // Create a placeholder watcher that shows in the UI
      const placeholderWatcher: FolderWatcher = {
        id: persistedWatcher.id,
        directoryHandle: null, // No handle until user re-selects
        basePath: persistedWatcher.basePath + ' (Click to reconnect)',
        lastSync: persistedWatcher.lastSync,
        isActive: false, // Mark as inactive until reconnected
      }

      this.watchers.set(persistedWatcher.id, placeholderWatcher)
    } catch (error) {
      console.error(
        `Error creating placeholder for folder ${persistedWatcher.basePath}:`,
        error,
      )
    }
  }

  // Reconnect to a previously watched folder
  async reconnectFolder(watchId: string, directoryHandle: any): Promise<void> {
    try {
      const watcher = this.watchers.get(watchId)
      if (!watcher) {
        console.error('Watcher not found for reconnection')
        return
      }

      // Update the watcher with the new directory handle
      watcher.directoryHandle = directoryHandle
      watcher.basePath = directoryHandle.name
      watcher.isActive = true
      watcher.lastSync = new Date()

      // Update persistent storage
      const persistedWatcher: PersistedFolderWatcher = {
        id: watchId,
        basePath: watcher.basePath,
        lastSync: watcher.lastSync,
        isActive: true,
        createdAt: new Date(),
      }

      await db.update('folderWatchers', persistedWatcher)

      // Perform initial sync
      await this.syncFolder(watcher)

      console.log(`Reconnected folder watcher: ${watcher.basePath}`)
    } catch (error) {
      console.error('Error reconnecting folder:', error)
    }
  }
}

// Global singleton instance
export const knowledgeSync = new KnowledgeSyncService()

// Helper functions for easy access
export const addFile = (file: File) =>
  knowledgeSync.addFileWithDeduplication(file)
export const watchFolder = (dirHandle: any) =>
  knowledgeSync.registerFolderWatch(dirHandle)
export const unwatchFolder = (watchId: string) =>
  knowledgeSync.unregisterFolderWatch(watchId)
export const getWatchers = () => knowledgeSync.getActiveWatchers()
export const getAllWatchers = () => knowledgeSync.getAllWatchers()
export const reconnectFolder = (watchId: string, dirHandle: any) =>
  knowledgeSync.reconnectFolder(watchId, dirHandle)
export const onWatchersChanged = (callback: () => void) =>
  knowledgeSync.onWatchersChanged(callback)
export const onSyncEvent = (callback: (event: SyncEvent) => void) =>
  knowledgeSync.onSyncEvent(callback)
