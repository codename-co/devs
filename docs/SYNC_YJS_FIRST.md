# DEVS Sync — Yjs-First Architecture

## Overview

This document outlines a simplified sync architecture using the **existing Yjs dependencies** but eliminating the dual-storage anti-pattern. The goal: make Yjs the **single source of truth** instead of a sync layer on top of IndexedDB.

### Current State (The Problem)

```
┌──────────────────────────────────────────────────────────────────┐
│                     CURRENT ARCHITECTURE                         │
│                                                                  │
│   React ──► Zustand ──► IndexedDB ──► Sync Bridge ──► Yjs       │
│                              │              │           │        │
│                              │              │           │        │
│                              ▼              ▼           ▼        │
│                         Source A ◄── ??? ──► Source B           │
│                                                                  │
│   Problems:                                                      │
│   • Two sources of truth (IndexedDB + Yjs)                      │
│   • 1200+ lines of sync-bridge.ts                               │
│   • Timestamp-based merge logic for conflict resolution         │
│   • Race conditions between local writes and remote syncs       │
│   • Complex initialization sequence (6 steps)                   │
│   • pendingSyncOps queue for timing issues                      │
└──────────────────────────────────────────────────────────────────┘
```

### Target State (The Solution)

```
┌──────────────────────────────────────────────────────────────────┐
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
│   • ~200 lines of code                                          │
│   • CRDT handles all conflicts automatically                    │
│   • No race conditions — Yjs transactions are atomic            │
│   • Simple initialization (1 step: await persistence.whenSynced)│
│   • No pending queues needed                                    │
└──────────────────────────────────────────────────────────────────┘
```

---

## Key Principle: Yjs IS the Database

Instead of:
```typescript
// ❌ Current: Zustand store → IndexedDB → sync to Yjs
const useAgentStore = create((set) => ({
  agents: [],
  addAgent: async (agent) => {
    await db.put('agents', agent)     // Write to IndexedDB
    syncToYjs('agents', agent)        // Mirror to Yjs
    set(state => ({ agents: [...state.agents, agent] }))
  }
}))
```

Do this:
```typescript
// ✅ Target: Yjs map directly
export function addAgent(agent: Agent): void {
  getAgentsMap().set(agent.id, agent)  // That's it. Done.
}
```

---

## Implementation

### Step 1: Simplified Yjs Document (`src/lib/yjs/doc.ts`)

```typescript
/**
 * Yjs Document — Single Source of Truth
 * 
 * All app data lives here. No IndexedDB, no Zustand stores for data.
 * y-indexeddb handles persistence automatically.
 */
import * as Y from 'yjs'
import { IndexeddbPersistence } from 'y-indexeddb'
import { WebsocketProvider } from 'y-websocket'
import type { Agent, Conversation, Task, KnowledgeItem, Artifact, AgentMemoryEntry } from '@/types'

// ============================================================================
// Document Singleton
// ============================================================================

const ydoc = new Y.Doc()

// Persistence (local storage)
const persistence = new IndexeddbPersistence('devs', ydoc)

// Sync provider (null until enabled)
let wsProvider: WebsocketProvider | null = null

/** Wait for local data to load */
export const whenReady = persistence.whenSynced

/** Check if ready */
export const isReady = () => persistence.synced

// ============================================================================
// Data Maps (Type-Safe)
// ============================================================================

export const agents = ydoc.getMap<Agent>('agents')
export const conversations = ydoc.getMap<Conversation>('conversations')
export const knowledge = ydoc.getMap<KnowledgeItem>('knowledge')
export const tasks = ydoc.getMap<Task>('tasks')
export const artifacts = ydoc.getMap<Artifact>('artifacts')
export const memories = ydoc.getMap<AgentMemoryEntry>('memories')
export const preferences = ydoc.getMap<unknown>('preferences')
export const credentials = ydoc.getMap<unknown>('credentials')

// ============================================================================
// Sync Control
// ============================================================================

export interface SyncConfig {
  roomId: string
  server?: string
  password?: string
}

export function enableSync(config: SyncConfig): void {
  if (wsProvider) {
    wsProvider.destroy()
  }
  
  wsProvider = new WebsocketProvider(
    config.server || 'wss://sync.devs.new',
    config.roomId,
    ydoc,
    { params: config.password ? { password: config.password } : undefined }
  )
  
  wsProvider.on('status', ({ status }: { status: string }) => {
    console.log('[Sync]', status)
  })
}

export function disableSync(): void {
  wsProvider?.destroy()
  wsProvider = null
}

export function getSyncStatus(): 'disabled' | 'connecting' | 'connected' {
  if (!wsProvider) return 'disabled'
  return wsProvider.wsconnected ? 'connected' : 'connecting'
}

export function getPeerCount(): number {
  return wsProvider?.awareness.getStates().size ?? 0
}

// ============================================================================
// Transactions (for batched writes)
// ============================================================================

export function transact(fn: () => void): void {
  ydoc.transact(fn)
}
```

