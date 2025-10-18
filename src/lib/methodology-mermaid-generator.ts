/**
 * Mermaid State Diagram Generator for Agentic Methodologies
 *
 * Generates Mermaid state diagrams from methodology JSON definitions.
 * Supports: aliases, composite states, choices, forks, notes, concurrency
 */

import type { Methodology } from '@/types/methodology.types'

export interface MermaidGeneratorOptions {
  includeNotes?: boolean
  includeArtifacts?: boolean
  includeAgentRoles?: boolean
  showTaskDetails?: boolean
  maxNotesLength?: number
}

export class MethodologyMermaidGenerator {
  private methodology: Methodology
  private options: Required<MermaidGeneratorOptions>
  private indent = '    '
  private lines: string[] = []
  private phaseAliases = new Map<string, string>()
  private processedPhases = new Set<string>()

  constructor(methodology: Methodology, options: MermaidGeneratorOptions = {}) {
    this.methodology = methodology
    this.options = {
      includeNotes: options.includeNotes ?? true,
      includeArtifacts: options.includeArtifacts ?? false,
      includeAgentRoles: options.includeAgentRoles ?? false,
      showTaskDetails: options.showTaskDetails ?? false,
      maxNotesLength: options.maxNotesLength ?? 200,
    }
  }

  /**
   * Generate the complete Mermaid state diagram
   */
  public generate(): string {
    this.lines = []
    this.phaseAliases.clear()
    this.processedPhases.clear()

    // Start diagram
    this.addLine('stateDiagram-v2')
    this.addLine('')

    // Create phase aliases
    this.createPhaseAliases()

    // Generate main flow based on execution strategy
    this.generateExecutionFlow()

    // Add methodology title as note
    // if (this.options.includeNotes) {
    //   this.addNote(
    //     '[*]',
    //     `${this.methodology.metadata.name} (${this.methodology.metadata.type})`,
    //   )
    //   this.addLine('')
    // }

    return this.lines.join('\n')
  }

  /**
   * Create shortened aliases for phases to keep diagram clean
   */
  private createPhaseAliases(): void {
    this.methodology.phases.forEach((phase, index) => {
      // Create clean alias without special characters
      const alias = `Phase${index + 1}`
      this.phaseAliases.set(phase.id, alias)
    })
  }

  /**
   * Generate the execution flow based on strategy
   */
  private generateExecutionFlow(): void {
    const { strategy } = this.methodology.execution

    switch (strategy) {
      case 'sequential':
        this.generateSequentialFlow()
        break
      case 'iterative':
        this.generateIterativeFlow()
        break
      case 'parallel':
        this.generateParallelFlow()
        break
      case 'conditional':
        this.generateConditionalFlow()
        break
      case 'nested':
        this.generateNestedFlow()
        break
      default:
        this.generateSequentialFlow()
    }
  }

  /**
   * Generate sequential flow
   */
  private generateSequentialFlow(): void {
    const phaseOrder =
      this.methodology.execution.phaseOrder ||
      this.methodology.phases.map((p) => p.id)

    // Start
    this.addLine('[*] --> ' + this.getPhaseAlias(phaseOrder[0]))
    this.addLine('')

    // Process each phase
    phaseOrder.forEach((phaseId, index) => {
      this.generatePhase(phaseId, index)

      // Add transition to next phase or end
      if (index < phaseOrder.length - 1) {
        const currentAlias = this.getPhaseAlias(phaseId)
        const nextAlias = this.getPhaseAlias(phaseOrder[index + 1])
        const currentPhase = this.getPhase(phaseId)

        // Check for exit criteria
        if (
          currentPhase?.exitCriteria &&
          currentPhase.exitCriteria.length > 0
        ) {
          const criteriaDesc = this.formatCriteria(currentPhase.exitCriteria)
          this.addLine(`${currentAlias} --> ${nextAlias}: ${criteriaDesc}`)
        } else {
          this.addLine(`${currentAlias} --> ${nextAlias}`)
        }
      } else {
        // Last phase to end
        this.addLine(`${this.getPhaseAlias(phaseId)} --> [*]`)
      }
      this.addLine('')
    })

    // Add branches if any
    this.generateBranches()

    // Add failure handling
    this.generateFailureHandling()
  }

