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

## Architecture Overview

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

### Default State (Offline)

```text
┌─────────────────────────────────────────────────────────────────┐
│                     DEFAULT STATE (Offline)                     │
│                                                                 │
│   Browser ──► Yjs Doc ──► y-indexeddb ──► IndexedDB            │
│                                                                 │
│   • No network requests                                         │
│   • No accounts needed                                          │
│   • Works forever offline                                       │
└─────────────────────────────────────────────────────────────────┘
```

### Sync Enabled State

```text
┌─────────────────────────────────────────────────────────────────┐
│                     SYNC ENABLED STATE                          │
│                                                                 │
│   Device A                              Device B                │
│   ┌─────────────┐                      ┌─────────────┐         │
│   │  Yjs Doc    │◄──y-websocket───────►│  Yjs Doc    │         │
│   │  (CRDT)     │    (E2E encrypted)   │  (CRDT)     │         │
│   └──────┬──────┘                      └──────┬──────┘         │
│          │                                    │                 │
│          ▼                                    ▼                 │
│   ┌─────────────┐                      ┌─────────────┐         │
│   │ y-indexeddb │                      │ y-indexeddb │         │
│   └─────────────┘                      └─────────────┘         │
│                                                                 │
│                    ┌──────────────────┐                         │
│                    │ Signaling Server │ ← Routing only          │
│                    │ (no data access) │                         │
│                    └──────────────────┘                         │
│                                                                 │
│   Future: Self-hosted relay for async sync                      │
│                    ┌──────────────────┐                         │
│                    │  y-websocket     │ ← Encrypted updates     │
│                    │  (relay peer)    │                         │
│                    └──────────────────┘                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Core Files

All Yjs code lives in `src/lib/yjs/`:

| File              | Purpose                                                       |
| ----------------- | ------------------------------------------------------------- |
| `doc.ts`          | Yjs document singleton, y-indexeddb persistence, `whenReady`  |
| `maps.ts`         | Strongly-typed `Y.Map` exports for all entity types           |
| `sync.ts`         | WebSocket sync control (enable/disable), peer awareness       |
| `crypto.ts`       | AES-GCM-256 key derivation, encrypt/decrypt for Yjs updates  |
| `encrypted-ws.ts` | WebSocket wrapper that E2E encrypts all y-websocket messages  |
| `reactive.ts`     | React hooks: `useLiveMap`, `useLiveValue`, `useSyncReady`     |
| `migrate.ts`      | One-time migration from legacy IndexedDB to Yjs               |
| `local-cache.ts`  | localStorage seed cache to avoid hydration flash               |
| `compat.ts`       | Deprecated function-style getters for backward compatibility  |
| `index.ts`        | Public barrel — single entry-point for all Yjs exports        |

---

## Yjs Document & Persistence

A single `Y.Doc` instance (`src/lib/yjs/doc.ts`) is shared across the entire application. Persistence is handled by `y-indexeddb` under the database name `"devs"`, lazily initialized to avoid side-effects in test environments.

**Readiness gate:** Consumers that need data on startup `await whenReady` before their first read. In production this waits for y-indexeddb to replay stored updates; in tests it resolves immediately.

**Transactions:** The `transact()` helper batches mutations into a single Yjs update event, triggering only one re-render cycle in subscribed React hooks.

```typescript
import { whenReady, transact, agents } from '@/lib/yjs'

