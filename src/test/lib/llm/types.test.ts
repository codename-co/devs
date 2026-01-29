/**
 * Tests for LLM Types Utilities
 *
 * Tests the shared utility functions in the LLM types module.
 */

import { describe, it, expect } from 'vitest'
import { stripModelPrefix } from '@/lib/llm/types'

describe('stripModelPrefix', () => {
  it('should strip provider prefix from model ID', () => {
    expect(stripModelPrefix('google/gemini-2.5-flash', 'default-model')).toBe(
      'gemini-2.5-flash',
    )
  })

  it('should strip anthropic prefix from model ID', () => {
    expect(
      stripModelPrefix('anthropic/claude-haiku-4-5', 'default-model'),
    ).toBe('claude-haiku-4-5')
  })

  it('should strip openai prefix from model ID', () => {
    expect(stripModelPrefix('openai/gpt-4o', 'default-model')).toBe('gpt-4o')
  })

  it('should handle model ID without prefix', () => {
    expect(stripModelPrefix('gemini-2.0-flash', 'default-model')).toBe(
      'gemini-2.0-flash',
    )
  })

  it('should return default model when modelWithPrefix is undefined', () => {
    expect(stripModelPrefix(undefined, 'default-model')).toBe('default-model')
  })

  it('should handle empty string by using default', () => {
    expect(stripModelPrefix('', 'default-model')).toBe('default-model')
  })

  it('should handle nested provider paths correctly', () => {
    // Some providers might have paths like "vertex-ai/google/gemini-2.5-flash"
    // This should keep everything after the first slash
    expect(
      stripModelPrefix('vertex-ai/google/gemini-2.5-flash', 'default-model'),
    ).toBe('google/gemini-2.5-flash')
  })

  it('should handle model names with slashes in version', () => {
    // Some model names might have slashes in them (e.g., "meta-llama/Llama-2-7b-chat-hf")
    // When prefixed: "huggingface/meta-llama/Llama-2-7b-chat-hf"
    // Should strip only the first prefix
    expect(
      stripModelPrefix(
        'huggingface/meta-llama/Llama-2-7b-chat-hf',
        'default-model',
      ),
    ).toBe('meta-llama/Llama-2-7b-chat-hf')
  })
})