**Lines of code: ~80** (vs 150+ in current yjs-doc.ts + yjs-persistence.ts)

---

### Step 2: Typed Maps (`src/lib/yjs/maps.ts`)

```typescript
/**
 * Typed Yjs Maps
 * 
 * Type-safe accessors for each entity collection.
 * These are used by stores internally.
 */
import { ydoc } from './doc'
import type { Agent, Conversation, Task, KnowledgeItem, Artifact, AgentMemoryEntry } from '@/types'

export const agents = ydoc.getMap<Agent>('agents')
export const conversations = ydoc.getMap<Conversation>('conversations')
export const knowledge = ydoc.getMap<KnowledgeItem>('knowledge')
export const tasks = ydoc.getMap<Task>('tasks')
export const artifacts = ydoc.getMap<Artifact>('artifacts')
export const memories = ydoc.getMap<AgentMemoryEntry>('memories')
export const preferences = ydoc.getMap<unknown>('preferences')
export const credentials = ydoc.getMap<unknown>('credentials')
```

---

### Step 3: Refactored Store Example (`src/stores/agentStore.ts`)

The key insight: **keep the exact same exports**, just replace IndexedDB + syncToYjs with direct Yjs writes.

```typescript
/**
 * Agent Store — Yjs-First Version
 * 
 * SAME API as before. Only internals changed.
 * Components don't need any updates.
 */
import { create } from 'zustand'
import { nanoid } from 'nanoid'
import { agents } from '@/lib/yjs/maps'
import { ydoc } from '@/lib/yjs/doc'
import { generateUniqueSlug } from '@/lib/slugify'
import type { Agent } from '@/types'

// ============================================================================
// Zustand Store (for React integration)
// ============================================================================

interface AgentState {
  // Computed from Yjs — no local state duplication
}

export const useAgentStore = create<AgentState>()(() => ({}))

// ============================================================================
// CRUD Functions — SAME SIGNATURES AS BEFORE
// ============================================================================

/**
 * Create a new agent
 * @returns The created agent
 */
export async function createAgent(
  data: Omit<Agent, 'id' | 'slug' | 'createdAt' | 'updatedAt'>
): Promise<Agent> {
  const now = new Date()
  const existingSlugs = Array.from(agents.values()).map(a => a.slug)
  
  const agent: Agent = {
    ...data,
    id: nanoid(),
    slug: generateUniqueSlug(data.name, existingSlugs),
    createdAt: now,
    updatedAt: now,
  }
  
  agents.set(agent.id, agent)
  return agent
}

/**
 * Update an existing agent
 */
export async function updateAgent(id: string, patch: Partial<Agent>): Promise<void> {
  const existing = agents.get(id)
  if (!existing) return
  
  agents.set(id, { ...existing, ...patch, updatedAt: new Date() })
}

/**
 * Soft-delete an agent
 */
export async function deleteAgent(id: string): Promise<void> {
  const existing = agents.get(id)
  if (!existing) return
  
  agents.set(id, { ...existing, deletedAt: new Date() })
}

/**
 * Get agent by ID
 */
export function getAgentById(id: string): Agent | undefined {
  return agents.get(id)
}

/**
 * Get agent by slug
 */
export function getAgentBySlug(slug: string): Agent | undefined {
  return Array.from(agents.values()).find(a => a.slug === slug && !a.deletedAt)
}

/**
 * Get all non-deleted agents
 */
export function getAllAgents(): Agent[] {
  return Array.from(agents.values()).filter(a => !a.deletedAt)
}

/**
 * Batch create agents (e.g., importing)
 */
export async function batchCreateAgents(agentsData: Agent[]): Promise<void> {
  ydoc.transact(() => {
    for (const agent of agentsData) {
      agents.set(agent.id, agent)
    }
  })
}

// ============================================================================
// React Hooks — SAME AS BEFORE
// ============================================================================

import { useSyncExternalStore, useCallback, useRef } from 'react'

/**
 * Subscribe to all agents (reactive)
 */
export function useAgents(): Agent[] {
  const cacheRef = useRef<{ version: number; data: Agent[] }>({ version: 0, data: [] })
  
  const subscribe = useCallback((onStoreChange: () => void) => {
    const handler = () => {
      cacheRef.current.version++
      onStoreChange()
    }
    agents.observeDeep(handler)
    return () => agents.unobserveDeep(handler)
  }, [])
  
  const getSnapshot = useCallback(() => {
    const newData = Array.from(agents.values()).filter(a => !a.deletedAt)
    if (newData.length !== cacheRef.current.data.length) {
      cacheRef.current.data = newData
    }
    return cacheRef.current.data
  }, [])
  
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

/**
 * Subscribe to a single agent by ID
 */
export function useAgent(id: string | undefined): Agent | undefined {
  const subscribe = useCallback((onStoreChange: () => void) => {
    if (!id) return () => {}
    const handler = () => onStoreChange()
    agents.observe(handler)
    return () => agents.unobserve(handler)
  }, [id])
  
  const getSnapshot = useCallback(() => {
    if (!id) return undefined
    return agents.get(id)
  }, [id])
  
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}
```

