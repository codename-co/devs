import {
  Agent,
  Conversation,
  Knowledge,
  KnowledgeItem,
  PersistedFolderWatcher,
  FileHandleEntry,
  Credential,
  Artifact,
  Task,
  SharedContext,
  LangfuseConfig,
  AgentMemoryEntry,
  MemoryLearningEvent,
  AgentMemoryDocument,
  PinnedMessage,
  CryptoKeyEntry,
} from '@/types'
import { Connector, ConnectorSyncState } from '@/features/connectors/types'
import { Battle } from '@/features/battle/types'
import { StudioEntry } from '@/features/studio/types'
import { Trace, Span, TracingConfig } from '@/features/traces/types'
import {
  InstalledExtension,
  CustomExtension,
} from '@/features/marketplace/types'
import { Notification } from '@/features/notifications/types'

export interface DBStores {
  agents: Agent
  conversations: Conversation
  knowledge: Knowledge
  knowledgeItems: KnowledgeItem
  folderWatchers: PersistedFolderWatcher
  fileHandles: FileHandleEntry
  credentials: Credential
  artifacts: Artifact
  tasks: Task
  contexts: SharedContext
  langfuse_config: LangfuseConfig
  // Agent Memory System
  agentMemories: AgentMemoryEntry
  memoryLearningEvents: MemoryLearningEvent
  agentMemoryDocuments: AgentMemoryDocument
  // Pinned Messages System
  pinnedMessages: PinnedMessage
  // Connectors System
  connectors: Connector
  connectorSyncStates: ConnectorSyncState
  // Battle System
  battles: Battle
  // Studio Entries
  studioEntries: StudioEntry
  // Traces/Observability System
  traces: Trace
  spans: Span
  tracingConfig: TracingConfig
  // Marketplace System
  extensions: InstalledExtension
  customExtensions: CustomExtension
  // Notification System
  notifications: Notification
  // Crypto Keys System (non-extractable CryptoKey storage)
  cryptoKeys: CryptoKeyEntry
}

export class Database {
  private db: IDBDatabase | null = null
  private initialized = false

  static DB_NAME = 'devs-ai-platform'
  static DB_VERSION = 20
  static STORES: (keyof DBStores)[] = [
    'agents',
    'conversations',
    'knowledgeItems',
    'folderWatchers',
    'fileHandles',
    'credentials',
    'artifacts',
    'tasks',
    'contexts',
    'langfuse_config',
    // Agent Memory System
    'agentMemories',
    'memoryLearningEvents',
    'agentMemoryDocuments',
    // Pinned Messages System
    'pinnedMessages',
    // Connectors System
    'connectors',
    'connectorSyncStates',
    // Battle System
    'battles',
    // Studio Entries
    'studioEntries',
    // Traces/Observability System
    'traces',
    'spans',
    'tracingConfig',
    // Marketplace System
    'extensions',
    'customExtensions',
    // Notification System
    'notifications',
    // Crypto Keys System
    'cryptoKeys',
  ]

  isInitialized(): boolean {
    return this.initialized
  }

  // Check if a specific store exists
  hasStore(storeName: string): boolean {
    return this.db?.objectStoreNames.contains(storeName) ?? false
  }

  // Force reinitialization - useful when stores are missing
  async forceInit(): Promise<void> {
    if (this.db) {
      this.db.close()
    }
    this.initialized = false
    await this.init()
  }

