/**
 * @module lib/teams/agent-companies/export
 *
 * Agent Companies Export Pipeline
 *
 * Reads DEVS Teams entities from Enterprise Y.Docs and generates
 * Agent Companies markdown files for download as a zip.
 *
 * ## Flow
 *
 * ```
 * Admin clicks Export
 *   → Client reads from Enterprise Y.Docs:
 *       Spaces → TEAM.md
 *       Agents → AGENTS.md
 *       Skills → SKILL.md
 *       Tasks → TASK.md
 *   → Generates markdown/YAML files
 *   → Downloads as zip
 * ```
 *
 * The export is a **snapshot** — no ongoing sync, no Git integration.
 */

import * as yaml from 'yaml'
import type { Agent, Task, InstalledSkill, Space } from '@/types'
import type {
  CompanyManifest,
  ExportFile,
  ExportResult,
} from './types'

// ============================================================================
// Helpers
// ============================================================================

/**
 * Slugify a string for use as a directory name.
 */
function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    || 'unnamed'
}

/**
 * Build a markdown file with YAML frontmatter.
 */
function buildMarkdown(
  frontmatter: Record<string, unknown>,
  body: string,
): string {
  // Filter out undefined values
  const filtered: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(frontmatter)) {
    if (value !== undefined && value !== null) {
      filtered[key] = value
    }
  }

  const yamlContent = yaml.stringify(filtered, {
    indent: 2,
    lineWidth: 0,
    nullStr: '',
  })

  return `---\n${yamlContent}---\n\n${body}\n`
}

// ============================================================================
// COMPANY.md generation
// ============================================================================

/**
 * Generate a COMPANY.md file from company metadata.
 */
export function generateCompanyMd(company: CompanyManifest): string {
  const frontmatter: Record<string, unknown> = {
    name: company.name,
    description: company.description,
    domain: company.domain,
    version: company.version,
  }

  return buildMarkdown(frontmatter, `# ${company.name}`)
}

// ============================================================================
// TEAM.md generation
// ============================================================================

/**
 * Generate a TEAM.md file from an Enterprise Space.
 */
export function generateTeamMd(space: Space): string {
  const frontmatter: Record<string, unknown> = {
    name: space.name,
    icon: space.icon,
  }

  return buildMarkdown(frontmatter, `# ${space.name}`)
}

// ============================================================================
// AGENTS.md generation
// ============================================================================

/**
 * Generate an AGENTS.md file from a list of agents.
 *
 * Each agent becomes an H2 section with metadata lines and instructions body.
 */
export function generateAgentsMd(agents: Agent[]): string {
  const frontmatter: Record<string, unknown> = {
    version: '1.0',
  }

  const sections = agents.map((agent) => {
    const lines: string[] = []
    lines.push(`## ${agent.name}`)
    lines.push('')
    lines.push(`**Role:** ${agent.role}`)

    if (agent.icon) {
      lines.push(`**Icon:** ${agent.icon}`)
    }
    if (agent.color) {
      lines.push(`**Color:** ${agent.color}`)
    }
    if (agent.tags && agent.tags.length > 0) {
      lines.push(`**Tags:** ${agent.tags.join(', ')}`)
    }
    if (agent.temperature !== undefined) {
      lines.push(`**Temperature:** ${agent.temperature}`)
    }
    if (agent.tools && agent.tools.length > 0) {
      const toolNames = agent.tools.map((t) =>
        typeof t === 'string' ? t : (t as any).function?.name ?? (t as any).name ?? '',
      ).filter(Boolean)
      if (toolNames.length > 0) {
        lines.push(`**Tools:** ${toolNames.join(', ')}`)
      }
    }

    lines.push('')
    lines.push(agent.instructions)

    return lines.join('\n')
  })

  const body = sections.join('\n\n')

  return buildMarkdown(frontmatter, body)
}

// ============================================================================
// SKILL.md generation
// ============================================================================

/**
 * Generate a SKILL.md file from an installed skill.
 */
