/**
 * Connector Tools Types
 *
 * This module defines types for connector-specific tool operations.
 * These tools allow LLM agents to search, read, and interact with
 * connected external services (Gmail, Google Drive, Calendar, etc.)
 *
 * @module features/connectors/tools/types
 */

import type { ToolDefinition } from '@/lib/llm/types'

// ============================================================================
// Common Types
// ============================================================================

/**
 * Base parameters for all connector tools.
 * Connector ID is required to identify which connected account to use.
 */
export interface ConnectorToolBaseParams {
  /**
   * The ID of the connector to use.
   * This identifies which connected account (e.g., which Gmail account).
   */
  connector_id: string
}

/**
 * Metadata about a connector for tool results.
 */
export interface ConnectorMetadata {
  /** Connector ID */
  connectorId: string
  /** Provider type */
  provider: string
  /** Account email (if available) */
  accountEmail?: string
}

// ============================================================================
// Gmail Tools
// ============================================================================

/**
 * Parameters for the gmail_search tool.
 * Search emails using Gmail's search syntax.
 */
export interface GmailSearchParams extends ConnectorToolBaseParams {
  /**
   * The search query using Gmail search syntax.
   * Examples:
   * - "from:boss@company.com" - Emails from a specific sender
   * - "subject:meeting" - Emails with meeting in subject
   * - "is:unread" - Unread emails
   * - "has:attachment" - Emails with attachments
   * - "after:2024/01/01 before:2024/12/31" - Date range
   * - "label:important" - Emails with specific label
   */
  query: string
  /**
   * Maximum number of results to return.
   * @default 10
   */
  max_results?: number
  /**
   * Filter by label ID.
   * Common labels: INBOX, SENT, DRAFT, STARRED, IMPORTANT, SPAM, TRASH
   */
  label?: string
}

/**
 * Email message summary for search results.
 */
export interface GmailMessageSummary {
  /** Message ID */
  id: string
  /** Thread ID */
  threadId: string
  /** Subject line */
  subject: string
  /** Sender name and email */
  from: string
  /** Recipient(s) */
  to: string
  /** Date sent/received */
  date: Date
  /** Short snippet of content */
  snippet: string
  /** Labels applied to this message */
  labels: string[]
  /** Whether the message has attachments */
  hasAttachments: boolean
}

/**
 * Result of gmail_search operation.
 */
export interface GmailSearchResult {
  /** The search query that was executed */
  query: string
  /** Total count of matching messages (approximate) */
  total_count: number
  /** Number of results returned */
  result_count: number
  /** The matching messages */
  messages: GmailMessageSummary[]
  /** Pagination cursor for more results */
  next_cursor?: string
  /** Connector metadata */
  connector: ConnectorMetadata
}

/**
 * Parameters for the gmail_read tool.
 * Read the full content of a specific email.
 */
export interface GmailReadParams extends ConnectorToolBaseParams {
  /**
   * The message ID to read.
   * Obtained from gmail_search results.
   */
  message_id: string
  /**
   * Whether to include full headers.
   * @default false
   */
  include_headers?: boolean
  /**
   * Whether to include attachment info.
   * @default true
   */
  include_attachments?: boolean
}

/**
 * Email attachment information.
 */
export interface GmailAttachment {
  /** Attachment ID */
  id: string
  /** Filename */
  filename: string
  /** MIME type */
  mimeType: string
  /** Size in bytes */
  size: number
}

/**
 * Full email message content.
 */
export interface GmailMessageContent {
  /** Message ID */
  id: string
  /** Thread ID */
  threadId: string
  /** Subject line */
  subject: string
  /** Sender */
  from: string
  /** Recipients (To) */
  to: string
  /** CC recipients */
  cc?: string
  /** BCC recipients */
  bcc?: string
  /** Date sent/received */
  date: Date
  /** Labels */
  labels: string[]
  /** Plain text body */
  body: string
  /** HTML body (if available) */
  htmlBody?: string
  /** Full headers (if requested) */
  headers?: Record<string, string>
  /** Attachments info */
  attachments: GmailAttachment[]
}

/**
 * Result of gmail_read operation.
 */
export interface GmailReadResult {
  /** Whether the message was found */
  found: boolean
  /** Error message if not found */
  error?: string
  /** The full message content */
  message?: GmailMessageContent
  /** Connector metadata */
  connector: ConnectorMetadata
}

/**
 * Parameters for the gmail_list_labels tool.
 * List available Gmail labels.
 */
export interface GmailListLabelsParams extends ConnectorToolBaseParams {
  /**
   * Filter by label type.
   */
  type?: 'system' | 'user' | 'all'
}

/**
 * Gmail label information.
 */
export interface GmailLabel {
  /** Label ID */
  id: string
  /** Display name */
  name: string
  /** Label type */
  type: 'system' | 'user'
  /** Message count */
  messageCount?: number
  /** Unread count */
  unreadCount?: number
}

/**
 * Result of gmail_list_labels operation.
 */
export interface GmailListLabelsResult {
  /** Available labels */
  labels: GmailLabel[]
  /** Connector metadata */
  connector: ConnectorMetadata
}

// ============================================================================
// Google Drive Tools
// ============================================================================

/**
 * Parameters for the drive_search tool.
 * Search files in Google Drive.
 */
export interface DriveSearchParams extends ConnectorToolBaseParams {
  /**
   * The search query.
   * Supports natural language or Drive query syntax.
   * Examples:
   * - "budget 2024" - Files containing these terms
   * - "type:spreadsheet" - Filter by file type
   * - "owner:me" - Files owned by you
   * - "modifiedTime > 2024-01-01" - Recently modified
   */
  query: string
  /**
   * Maximum number of results.
   * @default 10
   */
  max_results?: number
  /**
   * Filter by MIME type.
   * Examples: "application/pdf", "application/vnd.google-apps.spreadsheet"
   */
  mime_type?: string
  /**
   * Filter by parent folder ID.
   */
  folder_id?: string
}

/**
 * Drive file summary for search results.
 */
export interface DriveFileSummary {
  /** File ID */
  id: string
  /** File name */
  name: string
  /** MIME type */
  mimeType: string
  /** Whether it's a folder */
  isFolder: boolean
  /** File size in bytes (not available for Google Docs) */
  size?: number
  /** Last modified date */
  modifiedTime: Date
  /** Web view URL */
  webViewLink?: string
  /** Parent folder IDs */
  parents?: string[]
}

/**
 * Result of drive_search operation.
 */
export interface DriveSearchResult {
  /** Search query executed */
  query: string
  /** Number of results */
  result_count: number
  /** Matching files */
  files: DriveFileSummary[]
  /** Pagination cursor */
  next_cursor?: string
  /** Connector metadata */
  connector: ConnectorMetadata
}

/**
 * Parameters for the drive_read tool.
 * Read the content of a Drive file.
 */
export interface DriveReadParams extends ConnectorToolBaseParams {
  /**
   * The file ID to read.
   */
  file_id: string
  /**
   * Maximum content length for text files (in characters).
   */
  max_length?: number
}

/**
 * Result of drive_read operation.
 */
export interface DriveReadResult {
  /** Whether the file was found */
  found: boolean
  /** Error message if failed */
  error?: string
  /** File metadata */
  file?: DriveFileSummary
  /** File content (for text-based files) */
  content?: string
  /** Content type */
  content_type?: 'text' | 'binary' | 'google_doc'
  /** Whether content was truncated */
  truncated?: boolean
  /** Connector metadata */
  connector: ConnectorMetadata
}

/**
 * Parameters for the drive_list tool.
 * List files in a Drive folder.
 */
export interface DriveListParams extends ConnectorToolBaseParams {
  /**
   * Folder ID to list. Omit for root.
   */
  folder_id?: string
  /**
   * Maximum number of results.
   * @default 50
   */
  limit?: number
  /**
   * Sort by field.
   * @default 'name'
   */
  sort_by?: 'name' | 'modifiedTime' | 'createdTime'
  /**
   * Sort direction.
   * @default 'asc'
   */
  sort_order?: 'asc' | 'desc'
}

/**
 * Result of drive_list operation.
 */
export interface DriveListResult {
  /** Parent folder info (null if root) */
  folder: { id: string; name: string } | null
  /** Files in the folder */
  files: DriveFileSummary[]
  /** Total count */
  total_count: number
  /** Pagination cursor */
  next_cursor?: string
  /** Connector metadata */
  connector: ConnectorMetadata
}

// ============================================================================
// Google Calendar Tools
// ============================================================================

/**
 * Parameters for the calendar_list_events tool.
 * List calendar events.
 */
export interface CalendarListEventsParams extends ConnectorToolBaseParams {
  /**
   * Calendar ID to list events from.
   * @default 'primary'
   */
  calendar_id?: string
  /**
   * Start of time range (ISO 8601).
   * @default now
   */
  time_min?: string
  /**
   * End of time range (ISO 8601).
   * @default 30 days from now
   */
  time_max?: string
  /**
   * Maximum number of events.
   * @default 25
   */
  max_results?: number
  /**
   * Search query for event title/description.
   */
  query?: string
}

/**
 * Calendar event summary.
 */
export interface CalendarEventSummary {
  /** Event ID */
  id: string
  /** Event title */
  summary: string
  /** Event description */
  description?: string
  /** Location */
  location?: string
  /** Start time */
  start: Date
  /** End time */
  end: Date
  /** Whether all-day event */
  isAllDay: boolean
  /** Event status */
  status: 'confirmed' | 'tentative' | 'cancelled'
  /** Organizer email */
  organizer?: string
  /** Attendee count */
  attendeeCount?: number
  /** Meeting link (if any) */
  meetingLink?: string
  /** Event HTML link */
  htmlLink?: string
}

/**
 * Result of calendar_list_events operation.
 */
export interface CalendarListEventsResult {
  /** Calendar name */
  calendar: string
  /** Time range queried */
  timeRange: {
    start: string
    end: string
  }
  /** Number of events */
  result_count: number
  /** Events */
  events: CalendarEventSummary[]
  /** Pagination cursor */
  next_cursor?: string
  /** Connector metadata */
  connector: ConnectorMetadata
}

/**
 * Parameters for the calendar_get_event tool.
 * Get details of a specific event.
 */
