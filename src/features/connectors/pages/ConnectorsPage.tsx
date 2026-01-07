import { useState, useEffect, useMemo } from 'react'
import { Tabs, Tab, Button, Spinner } from '@heroui/react'
import DefaultLayout from '@/layouts/Default'
import { Container, Icon, Section } from '@/components'
import { useI18n } from '@/i18n'
import { useConnectorStore } from '@/stores/connectorStore'
import { ConnectorCard } from '../components/ConnectorCard'
import { ConnectorWizard } from '../components/ConnectorWizard'
import { ConnectorSettingsModal } from '../components/ConnectorSettingsModal'
import { SyncEngine } from '../sync-engine'
import { successToast, errorToast } from '@/lib/toast'
import type {
  ConnectorCategory,
  Connector,
  AppConnectorProvider,
} from '../types'
import type { HeaderProps, IconName } from '@/lib/types'
import localI18n from './i18n'

/**
 * Connectors Page
 *
 * Settings page for managing external service connectors including
 * OAuth-based apps, custom APIs, and MCP servers.
 */
export function ConnectorsPage() {
  const { t } = useI18n(localI18n)
  const [selectedTab, setSelectedTab] = useState<ConnectorCategory>('app')
  const [showWizard, setShowWizard] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [_selectedProvider, setSelectedProvider] =
    useState<AppConnectorProvider | null>(null)
  const [selectedConnector, setSelectedConnector] = useState<Connector | null>(
    null,
  )

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

  // Handle sync action
  const handleSync = async (connector: Connector) => {
    try {
      // The SyncEngine handles status updates internally
      const result = await SyncEngine.sync(connector.id)

      if (result.success) {
        successToast(
          t('Sync completed'),
          t('{n} items synced', { n: result.itemsSynced }),
        )
      } else {
        const errorMessage = result.errors?.join(', ') || t('Unknown error')
        errorToast(t('Sync failed'), errorMessage)
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : t('Unknown error')
      errorToast(t('Sync failed'), errorMessage)
    }
  }

  // Handle disconnect action
  const handleDisconnect = async (connector: Connector) => {
    await deleteConnector(connector.id)
  }

  // Handle settings action
  const handleSettings = (connector: Connector) => {
    setSelectedConnector(connector)
    setShowSettings(true)
  }

  // Open wizard for adding new connector
  const handleAddConnector = () => {
    setSelectedProvider(null)
    setShowWizard(true)
  }

  const header: HeaderProps = {
    icon: {
      name: 'Puzzle',
    },
    title: t('Connectors'),
    subtitle: t('Connect external services to your knowledge base'),
  }

  return (
    <DefaultLayout header={header}>
      <Section>
        <Container>
          {/* Header with Add Button */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <p className="text-default-500">
                {t('Sync files and data from your favorite apps and services.')}
              </p>
            </div>
            <Button
              color="primary"
              startContent={<Icon name="Plus" className="w-4 h-4" />}
              onPress={handleAddConnector}
            >
              {t('Add Connector')}
            </Button>
          </div>

          {/* Category Tabs */}
          <Tabs
            selectedKey={selectedTab}
            onSelectionChange={(key) =>
              setSelectedTab(key as ConnectorCategory)
            }
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
            <Tab
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
            />
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
                    onSync={() => handleSync(connector)}
                    onDisconnect={() => handleDisconnect(connector)}
                    onSettings={() => handleSettings(connector)}
                  />
                ))}
              </div>
            )}
          </div>
        </Container>
      </Section>

      {/* Add/Edit Connector Wizard */}
      {showWizard && (
        <ConnectorWizard
          isOpen={showWizard}
          onClose={() => {
            setShowWizard(false)
            setSelectedProvider(null)
          }}
          category={selectedTab}
          // initialProvider={selectedProvider}
        />
      )}

      {/* Connector Settings Modal */}
      <ConnectorSettingsModal
        isOpen={showSettings}
        onClose={() => {
          setShowSettings(false)
          setSelectedConnector(null)
        }}
        connector={selectedConnector}
      />
    </DefaultLayout>
  )
}

/**
 * Empty state component for when no connectors exist
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
        'Connect your Google Drive, Notion, Gmail and more to sync files to your knowledge base.',
      ),
    },
    api: {
      icon: 'Code',
      title: t('No API connectors yet'),
      description: t(
        'Connect custom REST or GraphQL APIs to integrate external data sources.',
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
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-full bg-default-100 flex items-center justify-center mb-4">
        <Icon name={info.icon} className="w-8 h-8 text-default-400" />
      </div>
      <h3 className="text-lg font-medium mb-2">{info.title}</h3>
      <p className="text-default-500 max-w-md mb-6">{info.description}</p>
      {category === 'app' && (
        <Button color="primary" onPress={onAdd}>
          {t('Add your first connector')}
        </Button>
      )}
    </div>
  )
}

export default ConnectorsPage
