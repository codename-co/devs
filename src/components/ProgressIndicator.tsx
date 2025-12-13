import { useEffect, useMemo, useState } from 'react'
import { Icon, type IconProps } from './Icon'
import { LLMService, type LLMProgressStats } from '@/lib/llm'

export interface LLMRequest {
  requestId: string
  provider: string
  endpoint: string
  startTime: number
}

export { type LLMProgressStats }

export const ProgressIndicator = () => {
  const [stats, setStats] = useState<LLMProgressStats>({
    activeRequests: 0,
    totalRequests: 0,
    averageResponseTime: 0,
    completedRequests: 0,
  })
  const [_isVisible, setIsVisible] = useState(false)
  const [isInferring, setIsInfering] = useState(false)

  useEffect(() => {
    // Handler for custom window events from LLMService
    const handleLLMProgressUpdate = (
      event: CustomEvent<{ stats: LLMProgressStats }>,
    ) => {
      const newStats = event.detail.stats
      setStats(newStats)
      setIsVisible(newStats.activeRequests > 0 || newStats.totalRequests > 0)
      setIsInfering(newStats.activeRequests > 0)
    }

    // Handler for service worker messages (legacy support)
    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data.type === 'LLM_PROGRESS_UPDATE') {
        const newStats = event.data.stats as LLMProgressStats
        setStats(newStats)
        setIsVisible(newStats.activeRequests > 0 || newStats.totalRequests > 0)
        setIsInfering(newStats.activeRequests > 0)
      }
    }

    // Listen for custom events from LLMService (primary method)
    window.addEventListener(
      'llm-progress-update',
      handleLLMProgressUpdate as EventListener,
    )

    // Listen for messages from service worker (fallback)
    navigator.serviceWorker?.addEventListener(
      'message',
      handleServiceWorkerMessage,
    )

    // Request current stats on mount
    setStats(LLMService.getProgressStats())

    return () => {
      window.removeEventListener(
        'llm-progress-update',
        handleLLMProgressUpdate as EventListener,
      )
      navigator.serviceWorker?.removeEventListener(
        'message',
        handleServiceWorkerMessage,
      )
    }
  }, [])

  // if (!isVisible) {
  //   return null
  // }

  const animation: IconProps['animation'] = useMemo(
    () =>
      isInferring
        ? 'pulsating'
        : stats.activeRequests > 0
          ? 'thinking'
          : 'appear',
    [isInferring, stats.activeRequests],
  )

  return (
    <div
      data-testid="task-progress"
      className="flex items-center justify-center py-2"
    >
      <Icon
        name="DevsAnimated"
        size="lg"
        className="text-primary-300 dark:text-white"
        animation={animation}
      />
      <span data-testid="status-text" className="sr-only">
        {stats.activeRequests > 0 ? 'Processing' : 'Idle'}
      </span>
    </div>
  )
}
