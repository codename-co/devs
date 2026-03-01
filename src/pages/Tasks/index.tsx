import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardBody, Chip, Spinner } from '@heroui/react'

import { useI18n } from '@/i18n'
import { Section, Container, Filter, FilterOption, Icon } from '@/components'
import DefaultLayout from '@/layouts/Default'
import { useTaskStore } from '@/stores/taskStore'
import { Task } from '@/types'
import { HeaderProps } from '@/lib/types'
import localI18n from './i18n'

export const TasksPage = () => {
  const { t, url } = useI18n(localI18n)
  const navigate = useNavigate()
  const { tasks, isLoading, loadTasks } = useTaskStore()
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([])
  const [statusFilter, setStatusFilter] = useState<Task['status'] | 'all'>(
    'all',
  )

  const header: HeaderProps = {
    color: 'bg-secondary-50',
    icon: {
      name: 'PcCheck',
      color: 'text-secondary-300 dark:text-secondary-600',
    },
    title: (
      <>
        {t('Tasks')}
        <Chip size="sm" variant="flat" className="ml-2 align-middle">
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

  useEffect(() => {
    loadTasks()
  }, [loadTasks])

  useEffect(() => {
    if (statusFilter === 'all') {
      setFilteredTasks(tasks)
    } else {
      setFilteredTasks(tasks.filter((task) => task.status === statusFilter))
    }
  }, [tasks, statusFilter])

  // Filter options with counts
  const filterOptions: FilterOption<Task['status'] | 'all'>[] = useMemo(
    () => [
      { key: 'all', label: t('All'), count: tasks.length },
      {
        key: 'in_progress',
        label: t('In Progress'),
        count: tasks.filter((t) => t.status === 'in_progress').length,
      },
      {
        key: 'completed',
        label: t('Completed'),
        count: tasks.filter((t) => t.status === 'completed').length,
      },
      {
        key: 'pending',
        label: t('Pending'),
        count: tasks.filter((t) => t.status === 'pending').length,
      },
      {
        key: 'failed',
        label: t('Failed'),
        count: tasks.filter((t) => t.status === 'failed').length,
      },
    ],
    [tasks, t],
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

  if (isLoading && tasks.length === 0) {
    return (
      <DefaultLayout header={header} title={t('Tasks')}>
        <Section mainClassName="text-center">
          <div className="flex flex-col items-center justify-center min-h-[50vh]">
            <Spinner size="lg" />
            <p className="mt-4 text-default-500">{t('Loading tasks…')}</p>
          </div>
        </Section>
      </DefaultLayout>
    )
  }

  return (
    <DefaultLayout title={t('Tasks')} header={header}>
      <Section>
        <Container>
          {/* Status Filter */}
          {filteredTasks.length > 0 && (
            <div className="flex gap-2 mb-6">
              <Filter
                label={t('Filter by status')}
                options={filterOptions}
                selectedKey={statusFilter}
                onSelectionChange={setStatusFilter}
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
                {statusFilter === 'all'
                  ? t('No tasks found')
                  : t('No {status} tasks found', {
                      status: t(
                        statusFilter
                          .replace('_', ' ')
                          .replace(/\b\w/g, (c) => c.toUpperCase()) as any,
                      ).toLowerCase(),
                    })}
              </p>
              {/* <p className="text-sm text-default-500 text-center max-w-xs">
                {t('Browse the marketplace to find useful extensions')}
              </p> */}
            </div>
          ) : (
            <div data-testid="task-list" className="space-y-2">
              {filteredTasks
                .sort(
                  (a, b) =>
                    new Date(b.createdAt).getTime() -
                    new Date(a.createdAt).getTime(),
                )
                .map((task) => (
                  <Card
                    key={task.id}
                    data-testid="task-item"
                    isPressable
                    isHoverable
                    shadow="none"
                    className="w-full"
                    onPress={() => handleTaskClick(task.id)}
                  >
                    <CardBody className="py-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-base font-medium truncate">
                              {task.title}
                            </h3>
                            <Chip
                              size="sm"
                              color={getStatusColor(task.status)}
                              variant="flat"
                            >
                              {t(task.status.replace('_', ' ') as any)}
                            </Chip>
                          </div>
                          <p className="text-sm text-default-500 line-clamp-1">
                            {task.description}
                          </p>
                        </div>
                        <time className="text-sm text-default-400 shrink-0">
                          {formatDate(task.createdAt)}
                        </time>
                      </div>
                    </CardBody>
                  </Card>
                ))}
            </div>
          )}
        </Container>
      </Section>
    </DefaultLayout>
  )
}
