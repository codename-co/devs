/**
 * TracesSection — Settings section for LLM traces and metrics.
 *
 * Uses hash-based sub-routes:
 *  - #settings/traces          → Dashboard with aggregated metrics and daily charts
 *  - #settings/traces/logs     → Logs list with individual trace inspection
 *  - #settings/traces/logs/:id → Trace detail view with spans
 *
 * Also includes:
 *  - Tracing configuration modal (enable, retention, sampling)
 *  - Clear all traces confirmation modal
 */

import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Button,
  Input,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Select,
  SelectItem,
  Spinner,
  Tabs,
  Tab,
  Tooltip,
  Switch,
  useDisclosure,
} from '@heroui/react'
import { addToast } from '@heroui/toast'
import { Icon } from '@/components'
import { useI18n } from '@/i18n'
import { useTraceStore } from '@/stores/traceStore'
import {
  TraceList,
  TraceDashboard,
  TraceDetail,
  type TracePeriod,
} from '@/features/traces/components'
import { useLiveTraceDashboard, useLiveTraces } from '@/features/traces/hooks'
import tracesI18n from '@/features/traces/i18n'

/**
 * Parse the hash to extract the traces sub-route.
 * Expected formats:
 *   #settings/traces           → { view: 'dashboard', traceId: null }
 *   #settings/traces/logs      → { view: 'logs', traceId: null }
 *   #settings/traces/logs/:id  → { view: 'detail', traceId: ':id' }
 */
