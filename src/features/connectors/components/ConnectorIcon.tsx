import { Icon } from '@/components/Icon'
import type { ConnectorProvider } from '../types'

interface ConnectorIconProps {
  provider: ConnectorProvider
  size?: number
  className?: string
}

/**
 * Provider icon mapping
 * Maps connector providers to their respective icon names
 */
const PROVIDER_ICONS: Record<ConnectorProvider, string> = {
  'google-drive': 'GoogleDrive',
  'gmail': 'Gmail',
  'google-calendar': 'GoogleCalendar',
  'notion': 'Notion',
  'dropbox': 'Dropbox',
  'github': 'GitHub',
  'custom-api': 'Api',
  'custom-mcp': 'Server',
}

/**
 * ConnectorIcon Component
 *
 * Renders the appropriate icon for each connector provider.
 * Uses the Icon component with provider-specific icon names.
 */
export function ConnectorIcon({ provider, size = 24, className }: ConnectorIconProps) {
  const iconName = PROVIDER_ICONS[provider] || 'AppWindow'

  return (
    <Icon
      name={iconName as any}
      width={size}
      height={size}
      className={className}
    />
  )
}
