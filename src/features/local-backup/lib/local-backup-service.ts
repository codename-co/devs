/**
 * Folder Sync Service
 *
 * Bidirectional synchronization between IndexedDB and local file system.
 * Uses File System Access API for folder access.
 *
 * Features:
 * - Live sync on data changes
 * - File change detection
 * - Conflict resolution (last-write-wins)
 * - Debounced writes to prevent thrashing
 */
import { db } from '@/lib/db'
import type { Agent, Conversation } from '@/types'
import {
  agentSerializer,
  conversationSerializer,
  memorySerializer,
  knowledgeSerializer,
  taskSerializer,
} from './serializers'
import type { Serializer } from './serializers/types'

// Debounce delay for writes (ms)
const WRITE_DEBOUNCE_MS = 1000

// Sync interval for checking file changes (ms)
const SYNC_INTERVAL_MS = 30000

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
}

export interface FolderSyncEvent {
  type:
    | 'sync_start'
    | 'sync_complete'
    | 'file_written'
    | 'file_read'
    | 'file_deleted'
    | 'sync_error'
  entityType?: 'agent' | 'conversation' | 'memory' | 'knowledge' | 'task'
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
    }

    // Create directory structure
    await this.ensureDirectoryStructure()

    // Perform initial sync (DB -> Files)
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
    }
  }

  /**
   * Get current config
   */
  getConfig(): FolderSyncConfig | null {
    return this.config
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
   * Ensure the directory structure exists
   */
  private async ensureDirectoryStructure(): Promise<void> {
    if (!this.config) return

    const dirs = ['agents', 'conversations', 'memories', 'knowledge', 'tasks']

    for (const dir of dirs) {
      try {
        await this.config.directoryHandle.getDirectoryHandle(dir, {
          create: true,
        })
      } catch (error) {
        console.error(`Failed to create directory ${dir}:`, error)
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
   * Sync database to files (export)
   */
  async syncToFiles(): Promise<void> {
    if (!this.config || this.isSyncing) return

    this.isSyncing = true
    this.emitEvent({ type: 'sync_start' })

    try {
      // Sync agents
      if (this.config.syncAgents) {
        const agents = await db.getAll('agents')
        for (const agent of agents) {
          if (!agent.deletedAt) {
            await this.writeEntityToFile(agent, agentSerializer)
          }
        }
      }

      // Sync conversations
      if (this.config.syncConversations) {
        const conversations = await db.getAll('conversations')
        for (const conversation of conversations) {
          await this.writeEntityToFile(conversation, conversationSerializer)
        }
      }

      // Sync memories
      if (this.config.syncMemories) {
        const memories = await db.getAll('agentMemories')
        for (const memory of memories) {
          await this.writeEntityToFile(memory, memorySerializer)
        }
      }

      // Sync knowledge items
      if (this.config.syncKnowledge) {
        const knowledgeItems = await db.getAll('knowledgeItems')
        for (const item of knowledgeItems) {
          // Only sync file-type items with text content
          if (item.type === 'file' && (item.content || item.transcript)) {
            await this.writeEntityToFile(item, knowledgeSerializer)
          }
        }
      }

      // Sync tasks
      if (this.config.syncTasks) {
        const tasks = await db.getAll('tasks')
        for (const task of tasks) {
          await this.writeEntityToFile(task, taskSerializer)
        }
      }

      this.config.lastSync = new Date()
      this.emitEvent({ type: 'sync_complete' })
    } catch (error) {
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

    try {
      // Read agents
      if (this.config.syncAgents) {
        await this.readEntitiesFromFiles<Agent>(
          'agents',
          agentSerializer,
          async (agent) => {
            const existing = await db.get('agents', agent.id)
            if (!existing) {
              await db.add('agents', agent)
            } else if (
              new Date(agent.updatedAt || agent.createdAt) >
              new Date(existing.updatedAt || existing.createdAt)
            ) {
              await db.update('agents', agent)
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
            const existing = await db.get('conversations', conversation.id)
            if (!existing) {
              await db.add('conversations', conversation)
            } else if (
              new Date(conversation.updatedAt) > new Date(existing.updatedAt)
            ) {
              await db.update('conversations', conversation)
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

      this.config.lastSync = new Date()
      this.emitEvent({ type: 'sync_complete' })
    } catch (error) {
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
  ): Promise<void> {
    if (!this.config) return

    const serialized = serializer.serialize(entity)
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

      // Update hash cache
      this.fileHashes.set(filePath, contentHash)

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
   * Read entities from files in a directory
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

      for await (const entry of dirHandle.values()) {
        if (
          entry.kind === 'file' &&
          entry.name.endsWith(serializer.getExtension())
        ) {
          try {
            const fileHandle = await dirHandle.getFileHandle(entry.name)
            const file = await fileHandle.getFile()
            const content = await file.text()

            // Pass file metadata to deserializer
            const fileMetadata = {
              lastModified: new Date(file.lastModified),
              size: file.size,
            }

            const entity = serializer.deserialize(content, entry.name, fileMetadata)
            if (entity) {
              await onEntity(entity)
              this.emitEvent({
                type: 'file_read',
                entityType: this.getEntityType(serializer),
                entityId: entity.id,
                filename: entry.name,
              })
            }
          } catch (error) {
            console.error(`Failed to read file ${entry.name}:`, error)
          }
        }
      }
    } catch (error) {
      // Directory might not exist yet
      if ((error as DOMException).name !== 'NotFoundError') {
        console.error(`Failed to read directory ${directory}:`, error)
      }
    }
  }

  /**
   * Read memories from nested agent directories
   */
  private async readMemoriesFromFiles(): Promise<void> {
    if (!this.config) return

    try {
      const memoriesDir = await this.config.directoryHandle.getDirectoryHandle(
        'memories',
        { create: false },
      )

      // Iterate through agent subdirectories
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
              try {
                const fileHandle = await agentDirHandle.getFileHandle(
                  fileEntry.name,
                )
                const file = await fileHandle.getFile()
                const content = await file.text()

                // Pass file metadata to deserializer
                const fileMetadata = {
                  lastModified: new Date(file.lastModified),
                  size: file.size,
                }

                const memory = memorySerializer.deserialize(
                  content,
                  fileEntry.name,
                  fileMetadata,
                )
                if (memory) {
                  const existing = await db.get('agentMemories', memory.id)
                  if (!existing) {
                    await db.add('agentMemories', memory)
                  } else if (
                    new Date(memory.updatedAt) > new Date(existing.updatedAt)
                  ) {
                    await db.update('agentMemories', memory)
                  }

                  this.emitEvent({
                    type: 'file_read',
                    entityType: 'memory',
                    entityId: memory.id,
                    filename: fileEntry.name,
                  })
                }
              } catch (error) {
                console.error(`Failed to read memory file ${fileEntry.name}:`, error)
              }
            }
          }
        }
      }
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
    for await (const entry of dirHandle.values()) {
      if (entry.kind === 'directory') {
        const subDirHandle = await dirHandle.getDirectoryHandle(entry.name)
        await this.readKnowledgeDirectory(subDirHandle)
      } else if (
        entry.kind === 'file' &&
        entry.name.endsWith(knowledgeSerializer.getExtension())
      ) {
        try {
          const fileHandle = await dirHandle.getFileHandle(entry.name)
          const file = await fileHandle.getFile()
          const content = await file.text()

          const fileMetadata = {
            lastModified: new Date(file.lastModified),
            size: file.size,
          }

          const item = knowledgeSerializer.deserialize(
            content,
            entry.name,
            fileMetadata,
          )
          if (item) {
            const existing = await db.get('knowledgeItems', item.id)
            if (!existing) {
              await db.add('knowledgeItems', item)
            } else if (
              new Date(item.lastModified) > new Date(existing.lastModified)
            ) {
              await db.update('knowledgeItems', item)
            }

            this.emitEvent({
              type: 'file_read',
              entityType: 'knowledge',
              entityId: item.id,
              filename: entry.name,
            })
          }
        } catch (error) {
          console.error(`Failed to read knowledge file ${entry.name}:`, error)
        }
      }
    }
  }

  /**
   * Read tasks from nested workflow directories
   */
  private async readTasksFromFiles(): Promise<void> {
    if (!this.config) return

    try {
      const tasksDir = await this.config.directoryHandle.getDirectoryHandle(
        'tasks',
        { create: false },
      )

      // Iterate through workflow subdirectories
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
              try {
                const fileHandle = await workflowDirHandle.getFileHandle(
                  fileEntry.name,
                )
                const file = await fileHandle.getFile()
                const content = await file.text()

                const fileMetadata = {
                  lastModified: new Date(file.lastModified),
                  size: file.size,
                }

                const task = taskSerializer.deserialize(
                  content,
                  fileEntry.name,
                  fileMetadata,
                )
                if (task) {
                  const existing = await db.get('tasks', task.id)
                  if (!existing) {
                    await db.add('tasks', task)
                  } else if (
                    new Date(task.updatedAt) > new Date(existing.updatedAt)
                  ) {
                    await db.update('tasks', task)
                  }

                  this.emitEvent({
                    type: 'file_read',
                    entityType: 'task',
                    entityId: task.id,
                    filename: fileEntry.name,
                  })
                }
              } catch (error) {
                console.error(`Failed to read task file ${fileEntry.name}:`, error)
              }
            }
          }
        }
      }
    } catch (error) {
      if ((error as DOMException).name !== 'NotFoundError') {
        console.error('Failed to read tasks directory:', error)
      }
    }
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
  ): 'agent' | 'conversation' | 'memory' | 'knowledge' | 'task' {
    const dir = serializer.getDirectory()
    if (dir === 'agents') return 'agent'
    if (dir === 'conversations') return 'conversation'
    if (dir === 'knowledge') return 'knowledge'
    if (dir === 'tasks') return 'task'
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
        await this.writeEntityToFile(entity, serializer)
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
}
