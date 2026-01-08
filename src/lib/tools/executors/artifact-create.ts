/**
 * Artifact Creation Tool Executor
 *
 * Creates artifacts and saves them to the artifact store.
 * Links artifacts to conversations and tasks for context tracking.
 */

import type { ToolExecutor, ToolExecutionContext } from '../tool-registry'
import { useArtifactStore } from '@/stores/artifactStore'
import type { Artifact } from '@/types'

export type ArtifactType =
  | 'document'
  | 'code'
  | 'design'
  | 'analysis'
  | 'plan'
  | 'report'
export type ArtifactFormat = 'markdown' | 'json' | 'code' | 'html'

export interface ArtifactCreateParams {
  title: string
  type: ArtifactType
  format: ArtifactFormat
  content: string
  description?: string
}

/**
 * Create an artifact and save it to the store
 */
export async function executeArtifactCreate(
  params: ArtifactCreateParams,
  context: ToolExecutionContext,
): Promise<{ artifactId: string; artifact: Artifact }> {
  const { createArtifact } = useArtifactStore.getState()

  const artifact = await createArtifact({
    title: params.title,
    type: params.type,
    format: params.format,
    content: params.content,
    description:
      params.description || `Created by agent ${context.agentId || 'unknown'}`,
    taskId: context.taskId || '',
    agentId: context.agentId || '',
    status: 'draft',
    version: 1,
    dependencies: [],
    // Link to requirement validation if available
    validates: [],
  })

  return {
    artifactId: artifact.id,
    artifact,
  }
}

/**
 * Format artifact creation result for LLM
 */
function formatArtifactResult(artifact: Artifact): string {
  return `## Artifact Created Successfully

**Title:** ${artifact.title}
**ID:** ${artifact.id}
**Type:** ${artifact.type}
**Format:** ${artifact.format}

The artifact has been saved and is now available in the Artifacts panel.`
}

/**
 * Artifact creation tool executor
 */
export const artifactCreateExecutor: ToolExecutor = async (args, context) => {
  const { title, type, format, content, description } = args as {
    title: string
    type: ArtifactType
    format: ArtifactFormat
    content: string
    description?: string
  }

  // Validate required parameters
  if (!title || typeof title !== 'string') {
    return {
      success: false,
      content: '',
      error: {
        code: 'INVALID_ARGS',
        message: 'Title parameter is required and must be a string',
      },
    }
  }

  if (!content || typeof content !== 'string') {
    return {
      success: false,
      content: '',
      error: {
        code: 'INVALID_ARGS',
        message: 'Content parameter is required and must be a string',
      },
    }
  }

  const validTypes: ArtifactType[] = [
    'document',
    'code',
    'design',
    'analysis',
    'plan',
    'report',
  ]
  if (!type || !validTypes.includes(type)) {
    return {
      success: false,
      content: '',
      error: {
        code: 'INVALID_ARGS',
        message: `Type must be one of: ${validTypes.join(', ')}`,
      },
    }
  }

  const validFormats: ArtifactFormat[] = ['markdown', 'json', 'code', 'html']
  if (!format || !validFormats.includes(format)) {
    return {
      success: false,
      content: '',
      error: {
        code: 'INVALID_ARGS',
        message: `Format must be one of: ${validFormats.join(', ')}`,
      },
    }
  }

  try {
    const { artifact } = await executeArtifactCreate(
      { title, type, format, content, description },
      context || {},
    )

    return {
      success: true,
      content: formatArtifactResult(artifact),
      metadata: {
        source: 'artifact-store',
        artifactId: artifact.id,
        artifactType: artifact.type,
        contentLength: content.length,
      },
    }
  } catch (error) {
    return {
      success: false,
      content: '',
      error: {
        code: 'ARTIFACT_CREATE_ERROR',
        message:
          error instanceof Error ? error.message : 'Failed to create artifact',
      },
    }
  }
}

/**
 * Update an existing artifact
 */
export const artifactUpdateExecutor: ToolExecutor = async (args, _context) => {
  const { artifactId, updates } = args as {
    artifactId: string
    updates: Partial<
      Pick<Artifact, 'title' | 'content' | 'description' | 'status'>
    >
  }

  if (!artifactId || typeof artifactId !== 'string') {
    return {
      success: false,
      content: '',
      error: {
        code: 'INVALID_ARGS',
        message: 'Artifact ID is required',
      },
    }
  }

  try {
    const { updateArtifact, artifacts } = useArtifactStore.getState()

    // Check if artifact exists
    const existing = artifacts.find((a) => a.id === artifactId)
    if (!existing) {
      return {
        success: false,
        content: '',
        error: {
          code: 'NOT_FOUND',
          message: `Artifact with ID ${artifactId} not found`,
        },
      }
    }

    await updateArtifact(artifactId, updates)

    return {
      success: true,
      content: `Artifact "${existing.title}" (${artifactId}) has been updated.`,
      metadata: {
        source: 'artifact-store',
        artifactId,
      },
    }
  } catch (error) {
    return {
      success: false,
      content: '',
      error: {
        code: 'ARTIFACT_UPDATE_ERROR',
        message:
          error instanceof Error ? error.message : 'Failed to update artifact',
      },
    }
  }
}

/**
 * List artifacts for a task or agent
 */
export const artifactListExecutor: ToolExecutor = async (args, _context) => {
  const {
    taskId,
    agentId,
    type,
    limit = 10,
  } = args as {
    taskId?: string
    agentId?: string
    type?: ArtifactType
    limit?: number
  }

  try {
    const {
      artifacts,
      getArtifactsByTask,
      getArtifactsByAgent,
      getArtifactsByType,
    } = useArtifactStore.getState()

    let results: Artifact[]

    if (taskId) {
      results = getArtifactsByTask(taskId)
    } else if (agentId) {
      results = getArtifactsByAgent(agentId)
    } else if (type) {
      results = getArtifactsByType(type)
    } else {
      results = artifacts
    }

    // Apply limit
    results = results.slice(0, limit)

    if (results.length === 0) {
      return {
        success: true,
        content: 'No artifacts found matching the criteria.',
        metadata: { source: 'artifact-store', count: 0 },
      }
    }

    const formatted = results.map((a, i) => {
      return `${i + 1}. **${a.title}** (${a.type})
   ID: ${a.id}
   Status: ${a.status}
   Created: ${a.createdAt.toISOString()}`
    })

    return {
      success: true,
      content: `## Artifacts\n\n${formatted.join('\n\n')}`,
      metadata: {
        source: 'artifact-store',
        count: results.length,
      },
    }
  } catch (error) {
    return {
      success: false,
      content: '',
      error: {
        code: 'ARTIFACT_LIST_ERROR',
        message:
          error instanceof Error ? error.message : 'Failed to list artifacts',
      },
    }
  }
}
