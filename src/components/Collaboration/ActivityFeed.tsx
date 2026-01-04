import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { twMerge } from 'tailwind-merge'
import { Tooltip, ScrollShadow } from '@heroui/react'
import {
  UserPlus,
  LogOut,
  MessageText,
  EditPencil,
  Plus,
  Trash,
  ShareAndroid,
  Play,
} from 'iconoir-react'
import { useI18n } from '@/i18n'

const localI18n = {
  en: [
    '{user} joined the workspace',
    '{user} left the workspace',
    '{user} sent a message in {entity}',
    '{user} edited {entity}',
    '{user} created {entity}',
    '{user} deleted {entity}',
    '{user} shared {entity}',
    '{user} ran {agent}',
    'Today',
    'Yesterday',
    'This Week',
    'Earlier',
    'No recent activity',
    'just now',
    '{count} min ago',
    '{count} mins ago',
    '{count} hour ago',
    '{count} hours ago',
    'conversation',
    'agent',
    'knowledge',
  ] as const,
  fr: [
    "{user} a rejoint l'espace de travail",
    "{user} a quitté l'espace de travail",
    '{user} a envoyé un message dans {entity}',
    '{user} a modifié {entity}',
    '{user} a créé {entity}',
    '{user} a supprimé {entity}',
    '{user} a partagé {entity}',
    '{user} a exécuté {agent}',
    "Aujourd'hui",
    'Hier',
    'Cette semaine',
    'Plus ancien',
    'Aucune activité récente',
    "à l'instant",
    'il y a {count} min',
    'il y a {count} mins',
    'il y a {count} heure',
    'il y a {count} heures',
    'conversation',
    'agent',
    'connaissance',
  ] as const,
  es: [
    '{user} se unió al espacio de trabajo',
    '{user} dejó el espacio de trabajo',
    '{user} envió un mensaje en {entity}',
    '{user} editó {entity}',
    '{user} creó {entity}',
    '{user} eliminó {entity}',
    '{user} compartió {entity}',
    '{user} ejecutó {agent}',
    'Hoy',
    'Ayer',
    'Esta semana',
    'Antes',
    'Sin actividad reciente',
    'ahora mismo',
    'hace {count} min',
    'hace {count} mins',
    'hace {count} hora',
    'hace {count} horas',
    'conversación',
    'agente',
    'conocimiento',
  ] as const,
  de: [
    '{user} ist dem Arbeitsbereich beigetreten',
    '{user} hat den Arbeitsbereich verlassen',
    '{user} hat eine Nachricht in {entity} gesendet',
    '{user} hat {entity} bearbeitet',
    '{user} hat {entity} erstellt',
    '{user} hat {entity} gelöscht',
    '{user} hat {entity} geteilt',
    '{user} hat {agent} ausgeführt',
    'Heute',
    'Gestern',
    'Diese Woche',
    'Früher',
    'Keine aktuelle Aktivität',
    'gerade eben',
    'vor {count} Min.',
    'vor {count} Min.',
    'vor {count} Stunde',
    'vor {count} Stunden',
    'Konversation',
    'Agent',
    'Wissen',
  ] as const,
  zh: [
    '{user} 加入了工作区',
    '{user} 离开了工作区',
    '{user} 在 {entity} 中发送了消息',
    '{user} 编辑了 {entity}',
    '{user} 创建了 {entity}',
    '{user} 删除了 {entity}',
    '{user} 分享了 {entity}',
    '{user} 运行了 {agent}',
    '今天',
    '昨天',
    '本周',
    '更早',
    '暂无活动',
    '刚刚',
    '{count} 分钟前',
    '{count} 分钟前',
    '{count} 小时前',
    '{count} 小时前',
    '对话',
    '智能体',
    '知识库',
  ] as const,
  ja: [
    '{user} がワークスペースに参加しました',
    '{user} がワークスペースを退出しました',
    '{user} が {entity} にメッセージを送信しました',
    '{user} が {entity} を編集しました',
    '{user} が {entity} を作成しました',
    '{user} が {entity} を削除しました',
    '{user} が {entity} を共有しました',
    '{user} が {agent} を実行しました',
    '今日',
    '昨日',
    '今週',
    '以前',
    '最近のアクティビティはありません',
    'たった今',
    '{count} 分前',
    '{count} 分前',
    '{count} 時間前',
    '{count} 時間前',
    '会話',
    'エージェント',
    'ナレッジ',
  ] as const,
}

