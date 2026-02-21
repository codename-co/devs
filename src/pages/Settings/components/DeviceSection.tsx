/**
 * DeviceSection — Settings section showing device capabilities, sandbox runtimes, and resources.
 *
 * Displays:
 *  - Sandbox runtimes (Python / JavaScript) with status and controls
 *  - CPU cores available vs in use
 *  - Memory used vs total
 *  - Storage used vs total (via StorageManager API)
 *  - Device info (GPU, WebGPU support, memory)
 */

import { useEffect, useState, useCallback } from 'react'
import { Button, Chip, Progress, Tooltip } from '@heroui/react'
import { Icon } from '@/components'
import { useI18n } from '@/i18n'
import { sandbox, type SandboxLanguage, type SandboxState } from '@/lib/sandbox'
import { formatBytes } from '@/lib/format'
import { deviceName, getVideoCardInfo, isWebGPUSupported } from '@/lib/device'
import localI18n from '../i18n'

/** Demo snippets used by the "Try" button for each runtime. */
const DEMO_CODE: Record<SandboxLanguage, string> = {
  python: /* python */ `
import sys
import random

print(f"Hello from Python {sys.version_info.major}.{sys.version_info.minor}! Random number: {random.randint(1, 100)}")
`,
  javascript: /* javascript */ `
export default "Hello from JavaScript! Random number: " + parseInt(1 + 100 * Math.random())
`,
}

interface TryResult {
  output: string
  success: boolean
}

interface ResourceInfo {
  cpuCores: number
  cpuInUse: number
  memoryUsed: number
  memoryTotal: number
  storageUsed: number
  storageTotal: number
}

type RuntimeStates = Record<SandboxLanguage, SandboxState>

/** Per-runtime display metadata. */
const RUNTIME_META: {
  language: SandboxLanguage
  label: string
  engine: string
  canWarmup: boolean
}[] = [
  {
    language: 'python',
    label: 'Python',
    engine: 'Pyodide · CPython 3.12 WASM',
    canWarmup: true,
  },
  {
    language: 'javascript',
    label: 'JavaScript',
    engine: 'QuickJS · ES2020 WASM',
    canWarmup: false,
  },
]

function stateLabel(
  state: SandboxState,
): 'Executing' | 'Running' | 'Loading' | 'Error' | 'Idle' {
  switch (state) {
    case 'executing':
      return 'Executing'
    case 'ready':
      return 'Running'
    case 'loading':
      return 'Loading'
    case 'error':
      return 'Error'
    default:
      return 'Idle'
  }
}

function stateColor(
  state: SandboxState,
): 'success' | 'danger' | 'warning' | 'default' {
  switch (state) {
    case 'ready':
    case 'executing':
      return 'success'
    case 'loading':
      return 'warning'
    case 'error':
      return 'danger'
    default:
      return 'default'
  }
}

