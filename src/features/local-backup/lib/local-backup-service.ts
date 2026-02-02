/**
 * Folder Sync Service
 *
 * Bidirectional synchronization between Yjs and local file system.
 * Uses File System Access API for folder access.
 *
 * Features:
 * - Live sync on data changes
 * - File change detection
 * - Conflict resolution (last-write-wins)
 * - Debounced writes to prevent thrashing
 */
import {
  agents as agentsMap,
  conversations as conversationsMap,
  knowledge as knowledgeMap,
  tasks as tasksMap,
  memories as memoriesMap,
  studioEntries as studioEntriesMap,
  artifacts as artifactsMap,
  credentials as credentialsMap,
  connectors as connectorsMap,
  battles as battlesMap,
  workflows as workflowsMap,
  pinnedMessages as pinnedMessagesMap,
  memoryLearningEvents as memoryLearningEventsMap,
  agentMemoryDocuments as agentMemoryDocumentsMap,
  preferences as preferencesMap,
} from '@/lib/yjs'
// Import additional maps not exported from main module
import {
  connectorSyncStates as connectorSyncStatesMap,
  traces as tracesMap,
  spans as spansMap,
  sharedContexts as sharedContextsMap,
  installedExtensions as installedExtensionsMap,
  customExtensions as customExtensionsMap,
} from '@/lib/yjs/maps'
import type { Agent, Conversation } from '@/types'
import type { StudioEntry } from '@/features/studio/types'
import {
  agentSerializer,
  conversationSerializer,
  memorySerializer,
  knowledgeSerializer,
  taskSerializer,
  studioSerializer,
} from './serializers'
import type { Serializer, SerializeContext } from './serializers/types'

// Debounce delay for writes (ms)
const WRITE_DEBOUNCE_MS = 1_000

// Sync interval for checking file changes (ms)
const SYNC_INTERVAL_MS = 30_000

// Maximum concurrent file operations for parallel processing
const MAX_CONCURRENT_WRITES = 10

// LocalStorage key for persisting file hashes across sessions
const HASH_CACHE_KEY = 'devs-local-backup-hashes'

export interface FolderSyncConfig {
  id: string
  directoryHandle: FileSystemDirectoryHandle
  basePath: string
  isActive: boolean
  lastSync: Date
  createdAt: Date
  // What to sync
  syncAgents: boolean
  syncConversations: boolean
  syncMemories: boolean
  syncKnowledge: boolean
  syncTasks: boolean
  syncStudio: boolean
  syncFullExport: boolean
}

export interface FolderSyncEvent {
  type:
    | 'sync_start'
    | 'sync_complete'
    | 'file_written'
    | 'file_read'
    | 'file_deleted'
    | 'sync_error'
  entityType?:
    | 'agent'
    | 'conversation'
    | 'memory'
    | 'knowledge'
    | 'task'
    | 'studio'
  entityId?: string
  filename?: string
  error?: string
  timestamp: Date
}

type SyncEventCallback = (event: FolderSyncEvent) => void

class FolderSyncService {
  private config: FolderSyncConfig | null = null
  private syncInterval: ReturnType<typeof setInterval> | null = null
  private writeDebounceTimers: Map<string, ReturnType<typeof setTimeout>> =
    new Map()
  private eventListeners: Set<SyncEventCallback> = new Set()
  private fileHashes: Map<string, string> = new Map()
  private isSyncing = false
  private agentSlugCache: Map<string, string> = new Map() // agentId -> slug
  private dirtyEntities: Set<string> = new Set() // Track entities that need sync
  private hashCacheLoaded = false

  /**
   * Load persisted hash cache from localStorage
   */
  private loadHashCache(): void {
    if (this.hashCacheLoaded) return
    try {
      const cached = localStorage.getItem(HASH_CACHE_KEY)
      if (cached) {
        const parsed = JSON.parse(cached) as Record<string, string>
        this.fileHashes = new Map(Object.entries(parsed))
      }
      this.hashCacheLoaded = true
    } catch (error) {
      console.warn('Failed to load hash cache:', error)
    }
  }

  /**
   * Persist hash cache to localStorage (debounced)
   */
  private persistHashCacheDebounced = this.debounce(() => {
    try {
      const obj = Object.fromEntries(this.fileHashes)
      localStorage.setItem(HASH_CACHE_KEY, JSON.stringify(obj))
    } catch (error) {
      console.warn('Failed to persist hash cache:', error)
    }
  }, 5000)

  /**
   * Simple debounce utility
   */
  private debounce<T extends (...args: unknown[]) => void>(
    fn: T,
    delay: number,
  ): T {
    let timeoutId: ReturnType<typeof setTimeout> | null = null
    return ((...args: unknown[]) => {
      if (timeoutId) clearTimeout(timeoutId)
      timeoutId = setTimeout(() => fn(...args), delay)
    }) as T
  }

  /**
   * Mark an entity as dirty (needs sync)
   */
  markDirty(entityType: string, entityId: string): void {
    this.dirtyEntities.add(`${entityType}:${entityId}`)
  }

  /**
   * Clear dirty flag for an entity
   */
  private clearDirty(entityType: string, entityId: string): void {
    this.dirtyEntities.delete(`${entityType}:${entityId}`)
  }

  /**
   * Build agent slug lookup context for serialization
   */
  private async buildSerializeContext(): Promise<SerializeContext> {
    // Refresh agent slug cache from Yjs
    const agents = Array.from(agentsMap.values())
    this.agentSlugCache.clear()
    for (const agent of agents) {
      if (agent.slug) {
        this.agentSlugCache.set(agent.id, agent.slug)
      }
    }

    return {
      getAgentSlug: (agentId: string) => this.agentSlugCache.get(agentId),
    }
  }

