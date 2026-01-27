import { useEffect, useState, useMemo, useCallback, memo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Accordion,
  AccordionItem,
  Button,
  ButtonGroup,
  Card,
  CardBody,
  Chip,
  Divider,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Spinner,
  Textarea,
  Tooltip,
  useDisclosure,
} from '@heroui/react'
import { Pin, PinSlash } from 'iconoir-react'

import { useI18n } from '@/i18n'
import {
  Container,
  Icon,
  MarkdownRenderer,
  PromptArea,
  Section,
  Widget,
  useTraceSources,
} from '@/components'
import { AgentAppearancePicker } from '@/components/AgentAppearancePicker'
import DefaultLayout from '@/layouts/Default'
import { Link } from 'react-router-dom'
import type { HeaderProps, IconName } from '@/lib/types'
import { getAgentById, getAgentBySlug, updateAgent } from '@/stores/agentStore'
import { useAgentMemoryStore } from '@/stores/agentMemoryStore'
import { usePinnedMessageStore } from '@/stores/pinnedMessageStore'
import { useTraceStore } from '@/stores/traceStore'
import {
  Agent,
  AgentColor,
  Message,
  Artifact,
  AgentMemoryEntry,
  MemoryCategory,
} from '@/types'
import type { Trace, Span } from '@/features/traces/types'
import { errorToast, successToast } from '@/lib/toast'
import { notifyError } from '@/features/notifications'
import {
  submitChat,
  type ResponseUpdate,
  type ResponseStatus,
} from '@/lib/chat'
import { db } from '@/lib/db'
import { copyRichText } from '@/lib/clipboard'
import {
  learnFromMessage,
  processPendingLearningEvents,
} from '@/lib/memory-learning-service'
import { MessageDescriptionGenerator } from '@/lib/message-description-generator'
import { useConversationStore } from '@/stores/conversationStore'
import { useArtifactStore } from '@/stores/artifactStore'
import { categoryLabels } from '../Knowledge/AgentMemories'
import { useAgentContextPanel } from './useAgentContextPanel'
import localI18n from './i18n'

// Timeline item types for interleaving messages and memories
type TimelineItem =
  | { type: 'message'; data: Message; timestamp: Date }
  | { type: 'memory'; data: AgentMemoryEntry; timestamp: Date }

// ============================================================================
// Tool Display Name Mapping & Context Helpers
// ============================================================================

/** Map tool names to user-friendly display names */
const TOOL_DISPLAY_NAMES: Record<string, string> = {
  // Knowledge tools
  search_knowledge: 'Searching knowledge base',
  read_document: 'Reading document',
  list_documents: 'Browsing documents',
  get_document_summary: 'Summarizing document',
  // Math & code tools
  calculate: 'Calculating',
  execute: 'Code interpreter',
  // Gmail tools
  gmail_search: 'Searching Gmail',
  gmail_read: 'Reading email',
  gmail_list_labels: 'Listing Gmail labels',
  // Google Drive tools
  drive_search: 'Searching Google Drive',
  drive_read: 'Reading file from Drive',
  drive_list: 'Listing Drive files',
  // Google Calendar tools
  calendar_list_events: 'Listing calendar events',
  calendar_get_event: 'Getting calendar event',
  calendar_search: 'Searching calendar',
  // Google Tasks tools
  tasks_list: 'Listing tasks',
  tasks_get: 'Getting task details',
  tasks_list_tasklists: 'Listing task lists',
  // Notion tools
  notion_search: 'Searching Notion',
  notion_read_page: 'Reading Notion page',
  notion_query_database: 'Querying Notion database',
}

/** Get appropriate icon for tool type */
const getToolIcon = (toolName: string): IconName => {
  if (toolName === 'execute') return 'Code'
  if (toolName.includes('search')) return 'Search'
  if (toolName.includes('read') || toolName.includes('document')) return 'Page'
  if (toolName.includes('list') || toolName.includes('browse')) return 'Folder'
  if (toolName.includes('summary')) return 'AlignLeft'
  return 'Settings'
}

/** Extract contextual info from tool metadata */
interface ToolContextInfo {
  displayName: string
  icon: IconName
  toolName: string
  documentId?: string
  documentName?: string
  query?: string
  folderId?: string
  // Tool-specific input/output
  input?: Record<string, unknown>
  output?: unknown
  // Calculate tool specific
  expression?: string
  result?: string | number
  // Search tool specific
  searchHitsCount?: number
}

const extractToolContext = (span: Span): ToolContextInfo | null => {
  const toolName = span.metadata?.toolName as string
  if (!toolName) return null

  const args = span.metadata?.arguments as Record<string, unknown> | undefined
  const displayName =
    TOOL_DISPLAY_NAMES[toolName] || toolName.replace(/_/g, ' ')
  const icon = getToolIcon(toolName)

  const context: ToolContextInfo = { displayName, icon, toolName }

  // Store raw input/output for display
  if (args) {
    context.input = args
  }
  if (span.io?.output?.response) {
    context.output = span.io.output.response
  }

  // Extract contextual info based on tool type
  if (args) {
    if ('document_id' in args) {
      context.documentId = args.document_id as string
    }
    if ('query' in args) {
      context.query = args.query as string
    }
    if ('folder_id' in args) {
      context.folderId = args.folder_id as string
    }
    // Calculate tool: extract expression
    if ('expression' in args) {
      context.expression = args.expression as string
    }
  }

  // Extract tool-specific output
  if (span.io?.output?.response) {
    const response = span.io.output.response as Record<string, unknown>

    // Calculate tool: extract result
    if (toolName === 'calculate' && 'result' in response) {
      context.result = response.result as string | number
    }

    // Search tool: extract hits count
    if (Array.isArray(response.hits)) {
      context.searchHitsCount = response.hits.length
    }
  }

  // Try to extract document name from output if available
  if (span.io?.output?.response) {
    const response = span.io.output.response as Record<string, unknown>

    // Try different paths where document name might be located:
    // 1. Direct response.metadata.name (ReadDocumentResult with include_metadata)
    if (response.metadata && typeof response.metadata === 'object') {
      const metadata = response.metadata as Record<string, unknown>
      if (metadata.name) {
        context.documentName = metadata.name as string
      }
    }

    // 2. Direct response.name (some tool results)
    if (
      !context.documentName &&
      response.name &&
      typeof response.name === 'string'
    ) {
      context.documentName = response.name
    }

    // 3. Skip extracting documentName from search hits - search_knowledge
    // is about finding documents, not reading a specific one, so we don't
    // want to display a document link for search results.

    // 4. Wrapped in data property (ToolExecutionResult success case)
    if (
      !context.documentName &&
      response.data &&
      typeof response.data === 'object'
    ) {
      const data = response.data as Record<string, unknown>
      if (data.metadata && typeof data.metadata === 'object') {
        const metadata = data.metadata as Record<string, unknown>
        if (metadata.name) {
          context.documentName = metadata.name as string
        }
      }
      if (!context.documentName && data.name && typeof data.name === 'string') {
        context.documentName = data.name
      }
    }
  }

  return context
}

// ============================================================================
// Single Tool Item Display (for timeline)
// ============================================================================

