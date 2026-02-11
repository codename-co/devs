/**
 * Sync Engine - Orchestrates Connector Synchronization
 *
 * This module provides the core synchronization engine that coordinates
 * data synchronization between external connectors and the local knowledge store.
 * It handles delta sync, change detection, and background sync scheduling.
 */

import { ProviderRegistry } from './provider-registry'
import {
  normalizeToKnowledgeItem,
  mergeWithExisting,
  generateContentHash,
  hasContentChanged,
} from './normalizer'
import {
  AuthenticationError,
  storeEncryptionMetadata,
} from './connector-provider'
import { sanitizeErrorMessage } from './sanitizer'
import { SecureStorage } from '@/lib/crypto'
import { useConnectorStore } from './stores'
import {
  getAllKnowledgeItemsAsync,
  addKnowledgeItem,
  updateKnowledgeItem,
  deleteKnowledgeItem,
} from '@/stores/knowledgeStore'
import type { KnowledgeItem } from '@/types'
import type {
  Connector,
  SyncResult,
  SyncJob,
  ChangesResult,
  AppConnectorProviderInterface,
} from './types'

// =============================================================================
// Constants
// =============================================================================

/**
 * Default sync interval in milliseconds (30 minutes)
 */
const DEFAULT_SYNC_INTERVAL_MS = 30 * 60 * 1000

/**
 * Maximum retry attempts for failed syncs
 */
const MAX_RETRY_ATTEMPTS = 3

/**
 * Delay between retry attempts in milliseconds
 */
const RETRY_DELAY_MS = 5000

// =============================================================================
// Logging Utilities
// =============================================================================

const log = {
  info: (message: string, ...args: unknown[]) =>
    console.log(`[SyncEngine] ${message}`, ...args),
  warn: (message: string, ...args: unknown[]) =>
    console.warn(`[SyncEngine] ${message}`, ...args),
  error: (message: string, ...args: unknown[]) =>
    console.error(`[SyncEngine] ${message}`, ...args),
  debug: (message: string, ...args: unknown[]) =>
    console.debug(`[SyncEngine] ${message}`, ...args),
}

// =============================================================================
// Sync Engine
// =============================================================================

/**
 * Sync Engine for orchestrating connector synchronization
 *
 * Manages the synchronization lifecycle including:
 * - Delta sync with cursor-based pagination
 * - Content change detection via hashing
 * - Background sync scheduling
 * - Service Worker integration for offline sync
 */
export class SyncEngine {
  /**
   * Active sync jobs indexed by connector ID
   */
  private static jobs: Map<string, SyncJob> = new Map()

  /**
   * Scheduled sync timeouts indexed by connector ID
   */
  private static scheduledSyncs: Map<string, NodeJS.Timeout> = new Map()

  /**
   * Abort controllers for cancellable syncs
   */
  private static abortControllers: Map<string, AbortController> = new Map()

  /**
   * Flag to track if providers have been initialized
   */
  private static providersInitialized = false

  // ===========================================================================
  // Provider Initialization
  // ===========================================================================

  /**
   * Ensure provider registry has been initialized with default providers.
   * This is idempotent and safe to call multiple times.
   */
  private static ensureProvidersInitialized(): void {
    if (!this.providersInitialized) {
      ProviderRegistry.initializeDefaults()
      this.providersInitialized = true
    }
  }

  // ===========================================================================
  // Token Refresh Helper
  // ===========================================================================

  /**
   * Refresh an expired access token for a connector
   *
   * @param connector - The connector with expired token
   * @param provider - The provider instance to use for refresh
   * @returns Updated connector with new token
   * @throws Error if refresh fails or no refresh token available
   */
  private static async refreshConnectorToken(
    connector: Connector,
    provider: AppConnectorProviderInterface,
  ): Promise<Connector> {
    const store = useConnectorStore.getState()

    // Check if refresh token is available
    if (!connector.encryptedRefreshToken) {
      throw new Error('NO_REFRESH_TOKEN')
    }

    log.info(`Refreshing expired token for connector: ${connector.name}`)

    // Refresh the token
    const refreshResult = await provider.refreshToken(connector)

    // Encrypt the new access token
    await SecureStorage.init()
    const {
      encrypted: encryptedToken,
      iv,
      salt,
    } = await SecureStorage.encryptCredential(refreshResult.accessToken)

    // Calculate new expiry time
    const tokenExpiresAt = refreshResult.expiresIn
      ? new Date(Date.now() + refreshResult.expiresIn * 1000)
      : undefined

    // Update the connector in the store
    await store.updateConnector(connector.id, {
      encryptedToken,
      tokenExpiresAt,
      status: 'connected',
      errorMessage: undefined,
    })

    // Store new encryption metadata
    storeEncryptionMetadata(connector.id, iv, salt, false)

    log.info(`Token refreshed successfully for connector: ${connector.name}`)

    // Return updated connector
    return {
      ...connector,
      encryptedToken,
      tokenExpiresAt,
      status: 'connected',
    }
  }

