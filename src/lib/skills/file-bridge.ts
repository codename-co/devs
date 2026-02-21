/**
 * File I/O Bridge — Knowledge Items ↔ Sandbox Virtual FS
 *
 * Maps DEVS knowledge items and conversation attachments to input files
 * for the sandboxed code runner, and converts sandbox output files to
 * downloadable artifacts or inline content.
 *
 * @module lib/skills/file-bridge
 */

import type { SandboxFile } from '@/lib/sandbox'
import { getKnowledgeItemDecrypted } from '@/stores/knowledgeStore'
import type { KnowledgeItem } from '@/types'

// Re-type for backward compatibility
type SandboxInputFile = SandboxFile
type SandboxOutputFile = SandboxFile

// ============================================================================
// Types
// ============================================================================

/** Reference to a knowledge item to mount in the sandbox. */
export interface KnowledgeFileReference {
  /** Path in the virtual FS (e.g. "data.csv") */
  path: string
  /** ID of the knowledge item to mount */
  knowledgeItemId: string
}

/** Inline file content to mount in the sandbox. */
export interface InlineFileReference {
  /** Path in the virtual FS */
  path: string
  /** File content (text or base64) */
  content: string
  /** Content encoding */
  encoding?: 'text' | 'base64'
}

/** Union type for file references accepted by the bridge. */
export type FileReference = KnowledgeFileReference | InlineFileReference

/** Processed output file with inferred metadata. */
export interface ProcessedOutputFile {
  /** Original path in the virtual FS */
  path: string
  /** File content */
  content: string
  /** Content encoding */
  encoding: 'text' | 'base64'
  /** Filename extracted from path */
  filename: string
  /** Inferred MIME type */
  mimeType: string
  /** Whether this is a binary file */
  isBinary: boolean
}

// ============================================================================
// MIME type detection
// ============================================================================

const EXTENSION_TO_MIME: Record<string, string> = {
  // Text
  '.txt': 'text/plain',
  '.md': 'text/markdown',
  '.csv': 'text/csv',
  '.json': 'application/json',
  '.yaml': 'text/yaml',
  '.yml': 'text/yaml',
  '.xml': 'application/xml',
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.py': 'text/x-python',
  '.ts': 'text/typescript',
  '.log': 'text/plain',
  '.tsv': 'text/tab-separated-values',

  // Images
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.bmp': 'image/bmp',
  '.ico': 'image/x-icon',

  // Documents
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',

  // Archives
  '.zip': 'application/zip',
  '.gz': 'application/gzip',
  '.tar': 'application/x-tar',

  // Data
  '.parquet': 'application/octet-stream',
  '.sqlite': 'application/x-sqlite3',
  '.db': 'application/x-sqlite3',
}

/** Binary MIME type prefixes. */
const BINARY_MIME_PREFIXES = [
  'image/',
  'application/pdf',
  'application/zip',
  'application/gzip',
  'application/x-tar',
  'application/octet-stream',
  'application/x-sqlite3',
  'application/vnd.',
  'application/msword',
]

/**
 * Infer MIME type from a file path.
 */
export function inferMimeType(path: string): string {
  const ext = path.substring(path.lastIndexOf('.')).toLowerCase()
  return EXTENSION_TO_MIME[ext] ?? 'application/octet-stream'
}

/**
 * Check if a MIME type represents a binary file.
 */
export function isBinaryMimeType(mimeType: string): boolean {
  return BINARY_MIME_PREFIXES.some((prefix) => mimeType.startsWith(prefix))
}

// ============================================================================
// Knowledge Item → Sandbox Input
// ============================================================================

/**
 * Resolve a knowledge item to a SandboxInputFile.
 *
 * Fetches and decrypts the knowledge item content, then maps it to
 * the virtual FS format expected by the sandboxed code runner.
 *
 * @param ref - Knowledge file reference
 * @returns Resolved input file, or null if the item wasn't found
 */
