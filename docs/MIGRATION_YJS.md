# Migration Guide: Yjs-First Architecture

## Overview

DEVS has migrated from a **dual-storage architecture** (IndexedDB + Yjs) to a **Yjs-first architecture** where Yjs is the single source of truth for all application data.

### What Changed

Previously, DEVS stored data in IndexedDB and mirrored it to Yjs for P2P sync. This created two sources of truth, leading to complex synchronization logic, race conditions, and over 4,000 lines of bridge code.

Now, Yjs is the only data layer. All reads and writes go directly through Yjs maps, and `y-indexeddb` handles local persistence automatically. This eliminates conflicts, simplifies the codebase by ~80%, and improves reliability.

### Why

| Before (Dual Storage)                    | After (Yjs-First)                         |
| ---------------------------------------- | ----------------------------------------- |
| Two sources of truth (IndexedDB + Yjs)   | Single source of truth (Yjs)              |
| Manual conflict resolution (timestamps)  | Automatic CRDT-based conflict resolution  |
| Complex 6-step initialization            | Simple 1-step initialization (`whenReady`) |
| Race conditions between local and remote | Atomic Yjs transactions, no races         |
| ~4,900 lines of sync/bridge code         | ~1,000 lines total                        |

---

## What Happens Automatically

**You don't need to do anything.** When you open DEVS after updating, your data migrates automatically:

1. DEVS loads and waits for the Yjs document to initialize
2. A one-time migration copies all your existing data from the old IndexedDB storage into Yjs
3. A flag is saved in your browser so the migration never runs again
4. Your data is now stored in Yjs and available immediately

This process takes a fraction of a second for most users. You won't see a loading screen or be asked to confirm anything — it just works.

### What Gets Migrated

All your core data is migrated automatically:

- **Agents** — All custom agents you created
- **Conversations** — Your full chat history and messages
- **Knowledge Base** — All uploaded files and documents
- **Tasks & Workflows** — Task definitions, steps, and artifacts
- **Agent Memories** — Learned memories for each agent

### What Stays in IndexedDB

Only three stores remain in the legacy `devs-ai-platform` IndexedDB database because they use browser-native objects that cannot be serialized into Yjs:

- **Encryption keys** (`CryptoKey` objects) — Non-extractable WebCrypto keys used for credential encryption (`cryptoKeys` store)
- **File system handles** (`FileSystemHandle` objects) — Used for local backup folder access and folder watching (`fileHandles` store)
- **Folder watchers** (`PersistedFolderWatcher` objects) — Metadata for watched folders referencing file handles (`folderWatchers` store)

All other object stores that previously existed in the `devs-ai-platform` database (agents, conversations, tasks, artifacts, etc.) have been **deleted** as of database version 21.  Their data now lives exclusively in Yjs maps.

---

## How the Migration Works

The migration code lives in `src/lib/yjs/migrate.ts` and runs during app initialization in `src/app/Providers.tsx`. Here's the sequence:

```
App starts
   │
   ▼
await whenReady          ← Yjs loads persisted data from IndexedDB (y-indexeddb)
   │
   ▼
migrateFromIndexedDB()   ← One-time migration check
   │
   ├── Already migrated? (localStorage flag) → Skip
   │
   ├── Yjs already has data? (e.g., from P2P sync) → Mark migrated, skip
   │
   └── Otherwise → Read all data from legacy IndexedDB
                    → Write to Yjs maps in a single transaction
                    → Mark migrated
```

The migration uses a **single Yjs transaction**, meaning all data is written atomically — either everything migrates or nothing does.

### The Migration Flag

Migration status is tracked via a localStorage key:

- **Key:** `devs-yjs-first-migrated`
- **Value:** `1` (the migration version)

This ensures the migration runs exactly once per browser profile.

---

## Data Safety

### Migration is Idempotent

The migration checks multiple conditions before running:

