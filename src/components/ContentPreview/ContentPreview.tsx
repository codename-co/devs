import { useState, useMemo } from 'react'
import {
  Button,
  Chip,
  ScrollShadow,
  Tabs,
  Tab,
  Tooltip,
  Divider,
  Link,
} from '@heroui/react'
import clsx from 'clsx'

import { useI18n } from '@/i18n'
import { Icon } from '@/components/Icon'
import { MarkdownRenderer } from '@/components/MarkdownRenderer'
import { formatBytes } from '@/lib/format'
import type { KnowledgeItem, Artifact } from '@/types'
import localI18n from './i18n'

// =============================================================================
// Types
// =============================================================================

export type PreviewMode = 'compact' | 'full'
export type ContentType = 'knowledge' | 'artifact'

interface BasePreviewProps {
  mode?: PreviewMode
  className?: string
}

interface KnowledgePreviewProps extends BasePreviewProps {
  type: 'knowledge'
  item: KnowledgeItem
}

interface ArtifactPreviewProps extends BasePreviewProps {
  type: 'artifact'
  item: Artifact
}

export type ContentPreviewProps = KnowledgePreviewProps | ArtifactPreviewProps

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Detect if content is an image based on mimeType
 */
const isImageContent = (mimeType?: string): boolean => {
  return mimeType?.startsWith('image/') ?? false
}

/**
 * Detect if content is a video based on mimeType
 */
const isVideoContent = (mimeType?: string): boolean => {
  return mimeType?.startsWith('video/') ?? false
}

/**
 * Detect if content is audio based on mimeType
 */
const isAudioContent = (mimeType?: string): boolean => {
  return mimeType?.startsWith('audio/') ?? false
}

/**
 * Detect if content is a PDF
 */
const isPDFContent = (mimeType?: string): boolean => {
  return mimeType === 'application/pdf'
}

/**
 * Detect if content is HTML
 */
const isHTMLContent = (mimeType?: string): boolean => {
  return mimeType === 'text/html' || mimeType === 'application/xhtml+xml'
}

/**
 * Detect if content is an EML (email) file
 */
const isEMLContent = (mimeType?: string): boolean => {
  return mimeType === 'message/rfc822'
}

/**
 * Detect if content is a document that might have extracted text
 */
const isExtractableDocument = (mimeType?: string): boolean => {
  const extractableTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.google-apps.document',
    'application/vnd.google-apps.spreadsheet',
    'application/vnd.google-apps.presentation',
  ]
  return mimeType ? extractableTypes.includes(mimeType) : false
}

/**
 * Get file type icon name
 */
const getFileTypeIcon = (
  item: KnowledgeItem | Artifact,
  contentType: ContentType,
) => {
  if (contentType === 'artifact') {
    const artifact = item as Artifact
    switch (artifact.type) {
      case 'document':
        return 'Document'
      case 'code':
        return 'Code'
      case 'design':
        return 'Palette'
      case 'analysis':
        return 'BarChart'
      case 'plan':
        return 'Task'
      case 'report':
        return 'Document'
      default:
        return 'PagePlus'
    }
  }

  const knowledgeItem = item as KnowledgeItem
  if (knowledgeItem.type === 'folder') {
    return 'Folder'
  }

  switch (knowledgeItem.fileType) {
    case 'image':
      return 'MediaImage'
    case 'document':
      return 'Page'
    case 'text':
      return 'Page'
    default:
      return 'Page'
  }
}

/**
 * Get color for file type chip
 */
const getFileTypeColor = (
  item: KnowledgeItem | Artifact,
  contentType: ContentType,
) => {
  if (contentType === 'artifact') {
    const artifact = item as Artifact
    switch (artifact.type) {
      case 'document':
        return 'primary'
      case 'code':
        return 'secondary'
      case 'design':
        return 'success'
      case 'analysis':
        return 'warning'
      case 'plan':
        return 'danger'
      case 'report':
        return 'default'
      default:
        return 'default'
    }
  }

  const knowledgeItem = item as KnowledgeItem
  switch (knowledgeItem.fileType) {
    case 'image':
      return 'success'
    case 'document':
      return 'secondary'
    case 'text':
      return 'primary'
    default:
      return 'default'
  }
}

/**
 * Get sync source display info
 */