export function generateSkillMd(skill: InstalledSkill): string {
  const frontmatter: Record<string, unknown> = {
    name: skill.name,
    description: skill.description,
    author: skill.author,
    license: skill.license,
    autoActivate: skill.autoActivate || undefined,
  }

  return buildMarkdown(frontmatter, skill.skillMdContent)
}

// ============================================================================
// TASK.md generation
// ============================================================================

/**
 * Generate a TASK.md file from a list of tasks.
 *
 * Each task becomes an H2 section with metadata lines.
 */
export function generateTasksMd(tasks: Task[], allTasks: Task[]): string {
  const frontmatter: Record<string, unknown> = {
    version: '1.0',
  }

  // Build an ID-to-title map for resolving dependency references
  const idToTitle = new Map<string, string>()
  for (const task of allTasks) {
    idToTitle.set(task.id, task.title)
  }

  const sections = tasks.map((task) => {
    const lines: string[] = []
    lines.push(`## ${task.title}`)
    lines.push('')

    if (task.dependencies && task.dependencies.length > 0) {
      const depNames = task.dependencies
        .map((depId) => idToTitle.get(depId) ?? depId)
        .join(', ')
      lines.push(`**Dependencies:** ${depNames}`)
      lines.push('')
    }

    lines.push(task.description)

    return lines.join('\n')
  })

  const body = sections.join('\n\n')

  return buildMarkdown(frontmatter, body)
}

// ============================================================================
// Full export builder
// ============================================================================

export interface BuildExportInput {
  orgName: string
  spaces: Space[]
  agentsBySpace: Record<string, Agent[]>
  skillsBySpace: Record<string, InstalledSkill[]>
  tasksBySpace: Record<string, Task[]>
}

/**
 * Build a complete set of export files from DEVS Teams entities.
 *
 * Organizes files by team directory:
 * ```
 * COMPANY.md
 * teams/
 *   engineering/
 *     TEAM.md
 *     AGENTS.md
 *     SKILL.md    (per skill)
 *     TASK.md
 *   marketing/
 *     TEAM.md
 *     ...
 * ```
 */
export function buildExportFiles(input: BuildExportInput): ExportResult {
  const files: ExportFile[] = []

  // COMPANY.md at root
  const company: CompanyManifest = {
    name: input.orgName,
  }
  files.push({
    path: 'COMPANY.md',
    content: generateCompanyMd(company),
  })

  // Per-space files
  for (const space of input.spaces) {
    const dirName = slugify(space.name)
    const prefix = `teams/${dirName}`

    // TEAM.md
    files.push({
      path: `${prefix}/TEAM.md`,
      content: generateTeamMd(space),
    })

    // AGENTS.md (only if space has agents)
    const agents = input.agentsBySpace[space.id] ?? []
    if (agents.length > 0) {
      files.push({
        path: `${prefix}/AGENTS.md`,
        content: generateAgentsMd(agents),
      })
    }

    // SKILL.md files (one per skill)
    const skills = input.skillsBySpace[space.id] ?? []
    for (const skill of skills) {
      const skillDir = slugify(skill.name)
      files.push({
        path: `${prefix}/skills/${skillDir}/SKILL.md`,
        content: generateSkillMd(skill),
      })
    }

    // TASK.md (only if space has tasks)
    const tasks = input.tasksBySpace[space.id] ?? []
    if (tasks.length > 0) {
      files.push({
        path: `${prefix}/TASK.md`,
        content: generateTasksMd(tasks, tasks),
      })
    }
  }

  return { files, company }
}

/**
 * Create a zip blob from export files.
 *
 * Uses a minimal ZIP builder to avoid external dependencies.
 * All files are stored without compression (simpler, markdown is small).
 */
