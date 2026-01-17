/**
 * Connector Tools Service
 *
 * This module provides the implementation for connector-specific tool operations.
 * These tools allow LLM agents to search, read, and interact with connected
 * external services (Gmail, Google Drive, Calendar, Tasks, Notion).
 *
 * @module features/connectors/tools/service
 */

import { db } from '@/lib/db'
import { ProviderRegistry } from '../provider-registry'
import type { AppConnectorProviderInterface, Connector } from '../types'
import type {
  // Gmail types
  GmailSearchParams,
  GmailSearchResult,
  GmailReadParams,
  GmailReadResult,
  GmailListLabelsParams,
  GmailListLabelsResult,
  GmailCreateDraftParams,
  GmailCreateDraftResult,
  GmailMessageSummary,
  GmailMessageContent,
  // Drive types
  DriveSearchParams,
  DriveSearchResult,
  DriveReadParams,
  DriveReadResult,
  DriveListParams,
  DriveListResult,
  DriveFileSummary,
  // Calendar types
  CalendarListEventsParams,
  CalendarListEventsResult,
  CalendarGetEventParams,
  CalendarGetEventResult,
  CalendarSearchParams,
  CalendarSearchResult,
  CalendarEventSummary,
  CalendarEventDetail,
  // Tasks types
  TasksListParams,
  TasksListResult,
  TasksGetParams,
  TasksGetResult,
  TasksListTasklistsParams,
  TasksListTasklistsResult,
  TaskSummary,
  TasklistSummary,
  // Notion types
  NotionSearchParams,
  NotionSearchResult,
  NotionReadPageParams,
  NotionReadPageResult,
  NotionQueryDatabaseParams,
  NotionQueryDatabaseResult,
  NotionItemSummary,
  NotionPageContent,
  NotionDatabaseEntry,
  // Qonto types
  QontoListBusinessAccountsParams,
  QontoListBusinessAccountsResult,
  QontoListTransactionsParams,
  QontoListTransactionsResult,
  QontoGetTransactionParams,
  QontoGetTransactionResult,
  QontoListStatementsParams,
  QontoListStatementsResult,
  QontoGetStatementParams,
  QontoGetStatementResult,
  QontoBankAccountSummary,
  QontoTransactionSummary,
  QontoTransactionDetail,
  QontoStatementSummary,
  QontoStatementDetail,
  // Outlook Mail types
  OutlookSearchParams,
  OutlookSearchResult,
  OutlookReadParams,
  OutlookReadResult,
  OutlookListFoldersParams,
  OutlookListFoldersResult,
  OutlookMessageSummary,
  OutlookMessageContent,
  OutlookFolder,
  // OneDrive types
  OneDriveSearchParams,
  OneDriveSearchResult,
  OneDriveReadParams,
  OneDriveReadResult,
  OneDriveListParams,
  OneDriveListResult,
  OneDriveFileSummary,
  // Slack types
  SlackSearchParams,
  SlackSearchResult,
  SlackListChannelsParams,
  SlackListChannelsResult,
  SlackReadChannelParams,
  SlackReadChannelResult,
  SlackMessageSummary,
  SlackChannelSummary,
  SlackChannelMessage,
  // Dropbox types
  DropboxSearchParams,
  DropboxSearchResult,
  DropboxReadParams,
  DropboxReadResult,
  DropboxListParams,
  DropboxListResult,
  DropboxFileSummary,
  // Figma types
  FigmaListFilesParams,
  FigmaListFilesResult,
  FigmaGetFileParams,
  FigmaGetFileResult,
  FigmaGetCommentsParams,
  FigmaGetCommentsResult,
  FigmaFileSummary,
  FigmaNodeSummary,
  FigmaComment,
  // Google Chat types
  GoogleChatListSpacesParams,
  GoogleChatListSpacesResult,
  GoogleChatReadMessagesParams,
  GoogleChatReadMessagesResult,
  GoogleChatSpaceSummary,
  GoogleChatMessage,
  // Google Meet types
  GoogleMeetListMeetingsParams,
  GoogleMeetListMeetingsResult,
  GoogleMeetMeetingSummary,
  // Common
  ConnectorMetadata,
} from './types'

// ============================================================================
// Constants
// ============================================================================

/** Default maximum results for search operations */
const DEFAULT_MAX_RESULTS = 10

/** Default time range for calendar events (30 days) */
const DEFAULT_CALENDAR_DAYS = 30

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Ensures the database is initialized before operations.
 */
async function ensureDbInitialized(): Promise<void> {
  if (!db.isInitialized()) {
    await db.init()
  }
}

/**
 * Get a connector by ID, throwing if not found.
 */
async function getConnector(connectorId: string): Promise<Connector> {
  await ensureDbInitialized()
  const connector = await db.get('connectors', connectorId)
  if (!connector) {
    throw new Error(`Connector not found: ${connectorId}`)
  }
  if (connector.status === 'error' || connector.status === 'expired') {
    throw new Error(
      `Connector is not available (status: ${connector.status}): ${connector.errorMessage || 'Unknown error'}`,
    )
  }
  return connector
}

/**
 * Get provider instance for a connector.
 */
async function getProvider(
  connector: Connector,
): Promise<AppConnectorProviderInterface> {
  return ProviderRegistry.get<AppConnectorProviderInterface>(connector.provider)
}

/**
 * Create connector metadata for results.
 */
function createConnectorMetadata(connector: Connector): ConnectorMetadata {
  return {
    connectorId: connector.id,
    provider: connector.provider,
    accountEmail: connector.accountEmail,
  }
}

/**
 * Parse email header from raw content.
 */
function parseEmailHeader(
  rawContent: string,
  headerName: string,
): string | undefined {
  const headerRegex = new RegExp(`^${headerName}:\\s*(.*)$`, 'im')
  const match = rawContent.match(headerRegex)
  return match ? match[1].trim() : undefined
}

/**
 * Extract email body from raw RFC 822 content.
 */
function extractEmailBody(rawContent: string): string {
  // Email body starts after the first blank line
  const parts = rawContent.split(/\r?\n\r?\n/)
  if (parts.length > 1) {
    return parts.slice(1).join('\n\n').trim()
  }
  return ''
}

// ============================================================================
// Gmail Tools Implementation
// ============================================================================

/**
 * Search emails in Gmail using Gmail search syntax.
 *
 * @param params - Search parameters
 * @returns Search results with message summaries
 */
export async function gmailSearch(
  params: GmailSearchParams,
): Promise<GmailSearchResult> {
  const connector = await getConnector(params.connector_id)

  if (connector.provider !== 'gmail') {
    throw new Error(`Connector ${params.connector_id} is not a Gmail connector`)
  }

  const provider = await getProvider(connector)

  const maxResults = Math.min(params.max_results ?? DEFAULT_MAX_RESULTS, 50)

  const searchResult = await provider.search!(connector, params.query)

  // Convert ConnectorItems to GmailMessageSummary
  const messages: GmailMessageSummary[] = searchResult.items
    .slice(0, maxResults)
    .map((item) => ({
      id: item.externalId,
      threadId: (item.metadata?.threadId as string) || item.externalId,
      subject: item.name,
      from: (item.metadata?.from as string) || '',
      to: (item.metadata?.to as string) || '',
      date: item.lastModified,
      snippet: item.transcript || item.description || '',
      labels: (item.metadata?.labelIds as string[]) || [],
      hasAttachments: (item.metadata?.hasAttachments as boolean) || false,
    }))

  return {
    query: params.query,
    total_count: searchResult.totalCount || messages.length,
    result_count: messages.length,
    messages,
    next_cursor: searchResult.nextCursor,
    connector: createConnectorMetadata(connector),
  }
}

/**
 * Read the full content of a specific Gmail message.
 *
 * @param params - Read parameters with message ID
 * @returns Full message content
 */
