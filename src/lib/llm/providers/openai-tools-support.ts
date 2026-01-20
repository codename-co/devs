/**
 * OpenAI-Compatible Tools Support
 *
 * This module provides shared utilities for adding tool/function calling
 * support to OpenAI-compatible providers. It follows the OpenAI API format
 * which is used by Google (via OpenAI-compatible endpoint), Mistral, OpenRouter,
 * and other OpenAI-compatible services.
 *
 * @module lib/llm/providers/openai-tools-support
 */

import { ToolCall, LLMConfigWithTools } from '../types'
import { LLMConfig } from '@/types'

/**
 * Add tools configuration to an OpenAI-compatible request body.
 * This is the standard format used by OpenAI, Google (OpenAI-compatible), Mistral, etc.
 */
export function addToolsToRequestBody(
  requestBody: Record<string, unknown>,
  config?: Partial<LLMConfig> & LLMConfigWithTools,
): void {
  if (config?.tools && config.tools.length > 0) {
    requestBody.tools = config.tools
    if (config.tool_choice) {
      requestBody.tool_choice = config.tool_choice
    }
    if (config.parallel_tool_calls !== undefined) {
      requestBody.parallel_tool_calls = config.parallel_tool_calls
    }
  }
}

/**
 * Parse tool_calls from an OpenAI-compatible API response message.
 * Returns undefined if no tool calls are present.
 */
export function parseToolCallsFromResponse(
  message: Record<string, unknown>,
): ToolCall[] | undefined {
  const toolCalls = message.tool_calls as
    | Array<Record<string, unknown>>
    | undefined
  if (!toolCalls || toolCalls.length === 0) {
    return undefined
  }

  return toolCalls.map((tc) => ({
    id: tc.id as string,
    type: 'function' as const,
    function: {
      name: (tc.function as Record<string, unknown>).name as string,
      arguments: (tc.function as Record<string, unknown>).arguments as string,
    },
  }))
}

/**
 * Accumulator for building tool calls from streaming deltas.
 */
export interface ToolCallAccumulator {
  id: string
  name: string
  arguments: string
}

/**
 * Process a streaming delta for tool calls.
 * Returns the accumulated tool calls when streaming is complete.
 */
export function processStreamingToolCallDelta(
  toolCallAccumulators: Map<number, ToolCallAccumulator>,
  toolCallDeltas: Array<Record<string, unknown>>,
): void {
  for (const tcDelta of toolCallDeltas) {
    const index = tcDelta.index as number
    if (!toolCallAccumulators.has(index)) {
      toolCallAccumulators.set(index, {
        id: (tcDelta.id as string) || '',
        name: '',
        arguments: '',
      })
    }
    const acc = toolCallAccumulators.get(index)!
    if (tcDelta.id) acc.id = tcDelta.id as string
    const fn = tcDelta.function as Record<string, string> | undefined
    if (fn?.name) acc.name = fn.name
    if (fn?.arguments) acc.arguments += fn.arguments
  }
}

/**
 * Convert accumulated tool calls to the final format.
 */
export function finalizeAccumulatedToolCalls(
  toolCallAccumulators: Map<number, ToolCallAccumulator>,
): ToolCall[] {
  return Array.from(toolCallAccumulators.values()).map((tc) => ({
    id: tc.id,
    type: 'function' as const,
    function: { name: tc.name, arguments: tc.arguments },
  }))
}

/**
 * Yield tool calls as a special marker in streaming responses.
 * This format is used to signal tool calls at the end of a stream.
 */
export function formatToolCallsForStream(toolCalls: ToolCall[]): string {
  return `\n__TOOL_CALLS__${JSON.stringify(toolCalls)}`
}