  async init(): Promise<void> {
    if (this.initialized) return
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(Database.DB_NAME, Database.DB_VERSION)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result

        // Validate that all required stores exist
        const requiredStores = Database.STORES
        const missingStores = requiredStores.filter(
          (store) => !this.db!.objectStoreNames.contains(store),
        )

        if (missingStores.length > 0) {
          console.warn(
            `Missing database stores: ${missingStores.join(', ')}. Triggering database reset...`,
          )
          this.db.close()
          // Reset database by deleting and recreating
          const deleteRequest = indexedDB.deleteDatabase(Database.DB_NAME)
          deleteRequest.onsuccess = () => {
            console.log('Database deleted, reinitializing...')
            // Reinitialize after deletion
            setTimeout(() => this.init().then(resolve).catch(reject), 100)
          }
          deleteRequest.onerror = () => reject(deleteRequest.error)
          return
        }

        this.initialized = true
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // Create agents store
        if (!db.objectStoreNames.contains('agents')) {
          const agentStore = db.createObjectStore('agents', { keyPath: 'id' })
          agentStore.createIndex('name', 'name', { unique: false })
          agentStore.createIndex('role', 'role', { unique: false })
          agentStore.createIndex('tags', 'tags', {
            unique: false,
            multiEntry: true,
          })
        }

        // Create conversations store
        if (!db.objectStoreNames.contains('conversations')) {
          const conversationStore = db.createObjectStore('conversations', {
            keyPath: 'id',
          })
          conversationStore.createIndex('agentId', 'agentId', { unique: false })
          conversationStore.createIndex('workflowId', 'workflowId', {
            unique: false,
          })
          conversationStore.createIndex('timestamp', 'timestamp', {
            unique: false,
          })
        } else if (event.oldVersion < 2) {
          // Migration for existing databases - messages are stored inline in the conversation object
          // No changes needed to the object store structure
        }

        // Migration for version 4: Add title field to conversations
        if (event.oldVersion < 4) {
          // No structural changes needed to the object store for adding optional fields
          // The title field is optional and will be gradually populated
          console.log(
            'Database migrated to version 4: Added conversation titles support',
          )
        }

        // Migration for version 5: Ensure all indexes are properly created
        if (event.oldVersion < 5) {
          console.log(
            'Database migrated to version 5: Ensuring all indexes are present',
          )

          // Re-ensure artifacts store has all required indexes
          if (db.objectStoreNames.contains('artifacts')) {
            const artifactStore = (
              event.target as IDBOpenDBRequest
            )?.transaction?.objectStore('artifacts')
            const requiredIndexes = [
              'taskId',
              'agentId',
              'status',
              'type',
              'createdAt',
            ]

            if (artifactStore) {
              requiredIndexes.forEach((indexName) => {
                if (!artifactStore.indexNames.contains(indexName)) {
                  console.log(
                    `Creating missing index: ${indexName} on artifacts store`,
                  )
                  artifactStore.createIndex(indexName, indexName, {
                    unique: false,
                  })
                }
              })
            }
          }

          // Re-ensure tasks store has all required indexes
          if (db.objectStoreNames.contains('tasks')) {
            const taskStore = (
              event.target as IDBOpenDBRequest
            )?.transaction?.objectStore('tasks')
            const requiredIndexes = [
              'workflowId',
              'status',
              'complexity',
              'assignedAgentId',
              'parentTaskId',
              'createdAt',
              'dueDate',
            ]

            if (taskStore) {
              requiredIndexes.forEach((indexName) => {
                if (!taskStore.indexNames.contains(indexName)) {
                  console.log(
                    `Creating missing index: ${indexName} on tasks store`,
                  )
                  taskStore.createIndex(indexName, indexName, { unique: false })
                }
              })
            }
          }
        }

        // Migration for version 6: Add Langfuse configuration store
        if (event.oldVersion < 6) {
          console.log(
            'Database migrated to version 6: Added Langfuse configuration store',
          )

          if (!db.objectStoreNames.contains('langfuse_config')) {
            const langfuseConfigStore = db.createObjectStore(
              'langfuse_config',
              {
                keyPath: 'id',
              },
            )
            langfuseConfigStore.createIndex('enabled', 'enabled', {
              unique: false,
            })
            langfuseConfigStore.createIndex('timestamp', 'timestamp', {
              unique: false,
            })
          }
        }

        // Migration for version 7: Add knowledge items store
        if (event.oldVersion < 7) {
          console.log(
            'Database migrated to version 7: Added knowledge items store',
          )

          if (!db.objectStoreNames.contains('knowledgeItems')) {
            const knowledgeItemsStore = db.createObjectStore('knowledgeItems', {
              keyPath: 'id',
            })
            knowledgeItemsStore.createIndex('name', 'name', { unique: false })
            knowledgeItemsStore.createIndex('type', 'type', { unique: false })
            knowledgeItemsStore.createIndex('parentId', 'parentId', {
              unique: false,
            })
            knowledgeItemsStore.createIndex('path', 'path', { unique: false })
            knowledgeItemsStore.createIndex('createdAt', 'createdAt', {
              unique: false,
            })
            knowledgeItemsStore.createIndex('tags', 'tags', {
              unique: false,
              multiEntry: true,
            })
          }
        }

        // Migration for version 8: Add folder watchers store
        if (event.oldVersion < 8) {
          console.log(
            'Database migrated to version 8: Added folder watchers store',
          )

          if (!db.objectStoreNames.contains('folderWatchers')) {
            const folderWatchersStore = db.createObjectStore('folderWatchers', {
              keyPath: 'id',
            })
            folderWatchersStore.createIndex('basePath', 'basePath', {
              unique: false,
            })
            folderWatchersStore.createIndex('isActive', 'isActive', {
              unique: false,
            })
            folderWatchersStore.createIndex('createdAt', 'createdAt', {
              unique: false,
            })
            folderWatchersStore.createIndex('lastSync', 'lastSync', {
              unique: false,
            })
          }
        }

        // Create credentials store
        if (!db.objectStoreNames.contains('credentials')) {
          const credentialStore = db.createObjectStore('credentials', {
            keyPath: 'id',
          })
          credentialStore.createIndex('provider', 'provider', { unique: false })
        }

        // Create artifacts store
        if (!db.objectStoreNames.contains('artifacts')) {
          const artifactStore = db.createObjectStore('artifacts', {
            keyPath: 'id',
          })
          artifactStore.createIndex('taskId', 'taskId', { unique: false })
          artifactStore.createIndex('agentId', 'agentId', { unique: false })
          artifactStore.createIndex('status', 'status', { unique: false })
          artifactStore.createIndex('type', 'type', { unique: false })
          artifactStore.createIndex('createdAt', 'createdAt', { unique: false })
        }

        // Create tasks store
        if (!db.objectStoreNames.contains('tasks')) {
          const taskStore = db.createObjectStore('tasks', {
            keyPath: 'id',
          })
          taskStore.createIndex('workflowId', 'workflowId', { unique: false })
          taskStore.createIndex('status', 'status', { unique: false })
          taskStore.createIndex('complexity', 'complexity', { unique: false })
          taskStore.createIndex('assignedAgentId', 'assignedAgentId', {
            unique: false,
          })
          taskStore.createIndex('parentTaskId', 'parentTaskId', {
            unique: false,
          })
          taskStore.createIndex('createdAt', 'createdAt', { unique: false })
          taskStore.createIndex('dueDate', 'dueDate', { unique: false })
        }

        // Create contexts store
        if (!db.objectStoreNames.contains('contexts')) {
          const contextStore = db.createObjectStore('contexts', {
            keyPath: 'id',
          })
          contextStore.createIndex('taskId', 'taskId', { unique: false })
          contextStore.createIndex('agentId', 'agentId', { unique: false })
          contextStore.createIndex('contextType', 'contextType', {
            unique: false,
          })
          contextStore.createIndex('relevantAgents', 'relevantAgents', {
            unique: false,
            multiEntry: true,
          })
          contextStore.createIndex('createdAt', 'createdAt', { unique: false })
          contextStore.createIndex('expiryDate', 'expiryDate', {
            unique: false,
          })
        }

        // Create knowledgeItems store
        if (!db.objectStoreNames.contains('knowledgeItems')) {
          const knowledgeItemsStore = db.createObjectStore('knowledgeItems', {
            keyPath: 'id',
          })
          knowledgeItemsStore.createIndex('name', 'name', { unique: false })
          knowledgeItemsStore.createIndex('type', 'type', { unique: false })
          knowledgeItemsStore.createIndex('parentId', 'parentId', {
            unique: false,
          })
          knowledgeItemsStore.createIndex('path', 'path', { unique: false })
          knowledgeItemsStore.createIndex('createdAt', 'createdAt', {
            unique: false,
          })
          knowledgeItemsStore.createIndex('tags', 'tags', {
            unique: false,
            multiEntry: true,
          })
        }

        // Create folderWatchers store
        if (!db.objectStoreNames.contains('folderWatchers')) {
          const folderWatchersStore = db.createObjectStore('folderWatchers', {
            keyPath: 'id',
          })
          folderWatchersStore.createIndex('basePath', 'basePath', {
            unique: false,
          })
          folderWatchersStore.createIndex('isActive', 'isActive', {
            unique: false,
          })
          folderWatchersStore.createIndex('createdAt', 'createdAt', {
            unique: false,
          })
          folderWatchersStore.createIndex('lastSync', 'lastSync', {
            unique: false,
          })
        }

        // Create langfuse_config store
        if (!db.objectStoreNames.contains('langfuse_config')) {
          const langfuseConfigStore = db.createObjectStore('langfuse_config', {
            keyPath: 'id',
          })
          langfuseConfigStore.createIndex('enabled', 'enabled', {
            unique: false,
          })
          langfuseConfigStore.createIndex('timestamp', 'timestamp', {
            unique: false,
          })
        }

        // Migration for version 9: Add Agent Memory System stores
        if (event.oldVersion < 9) {
          console.log(
            'Database migrated to version 9: Added Agent Memory System stores',
          )

          // Create agentMemories store
          if (!db.objectStoreNames.contains('agentMemories')) {
            const agentMemoriesStore = db.createObjectStore('agentMemories', {
              keyPath: 'id',
            })
            agentMemoriesStore.createIndex('agentId', 'agentId', {
              unique: false,
            })
            agentMemoriesStore.createIndex('category', 'category', {
              unique: false,
            })
            agentMemoriesStore.createIndex('confidence', 'confidence', {
              unique: false,
            })
            agentMemoriesStore.createIndex(
              'validationStatus',
              'validationStatus',
              { unique: false },
            )
            agentMemoriesStore.createIndex('learnedAt', 'learnedAt', {
              unique: false,
            })
            agentMemoriesStore.createIndex('lastUsedAt', 'lastUsedAt', {
              unique: false,
            })
            agentMemoriesStore.createIndex('tags', 'tags', {
              unique: false,
              multiEntry: true,
            })
            agentMemoriesStore.createIndex('keywords', 'keywords', {
              unique: false,
              multiEntry: true,
            })
            agentMemoriesStore.createIndex('createdAt', 'createdAt', {
              unique: false,
            })
          }

          // Create memoryLearningEvents store
          if (!db.objectStoreNames.contains('memoryLearningEvents')) {
            const learningEventsStore = db.createObjectStore(
              'memoryLearningEvents',
              {
                keyPath: 'id',
              },
            )
            learningEventsStore.createIndex('agentId', 'agentId', {
              unique: false,
            })
            learningEventsStore.createIndex(
              'conversationId',
              'conversationId',
              { unique: false },
            )
            learningEventsStore.createIndex('processed', 'processed', {
              unique: false,
            })
            learningEventsStore.createIndex('extractedAt', 'extractedAt', {
              unique: false,
            })
          }

          // Create agentMemoryDocuments store
          if (!db.objectStoreNames.contains('agentMemoryDocuments')) {
            const memoryDocsStore = db.createObjectStore(
              'agentMemoryDocuments',
              {
                keyPath: 'id',
              },
            )
            memoryDocsStore.createIndex('agentId', 'agentId', { unique: true })
            memoryDocsStore.createIndex('lastSynthesisAt', 'lastSynthesisAt', {
              unique: false,
            })
            memoryDocsStore.createIndex('updatedAt', 'updatedAt', {
              unique: false,
            })
          }
        }

        // Migration for version 10: Add Pinned Messages System
        if (event.oldVersion < 10) {
          console.log(
            'Database migrated to version 10: Added Pinned Messages System',
          )

          // Create pinnedMessages store
          if (!db.objectStoreNames.contains('pinnedMessages')) {
            const pinnedMessagesStore = db.createObjectStore('pinnedMessages', {
              keyPath: 'id',
            })
            pinnedMessagesStore.createIndex(
              'conversationId',
              'conversationId',
              {
                unique: false,
              },
            )
            pinnedMessagesStore.createIndex('messageId', 'messageId', {
              unique: false,
            })
            pinnedMessagesStore.createIndex('agentId', 'agentId', {
              unique: false,
            })
            pinnedMessagesStore.createIndex('pinnedAt', 'pinnedAt', {
              unique: false,
            })
            pinnedMessagesStore.createIndex('keywords', 'keywords', {
              unique: false,
              multiEntry: true,
            })
            pinnedMessagesStore.createIndex('createdAt', 'createdAt', {
              unique: false,
            })
          }
        }

        // Migration for version 11: Add File Handles store for Native File System API
        if (event.oldVersion < 11) {
          console.log(
            'Database migrated to version 11: Added File Handles store for persistent folder watching',
          )

          // Create fileHandles store - stores FileSystemDirectoryHandle objects directly
          // Modern browsers (Chrome 86+) support storing FileSystemHandle in IndexedDB
          if (!db.objectStoreNames.contains('fileHandles')) {
            const fileHandlesStore = db.createObjectStore('fileHandles', {
              keyPath: 'id',
            })
            fileHandlesStore.createIndex('createdAt', 'createdAt', {
              unique: false,
            })
          }
        }

        // Migration for version 12: Add Connectors System stores
        if (event.oldVersion < 12) {
          console.log(
            'Database migrated to version 12: Added Connectors System stores',
          )

          // Create connectors store
          if (!db.objectStoreNames.contains('connectors')) {
            const connectorsStore = db.createObjectStore('connectors', {
              keyPath: 'id',
            })
            connectorsStore.createIndex('category', 'category', {
              unique: false,
            })
            connectorsStore.createIndex('provider', 'provider', {
              unique: false,
            })
            connectorsStore.createIndex('status', 'status', {
              unique: false,
            })
          }

          // Create connectorSyncStates store
          if (!db.objectStoreNames.contains('connectorSyncStates')) {
            const connectorSyncStatesStore = db.createObjectStore(
              'connectorSyncStates',
              {
                keyPath: 'id',
              },
            )
            connectorSyncStatesStore.createIndex('connectorId', 'connectorId', {
              unique: true,
            })
          }
        }

        // Migration for version 13: Add Battle System store
        if (event.oldVersion < 13) {
          console.log(
            'Database migrated to version 13: Added Battle System store',
          )

          // Create battles store
          if (!db.objectStoreNames.contains('battles')) {
            const battlesStore = db.createObjectStore('battles', {
              keyPath: 'id',
            })
            battlesStore.createIndex('status', 'status', {
              unique: false,
            })
            battlesStore.createIndex('judgeAgentId', 'judgeAgentId', {
              unique: false,
            })
            battlesStore.createIndex('createdAt', 'createdAt', {
              unique: false,
            })
          }
        }

        // Migration for version 14: Add Studio Entries store
        if (event.oldVersion < 14) {
          console.log(
            'Database migrated to version 14: Added Studio Entries store',
          )

          // Create studioEntries store
          if (!db.objectStoreNames.contains('studioEntries')) {
            const studioEntriesStore = db.createObjectStore('studioEntries', {
              keyPath: 'id',
            })
            studioEntriesStore.createIndex('createdAt', 'createdAt', {
              unique: false,
            })
            studioEntriesStore.createIndex('isFavorite', 'isFavorite', {
              unique: false,
            })
          }
        }

        // Migration for version 15: Add Traces/Observability System stores
        if (event.oldVersion < 15) {
          console.log(
            'Database migrated to version 15: Added Traces/Observability System stores',
          )

          // Create traces store
          if (!db.objectStoreNames.contains('traces')) {
            const tracesStore = db.createObjectStore('traces', {
              keyPath: 'id',
            })
            tracesStore.createIndex('status', 'status', { unique: false })
            tracesStore.createIndex('agentId', 'agentId', { unique: false })
            tracesStore.createIndex('conversationId', 'conversationId', {
              unique: false,
            })
            tracesStore.createIndex('taskId', 'taskId', { unique: false })
            tracesStore.createIndex('sessionId', 'sessionId', { unique: false })
            tracesStore.createIndex('startTime', 'startTime', { unique: false })
            tracesStore.createIndex('createdAt', 'createdAt', { unique: false })
          }

          // Create spans store
          if (!db.objectStoreNames.contains('spans')) {
            const spansStore = db.createObjectStore('spans', {
              keyPath: 'id',
            })
            spansStore.createIndex('traceId', 'traceId', { unique: false })
            spansStore.createIndex('parentSpanId', 'parentSpanId', {
              unique: false,
            })
            spansStore.createIndex('type', 'type', { unique: false })
            spansStore.createIndex('status', 'status', { unique: false })
            spansStore.createIndex('agentId', 'agentId', { unique: false })
            spansStore.createIndex('startTime', 'startTime', { unique: false })
            spansStore.createIndex('createdAt', 'createdAt', { unique: false })
          }

          // Create tracingConfig store
          if (!db.objectStoreNames.contains('tracingConfig')) {
            const tracingConfigStore = db.createObjectStore('tracingConfig', {
              keyPath: 'id',
            })
            tracingConfigStore.createIndex('enabled', 'enabled', {
              unique: false,
            })
          }
        }

        // Migration for version 17: Add Marketplace System store
        if (event.oldVersion < 17) {
          console.log(
            'Database migrated to version 17: Added Marketplace System store',
          )

          // Create extensions store
          if (!db.objectStoreNames.contains('extensions')) {
            const extensionsStore = db.createObjectStore('extensions', {
              keyPath: 'id',
            })
            extensionsStore.createIndex('enabled', 'enabled', {
              unique: false,
            })
            extensionsStore.createIndex('status', 'status', {
              unique: false,
            })
            extensionsStore.createIndex('installedAt', 'installedAt', {
              unique: false,
            })
          }
        }

        // Migration for version 18: Add Custom Extensions store
        if (event.oldVersion < 18) {
          console.log(
            'Database migrated to version 18: Added Custom Extensions store',
          )

          // Create customExtensions store for AI-generated extensions
          if (!db.objectStoreNames.contains('customExtensions')) {
            const customExtensionsStore = db.createObjectStore(
              'customExtensions',
              {
                keyPath: 'id',
              },
            )
            customExtensionsStore.createIndex('type', 'type', {
              unique: false,
            })
            customExtensionsStore.createIndex('name', 'name', {
              unique: false,
            })
            customExtensionsStore.createIndex('createdAt', 'createdAt', {
              unique: false,
            })
          }
        }

        // Migration for version 19: Add Notifications store
        if (event.oldVersion < 19) {
          console.log(
            'Database migrated to version 19: Added Notifications store',
          )

          if (!db.objectStoreNames.contains('notifications')) {
            const notificationsStore = db.createObjectStore('notifications', {
              keyPath: 'id',
            })
            notificationsStore.createIndex('type', 'type', {
              unique: false,
            })
            notificationsStore.createIndex('read', 'read', {
              unique: false,
            })
            notificationsStore.createIndex('createdAt', 'createdAt', {
              unique: false,
            })
          }
        }

        // Migration for version 20: Add Crypto Keys store for non-extractable CryptoKey storage
        if (event.oldVersion < 20) {
          console.log(
            'Database migrated to version 20: Added Crypto Keys store for secure key storage',
          )

          if (!db.objectStoreNames.contains('cryptoKeys')) {
            const cryptoKeysStore = db.createObjectStore('cryptoKeys', {
              keyPath: 'id',
            })
            cryptoKeysStore.createIndex('createdAt', 'createdAt', {
              unique: false,
            })
          }
        }
      }
    })
  }

  async add<T extends keyof DBStores>(
    storeName: T,
    data: DBStores[T],
  ): Promise<string> {
    if (!this.db) throw new Error('Database not initialized')

    // Check if the store exists before trying to use it
    if (!this.db.objectStoreNames.contains(storeName)) {
      throw new Error(
        `Object store '${storeName}' not found. Database may need to be reset.`,
      )
    }

    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db!.transaction([storeName], 'readwrite')
        const store = transaction.objectStore(storeName)
        const request = store.add(data)

        request.onsuccess = () => resolve(request.result as string)
        request.onerror = () => reject(request.error)
        transaction.onerror = () => reject(transaction.error)
      } catch (error) {
        reject(error)
      }
    })
  }

  async get<T extends keyof DBStores>(
    storeName: T,
    id: string,
  ): Promise<DBStores[T] | undefined> {
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly')
      const store = transaction.objectStore(storeName)
      const request = store.get(id)

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  async getAll<T extends keyof DBStores>(storeName: T): Promise<DBStores[T][]> {
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly')
      const store = transaction.objectStore(storeName)
      const request = store.getAll()

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  async update<T extends keyof DBStores>(
    storeName: T,
    data: DBStores[T],
  ): Promise<void> {
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite')
      const store = transaction.objectStore(storeName)
      const request = store.put(data)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async delete<T extends keyof DBStores>(
    storeName: T,
    id: string,
  ): Promise<void> {
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite')
      const store = transaction.objectStore(storeName)
      const request = store.delete(id)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async query<T extends keyof DBStores>(
    storeName: T,
    indexName: string,
    value: any,
  ): Promise<DBStores[T][]> {
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db!.transaction([storeName], 'readonly')
        const store = transaction.objectStore(storeName)

        // Check if index exists before using it
        if (!store.indexNames.contains(indexName)) {
          console.warn(
            `Index '${indexName}' not found in store '${storeName}'. Falling back to full scan.`,
          )
          // Fallback to scanning all records if index doesn't exist
          const request = store.getAll()
          request.onsuccess = () => {
            const results = request.result
            const filtered = results.filter((item: any) => {
              const itemValue = item[indexName]
              return (
                itemValue === value ||
                (Array.isArray(itemValue) && itemValue.includes(value))
              )
            })
            resolve(filtered)
          }
          request.onerror = () => reject(request.error)
          return
        }

        const index = store.index(indexName)
        const request = index.getAll(value)

        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      } catch (error) {
        reject(error)
      }
    })
  }

  async clear<T extends keyof DBStores>(storeName: T): Promise<void> {
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite')
      const store = transaction.objectStore(storeName)
      const request = store.clear()

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  // Helper method to manually reset/recreate the database
  async resetDatabase(): Promise<void> {
    if (this.db) {
      this.db.close()
    }
    this.initialized = false

    return new Promise((resolve, reject) => {
      const deleteRequest = indexedDB.deleteDatabase(Database.DB_NAME)
      deleteRequest.onsuccess = () => {
        console.log('Database deleted successfully')
        this.init().then(resolve).catch(reject)
      }
      deleteRequest.onerror = () => reject(deleteRequest.error)
      deleteRequest.onblocked = () => {
        console.warn(
          'Database deletion blocked. Close all tabs using this database.',
        )
        reject(new Error('Database deletion blocked'))
      }
    })
  }
}

export const db = new Database()
