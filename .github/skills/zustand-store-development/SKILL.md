---
name: zustand-store-development
description: Guide for creating and modifying Zustand stores with IndexedDB persistence in the DEVS platform. Use this when asked to create a new store, modify store logic, or work with state management.
---

# Zustand Store Development for DEVS

When creating or modifying Zustand stores in the DEVS platform, follow these patterns and best practices.

## Directory Structure

Stores are located in `src/stores/`. Each store manages a specific domain entity.

## Store Pattern Template

```typescript
import { create } from 'zustand'
import { db } from '@/lib/db'
import { toast } from '@/lib/toast'

// 1. Define the store state interface
interface EntityState {
  entities: Entity[]
  isLoading: boolean
  error: string | null
}

// 2. Define the store actions interface
interface EntityActions {
  loadEntities: () => Promise<void>
  createEntity: (data: CreateEntityInput) => Promise<Entity>
  updateEntity: (id: string, updates: Partial<Entity>) => Promise<void>
  deleteEntity: (id: string) => Promise<void>
  getEntityById: (id: string) => Entity | undefined
}

// 3. Create the store with both state and actions
export const useEntityStore = create<EntityState & EntityActions>(
  (set, get) => ({
    // Initial state
    entities: [],
    isLoading: false,
    error: null,

    // Actions
    loadEntities: async () => {
      set({ isLoading: true, error: null })
      try {
        const entities = await db.entities.toArray()
        set({ entities, isLoading: false })
      } catch (error) {
        set({ error: (error as Error).message, isLoading: false })
        toast.error('Failed to load entities')
      }
    },

    createEntity: async (data) => {
      const entity: Entity = {
        id: crypto.randomUUID(),
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      await db.entities.add(entity)
      set((state) => ({ entities: [...state.entities, entity] }))
      return entity
    },

    updateEntity: async (id, updates) => {
      const updatedData = { ...updates, updatedAt: new Date() }
      await db.entities.update(id, updatedData)
      set((state) => ({
        entities: state.entities.map((e) =>
          e.id === id ? { ...e, ...updatedData } : e,
        ),
      }))
    },

    deleteEntity: async (id) => {
      await db.entities.delete(id)
      set((state) => ({
        entities: state.entities.filter((e) => e.id !== id),
      }))
    },

    getEntityById: (id) => {
      return get().entities.find((e) => e.id === id)
    },
  }),
)

// 4. Export standalone functions for non-React contexts
export const getEntityById = (id: string) =>
  useEntityStore.getState().getEntityById(id)
export const createEntity = (data: CreateEntityInput) =>
  useEntityStore.getState().createEntity(data)
export const updateEntity = (id: string, updates: Partial<Entity>) =>
  useEntityStore.getState().updateEntity(id, updates)
export const deleteEntity = (id: string) =>
  useEntityStore.getState().deleteEntity(id)
```

## Critical Rules

1. **Export standalone functions**: Always export functions directly for use in non-React contexts (lib/, orchestrator, etc.)

   ```typescript
   // ✅ Correct - use exported functions in lib code
   import { getAgentById, createAgent } from '@/stores/agentStore'

   // ❌ Wrong - don't use hooks in lib code
   const { getAgentById } = useAgentStore()
   ```

2. **Database initialization**: Always check `db.isInitialized()` before operations if the store loads at app startup

3. **Optimistic updates**: Update local state immediately, then persist to IndexedDB

4. **Error handling**: Use try/catch with toast notifications for user feedback

5. **Timestamps**: Always update `updatedAt` when modifying entities

## Testing Requirements (TDD Mandatory)

All store changes MUST follow TDD:

1. Create test file at `src/test/stores/{storeName}.test.ts`
2. Write failing tests first
3. Implement minimum code to pass
4. Run `npm run test:coverage` before committing

Example test structure:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useEntityStore } from '@/stores/entityStore'

describe('entityStore', () => {
  beforeEach(() => {
    useEntityStore.setState({ entities: [], isLoading: false, error: null })
  })

  describe('createEntity', () => {
    it('should create entity with correct structure', async () => {
      const result = await useEntityStore
        .getState()
        .createEntity({ name: 'Test' })
      expect(result).toHaveProperty('id')
      expect(result.name).toBe('Test')
    })
  })
})
```

## Existing Stores Reference

- `agentStore` - AI agent management with slug generation
- `taskStore` - Task lifecycle and requirement validation
- `conversationStore` - Multi-agent chat history
- `artifactStore` - Task deliverables
- `contextStore` - Inter-agent context sharing
- `userStore` - User preferences and settings
- `agentMemoryStore` - Agent learning and memory