export async function createExportZip(result: ExportResult): Promise<Blob> {
  const encoder = new TextEncoder()

  // Build ZIP file
  const centralDirectory: Uint8Array[] = []
  const localFiles: Uint8Array[] = []
  let localOffset = 0

  for (const file of result.files) {
    const fileNameBytes = encoder.encode(file.path)
    const fileDataBytes = encoder.encode(file.content)

    // Local file header (30 + fileName + data)
    const localHeader = new ArrayBuffer(30)
    const localView = new DataView(localHeader)
    localView.setUint32(0, 0x04034b50, true) // signature
    localView.setUint16(4, 20, true) // version needed
    localView.setUint16(6, 0, true) // flags
    localView.setUint16(8, 0, true) // compression method (stored)
    localView.setUint16(10, 0, true) // mod time
    localView.setUint16(12, 0, true) // mod date
    localView.setUint32(14, crc32(fileDataBytes), true) // CRC-32
    localView.setUint32(18, fileDataBytes.byteLength, true) // compressed size
    localView.setUint32(22, fileDataBytes.byteLength, true) // uncompressed size
    localView.setUint16(26, fileNameBytes.byteLength, true) // file name length
    localView.setUint16(28, 0, true) // extra field length

    const localEntry = new Uint8Array(
      30 + fileNameBytes.byteLength + fileDataBytes.byteLength,
    )
    localEntry.set(new Uint8Array(localHeader), 0)
    localEntry.set(fileNameBytes, 30)
    localEntry.set(fileDataBytes, 30 + fileNameBytes.byteLength)
    localFiles.push(localEntry)

    // Central directory header (46 + fileName)
    const cdHeader = new ArrayBuffer(46)
    const cdView = new DataView(cdHeader)
    cdView.setUint32(0, 0x02014b50, true) // signature
    cdView.setUint16(4, 20, true) // version made by
    cdView.setUint16(6, 20, true) // version needed
    cdView.setUint16(8, 0, true) // flags
    cdView.setUint16(10, 0, true) // compression method
    cdView.setUint16(12, 0, true) // mod time
    cdView.setUint16(14, 0, true) // mod date
    cdView.setUint32(16, crc32(fileDataBytes), true) // CRC-32
    cdView.setUint32(20, fileDataBytes.byteLength, true) // compressed size
    cdView.setUint32(24, fileDataBytes.byteLength, true) // uncompressed size
    cdView.setUint16(28, fileNameBytes.byteLength, true) // file name length
    cdView.setUint16(30, 0, true) // extra field length
    cdView.setUint16(32, 0, true) // file comment length
    cdView.setUint16(34, 0, true) // disk number start
    cdView.setUint16(36, 0, true) // internal file attributes
    cdView.setUint32(38, 0, true) // external file attributes
    cdView.setUint32(42, localOffset, true) // relative offset

    const cdEntry = new Uint8Array(46 + fileNameBytes.byteLength)
    cdEntry.set(new Uint8Array(cdHeader), 0)
    cdEntry.set(fileNameBytes, 46)
    centralDirectory.push(cdEntry)

    localOffset += localEntry.byteLength
  }

  // End of central directory record
  const cdSize = centralDirectory.reduce((sum, cd) => sum + cd.byteLength, 0)
  const eocd = new ArrayBuffer(22)
  const eocdView = new DataView(eocd)
  eocdView.setUint32(0, 0x06054b50, true) // signature
  eocdView.setUint16(4, 0, true) // disk number
  eocdView.setUint16(6, 0, true) // disk with central dir
  eocdView.setUint16(8, result.files.length, true) // entries on disk
  eocdView.setUint16(10, result.files.length, true) // total entries
  eocdView.setUint32(12, cdSize, true) // central dir size
  eocdView.setUint32(16, localOffset, true) // central dir offset
  eocdView.setUint16(20, 0, true) // comment length

  const parts = [...localFiles, ...centralDirectory, new Uint8Array(eocd)]
  return new Blob(parts, { type: 'application/zip' })
}

/**
 * CRC-32 computation for ZIP file integrity.
 */
function crc32(data: Uint8Array): number {
  let crc = 0xffffffff
  for (let i = 0; i < data.byteLength; i++) {
    crc = crc ^ data[i]
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0)
    }
  }
  return (crc ^ 0xffffffff) >>> 0
}

/**
 * Trigger a file download in the browser.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
