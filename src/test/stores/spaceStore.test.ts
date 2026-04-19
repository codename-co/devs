import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Space } from '@/types'
import { ALL_SPACES_ID, DEFAULT_SPACE_ID } from '@/types'

// Mock Yjs spaces map
const mockSpacesMap = new Map<string, Space>()

vi.mock('@/lib/yjs', () => ({
  spaces: {
    get: (id: string) => mockSpacesMap.get(id),
    set: (id: string, value: Space) => mockSpacesMap.set(id, value),
    has: (id: string) => mockSpacesMap.has(id),
    delete: (id: string) => mockSpacesMap.delete(id),
    values: () => mockSpacesMap.values(),
    observe: vi.fn(),
    unobserve: vi.fn(),
  },
  transact: <T>(fn: () => T): T => fn(),
  useLiveMap: vi.fn(() => Array.from(mockSpacesMap.values())),
  useLiveValue: vi.fn((_map: unknown, id: string) => mockSpacesMap.get(id)),
}))

// Mock userSettings store
const mockActiveSpaceId = { value: DEFAULT_SPACE_ID }
vi.mock('@/stores/userStore', () => ({
  userSettings: Object.assign(
    (selector: (s: { activeSpaceId: string }) => string) =>
      selector({ activeSpaceId: mockActiveSpaceId.value }),
    {
      getState: () => ({
        activeSpaceId: mockActiveSpaceId.value,
        setActiveSpaceId: (id: string) => {
          mockActiveSpaceId.value = id
        },
      }),
    },
  ),
}))

// Must import after mocks are set up
import {
  createSpace,
  renameSpace,
  deleteSpace,
  getActiveSpaceId,
  setActiveSpaceId,
  getCreationSpaceId,
  getAllSpaces,
  getSpaceById,
  entityBelongsToSpace,
} from '@/stores/spaceStore'

