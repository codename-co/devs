import {
  useTaskValidation,
  logValidationResults,
  createValidationArtifact,
} from '@/lib/task-validation-hook'
import { ValidationResult } from '@/lib/requirement-validator'

export interface RequirementAwareTodo {
  id: string
  content: string
  status: 'pending' | 'in_progress' | 'completed'
  requirementIds?: string[] // Link todos to specific requirements
  validationResults?: ValidationResult[]
  taskId?: string
}

export interface TodoValidationResult {
  todoId: string
  requirementsSatisfied: string[]
  requirementsPending: string[]
  requirementsFailed: string[]
  overallProgress: number
}

/**
 * Enhanced todo manager that integrates requirement validation
 */
export class EnhancedTodoManager {
  private static instance: EnhancedTodoManager
  private taskValidation = useTaskValidation()
  private currentTaskId: string | null = null
  private todos: RequirementAwareTodo[] = []

  public static getInstance(): EnhancedTodoManager {
    if (!EnhancedTodoManager.instance) {
      EnhancedTodoManager.instance = new EnhancedTodoManager()
    }
    return EnhancedTodoManager.instance
  }

  /**
   * Set the current task ID for validation
   */
  setCurrentTask(taskId: string) {
    this.currentTaskId = taskId
    console.log(`📋 TodoManager now tracking task: ${taskId}`)
  }

  /**
   * Add todos with requirement linking
   */
  async addTodos(todos: RequirementAwareTodo[]) {
    this.todos = todos
    console.log(`📝 Added ${todos.length} todos to enhanced manager`)

    // If we have a current task, validate requirements immediately
    if (this.currentTaskId) {
      await this.validateCurrentRequirements()
    }
  }

  /**
   * Mark a todo as completed and validate associated requirements
   */
  async completeTodo(
    todoId: string,
    evidence?: string[],
  ): Promise<TodoValidationResult | null> {
    const todo = this.todos.find((t) => t.id === todoId)
    if (!todo) {
      console.warn(`Todo ${todoId} not found`)
      return null
    }

    // Update todo status
    todo.status = 'completed'
    console.log(`✅ Todo completed: ${todo.content}`)

    // If no task is set, return early
    if (!this.currentTaskId) {
      console.log('No current task set for requirement validation')
      return {
        todoId,
        requirementsSatisfied: [],
        requirementsPending: [],
        requirementsFailed: [],
        overallProgress: 0,
      }
    }

    // Validate requirements after completing todo
    const validation = await this.taskValidation.validateAfterStep(
      this.currentTaskId,
      todo.content,
    )

    if (!validation) {
      return null
    }

    // Log validation results
    logValidationResults(
      validation.results,
      `After completing: ${todo.content}`,
    )

    // Update todo with validation results
    todo.validationResults = validation.results

    // If todo is linked to specific requirements, mark them as satisfied if evidence is provided
    if (todo.requirementIds && evidence) {
      for (const reqId of todo.requirementIds) {
        await this.taskValidation.markSatisfied(
          this.currentTaskId,
          reqId,
          evidence,
        )
      }
    }

    // Create validation artifact
    await createValidationArtifact(
      this.currentTaskId,
      'enhanced-todo-manager', // agent ID
      validation.results,
    )

    return {
      todoId,
      requirementsSatisfied: validation.results
        .filter((r) => r.status === 'satisfied')
        .map((r) => r.requirementId),
      requirementsPending: validation.results
        .filter((r) => r.status === 'pending')
        .map((r) => r.requirementId),
      requirementsFailed: validation.results
        .filter((r) => r.status === 'failed')
        .map((r) => r.requirementId),
      overallProgress: validation.satisfactionRate,
    }
  }

  /**
   * Mark todo as in progress and validate requirements
   */
  async startTodo(todoId: string): Promise<void> {
    const todo = this.todos.find((t) => t.id === todoId)
    if (!todo) {
      console.warn(`Todo ${todoId} not found`)
      return
    }

    todo.status = 'in_progress'
    console.log(`🚀 Todo started: ${todo.content}`)

    // Validate current state when starting a new todo
    if (this.currentTaskId) {
      await this.validateCurrentRequirements()
    }
  }

  /**
   * Validate current requirements and update todos
   */
  async validateCurrentRequirements(): Promise<ValidationResult[] | null> {
    if (!this.currentTaskId) {
      return null
    }

    const validation = await this.taskValidation.getCurrentValidationStatus(
      this.currentTaskId,
    )
    if (!validation) {
      return null
    }

    // Update all todos with current validation results
    this.todos.forEach((todo) => {
      todo.validationResults = validation.results
    })

    console.log(
      `📊 Current requirements status: ${validation.satisfactionRate}% satisfied`,
    )

    return validation.results
  }

