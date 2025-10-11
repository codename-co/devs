import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardBody, Chip, Button, Spinner } from '@heroui/react'

import { useI18n } from '@/i18n'
import { Section, Container } from '@/components'
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

  const formatDate = (date: Date) => {
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
          {/* Status Filter */}
          <div className="flex gap-2 mb-6 flex-wrap">
            <Button
              size="sm"
              variant={statusFilter === 'all' ? 'ghost' : 'flat'}
              color="default"
              onPress={() => setStatusFilter('all')}
            >
              {t('All')} ({tasks.length})
            </Button>
            <Button
              size="sm"
              variant={statusFilter === 'in_progress' ? 'ghost' : 'flat'}
              color="primary"
              onPress={() => setStatusFilter('in_progress')}
            >
              {t('In Progress')} (
              {tasks.filter((t) => t.status === 'in_progress').length})
            </Button>
            <Button
              size="sm"
              variant={statusFilter === 'completed' ? 'ghost' : 'flat'}
              color="success"
              onPress={() => setStatusFilter('completed')}
            >
              {t('Completed')} (
              {tasks.filter((t) => t.status === 'completed').length})
            </Button>
            <Button
              size="sm"
              variant={statusFilter === 'pending' ? 'ghost' : 'flat'}
              color="default"
              onPress={() => setStatusFilter('pending')}
            >
              {t('Pending')} (
              {tasks.filter((t) => t.status === 'pending').length})
            </Button>
            <Button
              size="sm"
              variant={statusFilter === 'failed' ? 'ghost' : 'flat'}
              color="danger"
              onPress={() => setStatusFilter('failed')}
            >
              {t('Failed')} ({tasks.filter((t) => t.status === 'failed').length}
              )
            </Button>
          </div>

          {/* Tasks List */}
          {filteredTasks.length === 0 ? (
            <Card>
              <CardBody className="text-center py-12">
                <p className="text-lg text-default-500">
                  {statusFilter === 'all'
                    ? t('No tasks found')
                    : t('No {status} tasks found', {
                        status: statusFilter.replace('_', ' '),
                      })}
                </p>
              </CardBody>
            </Card>
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