/** Display a single tool execution inline */
const ToolTimelineItem = memo(
  ({
    span,
    onDocumentClick,
  }: {
    span: Span
    onDocumentClick?: (documentId: string) => void
  }) => {
    const { t } = useI18n(localI18n)
    const context = extractToolContext(span)
    const [resolvedDocumentName, setResolvedDocumentName] = useState<
      string | null
    >(null)

    // Fetch document name from DB if we have an ID but no name from the span
    useEffect(() => {
      if (context?.documentId && !context.documentName) {
        db.get('knowledgeItems', context.documentId).then((item) => {
          if (item?.name) {
            setResolvedDocumentName(item.name)
          }
        })
      }
    }, [context?.documentId, context?.documentName])

    if (!context) return null

    // Use resolved name from DB, or from span context
    const displayName = context.documentName || resolvedDocumentName

    const formatDuration = (ms?: number) => {
      if (!ms) return ''
      if (ms < 1000) return `${ms.toFixed(0)}ms`
      return `${(ms / 1000).toFixed(1)}s`
    }

    const isError = span.status === 'error'

    // Render tool-specific input/output display
    const renderToolIO = () => {
      // Calculate tool: show expression → result
      if (context.toolName === 'calculate' && context.expression) {
        return (
          <div className="flex items-center gap-1.5 flex-wrap">
            <code className="text-xs bg-default-100 dark:bg-default-200/50 px-1.5 py-0.5 rounded font-mono text-default-700">
              {context.expression}
            </code>
            {context.result !== undefined && (
              <>
                <span className="text-default-400">→</span>
                <code className="text-xs bg-success-100 dark:bg-success-900/30 px-1.5 py-0.5 rounded font-mono text-success-700 dark:text-success-400">
                  {context.result}
                </code>
              </>
            )}
          </div>
        )
      }

      // Search tool: show query and results count
      if (context.toolName === 'search_knowledge' && context.query) {
        return (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-default-400 italic truncate max-w-[250px]">
              "
              {context.query.length > 50
                ? context.query.slice(0, 50) + '…'
                : context.query}
              "
            </span>
            {context.searchHitsCount !== undefined && (
              <>
                <span className="text-xs">
                  ({context.searchHitsCount}{' '}
                  {context.searchHitsCount === 1 ? t('result') : t('results')})
                </span>
              </>
            )}
          </div>
        )
      }

      // Default: show query if available (for other tools)
      if (context.query) {
        return (
          <span className="text-default-400 italic truncate max-w-[200px]">
            "
            {context.query.length > 40
              ? context.query.slice(0, 40) + '…'
              : context.query}
            "
          </span>
        )
      }

      return null
    }

    return (
      <div className="flex items-center gap-1.5 text-sm text-default-500 flex-wrap">
        <Icon
          name={context.icon}
          size="sm"
          className={`hidden md:inline-flex ${isError ? 'text-danger-500' : 'text-default-400'}`}
        />
        <span className={isError ? 'text-danger-600' : ''}>
          {t(context.displayName as any)}
        </span>
        {renderToolIO()}
        {displayName && (
          <Link
            to={`/knowledge/files#${context.documentId}`}
            className="text-primary-500 hover:text-primary-600 hover:underline flex items-center gap-1 flex-shrink-0"
            onClick={(e) => {
              if (onDocumentClick && context.documentId) {
                e.preventDefault()
                onDocumentClick(context.documentId)
              }
            }}
          >
            <Icon name="Page" className="w-3 h-3" />
            <span className="truncate max-w-[16em]">{displayName}</span>
          </Link>
        )}
        {!displayName && context.documentId && (
          <Link
            to={`/knowledge/files#${context.documentId}`}
            className="text-primary-500 hover:text-primary-600 hover:underline flex items-center gap-1 flex-shrink-0"
            onClick={(e) => {
              if (onDocumentClick) {
                e.preventDefault()
                onDocumentClick(context.documentId!)
              }
            }}
          >
            <Icon name="Page" className="w-3 h-3" />
            <span className="truncate max-w-[150px]">{context.documentId}</span>
          </Link>
        )}
        {span.duration && (
          <span className="text-tiny text-default-400 flex-shrink-0">
            {formatDuration(span.duration)}
          </span>
        )}
        {isError && (
          <Chip
            size="sm"
            color="danger"
            variant="flat"
            className="text-tiny h-5"
          >
            {t('Error')}
          </Chip>
        )}
        {/* Navigate to trace details */}
        <Tooltip content={t('View trace details')}>
          <Button
            as={Link}
            to={`/traces/logs/${span.traceId}`}
            size="sm"
            variant="light"
            isIconOnly
            className="min-w-6 w-6 h-6 opacity-60 hover:opacity-100"
          >
            <Icon name="Activity" className="w-3.5 h-3.5" />
          </Button>
        </Tooltip>
      </div>
    )
  },
)

ToolTimelineItem.displayName = 'ToolTimelineItem'

// ============================================================================
// Timeline Tools Display Component
// ============================================================================

/**
 * Displays tool calls in timeline order with nice display names and contextual info.
 * Shows tools inline with clickable document references.
 */