export async function gmailRead(
  params: GmailReadParams,
): Promise<GmailReadResult> {
  const connector = await getConnector(params.connector_id)

  if (connector.provider !== 'gmail') {
    throw new Error(`Connector ${params.connector_id} is not a Gmail connector`)
  }

  const provider = await getProvider(connector)

  try {
    const content = await provider.read(connector, params.message_id)
    const rawContent =
      typeof content.content === 'string'
        ? content.content
        : new TextDecoder().decode(content.content as ArrayBuffer)

    // Parse headers from raw content
    const subject = parseEmailHeader(rawContent, 'Subject') || '(No Subject)'
    const from = parseEmailHeader(rawContent, 'From') || ''
    const to = parseEmailHeader(rawContent, 'To') || ''
    const cc = parseEmailHeader(rawContent, 'Cc')
    const bcc = parseEmailHeader(rawContent, 'Bcc')
    const dateStr = parseEmailHeader(rawContent, 'Date')
    const date = dateStr ? new Date(dateStr) : new Date()

    // Extract body
    const body = extractEmailBody(rawContent)

    // Build headers object if requested
    let headers: Record<string, string> | undefined
    if (params.include_headers) {
      headers = {}
      const headerSection = rawContent.split(/\r?\n\r?\n/)[0] || ''
      const headerLines = headerSection.split(/\r?\n/)
      for (const line of headerLines) {
        const colonIndex = line.indexOf(':')
        if (colonIndex > 0) {
          const key = line.substring(0, colonIndex).trim()
          const value = line.substring(colonIndex + 1).trim()
          headers[key] = value
        }
      }
    }

    const message: GmailMessageContent = {
      id: params.message_id,
      threadId: (content.metadata?.threadId as string) || params.message_id,
      subject,
      from,
      to,
      cc,
      bcc,
      date,
      labels: (content.metadata?.labelIds as string[]) || [],
      body,
      headers,
      attachments: [], // TODO: Parse attachments from MIME
    }

    return {
      found: true,
      message,
      connector: createConnectorMetadata(connector),
    }
  } catch (error) {
    return {
      found: false,
      error: error instanceof Error ? error.message : 'Failed to read message',
      connector: createConnectorMetadata(connector),
    }
  }
}

/**
 * List available Gmail labels.
 *
 * @param params - List labels parameters
 * @returns Available labels
 */
export async function gmailListLabels(
  params: GmailListLabelsParams,
): Promise<GmailListLabelsResult> {
  const connector = await getConnector(params.connector_id)

  if (connector.provider !== 'gmail') {
    throw new Error(`Connector ${params.connector_id} is not a Gmail connector`)
  }

  // Gmail API doesn't expose labels directly through our connector interface
  // Return common system labels
  const systemLabels = [
    { id: 'INBOX', name: 'Inbox', type: 'system' as const },
    { id: 'SENT', name: 'Sent', type: 'system' as const },
    { id: 'DRAFT', name: 'Drafts', type: 'system' as const },
    { id: 'STARRED', name: 'Starred', type: 'system' as const },
    { id: 'IMPORTANT', name: 'Important', type: 'system' as const },
    { id: 'SPAM', name: 'Spam', type: 'system' as const },
    { id: 'TRASH', name: 'Trash', type: 'system' as const },
    { id: 'UNREAD', name: 'Unread', type: 'system' as const },
  ]

  let labels = systemLabels
  if (params.type === 'user') {
    labels = [] // User labels would need a dedicated API call
  } else if (params.type === 'system') {
    // Already filtered to system
  }

  return {
    labels,
    connector: createConnectorMetadata(connector),
  }
}

/**
 * Create an email draft in Gmail.
 *
 * Creates a draft that the user can review and send from Gmail.
 *
 * @param params - Draft creation parameters
 * @returns Created draft information
 */
export async function gmailCreateDraft(
  params: GmailCreateDraftParams,
): Promise<GmailCreateDraftResult> {
  const connector = await getConnector(params.connector_id)

  if (connector.provider !== 'gmail') {
    throw new Error(`Connector ${params.connector_id} is not a Gmail connector`)
  }

  // Import the Gmail provider to access createDraft method
  const gmailModule = await import('../providers/apps/gmail')
  const gmailProvider = gmailModule.default

  try {
    const draft = await gmailProvider.createDraft(connector, {
      to: params.to,
      subject: params.subject,
      body: params.body,
      isHtml: params.is_html,
      cc: params.cc,
      bcc: params.bcc,
      replyToMessageId: params.reply_to_message_id,
    })

    return {
      success: true,
      draft: {
        id: draft.id,
        messageId: draft.messageId,
        threadId: draft.threadId,
        subject: draft.subject,
        to: draft.to,
        cc: draft.cc,
        bcc: draft.bcc,
        webLink: draft.webLink,
      },
      connector: createConnectorMetadata(connector),
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create draft',
      connector: createConnectorMetadata(connector),
    }
  }
}

// ============================================================================
// Google Drive Tools Implementation
// ============================================================================

/**
 * Search files in Google Drive.
 *
 * @param params - Search parameters
 * @returns Search results with file summaries
 */
export async function driveSearch(
  params: DriveSearchParams,
): Promise<DriveSearchResult> {
  const connector = await getConnector(params.connector_id)

  if (connector.provider !== 'google-drive') {
    throw new Error(
      `Connector ${params.connector_id} is not a Google Drive connector`,
    )
  }

  const provider = await getProvider(connector)

  const maxResults = Math.min(params.max_results ?? DEFAULT_MAX_RESULTS, 50)

  const searchResult = await provider.search!(connector, params.query)

  const files: DriveFileSummary[] = searchResult.items
    .slice(0, maxResults)
    .map((item) => ({
      id: item.externalId,
      name: item.name,
      mimeType: item.mimeType || 'application/octet-stream',
      isFolder: item.type === 'folder',
      size: item.size,
      modifiedTime: item.lastModified,
      webViewLink: item.externalUrl,
      parents: item.parentExternalId ? [item.parentExternalId] : undefined,
    }))

  return {
    query: params.query,
    result_count: files.length,
    files,
    next_cursor: searchResult.nextCursor,
    connector: createConnectorMetadata(connector),
  }
}

/**
 * Read content of a Google Drive file.
 *
 * @param params - Read parameters
 * @returns File content
 */
export async function driveRead(
  params: DriveReadParams,
): Promise<DriveReadResult> {
  const connector = await getConnector(params.connector_id)

  if (connector.provider !== 'google-drive') {
    throw new Error(
      `Connector ${params.connector_id} is not a Google Drive connector`,
    )
  }

  const provider = await getProvider(connector)

  try {
    const content = await provider.read(connector, params.file_id)

    let textContent: string | undefined
    let contentType: 'text' | 'binary' | 'google_doc' = 'binary'
    let truncated = false

    // Handle text-based content
    if (typeof content.content === 'string') {
      textContent = content.content
      contentType = 'text'
    } else if (
      content.mimeType?.startsWith('text/') ||
      content.mimeType?.includes('json') ||
      content.mimeType?.includes('xml')
    ) {
      textContent = new TextDecoder().decode(content.content as ArrayBuffer)
      contentType = 'text'
    } else if (content.mimeType?.startsWith('application/vnd.google-apps.')) {
      // Google Docs format (already exported as text by provider)
      textContent =
        typeof content.content === 'string'
          ? content.content
          : new TextDecoder().decode(content.content as ArrayBuffer)
      contentType = 'google_doc'
    }

    // Apply max_length truncation
    if (
      textContent &&
      params.max_length &&
      textContent.length > params.max_length
    ) {
      textContent = textContent.substring(0, params.max_length)
      truncated = true
    }

    const file: DriveFileSummary = {
      id: params.file_id,
      name: (content.metadata?.name as string) || 'Unknown',
      mimeType: content.mimeType,
      isFolder: false,
      size: content.metadata?.size as number | undefined,
      modifiedTime: new Date(
        (content.metadata?.modifiedTime as string) || Date.now(),
      ),
      webViewLink: content.metadata?.webViewLink as string | undefined,
    }

    return {
      found: true,
      file,
      content: textContent,
      content_type: contentType,
      truncated,
      connector: createConnectorMetadata(connector),
    }
  } catch (error) {
    return {
      found: false,
      error: error instanceof Error ? error.message : 'Failed to read file',
      connector: createConnectorMetadata(connector),
    }
  }
}

