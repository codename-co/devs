/**
 * Knowledge Tools Module
 *
 * Provides tool definitions and types for knowledge base operations.
 * These tools enable LLM agents to search, read, and navigate
 * the user's knowledge base.
 *
 * @module lib/knowledge-tools
 */

export * from './types'
export * from './service'

// Re-export the pre-defined tool definitions for convenience
export { KNOWLEDGE_TOOL_DEFINITIONS } from './types'
