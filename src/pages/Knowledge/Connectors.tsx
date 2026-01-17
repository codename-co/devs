import React, { useState, useEffect, useMemo } from 'react'
import { Button, Spinner } from '@heroui/react'
import { Plus } from 'iconoir-react'

import { Title, Icon } from '@/components'
import { useI18n } from '@/i18n'
import { useConnectorStore } from '@/features/connectors/stores'
import {
  ConnectorCard,
  ConnectorWizard,
  ConnectorSettingsModal,
} from '@/features/connectors/components'
import { SyncEngine } from '@/features/connectors/sync-engine'
import { successToast, errorToast } from '@/lib/toast'
import type { Connector } from '@/features/connectors/types'
import localI18n from './i18n'

/**
 * Connectors Component
 *
 * Management of external connectors:
 * - App connectors (Google Drive, Gmail, Notion, etc.)
 * - API connectors (coming soon)
 * - MCP connectors (coming soon)
 */
export const Connectors: React.FC = () => {
  const { t } = useI18n(localI18n)

  // Connector store
  const {
    connectors,
    isLoading: isConnectorsLoading,
    isInitialized,
    initialize: initializeConnectors,
    getAppConnectors,
    deleteConnector,
  } = useConnectorStore()

  // Local state
  const [showWizard, setShowWizard] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [selectedConnector, setSelectedConnector] = useState<Connector | null>(
    null,
  )

  // Connected app connectors
  const appConnectors = useMemo(
    () => getAppConnectors(),
    [connectors, getAppConnectors],
  )

  // Initialize
  useEffect(() => {
    if (!isInitialized) {
      initializeConnectors()
    }
  }, [isInitialized, initializeConnectors])

  // Sync connector
  const handleSyncConnector = async (connector: Connector) => {
    try {
      const result = await SyncEngine.sync(connector.id)
      if (result.success) {
        successToast(t('Sync completed'))
      } else {
        errorToast(t('Sync failed'))
      }
    } catch (error) {
      console.error('Sync error:', error)
      errorToast(t('Sync failed'))
    }
  }

  // Open connector settings
  const handleOpenSettings = (connector: Connector) => {
    setSelectedConnector(connector)
    setShowSettings(true)
  }

  // Delete connector
  const handleDeleteConnector = async (connectorId: string) => {
    try {
      await deleteConnector(connectorId)
      successToast(t('Connector removed'))
    } catch (error) {
      console.error('Delete connector error:', error)
      errorToast(t('Failed to remove connector'))
    }
  }

  // Empty state
  const EmptyState = () => (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 mb-4 rounded-full bg-default-100 flex items-center justify-center">
        <Icon name="Puzzle" className="w-8 h-8 text-default-400" />
      </div>
      <Title
        level={3}
        subtitle={t(
          'Connect external services like Google Drive, Gmail, or Notion to import content into your knowledge base.',
        )}
        subtitleClassName="max-w-md"
      >
        {t('No connectors yet')}
      </Title>
      <Button
        color="primary"
        startContent={<Plus className="w-4 h-4" />}
        onPress={() => setShowWizard(true)}
      >
        {t('Add Connector')}
      </Button>
    </div>
  )

  // Loading state
  if (isConnectorsLoading && !isInitialized) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner size="lg" />
      </div>
    )
  }

  const hasConnectors = appConnectors.length > 0

  return (
    <div className="py-6">
      {/* Header with Add button */}
      {hasConnectors && (
        <div className="flex items-center justify-between mb-6">
          <Title
            level={3}
            subtitle={t('Manage your connected external services')}
          >
            {t('Connected Apps')}
          </Title>
          <Button
            color="primary"
            startContent={<Plus className="w-4 h-4" />}
            onPress={() => setShowWizard(true)}
          >
            {t('Add Connector')}
          </Button>
        </div>
      )}

      {/* Content */}
      {!hasConnectors ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
          {appConnectors.map((connector) => (
            <ConnectorCard
              key={connector.id}
              connector={connector}
              onSync={() => handleSyncConnector(connector)}
              onSettings={() => handleOpenSettings(connector)}
              onDisconnect={() => handleDeleteConnector(connector.id)}
            />
          ))}
        </div>
      )}

      {/* Coming Soon: API Connectors */}
      <div className="mt-12 opacity-50 pointer-events-none select-none">
        <Title level={3} subtitle={t('Connect to custom REST or GraphQL APIs')}>
          {t('API Connectors')}
        </Title>
        <div className="border border-dashed border-default-300 rounded-lg p-8 text-center">
          <Icon name="Code" className="w-8 h-8 text-default-400 mx-auto mb-2" />
          <p className="text-default-400">{t('Coming soon')}</p>
        </div>
      </div>

      {/* Coming Soon: MCP Connectors */}
      <div className="mt-12 opacity-50 pointer-events-none select-none">
        <Title
          level={3}
          subtitle={t('Connect to Model Context Protocol servers')}
        >
          {t('MCP Servers')}
        </Title>
        <div className="border border-dashed border-default-300 rounded-lg p-8 text-center">
          <Icon
            name="Server"
            className="w-8 h-8 text-default-400 mx-auto mb-2"
          />
          <p className="text-default-400">{t('Coming soon')}</p>
        </div>
      </div>

      {/* Connector Wizard Modal */}
      <ConnectorWizard
        isOpen={showWizard}
        onClose={() => setShowWizard(false)}
        category="app"
      />

      {/* Connector Settings Modal */}
      {selectedConnector && (
        <ConnectorSettingsModal
          isOpen={showSettings}
          onClose={() => {
            setShowSettings(false)
            setSelectedConnector(null)
          }}
          connector={selectedConnector}
        />
      )}
    </div>
  )
}