/**
 * List files in a Google Drive folder.
 *
 * @param params - List parameters
 * @returns Files in the folder
 */
export async function driveList(
  params: DriveListParams,
): Promise<DriveListResult> {
  const connector = await getConnector(params.connector_id)

  if (connector.provider !== 'google-drive') {
    throw new Error(
      `Connector ${params.connector_id} is not a Google Drive connector`,
    )
  }

  const provider = await getProvider(connector)

  const listResult = await provider.list(connector, {
    path: params.folder_id,
    pageSize: params.limit ?? 50,
  })

  const files: DriveFileSummary[] = listResult.items.map((item) => ({
    id: item.externalId,
    name: item.name,
    mimeType: item.mimeType || 'application/octet-stream',
    isFolder: item.type === 'folder',
    size: item.size,
    modifiedTime: item.lastModified,
    webViewLink: item.externalUrl,
    parents: item.parentExternalId ? [item.parentExternalId] : undefined,
  }))

  return {
    folder: params.folder_id ? { id: params.folder_id, name: 'Folder' } : null,
    files,
    total_count: files.length,
    next_cursor: listResult.nextCursor,
    connector: createConnectorMetadata(connector),
  }
}

// ============================================================================
// Google Calendar Tools Implementation
// ============================================================================

/**
 * List calendar events within a time range.
 *
 * @param params - List parameters
 * @returns Events in the time range
 */
export async function calendarListEvents(
  params: CalendarListEventsParams,
): Promise<CalendarListEventsResult> {
  const connector = await getConnector(params.connector_id)

  if (connector.provider !== 'google-calendar') {
    throw new Error(
      `Connector ${params.connector_id} is not a Google Calendar connector`,
    )
  }

  const provider = await getProvider(connector)

  // Set default time range
  const now = new Date()
  const timeMin = params.time_min || now.toISOString()
  const timeMax =
    params.time_max ||
    new Date(
      now.getTime() + DEFAULT_CALENDAR_DAYS * 24 * 60 * 60 * 1000,
    ).toISOString()

  const listResult = await provider.list(connector, {
    pageSize: params.max_results ?? 25,
    filter: {
      timeMin,
      timeMax,
      q: params.query,
      calendarId: params.calendar_id || 'primary',
    },
  })

  const events: CalendarEventSummary[] = listResult.items.map((item) => ({
    id: item.externalId,
    summary: item.name,
    description: item.description,
    location: item.metadata?.location as string | undefined,
    start: new Date((item.metadata?.startTime as string) || item.lastModified),
    end: new Date((item.metadata?.endTime as string) || item.lastModified),
    isAllDay: (item.metadata?.isAllDay as boolean) || false,
    status:
      (item.metadata?.status as 'confirmed' | 'tentative' | 'cancelled') ||
      'confirmed',
    organizer: item.metadata?.organizer as string | undefined,
    attendeeCount: item.metadata?.attendeeCount as number | undefined,
    meetingLink: item.metadata?.hangoutLink as string | undefined,
    htmlLink: item.externalUrl,
  }))

  return {
    calendar: params.calendar_id || 'primary',
    timeRange: { start: timeMin, end: timeMax },
    result_count: events.length,
    events,
    next_cursor: listResult.nextCursor,
    connector: createConnectorMetadata(connector),
  }
}

/**
 * Get detailed information about a specific calendar event.
 *
 * @param params - Event parameters
 * @returns Event details
 */
export async function calendarGetEvent(
  params: CalendarGetEventParams,
): Promise<CalendarGetEventResult> {
  const connector = await getConnector(params.connector_id)

  if (connector.provider !== 'google-calendar') {
    throw new Error(
      `Connector ${params.connector_id} is not a Google Calendar connector`,
    )
  }

  const provider = await getProvider(connector)

  try {
    const content = await provider.read(connector, params.event_id)

    // Parse event from metadata
    const event: CalendarEventDetail = {
      id: params.event_id,
      summary: (content.metadata?.summary as string) || 'Untitled Event',
      description: content.metadata?.description as string | undefined,
      location: content.metadata?.location as string | undefined,
      start: new Date((content.metadata?.startTime as string) || Date.now()),
      end: new Date((content.metadata?.endTime as string) || Date.now()),
      isAllDay: (content.metadata?.isAllDay as boolean) || false,
      status:
        (content.metadata?.status as 'confirmed' | 'tentative' | 'cancelled') ||
        'confirmed',
      organizer: content.metadata?.organizer as string | undefined,
      attendees: content.metadata
        ?.attendees as CalendarEventDetail['attendees'],
      htmlLink: content.metadata?.htmlLink as string | undefined,
      createdAt: new Date((content.metadata?.created as string) || Date.now()),
      updatedAt: new Date((content.metadata?.updated as string) || Date.now()),
    }

    return {
      found: true,
      event,
      connector: createConnectorMetadata(connector),
    }
  } catch (error) {
    return {
      found: false,
      error: error instanceof Error ? error.message : 'Failed to get event',
      connector: createConnectorMetadata(connector),
    }
  }
}

/**
 * Search for calendar events by query.
 *
 * @param params - Search parameters
 * @returns Matching events
 */
export async function calendarSearch(
  params: CalendarSearchParams,
): Promise<CalendarSearchResult> {
  const connector = await getConnector(params.connector_id)

  if (connector.provider !== 'google-calendar') {
    throw new Error(
      `Connector ${params.connector_id} is not a Google Calendar connector`,
    )
  }

  const provider = await getProvider(connector)

  // Use search if available, otherwise list with query filter
  let searchResult
  if (provider.search) {
    searchResult = await provider.search(connector, params.query)
  } else {
    const listResult = await provider.list(connector, {
      pageSize: params.max_results ?? DEFAULT_MAX_RESULTS,
      filter: {
        q: params.query,
        timeMin: params.time_min,
        timeMax: params.time_max,
      },
    })
    searchResult = {
      items: listResult.items,
      totalCount: listResult.items.length,
    }
  }

  const events: CalendarEventSummary[] = searchResult.items
    .slice(0, params.max_results ?? DEFAULT_MAX_RESULTS)
    .map((item) => ({
      id: item.externalId,
      summary: item.name,
      description: item.description,
      location: item.metadata?.location as string | undefined,
      start: new Date(
        (item.metadata?.startTime as string) || item.lastModified,
      ),
      end: new Date((item.metadata?.endTime as string) || item.lastModified),
      isAllDay: (item.metadata?.isAllDay as boolean) || false,
      status:
        (item.metadata?.status as 'confirmed' | 'tentative' | 'cancelled') ||
        'confirmed',
      organizer: item.metadata?.organizer as string | undefined,
      htmlLink: item.externalUrl,
    }))

  return {
    query: params.query,
    result_count: events.length,
    events,
    connector: createConnectorMetadata(connector),
  }
}

// ============================================================================
// Google Tasks Tools Implementation
// ============================================================================

/**
 * List tasks from a task list.
 *
 * @param params - List parameters
 * @returns Tasks in the list
 */
export async function tasksList(
  params: TasksListParams,
): Promise<TasksListResult> {
  const connector = await getConnector(params.connector_id)

  if (connector.provider !== 'google-tasks') {
    throw new Error(
      `Connector ${params.connector_id} is not a Google Tasks connector`,
    )
  }

  const provider = await getProvider(connector)

  const listResult = await provider.list(connector, {
    path: params.tasklist_id,
    pageSize: params.max_results ?? 50,
    filter: {
      showCompleted: params.show_completed,
      showHidden: params.show_hidden,
      dueMax: params.due_max,
      dueMin: params.due_min,
    },
  })

  const tasks: TaskSummary[] = listResult.items.map((item) => ({
    id: item.externalId,
    title: item.name,
    notes: item.description,
    due: item.metadata?.due ? new Date(item.metadata.due as string) : undefined,
    status:
      (item.metadata?.status as 'needsAction' | 'completed') || 'needsAction',
    completedAt: item.metadata?.completed
      ? new Date(item.metadata.completed as string)
      : undefined,
    parentId: item.parentExternalId,
    updatedAt: item.lastModified,
    webViewLink: item.externalUrl,
  }))

  return {
    taskList: {
      id: params.tasklist_id || '@default',
      title: 'Task List',
    },
    tasks,
    result_count: tasks.length,
    next_cursor: listResult.nextCursor,
    connector: createConnectorMetadata(connector),
  }
}

