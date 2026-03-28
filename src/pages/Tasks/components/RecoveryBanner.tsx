/**
 * Recovery Banner
 *
 * Shown when a task's orchestration workflow was interrupted.
 * Provides Resume and Discard actions.
 */

import { memo, useState, useCallback } from 'react'
import { Button, Chip } from '@/components/heroui-compat'
import { Icon } from '@/components'
import type { OrphanedWorkflow } from '@/lib/orchestrator/recovery'
import { resumeWorkflow, discardWorkflow } from '@/lib/orchestrator/recovery'
import { successToast, errorToast } from '@/lib/toast'

interface RecoveryBannerProps {
  orphan: OrphanedWorkflow
  onResolved?: () => void
}

export const RecoveryBanner = memo(
  ({ orphan, onResolved }: RecoveryBannerProps) => {
    const [isResuming, setIsResuming] = useState(false)
    const [isDiscarding, setIsDiscarding] = useState(false)

    const handleResume = useCallback(async () => {
      setIsResuming(true)
      try {
        await resumeWorkflow(orphan.workflow.id)
        successToast('Orchestration resumed')
        onResolved?.()
      } catch (error) {
        errorToast('Failed to resume', error)
      } finally {
        setIsResuming(false)
      }
    }, [orphan.workflow.id, onResolved])

    const handleDiscard = useCallback(async () => {
      setIsDiscarding(true)
      try {
        await discardWorkflow(orphan.workflow.id)
        successToast('Orchestration discarded')
        onResolved?.()
      } catch (error) {
        errorToast('Failed to discard', error)
      } finally {
        setIsDiscarding(false)
      }
    }, [orphan.workflow.id, onResolved])

    const progressText =
      orphan.totalSubTasks > 0
        ? `${orphan.completedSubTasks}/${orphan.totalSubTasks} sub-tasks completed`
        : 'No sub-tasks found'

    return (
      <div className="mb-4 rounded-lg border border-warning-200 bg-warning-50 dark:border-warning-800 dark:bg-warning-900/20 p-4">
        <div className="flex items-start gap-3">
          <Icon
            name="WarningTriangle"
            size="sm"
            className="text-warning mt-0.5 shrink-0"
          />

          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-warning-700 dark:text-warning-300">
              This orchestration was interrupted
            </p>
            <p className="text-xs text-warning-600 dark:text-warning-400 mt-1">
              {progressText}
            </p>

            <div className="flex items-center gap-2 mt-1">
              <Chip size="sm" variant="soft" color="warning">
                {orphan.classification === 'restart'
                  ? 'Needs restart'
                  : orphan.classification === 're-validate'
                    ? 'Re-validation needed'
                    : 'Partial progress saved'}
              </Chip>
            </div>

            <div className="flex items-center gap-2 mt-3">
              <Button
                size="sm"
                color="primary"
                variant="secondary"
                isLoading={isResuming}
                isDisabled={isDiscarding}
                onPress={handleResume}
                startContent={!isResuming && <Icon name="Play" size="sm" />}
              >
                Resume
              </Button>

              <Button
                size="sm"
                color="danger"
                variant="ghost"
                isLoading={isDiscarding}
                isDisabled={isResuming}
                onPress={handleDiscard}
                startContent={!isDiscarding && <Icon name="Trash" size="sm" />}
              >
                Discard
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  },
)

RecoveryBanner.displayName = 'RecoveryBanner'
