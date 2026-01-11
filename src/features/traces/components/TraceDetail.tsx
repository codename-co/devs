import { Card, CardBody, CardHeader, Chip, Divider } from '@heroui/react'

import { useI18n } from '@/i18n'
import { Trace, Span, SpanType } from '../types'
import localI18n from '../i18n'
import { Icon } from '@/components'

interface TraceDetailProps {
  trace: Trace
  spans: Span[]
}

export function TraceDetail({ trace, spans }: TraceDetailProps) {
  const { t } = useI18n(localI18n)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'success'
      case 'error':
        return 'danger'
      case 'running':
        return 'primary'
      default:
        return 'default'
    }
  }

  const formatDuration = (ms?: number) => {
    if (!ms) return '-'
    if (ms < 1000) return `${ms.toFixed(0)}ms`
    return `${(ms / 1000).toFixed(2)}s`
  }

  const formatTokens = (
    promptTokens?: number,
    completionTokens?: number,
    totalTokens?: number,
  ) => {
    if (!totalTokens && !promptTokens && !completionTokens) return '-'
    const inTok = promptTokens?.toLocaleString() ?? '?'
    const outTok = completionTokens?.toLocaleString() ?? '?'
    const total = totalTokens?.toLocaleString() ?? '?'
    return `${inTok} → ${outTok} Σ ${total}`
  }

  const formatDate = (date?: Date) => {
    if (!date) return '-'
    return new Date(date).toLocaleString()
  }

  return (
    <div className="space-y-6">
      {/* Trace Overview */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between w-full">
            <h3 className="text-lg font-semibold">{trace.name}</h3>
            <Chip size="sm" color={getStatusColor(trace.status)} variant="flat">
              {trace.status}
            </Chip>
          </div>
        </CardHeader>
        <CardBody className="pt-0">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-default-400">{t('Trace ID')}</p>
              <p className="text-sm font-mono truncate">{trace.id}</p>
            </div>
            <div>
              <p className="text-xs text-default-400">{t('Duration')}</p>
              <p className="text-sm font-medium">
                {formatDuration(trace.duration)}
              </p>
            </div>
            <div>
              <p className="text-xs text-default-400">{t('Model')}</p>
              <p className="text-sm">{trace.primaryModel?.model || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-default-400">{t('Provider')}</p>
              <p className="text-sm capitalize">
                {trace.primaryModel?.provider || '-'}
              </p>
            </div>
            <div>
              <p className="text-xs text-default-400">{t('Tokens')}</p>
              <p className="text-sm font-mono">
                {formatTokens(
                  trace.totalPromptTokens,
                  trace.totalCompletionTokens,
                  trace.totalTokens,
                )}
              </p>
            </div>
            <div>
              <p className="text-xs text-default-400">{t('Cost')}</p>
              <p className="text-sm font-mono">
                {trace.totalCost
                  ? `$${trace.totalCost.totalCost.toFixed(4)}`
                  : '-'}
              </p>
            </div>
            <div>
              <p className="text-xs text-default-400">{t('Started')}</p>
              <p className="text-sm">{formatDate(trace.startTime)}</p>
            </div>
            <div>
              <p className="text-xs text-default-400">{t('Ended')}</p>
              <p className="text-sm">{formatDate(trace.endTime)}</p>
            </div>
          </div>

          {trace.statusMessage && (
            <div className="mt-4 p-3 bg-danger-50 dark:bg-danger-900/20 rounded-lg">
              <p className="text-sm text-danger">{trace.statusMessage}</p>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Input/Output */}
      {(trace.input || trace.output) && (
        <Card>
          <CardBody className="space-y-4">
            {trace.input && (
              <div>
                <p className="text-sm font-medium text-default-600 mb-2 gap-1 flex items-center">
                  <Icon name="ArrowRight" size="sm" />
                  {t('Input')}
                </p>
                <pre className="text-sm bg-default-100 p-3 rounded-lg overflow-x-auto whitespace-pre-wrap">
                  {trace.input}
                </pre>
              </div>
            )}
            {trace.input && trace.output && <Divider />}
            {trace.output && (
              <div>
                <p className="text-sm font-medium text-default-600 mb-2 gap-1 flex items-center">
                  <Icon name="ArrowLeft" size="sm" />
                  {t('Output')}
                </p>
                <pre className="text-sm bg-default-100 p-3 rounded-lg overflow-x-auto whitespace-pre-wrap">
                  {trace.output}
                </pre>
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {/* Spans */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">
            {t('Spans')} ({spans.length})
          </h3>
        </CardHeader>
        <CardBody className="pt-0">
          {spans.length === 0 ? (
            <p className="text-default-400 text-center py-4">
              {t('No spans found')}
            </p>
          ) : (
            <div className="space-y-3">
              {spans.map((span, index) => (
                <SpanCard key={span.id} span={span} index={index} />
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  )
}

interface SpanCardProps {
  span: Span
  index: number
}

function SpanCard({ span, index }: SpanCardProps) {
  const { t } = useI18n(localI18n)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'success'
      case 'error':
        return 'danger'
      case 'running':
        return 'primary'
      default:
        return 'default'
    }
  }

  const getSpanTypeLabel = (type: SpanType): string => {
    const labels: Record<SpanType, string> = {
      llm: t('LLM Call'),
      image: t('Image Generation'),
      agent: t('Agent'),
      tool: t('Tool'),
      chain: t('Chain'),
      retrieval: t('Retrieval'),
      embedding: t('Embedding'),
      custom: t('Custom'),
    }
    return labels[type] || type
  }

  const formatDuration = (ms?: number) => {
    if (!ms) return '-'
    if (ms < 1000) return `${ms.toFixed(0)}ms`
    return `${(ms / 1000).toFixed(2)}s`
  }

  const formatTokens = (
    promptTokens?: number,
    completionTokens?: number,
    totalTokens?: number,
  ) => {
    if (!totalTokens && !promptTokens && !completionTokens) return '-'
    const inTok = promptTokens?.toLocaleString() ?? '?'
    const outTok = completionTokens?.toLocaleString() ?? '?'
    const total = totalTokens?.toLocaleString() ?? '?'
    return `${inTok} → ${outTok} Σ ${total}`
  }

  return (
    <div className="border border-default-200 rounded-lg p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-default-400">#{index + 1}</span>
          <span className="font-medium">{span.name}</span>
          <Chip size="sm" variant="flat">
            {getSpanTypeLabel(span.type)}
          </Chip>
        </div>
        <Chip size="sm" color={getStatusColor(span.status)} variant="flat">
          {span.status}
        </Chip>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
        <div>
          <p className="text-xs text-default-400">{t('Duration')}</p>
          <p>{formatDuration(span.duration)}</p>
        </div>
        {span.model && (
          <div>
            <p className="text-xs text-default-400">{t('Model')}</p>
            <p>{span.model.model}</p>
          </div>
        )}
        {span.usage && (
          <div>
            <p className="text-xs text-default-400">{t('Tokens')}</p>
            <p className="font-mono text-xs">
              {formatTokens(
                span.usage.promptTokens,
                span.usage.completionTokens,
                span.usage.totalTokens,
              )}
            </p>
          </div>
        )}
        {span.cost && (
          <div>
            <p className="text-xs text-default-400">{t('Cost')}</p>
            <p className="font-mono">${span.cost.totalCost.toFixed(4)}</p>
          </div>
        )}
      </div>

      {span.statusMessage && (
        <div className="mt-3 p-2 bg-danger-50 dark:bg-danger-900/20 rounded text-sm text-danger">
          {span.statusMessage}
        </div>
      )}

      {span.io?.input?.messages && (
        <details className="mt-3">
          <summary className="text-sm text-default-500 cursor-pointer">
            {t('Input')} ({span.io.input.messages.length} messages)
          </summary>
          <pre className="mt-2 text-xs bg-default-100 p-2 rounded overflow-x-auto max-h-40">
            {JSON.stringify(span.io.input.messages, null, 2)}
          </pre>
        </details>
      )}

      {span.io?.output?.content && (
        <details className="mt-3">
          <summary className="text-sm text-default-500 cursor-pointer">
            {t('Output')}
          </summary>
          <pre className="mt-2 text-xs bg-default-100 p-2 rounded overflow-x-auto max-h-40 whitespace-pre-wrap">
            {span.io.output.content}
          </pre>
        </details>
      )}
    </div>
  )
}
