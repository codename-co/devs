# DEVS Collaboration Architecture

## Executive Summary

Adding collaboration to DEVS while preserving its core principles (privacy-first, browser-native, no mandatory server dependencies) requires a **Local-First Architecture** with optional, pluggable sync backends.

---

## Status

> Last updated: January 4, 2026

### Phase 1: Foundation ✅ COMPLETE

#### 1.1 User Identity System

- [x] Create `src/lib/identity/user-identity.ts` - Keypair generation using Web Crypto API
- [x] Create `src/lib/identity/device-identity.ts` - Device registration and management
- [x] Create `src/lib/identity/key-exchange.ts` - X25519 ECDH key exchange
- [x] Create `src/lib/identity/index.ts` - Module exports
- [x] Create `src/stores/identityStore.ts` - Zustand store with IndexedDB persistence
- [x] Unit tests for identity system

#### 1.2 CRDT-Based Data Layer

- [x] Install Yjs (`yjs`, `y-indexeddb`, `y-webrtc`)
- [x] Create `src/lib/sync/crdt-adapter.ts` - Yjs integration layer
- [x] Create syncable store wrapper pattern
- [x] Unit tests for CRDT operations

#### 1.3 Sync Provider Abstraction

- [x] Create `src/lib/sync/providers/provider-interface.ts` - SyncProvider interface
- [x] Create `src/lib/sync/providers/p2p-provider.ts` - WebRTC P2P provider
- [x] Create `src/lib/sync/sync-engine.ts` - Core sync orchestration
- [x] Create `src/stores/syncStore.ts` - Sync state management
- [x] Unit tests for sync engine

#### 1.4 E2E Encryption

- [x] Create `src/lib/sync/encryption.ts` - AES-GCM-256 encryption utilities
- [x] Workspace key generation and management
- [x] Unit tests for encryption

### Phase 2: Cloud Storage ⏸️ SKIPPED (for now)

#### 2.1 RemoteStorage Provider

- [ ] Create `src/lib/sync/providers/remote-storage.ts`
- [ ] OAuth flow implementation
- [ ] Unit tests

#### 2.2 Dropbox Provider

- [ ] Create `src/lib/sync/providers/dropbox-provider.ts`
- [ ] OAuth flow implementation
- [ ] Unit tests

#### 2.3 Google Drive Provider

- [ ] Create `src/lib/sync/providers/google-drive.ts`
- [ ] OAuth flow implementation
- [ ] Unit tests

#### 2.4 WebDAV Provider

- [ ] Create `src/lib/sync/providers/webdav-provider.ts`
- [ ] Basic auth implementation
- [ ] Unit tests

### Phase 3: Real-Time Collaboration ✅ COMPLETE

#### 3.1 P2P Infrastructure

- [x] WebRTC room management via y-webrtc
- [x] Signaling server configuration
- [x] ICE server configuration for NAT traversal

#### 3.2 Workspace & Permission Model

- [x] Create `src/lib/collaboration/workspace-manager.ts` - Workspace CRUD
- [x] Create `src/lib/collaboration/permission-engine.ts` - Access control
- [x] Create `src/stores/workspaceStore.ts` - Workspace state management
- [x] Unit tests for workspace manager

#### 3.3 Presence & Awareness System

- [x] Create `src/lib/collaboration/awareness-manager.ts` - Yjs awareness protocol
- [x] Create `src/stores/presenceStore.ts` - Collaborator presence state
- [x] Real-time cursor positions
- [x] Typing indicators
- [x] View tracking (which conversation/agent user is viewing)

#### 3.4 Invitation System

- [x] Create `src/lib/collaboration/invite-service.ts` - Invitation handling
- [x] Invite link generation and validation
- [x] Role-based access (owner, editor, viewer)

#### 3.5 Collaboration UI Components

- [x] Create `src/components/Collaboration/index.ts` - Module exports
- [x] Create `src/components/Collaboration/CollaboratorAvatars.tsx`
- [x] Create `src/components/Collaboration/PresenceIndicator.tsx`
- [x] Create `src/components/Collaboration/CollaboratorCursor.tsx`
- [x] Create `src/components/Collaboration/CursorOverlay.tsx`
- [x] Create `src/components/Collaboration/ShareDialog.tsx`
- [x] Create `src/components/Collaboration/WorkspaceSwitcher.tsx`
- [x] Create `src/components/Collaboration/InviteFlow.tsx`
- [x] Create `src/components/Collaboration/SyncStatusIndicator.tsx`
- [x] Create `src/components/Collaboration/TypingIndicator.tsx`
- [x] Create `src/components/Collaboration/ActivityFeed.tsx`

