/**
 * Collaboration Types for DEVS
 *
 * Type definitions for the real-time collaboration system including
 * identity management, workspaces, sync, presence, and permissions.
 */

// ============================================================================
// Identity Types
// ============================================================================

/**
 * Represents a user's identity in the collaboration system.
 * The ID is derived from a hash of the user's public key for decentralized identity.
 */
export interface UserIdentity {
  /** Unique identifier derived from hash of public key */
  id: string
  /** Base64 encoded public key for serialization */
  publicKey: string
  /** User's chosen display name */
  displayName?: string
  /** URL or data URI for user's avatar */
  avatar?: string
  /** When the identity was created */
  createdAt: Date
}

/**
 * Represents a device associated with a user's identity.
 * Each device has its own key pair for secure communication.
 */
export interface DeviceIdentity {
  /** Unique device identifier */
  id: string
  /** ID of the user who owns this device */
  userId: string
  /** Human-readable device name (e.g., "MacBook Pro", "iPhone") */
  name: string
  /** Last time this device was seen online */
  lastSeen: Date
  /** Base64 encoded public key for this device */
  publicKey: string
}

/**
 * Extended user identity with runtime CryptoKey objects.
 * Used during active sessions where cryptographic operations are needed.
 */
export interface UserIdentityWithKeys extends UserIdentity {
  /** Web Crypto API public key object */
  publicCryptoKey: CryptoKey
  /** Web Crypto API private key object (never serialized) */
  privateCryptoKey: CryptoKey
}

// ============================================================================
// Workspace Types
// ============================================================================

/**
 * Role levels for workspace members with hierarchical permissions.
 * - owner: Full control including deletion
 * - admin: Can manage members and settings
 * - editor: Can create and modify content
 * - viewer: Read-only access
 */
export type WorkspaceRole = 'owner' | 'admin' | 'editor' | 'viewer'

/**
 * Represents a member of a workspace with their role and metadata.
 */
export interface WorkspaceMember {
  /** ID of the user who is a member */
  userId: string
  /** Member's role in the workspace */
  role: WorkspaceRole
  /** When the member joined the workspace */
  joinedAt: Date
  /** ID of the user who invited this member */
  invitedBy: string
}

/**
 * Invitation link for sharing workspace access.
 * Can be limited by expiration time and/or maximum uses.
 */
export interface InviteLink {
  /** Unique identifier for the invite */
  id: string
  /** Secret token used in the invite URL */
  token: string
  /** Role that will be assigned to users who accept this invite */
  role: 'editor' | 'viewer'
  /** Optional expiration date for the invite */
  expiresAt?: Date
  /** Optional maximum number of times this invite can be used */
  maxUses?: number
  /** Number of times this invite has been used */
  usedCount: number
  /** When the invite was created */
  createdAt: Date
}

/**
 * A collaborative workspace containing shared agents, conversations, and knowledge.
 * Workspaces enable multi-user collaboration with role-based access control.
 */
export interface Workspace {
  /** Unique workspace identifier */
  id: string
  /** Human-readable workspace name */
  name: string
  /** ID of the workspace owner */
  ownerId: string
  /** IDs of agents shared in this workspace */
  sharedAgents: string[]
  /** IDs of conversations shared in this workspace */
  sharedConversations: string[]
  /** IDs of knowledge items shared in this workspace */
  sharedKnowledge: string[]
  /** List of workspace members */
  members: WorkspaceMember[]
  /** Active invite links for this workspace */
  inviteLinks: InviteLink[]
  /** Whether real-time sync is enabled */
  syncEnabled: boolean
  /** IDs of sync providers configured for this workspace */
  syncProviders: string[]
  /** When the workspace was created */
  createdAt: Date
  /** When the workspace was last updated */
  updatedAt: Date
}

// ============================================================================
// Sync Types
// ============================================================================

/**
 * Current state of synchronization.
 * - synced: All changes are synchronized
 * - syncing: Synchronization in progress
 * - offline: No network connection
 * - error: Sync failed, see lastError for details
 */
export type SyncState = 'synced' | 'syncing' | 'offline' | 'error'

/**
 * Type of sync provider used for data synchronization.
 * - p2p: Peer-to-peer via WebRTC
 * - cloud: Cloud storage (e.g., S3, GCS)
 * - server: Dedicated sync server
 */
export type SyncProviderType = 'p2p' | 'cloud' | 'server'

/**
 * Current synchronization status with detailed information.
 */
export interface SyncStatus {
  /** Current sync state */
  state: SyncState
  /** Number of local changes waiting to be synced */
  pendingChanges: number
  /** Number of connected peers (for P2P sync) */
  connectedPeers?: number
  /** Error message if state is 'error' */
  lastError?: string
  /** Timestamp of last successful sync */
  lastSyncTime?: Date
}

/**
 * Encrypted data payload for secure sync.
 * Uses AES-GCM encryption with per-workspace keys.
 */
