/**
 * Connector Tool Plugins Index
 *
 * Exports all connector plugins organized by provider.
 * Each connector manages its own tool registration.
 *
 * @module tools/plugins/connectors
 */

// Gmail
export {
  gmailSearchPlugin,
  gmailReadPlugin,
  gmailListLabelsPlugin,
  gmailCreateDraftPlugin,
  gmailPlugins,
  GMAIL_PLUGIN_NAMES,
} from './gmail'

// Google Drive
export {
  driveSearchPlugin,
  driveReadPlugin,
  driveListPlugin,
  drivePlugins,
  DRIVE_PLUGIN_NAMES,
} from './drive'

// Google Calendar
export {
  calendarListEventsPlugin,
  calendarGetEventPlugin,
  calendarSearchPlugin,
  calendarPlugins,
  CALENDAR_PLUGIN_NAMES,
} from './calendar'

// Google Tasks
export {
  tasksListPlugin,
  tasksGetPlugin,
  tasksListTasklistsPlugin,
  tasksPlugins,
  TASKS_PLUGIN_NAMES,
} from './tasks'

// Notion
export {
  notionSearchPlugin,
  notionReadPagePlugin,
  notionQueryDatabasePlugin,
  notionPlugins,
  NOTION_PLUGIN_NAMES,
} from './notion'

// Qonto
export {
  qontoListBusinessAccountsPlugin,
  qontoListTransactionsPlugin,
  qontoGetTransactionPlugin,
  qontoListStatementsPlugin,
  qontoGetStatementPlugin,
  qontoPlugins,
  QONTO_PLUGIN_NAMES,
} from './qonto'

// Outlook Mail
export {
  outlookSearchPlugin,
  outlookReadPlugin,
  outlookListFoldersPlugin,
  outlookPlugins,
  OUTLOOK_PLUGIN_NAMES,
} from './outlook'

// OneDrive
export {
  onedriveSearchPlugin,
  onedriveReadPlugin,
  onedriveListPlugin,
  onedrivePlugins,
  ONEDRIVE_PLUGIN_NAMES,
} from './onedrive'

// Slack
export {
  slackSearchPlugin,
  slackListChannelsPlugin,
  slackReadChannelPlugin,
  slackPlugins,
  SLACK_PLUGIN_NAMES,
} from './slack'

// Dropbox
export {
  dropboxSearchPlugin,
  dropboxReadPlugin,
  dropboxListPlugin,
  dropboxPlugins,
  DROPBOX_PLUGIN_NAMES,
} from './dropbox'

// Figma
export {
  figmaListFilesPlugin,
  figmaGetFilePlugin,
  figmaGetCommentsPlugin,
  figmaPlugins,
  FIGMA_PLUGIN_NAMES,
} from './figma'

// Google Chat
export {
  googleChatListSpacesPlugin,
  googleChatReadMessagesPlugin,
  googleChatPlugins,
  GOOGLE_CHAT_PLUGIN_NAMES,
} from './google-chat'

// Google Meet
export {
  googleMeetListMeetingsPlugin,
  googleMeetPlugins,
  GOOGLE_MEET_PLUGIN_NAMES,
} from './google-meet'

// ============================================================================
// Aggregated exports
// ============================================================================

import { gmailPlugins } from './gmail'
import { drivePlugins } from './drive'
import { calendarPlugins } from './calendar'
import { tasksPlugins } from './tasks'
import { notionPlugins } from './notion'
import { qontoPlugins } from './qonto'
import { outlookPlugins } from './outlook'
import { onedrivePlugins } from './onedrive'
import { slackPlugins } from './slack'
import { dropboxPlugins } from './dropbox'
import { figmaPlugins } from './figma'
import { googleChatPlugins } from './google-chat'
import { googleMeetPlugins } from './google-meet'

import { GMAIL_PLUGIN_NAMES } from './gmail'
import { DRIVE_PLUGIN_NAMES } from './drive'
import { CALENDAR_PLUGIN_NAMES } from './calendar'
import { TASKS_PLUGIN_NAMES } from './tasks'
import { NOTION_PLUGIN_NAMES } from './notion'
import { QONTO_PLUGIN_NAMES } from './qonto'
import { OUTLOOK_PLUGIN_NAMES } from './outlook'
import { ONEDRIVE_PLUGIN_NAMES } from './onedrive'
import { SLACK_PLUGIN_NAMES } from './slack'
import { DROPBOX_PLUGIN_NAMES } from './dropbox'
import { FIGMA_PLUGIN_NAMES } from './figma'
import { GOOGLE_CHAT_PLUGIN_NAMES } from './google-chat'
import { GOOGLE_MEET_PLUGIN_NAMES } from './google-meet'

/**
 * All connector plugins combined.
 */
export const allConnectorPlugins = [
  ...gmailPlugins,
  ...drivePlugins,
  ...calendarPlugins,
  ...tasksPlugins,
  ...notionPlugins,
  ...qontoPlugins,
  ...outlookPlugins,
  ...onedrivePlugins,
  ...slackPlugins,
  ...dropboxPlugins,
  ...figmaPlugins,
  ...googleChatPlugins,
  ...googleMeetPlugins,
] as const

/**
 * All connector plugin names.
 */
export const ALL_CONNECTOR_PLUGIN_NAMES = [
  ...GMAIL_PLUGIN_NAMES,
  ...DRIVE_PLUGIN_NAMES,
  ...CALENDAR_PLUGIN_NAMES,
  ...TASKS_PLUGIN_NAMES,
  ...NOTION_PLUGIN_NAMES,
  ...QONTO_PLUGIN_NAMES,
  ...OUTLOOK_PLUGIN_NAMES,
  ...ONEDRIVE_PLUGIN_NAMES,
  ...SLACK_PLUGIN_NAMES,
  ...DROPBOX_PLUGIN_NAMES,
  ...FIGMA_PLUGIN_NAMES,
  ...GOOGLE_CHAT_PLUGIN_NAMES,
  ...GOOGLE_MEET_PLUGIN_NAMES,
] as const

/**
 * Connector plugins organized by provider.
 */
export const connectorPluginsByProvider = {
  gmail: gmailPlugins,
  drive: drivePlugins,
  calendar: calendarPlugins,
  tasks: tasksPlugins,
  notion: notionPlugins,
  qonto: qontoPlugins,
  outlook: outlookPlugins,
  onedrive: onedrivePlugins,
  slack: slackPlugins,
  dropbox: dropboxPlugins,
  figma: figmaPlugins,
  'google-chat': googleChatPlugins,
  'google-meet': googleMeetPlugins,
} as const

/**
 * Type for connector provider names.
 */
export type ConnectorProvider = keyof typeof connectorPluginsByProvider
