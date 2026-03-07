/**
 * Artifact Tools Service Tests
 *
 * TDD tests for the artifact tools that enable agents to read, write,
 * list, and update shared artifacts during orchestrated task execution.
 *
 * @module test/lib/artifact-tools/service
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type { Artifact } from '@/types'

// ---------------------------------------------------------------------------
// Mutable mock state — the service reads from here via useArtifactStore
// ---------------------------------------------------------------------------
const mockArtifactsMap = new Map<string, Artifact>()

vi.mock('@/stores/artifactStore', () => ({
  useArtifactStore: {
    getState: () => ({
      get artifacts() {
        return Array.from(mockArtifactsMap.values())
      },
      createArtifact: vi.fn(
        async (data: Omit<Artifact, 'id' | 'createdAt' | 'updatedAt'>) => {
          const id = `art-${Date.now()}-${Math.random().toString(36).slice(2)}`
          const artifact: Artifact = {
            ...(data as any),
            id,
            version: 1,
            createdAt: new Date(),
            updatedAt: new Date(),
          }
          mockArtifactsMap.set(id, artifact)
          return artifact
        },
      ),
      updateArtifact: vi.fn(async (id: string, updates: Partial<Artifact>) => {
        const existing = mockArtifactsMap.get(id)
        if (!existing) throw new Error('Artifact not found')
        const updated = { ...existing, ...updates, updatedAt: new Date() }
        mockArtifactsMap.set(id, updated as Artifact)
      }),
      getArtifactsByTask: vi.fn((taskId: string) =>
        Array.from(mockArtifactsMap.values()).filter(
          (a) => a.taskId === taskId,
        ),
      ),
    }),
  },
}))

vi.mock('@/lib/toast', () => ({
  errorToast: vi.fn(),
  successToast: vi.fn(),
}))

// Import service after mocks
let service: typeof import('@/lib/artifact-tools/service')

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function seedArtifact(overrides: Partial<Artifact> = {}): Artifact {
  const id =
    overrides.id ?? `art-${Date.now()}-${Math.random().toString(36).slice(2)}`
  const artifact: Artifact = {
    id,
    taskId: overrides.taskId ?? 'task-default',
    agentId: overrides.agentId ?? 'agent-default',
    title: overrides.title ?? 'Test Artifact',
    description: overrides.description ?? 'Test description',
    type: overrides.type ?? 'document',
    format: overrides.format ?? 'markdown',
    content: overrides.content ?? '# Test\n\nTest content.',
    version: overrides.version ?? 1,
    status: overrides.status ?? 'draft',
    dependencies: overrides.dependencies ?? [],
    validates: overrides.validates ?? [],
    reviewedBy: overrides.reviewedBy ?? [],
    createdAt: overrides.createdAt ?? new Date(),
    updatedAt: overrides.updatedAt ?? new Date(),
  }
  mockArtifactsMap.set(id, artifact)
  return artifact
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Artifact Tools Service', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    mockArtifactsMap.clear()
    vi.resetModules()

    // Re-mock after resetModules
    vi.doMock('@/stores/artifactStore', () => ({
      useArtifactStore: {
        getState: () => ({
          get artifacts() {
            return Array.from(mockArtifactsMap.values())
          },
          createArtifact: vi.fn(
            async (data: Omit<Artifact, 'id' | 'createdAt' | 'updatedAt'>) => {
              const id = `art-${Date.now()}-${Math.random().toString(36).slice(2)}`
              const artifact: Artifact = {
                ...(data as any),
                id,
                version: 1,
                createdAt: new Date(),
                updatedAt: new Date(),
              }
              mockArtifactsMap.set(id, artifact)
              return artifact
            },
          ),
          updateArtifact: vi.fn(
            async (id: string, updates: Partial<Artifact>) => {
              const existing = mockArtifactsMap.get(id)
              if (!existing) throw new Error('Artifact not found')
              const updated = {
                ...existing,
                ...updates,
                updatedAt: new Date(),
              }
              mockArtifactsMap.set(id, updated as Artifact)
            },
          ),
          getArtifactsByTask: vi.fn((taskId: string) =>
            Array.from(mockArtifactsMap.values()).filter(
              (a) => a.taskId === taskId,
            ),
          ),
        }),
      },
    }))

    vi.doMock('@/lib/toast', () => ({
      errorToast: vi.fn(),
      successToast: vi.fn(),
    }))

    service = await import('@/lib/artifact-tools/service')
  })

  afterEach(() => {
    vi.restoreAllMocks()
    mockArtifactsMap.clear()
  })

  // ==========================================================================
  // writeArtifact
  // ==========================================================================
  describe('writeArtifact', () => {
    it('should create a new artifact with markdown content', async () => {
      const result = await service.writeArtifact({
        task_id: 'task-123',
        agent_id: 'agent-456',
        title: 'Chapter 1 - Introduction',
        content: '# Chapter 1\n\nOnce upon a time...',
        description: 'First chapter of the book',
      })

      expect(result.success).toBe(true)
      expect(result.artifact_id).toBeDefined()
      expect(result.artifact_id!.length).toBeGreaterThan(0)
    })

    it('should fail when task_id is missing', async () => {
      const result = await service.writeArtifact({
        task_id: '',
        agent_id: 'agent-456',
        title: 'Test',
        content: 'Some content',
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('task_id')
    })

    it('should fail when content is empty', async () => {
      const result = await service.writeArtifact({
        task_id: 'task-123',
        agent_id: 'agent-456',
        title: 'Empty doc',
        content: '',
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('content')
    })

    it('should fail when title is missing', async () => {
      const result = await service.writeArtifact({
        task_id: 'task-123',
        agent_id: 'agent-456',
        title: '',
        content: 'Some content',
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('title')
    })

    it('should accept optional artifact_type parameter', async () => {
      const result = await service.writeArtifact({
        task_id: 'task-123',
        agent_id: 'agent-456',
        title: 'Design Doc',
        content: '# Architecture\n\nDesign decisions...',
        artifact_type: 'design',
      })

      expect(result.success).toBe(true)
      expect(result.artifact_id).toBeDefined()
    })

    it('should measure execution duration', async () => {
      const result = await service.writeArtifact({
        task_id: 'task-123',
        agent_id: 'agent-456',
        title: 'Test',
        content: 'Content',
      })

      expect(result.duration_ms).toBeDefined()
      expect(result.duration_ms).toBeGreaterThanOrEqual(0)
    })
  })

  // ==========================================================================
  // readArtifact
  // ==========================================================================
  describe('readArtifact', () => {
    it('should read an existing artifact by ID', async () => {
      seedArtifact({
        id: 'art-1',
        taskId: 'task-123',
        agentId: 'agent-456',
        title: 'Chapter 1',
        description: 'First chapter',
        content: '# Chapter 1\n\nContent here.',
        format: 'markdown',
        version: 1,
      })

      const result = await service.readArtifact({ artifact_id: 'art-1' })

      expect(result.success).toBe(true)
      expect(result.content).toBe('# Chapter 1\n\nContent here.')
      expect(result.title).toBe('Chapter 1')
      expect(result.format).toBe('markdown')
    })

    it('should fail when artifact_id is missing', async () => {
      const result = await service.readArtifact({ artifact_id: '' })

      expect(result.success).toBe(false)
      expect(result.error).toContain('artifact_id')
    })

    it('should fail when artifact does not exist', async () => {
      const result = await service.readArtifact({
        artifact_id: 'nonexistent',
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('not found')
    })

    it('should include metadata in the result', async () => {
      seedArtifact({
        id: 'art-2',
        taskId: 'task-123',
        title: 'Report',
        description: 'Analysis report',
        type: 'report',
        content: '# Report\n\nFindings...',
        version: 3,
        status: 'review',
      })

      const result = await service.readArtifact({ artifact_id: 'art-2' })

      expect(result.success).toBe(true)
      expect(result.version).toBe(3)
      expect(result.status).toBe('review')
      expect(result.artifact_type).toBe('report')
    })
  })

  // ==========================================================================
  // listTaskArtifacts
  // ==========================================================================
  describe('listTaskArtifacts', () => {
    it('should list all artifacts for a task', async () => {
      seedArtifact({
        id: 'art-a',
        taskId: 'task-123',
        agentId: 'agent-1',
        title: 'Chapter 1',
      })
      seedArtifact({
        id: 'art-b',
        taskId: 'task-123',
        agentId: 'agent-2',
        title: 'Chapter 2',
      })

      const result = await service.listTaskArtifacts({
        task_id: 'task-123',
      })

      expect(result.success).toBe(true)
      expect(result.artifacts).toHaveLength(2)
      expect(result.artifacts![0].title).toBeDefined()
      expect(result.artifacts![0].id).toBeDefined()
    })

    it('should fail when task_id is missing', async () => {
      const result = await service.listTaskArtifacts({ task_id: '' })

      expect(result.success).toBe(false)
      expect(result.error).toContain('task_id')
    })

    it('should return empty array when no artifacts exist', async () => {
      const result = await service.listTaskArtifacts({
        task_id: 'task-empty',
      })

      expect(result.success).toBe(true)
      expect(result.artifacts).toHaveLength(0)
      expect(result.total_count).toBe(0)
    })

    it('should include summary metadata per artifact', async () => {
      seedArtifact({
        id: 'art-c',
        taskId: 'task-456',
        agentId: 'agent-1',
        title: 'Outline',
        description: 'Book outline',
        type: 'plan',
        content: '# Outline\n\n1. Chapter 1\n2. Chapter 2',
        version: 2,
        status: 'approved',
      })

      const result = await service.listTaskArtifacts({
        task_id: 'task-456',
      })

      expect(result.success).toBe(true)
      const item = result.artifacts![0]
      expect(item.title).toBe('Outline')
      expect(item.artifact_type).toBe('plan')
      expect(item.status).toBe('approved')
      expect(item.version).toBe(2)
      expect(item.content_length).toBeGreaterThan(0)
    })
  })

  // ==========================================================================
  // updateArtifact
  // ==========================================================================
  describe('updateArtifact', () => {
    it('should update the content of an existing artifact', async () => {
      seedArtifact({
        id: 'art-u',
        taskId: 'task-123',
        title: 'Draft Chapter',
        content: '# Draft\n\nFirst draft content.',
        version: 1,
      })

      const result = await service.updateArtifact({
        artifact_id: 'art-u',
        content: '# Revised Chapter\n\nMuch improved content with details.',
      })

      expect(result.success).toBe(true)
      expect(result.new_version).toBeDefined()
      expect(result.new_version!).toBeGreaterThanOrEqual(2)
    })

    it('should fail when artifact_id is missing', async () => {
      const result = await service.updateArtifact({
        artifact_id: '',
        content: 'New content',
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('artifact_id')
    })

    it('should fail when artifact does not exist', async () => {
      const result = await service.updateArtifact({
        artifact_id: 'nonexistent',
        content: 'New content',
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('not found')
    })

    it('should allow updating title and description too', async () => {
      seedArtifact({
        id: 'art-v',
        taskId: 'task-123',
        title: 'Old Title',
        description: 'Old description',
        content: 'Some content',
      })

      const result = await service.updateArtifact({
        artifact_id: 'art-v',
        title: 'New Title',
        description: 'Updated description',
        content: 'Updated content',
      })

      expect(result.success).toBe(true)
    })

    it('should fail when no update fields are provided', async () => {
      seedArtifact({
        id: 'art-empty',
        taskId: 'task-123',
        title: 'Test',
        content: 'Content',
      })

      const result = await service.updateArtifact({
        artifact_id: 'art-empty',
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('At least one')
    })

    it('should measure execution duration', async () => {
      seedArtifact({
        id: 'art-w',
        taskId: 'task-123',
        title: 'Test',
        content: 'Content',
      })

      const result = await service.updateArtifact({
        artifact_id: 'art-w',
        content: 'Updated',
      })

      expect(result.duration_ms).toBeDefined()
      expect(result.duration_ms).toBeGreaterThanOrEqual(0)
    })
  })
})
