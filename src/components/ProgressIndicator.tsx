import { useEffect, useMemo, useState } from 'react'
import { Icon, type IconProps } from './Icon'

export interface LLMRequest {
  requestId: string
  provider: string
  endpoint: string
  startTime: number
}

export interface LLMProgressStats {
  activeRequests: number
  totalRequests: number
  averageResponseTime: number
  completedRequests: number
}

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
    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data.type === 'LLM_PROGRESS_UPDATE') {
        const newStats = event.data.stats as LLMProgressStats
        setStats(newStats)
        setIsVisible(newStats.activeRequests > 0 || newStats.totalRequests > 0)
        setIsInfering(newStats.activeRequests > 0)
      }
    }

    // Listen for messages from service worker
    navigator.serviceWorker?.addEventListener(
      'message',
      handleServiceWorkerMessage,
    )

    // Request current stats on mount
    if (navigator.serviceWorker?.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'GET_LLM_PROGRESS_STATS',
      })
    }

    return () => {
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
        size="xl"
        className="text-primary-300 dark:text-white"
        animation={animation}
      />
      <span data-testid="status-text" className="sr-only">
        {stats.activeRequests > 0 ? 'Processing' : 'Idle'}
      </span>
    </div>
  )
}