#### 3.6 Collaborative Execution

- [x] Create `src/lib/collaboration/collaborative-execution.ts`
- [x] Multi-user agent interaction support
- [x] Execution visibility controls
- [x] Intervention permissions

#### 3.7 UI Integration

- [x] Integrate `WorkspaceSwitcher` into AppDrawer
- [x] Integrate `SyncStatusIndicator` into AppDrawer
- [x] Integrate `ShareDialog` via Quick Actions menu
- [x] Integrate `CollaboratorAvatars` into conversation header
- [x] Integrate `TypingIndicator` into conversation page
- [x] Integrate `ActivityFeed` into AppDrawer (collapsible section)
- [x] Create `src/hooks/useCollaboration.ts` - Collaboration state hook
- [x] Create `src/hooks/useTypingUsers.ts` - Typing indicator hook
- [x] Add i18n translations for collaboration UI

### Phase 4: Polish & Advanced 🔲 NOT STARTED

#### 4.1 Conflict Resolution UI

- [ ] Create `src/components/Collaboration/ConflictResolver.tsx`
- [ ] Semantic conflict detection
- [ ] Manual resolution interface

#### 4.2 Performance Optimization

- [ ] Delta sync implementation
- [ ] Compression for sync payloads
- [ ] Smart batching of changes
- [ ] Bandwidth monitoring

#### 4.3 Identity UI

- [ ] Create `src/components/Identity/IdentitySetup.tsx`
- [ ] Create `src/components/Identity/DeviceManager.tsx`
- [ ] Create `src/components/Identity/IdentityExport.tsx`
- [ ] QR code export/import
- [ ] Recovery phrase support

#### 4.4 Settings Pages

- [ ] Create `src/pages/Settings/SyncSettings.tsx`
- [ ] Create `src/pages/Settings/WorkspaceSettings.tsx`
- [ ] Provider configuration UI

---

## Current State Analysis

| Aspect        | Current                   | Limitation              |
| ------------- | ------------------------- | ----------------------- |
| Data Storage  | IndexedDB (single device) | No cross-device access  |
| Identity      | None                      | No user concept         |
| Sync          | None                      | Data siloed per browser |
| Collaboration | None                      | Single-user only        |

---

## Proposed Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DEVS Collaboration Layer                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐  │
│  │   Device A  │    │   Device B  │    │   Device C  │    │   Device D  │  │
│  │  (User 1)   │    │  (User 1)   │    │  (User 2)   │    │  (User 2)   │  │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘    └──────┬──────┘  │
│         │                  │                  │                  │         │
│         └────────┬─────────┴─────────┬────────┴─────────┬────────┘         │
│                  │                   │                  │                  │
│         ┌────────▼────────┐ ┌────────▼────────┐ ┌───────▼────────┐        │
│         │  Sync Engine    │ │  CRDT Engine    │ │  E2E Encryption │        │
│         │  (Pluggable)    │ │  (Yjs/Automerge)│ │  (Web Crypto)   │        │
│         └────────┬────────┘ └────────┬────────┘ └───────┬────────┘        │
│                  │                   │                  │                  │
│         ┌────────▼───────────────────▼──────────────────▼────────┐        │
│         │              Sync Provider Abstraction                  │        │
│         └────────┬──────────┬──────────┬──────────┬──────────────┘        │
│                  │          │          │          │                        │
│         ┌────────▼──┐ ┌─────▼────┐ ┌───▼───┐ ┌────▼─────┐                 │
│         │   P2P     │ │  Cloud   │ │ Self- │ │  Managed │                 │
│         │  WebRTC   │ │ Storage  │ │ Hosted│ │  Service │                 │
│         │           │ │ (BYOS)   │ │       │ │(Optional)│                 │
│         └───────────┘ └──────────┘ └───────┘ └──────────┘                 │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Feature Breakdown