export function DeviceSection() {
  const { lang, t } = useI18n(localI18n)
  const [runtimeStates, setRuntimeStates] = useState<RuntimeStates>({
    python: sandbox.getState('python'),
    javascript: sandbox.getState('javascript'),
  })
  const [resources, setResources] = useState<ResourceInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [tryResults, setTryResults] = useState<
    Record<SandboxLanguage, TryResult | null>
  >({ python: null, javascript: null })
  const [tryingLanguage, setTryingLanguage] = useState<SandboxLanguage | null>(
    null,
  )

  const webGPU = isWebGPUSupported()
  const videoCard = getVideoCardInfo()

  const refreshStates = useCallback(() => {
    setRuntimeStates({
      python: sandbox.getState('python'),
      javascript: sandbox.getState('javascript'),
    })
  }, [])

  const fetchResources = useCallback(async () => {
    try {
      const cpuCores = navigator.hardwareConcurrency || 1

      // Count active runtimes
      const pyState = sandbox.getState('python')
      const jsState = sandbox.getState('javascript')
      const cpuInUse =
        (pyState === 'executing' ? 1 : 0) + (jsState === 'executing' ? 1 : 0)

      let memoryUsed = 0
      let memoryTotal = 0
      const perf = performance as any
      if (perf.memory) {
        memoryUsed = perf.memory.usedJSHeapSize ?? 0
      }
      // Use device memory as the total reference to avoid confusion
      // between JS heap limit and actual device RAM
      if ((navigator as any).deviceMemory) {
        memoryTotal = (navigator as any).deviceMemory * 1024 * 1024 * 1024
      } else if (perf.memory) {
        memoryTotal = perf.memory.jsHeapSizeLimit ?? 0
      }

      let storageUsed = 0
      let storageTotal = 0
      if (navigator.storage?.estimate) {
        const estimate = await navigator.storage.estimate()
        storageUsed = estimate.usage ?? 0
        storageTotal = estimate.quota ?? 0
      }

      setResources({
        cpuCores,
        cpuInUse,
        memoryUsed,
        memoryTotal,
        storageUsed,
        storageTotal,
      })
    } catch (error) {
      console.error('[DeviceSection] Failed to fetch resources:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchResources()

    const interval = setInterval(() => {
      refreshStates()
      fetchResources()
    }, 3000)

    const unsub = sandbox.onProgress(() => refreshStates())

    return () => {
      clearInterval(interval)
      unsub()
    }
  }, [fetchResources, refreshStates])

  const handleTry = async (language: SandboxLanguage) => {
    setTryingLanguage(language)
    setTryResults((prev) => ({ ...prev, [language]: null }))
    try {
      const result = await sandbox.execute({
        language,
        code: DEMO_CODE[language],
      })
      setTryResults((prev) => ({
        ...prev,
        [language]: {
          output: result.stdout?.trim() || result.result || result.error || '',
          success: result.success,
        },
      }))
    } catch (e) {
      setTryResults((prev) => ({
        ...prev,
        [language]: { output: String(e), success: false },
      }))
    } finally {
      setTryingLanguage(null)
      refreshStates()
      fetchResources()
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Device & GPU Info */}
      <div>
        <h4 className="text-sm font-medium text-default-700 mb-3">
          {t('Device Information')}
        </h4>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-default-600">{t('Device')}</span>
            <span className="text-sm text-default-500">{deviceName()}</span>
          </div>
          {videoCard?.vendor && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-default-600">
                {t('GPU Vendor')}
              </span>
              <span className="text-sm text-default-500">
                {videoCard.vendor}
              </span>
            </div>
          )}
          {/* {videoCard?.renderer && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-default-600">
                {t('GPU Renderer')}
              </span>
              <span
                className="text-sm text-default-500 text-right max-w-[60%] truncate"
                title={videoCard.renderer}
              >
                {videoCard.renderer}
              </span>
            </div>
          )} */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-default-600">{t('WebGPU')}</span>
            <Chip
              size="sm"
              color={webGPU ? 'success' : 'danger'}
              variant="flat"
              startContent={
                <Icon
                  name={webGPU ? 'CheckCircle' : 'XmarkCircle'}
                  className="h-3.5 w-3.5"
                />
              }
            >
              {webGPU ? t('Supported') : t('Not Supported')}
            </Chip>
          </div>
        </div>
      </div>

      {/* System Resources */}
      <div>
        <h4 className="text-sm font-medium text-default-700 mb-3">
          {t('System Resources')}
        </h4>

        {/* CPU */}
        {resources && (
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <span className="flex gap-2 items-center text-sm text-default-600">
                <Icon name="Cpu" size="sm" />
                {t('CPU')}
              </span>
              <span className="text-xs text-default-500">
                {t('{used} / {total} cores', {
                  used: resources.cpuInUse,
                  total: resources.cpuCores,
                })}
              </span>
            </div>
            <Progress
              size="sm"
              value={
                resources.cpuCores > 0
                  ? (resources.cpuInUse / resources.cpuCores) * 100
                  : 0
              }
              color={resources.cpuInUse > 0 ? 'primary' : 'default'}
              aria-label={t('CPU usage')}
            />
          </div>
        )}

        {/* Memory */}
        {resources && resources.memoryTotal > 0 && (
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <span className="flex gap-2 items-center text-sm text-default-600">
                <Icon name="ElectronicsChip" size="sm" />
                {t('Memory')}
              </span>
              <span className="text-xs text-default-500">
                {formatBytes(resources.memoryUsed, lang)} /{' '}
                {formatBytes(resources.memoryTotal, lang)}
              </span>
            </div>
            <Progress
              size="sm"
              value={(resources.memoryUsed / resources.memoryTotal) * 100}
              color={
                resources.memoryUsed / resources.memoryTotal > 0.85
                  ? 'danger'
                  : resources.memoryUsed / resources.memoryTotal > 0.6
                    ? 'warning'
                    : 'primary'
              }
              aria-label={t('Memory usage')}
            />
          </div>
        )}

        {/* Storage */}
        {resources && resources.storageTotal > 0 && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="flex gap-2 items-center text-sm text-default-600">
                <Icon name="HardDrive" size="sm" />
                {t('Storage')}
              </span>
              <span className="text-xs text-default-500">
                {formatBytes(resources.storageUsed, lang)} /{' '}
                {formatBytes(resources.storageTotal, lang)}
              </span>
            </div>
            <Progress
              size="sm"
              value={(resources.storageUsed / resources.storageTotal) * 100}
              color={
                resources.storageUsed / resources.storageTotal > 0.85
                  ? 'danger'
                  : resources.storageUsed / resources.storageTotal > 0.6
                    ? 'warning'
                    : 'primary'
              }
              aria-label={t('Storage usage')}
            />
          </div>
        )}
      </div>

      {/* Sandbox Runtimes */}
      <div>
        <h4 className="text-sm font-medium text-default-700 mb-3">
          {t('Sandbox Runtimes')}
        </h4>
        <p className="text-xs text-default-400 mb-4">
          {t(
            'Isolated code execution environments running entirely in WebAssembly. Python uses a Web Worker; JavaScript runs in a lightweight QuickJS VM.',
          )}
        </p>

        <div className="space-y-3">
          {RUNTIME_META.map(({ language, label, engine }) => {
            const state = runtimeStates[language]
            const isExecuting = state === 'executing'

            return (
              <div key={language} className="space-y-0">
                <div className="flex items-center justify-between rounded-lg border border-default-200 px-4 py-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-default-700">
                          {label}
                        </span>
                        <Chip size="sm" color={stateColor(state)} variant="dot">
                          {t(stateLabel(state))}
                        </Chip>
                      </div>
                      <span className="text-xs text-default-400">{engine}</span>
                    </div>
                  </div>

                  <div className="flex gap-2 shrink-0 ml-4">
                    {/* {canWarmup && !isRunning && !isLoadingRuntime && (
                      <Tooltip
                        content={t('Pre-load the {runtime} runtime', {
                          runtime: label,
                        })}
                      >
                        <Button
                          size="sm"
                          variant="flat"
                          color="primary"
                          onPress={() => handleWarmup(language)}
                          startContent={
                            <Icon name="Play" className="h-4 w-4" />
                          }
                        >
                          {t('Start')}
                        </Button>
                      </Tooltip>
                    )}
                    {canWarmup && isRunning && (
                      <Tooltip
                        content={t('Terminate the {runtime} runtime', {
                          runtime: label,
                        })}
                      >
                        <Button
                          size="sm"
                          variant="flat"
                          color="danger"
                          onPress={() => handleTerminate(language)}
                          isDisabled={isExecuting}
                          startContent={
                            <Icon name="Square" className="h-4 w-4" />
                          }
                        >
                          {t('Stop')}
                        </Button>
                      </Tooltip>
                    )} */}
                    <Tooltip
                      content={t(
                        'Run a test snippet in the {runtime} sandbox',
                        { runtime: label },
                      )}
                    >
                      <Button
                        size="sm"
                        variant="light"
                        color="secondary"
                        onPress={() => handleTry(language)}
                        isDisabled={isExecuting || tryingLanguage === language}
                        isLoading={tryingLanguage === language}
                      >
                        {t('Try')}
                      </Button>
                    </Tooltip>
                  </div>
                </div>

                {tryResults[language] && (
                  <div
                    className={`mt-2 rounded-md px-3 py-2 font-mono text-xs ${
                      tryResults[language]!.success
                        ? 'bg-success-50 text-success-700 dark:bg-success-900/20 dark:text-success-400'
                        : 'bg-danger-50 text-danger-700 dark:bg-danger-900/20 dark:text-danger-400'
                    }`}
                  >
                    {tryResults[language]!.output}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
