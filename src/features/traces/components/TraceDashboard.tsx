import { useMemo, useState, useEffect } from 'react'
import {
  Card,
  CardBody,
  CardHeader,
  Spinner,
  Select,
  SelectItem,
} from '@heroui/react'
import ReactECharts from 'echarts-for-react'
import type { EChartsOption } from 'echarts'

import { useI18n } from '@/i18n'
import { Icon } from '@/components'
import { getAgentById } from '@/stores/agentStore'
import { TraceMetrics, DailyMetrics } from '../types'
import localI18n from '../i18n'

export type TracePeriod = 'hour' | 'day' | 'week' | 'month' | 'all'

interface TraceDashboardProps {
  metrics: TraceMetrics | null
  dailyMetrics: DailyMetrics[]
  isLoading: boolean
  period?: TracePeriod
  onPeriodChange?: (period: TracePeriod) => void
}

const PERIOD_OPTIONS = [
  { key: 'hour', labelKey: 'Last Hour' },
  { key: 'day', labelKey: 'Last 24 Hours' },
  { key: 'week', labelKey: 'Last 7 Days' },
  { key: 'month', labelKey: 'Last 30 Days' },
  { key: 'all', labelKey: 'All Time' },
] as const

export function TraceDashboard({
  metrics,
  dailyMetrics,
  isLoading,
  period = 'all',
  onPeriodChange,
}: TraceDashboardProps) {
  const { t } = useI18n(localI18n)

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Spinner size="lg" />
      </div>
    )
  }

  // Use empty metrics if none provided - allows showing the chart with no data
  const displayMetrics: TraceMetrics = metrics || {
    period: 'all',
    startDate: new Date(),
    endDate: new Date(),
    totalTraces: 0,
    successfulTraces: 0,
    errorTraces: 0,
    errorRate: 0,
    totalTokens: 0,
    totalPromptTokens: 0,
    totalCompletionTokens: 0,
    averageTokensPerTrace: 0,
    totalCost: 0,
    averageCostPerTrace: 0,
    averageDuration: 0,
    p50Duration: 0,
    p95Duration: 0,
    p99Duration: 0,
    modelUsage: {},
    providerUsage: {},
    agentUsage: {},
  }

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      {onPeriodChange && (
        <div className="flex justify-end">
          <Select
            label={t('Time Range')}
            labelPlacement="outside-left"
            selectedKeys={[period]}
            onSelectionChange={(keys) => {
              const selected = Array.from(keys)[0] as TracePeriod
              if (selected) onPeriodChange(selected)
            }}
            className="w-60"
            size="sm"
            aria-label={t('Time Range')}
          >
            {PERIOD_OPTIONS.map((option) => (
              <SelectItem key={option.key}>{t(option.labelKey)}</SelectItem>
            ))}
          </Select>
        </div>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          title={t('Total Requests')}
          value={displayMetrics.totalTraces.toLocaleString()}
          subtitle={`${displayMetrics.successfulTraces} ${t('Completed')}`}
          icon="ChatLines"
          color="primary"
        />
        <MetricCard
          title={t('Success Rate')}
          value={`${(100 - displayMetrics.errorRate).toFixed(1)}%`}
          subtitle={`${displayMetrics.errorTraces} errors`}
          icon="CheckCircle"
          color={displayMetrics.errorRate > 10 ? 'danger' : 'success'}
        />
        <MetricCard
          title={t('Total Tokens')}
          value={formatNumber(displayMetrics.totalTokens)}
          subtitle={`~${formatNumber(displayMetrics.averageTokensPerTrace)}/req`}
          icon="Code"
          color="secondary"
        />
        <MetricCard
          title={t('Total Cost')}
          value={`$${displayMetrics.totalCost.toFixed(2)}`}
          subtitle={`~$${displayMetrics.averageCostPerTrace.toFixed(4)}/req`}
          icon="PiggyBank"
          color="warning"
        />
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          title={t('Avg Duration')}
          value={formatDuration(displayMetrics.averageDuration)}
          subtitle={t('Average')}
          icon="Clock"
          color="default"
        />
        <MetricCard
          title="P50"
          value={formatDuration(displayMetrics.p50Duration)}
          subtitle={t('Median')}
          icon="Timer"
          color="default"
        />
        <MetricCard
          title="P95"
          value={formatDuration(displayMetrics.p95Duration)}
          subtitle={t('{n}th percentile', { n: 95 })}
          icon="Timer"
          color="default"
        />
        <MetricCard
          title="P99"
          value={formatDuration(displayMetrics.p99Duration)}
          subtitle={t('{n}th percentile', { n: 99 })}
          icon="Timer"
          color="default"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Model Distribution */}
        <Card>
          <CardHeader>
            <h3 className="font-semibold">{t('Model Distribution')}</h3>
          </CardHeader>
          <CardBody className="pt-0">
            <DistributionChart
              data={displayMetrics.modelUsage}
              total={displayMetrics.totalTraces}
            />
          </CardBody>
        </Card>

        {/* Provider Distribution */}
        <Card>
          <CardHeader>
            <h3 className="font-semibold">{t('Provider Distribution')}</h3>
          </CardHeader>
          <CardBody className="pt-0">
            <DistributionChart
              data={displayMetrics.providerUsage}
              total={displayMetrics.totalTraces}
            />
          </CardBody>
        </Card>
      </div>

      {/* Daily Trend */}
      <Card>
        <CardHeader>
          <h3 className="font-semibold">{t('Requests Over Time')}</h3>
        </CardHeader>

        <CardBody className="pt-0">
          <DailyChart data={dailyMetrics} />
        </CardBody>
      </Card>

      {/* Agent Usage */}
      {Object.keys(displayMetrics.agentUsage).length > 0 && (
        <Card>
          <CardHeader>
            <h3 className="font-semibold">{t('Agent Usage')}</h3>
          </CardHeader>
          <CardBody className="pt-0">
            <AgentDistributionChart
              data={displayMetrics.agentUsage}
              total={displayMetrics.totalTraces}
            />
          </CardBody>
        </Card>
      )}
    </div>
  )
}