export interface ActivityItem {
  id: string
  type:
    | 'join'
    | 'leave'
    | 'message'
    | 'edit'
    | 'create'
    | 'delete'
    | 'share'
    | 'agent_run'
  userId: string
  userName: string
  userColor: string
  timestamp: Date
  data?: {
    entityType?: string // 'conversation' | 'agent' | 'knowledge'
    entityName?: string
    details?: string
  }
}

export interface ActivityFeedProps {
  activities: ActivityItem[]
  maxItems?: number
  showTimestamps?: boolean
  groupByTime?: boolean
  onActivityClick?: (activity: ActivityItem) => void
  emptyMessage?: string
  className?: string
}

type TimeGroup = 'today' | 'yesterday' | 'thisWeek' | 'earlier'

const activityIcons: Record<ActivityItem['type'], React.ElementType> = {
  join: UserPlus,
  leave: LogOut,
  message: MessageText,
  edit: EditPencil,
  create: Plus,
  delete: Trash,
  share: ShareAndroid,
  agent_run: Play,
}

const activityColors: Record<ActivityItem['type'], string> = {
  join: 'text-success',
  leave: 'text-default-400',
  message: 'text-primary',
  edit: 'text-warning',
  create: 'text-success',
  delete: 'text-danger',
  share: 'text-secondary',
  agent_run: 'text-primary',
}

function getTimeGroup(date: Date): TimeGroup {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const weekAgo = new Date(today)
  weekAgo.setDate(weekAgo.getDate() - 7)

  if (date >= today) {
    return 'today'
  } else if (date >= yesterday) {
    return 'yesterday'
  } else if (date >= weekAgo) {
    return 'thisWeek'
  }
  return 'earlier'
}

function getRelativeTime(
  date: Date,
  t: (
    key: (typeof localI18n.en)[number],
    params?: Record<string, string | number>,
  ) => string,
): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)

  if (diffMins < 1) {
    return t('just now')
  } else if (diffMins < 60) {
    return diffMins === 1
      ? t('{count} min ago', { count: diffMins })
      : t('{count} mins ago', { count: diffMins })
  } else if (diffHours < 24) {
    return diffHours === 1
      ? t('{count} hour ago', { count: diffHours })
      : t('{count} hours ago', { count: diffHours })
  }

  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

interface ActivityTextProps {
  activity: ActivityItem
  t: (
    key: (typeof localI18n.en)[number],
    params?: Record<string, string | number>,
  ) => string
}

