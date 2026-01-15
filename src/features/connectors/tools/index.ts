/**
 * Connector Tools Module
 *
 * Provides tool definitions and implementations for connector-specific operations.
 * These tools enable LLM agents to search, read, and interact with connected
 * external services (Gmail, Google Drive, Calendar, Tasks, Notion).
 *
 * @module features/connectors/tools
 *
 * @example
 * ```typescript
 * // Import tool definitions for LLM function calling
 * import { CONNECTOR_TOOL_DEFINITIONS, getToolDefinitionsForProvider } from '@/features/connectors/tools'
 *
 * // Get all Gmail tools
 * const gmailTools = getToolDefinitionsForProvider('gmail')
 *
 * // Execute a Gmail search
 * import { gmailSearch } from '@/features/connectors/tools'
 * const results = await gmailSearch({
 *   connector_id: 'my-gmail-connector',
 *   query: 'from:boss@company.com is:unread'
 * })
 * ```
 */

// Export all types
export type {
  // Common
  ConnectorToolBaseParams,
  ConnectorMetadata,
  // Gmail
  GmailSearchParams,
  GmailSearchResult,
  GmailReadParams,
  GmailReadResult,
  GmailListLabelsParams,
  GmailListLabelsResult,
  GmailMessageSummary,
  GmailMessageContent,
  GmailAttachment,
  GmailLabel,
  // Google Drive
  DriveSearchParams,
  DriveSearchResult,
  DriveReadParams,
  DriveReadResult,
  DriveListParams,
  DriveListResult,
  DriveFileSummary,
  // Google Calendar
  CalendarListEventsParams,
  CalendarListEventsResult,
  CalendarGetEventParams,
  CalendarGetEventResult,
  CalendarSearchParams,
  CalendarSearchResult,
  CalendarEventSummary,
  CalendarEventDetail,
  // Google Tasks
  TasksListParams,
  TasksListResult,
  TasksGetParams,
  TasksGetResult,
  TasksListTasklistsParams,
  TasksListTasklistsResult,
  TaskSummary,
  TasklistSummary,
  // Notion
  NotionSearchParams,
  NotionSearchResult,
  NotionReadPageParams,
  NotionReadPageResult,
  NotionQueryDatabaseParams,
  NotionQueryDatabaseResult,
  NotionItemSummary,
  NotionPageContent,
  NotionDatabaseEntry,
  // Qonto
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
  // Tool names
  GmailToolName,
  DriveToolName,
  CalendarToolName,
  TasksToolName,
  NotionToolName,
  QontoToolName,
  ConnectorToolName,
} from './types'

// Export tool definitions
export {
  GMAIL_TOOL_DEFINITIONS,
  DRIVE_TOOL_DEFINITIONS,
  CALENDAR_TOOL_DEFINITIONS,
  TASKS_TOOL_DEFINITIONS,
  NOTION_TOOL_DEFINITIONS,
  QONTO_TOOL_DEFINITIONS,
  CONNECTOR_TOOL_DEFINITIONS,
  getToolDefinitionsForProvider,
} from './types'

// Export service functions
export {
  // Gmail
  gmailSearch,
  gmailRead,
  gmailListLabels,
  // Google Drive
  driveSearch,
  driveRead,
  driveList,
  // Google Calendar
  calendarListEvents,
  calendarGetEvent,
  calendarSearch,
  // Google Tasks
  tasksList,
  tasksGet,
  tasksListTasklists,
  // Notion
  notionSearch,
  notionReadPage,
  notionQueryDatabase,
  // Qonto
  qontoListBusinessAccounts,
  qontoListTransactions,
  qontoGetTransaction,
  qontoListStatements,
  qontoGetStatement,
} from './service'
