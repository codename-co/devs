import { create } from 'zustand'
import { errorToast } from '@/lib/toast'
import {
  Trace,
  Span,
  TraceMetrics,
  DailyMetrics,
  TraceFilter,
  TracingConfig,
} from '@/features/traces/types'
import { TraceService } from '@/features/traces/trace-service'

interface TraceStore {
  // Data
  traces: Trace[]
  currentTrace: Trace | null
  currentSpans: Span[]
  metrics: TraceMetrics | null
  dailyMetrics: DailyMetrics[]
  config: TracingConfig | null

  // UI State
  isLoading: boolean
  filter: TraceFilter
  selectedPeriod: 'hour' | 'day' | 'week' | 'month' | 'all'

  // Actions
  loadTraces: (filter?: TraceFilter) => Promise<void>
  loadTrace: (traceId: string) => Promise<void>
  loadMetrics: (period?: 'hour' | 'day' | 'week' | 'month' | 'all') => Promise<void>
  loadDailyMetrics: (days?: number) => Promise<void>
  loadConfig: () => Promise<void>
  updateConfig: (config: Partial<TracingConfig>) => Promise<void>
  deleteTrace: (traceId: string) => Promise<void>
  clearAllTraces: () => Promise<void>
  setFilter: (filter: TraceFilter) => void
  setSelectedPeriod: (period: 'hour' | 'day' | 'week' | 'month' | 'all') => void
  clearCurrentTrace: () => void
}

export const useTraceStore = create<TraceStore>((set, get) => ({
  // Initial state
  traces: [],
  currentTrace: null,
  currentSpans: [],
  metrics: null,
  dailyMetrics: [],
  config: null,
  isLoading: false,
  filter: {},
  selectedPeriod: 'day',

  // Load all traces with optional filter
  loadTraces: async (filter?: TraceFilter) => {
    set({ isLoading: true })
    try {
      await TraceService.initialize()
      const traces = await TraceService.getTraces(filter || get().filter)
      set({ traces, isLoading: false })
    } catch (error) {
      errorToast('Failed to load traces', error)
      set({ isLoading: false })
    }
  },

  // Load a single trace with its spans
  loadTrace: async (traceId: string) => {
    set({ isLoading: true })
    try {
      await TraceService.initialize()
      const trace = await TraceService.getTrace(traceId)
      if (trace) {
        const spans = await TraceService.getSpansForTrace(traceId)
        set({ currentTrace: trace, currentSpans: spans, isLoading: false })
      } else {
        set({ currentTrace: null, currentSpans: [], isLoading: false })
      }
    } catch (error) {
      errorToast('Failed to load trace', error)
      set({ isLoading: false })
    }
  },

  // Load aggregated metrics
  loadMetrics: async (period) => {
    set({ isLoading: true })
    try {
      await TraceService.initialize()
      const selectedPeriod = period || get().selectedPeriod
      const metrics = await TraceService.getMetrics(selectedPeriod)
      set({ metrics, selectedPeriod, isLoading: false })
    } catch (error) {
      errorToast('Failed to load metrics', error)
      set({ isLoading: false })
    }
  },

  // Load daily metrics for charts
  loadDailyMetrics: async (days = 30) => {
    set({ isLoading: true })
    try {
      await TraceService.initialize()
      const dailyMetrics = await TraceService.getDailyMetrics(days)
      set({ dailyMetrics, isLoading: false })
    } catch (error) {
      errorToast('Failed to load daily metrics', error)
      set({ isLoading: false })
    }
  },

  // Load tracing configuration
  loadConfig: async () => {
    try {
      await TraceService.initialize()
      const config = TraceService.getConfig()
      set({ config })
    } catch (error) {
      errorToast('Failed to load tracing config', error)
    }
  },

  // Update tracing configuration
  updateConfig: async (configUpdate: Partial<TracingConfig>) => {
    try {
      const config = await TraceService.updateConfig(configUpdate)
      set({ config })
    } catch (error) {
      errorToast('Failed to update tracing config', error)
    }
  },

  // Delete a trace
  deleteTrace: async (traceId: string) => {
    try {
      await TraceService.deleteTrace(traceId)
      const traces = get().traces.filter((t) => t.id !== traceId)
      set({ traces })
      // Clear current trace if it was deleted
      if (get().currentTrace?.id === traceId) {
        set({ currentTrace: null, currentSpans: [] })
      }
    } catch (error) {
      errorToast('Failed to delete trace', error)
    }
  },

  // Clear all traces
  clearAllTraces: async () => {
    try {
      await TraceService.clearAllTraces()
      set({ traces: [], currentTrace: null, currentSpans: [], metrics: null })
    } catch (error) {
      errorToast('Failed to clear traces', error)
    }
  },

  // Set filter
  setFilter: (filter: TraceFilter) => {
    set({ filter })
  },

  // Set selected period for metrics
  setSelectedPeriod: (period: 'hour' | 'day' | 'week' | 'month' | 'all') => {
    set({ selectedPeriod: period })
  },

  // Clear current trace selection
  clearCurrentTrace: () => {
    set({ currentTrace: null, currentSpans: [] })
  },
}))