  // ===========================================================================
  // Public API
  // ===========================================================================

  /**
   * Sync a single connector
   *
   * Performs a delta sync for the specified connector, fetching changes
   * from the provider and updating the local knowledge store.
   *
   * @param connectorId - ID of the connector to sync
   * @returns Promise resolving to the sync result
   *
   * @example
   * ```typescript
   * const result = await SyncEngine.sync('connector-123')
   * if (result.success) {
   *   console.log(`Synced ${result.itemsSynced} items`)
   * }
   * ```
   */
  static async sync(connectorId: string): Promise<SyncResult> {
    const startTime = Date.now()
    const errors: string[] = []
    let itemsSynced = 0
    let itemsDeleted = 0

    // Ensure providers are initialized
    this.ensureProvidersInitialized()

    // Get connector from store
    const store = useConnectorStore.getState()
    const connector = store.getConnector(connectorId)

    if (!connector) {
      return {
        success: false,
        itemsSynced: 0,
        itemsDeleted: 0,
        errors: [`Connector not found: ${connectorId}`],
        duration: Date.now() - startTime,
      }
    }

    // Check if already syncing
    if (this.isSyncing(connectorId)) {
      log.warn(`Sync already in progress for connector: ${connectorId}`)
      return {
        success: false,
        itemsSynced: 0,
        itemsDeleted: 0,
        errors: ['Sync already in progress'],
        duration: Date.now() - startTime,
      }
    }

    // Create abort controller for cancellation
    const abortController = new AbortController()
    this.abortControllers.set(connectorId, abortController)

    // Create sync job
    const job: SyncJob = {
      id: crypto.randomUUID(),
      connectorId,
      status: 'running',
      startedAt: new Date(),
      itemsProcessed: 0,
    }
    this.jobs.set(connectorId, job)

    try {
      // Update sync state to 'syncing' in-memory only (skipPersist: true)
      // This ensures React components re-render, but 'syncing' status is not
      // persisted to DB - preventing stuck state if the app crashes during sync
      await store.updateSyncState(
        connectorId,
        {
          status: 'syncing',
          syncType: store.getSyncState(connectorId)?.cursor ? 'delta' : 'full',
        },
        { skipPersist: true, silent: true },
      )

      log.info(
        `Starting sync for connector: ${connector.name} (${connectorId})`,
      )

      // Get provider (cast to AppConnectorProviderInterface for token refresh support)
      const provider = (await ProviderRegistry.get(
        connector.provider,
      )) as AppConnectorProviderInterface

      // Keep track of current connector (may be updated after token refresh)
      let currentConnector = connector

      // Get current cursor from sync state
      const syncState = store.getSyncState(connectorId)
      let cursor = syncState?.cursor ?? null

      // Helper to fetch changes with token refresh support
      const fetchChangesWithRefresh = async (): Promise<ChangesResult> => {
        try {
          return await provider.getChanges(currentConnector, cursor)
        } catch (error) {
          // Check if it's an authentication error (token expired)
          if (error instanceof AuthenticationError) {
            log.info(
              `Token expired for ${currentConnector.name}, attempting refresh...`,
            )

            try {
              // Refresh the token
              currentConnector = await this.refreshConnectorToken(
                currentConnector,
                provider,
              )

              // Retry with refreshed token
              return await provider.getChanges(currentConnector, cursor)
            } catch (refreshErr) {
              // Check if it's a missing refresh token error
              const isNoRefreshToken =
                refreshErr instanceof Error &&
                (refreshErr.message === 'NO_REFRESH_TOKEN' ||
                  refreshErr.message.includes('No refresh token'))

              if (isNoRefreshToken) {
                log.error(
                  `No refresh token available for ${currentConnector.name}`,
                )
                // Update connector status to expired
                await store.updateConnector(connectorId, {
                  status: 'expired',
                  errorMessage: 'Access token expired - reconnection required',
                })
              }

              throw refreshErr
            }
          }
          throw error
        }
      }

      // Process changes with pagination
      let hasMore = true
      while (hasMore && !abortController.signal.aborted) {
        // Fetch changes from provider (with token refresh support)
        const changes = await fetchChangesWithRefresh()

        // Process the changes
        const processResult = await this.processChanges(
          currentConnector,
          changes,
        )

        itemsSynced += processResult.added + processResult.modified
        itemsDeleted += processResult.deleted

        // Update job progress
        job.itemsProcessed = itemsSynced + itemsDeleted
        this.jobs.set(connectorId, job)

        // Update cursor for next iteration
        cursor = changes.newCursor
        hasMore = changes.hasMore

        log.debug(
          `Processed batch: +${processResult.added}, ~${processResult.modified}, -${processResult.deleted}`,
          { hasMore, cursor: cursor?.substring(0, 20) },
        )
      }

      // Check if sync was cancelled
      if (abortController.signal.aborted) {
        throw new Error('Sync cancelled')
      }

      // Update sync state with new cursor
      await store.updateSyncState(connectorId, {
        cursor,
        lastSyncAt: new Date(),
        itemsSynced,
        status: 'idle',
        errorMessage: undefined,
      })

      // Update connector status and last sync time
      await store.updateConnector(connectorId, {
        status: 'connected',
        lastSyncAt: new Date(),
        errorMessage: undefined,
      })

      // Update job status
      job.status = 'completed'
      job.completedAt = new Date()
      this.jobs.set(connectorId, job)

      log.info(
        `Sync completed for ${connector.name}: ${itemsSynced} synced, ${itemsDeleted} deleted`,
      )

      return {
        success: true,
        itemsSynced,
        itemsDeleted,
        errors,
        duration: Date.now() - startTime,
      }
    } catch (error) {
      const errorMessage = sanitizeErrorMessage(
        error instanceof Error ? error.message : String(error),
      )
      errors.push(errorMessage)

      log.error(`Sync failed for connector ${connectorId}:`, errorMessage)

      // Update job status
      job.status = 'failed'
      job.completedAt = new Date()
      job.error = errorMessage
      this.jobs.set(connectorId, job)

      // Update connector and sync state with error
      await store.setConnectorStatus(connectorId, 'error', errorMessage)
      await store.updateSyncState(connectorId, {
        status: 'error',
        errorMessage: sanitizeErrorMessage(errorMessage),
      })

      return {
        success: false,
        itemsSynced,
        itemsDeleted,
        errors,
        duration: Date.now() - startTime,
      }
    } finally {
      // Cleanup
      this.abortControllers.delete(connectorId)
    }
  }