export async function resolveKnowledgeFile(
  ref: KnowledgeFileReference,
): Promise<SandboxInputFile | null> {
  const item = await getKnowledgeItemDecrypted(ref.knowledgeItemId)
  if (!item || !item.content) return null

  const mimeType = item.mimeType ?? inferMimeType(ref.path)
  const isBinary = isBinaryMimeType(mimeType)

  return {
    path: ref.path,
    content: item.content,
    encoding: isBinary ? 'base64' : 'text',
  }
}

/**
 * Resolve an array of file references to SandboxInputFiles.
 *
 * Handles both knowledge item references and inline content.
 * Knowledge items are fetched and decrypted in parallel.
 *
 * @param refs - Array of file references
 * @returns Resolved input files (items that couldn't be resolved are excluded)
 */
export async function resolveInputFiles(
  refs: FileReference[],
): Promise<SandboxInputFile[]> {
  const results = await Promise.all(
    refs.map(async (ref) => {
      if ('knowledgeItemId' in ref) {
        return resolveKnowledgeFile(ref)
      }
      // Inline reference — pass through directly
      return {
        path: ref.path,
        content: ref.content,
        encoding: ref.encoding ?? 'text',
      } as SandboxInputFile
    }),
  )

  return results.filter((r): r is SandboxInputFile => r !== null)
}

// ============================================================================
// Sandbox Output → Processed Files
// ============================================================================

/**
 * Process raw sandbox output files into a richer format with
 * inferred metadata.
 *
 * @param outputFiles - Raw output files from the sandbox
 * @returns Processed output files with metadata
 */
export function processOutputFiles(
  outputFiles: SandboxOutputFile[],
): ProcessedOutputFile[] {
  return outputFiles.map((file) => {
    const filename = file.path.split('/').pop() ?? file.path
    const mimeType = inferMimeType(file.path)
    const isBinary = file.encoding === 'base64' || isBinaryMimeType(mimeType)

    return {
      path: file.path,
      content: file.content,
      encoding: file.encoding ?? 'text',
      filename,
      mimeType,
      isBinary,
    }
  })
}

/**
 * Format sandbox output files for display in an LLM response.
 *
 * Text files are included inline. Binary files are summarized
 * with metadata (size, type).
 *
 * @param outputFiles - Processed output files
 * @returns Formatted string for the LLM
 */
export function formatOutputForLLM(
  outputFiles: ProcessedOutputFile[],
): string {
  if (outputFiles.length === 0) return ''

  const parts: string[] = ['\n## Output Files\n']

  for (const file of outputFiles) {
    if (file.isBinary) {
      const sizeEstimate = file.encoding === 'base64'
        ? Math.round((file.content.length * 3) / 4)
        : file.content.length
      const sizeStr = formatFileSize(sizeEstimate)
      parts.push(
        `- **${file.filename}** (${file.mimeType}, ${sizeStr}) — binary file saved to \`${file.path}\``,
      )
    } else {
      // Inline text content (truncate very large files)
      const maxInlineLength = 10_000
      const truncated = file.content.length > maxInlineLength
      const content = truncated
        ? file.content.slice(0, maxInlineLength) + `\n... (truncated, ${formatFileSize(file.content.length)} total)`
        : file.content

      parts.push(`### ${file.filename}\n\`\`\`\n${content}\n\`\`\`\n`)
    }
  }

  return parts.join('\n')
}

/**
 * Create a knowledge-compatible item from a sandbox output for persistence.
 */
export function outputFileToKnowledgeData(
  file: ProcessedOutputFile,
): Partial<KnowledgeItem> {
  return {
    name: file.filename,
    type: 'file',
    fileType: file.isBinary ? 'document' : 'text',
    content: file.content,
    mimeType: file.mimeType,
    size: file.encoding === 'base64'
      ? Math.round((file.content.length * 3) / 4)
      : file.content.length,
    path: `/skill-outputs/${file.filename}`,
  }
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Format a byte count to a human-readable size string.
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