describe('spaceStore', () => {
  beforeEach(() => {
    mockSpacesMap.clear()
    mockActiveSpaceId.value = DEFAULT_SPACE_ID
  })

  describe('createSpace', () => {
    it('should create a space with a generated id', () => {
      const ws = createSpace('My Project')
      expect(ws.id).toBeTruthy()
      expect(ws.name).toBe('My Project')
      expect(ws.createdAt).toBeTruthy()
      expect(mockSpacesMap.has(ws.id)).toBe(true)
    })

    it('should trim whitespace from the name', () => {
      const ws = createSpace('  Trimmed  ')
      expect(ws.name).toBe('Trimmed')
    })

    it('should throw for empty name', () => {
      expect(() => createSpace('')).toThrow(
        'Space name cannot be empty',
      )
      expect(() => createSpace('   ')).toThrow(
        'Space name cannot be empty',
      )
    })
  })

  describe('renameSpace', () => {
    it('should rename an existing space', () => {
      const ws = createSpace('Original')
      renameSpace(ws.id, 'Renamed')
      const updated = mockSpacesMap.get(ws.id)
      expect(updated?.name).toBe('Renamed')
    })

    it('should not rename the default space', () => {
      renameSpace(DEFAULT_SPACE_ID, 'Cannot Rename')
      // Default space is virtual, not in the map
      expect(mockSpacesMap.has(DEFAULT_SPACE_ID)).toBe(false)
    })

    it('should ignore rename with empty name', () => {
      const ws = createSpace('Original')
      renameSpace(ws.id, '   ')
      expect(mockSpacesMap.get(ws.id)?.name).toBe('Original')
    })
  })

  describe('deleteSpace', () => {
    it('should delete a space', () => {
      const ws = createSpace('To Delete')
      expect(mockSpacesMap.has(ws.id)).toBe(true)
      deleteSpace(ws.id)
      expect(mockSpacesMap.has(ws.id)).toBe(false)
    })

    it('should not delete the default space', () => {
      deleteSpace(DEFAULT_SPACE_ID)
      // No-op, no error
    })

    it('should switch to default when deleting the active space', () => {
      const ws = createSpace('Active WS')
      setActiveSpaceId(ws.id)
      expect(getActiveSpaceId()).toBe(ws.id)
      deleteSpace(ws.id)
      expect(getActiveSpaceId()).toBe(DEFAULT_SPACE_ID)
    })
  })

  describe('getActiveSpaceId / setActiveSpaceId', () => {
    it('should default to the default space', () => {
      expect(getActiveSpaceId()).toBe(DEFAULT_SPACE_ID)
    })

    it('should allow changing the active space', () => {
      const ws = createSpace('New Active')
      setActiveSpaceId(ws.id)
      expect(getActiveSpaceId()).toBe(ws.id)
    })
  })

  describe('getAllSpaces', () => {
    it('should always include the default space first', () => {
      const all = getAllSpaces()
      expect(all[0].id).toBe(DEFAULT_SPACE_ID)
      expect(all[0].name).toBe('Default')
    })

    it('should include the all-spaces synthetic view right after default', () => {
      const all = getAllSpaces()
      expect(all[1].id).toBe(ALL_SPACES_ID)
    })

    it('should include created spaces', () => {
      createSpace('Project A')
      createSpace('Project B')
      const all = getAllSpaces()
      expect(all).toHaveLength(4) // default + all-spaces + 2 custom
    })
  })

  describe('getSpaceById', () => {
    it('should return the default space for undefined id', () => {
      const ws = getSpaceById(undefined)
      expect(ws.id).toBe(DEFAULT_SPACE_ID)
    })

    it('should return the default space for "default"', () => {
      const ws = getSpaceById(DEFAULT_SPACE_ID)
      expect(ws.id).toBe(DEFAULT_SPACE_ID)
    })

    it('should return the matching space', () => {
      const created = createSpace('Found Me')
      const ws = getSpaceById(created.id)
      expect(ws.name).toBe('Found Me')
    })

    it('should fall back to default for unknown id', () => {
      const ws = getSpaceById('nonexistent')
      expect(ws.id).toBe(DEFAULT_SPACE_ID)
    })
  })

  describe('entityBelongsToSpace', () => {
    it('should match unassigned entities to the default space', () => {
      expect(entityBelongsToSpace(undefined, DEFAULT_SPACE_ID)).toBe(
        true,
      )
      expect(entityBelongsToSpace('', DEFAULT_SPACE_ID)).toBe(true)
      expect(
        entityBelongsToSpace(DEFAULT_SPACE_ID, DEFAULT_SPACE_ID),
      ).toBe(true)
    })

    it('should not match assigned entities to the default space', () => {
      expect(
        entityBelongsToSpace('some-space-id', DEFAULT_SPACE_ID),
      ).toBe(false)
    })

    it('should match entities to their assigned space', () => {
      expect(entityBelongsToSpace('ws-123', 'ws-123')).toBe(true)
    })

    it('should not match entities to a different space', () => {
      expect(entityBelongsToSpace('ws-123', 'ws-456')).toBe(false)
    })

    it('should not match unassigned entities to a custom space', () => {
      expect(entityBelongsToSpace(undefined, 'ws-123')).toBe(false)
    })

    it('should match every entity when active space is ALL_SPACES_ID', () => {
      expect(entityBelongsToSpace(undefined, ALL_SPACES_ID)).toBe(true)
      expect(entityBelongsToSpace('', ALL_SPACES_ID)).toBe(true)
      expect(entityBelongsToSpace(DEFAULT_SPACE_ID, ALL_SPACES_ID)).toBe(true)
      expect(entityBelongsToSpace('ws-abc', ALL_SPACES_ID)).toBe(true)
    })
  })

  describe('getCreationSpaceId', () => {
    it('should mirror getActiveSpaceId for the default space', () => {
      expect(getCreationSpaceId()).toBe(DEFAULT_SPACE_ID)
    })

    it('should mirror getActiveSpaceId for a real space', () => {
      const ws = createSpace('Work')
      setActiveSpaceId(ws.id)
      expect(getCreationSpaceId()).toBe(ws.id)
    })

    it('should fall back to default when viewing ALL_SPACES_ID', () => {
      setActiveSpaceId(ALL_SPACES_ID)
      expect(getActiveSpaceId()).toBe(ALL_SPACES_ID)
      expect(getCreationSpaceId()).toBe(DEFAULT_SPACE_ID)
    })
  })

  describe('getSpaceById with ALL_SPACES_ID', () => {
    it('should return a synthetic all-spaces entry', () => {
      const ws = getSpaceById(ALL_SPACES_ID)
      expect(ws.id).toBe(ALL_SPACES_ID)
    })
  })

  describe('renameSpace / deleteSpace with ALL_SPACES_ID', () => {
    it('renameSpace is a no-op for ALL_SPACES_ID', () => {
      renameSpace(ALL_SPACES_ID, 'Nope')
      expect(getSpaceById(ALL_SPACES_ID).name).toBe('All spaces')
    })

    it('deleteSpace is a no-op for ALL_SPACES_ID', () => {
      setActiveSpaceId(ALL_SPACES_ID)
      deleteSpace(ALL_SPACES_ID)
      expect(getActiveSpaceId()).toBe(ALL_SPACES_ID)
    })
  })
})
