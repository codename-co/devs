import {
  Agent,
  Conversation,
  Knowledge,
  KnowledgeItem,
  PersistedFolderWatcher,
  Credential,
  Artifact,
  Task,
  SharedContext,
  LangfuseConfig,
  AgentMemoryEntry,
  MemoryLearningEvent,
  AgentMemoryDocument,
} from '@/types'

export interface DBStores {
  agents: Agent
  conversations: Conversation
  knowledge: Knowledge
  knowledgeItems: KnowledgeItem
  folderWatchers: PersistedFolderWatcher
  credentials: Credential
  artifacts: Artifact
  tasks: Task
  contexts: SharedContext
  langfuse_config: LangfuseConfig
  // Agent Memory System
  agentMemories: AgentMemoryEntry
  memoryLearningEvents: MemoryLearningEvent
  agentMemoryDocuments: AgentMemoryDocument
}

export class Database {
  private db: IDBDatabase | null = null
  private initialized = false

  static DB_NAME = 'devs-ai-platform'
  static DB_VERSION = 9
  static STORES: (keyof DBStores)[] = [
    'agents',
    'conversations',
    'knowledgeItems',
    'folderWatchers',
    'credentials',
    'artifacts',
    'tasks',
    'contexts',
    'langfuse_config',
    // Agent Memory System
    'agentMemories',
    'memoryLearningEvents',
    'agentMemoryDocuments',
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
