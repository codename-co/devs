# DEVS Sync Architecture

## Overview

DEVS uses a **Yjs-first architecture** where Yjs is the **single source of truth** for all application data. This approach eliminates the complexity of dual-storage sync while providing automatic CRDT-based conflict resolution and optional P2P synchronization.

### Why Yjs-First?

| Requirement       | How Yjs Delivers                                |
| ----------------- | ----------------------------------------------- |
| **Offline-first** | Full local copy via `y-indexeddb`               |
| **Privacy**       | No central server sees user data                |
| **Auto-merge**    | CRDTs = mathematically conflict-free            |
| **Simplicity**    | Single source of truth, ~200 lines of core code |
| **Reactivity**    | Components observe Yjs maps directly            |
| **Future-proof**  | P2P collaboration built-in                      |

---

## Implementation Status

> **Last updated:** February 2026

### Architecture Overview

```text
┌───────────────────────────────────────────────────────────────────┐
│                     YJS-FIRST ARCHITECTURE                       │
│                                                                  │
│   React ──► useLiveMap() ──► Yjs Y.Map ──► y-indexeddb          │
│                                   │                              │
│                                   ▼                              │
│                            y-websocket                           │
│                              (peers)                             │
│                                                                  │
│   Benefits:                                                      │
│   • Single source of truth (Yjs)                                │
│   • ~200 lines of core code                                     │
│   • CRDT handles all conflicts automatically                    │
│   • No race conditions — Yjs transactions are atomic            │
│   • Simple initialization (await whenReady)                     │
│   • No pending queues needed                                    │
└───────────────────────────────────────────────────────────────────┘
```

### High-Level Progress

| Phase                       | Status         | Description                                     |
| --------------------------- | -------------- | ----------------------------------------------- |
| **Phase 1: Yjs Core**       | ✅ Done        | Yjs document, persistence, typed maps           |
| **Phase 2: Store Refactor** | ✅ Done        | All stores use Yjs as source of truth           |
| **Phase 3: P2P Sync**       | ✅ Done        | WebSocket sync, sync UI, peer awareness         |
| **Phase 4: Relay Server**   | 🟡 Partial     | Signaling server deployed, relay server pending |
| **Phase 5: Multi-User**     | ⬜ Not Started | Workspace support                               |

### What's Working

- ✅ **Yjs-first data layer** (`src/lib/yjs/`) - Single source of truth
- ✅ **Typed Y.Maps** for all entities (agents, conversations, tasks, etc.)
- ✅ **IndexedDB persistence** via y-indexeddb
- ✅ **Reactive hooks** (`useLiveMap`, `useLiveValue`) for instant UI updates
- ✅ **WebSocket-based P2P sync** with auto-reconnect
- ✅ **Sync settings UI** with status indicator
- ✅ **Automatic data migration** from legacy IndexedDB
- ✅ **All stores refactored** to use Yjs directly
- ✅ **Yjs observers** for stores that maintain local Zustand/React state

### What's Pending

- ⬜ Cloud-hosted relay server for async sync
- ⬜ Multi-user workspace support
- ⬜ E2E tests for sync functionality

---

### Yjs Observers Pattern

Stores that maintain local state (Zustand or React `useState`) must observe Yjs maps to stay in sync when data changes from P2P sync. This ensures remote changes are reflected in the UI.

**Stores with observers:**

| Store/Hook              | Observed Maps                                           |
| ----------------------- | ------------------------------------------------------- |
| `agentStore`            | Uses `useLiveMap` (reactive by default)                 |
| `conversationStore`     | `conversations` observer                                |
| `taskStore`             | `tasks`, `artifacts` observers                          |
| `contextStore`          | `sharedContexts` observer                               |
| `llmModelStore`         | `credentials` observer                                  |
| `agentMemoryStore`      | `memoryLearningEvents`, `agentMemoryDocuments` observer |
| `userStore`             | `preferences` observer                                  |
| `connectorStore`        | `connectors`, `connectorSyncStates` observers           |
| `marketplace/store`     | `installedExtensions`, `customExtensions` observers     |
| `useStudioHistory` hook | `studioEntries` observer                                |

**Observer Pattern:**

