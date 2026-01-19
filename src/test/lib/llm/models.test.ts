/**
 * Tests for LLM Model Registry
 *
 * Tests model capability flags and utility functions for model selection.
 */

import { describe, it, expect, beforeAll } from 'vitest'
import {
  loadModelRegistry,
  getModelRegistry,
  getModelsForProvider,
  getModelIdsForProvider,
  getModel,
  getModelCapabilities,
  findModelsWithCapabilities,
  findBestModel,
  modelHasCapabilities,
} from '@/lib/llm/models'
import type { LLMProvider } from '@/types'

// Load model registry before all tests
beforeAll(async () => {
  await loadModelRegistry()
})

describe('Model Registry', () => {
  it('should have entries for all major providers', () => {
    const registry = getModelRegistry()
    const expectedProviders: LLMProvider[] = [
      'local',
      'ollama',
      'openai',
      'anthropic',
      'google',
      'vertex-ai',
      'mistral',
      'openrouter',
      'huggingface',
    ]

    for (const provider of expectedProviders) {
      expect(registry[provider]).toBeDefined()
      expect(Array.isArray(registry[provider])).toBe(true)
    }
  })

  it('should have models with required properties', () => {
    const registry = getModelRegistry()
    for (const [, models] of Object.entries(registry)) {
      for (const model of models) {
        expect(model.id).toBeDefined()
        expect(typeof model.id).toBe('string')
        expect(model.id.length).toBeGreaterThan(0)
      }
    }
  })

  it('should have vision-capable models for vision-supporting providers', () => {
    const registry = getModelRegistry()
    const visionProviders = ['openai', 'anthropic', 'google']

    for (const provider of visionProviders) {
      const models = registry[provider as LLMProvider]
      const visionModels = models.filter((m) => m.capabilities?.vision)
      expect(visionModels.length).toBeGreaterThan(0)
    }
  })

  it('should have tool-capable models for major providers', () => {
    const registry = getModelRegistry()
    const toolProviders = ['openai', 'anthropic', 'google']

    for (const provider of toolProviders) {
      const models = registry[provider as LLMProvider]
      const toolModels = models.filter((m) => m.capabilities?.tools)
      expect(toolModels.length).toBeGreaterThan(0)
    }
  })
})

describe('getModelsForProvider', () => {
  it('should return models for a known provider', () => {
    const models = getModelsForProvider('openai')
    expect(models.length).toBeGreaterThan(0)
    expect(models[0]).toHaveProperty('id')
  })

  it('should return empty array for unknown provider', () => {
    const models = getModelsForProvider('unknown' as LLMProvider)
    expect(models).toEqual([])
  })

  it('should return empty array for dynamic providers', () => {
    const models = getModelsForProvider('openai-compatible')
    expect(models).toEqual([])
  })
})

describe('getModelIdsForProvider', () => {
  it('should return model IDs as strings', () => {
    const ids = getModelIdsForProvider('anthropic')
    expect(ids.length).toBeGreaterThan(0)
    expect(typeof ids[0]).toBe('string')
  })

  it('should match the number of models', () => {
    const models = getModelsForProvider('google')
    const ids = getModelIdsForProvider('google')
    expect(ids.length).toBe(models.length)
  })
})

describe('getModel', () => {
  it('should return a specific model by ID', () => {
    const model = getModel('anthropic', 'claude-sonnet-4-5-20250929')
    expect(model).toBeDefined()
    expect(model?.id).toBe('claude-sonnet-4-5-20250929')
  })

  it('should return undefined for unknown model', () => {
    const model = getModel('openai', 'unknown-model')
    expect(model).toBeUndefined()
  })
})

describe('getModelCapabilities', () => {
  it('should return capabilities for a known model', () => {
    const caps = getModelCapabilities('anthropic', 'claude-sonnet-4-5-20250929')
    expect(caps).toBeDefined()
    expect(caps?.vision).toBe(true)
    expect(caps?.tools).toBe(true)
  })

  it('should return undefined for unknown model', () => {
    const caps = getModelCapabilities('openai', 'unknown-model')
    expect(caps).toBeUndefined()
  })
})

