import { useMemo, useState } from 'react'
import {
  Accordion,
  AccordionItem,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Chip,
  Spinner,
  Button,
  Card,
  CardBody,
  Input,
} from '@heroui/react'

import { useI18n } from '@/i18n'
import { Icon } from '@/components'
import { Trace, TraceStatus } from '../types'
import localI18n from '../i18n'

export interface TraceListProps {
  traces: Trace[]
  isLoading: boolean
  onSelectTrace?: (traceId: string) => void
  onDeleteTrace?: (traceId: string) => void
}

/**
 * Represents a grouped session containing multiple traces
 */
export interface SessionGroup {
  sessionId: string
  displayName: string
  traces: Trace[]
  totalTraces: number
  totalTokens: number
  hasTokenData: boolean // Whether any trace in the session has token data
  isImageSession: boolean // Whether session contains image generation traces
  isVoiceSession: boolean // Whether session contains voice/live conversation traces
  totalCost: number
  startTime: Date
  endTime: Date
  duration: number
  status: TraceStatus
  models: Set<string>
  providers: Set<string>
}

export function TraceList({
  traces,
  isLoading,
  onSelectTrace,
  onDeleteTrace,
}: TraceListProps) {
  const { t, lang } = useI18n(localI18n)
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set())

  const getStatusColor = (status: TraceStatus) => {
    switch (status) {
      case 'completed':
        return 'success'
      case 'error':
        return 'danger'
      case 'running':
        return 'primary'
      case 'pending':
        return 'default'
      default:
        return 'default'
    }
  }

  const formatDuration = (ms?: number) => {
    if (!ms) return '-'
    if (ms < 1000) return `${ms.toFixed(0)}ms`
    if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`
    return `${(ms / 60000).toFixed(1)}min`
  }

  const formatDate = (date: Date) => {
    const d = new Date(date)
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    const mins = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (mins < 1) return t('Just now')

    const rtf = new Intl.RelativeTimeFormat(lang, {
      numeric: 'auto',
      style: 'short',
    })
    if (mins < 60) return rtf.format(-mins, 'minute')
    if (hours < 24) return rtf.format(-hours, 'hour')
    if (days < 7) return rtf.format(-days, 'day')
    return d.toLocaleDateString(lang)
  }

  const formatCost = (cost?: { totalCost: number } | number) => {
    if (cost === undefined || cost === null) return '-'
    const value = typeof cost === 'number' ? cost : cost.totalCost
    return `$${value.toFixed(4)}`
  }

  // Group traces by session
  const sessionGroups = useMemo(() => {
    const groups = new Map<string, SessionGroup>()

    traces.forEach((trace) => {
      // Prioritize conversationId and taskId over sessionId for grouping
      // This ensures traces from the same conversation/task are grouped together
      const sessionKey =
        trace.conversationId ||
        trace.taskId ||
        trace.sessionId ||
        `single-${trace.id}`

      const isSingleRequest = sessionKey.startsWith('single-')

      if (!groups.has(sessionKey)) {
        groups.set(sessionKey, {
          sessionId: sessionKey,
          displayName: isSingleRequest
            ? t('Single Request')
            : trace.conversationId
              ? `${t('Conversation')} ${trace.conversationId.slice(0, 8)}`
              : trace.taskId
                ? `${t('Task')} ${trace.taskId.slice(0, 8)}`
                : `${t('Session')} ${trace.sessionId?.slice(0, 8)}`,
          traces: [],
          totalTraces: 0,
          totalTokens: 0,
          hasTokenData: false,
          isImageSession: false,
          isVoiceSession: false,
          totalCost: 0,
          startTime: new Date(trace.startTime),
          endTime: new Date(trace.endTime || trace.startTime),
          duration: 0,
          status: trace.status,
          models: new Set(),
          providers: new Set(),
        })
      }

      const group = groups.get(sessionKey)!
      group.traces.push(trace)
      group.totalTraces++
      group.totalTokens += trace.totalTokens || 0
      // Track if any trace has actual token data (LLM traces)
      if (trace.totalTokens !== undefined && trace.totalTokens > 0) {
        group.hasTokenData = true
      }
      // Track if session contains image generation traces
      if (trace.name.includes('(image')) {
        group.isImageSession = true
      }
      // Track if session contains voice/live conversation traces
      if (trace.tags?.includes('voice') || trace.tags?.includes('live')) {
        group.isVoiceSession = true
      }
      group.totalCost += trace.totalCost?.totalCost || 0

      // Track models and providers used
      if (trace.primaryModel?.model) {
        group.models.add(trace.primaryModel.model)
      }
      if (trace.primaryModel?.provider) {
        group.providers.add(trace.primaryModel.provider)
      }

      // Update time range
      const traceStart = new Date(trace.startTime)
      const traceEnd = new Date(trace.endTime || trace.startTime)
      if (traceStart < group.startTime) group.startTime = traceStart
      if (traceEnd > group.endTime) group.endTime = traceEnd

      // Update status (error takes precedence, then running, then completed)
      if (trace.status === 'error') group.status = 'error'
      else if (trace.status === 'running' && group.status !== 'error')
        group.status = 'running'
    })

    // Calculate duration for each group
    groups.forEach((group) => {
      group.duration = group.endTime.getTime() - group.startTime.getTime()
      // Sort traces by start time within each group
      group.traces.sort(
        (a, b) =>
          new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
      )
    })

    // Convert to array and sort by most recent
    return Array.from(groups.values()).sort(
      (a, b) => b.startTime.getTime() - a.startTime.getTime(),
    )
  }, [traces, t])

  // Filter sessions based on search query
  const filteredSessions = useMemo(() => {
    if (!searchQuery.trim()) return sessionGroups
    const query = searchQuery.toLowerCase()
    return sessionGroups.filter(
      (session) =>
        session.sessionId.toLowerCase().includes(query) ||
        session.displayName.toLowerCase().includes(query) ||
        session.traces.some(
          (trace) =>
            trace.name.toLowerCase().includes(query) ||
            trace.primaryModel?.model?.toLowerCase().includes(query),
        ),
    )
  }, [sessionGroups, searchQuery])

  // Calculate summary stats
  const summaryStats = useMemo(() => {
    const hasAnyTokenData = filteredSessions.some((s) => s.hasTokenData)
    return {
      totalSessions: filteredSessions.length,
      totalTraces: filteredSessions.reduce((sum, s) => sum + s.totalTraces, 0),
      totalTokens: filteredSessions.reduce((sum, s) => sum + s.totalTokens, 0),
      hasTokenData: hasAnyTokenData,
      totalCost: filteredSessions.reduce((sum, s) => sum + s.totalCost, 0),
    }
  }, [filteredSessions])

  const columns = [
    { key: 'name', label: t('Name') },
    { key: 'model', label: t('Model') },
    { key: 'duration', label: t('Duration') },
    { key: 'tokens', label: t('Tokens') },
    { key: 'cost', label: t('Cost') },
    { key: 'time', label: t('Started') },
    { key: 'status', label: t('Status') },
    { key: 'actions', label: '' },
  ]

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Spinner size="lg" />
      </div>
    )
  }

  if (traces.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Icon name="Activity" className="w-16 h-16 text-default-300 mb-4" />
        <h3 className="text-lg font-medium text-default-600 mb-2">
          {t('No traces yet')}
        </h3>
        <p className="text-default-400 max-w-md">
          {t('Start chatting with agents to see LLM traces here')}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Search and Summary */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <Input
          placeholder={t('Search logs...')}
          value={searchQuery}
          onValueChange={setSearchQuery}
          startContent={
            <Icon name="Search" className="w-4 h-4 text-default-400" />
          }
          className="max-w-xs"
          size="sm"
          isClearable
          onClear={() => setSearchQuery('')}
        />
        <div className="flex items-center gap-4 text-sm text-default-500">
          <span>
            <strong>{summaryStats.totalSessions}</strong> {t('sessions')}
          </span>
          <span>•</span>
          <span>
            <strong>{summaryStats.totalTraces}</strong> {t('requests')}
          </span>
          <span>•</span>
          <span>
            <strong>
              {summaryStats.hasTokenData
                ? summaryStats.totalTokens.toLocaleString()
                : '-'}
            </strong>{' '}
            {t('tokens')}
          </span>
        </div>
      </div>

      {/* Sessions Accordion */}
      {filteredSessions.length === 0 ? (
        <Card>
          <CardBody className="flex flex-col items-center justify-center py-12">
            <Icon name="Search" className="w-12 h-12 text-default-300 mb-4" />
            <p className="text-default-400">
              {t('No sessions found matching your search')}
            </p>
          </CardBody>
        </Card>
      ) : (
        <Accordion
          selectionMode="multiple"
          variant="bordered"
          selectedKeys={expandedKeys}
          onSelectionChange={(keys) =>
            setExpandedKeys(new Set(keys as Set<string>))
          }
        >
          {filteredSessions.map((session) => (
            <AccordionItem
              key={session.sessionId}
              aria-label={session.displayName}
              classNames={{
                title: 'w-full',
                trigger: 'py-2',
              }}
              startContent={
                <Icon
                  name={
                    session.isImageSession
                      ? 'MediaImage'
                      : session.isVoiceSession
                        ? 'Voice'
                        : session.sessionId.startsWith('single-')
                          ? 'ChatBubble'
                          : 'ChatLines'
                  }
                  size="lg"
                  className={
                    session.isImageSession
                      ? 'text-danger-400'
                      : session.isVoiceSession
                        ? 'text-cyan-500 dark:text-cyan-400'
                        : session.sessionId.startsWith('single-')
                          ? 'text-default-500'
                          : 'text-primary'
                  }
                />
              }
              title={
                <div className="flex items-center justify-between w-full pr-4">
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col">
                      <span className="text-xs text-default-400">
                        {formatDate(session.startTime)}
                        {session.models.size > 0 && (
                          <span className="ml-2">
                            • {Array.from(session.models).join(', ')}
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="hidden md:flex items-center gap-3 text-xs text-default-500">
                      <span className="flex items-center gap-1">
                        <Icon name="ChatBubble" className="w-3 h-3" />
                        {session.totalTraces} {t('requests')}
                      </span>
                      <span className="flex items-center gap-1">
                        <Icon name="Timer" className="w-3 h-3" />
                        {formatDuration(session.duration)}
                      </span>
                      <span>
                        {session.hasTokenData
                          ? `${session.totalTokens.toLocaleString()} ${t('tokens')}`
                          : '-'}
                      </span>
                      <span className="font-mono">
                        {formatCost(session.totalCost)}
                      </span>
                    </div>
                    <Chip
                      size="sm"
                      color={getStatusColor(session.status)}
                      variant="flat"
                    >
                      {session.status}
                    </Chip>
                  </div>
                </div>
              }
              subtitle={
                <div className="md:hidden flex items-center gap-3 text-xs text-default-500">
                  <span>
                    {session.totalTraces} {t('requests')}
                  </span>
                  <span>•</span>
                  <span>{formatDuration(session.duration)}</span>
                  <span>•</span>
                  <span>
                    {session.hasTokenData
                      ? `${session.totalTokens.toLocaleString()} ${t('tokens')}`
                      : '-'}
                  </span>
                  <span>•</span>
                  <span className="font-mono">
                    {formatCost(session.totalCost)}
                  </span>
                </div>
              }
            >
              {/* Traces Table */}
              <Table
                aria-label={`${session.displayName} traces`}
                selectionMode="none"
                classNames={{
                  wrapper: 'shadow-none border border-default-200',
                }}
              >
                <TableHeader columns={columns}>
                  {(column) => (
                    <TableColumn
                      key={column.key}
                      align={column.key === 'actions' ? 'end' : 'start'}
                    >
                      {column.label}
                    </TableColumn>
                  )}
                </TableHeader>
                <TableBody>
                  {session.traces.map((trace) => (
                    <TableRow
                      key={trace.id}
                      className="cursor-pointer hover:bg-default-100"
                      onClick={() => onSelectTrace?.(trace.id)}
                    >
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-sm">
                            {trace.name}
                          </span>
                          <span className="text-xs text-default-400">
                            {trace.id.slice(0, 12)}...
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm">
                            {trace.primaryModel?.model || '-'}
                          </span>
                          <span className="text-xs text-default-400">
                            {trace.primaryModel?.provider || '-'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {formatDuration(trace.duration)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {trace.totalTokens?.toLocaleString() || '-'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-mono">
                          {formatCost(trace.totalCost)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-default-500">
                          {formatDate(trace.startTime)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="sm"
                          color={getStatusColor(trace.status)}
                          variant="flat"
                        >
                          {trace.status}
                        </Chip>
                      </TableCell>
                      <TableCell>
                        <Button
                          isIconOnly
                          size="sm"
                          variant="light"
                          onClick={(e) => {
                            e.stopPropagation()
                            onDeleteTrace?.(trace.id)
                          }}
                        >
                          <Icon name="Trash" className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </div>
  )
}