  /**
   * Initialize folder sync with a directory handle
   */
  async initialize(
    directoryHandle: FileSystemDirectoryHandle,
    options: {
      syncAgents?: boolean
      syncConversations?: boolean
      syncMemories?: boolean
      syncKnowledge?: boolean
      syncTasks?: boolean
      syncStudio?: boolean
      syncFullExport?: boolean
    } = {},
  ): Promise<FolderSyncConfig> {
    // Verify we have write permission
    const permission = await directoryHandle.requestPermission({
      mode: 'readwrite',
    })
    if (permission !== 'granted') {
      throw new Error('Write permission denied for folder')
    }

    this.config = {
      id: crypto.randomUUID(),
      directoryHandle,
      basePath: directoryHandle.name,
      isActive: true,
      lastSync: new Date(),
      createdAt: new Date(),
      syncAgents: options.syncAgents ?? true,
      syncConversations: options.syncConversations ?? true,
      syncMemories: options.syncMemories ?? true,
      syncKnowledge: options.syncKnowledge ?? true,
      syncTasks: options.syncTasks ?? true,
      syncStudio: options.syncStudio ?? true,
      syncFullExport: options.syncFullExport ?? true,
    }

    // Clear hash cache when initializing with a new directory
    // This ensures files are written even if they existed before
    this.fileHashes.clear()
    this.hashCacheLoaded = false
    localStorage.removeItem(HASH_CACHE_KEY)

    console.info('[LocalBackup] Initialized with folder:', directoryHandle.name)

    // Perform initial sync (DB -> Files)
    // Note: Directories are created on-demand when writing files
    await this.syncToFiles()

    // Start watching for changes
    this.startSyncInterval()

    return this.config
  }

  /**
   * Stop folder sync
   */
  stop(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
      this.syncInterval = null
    }

    // Clear all debounce timers
    for (const timer of this.writeDebounceTimers.values()) {
      clearTimeout(timer)
    }
    this.writeDebounceTimers.clear()

