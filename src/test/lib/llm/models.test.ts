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
  inferOllamaCapabilities,
  inferOllamaCapabilitiesAsync,
  getOllamaModelsWithCapabilities,
  getOllamaModelsWithCapabilitiesAsync,
  inferLocalModelCapabilities,
  formatLocalModelName,
  usesLocalInference,
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

describe('inferOllamaCapabilities', () => {
  it('should infer vision capability for llava models', () => {
    const caps = inferOllamaCapabilities('llava:7b')
    expect(caps.vision).toBe(true)
  })

  it('should infer thinking capability for deepseek-r1 models', () => {
    const caps = inferOllamaCapabilities('deepseek-r1:8b')
    expect(caps.thinking).toBe(true)
    expect(caps.tools).toBe(true)
  })

  it('should infer tools capability for llama3.2 models', () => {
    const caps = inferOllamaCapabilities('llama3.2:3b')
    expect(caps.tools).toBe(true)
    expect(caps.fast).toBe(true)
  })

  it('should infer vision and fast for gemma3 models', () => {
    const caps = inferOllamaCapabilities('gemma3:4b')
    expect(caps.vision).toBe(true)
    expect(caps.fast).toBe(true)
  })

  it('should return empty capabilities for unknown models', () => {
    const caps = inferOllamaCapabilities('unknown-model:1b')
    expect(Object.keys(caps).length).toBe(0)
  })

  it('should be case-insensitive', () => {
    const caps1 = inferOllamaCapabilities('LLaVA:7b')
    const caps2 = inferOllamaCapabilities('llava:7b')
    expect(caps1.vision).toBe(true)
    expect(caps2.vision).toBe(true)
  })
})

describe('inferOllamaCapabilitiesAsync', () => {
  it('should return capabilities for known models', async () => {
    const caps = await inferOllamaCapabilitiesAsync('llava:7b')
    expect(caps.vision).toBe(true)
  })

  it('should fall back to pattern matching when models.dev fails', async () => {
    const caps = await inferOllamaCapabilitiesAsync('deepseek-r1:14b')
    expect(caps.thinking).toBe(true)
    expect(caps.tools).toBe(true)
  })

  it('should handle unknown models gracefully', async () => {
    const caps = await inferOllamaCapabilitiesAsync('unknown-model:1b')
    expect(
      Object.keys(caps).filter((k) => caps[k as keyof typeof caps]),
    ).toHaveLength(0)
  })
})

describe('getOllamaModelsWithCapabilities', () => {
  it('should return models with inferred capabilities', () => {
    const modelIds = ['llava:7b', 'deepseek-r1:8b', 'llama3.2:3b']
    const models = getOllamaModelsWithCapabilities(modelIds)

    expect(models).toHaveLength(3)
    expect(models[0].id).toBe('llava:7b')
    expect(models[0].capabilities?.vision).toBe(true)
    expect(models[1].id).toBe('deepseek-r1:8b')
    expect(models[1].capabilities?.thinking).toBe(true)
    expect(models[2].id).toBe('llama3.2:3b')
    expect(models[2].capabilities?.tools).toBe(true)
  })

  it('should generate human-readable names', () => {
    const models = getOllamaModelsWithCapabilities(['llama3.2:3b'])
    expect(models[0].name).toContain('Llama')
    expect(models[0].name).toContain('3B')
  })
})

describe('getOllamaModelsWithCapabilitiesAsync', () => {
  it('should return models with inferred capabilities', async () => {
    const modelIds = ['llava:7b', 'deepseek-r1:8b']
    const models = await getOllamaModelsWithCapabilitiesAsync(modelIds)

    expect(models).toHaveLength(2)
    expect(models[0].id).toBe('llava:7b')
    expect(models[0].capabilities?.vision).toBe(true)
    expect(models[1].id).toBe('deepseek-r1:8b')
    expect(models[1].capabilities?.thinking).toBe(true)
  })

  it('should handle empty array', async () => {
    const models = await getOllamaModelsWithCapabilitiesAsync([])
    expect(models).toHaveLength(0)
  })
})