await whenReady
transact(() => {
  agents.set(agent.id, agent)
  tasks.set(task.id, task)
})
```

---

## Typed Y.Maps

Every application entity has a strongly-typed `Y.Map` exported from `src/lib/yjs/maps.ts`. The exported constant name matches the Yjs map name (e.g. `agents` is backed by `ydoc.getMap<Agent>('agents')`).

### Map Inventory

| Map                      | Key                     | Value Type             |
| ------------------------ | ----------------------- | ---------------------- |
| `agents`                 | `Agent.id`              | `Agent`                |
| `conversations`          | `Conversation.id`       | `Conversation`         |
| `knowledge`              | `KnowledgeItem.id`      | `KnowledgeItem`        |
| `tasks`                  | `Task.id`               | `Task`                 |
| `artifacts`              | `Artifact.id`           | `Artifact`             |
| `memories`               | `AgentMemoryEntry.id`   | `AgentMemoryEntry`     |
| `preferences`            | `"main"` (typically)    | `Preferences`          |
| `credentials`            | `Credential.id`         | `Credential`           |
| `studioEntries`          | `StudioEntry.id`        | `StudioEntry`          |
| `workflows`              | `Workflow.id`           | `Workflow`             |
| `agentMessages`          | `AgentMessage.id`       | `AgentMessage`         |
| `queuedTasks`            | `QueuedTaskEntry.id`    | `QueuedTaskEntry`      |
| `sessions`               | `Session.id`            | `Session`              |
| `pinnedMessages`         | `PinnedMessage.id`      | `PinnedMessage`        |
| `traces`                 | `Trace.id`              | `Trace`                |
| `spans`                  | `Span.id`               | `Span`                 |
| `tracingConfig`          | config key              | `TracingConfig`        |
| `connectors`             | `Connector.id`          | `Connector`            |
| `connectorSyncStates`    | `ConnectorSyncState.id` | `ConnectorSyncState`   |
| `notifications`          | `Notification.id`       | `Notification`         |
| `memoryLearningEvents`   | event id                | `MemoryLearningEvent`  |
| `agentMemoryDocuments`   | agent id                | `AgentMemoryDocument`  |
| `sharedContexts`         | context id              | `SharedContext`        |
| `installedExtensions`    | `InstalledExtension.id` | `InstalledExtension`   |
| `customExtensions`       | `CustomExtension.id`    | `CustomExtension`      |
| `skills`                 | `InstalledSkill.id`     | `InstalledSkill`       |
| `threadTags`             | `ThreadTag.id`          | `ThreadTag`            |
| `langfuseConfig`         | config id               | `LangfuseConfigEntry`  |
| `widgetCaptures`         | widget id               | `string` (data-URL)    |
| `spaces`                 | `Space.id`              | `Space`                |
| `spaceSettings`          | space id                | `Record<string, unknown>` |

---

## Reactive Hooks

`src/lib/yjs/reactive.ts` bridges Yjs's event-driven model with React using `useSyncExternalStore`:

| Hook            | Purpose                                             |
| --------------- | --------------------------------------------------- |
| `useLiveMap`    | Subscribe to **all** values in a `Y.Map`            |
| `useLiveValue`  | Subscribe to a **single** value in a `Y.Map` by key |
| `useSyncReady`  | Returns `true` once IndexedDB hydration is done     |

Hooks use ref-based caching to preserve referential identity when data hasn't changed, avoiding unnecessary child re-renders.

```typescript
import { useLiveMap, useLiveValue } from '@/lib/yjs'
import { agents, conversations } from '@/lib/yjs'

// All agents (reactive)
const allAgents = useLiveMap(agents)

// Single agent by ID (reactive)
const agent = useLiveValue(agents, agentId)

