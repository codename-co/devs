/**
 * Artifact Tools Service
 *
 * Provides tool handler implementations for artifact operations.
 * These tools enable LLM agents to create, read, list, and update
 * shared artifacts during orchestrated task execution.
 *
 * @module lib/artifact-tools/service
 */

import { useArtifactStore } from '@/stores/artifactStore'
import type {
  WriteArtifactParams,
  WriteArtifactResult,
  ReadArtifactParams,
  ReadArtifactResult,
  ListTaskArtifactsParams,
  ListTaskArtifactsResult,
  UpdateArtifactParams,
  UpdateArtifactResult,
  ArtifactListItem,
} from './types'
import type { Artifact } from '@/types'

// Re-export definitions for convenience
export { ARTIFACT_TOOL_DEFINITIONS } from './types'

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Infer an artifact type from content heuristics.
 */
function inferArtifactType(content: string): Artifact['type'] {
  const lower = content.toLowerCase()
  if (
    lower.includes('```') ||
    lower.includes('function') ||
    lower.includes('class')
  )
    return 'code'
  if (lower.includes('analysis') || lower.includes('findings'))
    return 'analysis'
  if (lower.includes('design') || lower.includes('architecture'))
    return 'design'
  if (lower.includes('plan') || lower.includes('roadmap')) return 'plan'
  if (lower.includes('report') || lower.includes('summary')) return 'report'
  return 'document'
}

// ============================================================================
// writeArtifact
// ============================================================================

/**
 * Create a new shared artifact with markdown content.
 *
 * @param params - Write artifact parameters
 * @returns Write operation result with artifact ID
 */
export async function writeArtifact(
  params: WriteArtifactParams,
): Promise<WriteArtifactResult> {
  const startTime = performance.now()

  try {
    // Validate required parameters
    if (
      !params.task_id ||
      typeof params.task_id !== 'string' ||
      params.task_id.trim() === ''
    ) {
      return {
        success: false,
        error: 'task_id is required and must be a non-empty string',
        duration_ms: performance.now() - startTime,
      }
    }

    if (
      !params.agent_id ||
      typeof params.agent_id !== 'string' ||
      params.agent_id.trim() === ''
    ) {
      return {
        success: false,
        error: 'agent_id is required and must be a non-empty string',
        duration_ms: performance.now() - startTime,
      }
    }

    if (
      !params.title ||
      typeof params.title !== 'string' ||
      params.title.trim() === ''
    ) {
      return {
        success: false,
        error: 'title is required and must be a non-empty string',
        duration_ms: performance.now() - startTime,
      }
    }

    if (
      !params.content ||
      typeof params.content !== 'string' ||
      params.content.trim() === ''
    ) {
      return {
        success: false,
        error: 'content is required and must be a non-empty string',
        duration_ms: performance.now() - startTime,
      }
    }

    const artifactType =
      params.artifact_type || inferArtifactType(params.content)

    const { createArtifact } = useArtifactStore.getState()
    const artifact = await createArtifact({
      taskId: params.task_id,
      agentId: params.agent_id,
      title: params.title,
      description: params.description || `Artifact created by agent`,
      type: artifactType,
      format: 'markdown',
      content: params.content,
      version: 1,
      status: 'draft',
      dependencies: [],
      validates: [],
      reviewedBy: [],
    })

    return {
      success: true,
      artifact_id: artifact.id,
      duration_ms: performance.now() - startTime,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      duration_ms: performance.now() - startTime,
    }
  }
}

// ============================================================================
// readArtifact
// ============================================================================

/**
 * Read the full content of an existing artifact by ID.
 *
 * @param params - Read artifact parameters
 * @returns Read operation result with content
 */
export async function readArtifact(
  params: ReadArtifactParams,
): Promise<ReadArtifactResult> {
  const startTime = performance.now()

  try {
    if (
      !params.artifact_id ||
      typeof params.artifact_id !== 'string' ||
      params.artifact_id.trim() === ''
    ) {
      return {
        success: false,
        error: 'artifact_id is required and must be a non-empty string',
        duration_ms: performance.now() - startTime,
      }
    }

    const { artifacts } = useArtifactStore.getState()
    const artifact = artifacts.find((a) => a.id === params.artifact_id)

    if (!artifact) {
      return {
        success: false,
        error: `Artifact not found: ${params.artifact_id}`,
        duration_ms: performance.now() - startTime,
      }
    }

    return {
      success: true,
      title: artifact.title,
      content: artifact.content,
      format: artifact.format,
      artifact_type: artifact.type,
      version: artifact.version,
      status: artifact.status,
      description: artifact.description,
      duration_ms: performance.now() - startTime,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      duration_ms: performance.now() - startTime,
    }
  }
}

// ============================================================================
// listTaskArtifacts
// ============================================================================

/**
 * List all artifacts associated with a task.
 *
 * @param params - List task artifacts parameters
 * @returns List of artifact summaries
 */
export async function listTaskArtifacts(
  params: ListTaskArtifactsParams,
): Promise<ListTaskArtifactsResult> {
  const startTime = performance.now()

  try {
    if (
      !params.task_id ||
      typeof params.task_id !== 'string' ||
      params.task_id.trim() === ''
    ) {
      return {
        success: false,
        error: 'task_id is required and must be a non-empty string',
        duration_ms: performance.now() - startTime,
      }
    }

    const { getArtifactsByTask } = useArtifactStore.getState()
    const taskArtifacts = getArtifactsByTask(params.task_id)

    const items: ArtifactListItem[] = taskArtifacts.map((artifact) => ({
      id: artifact.id,
      title: artifact.title,
      description: artifact.description,
      artifact_type: artifact.type,
      status: artifact.status,
      version: artifact.version,
      content_length: artifact.content?.length || 0,
      agent_id: artifact.agentId,
    }))

    return {
      success: true,
      artifacts: items,
      total_count: items.length,
      duration_ms: performance.now() - startTime,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      duration_ms: performance.now() - startTime,
    }
  }
}

// ============================================================================
// updateArtifact
// ============================================================================

/**
 * Update an existing artifact with new content (increments version).
 *
 * @param params - Update artifact parameters
 * @returns Update operation result with new version
 */
export async function updateArtifact(
  params: UpdateArtifactParams,
): Promise<UpdateArtifactResult> {
  const startTime = performance.now()

  try {
    if (
      !params.artifact_id ||
      typeof params.artifact_id !== 'string' ||
      params.artifact_id.trim() === ''
    ) {
      return {
        success: false,
        error: 'artifact_id is required and must be a non-empty string',
        duration_ms: performance.now() - startTime,
      }
    }

    // Must provide at least one field to update
    if (!params.content && !params.title && !params.description) {
      return {
        success: false,
        error:
          'At least one of content, title, or description must be provided',
        duration_ms: performance.now() - startTime,
      }
    }

    const { artifacts, updateArtifact: storeUpdate } =
      useArtifactStore.getState()
    const existing = artifacts.find((a) => a.id === params.artifact_id)

    if (!existing) {
      return {
        success: false,
        error: `Artifact not found: ${params.artifact_id}`,
        duration_ms: performance.now() - startTime,
      }
    }

    const updates: Partial<Artifact> = {
      version: (existing.version || 1) + 1,
    }
    if (params.content !== undefined) updates.content = params.content
    if (params.title !== undefined) updates.title = params.title
    if (params.description !== undefined)
      updates.description = params.description

    await storeUpdate(params.artifact_id, updates)

    return {
      success: true,
      new_version: updates.version,
      duration_ms: performance.now() - startTime,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      duration_ms: performance.now() - startTime,
    }
  }
}
