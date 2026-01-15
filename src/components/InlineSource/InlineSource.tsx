import { memo, useEffect, useState, useMemo, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Chip, Tooltip, useDisclosure } from '@heroui/react'

import { Icon } from '@/components/Icon'
import { ContentPreviewModal } from '@/components/ContentPreview'
import { db } from '@/lib/db'
import type { KnowledgeItem } from '@/types'
import type { Span } from '@/features/traces/types'
import type { IconName } from '@/lib/types'
import { useI18n } from '@/i18n'

// ============================================================================
// Source Reference Types
// ============================================================================

/** Source type classification */
export type SourceType =
  | 'knowledge'
  | 'gmail'
  | 'drive'
  | 'calendar'
  | 'notion'
  | 'tasks'
  | 'unknown'

/** Information about a source used to generate a response */
export interface SourceInfo {
  id: string
  type: SourceType
  name: string
  externalUrl?: string
  internalPath?: string // For knowledge items
  /** Reference number for inline citations (e.g., 1 for [1]) */
  refNumber?: number
}

// ============================================================================
// Helper Functions
// ============================================================================

/** Get icon name for source type */
export const getSourceIcon = (type: SourceType): string => {
  switch (type) {
    case 'knowledge':
      return 'Page'
    case 'gmail':
      return 'Gmail'
    case 'drive':
      return 'GoogleDrive'
    case 'calendar':
      return 'GoogleCalendar'
    case 'notion':
      return 'Notion'
    case 'tasks':
      return 'GoogleTasks'
    default:
      return 'Internet'
  }
}

/** Determine source type from tool name */
export const getSourceTypeFromTool = (toolName: string): SourceType => {
  if (
    toolName.startsWith('gmail') ||
    toolName === 'gmail_search' ||
    toolName === 'gmail_read'
  ) {
    return 'gmail'
  }
  if (
    toolName.startsWith('drive') ||
    toolName === 'drive_search' ||
    toolName === 'drive_read'
  ) {
    return 'drive'
  }
  if (toolName.startsWith('calendar') || toolName.includes('calendar')) {
    return 'calendar'
  }
  if (toolName.startsWith('notion') || toolName.includes('notion')) {
    return 'notion'
  }
  if (toolName.startsWith('tasks') || toolName === 'tasks_list') {
    return 'tasks'
  }
  if (
    toolName === 'read_document' ||
    toolName === 'search_knowledge' ||
    toolName === 'get_document_summary'
  ) {
    return 'knowledge'
  }
  return 'unknown'
}

/**
 * Extract sources from tool spans.
 * Collects unique sources that were accessed to generate the response.
 */
