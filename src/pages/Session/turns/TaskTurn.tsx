import { useCallback, useEffect, useMemo, useState } from 'react'
import { Progress, Spinner } from '@heroui/react'

import { useI18n } from '@/i18n'
import { Icon } from '@/components'
import type { Agent, Conversation, Session, SessionTurn, Task } from '@/types'
import { useTasks, useArtifacts, useFullyDecryptedConversations } from '@/hooks'
import { useWorkflowStore } from '@/stores/workflowStore'
import { getAgentById } from '@/stores/agentStore'
import { useOrchestrationStreaming } from '@/hooks'
import { copyRichText } from '@/lib/clipboard'
import { successToast } from '@/lib/toast'
import {
  SubTasksSection,
  TaskStepsSection,
  ArtifactsSection,
  WorkflowHeader,
  AgentTeamBar,
} from '@/pages/Tasks/components'

interface TaskTurnProps {
  turn: SessionTurn
  session: Session
}

export function TaskTurn({ turn, session }: TaskTurnProps) {
  const { t } = useI18n()

  // Resolve the task ID: prefer per-turn taskId, fall back to session-level
  const taskId = turn.taskId ?? session.taskId

  // Reactive data
  const allTasks = useTasks()
  const allArtifacts = useArtifacts()
  const allConversations = useFullyDecryptedConversations()

  // Find the root task
  const task = useMemo(
    () => (taskId ? allTasks.find((t) => t.id === taskId) ?? null : null),
    [allTasks, taskId],
  )

  // Workflow
  const workflows = useWorkflowStore((s) => s.workflows)
  const loadWorkflows = useWorkflowStore((s) => s.loadWorkflows)
  const workflow = useMemo(
    () =>
      task?.workflowId
        ? (workflows.find((w) => w.id === task.workflowId) ?? null)
        : null,
    [workflows, task?.workflowId],
  )
  useEffect(() => {
    if (task?.workflowId) loadWorkflows()
  }, [task?.workflowId, loadWorkflows])

  // Streaming
  const { streamingMap, workflowProgress } = useOrchestrationStreaming(
    task?.workflowId,
  )

  // Sub-tasks
  const subTasks = useMemo(
    () =>
      task
        ? allTasks
            .filter((t) => t.parentTaskId === task.id)
            .sort(
              (a, b) =>
                new Date(a.createdAt).getTime() -
                new Date(b.createdAt).getTime(),
            )
        : [],
    [allTasks, task],
  )

  // All descendant tasks (recursive)
  const allDescendantTasks = useMemo(() => {
    if (!task) return []
    const descendants: Task[] = []
    const collect = (parentId: string) => {
      for (const t of allTasks) {
        if (t.parentTaskId === parentId) {
          descendants.push(t)
          collect(t.id)
        }
      }
    }
    collect(task.id)
    return descendants
  }, [allTasks, task])

  // Artifacts
  const taskArtifacts = useMemo(() => {
    if (!task) return []
    const taskIds = new Set([task.id, ...allDescendantTasks.map((t) => t.id)])
    return allArtifacts.filter((a) => taskIds.has(a.taskId))
  }, [allArtifacts, task, allDescendantTasks])

  // Conversations relevant to the task tree
  const relevantWorkflowIds = useMemo(() => {
    const ids = new Set<string>()
    if (task?.workflowId) ids.add(task.workflowId)
    for (const st of allDescendantTasks) {
      if (st.workflowId) ids.add(st.workflowId)
    }
    return ids
  }, [task?.workflowId, allDescendantTasks])

  const relevantConversations = useMemo<Conversation[]>(
    () =>
      relevantWorkflowIds.size > 0
        ? allConversations.filter((c) => relevantWorkflowIds.has(c.workflowId))
        : [],
    [allConversations, relevantWorkflowIds],
  )

  // Agent cache
  const [agentCache, setAgentCache] = useState<Record<string, Agent>>({})
  useEffect(() => {
    const ids = new Set<string>()
    if (task?.assignedAgentId) ids.add(task.assignedAgentId)
    for (const st of subTasks) {
      if (st.assignedAgentId) ids.add(st.assignedAgentId)
      for (const step of st.steps) {
        if (step.agentId) ids.add(step.agentId)
      }
    }
    if (task?.steps) {
      for (const step of task.steps) {
        if (step.agentId) ids.add(step.agentId)
      }
    }
    if (ids.size === 0) return
    const updates: Record<string, Agent> = {}
    for (const id of ids) {
      if (agentCache[id]) continue
      const agent = getAgentById(id)
      if (agent) updates[id] = agent
    }
    if (Object.keys(updates).length > 0) {
      setAgentCache((prev) => ({ ...prev, ...updates }))
    }
  }, [task, subTasks])

  const handleCopy = useCallback(
    async (content: string) => {
      await copyRichText(content)
      successToast(t('Copied to clipboard'))
    },
    [t],
  )

  // ── Pending / Running ──────────────────────────────────────────────────
  if (turn.status === 'pending' || turn.status === 'running') {
    return (
      <div className="flex flex-col gap-2 py-2">
        <div className="flex items-center gap-2 text-default-400">
          <Spinner size="sm" />
          <span className="text-sm">{t('Orchestrating task…')}</span>
        </div>
        {task && task.steps.length > 0 && (
          <Progress
            size="sm"
            value={
              (task.steps.filter((s) => s.status === 'completed').length /
                task.steps.length) *
              100
            }
            color="primary"
            className="max-w-md"
          />
        )}
        {/* Show sub-tasks while running */}
        {workflow && (
          <>
            <WorkflowHeader
              workflow={workflow}
              liveProgress={workflowProgress}
            />
            {workflow.participatingAgentIds.length > 0 && (
              <AgentTeamBar
                participatingAgentIds={workflow.participatingAgentIds}
                liveProgress={workflowProgress}
              />
            )}
          </>
        )}
        <SubTasksSection
          subTasks={subTasks}
          allTasks={allTasks}
          allConversations={relevantConversations}
          allArtifacts={allArtifacts}
          agentCache={agentCache}
          onCopy={handleCopy}
          streamingMap={streamingMap}
        />
      </div>
    )
  }

  // ── Failed ─────────────────────────────────────────────────────────────
  if (turn.status === 'failed') {
    return (
      <div className="py-2">
        <div className="flex items-center gap-2 text-danger">
          <Icon name="WarningTriangle" size="sm" />
          <span className="text-sm">{t('Task failed')}</span>
        </div>
      </div>
    )
  }

  // ── Completed — full inline task view ──────────────────────────────────
  if (!task) return null

  return (
    <div className="py-2 flex flex-col gap-4">
      {/* Workflow header + agent team */}
      {workflow && (
        <>
          <WorkflowHeader workflow={workflow} />
          {workflow.participatingAgentIds.length > 0 && (
            <AgentTeamBar
              participatingAgentIds={workflow.participatingAgentIds}
            />
          )}
        </>
      )}

      {/* Steps */}
      <TaskStepsSection
        steps={task.steps}
        requirements={task.requirements}
        agentCache={agentCache}
      />

      {/* Sub-tasks with conversations */}
      <SubTasksSection
        subTasks={subTasks}
        allTasks={allTasks}
        allConversations={relevantConversations}
        allArtifacts={allArtifacts}
        agentCache={agentCache}
        onCopy={handleCopy}
      />

      {/* Artifacts */}
      <ArtifactsSection
        artifacts={taskArtifacts}
        conversations={relevantConversations}
      />
    </div>
  )
}
