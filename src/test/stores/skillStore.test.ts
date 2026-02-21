/**
 * Tests for Skill Store — Agent Skills management via Yjs
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { InstalledSkill } from '@/types'

// ── Yjs mock ──

const mockSkillsMap = new Map<string, InstalledSkill>()

vi.mock('@/lib/yjs', () => ({
  skills: {
    get: (id: string) => mockSkillsMap.get(id),
    set: (id: string, value: InstalledSkill) => mockSkillsMap.set(id, value),
    has: (id: string) => mockSkillsMap.has(id),
    delete: (id: string) => mockSkillsMap.delete(id),
    values: () => mockSkillsMap.values(),
    keys: () => mockSkillsMap.keys(),
    entries: () => mockSkillsMap.entries(),
    observe: vi.fn(),
    unobserve: vi.fn(),
  },
  transact: <T>(fn: () => T): T => fn(),
  useLiveMap: vi.fn(() => Array.from(mockSkillsMap.values())),
  useLiveValue: vi.fn((_map: unknown, id: string) =>
    mockSkillsMap.get(id),
  ),
}))

// ── Import after mock ──

import {
  installSkill,
  uninstallSkill,
  updateSkill,
  setSkillEnabled,
  assignSkillToAgents,
  getInstalledSkills,
  getEnabledSkills,
  getSkillById,
  getSkillByName,
  getSkillsForAgent,
  isSkillInstalled,
  getSkillByGitHubUrl,
} from '@/stores/skillStore'

// ── Helpers ──

function makeSkillData(
  overrides: Partial<Parameters<typeof installSkill>[0]> = {},
) {
  return {
    name: 'python-dev',
    description: 'A Python developer skill',
    author: 'test-author',
    skillMdContent: '# Skill\nDo python things',
    scripts: [],
    references: [],
    assets: [],
    githubUrl: 'https://github.com/test/python-dev/tree/main/.agent',
    stars: 42,
    ...overrides,
  }
}

// ── Tests ──

describe('skillStore', () => {
  beforeEach(() => {
    mockSkillsMap.clear()
    vi.clearAllMocks()
  })

  // ── Install ──

  describe('installSkill', () => {
    it('should create a new skill with default fields', () => {
      const skill = installSkill(makeSkillData())

      expect(skill.id).toBeDefined()
      expect(skill.name).toBe('python-dev')
      expect(skill.enabled).toBe(true)
      expect(skill.assignedAgentIds).toEqual([])
      expect(skill.autoActivate).toBe(false)
      expect(skill.installedAt).toBeInstanceOf(Date)
      expect(mockSkillsMap.has(skill.id)).toBe(true)
    })

    it('should accept a custom id', () => {
      const skill = installSkill(makeSkillData({ id: 'custom-id' }))
      expect(skill.id).toBe('custom-id')
    })

    it('should store scripts, references, and assets', () => {
      const script = {
        path: 'main.py',
        language: 'python' as const,
        content: 'print("hi")',
        packages: [],
      }
      const ref = { path: 'README.md', content: '# Readme', mimeType: 'text/markdown' }
      const asset = { path: 'icon.png', content: '...', mimeType: 'image/png' }

      const skill = installSkill(
        makeSkillData({
          scripts: [script],
          references: [ref],
          assets: [asset],
        }),
      )

      expect(skill.scripts).toHaveLength(1)
      expect(skill.references).toHaveLength(1)
      expect(skill.assets).toHaveLength(1)
    })
  })

  // ── Uninstall ──

  describe('uninstallSkill', () => {
    it('should remove an existing skill and return true', () => {
      const skill = installSkill(makeSkillData())
      const result = uninstallSkill(skill.id)

      expect(result).toBe(true)
      expect(mockSkillsMap.has(skill.id)).toBe(false)
    })

    it('should return false for a non-existent id', () => {
      expect(uninstallSkill('nonexistent')).toBe(false)
    })
  })

  // ── Update ──

  describe('updateSkill', () => {
    it('should merge updates and set updatedAt', () => {
      const skill = installSkill(makeSkillData())
      const updated = updateSkill(skill.id, {
        description: 'Updated description',
      })

      expect(updated).toBeDefined()
      expect(updated!.description).toBe('Updated description')
      expect(updated!.name).toBe('python-dev') // unchanged
      expect(updated!.id).toBe(skill.id) // id preserved
      expect(updated!.installedAt).toEqual(skill.installedAt) // installedAt preserved
    })

    it('should return undefined for non-existent id', () => {
      expect(updateSkill('nonexistent', { description: 'x' })).toBeUndefined()
    })

    it('should not overwrite id or installedAt', () => {
      const skill = installSkill(makeSkillData())
      const updated = updateSkill(skill.id, {
        // These casts are intentional to test the safety guard
        id: 'hacked-id' as any,
        installedAt: new Date(0) as any,
      } as any)

      expect(updated!.id).toBe(skill.id)
      expect(updated!.installedAt).toEqual(skill.installedAt)
    })
  })

  // ── setSkillEnabled ──

  describe('setSkillEnabled', () => {
    it('should toggle enabling a skill', () => {
      const skill = installSkill(makeSkillData())
      expect(skill.enabled).toBe(true)

      setSkillEnabled(skill.id, false)
      const after = mockSkillsMap.get(skill.id)!
      expect(after.enabled).toBe(false)
    })

    it('should return false for non-existent id', () => {
      expect(setSkillEnabled('nonexistent', true)).toBe(false)
    })
  })

  // ── assignSkillToAgents ──

  describe('assignSkillToAgents', () => {
    it('should assign agents to a skill', () => {
      const skill = installSkill(makeSkillData())
      assignSkillToAgents(skill.id, ['agent-1', 'agent-2'])

      const after = mockSkillsMap.get(skill.id)!
      expect(after.assignedAgentIds).toEqual(['agent-1', 'agent-2'])
    })

    it('should return false for non-existent id', () => {
      expect(assignSkillToAgents('nonexistent', ['a'])).toBe(false)
    })
  })

  // ── Read operations ──

  describe('getInstalledSkills', () => {
    it('should return all installed skills', () => {
      installSkill(makeSkillData({ name: 'skill-a' }))
      installSkill(makeSkillData({ name: 'skill-b' }))

      const all = getInstalledSkills()
      expect(all).toHaveLength(2)
    })
  })

  describe('getEnabledSkills', () => {
    it('should return only enabled skills', () => {
      const s1 = installSkill(makeSkillData({ name: 'enabled' }))
      const s2 = installSkill(makeSkillData({ name: 'disabled' }))
      setSkillEnabled(s2.id, false)

      const enabled = getEnabledSkills()
      expect(enabled).toHaveLength(1)
      expect(enabled[0].id).toBe(s1.id)
    })
  })

  describe('getSkillById', () => {
    it('should return the correct skill', () => {
      const skill = installSkill(makeSkillData())
      expect(getSkillById(skill.id)).toBeDefined()
      expect(getSkillById(skill.id)!.name).toBe('python-dev')
    })

    it('should return undefined for unknown id', () => {
      expect(getSkillById('unknown')).toBeUndefined()
    })
  })

  describe('getSkillByName', () => {
    it('should find by name case-insensitively', () => {
      installSkill(makeSkillData({ name: 'Python-Dev' }))
      expect(getSkillByName('python-dev')).toBeDefined()
      expect(getSkillByName('PYTHON-DEV')).toBeDefined()
    })
  })

  describe('getSkillsForAgent', () => {
    it('should return globally available and agent-specific skills', () => {
      const global = installSkill(
        makeSkillData({ name: 'global' }),
      )
      const specific = installSkill(
        makeSkillData({ name: 'specific' }),
      )
      assignSkillToAgents(specific.id, ['agent-x'])

      const forX = getSkillsForAgent('agent-x')
      expect(forX).toHaveLength(2) // global + specific

      const forY = getSkillsForAgent('agent-y')
      expect(forY).toHaveLength(1) // global only
      expect(forY[0].id).toBe(global.id)
    })

    it('should exclude disabled skills', () => {
      const s = installSkill(makeSkillData())
      setSkillEnabled(s.id, false)

      expect(getSkillsForAgent('any')).toHaveLength(0)
    })
  })

  describe('isSkillInstalled', () => {
    it('should detect installed skills by GitHub URL', () => {
      const url = 'https://github.com/test/skill/tree/main/.agent'
      installSkill(makeSkillData({ githubUrl: url }))
      expect(isSkillInstalled(url)).toBe(true)
      expect(isSkillInstalled('https://github.com/other/skill')).toBe(false)
    })
  })

  describe('getSkillByGitHubUrl', () => {
    it('should return the skill with matching GitHub URL', () => {
      const url = 'https://github.com/test/skill/tree/main/.agent'
      installSkill(makeSkillData({ githubUrl: url }))

      const found = getSkillByGitHubUrl(url)
      expect(found).toBeDefined()
      expect(found!.githubUrl).toBe(url)
    })

    it('should return undefined when not found', () => {
      expect(getSkillByGitHubUrl('https://nope')).toBeUndefined()
    })
  })
})
