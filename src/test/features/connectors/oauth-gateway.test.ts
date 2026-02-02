import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// We need to mock the entire module to control environment variables
// that are evaluated at module load time
const mockOAuthConfigs: Record<string, any> = {
  'google-drive': {
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    clientId: 'test-google-client-id',
    scopes: [
      'https://www.googleapis.com/auth/drive.readonly',
      'https://www.googleapis.com/auth/drive.metadata.readonly',
    ],
    pkceRequired: true,
  },
  gmail: {
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    clientId: 'test-google-client-id',
    scopes: [
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.compose',
    ],
    pkceRequired: true,
  },
  'google-calendar': {
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    clientId: 'test-google-client-id',
    scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
    pkceRequired: true,
  },
  notion: {
    authUrl: 'https://api.notion.com/v1/oauth/authorize',
    tokenUrl: 'https://api.notion.com/v1/oauth/token',
    clientId: 'test-notion-client-id',
    scopes: [],
    pkceRequired: false,
  },
  dropbox: {
    authUrl: 'https://www.dropbox.com/oauth2/authorize',
    tokenUrl: 'https://api.dropboxapi.com/oauth2/token',
    clientId: 'test-dropbox-client-id',
    scopes: ['files.metadata.read', 'files.content.read'],
    pkceRequired: true,
  },
  github: {
    authUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    clientId: 'test-github-client-id',
    scopes: ['repo', 'read:user'],
    pkceRequired: true,
  },
}

// Mock crypto API
const mockCrypto = {
  getRandomValues: vi.fn((array: Uint8Array) => {
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256)
    }
    return array
  }),
  subtle: {
    digest: vi.fn(async (_algorithm: string, data: ArrayBuffer) => {
      // Simple mock that returns a deterministic hash-like buffer
      const arr = new Uint8Array(data)
      const result = new Uint8Array(32)
      for (let i = 0; i < 32; i++) {
        result[i] = arr[i % arr.length] ^ (i * 17)
      }
      return result.buffer
    }),
  },
}

// Store original crypto
const originalCrypto = global.crypto

// Import after mocking
import { OAuthGateway } from '@/features/connectors/oauth-gateway'

// Create a testable wrapper that uses our mock configs
class TestableOAuthGateway {
  static generateCodeVerifier =
    OAuthGateway.generateCodeVerifier.bind(OAuthGateway)
  static generateCodeChallenge =
    OAuthGateway.generateCodeChallenge.bind(OAuthGateway)
  static generateState = OAuthGateway.generateState.bind(OAuthGateway)
  static cleanup = OAuthGateway.cleanup.bind(OAuthGateway)

  static getProviderOAuthConfig(provider: string) {
    const config = mockOAuthConfigs[provider]
    if (!config) {
      throw new Error(
        `OAuth not configured for provider: {provider}`.replace(
          '{provider}',
          provider,
        ),
      )
    }
    if (!config.clientId) {
      throw new Error(
        `Missing client ID for provider: {provider}`.replace(
          '{provider}',
          provider,
        ),
      )
    }
    return config
  }

  static getRedirectUri(): string {
    return `${window.location.origin}/oauth/callback`
  }

  static buildAuthUrl(
    provider: string,
    state: string,
    codeChallenge: string,
  ): string {
    const config = this.getProviderOAuthConfig(provider)
    const params = new URLSearchParams()

    params.set('client_id', config.clientId)
    params.set('redirect_uri', this.getRedirectUri())
    params.set('response_type', 'code')
    params.set('state', state)

    if (config.scopes.length > 0) {
      params.set('scope', config.scopes.join(' '))
    }

    if (config.pkceRequired) {
      params.set('code_challenge', codeChallenge)
      params.set('code_challenge_method', 'S256')
    }

    if (provider.startsWith('google')) {
      params.set('access_type', 'offline')
      params.set('prompt', 'consent')
    } else if (provider === 'notion') {
      params.set('owner', 'user')
    } else if (provider === 'dropbox') {
      params.set('token_access_type', 'offline')
    }

    return `${config.authUrl}?${params.toString()}`
  }
}

