import {
  Agent,
  Workflow,
  Conversation,
  Knowledge,
  Credential,
  Artifact,
  Task,
  SharedContext,
  LangfuseConfig,
} from '@/types'

const DB_NAME = 'devs-ai-platform'
const DB_VERSION = 6

export interface DBStores {
  agents: Agent
  workflows: Workflow
  conversations: Conversation
  knowledge: Knowledge
  credentials: Credential
  artifacts: Artifact
  tasks: Task
  contexts: SharedContext
  langfuse_config: LangfuseConfig
}

class Database {
  private db: IDBDatabase | null = null
  private initialized = false

  isInitialized(): boolean {
    return this.initialized
  }

  async init(): Promise<void> {
    if (this.initialized) return
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
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

        // Create workflows store
        if (!db.objectStoreNames.contains('workflows')) {
          const workflowStore = db.createObjectStore('workflows', {
            keyPath: 'id',
          })
          workflowStore.createIndex('status', 'status', { unique: false })
          workflowStore.createIndex('strategy', 'strategy', { unique: false })
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

        // Create knowledge store
        if (!db.objectStoreNames.contains('knowledge')) {
          const knowledgeStore = db.createObjectStore('knowledge', {
            keyPath: 'id',
          })
          knowledgeStore.createIndex('domain', 'domain', { unique: false })
          knowledgeStore.createIndex('agentId', 'agentId', { unique: false })
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
      }
    })
  }

  async add<T extends keyof DBStores>(
    storeName: T,
    data: DBStores[T],
  ): Promise<string> {
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite')
      const store = transaction.objectStore(storeName)
      const request = store.add(data)

      request.onsuccess = () => resolve(request.result as string)
      request.onerror = () => reject(request.error)
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
      const deleteRequest = indexedDB.deleteDatabase(DB_NAME)
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