const getSyncSourceInfo = (item: KnowledgeItem) => {
  switch (item.syncSource) {
    case 'manual':
      return { label: 'Manual Upload', icon: 'Upload' }
    case 'filesystem_api':
      return { label: 'Synced Folder', icon: 'Folder' }
    case 'connector':
      return { label: 'Connector', icon: 'Puzzle' }
    default:
      return { label: 'Unknown', icon: 'QuestionMark' }
  }
}

// =============================================================================
// Sub-components
// =============================================================================

/**
 * Image preview component with zoom capability
 */
const ImagePreview = ({
  content,
  mimeType,
  name,
}: {
  content: string
  mimeType: string
  name: string
}) => {
  const [isZoomed, setIsZoomed] = useState(false)

  // Build data URL for image display
  const imageUrl = useMemo(() => {
    if (content.startsWith('data:') || content.startsWith('blob:')) {
      return content
    }
    return `data:${mimeType};base64,${content}`
  }, [content, mimeType])

  return (
    <div className="relative group">
      <img
        src={imageUrl}
        alt={name}
        className={clsx(
          'max-w-full rounded-lg transition-transform cursor-pointer',
          isZoomed ? 'scale-150 z-10' : 'hover:scale-105',
        )}
        onClick={() => setIsZoomed(!isZoomed)}
      />
      {!isZoomed && (
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded-lg flex items-center justify-center">
          <Icon
            name="Expand"
            className="w-8 h-8 text-white opacity-0 group-hover:opacity-80 transition-opacity"
          />
        </div>
      )}
    </div>
  )
}

/**
 * Video preview component
 */
const VideoPreview = ({
  content,
  mimeType,
}: {
  content: string
  mimeType: string
}) => {
  const videoUrl = useMemo(() => {
    if (content.startsWith('data:') || content.startsWith('blob:')) {
      return content
    }
    return `data:${mimeType};base64,${content}`
  }, [content, mimeType])

  return (
    <video controls className="max-w-full rounded-lg" preload="metadata">
      <source src={videoUrl} type={mimeType} />
      Your browser does not support video playback.
    </video>
  )
}

/**
 * Audio preview component
 */
const AudioPreview = ({
  content,
  mimeType,
}: {
  content: string
  mimeType: string
}) => {
  const audioUrl = useMemo(() => {
    if (content.startsWith('data:') || content.startsWith('blob:')) {
      return content
    }
    return `data:${mimeType};base64,${content}`
  }, [content, mimeType])

  return (
    <audio controls className="w-full" preload="metadata">
      <source src={audioUrl} type={mimeType} />
      Your browser does not support audio playback.
    </audio>
  )
}

/**
 * PDF preview component (uses browser's built-in PDF viewer)
 */
const PDFPreview = ({ content, name }: { content: string; name: string }) => {
  const pdfUrl = useMemo(() => {
    if (content.startsWith('data:') || content.startsWith('blob:')) {
      return content
    }
    return `data:application/pdf;base64,${content}`
  }, [content])

  return (
    <div className="w-full h-[70vh] rounded-lg overflow-hidden border border-default-200">
      <iframe
        src={pdfUrl}
        title={name}
        className="w-full h-full"
        frameBorder="0"
      />
    </div>
  )
}

/**
 * HTML preview component (sandboxed iframe for security)
 */