export interface CalendarGetEventParams extends ConnectorToolBaseParams {
  /**
   * Event ID to retrieve.
   */
  event_id: string
  /**
   * Calendar ID.
   * @default 'primary'
   */
  calendar_id?: string
}

/**
 * Detailed calendar event.
 */
export interface CalendarEventDetail extends CalendarEventSummary {
  /** Full attendee list */
  attendees?: Array<{
    email: string
    name?: string
    responseStatus: 'needsAction' | 'declined' | 'tentative' | 'accepted'
    organizer?: boolean
  }>
  /** Recurrence rules */
  recurrence?: string[]
  /** Conference data */
  conferenceData?: {
    type: string
    entryPoints: Array<{
      type: string
      uri: string
      label?: string
    }>
  }
  /** Reminders */
  reminders?: Array<{
    method: 'email' | 'popup'
    minutes: number
  }>
  /** Created time */
  createdAt: Date
  /** Last updated */
  updatedAt: Date
}

/**
 * Result of calendar_get_event operation.
 */
export interface CalendarGetEventResult {
  /** Whether event was found */
  found: boolean
  /** Error if not found */
  error?: string
  /** Event details */
  event?: CalendarEventDetail
  /** Connector metadata */
  connector: ConnectorMetadata
}

/**
 * Parameters for the calendar_search tool.
 * Search for events across calendars.
 */
export interface CalendarSearchParams extends ConnectorToolBaseParams {
  /**
   * Search query for event title/description.
   */
  query: string
  /**
   * Start of time range.
   */
  time_min?: string
  /**
   * End of time range.
   */
  time_max?: string
  /**
   * Maximum results.
   * @default 10
   */
  max_results?: number
}

/**
 * Result of calendar_search operation.
 */
export interface CalendarSearchResult {
  /** Search query */
  query: string
  /** Result count */
  result_count: number
  /** Matching events */
  events: CalendarEventSummary[]
  /** Connector metadata */
  connector: ConnectorMetadata
}

// ============================================================================
// Google Tasks Tools
// ============================================================================

/**
 * Parameters for the tasks_list tool.
 * List tasks from a task list.
 */
export interface TasksListParams extends ConnectorToolBaseParams {
  /**
   * Task list ID. Omit for default list.
   */
  tasklist_id?: string
  /**
   * Maximum number of tasks.
   * @default 50
   */
  max_results?: number
  /**
   * Filter by completion status.
   */
  show_completed?: boolean
  /**
   * Show hidden tasks.
   * @default false
   */
  show_hidden?: boolean
  /**
   * Only show tasks due before this date.
   */
  due_max?: string
  /**
   * Only show tasks due after this date.
   */
  due_min?: string
}

/**
 * Task summary.
 */
export interface TaskSummary {
  /** Task ID */
  id: string
  /** Task title */
  title: string
  /** Notes/description */
  notes?: string
  /** Due date */
  due?: Date
  /** Status */
  status: 'needsAction' | 'completed'
  /** Completed date */
  completedAt?: Date
  /** Parent task ID (for subtasks) */
  parentId?: string
  /** Last updated */
  updatedAt: Date
  /** Web link */
  webViewLink?: string
}

/**
 * Result of tasks_list operation.
 */
export interface TasksListResult {
  /** Task list info */
  taskList: {
    id: string
    title: string
  }
  /** Tasks in the list */
  tasks: TaskSummary[]
  /** Result count */
  result_count: number
  /** Pagination cursor */
  next_cursor?: string
  /** Connector metadata */
  connector: ConnectorMetadata
}

/**
 * Parameters for the tasks_get tool.
 * Get details of a specific task.
 */
export interface TasksGetParams extends ConnectorToolBaseParams {
  /**
   * Task ID.
   */
  task_id: string
  /**
   * Task list ID.
   */
  tasklist_id?: string
}

/**
 * Result of tasks_get operation.
 */
export interface TasksGetResult {
  /** Whether task was found */
  found: boolean
  /** Error if not found */
  error?: string
  /** Task details */
  task?: TaskSummary
  /** Connector metadata */
  connector: ConnectorMetadata
}

/**
 * Parameters for the tasks_list_tasklists tool.
 * List all task lists.
 */
export interface TasksListTasklistsParams extends ConnectorToolBaseParams {
  /**
   * Maximum results.
   * @default 20
   */
  max_results?: number
}

/**
 * Task list summary.
 */
export interface TasklistSummary {
  /** Task list ID */
  id: string
  /** Title */
  title: string
  /** Last updated */
  updatedAt: Date
}

/**
 * Result of tasks_list_tasklists operation.
 */
export interface TasksListTasklistsResult {
  /** Task lists */
  taskLists: TasklistSummary[]
  /** Result count */
  result_count: number
  /** Connector metadata */
  connector: ConnectorMetadata
}

// ============================================================================
// Notion Tools
// ============================================================================

/**
 * Parameters for the notion_search tool.
 * Search Notion pages and databases.
 */
export interface NotionSearchParams extends ConnectorToolBaseParams {
  /**
   * Search query.
   */
  query: string
  /**
   * Filter by object type.
   */
  filter?: 'page' | 'database' | 'all'
  /**
   * Maximum results.
   * @default 10
   */
  max_results?: number
}

/**
 * Notion page/database summary.
 */
export interface NotionItemSummary {
  /** Object ID */
  id: string
  /** Object type */
  type: 'page' | 'database'
  /** Title */
  title: string
  /** Icon emoji (if any) */
  icon?: string
  /** URL */
  url: string
  /** Last edited time */
  lastEditedTime: Date
  /** Parent info */
  parent?: {
    type: 'database' | 'page' | 'workspace'
    id?: string
  }
}

/**
 * Result of notion_search operation.
 */
export interface NotionSearchResult {
  /** Search query */
  query: string
  /** Result count */
  result_count: number
  /** Matching items */
  items: NotionItemSummary[]
  /** Pagination cursor */
  next_cursor?: string
  /** Connector metadata */
  connector: ConnectorMetadata
}

/**
 * Parameters for the notion_read_page tool.
 * Read content of a Notion page.
 */
export interface NotionReadPageParams extends ConnectorToolBaseParams {
  /**
   * Page ID to read.
   */
  page_id: string
  /**
   * Whether to include child blocks.
   * @default true
   */
  include_content?: boolean
  /**
   * Maximum content length (in characters).
   */
  max_length?: number
}

/**
 * Notion page content.
 */
export interface NotionPageContent {
  /** Page ID */
  id: string
  /** Title */
  title: string
  /** Icon */
  icon?: string
  /** Cover URL */
  coverUrl?: string
  /** URL */
  url: string
  /** Properties */
  properties: Record<string, unknown>
  /** Content as markdown */
  content: string
  /** Created time */
  createdAt: Date
  /** Last edited time */
  lastEditedTime: Date
}

/**
 * Result of notion_read_page operation.
 */
export interface NotionReadPageResult {
  /** Whether page was found */
  found: boolean
  /** Error if not found */
  error?: string
  /** Page content */
  page?: NotionPageContent
  /** Whether content was truncated */
  truncated?: boolean
  /** Connector metadata */
  connector: ConnectorMetadata
}

/**
 * Parameters for the notion_query_database tool.
 * Query a Notion database.
 */
export interface NotionQueryDatabaseParams extends ConnectorToolBaseParams {
  /**
   * Database ID to query.
   */
  database_id: string
  /**
   * Filter conditions (Notion filter format).
   */
  filter?: Record<string, unknown>
  /**
   * Sort conditions.
   */
  sorts?: Array<{
    property?: string
    timestamp?: 'created_time' | 'last_edited_time'
    direction: 'ascending' | 'descending'
  }>
  /**
   * Maximum results.
   * @default 25
   */
  max_results?: number
}

/**
 * Database entry summary.
 */
export interface NotionDatabaseEntry {
  /** Entry ID */
  id: string
  /** Entry URL */
  url: string
  /** Properties */
  properties: Record<string, unknown>
  /** Created time */
  createdAt: Date
  /** Last edited time */
  lastEditedTime: Date
}

/**
 * Result of notion_query_database operation.
 */
export interface NotionQueryDatabaseResult {
  /** Database info */
  database: {
    id: string
    title: string
  }
  /** Query results */
  entries: NotionDatabaseEntry[]
  /** Result count */
  result_count: number
  /** Pagination cursor */
  next_cursor?: string
  /** Connector metadata */
  connector: ConnectorMetadata
}

// ============================================================================
// Qonto Tools
// ============================================================================

/**
 * Parameters for the qonto_list_business_accounts tool.
 * List business accounts from Qonto.
 */
export interface QontoListBusinessAccountsParams
  extends ConnectorToolBaseParams {
  /**
   * Page number for pagination.
   * @default 1
   */
  page?: number
  /**
   * Number of accounts per page.
   * @default 100
   */
  per_page?: number
}

/**
 * Qonto business account summary.
 */
export interface QontoBankAccountSummary {
  /** Account ID */
  id: string
  /** Account name */
  name: string
  /** Organization ID */
  organizationId: string
  /** Account status */
  status: 'active' | 'inactive' | 'closed'
  /** Whether this is the main account */
  main: boolean
  /** IBAN */
  iban?: string
  /** BIC */
  bic?: string
  /** Currency */
  currency?: string
  /** Current balance */
  balance?: number
  /** Authorized balance */
  authorizedBalance?: number
  /** Last update */
  updatedAt?: Date
}

/**
 * Result of qonto_list_business_accounts operation.
 */
export interface QontoListBusinessAccountsResult {
  /** Business accounts */
  accounts: QontoBankAccountSummary[]
  /** Result count */
  result_count: number
  /** Total count */
  total_count?: number
  /** Pagination info */
  pagination?: {
    current_page: number
    total_pages: number
    per_page: number
  }
  /** Connector metadata */
  connector: ConnectorMetadata
}

/**
 * Parameters for the qonto_list_transactions tool.
 * List transactions from a Qonto bank account.
 */