function parseTracesHash(hash: string): {
  view: 'dashboard' | 'logs' | 'detail'
  traceId: string | null
} {
  const raw = hash.replace(/^#/, '')
  const segments = raw.split('/')
  // segments: ["settings", "traces", ...]
  // Index 2+ is sub-route under traces
  const sub = segments.slice(2)

  if (sub[0] === 'logs' && sub[1]) {
    return { view: 'detail', traceId: sub[1] }
  }
  if (sub[0] === 'logs') {
    return { view: 'logs', traceId: null }
  }
  return { view: 'dashboard', traceId: null }
}

export function TracesSection() {
  const { t: tTraces } = useI18n(tracesI18n)
  const location = useLocation()
  const navigate = useNavigate()

  const { view, traceId: selectedTraceId } = useMemo(
    () => parseTracesHash(location.hash),
    [location.hash],
  )

  const tracesActiveTab =
    view === 'logs' || view === 'detail' ? 'logs' : 'dashboard'

  const [tracesPeriod, setTracesPeriod] = useState<TracePeriod>('week')

  const {
    metrics: liveMetrics,
    dailyMetrics: liveDailyMetrics,
    isLoading: isDashboardLoading,
  } = useLiveTraceDashboard({
    period: tracesPeriod,
    enabled: view === 'dashboard',
  })

  const { traces: liveTraces, isLoading: isTracesLoading } = useLiveTraces({
    enabled: view === 'logs' || view === 'detail',
  })

  const {
    config: tracesConfig,
    currentTrace,
    currentSpans,
    isLoading: isTraceDetailLoading,
    loadConfig: loadTracesConfig,
    updateConfig: updateTracesConfig,
    loadTrace,
    clearCurrentTrace,
    deleteTrace,
    clearAllTraces,
  } = useTraceStore()

  const {
    isOpen: isTracesConfigOpen,
    onOpen: onTracesConfigOpen,
    onClose: onTracesConfigClose,
  } = useDisclosure()
  const {
    isOpen: isTracesClearOpen,
    onOpen: onTracesClearOpen,
    onClose: onTracesClearClose,
  } = useDisclosure()

  const [tracesRetentionDays, setTracesRetentionDays] = useState(
    tracesConfig?.retentionDays?.toString() || '30',
  )
  const [tracesSamplingRate, setTracesSamplingRate] = useState(
    tracesConfig?.samplingRate?.toString() || '1',
  )
  const [isTracesEnabled, setIsTracesEnabled] = useState(
    tracesConfig?.enabled ?? true,
  )

  // Navigation helpers
  const navigateToHash = (hash: string) => {
    navigate(`${location.pathname}#${hash}`, { replace: true })
  }

  const handleTabChange = (tab: 'dashboard' | 'logs') => {
    if (tab === 'logs') {
      navigateToHash('settings/traces/logs')
    } else {
      navigateToHash('settings/traces')
    }
  }

  // Load traces config on mount
  useEffect(() => {
    loadTracesConfig()
  }, [])

  useEffect(() => {
    if (tracesConfig) {
      setTracesRetentionDays(tracesConfig.retentionDays.toString())
      setTracesSamplingRate(tracesConfig.samplingRate.toString())
      setIsTracesEnabled(tracesConfig.enabled)
    }
  }, [tracesConfig])

  // Load trace detail when a trace is selected via URL
  useEffect(() => {
    if (selectedTraceId) {
      loadTrace(selectedTraceId)
    }
    return () => {
      clearCurrentTrace()
    }
  }, [selectedTraceId, loadTrace, clearCurrentTrace])

  const handleSelectTrace = (traceId: string) => {
    navigateToHash(`settings/traces/logs/${traceId}`)
  }

  const handleBackFromTraceDetail = () => {
    clearCurrentTrace()
    navigateToHash('settings/traces/logs')
  }

  const handleDeleteTrace = async (traceId: string) => {
    try {
      await deleteTrace(traceId)
      // If we just deleted the trace we're viewing, go back to logs
      if (traceId === selectedTraceId) {
        navigateToHash('settings/traces/logs')
      }
      addToast({
        title: tTraces('Deleted'),
        description: tTraces('Trace deleted successfully'),
        color: 'success',
      })
    } catch (error) {
      console.error('Failed to delete trace:', error)
      addToast({
        title: tTraces('Error'),
        description: tTraces('Failed to delete trace'),
        color: 'danger',
      })
    }
  }

  const handleClearAllTraces = async () => {
    try {
      await clearAllTraces()
      onTracesClearClose()
      addToast({
        title: tTraces('Cleared'),
        description: tTraces('All traces deleted successfully'),
        color: 'success',
      })
    } catch (error) {
      console.error('Failed to clear traces:', error)
      addToast({
        title: tTraces('Error'),
        description: tTraces('Failed to clear traces'),
        color: 'danger',
      })
    }
  }

  const handleSaveTracesConfig = async () => {
    try {
      await updateTracesConfig({
        enabled: isTracesEnabled,
        retentionDays: parseInt(tracesRetentionDays) || 30,
        samplingRate: parseFloat(tracesSamplingRate) || 1,
      })
      onTracesConfigClose()
      addToast({
        title: tTraces('Saved'),
        description: tTraces('Configuration saved successfully'),
        color: 'success',
      })
    } catch (error) {
      console.error('Failed to save config:', error)
      addToast({
        title: tTraces('Error'),
        description: tTraces('Failed to save configuration'),
        color: 'danger',
      })
    }
  }

  // If viewing a single trace detail
  if (view === 'detail' && selectedTraceId) {
    if (isTraceDetailLoading) {
      return (
        <div className="flex justify-center items-center py-12">
          <Spinner size="lg" />
        </div>
      )
    }
    if (!currentTrace) {
      return (
        <div className="flex flex-col items-center justify-center py-16">
          <Icon
            name="WarningTriangle"
            className="w-16 h-16 text-default-300 mb-4"
          />
          <h3 className="text-lg font-medium text-default-600 mb-4">
            {tTraces('Trace not found')}
          </h3>
          <Button
            variant="flat"
            startContent={<Icon name="NavArrowLeft" className="w-4 h-4" />}
            onPress={handleBackFromTraceDetail}
          >
            {tTraces('Back to Traces')}
          </Button>
        </div>
      )
    }
    return (
      <div data-testid="trace-detail" className="space-y-4">
        <Button
          variant="flat"
          size="sm"
          startContent={<Icon name="NavArrowLeft" className="w-4 h-4" />}
          onPress={handleBackFromTraceDetail}
        >
          {tTraces('Back to Traces')}
        </Button>
        <TraceDetail trace={currentTrace} spans={currentSpans} />
      </div>
    )
  }

  // Main traces view with dashboard/logs tabs
  return (
    <div data-testid="traces-settings" className="space-y-4">
      <div className="float-end flex items-center justify-end">
        <Tooltip content={tTraces('Settings')} placement="bottom">
          <Button
            size="sm"
            variant="flat"
            aria-label={tTraces('Settings')}
            onPress={onTracesConfigOpen}
          >
            <Icon name="Settings" size="sm" />
          </Button>
        </Tooltip>
      </div>

      <Tabs
        selectedKey={tracesActiveTab}
        onSelectionChange={(key) =>
          handleTabChange(key as 'dashboard' | 'logs')
        }
        className="mb-4"
      >
        <Tab
          key="dashboard"
          title={
            <div className="flex items-center gap-2">
              <Icon name="Activity" className="w-4 h-4" />
              <span>{tTraces('Dashboard')}</span>
            </div>
          }
        />
        <Tab
          key="logs"
          title={
            <div className="flex items-center gap-2">
              <Icon name="TableRows" className="w-4 h-4" />
              <span>{tTraces('Logs')}</span>
            </div>
          }
        />
      </Tabs>

      {tracesActiveTab === 'dashboard' && (
        <TraceDashboard
          metrics={liveMetrics}
          dailyMetrics={liveDailyMetrics}
          isLoading={isDashboardLoading}
          period={tracesPeriod}
          onPeriodChange={setTracesPeriod}
        />
      )}
      {tracesActiveTab === 'logs' && (
        <TraceList
          traces={liveTraces}
          isLoading={isTracesLoading}
          onSelectTrace={handleSelectTrace}
          onDeleteTrace={handleDeleteTrace}
        />
      )}

      {/* Traces Config Modal */}
      <Modal isOpen={isTracesConfigOpen} onClose={onTracesConfigClose}>
        <ModalContent>
          <ModalHeader>{tTraces('Tracing Settings')}</ModalHeader>
          <ModalBody className="gap-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{tTraces('Enable Tracing')}</p>
                <p className="text-sm text-default-400">
                  {tTraces('Capture all LLM requests')}
                </p>
              </div>
              <Switch
                isSelected={isTracesEnabled}
                onValueChange={setIsTracesEnabled}
              />
            </div>

            <Input
              type="number"
              label={tTraces('Retention Days')}
              description={tTraces('How long to keep traces')}
              value={tracesRetentionDays}
              onValueChange={setTracesRetentionDays}
              min={1}
              max={365}
            />

            <Select
              label={tTraces('Sampling Rate')}
              description={tTraces('Percentage of requests to trace')}
              selectedKeys={[tracesSamplingRate]}
              onSelectionChange={(keys) => {
                const key = Array.from(keys)[0]
                if (key) setTracesSamplingRate(key.toString())
              }}
            >
              <SelectItem key="1">100%</SelectItem>
              <SelectItem key="0.5">50%</SelectItem>
              <SelectItem key="0.1">10%</SelectItem>
              <SelectItem key="0.01">1%</SelectItem>
            </Select>

            <div className="pt-4 border-t border-divider">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-danger">
                    {tTraces('Clear All Traces')}
                  </p>
                  <p className="text-sm text-default-400">
                    {tTraces('Delete all traces permanently')}
                  </p>
                </div>
                <Button
                  color="danger"
                  variant="flat"
                  onPress={onTracesClearOpen}
                >
                  <Icon name="Trash" size="sm" />
                  {tTraces('Clear All')}
                </Button>
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={onTracesConfigClose}>
              {tTraces('Cancel')}
            </Button>
            <Button color="primary" onPress={handleSaveTracesConfig}>
              {tTraces('Save')}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Traces Clear Confirmation Modal */}
      <Modal isOpen={isTracesClearOpen} onClose={onTracesClearClose}>
        <ModalContent>
          <ModalHeader>{tTraces('Clear All Traces')}</ModalHeader>
          <ModalBody>
            <p>
              {tTraces(
                'Are you sure you want to delete all traces? This action cannot be undone.',
              )}
            </p>
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={onTracesClearClose}>
              {tTraces('Cancel')}
            </Button>
            <Button color="danger" onPress={handleClearAllTraces}>
              {tTraces('Delete All')}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  )
}
