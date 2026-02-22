/**
 * ConnectorsSection — Settings section for managing external service connectors.
 *
 * Uses hash-based sub-routing:
 *   #settings/connectors       → list view
 *   #settings/connectors/add   → add-connector wizard
 *   #settings/connectors/:id   → existing connector settings
 *
 * Displays:
 *  - OAuth-based app connectors (Google Drive, Gmail, Notion, etc.)
 *  - API connectors (coming soon)
 *  - MCP server connectors (coming soon)
 */

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Button, Spinner } from '@heroui/react'
import { Icon } from '@/components'
import { useI18n } from '@/i18n'
import { useHashHighlight } from '@/hooks/useHashHighlight'
import { useConnectorStore } from '@/features/connectors/stores'
import { ConnectorCard } from '@/features/connectors/components'
import { ConnectorWizardInline } from '@/features/connectors/components/ConnectorWizardInline'
import { ConnectorSettingsInline } from '@/features/connectors/components/ConnectorSettingsInline'
import type { ConnectorCategory } from '@/features/connectors/types'
import type { IconName } from '@/lib/types'
import localI18n from '@/features/connectors/pages/i18n'

export function ConnectorsSection() {
  const { t } = useI18n(localI18n)
  const navigate = useNavigate()
  const location = useLocation()
  const { activeElement, getHighlightClasses } = useHashHighlight()

  const [selectedTab] = useState<ConnectorCategory>('app')

  const {
    connectors,
    isLoading,
    isInitialized,
    initialize,
    getConnector,
    getAppConnectors,
    getApiConnectors,
    getMcpConnectors,
    deleteConnector,
  } = useConnectorStore()

  // Initialize connector store on mount
  useEffect(() => {
    if (!isInitialized) {
      initialize()
    }
  }, [isInitialized, initialize])

  // Get connectors based on selected tab
  const currentConnectors = useMemo(() => {
    switch (selectedTab) {
      case 'app':
        return getAppConnectors()
      case 'api':
        return getApiConnectors()
      case 'mcp':
        return getMcpConnectors()
      default:
        return []
    }
  }, [
    selectedTab,
    connectors,
    getAppConnectors,
    getApiConnectors,
    getMcpConnectors,
  ])

  // --- Sub-route helpers ------------------------------------------------
  const navigateToList = useCallback(() => {
    navigate(`${location.pathname}#settings/connectors`, { replace: true })
  }, [navigate, location.pathname])

  const navigateToAdd = useCallback(() => {
    navigate(`${location.pathname}#settings/connectors/add`, { replace: true })
  }, [navigate, location.pathname])

  const navigateToConnector = useCallback(
    (connectorId: string) => {
      navigate(`${location.pathname}#settings/connectors/${connectorId}`, {
        replace: true,
      })
    },
    [navigate, location.pathname],
  )

  // --- Handlers ---------------------------------------------------------
  const handleDisconnect = async (connectorId: string) => {
    await deleteConnector(connectorId)
    navigateToList()
  }

  // --- Sub-route: /new  (wizard) ----------------------------------------
  if (activeElement === 'new') {
    return (
      <div data-testid="connectors-settings">
        <ConnectorWizardInline
          category={selectedTab}
          initialProvider={null}
          onClose={navigateToList}
        />
      </div>
    )
  }

  // --- Sub-route: /:connectorId  (settings) ----------------------------
  if (activeElement) {
    const connector = getConnector(activeElement)

    if (!connector) {
      // Unknown connector id — fall back to list
      return (
        <div data-testid="connectors-settings">
          <div className="flex flex-col items-center justify-center py-12 text-center gap-4">
            <Icon name="WarningTriangle" className="w-8 h-8 text-warning" />
            <p className="text-default-500 text-sm">
              {t('Connector not found')}
            </p>
            <Button size="sm" variant="flat" onPress={navigateToList}>
              {t('Back to connectors')}
            </Button>
          </div>
        </div>
      )
    }

    return (
      <div data-testid="connectors-settings">
        <ConnectorSettingsInline
          connector={connector}
          onClose={navigateToList}
          onDisconnect={handleDisconnect}
        />
      </div>
    )
  }

  // --- Default sub-route: list view ------------------------------------
  return (
    <div data-testid="connectors-settings">
      {/* Header with Add Button */}
      <div className="flex justify-between items-center mb-6">
        <p className="text-default-500 text-sm">
          {t('Sync files and data from your favorite apps and services.')}
        </p>
        <div
          id="add-connector"
          className={getHighlightClasses(
            'add-connector',
            'absolute top-0 right-0 flex justify-end',
          )}
        >
          <Button
            color="primary"
            size="sm"
            variant="flat"
            startContent={<Icon name="Plus" className="w-4 h-4" />}
            onPress={navigateToAdd}
          >
            {t('Add Connector')}
          </Button>
        </div>
      </div>

      {/* Content Area */}
      <div className="mt-6">
        {isLoading && !isInitialized ? (
          <div className="flex justify-center items-center py-12">
            <Spinner size="lg" />
          </div>
        ) : currentConnectors.length === 0 ? (
          <EmptyState category={selectedTab} onAdd={navigateToAdd} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
            {currentConnectors.map((connector) => (
              <ConnectorCard
                key={connector.id}
                connector={connector}
                onClick={() => navigateToConnector(connector.id)}
              />
            ))}

            {/* <Button
              color="primary"
              size="sm"
              startContent={<Icon name="Plus" className="w-4 h-4" />}
              onPress={navigateToAdd}
            >
              {t('Add Connector')}
            </Button> */}
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Empty state component for when no connectors exist in the selected category.
 */
function EmptyState({
  category,
  onAdd,
}: {
  category: ConnectorCategory
  onAdd: () => void
}) {
  const { t } = useI18n(localI18n)

  const categoryInfo: Record<
    ConnectorCategory,
    { icon: IconName; title: string; description: string }
  > = {
    app: {
      icon: 'WebWindow',
      title: t('No app connectors yet'),
      description: t(
        'Connect external services to give your agents powerful tools for searching, reading, and interacting with your data.',
      ),
    },
    api: {
      icon: 'Code',
      title: t('No API connectors yet'),
      description: t(
        'Connect custom REST or GraphQL APIs to extend agent capabilities.',
      ),
    },
    mcp: {
      icon: 'Server',
      title: t('No MCP connectors yet'),
      description: t(
        'Connect Model Context Protocol servers to extend agent capabilities.',
      ),
    },
  }

  const info = categoryInfo[category]

  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <h3 className="text-md font-medium mb-2">{info.title}</h3>
      <p className="text-sm text-default-500 max-w-md mb-6">
        {info.description}
      </p>
      {category === 'app' && (
        <Button color="primary" onPress={onAdd} size="sm">
          {t('Add your first connector')}
        </Button>
      )}
    </div>
  )
}