const HTMLPreview = ({ content, name }: { content: string; name: string }) => {
  const htmlContent = useMemo(() => {
    // Decode base64 if needed
    if (!content.startsWith('<') && !content.startsWith('<!')) {
      try {
        return atob(content)
      } catch {
        return content
      }
    }
    return content
  }, [content])

  const srcDoc = useMemo(() => {
    // Wrap content in a basic HTML structure if it's a fragment
    if (!htmlContent.toLowerCase().includes('<html')) {
      return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; padding: 16px; margin: 0; }
    img { max-width: 100%; height: auto; }
  </style>
</head>
<body>${htmlContent}</body>
</html>`
    }
    return htmlContent
  }, [htmlContent])

  return (
    <div className="w-full h-[70vh] rounded-lg overflow-hidden border border-default-200 bg-white">
      <iframe
        srcDoc={srcDoc}
        title={name}
        className="w-full h-full"
        sandbox="allow-same-origin"
        referrerPolicy="no-referrer"
      />
    </div>
  )
}

/**
 * Parse RFC 822 email headers from raw content
 */
const parseEMLHeaders = (rawContent: string): Record<string, string> => {
  const headers: Record<string, string> = {}
  const headerSection = rawContent.split(/\r?\n\r?\n/)[0] || ''
  const lines = headerSection.split(/\r?\n/)

  let currentHeader = ''
  let currentValue = ''

  for (const line of lines) {
    // Continuation line (starts with whitespace)
    if (/^[ \t]/.test(line) && currentHeader) {
      currentValue += ' ' + line.trim()
    } else {
      // Save previous header
      if (currentHeader) {
        headers[currentHeader.toLowerCase()] = currentValue
      }
      // Parse new header
      const match = line.match(/^([^:]+):\s*(.*)$/)
      if (match) {
        currentHeader = match[1]
        currentValue = match[2]
      }
    }
  }

  // Save last header
  if (currentHeader) {
    headers[currentHeader.toLowerCase()] = currentValue
  }

  return headers
}

/**
 * Decode quoted-printable or base64 encoded content
 */
const decodeEmailContent = (content: string, encoding?: string): string => {
  if (!encoding) return content

  const lowerEncoding = encoding.toLowerCase()

  if (lowerEncoding === 'quoted-printable') {
    return content
      .replace(/=([0-9A-Fa-f]{2})/g, (_, hex) =>
        String.fromCharCode(parseInt(hex, 16)),
      )
      .replace(/=\r?\n/g, '')
  }

  if (lowerEncoding === 'base64') {
    try {
      return atob(content.replace(/\s/g, ''))
    } catch {
      return content
    }
  }

  return content
}

/**
 * Extract email body from raw RFC 822 content
 */
const extractEMLBody = (rawContent: string): { text: string; html: string } => {
  const parts = rawContent.split(/\r?\n\r?\n/)
  const bodyContent = parts.slice(1).join('\n\n')

  const headers = parseEMLHeaders(rawContent)
  const contentType = headers['content-type'] || 'text/plain'
  const contentEncoding = headers['content-transfer-encoding']

  // Handle multipart messages
  const boundaryMatch = contentType.match(/boundary=["']?([^"';\s]+)["']?/i)
  if (boundaryMatch) {
    const boundary = boundaryMatch[1]
    const partSeparator = '--' + boundary
    const bodyParts = bodyContent.split(partSeparator)

    let textPart = ''
    let htmlPart = ''

    for (const part of bodyParts) {
      if (part.trim() === '' || part.trim() === '--') continue

      const partParts = part.split(/\r?\n\r?\n/)
      const partHeaders = partParts[0] || ''
      const partBody = partParts.slice(1).join('\n\n')

      const partContentType =
        partHeaders.match(/content-type:\s*([^;\r\n]+)/i)?.[1]?.toLowerCase() ||
        ''
      const partEncoding =
        partHeaders.match(/content-transfer-encoding:\s*([^\r\n]+)/i)?.[1] || ''

      const decodedBody = decodeEmailContent(partBody.trim(), partEncoding)

      if (partContentType.includes('text/html')) {
        htmlPart = decodedBody
      } else if (partContentType.includes('text/plain')) {
        textPart = decodedBody
      }
    }

    return { text: textPart, html: htmlPart }
  }

  // Single-part message
  const decodedBody = decodeEmailContent(bodyContent, contentEncoding)

  if (contentType.includes('text/html')) {
    return { text: '', html: decodedBody }
  }

  return { text: decodedBody, html: '' }
}

/**
 * Decode MIME encoded words (e.g., =?UTF-8?B?...?= or =?UTF-8?Q?...?=)
 */
const decodeMimeWords = (text: string): string => {
  return text.replace(
    /=\?([^?]+)\?([BQ])\?([^?]*)\?=/gi,
    (_match: string, charset: string, encoding: string, encoded: string) => {
      try {
        if (encoding.toUpperCase() === 'B') {
          // Base64
          const decoded = atob(encoded)
          // Handle UTF-8
          return new TextDecoder(charset).decode(
            Uint8Array.from(decoded, (c: string) => c.charCodeAt(0)),
          )
        } else {
          // Quoted-printable
          const decoded = encoded
            .replace(/_/g, ' ')
            .replace(/=([0-9A-Fa-f]{2})/g, (_m: string, hex: string) =>
              String.fromCharCode(parseInt(hex, 16)),
            )
          return new TextDecoder(charset).decode(
            Uint8Array.from(decoded, (c: string) => c.charCodeAt(0)),
          )
        }
      } catch {
        return encoded
      }
    },
  )
}

/**
 * Format email address for display
 */
const formatEmailAddress = (
  address: string,
): { name: string; email: string } => {
  const match = address.match(/^"?([^"<]*)"?\s*<?([^>]*)>?$/)
  if (match) {
    const name = decodeMimeWords(match[1].trim())
    const email = match[2].trim() || match[1].trim()
    return { name: name || email, email }
  }
  return { name: address, email: address }
}

/**
 * EML (Email) preview component
 */
const EMLPreview = ({ content, name }: { content: string; name: string }) => {
  const { t } = useI18n(localI18n)
  const [showHtml, setShowHtml] = useState(true)

  const parsedEmail = useMemo(() => {
    // Decode base64 if content is encoded
    let rawContent = content
    if (!content.includes(':') && !content.includes('\n')) {
      try {
        rawContent = atob(content)
      } catch {
        // Not base64, use as-is
      }
    }

    const headers = parseEMLHeaders(rawContent)
    const body = extractEMLBody(rawContent)

    return {
      from: formatEmailAddress(decodeMimeWords(headers['from'] || '')),
      to: (headers['to'] || '')
        .split(',')
        .map((addr) => formatEmailAddress(decodeMimeWords(addr.trim())))
        .filter((addr) => addr.email),
      cc: (headers['cc'] || '')
        .split(',')
        .map((addr) => formatEmailAddress(decodeMimeWords(addr.trim())))
        .filter((addr) => addr.email),
      subject: decodeMimeWords(headers['subject'] || '(No Subject)'),
      date: headers['date'] ? new Date(headers['date']) : null,
      textBody: body.text,
      htmlBody: body.html,
    }
  }, [content])

  const hasHtmlBody = !!parsedEmail.htmlBody
  const hasTextBody = !!parsedEmail.textBody
  const showHtmlContent = showHtml && hasHtmlBody

  return (
    <div className="space-y-4">
      {/* Email Header */}
      <div className="bg-default-50 rounded-lg p-4 space-y-3">
        {/* Subject */}
        <div className="flex items-start gap-2">
          <Icon name="Gmail" className="w-5 h-5 text-primary mt-0.5" />
          <div className="flex-1">
            <h4 className="font-semibold text-lg">{parsedEmail.subject}</h4>
          </div>
        </div>

        {/* From */}
        <div className="flex items-center gap-2 text-sm">
          <span className="text-default-500 w-12">{t('From')}:</span>
          <span className="font-medium">{parsedEmail.from.name}</span>
          {parsedEmail.from.name !== parsedEmail.from.email && (
            <span className="text-default-500">
              &lt;{parsedEmail.from.email}&gt;
            </span>
          )}
        </div>

        {/* To */}
        {parsedEmail.to.length > 0 && (
          <div className="flex items-start gap-2 text-sm">
            <span className="text-default-500 w-12">{t('To')}:</span>
            <div className="flex-1 flex flex-wrap gap-1">
              {parsedEmail.to.map((addr, i) => (
                <Chip key={i} size="sm" variant="flat">
                  {addr.name}
                </Chip>
              ))}
            </div>
          </div>
        )}

        {/* CC */}
        {parsedEmail.cc.length > 0 && (
          <div className="flex items-start gap-2 text-sm">
            <span className="text-default-500 w-12">{t('CC')}:</span>
            <div className="flex-1 flex flex-wrap gap-1">
              {parsedEmail.cc.map((addr, i) => (
                <Chip key={i} size="sm" variant="bordered">
                  {addr.name}
                </Chip>
              ))}
            </div>
          </div>
        )}

        {/* Date */}
        {parsedEmail.date && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-default-500 w-12">{t('Date')}:</span>
            <span>{parsedEmail.date.toLocaleString()}</span>
          </div>
        )}
      </div>

      {/* Toggle between HTML and Plain Text */}
      {hasHtmlBody && hasTextBody && (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={showHtml ? 'solid' : 'flat'}
            color="primary"
            onPress={() => setShowHtml(true)}
            startContent={<Icon name="Code" className="w-4 h-4" />}
          >
            HTML
          </Button>
          <Button
            size="sm"
            variant={!showHtml ? 'solid' : 'flat'}
            color="primary"
            onPress={() => setShowHtml(false)}
            startContent={<Icon name="Document" className="w-4 h-4" />}
          >
            {t('Plain Text')}
          </Button>
        </div>
      )}

      {/* Email Body */}
      <Divider />
      {showHtmlContent ? (
        <HTMLPreview content={parsedEmail.htmlBody} name={name} />
      ) : parsedEmail.textBody ? (
        <div className="bg-default-50 rounded-lg p-4 text-sm whitespace-pre-wrap font-mono">
          {parsedEmail.textBody}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-8 text-center text-default-500">
          <Icon name="Document" className="w-12 h-12 mb-3 opacity-50" />
          <p>{t('No email body available')}</p>
        </div>
      )}
    </div>
  )
}

/**
 * Text/Markdown content preview
 */
const TextPreview = ({
  content,
  format,
}: {
  content: string
  format?: 'markdown' | 'code' | 'text'
}) => {
  if (format === 'markdown' || (!format && content.includes('#'))) {
    return (
      <MarkdownRenderer
        content={content}
        className="prose dark:prose-invert prose-sm max-w-none"
      />
    )
  }

  if (format === 'code') {
    return (
      <pre className="bg-default-100 rounded-lg p-3 text-sm overflow-x-auto font-mono">
        <code>{content}</code>
      </pre>
    )
  }

  return (
    <div className="bg-default-50 rounded-lg p-3 text-sm whitespace-pre-wrap">
      {content}
    </div>
  )
}

/**
 * Metadata section for displaying item properties
 */
const MetadataSection = ({
  item,
  contentType,
}: {
  item: KnowledgeItem | Artifact
  contentType: ContentType
}) => {
  const { lang, t } = useI18n(localI18n)

  if (contentType === 'artifact') {
    const artifact = item as Artifact
    return (
      <div className="space-y-3 text-sm">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="text-default-500">{t('Type')}:</span>
            <span className="ml-2 capitalize">{artifact.type}</span>
          </div>
          <div>
            <span className="text-default-500">{t('Format')}:</span>
            <span className="ml-2">{artifact.format}</span>
          </div>
          <div>
            <span className="text-default-500">{t('Status')}:</span>
            <span className="ml-2 capitalize">{artifact.status}</span>
          </div>
          <div>
            <span className="text-default-500">{t('Version')}:</span>
            <span className="ml-2">v{artifact.version}</span>
          </div>
        </div>

        <Divider />

        <div className="space-y-2">
          <div>
            <span className="text-default-500">{t('Created')}:</span>
            <span className="ml-2">
              {new Date(artifact.createdAt).toLocaleString()}
            </span>
          </div>
          <div>
            <span className="text-default-500">{t('Updated')}:</span>
            <span className="ml-2">
              {new Date(artifact.updatedAt).toLocaleString()}
            </span>
          </div>
        </div>

        {artifact.dependencies.length > 0 && (
          <>
            <Divider />
            <div>
              <span className="text-default-500">{t('Dependencies')}:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {artifact.dependencies.map((depId) => (
                  <Chip key={depId} size="sm" variant="bordered">
                    {depId.slice(-8)}
                  </Chip>
                ))}
              </div>
            </div>
          </>
        )}

        {artifact.validates.length > 0 && (
          <>
            <Divider />
            <div>
              <span className="text-default-500">
                {t('Validates Requirements')}:
              </span>
              <div className="flex flex-wrap gap-1 mt-1">
                {artifact.validates.map((reqId) => (
                  <Chip
                    key={reqId}
                    size="sm"
                    variant="bordered"
                    color="success"
                  >
                    {reqId.slice(-8)}
                  </Chip>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    )
  }

  const knowledgeItem = item as KnowledgeItem
  const sourceInfo = getSyncSourceInfo(knowledgeItem)

  return (
    <div className="space-y-3 text-sm">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <span className="text-default-500">{t('Type')}:</span>
          <span className="ml-2 capitalize">
            {knowledgeItem.fileType || knowledgeItem.type}
          </span>
        </div>
        {knowledgeItem.mimeType && (
          <div>
            <span className="text-default-500">{t('MIME Type')}:</span>
            <span className="ml-2 text-xs font-mono">
              {knowledgeItem.mimeType}
            </span>
          </div>
        )}
        {knowledgeItem.size && (
          <div>
            <span className="text-default-500">{t('Size')}:</span>
            <span className="ml-2">
              {formatBytes(knowledgeItem.size, lang)}
            </span>
          </div>
        )}
        <div>
          <span className="text-default-500">{t('Source')}:</span>
          <span className="ml-2 flex items-center gap-1 inline-flex">
            <Icon name={sourceInfo.icon as any} className="w-3 h-3" />
            {sourceInfo.label}
          </span>
        </div>
      </div>

      <Divider />

      <div className="space-y-2">
        <div>
          <span className="text-default-500">{t('Path')}:</span>
          <span className="ml-2 font-mono text-xs">{knowledgeItem.path}</span>
        </div>
        <div>
          <span className="text-default-500">{t('Created')}:</span>
          <span className="ml-2">
            {new Date(knowledgeItem.createdAt).toLocaleString()}
          </span>
        </div>
        <div>
          <span className="text-default-500">{t('Last Modified')}:</span>
          <span className="ml-2">
            {new Date(knowledgeItem.lastModified).toLocaleString()}
          </span>
        </div>
      </div>

      {/* Connector-specific metadata */}
      {knowledgeItem.syncSource === 'connector' &&
        knowledgeItem.externalUrl && (
          <>
            <Divider />
            <div>
              <span className="text-default-500">{t('External Link')}:</span>
              <Link
                href={knowledgeItem.externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-2 text-sm"
              >
                {t('View Original')}
                <Icon name="OpenNewWindow" className="w-3 h-3 ml-1 inline" />
              </Link>
            </div>
            {knowledgeItem.syncedAt && (
              <div>
                <span className="text-default-500">{t('Last Synced')}:</span>
                <span className="ml-2">
                  {new Date(knowledgeItem.syncedAt).toLocaleString()}
                </span>
              </div>
            )}
          </>
        )}

      {/* Processing Status */}
      {isExtractableDocument(knowledgeItem.mimeType) && (
        <>
          <Divider />
          <div>
            <span className="text-default-500">
              {t('Document Processing')}:
            </span>
            <div className="mt-1 flex items-center gap-2">
              {knowledgeItem.processingStatus === 'completed' && (
                <>
                  <Icon name="CheckCircle" className="w-4 h-4 text-success" />
                  <span className="text-success">{t('Processed')}</span>
                  {knowledgeItem.processedAt && (
                    <span className="text-xs text-default-500">
                      (
                      {new Date(knowledgeItem.processedAt).toLocaleDateString()}
                      )
                    </span>
                  )}
                </>
              )}
              {knowledgeItem.processingStatus === 'processing' && (
                <>
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <span className="text-primary">{t('Processing...')}</span>
                </>
              )}
              {knowledgeItem.processingStatus === 'pending' && (
                <>
                  <Icon name="Timer" className="w-4 h-4 text-warning" />
                  <span className="text-warning">{t('Pending')}</span>
                </>
              )}
              {knowledgeItem.processingStatus === 'failed' && (
                <>
                  <Icon
                    name="WarningTriangle"
                    className="w-4 h-4 text-danger"
                  />
                  <span className="text-danger">{t('Failed')}</span>
                </>
              )}
              {!knowledgeItem.processingStatus && (
                <>
                  <Icon name="Circle" className="w-4 h-4 text-default-400" />
                  <span className="text-default-500">{t('Not processed')}</span>
                </>
              )}
            </div>
            {knowledgeItem.processingError && (
              <p className="text-xs text-danger mt-1">
                {knowledgeItem.processingError}
              </p>
            )}
          </div>
        </>
      )}

      {/* Tags */}
      {knowledgeItem.tags && knowledgeItem.tags.length > 0 && (
        <>
          <Divider />
          <div>
            <span className="text-default-500">{t('Tags')}:</span>
            <div className="flex flex-wrap gap-1 mt-1">
              {knowledgeItem.tags.map((tag) => (
                <Chip key={tag} size="sm" variant="flat" color="primary">
                  {tag}
                </Chip>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Description */}
      {knowledgeItem.description && (
        <>
          <Divider />
          <div>
            <span className="text-default-500">{t('Description')}:</span>
            <p className="mt-1 text-default-700">{knowledgeItem.description}</p>
          </div>
        </>
      )}
    </div>
  )
}

// =============================================================================
// Transcript Section Component
// =============================================================================

const TranscriptSection = ({
  item,
  onRequestProcessing,
}: {
  item: KnowledgeItem
  onRequestProcessing?: () => void
}) => {
  const { t } = useI18n(localI18n)
  const { transcript, processingStatus, processingError, processedAt } = item

  // Has transcript available
  if (transcript) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon name="Document" className="w-5 h-5 text-primary" />
            <h4 className="font-medium">{t('Extracted Text')}</h4>
          </div>
          {processedAt && (
            <span className="text-xs text-default-500">
              {t('Processed')}: {new Date(processedAt).toLocaleDateString()}
            </span>
          )}
        </div>
        <TextPreview content={transcript} format="text" />
      </div>
    )
  }

  // Processing in progress
  if (processingStatus === 'processing' || processingStatus === 'pending') {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-default-700 font-medium">
          {processingStatus === 'pending'
            ? t('Waiting to process...')
            : t('Processing document...')}
        </p>
        <p className="text-sm text-default-500 mt-1">
          {t('Extracting text content from the document')}
        </p>
      </div>
    )
  }

  // Processing failed
  if (processingStatus === 'failed') {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Icon name="WarningTriangle" className="w-12 h-12 text-danger mb-3" />
        <p className="text-default-700 font-medium">{t('Processing failed')}</p>
        {processingError && (
          <p className="text-sm text-danger mt-1">{processingError}</p>
        )}
        {onRequestProcessing && (
          <Button
            color="primary"
            variant="flat"
            className="mt-4"
            onPress={onRequestProcessing}
            startContent={<Icon name="RefreshDouble" className="w-4 h-4" />}
          >
            {t('Retry Processing')}
          </Button>
        )}
      </div>
    )
  }

  // No transcript and not processed yet
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center text-default-500">
      <Icon name="Document" className="w-12 h-12 mb-3 opacity-50" />
      <p className="font-medium">{t('No transcript available')}</p>
      <p className="text-sm mt-1">
        {t('Process this document to extract its text content')}
      </p>
      {onRequestProcessing && (
        <Button
          color="primary"
          variant="flat"
          className="mt-4"
          onPress={onRequestProcessing}
          startContent={<Icon name="Brain" className="w-4 h-4" />}
        >
          {t('Process Document')}
        </Button>
      )}
    </div>
  )
}

// =============================================================================
// Main Component
// =============================================================================

export interface ContentPreviewCallbacks {
  onRequestProcessing?: (itemId: string) => void
}

export const ContentPreview = (
  props: ContentPreviewProps & ContentPreviewCallbacks,
) => {
  const { t } = useI18n(localI18n)
  const {
    type: contentType,
    item,
    mode = 'full',
    className,
    onRequestProcessing,
  } = props

  const [activeTab, setActiveTab] = useState<string>('preview')

  // Determine content characteristics
  const isKnowledge = contentType === 'knowledge'
  const knowledgeItem = isKnowledge ? (item as KnowledgeItem) : null
  const artifact = !isKnowledge ? (item as Artifact) : null

  const mimeType = knowledgeItem?.mimeType
  const content = knowledgeItem?.content || artifact?.content || ''
  const name = knowledgeItem?.name || artifact?.title || ''

  const hasImagePreview =
    isKnowledge &&
    (isImageContent(mimeType) || knowledgeItem?.fileType === 'image')
  const hasVideoPreview = isKnowledge && isVideoContent(mimeType)
  const hasAudioPreview = isKnowledge && isAudioContent(mimeType)
  const hasPDFPreview = isKnowledge && isPDFContent(mimeType) && !!content
  const hasHTMLPreview = isKnowledge && isHTMLContent(mimeType) && !!content
  const hasEMLPreview = isKnowledge && isEMLContent(mimeType) && !!content
  const isExtractable = isKnowledge && isExtractableDocument(mimeType)

  // For text content: show if it's readable text (not base64 binary)
  const isReadableText =
    !!content &&
    !hasImagePreview &&
    !hasVideoPreview &&
    !hasAudioPreview &&
    !hasHTMLPreview &&
    !hasEMLPreview &&
    !isExtractable

  // For artifacts, always show text content
  const showTextContent = !isKnowledge || isReadableText

  // Determine available tabs
  const availableTabs = useMemo(() => {
    const tabs: { key: string; label: string; icon: string }[] = []

    // Preview tab (for media or text content)
    if (
      hasImagePreview ||
      hasVideoPreview ||
      hasAudioPreview ||
      hasPDFPreview ||
      hasHTMLPreview ||
      hasEMLPreview ||
      showTextContent
    ) {
      tabs.push({ key: 'preview', label: t('Preview'), icon: 'MediaImage' })
    }

    // Transcript tab (for extractable documents - always show to allow triggering processing)
    if (isExtractable) {
      tabs.push({ key: 'transcript', label: t('Transcript'), icon: 'Document' })
    }

    // Metadata tab (always available)
    tabs.push({ key: 'metadata', label: t('Details'), icon: 'Settings' })

    return tabs
  }, [
    hasImagePreview,
    hasVideoPreview,
    hasAudioPreview,
    hasPDFPreview,
    hasHTMLPreview,
    hasEMLPreview,
    showTextContent,
    isExtractable,
    t,
  ])

  // Compact mode - simplified view
  if (mode === 'compact') {
    return (
      <div
        className={clsx(
          'p-3 border border-default-200 rounded-lg bg-content1',
          className,
        )}
      >
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <Icon
              name={getFileTypeIcon(item, contentType) as any}
              className="w-8 h-8 text-primary"
            />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-medium truncate">{name}</h4>
            <div className="flex gap-2 mt-1">
              <Chip
                size="sm"
                color={getFileTypeColor(item, contentType) as any}
                variant="flat"
              >
                {isKnowledge
                  ? knowledgeItem?.fileType || 'file'
                  : artifact?.type}
              </Chip>
              {knowledgeItem?.size && (
                <span className="text-xs text-default-500">
                  {formatBytes(knowledgeItem.size, 'en')}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Full mode - complete preview with tabs
  return (
    <div
      className={clsx(
        'flex flex-col h-full bg-content1 rounded-lg border border-default-200',
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-default-200">
        <div className="flex items-center gap-3">
          <Icon
            name={getFileTypeIcon(item, contentType) as any}
            className="w-8 h-8 text-primary"
          />
          <div>
            <h3 className="font-semibold text-lg">{name}</h3>
            <div className="flex gap-2 mt-1">
              {artifact && (
                <Chip
                  size="sm"
                  color={
                    artifact.status === 'approved' ||
                    artifact.status === 'final'
                      ? 'success'
                      : artifact.status === 'rejected'
                        ? 'danger'
                        : 'warning'
                  }
                  variant="flat"
                >
                  {artifact.status}
                </Chip>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {knowledgeItem?.externalUrl && (
            <Tooltip content={t('View Original')}>
              <Button
                as={Link}
                href={knowledgeItem.externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                isIconOnly
                variant="light"
                size="sm"
              >
                <Icon name="OpenNewWindow" className="w-4 h-4" />
              </Button>
            </Tooltip>
          )}
        </div>
      </div>

      {/* Tabs */}
      {availableTabs.length > 1 && (
        <div className="border-b border-default-200">
          <Tabs
            selectedKey={activeTab}
            onSelectionChange={(key) => setActiveTab(key as string)}
            variant="underlined"
            classNames={{
              tabList: 'px-4',
            }}
          >
            {availableTabs.map((tab) => (
              <Tab
                key={tab.key}
                title={
                  <div className="flex items-center gap-2">
                    <Icon name={tab.icon as any} className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </div>
                }
              />
            ))}
          </Tabs>
        </div>
      )}

      {/* Content */}
      <ScrollShadow className="flex-1 p-4 overflow-y-auto">
        {activeTab === 'preview' && (
          <div className="space-y-4">
            {hasImagePreview && (
              <ImagePreview
                content={content}
                mimeType={mimeType!}
                name={name}
              />
            )}

            {hasVideoPreview && (
              <VideoPreview content={content} mimeType={mimeType!} />
            )}

            {hasAudioPreview && (
              <AudioPreview content={content} mimeType={mimeType!} />
            )}

            {hasPDFPreview && <PDFPreview content={content} name={name} />}

            {hasHTMLPreview && <HTMLPreview content={content} name={name} />}

            {hasEMLPreview && <EMLPreview content={content} name={name} />}

            {!hasImagePreview &&
              !hasVideoPreview &&
              !hasAudioPreview &&
              !hasPDFPreview &&
              !hasHTMLPreview &&
              !hasEMLPreview &&
              showTextContent && (
                <TextPreview
                  content={content}
                  format={artifact?.format as 'markdown' | 'code' | undefined}
                />
              )}

            {!content && (
              <div className="flex flex-col items-center justify-center py-12 text-center text-default-500">
                <Icon name="Document" className="w-12 h-12 mb-3 opacity-50" />
                <p>{t('No preview available')}</p>
                <p className="text-sm">
                  {t('The content of this file cannot be displayed')}
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'transcript' && knowledgeItem && (
          <TranscriptSection
            item={knowledgeItem}
            onRequestProcessing={
              onRequestProcessing
                ? () => onRequestProcessing(knowledgeItem.id)
                : undefined
            }
          />
        )}

        {activeTab === 'metadata' && (
          <MetadataSection item={item} contentType={contentType} />
        )}
      </ScrollShadow>
    </div>
  )
}
