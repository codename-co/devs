/**
 * Conversation Serializer
 *
 * Serialize/deserialize Conversation entities to Markdown with YAML frontmatter
 *
 * Format produces beautiful, readable chat transcripts:
 * ```
 * ---
 * id: conv-abc123
 * agentId: einstein
 * title: Quantum Physics Discussion
 * ...
 * ---
 *
 * ## 👤 User — 2:30 PM
 *
 * Can you explain quantum entanglement?
 *
 * ---
 *
 * ## 🤖 Einstein — 2:31 PM
 *
 * Ah, what Einstein famously called "spooky action at a distance"...
 * ```
 */
import type { Conversation, Message } from '@/types'
import type {
  ConversationFrontmatter,
  FileMetadata,
  SerializedFile,
  SerializeContext,
  Serializer,
} from './types'
import {
  parseFrontmatter,
  stringifyFrontmatter,
  sanitizeFilename,
  formatDate,
  formatDateForFilename,
  formatTime,
  parseDate,
  shortHash,
} from '../utils'

const DIRECTORY = 'conversations'
const EXTENSION = '.chat.md'

// Emoji indicators for message roles
const ROLE_EMOJI: Record<string, string> = {
  user: '👤',
  assistant: '🤖',
  system: '⚙️',
}

/**
 * Serialize a Conversation to Markdown with YAML frontmatter
 */
function serialize(
  conversation: Conversation,
  context?: SerializeContext,
): SerializedFile {
  // Resolve agent slug for frontmatter
  const agentSlug = context?.getAgentSlug?.(conversation.agentId)

  const frontmatter: ConversationFrontmatter = {
    id: conversation.id,
    agentId: conversation.agentId,
    ...(agentSlug && { agentSlug }),
    participatingAgents: conversation.participatingAgents,
    workflowId: conversation.workflowId,
    ...(conversation.title && { title: conversation.title }),
    ...(conversation.isPinned && { isPinned: conversation.isPinned }),
    ...(conversation.summary && { summary: conversation.summary }),
    createdAt: formatDate(conversation.timestamp),
    updatedAt: formatDate(conversation.updatedAt),
  }

  // Build body with messages
  const messageBlocks = conversation.messages.map((msg) => {
    const emoji = ROLE_EMOJI[msg.role] || '💬'
    const time = formatTime(msg.timestamp)
    const roleName = msg.role === 'user' ? 'User' : msg.agentId || 'Assistant'
    const pinned = msg.isPinned ? ' 📌' : ''

    let block = `## ${emoji} ${roleName} — ${time}${pinned}\n\n${msg.content}`

    // Add attachments info if present
    if (msg.attachments?.length) {
      block += `\n\n<details>\n<summary>📎 ${msg.attachments.length} attachment(s)</summary>\n\n`
      for (const att of msg.attachments) {
        block += `- **${att.name}** (${att.mimeType}, ${att.size ? formatBytes(att.size) : 'unknown size'})\n`
      }
      block += `\n</details>`
    }

    return block
  })

  const body = messageBlocks.join('\n\n---\n\n')
  const content = stringifyFrontmatter(frontmatter, body)

  return {
    filename: getFilename(conversation),
    content,
    directory: DIRECTORY,
  }
}

/**
 * Format bytes to human readable string
 */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * Deserialize Markdown with YAML frontmatter to a Conversation
 * If file metadata is provided and frontmatter lacks timestamps, use file metadata
 */
function deserialize(
  content: string,
  filename: string,
  fileMetadata?: FileMetadata,
  _binaryContent?: string,
): Conversation | null {
  const parsed = parseFrontmatter<ConversationFrontmatter>(content)
  if (!parsed) {
    console.warn(`Failed to parse conversation file: ${filename}`)
    return null
  }

  const { frontmatter, body } = parsed

  // Use file metadata as fallback for timestamps
  const createdAt = frontmatter.createdAt
    ? parseDate(frontmatter.createdAt)
    : (fileMetadata?.lastModified ?? new Date())
  const updatedAt = frontmatter.updatedAt
    ? parseDate(frontmatter.updatedAt)
    : (fileMetadata?.lastModified ?? new Date())

  // Parse messages from body
  const messages: Message[] = []
  const messageRegex =
    /## (👤|🤖|⚙️|💬) (.+?) — (\d{1,2}:\d{2}(?: [AP]M)?)(?: 📌)?\n\n([\s\S]*?)(?=\n\n---\n\n## |$)/g
  let match

  while ((match = messageRegex.exec(body)) !== null) {
    const emoji = match[1]
    const roleName = match[2]
    const timeStr = match[3]
    const messageContent = match[4].trim()

    // Determine role from emoji
    let role: 'user' | 'assistant' | 'system' = 'assistant'
    if (emoji === '👤') role = 'user'
    else if (emoji === '⚙️') role = 'system'

    // Extract content without attachments details
    let cleanContent = messageContent
    const detailsMatch = messageContent.match(/<details>[\s\S]*<\/details>/)
    if (detailsMatch) {
      cleanContent = messageContent.replace(detailsMatch[0], '').trim()
    }

    // Check if pinned
    const isPinned = body.includes(`${roleName} — ${timeStr} 📌`)

    // Create timestamp - use conversation date with parsed time
    const baseDate = new Date(createdAt)
    const timeParts = timeStr.match(/(\d{1,2}):(\d{2})(?: ([AP]M))?/)
    if (timeParts) {
      let hours = parseInt(timeParts[1])
      const minutes = parseInt(timeParts[2])
      const meridiem = timeParts[3]
      if (meridiem === 'PM' && hours < 12) hours += 12
      if (meridiem === 'AM' && hours === 12) hours = 0
      baseDate.setHours(hours, minutes, 0, 0)
    }

    const message: Message = {
      id: `msg-${shortHash(cleanContent + timeStr)}`,
      role,
      content: cleanContent,
      timestamp: baseDate,
      ...(role === 'assistant' &&
        roleName !== 'Assistant' && { agentId: roleName.toLowerCase() }),
      ...(isPinned && { isPinned: true }),
    }

    messages.push(message)
  }

  const conversation: Conversation = {
    id: frontmatter.id,
    agentId: frontmatter.agentId,
    participatingAgents: frontmatter.participatingAgents || [
      frontmatter.agentId,
    ],
    workflowId: frontmatter.workflowId,
    timestamp: createdAt,
    updatedAt,
    messages,
    ...(frontmatter.title && { title: frontmatter.title }),
    ...(frontmatter.isPinned && { isPinned: frontmatter.isPinned }),
    ...(frontmatter.summary && { summary: frontmatter.summary }),
  }

  return conversation
}

function getFilename(conversation: Conversation): string {
  const dateStr = formatDateForFilename(conversation.timestamp)
  const titleSlug =
    typeof conversation.title === 'string' && conversation.title
      ? sanitizeFilename(conversation.title, 40)
      : shortHash(conversation.id)
  return `${dateStr}_${titleSlug}${EXTENSION}`
}

function getExtension(): string {
  return EXTENSION
}

function getDirectory(): string {
  return DIRECTORY
}

export const conversationSerializer: Serializer<Conversation> = {
  serialize,
  deserialize,
  getFilename,
  getExtension,
  getDirectory,
}