/**
 * Get details of a specific task.
 *
 * @param params - Task parameters
 * @returns Task details
 */
export async function tasksGet(
  params: TasksGetParams,
): Promise<TasksGetResult> {
  const connector = await getConnector(params.connector_id)

  if (connector.provider !== 'google-tasks') {
    throw new Error(
      `Connector ${params.connector_id} is not a Google Tasks connector`,
    )
  }

  const provider = await getProvider(connector)

  try {
    const content = await provider.read(connector, params.task_id)

    const task: TaskSummary = {
      id: params.task_id,
      title: (content.metadata?.title as string) || 'Untitled Task',
      notes: content.metadata?.notes as string | undefined,
      due: content.metadata?.due
        ? new Date(content.metadata.due as string)
        : undefined,
      status:
        (content.metadata?.status as 'needsAction' | 'completed') ||
        'needsAction',
      completedAt: content.metadata?.completed
        ? new Date(content.metadata.completed as string)
        : undefined,
      updatedAt: new Date((content.metadata?.updated as string) || Date.now()),
      webViewLink: content.metadata?.webViewLink as string | undefined,
    }

    return {
      found: true,
      task,
      connector: createConnectorMetadata(connector),
    }
  } catch (error) {
    return {
      found: false,
      error: error instanceof Error ? error.message : 'Failed to get task',
      connector: createConnectorMetadata(connector),
    }
  }
}

/**
 * List all task lists.
 *
 * @param params - List parameters
 * @returns Available task lists
 */
export async function tasksListTasklists(
  params: TasksListTasklistsParams,
): Promise<TasksListTasklistsResult> {
  const connector = await getConnector(params.connector_id)

  if (connector.provider !== 'google-tasks') {
    throw new Error(
      `Connector ${params.connector_id} is not a Google Tasks connector`,
    )
  }

  const provider = await getProvider(connector)

  // List at root level to get task lists
  const listResult = await provider.list(connector, {
    pageSize: params.max_results ?? 20,
    filter: { listTaskLists: true },
  })

  const taskLists: TasklistSummary[] = listResult.items
    .filter((item) => item.type === 'folder') // Task lists are represented as folders
    .map((item) => ({
      id: item.externalId,
      title: item.name,
      updatedAt: item.lastModified,
    }))

  return {
    taskLists,
    result_count: taskLists.length,
    connector: createConnectorMetadata(connector),
  }
}

// ============================================================================
// Notion Tools Implementation
// ============================================================================

/**
 * Search Notion pages and databases.
 *
 * @param params - Search parameters
 * @returns Matching pages and databases
 */
export async function notionSearch(
  params: NotionSearchParams,
): Promise<NotionSearchResult> {
  const connector = await getConnector(params.connector_id)

  if (connector.provider !== 'notion') {
    throw new Error(
      `Connector ${params.connector_id} is not a Notion connector`,
    )
  }

  const provider = await getProvider(connector)

  const searchResult = await provider.search!(connector, params.query)

  const maxResults = params.max_results ?? DEFAULT_MAX_RESULTS

  const items: NotionItemSummary[] = searchResult.items
    .slice(0, maxResults)
    .filter((item) => {
      if (params.filter === 'page') return item.type === 'file'
      if (params.filter === 'database') return item.type === 'folder'
      return true
    })
    .map((item) => ({
      id: item.externalId,
      type: item.type === 'folder' ? 'database' : 'page',
      title: item.name,
      icon: item.metadata?.icon as string | undefined,
      url: item.externalUrl || '',
      lastEditedTime: item.lastModified,
      parent: item.parentExternalId
        ? {
            type:
              (item.metadata?.parentType as
                | 'database'
                | 'page'
                | 'workspace') || 'workspace',
            id: item.parentExternalId,
          }
        : undefined,
    }))

  return {
    query: params.query,
    result_count: items.length,
    items,
    next_cursor: searchResult.nextCursor,
    connector: createConnectorMetadata(connector),
  }
}

/**
 * Read content of a Notion page.
 *
 * @param params - Read parameters
 * @returns Page content as markdown
 */
export async function notionReadPage(
  params: NotionReadPageParams,
): Promise<NotionReadPageResult> {
  const connector = await getConnector(params.connector_id)

  if (connector.provider !== 'notion') {
    throw new Error(
      `Connector ${params.connector_id} is not a Notion connector`,
    )
  }

  const provider = await getProvider(connector)

  try {
    const content = await provider.read(connector, params.page_id)

    let textContent =
      typeof content.content === 'string'
        ? content.content
        : new TextDecoder().decode(content.content as ArrayBuffer)

    let truncated = false
    if (params.max_length && textContent.length > params.max_length) {
      textContent = textContent.substring(0, params.max_length)
      truncated = true
    }

    const page: NotionPageContent = {
      id: params.page_id,
      title: (content.metadata?.title as string) || 'Untitled',
      icon: content.metadata?.icon as string | undefined,
      coverUrl: content.metadata?.coverUrl as string | undefined,
      url: (content.metadata?.url as string) || '',
      properties:
        (content.metadata?.properties as Record<string, unknown>) || {},
      content: textContent,
      createdAt: new Date(
        (content.metadata?.createdTime as string) || Date.now(),
      ),
      lastEditedTime: new Date(
        (content.metadata?.lastEditedTime as string) || Date.now(),
      ),
    }

    return {
      found: true,
      page,
      truncated,
      connector: createConnectorMetadata(connector),
    }
  } catch (error) {
    return {
      found: false,
      error: error instanceof Error ? error.message : 'Failed to read page',
      connector: createConnectorMetadata(connector),
    }
  }
}

/**
 * Query a Notion database.
 *
 * @param params - Query parameters
 * @returns Database entries
 */
export async function notionQueryDatabase(
  params: NotionQueryDatabaseParams,
): Promise<NotionQueryDatabaseResult> {
  const connector = await getConnector(params.connector_id)

  if (connector.provider !== 'notion') {
    throw new Error(
      `Connector ${params.connector_id} is not a Notion connector`,
    )
  }

  const provider = await getProvider(connector)

  // Use list with database filter
  const listResult = await provider.list(connector, {
    path: params.database_id,
    pageSize: params.max_results ?? 25,
    filter: {
      filter: params.filter,
      sorts: params.sorts,
    },
  })

  const entries: NotionDatabaseEntry[] = listResult.items.map((item) => ({
    id: item.externalId,
    url: item.externalUrl || '',
    properties: (item.metadata?.properties as Record<string, unknown>) || {},
    createdAt: new Date(
      (item.metadata?.createdTime as string) || item.lastModified,
    ),
    lastEditedTime: item.lastModified,
  }))

  return {
    database: {
      id: params.database_id,
      title: 'Database',
    },
    entries,
    result_count: entries.length,
    next_cursor: listResult.nextCursor,
    connector: createConnectorMetadata(connector),
  }
}

// ============================================================================
// Qonto Tools Implementation
// ============================================================================

/**
 * List business accounts from Qonto.
 *
 * @param params - List parameters
 * @returns List of business accounts
 */
export async function qontoListBusinessAccounts(
  params: QontoListBusinessAccountsParams,
): Promise<QontoListBusinessAccountsResult> {
  const connector = await getConnector(params.connector_id)

  if (connector.provider !== 'qonto') {
    throw new Error(`Connector ${params.connector_id} is not a Qonto connector`)
  }

  const provider = (await getProvider(connector)) as any // QontoProvider
  const result = await provider.listBusinessAccounts(
    connector,
    params.page ?? 1,
    params.per_page ?? 100,
  )

  const accounts: QontoBankAccountSummary[] = result.bank_accounts.map(
    (account: any) => ({
      id: account.id,
      name: account.name,
      organizationId: account.organization_id,
      status: account.status,
      main: account.main,
      iban: account.iban,
      bic: account.bic,
      currency: account.currency,
      balance: account.balance,
      authorizedBalance: account.authorized_balance
        ? parseFloat(account.authorized_balance)
        : undefined,
      updatedAt: account.updated_at ? new Date(account.updated_at) : undefined,
    }),
  )

  return {
    accounts,
    result_count: accounts.length,
    total_count: result.meta?.total_count,
    pagination: result.meta
      ? {
          current_page: result.meta.current_page,
          total_pages: result.meta.total_pages,
          per_page: result.meta.per_page,
        }
      : undefined,
    connector: createConnectorMetadata(connector),
  }
}

