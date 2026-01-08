/**
 * Methodology Loader
 *
 * Loads and manages methodology definitions, enabling the orchestrator
 * to execute tasks following structured methodology phases.
 *
 * Provides:
 * - Methodology discovery and loading
 * - Phase execution with entry/exit criteria
 * - Task template instantiation
 * - Domain-based methodology suggestions
 */

import type {
  Methodology,
  Phase,
  TaskTemplate,
  Criterion,
  MethodologyMetadata,
} from '@/types/methodology.types'
import type { Task, Requirement } from '@/types'

// =============================================================================
// Types
// =============================================================================

/**
 * Loaded methodology with runtime state
 */
export interface LoadedMethodology {
  methodology: Methodology
  currentPhaseIndex: number
  completedPhases: string[]
  startedAt: Date
  iterationCount: number
}

/**
 * Phase execution result
 */
export interface PhaseExecutionResult {
  phaseId: string
  success: boolean
  tasksCompleted: number
  tasksFailed: number
  exitCriteriaResults: CriterionResult[]
  shouldContinue: boolean
  nextPhaseId?: string
}

/**
 * Result of evaluating a criterion
 */
export interface CriterionResult {
  criterion: Criterion
  satisfied: boolean
  reason?: string
  evidence?: string[]
}

/**
 * Task created from a methodology template
 */
export interface MethodologyTask
  extends Omit<Task, 'id' | 'createdAt' | 'updatedAt'> {
  methodologyId: string
  phaseId: string
  taskTemplateId: string
}

/**
 * Methodology suggestion based on task domain
 */
export interface MethodologySuggestion {
  methodologyId: string
  name: string
  score: number
  matchedDomains: string[]
  matchedTags: string[]
}

// =============================================================================
// Methodology Cache
// =============================================================================

const methodologyCache = new Map<string, Methodology>()
let methodologyManifest: MethodologyMetadata[] | null = null

// =============================================================================
// Loading Functions
// =============================================================================

/**
 * Load the methodology manifest
 */
export async function loadMethodologyManifest(): Promise<
  MethodologyMetadata[]
> {
  if (methodologyManifest) {
    return methodologyManifest
  }

  try {
    const response = await fetch('/methodologies/manifest.json')
    if (!response.ok) {
      throw new Error(`Failed to load manifest: ${response.statusText}`)
    }
    const data = await response.json()
    methodologyManifest = data.methodologies || []
    return methodologyManifest || []
  } catch (error) {
    console.error('Failed to load methodology manifest:', error)
    return []
  }
}

/**
 * Load a specific methodology by ID
 */
export async function loadMethodology(id: string): Promise<Methodology | null> {
  // Check cache first
  const cached = methodologyCache.get(id)
  if (cached) {
    return cached
  }

  try {
    const response = await fetch(`/methodologies/${id}.methodology.json`)
    if (!response.ok) {
      throw new Error(`Failed to load methodology: ${response.statusText}`)
    }
    const methodology: Methodology = await response.json()
    methodologyCache.set(id, methodology)
    return methodology
  } catch (error) {
    console.error(`Failed to load methodology ${id}:`, error)
    return null
  }
}

/**
 * Get all available methodologies (metadata only)
 */
export async function getAvailableMethodologies(): Promise<
  MethodologyMetadata[]
> {
  return loadMethodologyManifest()
}

/**
 * Clear the methodology cache
 */
export function clearMethodologyCache(): void {
  methodologyCache.clear()
  methodologyManifest = null
}

// =============================================================================
// Methodology Suggestion
// =============================================================================

/**
 * Suggest methodologies based on task analysis
 */
export async function suggestMethodologies(
  domains: string[],
  tags: string[],
  complexity?: string,
  limit = 5,
): Promise<MethodologySuggestion[]> {
  const manifest = await loadMethodologyManifest()
  const suggestions: MethodologySuggestion[] = []

  for (const meta of manifest) {
    let score = 0
    const matchedDomains: string[] = []
    const matchedTags: string[] = []

    // Score domain matches (high weight)
    for (const domain of domains) {
      if (meta.domains?.includes(domain)) {
        score += 10
        matchedDomains.push(domain)
      }
    }

    // Score tag matches (medium weight)
    for (const tag of tags) {
      if (meta.tags?.includes(tag)) {
        score += 5
        matchedTags.push(tag)
      }
    }

    // Score complexity match (low weight)
    if (complexity && meta.complexity === complexity) {
      score += 3
    }

    if (score > 0) {
      suggestions.push({
        methodologyId: meta.id,
        name: meta.title || meta.name,
        score,
        matchedDomains,
        matchedTags,
      })
    }
  }

  // Sort by score descending and limit
  return suggestions.sort((a, b) => b.score - a.score).slice(0, limit)
}

