import {
  PersistedFolderWatcher,
  FileHandleEntry,
  CryptoKeyEntry,
} from '@/types'

/**
 * IndexedDB stores that remain in the legacy `devs-ai-platform` database.
 *
 * After the Yjs-first migration, the only data that **must** live in
 * IndexedDB are browser-native objects that cannot be serialised into
 * a Yjs CRDT document:
 *
 * - `cryptoKeys`      – Non-extractable `CryptoKey` objects
 * - `fileHandles`     – `FileSystemDirectoryHandle` objects
 * - `folderWatchers`  – Folder-watch metadata referencing handles
 *
 * All other entity types (agents, conversations, tasks, …) now live
 * exclusively in Yjs maps — see `src/lib/yjs/maps.ts`.
 */
export interface DBStores {
  folderWatchers: PersistedFolderWatcher
  fileHandles: FileHandleEntry
  // Crypto Keys System (non-extractable CryptoKey storage)
  cryptoKeys: CryptoKeyEntry
}

export class Database {
  private db: IDBDatabase | null = null
  private initialized = false

  static DB_NAME = 'devs-ai-platform'
  static DB_VERSION = 22
  static STORES: (keyof DBStores)[] = [
    'folderWatchers',
    'fileHandles',
    // Crypto Keys System
    'cryptoKeys',
  ]

  /**
   * Stores that were removed in version 21 after the Yjs-first migration.
   * On upgrade, these object stores are deleted from IndexedDB.
   */
  private static REMOVED_STORES = [
    'agents',
    'conversations',
    'knowledgeItems',
    'credentials',
    'artifacts',
    'tasks',
    'contexts',
    'langfuse_config',
    'agentMemories',
    'memoryLearningEvents',
    'agentMemoryDocuments',
    'pinnedMessages',
    'connectors',
    'connectorSyncStates',
    'battles',
    'studioEntries',
    'traces',
    'spans',
    'tracingConfig',
    'extensions',
    'customExtensions',
    'notifications',
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

        // -----------------------------------------------------------------
        // Version 21/22: Yjs-first cleanup
        //
        // All entity data now lives in Yjs maps (persisted via y-indexeddb
        // in the separate "devs" IndexedDB database).  The old object
        // stores in *this* database (`devs-ai-platform`) are no longer
        // read or written to — delete them to make this crystal clear.
        //
        // Version bumped to 22 to ensure the delete runs for users
        // whose database was already upgraded to 21 before this code
        // was deployed.
        // -----------------------------------------------------------------
        if (event.oldVersion < 22) {
          console.log(
            'Database migrated to version 21: Removing legacy stores migrated to Yjs',
          )

          for (const storeName of Database.REMOVED_STORES) {
            if (db.objectStoreNames.contains(storeName)) {
              db.deleteObjectStore(storeName)
              console.log(`  ✓ Deleted store: ${storeName}`)
            }
          }
        }

        // -----------------------------------------------------------------
        // Ensure the 3 remaining stores exist (they were created in
        // earlier versions, but handle fresh installs too).
        // -----------------------------------------------------------------

        // folderWatchers — stores PersistedFolderWatcher metadata
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

        // fileHandles — stores FileSystemDirectoryHandle objects
        if (!db.objectStoreNames.contains('fileHandles')) {
          const fileHandlesStore = db.createObjectStore('fileHandles', {
            keyPath: 'id',
          })
          fileHandlesStore.createIndex('createdAt', 'createdAt', {
            unique: false,
          })
        }

        // cryptoKeys — stores non-extractable CryptoKey objects
        if (!db.objectStoreNames.contains('cryptoKeys')) {
          const cryptoKeysStore = db.createObjectStore('cryptoKeys', {
            keyPath: 'id',
          })
          cryptoKeysStore.createIndex('createdAt', 'createdAt', {
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