  /**
   * Sync all enabled connectors
   *
   * Runs sync for all connectors with syncEnabled = true in parallel.
   *
   * @returns Promise resolving to a map of connector IDs to sync results
   *
   * @example
   * ```typescript
   * const results = await SyncEngine.syncAll()
   * for (const [id, result] of results) {
   *   console.log(`${id}: ${result.success ? 'success' : 'failed'}`)
   * }
   * ```
   */
  static async syncAll(): Promise<Map<string, SyncResult>> {
    const store = useConnectorStore.getState()
    const connectors = store.connectors.filter((c) => c.syncEnabled)

    log.info(`Starting sync for ${connectors.length} enabled connectors`)

    // Run syncs in parallel
    const syncPromises = connectors.map(async (connector) => {
      const result = await this.sync(connector.id)
      return [connector.id, result] as const
    })

    const results = await Promise.all(syncPromises)
    return new Map(results)
  }

  /**
   * Cancel a running sync
   *
   * @param connectorId - ID of the connector to cancel sync for
   */
  static cancelSync(connectorId: string): void {
    const abortController = this.abortControllers.get(connectorId)
    if (abortController) {
      log.info(`Cancelling sync for connector: ${connectorId}`)
      abortController.abort()
    }

    // Update job status
    const job = this.jobs.get(connectorId)
    if (job && job.status === 'running') {
      job.status = 'failed'
      job.completedAt = new Date()
      job.error = 'Cancelled by user'
      this.jobs.set(connectorId, job)
    }
  }

