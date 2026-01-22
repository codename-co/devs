import { useTaskStore } from '@/stores/taskStore'
import { useArtifactStore } from '@/stores/artifactStore'
import { ValidationResult } from '@/lib/requirement-validator'
import { successToast, warningToast } from '@/lib/toast'
import { notifyError } from '@/features/notifications'

/**
 * Hook for validating task requirements at key execution points
 */
export function useTaskValidation() {
  const { validateAndUpdateRequirements, markRequirementSatisfied } =
    useTaskStore()

  /**
   * Validate requirements after completing a task step
   */
  const validateAfterStep = async (taskId: string, stepName: string) => {
    try {
      console.log(`🔍 Validating requirements after step: ${stepName}`)

      const validation = await validateAndUpdateRequirements(taskId)

      // Report validation results
      const satisfied = validation.results.filter(
        (r) => r.status === 'satisfied',
      ).length
      const pending = validation.results.filter(
        (r) => r.status === 'pending',
      ).length
      const failed = validation.results.filter(
        (r) => r.status === 'failed',
      ).length

      console.log(
        `📊 Requirements Status: ${satisfied} satisfied, ${pending} pending, ${failed} failed`,
      )
      console.log(
        `📈 Overall satisfaction rate: ${validation.satisfactionRate}%`,
      )

      // Notify about newly satisfied requirements
      const newlySatisfied = validation.results.filter(
        (r) => r.status === 'satisfied',
      )
      if (newlySatisfied.length > 0) {
        successToast(
          `Requirements Progress`,
          `${newlySatisfied.length} requirement(s) now satisfied after ${stepName}`,
        )
      }

      // Warn about failed requirements
      const failedRequirements = validation.results.filter(
        (r) => r.status === 'failed',
      )
      if (failedRequirements.length > 0) {
        warningToast(
          `Requirements Issue`,
          `${failedRequirements.length} requirement(s) failed validation`,
        )
      }

      return validation
    } catch (error) {
      console.error('Error validating requirements after step:', error)
      notifyError({
        title: 'Validation Error',
        description: 'Failed to validate requirements',
      })
      return null
    }
  }

  /**
   * Validate requirements when task is marked as completed
   */
  const validateTaskCompletion = async (taskId: string) => {
    try {
      console.log(`🏁 Final validation for task completion: ${taskId}`)

      const validation = await validateAndUpdateRequirements(taskId)

      if (validation.allSatisfied) {
        successToast('Task Completed', 'All requirements have been satisfied!')
        console.log('✅ All requirements satisfied - task ready for completion')
        return { canComplete: true, validation }
      } else {
        const unsatisfied = validation.results.filter(
          (r) => r.status !== 'satisfied',
        )
        warningToast(
          'Requirements Not Met',
          `${unsatisfied.length} requirement(s) still need attention before task completion`,
        )
        console.log('❌ Not all requirements satisfied:')
        unsatisfied.forEach((req) => {
          console.log(`  - ${req.message} (${req.status})`)
        })
        return { canComplete: false, validation, unsatisfied }
      }
    } catch (error) {
      console.error('Error validating task completion:', error)
      notifyError({
        title: 'Validation Error',
        description: 'Failed to validate task completion',
      })
      return { canComplete: false, validation: null }
    }
  }

  /**
   * Validate requirements after creating an artifact
   */
  const validateAfterArtifact = async (
    taskId: string,
    artifactTitle: string,
  ) => {
    try {
      console.log(
        `📄 Validating requirements after artifact creation: ${artifactTitle}`,
      )

      const validation = await validateAndUpdateRequirements(taskId)

      // Check if any requirements were satisfied by this artifact
      const newlySatisfied = validation.results.filter(
        (r) =>
          r.status === 'satisfied' &&
          r.evidence?.some((e) =>
            e.toLowerCase().includes(artifactTitle.toLowerCase()),
          ),
      )

      if (newlySatisfied.length > 0) {
        successToast(
          'Requirements Progress',
          `Artifact "${artifactTitle}" satisfied ${newlySatisfied.length} requirement(s)`,
        )
      }

      return validation
    } catch (error) {
      console.error('Error validating requirements after artifact:', error)
      return null
    }
  }

  /**
   * Manually mark a requirement as satisfied with evidence
   */
  const markSatisfied = async (
    taskId: string,
    requirementId: string,
    evidence: string[],
  ) => {
    try {
      await markRequirementSatisfied(taskId, requirementId, evidence)

      // Re-validate to update overall status
      const validation = await validateAndUpdateRequirements(taskId)

      console.log(`✅ Requirement manually marked as satisfied`)
      console.log(
        `📈 Updated satisfaction rate: ${validation.satisfactionRate}%`,
      )

      return validation
    } catch (error) {
      console.error('Error marking requirement as satisfied:', error)
      return null
    }
  }

  /**
   * Get current requirement validation status
   */
  const getCurrentValidationStatus = async (taskId: string) => {
    try {
      return await validateAndUpdateRequirements(taskId)
    } catch (error) {
      console.error('Error getting validation status:', error)
      return null
    }
  }

  return {
    validateAfterStep,
    validateTaskCompletion,
    validateAfterArtifact,
    markSatisfied,
    getCurrentValidationStatus,
  }
}

