/**
 * Shared attachment processing utilities for LLM providers
 *
 * Provides common functionality for handling document attachments
 * across different LLM provider implementations.
 */

import {
  isConvertibleWordDocument,
  convertDocxToText,
  getFormatName,
  isOfficeDocument,
} from '@/lib/document-converter'
import type { LLMMessageAttachment, LLMMessage } from './index'

export interface ProcessedAttachment {
  type: 'image' | 'document' | 'text'
  name: string
  mimeType: string
  data: string // base64 for binary, plain text for converted content
  isConverted?: boolean // true if document was converted to text
  conversionWarnings?: string[]
}

/**
 * OpenAI-compatible message format with multimodal content
 */
export interface OpenAICompatibleMessage {
  role: string
  content: string | OpenAIContentPart[]
}

export type OpenAIContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } }

/**
 * Encode a Unicode string to base64 (handles non-Latin1 characters)
 */
function encodeUnicodeToBase64(str: string): string {
  // Convert string to UTF-8 bytes, then to base64
  const utf8Bytes = new TextEncoder().encode(str)
  const binaryString = Array.from(utf8Bytes, (byte) =>
    String.fromCharCode(byte),
  ).join('')
  return btoa(binaryString)
}

/**
 * Process a document attachment, converting Word documents to text if needed
 */
export async function processDocumentAttachment(
  attachment: LLMMessageAttachment,
): Promise<ProcessedAttachment> {
  // Check if it's a Word document that can be converted
  if (isConvertibleWordDocument(attachment.mimeType)) {
    console.log(
      `[ATTACHMENT-PROCESSOR] Converting ${attachment.name} (${attachment.mimeType}) to text…`,
    )

    const result = await convertDocxToText(attachment.data)

    if (result.success && result.text) {
      return {
        type: 'text', // Changed from 'document' to 'text' since we converted it
        name: attachment.name,
        mimeType: 'text/plain',
        data: encodeUnicodeToBase64(result.text), // Encode as base64 (Unicode-safe)
        isConverted: true,
        conversionWarnings: result.warnings,
      }
    } else {
      // Conversion failed - return as-is with warning
      console.warn(
        `[ATTACHMENT-PROCESSOR] Failed to convert ${attachment.name}:`,
        result.error,
      )
      return {
        ...attachment,
        conversionWarnings: [result.error || 'Unknown conversion error'],
      }
    }
  }

  // Not a convertible document, return as-is
  return attachment
}

/**
 * Process all attachments in a message, converting documents as needed
 */
export async function processAttachments(
  attachments: LLMMessageAttachment[],
): Promise<ProcessedAttachment[]> {
  return Promise.all(
    attachments.map((attachment) => {
      if (attachment.type === 'document') {
        return processDocumentAttachment(attachment)
      }
      return Promise.resolve(attachment)
    }),
  )
}

/**
 * Decode a base64 string to Unicode text (handles UTF-8)
 */