export const extractSourcesFromSpans = async (
  spans: Span[],
): Promise<SourceInfo[]> => {
  const sourcesMap = new Map<string, SourceInfo>()

  for (const span of spans) {
    if (span.type !== 'tool') continue

    const toolName = span.metadata?.toolName as string
    if (!toolName) continue

    const sourceType = getSourceTypeFromTool(toolName)
    if (sourceType === 'unknown') continue

    const args = span.metadata?.arguments as Record<string, unknown> | undefined
    const response = span.io?.output?.response as
      | Record<string, unknown>
      | undefined

    // Extract source info based on tool type
    if (sourceType === 'knowledge') {
      // Handle knowledge base tools
      const documentId = args?.document_id as string | undefined

      if (documentId && !sourcesMap.has(documentId)) {
        // Try to get document name from response or DB
        let name = ''
        let externalUrl = ''

        if (response?.metadata && typeof response.metadata === 'object') {
          const metadata = response.metadata as Record<string, unknown>
          name = (metadata.name as string) || ''
          externalUrl = (metadata.externalUrl as string) || ''
        }

        // Fallback: fetch from DB if name not in response
        if (!name) {
          try {
            const item = await db.get('knowledgeItems', documentId)
            if (item) {
              name = item.name
              externalUrl = item.externalUrl || ''
            }
          } catch {
            // Ignore errors
          }
        }

        if (name) {
          sourcesMap.set(documentId, {
            id: documentId,
            type: 'knowledge',
            name,
            externalUrl: externalUrl || undefined,
            internalPath: `/knowledge/files#${documentId}`,
          })
        }
      }

      // Handle search results
      if (response?.hits && Array.isArray(response.hits)) {
        for (const hit of response.hits as Array<Record<string, unknown>>) {
          const hitId = hit.id as string
          const hitName = hit.name as string
          if (hitId && hitName && !sourcesMap.has(hitId)) {
            sourcesMap.set(hitId, {
              id: hitId,
              type: 'knowledge',
              name: hitName,
              externalUrl: (hit.externalUrl as string) || undefined,
              internalPath: `/knowledge/files#${hitId}`,
            })
          }
        }
      }
    } else if (sourceType === 'gmail') {
      // Handle Gmail tools
      const messageId = args?.message_id as string
      if (messageId && response && !sourcesMap.has(messageId)) {
        const subject =
          (response.subject as string) ||
          (response.snippet as string) ||
          'Email'
        // Gmail web URL format
        const externalUrl = `https://mail.google.com/mail/u/0/#inbox/${messageId}`

        sourcesMap.set(messageId, {
          id: messageId,
          type: 'gmail',
          name: subject.length > 50 ? subject.slice(0, 47) + '…' : subject,
          externalUrl,
        })
      }

      // Handle search results
      if (response?.messages && Array.isArray(response.messages)) {
        for (const msg of response.messages as Array<Record<string, unknown>>) {
          const msgId = msg.id as string
          const msgSubject =
            (msg.subject as string) || (msg.snippet as string) || 'Email'
          if (msgId && !sourcesMap.has(msgId)) {
            sourcesMap.set(msgId, {
              id: msgId,
              type: 'gmail',
              name:
                msgSubject.length > 50
                  ? msgSubject.slice(0, 47) + '…'
                  : msgSubject,
              externalUrl: `https://mail.google.com/mail/u/0/#inbox/${msgId}`,
            })
          }
        }
      }
    } else if (sourceType === 'drive') {
      // Handle Drive tools
      const fileId = args?.file_id as string
      if (fileId && response && !sourcesMap.has(fileId)) {
        const name = (response.name as string) || 'Drive File'
        const webViewLink = response.webViewLink as string

        sourcesMap.set(fileId, {
          id: fileId,
          type: 'drive',
          name: name.length > 50 ? name.slice(0, 47) + '…' : name,
          externalUrl:
            webViewLink || `https://drive.google.com/file/d/${fileId}`,
        })
      }

      // Handle search/list results
      if (response?.files && Array.isArray(response.files)) {
        for (const file of response.files as Array<Record<string, unknown>>) {
          const fId = file.id as string
          const fName = (file.name as string) || 'Drive File'
          if (fId && !sourcesMap.has(fId)) {
            sourcesMap.set(fId, {
              id: fId,
              type: 'drive',
              name: fName.length > 50 ? fName.slice(0, 47) + '…' : fName,
              externalUrl:
                (file.webViewLink as string) ||
                `https://drive.google.com/file/d/${fId}`,
            })
          }
        }
      }
    } else if (sourceType === 'calendar') {
      // Handle Calendar tools
      const eventId = args?.event_id as string
      if (eventId && response && !sourcesMap.has(eventId)) {
        const summary = (response.summary as string) || 'Calendar Event'
        const htmlLink = response.htmlLink as string

        sourcesMap.set(eventId, {
          id: eventId,
          type: 'calendar',
          name: summary.length > 50 ? summary.slice(0, 47) + '…' : summary,
          externalUrl: htmlLink,
        })
      }

      // Handle list results
      if (response?.events && Array.isArray(response.events)) {
        for (const event of response.events as Array<Record<string, unknown>>) {
          const eId = event.id as string
          const eSummary = (event.summary as string) || 'Calendar Event'
          if (eId && !sourcesMap.has(eId)) {
            sourcesMap.set(eId, {
              id: eId,
              type: 'calendar',
              name:
                eSummary.length > 50 ? eSummary.slice(0, 47) + '…' : eSummary,
              externalUrl: event.htmlLink as string,
            })
          }
        }
      }
    } else if (sourceType === 'notion') {
      // Handle Notion tools
      const pageId = args?.page_id as string
      if (pageId && response && !sourcesMap.has(pageId)) {
        const title = (response.title as string) || 'Notion Page'
        const url = response.url as string

        sourcesMap.set(pageId, {
          id: pageId,
          type: 'notion',
          name: title.length > 50 ? title.slice(0, 47) + '…' : title,
          externalUrl: url,
        })
      }

      // Handle search results
      if (response?.results && Array.isArray(response.results)) {
        for (const result of response.results as Array<
          Record<string, unknown>
        >) {
          const rId = result.id as string
          const rTitle = (result.title as string) || 'Notion Page'
          if (rId && !sourcesMap.has(rId)) {
            sourcesMap.set(rId, {
              id: rId,
              type: 'notion',
              name: rTitle.length > 50 ? rTitle.slice(0, 47) + '…' : rTitle,
              externalUrl: result.url as string,
            })
          }
        }
      }
    }
  }

  return Array.from(sourcesMap.values())
}

