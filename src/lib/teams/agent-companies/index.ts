/**
 * @module lib/teams/agent-companies
 *
 * Agent Companies Integration
 *
 * Import and export pipeline for the Agent Companies protocol —
 * the vendor-neutral format for portable AI companies.
 *
 * ## Import
 * Admin uploads an Agent Companies package (zip) via platform.devs.new.
 * Manifests are parsed and entities created via the devs-teams API.
 *
 * ## Export
 * Admin exports Enterprise spaces as an Agent Companies package (zip).
 * Y.Doc entities are read and converted to markdown files.
 *
 * @see https://agentcompanies.io
 */

// Types
export type {
  CompanyManifest,
  TeamManifest,
  ParsedTeamManifest,
  AgentManifestEntry,
  AgentsManifestFrontmatter,
  ParsedAgentsManifest,
  SkillManifest,
  ParsedSkillManifest,
  ProjectManifest,
  ParsedProjectManifest,
  TaskManifestEntry,
  TasksManifestFrontmatter,
  ParsedTasksManifest,
  AgentCompaniesPackage,
  ImportResult,
  ExportFile,
  ExportResult,
} from './types'

// Parser
export {
  parseCompanyManifest,
  parseTeamManifest,
  parseAgentsManifest,
  parseSkillManifest,
  parseProjectManifest,
  parseTasksManifest,
  parsePackageFiles,
} from './parser'

// Import pipeline
export { importPackage, importFromZip } from './import'

// Export pipeline
export {
  generateCompanyMd,
  generateTeamMd,
  generateAgentsMd,
  generateSkillMd,
  generateTasksMd,
  buildExportFiles,
  createExportZip,
  downloadBlob,
} from './export'

export type { BuildExportInput } from './export'