// =============================================================================
// Phase Execution
// =============================================================================

/**
 * Check if entry criteria for a phase are satisfied
 */
export async function checkEntryCriteria(
  phase: Phase,
  context: PhaseExecutionContext,
): Promise<CriterionResult[]> {
  const results: CriterionResult[] = []

  if (!phase.entryCriteria?.length) {
    return results // No entry criteria means phase can start
  }

  for (const criterion of phase.entryCriteria) {
    const result = await evaluateCriterion(criterion, context)
    results.push(result)
  }

  return results
}

/**
 * Check if exit criteria for a phase are satisfied
 */
export async function checkExitCriteria(
  phase: Phase,
  context: PhaseExecutionContext,
): Promise<CriterionResult[]> {
  const results: CriterionResult[] = []

  if (!phase.exitCriteria?.length) {
    return results // No exit criteria means phase can complete
  }

  for (const criterion of phase.exitCriteria) {
    const result = await evaluateCriterion(criterion, context)
    results.push(result)
  }

  return results
}

/**
 * Context for phase execution
 */
export interface PhaseExecutionContext {
  /** Current artifacts available */
  artifacts: Map<string, { type: string; content: unknown }>
  /** Completed requirements */
  satisfiedRequirements: Set<string>
  /** Completed phases */
  completedPhases: Set<string>
  /** Metrics collected */
  metrics: Map<string, number>
  /** Custom validator functions */
  customValidators?: Map<string, (context: PhaseExecutionContext) => boolean>
}

/**
 * Evaluate a single criterion
 */
async function evaluateCriterion(
  criterion: Criterion,
  context: PhaseExecutionContext,
): Promise<CriterionResult> {
  switch (criterion.type) {
    case 'artifact-exists':
      return evaluateArtifactExists(criterion, context)

    case 'requirement-satisfied':
      return evaluateRequirementSatisfied(criterion, context)

    case 'metric-threshold':
      return evaluateMetricThreshold(criterion, context)

    case 'phase-completed':
      return evaluatePhaseCompleted(criterion, context)

    case 'custom':
      return evaluateCustomCriterion(criterion, context)

    default:
      return {
        criterion,
        satisfied: false,
        reason: `Unknown criterion type: ${criterion.type}`,
      }
  }
}

function evaluateArtifactExists(
  criterion: Criterion,
  context: PhaseExecutionContext,
): CriterionResult {
  const artifactType = criterion.artifactType
  if (!artifactType) {
    return {
      criterion,
      satisfied: false,
      reason: 'No artifact type specified',
    }
  }

  const exists = Array.from(context.artifacts.values()).some(
    (a) => a.type === artifactType,
  )

  return {
    criterion,
    satisfied: exists,
    reason: exists
      ? `Artifact of type "${artifactType}" exists`
      : `Missing artifact of type "${artifactType}"`,
  }
}

function evaluateRequirementSatisfied(
  criterion: Criterion,
  context: PhaseExecutionContext,
): CriterionResult {
  const requirementId = criterion.requirementId
  if (!requirementId) {
    return {
      criterion,
      satisfied: false,
      reason: 'No requirement ID specified',
    }
  }

  const satisfied = context.satisfiedRequirements.has(requirementId)

  return {
    criterion,
    satisfied,
    reason: satisfied
      ? `Requirement "${requirementId}" is satisfied`
      : `Requirement "${requirementId}" is not satisfied`,
  }
}

function evaluateMetricThreshold(
  criterion: Criterion,
  context: PhaseExecutionContext,
): CriterionResult {
  const { metric, threshold, operator } = criterion

  if (!metric || threshold === undefined || !operator) {
    return {
      criterion,
      satisfied: false,
      reason: 'Incomplete metric threshold specification',
    }
  }

  const value = context.metrics.get(metric)
  if (value === undefined) {
    return {
      criterion,
      satisfied: false,
      reason: `Metric "${metric}" not found`,
    }
  }

  let satisfied = false
  switch (operator) {
    case '<':
      satisfied = value < threshold
      break
    case '≤':
      satisfied = value <= threshold
      break
    case '>':
      satisfied = value > threshold
      break
    case '≥':
      satisfied = value >= threshold
      break
    case '==':
      satisfied = value === threshold
      break
    case '!=':
      satisfied = value !== threshold
      break
  }

  return {
    criterion,
    satisfied,
    reason: `Metric "${metric}": ${value} ${operator} ${threshold} = ${satisfied}`,
  }
}