// Store-level hooks (recommended)
import { useAgents, useAgent } from '@/stores/agentStore'
const agents = useAgents()     // Updates instantly on any change
const agent = useAgent(id)     // Updates when this agent changes
```

---

## Yjs Observers Pattern

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

## P2P Sync via y-websocket

Sync is implemented in `src/lib/yjs/sync.ts` using `y-websocket` (the `WebsocketProvider`). When enabled, all Yjs document mutations are automatically broadcast to peers in the same room, and incoming changes are merged conflict-free via CRDT.

### Lifecycle

1. User calls `enableSync()` with a `SyncConfig` (room ID + password).
2. Room name is derived via PBKDF2 (wrong passwords land in different rooms).
3. An AES-GCM-256 encryption key is derived from the password.
4. A `WebsocketProvider` connects through an encrypted WebSocket wrapper.
5. Status transitions: `disabled` -> `connecting` -> `connected`.
6. Document updates flow bidirectionally, E2E encrypted.
7. User calls `disableSync()` to tear down the connection.

### E2E Encryption

All sync traffic is encrypted client-side before reaching the signaling server:

- **Key derivation**: PBKDF2 with 210,000 iterations, SHA-256, using the room ID as salt context.
- **Encryption**: AES-GCM-256 with random 12-byte IV per message.
- **Wire format**: `[version(1)][iv(12)][ciphertext(N)]`
- **Implementation**: `src/lib/yjs/crypto.ts` and `src/lib/yjs/encrypted-ws.ts`

The encrypted WebSocket wrapper (`createEncryptedWebSocketClass`) is passed to y-websocket's `WebSocketPolyfill` option, transparently encrypting `send()` calls and decrypting incoming messages. Messages that fail decryption are silently dropped.

### Room Name Derivation

The user-visible room ID is never sent directly to the server. Instead, `deriveRoomName()` uses PBKDF2 (210,000 iterations) to derive a 256-bit hex string used as the actual WebSocket room name. This ensures:

1. Different passwords always map to entirely separate rooms.
2. Brute-forcing weak passwords is computationally expensive.

### Sync Activity Monitoring

The sync module tracks sent/received data events in a circular buffer (up to 100 entries) and exposes:

- `onSyncActivity()` — subscribe to real-time send/receive events
- `getRecentActivity()` — retrieve recent activity for diagnostics UI
- `onSyncStatusChange()` — subscribe to status transitions
- `getPeerCount()` / `getPeers()` — peer awareness via Yjs awareness protocol

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

**Only exception**: Master key (used to encrypt local sensitive data -- never leaves the device)

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

- **Default**: DEVS provides a signaling server out of the box
- **Self-host**: Users can run their own servers using open-source code in `/utils/devs-wss/`
- **Privacy**: Server code is open-source, auditable, and sees no decrypted data

### 6. Instant Reactivity via Yjs Observation

React components subscribe directly to Yjs maps for instant UI updates. This provides Firebase-like instant reactivity without network round-trips.

---

## Data Model

### What Syncs vs. What Doesn't

| Data                     | Syncs | Storage                                                             |
| ------------------------ | ----- | ------------------------------------------------------------------- |
| Agents (custom)          | Yes   | Yjs                                                                 |
| Conversations            | Yes   | Yjs                                                                 |
| Knowledge Base           | Yes   | Yjs                                                                 |
| Tasks & Workflows        | Yes   | Yjs                                                                 |
| Artifacts                | Yes   | Yjs                                                                 |
| Agent Memories           | Yes   | Yjs                                                                 |
| User Preferences         | Yes   | Yjs                                                                 |
| LLM Provider Credentials | Yes*  | Yjs (re-encrypted with room password when sync enabled)             |
| LLM Configurations       | Yes   | Yjs (provider, model, base URL)                                     |
| Studio Entries           | Yes   | Yjs (image generation history)                                      |
| Traces & Spans           | Yes   | Yjs (LLM observability)                                             |
| Connectors               | Yes   | Yjs                                                                 |
| Marketplace Extensions   | Yes   | Yjs                                                                 |
| **Encryption Key**       | No    | Local: non-extractable CryptoKey / Sync: derived from room password |

---

## Credential Encryption Modes

DEVS uses different encryption strategies depending on whether sync is enabled.

### Local Mode (Default -- Sync Disabled)

When sync is disabled, credentials are encrypted with a **non-extractable CryptoKey** stored in IndexedDB:

| Property     | Value                                           |
| ------------ | ----------------------------------------------- |
| Key Type     | AES-GCM 256-bit                                 |
| Key Storage  | IndexedDB (browser-native)                      |
| Extractable  | No -- key material cannot be read or exported   |
| Cross-Device | No -- unique per browser                        |
| Security     | Maximum -- resistant to XSS key theft           |

**Implications**:

- Credentials cannot be synced to other devices
- Clearing browser data = credentials lost (must reconfigure LLM providers)
- Local backup restore on different device = credentials won't decrypt

### Sync Mode (Sync Enabled)

When sync is enabled, credentials are re-encrypted with a key derived from your **room password**:

| Property       | Value                                        |
| -------------- | -------------------------------------------- |
| Key Type       | AES-GCM 256-bit                              |
| Key Derivation | PBKDF2 (210,000 iterations, SHA-256)         |
| Extractable    | No -- derived key is still non-extractable   |
| Cross-Device   | Yes -- same password = same key              |
| Security       | Strong -- depends on password strength       |

**Implications**:

- Credentials sync and decrypt on any device with same room password
- Backup restore works if you enable sync with same password
- **Use a strong room password** -- it protects your API keys

### Mode Switching

When you enable or disable sync, DEVS automatically re-encrypts all credentials:

1. **Enable Sync**: Local key -> Room password-derived key
2. **Disable Sync**: Room password-derived key -> New local key

This happens transparently in the background. Your credentials remain secure throughout.

### Security Recommendations

1. **Strong Room Password**: Use 16+ characters with mixed case, numbers, symbols
2. **Don't Share Passwords**: Each user should have their own sync room
3. **Rotate Periodically**: Change room password if you suspect compromise

---

## Legacy Data Migration

On first load after upgrading from the pre-Yjs storage layer, `src/lib/yjs/migrate.ts` runs a **one-shot, idempotent** migration:

1. Checks a `localStorage` flag -- if already migrated, skips immediately (< 1 ms).
2. If Yjs maps already contain data (e.g. synced from a peer), skips to avoid duplicates.
3. Otherwise, reads all records from legacy IndexedDB and writes them into Yjs maps in a single `transact()` call.
4. Sets the migration flag to prevent re-execution.

---

## Local Cache Layer

`src/lib/yjs/local-cache.ts` provides a lightweight `localStorage` cache to avoid a visible "flash" during y-indexeddb hydration. Stores seed their initial state synchronously from last-known values, then Yjs observers overwrite with authoritative data once hydration completes.

---

## Server Infrastructure

### Default DEVS Servers

| Service       | URL                     | Status      | Purpose                             |
| ------------- | ----------------------- | ----------- | ----------------------------------- |
| **Signaling** | `wss://signal.devs.new` | Deployed    | WebSocket sync room routing         |
| **Relay**     | `wss://relay.devs.new`  | Not yet deployed | Async sync when peers are offline |

