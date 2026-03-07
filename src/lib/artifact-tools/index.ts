/**
 * Artifact Tools Module
 *
 * Provides tool definitions and types for artifact operations.
 * These tools enable LLM agents to create, read, list, and update
 * shared artifacts during orchestrated task execution.
 *
 * @module lib/artifact-tools
 */

export * from './types'
export * from './service'

// Re-export the pre-defined tool definitions for convenience
export { ARTIFACT_TOOL_DEFINITIONS } from './types'