### Phase 1: Foundation (Multi-Device Sync for Single User)

#### 1.1 User Identity System

```typescript
interface UserIdentity {
  id: string // Derived from cryptographic keypair
  publicKey: CryptoKey // For encryption & verification
  privateKey: CryptoKey // Never leaves device, stored encrypted
  displayName?: string
  avatar?: string
  createdAt: Date
}

interface DeviceIdentity {
  id: string
  userId: string
  name: string // "MacBook Pro", "iPhone", etc.
  lastSeen: Date
  publicKey: CryptoKey // Device-specific key for P2P auth
}
```

**Implementation Notes:**

- Generate keypair on first launch using Web Crypto API
- User ID = hash of public key (self-sovereign identity)
- Export/import identity via QR code, file, or mnemonic phrase
- No central authority needed for identity

#### 1.2 CRDT-Based Data Layer

Replace direct IndexedDB writes with CRDT operations for conflict-free merging.

```typescript
// New data layer architecture
interface SyncableStore<T> {
  // Local operations (optimistic, immediate)
  create(item: T): Promise<string>
  update(id: string, changes: Partial<T>): Promise<void>
  delete(id: string): Promise<void>

  // Sync operations
  getChangesSince(timestamp: number): CRDTChangeset
  applyChanges(changes: CRDTChangeset): Promise<void>

  // Conflict resolution
  onConflict?: (local: T, remote: T) => T
}

// Entities requiring sync
type SyncableEntities =
  | 'agents' // Custom agents
  | 'conversations' // Chat history
  | 'messages' // Individual messages
  | 'workflows' // Task workflows
  | 'artifacts' // Generated content
  | 'knowledge' // Knowledge base items
  | 'memories' // Agent memories
  | 'settings' // User preferences
```

**CRDT Library Choice: Yjs**

- Battle-tested, excellent for rich text & complex structures
- Smaller bundle size
- Built-in WebRTC integration
- Great TypeScript support

#### 1.3 Sync Provider Abstraction

```typescript
interface SyncProvider {
  readonly id: string
  readonly name: string
  readonly type: 'p2p' | 'cloud' | 'server'

  // Lifecycle
  connect(): Promise<void>
  disconnect(): Promise<void>
  isConnected(): boolean

  // Sync operations
  push(changes: EncryptedChangeset): Promise<void>
  pull(): Promise<EncryptedChangeset[]>
  subscribe(callback: (changes: EncryptedChangeset) => void): Unsubscribe

  // Status
  getSyncStatus(): SyncStatus
  getLastSyncTime(): Date | null
}

interface SyncStatus {
  state: 'synced' | 'syncing' | 'offline' | 'error'
  pendingChanges: number
  connectedPeers?: number // For P2P
  lastError?: Error
}
```

#### 1.4 Cloud Storage Providers (BYOS - Bring Your Own Storage)

| Provider          | Method            | Pros                           | Cons                      |
| ----------------- | ----------------- | ------------------------------ | ------------------------- |
| **RemoteStorage** | Open protocol     | Privacy-focused, self-hostable | Limited adoption          |
| **Dropbox**       | Dropbox API       | Reliable, good API             | Requires app registration |
| **Google Drive**  | Google Drive API  | Widely used                    | Google account required   |
| **OneDrive**      | Microsoft Graph   | Business users                 | Complex auth              |
| **WebDAV**        | Standard protocol | Self-hostable                  | Setup required            |
| **S3-Compatible** | AWS SDK           | Flexible                       | Technical users           |

**Implementation Priority:**

1. RemoteStorage (open standard, privacy-aligned)
2. Dropbox (widely accessible)
3. Google Drive (ubiquitous)
4. WebDAV (self-host option)

---

### Phase 2: Real-Time Collaboration (Multi-User)

#### 2.1 P2P Infrastructure