```typescript
// At module level (store file)
function initYjsObservers(): void {
  myYjsMap.observe(() => {
    // Update Zustand state when Yjs map changes
    useMyStore.setState({ items: Array.from(myYjsMap.values()) })
  })
}
initYjsObservers()

// For React hooks (useEffect cleanup)
useEffect(() => {
  const observer = () => setItems(Array.from(myYjsMap.values()))
  myYjsMap.observe(observer)
  return () => myYjsMap.unobserve(observer)
}, [])
```

**When NOT to use observers:**

- Stores that use `useLiveMap`/`useLiveValue` hooks directly (already reactive)
- Read-only access patterns that call Yjs on-demand

---

### Core Files

| File                      | Purpose                                  |
| ------------------------- | ---------------------------------------- |
| `src/lib/yjs/doc.ts`      | Yjs document singleton with persistence  |
| `src/lib/yjs/maps.ts`     | Typed Y.Map exports for all entities     |
| `src/lib/yjs/sync.ts`     | WebSocket sync control (enable/disable)  |
| `src/lib/yjs/reactive.ts` | React hooks for Yjs observation          |
| `src/lib/yjs/migrate.ts`  | One-time migration from legacy IndexedDB |

---

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     DEFAULT STATE (Offline)                     │
│                                                                 │
│   Browser ──► Yjs Doc ──► y-indexeddb ──► IndexedDB            │
│                                                                 │
│   • No network requests                                         │
│   • No accounts needed                                          │
│   • Works forever offline                                       │
└─────────────────────────────────────────────────────────────────┘

                            │
                            │ User enables sync (opt-in)
                            ▼

┌─────────────────────────────────────────────────────────────────┐
│                     SYNC ENABLED STATE                          │
│                                                                 │
│   Device A                              Device B                │
│   ┌─────────────┐                      ┌─────────────┐         │
│   │  Yjs Doc    │◄─────WebRTC─────────►│  Yjs Doc    │         │
│   │  (CRDT)     │                      │  (CRDT)     │         │
│   └──────┬──────┘                      └──────┬──────┘         │
│          │                                    │                 │
│          ▼                                    ▼                 │
│   ┌─────────────┐                      ┌─────────────┐         │
│   │ y-indexeddb │                      │ y-indexeddb │         │
│   └─────────────┘                      └─────────────┘         │
│                                                                 │
│                    ┌─────────────────┐                         │
│                    │ Signaling Server│ ← Connection info only  │
│                    │ (no data access)│                         │
│                    └─────────────────┘                         │
│                                                                 │
│   Optional: Self-hosted relay for async sync                   │
│                    ┌─────────────────┐                         │
│                    │  y-websocket    │ ← Encrypted updates     │
│                    │  (relay peer)   │                         │
│                    └─────────────────┘                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Design Decisions

### 1. Sync is Opt-In

- **Default**: 100% offline, zero sync code loaded
- **Opt-in**: Single toggle in settings
- **Lazy-load**: Sync modules only imported when enabled

### 2. All-or-Nothing Sync

When sync is enabled, **everything syncs** including:

- LLM API keys (encrypted with room password)
- LLM provider configurations
- All user data and preferences

**Only exception**: Master key (used to encrypt local sensitive data — never leaves the device)

### 3. Automatic Conflict Resolution

CRDTs handle all conflicts automatically:

- No user prompts for conflicts
- No manual merge UI
- Deterministic resolution across all peers

### 4. Room-Based Multi-User

- Personal sync: Private room (user ID + secret)
- Workspace sync: Shared room (workspace ID + password)
- Both use same Yjs infrastructure

### 5. Default Servers with Self-Host Option

- **Default**: DEVS provides signaling and relay servers out of the box
- **Self-host**: Users can run their own servers using open-source code in `/utils/`
- **Privacy**: Server code is open-source, auditable, and sees no decrypted data

### 6. Instant Reactivity via Yjs Observation

React components subscribe directly to Yjs maps for instant UI updates:

```typescript
// Reactive hooks observe Yjs directly:
import { useLiveMap, useLiveValue } from '@/lib/yjs'
import { agents, conversations } from '@/lib/yjs'

// All agents (reactive)
const allAgents = useLiveMap(agents)

// Single agent by ID (reactive)
const agent = useLiveValue(agents, agentId)

// Store-level hooks (recommended)
import { useAgents, useAgent } from '@/stores/agentStore'
const agents = useAgents() // Updates instantly on any change
const agent = useAgent(id) // Updates when this agent changes
```

