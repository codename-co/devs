/**
 * ProviderGrid Component
 *
 * Displays a grid of available connector providers for selection.
 * Each provider shows its icon, name, and description.
 */

import { Card, CardBody, Tooltip } from '@heroui/react'
import { Icon } from '@/components'
import { useI18n } from '@/i18n'
import { getProviders } from '../../providers/apps'
import { OAuthGateway } from '../../oauth-gateway'
import type { AppConnectorProvider, ConnectorCategory } from '../../types'
import localI18n from '../../pages/i18n'

// =============================================================================
// Types
// =============================================================================

interface ProviderGridProps {
  category: ConnectorCategory
  onSelect: (provider: AppConnectorProvider) => void
}

// =============================================================================
// Component
// =============================================================================

/**
 * ProviderGrid displays a grid of available connector providers
 *
 * @param category - The connector category to filter providers (currently only 'app' is supported)
 * @param onSelect - Callback when a provider is selected
 */
export function ProviderGrid({ category, onSelect }: ProviderGridProps) {
  const { t } = useI18n(localI18n)

  // Get all registered providers
  const providers = category === 'app' ? getProviders() : []

  return (
    <div className="space-y-4">
      <p className="text-default-500">
        {t('Choose a service to connect to your knowledge base:')}
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {providers.map((config) => {
          const provider = config.id

          const isConfigured = OAuthGateway.isOAuthConfigured(provider)
          const isActive = config.active !== false
          const isReady = isConfigured && isActive

          const card = (
            <Card
              key={provider}
              isPressable={isReady}
              isDisabled={!isReady}
              onPress={isReady ? () => onSelect(provider) : undefined}
              className={`border border-divider transition-colors ${
                isReady
                  ? 'hover:border-primary'
                  : 'opacity-50 cursor-not-allowed'
              }`}
            >
              <CardBody className="flex flex-col items-center gap-2 p-4">
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${config.color}20` }}
                >
                  <Icon
                    name={config.icon as any}
                    className="w-6 h-6"
                    style={{ color: config.color }}
                  />
                </div>
                <span className="text-sm font-medium text-center">
                  {config.name}
                </span>
                <span className="text-xs text-default-400 text-center line-clamp-2">
                  {config.description}
                </span>
              </CardBody>
            </Card>
          )

          if (!isReady) {
            return (
              <Tooltip key={provider} content={t('Coming soon')}>
                <div>{card}</div>
              </Tooltip>
            )
          }

          return card
        })}
      </div>
    </div>
  )
}

export default ProviderGrid