export interface QontoListTransactionsParams extends ConnectorToolBaseParams {
  /**
   * Bank account ID to list transactions for.
   */
  bank_account_id?: string
  /**
   * IBAN of the bank account.
   */
  iban?: string
  /**
   * Filter by transaction status.
   */
  status?: ('pending' | 'declined' | 'completed')[]
  /**
   * Filter by transaction side.
   */
  side?: 'credit' | 'debit'
  /**
   * Filter by transactions updated after this date (ISO 8601).
   */
  updated_at_from?: string
  /**
   * Filter by transactions updated before this date (ISO 8601).
   */
  updated_at_to?: string
  /**
   * Filter by transactions settled after this date (ISO 8601).
   */
  settled_at_from?: string
  /**
   * Filter by transactions settled before this date (ISO 8601).
   */
  settled_at_to?: string
  /**
   * Sort by field and direction.
   * @default 'settled_at:desc'
   */
  sort_by?: string
  /**
   * Page number.
   * @default 1
   */
  page?: number
  /**
   * Results per page.
   * @default 100
   */
  per_page?: number
}

/**
 * Qonto transaction summary.
 */
export interface QontoTransactionSummary {
  /** Transaction ID */
  id: string
  /** Transaction reference ID */
  transactionId: string
  /** Amount */
  amount: number
  /** Amount in cents */
  amountCents: number
  /** Transaction side */
  side: 'credit' | 'debit'
  /** Operation type */
  operationType: string
  /** Currency */
  currency: string
  /** Label/description */
  label: string
  /** Status */
  status: 'pending' | 'declined' | 'completed'
  /** Settlement date */
  settledAt?: Date
  /** Emission date */
  emittedAt?: Date
  /** Note */
  note?: string
  /** Category */
  category?: string
  /** Whether attachment is required */
  attachmentRequired: boolean
  /** Number of attachments */
  attachmentCount: number
}

/**
 * Result of qonto_list_transactions operation.
 */
export interface QontoListTransactionsResult {
  /** Transactions */
  transactions: QontoTransactionSummary[]
  /** Result count */
  result_count: number
  /** Pagination info */
  pagination: {
    current_page: number
    total_pages: number
    total_count: number
    per_page: number
  }
  /** Connector metadata */
  connector: ConnectorMetadata
}

/**
 * Parameters for the qonto_get_transaction tool.
 * Get a specific transaction by ID.
 */
export interface QontoGetTransactionParams extends ConnectorToolBaseParams {
  /**
   * Transaction ID.
   */
  transaction_id: string
  /**
   * Include additional details.
   */
  includes?: ('vat_details' | 'labels' | 'attachments')[]
}

/**
 * Full Qonto transaction details.
 */
export interface QontoTransactionDetail extends QontoTransactionSummary {
  /** Local amount (in local currency) */
  localAmount?: number
  /** Local currency */
  localCurrency?: string
  /** VAT amount */
  vatAmount?: number
  /** VAT rate */
  vatRate?: number
  /** Reference */
  reference?: string
  /** Card last digits (if card payment) */
  cardLastDigits?: string
  /** Cashflow category */
  cashflowCategory?: string
  /** Cashflow subcategory */
  cashflowSubcategory?: string
  /** Initiator ID */
  initiatorId?: string
  /** Label IDs */
  labelIds?: string[]
  /** Attachment IDs */
  attachmentIds?: string[]
  /** Transfer details (if transfer) */
  transfer?: {
    counterpartyAccountNumber?: string
    counterpartyBankIdentifier?: string
  }
}

/**
 * Result of qonto_get_transaction operation.
 */
export interface QontoGetTransactionResult {
  /** Whether transaction was found */
  found: boolean
  /** Error message if not found */
  error?: string
  /** Transaction details */
  transaction?: QontoTransactionDetail
  /** Connector metadata */
  connector: ConnectorMetadata
}

/**
 * Parameters for the qonto_list_statements tool.
 * List bank statements from Qonto.
 */
export interface QontoListStatementsParams extends ConnectorToolBaseParams {
  /**
   * Filter by bank account IDs.
   */
  bank_account_ids?: string[]
  /**
   * Filter by IBANs.
   */
  ibans?: string[]
  /**
   * Filter by period from (format: MM-YYYY).
   */
  period_from?: string
  /**
   * Filter by period to (format: MM-YYYY).
   */
  period_to?: string
  /**
   * Sort by field.
   * @default 'period:desc'
   */
  sort_by?: string
  /**
   * Page number.
   * @default 1
   */
  page?: number
  /**
   * Results per page.
   * @default 100
   */
  per_page?: number
}

/**
 * Qonto statement summary.
 */
export interface QontoStatementSummary {
  /** Statement ID */
  id: string
  /** Bank account ID */
  bankAccountId: string
  /** Period (format: MM-YYYY) */
  period: string
  /** File info */
  file: {
    fileName: string
    contentType: string
    size: number
  }
}

/**
 * Result of qonto_list_statements operation.
 */
export interface QontoListStatementsResult {
  /** Statements */
  statements: QontoStatementSummary[]
  /** Result count */
  result_count: number
  /** Pagination info */
  pagination: {
    current_page: number
    total_pages: number
    total_count: number
    per_page: number
  }
  /** Connector metadata */
  connector: ConnectorMetadata
}

/**
 * Parameters for the qonto_get_statement tool.
 * Get a specific statement by ID.
 */
export interface QontoGetStatementParams extends ConnectorToolBaseParams {
  /**
   * Statement ID.
   */
  statement_id: string
}

/**
 * Full Qonto statement details with download URL.
 */
export interface QontoStatementDetail extends QontoStatementSummary {
  /** Download URL for the PDF */
  downloadUrl: string
}

/**
 * Result of qonto_get_statement operation.
 */
export interface QontoGetStatementResult {
  /** Whether statement was found */
  found: boolean
  /** Error message if not found */
  error?: string
  /** Statement details */
  statement?: QontoStatementDetail
  /** Connector metadata */
  connector: ConnectorMetadata
}

// ============================================================================
// Tool Name Types
// ============================================================================

/**
 * Gmail tool names.
 */
export type GmailToolName = 'gmail_search' | 'gmail_read' | 'gmail_list_labels'

/**
 * Google Drive tool names.
 */
export type DriveToolName = 'drive_search' | 'drive_read' | 'drive_list'

/**
 * Google Calendar tool names.
 */
export type CalendarToolName =
  | 'calendar_list_events'
  | 'calendar_get_event'
  | 'calendar_search'

/**
 * Google Tasks tool names.
 */
export type TasksToolName = 'tasks_list' | 'tasks_get' | 'tasks_list_tasklists'

/**
 * Notion tool names.
 */
export type NotionToolName =
  | 'notion_search'
  | 'notion_read_page'
  | 'notion_query_database'

/**
 * Qonto tool names.
 */
export type QontoToolName =
  | 'qonto_list_business_accounts'
  | 'qonto_list_transactions'
  | 'qonto_get_transaction'
  | 'qonto_list_statements'
  | 'qonto_get_statement'

/**
 * All connector tool names.
 */
export type ConnectorToolName =
  | GmailToolName
  | DriveToolName
  | CalendarToolName
  | TasksToolName
  | NotionToolName
  | QontoToolName
  | OutlookToolName
  | OneDriveToolName
  | SlackToolName
  | DropboxToolName
  | FigmaToolName
  | GoogleChatToolName
  | GoogleMeetToolName

// ============================================================================
// Tool Definitions
// ============================================================================

/**
 * Gmail tool definitions for LLM function calling.
 */
export const GMAIL_TOOL_DEFINITIONS: Record<GmailToolName, ToolDefinition> = {
  gmail_search: {
    type: 'function',
    function: {
      name: 'gmail_search',
      description: `Search for emails in a connected Gmail account.

Uses Gmail's powerful search syntax. Examples:
- "from:john@example.com" - Emails from specific sender
- "subject:quarterly report" - Emails with specific subject
- "is:unread" - Unread emails only
- "has:attachment filename:pdf" - PDFs with attachments
- "after:2024/01/01 before:2024/06/30" - Date range
- "label:work" - Emails with specific label
- "larger:10M" - Large emails
- Combine: "from:boss@company.com is:unread has:attachment"`,
      parameters: {
        type: 'object',
        properties: {
          connector_id: {
            type: 'string',
            description: 'The Gmail connector ID to use',
          },
          query: {
            type: 'string',
            description: 'Search query using Gmail search syntax',
          },
          max_results: {
            type: 'integer',
            description: 'Maximum number of results (default: 10, max: 50)',
            minimum: 1,
            maximum: 50,
          },
          label: {
            type: 'string',
            description: 'Filter by label (e.g., INBOX, SENT, STARRED)',
          },
        },
        required: ['connector_id', 'query'],
      },
    },
  },

  gmail_read: {
    type: 'function',
    function: {
      name: 'gmail_read',
      description:
        'Read the full content of a specific email by message ID. ' +
        'Use this after gmail_search to get complete email content including body and attachments.',
      parameters: {
        type: 'object',
        properties: {
          connector_id: {
            type: 'string',
            description: 'The Gmail connector ID to use',
          },
          message_id: {
            type: 'string',
            description: 'The message ID from gmail_search results',
          },
          include_headers: {
            type: 'boolean',
            description: 'Include full email headers (default: false)',
          },
          include_attachments: {
            type: 'boolean',
            description: 'Include attachment metadata (default: true)',
          },
        },
        required: ['connector_id', 'message_id'],
      },
    },
  },

  gmail_list_labels: {
    type: 'function',
    function: {
      name: 'gmail_list_labels',
      description:
        'List available Gmail labels in the connected account. ' +
        'Useful for discovering folder/label structure before searching.',
      parameters: {
        type: 'object',
        properties: {
          connector_id: {
            type: 'string',
            description: 'The Gmail connector ID to use',
          },
          type: {
            type: 'string',
            description: 'Filter by label type',
            enum: ['system', 'user', 'all'],
          },
        },
        required: ['connector_id'],
      },
    },
  },
}

/**
 * Google Drive tool definitions for LLM function calling.
 */
