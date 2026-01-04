/**
 * Workspace Store Tests
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { useWorkspaceStore } from '@/stores/workspaceStore'

describe('Workspace Store', () => {
  beforeEach(() => {
    // Reset store state
    useWorkspaceStore.setState({
      workspaces: [],
      activeWorkspaceId: null,
      isLoading: false,
      error: null,
    })
  })

  describe('createWorkspace', () => {
    it('should create a workspace with owner as member', () => {
      const store = useWorkspaceStore.getState()
      const workspace = store.createWorkspace('Test Workspace', 'owner-123')

      expect(workspace.id).toBeDefined()
      expect(workspace.name).toBe('Test Workspace')
      expect(workspace.ownerId).toBe('owner-123')
      expect(workspace.members).toHaveLength(1)
      expect(workspace.members[0].userId).toBe('owner-123')
      expect(workspace.members[0].role).toBe('owner')
    })

    it('should set first workspace as active', () => {
      const store = useWorkspaceStore.getState()
      const workspace = store.createWorkspace('First', 'owner')

      expect(useWorkspaceStore.getState().activeWorkspaceId).toBe(workspace.id)
    })

    it('should not change active workspace when creating second', () => {
      const store = useWorkspaceStore.getState()
      const first = store.createWorkspace('First', 'owner')
      store.createWorkspace('Second', 'owner')

      expect(useWorkspaceStore.getState().activeWorkspaceId).toBe(first.id)
    })
  })

  describe('updateWorkspace', () => {
    it('should update workspace name', async () => {
      const store = useWorkspaceStore.getState()
      const workspace = store.createWorkspace('Original', 'owner')

      // Wait to ensure time difference
      await new Promise((resolve) => setTimeout(resolve, 5))

      store.updateWorkspace(workspace.id, { name: 'Updated' })

      const updated = useWorkspaceStore.getState().workspaces[0]
      expect(updated.name).toBe('Updated')
      expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(
        workspace.updatedAt.getTime(),
      )
    })
  })

  describe('deleteWorkspace', () => {
    it('should delete workspace', () => {
      const store = useWorkspaceStore.getState()
      const workspace = store.createWorkspace('ToDelete', 'owner')

      store.deleteWorkspace(workspace.id)

      expect(useWorkspaceStore.getState().workspaces).toHaveLength(0)
    })

    it('should update active workspace when deleting current', () => {
      const store = useWorkspaceStore.getState()
      const first = store.createWorkspace('First', 'owner')
      const second = store.createWorkspace('Second', 'owner')
      store.setActiveWorkspace(first.id)

      store.deleteWorkspace(first.id)

      expect(useWorkspaceStore.getState().activeWorkspaceId).toBe(second.id)
    })
  })

  describe('members', () => {
    it('should add member to workspace', () => {
      const store = useWorkspaceStore.getState()
      const workspace = store.createWorkspace('Test', 'owner')

      store.addMember(workspace.id, {
        userId: 'member-123',
        role: 'editor',
        joinedAt: new Date(),
        invitedBy: 'owner',
      })

      const updated = useWorkspaceStore.getState().workspaces[0]
      expect(updated.members).toHaveLength(2)
      expect(updated.members[1].userId).toBe('member-123')
    })

    it('should update member role', () => {
      const store = useWorkspaceStore.getState()
      const workspace = store.createWorkspace('Test', 'owner')
      store.addMember(workspace.id, {
        userId: 'member-123',
        role: 'viewer',
        joinedAt: new Date(),
        invitedBy: 'owner',
      })

      store.updateMemberRole(workspace.id, 'member-123', 'admin')

      const member = useWorkspaceStore.getState().workspaces[0].members[1]
      expect(member.role).toBe('admin')
    })

    it('should remove member', () => {
      const store = useWorkspaceStore.getState()
      const workspace = store.createWorkspace('Test', 'owner')
      store.addMember(workspace.id, {
        userId: 'member-123',
        role: 'editor',
        joinedAt: new Date(),
        invitedBy: 'owner',
      })

      store.removeMember(workspace.id, 'member-123')

      expect(useWorkspaceStore.getState().workspaces[0].members).toHaveLength(1)
    })
  })

  describe('invite links', () => {
    it('should create invite link', () => {
      const store = useWorkspaceStore.getState()
      const workspace = store.createWorkspace('Test', 'owner')

      const link = store.createInviteLink(workspace.id, 'editor', {
        maxUses: 5,
        expiresAt: new Date(Date.now() + 86400000),
      })

      expect(link.id).toBeDefined()
      expect(link.token.length).toBe(64)
      expect(link.role).toBe('editor')
      expect(link.maxUses).toBe(5)
      expect(link.usedCount).toBe(0)
    })

    it('should use invite link and increment count', () => {
      const store = useWorkspaceStore.getState()
      const workspace = store.createWorkspace('Test', 'owner')
      const link = store.createInviteLink(workspace.id, 'viewer')

      const result = store.useInviteLink(workspace.id, link.id)

      expect(result).toBe(true)
      const updatedLink =
        useWorkspaceStore.getState().workspaces[0].inviteLinks[0]
      expect(updatedLink.usedCount).toBe(1)
    })

    it('should reject expired invite link', () => {
      const store = useWorkspaceStore.getState()
      const workspace = store.createWorkspace('Test', 'owner')
      const link = store.createInviteLink(workspace.id, 'viewer', {
        expiresAt: new Date(Date.now() - 1000), // Already expired
      })

      const result = store.useInviteLink(workspace.id, link.id)

      expect(result).toBe(false)
    })

    it('should reject link when max uses reached', () => {
      const store = useWorkspaceStore.getState()
      const workspace = store.createWorkspace('Test', 'owner')
      const link = store.createInviteLink(workspace.id, 'viewer', {
        maxUses: 1,
      })

      store.useInviteLink(workspace.id, link.id) // Use once
      const result = store.useInviteLink(workspace.id, link.id) // Try again

      expect(result).toBe(false)
    })
  })

  describe('sharing', () => {
    it('should share and unshare agent', () => {
      const store = useWorkspaceStore.getState()
      const workspace = store.createWorkspace('Test', 'owner')

      store.shareAgent(workspace.id, 'agent-123')
      expect(useWorkspaceStore.getState().workspaces[0].sharedAgents).toContain(
        'agent-123',
      )

      store.unshareAgent(workspace.id, 'agent-123')
      expect(
        useWorkspaceStore.getState().workspaces[0].sharedAgents,
      ).not.toContain('agent-123')
    })

    it('should not duplicate shared agents', () => {
      const store = useWorkspaceStore.getState()
      const workspace = store.createWorkspace('Test', 'owner')

      store.shareAgent(workspace.id, 'agent-123')
      store.shareAgent(workspace.id, 'agent-123')

      expect(
        useWorkspaceStore.getState().workspaces[0].sharedAgents,
      ).toHaveLength(1)
    })
  })

  describe('utility methods', () => {
    it('should get workspaces for user', () => {
      const store = useWorkspaceStore.getState()
      store.createWorkspace('Owned', 'user-1')
      const shared = store.createWorkspace('Shared', 'user-2')
      store.addMember(shared.id, {
        userId: 'user-1',
        role: 'editor',
        joinedAt: new Date(),
        invitedBy: 'user-2',
      })
      store.createWorkspace('NotMember', 'user-3')

      const userWorkspaces = store.getWorkspacesForUser('user-1')

      expect(userWorkspaces).toHaveLength(2)
    })

    it('should check if user is member', () => {
      const store = useWorkspaceStore.getState()
      const workspace = store.createWorkspace('Test', 'owner')

      expect(store.isUserMember(workspace.id, 'owner')).toBe(true)
      expect(store.isUserMember(workspace.id, 'stranger')).toBe(false)
    })

    it('should get user role', () => {
      const store = useWorkspaceStore.getState()
      const workspace = store.createWorkspace('Test', 'owner')
      store.addMember(workspace.id, {
        userId: 'editor-user',
        role: 'editor',
        joinedAt: new Date(),
        invitedBy: 'owner',
      })

      expect(store.getUserRole(workspace.id, 'owner')).toBe('owner')
      expect(store.getUserRole(workspace.id, 'editor-user')).toBe('editor')
      expect(store.getUserRole(workspace.id, 'stranger')).toBeNull()
    })
  })
})