### Self-Hosted Server

The WebSocket server is open-source and available at `utils/devs-wss/`:

```
utils/devs-wss/
├── Dockerfile
├── compose.yaml
├── package.json
└── server.mjs
```

#### Quick Start (Docker)

```bash
cd utils/devs-wss
docker build -t devs-wss . && docker run -p 4444:4444 devs-wss

# Or with compose
docker compose up -d
```

#### Configuration in DEVS

The signaling server URL defaults to `wss://signal.devs.new` and can be overridden via the `SyncConfig.server` parameter:

```typescript
import { enableSync } from '@/lib/yjs'

// Default (uses DEVS signaling server)
enableSync({ roomId: 'my-room', password: 's3cret' })

// Self-hosted
enableSync({
  roomId: 'my-room',
  password: 's3cret',
  server: 'wss://my-server.com:4444',
})
```

### Server Data Privacy

| Server        | What it sees          | What it stores      |
| ------------- | --------------------- | ------------------- |
| **Signaling** | Derived room names, peer connections | Nothing (stateless) |

The server cannot decrypt user data -- all encryption happens client-side with room-password-derived keys.

---

## Implementation Status

> **Last updated:** April 2026

| Phase                       | Status         | Description                                     |
| --------------------------- | -------------- | ----------------------------------------------- |
| **Phase 1: Yjs Core**       | Done           | Yjs document, persistence, typed maps           |
| **Phase 2: Store Refactor** | Done           | All stores use Yjs as source of truth           |
| **Phase 3: P2P Sync**       | Done           | WebSocket sync, E2E encryption, sync UI, peer awareness |
| **Phase 4: Relay Server**   | Partial        | Signaling server deployed, relay server pending |
| **Phase 5: Multi-User**     | Not Started    | Workspace support                               |

### What's Working

- Yjs-first data layer (`src/lib/yjs/`) as single source of truth
- Strongly-typed Y.Maps for all entities
- IndexedDB persistence via y-indexeddb
- Reactive hooks (`useLiveMap`, `useLiveValue`, `useSyncReady`) for instant UI updates
- WebSocket-based P2P sync with E2E encryption (AES-GCM-256)
- PBKDF2-derived room names (wrong password = different room)
- Encrypted WebSocket wrapper for y-websocket
- Sync settings UI with status indicator
- Sync activity monitoring (sent/received bytes, peer count)
- Automatic data migration from legacy IndexedDB
- All stores refactored to use Yjs directly
- Yjs observers for stores that maintain local Zustand/React state
- localStorage cache to avoid hydration flash

### What's Pending

- Cloud-hosted relay server for async sync (`wss://relay.devs.new`)
- Multi-user workspace support (separate Yjs documents per workspace)
- E2E tests for sync functionality

---

## Security Considerations

1. **Room passwords**: Required for all sync sessions -- mandatory, not optional
2. **API keys**: Synced but E2E encrypted with room-password-derived AES-GCM key
3. **Master key**: Never synced -- used to encrypt all local sensitive data
4. **Room name derivation**: PBKDF2 (210K iterations) prevents brute-force and ensures wrong passwords join empty rooms
5. **E2E encryption**: AES-GCM-256 with per-message random IV; signaling server never sees plaintext
6. **Server trust**: Default DEVS server is open-source and auditable
7. **Self-hosting**: For maximum privacy, run your own server from `utils/devs-wss/`
8. **Room IDs**: Use crypto-random UUIDs, not guessable strings
9. **Undecryptable messages**: Silently dropped -- protects against rogue peers

---

## References

- [Yjs Documentation](https://docs.yjs.dev/)
- [y-indexeddb](https://github.com/yjs/y-indexeddb)
- [y-websocket](https://github.com/yjs/y-websocket)
- [CRDT Primer](https://crdt.tech/)
- [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)