export const DRIVE_TOOL_DEFINITIONS: Record<DriveToolName, ToolDefinition> = {
  drive_search: {
    type: 'function',
    function: {
      name: 'drive_search',
      description: `Search for files in connected Google Drive.

Supports natural language and Drive query syntax:
- "budget spreadsheet" - Natural language search
- "name contains 'report'" - Name filter
- "mimeType='application/pdf'" - File type filter
- "modifiedTime > '2024-01-01'" - Date filter
- "'folderId' in parents" - Files in specific folder
- "starred" - Starred files
- "trashed = false" - Exclude trashed files`,
      parameters: {
        type: 'object',
        properties: {
          connector_id: {
            type: 'string',
            description: 'The Google Drive connector ID to use',
          },
          query: {
            type: 'string',
            description: 'Search query (natural language or Drive syntax)',
          },
          max_results: {
            type: 'integer',
            description: 'Maximum results (default: 10, max: 50)',
            minimum: 1,
            maximum: 50,
          },
          mime_type: {
            type: 'string',
            description: 'Filter by MIME type (e.g., application/pdf)',
          },
          folder_id: {
            type: 'string',
            description: 'Search only within this folder',
          },
        },
        required: ['connector_id', 'query'],
      },
    },
  },

  drive_read: {
    type: 'function',
    function: {
      name: 'drive_read',
      description:
        'Read the content of a file from Google Drive. ' +
        'Works with text files, Google Docs, Sheets, and Slides (exported as text). ' +
        'Binary files return metadata only.',
      parameters: {
        type: 'object',
        properties: {
          connector_id: {
            type: 'string',
            description: 'The Google Drive connector ID to use',
          },
          file_id: {
            type: 'string',
            description: 'The file ID from drive_search results',
          },
          max_length: {
            type: 'integer',
            description: 'Maximum content length in characters',
            minimum: 100,
          },
        },
        required: ['connector_id', 'file_id'],
      },
    },
  },

  drive_list: {
    type: 'function',
    function: {
      name: 'drive_list',
      description:
        'List files and folders in a Google Drive directory. ' +
        'Useful for browsing folder structure.',
      parameters: {
        type: 'object',
        properties: {
          connector_id: {
            type: 'string',
            description: 'The Google Drive connector ID to use',
          },
          folder_id: {
            type: 'string',
            description: 'Folder ID to list (omit for root/My Drive)',
          },
          limit: {
            type: 'integer',
            description: 'Maximum items to return (default: 50)',
            minimum: 1,
            maximum: 100,
          },
          sort_by: {
            type: 'string',
            description: 'Sort field',
            enum: ['name', 'modifiedTime', 'createdTime'],
          },
          sort_order: {
            type: 'string',
            description: 'Sort direction',
            enum: ['asc', 'desc'],
          },
        },
        required: ['connector_id'],
      },
    },
  },
}

/**
 * Google Calendar tool definitions for LLM function calling.
 */
export const CALENDAR_TOOL_DEFINITIONS: Record<
  CalendarToolName,
  ToolDefinition
> = {
  calendar_list_events: {
    type: 'function',
    function: {
      name: 'calendar_list_events',
      description:
        'List upcoming calendar events from connected Google Calendar. ' +
        'Returns events in chronological order within the specified time range.',
      parameters: {
        type: 'object',
        properties: {
          connector_id: {
            type: 'string',
            description: 'The Google Calendar connector ID to use',
          },
          calendar_id: {
            type: 'string',
            description: "Calendar ID (default: 'primary' for main calendar)",
          },
          time_min: {
            type: 'string',
            description:
              'Start of time range in ISO 8601 format (default: now)',
          },
          time_max: {
            type: 'string',
            description:
              'End of time range in ISO 8601 format (default: 30 days from now)',
          },
          max_results: {
            type: 'integer',
            description: 'Maximum events to return (default: 25)',
            minimum: 1,
            maximum: 100,
          },
          query: {
            type: 'string',
            description: 'Search query to filter events by title/description',
          },
        },
        required: ['connector_id'],
      },
    },
  },

  calendar_get_event: {
    type: 'function',
    function: {
      name: 'calendar_get_event',
      description:
        'Get detailed information about a specific calendar event, ' +
        'including attendees, conference info, and reminders.',
      parameters: {
        type: 'object',
        properties: {
          connector_id: {
            type: 'string',
            description: 'The Google Calendar connector ID to use',
          },
          event_id: {
            type: 'string',
            description: 'The event ID from calendar_list_events results',
          },
          calendar_id: {
            type: 'string',
            description: "Calendar ID (default: 'primary')",
          },
        },
        required: ['connector_id', 'event_id'],
      },
    },
  },

  calendar_search: {
    type: 'function',
    function: {
      name: 'calendar_search',
      description:
        'Search for calendar events by keyword. ' +
        'Searches in event titles and descriptions.',
      parameters: {
        type: 'object',
        properties: {
          connector_id: {
            type: 'string',
            description: 'The Google Calendar connector ID to use',
          },
          query: {
            type: 'string',
            description: 'Search query for event title/description',
          },
          time_min: {
            type: 'string',
            description: 'Start of time range (ISO 8601)',
          },
          time_max: {
            type: 'string',
            description: 'End of time range (ISO 8601)',
          },
          max_results: {
            type: 'integer',
            description: 'Maximum results (default: 10)',
            minimum: 1,
            maximum: 50,
          },
        },
        required: ['connector_id', 'query'],
      },
    },
  },
}

/**
 * Google Tasks tool definitions for LLM function calling.
 */
export const TASKS_TOOL_DEFINITIONS: Record<TasksToolName, ToolDefinition> = {
  tasks_list: {
    type: 'function',
    function: {
      name: 'tasks_list',
      description:
        'List tasks from a connected Google Tasks list. ' +
        'Can filter by completion status and due date.',
      parameters: {
        type: 'object',
        properties: {
          connector_id: {
            type: 'string',
            description: 'The Google Tasks connector ID to use',
          },
          tasklist_id: {
            type: 'string',
            description: 'Task list ID (omit for default list)',
          },
          max_results: {
            type: 'integer',
            description: 'Maximum tasks to return (default: 50)',
            minimum: 1,
            maximum: 100,
          },
          show_completed: {
            type: 'boolean',
            description: 'Include completed tasks',
          },
          show_hidden: {
            type: 'boolean',
            description: 'Include hidden tasks (default: false)',
          },
          due_max: {
            type: 'string',
            description: 'Only tasks due before this date (ISO 8601)',
          },
          due_min: {
            type: 'string',
            description: 'Only tasks due after this date (ISO 8601)',
          },
        },
        required: ['connector_id'],
      },
    },
  },

  tasks_get: {
    type: 'function',
    function: {
      name: 'tasks_get',
      description: 'Get details of a specific task by ID.',
      parameters: {
        type: 'object',
        properties: {
          connector_id: {
            type: 'string',
            description: 'The Google Tasks connector ID to use',
          },
          task_id: {
            type: 'string',
            description: 'The task ID to retrieve',
          },
          tasklist_id: {
            type: 'string',
            description: 'Task list ID containing the task',
          },
        },
        required: ['connector_id', 'task_id'],
      },
    },
  },

  tasks_list_tasklists: {
    type: 'function',
    function: {
      name: 'tasks_list_tasklists',
      description:
        'List all task lists in the connected Google Tasks account. ' +
        'Useful for discovering available task lists before listing tasks.',
      parameters: {
        type: 'object',
        properties: {
          connector_id: {
            type: 'string',
            description: 'The Google Tasks connector ID to use',
          },
          max_results: {
            type: 'integer',
            description: 'Maximum task lists to return (default: 20)',
            minimum: 1,
            maximum: 100,
          },
        },
        required: ['connector_id'],
      },
    },
  },
}

/**
 * Notion tool definitions for LLM function calling.
 */
export const NOTION_TOOL_DEFINITIONS: Record<NotionToolName, ToolDefinition> = {
  notion_search: {
    type: 'function',
    function: {
      name: 'notion_search',
      description:
        'Search for pages and databases in connected Notion workspace. ' +
        'Returns matching pages and databases with their titles and URLs.',
      parameters: {
        type: 'object',
        properties: {
          connector_id: {
            type: 'string',
            description: 'The Notion connector ID to use',
          },
          query: {
            type: 'string',
            description: 'Search query for page/database titles',
          },
          filter: {
            type: 'string',
            description: 'Filter by object type',
            enum: ['page', 'database', 'all'],
          },
          max_results: {
            type: 'integer',
            description: 'Maximum results (default: 10)',
            minimum: 1,
            maximum: 50,
          },
        },
        required: ['connector_id', 'query'],
      },
    },
  },

  notion_read_page: {
    type: 'function',
    function: {
      name: 'notion_read_page',
      description:
        'Read the content of a Notion page. ' +
        'Returns the page content as formatted markdown.',
      parameters: {
        type: 'object',
        properties: {
          connector_id: {
            type: 'string',
            description: 'The Notion connector ID to use',
          },
          page_id: {
            type: 'string',
            description: 'The page ID from notion_search results',
          },
          include_content: {
            type: 'boolean',
            description: 'Include page blocks content (default: true)',
          },
          max_length: {
            type: 'integer',
            description: 'Maximum content length in characters',
            minimum: 100,
          },
        },
        required: ['connector_id', 'page_id'],
      },
    },
  },

  notion_query_database: {
    type: 'function',
    function: {
      name: 'notion_query_database',
      description: `Query a Notion database with filters and sorting.

Filter examples:
- { "property": "Status", "select": { "equals": "Done" } }
- { "property": "Due Date", "date": { "before": "2024-12-31" } }
- { "property": "Priority", "multi_select": { "contains": "High" } }`,
      parameters: {
        type: 'object',
        properties: {
          connector_id: {
            type: 'string',
            description: 'The Notion connector ID to use',
          },
          database_id: {
            type: 'string',
            description: 'The database ID to query',
          },
          filter: {
            type: 'object',
            description: 'Notion filter object for querying',
          },
          sorts: {
            type: 'array',
            description: 'Sort conditions',
            items: {
              type: 'object',
              properties: {
                property: {
                  type: 'string',
                  description: 'Property name to sort by',
                },
                timestamp: {
                  type: 'string',
                  description: 'Timestamp to sort by',
                  enum: ['created_time', 'last_edited_time'],
                },
                direction: {
                  type: 'string',
                  description: 'Sort direction',
                  enum: ['ascending', 'descending'],
                },
              },
            },
          },
          max_results: {
            type: 'integer',
            description: 'Maximum results (default: 25)',
            minimum: 1,
            maximum: 100,
          },
        },
        required: ['connector_id', 'database_id'],
      },
    },
  },
}

