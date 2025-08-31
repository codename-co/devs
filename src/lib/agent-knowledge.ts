import { db } from './db'
import { KnowledgeItem } from '@/types'
import { LLMMessageAttachment } from './llm'

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
    // Ensure database is initialized
    if (!db.isInitialized()) {
      await db.init()
    }

    // Get knowledge items
    const knowledgeItems: KnowledgeItem[] = []
    for (const id of knowledgeItemIds) {
      try {
        const item = await db.get('knowledgeItems', id)
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
 * Builds enhanced instructions for an agent by adding knowledge context reference
 * (for backward compatibility or when attachments aren't supported)
 */
export async function buildAgentInstructions(
  baseInstructions: string,
  knowledgeItemIds?: string[],
): Promise<string> {
  if (!knowledgeItemIds || knowledgeItemIds.length === 0) {
    return baseInstructions
  }

  try {
    // Add a simple reference to knowledge base without content
    // The actual knowledge will be passed as attachments
    const enhancedInstructions = `${baseInstructions}

## Knowledge Base Context

You have access to ${knowledgeItemIds.length} knowledge base item(s) that have been provided as attachments to this conversation. When responding, draw upon this knowledge base context when relevant. Reference specific information from the knowledge base when it helps answer questions or provide better assistance. Always prioritize accuracy and relevance from the knowledge base over general knowledge when there are conflicts.`

    return enhancedInstructions
  } catch (error) {
    console.error('Failed to build enhanced instructions:', error)
    return baseInstructions
  }
}
