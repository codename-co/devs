/**
 * Tests for the DEVS Enterprise LLM provider.
 */
import { describe, it, expect, afterEach } from 'vitest'
import { DevsEnterpriseProvider } from '@/lib/llm/providers/devs-enterprise'

describe('DevsEnterpriseProvider', () => {
  it('is instantiable', () => {
    const provider = new DevsEnterpriseProvider()
    expect(provider).toBeDefined()
  })

  it('implements LLMProviderInterface methods', () => {
    const provider = new DevsEnterpriseProvider()
    expect(typeof provider.chat).toBe('function')
    expect(typeof provider.streamChat).toBe('function')
    expect(typeof provider.validateApiKey).toBe('function')
    expect(typeof provider.getAvailableModels).toBe('function')
  })

  it('validateApiKey always returns true (auth via OAuth2)', async () => {
    const provider = new DevsEnterpriseProvider()
    const result = await provider.validateApiKey('any-key')
    expect(result).toBe(true)
  })

  it('getAvailableModels returns empty when no teams config', async () => {
    const provider = new DevsEnterpriseProvider()
    const models = await provider.getAvailableModels()
    // Without teamsConfig, returns empty array (from teamsConfig?.llm.allowedModels ?? [])
    expect(models).toEqual([])
  })

  describe('with mocked Teams config', () => {
    const originalConfig = (window as any).__DEVS_TEAMS__

    afterEach(() => {
      if (originalConfig) {
        ;(window as any).__DEVS_TEAMS__ = originalConfig
      } else {
        delete (window as any).__DEVS_TEAMS__
      }
    })

    it('DEFAULT_MODEL falls back when no teams config', () => {
      delete (window as any).__DEVS_TEAMS__
      expect(DevsEnterpriseProvider.DEFAULT_MODEL).toBe('gpt-4o')
    })
  })
})