**What changed:**

| Before (IndexedDB + Sync) | After (Yjs-First) |
|---------------------------|-------------------|
| `await db.put('agents', agent)` | `agents.set(agent.id, agent)` |
| `syncToYjs('agents', agent)` | *(not needed — Yjs IS the store)* |
| `set(state => ({ agents: [...] }))` | *(not needed — hooks observe Yjs directly)* |

**What stayed the same:**

- All function signatures
- All hook signatures  
- All imports from components

---

### Step 4: Shared Reactive Utilities (`src/lib/yjs/reactive.ts`)

Stores can import these shared utilities for consistent reactive behavior:

```typescript
/**
 * Shared Reactive Utilities for Yjs
 * 
 * Used by all stores for consistent useSyncExternalStore integration.
 */
import { useSyncExternalStore, useCallback, useRef } from 'react'
import * as Y from 'yjs'
import { isReady } from './doc'

/**
 * Generic hook to subscribe to all values in a Yjs map
 */
export function useLiveMap<T>(map: Y.Map<T>): T[] {
  const cacheRef = useRef<{ version: number; data: T[] }>({ version: 0, data: [] })
  
  const subscribe = useCallback((onStoreChange: () => void) => {
    const handler = () => {
      cacheRef.current.version++
      onStoreChange()
    }
    map.observeDeep(handler)
    return () => map.unobserveDeep(handler)
  }, [map])
  
  const getSnapshot = useCallback(() => {
    if (!isReady()) return cacheRef.current.data
    
    const newData = Array.from(map.values())
    if (newData.length !== cacheRef.current.data.length ||
        newData.some((item, i) => item !== cacheRef.current.data[i])) {
      cacheRef.current.data = newData
    }
    return cacheRef.current.data
  }, [map])
  
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

/**
 * Generic hook to subscribe to a single value by ID
 */
export function useLiveValue<T>(map: Y.Map<T>, id: string | undefined): T | undefined {
  const subscribe = useCallback((onStoreChange: () => void) => {
    if (!id) return () => {}
    const handler = () => onStoreChange()
    map.observe(handler)
    return () => map.unobserve(handler)
  }, [map, id])
  
  const getSnapshot = useCallback(() => {
    if (!id || !isReady()) return undefined
    return map.get(id)
  }, [map, id])
  
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

/**
 * Hook to check if Yjs data is ready
 */
export function useSyncReady(): boolean {
  const subscribe = useCallback((onStoreChange: () => void) => {
    if (isReady()) return () => {}
    const interval = setInterval(() => {
      if (isReady()) {
        clearInterval(interval)
        onStoreChange()
      }
    }, 50)
    return () => clearInterval(interval)
  }, [])
  
  return useSyncExternalStore(subscribe, isReady, () => false)
}
```

---

### Step 5: Public API (`src/lib/yjs/index.ts`)

Minimal exports — stores handle entity-specific logic:

