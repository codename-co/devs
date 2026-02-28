/**
 * Synthesis Engine
 *
 * After parallel agents complete their work, this engine merges, ranks,
 * filters, and formats results into a unified deliverable.
 *
 * Without synthesis, users get N raw outputs instead of one coherent answer.
 * This is the "dedicated result synthesis" pattern from Manus Wide Research
 * and Perplexity Research Mode.
 *
 * @module lib/orchestrator/synthesis-engine
 */

import { LLMService, LLMMessage } from '@/lib/llm'
import { CredentialService } from '@/lib/credential-service'
import type { Agent, AgentScope } from '@/types'

// ============================================================================
// Types
// ============================================================================

export interface SynthesisInput {
  /** The original user prompt */
  originalPrompt: string
  /** Sub-task results to synthesize */
  results: Array<{
    taskTitle: string
    taskDescription: string
    agentName: string
    content: string
  }>
  /** The agent performing synthesis (optional — uses default if not provided) */
  synthesisAgent?: Agent
  /** Scope overrides for the synthesis LLM call */
  scope?: AgentScope
  /** Abort signal */
  signal?: AbortSignal
}

export interface SynthesisResult {
  /** The unified, synthesized response */
  content: string
  /** Whether synthesis was successful */
  success: boolean
  /** Any issues encountered */
  warnings?: string[]
}

// ============================================================================
// Synthesis Prompt
// ============================================================================

const SYNTHESIS_SYSTEM_PROMPT = `You are an expert synthesis agent. Your job is to merge multiple sub-task outputs into a single, unified, high-quality deliverable.

## Principles
1. **Coherence**: The final output should read as one unified document, not a collection of parts
2. **Completeness**: Incorporate key findings, decisions, and deliverables from ALL sub-task outputs
3. **Quality**: Resolve contradictions, remove redundancies, and ensure consistency
4. **Structure**: Use clear headings, sections, and formatting for readability
5. **Attribution**: When sub-tasks provide different perspectives, present them fairly
6. **Actionability**: End with clear conclusions, recommendations, or next steps when appropriate

## Output Format
Produce a well-structured markdown document that directly addresses the original request.
Do NOT include meta-commentary about the synthesis process itself.`

// ============================================================================
// Public API
// ============================================================================

/**
 * Synthesizes multiple sub-task results into a unified deliverable.
 *
 * Uses a dedicated LLM call with a synthesis-optimized prompt.
 * Always uses the most powerful available model for synthesis quality.
 */
export async function synthesizeResults(
  input: SynthesisInput,
): Promise<SynthesisResult> {
  const { originalPrompt, results, scope, signal } = input

  if (results.length === 0) {
    return {
      content: '',
      success: false,
      warnings: ['No results to synthesize'],
    }
  }

  // If only one result, no synthesis needed
  if (results.length === 1) {
    return { content: results[0].content, success: true }
  }

  try {
    const config = await CredentialService.getActiveConfig()
    if (!config) {
      throw new Error('No AI provider configured')
    }

    // Apply scope overrides (prefer powerful model for synthesis)
    if (scope?.model) config.model = scope.model
    if (scope?.provider) config.provider = scope.provider
    if (signal) config.signal = signal

    // Build the synthesis user message
    let userContent = `## Original Request\n${originalPrompt}\n\n## Sub-Task Results\n\n`

    for (const result of results) {
      userContent += `### ${result.taskTitle}\n`
      userContent += `*Agent: ${result.agentName}*\n`
      if (result.taskDescription) {
        userContent += `*Task: ${result.taskDescription}*\n`
      }
      userContent += `\n${result.content}\n\n---\n\n`
    }

    userContent += `\nPlease synthesize the above sub-task results into a single, unified response that fully addresses the original request.`

    const messages: LLMMessage[] = [
      { role: 'system', content: SYNTHESIS_SYSTEM_PROMPT },
      { role: 'user', content: userContent },
    ]

    let response = ''
    for await (const chunk of LLMService.streamChat(messages, config)) {
      response += chunk
    }

    return {
      content: response,
      success: true,
    }
  } catch (error) {
    console.error('❌ Synthesis failed:', error)

    // Fallback: concatenate results with headers
    const fallbackContent = results
      .map((r) => `## ${r.taskTitle}\n\n${r.content}`)
      .join('\n\n---\n\n')

    return {
      content: fallbackContent,
      success: false,
      warnings: [
        `Synthesis failed (${error instanceof Error ? error.message : 'Unknown error'}), results concatenated as fallback`,
      ],
    }
  }
}

/**
 * Quick merge — simply concatenates results with structure.
 * Used when synthesis is not needed or as a fast alternative.
 */
export function mergeResults(
  results: Array<{ taskTitle: string; content: string }>,
): string {
  if (results.length === 0) return ''
  if (results.length === 1) return results[0].content

  return results
    .map((r) => `## ${r.taskTitle}\n\n${r.content}`)
    .join('\n\n---\n\n')
}
