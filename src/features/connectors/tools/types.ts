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
    default:
      return []
  }
}