describe('inferLocalModelCapabilities', () => {
  it('should infer capabilities for ollama provider', () => {
    const caps = inferLocalModelCapabilities('llava:7b', 'ollama')
    expect(caps.vision).toBe(true)
  })

  it('should infer capabilities for local provider', () => {
    const caps = inferLocalModelCapabilities('gemma3:4b', 'local')
    expect(caps.vision).toBe(true)
    expect(caps.fast).toBe(true)
  })

  it('should infer capabilities for openai-compatible provider', () => {
    const caps = inferLocalModelCapabilities(
      'deepseek-r1:32b',
      'openai-compatible',
    )
    expect(caps.thinking).toBe(true)
    expect(caps.tools).toBe(true)
  })

  it('should work with different provider types', () => {
    // Same model should get same capabilities regardless of provider
    const ollama = inferLocalModelCapabilities('qwen3:8b', 'ollama')
    const local = inferLocalModelCapabilities('qwen3:8b', 'local')
    const compatible = inferLocalModelCapabilities(
      'qwen3:8b',
      'openai-compatible',
    )

    expect(ollama.thinking).toBe(true)
    expect(local.thinking).toBe(true)
    expect(compatible.thinking).toBe(true)
  })

  it('should strip repository path prefix for local browser models', () => {
    const caps = inferLocalModelCapabilities(
      'onnx-community/Qwen3-0.6B-ONNX',
      'local',
    )
    expect(caps.thinking).toBe(true)
    expect(caps.tools).toBe(true)
  })

  it('should infer capabilities for ONNX-web models', () => {
    const caps = inferLocalModelCapabilities(
      'onnx-community/granite-4.0-350m-ONNX-web',
      'local',
    )
    expect(caps.fast).toBe(true)
    expect(caps.lowCost).toBe(true)
  })

  it('should infer capabilities for MLC models', () => {
    const caps = inferLocalModelCapabilities(
      'SmolLM2-360M-Instruct-q4f16_1-MLC',
      'local',
    )
    expect(caps.fast).toBe(true)
    expect(caps.lowCost).toBe(true)
  })

  it('should infer capabilities for SmolLM models', () => {
    const caps = inferLocalModelCapabilities(
      'onnx-community/SmolLM2-135M-Instruct-ONNX',
      'local',
    )
    expect(caps.fast).toBe(true)
    expect(caps.lowCost).toBe(true)
  })
})

describe('formatLocalModelName', () => {
  it('should format model names with colons', () => {
    expect(formatLocalModelName('llama3.2:3b')).toBe('Llama3.2 3B')
  })

  it('should format model names with hyphens', () => {
    expect(formatLocalModelName('deepseek-r1')).toBe('Deepseek R1')
  })

  it('should convert hyphen-separated version numbers to dots', () => {
    expect(formatLocalModelName('claude-3-7-sonnet')).toBe('Claude 3.7 Sonnet')
    expect(formatLocalModelName('gemini-2-0-flash')).toBe('Gemini 2.0 Flash')
    expect(formatLocalModelName('model-1-2-3-name')).toBe('Model 1.2.3 Name')
  })

  it('should format model names with underscores', () => {
    expect(formatLocalModelName('some_model_name')).toBe('Some Model Name')
  })

  it('should uppercase size indicators', () => {
    expect(formatLocalModelName('model:7b')).toBe('Model 7B')
    expect(formatLocalModelName('model:32k')).toBe('Model 32K')
    expect(formatLocalModelName('model:1m')).toBe('Model 1M')
  })

  it('should strip repository path prefix', () => {
    expect(formatLocalModelName('onnx-community/Qwen3-0.6B-ONNX')).toBe(
      'Qwen3 0.6B ONNX',
    )
    expect(
      formatLocalModelName('onnx-community/granite-4.0-350m-ONNX-web'),
    ).toBe('Granite 4.0 350M ONNX WEB')
  })

  it('should uppercase common suffixes', () => {
    expect(formatLocalModelName('model-ONNX')).toBe('Model ONNX')
    expect(formatLocalModelName('model-MLC')).toBe('Model MLC')
    expect(formatLocalModelName('model-web')).toBe('Model WEB')
    expect(formatLocalModelName('model-gguf')).toBe('Model GGUF')
  })
})

describe('usesLocalInference', () => {
  it('should return true for local providers', () => {
    expect(usesLocalInference('local')).toBe(true)
    expect(usesLocalInference('ollama')).toBe(true)
    expect(usesLocalInference('openai-compatible')).toBe(true)
    expect(usesLocalInference('huggingface')).toBe(true)
  })

  it('should return false for cloud providers', () => {
    expect(usesLocalInference('openai')).toBe(false)
    expect(usesLocalInference('anthropic')).toBe(false)
    expect(usesLocalInference('google')).toBe(false)
    expect(usesLocalInference('mistral')).toBe(false)
  })
})

describe('inferLocalModelCapabilities for HuggingFace models', () => {
  it('should infer capabilities for Llama models', () => {
    const caps = inferLocalModelCapabilities(
      'meta-llama/Llama-3.3-70B-Instruct',
      'huggingface',
    )
    expect(caps.tools).toBe(true)
  })

  it('should infer capabilities for Qwen models with thinking', () => {
    const caps = inferLocalModelCapabilities(
      'Qwen/Qwen3-72B-Instruct',
      'huggingface',
    )
    expect(caps.thinking).toBe(true)
    expect(caps.tools).toBe(true)
  })

  it('should infer capabilities for Mistral models', () => {
    const caps = inferLocalModelCapabilities(
      'mistralai/Mistral-7B-Instruct-v0.3',
      'huggingface',
    )
    expect(caps.tools).toBe(true)
  })

  it('should infer capabilities for DeepSeek R1 models', () => {
    const caps = inferLocalModelCapabilities(
      'deepseek-ai/DeepSeek-R1-Distill-Qwen-32B',
      'huggingface',
    )
    expect(caps.thinking).toBe(true)
  })

  it('should infer capabilities for Phi models', () => {
    const caps = inferLocalModelCapabilities(
      'microsoft/Phi-3.5-mini-instruct',
      'huggingface',
    )
    expect(caps.fast).toBe(true)
  })
})