/**
 * Parse citation references from text content.
 * Looks for patterns like [1], [2], etc. and returns the numbers found.
 */
export const parseCitationsFromText = (text: string): number[] => {
  const citationPattern = /\[(\d+)\]/g
  const citations: number[] = []
  let match

  while ((match = citationPattern.exec(text)) !== null) {
    const num = parseInt(match[1], 10)
    if (!citations.includes(num)) {
      citations.push(num)
    }
  }

  return citations.sort((a, b) => a - b)
}

/**
 * Assign reference numbers to sources and filter to only cited ones.
 * @param sources All available sources
 * @param citedNumbers Array of citation numbers found in the text
 * @returns Sources with refNumber assigned, filtered to only those cited
 */
export const assignSourceReferences = (
  sources: SourceInfo[],
  citedNumbers: number[],
): SourceInfo[] => {
  // Assign reference numbers to all sources (1-indexed)
  const numberedSources = sources.map((source, index) => ({
    ...source,
    refNumber: index + 1,
  }))

  // If no citations in text, return empty (don't show uncited sources)
  if (citedNumbers.length === 0) {
    return []
  }

  // Filter to only sources that are actually cited
  return numberedSources.filter(
    (source) => source.refNumber && citedNumbers.includes(source.refNumber),
  )
}

/**
 * Process content to make citation references clickable.
 * Replaces [1], [2], etc. with interactive elements.
 */
export const processCitationsInContent = (
  content: string,
  sources: SourceInfo[],
): { processedContent: string; citedSources: SourceInfo[] } => {
  const citedNumbers = parseCitationsFromText(content)
  const citedSources = assignSourceReferences(sources, citedNumbers)

  return { processedContent: content, citedSources }
}

// ============================================================================
// Components
// ============================================================================

export interface InlineCitationProps {
  /** The citation number (e.g., 1 for [1]) */
  number: number
  /** The source this citation refers to */
  source?: SourceInfo
  /** Click handler */
  onClick?: () => void
}

/**
 * Inline Citation Component
 * Renders a clickable inline source badge with icon and name.
 * For knowledge items, opens a preview modal instead of navigating away.
 */
