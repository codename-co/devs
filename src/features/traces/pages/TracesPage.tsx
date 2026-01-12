import { useEffect, useState } from 'react'
import {
  Button,
  Tabs,
  Tab,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Input,
  Switch,
  Select,
  SelectItem,
  Tooltip,
} from '@heroui/react'
import { useNavigate, useLocation } from 'react-router'
import { addToast } from '@heroui/toast'

import { useI18n } from '@/i18n'
import { Container, Icon, Section } from '@/components'
import { useTraceStore } from '@/stores/traceStore'
import { TraceList, TraceDashboard } from '../components'
import { useLiveTraceDashboard, useLiveTraces } from '../hooks'
import localI18n from '../i18n'
import DefaultLayout from '@/layouts/Default'
import { HeaderProps } from '@/lib/types'

export function TracesPage() {
  const { t } = useI18n(localI18n)
  const navigate = useNavigate()
  const location = useLocation()

  // Determine active tab from URL
  const getActiveTab = () => {
    if (location.pathname.includes('/logs')) return 'logs'
    return 'dashboard'
  }
  const activeTab = getActiveTab()

  // Use live hooks for real-time updates (polls every 5s, works across windows)
  const {
    metrics: liveMetrics,
    dailyMetrics: liveDailyMetrics,
    isLoading: isDashboardLoading,
  } = useLiveTraceDashboard({
    enabled: activeTab === 'dashboard',
  })

  const { traces: liveTraces, isLoading: isTracesLoading } = useLiveTraces({
    enabled: activeTab === 'logs',
  })

  // Use store for config and actions only
  const { config, loadConfig, updateConfig, deleteTrace, clearAllTraces } =
    useTraceStore()

  const {
    isOpen: isConfigOpen,
    onOpen: onConfigOpen,
    onClose: onConfigClose,
  } = useDisclosure()
  const {
    isOpen: isClearOpen,
    onOpen: onClearOpen,
    onClose: onClearClose,
  } = useDisclosure()

  const [retentionDays, setRetentionDays] = useState(
    config?.retentionDays?.toString() || '30',
  )
  const [samplingRate, setSamplingRate] = useState(
    config?.samplingRate?.toString() || '1',
  )
  const [isEnabled, setIsEnabled] = useState(config?.enabled ?? true)

  // Load config on mount
  useEffect(() => {
    loadConfig()
  }, [])

  useEffect(() => {
    if (config) {
      setRetentionDays(config.retentionDays.toString())
      setSamplingRate(config.samplingRate.toString())
      setIsEnabled(config.enabled)
    }
  }, [config])

  const handleTabChange = (key: React.Key) => {
    if (key === 'logs') {
      navigate('/traces/logs')
    } else {
      navigate('/traces')
    }
  }

  const handleSelectTrace = (traceId: string) => {
    navigate(`/traces/logs/${traceId}`)
  }

  const handleDeleteTrace = async (traceId: string) => {
    try {
      await deleteTrace(traceId)
      addToast({
        title: t('Deleted'),
        description: t('Trace deleted successfully'),
        color: 'success',
      })
    } catch (error) {
      console.error('Failed to delete trace:', error)
      addToast({
        title: t('Error'),
        description: t('Failed to delete trace'),
        color: 'danger',
      })
    }
  }

  const handleClearAll = async () => {
    try {
      await clearAllTraces()
      onClearClose()
      addToast({
        title: t('Cleared'),
        description: t('All traces deleted successfully'),
        color: 'success',
      })
    } catch (error) {
      console.error('Failed to clear traces:', error)
      addToast({
        title: t('Error'),
        description: t('Failed to clear traces'),
        color: 'danger',
      })
    }
  }

  const handleSaveConfig = async () => {
    try {
      await updateConfig({
        enabled: isEnabled,
        retentionDays: parseInt(retentionDays) || 30,
        samplingRate: parseFloat(samplingRate) || 1,
      })
      onConfigClose()
      addToast({
        title: t('Saved'),
        description: t('Configuration saved successfully'),
        color: 'success',
      })
    } catch (error) {
      console.error('Failed to save config:', error)
      addToast({
        title: t('Error'),
        description: t('Failed to save configuration'),
        color: 'danger',
      })
    }
  }

  const header: HeaderProps = {
    icon: {
      name: 'Activity',
      color: 'text-success-500 dark:text-success-400',
    },
    title: t('Traces and Metrics'),
    subtitle: t('Monitor and analyze LLM requests'),
  }

  return (
    <DefaultLayout
      header={header}
      pageMenuActions={
        <>
          <Tooltip content={t('Settings')} placement="bottom">
            <Button
              variant="light"
              isIconOnly
              aria-label={t('Settings')}
              className="opacity-70 hover:opacity-100"
              onPress={onConfigOpen}
            >
              <Icon name="Settings" size="sm" />
            </Button>
          </Tooltip>

          <Tooltip content={t('Clear All')} placement="bottom">
            <Button
              variant="light"
              isIconOnly
              aria-label={t('Clear All')}
              className="opacity-70 hover:opacity-100"
              color="danger"
              onPress={onClearOpen}
            >
              <Icon name="Trash" size="sm" />
            </Button>
          </Tooltip>
        </>
      }
    >
      <Section>
        <Container>
          {/* Tabs */}
          <Tabs
            selectedKey={activeTab}
            onSelectionChange={handleTabChange}
            className="mb-6"
          >
            <Tab
              key="dashboard"
              title={
                <div className="flex items-center gap-2">
                  <Icon name="Activity" className="w-4 h-4" />
                  <span>{t('Dashboard')}</span>
                </div>
              }
            />
            <Tab
              key="logs"
              title={
                <div className="flex items-center gap-2">
                  <Icon name="TableRows" className="w-4 h-4" />
                  <span>{t('Logs')}</span>
                </div>
              }
            />
          </Tabs>

          {/* Content */}
          {activeTab === 'dashboard' && (
            <TraceDashboard
              metrics={liveMetrics}
              dailyMetrics={liveDailyMetrics}
              isLoading={isDashboardLoading}
            />
          )}
          {activeTab === 'logs' && (
            <TraceList
              traces={liveTraces}
              isLoading={isTracesLoading}
              onSelectTrace={handleSelectTrace}
              onDeleteTrace={handleDeleteTrace}
            />
          )}
        </Container>
      </Section>

      {/* Config Modal */}
      <Modal isOpen={isConfigOpen} onClose={onConfigClose}>
        <ModalContent>
          <ModalHeader>{t('Tracing Settings')}</ModalHeader>
          <ModalBody className="gap-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{t('Enable Tracing')}</p>
                <p className="text-sm text-default-400">
                  {t('Capture all LLM requests')}
                </p>
              </div>
              <Switch isSelected={isEnabled} onValueChange={setIsEnabled} />
            </div>

            <Input
              type="number"
              label={t('Retention Days')}
              description={t('How long to keep traces')}
              value={retentionDays}
              onValueChange={setRetentionDays}
              min={1}
              max={365}
            />

            <Select
              label={t('Sampling Rate')}
              description={t('Percentage of requests to trace')}
              selectedKeys={[samplingRate]}
              onSelectionChange={(keys) => {
                const key = Array.from(keys)[0]
                if (key) setSamplingRate(key.toString())
              }}
            >
              <SelectItem key="1">100%</SelectItem>
              <SelectItem key="0.5">50%</SelectItem>
              <SelectItem key="0.1">10%</SelectItem>
              <SelectItem key="0.01">1%</SelectItem>
            </Select>
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={onConfigClose}>
              {t('Cancel')}
            </Button>
            <Button color="primary" onPress={handleSaveConfig}>
              {t('Save')}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Clear Confirmation Modal */}
      <Modal isOpen={isClearOpen} onClose={onClearClose}>
        <ModalContent>
          <ModalHeader>{t('Clear All Traces')}</ModalHeader>
          <ModalBody>
            <p>
              {t(
                'Are you sure you want to delete all traces? This action cannot be undone.',
              )}
            </p>
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={onClearClose}>
              {t('Cancel')}
            </Button>
            <Button color="danger" onPress={handleClearAll}>
              {t('Delete All')}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </DefaultLayout>
  )
}
