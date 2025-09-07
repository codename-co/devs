import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Card,
  CardBody,
  CardHeader,
  Chip,
  Button,
  Spinner,
} from '@heroui/react'

import { useI18n } from '@/i18n'
import { Icon, Section, Container } from '@/components'
import DefaultLayout from '@/layouts/Default'
import { useTaskStore } from '@/stores/taskStore'
import { Task, TaskStep } from '@/types'
import { formatDistanceToNow } from 'date-fns'
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
    icon: {
      name: 'TriangleFlagTwoStripes',
      color: 'text-secondary-300',
    },
    title: t('Tasks'),
    subtitle: t('Manage and monitor tasks for your organization'),
    cta: {
      label: t('New Task'),
      href: url('/tasks/new'),
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

  const getComplexityColor = (complexity: Task['complexity']) => {
    return complexity === 'complex' ? 'warning' : 'default'
  }

  const formatDuration = (duration: number | undefined) => {
    if (!duration) return '—'

    const seconds = Math.floor(duration / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`
    } else {
      return `${seconds}s`
    }
  }

  const getStepStats = (steps: TaskStep[]) => {
    const completed = steps.filter((s) => s.status === 'completed').length
    const total = steps.length
    const totalDuration = steps
      .filter((s) => s.duration)
      .reduce((sum, s) => sum + (s.duration || 0), 0)

    return { completed, total, totalDuration }
  }

  const handleTaskClick = (taskId: string) => {
    navigate(url(`/tasks/${taskId}`))
  }

  if (isLoading && tasks.length === 0) {
    return (
      <DefaultLayout>
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
          <div className="flex items-center justify-between mb-8">
            <span className="text-small text-default-500">
              {filteredTasks.length} {t('tasks')}
            </span>
          </div>

          {/* Status Filter */}
          <div className="flex gap-2 mb-6 flex-wrap">
            <Button
              size="sm"
              variant={statusFilter === 'all' ? 'solid' : 'flat'}
              color="default"
              onPress={() => setStatusFilter('all')}
            >
              {t('All')} ({tasks.length})
            </Button>
            <Button
              size="sm"
              variant={statusFilter === 'completed' ? 'solid' : 'flat'}
              color="success"
              onPress={() => setStatusFilter('completed')}
            >
              {t('Completed')} (
              {tasks.filter((t) => t.status === 'completed').length})
            </Button>
            <Button
              size="sm"
              variant={statusFilter === 'in_progress' ? 'solid' : 'flat'}
              color="primary"
              onPress={() => setStatusFilter('in_progress')}
            >
              {t('In Progress')} (
              {tasks.filter((t) => t.status === 'in_progress').length})
            </Button>
            <Button
              size="sm"
              variant={statusFilter === 'pending' ? 'solid' : 'flat'}
              color="default"
              onPress={() => setStatusFilter('pending')}
            >
              {t('Pending')} (
              {tasks.filter((t) => t.status === 'pending').length})
            </Button>
            <Button
              size="sm"
              variant={statusFilter === 'failed' ? 'solid' : 'flat'}
              color="danger"
              onPress={() => setStatusFilter('failed')}
            >
              {t('Failed')} ({tasks.filter((t) => t.status === 'failed').length}
              )
            </Button>
          </div>

          {/* Tasks List */}
          {filteredTasks.length === 0 ? (
            <div className="text-center py-12" data-testid="empty-task-state">
              <Icon
                name="TaskSolid"
                className="w-12 h-12 text-default-300 mx-auto mb-4"
              />
              <p className="text-default-500">
                {statusFilter === 'all'
                  ? t('No tasks found')
                  : t('No {status} tasks found', {
                      status: statusFilter.replace('_', ' '),
                    })}
              </p>
            </div>
          ) : (
            <div data-testid="task-list" className="grid gap-4">
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
                    onPress={() => handleTaskClick(task.id)}
                    className="hover:scale-[1.01] transition-transform"
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between w-full">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-semibold truncate">
                            {task.title}
                          </h3>
                          <p className="text-small text-default-500 mt-1 line-clamp-2">
                            {task.description}
                          </p>
                        </div>
                        <div className="flex flex-col gap-2 ml-4">
                          <Chip
                            size="sm"
                            color={getStatusColor(task.status)}
                            variant="flat"
                          >
                            {t(task.status.replace('_', ' ') as any)}
                          </Chip>
                          <Chip
                            size="sm"
                            color={getComplexityColor(task.complexity)}
                            variant="dot"
                          >
                            {t(task.complexity)}
                          </Chip>
                        </div>
                      </div>
                    </CardHeader>
                    <CardBody className="pt-0">
                      <div className="flex justify-between text-small text-default-500">
                        <div className="flex items-center gap-4">
                          {task.assignedAgentId && (
                            <span className="flex items-center gap-1">
                              <Icon name="User" className="w-4 h-4" />
                              {task.assignedAgentId}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Icon name="Calendar" className="w-4 h-4" />
                            {formatDistanceToNow(new Date(task.createdAt), {
                              addSuffix: true,
                            })}
                          </span>
                          {task.dueDate && (
                            <span className="flex items-center gap-1">
                              <Icon name="Clock" className="w-4 h-4" />
                              {t('Due')}{' '}
                              {formatDistanceToNow(new Date(task.dueDate), {
                                addSuffix: true,
                              })}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {task.requirements.length > 0 && (
                            <span className="text-tiny">
                              {
                                task.requirements.filter(
                                  (r) => r.status === 'satisfied',
                                ).length
                              }
                              /{task.requirements.length} {t('requirements')}
                            </span>
                          )}
                          {task.artifacts.length > 0 && (
                            <span className="text-tiny flex items-center gap-1">
                              <Icon name="Document" className="w-3 h-3" />
                              {task.artifacts.length}
                            </span>
                          )}
                          {task.steps && task.steps.length > 0 && (
                            <span className="text-tiny flex items-center gap-1">
                              <Icon name="CheckCircle" className="w-3 h-3" />
                              {getStepStats(task.steps).completed}/
                              {getStepStats(task.steps).total} steps
                            </span>
                          )}
                          {task.steps &&
                            getStepStats(task.steps).totalDuration > 0 && (
                              <span className="text-tiny flex items-center gap-1">
                                <Icon name="Circle" className="w-3 h-3" />
                                {formatDuration(
                                  getStepStats(task.steps).totalDuration,
                                )}
                              </span>
                            )}
                        </div>
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