This provides Firebase-like instant reactivity without network round-trips.

---

## Server Infrastructure

### Default DEVS Servers

DEVS provides free default servers for ease of use:

| Service       | URL                     | Purpose                       |
| ------------- | ----------------------- | ----------------------------- |
| **Signaling** | `wss://signal.devs.new` | WebRTC connection negotiation |
| **Relay**     | `wss://relay.devs.new`  | Async sync when peers offline |

### Self-Hosted Servers

Both services are open-source and available in this repository:

```
/utils/
├── devs-signaling/     # WebRTC signaling server
│   ├── Dockerfile
│   ├── package.json
│   ├── src/
│   └── README.md
└── devs-relay/         # y-websocket relay server
    ├── Dockerfile
    ├── package.json
    ├── src/
    └── README.md
```

#### Quick Start (Docker)

```bash
# Run both services
cd utils
docker compose up -d

# Or run individually
cd utils/devs-signaling && docker build -t devs-signaling . && docker run -p 4444:4444 devs-signaling
cd utils/devs-relay && docker build -t devs-relay . && docker run -p 4445:4445 devs-relay
```

#### Configuration in DEVS

```typescript
// Default (uses DEVS servers)
enableSync({ roomId: 'my-room' })

// Self-hosted
enableSync({
  roomId: 'my-room',
  signalingServers: ['wss://my-server.com:4444'],
  relayServer: 'wss://my-server.com:4445',
})
```

### Server Data Privacy

| Server        | What it sees          | What it stores                          |
| ------------- | --------------------- | --------------------------------------- |
| **Signaling** | Room IDs, peer IPs    | Nothing (stateless)                     |
| **Relay**     | Encrypted Yjs updates | Temporary (memory/optional persistence) |

Neither server can decrypt user data — encryption happens client-side with room passwords.

---

## Data Model

### Yjs Document Structure

```typescript
// Single Yjs document containing all app data
const ydoc = new Y.Doc()

// Top-level maps for each data type
const schema = {
  agents: ydoc.getMap('agents'), // Map<agentId, Agent>
  conversations: ydoc.getMap('conversations'), // Map<conversationId, Conversation>
  messages: ydoc.getMap('messages'), // Map<messageId, Message>
  knowledge: ydoc.getMap('knowledge'), // Map<itemId, KnowledgeItem>
  tasks: ydoc.getMap('tasks'), // Map<taskId, Task>
  artifacts: ydoc.getMap('artifacts'), // Map<artifactId, Artifact>
  memories: ydoc.getMap('memories'), // Map<memoryId, AgentMemoryEntry>
  workflows: ydoc.getMap('workflows'), // Map<workflowId, Workflow>
  preferences: ydoc.getMap('preferences'), // Map<key, value>
  credentials: ydoc.getMap('credentials'), // Map<credentialId, Credential> (encrypted API keys)
  studioEntries: ydoc.getMap('studioEntries'), // Map<entryId, StudioEntry> (image generation history)
  traces: ydoc.getMap('traces'), // Map<traceId, Trace> (LLM observability)
  spans: ydoc.getMap('spans'), // Map<spanId, Span> (LLM call details)
}
```

### What Syncs vs. What Doesn't

| Data                     | Syncs | Storage                                                             |
| ------------------------ | ----- | ------------------------------------------------------------------- |
| Agents (custom)          | ✅    | Yjs                                                                 |
| Conversations            | ✅    | Yjs                                                                 |
| Messages                 | ✅    | Yjs                                                                 |
| Knowledge Base           | ✅    | Yjs                                                                 |
| Tasks & Workflows        | ✅    | Yjs                                                                 |
| Artifacts                | ✅    | Yjs                                                                 |
| Agent Memories           | ✅    | Yjs                                                                 |
| User Preferences         | ✅    | Yjs                                                                 |
| LLM Provider Credentials | ⚡    | Yjs (re-encrypted with room password when sync enabled)             |
| LLM Configurations       | ✅    | Yjs (provider, model, base URL)                                     |
| Studio Entries           | ✅    | Yjs (image generation history)                                      |
| Traces                   | ✅    | Yjs (LLM observability traces)                                      |
| Spans                    | ✅    | Yjs (LLM call details)                                              |
| **Encryption Key**       | ❌    | Local: non-extractable CryptoKey / Sync: derived from room password |

