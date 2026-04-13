import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockYMap, createMockToast, resetMockYMap } from './mocks'
import type { Session } from '@/types'

// Create mocks at module level
const mockSessionsMap = createMockYMap<Session>()
const mockToast = createMockToast()

// Mock the Yjs module
vi.mock('@/lib/yjs', () => ({
  sessions: mockSessionsMap,
  whenReady: Promise.resolve(),
  isReady: vi.fn(() => true),
  transact: vi.fn((fn: () => void) => fn()),
}))

vi.mock('@/lib/toast', () => mockToast)

// Mock spaceStore
vi.mock('@/stores/spaceStore', () => ({
  getActiveSpaceId: vi.fn(() => 'default'),
}))

// Mock crypto.randomUUID for predictable IDs
let uuidCounter = 0
vi.stubGlobal('crypto', {
  randomUUID: () => `test-uuid-${++uuidCounter}`,
})

// Import store AFTER mocks
const { useSessionStore, getSessionById, getAllSessions } = await import(
  '@/stores/sessionStore'
)

describe('sessionStore', () => {
  beforeEach(() => {
    resetMockYMap(mockSessionsMap)
    uuidCounter = 0
    mockToast.errorToast.mockClear()
    mockToast.successToast.mockClear()
  })

  describe('createSession', () => {
    it('should create a session with required fields', async () => {
      const session = await useSessionStore.getState().createSession({
        prompt: 'Build me a landing page',
        intent: 'task',
        primaryAgentId: 'devs',
      })

      expect(session).toBeDefined()
      expect(session.id).toBe('test-uuid-1')
      expect(session.prompt).toBe('Build me a landing page')
      expect(session.intent).toBe('task')
      expect(session.status).toBe('starting')
      expect(session.primaryAgentId).toBe('devs')
      expect(session.participatingAgents).toEqual(['devs'])
      expect(session.turns).toEqual([])
      expect(session.artifacts).toEqual([])
      expect(session.title).toBe('')
      expect(mockSessionsMap.set).toHaveBeenCalledWith(
        session.id,
        expect.objectContaining({ id: session.id }),
      )
    })

    it('should include optional fields when provided', async () => {
      const session = await useSessionStore.getState().createSession({
        prompt: 'Generate hero image',
        intent: 'media',
        primaryAgentId: 'designer',
        attachments: [
          {
            name: 'ref.png',
            type: 'image/png',
            size: 1024,
            data: 'base64data',
          },
        ],
        mentionedSkills: ['image-gen'],
        methodology: 'PDCA',
      })

      expect(session.attachments).toHaveLength(1)
      expect(session.mentionedSkills).toEqual(['image-gen'])
      expect(session.methodology).toBe('PDCA')
    })
  })

  describe('getSessionById', () => {
    it('should return a session by ID', async () => {
      const session = await useSessionStore.getState().createSession({
        prompt: 'Test prompt',
        intent: 'conversation',
        primaryAgentId: 'agent-1',
      })

      const found = getSessionById(session.id)
      expect(found).toBeDefined()
      expect(found?.id).toBe(session.id)
    })

    it('should return undefined for non-existent session', () => {
      expect(getSessionById('non-existent')).toBeUndefined()
    })
  })

  describe('updateSession', () => {
    it('should update session fields', async () => {
      const session = await useSessionStore.getState().createSession({
        prompt: 'Test',
        intent: 'task',
        primaryAgentId: 'devs',
      })

      await useSessionStore.getState().updateSession(session.id, {
        status: 'running',
        title: 'Landing Page Design',
      })

      const updated = getSessionById(session.id)
      expect(updated?.status).toBe('running')
      expect(updated?.title).toBe('Landing Page Design')
    })

    it('should error for non-existent session', async () => {
      await useSessionStore.getState().updateSession('non-existent', {
        status: 'running',
      })
      expect(mockToast.errorToast).toHaveBeenCalled()
    })
  })

  describe('addTurn', () => {
    it('should add a turn to a session', async () => {
      const session = await useSessionStore.getState().createSession({
        prompt: 'Initial prompt',
        intent: 'conversation',
        primaryAgentId: 'agent-1',
      })

      const turn = await useSessionStore.getState().addTurn(session.id, {
        prompt: 'Follow-up question',
        intent: 'conversation',
        agentId: 'agent-1',
      })

      expect(turn).toBeDefined()
      expect(turn!.prompt).toBe('Follow-up question')
      expect(turn!.intent).toBe('conversation')
      expect(turn!.status).toBe('pending')
      expect(turn!.artifactIds).toEqual([])

      const updated = getSessionById(session.id)
      expect(updated?.turns).toHaveLength(1)
    })

    it('should add the agent to participatingAgents if new', async () => {
      const session = await useSessionStore.getState().createSession({
        prompt: 'Initial',
        intent: 'task',
        primaryAgentId: 'devs',
      })

      await useSessionStore.getState().addTurn(session.id, {
        prompt: 'Use designer agent',
        intent: 'media',
        agentId: 'designer',
      })

      const updated = getSessionById(session.id)
      expect(updated?.participatingAgents).toContain('designer')
      expect(updated?.participatingAgents).toContain('devs')
    })
  })

  describe('updateTurn', () => {
    it('should update a turn status', async () => {
      const session = await useSessionStore.getState().createSession({
        prompt: 'Test',
        intent: 'task',
        primaryAgentId: 'devs',
      })

      const turn = await useSessionStore.getState().addTurn(session.id, {
        prompt: 'Sub task',
        intent: 'task',
        agentId: 'devs',
      })

      await useSessionStore.getState().updateTurn(session.id, turn!.id, {
        status: 'completed',
      })

      const updated = getSessionById(session.id)
      expect(updated?.turns[0].status).toBe('completed')
    })
  })

  describe('addArtifact', () => {
    it('should add an artifact to a session', async () => {
      const session = await useSessionStore.getState().createSession({
        prompt: 'Create image',
        intent: 'media',
        primaryAgentId: 'designer',
      })

      const artifact = await useSessionStore
        .getState()
        .addArtifact(session.id, {
          type: 'image',
          title: 'Hero Image',
          content: 'base64imagedata',
          mimeType: 'image/png',
        })

      expect(artifact).toBeDefined()
      expect(artifact!.type).toBe('image')
      expect(artifact!.title).toBe('Hero Image')

      const updated = getSessionById(session.id)
      expect(updated?.artifacts).toHaveLength(1)
    })
  })

  describe('completeSession', () => {
    it('should mark session as completed', async () => {
      const session = await useSessionStore.getState().createSession({
        prompt: 'Test',
        intent: 'conversation',
        primaryAgentId: 'agent-1',
      })

      await useSessionStore.getState().updateSession(session.id, {
        status: 'completed',
      })

      const updated = getSessionById(session.id)
      expect(updated?.status).toBe('completed')
    })
  })

  describe('deleteSession', () => {
    it('should delete a session', async () => {
      const session = await useSessionStore.getState().createSession({
        prompt: 'To delete',
        intent: 'conversation',
        primaryAgentId: 'agent-1',
      })

      await useSessionStore.getState().deleteSession(session.id)
      expect(mockSessionsMap.delete).toHaveBeenCalledWith(session.id)
      expect(getSessionById(session.id)).toBeUndefined()
    })
  })

  describe('getAllSessions', () => {
    it('should return all sessions sorted by updatedAt descending', async () => {
      await useSessionStore.getState().createSession({
        prompt: 'First',
        intent: 'conversation',
        primaryAgentId: 'a1',
      })

      await useSessionStore.getState().createSession({
        prompt: 'Second',
        intent: 'task',
        primaryAgentId: 'a2',
      })

      const all = getAllSessions()
      expect(all).toHaveLength(2)
    })
  })
})
