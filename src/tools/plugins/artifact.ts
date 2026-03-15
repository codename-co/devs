/**
 * Artifact Tool Plugins
 *
 * Tool plugins for artifact operations.
 * These tools enable LLM agents to create, read, list, and update
 * shared artifacts during orchestrated task execution, supporting
 * iterative workflows like book writing.
 *
 * @module tools/plugins/artifact
 */

import { createToolPlugin } from '../registry'
import type { ToolPlugin } from '../types'
import {
  writeArtifact,
  readArtifact,
  listTaskArtifacts,
  updateArtifact,
  ARTIFACT_TOOL_DEFINITIONS,
} from '@/lib/artifact-tools/service'
import type {
  WriteArtifactParams,
  WriteArtifactResult,
  ReadArtifactParams,
  ReadArtifactResult,
  ListTaskArtifactsParams,
  ListTaskArtifactsResult,
  UpdateArtifactParams,
  UpdateArtifactResult,
} from '@/lib/artifact-tools/types'

// ============================================================================
// Write Artifact Tool Plugin
// ============================================================================

/**
 * Write artifact tool plugin.
 *
 * Creates a new shared artifact (markdown document) that other
 * agents and tasks can read. Used for producing structured
 * deliverables like chapters, reports, or outlines.
 */
export const writeArtifactPlugin: ToolPlugin<
  WriteArtifactParams,
  WriteArtifactResult
> = createToolPlugin({
  metadata: {
    name: 'write_artifact',
    displayName: 'Write Artifact',
    shortDescription: 'Create a shared document artifact',
    icon: 'PagePlus',
    category: 'artifact',
    tags: ['artifact', 'write', 'document', 'markdown', 'share'],
    enabledByDefault: true,
    estimatedDuration: 500,
    requiresConfirmation: false,
  },
  definition: ARTIFACT_TOOL_DEFINITIONS.write_artifact,
  handler: async (args, context) => {
    if (context.abortSignal?.aborted) {
      throw new Error('Aborted')
    }
    // Inject task_id and agent_id from execution context — the LLM does not
    // provide these; they are set programmatically by the orchestration engine.
    return writeArtifact({
      ...args,
      task_id: context.taskId || args.task_id || 'unknown',
      agent_id: context.agentId || args.agent_id || 'unknown',
    })
  },
  validate: (args): WriteArtifactParams => {
    const params = args as WriteArtifactParams

    if (!params.title || typeof params.title !== 'string') {
      throw new Error('title is required and must be a string')
    }

    if (!params.content || typeof params.content !== 'string') {
      throw new Error('content is required and must be a string')
    }

    if (params.title.trim() === '') {
      throw new Error('title cannot be empty')
    }

    if (params.content.trim() === '') {
      throw new Error('content cannot be empty')
    }

    return params
  },
})

// ============================================================================
// Read Artifact Tool Plugin
// ============================================================================

/**
 * Read artifact tool plugin.
 *
 * Retrieves the full content of a specific artifact.
 * Use this after listing artifacts to access complete document content.
 */
export const readArtifactPlugin: ToolPlugin<
  ReadArtifactParams,
  ReadArtifactResult
> = createToolPlugin({
  metadata: {
    name: 'read_artifact',
    displayName: 'Read Artifact',
    shortDescription: 'Read full content of a shared artifact',
    icon: 'Page',
    category: 'artifact',
    tags: ['artifact', 'read', 'document', 'content'],
    enabledByDefault: true,
    estimatedDuration: 200,
    requiresConfirmation: false,
  },
  definition: ARTIFACT_TOOL_DEFINITIONS.read_artifact,
  handler: async (args, context) => {
    if (context.abortSignal?.aborted) {
      throw new Error('Aborted')
    }
    return readArtifact(args)
  },
  validate: (args): ReadArtifactParams => {
    const params = args as ReadArtifactParams

    if (!params.artifact_id || typeof params.artifact_id !== 'string') {
      throw new Error('artifact_id is required and must be a string')
    }

    if (params.artifact_id.trim() === '') {
      throw new Error('artifact_id cannot be empty')
    }

    return params
  },
})

// ============================================================================
// List Task Artifacts Tool Plugin
// ============================================================================

/**
 * List task artifacts tool plugin.
 *
 * Lists all artifacts associated with a task. Returns summaries
 * including titles, types, statuses, and IDs. Use this to discover
 * what documents have been created by sibling or upstream tasks.
 */
export const listTaskArtifactsPlugin: ToolPlugin<
  ListTaskArtifactsParams,
  ListTaskArtifactsResult
> = createToolPlugin({
  metadata: {
    name: 'list_task_artifacts',
    displayName: 'List Task Artifacts',
    shortDescription: 'Browse artifacts for a task',
    icon: 'List',
    category: 'artifact',
    tags: ['artifact', 'list', 'browse', 'task'],
    enabledByDefault: true,
    estimatedDuration: 200,
    requiresConfirmation: false,
  },
  definition: ARTIFACT_TOOL_DEFINITIONS.list_task_artifacts,
  handler: async (args, context) => {
    if (context.abortSignal?.aborted) {
      throw new Error('Aborted')
    }
    // Inject task_id from execution context
    return listTaskArtifacts({
      ...args,
      task_id: context.taskId || args.task_id || 'unknown',
    })
  },
  validate: (args): ListTaskArtifactsParams => {
    return args as ListTaskArtifactsParams
  },
})

// ============================================================================
// Update Artifact Tool Plugin
// ============================================================================

/**
 * Update artifact tool plugin.
 *
 * Updates an existing artifact with new content. Increments the
 * version number for tracking. Use this for iterative refinement
 * workflows — e.g., revising a chapter based on editor feedback.
 */
export const updateArtifactPlugin: ToolPlugin<
  UpdateArtifactParams,
  UpdateArtifactResult
> = createToolPlugin({
  metadata: {
    name: 'update_artifact',
    displayName: 'Update Artifact',
    shortDescription: 'Update content of a shared artifact',
    icon: 'PageEdit',
    category: 'artifact',
    tags: ['artifact', 'update', 'revise', 'document'],
    enabledByDefault: true,
    estimatedDuration: 300,
    requiresConfirmation: false,
  },
  definition: ARTIFACT_TOOL_DEFINITIONS.update_artifact,
  handler: async (args, context) => {
    if (context.abortSignal?.aborted) {
      throw new Error('Aborted')
    }
    return updateArtifact(args)
  },
  validate: (args): UpdateArtifactParams => {
    const params = args as UpdateArtifactParams

    if (!params.artifact_id || typeof params.artifact_id !== 'string') {
      throw new Error('artifact_id is required and must be a string')
    }

    if (params.artifact_id.trim() === '') {
      throw new Error('artifact_id cannot be empty')
    }

    if (!params.content && !params.title && !params.description) {
      throw new Error(
        'At least one of content, title, or description must be provided',
      )
    }

    return params
  },
})

// ============================================================================
// Export All Artifact Plugins
// ============================================================================

/**
 * Array of all artifact tool plugins.
 */
export const artifactPlugins = [
  writeArtifactPlugin,
  readArtifactPlugin,
  listTaskArtifactsPlugin,
  updateArtifactPlugin,
] as const