/**
 * List transactions from Qonto.
 *
 * @param params - List parameters with filters
 * @returns List of transactions with pagination
 */
export async function qontoListTransactions(
  params: QontoListTransactionsParams,
): Promise<QontoListTransactionsResult> {
  // Validate that either bank_account_id or iban is provided
  if (!params.bank_account_id && !params.iban) {
    throw new Error(
      'Either bank_account_id or iban is required. Use qonto_list_business_accounts first to get available account IDs.',
    )
  }

  const connector = await getConnector(params.connector_id)

  if (connector.provider !== 'qonto') {
    throw new Error(`Connector ${params.connector_id} is not a Qonto connector`)
  }

  const provider = (await getProvider(connector)) as any // QontoProvider
  const result = await provider.listTransactions(connector, {
    bank_account_id: params.bank_account_id,
    iban: params.iban,
    status: params.status,
    side: params.side,
    updated_at_from: params.updated_at_from,
    updated_at_to: params.updated_at_to,
    settled_at_from: params.settled_at_from,
    settled_at_to: params.settled_at_to,
    sort_by: params.sort_by,
    page: params.page,
    per_page: params.per_page,
  })

  const transactions: QontoTransactionSummary[] = result.transactions.map(
    (tx: any) => ({
      id: tx.id,
      transactionId: tx.transaction_id,
      amount: tx.amount,
      amountCents: tx.amount_cents,
      side: tx.side,
      operationType: tx.operation_type,
      currency: tx.currency,
      label: tx.label,
      status: tx.status,
      settledAt: tx.settled_at ? new Date(tx.settled_at) : undefined,
      emittedAt: tx.emitted_at ? new Date(tx.emitted_at) : undefined,
      note: tx.note,
      category: tx.category,
      attachmentRequired: tx.attachment_required,
      attachmentCount: tx.attachment_ids?.length || 0,
    }),
  )

  return {
    transactions,
    result_count: transactions.length,
    pagination: {
      current_page: result.meta.current_page,
      total_pages: result.meta.total_pages,
      total_count: result.meta.total_count,
      per_page: result.meta.per_page,
    },
    connector: createConnectorMetadata(connector),
  }
}

/**
 * Get a specific transaction from Qonto.
 *
 * @param params - Get parameters with transaction ID
 * @returns Transaction details
 */
export async function qontoGetTransaction(
  params: QontoGetTransactionParams,
): Promise<QontoGetTransactionResult> {
  const connector = await getConnector(params.connector_id)

  if (connector.provider !== 'qonto') {
    throw new Error(`Connector ${params.connector_id} is not a Qonto connector`)
  }

  try {
    const provider = (await getProvider(connector)) as any // QontoProvider
    const result = await provider.getTransaction(
      connector,
      params.transaction_id,
      params.includes,
    )

    const tx = result.transaction
    const transaction: QontoTransactionDetail = {
      id: tx.id,
      transactionId: tx.transaction_id,
      amount: tx.amount,
      amountCents: tx.amount_cents,
      side: tx.side,
      operationType: tx.operation_type,
      currency: tx.currency,
      label: tx.label,
      status: tx.status,
      settledAt: tx.settled_at ? new Date(tx.settled_at) : undefined,
      emittedAt: tx.emitted_at ? new Date(tx.emitted_at) : undefined,
      note: tx.note,
      category: tx.category,
      attachmentRequired: tx.attachment_required,
      attachmentCount: tx.attachment_ids?.length || 0,
      localAmount: tx.local_amount,
      localCurrency: tx.local_currency,
      vatAmount: tx.vat_amount,
      vatRate: tx.vat_rate,
      reference: tx.reference,
      cardLastDigits: tx.card_last_digits,
      cashflowCategory: tx.cashflow_category?.name,
      cashflowSubcategory: tx.cashflow_subcategory?.name,
      initiatorId: tx.initiator_id,
      labelIds: tx.label_ids,
      attachmentIds: tx.attachment_ids,
      transfer: tx.transfer
        ? {
            counterpartyAccountNumber: tx.transfer.counterparty_account_number,
            counterpartyBankIdentifier:
              tx.transfer.counterparty_bank_identifier,
          }
        : undefined,
    }

    return {
      found: true,
      transaction,
      connector: createConnectorMetadata(connector),
    }
  } catch (error) {
    return {
      found: false,
      error:
        error instanceof Error ? error.message : 'Failed to get transaction',
      connector: createConnectorMetadata(connector),
    }
  }
}

/**
 * List statements from Qonto.
 *
 * @param params - List parameters with filters
 * @returns List of statements with pagination
 */
export async function qontoListStatements(
  params: QontoListStatementsParams,
): Promise<QontoListStatementsResult> {
  const connector = await getConnector(params.connector_id)

  if (connector.provider !== 'qonto') {
    throw new Error(`Connector ${params.connector_id} is not a Qonto connector`)
  }

  const provider = (await getProvider(connector)) as any // QontoProvider
  const result = await provider.listStatements(connector, {
    bank_account_ids: params.bank_account_ids,
    ibans: params.ibans,
    period_from: params.period_from,
    period_to: params.period_to,
    sort_by: params.sort_by,
    page: params.page,
    per_page: params.per_page,
  })

  const statements: QontoStatementSummary[] = result.statements.map(
    (stmt: any) => ({
      id: stmt.id,
      bankAccountId: stmt.bank_account_id,
      period: stmt.period,
      file: {
        fileName: stmt.file.file_name,
        contentType: stmt.file.file_content_type,
        size: parseInt(stmt.file.file_size, 10),
      },
    }),
  )

  return {
    statements,
    result_count: statements.length,
    pagination: {
      current_page: result.meta.current_page,
      total_pages: result.meta.total_pages,
      total_count: result.meta.total_count,
      per_page: result.meta.per_page,
    },
    connector: createConnectorMetadata(connector),
  }
}

/**
 * Get a specific statement from Qonto.
 *
 * @param params - Get parameters with statement ID
 * @returns Statement details with download URL
 */
export async function qontoGetStatement(
  params: QontoGetStatementParams,
): Promise<QontoGetStatementResult> {
  const connector = await getConnector(params.connector_id)

  if (connector.provider !== 'qonto') {
    throw new Error(`Connector ${params.connector_id} is not a Qonto connector`)
  }

  try {
    const provider = (await getProvider(connector)) as any // QontoProvider
    const result = await provider.getStatement(connector, params.statement_id)

    const stmt = result.statement
    const statement: QontoStatementDetail = {
      id: stmt.id,
      bankAccountId: stmt.bank_account_id,
      period: stmt.period,
      file: {
        fileName: stmt.file.file_name,
        contentType: stmt.file.file_content_type,
        size: parseInt(stmt.file.file_size, 10),
      },
      downloadUrl: stmt.file.file_url,
    }

    return {
      found: true,
      statement,
      connector: createConnectorMetadata(connector),
    }
  } catch (error) {
    return {
      found: false,
      error: error instanceof Error ? error.message : 'Failed to get statement',
      connector: createConnectorMetadata(connector),
    }
  }
}

// ============================================================================
// Outlook Mail Tools
// ============================================================================

/**
 * Search emails in a connected Outlook account.
 */