1. **Already migrated?** — If the localStorage flag is set, migration is skipped entirely
2. **Yjs already has data?** — If any Yjs map contains data (e.g., synced from another device via P2P), the migration is skipped and the flag is set

This means it's safe even if something interrupts the process — re-opening the app will simply try again.

### IndexedDB Data is Preserved

The migration **copies** data from IndexedDB to Yjs — it does not delete the original. Your legacy IndexedDB data remains available as a read-only backup. The old `devs-ai-platform` IndexedDB database is not modified or removed during migration.

> **Note on store name mapping:** The migration renames some stores during transfer:
> - Legacy `knowledgeItems` → Yjs `knowledge` map
> - Legacy `agentMemories` → Yjs `memories` map

### P2P Sync Takes Priority

If you already connected to a P2P sync room and received data from a peer before the migration runs, the peer data takes priority. This prevents duplicate or conflicting entries — the assumption is that peer-synced data is already up to date.

---

## Troubleshooting

### Data Appears Missing After Update

1. **Check the browser console** — Open DevTools (F12 or Cmd+Option+I) and look for migration log messages:
   - `[Migration] Migrating IndexedDB → Yjs...` — Migration ran
   - `[Migration] Yjs has data from peers, skipping IndexedDB migration` — Peer data was used instead
   - No migration messages — Migration was already completed previously

2. **Check localStorage** — In DevTools → Application → Local Storage, look for the key `devs-yjs-first-migrated`. If it's set to `1`, migration has completed.

3. **Check IndexedDB** — In DevTools → Application → IndexedDB, verify that:
   - `devs` database exists (this is the Yjs persistence database)
   - `devs-ai-platform` database exists (this is the legacy database — your backup)

### Private Browsing / Incognito Mode

In private browsing mode, IndexedDB may be unavailable or restricted. DEVS handles this gracefully:

- Yjs continues to work **in-memory** — you can use the app normally during your session
- **Data will not persist** between sessions in private mode
- P2P sync still works if enabled — your data lives on connected peers
- Migration from legacy IndexedDB cannot run if the old database isn't accessible

### P2P Sync Issues After Migration

If you're using P2P sync and notice issues after the migration:

1. **Both devices should update** — Ensure all synced devices are running the latest version of DEVS
2. **CRDT handles conflicts** — If both devices migrated independently, Yjs's CRDT algorithm will merge the data automatically without conflicts
3. **Check sync status** — Go to Settings → Sync and verify the connection status shows "Connected"
4. **Re-enable sync** — If sync seems stuck, try disabling and re-enabling it

### How to Force Re-Migration