/**
 * Qonto tool definitions for LLM function calling.
 */
export const QONTO_TOOL_DEFINITIONS: Record<QontoToolName, ToolDefinition> = {
  qonto_list_business_accounts: {
    type: 'function',
    function: {
      name: 'qonto_list_business_accounts',
      description:
        'List all business accounts from a connected Qonto organization. ' +
        'Returns account details including name, IBAN, balance, and status.',
      parameters: {
        type: 'object',
        properties: {
          connector_id: {
            type: 'string',
            description: 'The Qonto connector ID to use',
          },
          page: {
            type: 'integer',
            description: 'Page number for pagination (default: 1)',
            minimum: 1,
          },
          per_page: {
            type: 'integer',
            description: 'Number of accounts per page (default: 100, max: 100)',
            minimum: 1,
            maximum: 100,
          },
        },
        required: ['connector_id'],
      },
    },
  },

  qonto_list_transactions: {
    type: 'function',
    function: {
      name: 'qonto_list_transactions',
      description: `List transactions from a Qonto bank account.

IMPORTANT: You must provide either bank_account_id OR iban. Use qonto_list_business_accounts first to get account IDs.

Filter options:
- bank_account_id or iban: Target account (REQUIRED - one of these must be provided)
- status: pending, declined, completed
- side: credit or debit
- Date filters: updated_at_from/to, settled_at_from/to
- sort_by: settled_at:desc (default), created_at:asc, etc.`,
      parameters: {
        type: 'object',
        properties: {
          connector_id: {
            type: 'string',
            description: 'The Qonto connector ID to use',
          },
          bank_account_id: {
            type: 'string',
            description:
              'Bank account ID to filter transactions (REQUIRED if iban not provided). Get from qonto_list_business_accounts.',
          },
          iban: {
            type: 'string',
            description:
              'IBAN to filter transactions (REQUIRED if bank_account_id not provided)',
          },
          status: {
            type: 'array',
            description: 'Filter by transaction status',
            items: {
              type: 'string',
              enum: ['pending', 'declined', 'completed'],
            },
          },
          side: {
            type: 'string',
            description: 'Filter by transaction side',
            enum: ['credit', 'debit'],
          },
          updated_at_from: {
            type: 'string',
            description:
              'Filter transactions updated after this date (ISO 8601)',
          },
          updated_at_to: {
            type: 'string',
            description:
              'Filter transactions updated before this date (ISO 8601)',
          },
          settled_at_from: {
            type: 'string',
            description:
              'Filter transactions settled after this date (ISO 8601)',
          },
          settled_at_to: {
            type: 'string',
            description:
              'Filter transactions settled before this date (ISO 8601)',
          },
          sort_by: {
            type: 'string',
            description: 'Sort field and direction (e.g., settled_at:desc)',
          },
          page: {
            type: 'integer',
            description: 'Page number (default: 1)',
            minimum: 1,
          },
          per_page: {
            type: 'integer',
            description: 'Results per page (default: 100, max: 100)',
            minimum: 1,
            maximum: 100,
          },
        },
        required: ['connector_id'],
      },
    },
  },

  qonto_get_transaction: {
    type: 'function',
    function: {
      name: 'qonto_get_transaction',
      description:
        'Get detailed information about a specific Qonto transaction. ' +
        'Use this after qonto_list_transactions to get full transaction details.',
      parameters: {
        type: 'object',
        properties: {
          connector_id: {
            type: 'string',
            description: 'The Qonto connector ID to use',
          },
          transaction_id: {
            type: 'string',
            description: 'The transaction ID to retrieve',
          },
          includes: {
            type: 'array',
            description: 'Additional details to include',
            items: {
              type: 'string',
              enum: ['vat_details', 'labels', 'attachments'],
            },
          },
        },
        required: ['connector_id', 'transaction_id'],
      },
    },
  },

  qonto_list_statements: {
    type: 'function',
    function: {
      name: 'qonto_list_statements',
      description: `List bank statements from a Qonto organization.

Filter options:
- bank_account_ids or ibans: Filter by accounts
- period_from/period_to: Date range (format: MM-YYYY)
- sort_by: period:desc (default) or period:asc`,
      parameters: {
        type: 'object',
        properties: {
          connector_id: {
            type: 'string',
            description: 'The Qonto connector ID to use',
          },
          bank_account_ids: {
            type: 'array',
            description: 'Filter by bank account IDs',
            items: { type: 'string' },
          },
          ibans: {
            type: 'array',
            description: 'Filter by IBANs',
            items: { type: 'string' },
          },
          period_from: {
            type: 'string',
            description: 'Start period (format: MM-YYYY, e.g., 01-2024)',
          },
          period_to: {
            type: 'string',
            description: 'End period (format: MM-YYYY, e.g., 12-2024)',
          },
          sort_by: {
            type: 'string',
            description: 'Sort order (period:desc or period:asc)',
          },
          page: {
            type: 'integer',
            description: 'Page number (default: 1)',
            minimum: 1,
          },
          per_page: {
            type: 'integer',
            description: 'Results per page (default: 100, max: 100)',
            minimum: 1,
            maximum: 100,
          },
        },
        required: ['connector_id'],
      },
    },
  },

  qonto_get_statement: {
    type: 'function',
    function: {
      name: 'qonto_get_statement',
      description:
        'Get a specific bank statement with download URL. ' +
        'Use this after qonto_list_statements to get the PDF download link.',
      parameters: {
        type: 'object',
        properties: {
          connector_id: {
            type: 'string',
            description: 'The Qonto connector ID to use',
          },
          statement_id: {
            type: 'string',
            description: 'The statement ID to retrieve',
          },
        },
        required: ['connector_id', 'statement_id'],
      },
    },
  },
}

// ============================================================================
// Outlook Mail Tools
// ============================================================================

/**
 * Parameters for the outlook_search tool.
 * Search emails using Microsoft Graph search syntax.
 */
export interface OutlookSearchParams extends ConnectorToolBaseParams {
  /**
   * The search query using Microsoft Graph search syntax.
   * Examples:
   * - "from:john@example.com" - Emails from a specific sender
   * - "subject:quarterly report" - Emails with specific subject
   * - "hasAttachment:true" - Emails with attachments
   * - "received>=2024-01-01" - Date range
   */
  query: string
  /**
   * Maximum number of results to return.
   * @default 10
   */
  max_results?: number
  /**
   * Folder ID to search within.
   */
  folder_id?: string
}

/**
 * Email message summary for search results.
 */
export interface OutlookMessageSummary {
  /** Message ID */
  id: string
  /** Conversation ID */
  conversationId?: string
  /** Subject line */
  subject: string
  /** Sender name and email */
  from: string
  /** Recipient(s) */
  to: string
  /** Date received */
  receivedDateTime: Date
  /** Short snippet of content */
  bodyPreview: string
  /** Whether the message is read */
  isRead: boolean
  /** Whether the message has attachments */
  hasAttachments: boolean
  /** Message importance */
  importance: 'low' | 'normal' | 'high'
}

/**
 * Result of outlook_search operation.
 */
export interface OutlookSearchResult {
  /** The search query that was executed */
  query: string
  /** Number of results returned */
  result_count: number
  /** The matching messages */
  messages: OutlookMessageSummary[]
  /** Pagination cursor for more results */
  next_cursor?: string
  /** Connector metadata */
  connector: ConnectorMetadata
}

/**
 * Parameters for the outlook_read tool.
 * Read the full content of a specific email.
 */
export interface OutlookReadParams extends ConnectorToolBaseParams {
  /**
   * The message ID to read.
   */
  message_id: string
  /**
   * Whether to include attachment info.
   * @default true
   */
  include_attachments?: boolean
}

/**
 * Full email message content.
 */
export interface OutlookMessageContent {
  /** Message ID */
  id: string
  /** Subject line */
  subject: string
  /** Sender */
  from: string
  /** Recipients (To) */
  to: string
  /** CC recipients */
  cc?: string
  /** Date received */
  receivedDateTime: Date
  /** Plain text body */
  body: string
  /** Is read */
  isRead: boolean
  /** Importance */
  importance: 'low' | 'normal' | 'high'
  /** Attachments info */
  attachments: Array<{
    id: string
    name: string
    contentType: string
    size: number
  }>
}

/**
 * Result of outlook_read operation.
 */
export interface OutlookReadResult {
  /** Whether the message was found */
  found: boolean
  /** Error message if not found */
  error?: string
  /** The full message content */
  message?: OutlookMessageContent
  /** Connector metadata */
  connector: ConnectorMetadata
}

/**
 * Parameters for the outlook_list_folders tool.
 * List available mail folders.
 */
export interface OutlookListFoldersParams extends ConnectorToolBaseParams {
  /**
   * Maximum results.
   * @default 50
   */
  max_results?: number
}

/**
 * Mail folder information.
 */
export interface OutlookFolder {
  /** Folder ID */
  id: string
  /** Display name */
  displayName: string
  /** Parent folder ID */
  parentFolderId?: string
  /** Unread count */
  unreadItemCount: number
  /** Total count */
  totalItemCount: number
}

/**
 * Result of outlook_list_folders operation.
 */
export interface OutlookListFoldersResult {
  /** Available folders */
  folders: OutlookFolder[]
  /** Connector metadata */
  connector: ConnectorMetadata
}

/**
 * Outlook Mail tool names.
 */
export type OutlookToolName =
  | 'outlook_search'
  | 'outlook_read'
  | 'outlook_list_folders'

/**
 * Outlook Mail tool definitions for LLM function calling.
 */
