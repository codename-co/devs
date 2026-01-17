import { Icon } from '@/components/Icon'
import { getProvider } from '../providers/apps'
import type { ConnectorProvider, AppConnectorProvider } from '../types'

interface ConnectorIconProps {
  provider: ConnectorProvider
  size?: number
  className?: string
  color?: string
  /** Whether to show a colored background container */
  withBackground?: boolean
}

/**
 * Provider icon mapping
 * Maps connector providers to their respective icon names
 */
const PROVIDER_ICONS: Record<ConnectorProvider, string> = {
  'google-drive': 'GoogleDrive',
  gmail: 'Gmail',
  'google-calendar': 'GoogleCalendar',
  'google-chat': 'ChatBubble',
  'google-meet': 'GoogleMeet',
  'google-tasks': 'GoogleTasks',
  notion: 'Notion',
  dropbox: 'Dropbox',
  github: 'GitHub',
  qonto: 'Qonto',
  slack: 'Slack',
  'outlook-mail': 'Mail',
  onedrive: 'OneDrive',
  figma: 'Figma',
  'custom-api': 'Api',
  'custom-mcp': 'Server',
}

/**
 * ConnectorIcon Component
 *
 * Renders the appropriate icon for each connector provider.
 * Uses the Icon component with provider-specific icon names and colors.
 * Colors are sourced from the provider registry for app connectors.
 */
export function ConnectorIcon({
  provider,
  size = 24,
  className,
  color,
  withBackground = false,
}: ConnectorIconProps) {
  const iconName = PROVIDER_ICONS[provider] || 'AppWindow'

  // Get the provider color from registry
  const providerConfig = getProvider(provider as AppConnectorProvider)
  const providerColor = color ?? providerConfig?.color

  if (withBackground && providerColor) {
    const bgSize = Math.round(size * 1.5)
    return (
      <div
        className="rounded-lg flex items-center justify-center"
        style={{
          width: bgSize,
          height: bgSize,
          backgroundColor: `${providerColor}20`,
        }}
      >
        <Icon
          name={iconName as any}
          width={size}
          height={size}
          className={className}
          style={{ color: providerColor }}
        />
      </div>
    )
  }

  return (
    <Icon
      name={iconName as any}
      width={size}
      height={size}
      className={className}
      style={providerColor ? { color: providerColor } : undefined}
    />
  )
}
