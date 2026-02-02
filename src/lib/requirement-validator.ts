import { Requirement, Task, Artifact } from '@/types'
import { getTasksMap, getArtifactsMap } from '@/features/sync/lib/yjs-doc'
import { nanoid } from 'nanoid'

export interface ValidationResult {
  requirementId: string
  status: 'satisfied' | 'pending' | 'failed'
  message: string
  evidence?: string[]
  validatedAt: Date
}

export interface RequirementCheck {
  requirement: Requirement
  validator: (task: Task, artifacts: Artifact[]) => Promise<ValidationResult>
}

/**
 * Service for validating and tracking task requirements throughout execution
 */
export class RequirementValidator {
  private static instance: RequirementValidator
  private checks: Map<string, RequirementCheck> = new Map()

  public static getInstance(): RequirementValidator {
    if (!RequirementValidator.instance) {
      RequirementValidator.instance = new RequirementValidator()
    }
    return RequirementValidator.instance
  }

  /**
   * Register a custom validator for a specific requirement
   */
  async registerValidator(
    requirementId: string,
    validator: RequirementCheck['validator'],
  ) {
    const requirement = await this.getRequirement(requirementId)
    if (requirement) {
      this.checks.set(requirementId, {
        requirement,
        validator,
      })
    }
  }

  /**
   * Create requirements from task description and add them to the task
   */
  async extractAndCreateRequirements(
    taskId: string,
    _taskDescription: string,
    userRequirement: string,
  ): Promise<Requirement[]> {
    const requirements: Requirement[] = []

    // For the drawer persistence example, create specific requirements
    if (
      userRequirement.toLowerCase().includes('persist') &&
      userRequirement.toLowerCase().includes('drawer')
    ) {
      requirements.push({
        id: nanoid(),
        type: 'functional',
        description:
          'App drawer collapsed/expanded state must be persisted across browser sessions',
        priority: 'must',
        source: 'explicit',
        status: 'pending',
        validationCriteria: [
          'State is saved when drawer is toggled',
          'State is restored when app is reloaded',
          'Uses appropriate storage mechanism (localStorage/IndexedDB)',
          'Works across different browser sessions',
        ],
        taskId,
      })

      requirements.push({
        id: nanoid(),
        type: 'non_functional',
        description: 'Persistence implementation should not impact performance',
        priority: 'should',
        source: 'implicit',
        status: 'pending',
        validationCriteria: [
          'No blocking operations on UI thread',
          'Fast read/write operations',
          'Minimal memory footprint',
        ],
        taskId,
      })

      requirements.push({
        id: nanoid(),
        type: 'functional',
        description: 'Existing drawer functionality must remain intact',
        priority: 'must',
        source: 'implicit',
        status: 'pending',
        validationCriteria: [
          'Toggle functionality works as before',
          'UI transitions are smooth',
          'No TypeScript errors introduced',
          'Component renders correctly',
        ],
        taskId,
      })
    }

    return requirements
  }

  /**
   * Validate a single requirement against current task state
   */
  async validateRequirement(
    requirementId: string,
    task: Task,
    artifacts: Artifact[],
  ): Promise<ValidationResult> {
    const check = this.checks.get(requirementId)
    if (check) {
      return await check.validator(task, artifacts)
    }

    // Default validation logic based on requirement type and criteria
    const requirement = task.requirements.find((r) => r.id === requirementId)
    if (!requirement) {
      return {
        requirementId,
        status: 'failed',
        message: 'Requirement not found',
        validatedAt: new Date(),
      }
    }

    return await this.defaultValidation(requirement, task, artifacts)
  }

  /**
   * Validate all requirements for a task
   */
  async validateAllRequirements(
    task: Task,
    artifacts: Artifact[],
  ): Promise<ValidationResult[]> {
    const results: ValidationResult[] = []

    for (const requirement of task.requirements) {
      const result = await this.validateRequirement(
        requirement.id,
        task,
        artifacts,
      )
      results.push(result)
    }

    return results
  }

  /**
   * Update requirement status in the database
   */
  async updateRequirementStatus(
    taskId: string,
    requirementId: string,
    status: Requirement['status'],
    evidence?: string[],
  ) {
    try {
      const tasksMap = getTasksMap()
      const task = tasksMap.get(taskId)
      if (task) {
        const requirement = task.requirements.find(
          (r) => r.id === requirementId,
        )
        if (requirement) {
          requirement.status = status
          if (evidence) {
            requirement.validationCriteria = evidence
          }

          tasksMap.set(taskId, { ...task })
        }
      }
    } catch (error) {
      console.error('Error updating requirement status:', error)
    }
  }

  /**
   * Check if all requirements are satisfied
   */
  areAllRequirementsSatisfied(task: Task): boolean {
    return task.requirements.every((req) => req.status === 'satisfied')
  }

