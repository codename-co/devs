import { getKnowledgeItemAsync, ensureReady } from '@/stores/knowledgeStore'
import { KnowledgeItem } from '@/types'
import { LLMMessageAttachment } from './llm'
import { buildSkillInstructions } from '@/lib/skills/skill-prompt'

/**
 * Citation format instructions for LLM to use when citing knowledge sources.
 * This is shared between agents with attached knowledge and agents using knowledge tools.
 */
export const CITATION_INSTRUCTIONS = `## Citation Format

When you use information from ANY of the following sources, you MUST cite them using the appropriate format:

**1. Tool Results (search_knowledge, read_document, gmail_search, etc.):**
Use numbered references [1], [2], [3], etc. in the order sources appear.

**2. Remembered Context (user memories):**
Cite as [Memory] when using information from the "Remembered Context about the User" section.

**3. Pinned Messages (important past conversations):**
Cite as [Pinned] when referencing information from the "Important Past Conversations" section.

**4. Knowledge Base Attachments:**
Cite by document name, e.g., [Project Guidelines] or [Technical Specs].

**Citation Rules:**
- Place the citation immediately after the statement that uses that source's information
- Multiple citations can be combined: [1][Memory] or [1, 2]
- Each distinct source document should have its own unique number
- Be consistent: always use the same number for the same source throughout your response

**Examples:**
- Tool results: "The project follows agile methodology [1] with weekly sprints."
- Memory: "Comme vous l'avez mentionné, vous n'aimez pas les crevettes [Memory]."
- Pinned: "Une marge de flexibilité de 70% serait très inhabituelle [Pinned]."
- Combined: "Le projet BILLOT GAZ [Memory] suit les marges standards de ± 5-10% [Pinned]."

This citation format helps users identify and verify the source of information.`

/**
 * Converts knowledge items into LLM message attachments
 */
export async function getKnowledgeAttachments(
  knowledgeItemIds?: string[],
): Promise<LLMMessageAttachment[]> {
  if (!knowledgeItemIds || knowledgeItemIds.length === 0) {
    return []
  }

  try {
    // Ensure Yjs is ready
    await ensureReady()

    // Get knowledge items
    const knowledgeItems: KnowledgeItem[] = []
    for (const id of knowledgeItemIds) {
      try {
        const item = await getKnowledgeItemAsync(id)
        if (item) {
          knowledgeItems.push(item)
        }
      } catch (error) {
        console.warn(`Failed to load knowledge item ${id}:`, error)
      }
    }

    if (knowledgeItems.length === 0) {
      return []
    }

    // Convert knowledge items to attachments
    const attachments: LLMMessageAttachment[] = []

    for (const item of knowledgeItems) {
      // For documents (especially PDFs), prefer the extracted transcript over raw binary.
      // Sending raw PDFs can fail with some providers (e.g. Google: "The document has no pages")
      // if the PDF is empty, corrupt, or has no renderable pages.
      if (item.fileType === 'document' && item.transcript) {
        // Use the processed transcript text instead of the raw document binary
        const encoder = new TextEncoder()
        const utf8Bytes = encoder.encode(item.transcript)
        const binaryString = Array.from(utf8Bytes, (byte) =>
          String.fromCharCode(byte),
        ).join('')
        const data = btoa(binaryString)

        attachments.push({
          type: 'text',
          name: item.name,
          data: data,
          mimeType: 'text/plain',
        })
        continue
      }

      if (item.content) {
        let attachmentType: 'image' | 'document' | 'text' = 'text'
        let data = item.content

        // Determine attachment type based on file type and content
        if (
          item.fileType === 'image' &&
          item.content.startsWith('data:image/')
        ) {
          attachmentType = 'image'
          // Extract base64 data without the data URL prefix
          const base64Match = item.content.match(
            /^data:image\/[^;]+;base64,(.+)$/,
          )
          if (base64Match) {
            data = base64Match[1]
          }
        } else if (item.fileType === 'document') {
          attachmentType = 'document'
          // For documents, if content doesn't start with data:, it's likely text
          if (!item.content.startsWith('data:')) {
            // Encode text content as base64
            data = btoa(item.content)
          } else {
            // Extract base64 data from data URL
            const base64Match = item.content.match(/^data:[^;]+;base64,(.+)$/)
            if (base64Match) {
              data = base64Match[1]
            }
          }

          // Validate document data: skip empty or clearly invalid PDFs
          if (
            item.mimeType === 'application/pdf' &&
            (!data || data.length < 20)
          ) {
            console.warn(
              `[AGENT-KNOWLEDGE] Skipping PDF "${item.name}" - data appears empty or invalid (${data?.length || 0} bytes)`,
            )
            continue
          }
        } else {
          // Text file
          attachmentType = 'text'
          if (!item.content.startsWith('data:')) {
            // Plain text, encode as base64
            data = btoa(item.content)
          } else {
            // Extract base64 data from data URL
            const base64Match = item.content.match(/^data:[^;]+;base64,(.+)$/)
            if (base64Match) {
              data = base64Match[1]
            }
          }
        }

        attachments.push({
          type: attachmentType,
          name: item.name,
          data: data,
          mimeType: item.mimeType || 'text/plain',
        })
      }
    }

    return attachments
  } catch (error) {
    console.error('Failed to get knowledge attachments:', error)
    return []
  }
}

/**
 * Builds enhanced instructions for an agent by adding:
 * 1. Global system instructions from user settings (if configured)
 * 2. Knowledge context reference (for backward compatibility or when attachments aren't supported)
 */
export async function buildAgentInstructions(
  baseInstructions: string,
  knowledgeItemIds?: string[],
  agentId?: string,
): Promise<string> {
  // Import userSettings lazily to avoid circular dependencies
  const { userSettings } = await import('@/stores/userStore')
  const globalSystemInstructions =
    userSettings.getState().globalSystemInstructions

  let enhancedInstructions = baseInstructions

  // Prepend global system instructions if configured
  if (globalSystemInstructions?.trim()) {
    enhancedInstructions = `## Global Instructions

${globalSystemInstructions.trim()}

---

${enhancedInstructions}`
  }

  // Append skill catalog & instructions if any skills are installed
  try {
    const skillInstructions = buildSkillInstructions(agentId)
    if (skillInstructions) {
      enhancedInstructions = `${enhancedInstructions}

${skillInstructions}`
    }
  } catch (error) {
    console.warn('Failed to build skill instructions:', error)
  }

  if (!knowledgeItemIds || knowledgeItemIds.length === 0) {
    return enhancedInstructions
  }

  try {
    // Add a simple reference to knowledge base without content
    // The actual knowledge will be passed as attachments
    enhancedInstructions = `${enhancedInstructions}

## Knowledge Base Context

You have access to ${knowledgeItemIds.length} knowledge base item(s) that have been provided as attachments to this conversation. When responding, draw upon this knowledge base context when relevant. Reference specific information from the knowledge base when it helps answer questions or provide better assistance. Always prioritize accuracy and relevance from the knowledge base over general knowledge when there are conflicts.

${CITATION_INSTRUCTIONS}`

    return enhancedInstructions
  } catch (error) {
    console.error('Failed to build enhanced instructions:', error)
    return enhancedInstructions
  }
}
