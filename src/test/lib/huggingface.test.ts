import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the userStore before importing the module under test
const mockGetState = vi.fn()
vi.mock('@/stores/userStore', () => ({
  userSettings: {
    getState: () => mockGetState(),
  },
}))

// Mock @huggingface/transformers
vi.mock('@huggingface/transformers', () => ({
  env: { remoteHost: 'https://huggingface.co/' },
}))

import {
  getHuggingFaceHost,
  getHuggingFaceRouterHost,
  configureTransformersHost,
  DEFAULT_HUGGINGFACE_HOST,
  DEFAULT_HUGGINGFACE_ROUTER_HOST,
} from '@/lib/huggingface'

describe('huggingface host utilities', () => {
  beforeEach(() => {
    mockGetState.mockReset()
  })

  describe('getHuggingFaceHost', () => {
    it('returns default host when no custom URL is set', () => {
      mockGetState.mockReturnValue({})
      expect(getHuggingFaceHost()).toBe(DEFAULT_HUGGINGFACE_HOST)
    })

    it('returns default host when custom URL is empty string', () => {
      mockGetState.mockReturnValue({ huggingfaceBaseUrl: '' })
      expect(getHuggingFaceHost()).toBe(DEFAULT_HUGGINGFACE_HOST)
    })

    it('returns default host when custom URL is only whitespace', () => {
      mockGetState.mockReturnValue({ huggingfaceBaseUrl: '   ' })
      expect(getHuggingFaceHost()).toBe(DEFAULT_HUGGINGFACE_HOST)
    })

    it('returns custom URL when set', () => {
      mockGetState.mockReturnValue({
        huggingfaceBaseUrl: 'https://hf-mirror.mycompany.com',
      })
      expect(getHuggingFaceHost()).toBe('https://hf-mirror.mycompany.com')
    })

    it('strips trailing slashes from custom URL', () => {
      mockGetState.mockReturnValue({
        huggingfaceBaseUrl: 'https://hf-mirror.mycompany.com/',
      })
      expect(getHuggingFaceHost()).toBe('https://hf-mirror.mycompany.com')
    })

    it('strips multiple trailing slashes', () => {
      mockGetState.mockReturnValue({
        huggingfaceBaseUrl: 'https://hf-mirror.mycompany.com///',
      })
      expect(getHuggingFaceHost()).toBe('https://hf-mirror.mycompany.com')
    })

    it('trims whitespace from custom URL', () => {
      mockGetState.mockReturnValue({
        huggingfaceBaseUrl: '  https://hf-mirror.mycompany.com  ',
      })
      expect(getHuggingFaceHost()).toBe('https://hf-mirror.mycompany.com')
    })
  })

  describe('getHuggingFaceRouterHost', () => {
    it('returns default router host when no custom URL is set', () => {
      mockGetState.mockReturnValue({})
      expect(getHuggingFaceRouterHost()).toBe(DEFAULT_HUGGINGFACE_ROUTER_HOST)
    })

    it('returns custom URL as router host when set', () => {
      mockGetState.mockReturnValue({
        huggingfaceBaseUrl: 'https://hf-proxy.corp.net',
      })
      expect(getHuggingFaceRouterHost()).toBe('https://hf-proxy.corp.net')
    })

    it('strips trailing slashes from router host', () => {
      mockGetState.mockReturnValue({
        huggingfaceBaseUrl: 'https://hf-proxy.corp.net/',
      })
      expect(getHuggingFaceRouterHost()).toBe('https://hf-proxy.corp.net')
    })
  })

  describe('configureTransformersHost', () => {
    it('sets env.remoteHost to the custom host with trailing slash', async () => {
      mockGetState.mockReturnValue({
        huggingfaceBaseUrl: 'https://hf-mirror.mycompany.com',
      })
      await configureTransformersHost()
      const { env } = await import('@huggingface/transformers')
      expect(env.remoteHost).toBe('https://hf-mirror.mycompany.com/')
    })

    it('sets env.remoteHost to default host when no custom URL', async () => {
      mockGetState.mockReturnValue({})
      await configureTransformersHost()
      const { env } = await import('@huggingface/transformers')
      expect(env.remoteHost).toBe('https://huggingface.co/')
    })
  })
})