export const OUTLOOK_TOOL_DEFINITIONS: Record<OutlookToolName, ToolDefinition> =
  {
    outlook_search: {
      type: 'function',
      function: {
        name: 'outlook_search',
        description: `Search for emails in a connected Outlook account using Microsoft Graph.

Examples:
- "from:john@example.com" - Emails from specific sender
- "subject:meeting" - Emails with specific subject
- "hasAttachment:true" - Emails with attachments
- "received>=2024-01-01" - Date range filter
- "isRead eq false" - Unread emails
- Combine: "from:boss@company.com hasAttachment:true"`,
        parameters: {
          type: 'object',
          properties: {
            connector_id: {
              type: 'string',
              description: 'The Outlook connector ID to use',
            },
            query: {
              type: 'string',
              description: 'Search query using Microsoft Graph search syntax',
            },
            max_results: {
              type: 'integer',
              description: 'Maximum number of results (default: 10, max: 50)',
              minimum: 1,
              maximum: 50,
            },
            folder_id: {
              type: 'string',
              description: 'Folder ID to search within (optional)',
            },
          },
          required: ['connector_id', 'query'],
        },
      },
    },

    outlook_read: {
      type: 'function',
      function: {
        name: 'outlook_read',
        description:
          'Read the full content of a specific email by message ID. ' +
          'Use this after outlook_search to get complete email content.',
        parameters: {
          type: 'object',
          properties: {
            connector_id: {
              type: 'string',
              description: 'The Outlook connector ID to use',
            },
            message_id: {
              type: 'string',
              description: 'The message ID from outlook_search results',
            },
            include_attachments: {
              type: 'boolean',
              description: 'Include attachment metadata (default: true)',
            },
          },
          required: ['connector_id', 'message_id'],
        },
      },
    },

    outlook_list_folders: {
      type: 'function',
      function: {
        name: 'outlook_list_folders',
        description:
          'List available mail folders in the connected Outlook account. ' +
          'Useful for discovering folder structure before searching.',
        parameters: {
          type: 'object',
          properties: {
            connector_id: {
              type: 'string',
              description: 'The Outlook connector ID to use',
            },
            max_results: {
              type: 'integer',
              description: 'Maximum folders to return (default: 50)',
              minimum: 1,
              maximum: 100,
            },
          },
          required: ['connector_id'],
        },
      },
    },
  }

// ============================================================================
// OneDrive Tools
// ============================================================================

/**
 * Parameters for the onedrive_search tool.
 * Search files in OneDrive.
 */
export interface OneDriveSearchParams extends ConnectorToolBaseParams {
  /**
   * The search query.
   */
  query: string
  /**
   * Maximum number of results.
   * @default 10
   */
  max_results?: number
}

/**
 * OneDrive file summary for search results.
 */
export interface OneDriveFileSummary {
  /** File ID */
  id: string
  /** File name */
  name: string
  /** MIME type */
  mimeType?: string
  /** Whether it's a folder */
  isFolder: boolean
  /** File size in bytes */
  size?: number
  /** Last modified date */
  lastModifiedDateTime: Date
  /** Web URL */
  webUrl?: string
  /** Parent path */
  parentPath?: string
}

/**
 * Result of onedrive_search operation.
 */
export interface OneDriveSearchResult {
  /** Search query executed */
  query: string
  /** Number of results */
  result_count: number
  /** Matching files */
  files: OneDriveFileSummary[]
  /** Pagination cursor */
  next_cursor?: string
  /** Connector metadata */
  connector: ConnectorMetadata
}

/**
 * Parameters for the onedrive_read tool.
 * Read the content of a OneDrive file.
 */
export interface OneDriveReadParams extends ConnectorToolBaseParams {
  /**
   * The file ID to read.
   */
  file_id: string
  /**
   * Maximum content length for text files.
   */
  max_length?: number
}

/**
 * Result of onedrive_read operation.
 */
export interface OneDriveReadResult {
  /** Whether the file was found */
  found: boolean
  /** Error message if failed */
  error?: string
  /** File metadata */
  file?: OneDriveFileSummary
  /** File content (for text-based files) */
  content?: string
  /** Content type */
  content_type?: 'text' | 'binary'
  /** Whether content was truncated */
  truncated?: boolean
  /** Connector metadata */
  connector: ConnectorMetadata
}

/**
 * Parameters for the onedrive_list tool.
 * List files in a OneDrive folder.
 */
export interface OneDriveListParams extends ConnectorToolBaseParams {
  /**
   * Folder ID to list. Omit for root.
   */
  folder_id?: string
  /**
   * Maximum number of results.
   * @default 50
   */
  limit?: number
}

/**
 * Result of onedrive_list operation.
 */
export interface OneDriveListResult {
  /** Parent folder info (null if root) */
  folder: { id: string; name: string } | null
  /** Files in the folder */
  files: OneDriveFileSummary[]
  /** Total count */
  total_count: number
  /** Pagination cursor */
  next_cursor?: string
  /** Connector metadata */
  connector: ConnectorMetadata
}

/**
 * OneDrive tool names.
 */
export type OneDriveToolName =
  | 'onedrive_search'
  | 'onedrive_read'
  | 'onedrive_list'

/**
 * OneDrive tool definitions for LLM function calling.
 */
export const ONEDRIVE_TOOL_DEFINITIONS: Record<
  OneDriveToolName,
  ToolDefinition
> = {
  onedrive_search: {
    type: 'function',
    function: {
      name: 'onedrive_search',
      description: `Search for files in connected OneDrive using Microsoft Graph.

Supports natural language search:
- "budget spreadsheet" - Files containing these terms
- "quarterly report" - Find documents by content
- "presentation 2024" - Search by name or content`,
      parameters: {
        type: 'object',
        properties: {
          connector_id: {
            type: 'string',
            description: 'The OneDrive connector ID to use',
          },
          query: {
            type: 'string',
            description: 'Search query',
          },
          max_results: {
            type: 'integer',
            description: 'Maximum results (default: 10, max: 50)',
            minimum: 1,
            maximum: 50,
          },
        },
        required: ['connector_id', 'query'],
      },
    },
  },

  onedrive_read: {
    type: 'function',
    function: {
      name: 'onedrive_read',
      description:
        'Read the content of a file from OneDrive. ' +
        'Works with text files. Binary files return metadata only.',
      parameters: {
        type: 'object',
        properties: {
          connector_id: {
            type: 'string',
            description: 'The OneDrive connector ID to use',
          },
          file_id: {
            type: 'string',
            description: 'The file ID from onedrive_search results',
          },
          max_length: {
            type: 'integer',
            description: 'Maximum content length in characters',
            minimum: 100,
          },
        },
        required: ['connector_id', 'file_id'],
      },
    },
  },

  onedrive_list: {
    type: 'function',
    function: {
      name: 'onedrive_list',
      description:
        'List files and folders in a OneDrive directory. ' +
        'Useful for browsing folder structure.',
      parameters: {
        type: 'object',
        properties: {
          connector_id: {
            type: 'string',
            description: 'The OneDrive connector ID to use',
          },
          folder_id: {
            type: 'string',
            description: 'Folder ID to list (omit for root)',
          },
          limit: {
            type: 'integer',
            description: 'Maximum items to return (default: 50)',
            minimum: 1,
            maximum: 100,
          },
        },
        required: ['connector_id'],
      },
    },
  },
}

// ============================================================================
// Slack Tools
// ============================================================================

/**
 * Parameters for the slack_search tool.
 * Search messages in Slack.
 */
export interface SlackSearchParams extends ConnectorToolBaseParams {
  /**
   * Search query for messages.
   * Supports Slack search modifiers like from:, in:, has:, etc.
   */
  query: string
  /**
   * Maximum number of results.
   * @default 20
   */
  max_results?: number
}

/**
 * Slack message summary for search results.
 */
export interface SlackMessageSummary {
  /** Message ID (timestamp) */
  ts: string
  /** Channel ID */
  channelId: string
  /** Channel name */
  channelName: string
  /** Message text */
  text: string
  /** User ID who sent the message */
  userId?: string
  /** Permalink to message */
  permalink: string
}

/**
 * Result of slack_search operation.
 */
export interface SlackSearchResult {
  /** Search query */
  query: string
  /** Number of results */
  result_count: number
  /** Matching messages */
  messages: SlackMessageSummary[]
  /** Connector metadata */
  connector: ConnectorMetadata
}

/**
 * Parameters for the slack_list_channels tool.
 * List Slack channels.
 */
export interface SlackListChannelsParams extends ConnectorToolBaseParams {
  /**
   * Include private channels.
   * @default true
   */
  include_private?: boolean
  /**
   * Maximum results.
   * @default 100
   */
  max_results?: number
}

/**
 * Slack channel summary.
 */
export interface SlackChannelSummary {
  /** Channel ID */
  id: string
  /** Channel name */
  name: string
  /** Whether private */
  isPrivate: boolean
  /** Whether archived */
  isArchived: boolean
  /** Topic */
  topic?: string
  /** Purpose */
  purpose?: string
  /** Member count */
  numMembers?: number
}

/**
 * Result of slack_list_channels operation.
 */
export interface SlackListChannelsResult {
  /** Channels */
  channels: SlackChannelSummary[]
  /** Result count */
  result_count: number
  /** Connector metadata */
  connector: ConnectorMetadata
}

/**
 * Parameters for the slack_read_channel tool.
 * Read messages from a Slack channel.
 */
export interface SlackReadChannelParams extends ConnectorToolBaseParams {
  /**
   * Channel ID to read from.
   */
  channel_id: string
  /**
   * Maximum messages to return.
   * @default 50
   */
  limit?: number
  /**
   * Get messages before this timestamp.
   */
  oldest?: string
  /**
   * Get messages after this timestamp.
   */
  latest?: string
}

/**
 * Slack channel message.
 */
export interface SlackChannelMessage {
  /** Message timestamp (ID) */
  ts: string
  /** User ID */
  userId?: string
  /** Message text */
  text: string
  /** Thread timestamp (if in thread) */
  threadTs?: string
  /** Reply count (if parent of thread) */
  replyCount?: number
  /** Has attachments */
  hasAttachments: boolean
}

/**
 * Result of slack_read_channel operation.
 */
export interface SlackReadChannelResult {
  /** Channel info */
  channel: {
    id: string
    name: string
  }
  /** Messages */
  messages: SlackChannelMessage[]
  /** Whether there are more messages */
  hasMore: boolean
  /** Connector metadata */
  connector: ConnectorMetadata
}

/**
 * Slack tool names.
 */
export type SlackToolName =
  | 'slack_search'
  | 'slack_list_channels'
  | 'slack_read_channel'

/**
 * Slack tool definitions for LLM function calling.
 */