  /**
   * Generate iterative flow with loops
   */
  private generateIterativeFlow(): void {
    const loops = this.methodology.execution.loops || []

    if (loops.length === 0) {
      // Fallback to sequential
      this.generateSequentialFlow()
      return
    }

    const phaseOrder =
      this.methodology.execution.phaseOrder ||
      this.methodology.phases.map((p) => p.id)

    // Start
    this.addLine('[*] --> ' + this.getPhaseAlias(phaseOrder[0]))
    this.addLine('')

    // Identify phases in loops
    const loopPhaseIds = new Set(loops.flatMap((loop) => loop.phases))

    // Separate phases into pre-loop, loop, and post-loop
    const preLoopPhases: string[] = []
    const postLoopPhases: string[] = []
    let inLoop = false
    let passedLoop = false

    for (const phaseId of phaseOrder) {
      if (loopPhaseIds.has(phaseId)) {
        inLoop = true
      } else if (!inLoop) {
        preLoopPhases.push(phaseId)
      } else {
        if (!passedLoop) {
          passedLoop = true
        }
        postLoopPhases.push(phaseId)
      }
    }

    // Generate pre-loop phases
    preLoopPhases.forEach((phaseId, index) => {
      this.generatePhase(phaseId, index)

      if (index < preLoopPhases.length - 1) {
        // Connect to next pre-loop phase
        const currentAlias = this.getPhaseAlias(phaseId)
        const nextAlias = this.getPhaseAlias(preLoopPhases[index + 1])
        this.addLine(`${currentAlias} --> ${nextAlias}`)
      } else {
        // Connect last pre-loop phase to first loop phase
        const currentAlias = this.getPhaseAlias(phaseId)
        const firstLoopPhase = loops[0].phases[0]
        const firstLoopAlias = this.getPhaseAlias(firstLoopPhase)
        this.addLine(`${currentAlias} --> ${firstLoopAlias}`)
      }
      this.addLine('')
    })

    // Generate each loop
    loops.forEach((loop, loopIndex) => {
      this.addLine(`%% Loop: ${loop.name || loop.id}`)

      loop.phases.forEach((phaseId, index) => {
        if (!this.processedPhases.has(phaseId)) {
          this.generatePhase(phaseId, index)
        }

        // Add transitions within loop
        if (index < loop.phases.length - 1) {
          const currentAlias = this.getPhaseAlias(phaseId)
          const nextAlias = this.getPhaseAlias(loop.phases[index + 1])
          this.addLine(`${currentAlias} --> ${nextAlias}`)
        } else {
          // Last phase in loop - add decision point
          const lastAlias = this.getPhaseAlias(phaseId)
          const firstAlias = this.getPhaseAlias(loop.phases[0])
          const choiceId = `choice_loop_${loopIndex}`

          this.addLine(`state ${choiceId} <<choice>>`)
          this.addLine(`${lastAlias} --> ${choiceId}`)

          // Add convergence criteria (loop back - condition not met)
          if (loop.convergenceCriteria && loop.convergenceCriteria.length > 0) {
            const criteriaDesc = this.formatCriteria(loop.convergenceCriteria)
            // Note: The loop continues while criteria is NOT met
            this.addLine(
              `${choiceId} --> ${firstAlias}: Continue (${criteriaDesc})`,
            )
          } else {
            this.addLine(`${choiceId} --> ${firstAlias}: Continue`)
          }

          // Exit loop condition - find next phase or end
          const nextPhaseId =
            postLoopPhases.length > 0 ? postLoopPhases[0] : null

          if (nextPhaseId) {
            const nextPhaseAlias = this.getPhaseAlias(nextPhaseId)
            if (loop.exitConditions && loop.exitConditions.length > 0) {
              const exitDesc = this.formatCriteria(loop.exitConditions)
              this.addLine(`${choiceId} --> ${nextPhaseAlias}: ${exitDesc}`)
            } else if (loop.maxIterations) {
              this.addLine(
                `${choiceId} --> ${nextPhaseAlias}: Max iterations (${loop.maxIterations})`,
              )
            } else {
              this.addLine(`${choiceId} --> ${nextPhaseAlias}: Done`)
            }
          } else {
            // No phase after loop, go to end
            if (loop.exitConditions && loop.exitConditions.length > 0) {
              const exitDesc = this.formatCriteria(loop.exitConditions)
              this.addLine(`${choiceId} --> [*]: ${exitDesc}`)
            } else if (loop.maxIterations) {
              this.addLine(
                `${choiceId} --> [*]: Max iterations (${loop.maxIterations})`,
              )
            } else {
              this.addLine(`${choiceId} --> [*]: Done`)
            }
          }
        }
      })
      this.addLine('')
    })

    // Generate post-loop phases
    postLoopPhases.forEach((phaseId, index) => {
      this.generatePhase(phaseId, index)

      if (index < postLoopPhases.length - 1) {
        // Connect to next post-loop phase
        const currentAlias = this.getPhaseAlias(phaseId)
        const nextAlias = this.getPhaseAlias(postLoopPhases[index + 1])
        this.addLine(`${currentAlias} --> ${nextAlias}`)
      } else {
        // Last phase to end
        this.addLine(`${this.getPhaseAlias(phaseId)} --> [*]`)
      }
      this.addLine('')
    })
  }