function ActivityText({ activity, t }: ActivityTextProps) {
  const { type, userName, userColor, data } = activity

  const entityDisplay = data?.entityName || data?.entityType || ''

  const renderUserName = (name: string, color: string) => (
    <span className="font-medium" style={{ color }}>
      {name}
    </span>
  )

  const renderEntity = (name: string) => (
    <span className="font-medium text-default-700">{name}</span>
  )

  switch (type) {
    case 'join':
      return (
        <span className="text-sm text-default-600">
          {renderUserName(userName, userColor)}
          <span className="ml-1">
            {t('{user} joined the workspace').replace('{user}', '').trim()}
          </span>
        </span>
      )
    case 'leave':
      return (
        <span className="text-sm text-default-600">
          {renderUserName(userName, userColor)}
          <span className="ml-1">
            {t('{user} left the workspace').replace('{user}', '').trim()}
          </span>
        </span>
      )
    case 'message':
      return (
        <span className="text-sm text-default-600">
          {renderUserName(userName, userColor)}
          <span className="ml-1">
            {t('{user} sent a message in {entity}')
              .replace('{user}', '')
              .replace('{entity}', '')
              .trim()}{' '}
          </span>
          {renderEntity(entityDisplay)}
        </span>
      )
    case 'edit':
      return (
        <span className="text-sm text-default-600">
          {renderUserName(userName, userColor)}
          <span className="ml-1">
            {t('{user} edited {entity}')
              .replace('{user}', '')
              .replace('{entity}', '')
              .trim()}{' '}
          </span>
          {renderEntity(entityDisplay)}
        </span>
      )
    case 'create':
      return (
        <span className="text-sm text-default-600">
          {renderUserName(userName, userColor)}
          <span className="ml-1">
            {t('{user} created {entity}')
              .replace('{user}', '')
              .replace('{entity}', '')
              .trim()}{' '}
          </span>
          {renderEntity(entityDisplay)}
        </span>
      )
    case 'delete':
      return (
        <span className="text-sm text-default-600">
          {renderUserName(userName, userColor)}
          <span className="ml-1">
            {t('{user} deleted {entity}')
              .replace('{user}', '')
              .replace('{entity}', '')
              .trim()}{' '}
          </span>
          {renderEntity(entityDisplay)}
        </span>
      )
    case 'share':
      return (
        <span className="text-sm text-default-600">
          {renderUserName(userName, userColor)}
          <span className="ml-1">
            {t('{user} shared {entity}')
              .replace('{user}', '')
              .replace('{entity}', '')
              .trim()}{' '}
          </span>
          {renderEntity(entityDisplay)}
        </span>
      )
    case 'agent_run':
      return (
        <span className="text-sm text-default-600">
          {renderUserName(userName, userColor)}
          <span className="ml-1">
            {t('{user} ran {agent}')
              .replace('{user}', '')
              .replace('{agent}', '')
              .trim()}{' '}
          </span>
          {renderEntity(entityDisplay)}
        </span>
      )
    default:
      return null
  }
}

interface GroupedActivities {
  today: ActivityItem[]
  yesterday: ActivityItem[]
  thisWeek: ActivityItem[]
  earlier: ActivityItem[]
}

function groupActivitiesByTime(activities: ActivityItem[]): GroupedActivities {
  const groups: GroupedActivities = {
    today: [],
    yesterday: [],
    thisWeek: [],
    earlier: [],
  }

  activities.forEach((activity) => {
    const group = getTimeGroup(activity.timestamp)
    groups[group].push(activity)
  })

  return groups
}

const timeGroupLabels: Record<TimeGroup, (typeof localI18n.en)[number]> = {
  today: 'Today',
  yesterday: 'Yesterday',
  thisWeek: 'This Week',
  earlier: 'Earlier',
}

interface ActivityItemComponentProps {
  activity: ActivityItem
  showTimestamp: boolean
  onClick?: (activity: ActivityItem) => void
  t: (
    key: (typeof localI18n.en)[number],
    params?: Record<string, string | number>,
  ) => string
}

