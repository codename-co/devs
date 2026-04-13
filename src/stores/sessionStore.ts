import { create } from 'zustand'
import { sessions, whenReady, isReady } from '@/lib/yjs'
import type {
  Session,
  SessionIntent,
  SessionTurn,
  SessionArtifact,
  SessionAttachment,
} from '@/types'
import { errorToast } from '@/lib/toast'
import { getActiveSpaceId } from '@/stores/spaceStore'

// ============================================================================
// Helpers
// ============================================================================

function normalizeDate(value: unknown): string {
  if (value instanceof Date && !isNaN(value.getTime()))
    return value.toISOString()
  if (typeof value === 'string' && value.length > 0) return value
  return new Date(0).toISOString()
}

function getAllSessionsFromYjs(): Session[] {
  return Array.from(sessions.values()).map((s) => ({
    ...s,
    createdAt: normalizeDate(s.createdAt),
    updatedAt: normalizeDate(s.updatedAt),
    ...(s.completedAt && { completedAt: normalizeDate(s.completedAt) }),
  }))
}

// ============================================================================
// Public helpers (non-hook, for use in lib code)
// ============================================================================

export function getSessionById(id: string): Session | undefined {
  const raw = sessions.get(id)
  if (!raw) return undefined
  return {
    ...raw,
    createdAt: normalizeDate(raw.createdAt),
    updatedAt: normalizeDate(raw.updatedAt),
    ...(raw.completedAt && { completedAt: normalizeDate(raw.completedAt) }),
  }
}

export function getAllSessions(): Session[] {
  return getAllSessionsFromYjs().sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  )
}

// ============================================================================
// Store Interface
// ============================================================================

interface CreateSessionInput {
  prompt: string
  intent: SessionIntent
  primaryAgentId: string
  attachments?: SessionAttachment[]
  mentionedSkills?: string[]
  mentionedConnectors?: string[]
  methodology?: string
}

interface AddTurnInput {
  prompt: string
  intent: SessionIntent
  agentId: string
}

interface AddArtifactInput {
  type: SessionArtifact['type']
  title: string
  content: string
  mimeType?: string
  preview?: string
  metadata?: Record<string, unknown>
}

interface SessionStore {
  sessions: Session[]
  currentSession: Session | null
  isLoading: boolean

  loadSessions: () => Promise<void>
  createSession: (input: CreateSessionInput) => Promise<Session>
  updateSession: (id: string, updates: Partial<Session>) => Promise<void>
  deleteSession: (id: string) => Promise<void>
  addTurn: (
    sessionId: string,
    input: AddTurnInput,
  ) => Promise<SessionTurn | undefined>
  updateTurn: (
    sessionId: string,
    turnId: string,
    updates: Partial<SessionTurn>,
  ) => Promise<void>
  addArtifact: (
    sessionId: string,
    input: AddArtifactInput,
  ) => Promise<SessionArtifact | undefined>
  setCurrentSession: (session: Session | null) => void
}

// ============================================================================
// Store
// ============================================================================

export const useSessionStore = create<SessionStore>((set) => ({
  sessions: [],
  currentSession: null,
  isLoading: false,

  loadSessions: async () => {
    set({ isLoading: true })
    try {
      if (!isReady()) await whenReady
      const all = getAllSessionsFromYjs()
      set({ sessions: all, isLoading: false })
    } catch (error) {
      errorToast('Failed to load sessions', error)
      set({ isLoading: false })
    }
  },

  createSession: async (input) => {
    const now = new Date().toISOString()
    const session: Session = {
      id: crypto.randomUUID(),
      title: '',
      prompt: input.prompt,
      status: 'starting',
      intent: input.intent,
      turns: [],
      primaryAgentId: input.primaryAgentId,
      participatingAgents: [input.primaryAgentId],
      artifacts: [],
      attachments: input.attachments,
      mentionedSkills: input.mentionedSkills,
      mentionedConnectors: input.mentionedConnectors,
      methodology: input.methodology,
      spaceId: getActiveSpaceId(),
      createdAt: now,
      updatedAt: now,
    }

    sessions.set(session.id, session)
    set((state) => ({ sessions: [...state.sessions, session] }))
    return session
  },

  updateSession: async (id, updates) => {
    const existing = sessions.get(id)
    if (!existing) {
      errorToast('Session not found')
      return
    }

    const updated: Session = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    }
    sessions.set(id, updated)
    set((state) => ({
      sessions: state.sessions.map((s) => (s.id === id ? updated : s)),
      currentSession:
        state.currentSession?.id === id ? updated : state.currentSession,
    }))
  },

  deleteSession: async (id) => {
    sessions.delete(id)
    set((state) => ({
      sessions: state.sessions.filter((s) => s.id !== id),
      currentSession:
        state.currentSession?.id === id ? null : state.currentSession,
    }))
  },

  addTurn: async (sessionId, input) => {
    const existing = sessions.get(sessionId)
    if (!existing) {
      errorToast('Session not found')
      return undefined
    }

    const turn: SessionTurn = {
      id: crypto.randomUUID(),
      prompt: input.prompt,
      intent: input.intent,
      agentId: input.agentId,
      artifactIds: [],
      status: 'pending',
      createdAt: new Date().toISOString(),
    }

    const participatingAgents = existing.participatingAgents.includes(
      input.agentId,
    )
      ? existing.participatingAgents
      : [...existing.participatingAgents, input.agentId]

    const updated: Session = {
      ...existing,
      turns: [...existing.turns, turn],
      participatingAgents,
      updatedAt: new Date().toISOString(),
    }

    sessions.set(sessionId, updated)
    set((state) => ({
      sessions: state.sessions.map((s) => (s.id === sessionId ? updated : s)),
      currentSession:
        state.currentSession?.id === sessionId ? updated : state.currentSession,
    }))
    return turn
  },

  updateTurn: async (sessionId, turnId, updates) => {
    const existing = sessions.get(sessionId)
    if (!existing) {
      errorToast('Session not found')
      return
    }

    const updatedTurns = existing.turns.map((t) =>
      t.id === turnId ? { ...t, ...updates } : t,
    )

    const updated: Session = {
      ...existing,
      turns: updatedTurns,
      updatedAt: new Date().toISOString(),
    }

    sessions.set(sessionId, updated)
    set((state) => ({
      sessions: state.sessions.map((s) => (s.id === sessionId ? updated : s)),
      currentSession:
        state.currentSession?.id === sessionId ? updated : state.currentSession,
    }))
  },

  addArtifact: async (sessionId, input) => {
    const existing = sessions.get(sessionId)
    if (!existing) {
      errorToast('Session not found')
      return undefined
    }

    const artifact: SessionArtifact = {
      id: crypto.randomUUID(),
      type: input.type,
      title: input.title,
      content: input.content,
      mimeType: input.mimeType,
      preview: input.preview,
      metadata: input.metadata,
      createdAt: new Date().toISOString(),
    }

    const updated: Session = {
      ...existing,
      artifacts: [...existing.artifacts, artifact],
      updatedAt: new Date().toISOString(),
    }

    sessions.set(sessionId, updated)
    set((state) => ({
      sessions: state.sessions.map((s) => (s.id === sessionId ? updated : s)),
      currentSession:
        state.currentSession?.id === sessionId ? updated : state.currentSession,
    }))
    return artifact
  },

  setCurrentSession: (session) => set({ currentSession: session }),
}))
