/**
 * Tests for GitHub Copilot OAuth Device Flow
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock import.meta.env before importing the module
vi.stubEnv('VITE_GITHUB_CLIENT_ID', 'test-client-id')

const mockFetch = vi.fn()

describe('GitHub Copilot Auth', () => {
  beforeEach(() => {
    global.fetch = mockFetch
    mockFetch.mockClear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('requestDeviceCode', () => {
    it('should request device code from GitHub', async () => {
      const { requestDeviceCode } = await import(
        '@/lib/llm/github-copilot-auth'
      )

      const mockResponse = {
        device_code: 'abc123',
        user_code: 'ABCD-1234',
        verification_uri: 'https://github.com/login/device',
        expires_in: 900,
        interval: 5,
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      const result = await requestDeviceCode()

      expect(result).toEqual(mockResponse)
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/login/device/code'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Accept: 'application/json',
          }),
        }),
      )

      // Verify body contains client_id and scope
      const body = mockFetch.mock.calls[0][1].body
      expect(body).toContain('client_id=')
      expect(body).toContain('scope=')
    })

    it('should throw on failed request', async () => {
      const { requestDeviceCode } = await import(
        '@/lib/llm/github-copilot-auth'
      )

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => 'Bad Request',
      })

      await expect(requestDeviceCode()).rejects.toThrow(
        'Failed to request device code',
      )
    })
  })

  describe('isGitHubCopilotAuthConfigured', () => {
    it('should return true when client ID is set', async () => {
      const { isGitHubCopilotAuthConfigured } = await import(
        '@/lib/llm/github-copilot-auth'
      )
      expect(isGitHubCopilotAuthConfigured()).toBe(true)
    })
  })

  describe('runDeviceFlow', () => {
    it('should complete the full device flow', async () => {
      const { runDeviceFlow } = await import(
        '@/lib/llm/github-copilot-auth'
      )

      // First call: request device code
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          device_code: 'dc_123',
          user_code: 'TEST-CODE',
          verification_uri: 'https://github.com/login/device',
          expires_in: 900,
          interval: 0.01, // Very short for testing
        }),
      })

      // Second call: poll - authorization pending
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ error: 'authorization_pending' }),
      })

      // Third call: poll - success
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'gho_test_token',
          token_type: 'bearer',
        }),
      })

      const onUserCode = vi.fn()
      // Mock window.open
      const originalOpen = window.open
      window.open = vi.fn()

      const token = await runDeviceFlow({
        onUserCode,
      })

      expect(onUserCode).toHaveBeenCalledWith(
        expect.objectContaining({
          user_code: 'TEST-CODE',
          verification_uri: 'https://github.com/login/device',
        }),
      )
      expect(token).toBe('gho_test_token')

      window.open = originalOpen
    })

    it('should abort when signal is triggered', async () => {
      const { runDeviceFlow } = await import(
        '@/lib/llm/github-copilot-auth'
      )

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          device_code: 'dc_123',
          user_code: 'TEST-CODE',
          verification_uri: 'https://github.com/login/device',
          expires_in: 900,
          interval: 10, // Long interval
        }),
      })

      const controller = new AbortController()
      const onUserCode = vi.fn()
      const originalOpen = window.open
      window.open = vi.fn()

      // Abort immediately after user code is shown
      const flowPromise = runDeviceFlow({ onUserCode }, controller.signal)
      // Wait a tick for the device code request to complete
      await new Promise((r) => setTimeout(r, 10))
      controller.abort()

      await expect(flowPromise).rejects.toThrow('Device flow cancelled')

      window.open = originalOpen
    })
  })
})
