import {
  Agent,
  Workflow,
  Conversation,
  Knowledge,
  Credential,
  Artifact,
} from '@/types'

const DB_NAME = 'devs-ai-platform'
const DB_VERSION = 2

export interface DBStores {
  agents: Agent
  workflows: Workflow
  conversations: Conversation
  knowledge: Knowledge
  credentials: Credential
  artifacts: Artifact
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
          artifactStore.createIndex('status', 'status', { unique: false })
          artifactStore.createIndex('dueDate', 'dueDate', { unique: false })
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
      const transaction = this.db!.transaction([storeName], 'readonly')
      const store = transaction.objectStore(storeName)
      const index = store.index(indexName)
      const request = index.getAll(value)

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }
}

export const db = new Database()