const TimelineToolsDisplay = memo(
  ({
    traceIds,
    onDocumentClick,
  }: {
    traceIds: string[]
    onDocumentClick?: (documentId: string) => void
  }) => {
    const { t } = useI18n(localI18n)
    const { loadTrace, currentTrace, currentSpans, clearCurrentTrace } =
      useTraceStore()
    const {
      isOpen: isTraceModalOpen,
      // onOpen: onTraceModalOpen,
      onClose: onTraceModalClose,
    } = useDisclosure()
    const [allSpans, setAllSpans] = useState<Span[]>([])
    const [_traces, setTraces] = useState<Map<string, Trace>>(new Map())
    const [isLoading, setIsLoading] = useState(true)

    // Load all traces and their spans on mount
    useEffect(() => {
      const loadAllTracesAndSpans = async () => {
        setIsLoading(true)
        const newTraces = new Map<string, Trace>()
        const spans: Span[] = []

        for (const id of traceIds) {
          try {
            await loadTrace(id)
            const { currentTrace: loadedTrace, currentSpans: loadedSpans } =
              useTraceStore.getState()
            if (loadedTrace) {
              newTraces.set(id, loadedTrace)
              // Add spans with their trace context
              spans.push(...loadedSpans)
            }
          } catch (error) {
            console.warn(`Failed to load trace ${id}:`, error)
          }
        }

        // Sort spans by startTime
        spans.sort(
          (a, b) =>
            new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
        )

        setTraces(newTraces)
        setAllSpans(spans)
        clearCurrentTrace()
        setIsLoading(false)
      }
      loadAllTracesAndSpans()
    }, [traceIds, loadTrace, clearCurrentTrace])

    // const handleShowFullTrace = async (traceId: string) => {
    //   await loadTrace(traceId)
    //   onTraceModalOpen()
    // }

    const handleCloseModal = () => {
      onTraceModalClose()
      clearCurrentTrace()
    }

    const formatDuration = (ms?: number) => {
      if (!ms) return '-'
      if (ms < 1000) return `${ms.toFixed(0)}ms`
      return `${(ms / 1000).toFixed(2)}s`
    }

    const getStatusColor = (status: string) => {
      switch (status) {
        case 'completed':
          return 'success'
        case 'error':
          return 'danger'
        case 'running':
          return 'primary'
        default:
          return 'default'
      }
    }

    const getSpanIcon = (type: string) => {
      switch (type) {
        case 'tool':
          return 'Settings'
        case 'retrieval':
          return 'Search'
        case 'llm':
          return 'Sparks'
        default:
          return 'Activity'
      }
    }

    if (traceIds.length === 0) return null

    // Filter to only show tool spans (not LLM spans)
    const toolSpans = allSpans.filter((span) => span.type === 'tool')

    if (isLoading) {
      return (
        <div className="flex items-center gap-2 mb-2 text-tiny text-default-400">
          <Spinner size="sm" />
          <span>{t('Loading…')}</span>
        </div>
      )
    }

    return (
      <>
        {/* Inline tool calls - shown before response */}
        {toolSpans.length > 0 && (
          <div className="mb-3 space-y-1">
            {toolSpans.map((span) => (
              <ToolTimelineItem
                key={span.id}
                span={span}
                onDocumentClick={onDocumentClick}
              />
            ))}
          </div>
        )}

        {/* Summary chip to show all traces */}
        {/* {traces.size > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {Array.from(traces.entries()).map(([traceId, trace]) => (
              <Tooltip
                key={traceId}
                content={
                  <div className="text-tiny max-w-xs">
                    <div className="font-medium">{trace.name}</div>
                    <div className="text-default-400">
                      {t('Duration')}: {formatDuration(trace.duration)}
                    </div>
                    {trace.totalTokens && (
                      <div className="text-default-400">
                        {t('Tokens')}: {trace.totalTokens.toLocaleString()}
                      </div>
                    )}
                  </div>
                }
              >
                <Chip
                  size="sm"
                  variant="dot"
                  color={getStatusColor(trace.status)}
                  className="cursor-pointer hover:opacity-80 transition-opacity text-tiny"
                  onClick={() => handleShowFullTrace(traceId)}
                >
                  {t('View details')}
                </Chip>
              </Tooltip>
            ))}
          </div>
        )} */}

        {/* Trace Detail Modal */}
        <Modal
          isOpen={isTraceModalOpen}
          onClose={handleCloseModal}
          size="2xl"
          scrollBehavior="inside"
        >
          <ModalContent>
            <ModalHeader className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <Icon name="Activity" className="w-5 h-5 text-success-500" />
                <span>{t('Processing Details')}</span>
              </div>
              {currentTrace && (
                <p className="text-sm font-normal text-default-500">
                  {currentTrace.name}
                </p>
              )}
            </ModalHeader>
            <ModalBody>
              {!currentTrace ? (
                <div className="flex justify-center py-8">
                  <Spinner size="lg" />
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Overview */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-default-100 rounded-lg p-3">
                      <p className="text-xs text-default-400">{t('Status')}</p>
                      <Chip
                        size="sm"
                        color={getStatusColor(currentTrace.status)}
                        variant="flat"
                        className="mt-1"
                      >
                        {currentTrace.status}
                      </Chip>
                    </div>
                    <div className="bg-default-100 rounded-lg p-3">
                      <p className="text-xs text-default-400">
                        {t('Duration')}
                      </p>
                      <p className="text-sm font-medium mt-1">
                        {formatDuration(currentTrace.duration)}
                      </p>
                    </div>
                    {currentTrace.totalTokens && (
                      <div className="bg-default-100 rounded-lg p-3">
                        <p className="text-xs text-default-400">
                          {t('Tokens')}
                        </p>
                        <p className="text-sm font-mono mt-1">
                          {currentTrace.totalTokens.toLocaleString()}
                        </p>
                      </div>
                    )}
                    {currentTrace.totalCost && (
                      <div className="bg-default-100 rounded-lg p-3">
                        <p className="text-xs text-default-400">{t('Cost')}</p>
                        <p className="text-sm font-mono mt-1">
                          ${currentTrace.totalCost.totalCost.toFixed(4)}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Input/Output */}
                  {currentTrace.input && (
                    <div>
                      <p className="text-sm font-medium text-default-600 mb-2 flex items-center gap-1">
                        <Icon name="ArrowRight" className="w-4 h-4" />
                        {t('Input')}
                      </p>
                      <pre className="text-xs bg-default-100 p-3 rounded-lg overflow-x-auto whitespace-pre-wrap max-h-32">
                        {currentTrace.input}
                      </pre>
                    </div>
                  )}

                  {currentTrace.output && (
                    <div>
                      <p className="text-sm font-medium text-default-600 mb-2 flex items-center gap-1">
                        <Icon name="ArrowLeft" className="w-4 h-4" />
                        {t('Output')}
                      </p>
                      <pre className="text-xs bg-default-100 p-3 rounded-lg overflow-x-auto whitespace-pre-wrap max-h-48">
                        {currentTrace.output}
                      </pre>
                    </div>
                  )}

                  {/* Spans */}
                  {currentSpans.length > 0 && (
                    <div>
                      <Divider className="my-3" />
                      <p className="text-sm font-medium text-default-600 mb-3 flex items-center gap-1">
                        <Icon name="TableRows" className="w-4 h-4" />
                        {t('Steps')} ({currentSpans.length})
                      </p>
                      <div className="space-y-2">
                        {currentSpans.map((span) => (
                          <div
                            key={span.id}
                            className="bg-default-50 border border-default-200 rounded-lg p-3"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Icon
                                  name={getSpanIcon(span.type)}
                                  className="w-4 h-4 text-default-500"
                                />
                                <span className="text-sm font-medium">
                                  {span.name}
                                </span>
                                <Chip size="sm" variant="flat" color="default">
                                  {span.type}
                                </Chip>
                              </div>
                              <div className="flex items-center gap-2">
                                <Chip
                                  size="sm"
                                  color={getStatusColor(span.status)}
                                  variant="flat"
                                >
                                  {span.status}
                                </Chip>
                                <span className="text-xs text-default-400">
                                  {formatDuration(span.duration)}
                                </span>
                              </div>
                            </div>
                            {span.statusMessage && (
                              <p className="text-xs text-danger mt-2">
                                {span.statusMessage}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {currentTrace.statusMessage && (
                    <div className="p-3 bg-danger-50 dark:bg-danger-900/20 rounded-lg">
                      <p className="text-sm text-danger">
                        {currentTrace.statusMessage}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </ModalBody>
            <ModalFooter>
              <Button variant="flat" onPress={handleCloseModal}>
                {t('Close')}
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </>
    )
  },
)

TimelineToolsDisplay.displayName = 'TimelineToolsDisplay'

// ============================================================================
// Message Content with Sources Component
// ============================================================================

/**
 * Component that renders message content with sources.
 * Uses useTraceSources hook to load sources once and share them between
 * MarkdownRenderer (for inline citations) and SourcesDisplay (for source list).
 */
const MessageContentWithSources = memo(
  ({
    content,
    detectContentType,
    traceIds,
  }: {
    content: string
    detectContentType: (content: string) => string
    traceIds: string[]
  }) => {
    const { citedSources } = useTraceSources({
      traceIds,
      loadTrace: useTraceStore.getState().loadTrace,
      getCurrentSpans: () => useTraceStore.getState().currentSpans,
      clearCurrentTrace: useTraceStore.getState().clearCurrentTrace,
      content,
    })

    return (
      <div className="text-left">
        <div className="prose prose-neutral text-medium break-words">
          {detectContentType(content) === 'marpit-presentation' ? (
            <Widget type="marpit" language="yaml" code={content} />
          ) : (
            <MarkdownRenderer
              content={content}
              className="prose dark:prose-invert"
              sources={citedSources}
            />
          )}
        </div>
      </div>
    )
  },
)

MessageContentWithSources.displayName = 'MessageContentWithSources'

// ============================================================================
// Message Display Component
// ============================================================================

// Component to display a single message with proper agent context
const MessageDisplay = memo(
  ({
    message,
    selectedAgent,
    getMessageAgent,
    detectContentType,
    isPinned,
    onPinClick,
    onLearnClick,
    isLearning,
    conversationId,
  }: {
    message: Message
    selectedAgent: Agent | null
    getMessageAgent: (message: Message) => Promise<Agent | null>
    detectContentType: (content: string) => string
    isPinned: boolean
    onPinClick: (message: Message) => void
    onLearnClick: (message: Message) => void
    isLearning: boolean
    conversationId: string | undefined
  }) => {
    const { t } = useI18n(localI18n)
    const [messageAgent, setMessageAgent] = useState<Agent | null>(null)

    useEffect(() => {
      if (message.role === 'assistant') {
        getMessageAgent(message).then(setMessageAgent)
      }
    }, [message, getMessageAgent])

    const displayAgent = messageAgent || selectedAgent
    const isFromDifferentAgent =
      messageAgent && messageAgent.id !== selectedAgent?.id

    const showPinButton = message.role === 'assistant' && conversationId
    const showLearnButton = message.role === 'assistant' && conversationId

    return (
      <div
        key={message.id}
        data-message-id={message.id}
        aria-hidden="false"
        tabIndex={0}
        className={`flex w-full gap-3 group ${message.role === 'user' ? 'justify-end' : ''}`}
      >
        {/* User message action buttons - shown on hover at start */}
        {message.role === 'user' && (
          <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
            <Tooltip content={t('Copy prompt')}>
              <Button
                size="sm"
                variant="light"
                color="default"
                isIconOnly
                onPress={async () => {
                  await copyRichText(message.content)
                  successToast(t('Prompt copied to clipboard'))
                }}
              >
                <Icon name="Copy" className="w-4 h-4" />
              </Button>
            </Tooltip>
          </div>
        )}
        <div
          className={`rounded-medium text-foreground relative overflow-hidden font-medium ${
            message.role === 'user'
              ? 'bg-default-100 px-4 py-3 max-w-[80%]'
              : 'bg-transparent px-1 py-0'
          } ${isPinned ? 'border-l-4 border-warning-400 pl-4' : ''}`}
        >
          {/* Pinned indicator chip */}
          {isPinned && (
            <div className="mb-2">
              <Chip
                size="sm"
                variant="flat"
                color="warning"
                startContent={<Pin className="w-3 h-3" />}
                className="text-tiny"
              >
                {t('Pinned')}
              </Chip>
            </div>
          )}
          {/* Show agent name if different from current agent */}
          {isFromDifferentAgent && displayAgent && (
            <div className="mb-2">
              <Chip
                size="sm"
                variant="flat"
                color="primary"
                className="text-tiny"
              >
                {displayAgent.name}
              </Chip>
            </div>
          )}
          {/* Tool calls timeline - shown BEFORE response since tools execute first */}
          {message.role === 'assistant' &&
            message.traceIds &&
            message.traceIds.length > 0 && (
              <TimelineToolsDisplay traceIds={message.traceIds} />
            )}
          <MessageContentWithSources
            content={message.content}
            detectContentType={detectContentType}
            traceIds={message.traceIds || []}
          />
          {/* Assistant message action buttons */}
          {message.role === 'assistant' && (
            <div className="mt-2 flex flex-wrap items-center gap-1">
              <Tooltip content={t('Copy the answer')}>
                <Button
                  size="sm"
                  variant="light"
                  color="default"
                  isIconOnly
                  onPress={async () => {
                    await copyRichText(message.content)
                    successToast(t('Answer copied to clipboard'))
                  }}
                >
                  <Icon name="Copy" className="w-4 h-4" />
                </Button>
              </Tooltip>
              {showLearnButton && (
                <Tooltip content={t('Learn from this message')}>
                  <Button
                    size="sm"
                    variant="light"
                    // color="secondary"
                    isIconOnly
                    isLoading={isLearning}
                    onPress={() => onLearnClick(message)}
                  >
                    <Icon name="Brain" className="w-4 h-4" />
                  </Button>
                </Tooltip>
              )}
              {showPinButton && (
                <Tooltip
                  content={isPinned ? t('Unpin message') : t('Pin message')}
                >
                  <Button
                    size="sm"
                    variant={isPinned ? 'flat' : 'light'}
                    color={isPinned ? 'warning' : 'default'}
                    isIconOnly
                    onPress={() => onPinClick(message)}
                  >
                    {isPinned ? (
                      <PinSlash className="w-4 h-4" />
                    ) : (
                      <Pin className="w-4 h-4" />
                    )}
                  </Button>
                </Tooltip>
              )}
            </div>
          )}
        </div>
      </div>
    )
  },
)

MessageDisplay.displayName = 'MessageDisplay'

// Component to display artifacts in side panel
const ArtifactWidget = memo(({ artifact }: { artifact: Artifact }) => {
  const characterCount = artifact.content.length
  const statusColor =
    artifact.status === 'approved' || artifact.status === 'final'
      ? 'success'
      : artifact.status === 'rejected'
        ? 'danger'
        : 'warning'

  return (
    <Card className="mb-3">
      <CardBody className="p-3">
        <Accordion selectionMode="single" className="px-0">
          <AccordionItem
            key={artifact.id}
            aria-label={artifact.title}
            title={
              <div className="flex justify-between items-center w-full">
                <div className="flex flex-col items-start">
                  <span className="font-medium text-sm">{artifact.title}</span>
                  <div className="flex gap-2 mt-1">
                    <Chip
                      size="sm"
                      variant="flat"
                      color={statusColor}
                      className="text-tiny"
                    >
                      {artifact.status}
                    </Chip>
                    <Chip
                      size="sm"
                      variant="flat"
                      color="default"
                      className="text-tiny"
                    >
                      {artifact.type}
                    </Chip>
                  </div>
                </div>
                <div className="text-tiny text-default-500">
                  {characterCount.toLocaleString()} chars
                </div>
              </div>
            }
          >
            <div className="space-y-3">
              {artifact.description && (
                <div>
                  <span className="text-tiny font-medium text-default-700">
                    Description:
                  </span>
                  <p className="text-small text-default-600 mt-1">
                    {artifact.description}
                  </p>
                </div>
              )}
              <div>
                <span className="text-tiny font-medium text-default-700">
                  Content:
                </span>
                <div className="mt-1 p-2 bg-default-100 rounded-small max-h-48 overflow-y-auto">
                  <MarkdownRenderer
                    content={artifact.content}
                    className="prose dark:prose-invert prose-sm text-small"
                  />
                </div>
              </div>
              <div className="flex justify-between text-tiny text-default-500">
                <span>
                  Created: {new Date(artifact.createdAt).toLocaleDateString()}
                </span>
                <span>v{artifact.version}</span>
              </div>
            </div>
          </AccordionItem>
        </Accordion>
      </CardBody>
    </Card>
  )
})

ArtifactWidget.displayName = 'ArtifactWidget'

// Component to display a single inline memory with review actions
const InlineMemoryDisplay = memo(
  ({
    memory,
    onApprove,
    onReject,
    onEdit,
    onRemoveFromList,
  }: {
    memory: AgentMemoryEntry
    onApprove: (id: string) => Promise<void>
    onReject: (id: string) => Promise<void>
    onEdit: (id: string, newContent: string, newTitle?: string) => Promise<void>
    onRemoveFromList: (id: string) => void
  }) => {
    const { t } = useI18n()
    const [isEditing, setIsEditing] = useState(false)
    const [editContent, setEditContent] = useState(memory.content)
    const [editTitle, setEditTitle] = useState(memory.title)
    const [isProcessing, setIsProcessing] = useState(false)

    const getCategoryColor = (category: string) => {
      switch (category) {
        case 'fact':
          return 'primary'
        case 'preference':
          return 'secondary'
        case 'behavior':
          return 'warning'
        case 'domain_knowledge':
          return 'success'
        case 'relationship':
          return 'danger'
        case 'procedure':
          return 'default'
        case 'correction':
          return 'warning'
        default:
          return 'default'
      }
    }

    // const getConfidenceColor = (confidence: string) => {
    //   switch (confidence) {
    //     case 'high':
    //       return 'success'
    //     case 'medium':
    //       return 'warning'
    //     case 'low':
    //       return 'danger'
    //     default:
    //       return 'default'
    //   }
    // }

    const handleApprove = async () => {
      setIsProcessing(true)
      try {
        await onApprove(memory.id)
        onRemoveFromList(memory.id)
      } finally {
        setIsProcessing(false)
      }
    }

    const handleReject = async () => {
      setIsProcessing(true)
      try {
        await onReject(memory.id)
        onRemoveFromList(memory.id)
      } finally {
        setIsProcessing(false)
      }
    }

    const handleStartEdit = () => {
      setIsEditing(true)
      setEditContent(memory.content)
      setEditTitle(memory.title)
    }

    const handleCancelEdit = () => {
      setIsEditing(false)
      setEditContent(memory.content)
      setEditTitle(memory.title)
    }

    const handleSaveEdit = async () => {
      setIsProcessing(true)
      try {
        await onEdit(memory.id, editContent, editTitle)
        onRemoveFromList(memory.id)
        setIsEditing(false)
      } finally {
        setIsProcessing(false)
      }
    }

    // const formattedTime = new Date(memory.learnedAt).toLocaleTimeString([], {
    //   hour: '2-digit',
    //   minute: '2-digit',
    // })

    return (
      <div className="flex w-full gap-3 animate-appearance-in">
        <div className="w-full">
          <div className="border-l-4 border-secondary-400 dark:border-secondary-600 pl-4 py-2 bg-secondary-50/50 dark:bg-secondary-900/20 rounded-r-lg pr-2">
            <div className="flex justify-between items-start">
              {/* Header with icon and timestamp */}
              <div className="flex items-center gap-2 mb-2">
                <Icon name="Brain" className="w-4 h-4 text-secondary-500" />
                <span className="text-tiny font-medium text-secondary-600 dark:text-secondary-400">
                  {t('Insight')}
                </span>
                <Chip
                  size="sm"
                  variant="flat"
                  color={getCategoryColor(memory.category)}
                  className="text-tiny"
                >
                  {t(categoryLabels[memory.category as MemoryCategory] as any)}
                </Chip>
              </div>

              {/* Action buttons */}
              <ButtonGroup isIconOnly size="sm" variant="flat">
                <Tooltip content={t('Edit')}>
                  <Button
                    color="default"
                    startContent={
                      <Icon name="EditPencil" className="w-3 h-3" />
                    }
                    onPress={handleStartEdit}
                  />
                </Tooltip>
                <Tooltip content={t('Forget')}>
                  <Button
                    color="danger"
                    startContent={<Icon name="Xmark" className="w-3 h-3" />}
                    isLoading={isProcessing}
                    onPress={handleReject}
                  />
                </Tooltip>
                <Tooltip content={t('Memorize')}>
                  <Button
                    variant="solid"
                    color="success"
                    startContent={<Icon name="Check" className="w-3 h-3" />}
                    isLoading={isProcessing}
                    onPress={handleApprove}
                  />
                </Tooltip>
              </ButtonGroup>
            </div>

            {isEditing ? (
              // Edit mode
              <div className="space-y-3">
                <Input
                  label={t('Title')}
                  value={editTitle}
                  onValueChange={setEditTitle}
                  size="sm"
                  variant="bordered"
                />
                <Textarea
                  label={t('Content')}
                  value={editContent}
                  onValueChange={setEditContent}
                  minRows={2}
                  size="sm"
                  variant="bordered"
                />
                <div className="flex gap-2 justify-end">
                  <Button size="sm" variant="flat" onPress={handleCancelEdit}>
                    {t('Cancel')}
                  </Button>
                  <Button
                    size="sm"
                    color="success"
                    isLoading={isProcessing}
                    onPress={handleSaveEdit}
                  >
                    {t('Save & Approve')}
                  </Button>
                </div>
              </div>
            ) : (
              // View mode
              <div className="flex gap-3">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{memory.title}</span>
                    {/* <Chip
                      size="sm"
                      variant="dot"
                      color={getConfidenceColor(memory.confidence) as any}
                      className="text-tiny"
                    >
                      {memory.confidence}
                    </Chip> */}
                  </div>
                  <p className="text-sm text-default-600">{memory.content}</p>
                  {/* {memory.keywords.length > 0 && (
                    <div className="flex gap-1 flex-wrap">
                      {memory.keywords.slice(0, 5).map((keyword, idx) => (
                        <Chip
                          key={idx}
                          size="sm"
                          variant="bordered"
                          className="text-tiny"
                        >
                          {keyword}
                        </Chip>
                      ))}
                    </div>
                  )} */}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  },
)

InlineMemoryDisplay.displayName = 'InlineMemoryDisplay'

export const AgentRunPage = () => {
  const { t, lang, url } = useI18n(localI18n)
  const location = useLocation()
  const navigate = useNavigate()

  const [prompt, setPrompt] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [response, setResponse] = useState<string>('')
  const [currentStatus, setCurrentStatus] = useState<ResponseStatus | null>(
    null,
  )
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [conversationMessages, setConversationMessages] = useState<Message[]>(
    [],
  )
  const [agentCache, setAgentCache] = useState<Record<string, Agent>>({})
  const [_conversationArtifacts, setConversationArtifacts] = useState<
    Artifact[]
  >([])

  const {
    currentConversation,
    createConversation,
    loadConversation,
    clearCurrentConversation,
  } = useConversationStore()

  const { artifacts, loadArtifacts } = useArtifactStore()

  // Pinned message state
  const {
    loadPinnedMessagesForConversation,
    createPinnedMessage,
    deletePinnedMessageByMessageId,
    isPinned: checkIsPinned,
  } = usePinnedMessageStore()

  // Setup contextual panel with agent context
  useAgentContextPanel(selectedAgent, currentConversation?.id, setSelectedAgent)

  const [learningMessageId, setLearningMessageId] = useState<string | null>(
    null,
  )
  const [newlyLearnedMemories, setNewlyLearnedMemories] = useState<
    AgentMemoryEntry[]
  >([])

  // Quick replies state
  const [quickReplies, setQuickReplies] = useState<string[]>([])
  const [isGeneratingReplies, setIsGeneratingReplies] = useState(false)

  // Pin modal state
  const {
    isOpen: isPinModalOpen,
    onOpen: onPinModalOpen,
    onClose: onPinModalClose,
  } = useDisclosure()
  const [messageToPin, setMessageToPin] = useState<Message | null>(null)
  const [pinDescription, setPinDescription] = useState('')
  const [isPinning, setIsPinning] = useState(false)
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false)

  // Appearance modal state
  const {
    isOpen: isAppearanceModalOpen,
    onOpen: onAppearanceModalOpen,
    onClose: onAppearanceModalClose,
  } = useDisclosure()
  const [editingIcon, setEditingIcon] = useState<IconName | undefined>()
  const [editingColor, setEditingColor] = useState<AgentColor | undefined>()
  const [editingPortrait, setEditingPortrait] = useState<string | undefined>()
  const [isSavingAppearance, setIsSavingAppearance] = useState(false)

  const isConversationPristine = useMemo(
    () => !(Number(currentConversation?.messages.length) > 0),
    [currentConversation],
  )

  // Load pending review memories when agent/conversation loads
  // Filter to only show memories from the current conversation
  useEffect(() => {
    const loadPendingMemories = async () => {
      if (selectedAgent && currentConversation?.id) {
        const { loadMemoriesForAgent, getPendingReviewMemories } =
          useAgentMemoryStore.getState()
        try {
          // First ensure memories are loaded from DB
          await loadMemoriesForAgent(selectedAgent.id)
          // Then get pending review memories filtered by current conversation
          const pendingMemories = getPendingReviewMemories(selectedAgent.id)
          const conversationMemories = pendingMemories.filter((m) =>
            m.sourceConversationIds?.includes(currentConversation.id),
          )
          setNewlyLearnedMemories(conversationMemories)
        } catch (error) {
          console.warn('Failed to load pending memories:', error)
        }
      } else {
        // Clear memories if no conversation
        setNewlyLearnedMemories([])
      }
    }
    loadPendingMemories()
  }, [selectedAgent?.id, currentConversation?.id])

  // Load pinned messages when conversation changes
  useEffect(() => {
    if (currentConversation?.id) {
      loadPinnedMessagesForConversation(currentConversation.id)
    }
  }, [currentConversation?.id, loadPinnedMessagesForConversation])

  // Handle pin button click
  const handlePinClick = useCallback(
    async (message: Message) => {
      if (!currentConversation?.id || !selectedAgent?.id) return

      const isAlreadyPinned = checkIsPinned(message.id)

      if (isAlreadyPinned) {
        // Unpin the message
        await deletePinnedMessageByMessageId(message.id)
      } else {
        // Open modal to pin with description
        setMessageToPin(message)
        setPinDescription('')
        setIsGeneratingDescription(true)
        onPinModalOpen()

        // Generate description in background
        try {
          const result = await MessageDescriptionGenerator.generateDescription(
            message.content,
            conversationMessages.slice(-5),
          )
          setPinDescription(result.description)
        } catch (error) {
          console.warn('Failed to generate description:', error)
          setPinDescription('')
        } finally {
          setIsGeneratingDescription(false)
        }
      }
    },
    [
      currentConversation?.id,
      selectedAgent?.id,
      checkIsPinned,
      deletePinnedMessageByMessageId,
      conversationMessages,
      onPinModalOpen,
    ],
  )

  // Handle pin submission
  const handlePinSubmit = useCallback(async () => {
    if (!messageToPin || !currentConversation?.id || !selectedAgent?.id) return

    setIsPinning(true)
    try {
      // Generate keywords
      let keywords: string[] = []
      try {
        const result = await MessageDescriptionGenerator.generateDescription(
          messageToPin.content,
          conversationMessages.slice(-5),
        )
        keywords = result.keywords
      } catch {
        keywords = []
      }

      await createPinnedMessage({
        conversationId: currentConversation.id,
        messageId: messageToPin.id,
        agentId: selectedAgent.id,
        content: messageToPin.content,
        description: pinDescription || 'Pinned message',
        keywords,
        pinnedAt: new Date(),
      })

      successToast(t('Message pinned successfully'))
      onPinModalClose()
      setMessageToPin(null)
      setPinDescription('')
    } catch (error) {
      errorToast('Failed to pin message')
      console.error('Pin error:', error)
    } finally {
      setIsPinning(false)
    }
  }, [
    messageToPin,
    currentConversation?.id,
    selectedAgent?.id,
    pinDescription,
    conversationMessages,
    createPinnedMessage,
    onPinModalClose,
    t,
  ])

  // Handle learn from message click
  const handleLearnClick = useCallback(
    async (message: Message) => {
      if (!currentConversation?.id || !selectedAgent?.id) return
      if (learningMessageId) return // Already learning from another message

      // Find the user message that precedes this assistant message
      const messageIndex = conversationMessages.findIndex(
        (m) => m.id === message.id,
      )
      if (messageIndex < 1) {
        errorToast('Cannot learn from this message - no preceding user message')
        return
      }

      const userMessage = conversationMessages[messageIndex - 1]
      if (userMessage.role !== 'user') {
        errorToast('Cannot learn from this message - no preceding user message')
        return
      }

      setLearningMessageId(message.id)
      try {
        const events = await learnFromMessage(
          userMessage.content,
          message.content,
          selectedAgent.id,
          currentConversation.id,
          lang,
        )

        if (events.length > 0) {
          const learnedMemories = await processPendingLearningEvents(
            selectedAgent.id,
          )
          // Add newly learned memories to display inline
          if (learnedMemories.length > 0) {
            setNewlyLearnedMemories((prev) => [...prev, ...learnedMemories])
            successToast(
              t('{count} insights extracted', {
                count: learnedMemories.length,
              }),
            )
          }
        } else {
          successToast(t('No new insights found in this message'))
        }
      } catch (error) {
        console.error('Memory learning failed:', error)
        errorToast('Failed to learn from message')
      } finally {
        setLearningMessageId(null)
      }
    },
    [
      currentConversation?.id,
      selectedAgent?.id,
      conversationMessages,
      learningMessageId,
      lang,
      t,
    ],
  )

  const handleOpenAppearanceModal = useCallback(() => {
    if (selectedAgent) {
      setEditingIcon(selectedAgent.icon)
      setEditingColor(selectedAgent.color)
      setEditingPortrait(selectedAgent.portrait)
      onAppearanceModalOpen()
    }
  }, [selectedAgent, onAppearanceModalOpen])

  const handleSaveAppearance = useCallback(async () => {
    if (!selectedAgent) return

    setIsSavingAppearance(true)
    try {
      const updatedAgent = await updateAgent(selectedAgent.id, {
        icon: editingIcon,
        color: editingColor,
        portrait: editingPortrait,
      })
      setSelectedAgent(updatedAgent)
      successToast(t('Appearance updated successfully'))
      onAppearanceModalClose()
    } catch (error) {
      console.error('Failed to update appearance:', error)
      errorToast('Failed to update appearance')
    } finally {
      setIsSavingAppearance(false)
    }
  }, [
    selectedAgent,
    editingIcon,
    editingColor,
    editingPortrait,
    t,
    onAppearanceModalClose,
  ])

  const header: HeaderProps = useMemo(
    () => ({
      icon: {
        name: selectedAgent?.icon ?? 'User',
        color:
          selectedAgent?.id === 'devs'
            ? ''
            : `text-${selectedAgent?.color ?? 'default'}-500 bg-${selectedAgent?.color ?? 'default'}-100 p-2 rounded-lg`,
        image: selectedAgent?.portrait,
        // Only allow editing for custom agents (ID starts with 'custom-')
        isEditable: true,
        onEdit: handleOpenAppearanceModal,
      },
      title: selectedAgent?.i18n?.[lang]?.name ?? selectedAgent?.name ?? '…',
      subtitle:
        selectedAgent?.i18n?.[lang]?.desc ||
        selectedAgent?.desc ||
        selectedAgent?.role,
      cta: {
        label: t('New chat'),
        href: url(`/agents/start#${selectedAgent?.slug}`),
        icon: 'Plus',
      },
    }),
    [
      selectedAgent?.icon,
      selectedAgent?.name,
      selectedAgent?.i18n,
      selectedAgent?.id,
      selectedAgent?.color,
      handleOpenAppearanceModal,
      t,
      lang,
      url,
    ],
  )

  // Parse the hash to get agentSlug and optional conversationId
  const parseHash = useCallback(() => {
    const hash = location.hash.replace('#', '')
    // Check if there's a query string in the hash (e.g., #agentSlug/convId?message=msgId)
    const [hashPart, queryPart] = hash.split('?')
    const parts = hashPart.split('/')

    // Parse query parameters
    const queryParams = new URLSearchParams(queryPart || '')
    const targetMessageId = queryParams.get('message')

    return {
      agentSlug: parts[0] || 'devs',
      conversationId: parts[1] || null,
      targetMessageId,
    }
  }, [location.hash])

  const { agentSlug, conversationId, targetMessageId } = useMemo(
    () => parseHash(),
    [parseHash],
  )

  // Helper function to detect content type
  const detectContentType = useCallback((content: string) => {
    // Check for Marpit presentation by looking for YAML frontmatter with marp: true
    const yamlFrontmatterRegex = /^---\s*\n([\s\S]*?)\n---/
    const match = content.match(yamlFrontmatterRegex)

    if (match) {
      const frontmatter = match[1]
      if (
        frontmatter.includes('marp: true') ||
        frontmatter.includes('marp:true')
      ) {
        return 'marpit-presentation'
      }
    }

    return 'markdown'
  }, [])

  // Helper function to get agent for a message
  const getMessageAgent = useCallback(
    async (message: Message): Promise<Agent | null> => {
      if (message.role !== 'assistant') return null

      const messageAgentId = message.agentId || selectedAgent?.id
      if (!messageAgentId) return selectedAgent

      // Check cache first
      if (agentCache[messageAgentId]) {
        return agentCache[messageAgentId]
      }

      // Fetch and cache the agent
      try {
        const agent = await getAgentById(messageAgentId)
        if (agent) {
          setAgentCache((prev) => ({ ...prev, [messageAgentId]: agent }))
          return agent
        }
      } catch (error) {
        console.warn(`Failed to load agent ${messageAgentId}:`, error)
      }

      return selectedAgent
    },
    [selectedAgent, agentCache],
  )

  // Load agent and conversation on mount
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      // Clear previous conversation messages immediately to prevent showing stale data
      setConversationMessages([])
      setNewlyLearnedMemories([])

      try {
        // Load the specified agent by slug
        const agent = await getAgentBySlug(agentSlug)
        if (!agent) {
          notifyError({
            title: 'Agent Not Found',
            description: `Agent "${agentSlug}" not found`,
          })
          navigate('/')
          return
        }
        setSelectedAgent(agent)

        // If conversationId is provided, try to load that specific conversation
        if (conversationId) {
          try {
            const loadedConversation = await loadConversation(conversationId)
            // Use the returned conversation directly instead of relying on store state
            if (loadedConversation?.messages) {
              setConversationMessages(loadedConversation.messages)
            }
          } catch (error) {
            console.warn(
              `Conversation ${conversationId} not found, will create new one when user sends first message`,
            )
            setConversationMessages([])
          }
        } else {
          // Clear current conversation since we're starting with a specific agent
          clearCurrentConversation()
          setConversationMessages([])
          setNewlyLearnedMemories([]) // Clear learned memories for new conversation
        }

        // Check for pending prompt from Index page
        const pendingPrompt = sessionStorage.getItem('pendingPrompt')
        const pendingAgentData = sessionStorage.getItem('pendingAgent')
        const pendingFilesData = sessionStorage.getItem('pendingFiles')

        if (pendingPrompt && pendingAgentData) {
          const pendingAgent = JSON.parse(pendingAgentData)
          const pendingFiles = pendingFilesData
            ? JSON.parse(pendingFilesData)
            : []

          // Clear the session storage
          sessionStorage.removeItem('pendingPrompt')
          sessionStorage.removeItem('pendingAgent')
          sessionStorage.removeItem('pendingFiles')

          // Set the prompt and auto-submit if the agent matches
          if (pendingAgent.id === agent.id) {
            // setPrompt(pendingPrompt)

            // Auto-submit after a short delay to ensure everything is loaded
            setTimeout(() => {
              handleAutoSubmit(pendingPrompt, agent, pendingFiles)
            }, 100)
          }
        }
      } catch (error) {
        console.error('Error loading agent/conversation:', error)
        notifyError({
          title: 'Loading Error',
          description: 'Failed to load agent or conversation',
        })
        navigate('/')
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [
    agentSlug,
    conversationId,
    loadConversation,
    createConversation,
    navigate,
  ])

  // Update conversation messages when currentConversation changes
  useEffect(() => {
    if (currentConversation?.messages) {
      setConversationMessages(currentConversation.messages)
    }
  }, [currentConversation])

  // Scroll to target message when navigating from pinned messages
  useEffect(() => {
    if (targetMessageId && conversationMessages.length > 0 && !isLoading) {
      // Small delay to ensure DOM is rendered
      const timeoutId = setTimeout(() => {
        const messageElement = document.querySelector(
          `[data-message-id="${targetMessageId}"]`,
        )
        if (messageElement) {
          messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
          // Add a highlight effect
          messageElement.classList.add(
            'ring-2',
            'ring-warning-400',
            'ring-offset-2',
            'rounded-lg',
          )
          // Remove highlight after a few seconds
          setTimeout(() => {
            messageElement.classList.remove(
              'ring-2',
              'ring-warning-400',
              'ring-offset-2',
              'rounded-lg',
            )
          }, 3000)
        }
      }, 100)
      return () => clearTimeout(timeoutId)
    }
  }, [targetMessageId, conversationMessages.length, isLoading])

  // Update URL hash when conversation ID becomes available
  // Only update when there's no conversationId in the URL yet (new conversation created)
  useEffect(() => {
    if (currentConversation?.id && selectedAgent?.slug) {
      // Read hash directly to check current URL state
      // Note: We intentionally read location.hash inside the effect (not in deps)
      // to avoid infinite loops when navigate() updates the hash
      const hash = location.hash.replace('#', '')
      const [hashPart] = hash.split('?')
      const parts = hashPart.split('/')
      const urlConversationId = parts[1] || null

      // Only update hash if there's no conversation ID in the URL yet
      // This prevents navigation loops when switching between existing conversations
      if (!urlConversationId) {
        const newHash = `#${selectedAgent.slug}/${currentConversation.id}`
        navigate(newHash, { replace: true })
      }
    }
  }, [currentConversation?.id, selectedAgent?.slug, navigate])

  // Load artifacts on mount
  useEffect(() => {
    loadArtifacts()
  }, [loadArtifacts])

  // Update conversation artifacts when artifacts or current conversation changes
  useEffect(() => {
    if (!currentConversation || !artifacts.length) {
      setConversationArtifacts([])
      return
    }

    // Get artifacts created by any agent participating in this conversation
    const participatingAgents = currentConversation.participatingAgents || [
      currentConversation.agentId,
    ]
    const relatedArtifacts = artifacts.filter((artifact) =>
      participatingAgents.includes(artifact.agentId),
    )

    setConversationArtifacts(relatedArtifacts)
  }, [artifacts, currentConversation])

  // Generate quick reply suggestions based on conversation
  const generateQuickReplies = useCallback(
    async (lastAssistantMessage: string, recentMessages: Message[]) => {
      if (!selectedAgent) return

      setIsGeneratingReplies(true)
      setQuickReplies([])

      try {
        const { LLMService } = await import('@/lib/llm')
        const { CredentialService } = await import('@/lib/credential-service')

        const config = await CredentialService.getActiveConfig()
        if (!config?.provider || !config?.apiKey) {
          return
        }

        // Build context from recent messages
        const contextMessages = recentMessages
          .slice(-4)
          .map(
            (m) =>
              `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content.slice(0, 200)}`,
          )
          .join('\n')

        const systemPrompt = `You are a helpful assistant that generates quick reply suggestions for a conversation.
Based on the assistant's last response, generate exactly 3 short, natural follow-up questions or responses that the user might want to send next.

Rules:
- Each suggestion should be 3-10 words maximum
- Make them diverse: one clarifying question, one action request, one exploration
- Be conversational and natural
- Match the language used in the conversation (if French, respond in French, etc.)
- Return ONLY a JSON array of 3 strings, nothing else

Example output: ["Tell me more about that", "Can you give an example?", "How do I get started?"]`

        const userPrompt = `Recent conversation:\n${contextMessages}\n\nLast assistant response:\n${lastAssistantMessage.slice(0, 500)}\n\nGenerate 3 quick reply suggestions:`

        const response = await LLMService.chat(
          [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          {
            provider: config.provider,
            apiKey: config.apiKey,
            model: config.model,
            temperature: 0.7,
            maxTokens: 150,
          },
        )

        // Parse JSON response
        const content = response.content.trim()
        // Try to extract JSON array from response
        const jsonMatch = content.match(/\[.*\]/s)
        if (jsonMatch) {
          const suggestions = JSON.parse(jsonMatch[0]) as string[]
          if (Array.isArray(suggestions) && suggestions.length > 0) {
            setQuickReplies(suggestions.slice(0, 3))
          }
        }
      } catch (error) {
        console.warn('Failed to generate quick replies:', error)
      } finally {
        setIsGeneratingReplies(false)
      }
    },
    [selectedAgent],
  )

  // Auto-submit handler for prompts from Index page
  const handleAutoSubmit = useCallback(
    async (
      promptText: string,
      agent: Agent,
      files: Array<{
        name: string
        type: string
        size: number
        data: string
      }> = [],
    ) => {
      if (isSending) return

      setIsSending(true)
      setResponse('')
      setCurrentStatus(null)
      setPrompt('')

      let finalResponse = ''
      await submitChat({
        prompt: promptText,
        agent,
        conversationMessages,
        includeHistory: true,
        clearResponseAfterSubmit: true,
        attachments: files,
        lang,
        t,
        onResponseUpdate: (update: ResponseUpdate) => {
          if (update.type === 'content') {
            finalResponse = update.content
            setResponse(update.content)
            setCurrentStatus(null) // Clear status when content arrives
          } else {
            setCurrentStatus(update.status)
          }
        },
        onPromptClear: () => setPrompt(''),
        onResponseClear: () => {
          setResponse('')
          setCurrentStatus(null)
        },
      })

      setIsSending(false)

      // Generate quick replies after response completes
      if (finalResponse) {
        generateQuickReplies(finalResponse, conversationMessages)
      }
    },
    [isSending, conversationMessages, lang, t, generateQuickReplies],
  )

  // Helper function to convert File to base64
  const fileToBase64 = useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => {
        const result = reader.result as string
        // Remove the data URL prefix (data:mime/type;base64,)
        resolve(result.split(',')[1])
      }
      reader.onerror = reject
    })
  }, [])

  const onSubmit = useCallback(
    async (cleanedPrompt?: string, mentionedAgent?: Agent) => {
      const promptToUse = cleanedPrompt ?? prompt
      // Use mentioned agent if provided, otherwise fall back to selected agent
      const agentToUse = mentionedAgent || selectedAgent
      if (!promptToUse.trim() || isSending || !agentToUse) return

      setIsSending(true)
      setPrompt('')
      setResponse('')
      setCurrentStatus(null)

      // Convert files to base64 for LLM processing
      const filesData = await Promise.all(
        selectedFiles.map(async (file) => ({
          name: file.name,
          type: file.type,
          size: file.size,
          data: await fileToBase64(file),
        })),
      )

      // Clear quick replies when starting new message
      setQuickReplies([])

      let finalResponse = ''
      await submitChat({
        prompt: promptToUse,
        agent: agentToUse,
        conversationMessages,
        includeHistory: true,
        clearResponseAfterSubmit: true,
        attachments: filesData,
        lang,
        t,
        onResponseUpdate: (update: ResponseUpdate) => {
          if (update.type === 'content') {
            finalResponse = update.content
            setResponse(update.content)
            setCurrentStatus(null) // Clear status when content arrives
          } else {
            setCurrentStatus(update.status)
          }
        },
        onPromptClear: () => setPrompt(''),
        onResponseClear: () => {
          setResponse('')
          setCurrentStatus(null)
        },
      })

      // Clear files after submission
      setSelectedFiles([])
      setIsSending(false)

      // Generate quick replies after response completes
      if (finalResponse) {
        generateQuickReplies(finalResponse, conversationMessages)
      }
    },
    [
      prompt,
      isSending,
      selectedAgent,
      conversationMessages,
      selectedFiles,
      fileToBase64,
      lang,
      t,
      generateQuickReplies,
    ],
  )

  // Create memory action handlers to avoid repetition
  const memoryActions = useMemo(
    () => ({
      onApprove: async (id: string) => {
        const { approveMemory } = useAgentMemoryStore.getState()
        await approveMemory(id)
      },
      onReject: async (id: string) => {
        const { rejectMemory } = useAgentMemoryStore.getState()
        await rejectMemory(id)
      },
      onEdit: async (id: string, newContent: string, newTitle?: string) => {
        const { updateMemory, approveMemory } = useAgentMemoryStore.getState()
        await updateMemory(id, {
          content: newContent,
          ...(newTitle && { title: newTitle }),
        })
        await approveMemory(id, 'Edited during review')
      },
      onRemoveFromList: (id: string) =>
        setNewlyLearnedMemories((prev) => prev.filter((m) => m.id !== id)),
    }),
    [],
  )

  // Build timeline items: combine messages and memories, sorted by timestamp
  // Filter out system messages as they are displayed in the context panel
  const timelineItems = useMemo((): TimelineItem[] => {
    const messageItems: TimelineItem[] = conversationMessages
      .filter((message) => message.role !== 'system')
      .map((message) => ({
        type: 'message' as const,
        data: message,
        timestamp: new Date(message.timestamp),
      }))

    const memoryItems: TimelineItem[] = newlyLearnedMemories.map((memory) => ({
      type: 'memory' as const,
      data: memory,
      timestamp: new Date(memory.learnedAt),
    }))

    // Combine and sort by timestamp
    return [...messageItems, ...memoryItems].sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
    )
  }, [conversationMessages, newlyLearnedMemories])

  if (isLoading) {
    return (
      <DefaultLayout header={header}>
        <Section mainClassName="text-center">
          <div className="flex flex-col items-center justify-center min-h-[50vh]">
            <Spinner size="lg" color="primary" />
            <p className="mt-4 text-default-500">
              {t('Loading agent and conversation…')}
            </p>
          </div>
        </Section>
      </DefaultLayout>
    )
  }

  return (
    <DefaultLayout title={selectedAgent?.name} header={header}>
      <div className="px-6 lg:px-8 pb-16">
        <div className="max-w-4xl mx-auto py-6">
          <Container>
            {/* Display timeline: messages and memories interleaved by timestamp */}
            {timelineItems.length > 0 && (
              <div className="duration-600 relative flex flex-col gap-6">
                {timelineItems.map((item) =>
                  item.type === 'message' ? (
                    <MessageDisplay
                      key={item.data.id}
                      message={item.data}
                      selectedAgent={selectedAgent}
                      getMessageAgent={getMessageAgent}
                      detectContentType={detectContentType}
                      isPinned={checkIsPinned(item.data.id)}
                      onPinClick={handlePinClick}
                      onLearnClick={handleLearnClick}
                      isLearning={learningMessageId === item.data.id}
                      conversationId={currentConversation?.id}
                    />
                  ) : (
                    <InlineMemoryDisplay
                      key={item.data.id}
                      memory={item.data}
                      onApprove={memoryActions.onApprove}
                      onReject={memoryActions.onReject}
                      onEdit={memoryActions.onEdit}
                      onRemoveFromList={memoryActions.onRemoveFromList}
                    />
                  ),
                )}

                {/* Display streaming response */}
                {(response || currentStatus) && (
                  <div
                    aria-hidden="false"
                    tabIndex={0}
                    className="flex w-full gap-3"
                  >
                    <div className="relative flex-none">
                      <div className="border-1 border-default-300 dark:border-default-200 flex h-7 w-7 items-center justify-center rounded-full">
                        <Icon
                          name={(selectedAgent?.icon as any) || 'Sparks'}
                          className="w-4 h-4 text-default-600"
                        />
                      </div>
                    </div>
                    <div className="rounded-medium text-foreground group relative w-full overflow-hidden font-medium bg-transparent px-1 py-0">
                      <div className="text-small">
                        <div className="prose prose-neutral text-medium break-words">
                          {response &&
                            (detectContentType(response) ===
                            'marpit-presentation' ? (
                              <Widget
                                type="marpit"
                                language="yaml"
                                code={response}
                              />
                            ) : (
                              <MarkdownRenderer
                                content={response}
                                className="prose dark:prose-invert prose-sm"
                              />
                            ))}
                          {/* Display status with icon */}
                          {currentStatus && (
                            <div className="flex items-center gap-2 mt-2 text-default-500 italic">
                              <Icon
                                name={currentStatus.icon}
                                className="w-4 h-4 animate-pulse"
                              />
                              <span>
                                {t(
                                  currentStatus.i18nKey as any,
                                  currentStatus.vars,
                                )}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Quick reply suggestions */}
            {!isSending &&
              !isConversationPristine &&
              (quickReplies.length > 0 || isGeneratingReplies) && (
                <div className="flex gap-2 flex-wrap mt-4 justify-end">
                  {isGeneratingReplies ? (
                    <div className="flex items-center gap-2 text-sm text-default-400">
                      <Spinner size="sm" />
                      <span>{t('Generating suggestions…')}</span>
                    </div>
                  ) : (
                    quickReplies.map((reply, index) => (
                      <Button
                        key={index}
                        variant="flat"
                        size="sm"
                        color="default"
                        className="text-sm"
                        endContent={
                          <Icon
                            name="NavArrowRight"
                            size="sm"
                            className="text-default-400"
                          />
                        }
                        onPress={() => {
                          setPrompt(reply)
                          setQuickReplies([])
                          // Auto-submit after a short delay
                          setTimeout(() => {
                            const submitButton = document.querySelector(
                              '#prompt-area [type="submit"]',
                            ) as HTMLButtonElement | null
                            submitButton?.click()
                          }, 100)
                        }}
                      >
                        {reply}
                      </Button>
                    ))
                  )}
                </div>
              )}

            {/* Example prompts for new conversations */}
            {isConversationPristine &&
              selectedAgent?.examples &&
              selectedAgent.examples.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {selectedAgent.examples.map((example) => (
                    <Button
                      key={example.id}
                      variant="ghost"
                      size="md"
                      className="inline-flex justify-start"
                      endContent={
                        <Icon
                          name="NavArrowRight"
                          size="md"
                          className="text-default-500"
                        />
                      }
                      onPress={() => {
                        setPrompt(
                          selectedAgent.i18n?.[lang]?.examples?.find(
                            (ex) => ex.id === example.id,
                          )?.prompt ?? example.prompt,
                        )

                        // submit
                        setTimeout(() => {
                          const submitButton = document.querySelector(
                            '#prompt-area [type="submit"]',
                          ) as HTMLButtonElement | null
                          submitButton?.click()
                        }, 150)
                      }}
                    >
                      <span className="font-semibold">
                        {selectedAgent.i18n?.[lang]?.examples?.find(
                          (ex) => ex.id === example.id,
                        )?.title ?? example.title}
                      </span>
                    </Button>
                  ))}
                </div>
              )}
          </Container>
        </div>

        <PromptArea
          lang={lang}
          autoFocus={!conversationId}
          className="max-w-4xl mx-auto sticky bottom-20 md:bottom-4"
          value={prompt}
          onValueChange={setPrompt}
          onSubmitToAgent={onSubmit}
          onFilesChange={setSelectedFiles}
          isSending={isSending}
          selectedAgent={selectedAgent}
          onAgentChange={setSelectedAgent}
          disabledAgentPicker
          disabledMention
          placeholder={
            conversationMessages.length > 0
              ? t('Continue the conversation…')
              : t(`Start chatting with {agentName}…`, {
                  agentName: selectedAgent?.name || t('this agent'),
                })
          }
        />
      </div>

      {/* Pin Message Modal */}
      <Modal isOpen={isPinModalOpen} onClose={onPinModalClose} size="lg">
        <ModalContent>
          <ModalHeader className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Pin className="w-5 h-5 text-warning-500" />
              {t('Pin message')}
            </div>
          </ModalHeader>
          <ModalBody>
            <p className="text-small text-default-500 mb-4">
              {t(
                'Add a description to help you remember why this message is important.',
              )}
            </p>

            {/* Message Preview */}
            <div className="bg-default-100 rounded-lg p-3 mb-4 max-h-32 overflow-y-auto">
              <p className="text-small text-default-700 line-clamp-4">
                {messageToPin?.content?.slice(0, 300)}
                {(messageToPin?.content?.length ?? 0) > 300 && '...'}
              </p>
            </div>

            <Input
              label={t('Description')}
              placeholder={t('Brief description of why this is important...')}
              value={pinDescription}
              onValueChange={setPinDescription}
              isDisabled={isGeneratingDescription}
              description={
                isGeneratingDescription
                  ? t('Generating description...')
                  : undefined
              }
              endContent={isGeneratingDescription && <Spinner size="sm" />}
            />
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={onPinModalClose}>
              {t('Cancel')}
            </Button>
            <Button
              color="warning"
              onPress={handlePinSubmit}
              isLoading={isPinning}
              startContent={!isPinning && <Pin className="w-4 h-4" />}
            >
              {t('Pin it')}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Appearance Edit Modal */}
      <Modal
        isOpen={isAppearanceModalOpen}
        onClose={onAppearanceModalClose}
        size="md"
      >
        <ModalContent>
          <ModalHeader className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Icon name="Palette" className="w-5 h-5 text-primary-500" />
              {t('Edit Appearance')}
            </div>
          </ModalHeader>
          <ModalBody>
            {selectedAgent && (
              <AgentAppearancePicker
                icon={editingIcon}
                color={editingColor}
                portrait={editingPortrait}
                name={selectedAgent.name}
                role={selectedAgent.role}
                instructions={selectedAgent.instructions}
                onIconChange={setEditingIcon}
                onColorChange={setEditingColor}
                onPortraitChange={setEditingPortrait}
                isDisabled={isSavingAppearance}
                showPortraitOption={true}
              />
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={onAppearanceModalClose}>
              {t('Cancel')}
            </Button>
            <Button
              color="primary"
              onPress={handleSaveAppearance}
              isLoading={isSavingAppearance}
            >
              {t('Save Changes')}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </DefaultLayout>
  )
}