```typescript
/**
 * Yjs Core — Public API
 * 
 * Low-level exports for stores to build upon.
 * Components import from stores, not from here.
 */

// Document lifecycle
export { ydoc, whenReady, isReady } from './doc'

// Sync control
export { enableSync, disableSync, getSyncStatus, getPeerCount } from './sync'

// Typed maps (for stores)
export { agents, conversations, knowledge, tasks, artifacts, memories, preferences, credentials } from './maps'

// Reactive utilities (for stores)
export { useLiveMap, useLiveValue, useSyncReady } from './reactive'

// Migration (called once at app init)
export { migrateFromIndexedDB } from './migrate'
```

---

## Migration Strategy

### Key Principle: Keep Store Interfaces

The existing store APIs (`useAgents()`, `createAgent()`, etc.) remain **unchanged**. Only the internal implementation switches from IndexedDB to Yjs. This means:

- **Zero changes to components** — imports stay the same
- **No feature flags needed** — stores work identically
- **Instant rollout** — swap implementation, done

```tsx
// Components don't change at all!
import { useAgents, createAgent } from '@/stores/agentStore'  // Same as before
```

### Phase 1: Create Yjs Core (Week 1)

1. Create `src/lib/yjs/` with document, persistence, and sync
2. Create `src/lib/yjs/maps.ts` exporting typed Y.Maps
3. Test in isolation with unit tests

### Phase 2: Rewrite Stores (Week 2)

Rewrite each store to use Yjs internally while keeping the exact same exports:

**Migration order:**
1. `agentStore.ts` — Most used, good test case
2. `conversationStore.ts` — Complex, validates approach
3. `knowledgeStore.ts`, `taskStore.ts`, `artifactStore.ts`
4. `agentMemoryStore.ts`

### Phase 3: Data Migration (Automatic)

Migration happens automatically on first load — no user action required:

```typescript
// src/lib/yjs/migrate.ts
import { db } from '@/lib/db'
import { agents, conversations, knowledge, tasks, artifacts, memories } from './maps'
import { ydoc, whenReady } from './doc'

const MIGRATED_KEY = 'devs-yjs-first-migrated'
const MIGRATED_VERSION = '1' // Bump to re-migrate

export async function migrateFromIndexedDB(): Promise<void> {
  const migrated = localStorage.getItem(MIGRATED_KEY)
  if (migrated === MIGRATED_VERSION) return
  
  await whenReady
  
  // If Yjs already has data (from peer sync), skip migration
  if (agents.size > 0 || conversations.size > 0) {
    console.log('[Migration] Yjs has data from peers, skipping IndexedDB migration')
    localStorage.setItem(MIGRATED_KEY, MIGRATED_VERSION)
    return
  }
  
  // Check if IndexedDB has data to migrate
  if (!db.isInitialized()) {
    console.log('[Migration] No IndexedDB data, fresh install')
    localStorage.setItem(MIGRATED_KEY, MIGRATED_VERSION)
    return
  }
  
  console.log('[Migration] Migrating IndexedDB → Yjs...')
  
  ydoc.transact(() => {
    // Migrate each entity type
    const entities = [
      { store: 'agents', map: agents },
      { store: 'conversations', map: conversations },
      { store: 'knowledgeItems', map: knowledge },
      { store: 'tasks', map: tasks },
      { store: 'artifacts', map: artifacts },
      { store: 'agentMemories', map: memories },
    ]
    
    for (const { store, map } of entities) {
      try {
        const items = db.getAllSync(store) // Sync read for transaction
        for (const item of items) {
          map.set(item.id, item)
        }
        console.log(`[Migration] ${store}: ${items.length} items`)
      } catch (err) {
        console.warn(`[Migration] ${store} failed:`, err)
      }
    }
  })
  
  localStorage.setItem(MIGRATED_KEY, MIGRATED_VERSION)
  console.log('[Migration] Complete!')
}
```

### Phase 4: Cleanup (Week 3)

**Delete:**
- `src/features/sync/lib/sync-bridge.ts` (1254 lines) — No longer needed
- `src/lib/db/` (entire IndexedDB layer) — After 2-week backup period

