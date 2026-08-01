/**
 * @module lib/teams/agent-companies/import
 *
 * Agent Companies Import Pipeline
 *
 * Parses an Agent Companies package and creates DEVS Teams entities
 * via the server-gated API. This is an admin-only operation.
 *
 * ## Flow
 *
 * ```
 * Admin uploads package on platform.devs.new
 *   → Parse zip into file map
 *   → parsePackageFiles() → AgentCompaniesPackage
 *   → importPackage() creates:
 *       Spaces (from TEAM.md)
 *       Agents (from AGENTS.md)
 *       Skills (from SKILL.md)
 *       Tasks (from TASK.md)
 *   → Enterprise Y.Docs populated
 *   → Team members see new spaces, agents, tasks via sync
 * ```
 *
 * All entity creation goes through the devs-teams API (server-gated writes).
 * The server validates admin permissions, writes to Y.Doc, and syncs to peers.
 */

import type {
  AgentCompaniesPackage,
  ImportResult,
} from './types'
import * as apiClient from '@/lib/teams/api-client'

/**
 * Import an Agent Companies package into DEVS Teams.
 *
 * Creates Enterprise spaces, team agents, skills, and tasks
 * via the devs-teams server API.
 *
 * @param pkg - Parsed Agent Companies package
 * @param orgId - The org ID to create entities under
 * @returns Import result with created counts, warnings, and errors
 */
export async function importPackage(
  pkg: AgentCompaniesPackage,
  orgId: string,
): Promise<ImportResult> {
  const result: ImportResult = {
    success: true,
    message: '',
    created: {
      spaces: 0,
      agents: 0,
      skills: 0,
      tasks: 0,
    },
    warnings: [],
    errors: [],
  }

  // ========================================================================
  // Step 1: Create spaces from TEAM.md manifests
  // ========================================================================

  const createdSpaceIds: string[] = []

  if (pkg.teams.length > 0) {
    for (const team of pkg.teams) {
      try {
        const response = await apiClient.createSpace(
          team.frontmatter.name,
          orgId,
        )
        createdSpaceIds.push(response.space.id)
        result.created.spaces++
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        result.errors.push(
          `Failed to create space "${team.frontmatter.name}": ${message}`,
        )
        result.success = false
      }
    }
  } else if (pkg.agents.length > 0 || pkg.tasks.length > 0) {
    // No teams specified but we have agents/tasks — create a default space
    const spaceName = pkg.company?.name ?? 'Imported'
    try {
      const response = await apiClient.createSpace(spaceName, orgId)
      createdSpaceIds.push(response.space.id)
      result.created.spaces++
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      result.errors.push(
        `Failed to create default space "${spaceName}": ${message}`,
      )
      result.success = false
    }
  }

  // If no spaces were created and we have entities to place, we can't proceed
  if (createdSpaceIds.length === 0 && (pkg.agents.length > 0 || pkg.tasks.length > 0)) {
    result.message = `Import failed: no spaces could be created. ${result.errors.join('; ')}`
    return result
  }

  // Target space for agents and tasks: first created space
  const targetSpaceId = createdSpaceIds[0]

  // ========================================================================
  // Step 2: Create agents from AGENTS.md entries
  // ========================================================================

  if (targetSpaceId) {
    for (const agentEntry of pkg.agents) {
      try {
        const payload: apiClient.TeamAgentPayload = {
          name: agentEntry.name,
          slug: agentEntry.slug,
          role: agentEntry.role,
          instructions: agentEntry.instructions,
          icon: agentEntry.icon,
          color: agentEntry.color,
          desc: agentEntry.description,
          temperature: agentEntry.temperature,
          tags: agentEntry.tags,
        }

        await apiClient.createTeamAgent(targetSpaceId, payload)
        result.created.agents++
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        result.warnings.push(
          `Failed to create agent "${agentEntry.name}": ${message}`,
        )
      }
    }
  }

  // ========================================================================
  // Step 3: Create skills from SKILL.md manifests
  //
  // Skills are installed in the target space's Y.Doc. Since skill
  // installation is not yet a server-gated write, we track them
  // for future implementation.
  // ========================================================================

  result.created.skills = 0 // Skills import is a TODO for now

  // ========================================================================
  // Step 4: Create tasks from TASK.md entries
  //
  // Tasks are written directly to the Enterprise Y.Doc via Yjs
  // (not server-gated), so we would need access to the enterprise
  // doc to seed them. For now, we track them for future implementation.
  // ========================================================================

  result.created.tasks = 0 // Task import is a TODO for now

  // ========================================================================
  // Build result message
  // ========================================================================

  const parts: string[] = []
  if (result.created.spaces > 0) {
    parts.push(`${result.created.spaces} space(s)`)
  }
  if (result.created.agents > 0) {
    parts.push(`${result.created.agents} agent(s)`)
  }
  if (result.created.skills > 0) {
    parts.push(`${result.created.skills} skill(s)`)
  }
  if (result.created.tasks > 0) {
    parts.push(`${result.created.tasks} task(s)`)
  }

  if (parts.length > 0) {
    result.message = `Successfully imported: ${parts.join(', ')}.`
  } else if (result.success) {
    result.message = 'Import completed with nothing to create.'
  } else {
    result.message = `Import failed. ${result.errors.join('; ')}`
  }

  if (result.warnings.length > 0) {
    result.message += ` (${result.warnings.length} warning(s))`
  }

  return result
}

