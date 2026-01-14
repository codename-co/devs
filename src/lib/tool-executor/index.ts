/**
 * Tool Executor Module
 *
 * Provides types and utilities for executing LLM tool calls.
 * The tool executor manages:
 * - Tool registration and lookup
 * - Argument validation and parsing
 * - Handler execution with error handling
 * - Result formatting for LLM consumption
 *
 * @module lib/tool-executor
 */

export * from './types'
export {
  KnowledgeToolRegistry,
  KnowledgeToolExecutor,
  defaultRegistry,
  defaultExecutor,
  registerKnowledgeTools,
  areKnowledgeToolsRegistered,
  unregisterKnowledgeTools,
} from './executor'