export const SLACK_TOOL_DEFINITIONS: Record<SlackToolName, ToolDefinition> = {
  slack_search: {
    type: 'function',
    function: {
      name: 'slack_search',
      description: `Search for messages in connected Slack workspace.

Uses Slack's search syntax:
- "project update" - Search for messages containing these words
- "from:@john" - Messages from a specific user
- "in:#general" - Messages in a specific channel
- "has:link" - Messages with links
- "has:reaction" - Messages with reactions
- "during:today" - Messages from today
- "before:2024-01-01" - Messages before a date`,
      parameters: {
        type: 'object',
        properties: {
          connector_id: {
            type: 'string',
            description: 'The Slack connector ID to use',
          },
          query: {
            type: 'string',
            description: 'Search query using Slack search syntax',
          },
          max_results: {
            type: 'integer',
            description: 'Maximum results (default: 20, max: 100)',
            minimum: 1,
            maximum: 100,
          },
        },
        required: ['connector_id', 'query'],
      },
    },
  },

  slack_list_channels: {
    type: 'function',
    function: {
      name: 'slack_list_channels',
      description:
        'List available channels in the connected Slack workspace. ' +
        'Returns both public and private channels the bot has access to.',
      parameters: {
        type: 'object',
        properties: {
          connector_id: {
            type: 'string',
            description: 'The Slack connector ID to use',
          },
          include_private: {
            type: 'boolean',
            description: 'Include private channels (default: true)',
          },
          max_results: {
            type: 'integer',
            description: 'Maximum channels to return (default: 100)',
            minimum: 1,
            maximum: 200,
          },
        },
        required: ['connector_id'],
      },
    },
  },

  slack_read_channel: {
    type: 'function',
    function: {
      name: 'slack_read_channel',
      description:
        'Read recent messages from a Slack channel. ' +
        'Use slack_list_channels first to get channel IDs.',
      parameters: {
        type: 'object',
        properties: {
          connector_id: {
            type: 'string',
            description: 'The Slack connector ID to use',
          },
          channel_id: {
            type: 'string',
            description: 'The channel ID to read messages from',
          },
          limit: {
            type: 'integer',
            description: 'Maximum messages to return (default: 50)',
            minimum: 1,
            maximum: 200,
          },
          oldest: {
            type: 'string',
            description: 'Get messages after this timestamp (exclusive)',
          },
          latest: {
            type: 'string',
            description: 'Get messages before this timestamp (inclusive)',
          },
        },
        required: ['connector_id', 'channel_id'],
      },
    },
  },
}

// ============================================================================
// Dropbox Tools
// ============================================================================

/**
 * Parameters for the dropbox_search tool.
 * Search files in Dropbox.
 */
export interface DropboxSearchParams extends ConnectorToolBaseParams {
  /**
   * Search query.
   */
  query: string
  /**
   * Path to search within.
   */
  path?: string
  /**
   * Maximum results.
   * @default 20
   */
  max_results?: number
}

/**
 * Dropbox file summary.
 */
export interface DropboxFileSummary {
  /** File ID */
  id: string
  /** File name */
  name: string
  /** Full path */
  pathDisplay: string
  /** Whether it's a folder */
  isFolder: boolean
  /** File size in bytes */
  size?: number
  /** Last modified date */
  serverModified?: Date
  /** Content hash */
  contentHash?: string
}

/**
 * Result of dropbox_search operation.
 */
export interface DropboxSearchResult {
  /** Search query */
  query: string
  /** Number of results */
  result_count: number
  /** Matching files */
  files: DropboxFileSummary[]
  /** Whether there are more results */
  hasMore: boolean
  /** Connector metadata */
  connector: ConnectorMetadata
}

/**
 * Parameters for the dropbox_read tool.
 */
export interface DropboxReadParams extends ConnectorToolBaseParams {
  /**
   * File ID or path to read.
   */
  file_id: string
  /**
   * Maximum content length.
   */
  max_length?: number
}

/**
 * Result of dropbox_read operation.
 */
export interface DropboxReadResult {
  /** Whether file was found */
  found: boolean
  /** Error if failed */
  error?: string
  /** File metadata */
  file?: DropboxFileSummary
  /** File content */
  content?: string
  /** Whether content was truncated */
  truncated?: boolean
  /** Connector metadata */
  connector: ConnectorMetadata
}

/**
 * Parameters for the dropbox_list tool.
 */
export interface DropboxListParams extends ConnectorToolBaseParams {
  /**
   * Path to list. Empty for root.
   */
  path?: string
  /**
   * Maximum results.
   * @default 50
   */
  limit?: number
}

/**
 * Result of dropbox_list operation.
 */
export interface DropboxListResult {
  /** Path listed */
  path: string
  /** Files and folders */
  entries: DropboxFileSummary[]
  /** Whether there are more entries */
  hasMore: boolean
  /** Connector metadata */
  connector: ConnectorMetadata
}

/**
 * Dropbox tool names.
 */
export type DropboxToolName = 'dropbox_search' | 'dropbox_read' | 'dropbox_list'

/**
 * Dropbox tool definitions for LLM function calling.
 */
export const DROPBOX_TOOL_DEFINITIONS: Record<DropboxToolName, ToolDefinition> =
  {
    dropbox_search: {
      type: 'function',
      function: {
        name: 'dropbox_search',
        description:
          'Search for files in connected Dropbox. ' +
          'Searches file and folder names and content.',
        parameters: {
          type: 'object',
          properties: {
            connector_id: {
              type: 'string',
              description: 'The Dropbox connector ID to use',
            },
            query: {
              type: 'string',
              description: 'Search query for file names and content',
            },
            path: {
              type: 'string',
              description: 'Limit search to this path (e.g., "/Documents")',
            },
            max_results: {
              type: 'integer',
              description: 'Maximum results (default: 20)',
              minimum: 1,
              maximum: 100,
            },
          },
          required: ['connector_id', 'query'],
        },
      },
    },

    dropbox_read: {
      type: 'function',
      function: {
        name: 'dropbox_read',
        description:
          'Read the content of a file from Dropbox. ' +
          'Works with text files up to 10MB.',
        parameters: {
          type: 'object',
          properties: {
            connector_id: {
              type: 'string',
              description: 'The Dropbox connector ID to use',
            },
            file_id: {
              type: 'string',
              description: 'File ID or path from dropbox_search results',
            },
            max_length: {
              type: 'integer',
              description: 'Maximum content length in characters',
              minimum: 100,
            },
          },
          required: ['connector_id', 'file_id'],
        },
      },
    },

    dropbox_list: {
      type: 'function',
      function: {
        name: 'dropbox_list',
        description:
          'List files and folders in a Dropbox directory. ' +
          'Use empty path for root folder.',
        parameters: {
          type: 'object',
          properties: {
            connector_id: {
              type: 'string',
              description: 'The Dropbox connector ID to use',
            },
            path: {
              type: 'string',
              description: 'Path to list (empty or "/" for root)',
            },
            limit: {
              type: 'integer',
              description: 'Maximum items to return (default: 50)',
              minimum: 1,
              maximum: 200,
            },
          },
          required: ['connector_id'],
        },
      },
    },
  }

// ============================================================================
// Figma Tools
// ============================================================================

/**
 * Parameters for the figma_list_files tool.
 * List files in Figma projects.
 */
export interface FigmaListFilesParams extends ConnectorToolBaseParams {
  /**
   * Project ID to list files from.
   */
  project_id?: string
  /**
   * Team ID to list projects and files from.
   */
  team_id?: string
}

/**
 * Figma file summary.
 */
export interface FigmaFileSummary {
  /** File key */
  key: string
  /** File name */
  name: string
  /** Thumbnail URL */
  thumbnailUrl?: string
  /** Last modified date */
  lastModified: Date
  /** Editor type */
  editorType?: string
}

/**
 * Result of figma_list_files operation.
 */
export interface FigmaListFilesResult {
  /** Project info if querying a project */
  project?: {
    id: string
    name: string
  }
  /** Files */
  files: FigmaFileSummary[]
  /** Result count */
  result_count: number
  /** Connector metadata */
  connector: ConnectorMetadata
}

/**
 * Parameters for the figma_get_file tool.
 * Get details of a Figma file.
 */
export interface FigmaGetFileParams extends ConnectorToolBaseParams {
  /**
   * File key to retrieve.
   */
  file_key: string
  /**
   * Depth of nodes to return.
   * @default 2
   */
  depth?: number
}

/**
 * Figma node summary.
 */
export interface FigmaNodeSummary {
  /** Node ID */
  id: string
  /** Node name */
  name: string
  /** Node type */
  type: string
  /** Child count */
  childCount?: number
}

/**
 * Result of figma_get_file operation.
 */
export interface FigmaGetFileResult {
  /** Whether file was found */
  found: boolean
  /** Error if failed */
  error?: string
  /** File info */
  file?: {
    key: string
    name: string
    lastModified: Date
    version: string
    thumbnailUrl?: string
  }
  /** Top-level nodes */
  pages?: FigmaNodeSummary[]
  /** Component count */
  componentCount?: number
  /** Style count */
  styleCount?: number
  /** Connector metadata */
  connector: ConnectorMetadata
}

/**
 * Parameters for the figma_get_comments tool.
 * Get comments on a Figma file.
 */
export interface FigmaGetCommentsParams extends ConnectorToolBaseParams {
  /**
   * File key.
   */
  file_key: string
}

/**
 * Figma comment.
 */
export interface FigmaComment {
  /** Comment ID */
  id: string
  /** Comment text */
  message: string
  /** Author name */
  authorName: string
  /** Created date */
  createdAt: Date
  /** Is resolved */
  resolved: boolean
  /** Parent comment ID (for replies) */
  parentId?: string
}

/**
 * Result of figma_get_comments operation.
 */
export interface FigmaGetCommentsResult {
  /** Comments */
  comments: FigmaComment[]
  /** Result count */
  result_count: number
  /** Connector metadata */
  connector: ConnectorMetadata
}

/**
 * Figma tool names.
 */
export type FigmaToolName =
  | 'figma_list_files'
  | 'figma_get_file'
  | 'figma_get_comments'

/**
 * Figma tool definitions for LLM function calling.
 */
