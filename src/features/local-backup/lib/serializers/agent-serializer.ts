/**
 * Agent Serializer
 *
 * Serialize/deserialize Agent entities to Markdown with YAML frontmatter
 */
import type { Agent, Example } from '@/types'
import type { AgentFrontmatter, FileMetadata, SerializedFile, Serializer } from './types'
import {
  parseFrontmatter,
  stringifyFrontmatter,
  sanitizeFilename,
  formatDate,
  parseDate,
} from '../utils'

const DIRECTORY = 'agents'
const EXTENSION = '.agent.md'

/**
 * Serialize an Agent to Markdown with YAML frontmatter
 *
 * Format:
 * ```
 * ---
 * id: einstein
 * name: Albert Einstein
 * icon: LightBulbOn
 * ...
 * ---
 *
 * You are Albert Einstein...
 *
 * ## Examples
 *
 * ### Quick question
 * > What's the weather today?
 * ```
 */
function serialize(agent: Agent): SerializedFile {
  const frontmatter: AgentFrontmatter = {
    id: agent.id,
    name: agent.name,
    ...(agent.icon && { icon: agent.icon }),
    ...(agent.desc && { desc: agent.desc }),
    role: agent.role,
    ...(agent.temperature !== undefined && { temperature: agent.temperature }),
    ...(agent.tags?.length && { tags: agent.tags }),
    ...(agent.knowledgeItemIds?.length && {
      knowledgeItemIds: agent.knowledgeItemIds,
    }),
    createdAt: formatDate(agent.createdAt),
    ...(agent.updatedAt && { updatedAt: formatDate(agent.updatedAt) }),
    ...(agent.version && { version: agent.version }),
    ...(agent.deletedAt && { deletedAt: formatDate(agent.deletedAt) }),
    ...(agent.i18n && Object.keys(agent.i18n).length > 0 && { i18n: agent.i18n }),
  }

  // Build body content
  let body = agent.instructions || ''

  // Add examples section if present
  if (agent.examples?.length) {
    body += '\n\n## Examples\n'
    for (const example of agent.examples) {
      body += `\n### ${example.title || example.id}\n`
      body += `> ${example.prompt.replace(/\n/g, '\n> ')}\n`
    }
  }

  const content = stringifyFrontmatter(frontmatter, body)

  return {
    filename: getFilename(agent),
    content,
    directory: DIRECTORY,
  }
}

/**
 * Deserialize Markdown with YAML frontmatter to an Agent
 * If file metadata is provided and frontmatter lacks timestamps, use file metadata
 */
function deserialize(content: string, filename: string, fileMetadata?: FileMetadata): Agent | null {
  const parsed = parseFrontmatter<AgentFrontmatter>(content)
  if (!parsed) {
    console.warn(`Failed to parse agent file: ${filename}`)
    return null
  }

  const { frontmatter, body } = parsed

  // Use file metadata as fallback for timestamps
  const createdAt = frontmatter.createdAt
    ? parseDate(frontmatter.createdAt)
    : fileMetadata?.lastModified ?? new Date()
  const updatedAt = frontmatter.updatedAt
    ? parseDate(frontmatter.updatedAt)
    : fileMetadata?.lastModified ?? new Date()

  // Parse examples from body
  const examples: Example[] = []
  const exampleRegex = /### (.+?)\n> ([\s\S]*?)(?=\n### |\n## |$)/g
  let match

  while ((match = exampleRegex.exec(body)) !== null) {
    const title = match[1].trim()
    const prompt = match[2].replace(/\n> /g, '\n').trim()
    examples.push({
      id: sanitizeFilename(title),
      title,
      prompt,
    })
  }

  // Extract instructions (everything before ## Examples)
  let instructions = body
  const examplesIndex = body.indexOf('## Examples')
  if (examplesIndex !== -1) {
    instructions = body.slice(0, examplesIndex).trim()
  }

  const agent: Agent = {
    id: frontmatter.id,
    name: frontmatter.name,
    ...(frontmatter.icon && { icon: frontmatter.icon as Agent['icon'] }),
    ...(frontmatter.desc && { desc: frontmatter.desc }),
    role: frontmatter.role,
    instructions,
    ...(frontmatter.temperature !== undefined && {
      temperature: frontmatter.temperature,
    }),
    ...(frontmatter.tags && { tags: frontmatter.tags }),
    ...(frontmatter.knowledgeItemIds && {
      knowledgeItemIds: frontmatter.knowledgeItemIds,
    }),
    createdAt,
    updatedAt,
    ...(frontmatter.version && { version: frontmatter.version }),
    ...(frontmatter.deletedAt && {
      deletedAt: parseDate(frontmatter.deletedAt),
    }),
    ...(frontmatter.i18n && { i18n: frontmatter.i18n as Agent['i18n'] }),
    ...(examples.length > 0 && { examples }),
  }

  return agent
}

function getFilename(agent: Agent): string {
  // Use agent ID as filename, sanitized
  const safeName = sanitizeFilename(agent.id || agent.name)
  return `${safeName}${EXTENSION}`
}

function getExtension(): string {
  return EXTENSION
}

function getDirectory(): string {
  return DIRECTORY
}

export const agentSerializer: Serializer<Agent> = {
  serialize,
  deserialize,
  getFilename,
  getExtension,
  getDirectory,
}