---

## Credential Encryption Modes

DEVS uses different encryption strategies depending on whether sync is enabled:

### Local Mode (Default - Sync Disabled)

When sync is disabled, credentials are encrypted with a **non-extractable CryptoKey** stored in IndexedDB:

| Property     | Value                                           |
| ------------ | ----------------------------------------------- |
| Key Type     | AES-GCM 256-bit                                 |
| Key Storage  | IndexedDB (browser-native)                      |
| Extractable  | ❌ No - key material cannot be read or exported |
| Cross-Device | ❌ No - unique per browser                      |
| Security     | Maximum - resistant to XSS key theft            |

**Implications**:

- Credentials cannot be synced to other devices
- Clearing browser data = credentials lost (must reconfigure LLM providers)
- Local backup restore on different device = credentials won't decrypt

### Sync Mode (Sync Enabled)

When sync is enabled, credentials are re-encrypted with a key derived from your **room password**:

| Property       | Value                                        |
| -------------- | -------------------------------------------- |
| Key Type       | AES-GCM 256-bit                              |
| Key Derivation | PBKDF2 (250,000 iterations, SHA-256)         |
| Extractable    | ❌ No - derived key is still non-extractable |
| Cross-Device   | ✅ Yes - same password = same key            |
| Security       | Strong - depends on password strength        |

**Implications**:

- Credentials sync and decrypt on any device with same room password
- Backup restore works if you enable sync with same password
- **Use a strong room password** - it protects your API keys

### Mode Switching

When you enable or disable sync, DEVS automatically re-encrypts all credentials:

1. **Enable Sync**: Local key → Room password-derived key
2. **Disable Sync**: Room password-derived key → New local key

This happens transparently in the background. Your credentials remain secure throughout.

### Security Recommendations

1. **Strong Room Password**: Use 16+ characters with mixed case, numbers, symbols
2. **Don't Share Passwords**: Each user should have their own sync room
3. **Rotate Periodically**: Change room password if you suspect compromise

---

## Implementation Plan

### Phase 1: Yjs Foundation

**Goal**: Integrate Yjs as the data layer without changing app behavior.

#### Step 1.1: Install Dependencies

```bash
npm install yjs y-indexeddb
```

**Files to create**:

- `src/lib/sync/yjs-doc.ts` - Yjs document singleton
- `src/lib/sync/yjs-persistence.ts` - IndexedDB persistence wrapper

#### Step 1.2: Create Yjs Document Manager

```typescript
// src/lib/sync/yjs-doc.ts
import * as Y from 'yjs'

let ydoc: Y.Doc | null = null

export function getYDoc(): Y.Doc {
  if (!ydoc) {
    ydoc = new Y.Doc()
  }
  return ydoc
}

export function getAgentsMap(): Y.Map<any> {
  return getYDoc().getMap('agents')
}

export function getConversationsMap(): Y.Map<any> {
  return getYDoc().getMap('conversations')
}

// ... other maps
```

#### Step 1.3: Create Persistence Layer

```typescript
// src/lib/sync/yjs-persistence.ts
import { IndexeddbPersistence } from 'y-indexeddb'
import { getYDoc } from './yjs-doc'

let persistence: IndexeddbPersistence | null = null

export async function initPersistence(): Promise<void> {
  if (persistence) return

  const ydoc = getYDoc()
  persistence = new IndexeddbPersistence('devs-yjs', ydoc)

  // Wait for initial sync from IndexedDB
  await persistence.whenSynced
}

export function getPersistence(): IndexeddbPersistence | null {
  return persistence
}
```

#### Step 1.4: Create Data Access Adapter

Create adapters that match existing store interfaces but use Yjs underneath.

