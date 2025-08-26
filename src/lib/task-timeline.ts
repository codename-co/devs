import type { Task, Artifact, Conversation, Message, Agent } from '@/types'

export interface TimelineEvent {
  id: string
  type:
    | 'task_created'
    | 'task_started'
    | 'agent_assigned'
    | 'message'
    | 'artifact_created'
    | 'task_completed'
    | 'requirement_detected'
    | 'requirement_validated'
    | 'requirement_satisfied'
    | 'subtask_created'
    | 'subtask_completed'
    | 'task_branched'
  timestamp: Date
  title: string
  description?: string
  agent?: Agent
  artifact?: Artifact
  message?: Message
  subTask?: Task
  data?: any
}

export const buildTimelineEvents = async (
  task: Task,
  artifacts: Artifact[],
  conversations: Conversation[],
  getAgentById: (id: string) => Promise<Agent | null>,
  subTasks: Task[] = [],
): Promise<TimelineEvent[]> => {
  const events: TimelineEvent[] = []

  // Task creation event
  events.push({
    id: `task-created-${task.id}`,
    type: 'task_created',
    timestamp: task.createdAt,
    title: 'Task Created',
    data: task,
  })

  // Task assignment event - use assignedAt if available, otherwise createdAt
  if (task.assignedAgentId) {
    const agent = await getAgentById(task.assignedAgentId)
    events.push({
      id: `task-assigned-${task.id}`,
      type: 'agent_assigned',
      timestamp: task.assignedAt || task.createdAt, // Use assignedAt if available
      title: 'Agent Assigned',
      description: `Assigned to ${agent?.name || task.assignedAgentId}`,
      agent: agent || undefined,
    })
  }

  // Artifact creation events
  for (const artifact of artifacts) {
    const agent = artifact.agentId ? await getAgentById(artifact.agentId) : null
    events.push({
      id: `artifact-${artifact.id}`,
      type: 'artifact_created',
      timestamp: artifact.createdAt,
      title: `Artifact Created: ${artifact.title}`,
      description: artifact.description,
      agent: agent || undefined,
      artifact,
    })
  }

  // Conversation message events
  for (const conversation of conversations) {
    for (const message of conversation.messages) {
      if (message.role === 'system') continue

      const agent = message.agentId ? await getAgentById(message.agentId) : null
      events.push({
        id: `message-${message.id}`,
        type: 'message',
        timestamp: message.timestamp,
        title: message.role === 'user' ? 'User Message' : 'Agent Response',
        // description:
        //   message.content.substring(0, 100) +
        //   (message.content.length > 100 ? '...' : ''),
        agent: agent || undefined,
        message,
      })
    }
  }

  // Requirement events - group by timestamp and type
  const requirementEventsByTimestampAndType = new Map<string, TimelineEvent[]>()

  for (const requirement of task.requirements) {
    // Requirement detection event (when first added to task)
    const detectedTimestamp = (requirement as any).detectedAt || task.createdAt
    const detectedKey = `${detectedTimestamp.getTime()}-requirement_detected`

    if (!requirementEventsByTimestampAndType.has(detectedKey)) {
      requirementEventsByTimestampAndType.set(detectedKey, [])
    }

    requirementEventsByTimestampAndType.get(detectedKey)!.push({
      id: `req-detected-${requirement.id}`,
      type: 'requirement_detected',
      timestamp: detectedTimestamp,
      title: 'Requirement Detected',
      description: `${requirement.type} requirement: ${requirement.description}`,
      data: requirement,
    })

    // Requirement validation event (when validated by system)
    if ((requirement as any).validatedAt) {
      const validatedTimestamp = (requirement as any).validatedAt
      const validatedKey = `${validatedTimestamp.getTime()}-requirement_validated`

      if (!requirementEventsByTimestampAndType.has(validatedKey)) {
        requirementEventsByTimestampAndType.set(validatedKey, [])
      }

      requirementEventsByTimestampAndType.get(validatedKey)!.push({
        id: `req-validated-${requirement.id}`,
        type: 'requirement_validated',
        timestamp: validatedTimestamp,
        title: 'Requirement Validated',
        description: `Validation result: ${(requirement as any).validationResult || 'Validated successfully'}`,
        data: requirement,
      })
    }

    // Requirement satisfaction event (when completed)
    if (requirement.status === 'satisfied') {
      const satisfiedTimestamp =
        (requirement as any).satisfiedAt || task.updatedAt
      const satisfiedKey = `${satisfiedTimestamp.getTime()}-requirement_satisfied`

      if (!requirementEventsByTimestampAndType.has(satisfiedKey)) {
        requirementEventsByTimestampAndType.set(satisfiedKey, [])
      }

      requirementEventsByTimestampAndType.get(satisfiedKey)!.push({
        id: `req-satisfied-${requirement.id}`,
        type: 'requirement_satisfied',
        timestamp: satisfiedTimestamp,
        title: 'Requirement Satisfied',
        description: requirement.description,
        data: requirement,
      })
    }
  }

  // Add grouped requirement events to the main events array
  for (const [, groupedEvents] of requirementEventsByTimestampAndType) {
    if (groupedEvents.length === 1) {
      // Single event - add as is
      events.push(groupedEvents[0])
    } else {
      // Multiple events at same timestamp and type - create a grouped event
      const firstEvent = groupedEvents[0]
      const eventType = firstEvent.type
      const count = groupedEvents.length

      let groupTitle: string
      let groupDescription: string

      switch (eventType) {
        case 'requirement_detected':
          groupTitle = `Requirements Detected (${count})`
          groupDescription = groupedEvents
            .map(
              (e) =>
                `${(e.data as any).type}: ${e.description?.split(': ')[1] || ''}`,
            )
            .join(', ')
          break
        case 'requirement_validated':
          groupTitle = `Requirements Validated (${count})`
          groupDescription = groupedEvents.map((e) => e.description).join(', ')
          break
        case 'requirement_satisfied':
          groupTitle = `Requirements Satisfied (${count})`
          groupDescription = groupedEvents.map((e) => e.description).join(', ')
          break
        default:
          groupTitle = `${eventType.replace('_', ' ')} (${count})`
          groupDescription = groupedEvents.map((e) => e.description).join(', ')
      }

      events.push({
        id: `grouped-${eventType}-${firstEvent.timestamp.getTime()}`,
        type: eventType,
        timestamp: firstEvent.timestamp,
        title: groupTitle,
        description: groupDescription,
        data: {
          groupedEvents,
          count,
        },
      })
    }
  }

  // Sub-task creation and completion events
  if (subTasks.length > 0) {
    // Task branching event (when sub-tasks are first created)
    const earliestSubTask = subTasks.reduce((earliest, subTask) =>
      subTask.createdAt < earliest.createdAt ? subTask : earliest,
    )

    events.push({
      id: `task-branched-${task.id}`,
      type: 'task_branched',
      timestamp: earliestSubTask.createdAt,
      title: 'Task Branched',
      description: `Task split into ${subTasks.length} sub-tasks`,
      data: {
        subTaskCount: subTasks.length,
        subTaskIds: subTasks.map((st) => st.id),
      },
    })

    // Individual sub-task creation events
    for (const subTask of subTasks) {
      const agent = subTask.assignedAgentId
        ? await getAgentById(subTask.assignedAgentId)
        : null

      events.push({
        id: `subtask-created-${subTask.id}`,
        type: 'subtask_created',
        timestamp: subTask.createdAt,
        title: 'Sub-task Created',
        description: subTask.title,
        agent: agent || undefined,
        subTask,
      })

      // Sub-task completion events
      if (subTask.status === 'completed') {
        events.push({
          id: `subtask-completed-${subTask.id}`,
          type: 'subtask_completed',
          timestamp: subTask.completedAt || subTask.updatedAt,
          title: 'Sub-task Completed',
          description: subTask.title,
          agent: agent || undefined,
          subTask,
        })
      }
    }
  }

  // Task completion event - use completedAt if available, otherwise updatedAt
  if (task.status === 'completed') {
    events.push({
      id: `task-completed-${task.id}`,
      type: 'task_completed',
      timestamp: task.completedAt || task.updatedAt, // Use completedAt if available
      title: 'Task Completed',
      description: 'All requirements satisfied',
      data: task,
    })
  }

  // Sort events by timestamp
  events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())

  return events
}