  /**
   * Get the current sync job for a connector
   *
   * @param connectorId - ID of the connector
   * @returns The current sync job, or undefined if not found
   */
  static getJob(connectorId: string): SyncJob | undefined {
    return this.jobs.get(connectorId)
  }

  /**
   * Check if a sync is currently running for a connector
   *
   * @param connectorId - ID of the connector
   * @returns True if sync is running
   */
  static isSyncing(connectorId: string): boolean {
    const job = this.jobs.get(connectorId)
    return job?.status === 'running'
  }

  /**
   * Schedule a sync to run after a delay
   *
   * Useful for periodic sync or debouncing rapid sync requests.
   *
   * @param connectorId - ID of the connector to sync
   * @param delayMs - Delay in milliseconds (default: 30 minutes)
   *
   * @example
   * ```typescript
   * // Schedule sync in 30 minutes
   * SyncEngine.scheduleSync('connector-123')
   *
   * // Schedule sync in 5 minutes
   * SyncEngine.scheduleSync('connector-123', 5 * 60 * 1000)
   * ```
   */
  static scheduleSync(connectorId: string, delayMs?: number): void {
    // Cancel any existing scheduled sync
    const existingTimeout = this.scheduledSyncs.get(connectorId)
    if (existingTimeout) {
      clearTimeout(existingTimeout)
    }

    const delay = delayMs ?? DEFAULT_SYNC_INTERVAL_MS

    log.info(`Scheduling sync for ${connectorId} in ${delay / 1000}s`)

    const timeout = setTimeout(async () => {
      this.scheduledSyncs.delete(connectorId)

      // Check if connector still exists and is enabled
      const store = useConnectorStore.getState()
      const connector = store.getConnector(connectorId)

      if (connector?.syncEnabled) {
        await this.sync(connectorId)

        // Reschedule for next sync interval
        const interval = connector.syncInterval
          ? connector.syncInterval * 60 * 1000
          : DEFAULT_SYNC_INTERVAL_MS
        this.scheduleSync(connectorId, interval)
      }
    }, delay)

    this.scheduledSyncs.set(connectorId, timeout)
  }

  /**
   * Cancel a scheduled sync
   *
   * @param connectorId - ID of the connector
   */
  static cancelScheduledSync(connectorId: string): void {
    const timeout = this.scheduledSyncs.get(connectorId)
    if (timeout) {
      clearTimeout(timeout)
      this.scheduledSyncs.delete(connectorId)
      log.info(`Cancelled scheduled sync for ${connectorId}`)
    }
  }

  /**
   * Register with Service Worker for background sync
   *
   * Uses the Background Sync API to register a sync task that will
   * be executed when the browser has network connectivity.
   *
   * @param connectorId - ID of the connector to register
   *
   * @example
   * ```typescript
   * await SyncEngine.registerBackgroundSync('connector-123')
   * // Sync will run when browser regains connectivity
   * ```
   */
  static async registerBackgroundSync(connectorId: string): Promise<void> {
    if (!('serviceWorker' in navigator)) {
      log.warn(
        'Service Worker not supported, skipping background sync registration',
      )
      return
    }

    try {
      const registration = await navigator.serviceWorker.ready

      // Check if Background Sync is supported
      if (!('sync' in registration)) {
        log.warn('Background Sync not supported')
        return
      }

      // Register the sync task
      await (
        registration as ServiceWorkerRegistration & {
          sync: { register: (tag: string) => Promise<void> }
        }
      ).sync.register(`connector-sync:${connectorId}`)

      log.info(`Registered background sync for connector: ${connectorId}`)
    } catch (error) {
      log.error('Failed to register background sync:', error)
    }
  }

  // ===========================================================================
  // Private Methods
  // ===========================================================================

