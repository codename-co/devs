import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Button, Spinner } from '@heroui/react'
import { Plus } from 'iconoir-react'
import { useLocation, useNavigate } from 'react-router-dom'

import { Title, Icon } from '@/components'
import { useI18n } from '@/i18n'
import { useConnectorStore } from '@/features/connectors/stores'
import {
  ConnectorCard,
  ConnectorWizard,
  ConnectorSettingsModal,
} from '@/features/connectors/components'
import { successToast, errorToast } from '@/lib/toast'
import type {
  Connector,
  AppConnectorProvider,
} from '@/features/connectors/types'
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
  const location = useLocation()
  const navigate = useNavigate()

  // Connector store
  const {
    connectors,
    isLoading: isConnectorsLoading,
    isInitialized,
    initialize: initializeConnectors,
    getAppConnectors,
    deleteConnector,
    validateConnectorTokens,
  } = useConnectorStore()

  // Local state
  const [showWizard, setShowWizard] = useState(false)
  const [reconnectProvider, setReconnectProvider] =
    useState<AppConnectorProvider | null>(null)

  // Connected app connectors
  const appConnectors = useMemo(
    () => getAppConnectors(),
    [connectors, getAppConnectors],
  )

  // Parse hash to get selected connector ID
  const selectedConnectorId = useMemo(() => {
    const hash = location.hash
    if (hash.startsWith('#connector/')) {
      return hash.replace('#connector/', '')
    }
    return null
  }, [location.hash])

  // Get selected connector from ID
  const selectedConnector = useMemo(() => {
    if (!selectedConnectorId) return null
    return appConnectors.find((c) => c.id === selectedConnectorId) || null
  }, [selectedConnectorId, appConnectors])

  // Open connector details via hash
  const handleOpenConnector = useCallback(
    (connector: Connector) => {
      navigate(`${location.pathname}#connector/${connector.id}`, {
        replace: true,
      })
    },
    [navigate, location.pathname],
  )

  // Close connector details
  const handleCloseConnector = useCallback(() => {
    navigate(location.pathname, { replace: true })
  }, [navigate, location.pathname])

  // Initialize and validate tokens
  useEffect(() => {
    if (!isInitialized) {
      initializeConnectors()
    } else {
      // Validate connector tokens once initialized
      // This checks if tokens have expired and updates status accordingly
      validateConnectorTokens()
    }
  }, [isInitialized, initializeConnectors, validateConnectorTokens])

  // Delete connector (called from modal)
  const handleDeleteConnector = useCallback(
    async (connectorId: string) => {
      try {
        await deleteConnector(connectorId)
        handleCloseConnector()
        successToast(t('Connector removed'))
      } catch (error) {
        console.error('Delete connector error:', error)
        errorToast(t('Failed to remove connector'))
      }
    },
    [deleteConnector, handleCloseConnector, t],
  )

  // Reconnect expired connector - delete and re-authenticate
  const handleReconnect = useCallback(
    async (connector: Connector) => {
      // Delete the old connector first
      try {
        await deleteConnector(connector.id)
      } catch (error) {
        console.error('Failed to delete connector before reconnect:', error)
      }
      // Close modal and open wizard with the same provider pre-selected
      handleCloseConnector()
      setReconnectProvider(connector.provider as AppConnectorProvider)
      setShowWizard(true)
    },
    [deleteConnector, handleCloseConnector],
  )

  // Empty state
  const EmptyState = () => (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 mb-4 rounded-full bg-default-100 flex items-center justify-center">
        <Icon name="Puzzle" className="w-8 h-8 text-default-400" />
      </div>
      <Title
        level={3}
        subtitle={t(
          'Connect external services to give your agents powerful tools for searching, reading, and interacting with your data.',
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {appConnectors.map((connector) => (
            <ConnectorCard
              key={connector.id}
              connector={connector}
              onClick={() => handleOpenConnector(connector)}
            />
          ))}
        </div>
      )}

      {/* Coming Soon: API Connectors */}
      {/* <div className="mt-12 opacity-50 pointer-events-none select-none">
        <Title level={3} subtitle={t('Connect to custom REST or GraphQL APIs')}>
          {t('API Connectors')}
        </Title>
        <div className="border border-dashed border-default-300 rounded-lg p-8 text-center">
          <Icon name="Code" className="w-8 h-8 text-default-400 mx-auto mb-2" />
          <p className="text-default-400">{t('Coming soon')}</p>
        </div>
      </div> */}

      {/* Coming Soon: MCP Connectors */}
      {/* <div className="mt-12 opacity-50 pointer-events-none select-none">
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
      </div> */}

      {/* Connector Wizard Modal */}
      <ConnectorWizard
        isOpen={showWizard}
        onClose={() => {
          setShowWizard(false)
          setReconnectProvider(null)
        }}
        category="app"
        initialProvider={reconnectProvider}
      />

      {/* Connector Settings Modal */}
      <ConnectorSettingsModal
        isOpen={!!selectedConnector}
        onClose={handleCloseConnector}
        connector={selectedConnector}
        onDisconnect={handleDeleteConnector}
        onReconnect={handleReconnect}
      />
    </div>
  )
}
