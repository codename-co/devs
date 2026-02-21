/**
 * ConnectorsSection — Settings section for managing external service connectors.
 *
 * Displays:
 *  - OAuth-based app connectors (Google Drive, Gmail, Notion, etc.)
 *  - API connectors (coming soon)
 *  - MCP server connectors (coming soon)
 */

import { useState, useEffect, useMemo } from 'react'
import { Tabs, Tab, Button, Spinner } from '@heroui/react'
import { Icon } from '@/components'
import { useI18n } from '@/i18n'
import { useConnectorStore } from '@/features/connectors/stores'
import { ConnectorCard } from '@/features/connectors/components'
import { ConnectorWizardInline } from '@/features/connectors/components/ConnectorWizardInline'
import { ConnectorSettingsInline } from '@/features/connectors/components/ConnectorSettingsInline'
import type {
  ConnectorCategory,
  Connector,
  AppConnectorProvider,
} from '@/features/connectors/types'
import type { IconName } from '@/lib/types'
import localI18n from '@/features/connectors/pages/i18n'

type ViewState =
  | { kind: 'list' }
  | { kind: 'wizard'; provider: AppConnectorProvider | null }
  | { kind: 'settings'; connector: Connector }

export function ConnectorsSection() {
  const { t } = useI18n(localI18n)
  const [selectedTab, setSelectedTab] = useState<ConnectorCategory>('app')
  const [view, setView] = useState<ViewState>({ kind: 'list' })

  const {
    connectors,
    isLoading,
    isInitialized,
    initialize,
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

  const handleDisconnect = async (connectorId: string) => {
    await deleteConnector(connectorId)
    setView({ kind: 'list' })
  }

  const handleSettings = (connector: Connector) => {
    setView({ kind: 'settings', connector })
  }

  const handleAddConnector = () => {
    setView({ kind: 'wizard', provider: null })
  }

  const handleBackToList = () => {
    setView({ kind: 'list' })
  }

  // Render the inline wizard view
  if (view.kind === 'wizard') {
    return (
      <div data-testid="connectors-settings">
        <ConnectorWizardInline
          category={selectedTab}
          initialProvider={view.provider}
          onClose={handleBackToList}
        />
      </div>
    )
  }

  // Render the inline settings view
  if (view.kind === 'settings') {
    return (
      <div data-testid="connectors-settings">
        <ConnectorSettingsInline
          connector={view.connector}
          onClose={handleBackToList}
          onDisconnect={handleDisconnect}
        />
      </div>
    )
  }

  // Render the default list view
  return (
    <div data-testid="connectors-settings">
      {/* Header with Add Button */}
      <div className="flex justify-between items-center mb-6">
        <p className="text-default-500 text-sm">
          {t('Sync files and data from your favorite apps and services.')}
        </p>
        <Button
          color="primary"
          size="sm"
          startContent={<Icon name="Plus" className="w-4 h-4" />}
          onPress={handleAddConnector}
        >
          {t('Add Connector')}
        </Button>
      </div>

      {/* Category Tabs */}
      <Tabs
        selectedKey={selectedTab}
        onSelectionChange={(key) => setSelectedTab(key as ConnectorCategory)}
        aria-label="Connector categories"
        variant="underlined"
        classNames={{
          tabList:
            'gap-6 w-full relative rounded-none p-0 border-b border-divider',
          cursor: 'w-full bg-primary',
          tab: 'max-w-fit px-0 h-12',
          tabContent: 'group-data-[selected=true]:text-primary',
        }}
      >
        <Tab
          key="app"
          title={
            <div className="flex items-center gap-2">
              <Icon name="WebWindow" className="w-4 h-4" />
              <span>{t('Apps')}</span>
              {getAppConnectors().length > 0 && (
                <span className="text-xs bg-default-100 px-2 py-0.5 rounded-full">
                  {getAppConnectors().length}
                </span>
              )}
            </div>
          }
        />
        {/* <Tab
          key="api"
          title={
            <div className="flex items-center gap-2">
              <Icon name="Code" className="w-4 h-4" />
              <span>{t('APIs')}</span>
            </div>
          }
        />
        <Tab
          key="mcp"
          title={
            <div className="flex items-center gap-2">
              <Icon name="Server" className="w-4 h-4" />
              <span>{t('MCPs')}</span>
            </div>
          }
        /> */}
      </Tabs>

      {/* Content Area */}
      <div className="mt-6">
        {isLoading && !isInitialized ? (
          <div className="flex justify-center items-center py-12">
            <Spinner size="lg" />
          </div>
        ) : currentConnectors.length === 0 ? (
          <EmptyState category={selectedTab} onAdd={handleAddConnector} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {currentConnectors.map((connector) => (
              <ConnectorCard
                key={connector.id}
                connector={connector}
                onClick={() => handleSettings(connector)}
              />
            ))}
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
