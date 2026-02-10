import '@testing-library/jest-dom'
import { vi } from 'vitest'
import { webcrypto } from 'node:crypto'

// Polyfill Web Crypto API for jsdom (provides crypto.subtle + randomUUID)
Object.defineProperty(global, 'crypto', {
  value: webcrypto,
  writable: true,
})

// Mock browser APIs
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})