/**
 * Utility function to log requirement validation results
 */
export function logValidationResults(
  results: ValidationResult[],
  context?: string,
) {
  const prefix = context ? `[${context}] ` : ''

  console.group(`${prefix}📋 Requirement Validation Results`)

  results.forEach((result) => {
    const icon =
      result.status === 'satisfied'
        ? '✅'
        : result.status === 'failed'
          ? '❌'
          : '⏳'

    console.log(`${icon} ${result.message}`)

    if (result.evidence && result.evidence.length > 0) {
      console.log(`   Evidence:`, result.evidence)
    }
  })

  const satisfied = results.filter((r) => r.status === 'satisfied').length
  const total = results.length

  console.log(
    `📊 Summary: ${satisfied}/${total} requirements satisfied (${Math.round((satisfied / total) * 100)}%)`,
  )
  console.groupEnd()
}

/**
 * Helper function to create validation artifacts for requirements tracking
 */
export async function createValidationArtifact(
  taskId: string,
  agentId: string,
  validationResults: ValidationResult[],
): Promise<void> {
  try {
    const { createArtifact } = useArtifactStore.getState()

    const satisfied = validationResults.filter((r) => r.status === 'satisfied')
    const pending = validationResults.filter((r) => r.status === 'pending')
    const failed = validationResults.filter((r) => r.status === 'failed')

    const content = `# Requirement Validation Report

## Summary
- **Total Requirements**: ${validationResults.length}
- **Satisfied**: ${satisfied.length}
- **Pending**: ${pending.length}
- **Failed**: ${failed.length}
- **Satisfaction Rate**: ${Math.round((satisfied.length / validationResults.length) * 100)}%

## Detailed Results

${validationResults
  .map(
    (result) => `
### ${result.status === 'satisfied' ? '✅' : result.status === 'failed' ? '❌' : '⏳'} Requirement: ${result.requirementId}

**Status**: ${result.status}
**Message**: ${result.message}
**Validated At**: ${result.validatedAt.toISOString()}

${
  result.evidence && result.evidence.length > 0
    ? `
**Evidence**:
${result.evidence.map((e) => `- ${e}`).join('\n')}
`
    : ''
}
`,
  )
  .join('\n')}

---
*Generated on ${new Date().toISOString()}*
`

    await createArtifact({
      taskId,
      agentId,
      title: `Requirement Validation Report`,
      description: `Automated validation results for task requirements (${satisfied.length}/${validationResults.length} satisfied)`,
      type: 'report',
      format: 'markdown',
      content,
      status: 'final',
      version: 1,
      dependencies: [],
      validates: validationResults.map((r) => r.requirementId),
    })

    console.log('📄 Validation artifact created successfully')
  } catch (error) {
    console.error('Error creating validation artifact:', error)
  }
}