  /**
   * Get requirements that should be addressed by pending todos
   */
  getRequirementsForTodos(): {
    todoId: string
    suggestedRequirements: string[]
  }[] {
    if (!this.currentTaskId) {
      return []
    }

    const suggestions: { todoId: string; suggestedRequirements: string[] }[] =
      []

    this.todos
      .filter((t) => t.status === 'pending')
      .forEach((todo) => {
        const suggested: string[] = []

        // Match todo content to potential requirements
        const content = todo.content.toLowerCase()

        if (
          content.includes('persist') ||
          content.includes('storage') ||
          content.includes('save')
        ) {
          suggested.push('persistence-requirement')
        }

        if (
          content.includes('test') ||
          content.includes('verify') ||
          content.includes('validate')
        ) {
          suggested.push('testing-requirement')
        }

        if (
          content.includes('performance') ||
          content.includes('speed') ||
          content.includes('optimize')
        ) {
          suggested.push('performance-requirement')
        }

        if (
          content.includes('existing') ||
          content.includes('maintain') ||
          content.includes('preserve')
        ) {
          suggested.push('compatibility-requirement')
        }

        if (suggested.length > 0) {
          suggestions.push({
            todoId: todo.id,
            suggestedRequirements: suggested,
          })
        }
      })

    return suggestions
  }

  /**
   * Get current todo status with requirement validation
   */
  getTodoStatus(): {
    todos: RequirementAwareTodo[]
    overallProgress: number
    requirementsSummary: {
      satisfied: number
      pending: number
      failed: number
      total: number
    }
  } {
    const overallProgress =
      this.todos.length > 0
        ? Math.round(
            (this.todos.filter((t) => t.status === 'completed').length /
              this.todos.length) *
              100,
          )
        : 0

    // Aggregate requirement validation results
    const allResults = this.todos
      .flatMap((t) => t.validationResults || [])
      .reduce((acc, result) => {
        // Deduplicate by requirementId
        if (!acc.find((r) => r.requirementId === result.requirementId)) {
          acc.push(result)
        }
        return acc
      }, [] as ValidationResult[])

    const requirementsSummary = {
      satisfied: allResults.filter((r) => r.status === 'satisfied').length,
      pending: allResults.filter((r) => r.status === 'pending').length,
      failed: allResults.filter((r) => r.status === 'failed').length,
      total: allResults.length,
    }

    return {
      todos: this.todos,
      overallProgress,
      requirementsSummary,
    }
  }

  /**
   * Check if all requirements are satisfied based on completed todos
   */
  areAllRequirementsSatisfied(): boolean {
    const status = this.getTodoStatus()
    return (
      status.requirementsSummary.total > 0 &&
      status.requirementsSummary.satisfied === status.requirementsSummary.total
    )
  }

  /**
   * Generate a requirement validation report
   */
  generateValidationReport(): string {
    const status = this.getTodoStatus()
    const completedTodos = this.todos.filter((t) => t.status === 'completed')

    return `# Task Progress and Requirement Validation Report

## Todo Progress
- **Completed**: ${completedTodos.length}/${this.todos.length} (${status.overallProgress}%)
- **In Progress**: ${this.todos.filter((t) => t.status === 'in_progress').length}
- **Pending**: ${this.todos.filter((t) => t.status === 'pending').length}

## Requirements Status
- **Satisfied**: ${status.requirementsSummary.satisfied}
- **Pending**: ${status.requirementsSummary.pending}
- **Failed**: ${status.requirementsSummary.failed}
- **Total**: ${status.requirementsSummary.total}
- **Satisfaction Rate**: ${status.requirementsSummary.total > 0 ? Math.round((status.requirementsSummary.satisfied / status.requirementsSummary.total) * 100) : 0}%

## Completed Todos
${completedTodos.map((todo) => `- ✅ ${todo.content}`).join('\n')}

## Requirements Validation
${this.todos
  .flatMap((t) => t.validationResults || [])
  .filter(
    (result, index, self) =>
      self.findIndex((r) => r.requirementId === result.requirementId) === index,
  )
  .map(
    (result) =>
      `- ${result.status === 'satisfied' ? '✅' : result.status === 'failed' ? '❌' : '⏳'} ${result.message}`,
  )
  .join('\n')}

---
*Report generated on ${new Date().toISOString()}*`
  }
}

// Export singleton instance
export const enhancedTodoManager = EnhancedTodoManager.getInstance()

// Helper function to integrate with existing TodoWrite workflow
export function createRequirementAwareTodos(
  todos: Array<{
    id: string
    content: string
    status: 'pending' | 'in_progress' | 'completed'
  }>,
  taskId?: string,
): RequirementAwareTodo[] {
  return todos.map((todo) => ({
    ...todo,
    taskId,
    // Auto-link todos to requirement types based on content
    requirementIds: inferRequirementIds(todo.content),
  }))
}

function inferRequirementIds(content: string): string[] {
  const ids: string[] = []
  const lowerContent = content.toLowerCase()

  if (lowerContent.includes('persist') && lowerContent.includes('drawer')) {
    ids.push('drawer-persistence-requirement')
  }

  if (lowerContent.includes('performance') || lowerContent.includes('speed')) {
    ids.push('performance-requirement')
  }

  if (
    lowerContent.includes('existing') &&
    lowerContent.includes('functionality')
  ) {
    ids.push('functionality-preservation-requirement')
  }

  return ids
}
