import { describe, it, expect } from 'vitest'
import { isModelsDevModel } from '@/lib/models-dev/types'
import type { ModelsDevModel } from '@/lib/models-dev/types'

describe('isModelsDevModel', () => {
  // Valid model fixture for testing
  const validModel: ModelsDevModel = {
    id: 'gpt-4o',
    name: 'GPT-4o',
    attachment: true,
    reasoning: false,
    tool_call: true,
    structured_output: true,
    open_weights: false,
    release_date: '2024-05-13',
    last_updated: '2024-11-20',
    modalities: { input: ['text', 'image'], output: ['text'] },
    cost: { input: 2.5, output: 10 },
    limit: { context: 128000, output: 16384 },
  }

  describe('valid models', () => {
    it('should return true for a valid model with all required fields', () => {
      expect(isModelsDevModel(validModel)).toBe(true)
    })

    it('should return true for a minimal valid model', () => {
      const minimalModel: ModelsDevModel = {
        id: 'test-model',
        name: 'Test Model',
        attachment: false,
        reasoning: false,
        tool_call: false,
        open_weights: true,
        release_date: '2024-01-01',
        last_updated: '2024-01-01',
        modalities: { input: ['text'], output: ['text'] },
        cost: { input: 0, output: 0 },
        limit: { context: 4096, output: 1024 },
      }
      expect(isModelsDevModel(minimalModel)).toBe(true)
    })

    it('should return true for a model with optional fields', () => {
      const modelWithOptionals: ModelsDevModel = {
        ...validModel,
        family: 'gpt-4',
        structured_output: true,
        temperature: true,
        knowledge: '2024-01',
        status: 'beta',
        interleaved: { field: 'reasoning_content' },
      }
      expect(isModelsDevModel(modelWithOptionals)).toBe(true)
    })

    it('should return true for a model with optional cost fields', () => {
      const modelWithCostOptionals: ModelsDevModel = {
        ...validModel,
        cost: {
          input: 2.5,
          output: 10,
          reasoning: 5,
          cache_read: 0.5,
          cache_write: 1,
          input_audio: 20,
          output_audio: 40,
        },
      }
      expect(isModelsDevModel(modelWithCostOptionals)).toBe(true)
    })

    it('should return true for a model with optional limit fields', () => {
      const modelWithLimitOptionals: ModelsDevModel = {
        ...validModel,
        limit: {
          context: 128000,
          input: 100000,
          output: 16384,
        },
      }
      expect(isModelsDevModel(modelWithLimitOptionals)).toBe(true)
    })
  })

  describe('null and undefined inputs', () => {
    it('should return false for null', () => {
      expect(isModelsDevModel(null)).toBe(false)
    })

    it('should return false for undefined', () => {
      expect(isModelsDevModel(undefined)).toBe(false)
    })
  })

  describe('non-object inputs', () => {
    it('should return false for a string', () => {
      expect(isModelsDevModel('gpt-4o')).toBe(false)
    })

    it('should return false for a number', () => {
      expect(isModelsDevModel(42)).toBe(false)
    })

    it('should return false for a boolean', () => {
      expect(isModelsDevModel(true)).toBe(false)
    })

    it('should return false for an array', () => {
      expect(isModelsDevModel([validModel])).toBe(false)
    })

    it('should return false for a function', () => {
      expect(isModelsDevModel(() => validModel)).toBe(false)
    })
  })

  describe('missing required string fields', () => {
    it('should return false when id is missing', () => {
      const { id: _id, ...modelWithoutId } = validModel
      expect(isModelsDevModel(modelWithoutId)).toBe(false)
    })

    it('should return false when name is missing', () => {
      const { name: _name, ...modelWithoutName } = validModel
      expect(isModelsDevModel(modelWithoutName)).toBe(false)
    })

    it('should return false when release_date is missing', () => {
      const { release_date: _releaseDate, ...modelWithoutReleaseDate } =
        validModel
      expect(isModelsDevModel(modelWithoutReleaseDate)).toBe(false)
    })

    it('should return false when last_updated is missing', () => {
      const { last_updated: _lastUpdated, ...modelWithoutLastUpdated } =
        validModel
      expect(isModelsDevModel(modelWithoutLastUpdated)).toBe(false)
    })
  })

  describe('wrong types for required string fields', () => {
    it('should return false when id is not a string', () => {
      const modelWithBadId = { ...validModel, id: 123 }
      expect(isModelsDevModel(modelWithBadId)).toBe(false)
    })

    it('should return false when name is not a string', () => {
      const modelWithBadName = { ...validModel, name: null }
      expect(isModelsDevModel(modelWithBadName)).toBe(false)
    })

    it('should return false when release_date is not a string', () => {
      const modelWithBadDate = { ...validModel, release_date: new Date() }
      expect(isModelsDevModel(modelWithBadDate)).toBe(false)
    })

    it('should return false when last_updated is not a string', () => {
      const modelWithBadLastUpdated = { ...validModel, last_updated: undefined }
      expect(isModelsDevModel(modelWithBadLastUpdated)).toBe(false)
    })
  })

  describe('missing required boolean fields', () => {
    it('should return false when attachment is missing', () => {
      const { attachment: _attachment, ...modelWithoutAttachment } = validModel
      expect(isModelsDevModel(modelWithoutAttachment)).toBe(false)
    })

    it('should return false when reasoning is missing', () => {
      const { reasoning: _reasoning, ...modelWithoutReasoning } = validModel
      expect(isModelsDevModel(modelWithoutReasoning)).toBe(false)
    })

    it('should return false when tool_call is missing', () => {
      const { tool_call: _toolCall, ...modelWithoutToolCall } = validModel
      expect(isModelsDevModel(modelWithoutToolCall)).toBe(false)
    })

    it('should return false when open_weights is missing', () => {
      const { open_weights: _openWeights, ...modelWithoutOpenWeights } =
        validModel
      expect(isModelsDevModel(modelWithoutOpenWeights)).toBe(false)
    })
  })

  describe('wrong types for required boolean fields', () => {
    it('should return false when attachment is not a boolean', () => {
      const modelWithBadAttachment = { ...validModel, attachment: 'true' }
      expect(isModelsDevModel(modelWithBadAttachment)).toBe(false)
    })

    it('should return false when reasoning is not a boolean', () => {
      const modelWithBadReasoning = { ...validModel, reasoning: 1 }
      expect(isModelsDevModel(modelWithBadReasoning)).toBe(false)
    })

    it('should return false when tool_call is not a boolean', () => {
      const modelWithBadToolCall = { ...validModel, tool_call: null }
      expect(isModelsDevModel(modelWithBadToolCall)).toBe(false)
    })

    it('should return false when open_weights is not a boolean', () => {
      const modelWithBadOpenWeights = { ...validModel, open_weights: 'false' }
      expect(isModelsDevModel(modelWithBadOpenWeights)).toBe(false)
    })
  })

  describe('invalid modalities', () => {
    it('should return false when modalities is missing', () => {
      const { modalities: _modalities, ...modelWithoutModalities } = validModel
      expect(isModelsDevModel(modelWithoutModalities)).toBe(false)
    })

    it('should return false when modalities is null', () => {
      const modelWithNullModalities = { ...validModel, modalities: null }
      expect(isModelsDevModel(modelWithNullModalities)).toBe(false)
    })

    it('should return false when modalities.input is missing', () => {
      const modelWithBadModalities = {
        ...validModel,
        modalities: { output: ['text'] },
      }
      expect(isModelsDevModel(modelWithBadModalities)).toBe(false)
    })

    it('should return false when modalities.output is missing', () => {
      const modelWithBadModalities = {
        ...validModel,
        modalities: { input: ['text'] },
      }
      expect(isModelsDevModel(modelWithBadModalities)).toBe(false)
    })

    it('should return false when modalities.input is not an array', () => {
      const modelWithBadModalities = {
        ...validModel,
        modalities: { input: 'text', output: ['text'] },
      }
      expect(isModelsDevModel(modelWithBadModalities)).toBe(false)
    })

    it('should return false when modalities.output is not an array', () => {
      const modelWithBadModalities = {
        ...validModel,
        modalities: { input: ['text'], output: 'text' },
      }
      expect(isModelsDevModel(modelWithBadModalities)).toBe(false)
    })
  })

  describe('invalid cost', () => {
    it('should return false when cost is missing', () => {
      const { cost: _cost, ...modelWithoutCost } = validModel
      expect(isModelsDevModel(modelWithoutCost)).toBe(false)
    })

    it('should return false when cost is null', () => {
      const modelWithNullCost = { ...validModel, cost: null }
      expect(isModelsDevModel(modelWithNullCost)).toBe(false)
    })

    it('should return false when cost.input is missing', () => {
      const modelWithBadCost = { ...validModel, cost: { output: 10 } }
      expect(isModelsDevModel(modelWithBadCost)).toBe(false)
    })

    it('should return false when cost.output is missing', () => {
      const modelWithBadCost = { ...validModel, cost: { input: 2.5 } }
      expect(isModelsDevModel(modelWithBadCost)).toBe(false)
    })

    it('should return false when cost.input is not a number', () => {
      const modelWithBadCost = {
        ...validModel,
        cost: { input: '2.5', output: 10 },
      }
      expect(isModelsDevModel(modelWithBadCost)).toBe(false)
    })

    it('should return false when cost.output is not a number', () => {
      const modelWithBadCost = {
        ...validModel,
        cost: { input: 2.5, output: '10' },
      }
      expect(isModelsDevModel(modelWithBadCost)).toBe(false)
    })
  })

  describe('invalid limit', () => {
    it('should return false when limit is missing', () => {
      const { limit: _limit, ...modelWithoutLimit } = validModel
      expect(isModelsDevModel(modelWithoutLimit)).toBe(false)
    })

    it('should return false when limit is null', () => {
      const modelWithNullLimit = { ...validModel, limit: null }
      expect(isModelsDevModel(modelWithNullLimit)).toBe(false)
    })

    it('should return false when limit.context is missing', () => {
      const modelWithBadLimit = { ...validModel, limit: { output: 16384 } }
      expect(isModelsDevModel(modelWithBadLimit)).toBe(false)
    })

    it('should return false when limit.output is missing', () => {
      const modelWithBadLimit = { ...validModel, limit: { context: 128000 } }
      expect(isModelsDevModel(modelWithBadLimit)).toBe(false)
    })

    it('should return false when limit.context is not a number', () => {
      const modelWithBadLimit = {
        ...validModel,
        limit: { context: '128000', output: 16384 },
      }
      expect(isModelsDevModel(modelWithBadLimit)).toBe(false)
    })

    it('should return false when limit.output is not a number', () => {
      const modelWithBadLimit = {
        ...validModel,
        limit: { context: 128000, output: '16384' },
      }
      expect(isModelsDevModel(modelWithBadLimit)).toBe(false)
    })
  })

  describe('empty object', () => {
    it('should return false for an empty object', () => {
      expect(isModelsDevModel({})).toBe(false)
    })
  })
})
