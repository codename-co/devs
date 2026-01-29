/**
 * Tests for LLM Model Registry
 *
 * Tests model capability flags and utility functions for model selection.
 * Note: Cloud providers (openai, anthropic, google, etc.) are now sourced from models.dev API.
 * This test file focuses on the model-registry.json entries (local/ollama) and the utility functions.
 */

import { describe, it, expect, beforeAll, vi } from 'vitest'
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
import * as fs from 'node:fs'
import * as path from 'node:path'

// Mock fetch to return the actual model-registry.json from disk
const mockFetch = vi.fn()
global.fetch = mockFetch

// Load model registry before all tests
beforeAll(async () => {
  // Read the actual model-registry.json from disk for testing
  const registryPath = path.join(
    process.cwd(),
    'public/models/model-registry.json',
  )
  const registryContent = fs.readFileSync(registryPath, 'utf-8')
  const registryData = JSON.parse(registryContent)

  mockFetch.mockResolvedValue({
    ok: true,
    json: async () => registryData,
  })

  await loadModelRegistry()
})

describe('Model Registry', () => {
  it('should have entries for local and ollama providers', () => {
    const registry = getModelRegistry()
    // Only local and ollama are in model-registry.json
    // Cloud providers come from models.dev
    const localProviders: LLMProvider[] = ['local', 'ollama']

    for (const provider of localProviders) {
      expect(registry[provider]).toBeDefined()
      expect(Array.isArray(registry[provider])).toBe(true)
      expect(registry[provider].length).toBeGreaterThan(0)
    }
  })

  it('should have empty arrays for cloud providers (sourced from models.dev)', () => {
    const registry = getModelRegistry()
    // Cloud providers should be empty in model-registry.json
    const cloudProviders: LLMProvider[] = [
      'openai',
      'anthropic',
      'google',
      'vertex-ai',
      'mistral',
      'openrouter',
      'huggingface',
    ]

    for (const provider of cloudProviders) {
      // These may or may not be defined, but if defined should be empty
      const models = registry[provider] ?? []
      expect(models.length).toBe(0)
    }
  })

  it('should have models with required properties', () => {
    const registry = getModelRegistry()
    for (const [, models] of Object.entries(registry)) {
      // Skip non-array entries (like _comment)
      if (!Array.isArray(models)) continue
      for (const model of models) {
        expect(model.id).toBeDefined()
        expect(typeof model.id).toBe('string')
        expect(model.id.length).toBeGreaterThan(0)
      }
    }
  })

  it('should have vision-capable models for ollama', () => {
    const registry = getModelRegistry()
    const models = registry['ollama']
    const visionModels = models.filter((m) => m.capabilities?.vision)
    expect(visionModels.length).toBeGreaterThan(0)
  })

  it('should have tool-capable models for ollama', () => {
    const registry = getModelRegistry()
    const models = registry['ollama']
    const toolModels = models.filter((m) => m.capabilities?.tools)
    expect(toolModels.length).toBeGreaterThan(0)
  })

  it('should have thinking-capable models for ollama', () => {
    const registry = getModelRegistry()
    const models = registry['ollama']
    const thinkingModels = models.filter((m) => m.capabilities?.thinking)
    expect(thinkingModels.length).toBeGreaterThan(0)
  })
})