export async function outlookSearch(
  params: OutlookSearchParams,
): Promise<OutlookSearchResult> {
  const connector = await getConnector(params.connector_id)

  if (connector.provider !== 'outlook-mail') {
    throw new Error(
      `Connector ${params.connector_id} is not an Outlook Mail connector`,
    )
  }

  try {
    const provider = (await getProvider(connector)) as any
    const maxResults = Math.min(params.max_results ?? DEFAULT_MAX_RESULTS, 50)
    const result = await provider.search(connector, {
      query: params.query,
      pageSize: maxResults,
      folderId: params.folder_id,
    })

    const messages: OutlookMessageSummary[] = (result.items || []).map(
      (item: any) => ({
        id: item.id,
        conversationId: item.conversationId,
        subject: item.name || item.subject || '',
        from: item.from || '',
        to: item.to || '',
        receivedDateTime: new Date(item.lastModified || Date.now()),
        bodyPreview: item.description || '',
        isRead: item.isRead ?? true,
        hasAttachments: item.hasAttachments ?? false,
        importance: item.importance || 'normal',
      }),
    )

    return {
      query: params.query,
      result_count: messages.length,
      messages,
      next_cursor: result.cursor,
      connector: createConnectorMetadata(connector),
    }
  } catch (error) {
    throw new Error(
      `Outlook search failed: ${error instanceof Error ? error.message : String(error)}`,
    )
  }
}

/**
 * Read the full content of an Outlook email.
 */
export async function outlookRead(
  params: OutlookReadParams,
): Promise<OutlookReadResult> {
  const connector = await getConnector(params.connector_id)

  if (connector.provider !== 'outlook-mail') {
    throw new Error(
      `Connector ${params.connector_id} is not an Outlook Mail connector`,
    )
  }

  try {
    const provider = (await getProvider(connector)) as any
    const result = await provider.getContent(connector, params.message_id)

    if (!result.content) {
      return {
        found: false,
        error: 'Message not found',
        connector: createConnectorMetadata(connector),
      }
    }

    const message: OutlookMessageContent = {
      id: params.message_id,
      subject: result.metadata?.subject || '',
      from: result.metadata?.from || '',
      to: result.metadata?.to || '',
      receivedDateTime: new Date(
        result.metadata?.receivedDateTime || Date.now(),
      ),
      body: result.content,
      isRead: result.metadata?.isRead ?? true,
      importance: result.metadata?.importance || 'normal',
      attachments: (result.metadata?.attachments || []).map((att: any) => ({
        id: att.id,
        name: att.name,
        contentType: att.contentType,
        size: att.size,
      })),
    }

    return {
      found: true,
      message,
      connector: createConnectorMetadata(connector),
    }
  } catch (error) {
    return {
      found: false,
      error: error instanceof Error ? error.message : 'Failed to read message',
      connector: createConnectorMetadata(connector),
    }
  }
}

/**
 * List mail folders in Outlook.
 */
export async function outlookListFolders(
  params: OutlookListFoldersParams,
): Promise<OutlookListFoldersResult> {
  const connector = await getConnector(params.connector_id)

  if (connector.provider !== 'outlook-mail') {
    throw new Error(
      `Connector ${params.connector_id} is not an Outlook Mail connector`,
    )
  }

  try {
    const provider = (await getProvider(connector)) as any
    const result = (await provider.listFolders?.(connector)) || { folders: [] }

    const folders: OutlookFolder[] = (result.folders || []).map(
      (folder: any) => ({
        id: folder.id,
        displayName: folder.displayName || folder.name,
        parentFolderId: folder.parentFolderId,
        unreadItemCount: folder.unreadItemCount ?? 0,
        totalItemCount: folder.totalItemCount ?? 0,
      }),
    )

    return {
      folders,
      connector: createConnectorMetadata(connector),
    }
  } catch (error) {
    throw new Error(
      `Failed to list Outlook folders: ${error instanceof Error ? error.message : String(error)}`,
    )
  }
}

// ============================================================================
// OneDrive Tools
// ============================================================================

/**
 * Search files in OneDrive.
 */
export async function onedriveSearch(
  params: OneDriveSearchParams,
): Promise<OneDriveSearchResult> {
  const connector = await getConnector(params.connector_id)

  if (connector.provider !== 'onedrive') {
    throw new Error(
      `Connector ${params.connector_id} is not a OneDrive connector`,
    )
  }

  try {
    const provider = (await getProvider(connector)) as any
    const maxResults = Math.min(params.max_results ?? DEFAULT_MAX_RESULTS, 50)
    const result = await provider.search(connector, {
      query: params.query,
      pageSize: maxResults,
    })

    const files: OneDriveFileSummary[] = (result.items || []).map(
      (item: any) => ({
        id: item.id,
        name: item.name,
        mimeType: item.mimeType,
        isFolder: item.type === 'folder',
        size: item.size,
        lastModifiedDateTime: new Date(item.lastModified || Date.now()),
        webUrl: item.webUrl,
        parentPath: item.path,
      }),
    )

    return {
      query: params.query,
      result_count: files.length,
      files,
      next_cursor: result.cursor,
      connector: createConnectorMetadata(connector),
    }
  } catch (error) {
    throw new Error(
      `OneDrive search failed: ${error instanceof Error ? error.message : String(error)}`,
    )
  }
}

/**
 * Read file content from OneDrive.
 */
export async function onedriveRead(
  params: OneDriveReadParams,
): Promise<OneDriveReadResult> {
  const connector = await getConnector(params.connector_id)

  if (connector.provider !== 'onedrive') {
    throw new Error(
      `Connector ${params.connector_id} is not a OneDrive connector`,
    )
  }

  try {
    const provider = (await getProvider(connector)) as any
    const result = await provider.getContent(connector, params.file_id)

    if (!result.content && !result.metadata) {
      return {
        found: false,
        error: 'File not found',
        connector: createConnectorMetadata(connector),
      }
    }

    const file: OneDriveFileSummary = {
      id: params.file_id,
      name: result.metadata?.name || '',
      mimeType: result.metadata?.mimeType,
      isFolder: result.metadata?.type === 'folder',
      size: result.metadata?.size,
      lastModifiedDateTime: new Date(
        result.metadata?.lastModified || Date.now(),
      ),
      webUrl: result.metadata?.webUrl,
      parentPath: result.metadata?.path,
    }

    let content = result.content
    let truncated = false
    if (params.max_length && content && content.length > params.max_length) {
      content = content.slice(0, params.max_length)
      truncated = true
    }

    return {
      found: true,
      file,
      content,
      content_type: result.contentType === 'binary' ? 'binary' : 'text',
      truncated,
      connector: createConnectorMetadata(connector),
    }
  } catch (error) {
    return {
      found: false,
      error: error instanceof Error ? error.message : 'Failed to read file',
      connector: createConnectorMetadata(connector),
    }
  }
}

/**
 * List files in a OneDrive folder.
 */
export async function onedriveList(
  params: OneDriveListParams,
): Promise<OneDriveListResult> {
  const connector = await getConnector(params.connector_id)

  if (connector.provider !== 'onedrive') {
    throw new Error(
      `Connector ${params.connector_id} is not a OneDrive connector`,
    )
  }

  try {
    const provider = (await getProvider(connector)) as any
    const result = await provider.list(connector, {
      path: params.folder_id || '/',
      pageSize: params.limit ?? 50,
    })

    const files: OneDriveFileSummary[] = (result.items || []).map(
      (item: any) => ({
        id: item.id,
        name: item.name,
        mimeType: item.mimeType,
        isFolder: item.type === 'folder',
        size: item.size,
        lastModifiedDateTime: new Date(item.lastModified || Date.now()),
        webUrl: item.webUrl,
        parentPath: item.path,
      }),
    )

    return {
      folder: params.folder_id
        ? { id: params.folder_id, name: params.folder_id }
        : null,
      files,
      total_count: files.length,
      next_cursor: result.cursor,
      connector: createConnectorMetadata(connector),
    }
  } catch (error) {
    throw new Error(
      `OneDrive list failed: ${error instanceof Error ? error.message : String(error)}`,
    )
  }
}

// ============================================================================
// Slack Tools
// ============================================================================

/**
 * Search messages in Slack.
 */
