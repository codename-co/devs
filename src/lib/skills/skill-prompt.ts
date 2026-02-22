/**
 * Skill Catalog Injection — Prompt Engineering for Agent Skills
 *
 * Builds XML skill catalog blocks for injection into LLM system messages.
 * Implements the progressive disclosure pattern from the Agent Skills spec:
 * 1. Discovery: compact catalog (name + description) injected at conversation start
 * 2. Activation: full SKILL.md body loaded on demand via tool call
 *
 * @module lib/skills/skill-prompt
 */

import { getSkillsForAgent, getEnabledSkills } from '@/stores/skillStore'
import type { InstalledSkill } from '@/types'

/**
 * Build an XML catalog of available skills for a specific agent.
 *
 * Returns an `<available_skills>` XML block containing the name and description
 * of each enabled skill available to the agent. This is injected into the
 * system message so the LLM knows which skills it can activate.
 *
 * Returns an empty string if no skills are available.
 *
 * @param agentId - The agent to get skills for. If undefined, returns all enabled skills.
 * @returns XML string for system message injection, or empty string
 *
 * @example
 * ```xml
 * <available_skills>
 *   <skill>
 *     <name>pdf</name>
 *     <description>Use for anything involving PDF files...</description>
 *   </skill>
 * </available_skills>
 * ```
 */
export function buildSkillCatalogXml(agentId?: string): string {
  const skills = agentId ? getSkillsForAgent(agentId) : getEnabledSkills()

  if (skills.length === 0) return ''

  const skillEntries = skills
    .map(
      (skill) =>
        `  <skill>
    <name>${escapeXml(skill.name)}</name>
    <description>${escapeXml(skill.description)}</description>
  </skill>`,
    )
    .join('\n')

  return `<available_skills>
${skillEntries}
</available_skills>`
}

/**
 * Build the full skill instructions section for injection into the system message.
 *
 * This includes:
 * 1. The `<available_skills>` catalog XML
 * 2. Instructions on how to activate and use skills
 * 3. Auto-activated skill instructions (if any)
 *
 * @param agentId - The agent to build skill instructions for
 * @returns Complete skill instructions block, or empty string if no skills
 */
export function buildSkillInstructions(agentId?: string): string {
  const skills = agentId ? getSkillsForAgent(agentId) : getEnabledSkills()

  if (skills.length === 0) return ''

  const parts: string[] = []

  // 1. Skill catalog
  const catalog = buildSkillCatalogXml(agentId)
  parts.push(catalog)

  // 2. Usage instructions
  parts.push(`
When a user's task matches one of the available skills above, use the \`activate_skill\` tool to load its full instructions. The tool will return detailed step-by-step guidance and may reference scripts you can execute with \`run_skill_script\`.

Do NOT activate a skill unless the user's request clearly benefits from it.`)

  // 3. Auto-activated skill instructions (always injected)
  const autoActivated = skills.filter((s) => s.autoActivate)
  if (autoActivated.length > 0) {
    for (const skill of autoActivated) {
      parts.push(`
[ACTIVE_SKILL: ${escapeXml(skill.name)}]
${skill.skillMdContent}
[/ACTIVE_SKILL]`)
    }
  }

  return `## Agent Skills

You have access to ${skills.length} specialized skill(s) that extend your capabilities.

${parts.join('\n')}`
}

/**
 * Get skill compatibility info for display in the UI.
 *
 * Analyzes the skill's scripts to determine what can run in-browser.
 */
export function getSkillCompatibility(skill: InstalledSkill): {
  python: number
  bash: number
  javascript: number
  other: number
  canExecute: boolean
} {
  const counts = { python: 0, bash: 0, javascript: 0, other: 0 }
  for (const script of skill.scripts) {
    counts[script.language]++
  }

  // A skill can execute if it has Python or JavaScript scripts
  // (Bash and other scripts will be shown to the LLM for manual interpretation)
  const canExecute =
    skill.scripts.length === 0 || counts.python > 0 || counts.javascript > 0

  return { ...counts, canExecute }
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Escape special XML characters in a string.
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}