**Keep & Refactor:**
- `src/stores/*.ts` — **Keep all stores!** Just replace internals with Yjs
- `src/features/sync/lib/yjs-doc.ts` → Move to `src/lib/yjs/doc.ts`
- `src/features/sync/lib/yjs-persistence.ts` → Inline into doc.ts
- `src/features/sync/lib/sync-manager.ts` → Simplify and move to `src/lib/yjs/sync.ts`
- `src/features/sync/components/` → Keep for sync UI
- `src/hooks/useLive.ts` → Simplify (remove IndexedDB fallbacks)

---

## File Structure (End State)

```
src/
├── lib/
│   └── yjs/
│       ├── index.ts       # Public API exports
│       ├── doc.ts         # Yjs document singleton
│       ├── maps.ts        # Typed Y.Map exports
│       ├── sync.ts        # WebSocket sync control
│       └── migrate.ts     # One-time IndexedDB migration
├── stores/
│   ├── agentStore.ts      # KEPT — same API, Yjs internals
│   ├── conversationStore.ts
│   ├── knowledgeStore.ts
│   ├── taskStore.ts
│   ├── artifactStore.ts
│   ├── agentMemoryStore.ts
│   └── userStore.ts       # UI preferences (localStorage)
├── hooks/
│   └── useLive.ts         # Simplified reactive hooks
└── features/
    └── sync/
        ├── components/    # SyncButton, SyncPanel, etc.
        └── stores/        # syncStore.ts (sync UI state)
```

---

## Comparison: Before & After

### Lines of Code

| Component | Before | After | Change |
|-----------|--------|-------|--------|
| sync-bridge.ts | 1254 | 0 | -1254 |
| yjs-doc.ts + persistence | 250 | 100 | -150 |
| sync-manager.ts | 400 | 80 | -320 |
| Zustand stores (6 files) | ~2500 | ~600 | -1900 |
| useLive.ts | 516 | 200 | -316 |
| New yjs/maps.ts | 0 | 50 | +50 |
| **Total** | **~4900** | **~1030** | **-3870** |

**~80% reduction in code** while keeping the same store APIs.

### Dependencies

No changes — uses existing:
- `yjs`
- `y-indexeddb`
- `y-websocket`
- `y-webrtc` (optional)
- `zustand` (kept for stores — just simpler internals)

**Removes internal dependency on:**
- `src/lib/db/` (IndexedDB wrapper)
- `src/features/sync/lib/sync-bridge.ts`

### Complexity

| Aspect | Before | After |
|--------|--------|-------|
| Sources of truth | 2 | 1 |
| Init steps | 6 | 1 |
| Conflict resolution | Manual timestamps | Automatic CRDT |
| Pending operation queues | Yes | No |
| Race conditions possible | Yes | No |

---

## Edge Cases Handled

### 1. Private Browsing Mode

y-indexeddb fails gracefully — data stays in memory, syncs with peers normally.

```typescript
persistence.on('synced', () => console.log('Ready'))
persistence.on('error', (err) => console.warn('No persistence:', err))
```

### 2. Offline Mode

Yjs continues to work — all writes are local. When connection resumes, CRDTs merge automatically.

### 3. Large Data Sets

Use Yjs transactions for batch operations:

```typescript
import { transact } from '@/lib/yjs'

transact(() => {
  for (const item of largeArray) {
    knowledge.set(item.id, item)
  }
})
```

### 4. Binary Files

For large files, consider using separate storage:

```typescript
// Option A: Base64 in Yjs (simple, works for small files)
knowledge.set(id, { ...item, content: btoa(binaryData) })

// Option B: Separate blob store (for large files)
// Keep metadata in Yjs, store blob in separate IndexedDB
const blobStore = new BlobStore()
await blobStore.put(id, blob)
knowledge.set(id, { ...item, blobRef: id })
```

---

## Rollout Plan

| Week | Milestone | Risk Level |
|------|-----------|------------|
| 1 | Create `src/lib/yjs/` core module | Low |
| 1 | Rewrite `agentStore.ts` with Yjs internals | Low |
| 2 | Rewrite remaining stores | Medium |
| 2 | Add automatic data migration | Low |
| 3 | Delete sync-bridge.ts, cleanup | Low |
| 3 | Delete `src/lib/db/` after backup period | Low |

---

## Risks & Mitigations

### Risk 1: Data Loss During Migration

**Mitigation:**
- Migration is idempotent (checks `MIGRATED_KEY`)
- Skip migration if Yjs already has data
- Keep IndexedDB as read-only backup for 2 weeks