  /**
   * Generate parallel flow with fork/join
   */
  private generateParallelFlow(): void {
    const phaseOrder =
      this.methodology.execution.phaseOrder ||
      this.methodology.phases.map((p) => p.id)

    // Identify parallel phases
    const parallelPhases = this.methodology.phases.filter(
      (p) => p.parallelizable,
    )
    // const sequentialPhases = this.methodology.phases.filter(
    //   (p) => !p.parallelizable,
    // )

    if (parallelPhases.length === 0) {
      this.generateSequentialFlow()
      return
    }

    // Start
    this.addLine('[*] --> ' + this.getPhaseAlias(phaseOrder[0]))
    this.addLine('')

    // Sequential phases before parallel
    let reachedParallel = false
    for (const [index, phaseId] of phaseOrder.entries()) {
      const phase = this.getPhase(phaseId)
      if (!phase) continue

      if (!phase.parallelizable && !reachedParallel) {
        this.generatePhase(phaseId, index)

        const nextPhaseId = phaseOrder[phaseOrder.indexOf(phaseId) + 1]
        if (nextPhaseId) {
          const nextPhase = this.getPhase(nextPhaseId)
          if (nextPhase?.parallelizable) {
            // About to enter parallel section
            reachedParallel = true
            this.addLine(`${this.getPhaseAlias(phaseId)} --> fork_parallel`)
            this.addLine('fork_parallel <<fork>>')
            this.addLine('')
          } else {
            this.addLine(
              `${this.getPhaseAlias(phaseId)} --> ${this.getPhaseAlias(nextPhaseId)}`,
            )
          }
        }
      } else if (phase.parallelizable) {
        this.generatePhase(phaseId, index)
        this.addLine(`fork_parallel --> ${this.getPhaseAlias(phaseId)}`)
        this.addLine(`${this.getPhaseAlias(phaseId)} --> join_parallel`)
      }
    }

    // Join parallel phases
    if (reachedParallel) {
      this.addLine('join_parallel <<join>>')
      this.addLine('join_parallel --> [*]')
    }
    this.addLine('')
  }

  /**
   * Generate conditional flow with branches
   */
  private generateConditionalFlow(): void {
    this.generateSequentialFlow()
    // Branches are handled in generateBranches()
  }