```typescript
interface P2PConfig {
  // Signaling (only for connection establishment)
  signalingServers: string[] // Can use public or self-hosted

  // TURN servers for NAT traversal
  iceServers: RTCIceServer[]

  // Room/workspace concept
  roomId: string // Derived from shared secret
}

interface CollaborationSession {
  id: string
  workspaceId: string
  participants: Participant[]
  sharedEntities: EntityScope[]
  createdAt: Date
  expiresAt?: Date
}

interface Participant {
  userId: string
  deviceId: string
  displayName: string
  avatar?: string
  role: 'owner' | 'editor' | 'viewer'
  presence: PresenceState
  cursor?: CursorPosition // For real-time cursors
}

interface PresenceState {
  status: 'online' | 'away' | 'offline'
  lastActive: Date
  currentView?: string // Which page/conversation they're viewing
}
```

#### 2.2 Workspace & Permission Model

```typescript
interface Workspace {
  id: string
  name: string
  ownerId: string

  // What's shared
  sharedAgents: string[] // Agent IDs
  sharedConversations: string[] // Conversation IDs
  sharedKnowledge: string[] // Knowledge item IDs

  // Access control
  members: WorkspaceMember[]
  inviteLinks: InviteLink[]

  // Sync settings
  syncEnabled: boolean
  syncProviders: string[] // Which providers sync this workspace

  createdAt: Date
  updatedAt: Date
}

interface WorkspaceMember {
  userId: string
  role: 'owner' | 'admin' | 'editor' | 'viewer'
  joinedAt: Date
  invitedBy: string
}

interface InviteLink {
  id: string
  token: string // Share via link
  role: 'editor' | 'viewer'
  expiresAt?: Date
  maxUses?: number
  usedCount: number
}
```

#### 2.3 Granular Sharing Controls

```typescript
type ShareScope =
  | { type: 'workspace'; workspaceId: string }
  | { type: 'conversation'; conversationId: string }
  | { type: 'agent'; agentId: string }
  | { type: 'knowledge'; knowledgeId: string }

interface ShareSettings {
  scope: ShareScope
  permissions: Permission[]
  inheritFromWorkspace: boolean
}

type Permission =
  | 'read' // View content
  | 'write' // Modify content
  | 'delete' // Remove content
  | 'share' // Invite others
  | 'manage' // Change permissions
  | 'execute' // Run agents (important for agents with tools)
```

---

### Phase 3: Advanced Collaboration Features

#### 3.1 Real-Time Features

```typescript
// Presence & Awareness
interface AwarenessState {
  user: {
    id: string
    name: string
    color: string // For cursor/selection highlighting
  }
  cursor?: {
    conversationId?: string
    messageId?: string
    position?: number
  }
  selection?: {
    start: number
    end: number
  }
  typing?: boolean
  viewingAgent?: string
}

// Collaborative Editing
interface CollaborativeMessage {
  id: string
  content: Y.Text // Yjs collaborative text
  authorId: string
  contributors: string[] // All who edited
  versions: MessageVersion[]
}
```

#### 3.2 Collaboration UI Components

| Component                 | Purpose                           |
| ------------------------- | --------------------------------- |
| `<PresenceIndicator />`   | Show who's online                 |
| `<CollaboratorCursor />`  | Show others' cursors              |
| `<ShareDialog />`         | Manage sharing settings           |
| `<WorkspaceSwitcher />`   | Switch between workspaces         |
| `<InviteFlow />`          | Invite collaborators              |
| `<SyncStatusIndicator />` | Show sync state                   |
| `<ConflictResolver />`    | Manual conflict resolution (rare) |
| `<ActivityFeed />`        | Show recent collaborator actions  |

#### 3.3 Collaborative Agent Execution

```typescript
interface CollaborativeExecution {
  // When multiple users interact with same agent
  executionId: string
  conversationId: string
  initiatedBy: string
  participants: string[] // Who can see/interact

  // Execution control
  canIntervene: string[] // Who can pause/stop
  canApprove: string[] // Who can approve actions

  // Real-time visibility
  streamToAll: boolean // Stream responses to all participants
}
```

---

## Security Architecture

### End-to-End Encryption

```typescript
interface EncryptionScheme {
  // Per-workspace symmetric key (shared with members)
  workspaceKey: CryptoKey // AES-GCM-256

  // Key exchange for new members
  keyExchange: 'X25519' // ECDH key exchange

  // Encryption flow
  // 1. Generate workspace key on creation
  // 2. Encrypt workspace key with each member's public key
  // 3. Members decrypt workspace key with their private key
  // 4. All workspace data encrypted with workspace key
}

interface EncryptedPayload {
  ciphertext: ArrayBuffer
  iv: Uint8Array // Initialization vector
  tag: Uint8Array // Authentication tag
  keyId: string // Which key version
}

// Key rotation
interface KeyRotation {
  trigger: 'member_removed' | 'scheduled' | 'manual'
  newKey: CryptoKey
  reEncryptData: boolean // Re-encrypt existing data
}
```

