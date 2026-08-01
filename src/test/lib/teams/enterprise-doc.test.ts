/**
 * Tests for Enterprise Y.Doc management.
 */
import { describe, it, expect, afterEach } from 'vitest'
import {
  getEnterpriseDoc,
  hasEnterpriseDoc,
  getExistingEnterpriseDoc,
  destroyEnterpriseDoc,
  destroyAllEnterpriseDocs,
  getActiveEnterpriseSpaceIds,
  getAllEnterpriseDocs,
} from '@/lib/teams/enterprise-doc'

describe('Enterprise Y.Doc management', () => {
  afterEach(() => {
    destroyAllEnterpriseDocs()
  })

  describe('getEnterpriseDoc', () => {
    it('creates a new doc for a space', () => {
      const doc = getEnterpriseDoc('space-1', 'acme')

      expect(doc).toBeDefined()
      expect(doc.spaceId).toBe('space-1')
      expect(doc.orgId).toBe('acme')
      expect(doc.doc).toBeDefined()
      expect(doc.maps).toBeDefined()
    })

    it('returns the same doc for the same space', () => {
      const doc1 = getEnterpriseDoc('space-1', 'acme')
      const doc2 = getEnterpriseDoc('space-1', 'acme')

      expect(doc1).toBe(doc2)
    })

    it('creates separate docs for different spaces', () => {
      const doc1 = getEnterpriseDoc('space-1', 'acme')
      const doc2 = getEnterpriseDoc('space-2', 'acme')

      expect(doc1).not.toBe(doc2)
      expect(doc1.doc).not.toBe(doc2.doc)
    })

    it('creates all required typed maps', () => {
      const doc = getEnterpriseDoc('space-1', 'acme')

      expect(doc.maps.agents).toBeDefined()
      expect(doc.maps.conversations).toBeDefined()
      expect(doc.maps.tasks).toBeDefined()
      expect(doc.maps.knowledge).toBeDefined()
      expect(doc.maps.artifacts).toBeDefined()
      expect(doc.maps.memories).toBeDefined()
      expect(doc.maps.sharedContexts).toBeDefined()
      expect(doc.maps.skills).toBeDefined()
      expect(doc.maps.sessions).toBeDefined()
      expect(doc.maps.threadTags).toBeDefined()
      expect(doc.maps.spaces).toBeDefined()
    })
  })

  describe('hasEnterpriseDoc', () => {
    it('returns false for non-existent space', () => {
      expect(hasEnterpriseDoc('non-existent')).toBe(false)
    })

    it('returns true after creating a doc', () => {
      getEnterpriseDoc('space-1', 'acme')
      expect(hasEnterpriseDoc('space-1')).toBe(true)
    })
  })

  describe('getExistingEnterpriseDoc', () => {
    it('returns undefined for non-existent space', () => {
      expect(getExistingEnterpriseDoc('non-existent')).toBeUndefined()
    })

    it('returns the doc after creation', () => {
      const created = getEnterpriseDoc('space-1', 'acme')
      const retrieved = getExistingEnterpriseDoc('space-1')

      expect(retrieved).toBe(created)
    })
  })

  describe('destroyEnterpriseDoc', () => {
    it('removes a doc by space ID', () => {
      getEnterpriseDoc('space-1', 'acme')
      expect(hasEnterpriseDoc('space-1')).toBe(true)

      destroyEnterpriseDoc('space-1')
      expect(hasEnterpriseDoc('space-1')).toBe(false)
    })

    it('does nothing for non-existent space', () => {
      destroyEnterpriseDoc('non-existent')
      // No error thrown
    })
  })

  describe('destroyAllEnterpriseDocs', () => {
    it('removes all docs', () => {
      getEnterpriseDoc('space-1', 'acme')
      getEnterpriseDoc('space-2', 'acme')
      expect(getActiveEnterpriseSpaceIds()).toHaveLength(2)

      destroyAllEnterpriseDocs()
      expect(getActiveEnterpriseSpaceIds()).toHaveLength(0)
    })
  })

  describe('getActiveEnterpriseSpaceIds', () => {
    it('returns empty array when no docs exist', () => {
      expect(getActiveEnterpriseSpaceIds()).toEqual([])
    })

    it('returns space IDs of all active docs', () => {
      getEnterpriseDoc('space-1', 'acme')
      getEnterpriseDoc('space-2', 'acme')

      const ids = getActiveEnterpriseSpaceIds()
      expect(ids).toContain('space-1')
      expect(ids).toContain('space-2')
      expect(ids).toHaveLength(2)
    })
  })

  describe('getAllEnterpriseDocs', () => {
    it('returns empty array when no docs exist', () => {
      expect(getAllEnterpriseDocs()).toEqual([])
    })

    it('returns all active docs', () => {
      getEnterpriseDoc('space-1', 'acme')
      getEnterpriseDoc('space-2', 'acme')

      const docs = getAllEnterpriseDocs()
      expect(docs).toHaveLength(2)
    })
  })

  describe('Y.Doc data isolation', () => {
    it('maps in different spaces are independent', () => {
      const doc1 = getEnterpriseDoc('space-1', 'acme')
      const doc2 = getEnterpriseDoc('space-2', 'acme')

      // Write to space-1
      doc1.maps.agents.set('agent-1', {
        id: 'agent-1',
        slug: 'test',
        name: 'Test Agent',
        role: 'test',
        instructions: 'test',
        createdAt: new Date(),
      } as any)

      // space-2 should not have the agent
      expect(doc2.maps.agents.get('agent-1')).toBeUndefined()
      expect(doc1.maps.agents.get('agent-1')).toBeDefined()
    })
  })
})
