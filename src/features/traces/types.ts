import { LLMProvider } from '@/types'

// ============================================================================
// Traces/Observability System - LLM Request Tracking & Analytics
// ============================================================================

/**
 * Status of a trace or span
 */
export type TraceStatus = 'pending' | 'running' | 'completed' | 'error'

/**
 * Type of span operation
 */
export type SpanType =
  | 'llm' // LLM API call
  | 'image' // Image generation call
  | 'agent' // Agent execution
  | 'tool' // Tool/function call
  | 'chain' // Chain of operations
  | 'retrieval' // Knowledge retrieval
  | 'embedding' // Embedding generation
  | 'custom' // Custom operation

/**
 * Token usage information for LLM calls
 */
export interface TokenUsage {
  promptTokens: number
  completionTokens: number
  totalTokens: number
}

/**
 * Cost estimate for a trace/span
 */
export interface CostEstimate {
  inputCost: number // Cost for input tokens
  outputCost: number // Cost for output tokens
  totalCost: number // Total cost in USD
  currency: string // Currency code (default: 'USD')
}

/**
 * Model information for LLM calls
 */
export interface ModelInfo {
  provider: LLMProvider
  model: string
  temperature?: number
  maxTokens?: number
}

/**
 * Input/Output for a span (messages, prompts, responses)
 */
export interface SpanIO {
  input?: {
    messages?: Array<{
      role: string
      content: string
    }>
    prompt?: string
    variables?: Record<string, unknown>
  }
  output?: {
    content?: string
    response?: unknown
    toolCalls?: Array<{
      name: string
      arguments: Record<string, unknown>
    }>
  }
}

/**
 * A span represents a single operation within a trace
 * Similar to OpenTelemetry spans
 */
export interface Span {
  id: string
  traceId: string
  parentSpanId?: string // For nested spans
  name: string
  type: SpanType
  status: TraceStatus
  statusMessage?: string // Error message if status is 'error'

  // Timing
  startTime: Date
  endTime?: Date
  duration?: number // in milliseconds

  // Model & Usage (for LLM spans)
  model?: ModelInfo
  usage?: TokenUsage
  cost?: CostEstimate

  // Input/Output
  io?: SpanIO

  // Metadata
  metadata?: Record<string, unknown>
  tags?: string[]

  // Context
  agentId?: string
  conversationId?: string
  taskId?: string

  createdAt: Date
  updatedAt: Date
}

/**
 * A trace represents a complete request/operation from start to finish
 * Contains one or more spans
 */
export interface Trace {
  id: string
  name: string
  status: TraceStatus
  statusMessage?: string

  // Timing
  startTime: Date
  endTime?: Date
  duration?: number // Total duration in milliseconds

  // Aggregated stats
  totalTokens?: number
  totalPromptTokens?: number // Input tokens
  totalCompletionTokens?: number // Output tokens
  totalCost?: CostEstimate
  spanCount: number

  // Context
  sessionId?: string // Groups traces in a session
  userId?: string // User who initiated the trace
  agentId?: string
  conversationId?: string
  taskId?: string

  // Model info (from primary LLM span)
  primaryModel?: ModelInfo

  // Metadata
  metadata?: Record<string, unknown>
  tags?: string[]

  // Input/Output summary
  input?: string // Summary of input
  output?: string // Summary of output

  createdAt: Date
  updatedAt: Date
}

/**
 * Aggregated metrics for dashboard
 */
export interface TraceMetrics {
  // Time-based stats
  period: 'hour' | 'day' | 'week' | 'month' | 'all'
  startDate: Date
  endDate: Date

  // Request stats
  totalTraces: number
  successfulTraces: number
  errorTraces: number
  errorRate: number // percentage

  // Token stats
  totalTokens: number
  totalPromptTokens: number
  totalCompletionTokens: number
  averageTokensPerTrace: number

  // Cost stats
  totalCost: number
  averageCostPerTrace: number

  // Performance stats
  averageDuration: number // ms
  p50Duration: number
  p95Duration: number
  p99Duration: number

  // Model distribution
  modelUsage: Record<string, number> // model name -> count
  providerUsage: Record<string, number> // provider -> count

  // Agent stats
  agentUsage: Record<string, number> // agent ID -> count
}

/**
 * Daily aggregated metrics for time-series charts
 */
export interface DailyMetrics {
  date: string // ISO date string
  traces: number
  tokens: number
  cost: number
  errors: number
  avgDuration: number
}

/**
 * Configuration for the tracing system
 */
export interface TracingConfig {
  id: string
  enabled: boolean

  // What to capture
  captureInput: boolean // Store full input messages
  captureOutput: boolean // Store full output responses
  captureMetadata: boolean // Store metadata

  // Sampling
  samplingRate: number // 0-1 percentage of requests to trace

  // Retention
  retentionDays: number // Days to keep traces (0 = forever)
  maxTraces: number // Max traces to keep (0 = unlimited)

  // Cost calculation - now handled dynamically via tokentally
  // Legacy field kept for backward compatibility, not used
  costRates?: Record<string, { input: number; output: number }>

  // Exclude patterns
  excludePatterns: string[]

  createdAt: Date
  updatedAt: Date
}

/**
 * Filter options for querying traces
 */
export interface TraceFilter {
  status?: TraceStatus
  provider?: LLMProvider
  model?: string
  agentId?: string
  conversationId?: string
  taskId?: string
  sessionId?: string
  startDate?: Date
  endDate?: Date
  minDuration?: number
  maxDuration?: number
  hasError?: boolean
  tags?: string[]
  searchQuery?: string
}

/**
 * Sort options for trace queries
 */
export interface TraceSort {
  field: 'startTime' | 'duration' | 'totalTokens' | 'cost' | 'name'
  direction: 'asc' | 'desc'
}

/**
 * Pagination for trace queries
 */
export interface TracePagination {
  page: number
  pageSize: number
  total?: number
}

/**
 * Result of a paginated trace query
 */
export interface TraceQueryResult {
  traces: Trace[]
  pagination: TracePagination & { total: number; totalPages: number }
  metrics?: TraceMetrics
}