If you need to re-run the migration (e.g., you suspect data wasn't migrated correctly):

1. Open DevTools (F12 or Cmd+Option+I)
2. Go to **Application** → **Local Storage** → your domain
3. Delete the key `devs-yjs-first-migrated`
4. Reload the page

> **Note:** Re-migration will only work if the Yjs maps are empty. If Yjs already has data, the migration will skip (to avoid duplicates). To truly start fresh, you would also need to delete the `devs` IndexedDB database — but this will erase all current data.

### Clearing All Data (Fresh Start)

If you want to completely reset DEVS:

1. Open DevTools → Application
2. Delete **IndexedDB** databases: `devs` (Yjs data) and `devs-ai-platform` (legacy data)
3. Delete **Local Storage** key: `devs-yjs-first-migrated`
4. Reload the page

---

## For Developers

### Store API is Unchanged

The most important thing to know: **store APIs are identical**. Components don't need any updates. Only the internal implementation changed from IndexedDB writes to Yjs map writes.

```typescript
// These imports and calls work exactly as before
import { createAgent, getAgentById, useAgents } from '@/stores/agentStore'
import { useConversations } from '@/stores/conversationStore'

// Create an agent — same signature, same behavior
const agent = await createAgent({ name: 'My Agent', role: 'Assistant', instructions: '...' })

// React hook — same API, now backed by Yjs observation
const agents = useAgents()
```

### New Import Patterns

For low-level Yjs access, import from `@/lib/yjs`. For entity-specific logic, import from stores.

```typescript
// ✅ Store-level imports (recommended for most code)
import { createAgent, useAgents, getAgentById } from '@/stores/agentStore'

// ✅ Yjs primitives (for lib/ code or advanced use cases)
import { agents, conversations, whenReady, transact } from '@/lib/yjs'

// ✅ Reactive hooks (for custom React components)
import { useLiveMap, useLiveValue } from '@/lib/yjs'

// ❌ Don't import from internal paths
import { agents } from '@/lib/yjs/maps'  // Use @/lib/yjs instead
```

### Writing Data

Stores now write directly to Yjs maps. No `await db.put()`, no `syncToYjs()`:

```typescript
// Before (dual storage)
async function createAgent(data: AgentData): Promise<Agent> {
  const agent = { ...data, id: nanoid() }
  await db.put('agents', agent)      // Write to IndexedDB
  syncToYjs('agents', agent)         // Mirror to Yjs
  set(state => ({ agents: [...state.agents, agent] }))  // Update Zustand
  return agent
}

// After (Yjs-first)
function createAgent(data: AgentData): Agent {
  const agent = { ...data, id: nanoid() }
  agents.set(agent.id, agent)  // That's it. Yjs handles everything.
  return agent
}
```

### Batch Operations

Use `transact()` for atomic batch writes:

```typescript
import { transact } from '@/lib/yjs'
import { agents } from '@/lib/yjs'

transact(() => {
  for (const agent of agentsToImport) {
    agents.set(agent.id, agent)
  }
})
// All writes are applied atomically
```

### Reactive Hooks

Components can observe Yjs maps using reactive hooks (built on `useSyncExternalStore`). Changes from local writes, P2P sync, or migration all trigger re-renders automatically.

```typescript
import { useLiveMap, useLiveValue, useSyncReady } from '@/lib/yjs'
import { agents } from '@/lib/yjs'

// Wait for y-indexeddb hydration before rendering data
const ready = useSyncReady()

// Subscribe to all agents
const allAgents = useLiveMap(agents)

// Subscribe to a single agent by ID
const agent = useLiveValue(agents, agentId)
```

| Hook | Signature | Purpose |
| ---- | --------- | ------- |
| `useLiveMap<T>` | `(map: Y.Map<T>) => T[]` | Subscribe to all values in a Y.Map |
| `useLiveValue<T>` | `(map: Y.Map<T>, id: string \| undefined) => T \| undefined` | Subscribe to a single value by key |
| `useSyncReady` | `() => boolean` | Returns `true` once y-indexeddb hydration is complete |

Store-level hooks like `useAgents()` use these internally and add filtering (e.g., excluding soft-deleted agents).

### Yjs Observers for Zustand Stores

Stores that maintain local Zustand state must observe Yjs maps to stay in sync when data arrives from P2P sync:

```typescript
// At module level in the store file
function initYjsObservers(): void {
  myYjsMap.observe(() => {
    useMyStore.setState({ items: Array.from(myYjsMap.values()) })
  })
}
initYjsObservers()
```

### Testing Changes

Tests should mock Yjs instead of IndexedDB. The `resetYDoc()` utility clears all maps for test isolation:

```typescript
import { resetYDoc } from '@/lib/yjs'
import { agents } from '@/lib/yjs'

beforeEach(() => {
  resetYDoc()  // Clears all Yjs maps
})

it('should create an agent', () => {
  agents.set('test-id', { id: 'test-id', name: 'Test', ... })
  expect(agents.get('test-id')).toBeDefined()
})
```

### What Still Uses IndexedDB

The legacy IndexedDB layer (`src/lib/db/`) is only imported by a small number of files:

| File | Reason |
| ---- | ------ |
| `src/lib/yjs/migrate.ts` | One-time migration (reads legacy data, gracefully handles missing stores) |
| `src/lib/knowledge-sync.ts` | `FileSystemHandle` and `PersistedFolderWatcher` objects (non-serializable) |
| `src/features/local-backup/stores/folderSyncStore.ts` | `FileSystemHandle` storage for local backup |
| `src/lib/crypto/index.ts` | `CryptoKey` objects for non-extractable key storage |

The only data that **must** remain in IndexedDB are browser-native objects that cannot be serialized:

| Data Type | Store | Reason |
| --------- | ----- | ------ |
| `CryptoKey` objects | `cryptoKeys` | Non-extractable WebCrypto keys, browser-tab-specific |
| `FileSystemHandle` objects | `fileHandles` | Browser-native file access handles, non-serializable |
| `PersistedFolderWatcher` | `folderWatchers` | Folder watch metadata referencing handles |

All other object stores (24 total) were deleted in database version 21.

### Core Yjs Files

| File                        | Purpose                                     |
| --------------------------- | ------------------------------------------- |
| `src/lib/yjs/doc.ts`        | Yjs document singleton, persistence, `transact()`, `resetYDoc()` |
| `src/lib/yjs/maps.ts`       | 22+ typed Y.Map exports for all entity types |
| `src/lib/yjs/sync.ts`       | WebSocket sync control (enable/disable), activity tracking |
| `src/lib/yjs/reactive.ts`   | React hooks (`useLiveMap`, `useLiveValue`, `useSyncReady`) |
| `src/lib/yjs/migrate.ts`    | One-time `devs-ai-platform` → Yjs migration |
| `src/lib/yjs/compat.ts`     | Legacy compatibility getters (`getAgentsMap()`, etc.) |
| `src/lib/yjs/index.ts`      | Public barrel API (all exports)             |

---

## FAQ

### Do I need to do anything to migrate my data?

No. Migration is fully automatic. Just open DEVS after updating and your data will be migrated in the background.

### Will I lose any data?

No. The migration copies data from IndexedDB to Yjs. Your original IndexedDB data is preserved as a backup.

### What if I use P2P sync across multiple devices?

Update all devices to the latest version. Each device will migrate independently, and Yjs's CRDT algorithm will merge everything automatically without conflicts.

### Does this affect my LLM API keys?

No. API keys are encrypted using AES-GCM 256-bit (via PBKDF2 key derivation) and stored in the `credentials` Yjs map. The encryption keys (`CryptoKey` objects) remain in IndexedDB since they are non-extractable browser-native objects. Your keys continue to work as before.

### Is P2P sync encrypted?

Credentials stored in Yjs are encrypted at rest (only decryptable with the encryption password). However, other synced data (conversations, agents, tasks, etc.) travels as plain Yjs binary updates over the WebSocket connection. The sync room `password` provides **server-side room authentication** — it restricts who can join a room — but is **not E2E payload encryption**. If you require full E2E encryption of all synced data, consider using `y-webrtc` which supports it natively, or adding a custom encryption layer.

### Can I go back to the old version?

Your legacy IndexedDB data is preserved, so older versions of DEVS can still read it. However, any new data created after migration will only exist in Yjs.

### Does this work offline?

Yes. Yjs works entirely offline. The `y-indexeddb` provider persists data locally, and all reads/writes are local. P2P sync is optional.

### What happens in private/incognito browsing?

DEVS works in private mode, but data is stored in-memory only and will be lost when the window closes. This is a browser limitation, not specific to DEVS.

### I'm a developer — do I need to update my components?

No. All store APIs (`useAgents()`, `createAgent()`, etc.) have the same signatures. Only internal store implementations changed. Your components and custom code should work without modification.

### How much data can Yjs handle?

Yjs is highly optimized and handles large datasets efficiently. The `y-indexeddb` provider uses binary encoding for compact storage. For batch operations, use `transact()` to group writes.

### Where can I learn more about the technical architecture?

See [SYNC_YJS_FIRST.md](SYNC_YJS_FIRST.md) for the complete architecture document, and [SYNC.md](SYNC.md) for the current sync documentation.
