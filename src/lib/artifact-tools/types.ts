/**
 * Artifact Tool Types
 *
 * Defines types for artifact tools that enable LLM agents to read, write,
 * list, and update shared artifacts during orchestrated task execution.
 * These tools allow agents to share structured markdown documents between
 * subtasks, enabling iterative workflows like book writing.
 *
 * @module lib/artifact-tools/types
 */

import type { ToolDefinition } from '@/lib/llm/types'
import type { Artifact } from '@/types'

// ============================================================================
// Write Artifact Tool
// ============================================================================

/**
 * Parameters for the write_artifact tool.
 * Creates a new artifact with markdown content that other agents/tasks can read.
 */
export interface WriteArtifactParams {
  /** The task ID this artifact belongs to */
  task_id: string
  /** The agent ID creating the artifact */
  agent_id: string
  /** Human-readable title for the artifact (e.g. "Chapter 1 - Introduction") */
  title: string
  /** The markdown content of the artifact */
  content: string
  /** Optional description of the artifact's purpose */
  description?: string
  /** Optional artifact type override (defaults to auto-detected from content) */
  artifact_type?: Artifact['type']
}

/**
 * Result of the write_artifact operation.
 */
export interface WriteArtifactResult {
  /** Whether the operation succeeded */
  success: boolean
  /** Error message if failed */
  error?: string
  /** The ID of the created artifact */
  artifact_id?: string
  /** Execution duration in milliseconds */
  duration_ms: number
}

// ============================================================================
// Read Artifact Tool
// ============================================================================

/**
 * Parameters for the read_artifact tool.
 * Retrieves the full content of a specific artifact by ID.
 */
export interface ReadArtifactParams {
  /** The artifact ID to read */
  artifact_id: string
}

/**
 * Result of the read_artifact operation.
 */
export interface ReadArtifactResult {
  /** Whether the operation succeeded */
  success: boolean
  /** Error message if failed */
  error?: string
  /** The artifact title */
  title?: string
  /** The full content of the artifact */
  content?: string
  /** The artifact format */
  format?: Artifact['format']
  /** The artifact type */
  artifact_type?: Artifact['type']
  /** Current version number */
  version?: number
  /** Current status */
  status?: Artifact['status']
  /** Description of the artifact */
  description?: string
  /** Execution duration in milliseconds */
  duration_ms: number
}

// ============================================================================
// List Task Artifacts Tool
// ============================================================================

/**
 * Parameters for the list_task_artifacts tool.
 * Lists all artifacts associated with a task (or parent task for subtask context).
 */
export interface ListTaskArtifactsParams {
  /** The task ID to list artifacts for */
  task_id: string
}

/**
 * Summary information for a listed artifact.
 */
export interface ArtifactListItem {
  /** Artifact ID (use with read_artifact to get full content) */
  id: string
  /** Artifact title */
  title: string
  /** Artifact description */
  description: string
  /** Artifact type */
  artifact_type: Artifact['type']
  /** Current status */
  status: Artifact['status']
  /** Version number */
  version: number
  /** Content length in characters */
  content_length: number
  /** Agent that created this artifact */
  agent_id: string
}

/**
 * Result of the list_task_artifacts operation.
 */
export interface ListTaskArtifactsResult {
  /** Whether the operation succeeded */
  success: boolean
  /** Error message if failed */
  error?: string
  /** List of artifact summaries */
  artifacts?: ArtifactListItem[]
  /** Total count of artifacts */
  total_count?: number
  /** Execution duration in milliseconds */
  duration_ms: number
}

// ============================================================================
// Update Artifact Tool
// ============================================================================

/**
 * Parameters for the update_artifact tool.
 * Updates the content of an existing artifact (increments version).
 */
export interface UpdateArtifactParams {
  /** The artifact ID to update */
  artifact_id: string
  /** New content (replaces entire content) */
  content?: string
  /** New title (optional) */
  title?: string
  /** New description (optional) */
  description?: string
}

/**
 * Result of the update_artifact operation.
 */