  /**
   * Generate nested/hierarchical flow
   */
  private generateNestedFlow(): void {
    const phaseOrder =
      this.methodology.execution.phaseOrder ||
      this.methodology.phases.map((p) => p.id)

    // Start
    this.addLine('[*] --> ' + this.getPhaseAlias(phaseOrder[0]))
    this.addLine('')

    // Group phases by parent
    const rootPhases = this.methodology.phases.filter((p) => !p.parentPhaseId)
    const childPhasesByParent = new Map<
      string,
      typeof this.methodology.phases
    >()

    this.methodology.phases.forEach((phase) => {
      if (phase.parentPhaseId) {
        if (!childPhasesByParent.has(phase.parentPhaseId)) {
          childPhasesByParent.set(phase.parentPhaseId, [])
        }
        childPhasesByParent.get(phase.parentPhaseId)!.push(phase)
      }
    })

    // Generate root phases with composite states
    rootPhases.forEach((phase, index) => {
      const children = childPhasesByParent.get(phase.id) || []

      if (children.length > 0) {
        // Composite state
        this.generateCompositePhase(phase, children)
      } else {
        // Simple state
        this.generatePhase(phase.id, index)
      }

      // Transition to next
      if (index < rootPhases.length - 1) {
        const nextPhase = rootPhases[index + 1]
        this.addLine(
          `${this.getPhaseAlias(phase.id)} --> ${this.getPhaseAlias(nextPhase.id)}`,
        )
      } else {
        this.addLine(`${this.getPhaseAlias(phase.id)} --> [*]`)
      }
      this.addLine('')
    })
  }

  /**
   * Generate a composite phase with sub-phases
   */
  private generateCompositePhase(
    parentPhase: Methodology['phases'][0],
    children: Methodology['phases'][0][],
  ): void {
    const parentAlias = this.getPhaseAlias(parentPhase.id)

    this.addLine(`state "${parentPhase.name}" as ${parentAlias} {`)

    // Add parent description as note
    if (this.options.includeNotes && parentPhase.description) {
      this.addLine(
        this.indent +
          `${parentAlias}: ${this.truncateText(parentPhase.description)}`,
      )
    }

    this.addLine(this.indent + '[*] --> ' + this.getPhaseAlias(children[0].id))

    // Generate child phases
    children.forEach((child, index) => {
      const childAlias = this.getPhaseAlias(child.id)
      this.addLine(this.indent + `state "${child.name}" as ${childAlias}`)

      // Add transition to next child
      if (index < children.length - 1) {
        const nextAlias = this.getPhaseAlias(children[index + 1].id)
        this.addLine(this.indent + `${childAlias} --> ${nextAlias}`)
      } else {
        this.addLine(this.indent + `${childAlias} --> [*]`)
      }
    })

    this.addLine('}')
    this.processedPhases.add(parentPhase.id)
    children.forEach((c) => this.processedPhases.add(c.id))
  }

  /**
   * Generate a single phase
   */
  private generatePhase(phaseId: string, index: number): void {
    const phase = this.getPhase(phaseId)
    if (!phase || this.processedPhases.has(phaseId)) return

    const alias = this.getPhaseAlias(phaseId)

    // Define state with name
    this.addLine(
      `state "<a href='#phase-${index}-${phase.name.toLowerCase().replace(/\s+/g, '-')}'>${phase.name}</a>" as ${alias}`,
    )

    // Add description as note
    if (this.options.includeNotes && phase.description) {
      this.addNote(alias, this.truncateText(phase.description))
    }

    // Add task details if enabled
    if (this.options.showTaskDetails && phase.tasks.length > 0) {
      const taskList = phase.tasks
        .slice(0, 3)
        .map((t) => `- ${t.title}`)
        .join('\\n')
      const moreText =
        phase.tasks.length > 3 ? `\\n… +${phase.tasks.length - 3} more` : ''
      this.addLine(`${alias}: ${taskList}${moreText}`)
    }

    // Add agent roles if enabled
    if (
      this.options.includeAgentRoles &&
      phase.agentRequirements?.roles &&
      phase.agentRequirements.roles.length > 0
    ) {
      const roles = phase.agentRequirements.roles
        .slice(0, 2)
        .join(', ')
        .replace(/-/g, ' ')
      const moreRoles =
        phase.agentRequirements.roles.length > 2
          ? ` +${phase.agentRequirements.roles.length - 2}`
          : ''

      this.addLine(`${alias}: ${roles}${moreRoles}`)
    }

    // Add artifacts if enabled
    if (this.options.includeArtifacts && phase.artifacts) {
      if (phase.artifacts.outputs && phase.artifacts.outputs.length > 0) {
        const outputs = phase.artifacts.outputs
          .slice(0, 2)
          .map((a) => a.typeId)
          .join(', ')
        this.addLine(`${alias}: 📦 → ${outputs}`)
      }
    }

    // Add repeatable loopback
    if (phase.repeatable) {
      this.addLine(`${alias} --> ${alias}`)
    }

    this.processedPhases.add(phaseId)
  }