export async function slackSearch(
  params: SlackSearchParams,
): Promise<SlackSearchResult> {
  const connector = await getConnector(params.connector_id)

  if (connector.provider !== 'slack') {
    throw new Error(`Connector ${params.connector_id} is not a Slack connector`)
  }

  try {
    const provider = (await getProvider(connector)) as any
    const maxResults = Math.min(params.max_results ?? 20, 100)
    const result = await provider.search(connector, {
      query: params.query,
      pageSize: maxResults,
    })

    const messages: SlackMessageSummary[] = (result.items || []).map(
      (item: any) => ({
        ts: item.id || item.ts,
        channelId: item.channelId || '',
        channelName: item.channelName || '',
        text: item.content || item.text || '',
        userId: item.userId,
        permalink: item.permalink || '',
      }),
    )

    return {
      query: params.query,
      result_count: messages.length,
      messages,
      connector: createConnectorMetadata(connector),
    }
  } catch (error) {
    throw new Error(
      `Slack search failed: ${error instanceof Error ? error.message : String(error)}`,
    )
  }
}

/**
 * List Slack channels.
 */
export async function slackListChannels(
  params: SlackListChannelsParams,
): Promise<SlackListChannelsResult> {
  const connector = await getConnector(params.connector_id)

  if (connector.provider !== 'slack') {
    throw new Error(`Connector ${params.connector_id} is not a Slack connector`)
  }

  try {
    const provider = (await getProvider(connector)) as any
    const result = await provider.list(connector, {
      pageSize: params.max_results ?? 100,
      includePrivate: params.include_private ?? true,
    })

    const channels: SlackChannelSummary[] = (result.items || []).map(
      (item: any) => ({
        id: item.id,
        name: item.name,
        isPrivate: item.isPrivate ?? false,
        isArchived: item.isArchived ?? false,
        topic: item.topic,
        purpose: item.purpose || item.description,
        numMembers: item.numMembers,
      }),
    )

    return {
      channels,
      result_count: channels.length,
      connector: createConnectorMetadata(connector),
    }
  } catch (error) {
    throw new Error(
      `Failed to list Slack channels: ${error instanceof Error ? error.message : String(error)}`,
    )
  }
}

/**
 * Read messages from a Slack channel.
 */
export async function slackReadChannel(
  params: SlackReadChannelParams,
): Promise<SlackReadChannelResult> {
  const connector = await getConnector(params.connector_id)

  if (connector.provider !== 'slack') {
    throw new Error(`Connector ${params.connector_id} is not a Slack connector`)
  }

  try {
    const provider = (await getProvider(connector)) as any
    const result = await provider.getContent(connector, params.channel_id, {
      limit: params.limit ?? 50,
      oldest: params.oldest,
      latest: params.latest,
    })

    const messages: SlackChannelMessage[] = (result.messages || []).map(
      (msg: any) => ({
        ts: msg.ts || msg.id,
        userId: msg.user || msg.userId,
        text: msg.text || msg.content || '',
        threadTs: msg.thread_ts || msg.threadTs,
        replyCount: msg.reply_count || msg.replyCount,
        hasAttachments: !!(msg.files?.length || msg.attachments?.length),
      }),
    )

    return {
      channel: {
        id: params.channel_id,
        name: result.channelName || params.channel_id,
      },
      messages,
      hasMore: result.has_more ?? false,
      connector: createConnectorMetadata(connector),
    }
  } catch (error) {
    throw new Error(
      `Failed to read Slack channel: ${error instanceof Error ? error.message : String(error)}`,
    )
  }
}

// ============================================================================
// Dropbox Tools
// ============================================================================

/**
 * Search files in Dropbox.
 */
export async function dropboxSearch(
  params: DropboxSearchParams,
): Promise<DropboxSearchResult> {
  const connector = await getConnector(params.connector_id)

  if (connector.provider !== 'dropbox') {
    throw new Error(
      `Connector ${params.connector_id} is not a Dropbox connector`,
    )
  }

  try {
    const provider = (await getProvider(connector)) as any
    const maxResults = Math.min(params.max_results ?? 20, 100)
    const result = await provider.search(connector, {
      query: params.query,
      path: params.path,
      pageSize: maxResults,
    })

    const files: DropboxFileSummary[] = (result.items || []).map(
      (item: any) => ({
        id: item.id,
        name: item.name,
        pathDisplay: item.path || item.pathDisplay || '',
        isFolder: item.type === 'folder',
        size: item.size,
        serverModified: item.lastModified
          ? new Date(item.lastModified)
          : undefined,
        contentHash: item.contentHash,
      }),
    )

    return {
      query: params.query,
      result_count: files.length,
      files,
      hasMore: result.hasMore ?? false,
      connector: createConnectorMetadata(connector),
    }
  } catch (error) {
    throw new Error(
      `Dropbox search failed: ${error instanceof Error ? error.message : String(error)}`,
    )
  }
}

/**
 * Read file content from Dropbox.
 */
export async function dropboxRead(
  params: DropboxReadParams,
): Promise<DropboxReadResult> {
  const connector = await getConnector(params.connector_id)

  if (connector.provider !== 'dropbox') {
    throw new Error(
      `Connector ${params.connector_id} is not a Dropbox connector`,
    )
  }

  try {
    const provider = (await getProvider(connector)) as any
    const result = await provider.getContent(connector, params.file_id)

    if (!result.content && !result.metadata) {
      return {
        found: false,
        error: 'File not found',
        connector: createConnectorMetadata(connector),
      }
    }

    const file: DropboxFileSummary = {
      id: params.file_id,
      name: result.metadata?.name || '',
      pathDisplay: result.metadata?.path || '',
      isFolder: result.metadata?.type === 'folder',
      size: result.metadata?.size,
      serverModified: result.metadata?.lastModified
        ? new Date(result.metadata.lastModified)
        : undefined,
      contentHash: result.metadata?.contentHash,
    }

    let content = result.content
    let truncated = false
    if (params.max_length && content && content.length > params.max_length) {
      content = content.slice(0, params.max_length)
      truncated = true
    }

    return {
      found: true,
      file,
      content,
      truncated,
      connector: createConnectorMetadata(connector),
    }
  } catch (error) {
    return {
      found: false,
      error: error instanceof Error ? error.message : 'Failed to read file',
      connector: createConnectorMetadata(connector),
    }
  }
}

/**
 * List files in a Dropbox folder.
 */
export async function dropboxList(
  params: DropboxListParams,
): Promise<DropboxListResult> {
  const connector = await getConnector(params.connector_id)

  if (connector.provider !== 'dropbox') {
    throw new Error(
      `Connector ${params.connector_id} is not a Dropbox connector`,
    )
  }

  try {
    const provider = (await getProvider(connector)) as any
    const result = await provider.list(connector, {
      path: params.path || '',
      pageSize: params.limit ?? 50,
    })

    const entries: DropboxFileSummary[] = (result.items || []).map(
      (item: any) => ({
        id: item.id,
        name: item.name,
        pathDisplay: item.path || item.pathDisplay || '',
        isFolder: item.type === 'folder',
        size: item.size,
        serverModified: item.lastModified
          ? new Date(item.lastModified)
          : undefined,
        contentHash: item.contentHash,
      }),
    )

    return {
      path: params.path || '/',
      entries,
      hasMore: result.hasMore ?? false,
      connector: createConnectorMetadata(connector),
    }
  } catch (error) {
    throw new Error(
      `Dropbox list failed: ${error instanceof Error ? error.message : String(error)}`,
    )
  }
}

// ============================================================================
// Figma Tools
// ============================================================================

/**
 * List Figma files.
 */
export async function figmaListFiles(
  params: FigmaListFilesParams,
): Promise<FigmaListFilesResult> {
  const connector = await getConnector(params.connector_id)

  if (connector.provider !== 'figma') {
    throw new Error(`Connector ${params.connector_id} is not a Figma connector`)
  }

  try {
    const provider = (await getProvider(connector)) as any
    const result = await provider.list(connector, {
      projectId: params.project_id,
      teamId: params.team_id,
    })

    const files: FigmaFileSummary[] = (result.items || []).map((item: any) => ({
      key: item.id || item.key,
      name: item.name,
      thumbnailUrl: item.thumbnailUrl || item.thumbnail_url,
      lastModified: new Date(
        item.lastModified || item.last_modified || Date.now(),
      ),
      editorType: item.editorType || item.editor_type,
    }))

    return {
      project: params.project_id
        ? {
            id: params.project_id,
            name: result.projectName || params.project_id,
          }
        : undefined,
      files,
      result_count: files.length,
      connector: createConnectorMetadata(connector),
    }
  } catch (error) {
    throw new Error(
      `Failed to list Figma files: ${error instanceof Error ? error.message : String(error)}`,
    )
  }
}