    if (this.config) {
      this.config.isActive = false
      console.info('[LocalBackup] Stopped')
    }
  }

  /**
   * Get current config
   */
  getConfig(): FolderSyncConfig | null {
    return this.config
  }

  /**
   * Update sync configuration options
   */
  updateConfig(options: {
    syncAgents?: boolean
    syncConversations?: boolean
    syncMemories?: boolean
    syncKnowledge?: boolean
    syncTasks?: boolean
    syncStudio?: boolean
    syncFullExport?: boolean
  }): void {
    if (!this.config) return

    if (options.syncAgents !== undefined)
      this.config.syncAgents = options.syncAgents
    if (options.syncConversations !== undefined)
      this.config.syncConversations = options.syncConversations
    if (options.syncMemories !== undefined)
      this.config.syncMemories = options.syncMemories
    if (options.syncKnowledge !== undefined)
      this.config.syncKnowledge = options.syncKnowledge
    if (options.syncTasks !== undefined)
      this.config.syncTasks = options.syncTasks
    if (options.syncStudio !== undefined)
      this.config.syncStudio = options.syncStudio
    if (options.syncFullExport !== undefined)
      this.config.syncFullExport = options.syncFullExport
  }

  /**
   * Check if sync is active
   */
  isActive(): boolean {
    return this.config?.isActive ?? false
  }

  /**
   * Subscribe to sync events
   */
  onSyncEvent(callback: SyncEventCallback): () => void {
    this.eventListeners.add(callback)
    return () => this.eventListeners.delete(callback)
  }

  /**
   * Emit a sync event
   */
  private emitEvent(event: Omit<FolderSyncEvent, 'timestamp'>): void {
    const fullEvent: FolderSyncEvent = {
      ...event,
      timestamp: new Date(),
    }
    for (const callback of this.eventListeners) {
      try {
        callback(fullEvent)
      } catch (error) {
        console.error('Error in sync event callback:', error)
      }
    }
  }

  /**
   * Start the periodic sync interval
   */
  private startSyncInterval(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
    }

    this.syncInterval = setInterval(async () => {
      if (this.config?.isActive && !this.isSyncing) {
        await this.syncFromFiles()
      }
    }, SYNC_INTERVAL_MS)
  }

  /**
   * Process items in parallel batches
   */
  private async processInParallelBatches<T>(
    items: T[],
    processor: (item: T) => Promise<void>,
    batchSize: number = MAX_CONCURRENT_WRITES,
  ): Promise<void> {
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize)
      await Promise.all(batch.map(processor))
    }
  }

  /**
   * Sync database to files (export)
   */
  async syncToFiles(): Promise<void> {
    if (!this.config || this.isSyncing) return

    this.isSyncing = true
    this.emitEvent({ type: 'sync_start' })
    console.info('[LocalBackup] Sync to files started')

    // Load persisted hashes to avoid re-writing unchanged files
    this.loadHashCache()

    // Track sync stats
    const stats = {
      agents: 0,
      conversations: 0,
      memories: 0,
      knowledge: 0,
      tasks: 0,
      studio: 0,
      fullExport: false,
    }

    try {
      // Build context with agent slug lookups
      const context = await this.buildSerializeContext()

      // Sync agents in parallel batches
      if (this.config.syncAgents) {
        const agents = Array.from(agentsMap.values())
        const activeAgents = agents.filter((a) => !a.deletedAt)
        stats.agents = activeAgents.length
        await this.processInParallelBatches(activeAgents, async (agent) => {
          await this.writeEntityToFile(agent, agentSerializer)
          this.clearDirty('agent', agent.id)
        })
      }

      // Sync conversations in parallel batches
      if (this.config.syncConversations) {
        const conversations = Array.from(conversationsMap.values())
        stats.conversations = conversations.length
        await this.processInParallelBatches(
          conversations,
          async (conversation) => {
            await this.writeEntityToFile(
              conversation,
              conversationSerializer,
              context,
            )
            this.clearDirty('conversation', conversation.id)
          },
        )
      }

      // Sync memories in parallel batches
      if (this.config.syncMemories) {
        const memories = Array.from(memoriesMap.values())
        stats.memories = memories.length
        await this.processInParallelBatches(memories, async (memory) => {
          await this.writeEntityToFile(memory, memorySerializer, context)
          this.clearDirty('memory', memory.id)
        })
      }

      // Sync knowledge items in parallel batches
      if (this.config.syncKnowledge) {
        const knowledgeItems = Array.from(knowledgeMap.values())
        const fileItems = knowledgeItems.filter(
          (item) => item.type === 'file' && (item.content || item.transcript),
        )
        stats.knowledge = fileItems.length
        await this.processInParallelBatches(fileItems, async (item) => {
          await this.writeKnowledgeItemToFiles(item)
          this.clearDirty('knowledge', item.id)
        })
      }

      // Sync tasks in parallel batches
      if (this.config.syncTasks) {
        const tasks = Array.from(tasksMap.values())
        stats.tasks = tasks.length
        await this.processInParallelBatches(tasks, async (task) => {
          await this.writeEntityToFile(task, taskSerializer)
          this.clearDirty('task', task.id)
        })
      }

      // Sync studio entries in parallel batches
      if (this.config.syncStudio) {
        const studioEntries = Array.from(studioEntriesMap.values())
        stats.studio = studioEntries.length
        await this.processInParallelBatches(studioEntries, async (entry) => {
          await this.writeStudioEntryToFiles(entry)
          this.clearDirty('studio', entry.id)
        })
      }

      // Export full database to root
      if (this.config.syncFullExport) {
        await this.writeFullDatabaseExport()
        stats.fullExport = true
      }

      // Persist hash cache for future sessions
      this.persistHashCacheDebounced()

      this.config.lastSync = new Date()
      this.emitEvent({ type: 'sync_complete' })

      // Build stats string
      const statParts: string[] = []
      if (stats.agents > 0) statParts.push(`${stats.agents} agents`)
      if (stats.conversations > 0)
        statParts.push(`${stats.conversations} conversations`)
      if (stats.memories > 0) statParts.push(`${stats.memories} memories`)
      if (stats.knowledge > 0) statParts.push(`${stats.knowledge} knowledge`)
      if (stats.tasks > 0) statParts.push(`${stats.tasks} tasks`)
      if (stats.studio > 0) statParts.push(`${stats.studio} studio`)
      if (stats.fullExport) statParts.push('full export')
      const statsStr = statParts.length > 0 ? ` (${statParts.join(', ')})` : ''
      console.info(`[LocalBackup] Sync to files completed${statsStr}`)
    } catch (error) {
      console.error('[LocalBackup] Sync to files failed:', error)
      this.emitEvent({
        type: 'sync_error',
        error: error instanceof Error ? error.message : String(error),
      })
    } finally {
      this.isSyncing = false
    }
  }

  /**
   * Sync files to database (import)
   */
  async syncFromFiles(): Promise<void> {
    if (!this.config || this.isSyncing) return

    this.isSyncing = true
    this.emitEvent({ type: 'sync_start' })
    console.info('[LocalBackup] Sync from files started')

    try {
      // Read agents
      if (this.config.syncAgents) {
        await this.readEntitiesFromFiles<Agent>(
          'agents',
          agentSerializer,
          async (agent) => {
            const existing = agentsMap.get(agent.id)
            if (!existing) {
              agentsMap.set(agent.id, agent)
            } else if (
              new Date(agent.updatedAt || agent.createdAt) >
              new Date(existing.updatedAt || existing.createdAt)
            ) {
              agentsMap.set(agent.id, agent)
            }
          },
        )
      }

      // Read conversations
      if (this.config.syncConversations) {
        await this.readEntitiesFromFiles<Conversation>(
          'conversations',
          conversationSerializer,
          async (conversation) => {
            const existing = conversationsMap.get(conversation.id)
            if (!existing) {
              conversationsMap.set(conversation.id, conversation)
            } else if (
              new Date(conversation.updatedAt) > new Date(existing.updatedAt)
            ) {
              conversationsMap.set(conversation.id, conversation)
            }
          },
        )
      }

      // Read memories
      if (this.config.syncMemories) {
        await this.readMemoriesFromFiles()
      }

      // Read knowledge items
      if (this.config.syncKnowledge) {
        await this.readKnowledgeFromFiles()
      }

      // Read tasks
      if (this.config.syncTasks) {
        await this.readTasksFromFiles()
      }

      // Read studio entries
      if (this.config.syncStudio) {
        await this.readStudioEntriesFromFiles()
      }

      this.config.lastSync = new Date()
      this.emitEvent({ type: 'sync_complete' })
      console.info('[LocalBackup] Sync from files completed')
    } catch (error) {
      console.error('[LocalBackup] Sync from files failed:', error)
      this.emitEvent({
        type: 'sync_error',
        error: error instanceof Error ? error.message : String(error),
      })
    } finally {
      this.isSyncing = false
    }
  }

  /**
   * Write a single entity to file
   */
  private async writeEntityToFile<T extends { id: string }>(
    entity: T,
    serializer: Serializer<T>,
    context?: SerializeContext,
  ): Promise<void> {
    if (!this.config) return

    const serialized = serializer.serialize(entity, context)
    const filePath = `${serialized.directory}/${serialized.filename}`

    // Check if content has changed
    const contentHash = await this.hashContent(serialized.content)
    if (this.fileHashes.get(filePath) === contentHash) {
      return // No changes
    }

    try {
      // Get or create the directory
      const dirHandle = await this.getOrCreateDirectory(serialized.directory)

      // Write the file
      const fileHandle = await dirHandle.getFileHandle(serialized.filename, {
        create: true,
      })
      const writable = await fileHandle.createWritable()
      await writable.write(serialized.content)
      await writable.close()

      // Update hash cache and trigger debounced persistence
      this.fileHashes.set(filePath, contentHash)
      this.persistHashCacheDebounced()

      this.emitEvent({
        type: 'file_written',
        entityType: this.getEntityType(serializer),
        entityId: entity.id,
        filename: serialized.filename,
      })
    } catch (error) {
      console.error(`Failed to write file ${filePath}:`, error)
      throw error
    }
  }

  /**
   * Write a knowledge item to files (metadata + binary content)
   */
  private async writeKnowledgeItemToFiles(
    item: import('@/types').KnowledgeItem,
  ): Promise<void> {
    if (!this.config) return

    const fileSet = knowledgeSerializer.serializeKnowledgeFileSet(item)
    const metadataPath = `${fileSet.directory}/${fileSet.metadataFilename}`

    // Check if metadata content has changed
    const metadataHash = await this.hashContent(fileSet.metadataContent)
    const metadataChanged = this.fileHashes.get(metadataPath) !== metadataHash

    // Check if binary content has changed (if present)
    let binaryChanged = false
    let binaryPath: string | undefined
    if (fileSet.binaryFilename && fileSet.binaryContent) {
      binaryPath = `${fileSet.directory}/${fileSet.binaryFilename}`
      const binaryHash = await this.hashContent(fileSet.binaryContent)
      binaryChanged = this.fileHashes.get(binaryPath) !== binaryHash
    }

    if (!metadataChanged && !binaryChanged) {
      return // No changes
    }

    try {
      // Get or create the directory
      const dirHandle = await this.getOrCreateDirectory(fileSet.directory)

      // Write metadata file if changed
      if (metadataChanged) {
        const metadataHandle = await dirHandle.getFileHandle(
          fileSet.metadataFilename,
          { create: true },
        )
        const metadataWritable = await metadataHandle.createWritable()
        await metadataWritable.write(fileSet.metadataContent)
        await metadataWritable.close()
        this.fileHashes.set(metadataPath, metadataHash)
      }

      // Write binary file if present and changed
      if (
        binaryChanged &&
        fileSet.binaryFilename &&
        fileSet.binaryContent &&
        binaryPath
      ) {
        const binaryHandle = await dirHandle.getFileHandle(
          fileSet.binaryFilename,
          { create: true },
        )
        const binaryWritable = await binaryHandle.createWritable()

        if (fileSet.isBinaryBase64) {
          // Decode base64 and write as binary
          const binaryData = this.base64ToArrayBuffer(fileSet.binaryContent)
          await binaryWritable.write(binaryData)
        } else {
          // Write as text
          await binaryWritable.write(fileSet.binaryContent)
        }

        await binaryWritable.close()
        const binaryHash = await this.hashContent(fileSet.binaryContent)
        this.fileHashes.set(binaryPath, binaryHash)
      }

      this.emitEvent({
        type: 'file_written',
        entityType: 'knowledge',
        entityId: item.id,
        filename: fileSet.metadataFilename,
      })
    } catch (error) {
      console.error(`Failed to write knowledge files ${metadataPath}:`, error)
      throw error
    }
  }

  /**
   * Write a studio entry to files (metadata + image files)
   */
  private async writeStudioEntryToFiles(entry: StudioEntry): Promise<void> {
    if (!this.config) return

    const fileSet = studioSerializer.serializeStudioFileSet(entry)
    const metadataPath = `${fileSet.directory}/${fileSet.metadataFilename}`

    // Check if metadata content has changed
    const metadataHash = await this.hashContent(fileSet.metadataContent)
    const metadataChanged = this.fileHashes.get(metadataPath) !== metadataHash

    // Check which images have changed
    const changedImages: typeof fileSet.imageFiles = []
    for (const imageFile of fileSet.imageFiles) {
      const imagePath = `${fileSet.directory}/${imageFile.filename}`
      const imageHash = await this.hashContent(imageFile.content)
      if (this.fileHashes.get(imagePath) !== imageHash) {
        changedImages.push(imageFile)
      }
    }

    if (!metadataChanged && changedImages.length === 0) {
      return // No changes
    }

    try {
      // Get or create the directory
      const dirHandle = await this.getOrCreateDirectory(fileSet.directory)

      // Write metadata file if changed
      if (metadataChanged) {
        const metadataHandle = await dirHandle.getFileHandle(
          fileSet.metadataFilename,
          { create: true },
        )
        const metadataWritable = await metadataHandle.createWritable()
        await metadataWritable.write(fileSet.metadataContent)
        await metadataWritable.close()
        this.fileHashes.set(metadataPath, metadataHash)
      }

      // Write changed image files
      for (const imageFile of changedImages) {
        const imagePath = `${fileSet.directory}/${imageFile.filename}`
        const imageHandle = await dirHandle.getFileHandle(imageFile.filename, {
          create: true,
        })
        const imageWritable = await imageHandle.createWritable()

        if (imageFile.isBase64) {
          // Decode base64 and write as binary
          const binaryData = this.base64ToArrayBuffer(imageFile.content)
          await imageWritable.write(binaryData)
        } else {
          // Write as text (shouldn't happen for images)
          await imageWritable.write(imageFile.content)
        }

        await imageWritable.close()
        const imageHash = await this.hashContent(imageFile.content)
        this.fileHashes.set(imagePath, imageHash)
      }

      this.emitEvent({
        type: 'file_written',
        entityType: 'studio',
        entityId: entry.id,
        filename: fileSet.metadataFilename,
      })
    } catch (error) {
      console.error(`Failed to write studio files ${metadataPath}:`, error)
      throw error
    }
  }

  /**
   * Delete a studio entry and all its associated files (metadata + images/videos)
   */
  async deleteStudioEntryFiles(entryId: string): Promise<void> {
    if (!this.config?.isActive || !this.config.syncStudio) return

    try {
      // Get the studio directory
      const studioDir = await this.config.directoryHandle.getDirectoryHandle(
        'studio',
        { create: false },
      )

      // Studio entries are stored in their own folder: studio/{entryId}/
      // Try to delete the entire entry folder
      try {
        await studioDir.removeEntry(entryId, { recursive: true })

        // Clear all file hashes related to this entry
        const prefix = `studio/${entryId}/`
        for (const key of this.fileHashes.keys()) {
          if (key.startsWith(prefix)) {
            this.fileHashes.delete(key)
          }
        }

        this.emitEvent({
          type: 'file_deleted',
          entityType: 'studio',
          entityId: entryId,
          filename: entryId,
        })

        console.info(`[LocalBackup] Deleted studio entry folder: ${entryId}`)
      } catch (error) {
        // Folder might not exist, which is fine
        if ((error as DOMException).name !== 'NotFoundError') {
          console.error(
            `[LocalBackup] Failed to delete studio entry folder:`,
            error,
          )
        }
      }
    } catch (error) {
      // Studio directory might not exist, which is fine
      if ((error as DOMException).name !== 'NotFoundError') {
        console.error(`[LocalBackup] Failed to access studio directory:`, error)
      }
    }
  }

  /**
   * Delete a specific image file from a studio entry
   */
  async deleteStudioImageFile(entryId: string, imageId: string): Promise<void> {
    if (!this.config?.isActive || !this.config.syncStudio) return

    try {
      // Get the studio directory
      const studioDir = await this.config.directoryHandle.getDirectoryHandle(
        'studio',
        { create: false },
      )

      // Get the entry folder
      const entryDir = await studioDir.getDirectoryHandle(entryId, {
        create: false,
      })

      // List files and find matching image file(s)
      // Image files are named: {entryId}-{imageIndex}.{format}
      // Since we don't know the exact format or index, we'll search for files containing the imageId
      for await (const handle of entryDir.values()) {
        if (handle.kind === 'file' && handle.name.includes(imageId)) {
          try {
            await entryDir.removeEntry(handle.name)
            const filePath = `studio/${entryId}/${handle.name}`
            this.fileHashes.delete(filePath)
            console.info(
              `[LocalBackup] Deleted studio image file: ${handle.name}`,
            )
          } catch (error) {
            console.error(
              `[LocalBackup] Failed to delete studio image file:`,
              error,
            )
          }
        }
      }

      this.emitEvent({
        type: 'file_deleted',
        entityType: 'studio',
        entityId: entryId,
        filename: imageId,
      })
    } catch (error) {
      // Directory might not exist, which is fine
      if ((error as DOMException).name !== 'NotFoundError') {
        console.error(
          `[LocalBackup] Failed to delete studio image file:`,
          error,
        )
      }
    }
  }

  /**
   * Convert base64 string to ArrayBuffer
   */
  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    // Handle data URLs (e.g., "data:image/png;base64,...")
    const base64Data = base64.includes(',') ? base64.split(',')[1] : base64

    try {
      const binaryString = atob(base64Data)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }
      return bytes.buffer
    } catch (error) {
      // If atob fails, the content isn't valid base64 - encode as UTF-8 text
      console.warn('Content is not valid base64, encoding as UTF-8 text')
      const encoder = new TextEncoder()
      return encoder.encode(base64).buffer as ArrayBuffer
    }
  }

  /**
   * Convert ArrayBuffer to base64 string
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer)
    let binary = ''
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return btoa(binary)
  }

  /**
   * Compress data using native CompressionStream API (gzip)
   */
  private async compressGzip(data: string): Promise<ArrayBuffer> {
    const encoder = new TextEncoder()
    const inputBytes = encoder.encode(data)

    const stream = new Blob([inputBytes]).stream()
    const compressedStream = stream.pipeThrough(new CompressionStream('gzip'))
    return await new Response(compressedStream).arrayBuffer()
  }

  /**
   * Write full database export to root level as compressed gzip JSON
   */
  private async writeFullDatabaseExport(): Promise<void> {
    if (!this.config) return

    const filename = 'devs-database-export.json.gz'
    const filePath = filename

    try {
      // Collect all data from Yjs maps
      // Each map entry: [storeName, map reference]
      const yjsMapEntries: [
        string,
        { values: () => IterableIterator<unknown> },
      ][] = [
        ['agents', agentsMap],
        ['conversations', conversationsMap],
        ['knowledge', knowledgeMap],
        ['tasks', tasksMap],
        ['artifacts', artifactsMap],
        ['memories', memoriesMap],
        ['studioEntries', studioEntriesMap],
        ['credentials', credentialsMap],
        ['connectors', connectorsMap],
        ['connectorSyncStates', connectorSyncStatesMap],
        ['traces', tracesMap],
        ['spans', spansMap],
        ['battles', battlesMap],
        ['workflows', workflowsMap],
        ['pinnedMessages', pinnedMessagesMap],
        // notifications are local-only, not included in backup
        ['memoryLearningEvents', memoryLearningEventsMap],
        ['agentMemoryDocuments', agentMemoryDocumentsMap],
        ['sharedContexts', sharedContextsMap],
        ['installedExtensions', installedExtensionsMap],
        ['customExtensions', customExtensionsMap],
        ['preferences', preferencesMap],
      ]

      const dbData: Record<string, unknown[]> = {}

      for (const [storeName, map] of yjsMapEntries) {
        try {
          dbData[storeName] = Array.from(map.values())
        } catch (error) {
          console.warn(`Failed to export store ${storeName}:`, error)
          dbData[storeName] = []
        }
      }

      // Add metadata
      const exportData = {
        _meta: {
          exportedAt: new Date().toISOString(),
          source: 'yjs',
          stores: yjsMapEntries.length,
          compressed: true,
        },
        ...dbData,
      }

      const content = JSON.stringify(exportData)

      // Check if content has changed
      const contentHash = await this.hashContent(content)
      if (this.fileHashes.get(filePath) === contentHash) {
        return // No changes
      }

      // Compress using native CompressionStream
      const compressedData = await this.compressGzip(content)

      // Write the compressed file at root level
      const fileHandle = await this.config.directoryHandle.getFileHandle(
        filename,
        { create: true },
      )
      const writable = await fileHandle.createWritable()
      await writable.write(compressedData)
      await writable.close()

      // Update hash cache
      this.fileHashes.set(filePath, contentHash)

      this.emitEvent({
        type: 'file_written',
        filename,
      })
    } catch (error) {
      console.error(`Failed to write full database export:`, error)
      throw error
    }
  }

  /**
   * Read entities from files in a directory (batched processing)
   */
  private async readEntitiesFromFiles<T extends { id: string }>(
    directory: string,
    serializer: Serializer<T>,
    onEntity: (entity: T) => Promise<void>,
  ): Promise<void> {
    if (!this.config) return

    try {
      const dirHandle = await this.config.directoryHandle.getDirectoryHandle(
        directory,
        { create: false },
      )

      // Collect all file entries first
      const fileEntries: { entry: FileSystemFileHandle; name: string }[] = []
      for await (const entry of dirHandle.values()) {
        if (
          entry.kind === 'file' &&
          entry.name.endsWith(serializer.getExtension())
        ) {
          const fileHandle = await dirHandle.getFileHandle(entry.name)
          fileEntries.push({ entry: fileHandle, name: entry.name })
        }
      }

      // Process in batches
      await this.processInParallelBatches(
        fileEntries,
        async ({ entry, name }) => {
          try {
            const file = await entry.getFile()
            const content = await file.text()

            // Pass file metadata to deserializer
            const fileMetadata = {
              lastModified: new Date(file.lastModified),
              size: file.size,
            }

            const entity = serializer.deserialize(content, name, fileMetadata)
            if (entity) {
              await onEntity(entity)
              this.emitEvent({
                type: 'file_read',
                entityType: this.getEntityType(serializer),
                entityId: entity.id,
                filename: name,
              })
            }
          } catch (error) {
            console.error(`Failed to read file ${name}:`, error)
          }
        },
      )
    } catch (error) {
      // Directory might not exist yet
      if ((error as DOMException).name !== 'NotFoundError') {
        console.error(`Failed to read directory ${directory}:`, error)
      }
    }
  }

  /**
   * Read memories from nested agent directories (batched processing)
   */
  private async readMemoriesFromFiles(): Promise<void> {
    if (!this.config) return

    try {
      const memoriesDir = await this.config.directoryHandle.getDirectoryHandle(
        'memories',
        { create: false },
      )

      // Collect all memory files from all agent directories
      const memoryFiles: {
        handle: FileSystemFileHandle
        name: string
        agentDirHandle: FileSystemDirectoryHandle
      }[] = []

      for await (const agentEntry of memoriesDir.values()) {
        if (agentEntry.kind === 'directory') {
          const agentDirHandle = await memoriesDir.getDirectoryHandle(
            agentEntry.name,
          )

          for await (const fileEntry of agentDirHandle.values()) {
            if (
              fileEntry.kind === 'file' &&
              fileEntry.name.endsWith(memorySerializer.getExtension())
            ) {
              const fileHandle = await agentDirHandle.getFileHandle(
                fileEntry.name,
              )
              memoryFiles.push({
                handle: fileHandle,
                name: fileEntry.name,
                agentDirHandle,
              })
            }
          }
        }
      }

      // Process in batches
      await this.processInParallelBatches(
        memoryFiles,
        async ({ handle, name }) => {
          try {
            const file = await handle.getFile()
            const content = await file.text()

            // Pass file metadata to deserializer
            const fileMetadata = {
              lastModified: new Date(file.lastModified),
              size: file.size,
            }

            const memory = memorySerializer.deserialize(
              content,
              name,
              fileMetadata,
            )
            if (memory) {
              const existing = memoriesMap.get(memory.id)
              if (!existing) {
                memoriesMap.set(memory.id, memory)
              } else if (
                new Date(memory.updatedAt) > new Date(existing.updatedAt)
              ) {
                memoriesMap.set(memory.id, memory)
              }

              this.emitEvent({
                type: 'file_read',
                entityType: 'memory',
                entityId: memory.id,
                filename: name,
              })
            }
          } catch (error) {
            console.error(`Failed to read memory file ${name}:`, error)
          }
        },
      )
    } catch (error) {
      if ((error as DOMException).name !== 'NotFoundError') {
        console.error('Failed to read memories directory:', error)
      }
    }
  }

  /**
   * Read knowledge items from nested path directories
   */
  private async readKnowledgeFromFiles(): Promise<void> {
    if (!this.config) return

    try {
      const knowledgeDir = await this.config.directoryHandle.getDirectoryHandle(
        'knowledge',
        { create: false },
      )

      // Recursively read knowledge items
      await this.readKnowledgeDirectory(knowledgeDir)
    } catch (error) {
      if ((error as DOMException).name !== 'NotFoundError') {
        console.error('Failed to read knowledge directory:', error)
      }
    }
  }

  /**
   * Recursively read knowledge items from a directory
   */
  private async readKnowledgeDirectory(
    dirHandle: FileSystemDirectoryHandle,
  ): Promise<void> {
    // First, collect all files in this directory for binary file lookup
    const filesInDir = new Map<string, FileSystemFileHandle>()
    const metadataFiles: FileSystemFileHandle[] = []

    for await (const entry of dirHandle.values()) {
      if (entry.kind === 'directory') {
        const subDirHandle = await dirHandle.getDirectoryHandle(entry.name)
        await this.readKnowledgeDirectory(subDirHandle)
      } else if (entry.kind === 'file') {
        const fileHandle = await dirHandle.getFileHandle(entry.name)
        filesInDir.set(entry.name, fileHandle)
        if (entry.name.endsWith(knowledgeSerializer.getExtension())) {
          metadataFiles.push(fileHandle)
        }
      }
    }

    // Process metadata files in batches
    await this.processInParallelBatches(
      metadataFiles,
      async (metadataHandle) => {
        try {
          const metadataFile = await metadataHandle.getFile()
          const content = await metadataFile.text()

          const fileMetadata = {
            lastModified: new Date(metadataFile.lastModified),
            size: metadataFile.size,
          }

          // Parse the frontmatter to get the binaryFile reference
          const parsed =
            await this.parseKnowledgeFrontmatter<
              import('./serializers/types').KnowledgeItemFrontmatter
            >(content)
          let binaryContent: string | undefined

          if (parsed?.frontmatter.binaryFile) {
            // Try to read the binary file
            const binaryHandle = filesInDir.get(parsed.frontmatter.binaryFile)
            if (binaryHandle) {
              const binaryFile = await binaryHandle.getFile()
              const isBinary = knowledgeSerializer.isBinaryContent(
                parsed.frontmatter.fileType,
                parsed.frontmatter.mimeType,
              )

              if (isBinary) {
                // Read as binary and convert to base64
                const buffer = await binaryFile.arrayBuffer()
                binaryContent = this.arrayBufferToBase64(buffer)
              } else {
                // Read as text
                binaryContent = await binaryFile.text()
              }
            }
          }

          const item = knowledgeSerializer.deserialize(
            content,
            metadataFile.name,
            fileMetadata,
            binaryContent,
          )
          if (item) {
            const existing = knowledgeMap.get(item.id)
            if (!existing) {
              knowledgeMap.set(item.id, item)
            } else if (
              new Date(item.lastModified) > new Date(existing.lastModified)
            ) {
              knowledgeMap.set(item.id, item)
            }

            this.emitEvent({
              type: 'file_read',
              entityType: 'knowledge',
              entityId: item.id,
              filename: metadataFile.name,
            })
          }
        } catch (error) {
          console.error(
            `Failed to read knowledge file ${metadataHandle.name}:`,
            error,
          )
        }
      },
    )
  }

  /**
   * Parse YAML frontmatter from content
   */
  private parseKnowledgeFrontmatter<T>(
    content: string,
  ): { frontmatter: T; body: string } | null {
    const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/
    const match = content.match(frontmatterRegex)
    if (!match) return null

    try {
      // Use dynamic import to parse YAML
      const yaml = (window as unknown as { yaml?: { parse: (s: string) => T } })
        .yaml
      if (yaml) {
        return { frontmatter: yaml.parse(match[1]), body: match[2].trim() }
      }
      // Fallback: simple YAML parsing for the binaryFile field
      const frontmatter: Record<string, unknown> = {}
      const lines = match[1].split('\n')
      for (const line of lines) {
        const colonIndex = line.indexOf(':')
        if (colonIndex > 0) {
          const key = line.slice(0, colonIndex).trim()
          const value = line.slice(colonIndex + 1).trim()
          // Remove quotes if present
          frontmatter[key] = value.replace(/^["']|["']$/g, '')
        }
      }
      return { frontmatter: frontmatter as T, body: match[2].trim() }
    } catch {
      return null
    }
  }

  /**
   * Read tasks from nested workflow directories (batched processing)
   */
  private async readTasksFromFiles(): Promise<void> {
    if (!this.config) return

    try {
      const tasksDir = await this.config.directoryHandle.getDirectoryHandle(
        'tasks',
        { create: false },
      )

      // Collect all task files from all workflow directories
      const taskFiles: { handle: FileSystemFileHandle; name: string }[] = []

      for await (const workflowEntry of tasksDir.values()) {
        if (workflowEntry.kind === 'directory') {
          const workflowDirHandle = await tasksDir.getDirectoryHandle(
            workflowEntry.name,
          )

          for await (const fileEntry of workflowDirHandle.values()) {
            if (
              fileEntry.kind === 'file' &&
              fileEntry.name.endsWith(taskSerializer.getExtension())
            ) {
              const fileHandle = await workflowDirHandle.getFileHandle(
                fileEntry.name,
              )
              taskFiles.push({ handle: fileHandle, name: fileEntry.name })
            }
          }
        }
      }

      // Process in batches
      await this.processInParallelBatches(
        taskFiles,
        async ({ handle, name }) => {
          try {
            const file = await handle.getFile()
            const content = await file.text()

            const fileMetadata = {
              lastModified: new Date(file.lastModified),
              size: file.size,
            }

            const task = taskSerializer.deserialize(content, name, fileMetadata)
            if (task) {
              const existing = tasksMap.get(task.id)
              if (!existing) {
                tasksMap.set(task.id, task)
              } else if (
                new Date(task.updatedAt) > new Date(existing.updatedAt)
              ) {
                tasksMap.set(task.id, task)
              }

              this.emitEvent({
                type: 'file_read',
                entityType: 'task',
                entityId: task.id,
                filename: name,
              })
            }
          } catch (error) {
            console.error(`Failed to read task file ${name}:`, error)
          }
        },
      )
    } catch (error) {
      if ((error as DOMException).name !== 'NotFoundError') {
        console.error('Failed to read tasks directory:', error)
      }
    }
  }

  /**
   * Read studio entries from directory with image files
   */
  private async readStudioEntriesFromFiles(): Promise<void> {
    if (!this.config) return

    try {
      const studioDir = await this.config.directoryHandle.getDirectoryHandle(
        'studio',
        { create: false },
      )

      // Collect all files in the studio directory
      const filesInDir = new Map<string, FileSystemFileHandle>()
      const metadataFiles: FileSystemFileHandle[] = []

      for await (const entry of studioDir.values()) {
        if (entry.kind === 'file') {
          const fileHandle = await studioDir.getFileHandle(entry.name)
          filesInDir.set(entry.name, fileHandle)
          if (entry.name.endsWith(studioSerializer.getExtension())) {
            metadataFiles.push(fileHandle)
          }
        }
      }

      // Process metadata files in batches
      await this.processInParallelBatches(
        metadataFiles,
        async (metadataHandle) => {
          try {
            const metadataFile = await metadataHandle.getFile()
            const content = await metadataFile.text()

            const fileMetadata = {
              lastModified: new Date(metadataFile.lastModified),
              size: metadataFile.size,
            }

            // First pass: get entry ID and image format info
            const basicEntry = studioSerializer.deserialize(
              content,
              metadataFile.name,
              fileMetadata,
            )

            if (basicEntry) {
              // Collect image contents
              const imageContents = new Map<string, string>()

              const images = basicEntry.images || []
              for (let i = 0; i < images.length; i++) {
                const image = images[i]
                // Construct the expected image filename
                const imageFilename = `${this.sanitizeFilename(basicEntry.id)}-${i + 1}.${image.format}`
                const imageHandle = filesInDir.get(imageFilename)

                if (imageHandle) {
                  const imageFile = await imageHandle.getFile()
                  const buffer = await imageFile.arrayBuffer()
                  const base64 = this.arrayBufferToBase64(buffer)
                  imageContents.set(imageFilename, base64)
                }
              }

              // Deserialize with images
              const entry = studioSerializer.deserializeWithImages(
                content,
                metadataFile.name,
                fileMetadata,
                imageContents,
              )

              if (entry) {
                const existing = studioEntriesMap.get(entry.id)
                if (!existing) {
                  studioEntriesMap.set(entry.id, entry)
                } else if (
                  new Date(entry.createdAt) > new Date(existing.createdAt)
                ) {
                  studioEntriesMap.set(entry.id, entry)
                }

                this.emitEvent({
                  type: 'file_read',
                  entityType: 'studio',
                  entityId: entry.id,
                  filename: metadataFile.name,
                })
              }
            }
          } catch (error) {
            console.error(
              `Failed to read studio file ${metadataHandle.name}:`,
              error,
            )
          }
        },
      )
    } catch (error) {
      if ((error as DOMException).name !== 'NotFoundError') {
        console.error('Failed to read studio directory:', error)
      }
    }
  }

  /**
   * Sanitize filename for studio entry images
   */
  private sanitizeFilename(str: string, maxLength = 50): string {
    const sanitized = str
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, maxLength)

    if (!sanitized || sanitized === '.' || sanitized === '..') {
      return 'unnamed'
    }

    return sanitized
  }

  /**
   * Get or create a nested directory
   */
  private async getOrCreateDirectory(
    path: string,
  ): Promise<FileSystemDirectoryHandle> {
    if (!this.config) throw new Error('Not initialized')

    const parts = path.split('/')
    let currentDir = this.config.directoryHandle

    for (const part of parts) {
      currentDir = await currentDir.getDirectoryHandle(part, { create: true })
    }

    return currentDir
  }

  /**
   * Hash content for change detection
   */
  private async hashContent(content: string): Promise<string> {
    const encoder = new TextEncoder()
    const data = encoder.encode(content)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
  }

  /**
   * Get entity type from serializer
   */
  private getEntityType(
    serializer: Serializer<unknown>,
  ): 'agent' | 'conversation' | 'memory' | 'knowledge' | 'task' | 'studio' {
    const dir = serializer.getDirectory()
    if (dir === 'agents') return 'agent'
    if (dir === 'conversations') return 'conversation'
    if (dir === 'knowledge') return 'knowledge'
    if (dir === 'tasks') return 'task'
    if (dir === 'studio') return 'studio'
    return 'memory'
  }

  /**
   * Debounced write for real-time sync
   * Call this when an entity changes in the database
   */
  writeEntityDebounced<T extends { id: string }>(
    entity: T,
    serializer: Serializer<T>,
  ): void {
    if (!this.config?.isActive) return

    const key = `${serializer.getDirectory()}/${entity.id}`

    // Clear existing timer
    const existingTimer = this.writeDebounceTimers.get(key)
    if (existingTimer) {
      clearTimeout(existingTimer)
    }

    // Set new debounced write
    const timer = setTimeout(async () => {
      this.writeDebounceTimers.delete(key)
      try {
        const context = await this.buildSerializeContext()
        await this.writeEntityToFile(entity, serializer, context)
      } catch (error) {
        console.error(`Failed to write ${key}:`, error)
      }
    }, WRITE_DEBOUNCE_MS)

    this.writeDebounceTimers.set(key, timer)
  }

  /**
   * Delete a file when an entity is deleted
   */
  async deleteEntityFile<T extends { id: string }>(
    entity: T,
    serializer: Serializer<T>,
  ): Promise<void> {
    if (!this.config?.isActive) return

    const serialized = serializer.serialize(entity)

    try {
      const dirHandle = await this.config.directoryHandle.getDirectoryHandle(
        serialized.directory.split('/')[0],
        { create: false },
      )

      // Handle nested directories for memories
      let targetDir = dirHandle
      const pathParts = serialized.directory.split('/')
      for (let i = 1; i < pathParts.length; i++) {
        targetDir = await targetDir.getDirectoryHandle(pathParts[i], {
          create: false,
        })
      }

      await targetDir.removeEntry(serialized.filename)

      // Remove from hash cache
      const filePath = `${serialized.directory}/${serialized.filename}`
      this.fileHashes.delete(filePath)

      this.emitEvent({
        type: 'file_deleted',
        entityType: this.getEntityType(serializer),
        entityId: entity.id,
        filename: serialized.filename,
      })
    } catch (error) {
      // File might not exist, which is fine
      if ((error as DOMException).name !== 'NotFoundError') {
        console.error(`Failed to delete file:`, error)
      }
    }
  }
}

// Export singleton instance
export const folderSyncService = new FolderSyncService()

// Export serializers for external use
export {
  agentSerializer,
  conversationSerializer,
  memorySerializer,
  knowledgeSerializer,
  taskSerializer,
  studioSerializer,
}