  /**
   * Process changes from provider and update knowledge store
   *
   * @param connector - The connector being synced
   * @param changes - Changes from the provider
   * @returns Counts of added, modified, and deleted items
   */
  private static async processChanges(
    connector: Connector,
    changes: ChangesResult,
  ): Promise<{ added: number; modified: number; deleted: number }> {
    const counts = { added: 0, modified: 0, deleted: 0 }

    // Ensure Yjs is ready
    const { ensureReady } = await import('@/stores/knowledgeStore')
    await ensureReady()

    // Process added items
    for (const item of changes.added) {
      try {
        // Check for existing item with same external ID
        const existing = await this.findExistingItem(
          connector.id,
          item.externalId,
        )

        if (existing) {
          // Item exists, check if content changed
          const contentChanged = hasContentChanged(
            item.contentHash,
            existing.contentHash,
          )

          if (contentChanged) {
            // Update existing item
            const mergedItem = mergeWithExisting(item, existing, connector)
            await updateKnowledgeItem(mergedItem)
            counts.modified++
          }
          // If content unchanged, skip
        } else {
          // Create new knowledge item
          const knowledgeItem = normalizeToKnowledgeItem(item, connector)

          // Generate content hash if not provided
          if (!knowledgeItem.contentHash && knowledgeItem.content) {
            knowledgeItem.contentHash = await generateContentHash(
              knowledgeItem.content,
            )
          }

          await addKnowledgeItem(knowledgeItem)
          counts.added++
        }
      } catch (error) {
        log.error(`Failed to process added item: ${item.name}`, error)
      }
    }

    // Process modified items
    for (const item of changes.modified) {
      try {
        const existing = await this.findExistingItem(
          connector.id,
          item.externalId,
        )

        if (existing) {
          // Check if content actually changed
          const contentChanged = hasContentChanged(
            item.contentHash,
            existing.contentHash,
          )

          if (contentChanged) {
            const mergedItem = mergeWithExisting(item, existing, connector)

            // Generate content hash if not provided
            if (!mergedItem.contentHash && mergedItem.content) {
              mergedItem.contentHash = await generateContentHash(
                mergedItem.content,
              )
            }

            await updateKnowledgeItem(mergedItem)
            counts.modified++
          }
        } else {
          // Modified item doesn't exist locally, treat as add
          const knowledgeItem = normalizeToKnowledgeItem(item, connector)

          if (!knowledgeItem.contentHash && knowledgeItem.content) {
            knowledgeItem.contentHash = await generateContentHash(
              knowledgeItem.content,
            )
          }

          await addKnowledgeItem(knowledgeItem)
          counts.added++
        }
      } catch (error) {
        log.error(`Failed to process modified item: ${item.name}`, error)
      }
    }

    // Process deleted items
    for (const externalId of changes.deleted) {
      try {
        const existing = await this.findExistingItem(connector.id, externalId)

        if (existing) {
          deleteKnowledgeItem(existing.id)
          counts.deleted++
        }
      } catch (error) {
        log.error(`Failed to process deleted item: ${externalId}`, error)
      }
    }

    return counts
  }

  /**
   * Find an existing knowledge item by connector ID and external ID
   *
   * @param connectorId - ID of the connector
   * @param externalId - External ID from the provider
   * @returns The existing knowledge item, or undefined if not found
   */
  private static async findExistingItem(
    connectorId: string,
    externalId: string,
  ): Promise<KnowledgeItem | undefined> {
    try {
      // Get all knowledge items and find matching one
      // Note: In a production system, you'd want an index on connectorId + externalId
      const allItems = await getAllKnowledgeItemsAsync()

      return allItems.find(
        (item) =>
          item.connectorId === connectorId && item.externalId === externalId,
      )
    } catch (error) {
      log.error('Failed to find existing item:', error)
      return undefined
    }
  }

  /**
   * Retry a sync operation with exponential backoff
   *
   * @param connectorId - ID of the connector to sync
   * @param attempt - Current attempt number
   * @returns Promise resolving to the sync result
   *
   * @example
   * ```typescript
   * const result = await SyncEngine.syncWithRetry('connector-123')
   * ```
   */
  static async syncWithRetry(
    connectorId: string,
    attempt: number = 1,
  ): Promise<SyncResult> {
    const result = await this.sync(connectorId)

    if (!result.success && attempt < MAX_RETRY_ATTEMPTS) {
      log.info(
        `Retry attempt ${attempt + 1}/${MAX_RETRY_ATTEMPTS} for ${connectorId}`,
      )

      await new Promise((resolve) =>
        setTimeout(resolve, RETRY_DELAY_MS * Math.pow(2, attempt - 1)),
      )

      return this.syncWithRetry(connectorId, attempt + 1)
    }

    return result
  }

