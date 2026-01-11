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
  },
  // dropbox: {
  //   name: 'Dropbox',
  //   icon: 'Dropbox',
  //   color: '#007ee5',
  //   description: 'Sync files and folders from Dropbox',
  // },
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
  'gmail',
  'google-calendar',
  'google-meet',
  'notion',
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
 * Lazy-load Notion provider
 */
export const notion = () => import('./notion')

/**
 * Lazy-load Google Meet provider
 */
export const googleMeet = () => import('./google-meet')

// =============================================================================
// Default Export
// =============================================================================

export default {
  googleDrive,
  gmail,
  googleCalendar,
  googleMeet,
  notion,
  PROVIDER_CONFIG,
  AVAILABLE_PROVIDERS,
}
