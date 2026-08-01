/**
 * @module lib/teams/agent-companies/parser
 *
 * Agent Companies Manifest Parser
 *
 * Parses Agent Companies package files (markdown with YAML frontmatter)
 * into structured manifest objects that the import pipeline can consume.
 *
 * ## Supported manifests
 *
 * - **COMPANY.md** — Organization identity
 * - **TEAM.md** — Team/department (maps to Enterprise Space)
 * - **AGENTS.md** — Agent definitions (H2 sections)
 * - **SKILL.md** — Skill definitions
 * - **PROJECT.md** — Project metadata
 * - **TASK.md** — Task definitions (H2 sections)
 *
 * ## H2 section parsing
 *
 * AGENTS.md and TASK.md use a convention where each entity is an H2
 * (`##`) section. Metadata lines are extracted from bold-prefixed
 * lines (`**Key:** value`), and the remaining text is the body/instructions.
 */

import * as yaml from 'yaml'
import type {
  CompanyManifest,
  ParsedTeamManifest,
  ParsedAgentsManifest,
  AgentManifestEntry,
  ParsedSkillManifest,
  ParsedProjectManifest,
  ParsedTasksManifest,
  TaskManifestEntry,
  AgentCompaniesPackage,
} from './types'

// ============================================================================
// Frontmatter parsing (shared utility)
// ============================================================================

const FRONTMATTER_REGEX = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/

/**
 * Parse markdown content with YAML frontmatter.
 */
function parseFrontmatter<T>(content: string): {
  frontmatter: T
  body: string
} | null {
  // Strip BOM
  let clean = content.startsWith('\uFEFF') ? content.slice(1) : content
  clean = clean.replace(/\r\n/g, '\n')

  const match = clean.match(FRONTMATTER_REGEX)
  if (!match) return null

  try {
    const frontmatter = yaml.parse(match[1]) as T
    const body = match[2].trim()
    return { frontmatter, body }
  } catch {
    return null
  }
}

// ============================================================================
// H2 section parsing (for AGENTS.md and TASK.md)
// ============================================================================

interface H2Section {
  title: string
  metadata: Map<string, string>
  body: string
}

/**
 * Split markdown content into H2 sections.
 *
 * Each section starts with `## Title` and includes:
 * - Metadata lines: `**Key:** value`
 * - Body text: everything else
 */