```typescript
// src/lib/sync/adapters/agent-adapter.ts
import { getAgentsMap } from '../yjs-doc'
import type { Agent } from '@/types'

export const agentAdapter = {
  getAll(): Agent[] {
    const map = getAgentsMap()
    return Array.from(map.values())
  },

  get(id: string): Agent | undefined {
    return getAgentsMap().get(id)
  },

  set(agent: Agent): void {
    getAgentsMap().set(agent.id, {
      ...agent,
      updatedAt: new Date().toISOString(),
    })
  },

  delete(id: string): void {
    getAgentsMap().delete(id)
  },

  observe(callback: (agents: Agent[]) => void): () => void {
    const map = getAgentsMap()
    const handler = () => callback(Array.from(map.values()))
    map.observe(handler)
    return () => map.unobserve(handler)
  },
}
```

#### Step 1.5: Migrate Existing Stores

Update Zustand stores to use Yjs adapters. Do this incrementally, one store at a time.

**Migration order** (by dependency):

1. `agentStore.ts` - No dependencies
2. `conversationStore.ts` - References agents
3. `knowledgeStore.ts` - No dependencies
4. `taskStore.ts` - References agents, conversations
5. `artifactStore.ts` - References tasks
6. `agentMemoryStore.ts` - References agents

**Pattern for each store**:

```typescript
// Before: Direct IndexedDB
const useAgentStore = create((set, get) => ({
  agents: [],
  loadAgents: async () => {
    const agents = await db.getAll('agents')
    set({ agents })
  },
  addAgent: async (agent) => {
    await db.put('agents', agent)
    set((state) => ({ agents: [...state.agents, agent] }))
  },
}))

// After: Yjs adapter
const useAgentStore = create((set, get) => ({
  agents: [],

  init: () => {
    // Subscribe to Yjs changes
    return agentAdapter.observe((agents) => {
      set({ agents })
    })
  },

  addAgent: (agent) => {
    agentAdapter.set(agent)
    // No need to update state - observer handles it
  },
}))
```

#### Step 1.6: Data Migration Script

Migrate existing IndexedDB data to Yjs format on first load.

```typescript
// src/lib/sync/migration.ts
import { openDB } from 'idb'
import { getYDoc } from './yjs-doc'

const MIGRATION_KEY = 'devs-yjs-migrated'

export async function migrateToYjs(): Promise<void> {
  if (localStorage.getItem(MIGRATION_KEY)) return

  const ydoc = getYDoc()
  const oldDb = await openDB('devs-store')

  // Migrate each store
  const agents = await oldDb.getAll('agents')
  const agentsMap = ydoc.getMap('agents')
  for (const agent of agents) {
    agentsMap.set(agent.id, agent)
  }

  // ... repeat for other stores

  localStorage.setItem(MIGRATION_KEY, Date.now().toString())
}
```

---

### Phase 2: P2P Sync (WebRTC)

**Goal**: Enable real-time P2P sync between devices.

#### Step 2.1: Install WebRTC Provider

```bash
npm install y-webrtc
```

#### Step 2.2: Create Sync Manager

```typescript
// src/lib/sync/sync-manager.ts
import { WebrtcProvider } from 'y-webrtc'
import { getYDoc } from './yjs-doc'

let webrtcProvider: WebrtcProvider | null = null

export interface SyncConfig {
  roomId: string
  password?: string
  signalingServers?: string[]
}

export async function enableSync(config: SyncConfig): Promise<void> {
  if (webrtcProvider) {
    await disableSync()
  }

  const ydoc = getYDoc()

  webrtcProvider = new WebrtcProvider(config.roomId, ydoc, {
    signaling: config.signalingServers || [
      'wss://signal.devs.new', // Default DEVS signaling server
    ],
    password: config.password,
  })

  // Connection status events
  webrtcProvider.on('status', ({ connected }) => {
    useSyncStore.getState().setConnected(connected)
  })

  webrtcProvider.on('peers', ({ webrtcPeers }) => {
    useSyncStore.getState().setPeerCount(webrtcPeers.length)
  })
}

export async function disableSync(): Promise<void> {
  if (webrtcProvider) {
    webrtcProvider.destroy()
    webrtcProvider = null
  }
}

export function getSyncStatus(): 'disabled' | 'connecting' | 'connected' {
  if (!webrtcProvider) return 'disabled'
  return webrtcProvider.connected ? 'connected' : 'connecting'
}
```

#### Step 2.3: Create Sync Store