### Zero-Knowledge Sync

For cloud storage providers:

1. All data encrypted client-side before upload
2. Provider sees only encrypted blobs
3. Filenames are also encrypted/hashed
4. Provider cannot read any user data

---

## Data Migration Plan

### From Current Schema to Sync-Enabled

```typescript
// Migration steps
const migrationPlan = {
  version: 2,
  steps: [
    // 1. Add sync metadata to existing entities
    {
      name: 'add_sync_metadata',
      entities: ['agents', 'conversations', 'messages', 'knowledge'],
      changes: {
        add: {
          _syncId: 'string', // Global unique ID
          _lastModified: 'number', // Lamport timestamp
          _version: 'number', // Vector clock
          _deleted: 'boolean', // Soft delete for sync
        },
      },
    },

    // 2. Create user identity
    {
      name: 'create_identity',
      action: 'generate_keypair_if_missing',
    },

    // 3. Create default workspace
    {
      name: 'create_default_workspace',
      action: 'wrap_existing_data_in_personal_workspace',
    },

    // 4. Initialize CRDT state
    {
      name: 'initialize_crdt',
      action: 'convert_entities_to_crdt_docs',
    },
  ],
}
```

---

## Implementation Phases

### Phase 1: Foundation (8-10 weeks)

| Week | Task                                | Deliverables                               |
| ---- | ----------------------------------- | ------------------------------------------ |
| 1-2  | User Identity System                | Keypair generation, identity export/import |
| 3-4  | CRDT Integration                    | Yjs setup, store abstraction layer         |
| 5-6  | First Sync Provider (RemoteStorage) | Basic sync working                         |
| 7-8  | E2E Encryption                      | Workspace key management                   |
| 9-10 | Multi-device UX                     | Device management UI, sync status          |

### Phase 2: Cloud Storage (4-6 weeks)

| Week | Task                  | Deliverables                    |
| ---- | --------------------- | ------------------------------- |
| 1-2  | Dropbox Provider      | OAuth flow, sync implementation |
| 3-4  | Google Drive Provider | Same for Google                 |
| 5-6  | Provider Settings UI  | Configure and manage providers  |

### Phase 3: Real-Time Collaboration (6-8 weeks)

| Week | Task                 | Deliverables                  |
| ---- | -------------------- | ----------------------------- |
| 1-2  | P2P Infrastructure   | WebRTC setup, room management |
| 3-4  | Workspace & Sharing  | Workspace model, permissions  |
| 5-6  | Presence & Awareness | Online indicators, cursors    |
| 7-8  | Collaborative UX     | Share dialogs, activity feed  |

### Phase 4: Polish & Advanced (4-6 weeks)

| Week | Task                          | Deliverables                  |
| ---- | ----------------------------- | ----------------------------- |
| 1-2  | Conflict Resolution UI        | Handle edge cases gracefully  |
| 3-4  | Collaborative Agent Execution | Multi-user agent interactions |
| 5-6  | Performance Optimization      | Sync efficiency, bandwidth    |

---

## New File Structure

