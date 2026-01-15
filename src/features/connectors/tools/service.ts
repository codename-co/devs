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
// Tool Definitions Re-export
// ============================================================================

export {
  GMAIL_TOOL_DEFINITIONS,
  DRIVE_TOOL_DEFINITIONS,
  CALENDAR_TOOL_DEFINITIONS,
  TASKS_TOOL_DEFINITIONS,
  NOTION_TOOL_DEFINITIONS,
  CONNECTOR_TOOL_DEFINITIONS,
  getToolDefinitionsForProvider,
} from './types'