### Risk 2: Performance with Large Datasets

**Mitigation:**
- Yjs is highly optimized for large maps
- y-indexeddb uses efficient binary encoding
- Add pagination for UI if needed (hook level, not data level)

### Risk 3: Breaking Changes

**Mitigation:**
- Store APIs don't change — only internals
- No component changes required
- Migrate one store at a time
- Comprehensive unit tests before each store migration

---

## Summary

This architecture:

1. **Eliminates dual storage** — Yjs IS the database
2. **Removes 4400+ lines of code** — 90% reduction
3. **Uses existing dependencies** — No new packages
4. **Simplifies debugging** — One data source, one flow
5. **Improves reliability** — CRDTs handle conflicts automatically
6. **Enables instant reactivity** — No IndexedDB round-trip

The migration can be done incrementally over 4 weeks with minimal risk.

---

## Implementation TODO

### Phase 1: Create Yjs Core Module ✅

- [x] Create `src/lib/yjs/doc.ts` — Yjs document singleton with IndexedDB persistence
- [x] Create `src/lib/yjs/maps.ts` — Typed Y.Map exports for all entities
- [x] Create `src/lib/yjs/sync.ts` — WebSocket sync control (enableSync, disableSync, getSyncStatus, getPeerCount)
- [x] Create `src/lib/yjs/reactive.ts` — React hooks (useLiveMap, useLiveValue, useSyncReady)
- [x] Create `src/lib/yjs/migrate.ts` — One-time IndexedDB → Yjs migration
- [x] Create `src/lib/yjs/index.ts` — Public API exports

### Phase 2: Refactor Stores to Use Yjs ✅

- [x] Refactor `src/stores/agentStore.ts` — Use `agents` Yjs map, remove IndexedDB + syncToYjs calls
- [x] Refactor `src/stores/conversationStore.ts` — Use `conversations` Yjs map
- [x] Refactor `src/stores/taskStore.ts` — Use `tasks` Yjs map
- [x] Refactor `src/stores/artifactStore.ts` — Use `artifacts` Yjs map
- [x] Refactor `src/stores/agentMemoryStore.ts` — Use `memories` Yjs map
- [x] Create `src/stores/knowledgeStore.ts` — New Yjs-first store for knowledge items

### Phase 3: Update Hooks & App Initialization ✅

- [x] Simplify `src/hooks/useLive.ts` — Remove IndexedDB fallbacks, use Yjs reactive utilities
- [x] Update `src/main.tsx` — Call `migrateFromIndexedDB()` and wait for `whenReady`
- [x] Update tests to mock Yjs instead of IndexedDB

### Phase 4: Cleanup ✅

- [x] Extend `src/lib/yjs/maps.ts` — Added `workflows`, `battles`, `secrets`, `studioEntries`, `pinnedMessages` maps
- [x] Add `resetYDoc()` to `src/lib/yjs/doc.ts` — For testing support
- [x] Create `src/lib/yjs/compat.ts` — Backward-compatible function-style getters
- [x] Add sync UI types to `src/lib/yjs/sync.ts` — `PeerInfo`, `SyncActivity`, `getPeers()`, `onSyncActivity()`, etc.
- [x] Migrate `src/stores/battleStore.ts` — Use `battles` Yjs map directly
- [x] Migrate `src/stores/credentialStore.ts` — Use `credentials` Yjs map directly
- [x] Migrate `src/stores/studioStore.ts` — Use `studioEntries` Yjs map directly
- [x] Migrate `src/hooks/usePinnedMessages.ts` — Use `pinnedMessages` Yjs map directly
- [x] Migrate `src/pages/Knowledge/Knowledge.tsx` — Use `knowledge` Yjs map directly
- [x] Update `src/hooks/useLive.ts` — Import from `@/lib/yjs` instead of yjs-persistence
- [x] Update `src/features/local-backup/lib/local-backup-service.ts` — Use `@/lib/yjs` imports
- [x] Update sync UI components — Import `PeerInfo`, `SyncActivity` from `@/lib/yjs`
- [x] Update `src/features/sync/index.ts` — Add deprecation comments, re-export from `@/lib/yjs`
- [x] Delete `src/features/sync/lib/sync-bridge.ts` — Deleted (no remaining imports)
- [x] Delete `src/features/sync/lib/yjs-persistence.ts` — Deleted (no remaining imports)
- [x] Remove unused IndexedDB stores — 24 object stores deleted in DB version 21; only `cryptoKeys`, `fileHandles`, and `folderWatchers` remain

