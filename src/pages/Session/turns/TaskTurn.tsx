import { useEffect, useState } from 'react'
import { Chip, Progress, Spinner } from '@heroui/react'

import { useI18n } from '@/i18n'
import { Icon } from '@/components'
import type { Session, SessionTurn, Task } from '@/types'
import { useTaskStore } from '@/stores/taskStore'

interface TaskTurnProps {
  turn: SessionTurn
  session: Session
}

export function TaskTurn({ turn, session }: TaskTurnProps) {
  const { t } = useI18n()
  const [task, setTask] = useState<Task | null>(null)

  // If the session has a linked task, load it
  useEffect(() => {
    if (session.taskId) {
      useTaskStore
        .getState()
        .getTaskById(session.taskId)
        .then((t) => {
          if (t) setTask(t)
        })
    }
  }, [session.taskId])

  if (turn.status === 'pending' || turn.status === 'running') {
    return (
      <div className="flex flex-col gap-2 py-2">
        <div className="flex items-center gap-2 text-default-400">
          <Spinner size="sm" />
          <span className="text-sm">{(t as any)('Orchestrating task…')}</span>
        </div>
        {task && (
          <Progress
            size="sm"
            value={
              task.steps.length > 0
                ? (task.steps.filter((s) => s.status === 'completed').length /
                    task.steps.length) *
                  100
                : 0
            }
            color="primary"
            className="max-w-md"
          />
        )}
      </div>
    )
  }

  return (
    <div className="py-2">
      {turn.status === 'completed' && (
        <div className="flex items-center gap-2 text-success">
          <Icon name="Check" size="sm" />
          <span className="text-sm">{(t as any)('Task completed')}</span>
        </div>
      )}
      {turn.status === 'failed' && (
        <div className="flex items-center gap-2 text-danger">
          <Icon name="WarningTriangle" size="sm" />
          <span className="text-sm">{(t as any)('Task failed')}</span>
        </div>
      )}
      {task && task.steps.length > 0 && (
        <div className="mt-2 flex gap-1 flex-wrap">
          {task.steps.map((step) => (
            <Chip
              key={step.id}
              size="sm"
              variant="flat"
              color={
                step.status === 'completed'
                  ? 'success'
                  : step.status === 'failed'
                    ? 'danger'
                    : 'default'
              }
            >
              {step.name}
            </Chip>
          ))}
        </div>
      )}
    </div>
  )
}
