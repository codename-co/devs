/**
 * Live Trace Hooks
 *
 * Provides real-time updates for trace data using polling.
 * Works across multiple browser windows/tabs since it polls IndexedDB directly.
 */
import { useCallback, useEffect, useRef, useState } from 'react'

import { TraceService } from '../trace-service'
import type { Trace, TraceMetrics, DailyMetrics, TraceFilter } from '../types'

// Default polling interval (5 seconds)
const DEFAULT_POLL_INTERVAL = 5000

interface UseLiveTracesOptions {
  /** Filter to apply to traces */
  filter?: TraceFilter
  /** Polling interval in ms (default: 5000) */
  pollInterval?: number
  /** Whether polling is enabled (default: true) */
  enabled?: boolean
}

interface UseLiveTracesReturn {
  traces: Trace[]
  isLoading: boolean
  error: Error | null
  refresh: () => Promise<void>
}

/**
 * Hook for live trace list updates.
 * Polls IndexedDB for trace data at regular intervals.
 */
export function useLiveTraces(
  options: UseLiveTracesOptions = {},
): UseLiveTracesReturn {
  const {
    filter,
    pollInterval = DEFAULT_POLL_INTERVAL,
    enabled = true,
  } = options

  const [traces, setTraces] = useState<Trace[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const mountedRef = useRef(true)

  const loadTraces = useCallback(async () => {
    try {
      await TraceService.initialize()
      const data = await TraceService.getTraces(filter)
      if (mountedRef.current) {
        setTraces(data)
        setError(null)
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(
          err instanceof Error ? err : new Error('Failed to load traces'),
        )
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false)
      }
    }
  }, [filter])

  // Initial load
  useEffect(() => {
    mountedRef.current = true
    loadTraces()

    return () => {
      mountedRef.current = false
    }
  }, [loadTraces])

  // Polling
  useEffect(() => {
    if (!enabled) return

    const intervalId = setInterval(loadTraces, pollInterval)

    return () => {
      clearInterval(intervalId)
    }
  }, [enabled, pollInterval, loadTraces])

  return {
    traces,
    isLoading,
    error,
    refresh: loadTraces,
  }
}

interface UseLiveMetricsOptions {
  /** Time period for metrics */
  period?: 'hour' | 'day' | 'week' | 'month' | 'all'
  /** Polling interval in ms (default: 5000) */
  pollInterval?: number
  /** Whether polling is enabled (default: true) */
  enabled?: boolean
}

interface UseLiveMetricsReturn {
  metrics: TraceMetrics | null
  isLoading: boolean
  error: Error | null
  refresh: () => Promise<void>
}

/**
 * Hook for live trace metrics updates.
 */
export function useLiveMetrics(
  options: UseLiveMetricsOptions = {},
): UseLiveMetricsReturn {
  const {
    period = 'day',
    pollInterval = DEFAULT_POLL_INTERVAL,
    enabled = true,
  } = options

  const [metrics, setMetrics] = useState<TraceMetrics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const mountedRef = useRef(true)

  const loadMetrics = useCallback(async () => {
    try {
      await TraceService.initialize()
      const data = await TraceService.getMetrics(period)
      if (mountedRef.current) {
        setMetrics(data)
        setError(null)
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(
          err instanceof Error ? err : new Error('Failed to load metrics'),
        )
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false)
      }
    }
  }, [period])

  // Initial load
  useEffect(() => {
    mountedRef.current = true
    loadMetrics()

    return () => {
      mountedRef.current = false
    }
  }, [loadMetrics])

  // Polling
  useEffect(() => {
    if (!enabled) return

    const intervalId = setInterval(loadMetrics, pollInterval)

    return () => {
      clearInterval(intervalId)
    }
  }, [enabled, pollInterval, loadMetrics])

  return {
    metrics,
    isLoading,
    error,
    refresh: loadMetrics,
  }
}

interface UseLiveDailyMetricsOptions {
  /** Number of days to fetch (default: 14) */
  days?: number
  /** Polling interval in ms (default: 5000) */
  pollInterval?: number
  /** Whether polling is enabled (default: true) */
  enabled?: boolean
}

interface UseLiveDailyMetricsReturn {
  dailyMetrics: DailyMetrics[]
  isLoading: boolean
  error: Error | null
  refresh: () => Promise<void>
}

/**
 * Hook for live daily metrics updates.
 */
export function useLiveDailyMetrics(
  options: UseLiveDailyMetricsOptions = {},
): UseLiveDailyMetricsReturn {
  const {
    days = 14,
    pollInterval = DEFAULT_POLL_INTERVAL,
    enabled = true,
  } = options

  const [dailyMetrics, setDailyMetrics] = useState<DailyMetrics[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const mountedRef = useRef(true)

  const loadDailyMetrics = useCallback(async () => {
    try {
      await TraceService.initialize()
      const data = await TraceService.getDailyMetrics(days)
      if (mountedRef.current) {
        setDailyMetrics(data)
        setError(null)
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(
          err instanceof Error
            ? err
            : new Error('Failed to load daily metrics'),
        )
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false)
      }
    }
  }, [days])

  // Initial load
  useEffect(() => {
    mountedRef.current = true
    loadDailyMetrics()

    return () => {
      mountedRef.current = false
    }
  }, [loadDailyMetrics])

  // Polling
  useEffect(() => {
    if (!enabled) return

    const intervalId = setInterval(loadDailyMetrics, pollInterval)

    return () => {
      clearInterval(intervalId)
    }
  }, [enabled, pollInterval, loadDailyMetrics])

  return {
    dailyMetrics,
    isLoading,
    error,
    refresh: loadDailyMetrics,
  }
}

/**
 * Combined hook for all dashboard data with synchronized polling.
 */
export function useLiveTraceDashboard(
  options: {
    period?: 'hour' | 'day' | 'week' | 'month' | 'all'
    days?: number
    pollInterval?: number
    enabled?: boolean
  } = {},
) {
  const {
    period = 'day',
    days = 14,
    pollInterval = DEFAULT_POLL_INTERVAL,
    enabled = true,
  } = options

  const [data, setData] = useState<{
    metrics: TraceMetrics | null
    dailyMetrics: DailyMetrics[]
  }>({
    metrics: null,
    dailyMetrics: [],
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const mountedRef = useRef(true)

  const loadData = useCallback(async () => {
    try {
      await TraceService.initialize()
      const [metrics, dailyMetrics] = await Promise.all([
        TraceService.getMetrics(period),
        TraceService.getDailyMetrics(days),
      ])
      if (mountedRef.current) {
        setData({ metrics, dailyMetrics })
        setError(null)
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(
          err instanceof Error
            ? err
            : new Error('Failed to load dashboard data'),
        )
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false)
      }
    }
  }, [period, days])

  // Initial load
  useEffect(() => {
    mountedRef.current = true
    loadData()

    return () => {
      mountedRef.current = false
    }
  }, [loadData])

  // Polling
  useEffect(() => {
    if (!enabled) return

    const intervalId = setInterval(loadData, pollInterval)

    return () => {
      clearInterval(intervalId)
    }
  }, [enabled, pollInterval, loadData])

  return {
    ...data,
    isLoading,
    error,
    refresh: loadData,
  }
}