function parseH2Sections(content: string): H2Section[] {
  const sections: H2Section[] = []
  const lines = content.split('\n')

  let currentTitle: string | null = null
  let currentLines: string[] = []

  const flush = () => {
    if (currentTitle !== null) {
      const metadata = new Map<string, string>()
      const bodyLines: string[] = []

      for (const line of currentLines) {
        const metaMatch = line.match(/^\*\*(.+?):\*\*\s*(.+)$/)
        if (metaMatch) {
          metadata.set(metaMatch[1].trim(), metaMatch[2].trim())
        } else {
          bodyLines.push(line)
        }
      }

      sections.push({
        title: currentTitle,
        metadata,
        body: bodyLines.join('\n').trim(),
      })
    }
  }

  for (const line of lines) {
    const h2Match = line.match(/^##\s+(.+)$/)
    if (h2Match) {
      flush()
      currentTitle = h2Match[1].trim()
      currentLines = []
    } else if (currentTitle !== null) {
      currentLines.push(line)
    }
  }
  flush()

  return sections
}

// ============================================================================
// COMPANY.md
// ============================================================================

/**
 * Parse a COMPANY.md file into a CompanyManifest.
 *
 * @param content - Raw markdown content of COMPANY.md
 * @returns Parsed company manifest, or null if invalid
 */
export function parseCompanyManifest(content: string): CompanyManifest | null {
  const parsed = parseFrontmatter<CompanyManifest>(content)
  if (!parsed) return null
  if (!parsed.frontmatter.name) return null
  return parsed.frontmatter
}

// ============================================================================
// TEAM.md
// ============================================================================

/**
 * Parse a TEAM.md file into a ParsedTeamManifest.
 *
 * @param content - Raw markdown content of TEAM.md
 * @returns Parsed team manifest, or null if invalid
 */
export function parseTeamManifest(content: string): ParsedTeamManifest | null {
  const parsed = parseFrontmatter<ParsedTeamManifest['frontmatter']>(content)
  if (!parsed) return null
  if (!parsed.frontmatter.name) return null
  return parsed
}

// ============================================================================
// AGENTS.md
// ============================================================================

/**
 * Parse an AGENTS.md file into a ParsedAgentsManifest.
 *
 * Each agent is an H2 section with metadata lines:
 * - `**Role:** ...`
 * - `**Tags:** tag1, tag2`
 * - `**Temperature:** 0.7`
 * - `**Icon:** Code`
 * - `**Color:** blue`
 * - `**Tools:** tool1, tool2`
 *
 * The remaining text in the section becomes the agent's instructions.
 *
 * @param content - Raw markdown content of AGENTS.md
 * @returns Parsed agents manifest
 */
export function parseAgentsManifest(
  content: string,
): ParsedAgentsManifest | null {
  // Try to parse frontmatter; if absent, treat entire content as body
  const parsed = parseFrontmatter<ParsedAgentsManifest['frontmatter']>(content)
  const body = parsed ? parsed.body : content
  const frontmatter = parsed ? parsed.frontmatter : {}

  const sections = parseH2Sections(body)
  const agents: AgentManifestEntry[] = sections.map((section) => {
    const entry: AgentManifestEntry = {
      name: section.title,
      role: section.metadata.get('Role') ?? '',
      instructions: section.body,
    }

    const tags = section.metadata.get('Tags')
    if (tags) {
      entry.tags = tags.split(',').map((t) => t.trim())
    }

    const temp = section.metadata.get('Temperature')
    if (temp) {
      const parsed = parseFloat(temp)
      if (!isNaN(parsed)) entry.temperature = parsed
    }

    const icon = section.metadata.get('Icon')
    if (icon) entry.icon = icon

    const color = section.metadata.get('Color')
    if (color) entry.color = color

    const desc = section.metadata.get('Description')
    if (desc) entry.description = desc

    const tools = section.metadata.get('Tools')
    if (tools) {
      entry.tools = tools.split(',').map((t) => t.trim())
    }

    return entry
  })

  return { frontmatter, agents }
}

// ============================================================================
// SKILL.md
// ============================================================================

/**
 * Parse a SKILL.md file into a ParsedSkillManifest.
 *
 * @param content - Raw markdown content of SKILL.md
 * @returns Parsed skill manifest, or null if invalid
 */
export function parseSkillManifest(
  content: string,
): ParsedSkillManifest | null {
  const parsed = parseFrontmatter<ParsedSkillManifest['frontmatter']>(content)
  if (!parsed) return null
  if (!parsed.frontmatter.name || !parsed.frontmatter.description) return null
  return parsed
}

// ============================================================================
// PROJECT.md
// ============================================================================

/**
 * Parse a PROJECT.md file into a ParsedProjectManifest.
 *
 * @param content - Raw markdown content of PROJECT.md
 * @returns Parsed project manifest, or null if invalid
 */
export function parseProjectManifest(
  content: string,
): ParsedProjectManifest | null {
  const parsed = parseFrontmatter<ParsedProjectManifest['frontmatter']>(content)
  if (!parsed) return null
  if (!parsed.frontmatter.name) return null
  return parsed
}

// ============================================================================
// TASK.md
// ============================================================================

/**
 * Parse a TASK.md file into a ParsedTasksManifest.
 *
 * Each task is an H2 section with metadata lines:
 * - `**Priority:** must | should | could | wont`
 * - `**Dependencies:** Task A, Task B` (or `none`)
 * - `**Assigned:** Agent Name`
 *
 * The remaining text becomes the task description.
 *
 * @param content - Raw markdown content of TASK.md
 * @returns Parsed tasks manifest
 */
export function parseTasksManifest(
  content: string,
): ParsedTasksManifest | null {
  const parsed = parseFrontmatter<ParsedTasksManifest['frontmatter']>(content)
  const body = parsed ? parsed.body : content
  const frontmatter = parsed ? parsed.frontmatter : {}

  const sections = parseH2Sections(body)
  const tasks: TaskManifestEntry[] = sections.map((section) => {
    const entry: TaskManifestEntry = {
      title: section.title,
      description: section.body,
    }

    const priority = section.metadata.get('Priority')
    if (
      priority &&
      ['must', 'should', 'could', 'wont'].includes(priority.toLowerCase())
    ) {
      entry.priority = priority.toLowerCase() as TaskManifestEntry['priority']
    }

    const deps = section.metadata.get('Dependencies')
    if (deps && deps.toLowerCase() !== 'none') {
      entry.dependencies = deps.split(',').map((d) => d.trim())
    } else {
      entry.dependencies = []
    }

    const assigned = section.metadata.get('Assigned')
    if (assigned) {
      entry.assignedAgent = assigned
    }

    return entry
  })

  return { frontmatter, tasks }
}

// ============================================================================
// Package parsing (from zip file contents)
// ============================================================================

/**
 * Parse a complete Agent Companies package from a map of file paths to contents.
 *
 * This is the main entry point for the import pipeline. It receives the
 * extracted contents of a zip file and returns a structured package.
 *
 * @param files - Map of file paths to their string contents
 * @returns A complete AgentCompaniesPackage
 */
export function parsePackageFiles(
  files: Map<string, string>,
): AgentCompaniesPackage {
  const pkg: AgentCompaniesPackage = {
    teams: [],
    agents: [],
    skills: [],
    projects: [],
    tasks: [],
  }

  for (const [path, content] of files) {
    const filename = path.split('/').pop()?.toUpperCase()

    if (filename === 'COMPANY.MD') {
      const company = parseCompanyManifest(content)
      if (company) pkg.company = company
    } else if (filename === 'TEAM.MD') {
      const team = parseTeamManifest(content)
      if (team) pkg.teams.push(team)
    } else if (filename === 'AGENTS.MD') {
      const agents = parseAgentsManifest(content)
      if (agents) pkg.agents.push(...agents.agents)
    } else if (filename === 'SKILL.MD') {
      const skill = parseSkillManifest(content)
      if (skill) pkg.skills.push(skill)
    } else if (filename === 'PROJECT.MD') {
      const project = parseProjectManifest(content)
      if (project) pkg.projects.push(project)
    } else if (filename === 'TASK.MD') {
      const tasks = parseTasksManifest(content)
      if (tasks) pkg.tasks.push(...tasks.tasks)
    }
  }

  return pkg
}