function evaluatePhaseCompleted(
  criterion: Criterion,
  context: PhaseExecutionContext,
): CriterionResult {
  const phaseId = criterion.phaseId
  if (!phaseId) {
    return {
      criterion,
      satisfied: false,
      reason: 'No phase ID specified',
    }
  }

  const completed = context.completedPhases.has(phaseId)

  return {
    criterion,
    satisfied: completed,
    reason: completed
      ? `Phase "${phaseId}" is completed`
      : `Phase "${phaseId}" is not completed`,
  }
}

function evaluateCustomCriterion(
  criterion: Criterion,
  context: PhaseExecutionContext,
): CriterionResult {
  const validatorName = criterion.customValidator
  if (!validatorName) {
    return {
      criterion,
      satisfied: false,
      reason: 'No custom validator specified',
    }
  }

  const validator = context.customValidators?.get(validatorName)
  if (!validator) {
    return {
      criterion,
      satisfied: false,
      reason: `Custom validator "${validatorName}" not found`,
    }
  }

  try {
    const satisfied = validator(context)
    return {
      criterion,
      satisfied,
      reason: `Custom validator "${validatorName}" returned ${satisfied}`,
    }
  } catch (error) {
    return {
      criterion,
      satisfied: false,
      reason: `Custom validator error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    }
  }
}

// =============================================================================
// Task Template Instantiation
// =============================================================================

/**
 * Create tasks from methodology phase templates
 */
export function createTasksFromPhase(
  methodology: Methodology,
  phase: Phase,
  workflowId: string,
): MethodologyTask[] {
  const tasks: MethodologyTask[] = []

  for (const template of phase.tasks) {
    const task = createTaskFromTemplate(
      methodology.metadata.id,
      phase.id,
      template,
      workflowId,
    )
    tasks.push(task)
  }

  return tasks
}

/**
 * Create a single task from a template
 */
function createTaskFromTemplate(
  methodologyId: string,
  phaseId: string,
  template: TaskTemplate,
  workflowId: string,
): MethodologyTask {
  // Convert template requirements to task requirements
  const requirements: Requirement[] = (template.requirements || []).map(
    (req, index) => ({
      id: `${template.id}-req-${index}`,
      type: req.type === 'non_functional' ? 'non_functional' : req.type,
      description: req.description,
      priority: req.priority,
      source: 'explicit' as const,
      status: 'pending' as const,
      validationCriteria: req.validationCriteria,
      taskId: '', // Will be set when task is created
    }),
  )

  return {
    workflowId,
    title: template.title,
    description: template.description || '',
    complexity:
      template.complexity === 'moderate' || template.complexity === 'expert'
        ? 'simple'
        : (template.complexity as 'simple' | 'complex') || 'simple',
    status: 'pending',
    dependencies: template.dependencies || [],
    requirements,
    artifacts: [],
    steps: [],
    estimatedPasses: 1,
    actualPasses: 0,
    methodologyId,
    phaseId,
    taskTemplateId: template.id,
    assignedRoleId: template.assignedRole,
    dueDate: template.estimatedDuration
      ? new Date(Date.now() + template.estimatedDuration * 60 * 1000)
      : undefined,
  }
}

// =============================================================================
// Methodology Executor
// =============================================================================

/**
 * Options for methodology execution
 */
export interface MethodologyExecutorOptions {
  /** Maximum iterations for iterative methodologies */
  maxIterations?: number
  /** Callback when entering a phase */
  onPhaseStart?: (phase: Phase) => void
  /** Callback when exiting a phase */
  onPhaseComplete?: (phase: Phase, result: PhaseExecutionResult) => void
  /** Callback for task execution */
  executeTask: (task: MethodologyTask) => Promise<boolean>
  /** Get current execution context */
  getContext: () => PhaseExecutionContext
}

/**
 * Execute a methodology from start to finish
 */
export class MethodologyExecutor {
  private methodology: Methodology
  private options: MethodologyExecutorOptions
  private currentPhaseIndex = 0
  private completedPhases = new Set<string>()
  private iterationCount = 0

  constructor(methodology: Methodology, options: MethodologyExecutorOptions) {
    this.methodology = methodology
    this.options = options
  }

  /**
   * Execute the methodology
   */
  async execute(workflowId: string): Promise<{
    success: boolean
    completedPhases: string[]
    failedPhase?: string
    error?: string
  }> {
    const phases = this.methodology.phases
    const maxIterations =
      this.options.maxIterations ||
      this.methodology.configuration?.maxIterations ||
      10

    try {
      while (this.currentPhaseIndex < phases.length) {
        const phase = phases[this.currentPhaseIndex]

        // Check entry criteria
        const entryResults = await checkEntryCriteria(
          phase,
          this.options.getContext(),
        )
        const entryMet = entryResults.every((r) => r.satisfied)

        if (!entryMet) {
          return {
            success: false,
            completedPhases: Array.from(this.completedPhases),
            failedPhase: phase.id,
            error: `Entry criteria not met: ${entryResults
              .filter((r) => !r.satisfied)
              .map((r) => r.reason)
              .join(', ')}`,
          }
        }

        // Notify phase start
        this.options.onPhaseStart?.(phase)

        // Execute phase tasks
        const result = await this.executePhase(phase, workflowId)

        // Notify phase complete
        this.options.onPhaseComplete?.(phase, result)

        if (!result.success) {
          return {
            success: false,
            completedPhases: Array.from(this.completedPhases),
            failedPhase: phase.id,
            error: `Phase execution failed: ${result.tasksCompleted} completed, ${result.tasksFailed} failed`,
          }
        }

        // Check exit criteria
        const exitMet = result.exitCriteriaResults.every((r) => r.satisfied)

        if (!exitMet && phase.repeatable) {
          // Can repeat this phase
          this.iterationCount++
          if (this.iterationCount >= maxIterations) {
            return {
              success: false,
              completedPhases: Array.from(this.completedPhases),
              failedPhase: phase.id,
              error: `Max iterations (${maxIterations}) reached`,
            }
          }
          // Stay on this phase
          continue
        }

        if (!exitMet) {
          return {
            success: false,
            completedPhases: Array.from(this.completedPhases),
            failedPhase: phase.id,
            error: `Exit criteria not met: ${result.exitCriteriaResults
              .filter((r) => !r.satisfied)
              .map((r) => r.reason)
              .join(', ')}`,
          }
        }

        // Phase completed successfully
        this.completedPhases.add(phase.id)
        this.currentPhaseIndex++
        this.iterationCount = 0
      }

      return {
        success: true,
        completedPhases: Array.from(this.completedPhases),
      }
    } catch (error) {
      return {
        success: false,
        completedPhases: Array.from(this.completedPhases),
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Execute a single phase
   */
  private async executePhase(
    phase: Phase,
    workflowId: string,
  ): Promise<PhaseExecutionResult> {
    const tasks = createTasksFromPhase(this.methodology, phase, workflowId)
    let tasksCompleted = 0
    let tasksFailed = 0

    // Execute tasks (respecting dependencies)
    const executed = new Set<string>()

    while (executed.size < tasks.length) {
      const readyTasks = tasks.filter(
        (t) =>
          !executed.has(t.taskTemplateId) &&
          t.dependencies.every((d) => executed.has(d)),
      )

      if (readyTasks.length === 0 && executed.size < tasks.length) {
        // Circular dependency or missing dependency
        tasksFailed = tasks.length - executed.size
        break
      }

      // Execute ready tasks (could be parallelized based on config)
      for (const task of readyTasks) {
        try {
          const success = await this.options.executeTask(task)
          if (success) {
            tasksCompleted++
          } else {
            tasksFailed++
          }
        } catch {
          tasksFailed++
        }
        executed.add(task.taskTemplateId)
      }
    }

    // Check exit criteria
    const exitCriteriaResults = await checkExitCriteria(
      phase,
      this.options.getContext(),
    )

    const success = tasksFailed === 0
    const shouldContinue =
      success && exitCriteriaResults.every((r) => r.satisfied)

    return {
      phaseId: phase.id,
      success,
      tasksCompleted,
      tasksFailed,
      exitCriteriaResults,
      shouldContinue,
      nextPhaseId:
        shouldContinue &&
        this.currentPhaseIndex + 1 < this.methodology.phases.length
          ? this.methodology.phases[this.currentPhaseIndex + 1].id
          : undefined,
    }
  }
}