### Phase 5: Testing & Validation (Pending)

- [ ] Run full E2E test suite with Yjs-first architecture
- [ ] Test P2P sync between multiple devices
- [ ] Test offline mode and data persistence
- [ ] Test data migration from existing IndexedDB installations
- [ ] Performance testing with large datasets (1000+ agents, conversations)
- [ ] Test private browsing mode (no IndexedDB persistence)

### Phase 6: Documentation & Polish (Pending)

- [x] Update `ARCHITECTURE.md` with new sync architecture
- [x] Update `docs/SYNC.md` to reflect Yjs-first approach
- [x] Add inline code documentation for new `src/lib/yjs/` module
- [x] Create migration guide for users with existing data (`docs/MIGRATION_YJS.md`)
- [x] Update `AGENTS.md` with new store patterns

### Phase 7: End-to-End Encryption (Pending)

**Problem:** Yjs updates flow as plaintext through the WebSocket signaling server. Room derivation via PBKDF2 prevents wrong-password access, but the server operator and any TLS-level attacker can read all synced data.

**Goal:** Encrypt every Yjs update with a symmetric key derived from the room password so that only peers who know the password can read the data. The signaling server becomes a dumb relay of opaque ciphertext.

#### 7.1 — Crypto Transport Layer (`src/lib/yjs/crypto-transport.ts`)

- [x] Create `deriveEncryptionKey(password, roomId)` — PBKDF2 → AES-GCM 256-bit key (separate derivation from room name to avoid key reuse)
- [x] Create `encryptUpdate(key, update: Uint8Array)` → `{ iv, ciphertext }` — AES-GCM encryption of a Yjs update binary
- [x] Create `decryptUpdate(key, iv, ciphertext)` → `Uint8Array` — AES-GCM decryption back to Yjs update
- [x] Use a unique random 12-byte IV per update (never reuse IVs with the same key)
- [x] Define a compact wire format: `[1-byte version][12-byte IV][ciphertext]` for minimal overhead
- [x] Add tests: round-trip, wrong-key rejection, IV uniqueness, corrupted-data handling (30 tests in `crypto.test.ts`)

> **Implemented in `src/lib/yjs/crypto.ts`** — PBKDF2 100k iterations, AES-GCM-256, salt `devs-e2e:{len}:{roomId}` (independent from room derivation salt `devs-sync:`).

#### 7.2 — Encrypted WebSocket Provider

- [x] Create `EncryptedWebSocket` class wrapping the native `WebSocket` via `WebSocketPolyfill` option
- [x] Intercept outgoing `send()` calls → encrypt via AES-GCM → forward to real WebSocket
- [x] Intercept incoming `onmessage` events → decrypt → forward to y-websocket handler
- [x] Handle decryption failures gracefully (log warning, silently drop undecryptable messages)
- [x] Preserve message ordering via async send/receive queues
- [x] Support y-websocket's automatic reconnection (key captured in closure, new instances reuse it)
- [x] Add tests: send encryption, receive decryption, round-trip, order preservation, cross-key isolation (11 tests in `encrypted-ws.test.ts`)

> **Implemented in `src/lib/yjs/encrypted-ws.ts`** — Factory function `createEncryptedWebSocketClass(key)` returns a WebSocket-compatible class. All messages (sync protocol + awareness) are encrypted transparently.

#### 7.3 — Key Derivation Separation

- [x] Derive **two independent keys** from the password using different PBKDF2 salts:
  - `room-name-key`: `PBKDF2(password, "devs-sync:{len}:{roomId}")` → hex room name (existing)
  - `encryption-key`: `PBKDF2(password, "devs-e2e:{len}:{roomId}")` → AES-GCM key (new)
- [x] This ensures that knowing the room name hash does NOT reveal the encryption key
- [x] Both keys derived in parallel via `Promise.all()` for minimal latency

#### 7.4 — Integration with `enableSync()`

- [x] Update `enableSync()` in `src/lib/yjs/sync.ts` to derive the encryption key alongside the room name
- [x] Pass `EncryptedWebSocket` class to `WebsocketProvider` via `WebSocketPolyfill` option
- [x] Update `SyncConfig` type JSDoc — documents E2E encryption usage of password
- [x] Update `src/features/sync/lib/sync-manager.ts` with matching encryption integration
- [ ] Update `disableSync()` to zero-out the cached encryption key from memory