function ActivityItemComponent({
  activity,
  showTimestamp,
  onClick,
  t,
}: ActivityItemComponentProps) {
  const Icon = activityIcons[activity.type]
  const iconColor = activityColors[activity.type]

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className={twMerge(
        'flex items-start gap-3 p-2 rounded-lg',
        'hover:bg-default-100 transition-colors duration-150',
        onClick && 'cursor-pointer',
      )}
      onClick={() => onClick?.(activity)}
    >
      {/* User color indicator */}
      <div className="flex-shrink-0 mt-1">
        <Tooltip content={activity.userName} placement="top">
          <div
            className="w-2.5 h-2.5 rounded-full ring-2 ring-background"
            style={{ backgroundColor: activity.userColor }}
          />
        </Tooltip>
      </div>

      {/* Activity icon */}
      <div className={twMerge('flex-shrink-0 mt-0.5', iconColor)}>
        <Icon className="w-4 h-4" />
      </div>

      {/* Activity content */}
      <div className="flex-1 min-w-0">
        <ActivityText activity={activity} t={t} />
        {activity.data?.details && (
          <p className="text-xs text-default-400 mt-0.5 truncate">
            {activity.data.details}
          </p>
        )}
      </div>

      {/* Timestamp */}
      {showTimestamp && (
        <div className="flex-shrink-0 text-xs text-default-400">
          {getRelativeTime(activity.timestamp, t)}
        </div>
      )}
    </motion.div>
  )
}

interface TimeGroupSectionProps {
  label: string
  activities: ActivityItem[]
  showTimestamps: boolean
  onActivityClick?: (activity: ActivityItem) => void
  t: (
    key: (typeof localI18n.en)[number],
    params?: Record<string, string | number>,
  ) => string
}

function TimeGroupSection({
  label,
  activities,
  showTimestamps,
  onActivityClick,
  t,
}: TimeGroupSectionProps) {
  if (activities.length === 0) {
    return null
  }

  return (
    <div className="mb-4">
      <div className="text-xs font-semibold text-default-500 uppercase tracking-wide mb-2 px-2">
        {label}
      </div>
      <AnimatePresence mode="popLayout">
        {activities.map((activity) => (
          <ActivityItemComponent
            key={activity.id}
            activity={activity}
            showTimestamp={showTimestamps}
            onClick={onActivityClick}
            t={t}
          />
        ))}
      </AnimatePresence>
    </div>
  )
}

export function ActivityFeed({
  activities,
  maxItems = 20,
  showTimestamps = true,
  groupByTime = true,
  onActivityClick,
  emptyMessage,
  className,
}: ActivityFeedProps) {
  const { t } = useI18n(localI18n)

  // Sort activities by timestamp (newest first) and limit
  const sortedActivities = useMemo(() => {
    return [...activities]
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, maxItems)
  }, [activities, maxItems])

  // Group activities if enabled
  const groupedActivities = useMemo(() => {
    if (!groupByTime) {
      return null
    }
    return groupActivitiesByTime(sortedActivities)
  }, [sortedActivities, groupByTime])

  // Empty state
  if (activities.length === 0) {
    return (
      <div
        className={twMerge(
          'flex flex-col items-center justify-center py-8 px-4',
          className,
        )}
      >
        <div className="w-12 h-12 rounded-full bg-default-100 flex items-center justify-center mb-3">
          <MessageText className="w-6 h-6 text-default-400" />
        </div>
        <p className="text-sm text-default-500 text-center">
          {emptyMessage || t('No recent activity')}
        </p>
      </div>
    )
  }

  return (
    <ScrollShadow
      className={twMerge('max-h-[400px] overflow-y-auto', className)}
      hideScrollBar
    >
      {groupByTime && groupedActivities ? (
        // Grouped view
        <div className="space-y-2">
          {(['today', 'yesterday', 'thisWeek', 'earlier'] as const).map(
            (group) => (
              <TimeGroupSection
                key={group}
                label={t(timeGroupLabels[group])}
                activities={groupedActivities[group]}
                showTimestamps={showTimestamps}
                onActivityClick={onActivityClick}
                t={t}
              />
            ),
          )}
        </div>
      ) : (
        // Flat list view
        <AnimatePresence mode="popLayout">
          {sortedActivities.map((activity) => (
            <ActivityItemComponent
              key={activity.id}
              activity={activity}
              showTimestamp={showTimestamps}
              onClick={onActivityClick}
              t={t}
            />
          ))}
        </AnimatePresence>
      )}
    </ScrollShadow>
  )
}