export const FIGMA_TOOL_DEFINITIONS: Record<FigmaToolName, ToolDefinition> = {
  figma_list_files: {
    type: 'function',
    function: {
      name: 'figma_list_files',
      description:
        'List Figma design files from a project or team. ' +
        'Provide either project_id or team_id to filter.',
      parameters: {
        type: 'object',
        properties: {
          connector_id: {
            type: 'string',
            description: 'The Figma connector ID to use',
          },
          project_id: {
            type: 'string',
            description: 'Project ID to list files from',
          },
          team_id: {
            type: 'string',
            description: 'Team ID to list all team files',
          },
        },
        required: ['connector_id'],
      },
    },
  },

  figma_get_file: {
    type: 'function',
    function: {
      name: 'figma_get_file',
      description:
        'Get details of a Figma design file including pages, components, and styles. ' +
        'Use file key from figma_list_files.',
      parameters: {
        type: 'object',
        properties: {
          connector_id: {
            type: 'string',
            description: 'The Figma connector ID to use',
          },
          file_key: {
            type: 'string',
            description: 'The file key from figma_list_files',
          },
          depth: {
            type: 'integer',
            description: 'Depth of node tree to return (default: 2)',
            minimum: 1,
            maximum: 5,
          },
        },
        required: ['connector_id', 'file_key'],
      },
    },
  },

  figma_get_comments: {
    type: 'function',
    function: {
      name: 'figma_get_comments',
      description:
        'Get comments and feedback on a Figma file. ' +
        'Useful for reviewing design discussions.',
      parameters: {
        type: 'object',
        properties: {
          connector_id: {
            type: 'string',
            description: 'The Figma connector ID to use',
          },
          file_key: {
            type: 'string',
            description: 'The file key to get comments for',
          },
        },
        required: ['connector_id', 'file_key'],
      },
    },
  },
}

// ============================================================================
// Google Chat Tools
// ============================================================================

/**
 * Parameters for the google_chat_list_spaces tool.
 * List Google Chat spaces.
 */
export interface GoogleChatListSpacesParams extends ConnectorToolBaseParams {
  /**
   * Maximum results.
   * @default 50
   */
  max_results?: number
  /**
   * Filter by space type.
   */
  type?: 'ROOM' | 'DM' | 'SPACE'
}

/**
 * Google Chat space summary.
 */
export interface GoogleChatSpaceSummary {
  /** Space resource name */
  name: string
  /** Space ID */
  id: string
  /** Display name */
  displayName?: string
  /** Space type */
  type: 'ROOM' | 'DM' | 'SPACE'
  /** Is threaded */
  threaded?: boolean
}

/**
 * Result of google_chat_list_spaces operation.
 */
export interface GoogleChatListSpacesResult {
  /** Spaces */
  spaces: GoogleChatSpaceSummary[]
  /** Result count */
  result_count: number
  /** Pagination cursor */
  next_cursor?: string
  /** Connector metadata */
  connector: ConnectorMetadata
}

/**
 * Parameters for the google_chat_read_messages tool.
 * Read messages from a Google Chat space.
 */
export interface GoogleChatReadMessagesParams extends ConnectorToolBaseParams {
  /**
   * Space name/ID to read from.
   */
  space_id: string
  /**
   * Maximum messages.
   * @default 50
   */
  max_results?: number
}

/**
 * Google Chat message.
 */
export interface GoogleChatMessage {
  /** Message resource name */
  name: string
  /** Sender display name */
  senderName?: string
  /** Sender type */
  senderType: 'HUMAN' | 'BOT'
  /** Message text */
  text?: string
  /** Created time */
  createTime: Date
  /** Thread name */
  threadName?: string
}

/**
 * Result of google_chat_read_messages operation.
 */
export interface GoogleChatReadMessagesResult {
  /** Space info */
  space: {
    id: string
    name: string
  }
  /** Messages */
  messages: GoogleChatMessage[]
  /** Result count */
  result_count: number
  /** Pagination cursor */
  next_cursor?: string
  /** Connector metadata */
  connector: ConnectorMetadata
}

/**
 * Google Chat tool names.
 */
export type GoogleChatToolName =
  | 'google_chat_list_spaces'
  | 'google_chat_read_messages'

/**
 * Google Chat tool definitions for LLM function calling.
 */
export const GOOGLE_CHAT_TOOL_DEFINITIONS: Record<
  GoogleChatToolName,
  ToolDefinition
> = {
  google_chat_list_spaces: {
    type: 'function',
    function: {
      name: 'google_chat_list_spaces',
      description:
        'List Google Chat spaces (rooms, DMs, and spaces) the user has access to.',
      parameters: {
        type: 'object',
        properties: {
          connector_id: {
            type: 'string',
            description: 'The Google Chat connector ID to use',
          },
          max_results: {
            type: 'integer',
            description: 'Maximum spaces to return (default: 50)',
            minimum: 1,
            maximum: 100,
          },
          type: {
            type: 'string',
            description: 'Filter by space type',
            enum: ['ROOM', 'DM', 'SPACE'],
          },
        },
        required: ['connector_id'],
      },
    },
  },

  google_chat_read_messages: {
    type: 'function',
    function: {
      name: 'google_chat_read_messages',
      description:
        'Read messages from a Google Chat space. ' +
        'Use google_chat_list_spaces first to get space IDs.',
      parameters: {
        type: 'object',
        properties: {
          connector_id: {
            type: 'string',
            description: 'The Google Chat connector ID to use',
          },
          space_id: {
            type: 'string',
            description: 'The space ID or name to read messages from',
          },
          max_results: {
            type: 'integer',
            description: 'Maximum messages to return (default: 50)',
            minimum: 1,
            maximum: 100,
          },
        },
        required: ['connector_id', 'space_id'],
      },
    },
  },
}

// ============================================================================
// Google Meet Tools
// ============================================================================

/**
 * Parameters for the google_meet_list_meetings tool.
 * List upcoming Google Meet meetings.
 */
export interface GoogleMeetListMeetingsParams extends ConnectorToolBaseParams {
  /**
   * Start of time range (ISO 8601).
   * @default now
   */
  time_min?: string
  /**
   * End of time range (ISO 8601).
   * @default 7 days from now
   */
  time_max?: string
  /**
   * Maximum results.
   * @default 25
   */
  max_results?: number
}

/**
 * Google Meet meeting summary.
 */
export interface GoogleMeetMeetingSummary {
  /** Meeting ID */
  id: string
  /** Meeting title */
  title: string
  /** Start time */
  startTime?: Date
  /** End time */
  endTime?: Date
  /** Meet URL */
  meetUrl: string
  /** Calendar event ID */
  calendarEventId?: string
}

/**
 * Result of google_meet_list_meetings operation.
 */
export interface GoogleMeetListMeetingsResult {
  /** Meetings */
  meetings: GoogleMeetMeetingSummary[]
  /** Result count */
  result_count: number
  /** Time range queried */
  timeRange: {
    start: string
    end: string
  }
  /** Connector metadata */
  connector: ConnectorMetadata
}

/**
 * Google Meet tool names.
 */
export type GoogleMeetToolName = 'google_meet_list_meetings'

/**
 * Google Meet tool definitions for LLM function calling.
 */
export const GOOGLE_MEET_TOOL_DEFINITIONS: Record<
  GoogleMeetToolName,
  ToolDefinition
> = {
  google_meet_list_meetings: {
    type: 'function',
    function: {
      name: 'google_meet_list_meetings',
      description:
        'List upcoming Google Meet meetings from the calendar. ' +
        'Returns meetings with Meet links within the specified time range.',
      parameters: {
        type: 'object',
        properties: {
          connector_id: {
            type: 'string',
            description: 'The Google Meet connector ID to use',
          },
          time_min: {
            type: 'string',
            description:
              'Start of time range in ISO 8601 format (default: now)',
          },
          time_max: {
            type: 'string',
            description:
              'End of time range in ISO 8601 format (default: 7 days from now)',
          },
          max_results: {
            type: 'integer',
            description: 'Maximum meetings to return (default: 25)',
            minimum: 1,
            maximum: 100,
          },
        },
        required: ['connector_id'],
      },
    },
  },
}

/**
 * All connector tool definitions combined.
 */
export const CONNECTOR_TOOL_DEFINITIONS: Record<
  ConnectorToolName,
  ToolDefinition
> = {
  ...GMAIL_TOOL_DEFINITIONS,
  ...DRIVE_TOOL_DEFINITIONS,
  ...CALENDAR_TOOL_DEFINITIONS,
  ...TASKS_TOOL_DEFINITIONS,
  ...NOTION_TOOL_DEFINITIONS,
  ...QONTO_TOOL_DEFINITIONS,
  ...OUTLOOK_TOOL_DEFINITIONS,
  ...ONEDRIVE_TOOL_DEFINITIONS,
  ...SLACK_TOOL_DEFINITIONS,
  ...DROPBOX_TOOL_DEFINITIONS,
  ...FIGMA_TOOL_DEFINITIONS,
  ...GOOGLE_CHAT_TOOL_DEFINITIONS,
  ...GOOGLE_MEET_TOOL_DEFINITIONS,
}

/**
 * Get tool definitions by connector provider.
 */
export function getToolDefinitionsForProvider(
  provider: string,
): ToolDefinition[] {
  switch (provider) {
    case 'gmail':
      return Object.values(GMAIL_TOOL_DEFINITIONS)
    case 'google-drive':
      return Object.values(DRIVE_TOOL_DEFINITIONS)
    case 'google-calendar':
      return Object.values(CALENDAR_TOOL_DEFINITIONS)
    case 'google-tasks':
      return Object.values(TASKS_TOOL_DEFINITIONS)
    case 'notion':
      return Object.values(NOTION_TOOL_DEFINITIONS)
    case 'qonto':
      return Object.values(QONTO_TOOL_DEFINITIONS)
    case 'outlook-mail':
      return Object.values(OUTLOOK_TOOL_DEFINITIONS)
    case 'onedrive':
      return Object.values(ONEDRIVE_TOOL_DEFINITIONS)
    case 'slack':
      return Object.values(SLACK_TOOL_DEFINITIONS)
    case 'dropbox':
      return Object.values(DROPBOX_TOOL_DEFINITIONS)
    case 'figma':
      return Object.values(FIGMA_TOOL_DEFINITIONS)
    case 'google-chat':
      return Object.values(GOOGLE_CHAT_TOOL_DEFINITIONS)
    case 'google-meet':
      return Object.values(GOOGLE_MEET_TOOL_DEFINITIONS)
    default:
      return []
  }
}