describe('inferLocalModelCapabilities for image/video generation models', () => {
  // Image generation models
  it('should infer imageGeneration for z-image models', () => {
    const caps = inferLocalModelCapabilities('z-image', 'openai-compatible')
    expect(caps.imageGeneration).toBe(true)
  })

  it('should infer imageGeneration for z-image-turbo', () => {
    const caps = inferLocalModelCapabilities(
      'z-image-turbo',
      'openai-compatible',
    )
    expect(caps.imageGeneration).toBe(true)
  })

  it('should infer imageGeneration for FLUX models', () => {
    const caps = inferLocalModelCapabilities('flux-1-schnell', 'ollama')
    expect(caps.imageGeneration).toBe(true)
  })

  it('should infer imageGeneration for SDXL models', () => {
    const caps = inferLocalModelCapabilities('sdxl-turbo', 'openai-compatible')
    expect(caps.imageGeneration).toBe(true)
  })

  it('should infer imageGeneration for stable-diffusion models', () => {
    const caps = inferLocalModelCapabilities(
      'stable-diffusion-3.5-large',
      'openai-compatible',
    )
    expect(caps.imageGeneration).toBe(true)
  })

  it('should infer imageGeneration for sd-prefixed models', () => {
    const caps = inferLocalModelCapabilities('sd3.5-turbo', 'openai-compatible')
    expect(caps.imageGeneration).toBe(true)
  })

  it('should infer imageGeneration for dall-e models', () => {
    const caps = inferLocalModelCapabilities('dall-e-3', 'openai-compatible')
    expect(caps.imageGeneration).toBe(true)
  })

  it('should infer imageGeneration for playground models', () => {
    const caps = inferLocalModelCapabilities(
      'playground-v2.5',
      'openai-compatible',
    )
    expect(caps.imageGeneration).toBe(true)
  })

  it('should infer imageGeneration for dreamshaper models', () => {
    const caps = inferLocalModelCapabilities('dreamshaper-8', 'ollama')
    expect(caps.imageGeneration).toBe(true)
  })

  it('should infer imageGeneration for juggernaut models', () => {
    const caps = inferLocalModelCapabilities('juggernaut-xl-v9', 'ollama')
    expect(caps.imageGeneration).toBe(true)
  })

  it('should infer imageGeneration for pixart models', () => {
    const caps = inferLocalModelCapabilities(
      'pixart-sigma',
      'openai-compatible',
    )
    expect(caps.imageGeneration).toBe(true)
  })

  it('should infer imageGeneration for imagen models', () => {
    const caps = inferLocalModelCapabilities(
      'imagen-4.0-generate-001',
      'openai-compatible',
    )
    expect(caps.imageGeneration).toBe(true)
  })

  it('should infer imageGeneration for kolors models', () => {
    const caps = inferLocalModelCapabilities('kolors-v1', 'openai-compatible')
    expect(caps.imageGeneration).toBe(true)
  })

  // Video generation models
  it('should infer videoGeneration for cogvideo models', () => {
    const caps = inferLocalModelCapabilities(
      'cogvideox-5b',
      'openai-compatible',
    )
    expect(caps.videoGeneration).toBe(true)
  })

  it('should infer videoGeneration for wan models', () => {
    const caps = inferLocalModelCapabilities('wan-2.1-t2v', 'ollama')
    expect(caps.videoGeneration).toBe(true)
  })

  it('should infer videoGeneration for hunyuan-video models', () => {
    const caps = inferLocalModelCapabilities(
      'hunyuan-video-large',
      'openai-compatible',
    )
    expect(caps.videoGeneration).toBe(true)
  })

  it('should infer videoGeneration for stable-video models', () => {
    const caps = inferLocalModelCapabilities(
      'stable-video-diffusion',
      'openai-compatible',
    )
    expect(caps.videoGeneration).toBe(true)
  })

  it('should infer videoGeneration for mochi models', () => {
    const caps = inferLocalModelCapabilities('mochi-1', 'openai-compatible')
    expect(caps.videoGeneration).toBe(true)
  })

  it('should infer videoGeneration for ltx-video models', () => {
    const caps = inferLocalModelCapabilities(
      'ltx-video-v1',
      'openai-compatible',
    )
    expect(caps.videoGeneration).toBe(true)
  })

  // Negative tests - regular LLMs should NOT have image/video generation
  it('should NOT infer imageGeneration for LLM models', () => {
    const llama = inferLocalModelCapabilities('llama3.2:3b', 'ollama')
    expect(llama.imageGeneration).toBeUndefined()
    expect(llama.videoGeneration).toBeUndefined()

    const qwen = inferLocalModelCapabilities('qwen3:8b', 'ollama')
    expect(qwen.imageGeneration).toBeUndefined()
    expect(qwen.videoGeneration).toBeUndefined()

    const deepseek = inferLocalModelCapabilities('deepseek-r1:32b', 'ollama')
    expect(deepseek.imageGeneration).toBeUndefined()
    expect(deepseek.videoGeneration).toBeUndefined()
  })
})