function decodeBase64ToUnicode(base64: string): string {
  const binaryString = atob(base64)
  const bytes = Uint8Array.from(binaryString, (char) => char.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

/**
 * Format a text attachment as inline content for LLM messages
 */
export function formatTextAttachmentContent(
  attachment: ProcessedAttachment,
): string {
  try {
    const content = decodeBase64ToUnicode(attachment.data)
    const label = attachment.isConverted
      ? `Document: ${attachment.name} (converted from ${getFormatName(attachment.mimeType)})`
      : `File: ${attachment.name}`
    return `\n\n--- ${label} ---\n${content}\n--- End of ${attachment.name} ---\n\n`
  } catch {
    return `\n\n[File: ${attachment.name} - could not decode]\n\n`
  }
}

/**
 * Get a warning message for unsupported document types
 */
export function getUnsupportedDocumentMessage(
  attachment: LLMMessageAttachment,
): string {
  if (isOfficeDocument(attachment.mimeType)) {
    return `\n\n[Document: ${attachment.name} (${getFormatName(attachment.mimeType)}) - This format is not yet supported for automatic conversion. Please convert to PDF or copy-paste the text content.]\n\n`
  }
  return `\n\n[Document: ${attachment.name} (${attachment.mimeType}) - This document format is not supported. Please convert to PDF or copy-paste the text content.]\n\n`
}

/**
 * Convert a message to OpenAI-compatible format with attachment handling.
 * This is the standard format used by OpenAI, OpenRouter, and many other providers.
 *
 * - Images are sent as multimodal content parts
 * - Text attachments (including converted Word docs) are inlined
 * - Unsupported documents get a placeholder message
 */
export async function convertMessageToOpenAIFormat(
  message: LLMMessage,
): Promise<OpenAICompatibleMessage> {
  if (!message.attachments || message.attachments.length === 0) {
    return {
      role: message.role,
      content: message.content,
    }
  }

  // Process attachments (converts Word docs to text)
  const processedAttachments = await processAttachments(message.attachments)

  const hasImages = processedAttachments.some((a) => a.type === 'image')

  if (hasImages) {
    // Use content array for multimodal
    const content: OpenAIContentPart[] = []

    for (const attachment of processedAttachments) {
      if (attachment.type === 'image') {
        content.push({
          type: 'image_url',
          image_url: {
            url: `data:${attachment.mimeType};base64,${attachment.data}`,
          },
        })
      } else if (attachment.type === 'text') {
        content.push({
          type: 'text',
          text: formatTextAttachmentContent(attachment),
        })
      } else if (attachment.type === 'document') {
        content.push({
          type: 'text',
          text: getUnsupportedDocumentMessage(attachment),
        })
      }
    }

    if (message.content.trim()) {
      content.push({ type: 'text', text: message.content })
    }

    return { role: message.role, content }
  } else {
    // Text-only: flatten to string
    let textContent = ''

    for (const attachment of processedAttachments) {
      if (attachment.type === 'text') {
        textContent += formatTextAttachmentContent(attachment)
      } else if (attachment.type === 'document') {
        textContent += getUnsupportedDocumentMessage(attachment)
      }
    }

    textContent += message.content

    return { role: message.role, content: textContent.trim() }
  }
}

/**
 * Convert a message to text-only format.
 * Used for providers that don't support multimodal (images, etc.)
 *
 * - All attachments are converted to text or placeholder messages
 * - Images get a placeholder [Image: filename] message
 */
export async function convertMessageToTextOnlyFormat(
  message: LLMMessage,
): Promise<{ role: string; content: string }> {
  if (!message.attachments || message.attachments.length === 0) {
    return {
      role: message.role,
      content: message.content,
    }
  }

  // Process attachments (converts Word docs to text)
  const processedAttachments = await processAttachments(message.attachments)

  let textContent = ''

  for (const attachment of processedAttachments) {
    if (attachment.type === 'text') {
      textContent += formatTextAttachmentContent(attachment)
    } else if (attachment.type === 'image') {
      textContent += `[Image: ${attachment.name}]\n\n`
    } else if (attachment.type === 'document') {
      textContent += getUnsupportedDocumentMessage(attachment)
    }
  }

  textContent += message.content

  return { role: message.role, content: textContent.trim() }
}

/**
 * Convert multiple messages to OpenAI-compatible format
 */
export async function convertMessagesToOpenAIFormat(
  messages: LLMMessage[],
): Promise<OpenAICompatibleMessage[]> {
  return Promise.all(messages.map(convertMessageToOpenAIFormat))
}

/**
 * Convert multiple messages to text-only format
 */
export async function convertMessagesToTextOnlyFormat(
  messages: LLMMessage[],
): Promise<{ role: string; content: string }[]> {
  return Promise.all(messages.map(convertMessageToTextOnlyFormat))
}
