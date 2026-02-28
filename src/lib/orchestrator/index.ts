/**
 * Orchestration Engine v2 — Module Index
 *
 * This barrel file exports the entire orchestration engine.
 * The v2 engine replaces the legacy single-file orchestrator with a modular
 * architecture that addresses all competitive gaps:
 *
 * - **agent-runner**: Iterative agentic loop with tool support
 * - **task-decomposer**: LLM-driven intelligent task breakdown
 * - **synthesis-engine**: Dedicated result merger for multi-agent outputs
 * - **task-queue**: Priority queue with async/background execution
 * - **engine**: Main orchestration coordinator
 *
 * @module lib/orchestrator
 */

// Main engine
export {
  orchestrate,
  submitBackground,
  type OrchestrationResult,
  type OrchestrationOptions,
} from './engine'

// Agent runner
export {
  runAgent,
  runAgentSingleShot,
  type AgentRunnerResult,
} from './agent-runner'

// Task decomposer
export {
  decomposeTask,
  type TaskDecomposition,
  type DecomposedTask,
} from './task-decomposer'

// Synthesis engine
export {
  synthesizeResults,
  mergeResults,
  type SynthesisInput,
  type SynthesisResult,
} from './synthesis-engine'

// Task queue
export { TaskQueue, type QueuedTask, type TaskQueueEvent } from './task-queue'

// ============================================================================
// Legacy compatibility — re-export WorkflowOrchestrator facade
// ============================================================================

import {
  orchestrate,
  runningOrchestrations,
  type OrchestrationResult,
} from './engine'

/**
 * Legacy-compatible facade for the v2 orchestration engine.
 * Maintains the same API surface as the original `WorkflowOrchestrator`
 * so that `chat.ts` and other consumers don't break.
 */
export class WorkflowOrchestrator {
  /** Exposed for test cleanup */
  static runningOrchestrations = runningOrchestrations

  static async orchestrateTask(
    prompt: string,
    existingTaskId?: string,
  ): Promise<OrchestrationResult> {
    return orchestrate(prompt, existingTaskId)
  }
}