```typescript
// src/stores/syncStore.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SyncState {
  enabled: boolean
  roomId: string | null
  connected: boolean
  peerCount: number
  lastSyncAt: Date | null

  // Actions
  enable: (roomId: string, password?: string) => Promise<void>
  disable: () => Promise<void>
  setConnected: (connected: boolean) => void
  setPeerCount: (count: number) => void
}

export const useSyncStore = create<SyncState>()(
  persist(
    (set, get) => ({
      enabled: false,
      roomId: null,
      connected: false,
      peerCount: 0,
      lastSyncAt: null,

      enable: async (roomId, password) => {
        const { enableSync } = await import('@/lib/sync/sync-manager')
        await enableSync({ roomId, password })
        set({ enabled: true, roomId })
      },

      disable: async () => {
        const { disableSync } = await import('@/lib/sync/sync-manager')
        await disableSync()
        set({ enabled: false, roomId: null, connected: false, peerCount: 0 })
      },

      setConnected: (connected) => {
        set({
          connected,
          lastSyncAt: connected ? new Date() : get().lastSyncAt,
        })
      },

      setPeerCount: (peerCount) => set({ peerCount }),
    }),
    {
      name: 'sync-settings',
      partialize: (state) => ({ enabled: state.enabled, roomId: state.roomId }),
    },
  ),
)
```

#### Step 2.4: Auto-Reconnect on App Load

```typescript
// src/app/App.tsx or initialization file
import { useSyncStore } from '@/stores/syncStore'

// On app initialization
const { enabled, roomId } = useSyncStore.getState()
if (enabled && roomId) {
  // Lazy load and reconnect
  import('@/lib/sync/sync-manager').then(({ enableSync }) => {
    enableSync({ roomId })
  })
}
```

---

### Phase 3: Relay Server (Async Sync)

**Goal**: Allow sync between devices that aren't online simultaneously.

By default, DEVS uses `wss://relay.devs.new`. Users can self-host using `/utils/devs-relay/`.

#### Step 3.1: Install WebSocket Provider

```bash
npm install y-websocket
```

#### Step 3.2: Default + Self-Hosted Configuration

```typescript
// src/lib/sync/config.ts
export const DEFAULT_SIGNALING_SERVERS = ['wss://signal.devs.new']

export const DEFAULT_RELAY_SERVER = 'wss://relay.devs.new'

export interface ServerConfig {
  signalingServers?: string[]
  relayServer?: string
  useRelay?: boolean // Default: true
}

export function getServerConfig(custom?: Partial<ServerConfig>): ServerConfig {
  return {
    signalingServers: custom?.signalingServers || DEFAULT_SIGNALING_SERVERS,
    relayServer: custom?.relayServer || DEFAULT_RELAY_SERVER,
    useRelay: custom?.useRelay ?? true,
  }
}
```

#### Step 3.3: Hybrid Provider (WebRTC + WebSocket)

```typescript
// src/lib/sync/sync-manager.ts (updated)
import { WebrtcProvider } from 'y-webrtc'
import { WebsocketProvider } from 'y-websocket'

export interface SyncConfig {
  roomId: string
  password?: string
  signalingServers?: string[]
  relayServer?: string // Optional relay for async sync
}

export async function enableSync(config: SyncConfig): Promise<void> {
  const ydoc = getYDoc()
  const serverConfig = getServerConfig(config)

  // P2P for real-time (when peers are online)
  webrtcProvider = new WebrtcProvider(config.roomId, ydoc, {
    signaling: serverConfig.signalingServers,
    password: config.password,
  })

  // WebSocket relay for async (when peers are offline)
  // Enabled by default using DEVS relay server
  if (serverConfig.useRelay && serverConfig.relayServer) {
    websocketProvider = new WebsocketProvider(
      serverConfig.relayServer,
      config.roomId,
      ydoc,
    )
  }
}
```

---

### Phase 4: Multi-User Workspaces

**Goal**: Enable shared workspaces with multiple users.

#### Step 4.1: Workspace Data Model

```typescript
// src/types/workspace.ts
interface Workspace {
  id: string
  name: string
  roomId: string // Yjs room for this workspace
  password: string // Room password (encrypted locally)
  members: string[] // Display names
  createdAt: Date
  updatedAt: Date
}
```

