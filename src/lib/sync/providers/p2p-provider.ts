/**
 * P2P Sync Provider using WebRTC
 * Enables real-time peer-to-peer synchronization
 */

import { WebrtcProvider } from 'y-webrtc'
import * as Y from 'yjs'
import type { SyncStatus, EncryptedPayload } from '@/types'
import type { 
  SyncProvider, 
  P2PProviderConfig, 
  SyncProviderEvent, 
  SyncProviderEventCallback 
} from './provider-interface'

const DEFAULT_SIGNALING_SERVERS = [
  'wss://signaling.yjs.dev',
  'wss://y-webrtc-signaling-eu.herokuapp.com',
  'wss://y-webrtc-signaling-us.herokuapp.com'
]

const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' }
]

export class P2PProvider implements SyncProvider {
  readonly id: string
  readonly name = 'P2P WebRTC'
  readonly type = 'p2p' as const
  
  private config: P2PProviderConfig
  private providers: Map<string, WebrtcProvider> = new Map()
  private docs: Map<string, Y.Doc> = new Map()
  private connected = false
  private lastSyncTime: Date | null = null
  private eventListeners: Map<SyncProviderEvent, Set<SyncProviderEventCallback>> = new Map()
  
  constructor(config: P2PProviderConfig = {}) {
    this.id = `p2p-${crypto.randomUUID().slice(0, 8)}`
    this.config = {
      autoReconnect: true,
      reconnectDelay: 1000,
      maxReconnectAttempts: 5,
      signalingServers: DEFAULT_SIGNALING_SERVERS,
      iceServers: DEFAULT_ICE_SERVERS,
      ...config
    }
  }
  
  async connect(): Promise<void> {
    this.connected = true
    this.emit('connected')
  }
  
  async disconnect(): Promise<void> {
    // Disconnect all workspace providers
    for (const [workspaceId, provider] of this.providers) {
      provider.destroy()
      this.docs.get(workspaceId)?.destroy()
    }
    
    this.providers.clear()
    this.docs.clear()
    this.connected = false
    this.emit('disconnected')
  }
  
  isConnected(): boolean {
    return this.connected
  }
  
  async push(workspaceId: string, changes: EncryptedPayload): Promise<void> {
    // Ensure we have a provider for this workspace
    this.ensureWorkspaceProvider(workspaceId)
    
    // Store changes in the Yjs document
    const doc = this.docs.get(workspaceId)!
    const changesMap = doc.getMap<EncryptedPayload>('encrypted_changes')
    
    const changeId = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`
    changesMap.set(changeId, changes)
    
    this.lastSyncTime = new Date()
    this.emit('sync_complete')
  }
  
  async pull(workspaceId: string): Promise<EncryptedPayload[]> {
    this.ensureWorkspaceProvider(workspaceId)
    
    const doc = this.docs.get(workspaceId)!
    const changesMap = doc.getMap<EncryptedPayload>('encrypted_changes')
    
    const changes: EncryptedPayload[] = []
    changesMap.forEach((value) => {
      changes.push(value)
    })
    
    return changes
  }
  
  subscribe(
    workspaceId: string,
    callback: (changes: EncryptedPayload) => void
  ): () => void {
    this.ensureWorkspaceProvider(workspaceId)
    
    const doc = this.docs.get(workspaceId)!
    const changesMap = doc.getMap<EncryptedPayload>('encrypted_changes')
    
    const observer = (event: Y.YMapEvent<EncryptedPayload>) => {
      event.changes.keys.forEach((change, key) => {
        if (change.action === 'add' || change.action === 'update') {
          const value = changesMap.get(key)
          if (value) {
            callback(value)
          }
        }
      })
    }
    
    changesMap.observe(observer)
    
    return () => {
      changesMap.unobserve(observer)
    }
  }
  
  getSyncStatus(): SyncStatus {
    let connectedPeers = 0
    
    for (const provider of this.providers.values()) {
      // y-webrtc awareness includes self, so subtract 1
      connectedPeers += Math.max(0, provider.awareness.getStates().size - 1)
    }
    
    return {
      state: this.connected ? 'synced' : 'offline',
      pendingChanges: 0,
      connectedPeers,
      lastSyncTime: this.lastSyncTime ?? undefined
    }
  }
  
  getLastSyncTime(): Date | null {
    return this.lastSyncTime
  }
  
  on(event: SyncProviderEvent, callback: SyncProviderEventCallback): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set())
    }
    this.eventListeners.get(event)!.add(callback)
  }
  
  off(event: SyncProviderEvent, callback: SyncProviderEventCallback): void {
    this.eventListeners.get(event)?.delete(callback)
  }
  
  /**
   * Get the number of connected peers for a workspace
   */
  getPeerCount(workspaceId: string): number {
    const provider = this.providers.get(workspaceId)
    if (!provider) return 0
    return Math.max(0, provider.awareness.getStates().size - 1)
  }
  
  /**
   * Get awareness instance for presence features
   */
  getAwareness(workspaceId: string): WebrtcProvider['awareness'] | null {
    return this.providers.get(workspaceId)?.awareness ?? null
  }
  
  private ensureWorkspaceProvider(workspaceId: string): void {
    if (this.providers.has(workspaceId)) return
    
    // Create a new Yjs document for this workspace
    const doc = new Y.Doc()
    this.docs.set(workspaceId, doc)
    
    // Create WebRTC provider
    const roomName = `devs-${workspaceId}`
    const provider = new WebrtcProvider(roomName, doc, {
      signaling: this.config.signalingServers,
      password: this.config.roomPassword,
      // Note: peerOpts removed as it's handled differently in y-webrtc
    })
    
    this.providers.set(workspaceId, provider)
    
    // Set up event listeners
    provider.on('peers', (event: { added: string[]; removed: string[] }) => {
      for (const peerId of event.added) {
        this.emit('peer_joined', { workspaceId, peerId })
      }
      for (const peerId of event.removed) {
        this.emit('peer_left', { workspaceId, peerId })
      }
    })
  }
  
  private emit(event: SyncProviderEvent, data?: unknown): void {
    this.eventListeners.get(event)?.forEach(callback => callback(data))
  }
}

/**
 * Create a P2P provider instance
 */
export function createP2PProvider(config?: P2PProviderConfig): P2PProvider {
  return new P2PProvider(config)
}
