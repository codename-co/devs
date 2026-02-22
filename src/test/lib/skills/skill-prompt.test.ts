/**
 * Tests for Skill Prompt — Catalog XML and instructions builder
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { InstalledSkill } from '@/types'

// ── Mock skill store ──

const mockSkillsMap = new Map<string, InstalledSkill>()

vi.mock('@/stores/skillStore', () => ({
  getSkillsForAgent: (agentId: string) =>
    Array.from(mockSkillsMap.values()).filter(
      (s) =>
        s.enabled &&
        (s.assignedAgentIds.length === 0 ||
          s.assignedAgentIds.includes(agentId)),
    ),
  getEnabledSkills: () =>
    Array.from(mockSkillsMap.values()).filter((s) => s.enabled),
}))

import {
  buildSkillCatalogXml,
  buildSkillInstructions,
  getSkillCompatibility,
} from '@/lib/skills/skill-prompt'

// ── Helpers ──

function makeSkill(overrides: Partial<InstalledSkill> = {}): InstalledSkill {
  const now = new Date()
  return {
    id: overrides.id ?? 'skill-1',
    name: overrides.name ?? 'test-skill',
    description: overrides.description ?? 'A test skill',
    author: overrides.author ?? 'author',
    skillMdContent: overrides.skillMdContent ?? '# Test\nDo stuff',
    scripts: overrides.scripts ?? [],
    references: overrides.references ?? [],
    assets: overrides.assets ?? [],
    githubUrl:
      overrides.githubUrl ??
      'https://github.com/test/repo/tree/main/.agent',
    stars: overrides.stars ?? 10,
    installedAt: overrides.installedAt ?? now,
    updatedAt: overrides.updatedAt ?? now,
    enabled: overrides.enabled ?? true,
    assignedAgentIds: overrides.assignedAgentIds ?? [],
    autoActivate: overrides.autoActivate ?? false,
  }
}

// ── Tests ──

describe('skill-prompt', () => {
  beforeEach(() => {
    mockSkillsMap.clear()
  })

  // ── buildSkillCatalogXml ──

  describe('buildSkillCatalogXml', () => {
    it('should return empty string when no skills installed', () => {
      expect(buildSkillCatalogXml()).toBe('')
    })

    it('should build XML catalog from enabled skills', () => {
      mockSkillsMap.set(
        's1',
        makeSkill({ id: 's1', name: 'pdf', description: 'PDF processor' }),
      )
      mockSkillsMap.set(
        's2',
        makeSkill({ id: 's2', name: 'csv', description: 'CSV handler' }),
      )

      const xml = buildSkillCatalogXml()

      expect(xml).toContain('<available_skills>')
      expect(xml).toContain('<name>pdf</name>')
      expect(xml).toContain('<description>PDF processor</description>')
      expect(xml).toContain('<name>csv</name>')
      expect(xml).toContain('</available_skills>')
    })

    it('should escape XML special characters', () => {
      mockSkillsMap.set(
        's1',
        makeSkill({ id: 's1', name: 'test & <demo>', description: 'a "quoted" skill' }),
      )

      const xml = buildSkillCatalogXml()

      expect(xml).toContain('test &amp; &lt;demo&gt;')
      expect(xml).toContain('a &quot;quoted&quot; skill')
    })

    it('should filter by agentId when provided', () => {
      mockSkillsMap.set(
        's1',
        makeSkill({ id: 's1', name: 'global', assignedAgentIds: [] }),
      )
      mockSkillsMap.set(
        's2',
        makeSkill({
          id: 's2',
          name: 'agent-specific',
          assignedAgentIds: ['agent-x'],
        }),
      )

      const xmlForX = buildSkillCatalogXml('agent-x')
      expect(xmlForX).toContain('global')
      expect(xmlForX).toContain('agent-specific')

      const xmlForY = buildSkillCatalogXml('agent-y')
      expect(xmlForY).toContain('global')
      expect(xmlForY).not.toContain('agent-specific')
    })

    it('should exclude disabled skills', () => {
      mockSkillsMap.set(
        's1',
        makeSkill({ id: 's1', name: 'disabled-skill', enabled: false }),
      )

      expect(buildSkillCatalogXml()).toBe('')
    })
  })

  // ── buildSkillInstructions ──

  describe('buildSkillInstructions', () => {
    it('should return empty string when no skills', () => {
      expect(buildSkillInstructions()).toBe('')
    })

    it('should contain the catalog + activation instructions', () => {
      mockSkillsMap.set(
        's1',
        makeSkill({ id: 's1', name: 'my-skill' }),
      )

      const instructions = buildSkillInstructions()

      expect(instructions).toContain('## Agent Skills')
      expect(instructions).toContain('1 specialized skill')
      expect(instructions).toContain('<available_skills>')
      expect(instructions).toContain('activate_skill')
    })

    it('should inject auto-activated skill content', () => {
      mockSkillsMap.set(
        's1',
        makeSkill({
          id: 's1',
          name: 'always-on',
          autoActivate: true,
          skillMdContent: '# Always\nDo this always',
        }),
      )

      const instructions = buildSkillInstructions()

      expect(instructions).toContain('[ACTIVE_SKILL: always-on]')
      expect(instructions).toContain('# Always')
      expect(instructions).toContain('Do this always')
      expect(instructions).toContain('[/ACTIVE_SKILL]')
    })

    it('should NOT inject content for non-auto-activated skills', () => {
      mockSkillsMap.set(
        's1',
        makeSkill({
          id: 's1',
          name: 'on-demand',
          autoActivate: false,
          skillMdContent: 'secret instructions',
        }),
      )

      const instructions = buildSkillInstructions()

      expect(instructions).not.toContain('secret instructions')
      expect(instructions).not.toContain('[ACTIVE_SKILL')
    })
  })

  // ── getSkillCompatibility ──

  describe('getSkillCompatibility', () => {
    it('should return all zeros for instructions-only skill', () => {
      const result = getSkillCompatibility(makeSkill())
      expect(result).toEqual({
        python: 0,
        bash: 0,
        javascript: 0,
        other: 0,
        canExecute: true,
      })
    })

    it('should count Python scripts', () => {
      const skill = makeSkill({
        scripts: [
          { path: 'run.py', language: 'python', content: 'print("hi")' },
          { path: 'helper.py', language: 'python', content: '' },
        ],
      })

      const result = getSkillCompatibility(skill)
      expect(result.python).toBe(2)
      expect(result.canExecute).toBe(true)
    })

    it('should count Bash scripts', () => {
      const skill = makeSkill({
        scripts: [
          { path: 'run.sh', language: 'bash', content: 'echo hi' },
        ],
      })

      const result = getSkillCompatibility(skill)
      expect(result.bash).toBe(1)
      expect(result.canExecute).toBe(false)
    })

    it('should count JavaScript scripts', () => {
      const skill = makeSkill({
        scripts: [
          { path: 'index.js', language: 'javascript', content: 'console.log("hi")' },
        ],
      })

      const result = getSkillCompatibility(skill)
      expect(result.javascript).toBe(1)
      expect(result.canExecute).toBe(true)
    })

    it('should be executable if mixed Python+Bash', () => {
      const skill = makeSkill({
        scripts: [
          { path: 'run.py', language: 'python', content: '' },
          { path: 'setup.sh', language: 'bash', content: '' },
        ],
      })

      const result = getSkillCompatibility(skill)
      expect(result.python).toBe(1)
      expect(result.bash).toBe(1)
      expect(result.canExecute).toBe(true) // Python is present
    })
  })
})