#### Step 4.2: Workspace Yjs Document

Each workspace = separate Yjs document.

```typescript
// src/lib/sync/workspace-manager.ts
const workspaceDocs = new Map<string, Y.Doc>()

export function getWorkspaceDoc(workspaceId: string): Y.Doc {
  if (!workspaceDocs.has(workspaceId)) {
    const doc = new Y.Doc()
    workspaceDocs.set(workspaceId, doc)

    // Persist to separate IndexedDB store
    new IndexeddbPersistence(`devs-workspace-${workspaceId}`, doc)
  }
  return workspaceDocs.get(workspaceId)!
}

export function connectWorkspace(workspace: Workspace): void {
  const doc = getWorkspaceDoc(workspace.id)

  new WebrtcProvider(workspace.roomId, doc, {
    password: workspace.password,
  })
}
```

#### Step 4.3: Workspace Store

```typescript
// src/stores/workspaceStore.ts
interface WorkspaceState {
  workspaces: Workspace[]
  currentWorkspaceId: string | null // null = personal space

  createWorkspace: (name: string) => Promise<Workspace>
  joinWorkspace: (roomId: string, password: string) => Promise<void>
  switchWorkspace: (workspaceId: string | null) => void
  leaveWorkspace: (workspaceId: string) => void
}
```

#### Step 4.4: Scoped Data Access

```typescript
// src/lib/sync/scoped-access.ts
export function getCurrentDoc(): Y.Doc {
  const { currentWorkspaceId } = useWorkspaceStore.getState()

  if (currentWorkspaceId) {
    return getWorkspaceDoc(currentWorkspaceId)
  }
  return getYDoc() // Personal document
}

// All adapters use getCurrentDoc() instead of getYDoc()
export function getAgentsMap(): Y.Map<any> {
  return getCurrentDoc().getMap('agents')
}
```

---

### Phase 5: UI Components

#### Step 5.1: Sync Settings Panel

```typescript
// src/components/SyncSettings.tsx
// Location: Settings page

// Features:
// - Toggle sync on/off
// - Show connection status
// - Show peer count
// - Room ID display (for sharing)
// - Optional relay server input
```

#### Step 5.2: Sync Status Indicator

```typescript
// src/components/SyncStatusIndicator.tsx
// Location: Header/navbar

// States:
// - Hidden (sync disabled)
// - Gray dot (connecting)
// - Green dot (connected, X peers)
// - Orange dot (connected, no peers)
```

#### Step 5.3: Workspace Switcher

```typescript
// src/components/WorkspaceSwitcher.tsx
// Location: Sidebar or header

// Features:
// - List personal + workspaces
// - Create new workspace
// - Join with room ID
// - Leave workspace
```

---

## File Structure

```
src/lib/sync/
├── index.ts              # Public API exports
├── yjs-doc.ts            # Yjs document singleton
├── yjs-persistence.ts    # IndexedDB persistence
├── sync-manager.ts       # WebRTC/WebSocket providers
├── workspace-manager.ts  # Multi-workspace support
├── migration.ts          # IndexedDB → Yjs migration
├── adapters/
│   ├── index.ts
│   ├── agent-adapter.ts
│   ├── conversation-adapter.ts
│   ├── knowledge-adapter.ts
│   ├── task-adapter.ts
│   ├── artifact-adapter.ts
│   └── memory-adapter.ts
└── __tests__/
    ├── yjs-doc.test.ts
    ├── adapters.test.ts
    └── sync-manager.test.ts
```

---

## Testing Strategy

### Unit Tests

```typescript
// src/lib/sync/__tests__/adapters.test.ts
describe('agentAdapter', () => {
  beforeEach(() => {
    // Reset Yjs document
  })

  it('should add and retrieve an agent', () => {
    const agent = { id: '1', name: 'Test', ... }
    agentAdapter.set(agent)
    expect(agentAdapter.get('1')).toEqual(agent)
  })

  it('should notify observers on changes', () => {
    const callback = vi.fn()
    agentAdapter.observe(callback)
    agentAdapter.set({ id: '1', ... })
    expect(callback).toHaveBeenCalled()
  })
})
```

### Integration Tests