export interface EncryptedPayload {
  /** Base64 encoded encrypted data */
  ciphertext: string
  /** Base64 encoded initialization vector */
  iv: string
  /** Identifier of the encryption key used */
  keyId: string
}

/**
 * Metadata attached to syncable entities for CRDT-based conflict resolution.
 * Uses Lamport timestamps for causal ordering.
 */
export interface SyncMetadata {
  /** Unique identifier for this sync record */
  _syncId: string
  /** Lamport timestamp for ordering */
  _lastModified: number
  /** Version number for optimistic concurrency */
  _version: number
  /** Soft delete flag for tombstone records */
  _deleted: boolean
}

// ============================================================================
// Presence Types
// ============================================================================

/**
 * User's online status.
 * - online: Actively using the application
 * - away: Idle or backgrounded
 * - offline: Not connected
 */
export type PresenceStatus = 'online' | 'away' | 'offline'

/**
 * Current presence state for a user.
 */
export interface PresenceState {
  /** Current online status */
  status: PresenceStatus
  /** Last activity timestamp */
  lastActive: Date
  /** Current view or page the user is on */
  currentView?: string
}

/**
 * Represents a participant in a collaboration session.
 * Combines identity, role, and presence information.
 */
export interface Participant {
  /** User's unique identifier */
  userId: string
  /** Device identifier for this participant */
  deviceId: string
  /** Display name shown to other participants */
  displayName: string
  /** Optional avatar URL */
  avatar?: string
  /** Participant's role in the workspace */
  role: WorkspaceRole
  /** Current presence state */
  presence: PresenceState
  /** Color assigned for cursor highlighting and attribution */
  color: string
}

/**
 * Yjs awareness state for real-time collaboration.
 * Shared across all connected clients for cursor tracking and typing indicators.
 */
export interface AwarenessState {
  /** Basic user identification */
  user: {
    /** User's unique identifier */
    id: string
    /** Display name */
    name: string
    /** Assigned color for visual identification */
    color: string
  }
  /** Cursor position information */
  cursor?: {
    /** ID of conversation being viewed */
    conversationId?: string
    /** ID of message cursor is on */
    messageId?: string
    /** Character position within content */
    position?: number
  }
  /** Whether the user is currently typing */
  typing?: boolean
  /** ID of agent currently being viewed/edited */
  viewingAgent?: string
  /** Presence state (online/away/offline) */
  presence?: PresenceState
}

// ============================================================================
// Permission Types
// ============================================================================

/**
 * Available permission levels for shared resources.
 * - read: View content
 * - write: Create and modify content
 * - delete: Remove content
 * - share: Share with other users
 * - manage: Manage permissions and settings
 * - execute: Run agents and workflows
 */
export type Permission = 'read' | 'write' | 'delete' | 'share' | 'manage' | 'execute'

/**
 * Defines the scope of a share action.
 * Supports workspace-level or resource-specific sharing.
 */
export type ShareScope =
  | { type: 'workspace'; workspaceId: string }
  | { type: 'conversation'; conversationId: string }
  | { type: 'agent'; agentId: string }
  | { type: 'knowledge'; knowledgeId: string }

/**
 * Configuration for sharing a resource.
 * Defines what permissions are granted and whether workspace defaults apply.
 */
export interface ShareSettings {
  /** The scope of this share configuration */
  scope: ShareScope
  /** List of permissions granted */
  permissions: Permission[]
  /** Whether to inherit permissions from workspace settings */
  inheritFromWorkspace: boolean
}

// ============================================================================
// Collaboration Session Types
// ============================================================================

/**
 * Represents an active collaboration session.
 * Sessions track who is currently collaborating on a workspace.
 */
export interface CollaborationSession {
  /** Unique session identifier */
  id: string
  /** ID of the workspace this session belongs to */
  workspaceId: string
  /** List of currently connected participants */
  participants: Participant[]
  /** When the session was created */
  createdAt: Date
  /** Optional session expiration time */
  expiresAt?: Date
}

/**
 * Configuration for collaborative agent execution.
 * Allows multiple users to observe and interact with agent execution.
 */
export interface CollaborativeExecution {
  /** Unique execution identifier */
  executionId: string
  /** ID of the conversation where execution is happening */
  conversationId: string
  /** ID of the workspace */
  workspaceId: string
  /** User ID of who started the execution */
  initiatedBy: string
  /** User IDs of all participants observing */
  participants: string[]
  /** User IDs who can pause/stop execution */
  canIntervene: string[]
  /** User IDs who can approve tool calls */
  canApprove: string[]
  /** Whether to stream output to all participants */
  streamToAll: boolean
  /** Execution status */
  status: 'pending' | 'running' | 'paused' | 'completed' | 'cancelled'
  /** When execution started */
  startedAt?: Date
  /** When execution completed */
  completedAt?: Date
}