#### 7.5 — Wire Protocol Versioning

- [x] Add a 1-byte version prefix to all encrypted messages (start with `0x01`)
- [x] On receive, check version byte — reject unknown versions with a clear warning
- [x] This enables future protocol upgrades (e.g., switching cipher, adding compression) without breaking peers on older versions
- [ ] Ensure unencrypted (legacy) updates are detected and rejected with a user-facing error ("Peer is using an older version without encryption")

#### 7.6 — Performance & Optimization

- [ ] Benchmark encrypt/decrypt latency for typical Yjs update sizes (100B–100KB)
- [ ] Ensure sub-5ms overhead per update on mid-range devices
- [ ] Consider batching small rapid-fire updates before encrypting (Yjs already coalesces within transactions)
- [ ] Profile memory usage — AES-GCM in Web Crypto API is streaming-friendly
- [ ] Test on low-spec hardware (2GB RAM target from project requirements)

#### 7.7 — Testing

- [x] Unit tests for `crypto.ts`: encrypt/decrypt round-trip, wrong key, corrupted ciphertext, empty update, large update (100KB) — **30 tests**
- [x] Unit tests for `encrypted-ws.ts`: mock WebSocket, verify ciphertext goes on the wire (not plaintext) — **11 tests**
- [ ] Integration test: two Yjs docs with encrypted provider, verify sync works end-to-end
- [ ] Integration test: two docs with **different passwords**, verify they cannot read each other's updates
- [ ] E2E test: join room, create agent, verify it appears on second peer, verify signaling server only sees ciphertext
- [ ] Regression test: ensure unencrypted sync no longer works (breaking change is intentional)

#### 7.8 — Documentation & Privacy Page

- [ ] Update `docs/SYNC.md` — Document E2E encryption architecture, wire format, threat model
- [ ] Update `docs/MIGRATION_YJS.md` — Note that Phase 7 is a breaking change for existing sync sessions
- [ ] Update `src/pages/Privacy/index.tsx` — Change "encrypted updates" claims to accurately reflect E2E encryption
- [ ] Update `docs/SECURITY.md` — Add E2E encryption to the security model
- [ ] Update `SyncConfig` JSDoc — ~~Remove outdated comment about password as query parameter~~ ✅ Done

---

## Current Status

**Completed:** Phases 1-4 (Core implementation + Cleanup) + Phase 7 core (E2E Encryption)

- All 6 Yjs core module files created
- All stores refactored to use Yjs as source of truth
- App initialization updated for migration
- Added compatibility layer for backward-compatible function getters
- Added sync UI types and functions (PeerInfo, SyncActivity, getPeers, etc.)
- Migrated all remaining stores (battle, credential, studio, pinnedMessages, knowledge)
- Updated all imports from yjs-persistence to @/lib/yjs
- Deleted `sync-bridge.ts` (1254 lines removed)
- Deleted `yjs-persistence.ts` (legacy persistence wrapper removed)
- Removed 24 unused IndexedDB object stores (DB version 21)
- Only 3 IndexedDB stores remain: `cryptoKeys`, `fileHandles`, `folderWatchers`
- **E2E encryption implemented** — All Yjs sync messages encrypted with AES-GCM-256 via `EncryptedWebSocket` wrapper
  - `src/lib/yjs/crypto.ts` — Key derivation + encrypt/decrypt primitives
  - `src/lib/yjs/encrypted-ws.ts` — WebSocket wrapper with transparent encrypt/decrypt
  - 41 new unit tests (30 crypto + 11 encrypted-ws)
- 1101 tests passing

**Remaining:** Phases 5-7 (Testing, Documentation & E2E hardening)

- IndexedDB layer (`src/lib/db/`) kept for the 3 remaining stores:
  - `cryptoKeys`: Non-extractable CryptoKey objects
  - `fileHandles`: FileSystemHandle objects
  - `folderWatchers`: Folder watch metadata
- Full E2E testing needed (integration + Playwright)
- Documentation updates pending (SYNC.md, SECURITY.md, Privacy page)
- **Remaining E2E encryption work:** key zeroing on disconnect, legacy-peer rejection UX, performance benchmarking, low-spec hardware validation