// Helper components

interface MetricCardProps {
  title: string
  value: string
  subtitle: string
  icon: 'ChatLines' | 'CheckCircle' | 'Code' | 'PiggyBank' | 'Clock' | 'Timer'
  color: 'primary' | 'success' | 'danger' | 'warning' | 'secondary' | 'default'
}

function MetricCard({ title, value, subtitle, icon, color }: MetricCardProps) {
  const colorClasses = {
    primary: 'bg-primary-50 text-primary',
    success: 'bg-success-50 text-success',
    danger: 'bg-danger-50 text-danger',
    warning: 'bg-warning-50 text-warning',
    secondary: 'bg-secondary-50 text-secondary',
    default: 'bg-default-100 text-default-600',
  }

  return (
    <Card className="border border-default-200">
      <CardBody className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-default-400 uppercase tracking-wider">
              {title}
            </p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            <p className="text-xs text-default-400 mt-1">{subtitle}</p>
          </div>
          <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
            <Icon name={icon} className="w-5 h-5" />
          </div>
        </div>
      </CardBody>
    </Card>
  )
}

interface DistributionChartProps {
  data: Record<string, number>
  total: number
}

function DistributionChart({ data, total }: DistributionChartProps) {
  const sortedEntries = useMemo(
    () =>
      Object.entries(data)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10),
    [data],
  )

  if (sortedEntries.length === 0) {
    return (
      <p className="text-center text-default-400 py-4">No data available</p>
    )
  }

  const colors = [
    'bg-primary',
    'bg-secondary',
    'bg-success',
    'bg-warning',
    'bg-danger',
    'bg-default-400',
    'bg-primary-300',
    'bg-secondary-300',
    'bg-success-300',
    'bg-warning-300',
  ]

  return (
    <div className="space-y-3">
      {sortedEntries.map(([name, count], index) => {
        const percentage = total > 0 ? (count / total) * 100 : 0
        return (
          <div key={name}>
            <div className="flex justify-between text-sm mb-1">
              <span className="truncate max-w-[200px]" title={name}>
                {name}
              </span>
              <span className="text-default-400">
                {count} ({percentage.toFixed(1)}%)
              </span>
            </div>
            <div className="h-2 bg-default-100 rounded-full overflow-hidden">
              <div
                className={`h-full ${colors[index % colors.length]} rounded-full transition-all`}
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

/**
 * Distribution chart specifically for agent usage that resolves agent IDs to display names
 */
function AgentDistributionChart({ data, total }: DistributionChartProps) {
  const [agentNames, setAgentNames] = useState<Record<string, string>>({})

  // Resolve agent IDs to names
  useEffect(() => {
    const resolveAgentNames = async () => {
      const names: Record<string, string> = {}
      for (const agentId of Object.keys(data)) {
        const agent = await getAgentById(agentId)
        // Use agent name if found, otherwise fall back to the ID
        names[agentId] = agent?.name || agentId
      }
      setAgentNames(names)
    }
    resolveAgentNames()
  }, [data])

  const sortedEntries = useMemo(
    () =>
      Object.entries(data)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10),
    [data],
  )

  if (sortedEntries.length === 0) {
    return (
      <p className="text-center text-default-400 py-4">No data available</p>
    )
  }

  const colors = [
    'bg-primary',
    'bg-secondary',
    'bg-success',
    'bg-warning',
    'bg-danger',
    'bg-default-400',
    'bg-primary-300',
    'bg-secondary-300',
    'bg-success-300',
    'bg-warning-300',
  ]

  return (
    <div className="space-y-3">
      {sortedEntries.map(([agentId, count], index) => {
        const percentage = total > 0 ? (count / total) * 100 : 0
        const displayName = agentNames[agentId] || agentId
        return (
          <div key={agentId}>
            <div className="flex justify-between text-sm mb-1">
              <span className="truncate max-w-[200px]" title={displayName}>
                {displayName}
              </span>
              <span className="text-default-400">
                {count} ({percentage.toFixed(1)}%)
              </span>
            </div>
            <div className="h-2 bg-default-100 rounded-full overflow-hidden">
              <div
                className={`h-full ${colors[index % colors.length]} rounded-full transition-all`}
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

interface DailyChartProps {
  data: DailyMetrics[]
}

function DailyChart({ data }: DailyChartProps) {
  // Ensure we show data up to and including today, even with no data
  const recentData = useMemo(() => {
    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]

    // If no data, generate last 14 days with zero values
    if (data.length === 0) {
      const emptyDays: DailyMetrics[] = []
      for (let i = 13; i >= 0; i--) {
        const date = new Date(today)
        date.setDate(date.getDate() - i)
        emptyDays.push({
          date: date.toISOString().split('T')[0],
          traces: 0,
          tokens: 0,
          cost: 0,
          errors: 0,
          avgDuration: 0,
        })
      }
      return emptyDays
    }

    const last14Days = data.slice(-14)

    // Check if today is included in the data
    const hasToday = last14Days.some((d) => d.date === todayStr)

    if (!hasToday && last14Days.length > 0) {
      // Add today with zero values if not present
      return [
        ...last14Days,
        {
          date: todayStr,
          traces: 0,
          tokens: 0,
          cost: 0,
          errors: 0,
          avgDuration: 0,
        },
      ].slice(-14) // Keep only last 14 days
    }

    return last14Days
  }, [data])

  const option: EChartsOption = useMemo(() => {
    const dates = recentData.map((d) =>
      new Date(d.date).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      }),
    )
    const traces = recentData.map((d) => d.traces)
    const errors = recentData.map((d) => d.errors)

    // Check if all values are zero
    const hasData = traces.some((v) => v > 0) || errors.some((v) => v > 0)

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow',
        },
        formatter: (params: unknown) => {
          const p = params as Array<{
            name: string
            seriesName: string
            value: number
            color: string
          }>
          if (!Array.isArray(p) || p.length === 0) return ''
          const date = p[0].name
          const lines = p.map(
            (item) =>
              `<span style="display:inline-block;margin-right:4px;border-radius:10px;width:10px;height:10px;background-color:${item.color};"></span>${item.seriesName}: ${item.value}`,
          )
          return `<strong>${date}</strong><br/>${lines.join('<br/>')}`
        },
      },
      grid: {
        left: 40,
        right: 16,
        top: 16,
        bottom: 40,
      },
      xAxis: {
        type: 'category',
        data: dates,
        axisLabel: {
          rotate: 45,
          fontSize: 10,
        },
        axisLine: {
          lineStyle: {
            color: '#a1a1aa',
          },
        },
      },
      yAxis: {
        type: 'value',
        min: 0,
        max: hasData ? undefined : 10, // Set max to 10 when no data to show axis scale
        splitLine: {
          lineStyle: {
            color: '#27272a',
          },
        },
        axisLabel: {
          fontSize: 10,
        },
        axisLine: {
          lineStyle: {
            color: '#a1a1aa',
          },
        },
      },
      series: [
        {
          name: 'Requests',
          type: 'bar',
          data: traces,
          itemStyle: {
            color: '#006FEE',
            borderRadius: [4, 4, 0, 0],
          },
          emphasis: {
            itemStyle: {
              color: '#338EF7',
            },
          },
        },
        {
          name: 'Errors',
          type: 'bar',
          data: errors,
          itemStyle: {
            color: '#f31260',
            borderRadius: [4, 4, 0, 0],
          },
          emphasis: {
            itemStyle: {
              color: '#f54180',
            },
          },
        },
      ],
    }
  }, [recentData])

  return (
    <div className="h-48">
      <ReactECharts
        option={option}
        style={{ height: '100%', width: '100%' }}
        opts={{ renderer: 'svg' }}
      />
    </div>
  )
}

// Utility functions

function formatNumber(num: number): string {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`
  return num.toLocaleString()
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms.toFixed(0)}ms`
  return `${(ms / 1000).toFixed(2)}s`
}
