import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Chip, Progress, Tooltip } from '@heroui/react'
import { Icon } from '@/components'
import { useI18n } from '@/i18n'
import type { Task } from '@/types'

interface SubTaskTreeProps {
  task: Task
  children: Task[]
  parent?: Task
  siblings: Task[]
  allTasks?: Task[]
  className?: string
}

interface TaskNodeProps {
  task: Task
  level: number
  isExpanded?: boolean
  onToggle?: () => void
  hasChildren?: boolean
  isSelected?: boolean
  className?: string
}

const TaskNode = ({ 
  task, 
  level, 
  isExpanded = false, 
  onToggle, 
  hasChildren = false, 
  isSelected = false,
  className = ""
}: TaskNodeProps) => {
  const { url } = useI18n()
  const navigate = useNavigate()

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

  const getStatusIcon = (status: Task['status']) => {
    switch (status) {
      case 'completed':
        return 'CheckCircle'
      case 'in_progress':
        return 'Timer'
      case 'failed':
        return 'X'
      default:
        return 'Circle'
    }
  }

  const getComplexityColor = (complexity: Task['complexity']) => {
    switch (complexity) {
      case 'complex':
        return 'warning'
      default:
        return 'default'
    }
  }

  // Calculate completion percentage
  const completionPercentage = task.steps.length > 0 
    ? Math.round((task.steps.filter(s => s.status === 'completed').length / task.steps.length) * 100)
    : task.status === 'completed' ? 100 : task.status === 'in_progress' ? 50 : 0

  return (
    <div className={`flex items-center gap-3 py-2 px-3 rounded-lg border border-default-200 hover:border-primary-300 transition-colors ${isSelected ? 'bg-primary-50 border-primary-300' : 'bg-default-50'} ${className}`}>
      {/* Indentation */}
      <div style={{ width: `${level * 20}px` }} />
      
      {/* Expand/Collapse Button */}
      <div className="w-6 flex justify-center">
        {hasChildren ? (
          <Button
            isIconOnly
            size="sm"
            variant="light"
            onClick={onToggle}
            className="min-w-6 w-6 h-6"
          >
            <Icon 
              name={isExpanded ? "ArrowRight" : "ArrowRight"} 
              className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
            />
          </Button>
        ) : (
          <div className="w-6" />
        )}
      </div>

      {/* Status Icon */}
      <div className="flex-none">
        <Icon 
          name={getStatusIcon(task.status) as any} 
          className={`w-4 h-4 ${
            task.status === 'completed' ? 'text-success' :
            task.status === 'in_progress' ? 'text-primary' :
            task.status === 'failed' ? 'text-danger' :
            'text-default-400'
          }`} 
        />
      </div>

      {/* Task Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h4 className="font-medium text-foreground truncate cursor-pointer hover:text-primary"
              onClick={() => navigate(url(`/tasks/${task.id}`))}>
            {task.title}
          </h4>
          <div className="flex gap-1 flex-none">
            <Chip size="sm" color={getStatusColor(task.status)} variant="flat">
              {task.status.replace('_', ' ')}
            </Chip>
            <Chip size="sm" color={getComplexityColor(task.complexity)} variant="flat">
              {task.complexity}
            </Chip>
          </div>
        </div>
        
        {/* Progress Bar */}
        {task.steps.length > 0 && (
          <div className="mb-2">
            <div className="flex items-center gap-2 mb-1">
              <Progress 
                size="sm" 
                value={completionPercentage} 
                color={task.status === 'completed' ? 'success' : 'primary'}
                className="flex-1"
              />
              <span className="text-xs text-default-500 min-w-[3rem]">
                {completionPercentage}%
              </span>
            </div>
            <div className="text-xs text-default-500">
              {task.steps.filter(s => s.status === 'completed').length} / {task.steps.length} steps
            </div>
          </div>
        )}
        
        {/* Task Description (truncated) */}
        <p className="text-sm text-default-600 line-clamp-2">
          {task.description}
        </p>

        {/* Dependencies indicator */}
        {task.dependencies.length > 0 && (
          <div className="mt-1 flex items-center gap-1">
            <Icon name="ArrowRight" className="w-3 h-3 text-default-400" />
            <span className="text-xs text-default-500">
              Depends on {task.dependencies.length} task{task.dependencies.length !== 1 ? 's' : ''}
            </span>
          </div>
        )}

        {/* Timestamps */}
        <div className="flex gap-4 mt-2 text-xs text-default-500">
          {task.createdAt && (
            <span>Created: {task.createdAt.toLocaleDateString()}</span>
          )}
          {task.completedAt && (
            <span>Completed: {task.completedAt.toLocaleDateString()}</span>
          )}
        </div>
      </div>
    </div>
  )
}

