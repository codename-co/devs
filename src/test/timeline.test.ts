import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Agent, Artifact, Conversation, Task } from '@/types'
import { buildTimelineEvents } from '@/lib/task-timeline'

// Mock the agent store
vi.mock('@/stores/agentStore', () => ({
  getAgentById: vi.fn(),
}))

describe('Timeline Event Ordering', () => {
  let mockTask: Task
  let mockArtifacts: Artifact[]
  let mockConversations: Conversation[]
  let mockAgent: Agent

  const mockGetAgentById = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()

    const baseDate = new Date('2024-01-01T10:00:00Z')

    mockAgent = {
      id: 'agent-1',
      name: 'Test Agent',
      role: 'Developer',
      instructions: 'Test instructions',
      createdAt: new Date(),
    }

    mockTask = {
      id: 'task-1',
      workflowId: 'workflow-1',
      title: 'Test Task',
      description: 'Test task description',
      complexity: 'simple' as const,
      status: 'completed' as const,
      assignedAgentId: 'agent-1',
      dependencies: [],
      requirements: [
        {
          id: 'req-1',
          type: 'functional',
          description: 'Test requirement',
          priority: 'must',
          source: 'explicit',
          status: 'satisfied',
          validationCriteria: [],
          taskId: 'task-1',
        },
      ],
      artifacts: ['artifact-1'],
      steps: [],
      estimatedPasses: 1,
      actualPasses: 1,
      createdAt: new Date(baseDate.getTime()), // 10:00
      updatedAt: new Date(baseDate.getTime() + 5 * 60 * 1000), // 10:05 (should NOT be used for agent assignment)
      // These should be added to track proper timing
      assignedAt: new Date(baseDate.getTime() + 30 * 1000), // 10:00:30 (should be used for agent assignment)
      completedAt: new Date(baseDate.getTime() + 4 * 60 * 1000), // 10:04 (should be used for completion)
    } as Task & { assignedAt: Date; completedAt: Date }

    mockArtifacts = [
      {
        id: 'artifact-1',
        taskId: 'task-1',
        agentId: 'agent-1',
        title: 'Test Artifact',
        description: 'Test artifact description',
        type: 'code',
        format: 'markdown',
        content: 'Test content',
        version: 1,
        status: 'final',
        dependencies: [],
        validates: ['req-1'],
        createdAt: new Date(baseDate.getTime() + 2 * 60 * 1000), // 10:02
        updatedAt: new Date(baseDate.getTime() + 2 * 60 * 1000),
      },
    ]

    mockConversations = [
      {
        id: 'conv-1',
        agentId: 'agent-1',
        participatingAgents: ['agent-1'],
        workflowId: 'workflow-1',
        timestamp: new Date(baseDate.getTime() + 60 * 1000), // 10:01
        messages: [
          {
            id: 'msg-1',
            role: 'user',
            content: 'Please complete this task',
            timestamp: new Date(baseDate.getTime() + 60 * 1000), // 10:01
          },
          {
            id: 'msg-2',
            role: 'assistant',
            agentId: 'agent-1',
            content: 'Task completed successfully',
            timestamp: new Date(baseDate.getTime() + 3 * 60 * 1000), // 10:03
          },
        ],
      },
    ]

    mockGetAgentById.mockResolvedValue(mockAgent)
  })

  it('should order timeline events chronologically', async () => {
    // Act
    const events = await buildTimelineEvents(
      mockTask,
      mockArtifacts,
      mockConversations,
      mockGetAgentById,
    )

    // Assert - Events should be in chronological order
    // Note: requirement_detected occurs at task.createdAt (same as task_created)
    const eventTypes = events.map((e) => e.type)
    const expectedOrder = [
      'task_created', // 10:00
      'requirement_detected', // 10:00 (same as task_created, but added after)
      'agent_assigned', // 10:00:30 (should come BEFORE messages, not at the end)
      'message', // 10:01 (user message)
      'artifact_created', // 10:02
      'message', // 10:03 (agent response)
      'task_completed', // 10:04
      'requirement_satisfied', // Should use satisfiedAt if available, otherwise reasonable default
    ]

    expect(eventTypes).toEqual(expectedOrder)
  })

  it('should use assignedAt timestamp for agent assignment event, not updatedAt', async () => {
    // Act
    const events = await buildTimelineEvents(
      mockTask,
      mockArtifacts,
      mockConversations,
      mockGetAgentById,
    )

    // Assert
    const agentAssignedEvent = events.find((e) => e.type === 'agent_assigned')
    expect(agentAssignedEvent).toBeDefined()

    // Should use assignedAt (10:00:30), not updatedAt (10:05)
    expect(agentAssignedEvent!.timestamp).toEqual((mockTask as any).assignedAt)
    expect(agentAssignedEvent!.timestamp).not.toEqual(mockTask.updatedAt)
  })

  it('should use completedAt timestamp for task completion event, not updatedAt', async () => {
    // Act
    const events = await buildTimelineEvents(
      mockTask,
      mockArtifacts,
      mockConversations,
      mockGetAgentById,
    )

    // Assert
    const completionEvent = events.find((e) => e.type === 'task_completed')
    expect(completionEvent).toBeDefined()

    // Should use completedAt (10:04), not updatedAt (10:05)
    expect(completionEvent!.timestamp).toEqual((mockTask as any).completedAt)
    expect(completionEvent!.timestamp).not.toEqual(mockTask.updatedAt)
  })

  it('should fall back to reasonable timestamps when specific timestamps are not available', async () => {
    // Arrange - Remove the specific timestamps
    const taskWithoutSpecificTimestamps = {
      ...mockTask,
      assignedAt: undefined,
      completedAt: undefined,
    } as Task

    // Act
    const events = await buildTimelineEvents(
      taskWithoutSpecificTimestamps,
      mockArtifacts,
      mockConversations,
      mockGetAgentById,
    )

    // Assert
    const agentAssignedEvent = events.find((e) => e.type === 'agent_assigned')
    const completionEvent = events.find((e) => e.type === 'task_completed')

    expect(agentAssignedEvent!.timestamp).toEqual(mockTask.createdAt) // Should fall back to createdAt
    expect(completionEvent!.timestamp).toEqual(mockTask.updatedAt) // Should fall back to updatedAt
  })

  it('should not include agent assignment event when task is not assigned', async () => {
    // Arrange
    const unassignedTask = {
      ...mockTask,
      assignedAgentId: undefined,
    }

    // Act
    const events = await buildTimelineEvents(
      unassignedTask,
      mockArtifacts,
      mockConversations,
      mockGetAgentById,
    )

    // Assert
    const agentAssignedEvent = events.find((e) => e.type === 'agent_assigned')
    expect(agentAssignedEvent).toBeUndefined()
  })

  it('should group multiple requirements detected at the same time', async () => {
    // Arrange - Task with multiple requirements detected at the same time
    const baseDate = new Date('2024-01-01T10:00:00Z')
    const sameDetectionTime = new Date(baseDate.getTime() + 30 * 1000) // 10:00:30

    const taskWithMultipleRequirements = {
      ...mockTask,
      requirements: [
        {
          id: 'req-1',
          type: 'functional',
          description: 'First requirement',
          priority: 'must',
          source: 'explicit',
          status: 'pending',
          validationCriteria: [],
          taskId: 'task-1',
          detectedAt: sameDetectionTime,
        },
        {
          id: 'req-2',
          type: 'performance',
          description: 'Second requirement',
          priority: 'must',
          source: 'explicit',
          status: 'pending',
          validationCriteria: [],
          taskId: 'task-1',
          detectedAt: sameDetectionTime, // Same detection time
        },
        {
          id: 'req-3',
          type: 'security',
          description: 'Third requirement',
          priority: 'should',
          source: 'implicit',
          status: 'pending',
          validationCriteria: [],
          taskId: 'task-1',
          detectedAt: sameDetectionTime, // Same detection time
        },
      ],
    } as Task & { assignedAt: Date; completedAt: Date }

    // Act
    const events = await buildTimelineEvents(
      taskWithMultipleRequirements,
      [],
      [],
      mockGetAgentById,
    )

    // Assert
    const detectedEvents = events.filter(
      (e) => e.type === 'requirement_detected',
    )
    expect(detectedEvents).toHaveLength(1) // Should be grouped into one event

    const groupedEvent = detectedEvents[0]
    expect(groupedEvent.title).toBe('Requirements Detected (3)')
    expect(groupedEvent.description).toContain('functional: First requirement')
    expect(groupedEvent.description).toContain(
      'performance: Second requirement',
    )
    expect(groupedEvent.description).toContain('security: Third requirement')
    expect(groupedEvent.data.count).toBe(3)
    expect(groupedEvent.data.groupedEvents).toHaveLength(3)
  })

  it('should group multiple requirements satisfied at the same time', async () => {
    // Arrange - Task with multiple requirements satisfied at the same time
    const baseDate = new Date('2024-01-01T10:00:00Z')
    const sameSatisfiedTime = new Date(baseDate.getTime() + 4 * 60 * 1000) // 10:04

    const taskWithMultipleSatisfiedRequirements = {
      ...mockTask,
      requirements: [
        {
          id: 'req-1',
          type: 'functional',
          description: 'First requirement satisfied',
          priority: 'must',
          source: 'explicit',
          status: 'satisfied',
          validationCriteria: [],
          taskId: 'task-1',
          satisfiedAt: sameSatisfiedTime,
        },
        {
          id: 'req-2',
          type: 'performance',
          description: 'Second requirement satisfied',
          priority: 'must',
          source: 'explicit',
          status: 'satisfied',
          validationCriteria: [],
          taskId: 'task-1',
          satisfiedAt: sameSatisfiedTime, // Same satisfaction time
        },
      ],
    } as Task & { assignedAt: Date; completedAt: Date }

    // Act
    const events = await buildTimelineEvents(
      taskWithMultipleSatisfiedRequirements,
      [],
      [],
      mockGetAgentById,
    )

    // Assert
    const satisfiedEvents = events.filter(
      (e) => e.type === 'requirement_satisfied',
    )
    expect(satisfiedEvents).toHaveLength(1) // Should be grouped into one event

    const groupedEvent = satisfiedEvents[0]
    expect(groupedEvent.title).toBe('Requirements Satisfied (2)')
    expect(groupedEvent.description).toContain('First requirement satisfied')
    expect(groupedEvent.description).toContain('Second requirement satisfied')
    expect(groupedEvent.data.count).toBe(2)
    expect(groupedEvent.data.groupedEvents).toHaveLength(2)
  })

  it('should not group requirements of different types even at same timestamp', async () => {
    // Arrange - Task with requirements detected and satisfied at same time
    const baseDate = new Date('2024-01-01T10:00:00Z')
    const sameTime = new Date(baseDate.getTime() + 2 * 60 * 1000) // 10:02

    const taskWithMixedRequirements = {
      ...mockTask,
      requirements: [
        {
          id: 'req-1',
          type: 'functional',
          description: 'Detected requirement',
          priority: 'must',
          source: 'explicit',
          status: 'pending',
          validationCriteria: [],
          taskId: 'task-1',
          detectedAt: sameTime,
        },
        {
          id: 'req-2',
          type: 'performance',
          description: 'Satisfied requirement',
          priority: 'must',
          source: 'explicit',
          status: 'satisfied',
          validationCriteria: [],
          taskId: 'task-1',
          detectedAt: baseDate, // Different time for detection
          satisfiedAt: sameTime, // Same time for satisfaction
        },
      ],
    } as Task & { assignedAt: Date; completedAt: Date }

    // Act
    const events = await buildTimelineEvents(
      taskWithMixedRequirements,
      [],
      [],
      mockGetAgentById,
    )

    // Assert - Should have separate events for different types
    const detectedEvents = events.filter(
      (e) => e.type === 'requirement_detected',
    )
    const satisfiedEvents = events.filter(
      (e) => e.type === 'requirement_satisfied',
    )

    expect(detectedEvents).toHaveLength(2) // One for each requirement detection (separate times)
    expect(satisfiedEvents).toHaveLength(1) // One for the satisfied requirement

    // Events should not be grouped because they have different types or timestamps
    expect(
      detectedEvents.every((e) => !e.title.includes('Requirements Detected (')),
    ).toBe(true)
    expect(
      satisfiedEvents.every(
        (e) => !e.title.includes('Requirements Satisfied ('),
      ),
    ).toBe(true)
  })

  it('should preserve individual events when requirements have different timestamps', async () => {
    // Arrange - Task with requirements at different times
    const baseDate = new Date('2024-01-01T10:00:00Z')

    const taskWithSeparateRequirements = {
      ...mockTask,
      requirements: [
        {
          id: 'req-1',
          type: 'functional',
          description: 'First requirement',
          priority: 'must',
          source: 'explicit',
          status: 'pending',
          validationCriteria: [],
          taskId: 'task-1',
          detectedAt: new Date(baseDate.getTime() + 30 * 1000), // 10:00:30
        },
        {
          id: 'req-2',
          type: 'performance',
          description: 'Second requirement',
          priority: 'must',
          source: 'explicit',
          status: 'pending',
          validationCriteria: [],
          taskId: 'task-1',
          detectedAt: new Date(baseDate.getTime() + 60 * 1000), // 10:01:00 - Different time
        },
      ],
    } as Task & { assignedAt: Date; completedAt: Date }

    // Act
    const events = await buildTimelineEvents(
      taskWithSeparateRequirements,
      [],
      [],
      mockGetAgentById,
    )

    // Assert - Should have individual events, not grouped
    const detectedEvents = events.filter(
      (e) => e.type === 'requirement_detected',
    )
    expect(detectedEvents).toHaveLength(2) // Two separate events

    expect(detectedEvents[0].title).toBe('Requirement Detected')
    expect(detectedEvents[1].title).toBe('Requirement Detected')
    expect(detectedEvents[0].data.count).toBeUndefined() // Not grouped
    expect(detectedEvents[1].data.count).toBeUndefined() // Not grouped
  })
})
