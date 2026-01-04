/**
 * Sync Provider Interface
 * Abstract interface for different sync backends
 */

import type { SyncStatus, SyncProviderType, EncryptedPayload } from '@/types'

/**
 * Base interface for all sync providers
 */
export interface SyncProvider {
  /** Unique identifier for this provider instance */
  readonly id: string

  /** Human-readable name */
  readonly name: string

  /** Provider type */
  readonly type: SyncProviderType

  // Lifecycle

  /** Connect to the sync backend */
  connect(): Promise<void>

  /** Disconnect from the sync backend */
  disconnect(): Promise<void>

  /** Check if currently connected */
  isConnected(): boolean

  // Sync operations

  /** Push encrypted changes to the backend */
  push(workspaceId: string, changes: EncryptedPayload): Promise<void>

  /** Pull encrypted changes from the backend */
  pull(workspaceId: string): Promise<EncryptedPayload[]>

  /** Subscribe to real-time changes */
  subscribe(
    workspaceId: string,
    callback: (changes: EncryptedPayload) => void,
  ): () => void

  // Status

  /** Get current sync status */
  getSyncStatus(): SyncStatus

  /** Get last successful sync time */
  getLastSyncTime(): Date | null

  // Events

  /** Register event listener */
  on(event: SyncProviderEvent, callback: SyncProviderEventCallback): void

  /** Remove event listener */
  off(event: SyncProviderEvent, callback: SyncProviderEventCallback): void
}

/**
 * Events emitted by sync providers
 */
export type SyncProviderEvent =
  | 'connected'
  | 'disconnected'
  | 'sync_start'
  | 'sync_complete'
  | 'sync_error'
  | 'peer_joined'
  | 'peer_left'

export type SyncProviderEventCallback = (data?: unknown) => void

/**
 * Configuration for sync providers
 */
export interface SyncProviderConfig {
  /** Auto-reconnect on disconnect */
  autoReconnect?: boolean

  /** Reconnect delay in ms */
  reconnectDelay?: number

  /** Max reconnect attempts */
  maxReconnectAttempts?: number

  /** Sync interval for polling providers (ms) */
  syncInterval?: number
}

/**
 * P2P-specific configuration
 */
export interface P2PProviderConfig extends SyncProviderConfig {
  /** Signaling servers for WebRTC */
  signalingServers?: string[]

  /** ICE servers for NAT traversal */
  iceServers?: RTCIceServer[]

  /** Room password for encryption */
  roomPassword?: string
}

/**
 * Cloud storage provider configuration
 */
export interface CloudProviderConfig extends SyncProviderConfig {
  /** OAuth access token */
  accessToken?: string

  /** Refresh token for token renewal */
  refreshToken?: string

  /** Base path in cloud storage */
  basePath?: string
}

/**
 * Factory function type for creating providers
 */
export type SyncProviderFactory = (config: SyncProviderConfig) => SyncProvider