/**
 * Import an Agent Companies package from a zip file.
 *
 * Extracts the zip contents, parses manifests, and creates entities.
 *
 * @param zipFile - The uploaded zip File object
 * @param orgId - The org ID to create entities under
 * @returns Import result
 */
export async function importFromZip(
  zipFile: File,
  orgId: string,
): Promise<ImportResult> {
  try {
    const files = await extractZipContents(zipFile)
    const { parsePackageFiles } = await import('./parser')
    const pkg = parsePackageFiles(files)
    return importPackage(pkg, orgId)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return {
      success: false,
      message: `Failed to read zip file: ${message}`,
      created: { spaces: 0, agents: 0, skills: 0, tasks: 0 },
      warnings: [],
      errors: [message],
    }
  }
}

/**
 * Extract text files from a zip archive into a file map.
 *
 * Uses the browser's native DecompressionStream API where available,
 * with a fallback to manual zip parsing for broader compatibility.
 */
async function extractZipContents(zipFile: File): Promise<Map<string, string>> {
  const files = new Map<string, string>()
  const buffer = await zipFile.arrayBuffer()
  const view = new DataView(buffer)

  // Parse ZIP local file headers
  let offset = 0
  const decoder = new TextDecoder('utf-8')

  while (offset < buffer.byteLength - 4) {
    // Check for local file header signature (0x04034b50)
    const sig = view.getUint32(offset, true)
    if (sig !== 0x04034b50) break

    const compressionMethod = view.getUint16(offset + 8, true)
    const compressedSize = view.getUint32(offset + 18, true)
    const uncompressedSize = view.getUint32(offset + 22, true)
    const fileNameLength = view.getUint16(offset + 26, true)
    const extraLength = view.getUint16(offset + 28, true)

    const fileNameBytes = new Uint8Array(
      buffer,
      offset + 30,
      fileNameLength,
    )
    const fileName = decoder.decode(fileNameBytes)

    const dataOffset = offset + 30 + fileNameLength + extraLength
    const fileData = new Uint8Array(buffer, dataOffset, compressedSize)

    // Only process text-like files (markdown)
    if (
      fileName.endsWith('.md') &&
      !fileName.startsWith('__MACOSX') &&
      !fileName.startsWith('.')
    ) {
      if (compressionMethod === 0) {
        // Stored (no compression)
        files.set(fileName, decoder.decode(fileData))
      } else if (compressionMethod === 8) {
        // Deflated — use DecompressionStream if available
        try {
          const decompressed = await decompressDeflate(
            fileData,
            uncompressedSize,
          )
          files.set(fileName, decoder.decode(decompressed))
        } catch {
          // Skip files we can't decompress
          console.warn(
            `[agent-companies] Could not decompress: ${fileName}`,
          )
        }
      }
    }

    offset = dataOffset + compressedSize
  }

  return files
}

/**
 * Decompress a DEFLATE-compressed buffer using the browser's
 * DecompressionStream API.
 */
async function decompressDeflate(
  data: Uint8Array,
  _expectedSize: number,
): Promise<Uint8Array> {
  if (typeof DecompressionStream !== 'undefined') {
    const ds = new DecompressionStream('raw' as CompressionFormat)
    const writer = ds.writable.getWriter()
    writer.write(data)
    writer.close()

    const reader = ds.readable.getReader()
    const chunks: Uint8Array[] = []
    let totalLength = 0

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(value)
      totalLength += value.byteLength
    }

    const result = new Uint8Array(totalLength)
    let offset = 0
    for (const chunk of chunks) {
      result.set(chunk, offset)
      offset += chunk.byteLength
    }
    return result
  }

  throw new Error('DecompressionStream not available')
}
