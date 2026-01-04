/**
 * Workspace Store
 * Manages workspaces and collaboration settings
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  Workspace,
  WorkspaceMember,
  InviteLink,
  WorkspaceRole,
} from '@/types'

interface WorkspaceState {
  // All workspaces
  workspaces: Workspace[]

  // Currently active workspace
  activeWorkspaceId: string | null

  // Loading state
  isLoading: boolean
  error: string | null
}

interface WorkspaceActions {
  // Workspace CRUD
  createWorkspace: (name: string, ownerId: string) => Workspace
  updateWorkspace: (id: string, updates: Partial<Workspace>) => void
  deleteWorkspace: (id: string) => void

  // Active workspace
  setActiveWorkspace: (id: string | null) => void
  getActiveWorkspace: () => Workspace | null

  // Members
  addMember: (workspaceId: string, member: WorkspaceMember) => void
  updateMemberRole: (
    workspaceId: string,
    userId: string,
    role: WorkspaceRole,
  ) => void
  removeMember: (workspaceId: string, userId: string) => void

  // Invite links
  createInviteLink: (
    workspaceId: string,
    role: 'editor' | 'viewer',
    options?: {
      expiresAt?: Date
      maxUses?: number
    },
  ) => InviteLink
  deleteInviteLink: (workspaceId: string, linkId: string) => void
  useInviteLink: (workspaceId: string, linkId: string) => boolean

  // Sharing entities
  shareAgent: (workspaceId: string, agentId: string) => void
  unshareAgent: (workspaceId: string, agentId: string) => void
  shareConversation: (workspaceId: string, conversationId: string) => void
  unshareConversation: (workspaceId: string, conversationId: string) => void
  shareKnowledge: (workspaceId: string, knowledgeId: string) => void
  unshareKnowledge: (workspaceId: string, knowledgeId: string) => void

  // Sync settings
  enableSync: (workspaceId: string) => void
  disableSync: (workspaceId: string) => void
  addSyncProvider: (workspaceId: string, providerId: string) => void
  removeSyncProvider: (workspaceId: string, providerId: string) => void

  // Utilities
  getWorkspace: (id: string) => Workspace | undefined
  getWorkspacesForUser: (userId: string) => Workspace[]
  isUserMember: (workspaceId: string, userId: string) => boolean
  getUserRole: (workspaceId: string, userId: string) => WorkspaceRole | null

  // Reset
  clearError: () => void
}

type WorkspaceStore = WorkspaceState & WorkspaceActions

function generateId(): string {
  return crypto.randomUUID()
}

function generateToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

const initialState: WorkspaceState = {
  workspaces: [],
  activeWorkspaceId: null,
  isLoading: false,
  error: null,
}

export const useWorkspaceStore = create<WorkspaceStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      createWorkspace: (name: string, ownerId: string) => {
        const now = new Date()
        const workspace: Workspace = {
          id: generateId(),
          name,
          ownerId,
          sharedAgents: [],
          sharedConversations: [],
          sharedKnowledge: [],
          members: [
            {
              userId: ownerId,
              role: 'owner',
              joinedAt: now,
              invitedBy: ownerId,
            },
          ],
          inviteLinks: [],
          syncEnabled: false,
          syncProviders: [],
          createdAt: now,
          updatedAt: now,
        }

        set((state) => ({
          workspaces: [...state.workspaces, workspace],
          activeWorkspaceId: state.activeWorkspaceId ?? workspace.id,
        }))

        return workspace
      },

      updateWorkspace: (id: string, updates: Partial<Workspace>) => {
        set((state) => ({
          workspaces: state.workspaces.map((w) =>
            w.id === id ? { ...w, ...updates, updatedAt: new Date() } : w,
          ),
        }))
      },

      deleteWorkspace: (id: string) => {
        set((state) => ({
          workspaces: state.workspaces.filter((w) => w.id !== id),
          activeWorkspaceId:
            state.activeWorkspaceId === id
              ? (state.workspaces.find((w) => w.id !== id)?.id ?? null)
              : state.activeWorkspaceId,
        }))
      },

      setActiveWorkspace: (id: string | null) => {
        set({ activeWorkspaceId: id })
      },

      getActiveWorkspace: () => {
        const state = get()
        if (!state.activeWorkspaceId) return null
        return (
          state.workspaces.find((w) => w.id === state.activeWorkspaceId) ?? null
        )
      },

      addMember: (workspaceId: string, member: WorkspaceMember) => {
        set((state) => ({
          workspaces: state.workspaces.map((w) =>
            w.id === workspaceId
              ? {
                  ...w,
                  members: [
                    ...w.members.filter((m) => m.userId !== member.userId),
                    member,
                  ],
                  updatedAt: new Date(),
                }
              : w,
          ),
        }))
      },

      updateMemberRole: (
        workspaceId: string,
        userId: string,
        role: WorkspaceRole,
      ) => {
        set((state) => ({
          workspaces: state.workspaces.map((w) =>
            w.id === workspaceId
              ? {
                  ...w,
                  members: w.members.map((m) =>
                    m.userId === userId ? { ...m, role } : m,
                  ),
                  updatedAt: new Date(),
                }
              : w,
          ),
        }))
      },

      removeMember: (workspaceId: string, userId: string) => {
        set((state) => ({
          workspaces: state.workspaces.map((w) =>
            w.id === workspaceId
              ? {
                  ...w,
                  members: w.members.filter((m) => m.userId !== userId),
                  updatedAt: new Date(),
                }
              : w,
          ),
        }))
      },

      createInviteLink: (
        workspaceId: string,
        role: 'editor' | 'viewer',
        options = {},
      ) => {
        const link: InviteLink = {
          id: generateId(),
          token: generateToken(),
          role,
          expiresAt: options.expiresAt,
          maxUses: options.maxUses,
          usedCount: 0,
          createdAt: new Date(),
        }

        set((state) => ({
          workspaces: state.workspaces.map((w) =>
            w.id === workspaceId
              ? {
                  ...w,
                  inviteLinks: [...w.inviteLinks, link],
                  updatedAt: new Date(),
                }
              : w,
          ),
        }))

        return link
      },

      deleteInviteLink: (workspaceId: string, linkId: string) => {
        set((state) => ({
          workspaces: state.workspaces.map((w) =>
            w.id === workspaceId
              ? {
                  ...w,
                  inviteLinks: w.inviteLinks.filter((l) => l.id !== linkId),
                  updatedAt: new Date(),
                }
              : w,
          ),
        }))
      },

      useInviteLink: (workspaceId: string, linkId: string) => {
        const workspace = get().workspaces.find((w) => w.id === workspaceId)
        const link = workspace?.inviteLinks.find((l) => l.id === linkId)

        if (!link) return false

        // Check if link is expired
        if (link.expiresAt && new Date() > link.expiresAt) return false

        // Check if max uses reached
        if (link.maxUses && link.usedCount >= link.maxUses) return false

        // Increment use count
        set((state) => ({
          workspaces: state.workspaces.map((w) =>
            w.id === workspaceId
              ? {
                  ...w,
                  inviteLinks: w.inviteLinks.map((l) =>
                    l.id === linkId ? { ...l, usedCount: l.usedCount + 1 } : l,
                  ),
                  updatedAt: new Date(),
                }
              : w,
          ),
        }))

        return true
      },

      shareAgent: (workspaceId: string, agentId: string) => {
        set((state) => ({
          workspaces: state.workspaces.map((w) =>
            w.id === workspaceId && !w.sharedAgents.includes(agentId)
              ? {
                  ...w,
                  sharedAgents: [...w.sharedAgents, agentId],
                  updatedAt: new Date(),
                }
              : w,
          ),
        }))
      },

      unshareAgent: (workspaceId: string, agentId: string) => {
        set((state) => ({
          workspaces: state.workspaces.map((w) =>
            w.id === workspaceId
              ? {
                  ...w,
                  sharedAgents: w.sharedAgents.filter((id) => id !== agentId),
                  updatedAt: new Date(),
                }
              : w,
          ),
        }))
      },

      shareConversation: (workspaceId: string, conversationId: string) => {
        set((state) => ({
          workspaces: state.workspaces.map((w) =>
            w.id === workspaceId &&
            !w.sharedConversations.includes(conversationId)
              ? {
                  ...w,
                  sharedConversations: [
                    ...w.sharedConversations,
                    conversationId,
                  ],
                  updatedAt: new Date(),
                }
              : w,
          ),
        }))
      },

      unshareConversation: (workspaceId: string, conversationId: string) => {
        set((state) => ({
          workspaces: state.workspaces.map((w) =>
            w.id === workspaceId
              ? {
                  ...w,
                  sharedConversations: w.sharedConversations.filter(
                    (id) => id !== conversationId,
                  ),
                  updatedAt: new Date(),
                }
              : w,
          ),
        }))
      },

      shareKnowledge: (workspaceId: string, knowledgeId: string) => {
        set((state) => ({
          workspaces: state.workspaces.map((w) =>
            w.id === workspaceId && !w.sharedKnowledge.includes(knowledgeId)
              ? {
                  ...w,
                  sharedKnowledge: [...w.sharedKnowledge, knowledgeId],
                  updatedAt: new Date(),
                }
              : w,
          ),
        }))
      },

      unshareKnowledge: (workspaceId: string, knowledgeId: string) => {
        set((state) => ({
          workspaces: state.workspaces.map((w) =>
            w.id === workspaceId
              ? {
                  ...w,
                  sharedKnowledge: w.sharedKnowledge.filter(
                    (id) => id !== knowledgeId,
                  ),
                  updatedAt: new Date(),
                }
              : w,
          ),
        }))
      },

      enableSync: (workspaceId: string) => {
        set((state) => ({
          workspaces: state.workspaces.map((w) =>
            w.id === workspaceId
              ? { ...w, syncEnabled: true, updatedAt: new Date() }
              : w,
          ),
        }))
      },

      disableSync: (workspaceId: string) => {
        set((state) => ({
          workspaces: state.workspaces.map((w) =>
            w.id === workspaceId
              ? { ...w, syncEnabled: false, updatedAt: new Date() }
              : w,
          ),
        }))
      },

      addSyncProvider: (workspaceId: string, providerId: string) => {
        set((state) => ({
          workspaces: state.workspaces.map((w) =>
            w.id === workspaceId && !w.syncProviders.includes(providerId)
              ? {
                  ...w,
                  syncProviders: [...w.syncProviders, providerId],
                  updatedAt: new Date(),
                }
              : w,
          ),
        }))
      },

      removeSyncProvider: (workspaceId: string, providerId: string) => {
        set((state) => ({
          workspaces: state.workspaces.map((w) =>
            w.id === workspaceId
              ? {
                  ...w,
                  syncProviders: w.syncProviders.filter(
                    (id) => id !== providerId,
                  ),
                  updatedAt: new Date(),
                }
              : w,
          ),
        }))
      },

      getWorkspace: (id: string) => {
        return get().workspaces.find((w) => w.id === id)
      },

      getWorkspacesForUser: (userId: string) => {
        return get().workspaces.filter((w) =>
          w.members.some((m) => m.userId === userId),
        )
      },

      isUserMember: (workspaceId: string, userId: string) => {
        const workspace = get().workspaces.find((w) => w.id === workspaceId)
        return workspace?.members.some((m) => m.userId === userId) ?? false
      },

      getUserRole: (workspaceId: string, userId: string) => {
        const workspace = get().workspaces.find((w) => w.id === workspaceId)
        return workspace?.members.find((m) => m.userId === userId)?.role ?? null
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'devs-workspaces',
      partialize: (state) => ({
        workspaces: state.workspaces,
        activeWorkspaceId: state.activeWorkspaceId,
      }),
    },
  ),
)

// Selector hooks for convenience
export const useWorkspaces = () =>
  useWorkspaceStore((state) => state.workspaces)
export const useActiveWorkspace = () =>
  useWorkspaceStore((state) => state.getActiveWorkspace())
export const useActiveWorkspaceId = () =>
  useWorkspaceStore((state) => state.activeWorkspaceId)