/**
 * Get Figma file details.
 */
export async function figmaGetFile(
  params: FigmaGetFileParams,
): Promise<FigmaGetFileResult> {
  const connector = await getConnector(params.connector_id)

  if (connector.provider !== 'figma') {
    throw new Error(`Connector ${params.connector_id} is not a Figma connector`)
  }

  try {
    const provider = (await getProvider(connector)) as any
    const result = await provider.getContent(connector, params.file_key, {
      depth: params.depth ?? 2,
    })

    if (!result.metadata) {
      return {
        found: false,
        error: 'File not found',
        connector: createConnectorMetadata(connector),
      }
    }

    const pages: FigmaNodeSummary[] = (result.pages || []).map((page: any) => ({
      id: page.id,
      name: page.name,
      type: page.type || 'PAGE',
      childCount: page.children?.length,
    }))

    return {
      found: true,
      file: {
        key: params.file_key,
        name: result.metadata.name,
        lastModified: new Date(result.metadata.lastModified || Date.now()),
        version: result.metadata.version || '0',
        thumbnailUrl: result.metadata.thumbnailUrl,
      },
      pages,
      componentCount: result.componentCount ?? 0,
      styleCount: result.styleCount ?? 0,
      connector: createConnectorMetadata(connector),
    }
  } catch (error) {
    return {
      found: false,
      error: error instanceof Error ? error.message : 'Failed to get file',
      connector: createConnectorMetadata(connector),
    }
  }
}

/**
 * Get comments on a Figma file.
 */
export async function figmaGetComments(
  params: FigmaGetCommentsParams,
): Promise<FigmaGetCommentsResult> {
  const connector = await getConnector(params.connector_id)

  if (connector.provider !== 'figma') {
    throw new Error(`Connector ${params.connector_id} is not a Figma connector`)
  }

  try {
    const provider = (await getProvider(connector)) as any
    const result = (await provider.getComments?.(
      connector,
      params.file_key,
    )) || {
      comments: [],
    }

    const comments: FigmaComment[] = (result.comments || []).map(
      (comment: any) => ({
        id: comment.id,
        message: comment.message || comment.text || '',
        authorName: comment.user?.handle || comment.authorName || 'Unknown',
        createdAt: new Date(
          comment.created_at || comment.createdAt || Date.now(),
        ),
        resolved: comment.resolved_at != null || comment.resolved || false,
        parentId: comment.parent_id || comment.parentId,
      }),
    )

    return {
      comments,
      result_count: comments.length,
      connector: createConnectorMetadata(connector),
    }
  } catch (error) {
    throw new Error(
      `Failed to get Figma comments: ${error instanceof Error ? error.message : String(error)}`,
    )
  }
}

// ============================================================================
// Google Chat Tools
// ============================================================================

/**
 * List Google Chat spaces.
 */
export async function googleChatListSpaces(
  params: GoogleChatListSpacesParams,
): Promise<GoogleChatListSpacesResult> {
  const connector = await getConnector(params.connector_id)

  if (connector.provider !== 'google-chat') {
    throw new Error(
      `Connector ${params.connector_id} is not a Google Chat connector`,
    )
  }

  try {
    const provider = (await getProvider(connector)) as any
    const result = await provider.list(connector, {
      pageSize: params.max_results ?? 50,
      type: params.type,
    })

    const spaces: GoogleChatSpaceSummary[] = (result.items || []).map(
      (item: any) => ({
        name: item.name || item.id,
        id: item.id,
        displayName: item.displayName || item.name,
        type: item.type || 'SPACE',
        threaded: item.threaded ?? false,
      }),
    )

    return {
      spaces,
      result_count: spaces.length,
      next_cursor: result.cursor,
      connector: createConnectorMetadata(connector),
    }
  } catch (error) {
    throw new Error(
      `Failed to list Google Chat spaces: ${error instanceof Error ? error.message : String(error)}`,
    )
  }
}

/**
 * Read messages from a Google Chat space.
 */
export async function googleChatReadMessages(
  params: GoogleChatReadMessagesParams,
): Promise<GoogleChatReadMessagesResult> {
  const connector = await getConnector(params.connector_id)

  if (connector.provider !== 'google-chat') {
    throw new Error(
      `Connector ${params.connector_id} is not a Google Chat connector`,
    )
  }

  try {
    const provider = (await getProvider(connector)) as any
    const result = await provider.getContent(connector, params.space_id, {
      pageSize: params.max_results ?? 50,
    })

    const messages: GoogleChatMessage[] = (result.messages || []).map(
      (msg: any) => ({
        name: msg.name || msg.id,
        senderName: msg.sender?.displayName || msg.senderName,
        senderType: msg.sender?.type || 'HUMAN',
        text: msg.text || msg.content || '',
        createTime: new Date(msg.createTime || msg.createdAt || Date.now()),
        threadName: msg.thread?.name || msg.threadName,
      }),
    )

    return {
      space: {
        id: params.space_id,
        name: result.spaceName || params.space_id,
      },
      messages,
      result_count: messages.length,
      next_cursor: result.cursor,
      connector: createConnectorMetadata(connector),
    }
  } catch (error) {
    throw new Error(
      `Failed to read Google Chat messages: ${error instanceof Error ? error.message : String(error)}`,
    )
  }
}

// ============================================================================
// Google Meet Tools
// ============================================================================

/**
 * List upcoming Google Meet meetings.
 */
export async function googleMeetListMeetings(
  params: GoogleMeetListMeetingsParams,
): Promise<GoogleMeetListMeetingsResult> {
  const connector = await getConnector(params.connector_id)

  if (connector.provider !== 'google-meet') {
    throw new Error(
      `Connector ${params.connector_id} is not a Google Meet connector`,
    )
  }

  try {
    const provider = (await getProvider(connector)) as any

    // Calculate default time range
    const now = new Date()
    const defaultTimeMax = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) // 7 days

    const timeMin = params.time_min || now.toISOString()
    const timeMax = params.time_max || defaultTimeMax.toISOString()

    const result = await provider.list(connector, {
      timeMin,
      timeMax,
      maxResults: params.max_results ?? 25,
    })

    const meetings: GoogleMeetMeetingSummary[] = (result.items || []).map(
      (item: any) => ({
        id: item.id,
        title: item.name || item.summary || 'Untitled Meeting',
        startTime: item.start ? new Date(item.start) : undefined,
        endTime: item.end ? new Date(item.end) : undefined,
        meetUrl: item.meetUrl || item.hangoutLink || '',
        calendarEventId: item.calendarEventId,
      }),
    )

    return {
      meetings,
      result_count: meetings.length,
      timeRange: {
        start: timeMin,
        end: timeMax,
      },
      connector: createConnectorMetadata(connector),
    }
  } catch (error) {
    throw new Error(
      `Failed to list Google Meet meetings: ${error instanceof Error ? error.message : String(error)}`,
    )
  }
}

// ============================================================================
// Tool Definitions Re-export
// ============================================================================

export {
  GMAIL_TOOL_DEFINITIONS,
  DRIVE_TOOL_DEFINITIONS,
  CALENDAR_TOOL_DEFINITIONS,
  TASKS_TOOL_DEFINITIONS,
  NOTION_TOOL_DEFINITIONS,
  QONTO_TOOL_DEFINITIONS,
  OUTLOOK_TOOL_DEFINITIONS,
  ONEDRIVE_TOOL_DEFINITIONS,
  SLACK_TOOL_DEFINITIONS,
  DROPBOX_TOOL_DEFINITIONS,
  FIGMA_TOOL_DEFINITIONS,
  GOOGLE_CHAT_TOOL_DEFINITIONS,
  GOOGLE_MEET_TOOL_DEFINITIONS,
  CONNECTOR_TOOL_DEFINITIONS,
  getToolDefinitionsForProvider,
} from './types'