```
src/
├── lib/
│   ├── sync/
│   │   ├── index.ts                    # Sync engine exports
│   │   ├── sync-engine.ts              # Core sync orchestration
│   │   ├── crdt-adapter.ts             # Yjs integration
│   │   ├── encryption.ts               # E2E encryption utilities
│   │   ├── providers/
│   │   │   ├── index.ts
│   │   │   ├── provider-interface.ts   # SyncProvider interface
│   │   │   ├── p2p-provider.ts         # WebRTC P2P
│   │   │   ├── remote-storage.ts       # RemoteStorage
│   │   │   ├── dropbox-provider.ts     # Dropbox
│   │   │   ├── google-drive.ts         # Google Drive
│   │   │   └── webdav-provider.ts      # WebDAV
│   │   └── conflict-resolution.ts      # CRDT conflict handlers
│   │
│   ├── identity/
│   │   ├── index.ts
│   │   ├── user-identity.ts            # User keypair management
│   │   ├── device-identity.ts          # Device registration
│   │   └── key-exchange.ts             # Key sharing for workspaces
│   │
│   └── collaboration/
│       ├── index.ts
│       ├── workspace-manager.ts        # Workspace CRUD
│       ├── permission-engine.ts        # Access control
│       ├── presence-manager.ts         # Online status, cursors
│       └── invite-service.ts           # Invitation handling
│
├── stores/
│   ├── identityStore.ts                # User/device identity
│   ├── workspaceStore.ts               # Workspaces
│   ├── syncStore.ts                    # Sync state & status
│   └── presenceStore.ts                # Collaborator presence
│
├── components/
│   ├── Sync/
│   │   ├── SyncStatusIndicator.tsx
│   │   ├── SyncSettings.tsx
│   │   └── ProviderSetup.tsx
│   │
│   ├── Collaboration/
│   │   ├── PresenceIndicator.tsx
│   │   ├── CollaboratorAvatars.tsx
│   │   ├── ShareDialog.tsx
│   │   ├── WorkspaceSwitcher.tsx
│   │   └── InviteFlow.tsx
│   │
│   └── Identity/
│       ├── IdentitySetup.tsx
│       ├── DeviceManager.tsx
│       └── IdentityExport.tsx
│
└── pages/
    ├── Settings/
    │   ├── SyncSettings.tsx
    │   └── WorkspaceSettings.tsx
    └── Workspace/
        └── index.tsx                   # Workspace management page
```

---

## Technical Decisions Summary

| Decision            | Choice                                         | Rationale                                  |
| ------------------- | ---------------------------------------------- | ------------------------------------------ |
| CRDT Library        | **Yjs**                                        | Smaller bundle, WebRTC integration, proven |
| Identity            | **Self-sovereign (keypair)**                   | No central authority, privacy-preserving   |
| Encryption          | **AES-GCM-256 + X25519**                       | Web Crypto API native, secure              |
| First Sync Provider | **RemoteStorage**                              | Open standard, aligns with values          |
| P2P Signaling       | **Self-hostable + public fallbacks**           | Flexibility for privacy                    |
| Conflict Resolution | **CRDT automatic + UI for semantic conflicts** | Best UX                                    |

---

## Privacy Preservation Guarantees

1. **Encryption by Default** - All synced data is E2E encrypted
2. **No Metadata Leakage** - Filenames and structure encrypted
3. **User-Controlled Storage** - Bring your own storage option
4. **Local-First** - Works fully offline, sync is optional
5. **No Tracking** - No analytics on synced content
6. **Key Custody** - Users control their encryption keys
7. **Open Source** - Cryptographic implementation auditable

---

## Testing Strategy

Following the project's TDD mandate:

### Unit Tests (src/test/)

- `identity.test.ts` - Keypair generation, export/import
- `encryption.test.ts` - E2E encryption/decryption
- `crdt-adapter.test.ts` - CRDT operations and merging
- `sync-engine.test.ts` - Sync orchestration
- `workspace-manager.test.ts` - Workspace CRUD
- `permission-engine.test.ts` - Access control logic

### Integration Tests

- Provider connectivity tests
- Multi-device sync scenarios
- Conflict resolution flows

### E2E Tests (tests/e2e/)

- Identity setup flow
- Device linking
- Workspace sharing
- Real-time collaboration

---

## Open Questions

1. **Offline Duration**: How long can devices be offline before conflicts become complex?
   - _Recommendation_: CRDT handles most cases; surface significant semantic conflicts to user

2. **Key Recovery**: What if user loses all devices?
   - _Recommendation_: Optional encrypted backup to cloud provider, recovery phrase

3. **Workspace Limits**: Max collaborators per workspace?
   - _Recommendation_: Start with 10 for P2P performance, no limit for server-based

4. **Data Retention**: How long to keep deleted items for sync?
   - _Recommendation_: 30 days tombstones, then permanent delete

5. **Bandwidth Optimization**: How to minimize sync traffic?
   - _Recommendation_: Delta sync, compression, smart batching
