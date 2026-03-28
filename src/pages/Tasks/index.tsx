import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Chip, Pagination } from '@heroui/react'

import { useI18n } from '@/i18n'
import {
  Section,
  Container,
  MultiFilter,
  MultiFilterSelection,
  FilterSection,
  Icon,
  ArtifactPreviewCard,
} from '@/components'
import DefaultLayout from '@/layouts/Default'
import { useTasks, useArtifacts } from '@/hooks'
import { Task, Artifact } from '@/types'
import { HeaderProps } from '@/lib/types'
import localI18n from './i18n'

const TASKS_PER_PAGE = 10

export const TasksContent = () => {
  const { t, url } = useI18n(localI18n)
  const navigate = useNavigate()
  const tasks = useTasks()
  const artifacts = useArtifacts()
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([])
  const [filters, setFilters] = useState<MultiFilterSelection>({
    status: 'all',
    scope: 'root',
  })
  const [page, setPage] = useState(1)

  // Build a map of taskId → parentTaskId for subtask → root resolution
  const parentTaskMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const task of tasks) {
      if (task.parentTaskId) map.set(task.id, task.parentTaskId)
    }
    return map
  }, [tasks])

  // Build a map of taskId → latest artifact
  // Subtask artifacts are also attributed to their parent task
  const lastArtifactByTask = useMemo(() => {
    // Pre-compute timestamps once per artifact (avoids repeated Date construction)
    const times = new Map<string, number>()
    for (const a of artifacts) {
      const d = a.updatedAt ?? a.createdAt
      let t = d ? +new Date(d) : 0
      if (t !== t) t = 0 // NaN guard
      times.set(a.id, t)
    }

    const map = new Map<string, Artifact>()
    for (const artifact of artifacts) {
      const artTime = times.get(artifact.id)!

      const ownExisting = map.get(artifact.taskId)
      if (!ownExisting || artTime >= times.get(ownExisting.id)!) {
        map.set(artifact.taskId, artifact)
      }

      const parentId = parentTaskMap.get(artifact.taskId)
      if (parentId) {
        const parentExisting = map.get(parentId)
        if (!parentExisting || artTime >= times.get(parentExisting.id)!) {
          map.set(parentId, artifact)
        }
      }
    }
    return map
  }, [artifacts, parentTaskMap])

  useEffect(() => {
    let result = tasks

    // Scope filter: root tasks only vs all
    if (filters.scope !== 'all') {
      result = result.filter((task) => !task.parentTaskId)
    }

    // Status filter
    if (filters.status !== 'all') {
      result = result.filter((task) => task.status === filters.status)
    }

    setFilteredTasks(result)
    setPage(1) // Reset to first page when filters change
  }, [tasks, filters])

  // Scoped tasks for counts (respect scope filter)
  const scopedTasks = useMemo(
    () =>
      filters.scope !== 'all'
        ? tasks.filter((task) => !task.parentTaskId)
        : tasks,
    [tasks, filters.scope],
  )

  const rootTaskCount = useMemo(
    () => tasks.filter((task) => !task.parentTaskId).length,
    [tasks],
  )

  // Multi-filter sections
  const filterSections: FilterSection[] = useMemo(
    () => [
      {
        key: 'scope',
        title: t('Scope'),
        options: [
          { key: 'root', label: t('Tasks'), count: rootTaskCount },
          { key: 'all', label: t('Tasks & Sub-Tasks'), count: tasks.length },
        ],
      },
      {
        key: 'status',
        title: t('Status'),
        options: [
          { key: 'all', label: t('All'), count: scopedTasks.length },
          {
            key: 'in_progress',
            label: t('In Progress'),
            count: scopedTasks.filter((t) => t.status === 'in_progress').length,
          },
          {
            key: 'completed',
            label: t('Completed'),
            count: scopedTasks.filter((t) => t.status === 'completed').length,
          },
          {
            key: 'pending',
            label: t('Pending'),
            count: scopedTasks.filter((t) => t.status === 'pending').length,
          },
          {
            key: 'failed',
            label: t('Failed'),
            count: scopedTasks.filter((t) => t.status === 'failed').length,
          },
        ],
      },
    ],
    [tasks, scopedTasks, rootTaskCount, t],
  )

  const getStatusColor = (status: Task['status']) => {
    switch (status) {
      case 'completed':
        return 'success'
      case 'in_progress':
        return 'primary'
      case 'failed':
        return 'danger'
      default:
        return 'default'
    }
  }

  const formatDate = (date: Date | string) => {
    const now = new Date()
    const taskDate = new Date(date)
    const diffMs = now.getTime() - taskDate.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`

    return taskDate.toLocaleDateString()
  }

  const handleTaskClick = (taskId: string) => {
    navigate(url(`/tasks/${taskId}`))
  }

  return (
    <>
      {/* Filters */}
      {tasks.length > 0 && (
        <div className="flex gap-2 mb-6">
          <MultiFilter
            label={t('Filters')}
            sections={filterSections}
            selectedKeys={filters}
            onSelectionChange={setFilters}
          />
        </div>
      )}

      {/* Tasks List */}
      {filteredTasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-8">
          <div className="w-16 h-16 rounded-full bg-default-100 flex items-center justify-center mb-4">
            <Icon
              name="TriangleFlagTwoStripes"
              size="xl"
              className="text-default-400"
            />
          </div>
          <p className="text-lg font-semibold mb-1">
            {filters.status === 'all'
              ? t('No tasks found')
              : t('No {status} tasks found', {
                  status: t(
                    filters.status
                      .replace('_', ' ')
                      .replace(/\b\w/g, (c) => c.toUpperCase()) as any,
                  ).toLowerCase(),
                })}
          </p>
        </div>
      ) : (
        <>
          <div data-testid="task-list" className="space-y-2">
            {filteredTasks
              .sort(
                (a, b) =>
                  new Date(b.createdAt).getTime() -
                  new Date(a.createdAt).getTime(),
              )
              .slice((page - 1) * TASKS_PER_PAGE, page * TASKS_PER_PAGE)
              .map((task) => (
                <Card
                  key={task.id}
                  data-testid="task-item"
                  isHoverable
                  shadow="none"
                  className="w-full"
                  onPress={() => handleTaskClick(task.id)}
                >
                  <Card.Content className="p-0">
                    <div className="flex">
                      <div className="flex-1 min-w-0 py-4 pl-4 pr-2">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-base font-medium truncate">
                            {task.title}
                          </h3>
                          <Chip
                            size="sm"
                            color={getStatusColor(task.status)}
                            variant="soft"
                          >
                            {t(task.status.replace('_', ' ') as any)}
                          </Chip>
                        </div>
                        <p className="text-sm text-default-500 line-clamp-1">
                          {task.description}
                        </p>
                        <time className="text-xs text-default-400 mt-1 block">
                          {formatDate(task.createdAt)}
                        </time>
                      </div>
                      {lastArtifactByTask.has(task.id) && (
                        <div
                          className="w-40 shrink-0 border-l border-default-100 overflow-hidden"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ArtifactPreviewCard
                            item={{
                              kind: 'artifact',
                              artifact: lastArtifactByTask.get(task.id)!,
                            }}
                            onPress={() =>
                              navigate(url(`/tasks/${task.id}`), {
                                state: {
                                  openArtifactId: lastArtifactByTask.get(
                                    task.id,
                                  )!.id,
                                },
                              })
                            }
                          />
                        </div>
                      )}
                    </div>
                  </Card.Content>
                </Card>
              ))}
          </div>
          {filteredTasks.length > TASKS_PER_PAGE && (
            <div className="flex justify-center mt-6">
              <Pagination
                total={Math.ceil(filteredTasks.length / TASKS_PER_PAGE)}
                page={page}
                onChange={setPage}
                showControls
                size="sm"
              />
            </div>
          )}
        </>
      )}
    </>
  )
}

export const TasksPage = () => {
  const { t, url } = useI18n(localI18n)

  const header: HeaderProps = {
    color: 'bg-secondary-50',
    icon: {
      name: 'PcCheck',
      color: 'text-secondary-300 dark:text-secondary-600',
    },
    title: (
      <>
        {t('Tasks')}
        <Chip size="sm" variant="soft" className="ml-2 align-middle">
          Beta
        </Chip>
      </>
    ),
    subtitle: t('Manage and monitor tasks for your organization'),
    cta: {
      label: t('New Task'),
      href: url(''),
      icon: 'Plus',
    },
  }

  return (
    <DefaultLayout title={t('Tasks')} header={header}>
      <Section>
        <Container>
          <TasksContent />
        </Container>
      </Section>
    </DefaultLayout>
  )
}
