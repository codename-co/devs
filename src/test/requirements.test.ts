import { describe, it, expect, vi, beforeEach } from 'vitest'
import { requirementValidator } from '@/lib/requirement-validator'
import type { Task, Artifact } from '@/types'

// Mock the database
vi.mock('@/lib/db')

describe('Requirements Validation', () => {
  let mockTask: Task
  let mockArtifacts: Artifact[]

  beforeEach(() => {
    vi.clearAllMocks()

    // Create mock task with requirements
    mockTask = {
      id: 'test-task-id',
      workflowId: 'test-workflow-id',
      title: 'Test Task',
      description: 'Test task description',
      complexity: 'simple' as const,
      status: 'completed' as const,
      assignedAgentId: 'test-agent-id',
      dependencies: [],
      requirements: [
        {
          id: 'req-1',
          type: 'functional',
          description:
            'App drawer collapsed/expanded state must be persisted across browser sessions',
          priority: 'must',
          source: 'explicit',
          status: 'pending', // Should be updated to 'satisfied' after validation
          validationCriteria: [
            'State is saved when drawer is toggled',
            'State is restored when app is reloaded',
            'Uses appropriate storage mechanism (localStorage/IndexedDB)',
          ],
          taskId: 'test-task-id',
        },
        {
          id: 'req-2',
          type: 'non_functional',
          description: 'Existing drawer functionality must remain intact',
          priority: 'must',
          source: 'implicit',
          status: 'pending', // Should be updated to 'satisfied' after validation
          validationCriteria: [
            'Toggle functionality works as before',
            'UI transitions are smooth',
            'No TypeScript errors introduced',
          ],
          taskId: 'test-task-id',
        },
      ],
      artifacts: ['artifact-1'],
      steps: [],
      estimatedPasses: 1,
      actualPasses: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    // Create mock artifacts that should satisfy the requirements
    mockArtifacts = [
      {
        id: 'artifact-1',
        taskId: 'test-task-id',
        agentId: 'test-agent-id',
        title: 'Drawer Persistence Implementation',
        description: 'Implementation of drawer state persistence',
        type: 'code',
        format: 'markdown',
        content: `
# Drawer State Persistence Implementation

## Implementation using Zustand persist middleware

\`\`\`typescript
const useUIStore = create<UIStore>()(
  persist(
    (set, get) => ({
      isDrawerCollapsed: false,
      toggleDrawer: () => set((state) => ({
        isDrawerCollapsed: !state.isDrawerCollapsed
      })),
    }),
    {
      name: 'ui-store',
      storage: createJSONStorage(() => localStorage),
    }
  )
)
\`\`\`

This implementation ensures that the drawer state persists across browser sessions using localStorage.
The toggle functionality is preserved and enhanced with persistence.
`,
        version: 1,
        status: 'final',
        dependencies: [],
        validates: ['req-1', 'req-2'],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]
  })

  it('should validate drawer persistence requirement as satisfied when artifacts contain persistence code', async () => {
    // Act
    const results = await requirementValidator.validateAllRequirements(
      mockTask,
      mockArtifacts,
    )

    // Assert
    expect(results).toHaveLength(2)

    const persistenceResult = results.find((r) => r.requirementId === 'req-1')
    expect(persistenceResult).toBeDefined()
    expect(persistenceResult!.status).toBe('satisfied')
    expect(persistenceResult!.evidence).toContain(
      'Zustand persist middleware implemented',
    )
    expect(persistenceResult!.evidence).toContain(
      'Drawer state properly configured',
    )
  })

  it('should validate existing functionality requirement as satisfied when toggle function is preserved', async () => {
    // Act
    const results = await requirementValidator.validateAllRequirements(
      mockTask,
      mockArtifacts,
    )

    // Assert
    const functionalityResult = results.find((r) => r.requirementId === 'req-2')
    expect(functionalityResult).toBeDefined()
    expect(functionalityResult!.status).toBe('satisfied')
    expect(functionalityResult!.evidence).toContain(
      'Toggle function maintained',
    )
  })

  it('should return pending status when artifacts do not contain required evidence', async () => {
    // Arrange - Create artifacts without persistence code
    const incompleteArtifacts: Artifact[] = [
      {
        ...mockArtifacts[0],
        content: 'Basic drawer implementation without persistence',
      },
    ]

    // Act
    const results = await requirementValidator.validateAllRequirements(
      mockTask,
      incompleteArtifacts,
    )

    // Assert
    const persistenceResult = results.find((r) => r.requirementId === 'req-1')
    expect(persistenceResult!.status).toBe('pending')
  })

  it('should check if all requirements are satisfied', () => {
    // Arrange
    const satisfiedTask = {
      ...mockTask,
      requirements: mockTask.requirements.map((req) => ({
        ...req,
        status: 'satisfied' as const,
      })),
    }

    // Act
    const allSatisfied =
      requirementValidator.areAllRequirementsSatisfied(satisfiedTask)

    // Assert
    expect(allSatisfied).toBe(true)
  })

  it('should return false when not all requirements are satisfied', () => {
    // Act
    const allSatisfied =
      requirementValidator.areAllRequirementsSatisfied(mockTask)

    // Assert - Since requirements are still 'pending', should return false
    expect(allSatisfied).toBe(false)
  })

  it('should calculate correct satisfaction rate', () => {
    // Arrange - Half satisfied, half pending
    const mixedTask = {
      ...mockTask,
      requirements: [
        { ...mockTask.requirements[0], status: 'satisfied' as const },
        { ...mockTask.requirements[1], status: 'pending' as const },
      ],
    }

    // Act
    const rate = requirementValidator.getRequirementSatisfactionRate(mixedTask)

    // Assert - Should be 50%
    expect(rate).toBe(50)
  })
})