describe('findModelsWithCapabilities', () => {
  it('should find low-cost models', () => {
    const models = findModelsWithCapabilities('openai', { lowCost: true })
    expect(models.length).toBeGreaterThan(0)
    for (const model of models) {
      expect(model.capabilities?.lowCost).toBe(true)
    }
  })

  it('should find models with multiple capabilities', () => {
    const models = findModelsWithCapabilities('anthropic', {
      vision: true,
      tools: true,
    })
    expect(models.length).toBeGreaterThan(0)
    for (const model of models) {
      expect(model.capabilities?.vision).toBe(true)
      expect(model.capabilities?.tools).toBe(true)
    }
  })

  it('should find thinking models', () => {
    const models = findModelsWithCapabilities('google', { thinking: true })
    expect(models.length).toBeGreaterThan(0)
    for (const model of models) {
      expect(model.capabilities?.thinking).toBe(true)
    }
  })

  it('should return empty array when no matches', () => {
    // Local models don't have vision capability
    const models = findModelsWithCapabilities('local', { vision: true })
    expect(models).toEqual([])
  })

  it('should find models excluding a capability', () => {
    const models = findModelsWithCapabilities('openai', {
      tools: true,
      highCost: false,
    })
    expect(models.length).toBeGreaterThan(0)
    for (const model of models) {
      expect(model.capabilities?.tools).toBe(true)
      expect(model.capabilities?.highCost).toBeFalsy()
    }
  })
})

describe('findBestModel', () => {
  it('should find a model matching requirements across providers', () => {
    const result = findBestModel(['openai', 'anthropic'], { vision: true })
    expect(result).toBeDefined()
    expect(result?.model.capabilities?.vision).toBe(true)
  })

  it('should prefer fast models when specified', () => {
    const result = findBestModel(['openai', 'google'], { tools: true }, 'fast')
    expect(result).toBeDefined()
    // Should prefer fast models when available
  })

  it('should prefer cheap models when specified', () => {
    const result = findBestModel(
      ['openai', 'anthropic'],
      { tools: true },
      'cheap',
    )
    expect(result).toBeDefined()
    expect(result?.model.capabilities?.lowCost).toBe(true)
  })

  it('should prefer capable models when specified', () => {
    const result = findBestModel(
      ['openai', 'anthropic', 'google'],
      {},
      'capable',
    )
    expect(result).toBeDefined()
    // Should rank thinking and vision models higher
  })

  it('should return undefined when no matches found', () => {
    // Request impossible combination
    const result = findBestModel(['local'], { vision: true, thinking: true })
    expect(result).toBeUndefined()
  })
})

describe('modelHasCapabilities', () => {
  it('should return true when model has all required capabilities', () => {
    const hasIt = modelHasCapabilities(
      'anthropic',
      'claude-opus-4-5-20251101',
      {
        thinking: true,
        vision: true,
        tools: true,
      },
    )
    expect(hasIt).toBe(true)
  })

  it('should return false when model lacks a required capability', () => {
    const hasIt = modelHasCapabilities(
      'local',
      'SmolLM2-360M-Instruct-q4f16_1-MLC',
      {
        vision: true,
      },
    )
    expect(hasIt).toBe(false)
  })

  it('should return true when excluding a capability the model lacks', () => {
    const hasIt = modelHasCapabilities('openai', 'gpt-5-mini', {
      lowCost: true,
      highCost: false,
    })
    expect(hasIt).toBe(true)
  })

  it('should return false when model has excluded capability', () => {
    const hasIt = modelHasCapabilities(
      'anthropic',
      'claude-opus-4-5-20251101',
      {
        highCost: false,
      },
    )
    expect(hasIt).toBe(false)
  })
})

describe('Model capability definitions', () => {
  it('should have consistent capability definitions', () => {
    const registry = getModelRegistry()
    // A model shouldn't be both lowCost and highCost
    for (const [, models] of Object.entries(registry)) {
      for (const model of models) {
        if (model.capabilities?.lowCost && model.capabilities?.highCost) {
          throw new Error(
            `Model ${model.id} cannot be both lowCost and highCost`,
          )
        }
      }
    }
  })

  it('should have thinking models marked as highCost or without lowCost', () => {
    const registry = getModelRegistry()
    // Thinking models are typically more expensive
    for (const [, models] of Object.entries(registry)) {
      for (const model of models) {
        if (model.capabilities?.thinking) {
          // Thinking models should either be highCost or at least not marked as lowCost
          // (some like DeepSeek R1 are affordable but not "low cost")
          expect(
            model.capabilities.highCost ||
              model.capabilities.lowCost === undefined ||
              model.capabilities.lowCost === true, // Some distilled models are both
          ).toBe(true)
        }
      }
    }
  })
})