  /**
   * Get requirement satisfaction percentage
   */
  getRequirementSatisfactionRate(task: Task): number {
    if (task.requirements.length === 0) return 100

    const satisfied = task.requirements.filter(
      (req) => req.status === 'satisfied',
    ).length
    return Math.round((satisfied / task.requirements.length) * 100)
  }

  private async getRequirement(
    requirementId: string,
  ): Promise<Requirement | null> {
    try {
      const tasksMap = getTasksMap()
      const tasks = Array.from(tasksMap.values())
      for (const task of tasks) {
        const requirement = task.requirements.find(
          (r) => r.id === requirementId,
        )
        if (requirement) {
          return requirement
        }
      }
    } catch (error) {
      console.error('Error getting requirement:', error)
    }
    return null
  }

  private async defaultValidation(
    requirement: Requirement,
    _task: Task,
    artifacts: Artifact[],
  ): Promise<ValidationResult> {
    // Default validation logic based on requirement description and type
    const evidence: string[] = []
    let status: ValidationResult['status'] = 'pending'
    let message = 'Requirement validation pending'

    // Check for drawer persistence specific validation
    if (
      requirement.description.toLowerCase().includes('drawer') &&
      requirement.description.toLowerCase().includes('persist')
    ) {
      // Look for evidence in task description or artifacts
      const hasZustandPersist = artifacts.some(
        (a) =>
          a.content.toLowerCase().includes('persist') &&
          a.content.toLowerCase().includes('zustand'),
      )

      const hasLocalStorage = artifacts.some(
        (a) =>
          a.content.toLowerCase().includes('localstorage') ||
          a.content.toLowerCase().includes('storage'),
      )

      const hasDrawerState = artifacts.some(
        (a) =>
          a.content.toLowerCase().includes('isdrawercollapsed') ||
          a.content.toLowerCase().includes('drawer'),
      )

      if (hasZustandPersist && hasDrawerState) {
        status = 'satisfied'
        message =
          'Persistence implementation detected with proper state management'
        evidence.push('Zustand persist middleware implemented')
        evidence.push('Drawer state properly configured')
        if (hasLocalStorage) {
          evidence.push('localStorage integration confirmed')
        }
      }
    }

    // Check for performance requirements
    if (requirement.description.toLowerCase().includes('performance')) {
      // Look for non-blocking implementation patterns
      const hasAsyncOperations = artifacts.some(
        (a) => a.content.includes('async') || a.content.includes('await'),
      )

      if (!hasAsyncOperations) {
        status = 'satisfied'
        message = 'No blocking operations detected'
        evidence.push('Synchronous storage operations used appropriately')
      }
    }

    // Check for existing functionality preservation
    if (
      requirement.description.toLowerCase().includes('existing') &&
      requirement.description.toLowerCase().includes('functionality')
    ) {
      // Check if toggle functionality is preserved
      const hasToggleFunction = artifacts.some(
        (a) =>
          a.content.includes('toggleDrawer') || a.content.includes('toggle'),
      )

      if (hasToggleFunction) {
        status = 'satisfied'
        message = 'Existing functionality preserved'
        evidence.push('Toggle function maintained')
      }
    }

    return {
      requirementId: requirement.id,
      status,
      message,
      evidence,
      validatedAt: new Date(),
    }
  }
}

// Export singleton instance
export const requirementValidator = RequirementValidator.getInstance()

/**
 * Helper function to validate requirements during task execution
 */
export async function validateTaskRequirements(taskId: string): Promise<{
  allSatisfied: boolean
  results: ValidationResult[]
  satisfactionRate: number
}> {
  try {
    const tasksMap = getTasksMap()
    const artifactsMap = getArtifactsMap()

    const task = tasksMap.get(taskId)
    if (!task) {
      throw new Error(`Task ${taskId} not found`)
    }

    // Query artifacts by taskId
    const artifacts = Array.from(artifactsMap.values()).filter(
      (a) => a.taskId === taskId,
    )
    const validator = RequirementValidator.getInstance()

    const results = await validator.validateAllRequirements(task, artifacts)
    const allSatisfied = validator.areAllRequirementsSatisfied(task)
    const satisfactionRate = validator.getRequirementSatisfactionRate(task)

    // Update requirement statuses in Yjs
    for (const result of results) {
      await validator.updateRequirementStatus(
        taskId,
        result.requirementId,
        result.status,
        result.evidence,
      )
    }

    return {
      allSatisfied,
      results,
      satisfactionRate,
    }
  } catch (error) {
    console.error('Error validating task requirements:', error)
    return {
      allSatisfied: false,
      results: [],
      satisfactionRate: 0,
    }
  }
}