export const InlineCitation = memo(
  ({ number, source, onClick }: InlineCitationProps) => {
    const { isOpen, onOpen, onClose } = useDisclosure()
    const [knowledgeItem, setKnowledgeItem] = useState<KnowledgeItem | null>(
      null,
    )
    const [isLoading, setIsLoading] = useState(false)

    const icon = source ? getSourceIcon(source.type) : 'Internet'
    const isExternal = !!source?.externalUrl
    const isKnowledgeSource = source?.type === 'knowledge' && !isExternal

    // Truncate name for inline display
    const displayName = source?.name
      ? source.name.length > 25
        ? source.name.substring(0, 23) + '…'
        : source.name
      : `Source ${number}`

    // Fetch knowledge item when opening modal
    const handleOpenPreview = useCallback(async () => {
      if (!isKnowledgeSource || !source) return

      setIsLoading(true)
      try {
        const item = await db.get('knowledgeItems', source.id)
        if (item) {
          setKnowledgeItem(item)
          onOpen()
        }
      } catch (error) {
        console.error('Failed to load knowledge item:', error)
      } finally {
        setIsLoading(false)
      }
    }, [source, isKnowledgeSource, onOpen])

    const citationContent = (
      <span
        className={`align-text-top inline-flex items-center gap-0.5 h-5 px-1.5 text-xs font-medium rounded bg-default-100 dark:bg-default-50 text-default-700 dark:text-default-600 cursor-pointer transition-opacity hover:opacity-70 ${isLoading ? 'opacity-50' : ''}`}
        onClick={onClick}
      >
        <Icon name={icon as IconName} size="sm" />
        <span>{displayName}</span>
      </span>
    )

    if (!source) {
      return citationContent
    }

    const tooltipContent = (
      <div className="text-tiny max-w-xs">
        <div className="font-medium">{source.name}</div>
        {source.externalUrl && (
          <div className="text-default-400 truncate">{source.externalUrl}</div>
        )}
      </div>
    )

    // External link - opens in new tab
    if (isExternal) {
      return (
        <Tooltip content={tooltipContent}>
          <a
            href={source.externalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline"
          >
            {citationContent}
          </a>
        </Tooltip>
      )
    }

    // Knowledge source - opens preview modal
    if (isKnowledgeSource) {
      return (
        <>
          <Tooltip content={tooltipContent}>
            <span className="inline" onClick={handleOpenPreview}>
              {citationContent}
            </span>
          </Tooltip>

          {/* Content Preview Modal */}
          {knowledgeItem && (
            <ContentPreviewModal
              isOpen={isOpen}
              onClose={onClose}
              type="knowledge"
              item={knowledgeItem}
            />
          )}
        </>
      )
    }

    // Fallback for other internal paths (shouldn't happen often)
    const targetUrl = source.internalPath
    if (targetUrl) {
      return (
        <Tooltip content={tooltipContent}>
          <Link to={targetUrl} className="inline">
            {citationContent}
          </Link>
        </Tooltip>
      )
    }

    return citationContent
  },
)

InlineCitation.displayName = 'InlineCitation'

// ============================================================================
// Semantic Citation Component
// ============================================================================

export interface SemanticCitationProps {
  /** The semantic type (memory, pinned, or document) */
  type: SemanticCitationType
  /** The label to display (e.g., "Memory", "Pinned", or document name) */
  label: string
  /** Optional tooltip content */
  tooltip?: string
}

/**
 * Semantic Citation Component
 * Renders a styled badge for [Memory], [Pinned], or [Document Name] citations.
 */
export const SemanticCitation = memo(
  ({ type, label, tooltip }: SemanticCitationProps) => {
    const icon = getSemanticCitationIcon(type)
    const { t } = useI18n()

    // Determine display label
    const displayLabel =
      type === 'memory'
        ? t('Memory')
        : type === 'pinned'
          ? t('Pinned')
          : label.length > 20
            ? label.substring(0, 18) + '…'
            : label

    const defaultTooltip =
      type === 'memory'
        ? t('From remembered context about the user')
        : type === 'pinned'
          ? t('From important past conversations')
          : `Source: ${label}`

    // Use static Tailwind classes for each type
    const colorClasses =
      type === 'memory'
        ? 'bg-secondary/20 text-secondary-600 dark:text-secondary-400'
        : type === 'pinned'
          ? 'bg-warning/20 text-warning-600 dark:text-warning-500'
          : undefined

    const citationContent = (
      <span
        className={`align-text-top inline-flex items-center gap-0.5 h-5 px-1.5 text-xs font-medium rounded transition-opacity hover:opacity-70 ${colorClasses}`}
      >
        <Icon name={icon} size="sm" />
        <span>{displayLabel}</span>
      </span>
    )

    return (
      <Tooltip content={tooltip || defaultTooltip}>
        <span className="cursor-help">{citationContent}</span>
      </Tooltip>
    )
  },
)

SemanticCitation.displayName = 'SemanticCitation'

export interface InlineSourceProps {
  source: SourceInfo
  /** Translation function for i18n */
  t?: (key: string) => string
  /** Whether to show the reference number */
  showRefNumber?: boolean
}

/**
 * Inline Source Component
 * Displays a clickable source reference that opens a preview modal for internal sources.
 */
export const InlineSource = memo(
  ({ source, t, showRefNumber = true }: InlineSourceProps) => {
    const icon = getSourceIcon(source.type)
    const { isOpen, onOpen, onClose } = useDisclosure()
    const [knowledgeItem, setKnowledgeItem] = useState<KnowledgeItem | null>(
      null,
    )
    const [isLoading, setIsLoading] = useState(false)

    // Determine the target URL - prefer external URL, fallback to internal path
    const targetUrl = source.externalUrl || source.internalPath
    const isExternal = !!source.externalUrl
    const isKnowledgeSource = source.type === 'knowledge' && !isExternal

    // Fetch knowledge item when opening modal
    const handleOpenPreview = useCallback(async () => {
      if (!isKnowledgeSource) return

      setIsLoading(true)
      try {
        const item = await db.get('knowledgeItems', source.id)
        if (item) {
          setKnowledgeItem(item)
          onOpen()
        }
      } catch (error) {
        console.error('Failed to load knowledge item:', error)
      } finally {
        setIsLoading(false)
      }
    }, [source.id, isKnowledgeSource, onOpen])

    if (!targetUrl && !isKnowledgeSource) return null

    // Build the display content with optional reference number
    const displayContent = (
      <>
        {showRefNumber && source.refNumber && (
          <span className="font-semibold mr-0.5">[{source.refNumber}]</span>
        )}
        {source.name}
      </>
    )

    if (isExternal) {
      // External link opens in new tab
      return (
        <Tooltip
          content={
            <div className="text-tiny max-w-xs">
              <div className="font-medium">{source.name}</div>
              <div className="text-default-400 truncate">{targetUrl}</div>
            </div>
          }
        >
          <Chip
            as="a"
            href={targetUrl}
            target="_blank"
            rel="noopener noreferrer"
            size="sm"
            variant="flat"
            className="cursor-pointer hover:opacity-80 transition-opacity text-tiny gap-1"
            startContent={<Icon name={icon as any} className="w-3 h-3" />}
          >
            {displayContent}
          </Chip>
        </Tooltip>
      )
    }

    // Internal knowledge source - open preview modal
    return (
      <>
        <Tooltip
          content={
            <div className="text-tiny max-w-xs">
              <div className="font-medium">{source.name}</div>
              <div className="text-default-400">
                {t?.('View in Knowledge Base') ?? 'View in Knowledge Base'}
              </div>
            </div>
          }
        >
          <Chip
            as="button"
            onClick={handleOpenPreview}
            isDisabled={isLoading}
            size="sm"
            variant="flat"
            className="cursor-pointer hover:opacity-80 transition-opacity text-tiny gap-1"
            startContent={<Icon name={icon as any} className="w-3 h-3" />}
          >
            {displayContent}
          </Chip>
        </Tooltip>

        {/* Content Preview Modal */}
        {knowledgeItem && (
          <ContentPreviewModal
            isOpen={isOpen}
            onClose={onClose}
            type="knowledge"
            item={knowledgeItem}
          />
        )}
      </>
    )
  },
)

InlineSource.displayName = 'InlineSource'

export interface SourcesDisplayProps {
  /** Array of sources to display */
  sources: SourceInfo[]
  /** Translation function for i18n */
  t?: (key: string) => string
  /** Custom label for the sources section */
  label?: string
  /** Content to parse for citations - only cited sources will be shown */
  content?: string
}

/**
 * Sources Display Component
 * Shows all sources used to generate a response as inline chips.
 * If content is provided, only sources that are cited in the content are shown.
 */
export const SourcesDisplay = memo(
  ({ sources, t, label, content }: SourcesDisplayProps) => {
    // If content is provided, filter to only cited sources
    const displaySources = useMemo(() => {
      if (!content) {
        // No content to parse, show all sources with reference numbers
        return sources.map((source, index) => ({
          ...source,
          refNumber: index + 1,
        }))
      }

      // Parse citations from content and filter sources
      const citedNumbers = parseCitationsFromText(content)
      return assignSourceReferences(sources, citedNumbers)
    }, [sources, content])

    if (displaySources.length === 0) return null

    return (
      <div className="mt-3 pt-3 border-t border-default-200 dark:border-default-100">
        <div className="flex items-center gap-1.5 mb-2 text-tiny text-default-500">
          <Icon name="Internet" className="w-3.5 h-3.5" />
          <span>{label ?? t?.('Sources') ?? 'Sources'}</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {displaySources.map((source) => (
            <InlineSource key={source.id} source={source} t={t} />
          ))}
        </div>
      </div>
    )
  },
)

SourcesDisplay.displayName = 'SourcesDisplay'

/**
 * Hook to load sources from trace IDs
 * Can be shared between MarkdownRenderer and SourcesDisplay
 */
export interface UseTraceSourcesProps {
  /** Trace IDs to load sources from */
  traceIds: string[]
  /** Function to load a trace by ID */
  loadTrace: (id: string) => Promise<void>
  /** Function to get current spans from trace store */
  getCurrentSpans: () => Span[]
  /** Function to clear current trace */
  clearCurrentTrace: () => void
  /** Content to parse for citations - sources will be numbered according to citations */
  content?: string
}

export interface UseTraceSourcesResult {
  /** All loaded sources */
  sources: SourceInfo[]
  /** Sources filtered to only those cited in content (with refNumber assigned) */
  citedSources: SourceInfo[]
  /** Whether sources are being loaded */
  isLoading: boolean
}

export const useTraceSources = ({
  traceIds,
  loadTrace,
  getCurrentSpans,
  clearCurrentTrace,
  content,
}: UseTraceSourcesProps): UseTraceSourcesResult => {
  const [sources, setSources] = useState<SourceInfo[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Use refs to store function props to avoid triggering useEffect on every render
  // when parent component doesn't memoize these callbacks
  const loadTraceRef = useRef(loadTrace)
  const getCurrentSpansRef = useRef(getCurrentSpans)
  const clearCurrentTraceRef = useRef(clearCurrentTrace)

  // Keep refs up to date
  useEffect(() => {
    loadTraceRef.current = loadTrace
    getCurrentSpansRef.current = getCurrentSpans
    clearCurrentTraceRef.current = clearCurrentTrace
  })

  useEffect(() => {
    const loadSources = async () => {
      if (traceIds.length === 0) {
        setSources([])
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      const allSpans: Span[] = []

      for (const id of traceIds) {
        try {
          await loadTraceRef.current(id)
          const loadedSpans = getCurrentSpansRef.current()
          allSpans.push(...loadedSpans)
        } catch (error) {
          console.warn(`Failed to load trace ${id}:`, error)
        }
      }

      const extractedSources = await extractSourcesFromSpans(allSpans)
      setSources(extractedSources)
      clearCurrentTraceRef.current()
      setIsLoading(false)
    }

    loadSources()
  }, [traceIds])

  // Compute cited sources with reference numbers
  const citedSources = useMemo(() => {
    if (!content || sources.length === 0) {
      // No content provided, return all sources with sequential numbering
      return sources.map((source, index) => ({
        ...source,
        refNumber: index + 1,
      }))
    }

    // Extract citation numbers from content
    const citedNumbers = parseCitationsFromText(content)
    if (citedNumbers.length === 0) {
      // No citations found, return all sources
      return sources.map((source, index) => ({
        ...source,
        refNumber: index + 1,
      }))
    }

    // Assign reference numbers to sources based on citations
    return assignSourceReferences(sources, citedNumbers)
  }, [content, sources])

  return { sources, citedSources, isLoading }
}

export interface SourcesDisplayWithLoadingProps {
  /** Trace IDs to load sources from */
  traceIds: string[]
  /** Function to load a trace by ID */
  loadTrace: (id: string) => Promise<void>
  /** Function to get current spans from trace store */
  getCurrentSpans: () => Span[]
  /** Function to clear current trace */
  clearCurrentTrace: () => void
  /** Translation function for i18n */
  t?: (key: string) => string
  /** Custom label for the sources section */
  label?: string
  /** Content to parse for citations - only cited sources will be shown */
  content?: string
}

/**
 * Sources Display with Loading Component
 * Loads sources from trace IDs and displays them.
 * If content is provided, only sources that are cited [1], [2], etc. will be shown.
 */
export const SourcesDisplayWithLoading = memo(
  ({
    traceIds,
    loadTrace,
    getCurrentSpans,
    clearCurrentTrace,
    t,
    label,
    content,
  }: SourcesDisplayWithLoadingProps) => {
    const { citedSources, isLoading } = useTraceSources({
      traceIds,
      loadTrace,
      getCurrentSpans,
      clearCurrentTrace,
      content,
    })

    if (isLoading || citedSources.length === 0) return null

    return <SourcesDisplay sources={citedSources} t={t} label={label} />
  },
)

SourcesDisplayWithLoading.displayName = 'SourcesDisplayWithLoading'

// ============================================================================
// Citation Rendering Utilities
// ============================================================================

/**
 * Semantic citation types for non-numeric citations
 */
export type SemanticCitationType = 'memory' | 'pinned' | 'document'

/**
 * Regular expression to match numeric citation patterns like [1], [2], etc.
 */
export const CITATION_PATTERN = /\[(\d+)\]/g

/**
 * Regular expression to match all citation patterns:
 * - Numeric: [1], [2], [3]
 * - Semantic: [Memory], [Pinned]
 * - Named: [Document Name] (any other text in brackets, excluding common markdown patterns)
 */
export const EXTENDED_CITATION_PATTERN = /\[(\d+|Memory|Pinned]+)\]/g

/**
 * Determine the semantic type of a citation
 */
export const getSemanticCitationType = (
  citation: string,
): SemanticCitationType | null => {
  if (citation === 'Memory') return 'memory'
  if (citation === 'Pinned') return 'pinned'
  // If it's not a number and not Memory/Pinned, it's a document name
  if (!/^\d+$/.test(citation)) return 'document'
  return null
}

/**
 * Get icon for semantic citation type
 */
export const getSemanticCitationIcon = (
  type: SemanticCitationType,
): IconName => {
  switch (type) {
    case 'memory':
      return 'Brain'
    case 'pinned':
      return 'Pin'
    case 'document':
      return 'Page'
    default:
      return 'Page'
  }
}

/**
 * Split content into parts with citations identified (extended version).
 * Returns an array with text, numeric citations, and semantic citations.
 */
export interface ExtendedContentPart {
  type: 'text' | 'citation' | 'semantic-citation'
  content: string
  number?: number
  semanticType?: SemanticCitationType
  label?: string
}

export const splitContentWithExtendedCitations = (
  content: string,
): ExtendedContentPart[] => {
  const parts: ExtendedContentPart[] = []
  let lastIndex = 0
  let match

  const pattern = new RegExp(EXTENDED_CITATION_PATTERN.source, 'g')

  while ((match = pattern.exec(content)) !== null) {
    // Add text before the citation
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        content: content.slice(lastIndex, match.index),
      })
    }

    const capturedValue = match[1]
    const isNumeric = /^\d+$/.test(capturedValue)

    if (isNumeric) {
      // Numeric citation [1], [2], etc.
      parts.push({
        type: 'citation',
        content: match[0],
        number: parseInt(capturedValue, 10),
      })
    } else {
      // Semantic citation [Memory], [Pinned], or [Document Name]
      const semanticType = getSemanticCitationType(capturedValue)
      parts.push({
        type: 'semantic-citation',
        content: match[0],
        semanticType: semanticType || 'document',
        label: capturedValue,
      })
    }

    lastIndex = match.index + match[0].length
  }

  // Add remaining text after last citation
  if (lastIndex < content.length) {
    parts.push({
      type: 'text',
      content: content.slice(lastIndex),
    })
  }

  return parts
}

/**
 * Split content into parts with citations identified.
 * Returns an array of { type: 'text' | 'citation', content: string, number?: number }
 */
export interface ContentPart {
  type: 'text' | 'citation'
  content: string
  number?: number
}

export const splitContentWithCitations = (content: string): ContentPart[] => {
  const parts: ContentPart[] = []
  let lastIndex = 0
  let match

  const pattern = new RegExp(CITATION_PATTERN.source, 'g')

  while ((match = pattern.exec(content)) !== null) {
    // Add text before the citation
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        content: content.slice(lastIndex, match.index),
      })
    }

    // Add the citation
    parts.push({
      type: 'citation',
      content: match[0],
      number: parseInt(match[1], 10),
    })

    lastIndex = match.index + match[0].length
  }

  // Add remaining text after last citation
  if (lastIndex < content.length) {
    parts.push({
      type: 'text',
      content: content.slice(lastIndex),
    })
  }

  return parts
}

/**
 * Get a source by its reference number
 */
export const getSourceByRefNumber = (
  sources: SourceInfo[],
  refNumber: number,
): SourceInfo | undefined => {
  return sources.find((s) => s.refNumber === refNumber)
}
