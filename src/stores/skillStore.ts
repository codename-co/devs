/**
 * Skill Store — Agent Skills management via Yjs
 *
 * Provides CRUD operations and reactive hooks for installed Agent Skills.
 * Skills are persisted in the `skills` Yjs map and sync across devices via P2P.
 *
 * @module stores/skillStore
 */

import { nanoid } from 'nanoid'
import { skills, transact, useLiveMap, useLiveValue } from '@/lib/yjs'
import type { InstalledSkill, SkillScript, SkillFile } from '@/types'

// ============================================================================
// Types
// ============================================================================

/**
 * Data required to install a new skill (everything except auto-generated fields).
 */
export interface InstallSkillData {
  /** Unique identifier (from SkillsMP or generated) */
  id?: string
  name: string
  description: string
  author: string
  license?: string
  metadata?: Record<string, string>
  skillMdContent: string
  scripts: SkillScript[]
  references: SkillFile[]
  assets: SkillFile[]
  githubUrl: string
  stars: number
}

// ============================================================================
// CRUD operations (non-React, callable from anywhere)
// ============================================================================

/**
 * Install a new skill into the store.
 * Returns the created InstalledSkill.
 */
export function installSkill(data: InstallSkillData): InstalledSkill {
  const now = new Date()
  const skill: InstalledSkill = {
    id: data.id || nanoid(),
    name: data.name,
    description: data.description,
    author: data.author,
    license: data.license,
    metadata: data.metadata,
    skillMdContent: data.skillMdContent,
    scripts: data.scripts,
    references: data.references,
    assets: data.assets,
    githubUrl: data.githubUrl,
    stars: data.stars,
    installedAt: now,
    updatedAt: now,
    enabled: true,
    assignedAgentIds: [],
    autoActivate: false,
  }

  transact(() => {
    skills.set(skill.id, skill)
  })

  return skill
}

/**
 * Uninstall a skill by removing it from the store.
 * Returns true if the skill was found and removed.
 */
export function uninstallSkill(id: string): boolean {
  if (!skills.has(id)) return false
  transact(() => {
    skills.delete(id)
  })
  return true
}

/**
 * Update an existing installed skill.
 * Merges the provided fields with the existing skill data.
 */
export function updateSkill(
  id: string,
  updates: Partial<Omit<InstalledSkill, 'id' | 'installedAt'>>,
): InstalledSkill | undefined {
  const existing = skills.get(id)
  if (!existing) return undefined

  const updated: InstalledSkill = {
    ...existing,
    ...updates,
    id: existing.id, // Never overwrite id
    installedAt: existing.installedAt, // Never overwrite installedAt
    updatedAt: new Date(),
  }

  transact(() => {
    skills.set(id, updated)
  })

  return updated
}

/**
 * Enable or disable a skill.
 */
export function setSkillEnabled(id: string, enabled: boolean): boolean {
  const existing = skills.get(id)
  if (!existing) return false

  transact(() => {
    skills.set(id, { ...existing, enabled, updatedAt: new Date() })
  })

  return true
}

/**
 * Assign a skill to specific agents.
 * Pass an empty array to make the skill available to all agents.
 */
export function assignSkillToAgents(
  id: string,
  agentIds: string[],
): boolean {
  const existing = skills.get(id)
  if (!existing) return false

  transact(() => {
    skills.set(id, {
      ...existing,
      assignedAgentIds: agentIds,
      updatedAt: new Date(),
    })
  })

  return true
}

// ============================================================================
// Read operations
// ============================================================================

/**
 * Get all installed skills.
 */
export function getInstalledSkills(): InstalledSkill[] {
  return Array.from(skills.values())
}

/**
 * Get only enabled installed skills.
 */
export function getEnabledSkills(): InstalledSkill[] {
  return Array.from(skills.values()).filter((s) => s.enabled)
}

/**
 * Get a skill by its ID.
 */
export function getSkillById(id: string): InstalledSkill | undefined {
  return skills.get(id)
}

/**
 * Get a skill by its name (case-insensitive match).
 */
export function getSkillByName(name: string): InstalledSkill | undefined {
  const lower = name.toLowerCase()
  for (const skill of skills.values()) {
    if (skill.name.toLowerCase() === lower) return skill
  }
  return undefined
}

/**
 * Get enabled skills available to a specific agent.
 * Returns skills that are either globally available (empty assignedAgentIds)
 * or explicitly assigned to the given agent.
 */
export function getSkillsForAgent(agentId: string): InstalledSkill[] {
  return Array.from(skills.values()).filter(
    (skill) =>
      skill.enabled &&
      (skill.assignedAgentIds.length === 0 ||
        skill.assignedAgentIds.includes(agentId)),
  )
}

/**
 * Check if a skill with the given GitHub URL is already installed.
 */
export function isSkillInstalled(githubUrl: string): boolean {
  for (const skill of skills.values()) {
    if (skill.githubUrl === githubUrl) return true
  }
  return false
}

/**
 * Find an installed skill by its GitHub URL.
 */
export function getSkillByGitHubUrl(
  githubUrl: string,
): InstalledSkill | undefined {
  for (const skill of skills.values()) {
    if (skill.githubUrl === githubUrl) return skill
  }
  return undefined
}

// ============================================================================
// React hooks (for components)
// ============================================================================

/**
 * Reactive hook: returns all installed skills, updating when skills change.
 */
export function useSkills(): InstalledSkill[] {
  return useLiveMap(skills)
}

/**
 * Reactive hook: returns a specific skill by ID, updating when it changes.
 */
export function useSkill(id: string): InstalledSkill | undefined {
  return useLiveValue(skills, id)
}

/**
 * Reactive hook: returns enabled skills for a specific agent.
 */
export function useSkillsForAgent(agentId: string): InstalledSkill[] {
  const allSkills = useLiveMap(skills)
  return allSkills.filter(
    (skill) =>
      skill.enabled &&
      (skill.assignedAgentIds.length === 0 ||
        skill.assignedAgentIds.includes(agentId)),
  )
}
