/**
 * App Connector Providers Index
 *
 * Exports all available app connector providers and their configurations.
 * Providers are lazy-loaded to optimize initial bundle size.
 */

import { IconName } from '@/lib/types'
import type { AppConnectorProvider } from '../../types'

// =============================================================================
// Provider Configuration
// =============================================================================

/**
 * Static configuration for each app connector provider.
 * Used for displaying provider options in the UI without loading the full provider.
 */
export const PROVIDER_CONFIG: Partial<
  Record<
    AppConnectorProvider,
    {
      name: string
      icon: IconName
      color: string
      description: string
      /** Whether this provider supports syncing content to the Knowledge Base */
      syncSupported?: boolean
      active?: false
    }
  >
> = {
  'google-drive': {
    name: 'Google Drive',
    icon: 'GoogleDrive',
    color: '#4285f4',
    description: 'Sync files and folders from Google Drive',
    syncSupported: true,
  },
  gmail: {
    name: 'Gmail',
    icon: 'Gmail',
    color: '#ea4335',
    description: 'Sync emails from Gmail',
    syncSupported: true,
  },
  'google-calendar': {
    name: 'Google Calendar',
    icon: 'GoogleCalendar',
    color: '#34a853',
    description: 'Sync calendar events',
    syncSupported: false,
  },
  'google-chat': {
    name: 'Google Chat',
    icon: 'GoogleChat',
    color: '#00AC47',
    description: 'Sync messages from Google Chat spaces',
    syncSupported: true,
  },
  notion: {
    name: 'Notion',
    icon: 'Notion',
    color: 'currentColor',
    description: 'Sync pages and databases from Notion',
    syncSupported: true,
  },
  'google-meet': {
    name: 'Google Meet',
    icon: 'GoogleMeet',
    color: '#00897B',
    description: 'Join meetings with AI agents',
    syncSupported: false,
    active: false,
  },
  'google-tasks': {
    name: 'Google Tasks',
    icon: 'GoogleTasks',
    color: '#4285f4',
    description: 'Sync tasks and to-do lists from Google Tasks',
    syncSupported: true,
  },
  qonto: {
    name: 'Qonto',
    icon: 'Qonto',
    color: 'currentColor',
    description: 'Access business accounts, transactions, and statements',
    syncSupported: false,
  },
  slack: {
    name: 'Slack',
    icon: 'Slack',
    color: '#4A154B',
    description: 'Sync messages and files from Slack channels',
    syncSupported: true,
  },
  'outlook-mail': {
    name: 'Outlook Mail',
    icon: 'MicrosoftOutlook',
    color: '#0078D4',
    description: 'Sync emails from Microsoft Outlook',
    syncSupported: true,
    active: false,
  },
  onedrive: {
    name: 'OneDrive',
    icon: 'OneDrive',
    color: '#0078D4',
    description: 'Sync files and folders from OneDrive',
    syncSupported: true,
    active: false,
  },
  figma: {
    name: 'Figma',
    icon: 'Figma',
    color: '#F24E1E',
    description: 'Sync design files and components from Figma',
    syncSupported: true,
  },
  dropbox: {
    name: 'Dropbox',
    icon: 'Dropbox',
    color: '#0061FF',
    description: 'Sync files and folders from Dropbox',
    syncSupported: true,
  },
  // github: {
  //   name: 'GitHub',
  //   icon: 'GitHub',
  //   color: '#333333',
  //   description: 'Sync repositories and documentation',
  // },
}

/**
 * List of currently available (implemented) providers.
 * Providers not in this list will be shown as "coming soon".
 */
export const AVAILABLE_PROVIDERS: AppConnectorProvider[] = [
  'google-drive',
  'onedrive',
  'dropbox',
  'gmail',
  'outlook-mail',
  'google-calendar',
  'slack',
  'google-chat',
  'google-meet',
  'google-tasks',
  'notion',
  'figma',
  'qonto',
]

// =============================================================================
// Provider Exports (Lazy Loading)
// =============================================================================

/**
 * Lazy-load Google Drive provider
 */
export const googleDrive = () => import('./google-drive')

/**
 * Lazy-load Gmail provider
 */
export const gmail = () => import('./gmail')

/**
 * Lazy-load Google Calendar provider
 */
export const googleCalendar = () => import('./google-calendar')

/**
 * Lazy-load Google Chat provider
 */
export const googleChat = () => import('./google-chat')

/**
 * Lazy-load Notion provider
 */
export const notion = () => import('./notion')

/**
 * Lazy-load Google Meet provider
 */
export const googleMeet = () => import('./google-meet')

/**
 * Lazy-load Google Tasks provider
 */
export const googleTasks = () => import('./google-tasks')

/**
 * Lazy-load Qonto provider
 */
export const qonto = () => import('./qonto')

/**
 * Lazy-load Slack provider
 */
export const slack = () => import('./slack')

/**
 * Lazy-load Outlook Mail provider
 */
export const outlookMail = () => import('./outlook-mail')

/**
 * Lazy-load OneDrive provider
 */
export const onedrive = () => import('./onedrive')

/**
 * Lazy-load Figma provider
 */
export const figma = () => import('./figma')

/**
 * Lazy-load Dropbox provider
 */
export const dropbox = () => import('./dropbox')

// =============================================================================
// Default Export
// =============================================================================

export default {
  googleDrive,
  gmail,
  googleCalendar,
  googleChat,
  googleMeet,
  googleTasks,
  notion,
  qonto,
  slack,
  outlookMail,
  onedrive,
  figma,
  dropbox,
  PROVIDER_CONFIG,
  AVAILABLE_PROVIDERS,
}