  /**
   * Generate branches for conditional logic
   */
  private generateBranches(): void {
    const branches = this.methodology.execution.branches || []

    if (branches.length === 0) return

    this.addLine('%% Conditional Branches')

    branches.forEach((branch, index) => {
      const choiceId = branch.id || `choice_${index}`
      this.addLine(`${choiceId} <<choice>>`)

      const conditionDesc = this.formatCriterion(branch.condition)

      this.addLine(
        `${choiceId} --> ${this.getPhaseAlias(branch.truePhase)}: ${conditionDesc}`,
      )
      this.addLine(
        `${choiceId} --> ${this.getPhaseAlias(branch.falsePhase)}: else`,
      )
    })
    this.addLine('')
  }

  /**
   * Generate failure handling paths
   */
  private generateFailureHandling(): void {
    const failureHandling = this.methodology.execution.failureHandling

    if (!failureHandling) return

    this.addLine('%% Failure Handling')

    if (
      failureHandling.strategy === 'fallback' &&
      failureHandling.fallbackPhase
    ) {
      // Add fallback transitions from each phase
      this.methodology.phases.forEach((phase) => {
        const alias = this.getPhaseAlias(phase.id)
        const fallbackAlias = this.getPhaseAlias(failureHandling.fallbackPhase!)
        this.addLine(`${alias} --> ${fallbackAlias}: On Failure`)
      })
    } else if (
      failureHandling.strategy === 'retry' &&
      this.options.includeNotes
    ) {
      this.addNote(
        '[*]',
        `Auto-retry enabled (max. ${this.methodology.configuration?.qualityGates?.maxRetries || 2})`,
      )
    }
    this.addLine('')
  }

  /**
   * Add a note to a state
   */
  private addNote(stateId: string, text: string): void {
    // Escape special characters for Mermaid
    const escapedText = text.replace(/"/g, '\\"').replace(/\n/g, '\\n')
    this.addLine(`note right of ${stateId}: ${escapedText}`)
  }

  /**
   * Format criteria for display
   */
  private formatCriteria(
    criteria: Methodology['phases'][0]['exitCriteria'],
  ): string {
    if (!criteria || criteria.length === 0) return 'Complete'

    if (criteria.length === 1) {
      return this.formatCriterion(criteria[0])
    }

    return `${criteria.length} criteria met`
  }

  /**
   * Format a single criterion for display
   */
  private formatCriterion(
    criterion: NonNullable<Methodology['phases'][0]['exitCriteria']>[0],
  ): string {
    let result: string
    switch (criterion.type) {
      case 'artifact-exists':
        result = `Artifact - ${criterion.artifactType}`
        break
      case 'requirement-satisfied':
        result = `Requirement met`
        break
      case 'metric-threshold':
        result = `${criterion.metric} ${criterion.operator} ${criterion.threshold}`
        break
      case 'phase-completed':
        result = `Phase complete`
        break
      case 'custom':
        result = criterion.description || 'Custom check'
        break
      default:
        result = 'Criteria met'
    }
    // Replace colons with dashes to avoid Mermaid syntax conflicts
    return result.replace(/:/g, '-')
  }

  /**
   * Get phase by ID
   */
  private getPhase(phaseId: string): Methodology['phases'][0] | undefined {
    return this.methodology.phases.find((p) => p.id === phaseId)
  }

  /**
   * Get phase alias
   */
  private getPhaseAlias(phaseId: string): string {
    return this.phaseAliases.get(phaseId) || phaseId
  }

  /**
   * Add a line to the output
   */
  private addLine(line: string): void {
    this.lines.push(line)
  }

  /**
   * Truncate text to max length
   */
  private truncateText(text: string): string {
    if (text.length <= this.options.maxNotesLength) {
      return text
    }
    return text.substring(0, this.options.maxNotesLength) + '…'
  }
}

/**
 * Convenience function to generate Mermaid diagram from methodology
 */
export function generateMethodologyDiagram(
  methodology: Methodology,
  options?: MermaidGeneratorOptions,
): string {
  const generator = new MethodologyMermaidGenerator(methodology, options)
  return generator.generate()
}