describe('getModelsForProvider', () => {
  it('should return models for local provider', () => {
    const models = getModelsForProvider('local')
    expect(models.length).toBeGreaterThan(0)
    expect(models[0]).toHaveProperty('id')
  })

  it('should return models for ollama provider', () => {
    const models = getModelsForProvider('ollama')
    expect(models.length).toBeGreaterThan(0)
    expect(models[0]).toHaveProperty('id')
  })

  it('should return empty array for cloud providers (use getEnhancedModelsForProvider instead)', () => {
    // Cloud providers are sourced from models.dev
    const models = getModelsForProvider('openai')
    expect(models).toEqual([])
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
  it('should return model IDs as strings for ollama', () => {
    const ids = getModelIdsForProvider('ollama')
    expect(ids.length).toBeGreaterThan(0)
    expect(typeof ids[0]).toBe('string')
  })

  it('should match the number of models for local', () => {
    const models = getModelsForProvider('local')
    const ids = getModelIdsForProvider('local')
    expect(ids.length).toBe(models.length)
  })
})

describe('getModel', () => {
  it('should return a specific local model by ID', () => {
    const model = getModel('local', 'SmolLM2-360M-Instruct-q4f16_1-MLC')
    expect(model).toBeDefined()
    expect(model?.id).toBe('SmolLM2-360M-Instruct-q4f16_1-MLC')
  })

  it('should return a specific ollama model by ID', () => {
    const model = getModel('ollama', 'gemma3:4b')
    expect(model).toBeDefined()
    expect(model?.id).toBe('gemma3:4b')
  })

  it('should return undefined for unknown model', () => {
    const model = getModel('local', 'unknown-model')
    expect(model).toBeUndefined()
  })
})

describe('getModelCapabilities', () => {
  it('should return capabilities for a local model', () => {
    const caps = getModelCapabilities(
      'local',
      'SmolLM2-360M-Instruct-q4f16_1-MLC',
    )
    expect(caps).toBeDefined()
    expect(caps?.lowCost).toBe(true)
    expect(caps?.fast).toBe(true)
  })

  it('should return capabilities for an ollama model with vision', () => {
    const caps = getModelCapabilities('ollama', 'gemma3:4b')
    expect(caps).toBeDefined()
    expect(caps?.vision).toBe(true)
    expect(caps?.fast).toBe(true)
  })

  it('should return capabilities for an ollama model with thinking', () => {
    const caps = getModelCapabilities('ollama', 'deepseek-r1:8b')
    expect(caps).toBeDefined()
    expect(caps?.thinking).toBe(true)
    expect(caps?.tools).toBe(true)
  })

  it('should return undefined for unknown model', () => {
    const caps = getModelCapabilities('local', 'unknown-model')
    expect(caps).toBeUndefined()
  })
})

describe('findModelsWithCapabilities', () => {
  it('should find low-cost models for local', () => {
    const models = findModelsWithCapabilities('local', { lowCost: true })
    expect(models.length).toBeGreaterThan(0)
    for (const model of models) {
      expect(model.capabilities?.lowCost).toBe(true)
    }
  })

  it('should find models with vision and tools for ollama', () => {
    const models = findModelsWithCapabilities('ollama', {
      vision: true,
      tools: true,
    })
    expect(models.length).toBeGreaterThan(0)
    for (const model of models) {
      expect(model.capabilities?.vision).toBe(true)
      expect(model.capabilities?.tools).toBe(true)
    }
  })

  it('should find thinking models for ollama', () => {
    const models = findModelsWithCapabilities('ollama', { thinking: true })
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

  it('should find fast models without tools for local', () => {
    const models = findModelsWithCapabilities('local', {
      fast: true,
      tools: false,
    })
    expect(models.length).toBeGreaterThan(0)
    for (const model of models) {
      expect(model.capabilities?.fast).toBe(true)
      expect(model.capabilities?.tools).toBeFalsy()
    }
  })
})

describe('findBestModel', () => {
  it('should find a model matching requirements across local and ollama', () => {
    const result = findBestModel(['local', 'ollama'], { tools: true })
    expect(result).toBeDefined()
    expect(result?.model.capabilities?.tools).toBe(true)
  })

  it('should prefer fast models when specified', () => {
    const result = findBestModel(['local', 'ollama'], { tools: true }, 'fast')
    expect(result).toBeDefined()
    // Should prefer fast models when available
    expect(result?.model.capabilities?.fast).toBe(true)
  })

  it('should prefer cheap models when specified', () => {
    const result = findBestModel(['local', 'ollama'], {}, 'cheap')
    expect(result).toBeDefined()
    expect(result?.model.capabilities?.lowCost).toBe(true)
  })

  it('should prefer capable models when specified', () => {
    const result = findBestModel(['ollama'], {}, 'capable')
    expect(result).toBeDefined()
    // Should rank thinking and vision models higher
  })

  it('should return undefined when no matches found', () => {
    // Request impossible combination
    const result = findBestModel(['local'], { vision: true, thinking: true })
    expect(result).toBeUndefined()
  })

  it('should return undefined for cloud providers (use getEnhancedModelsForProvider)', () => {
    // Cloud providers have empty arrays in model-registry
    const result = findBestModel(['openai', 'anthropic'], { vision: true })
    expect(result).toBeUndefined()
  })
})

describe('modelHasCapabilities', () => {
  it('should return true when model has all required capabilities', () => {
    const hasIt = modelHasCapabilities('ollama', 'qwen3-vl:8b', {
      thinking: true,
      vision: true,
      tools: true,
    })
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
    const hasIt = modelHasCapabilities(
      'local',
      'SmolLM2-360M-Instruct-q4f16_1-MLC',
      {
        lowCost: true,
        highCost: false,
      },
    )
    expect(hasIt).toBe(true)
  })

  it('should return false when model is not found', () => {
    const hasIt = modelHasCapabilities('local', 'nonexistent-model', {
      lowCost: true,
    })
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
            `Model ${model.id} is marked as both lowCost and highCost`,
          )
        }
      }
    }
  })

  it('should have consistent fast capability', () => {
    const registry = getModelRegistry()
    // Fast models should generally be smaller/cheaper
    for (const [, models] of Object.entries(registry)) {
      for (const model of models) {
        // If a model is fast and highCost, that's unusual but allowed
        // Just validate the capability exists as a boolean
        if (model.capabilities?.fast !== undefined) {
          expect(typeof model.capabilities.fast).toBe('boolean')
        }
      }
    }
  })
})
