/**
 * @module lib/teams/agent-companies/types
 *
 * Agent Companies Package Types
 *
 * Defines the manifest types for the Agent Companies protocol —
 * the vendor-neutral format for portable AI companies.
 *
 * @see https://agentcompanies.io
 *
 * ## Mapping to DEVS Teams
 *
 * | Manifest        | DEVS Entity           |
 * |-----------------|-----------------------|
 * | COMPANY.md      | Enterprise org itself |
 * | TEAM.md         | Enterprise Space      |
 * | AGENTS.md       | Team agent            |
 * | SKILL.md        | Installed skill       |
 * | PROJECT.md      | Project metadata      |
 * | TASK.md         | Starter task          |
 */

// ============================================================================
// COMPANY.md — maps to the Enterprise org
// ============================================================================

/**
 * COMPANY.md frontmatter — describes the AI company as a whole.
 */
export interface CompanyManifest {
  name: string
  description?: string
  domain?: string
  logo?: string
  version?: string
}

// ============================================================================
// TEAM.md — maps to Enterprise Space
// ============================================================================

/**
 * TEAM.md frontmatter — describes a team / department.
 */
export interface TeamManifest {
  name: string
  description?: string
  icon?: string
}

/**
 * Parsed TEAM.md with frontmatter and body content.
 */
export interface ParsedTeamManifest {
  frontmatter: TeamManifest
  body: string
}

// ============================================================================
// AGENTS.md — maps to Team Agent(s)
// ============================================================================

/**
 * Single agent entry in AGENTS.md — each agent is an H2 section.
 */
export interface AgentManifestEntry {
  name: string
  slug?: string
  role: string
  instructions: string
  icon?: string
  color?: string
  description?: string
  temperature?: number
  tags?: string[]
  tools?: string[]
}

/**
 * AGENTS.md frontmatter (file-level metadata).
 */
export interface AgentsManifestFrontmatter {
  version?: string
}

/**
 * Parsed AGENTS.md — contains multiple agent entries.
 */
export interface ParsedAgentsManifest {
  frontmatter: AgentsManifestFrontmatter
  agents: AgentManifestEntry[]
}

// ============================================================================
// SKILL.md — maps to Installed Skill
// ============================================================================

/**
 * SKILL.md frontmatter — describes a skill.
 */
export interface SkillManifest {
  name: string
  description: string
  author?: string
  license?: string
  tags?: string[]
  autoActivate?: boolean
}

/**
 * Parsed SKILL.md with instructions body.
 */
export interface ParsedSkillManifest {
  frontmatter: SkillManifest
  body: string
}

// ============================================================================
// PROJECT.md — maps to project metadata in the space
// ============================================================================

/**
 * PROJECT.md frontmatter — describes a project.
 */
export interface ProjectManifest {
  name: string
  description?: string
  status?: string
  priority?: string
}

/**
 * Parsed PROJECT.md.
 */
export interface ParsedProjectManifest {
  frontmatter: ProjectManifest
  body: string
}

// ============================================================================
// TASK.md — maps to starter task(s)
// ============================================================================

/**
 * Single task entry in TASK.md — each task is an H2 section.
 */
export interface TaskManifestEntry {
  title: string
  description: string
  priority?: 'must' | 'should' | 'could' | 'wont'
  dependencies?: string[]
  assignedAgent?: string
}

/**
 * TASK.md frontmatter (file-level metadata).
 */
export interface TasksManifestFrontmatter {
  version?: string
}

/**
 * Parsed TASK.md — contains multiple task entries.
 */
export interface ParsedTasksManifest {
  frontmatter: TasksManifestFrontmatter
  tasks: TaskManifestEntry[]
}

// ============================================================================
// Complete Agent Companies Package
// ============================================================================

/**
 * A complete Agent Companies package — the union of all manifests.
 *
 * Import: Parsed from uploaded zip → created as DEVS Teams entities.
 * Export: Read from Enterprise Y.Docs → written as markdown files → downloaded as zip.
 */
export interface AgentCompaniesPackage {
  /** COMPANY.md manifest */
  company?: CompanyManifest
  /** TEAM.md manifests (one per team/space) */
  teams: ParsedTeamManifest[]
  /** AGENTS.md agent entries */
  agents: AgentManifestEntry[]
  /** SKILL.md skills */
  skills: ParsedSkillManifest[]
  /** PROJECT.md projects */
  projects: ParsedProjectManifest[]
  /** TASK.md tasks */
  tasks: TaskManifestEntry[]
}

// ============================================================================
// Import/Export Results
// ============================================================================

/**
 * Result of importing an Agent Companies package.
 */
export interface ImportResult {
  /** Whether the import succeeded */
  success: boolean
  /** Human-readable summary */
  message: string
  /** Created entity counts */
  created: {
    spaces: number
    agents: number
    skills: number
    tasks: number
  }
  /** Warnings (non-fatal issues) */
  warnings: string[]
  /** Errors (fatal issues that prevented some entities from being created) */
  errors: string[]
}

/**
 * A file entry in the export zip.
 */
export interface ExportFile {
  /** Path within the zip (e.g. "teams/engineering/TEAM.md") */
  path: string
  /** File content (UTF-8 string) */
  content: string
}

/**
 * Result of generating an export package.
 */
export interface ExportResult {
  /** Files to include in the zip */
  files: ExportFile[]
  /** Company manifest for the root COMPANY.md */
  company: CompanyManifest
}
