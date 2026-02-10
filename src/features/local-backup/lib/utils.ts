/**
 * YAML Frontmatter Utilities
 *
 * Parse and stringify YAML frontmatter in Markdown files
 */
import * as yaml from 'yaml'

// UTF-8 BOM for proper encoding detection in external applications (e.g., Microsoft Word)
const UTF8_BOM = '\uFEFF'

const FRONTMATTER_REGEX = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/

/**
 * Parse a Markdown file with YAML frontmatter
 * Handles files with or without UTF-8 BOM
 */
export function parseFrontmatter<T>(content: string): {
  frontmatter: T
  body: string
} | null {
  // Strip UTF-8 BOM if present
  const cleanContent = content.startsWith(UTF8_BOM) ? content.slice(1) : content

  const match = cleanContent.match(FRONTMATTER_REGEX)
  if (!match) {
    return null
  }

  try {
    const frontmatter = yaml.parse(match[1]) as T
    const body = match[2].trim()
    return { frontmatter, body }
  } catch (error) {
    console.error('Failed to parse YAML frontmatter:', error)
    return null
  }
}

/**
 * Stringify an object with body content to Markdown with YAML frontmatter
 * Includes UTF-8 BOM for proper encoding detection in external applications
 */
export function stringifyFrontmatter<T extends object>(
  frontmatter: T,
  body: string,
): string {
  const yamlContent = yaml.stringify(frontmatter, {
    indent: 2,
    lineWidth: 0, // Don't wrap long lines
    nullStr: '', // Don't output 'null' for empty values
  })

  return `${UTF8_BOM}---\n${yamlContent}---\n\n${body}`
}

/**
 * Sanitize a string to be used as a filename
 * - Replace spaces with hyphens
 * - Remove special characters
 * - Lowercase
 * - Truncate to reasonable length
 * - Ensure non-empty result
 */
export function sanitizeFilename(str: string, maxLength = 50): string {
  const sanitized = String(str ?? '')
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special chars
    .replace(/\s+/g, '-') // Spaces to hyphens
    .replace(/-+/g, '-') // Multiple hyphens to single
    .replace(/^-|-$/g, '') // Trim hyphens
    .slice(0, maxLength)

  // Ensure we never return an empty string or reserved names
  if (!sanitized || sanitized === '.' || sanitized === '..') {
    return 'unnamed'
  }

  return sanitized
}

/**
 * Coerce a value to a Date instance.
 * After Yjs migration, dates may be stored as ISO strings, timestamps, or plain objects
 * instead of proper Date instances.
 */
function toDate(value: unknown): Date {
  if (value instanceof Date) return value
  if (typeof value === 'string' || typeof value === 'number')
    return new Date(value)
  return new Date()
}

/**
 * Format a date for display in files
 */
export function formatDate(
  date: Date | string | number | undefined | null,
): string {
  if (!date) return new Date().toISOString()
  return toDate(date).toISOString()
}

/**
 * Format a date for filename (YYYY-MM-DD)
 */
export function formatDateForFilename(
  date: Date | string | number | undefined | null,
): string {
  if (!date) return new Date().toISOString().split('T')[0]
  return toDate(date).toISOString().split('T')[0]
}

/**
 * Parse a date from ISO string
 */
export function parseDate(dateStr: string): Date {
  return new Date(dateStr)
}

/**
 * Format time for display in conversation messages
 */
export function formatTime(
  date: Date | string | number,
  locale = 'en',
): string {
  const d = toDate(date)
  return d.toLocaleTimeString(locale, {
    hour: 'numeric',
    minute: '2-digit',
  })
}

/**
 * Format full datetime for display
 */
export function formatDateTime(
  date: Date | string | number,
  locale = 'en',
): string {
  const d = toDate(date)
  return d.toLocaleString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

/**
 * Generate a short hash from a string (for unique filenames)
 */
export function shortHash(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36).slice(0, 6)
}