export const SubTaskTree = ({ task, children, parent, siblings, allTasks = [], className = "" }: SubTaskTreeProps) => {
  const { t, url } = useI18n()
  const navigate = useNavigate()
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set([task.id]))

  const toggleExpanded = (taskId: string) => {
    setExpandedTasks(prev => {
      const newSet = new Set(prev)
      if (newSet.has(taskId)) {
        newSet.delete(taskId)
      } else {
        newSet.add(taskId)
      }
      return newSet
    })
  }

  const renderTaskHierarchy = (
    currentTask: Task, 
    childTasks: Task[], 
    level: number = 0
  ): React.ReactNode[] => {
    const isExpanded = expandedTasks.has(currentTask.id)
    const hasChildren = childTasks.length > 0
    const isSelected = currentTask.id === task.id

    const elements: React.ReactNode[] = [
      <TaskNode
        key={currentTask.id}
        task={currentTask}
        level={level}
        isExpanded={isExpanded}
        onToggle={() => toggleExpanded(currentTask.id)}
        hasChildren={hasChildren}
        isSelected={isSelected}
      />
    ]

    // Recursively render children if expanded
    if (isExpanded && hasChildren) {
      childTasks.forEach(childTask => {
        const grandChildren = children.filter(t => t.parentTaskId === childTask.id)
        elements.push(
          ...renderTaskHierarchy(childTask, grandChildren, level + 1)
        )
      })
    }

    return elements
  }

  return (
    <div className={`bg-default-100 rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">{t('Task Hierarchy')}</h3>
        <div className="flex items-center gap-2">
          <Tooltip content={t('Expand All')}>
            <Button
              isIconOnly
              size="sm"
              variant="light"
              onClick={() => {
                const allTaskIds = new Set([task.id, ...children.map(c => c.id)])
                if (parent) allTaskIds.add(parent.id)
                siblings.forEach(s => allTaskIds.add(s.id))
                setExpandedTasks(allTaskIds)
              }}
            >
              <Icon name="ArrowRight" className="w-4 h-4" />
            </Button>
          </Tooltip>
          <Tooltip content={t('Collapse All')}>
            <Button
              isIconOnly
              size="sm"
              variant="light"
              onClick={() => setExpandedTasks(new Set([task.id]))}
            >
              <Icon name="ArrowRight" className="w-4 h-4" />
            </Button>
          </Tooltip>
        </div>
      </div>

      <div className="space-y-2">
        {/* Show parent if exists */}
        {parent && (
          <div className="mb-4">
            <div className="text-sm text-default-600 mb-2 font-medium">
              {t('Parent Task')}
            </div>
            <TaskNode
              task={parent}
              level={0}
              isExpanded={false}
              hasChildren={false}
              isSelected={false}
            />
          </div>
        )}

        {/* Show siblings if they exist and we have a parent */}
        {parent && siblings.length > 0 && (
          <div className="mb-4">
            <div className="text-sm text-default-600 mb-2 font-medium">
              {t('Sibling Tasks')} ({siblings.length})
            </div>
            <div className="space-y-2">
              {siblings.map(sibling => (
                <TaskNode
                  key={sibling.id}
                  task={sibling}
                  level={0}
                  isExpanded={false}
                  hasChildren={false}
                  isSelected={false}
                />
              ))}
            </div>
          </div>
        )}

        {/* Main task and its children */}
        <div className="mb-4">
          <div className="text-sm text-default-600 mb-2 font-medium">
            {parent ? t('Current Task & Sub-tasks') : t('Main Task & Sub-tasks')}
          </div>
          <div className="space-y-2">
            {renderTaskHierarchy(task, children)}
          </div>
        </div>

        {/* Dependencies Section */}
        {task.dependencies.length > 0 && (
          <div className="mb-4">
            <div className="text-sm text-default-600 mb-2 font-medium">
              {t('Task Dependencies')} ({task.dependencies.length})
            </div>
            <div className="space-y-2">
              {task.dependencies.map(depId => {
                const depTask = allTasks.find(t => t.id === depId)
                if (!depTask) {
                  return (
                    <div key={depId} className="flex items-center gap-2 p-2 bg-warning-50 border border-warning-200 rounded">
                      <Icon name="X" className="w-4 h-4 text-warning" />
                      <span className="text-sm text-warning-700">Dependency task not found: {depId.substring(0, 8)}...</span>
                    </div>
                  )
                }
                return (
                  <div key={depId} className="flex items-center gap-3 p-3 bg-default-50 border border-default-200 rounded-lg">
                    <Icon 
                      name={depTask.status === 'completed' ? 'CheckCircle' : 
                           depTask.status === 'in_progress' ? 'Circle' : 
                           depTask.status === 'failed' ? 'X' : 'Circle'} 
                      className={`w-4 h-4 ${
                        depTask.status === 'completed' ? 'text-success' :
                        depTask.status === 'in_progress' ? 'text-primary' :
                        depTask.status === 'failed' ? 'text-danger' :
                        'text-default-400'
                      }`} 
                    />
                    <div className="flex-1">
                      <h5 className="font-medium text-foreground cursor-pointer hover:text-primary"
                          onClick={() => navigate(url(`/tasks/${depTask.id}`))}>
                        {depTask.title}
                      </h5>
                      <p className="text-xs text-default-500">{depTask.status.replace('_', ' ')}</p>
                    </div>
                    <Chip size="sm" color={
                      depTask.status === 'completed' ? 'success' :
                      depTask.status === 'in_progress' ? 'primary' :
                      depTask.status === 'failed' ? 'danger' : 'default'
                    } variant="flat">
                      {depTask.status.replace('_', ' ')}
                    </Chip>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Summary */}
        <div className="mt-4 p-3 bg-default-50 rounded-lg">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center text-sm">
            <div>
              <p className="font-medium text-default-600">{t('Total Sub-tasks')}</p>
              <p className="text-lg font-semibold">{children.length}</p>
            </div>
            <div>
              <p className="font-medium text-default-600">{t('Completed')}</p>
              <p className="text-lg font-semibold text-success">
                {children.filter(c => c.status === 'completed').length}
              </p>
            </div>
            <div>
              <p className="font-medium text-default-600">{t('In Progress')}</p>
              <p className="text-lg font-semibold text-primary">
                {children.filter(c => c.status === 'in_progress').length}
              </p>
            </div>
            <div>
              <p className="font-medium text-default-600">{t('Pending')}</p>
              <p className="text-lg font-semibold text-default-600">
                {children.filter(c => c.status === 'pending').length}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}