  // ===========================================================================
  // Lifecycle Methods
  // ===========================================================================

  /**
   * Initialize scheduled syncs for all enabled connectors
   *
   * Should be called when the application starts.
   */
  static async initializeScheduledSyncs(): Promise<void> {
    const store = useConnectorStore.getState()
    await store.initialize()

    const connectors = store.connectors.filter((c) => c.syncEnabled)

    log.info(`Initializing scheduled syncs for ${connectors.length} connectors`)

    for (const connector of connectors) {
      // Stagger initial syncs to avoid thundering herd
      const staggerDelay = Math.random() * 60 * 1000 // Random delay up to 1 minute
      this.scheduleSync(connector.id, staggerDelay)
    }
  }

  /**
   * Stop all scheduled syncs and cancel running syncs
   *
   * Should be called when the application is shutting down.
   */
  static shutdown(): void {
    log.info('Shutting down sync engine')

    // Cancel all scheduled syncs
    for (const [connectorId, timeout] of this.scheduledSyncs) {
      clearTimeout(timeout)
      log.debug(`Cancelled scheduled sync for ${connectorId}`)
    }
    this.scheduledSyncs.clear()

    // Cancel all running syncs
    for (const [connectorId, abortController] of this.abortControllers) {
      abortController.abort()
      log.debug(`Cancelled running sync for ${connectorId}`)
    }
    this.abortControllers.clear()

    // Clear jobs
    this.jobs.clear()
  }

  /**
   * Clear all sync state for a connector
   *
   * Useful when reconnecting a connector or forcing a full resync.
   *
   * @param connectorId - ID of the connector
   */
  static async clearSyncState(connectorId: string): Promise<void> {
    const store = useConnectorStore.getState()

    // Cancel any running or scheduled sync
    this.cancelSync(connectorId)
    this.cancelScheduledSync(connectorId)

    // Clear the sync state (reset cursor)
    await store.updateSyncState(connectorId, {
      cursor: null,
      itemsSynced: 0,
      syncType: 'full',
      status: 'idle',
      errorMessage: undefined,
    })

    // Remove the job from tracking
    this.jobs.delete(connectorId)

    log.info(`Cleared sync state for connector: ${connectorId}`)
  }

  /**
   * Get all active sync jobs
   *
   * @returns Array of all active sync jobs
   */
  static getAllJobs(): SyncJob[] {
    return Array.from(this.jobs.values())
  }

  /**
   * Get sync statistics across all connectors
   *
   * @returns Summary statistics for all syncs
   */
  static getStats(): {
    activeJobs: number
    scheduledSyncs: number
    completedJobs: number
    failedJobs: number
  } {
    const jobs = Array.from(this.jobs.values())

    return {
      activeJobs: jobs.filter((j) => j.status === 'running').length,
      scheduledSyncs: this.scheduledSyncs.size,
      completedJobs: jobs.filter((j) => j.status === 'completed').length,
      failedJobs: jobs.filter((j) => j.status === 'failed').length,
    }
  }
}

// =============================================================================
// Service Worker Event Handler
// =============================================================================

/**
 * Handle background sync events from Service Worker
 *
 * This function should be called from the Service Worker's 'sync' event handler.
 *
 * @param tag - The sync tag from the event
 * @returns Promise that resolves when sync is complete
 *
 * @example
 * ```typescript
 * // In service worker:
 * self.addEventListener('sync', (event) => {
 *   if (event.tag.startsWith('connector-sync:')) {
 *     event.waitUntil(handleBackgroundSync(event.tag))
 *   }
 * })
 * ```
 */
export async function handleBackgroundSync(tag: string): Promise<void> {
  const prefix = 'connector-sync:'
  if (!tag.startsWith(prefix)) {
    return
  }

  const connectorId = tag.slice(prefix.length)
  log.info(`Handling background sync for connector: ${connectorId}`)

  await SyncEngine.sync(connectorId)
}