export interface UpdateArtifactResult {
  /** Whether the operation succeeded */
  success: boolean
  /** Error message if failed */
  error?: string
  /** The new version number after update */
  new_version?: number
  /** Execution duration in milliseconds */
  duration_ms: number
}

// ============================================================================
// Tool Name Type
// ============================================================================

/**
 * Names of all artifact tools.
 */
export type ArtifactToolName =
  | 'write_artifact'
  | 'read_artifact'
  | 'list_task_artifacts'
  | 'update_artifact'

// ============================================================================
// Tool Definitions
// ============================================================================

/**
 * Pre-defined tool definitions for artifact tools.
 * These are passed to the LLM so it knows how to call them.
 */
export const ARTIFACT_TOOL_DEFINITIONS: Record<
  ArtifactToolName,
  ToolDefinition
> = {
  write_artifact: {
    type: 'function',
    function: {
      name: 'write_artifact',
      description:
        'Create a new shared artifact (markdown document) that other agents and tasks can read. ' +
        'Use this to produce structured deliverables like chapters, reports, outlines, or any content ' +
        'that downstream tasks need to build upon. The artifact is persisted and can be read later ' +
        'by other agents via read_artifact.',
      parameters: {
        type: 'object',
        properties: {
          task_id: {
            type: 'string',
            description: 'The ID of the current task this artifact belongs to',
          },
          agent_id: {
            type: 'string',
            description: 'The ID of the agent creating this artifact',
          },
          title: {
            type: 'string',
            description:
              'Human-readable title for the artifact (e.g. "Chapter 1 - Introduction", "Research Findings")',
          },
          content: {
            type: 'string',
            description:
              'The full markdown content of the artifact. Use proper markdown formatting with headers, lists, etc.',
          },
          description: {
            type: 'string',
            description:
              "Optional description of the artifact's purpose and what it contains",
          },
          artifact_type: {
            type: 'string',
            description:
              'Type of artifact: document (default), code, design, analysis, plan, or report',
            enum: ['document', 'code', 'design', 'analysis', 'plan', 'report'],
          },
        },
        required: ['task_id', 'agent_id', 'title', 'content'],
      },
    },
  },

  read_artifact: {
    type: 'function',
    function: {
      name: 'read_artifact',
      description:
        'Read the full content of an existing artifact by its ID. ' +
        'Use this to access documents created by other agents or previous tasks. ' +
        'First use list_task_artifacts to discover available artifacts, then read specific ones.',
      parameters: {
        type: 'object',
        properties: {
          artifact_id: {
            type: 'string',
            description: 'The unique ID of the artifact to read',
          },
        },
        required: ['artifact_id'],
      },
    },
  },

  list_task_artifacts: {
    type: 'function',
    function: {
      name: 'list_task_artifacts',
      description:
        'List all artifacts associated with a task. Returns summary information including ' +
        'titles, types, statuses, and IDs. Use this to discover what documents have been ' +
        'created by sibling or upstream tasks, then use read_artifact to get full content.',
      parameters: {
        type: 'object',
        properties: {
          task_id: {
            type: 'string',
            description:
              'The task ID to list artifacts for. Use the parent task ID to see all sibling artifacts.',
          },
        },
        required: ['task_id'],
      },
    },
  },

  update_artifact: {
    type: 'function',
    function: {
      name: 'update_artifact',
      description:
        'Update an existing artifact with new content. This increments the version number ' +
        'and replaces the content. Use this for iterative refinement — e.g., revising a chapter ' +
        'based on editor feedback, or updating a plan after new information is gathered.',
      parameters: {
        type: 'object',
        properties: {
          artifact_id: {
            type: 'string',
            description: 'The ID of the artifact to update',
          },
          content: {
            type: 'string',
            description:
              'New content to replace the existing content (full replacement)',
          },
          title: {
            type: 'string',
            description: 'Optional new title for the artifact',
          },
          description: {
            type: 'string',
            description: 'Optional new description for the artifact',
          },
        },
        required: ['artifact_id'],
      },
    },
  },
}
