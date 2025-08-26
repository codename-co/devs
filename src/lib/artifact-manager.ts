import { useArtifactStore } from '@/stores/artifactStore'
import { useTaskStore } from '@/stores/taskStore'
import type { Artifact, Requirement } from '@/types'

export interface TraceabilityMatrix {
  requirement: Requirement
  artifacts: Artifact[]
  coverage: 'none' | 'partial' | 'complete'
  gaps: string[]
}

export interface ArtifactValidation {
  artifactId: string
  isValid: boolean
  issues: string[]
  suggestions: string[]
  coverageScore: number
}

export class ArtifactManager {
  static async createArtifact(
    artifactData: Omit<Artifact, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<Artifact> {
    try {
      const { createArtifact } = useArtifactStore.getState()
      return await createArtifact(artifactData)
    } catch (error) {
      console.error('Failed to create artifact:', error)
      throw error
    }
  }

  static async updateArtifact(
    artifactId: string,
    updates: Partial<Artifact>,
  ): Promise<void> {
    try {
      const { updateArtifact } = useArtifactStore.getState()
      await updateArtifact(artifactId, updates)
    } catch (error) {
      console.error('Failed to update artifact:', error)
      throw error
    }
  }

  static async linkArtifactToRequirement(
    artifactId: string,
    requirementId: string,
  ): Promise<void> {
    try {
      const { linkToRequirement } = useArtifactStore.getState()
      await linkToRequirement(artifactId, requirementId)
    } catch (error) {
      console.error('Failed to link artifact to requirement:', error)
      throw error
    }
  }

  static async getArtifactsByTask(taskId: string): Promise<Artifact[]> {
    const { getArtifactsByTask } = useArtifactStore.getState()
    return getArtifactsByTask(taskId)
  }

  static async getArtifactsByRequirement(
    requirementId: string,
  ): Promise<Artifact[]> {
    const { artifacts } = useArtifactStore.getState()
    return artifacts.filter((artifact) =>
      artifact.validates.includes(requirementId),
    )
  }

  static async generateTraceabilityMatrix(
    taskId: string,
  ): Promise<TraceabilityMatrix[]> {
    try {
      const { loadTask } = useTaskStore.getState()
      await loadTask(taskId)
      const { currentTask } = useTaskStore.getState()

      if (!currentTask) {
        throw new Error('Task not found')
      }

      const matrix: TraceabilityMatrix[] = []

      for (const requirement of currentTask.requirements) {
        const artifacts = await this.getArtifactsByRequirement(requirement.id)
        const coverage = this.assessRequirementCoverage(requirement, artifacts)
        const gaps = this.identifyRequirementGaps(requirement, artifacts)

        matrix.push({
          requirement,
          artifacts,
          coverage,
          gaps,
        })
      }

      return matrix
    } catch (error) {
      console.error('Failed to generate traceability matrix:', error)
      throw error
    }
  }

  static async validateArtifact(
    artifactId: string,
  ): Promise<ArtifactValidation> {
    try {
      const { artifacts } = useArtifactStore.getState()
      const artifact = artifacts.find((a) => a.id === artifactId)

      if (!artifact) {
        throw new Error('Artifact not found')
      }

      const issues: string[] = []
      const suggestions: string[] = []

      // Basic validation checks
      if (!artifact.content || artifact.content.trim().length === 0) {
        issues.push('Artifact has no content')
      }

      if (!artifact.description || artifact.description.trim().length === 0) {
        issues.push('Artifact lacks description')
        suggestions.push(
          "Add a clear description explaining the artifact's purpose",
        )
      }

      if (artifact.validates.length === 0) {
        issues.push('Artifact is not linked to any requirements')
        suggestions.push(
          'Link artifact to relevant requirements for traceability',
        )
      }

      if (artifact.status === 'draft' && artifact.version > 3) {
        suggestions.push(
          'Consider moving artifact out of draft status after multiple revisions',
        )
      }

      // Check for dependencies
      const missingDependencies = await this.checkDependencies(artifact)
      issues.push(...missingDependencies)

      // Calculate coverage score
      const coverageScore = this.calculateCoverageScore(artifact)

      // Format validation checks
      const formatIssues = this.validateArtifactFormat(artifact)
      issues.push(...formatIssues)

      return {
        artifactId,
        isValid: issues.length === 0,
        issues,
        suggestions,
        coverageScore,
      }
    } catch (error) {
      console.error('Failed to validate artifact:', error)
      throw error
    }
  }

  private static assessRequirementCoverage(
    _requirement: Requirement,
    artifacts: Artifact[],
  ): 'none' | 'partial' | 'complete' {
    if (artifacts.length === 0) {
      return 'none'
    }

    const finalizedArtifacts = artifacts.filter(
      (a) => a.status === 'approved' || a.status === 'final',
    )

    if (finalizedArtifacts.length === 0) {
      return 'partial'
    }

    // More sophisticated coverage logic could be added here
    // For now, having any finalized artifact means complete coverage
    return 'complete'
  }

  private static identifyRequirementGaps(
    requirement: Requirement,
    artifacts: Artifact[],
  ): string[] {
    const gaps: string[] = []

    if (artifacts.length === 0) {
      gaps.push('No artifacts created for this requirement')
      return gaps
    }

    const artifactTypes = new Set(artifacts.map((a) => a.type))

    // Check for missing artifact types based on requirement type
    if (requirement.type === 'functional') {
      if (!artifactTypes.has('code') && !artifactTypes.has('document')) {
        gaps.push('Missing implementation or specification document')
      }
    }

    if (requirement.type === 'non_functional') {
      if (!artifactTypes.has('analysis') && !artifactTypes.has('report')) {
        gaps.push('Missing performance or quality analysis')
      }
    }

    const draftArtifacts = artifacts.filter((a) => a.status === 'draft')
    if (draftArtifacts.length === artifacts.length) {
      gaps.push('All artifacts are still in draft status')
    }

    return gaps
  }

  private static async checkDependencies(
    artifact: Artifact,
  ): Promise<string[]> {
    const issues: string[] = []
    const { artifacts } = useArtifactStore.getState()

    for (const depId of artifact.dependencies) {
      const dependency = artifacts.find((a) => a.id === depId)
      if (!dependency) {
        issues.push(`Missing dependency artifact: ${depId}`)
        continue
      }

      if (dependency.status === 'rejected') {
        issues.push(`Dependency artifact is rejected: ${dependency.title}`)
      }

      if (dependency.updatedAt > artifact.updatedAt) {
        issues.push(
          `Dependency artifact was updated after this artifact: ${dependency.title}`,
        )
      }
    }

    return issues
  }

  private static calculateCoverageScore(artifact: Artifact): number {
    let score = 0
    const maxScore = 100

    // Content completeness (40 points)
    if (artifact.content && artifact.content.length > 100) {
      score += 40
    } else if (artifact.content && artifact.content.length > 10) {
      score += 20
    }

    // Description quality (20 points)
    if (artifact.description && artifact.description.length > 50) {
      score += 20
    } else if (artifact.description && artifact.description.length > 10) {
      score += 10
    }

    // Requirement linkage (20 points)
    if (artifact.validates.length > 0) {
      score += Math.min(20, artifact.validates.length * 10)
    }

    // Status maturity (10 points)
    const statusScore = {
      draft: 2,
      review: 5,
      approved: 8,
      final: 10,
      rejected: 0,
    }
    score += statusScore[artifact.status] || 0

    // Dependencies handled (10 points)
    if (artifact.dependencies.length === 0) {
      score += 5 // No dependencies needed
    } else {
      score += 10 // Dependencies properly managed (assumes they exist)
    }

    return Math.min(score, maxScore)
  }

  private static validateArtifactFormat(artifact: Artifact): string[] {
    const issues: string[] = []

    // Validate based on format
    switch (artifact.format) {
      case 'markdown':
        if (!artifact.content.includes('#') && artifact.type === 'document') {
          issues.push('Markdown document should use headers for structure')
        }
        break

      case 'json':
        try {
          JSON.parse(artifact.content)
        } catch (error) {
          issues.push('Invalid JSON format')
        }
        break

      case 'code':
        if (artifact.content.length < 10) {
          issues.push('Code artifact appears too short to be meaningful')
        }
        break
    }

    // Validate artifact type consistency
    if (artifact.type === 'code' && artifact.format !== 'code') {
      issues.push('Code artifact should have code format')
    }

    if (
      artifact.type === 'document' &&
      !['markdown', 'json'].includes(artifact.format)
    ) {
      issues.push('Document artifact should use markdown or JSON format')
    }

    return issues
  }

  static async getArtifactDependencyGraph(taskId: string): Promise<{
    nodes: { id: string; title: string; type: Artifact['type'] }[]
    edges: { source: string; target: string }[]
  }> {
    const artifacts = await this.getArtifactsByTask(taskId)

    const nodes = artifacts.map((artifact) => ({
      id: artifact.id,
      title: artifact.title,
      type: artifact.type,
    }))

    const edges: { source: string; target: string }[] = []

    for (const artifact of artifacts) {
      for (const depId of artifact.dependencies) {
        edges.push({
          source: depId,
          target: artifact.id,
        })
      }
    }

    return { nodes, edges }
  }

  static async generateArtifactSummary(taskId: string): Promise<{
    total: number
    byType: Record<Artifact['type'], number>
    byStatus: Record<Artifact['status'], number>
    completionPercentage: number
    requirementsCovered: number
    totalRequirements: number
  }> {
    const artifacts = await this.getArtifactsByTask(taskId)
    const { loadTask } = useTaskStore.getState()
    await loadTask(taskId)
    const { currentTask } = useTaskStore.getState()

    const byType: Record<Artifact['type'], number> = {
      document: 0,
      code: 0,
      design: 0,
      analysis: 0,
      plan: 0,
      report: 0,
    }

    const byStatus: Record<Artifact['status'], number> = {
      draft: 0,
      review: 0,
      approved: 0,
      rejected: 0,
      final: 0,
    }

    artifacts.forEach((artifact) => {
      byType[artifact.type]++
      byStatus[artifact.status]++
    })

    const completedArtifacts = artifacts.filter(
      (a) => a.status === 'approved' || a.status === 'final',
    ).length

    const completionPercentage =
      artifacts.length > 0 ? (completedArtifacts / artifacts.length) * 100 : 0

    // Calculate requirements coverage
    const totalRequirements = currentTask?.requirements.length || 0
    const coveredRequirements = new Set()

    artifacts.forEach((artifact) => {
      artifact.validates.forEach((reqId) => coveredRequirements.add(reqId))
    })

    return {
      total: artifacts.length,
      byType,
      byStatus,
      completionPercentage,
      requirementsCovered: coveredRequirements.size,
      totalRequirements,
    }
  }
}