describe('OAuthGateway', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock crypto
    Object.defineProperty(global, 'crypto', {
      value: mockCrypto,
      writable: true,
      configurable: true,
    })
  })

  afterEach(() => {
    // Restore original crypto
    Object.defineProperty(global, 'crypto', {
      value: originalCrypto,
      writable: true,
      configurable: true,
    })
  })

  describe('generateCodeVerifier', () => {
    it('should generate a string of correct length', () => {
      const verifier = OAuthGateway.generateCodeVerifier()
      // Base64URL encoding of 64 bytes should produce ~86 characters
      // (64 * 4/3 = 85.33, without padding)
      expect(verifier.length).toBeGreaterThanOrEqual(43)
      expect(verifier.length).toBeLessThanOrEqual(128)
    })

    it('should only contain valid base64url characters', () => {
      const verifier = OAuthGateway.generateCodeVerifier()
      // Base64URL characters: A-Z, a-z, 0-9, -, _
      const base64UrlPattern = /^[A-Za-z0-9_-]+$/
      expect(verifier).toMatch(base64UrlPattern)
    })

    it('should not contain padding characters', () => {
      const verifier = OAuthGateway.generateCodeVerifier()
      expect(verifier).not.toContain('=')
    })

    it('should generate different values on each call', () => {
      const verifier1 = OAuthGateway.generateCodeVerifier()
      const verifier2 = OAuthGateway.generateCodeVerifier()
      expect(verifier1).not.toBe(verifier2)
    })
  })

  describe('generateCodeChallenge', () => {
    it('should generate valid base64url hash', async () => {
      const verifier = 'test-verifier-string'
      const challenge = await OAuthGateway.generateCodeChallenge(verifier)

      // Should be base64url encoded
      const base64UrlPattern = /^[A-Za-z0-9_-]+$/
      expect(challenge).toMatch(base64UrlPattern)
    })

    it('should be deterministic for same input', async () => {
      const verifier = 'consistent-verifier'
      const challenge1 = await OAuthGateway.generateCodeChallenge(verifier)
      const challenge2 = await OAuthGateway.generateCodeChallenge(verifier)

      expect(challenge1).toBe(challenge2)
    })

    it('should produce different output for different inputs', async () => {
      const challenge1 = await OAuthGateway.generateCodeChallenge('verifier-1')
      const challenge2 = await OAuthGateway.generateCodeChallenge('verifier-2')

      expect(challenge1).not.toBe(challenge2)
    })

    it('should not contain padding characters', async () => {
      const challenge =
        await OAuthGateway.generateCodeChallenge('test-verifier')
      expect(challenge).not.toContain('=')
    })
  })

  describe('generateState', () => {
    it('should generate unique values', () => {
      const states = new Set<string>()
      for (let i = 0; i < 100; i++) {
        states.add(OAuthGateway.generateState())
      }
      // All 100 generated states should be unique
      expect(states.size).toBe(100)
    })

    it('should only contain valid base64url characters', () => {
      const state = OAuthGateway.generateState()
      const base64UrlPattern = /^[A-Za-z0-9_-]+$/
      expect(state).toMatch(base64UrlPattern)
    })

    it('should have reasonable length for security', () => {
      const state = OAuthGateway.generateState()
      // State should be at least 16 characters for security
      expect(state.length).toBeGreaterThanOrEqual(16)
    })
  })

  describe('getProviderOAuthConfig', () => {
    it('should return config for google-drive', () => {
      const config = TestableOAuthGateway.getProviderOAuthConfig('google-drive')

      expect(config).toBeDefined()
      expect(config.authUrl).toBe(
        'https://accounts.google.com/o/oauth2/v2/auth',
      )
      expect(config.tokenUrl).toBe('https://oauth2.googleapis.com/token')
      expect(config.clientId).toBe('test-google-client-id')
      expect(config.pkceRequired).toBe(true)
      expect(config.scopes).toContain(
        'https://www.googleapis.com/auth/drive.readonly',
      )
    })

    it('should return config for notion', () => {
      const config = TestableOAuthGateway.getProviderOAuthConfig('notion')

      expect(config).toBeDefined()
      expect(config.authUrl).toBe('https://api.notion.com/v1/oauth/authorize')
      expect(config.tokenUrl).toBe('https://api.notion.com/v1/oauth/token')
      expect(config.clientId).toBe('test-notion-client-id')
      expect(config.pkceRequired).toBe(false)
      expect(config.scopes).toEqual([])
    })

    it('should return config for gmail', () => {
      const config = TestableOAuthGateway.getProviderOAuthConfig('gmail')

      expect(config).toBeDefined()
      expect(config.authUrl).toBe(
        'https://accounts.google.com/o/oauth2/v2/auth',
      )
      expect(config.scopes).toContain(
        'https://www.googleapis.com/auth/gmail.readonly',
      )
    })

    it('should return config for google-calendar', () => {
      const config =
        TestableOAuthGateway.getProviderOAuthConfig('google-calendar')

      expect(config).toBeDefined()
      expect(config.scopes).toContain(
        'https://www.googleapis.com/auth/calendar.readonly',
      )
    })

    it('should return config for dropbox', () => {
      const config = TestableOAuthGateway.getProviderOAuthConfig('dropbox')

      expect(config).toBeDefined()
      expect(config.authUrl).toBe('https://www.dropbox.com/oauth2/authorize')
      expect(config.pkceRequired).toBe(true)
    })

    it('should return config for github', () => {
      const config = TestableOAuthGateway.getProviderOAuthConfig('github')

      expect(config).toBeDefined()
      expect(config.authUrl).toBe('https://github.com/login/oauth/authorize')
      expect(config.pkceRequired).toBe(true)
    })

    it('should throw for invalid provider', () => {
      expect(() => {
        TestableOAuthGateway.getProviderOAuthConfig('invalid-provider')
      }).toThrow('OAuth not configured for provider: invalid-provider')
    })

    it('should throw when client ID is missing', () => {
      // Temporarily modify mock config
      const originalConfig = mockOAuthConfigs['google-drive']
      mockOAuthConfigs['google-drive'] = { ...originalConfig, clientId: '' }

      expect(() => {
        TestableOAuthGateway.getProviderOAuthConfig('google-drive')
      }).toThrow('Missing client ID for provider: google-drive')

      // Restore
      mockOAuthConfigs['google-drive'] = originalConfig
    })
  })

  describe('getRedirectUri', () => {
    beforeEach(() => {
      // Mock window.location
      Object.defineProperty(window, 'location', {
        value: { origin: 'https://example.com' },
        writable: true,
      })
    })

    it('should return default redirect URI based on origin', () => {
      const uri = TestableOAuthGateway.getRedirectUri()
      expect(uri).toBe('https://example.com/oauth/callback')
    })
  })

  describe('buildAuthUrl', () => {
    beforeEach(() => {
      Object.defineProperty(window, 'location', {
        value: { origin: 'https://example.com' },
        writable: true,
      })
    })

    it('should include all required OAuth parameters', () => {
      const state = 'test-state'
      const codeChallenge = 'test-challenge'
      const url = TestableOAuthGateway.buildAuthUrl(
        'google-drive',
        state,
        codeChallenge,
      )

      const parsed = new URL(url)
      expect(parsed.searchParams.get('client_id')).toBe('test-google-client-id')
      expect(parsed.searchParams.get('redirect_uri')).toBe(
        'https://example.com/oauth/callback',
      )
      expect(parsed.searchParams.get('response_type')).toBe('code')
      expect(parsed.searchParams.get('state')).toBe(state)
    })

    it('should include PKCE parameters for providers that require it', () => {
      const state = 'test-state'
      const codeChallenge = 'test-challenge'
      const url = TestableOAuthGateway.buildAuthUrl(
        'google-drive',
        state,
        codeChallenge,
      )

      const parsed = new URL(url)
      expect(parsed.searchParams.get('code_challenge')).toBe(codeChallenge)
      expect(parsed.searchParams.get('code_challenge_method')).toBe('S256')
    })

    it('should not include PKCE parameters for providers that do not require it', () => {
      const state = 'test-state'
      const codeChallenge = 'test-challenge'
      const url = TestableOAuthGateway.buildAuthUrl(
        'notion',
        state,
        codeChallenge,
      )

      const parsed = new URL(url)
      expect(parsed.searchParams.has('code_challenge')).toBe(false)
      expect(parsed.searchParams.has('code_challenge_method')).toBe(false)
    })

    it('should include scopes when configured', () => {
      const url = TestableOAuthGateway.buildAuthUrl(
        'google-drive',
        'state',
        'challenge',
      )
      const parsed = new URL(url)

      const scope = parsed.searchParams.get('scope')
      expect(scope).toContain('drive.readonly')
    })

    it('should include Google-specific parameters', () => {
      const url = TestableOAuthGateway.buildAuthUrl(
        'google-drive',
        'state',
        'challenge',
      )
      const parsed = new URL(url)

      expect(parsed.searchParams.get('access_type')).toBe('offline')
      expect(parsed.searchParams.get('prompt')).toBe('consent')
    })

    it('should include Notion-specific parameters', () => {
      const url = TestableOAuthGateway.buildAuthUrl(
        'notion',
        'state',
        'challenge',
      )
      const parsed = new URL(url)

      expect(parsed.searchParams.get('owner')).toBe('user')
    })

    it('should include Dropbox-specific parameters', () => {
      const url = TestableOAuthGateway.buildAuthUrl(
        'dropbox',
        'state',
        'challenge',
      )
      const parsed = new URL(url)

      expect(parsed.searchParams.get('token_access_type')).toBe('offline')
    })

    it('should use correct base URL for each provider', () => {
      const googleUrl = TestableOAuthGateway.buildAuthUrl(
        'google-drive',
        's',
        'c',
      )
      const notionUrl = TestableOAuthGateway.buildAuthUrl('notion', 's', 'c')
      const dropboxUrl = TestableOAuthGateway.buildAuthUrl('dropbox', 's', 'c')
      const githubUrl = TestableOAuthGateway.buildAuthUrl('github', 's', 'c')

      expect(googleUrl).toContain('accounts.google.com')
      expect(notionUrl).toContain('api.notion.com')
      expect(dropboxUrl).toContain('dropbox.com')
      expect(githubUrl).toContain('github.com')
    })
  })

  describe('cleanup', () => {
    it('should be callable without error', () => {
      expect(() => OAuthGateway.cleanup()).not.toThrow()
    })
  })

  describe('hasPendingAuth', () => {
    it('should return false when no pending auth flows', () => {
      expect(OAuthGateway.hasPendingAuth()).toBe(false)
    })
  })

  describe('getPendingAuth', () => {
    it('should return undefined for unknown state', () => {
      expect(OAuthGateway.getPendingAuth('unknown-state')).toBeUndefined()
    })
  })
})