```typescript
// src/lib/sync/__tests__/sync-manager.test.ts
describe('P2P sync', () => {
  it('should sync data between two documents', async () => {
    const doc1 = new Y.Doc()
    const doc2 = new Y.Doc()

    // Simulate WebRTC connection
    // Add data to doc1
    // Verify it appears in doc2
  })
})
```

---

## Execution Checklist

### Phase 1: Foundation

- [x] Install `yjs` and `y-indexeddb`
- [x] Create `src/lib/sync/yjs-doc.ts`
- [x] Create `src/lib/sync/yjs-persistence.ts`
- [x] Create `src/lib/sync/sync-bridge.ts` (replaces adapter pattern)
- [ ] ~~Create adapters for each data type~~ (using sync bridge instead)
- [ ] Write unit tests for sync modules
- [x] Sync bridge handles bidirectional IndexedDB ↔ Yjs sync
- [x] Auto-load existing data to Yjs on init
- [x] Verify app works identically to before

### Phase 2: P2P Sync

- [x] Install `y-websocket` (using WebSocket instead of WebRTC for reliability)
- [x] Create `src/lib/sync/sync-manager.ts`
- [x] Create `src/stores/syncStore.ts`
- [x] Add auto-reconnect on app load
- [x] Create `SyncSettings` component
- [x] Sync status indicator in header
- [ ] Write integration tests
- [x] Test with multiple browsers/devices

### Phase 3: Relay Server

- [x] Install `y-websocket`
- [ ] Create `src/lib/sync/config.ts` with default servers
- [x] Sync manager uses y-websocket provider
- [ ] Add custom server config to settings UI
- [x] Create `/utils/devs-wss/` - local WebSocket sync server
- [x] Deploy cloud-hosted signaling server (`wss://signal.devs.new`)
- [ ] Deploy cloud-hosted relay server (`wss://relay.devs.new`)
- [ ] Add Docker compose for production services
- [ ] Document self-hosting instructions

### Phase 4: Multi-User

- [ ] Define `Workspace` type
- [ ] Create `workspace-manager.ts`
- [ ] Create `workspaceStore.ts`
- [ ] Implement scoped data access
- [ ] Create `WorkspaceSwitcher` component
- [ ] Test workspace isolation

### Phase 5: Polish

- [x] Add sync status to settings page
- [ ] Handle edge cases (network drops, etc.)
- [ ] Performance optimization for large datasets
- [ ] Documentation for end users
- [ ] E2E tests with Playwright

---

## Security Considerations

1. **Room passwords**: Always use for any shared room
2. **API keys**: Synced but encrypted with room password (E2E)
3. **Master key**: Never synced — used to encrypt all local sensitive data. Must be kept safe and secure.
4. **Server trust**: Default DEVS servers are open-source and auditable
5. **Self-hosting**: For maximum privacy, run your own servers from `/utils/`
6. **Room IDs**: Use crypto-random UUIDs, not guessable
7. **E2E encryption**: All data encrypted client-side before reaching servers

---

## Server Implementation Details

### `/utils/devs-signaling/`

Minimal WebRTC signaling server based on `y-webrtc-signaling`.

```typescript
// Key features:
// - Stateless room management
// - No data storage
// - WebSocket-based
// - Horizontal scaling support
```

### `/utils/devs-relay/`

Yjs WebSocket relay based on `y-websocket`.

```typescript
// Key features:
// - Stores encrypted Yjs updates
// - Optional persistence (LevelDB)
// - Room-based isolation
// - No decryption capability
```

### Docker Compose (Full Stack)

```yaml
# utils/docker-compose.yml
version: '3.8'
services:
  signaling:
    build: ./devs-signaling
    ports:
      - '4444:4444'
    restart: unless-stopped

  relay:
    build: ./devs-relay
    ports:
      - '4445:4445'
    volumes:
      - relay-data:/data # Optional persistence
    environment:
      - PERSISTENCE=true
    restart: unless-stopped

volumes:
  relay-data:
```

---

## References

- [Yjs Documentation](https://docs.yjs.dev/)
- [y-indexeddb](https://github.com/yjs/y-indexeddb)
- [y-webrtc](https://github.com/yjs/y-webrtc)
- [y-websocket](https://github.com/yjs/y-websocket)
- [CRDT Primer](https://crdt.tech/)
