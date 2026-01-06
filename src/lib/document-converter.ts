/**
 * Document Converter - Browser-compatible document conversion utilities
 *
 * Converts unsupported document formats (like .docx) to text for LLM processing.
 * Uses mammoth.js for DOCX to HTML/text conversion.
 */

import mammoth from 'mammoth'

/**
 * MIME types for Microsoft Office documents
 */
export const OFFICE_DOCUMENT_TYPES = {
  DOCX: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  DOC: 'application/msword',
  XLSX: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  XLS: 'application/vnd.ms-excel',
  PPTX: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  PPT: 'application/vnd.ms-powerpoint',
} as const

/**
 * Check if a MIME type is a Word document that can be converted
 */
export function isConvertibleWordDocument(mimeType: string): boolean {
  return (
    mimeType === OFFICE_DOCUMENT_TYPES.DOCX ||
    mimeType === OFFICE_DOCUMENT_TYPES.DOC
  )
}

/**
 * Check if a MIME type is an Office document (Word, Excel, PowerPoint)
 */
export function isOfficeDocument(mimeType: string): boolean {
  return Object.values(OFFICE_DOCUMENT_TYPES).includes(mimeType as any)
}

export interface ConversionResult {
  success: boolean
  text?: string
  html?: string
  error?: string
  warnings?: string[]
}

/**
 * Convert a Word document (DOCX) to text
 *
 * @param base64Data - Base64 encoded document data
 * @returns Promise containing the extracted text
 */
export async function convertDocxToText(
  base64Data: string,
): Promise<ConversionResult> {
  try {
    // Decode base64 to ArrayBuffer
    const binaryString = atob(base64Data)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }
    const arrayBuffer = bytes.buffer

    // Use mammoth to extract raw text
    const result = await mammoth.extractRawText({ arrayBuffer })

    // Collect any warnings
    const warnings = result.messages
      .filter((msg) => msg.type === 'warning')
      .map((msg) => msg.message)

    return {
      success: true,
      text: result.value,
      warnings: warnings.length > 0 ? warnings : undefined,
    }
  } catch (error) {
    console.error('[DOCUMENT-CONVERTER] Failed to convert DOCX:', error)
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Unknown conversion error',
    }
  }
}

/**
 * Convert a Word document (DOCX) to HTML
 *
 * @param base64Data - Base64 encoded document data
 * @returns Promise containing the extracted HTML
 */
export async function convertDocxToHtml(
  base64Data: string,
): Promise<ConversionResult> {
  try {
    // Decode base64 to ArrayBuffer
    const binaryString = atob(base64Data)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }
    const arrayBuffer = bytes.buffer

    // Use mammoth to convert to HTML
    const result = await mammoth.convertToHtml({ arrayBuffer })

    // Collect any warnings
    const warnings = result.messages
      .filter((msg) => msg.type === 'warning')
      .map((msg) => msg.message)

    return {
      success: true,
      html: result.value,
      warnings: warnings.length > 0 ? warnings : undefined,
    }
  } catch (error) {
    console.error('[DOCUMENT-CONVERTER] Failed to convert DOCX to HTML:', error)
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Unknown conversion error',
    }
  }
}

/**
 * Get a user-friendly format name for a MIME type
 */
export function getFormatName(mimeType: string): string {
  switch (mimeType) {
    case OFFICE_DOCUMENT_TYPES.DOCX:
      return 'Word Document (.docx)'
    case OFFICE_DOCUMENT_TYPES.DOC:
      return 'Word Document (.doc)'
    case OFFICE_DOCUMENT_TYPES.XLSX:
      return 'Excel Spreadsheet (.xlsx)'
    case OFFICE_DOCUMENT_TYPES.XLS:
      return 'Excel Spreadsheet (.xls)'
    case OFFICE_DOCUMENT_TYPES.PPTX:
      return 'PowerPoint Presentation (.pptx)'
    case OFFICE_DOCUMENT_TYPES.PPT:
      return 'PowerPoint Presentation (.ppt)'
    default:
      return mimeType
  }
}

/**
 * Check if a MIME type is a PDF document
 */
export function isPdf(mimeType: string): boolean {
  return mimeType === 'application/pdf'
}
