import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import {
  buildLanguageUrl,
  detectPreferredLanguage,
  hasLanguagePrefix,
} from '@/lib/detect-language'

describe('detect-language', () => {
  describe('detectPreferredLanguage', () => {
    beforeEach(() => {
      // Reset navigator mock before each test
      vi.stubGlobal('navigator', { languages: [] })
    })

    afterEach(() => {
      vi.unstubAllGlobals()
    })

    it('should return default language when navigator.languages is empty', () => {
      vi.stubGlobal('navigator', { languages: [] })
      expect(detectPreferredLanguage()).toBe('en')
    })

    it('should detect exact language match', () => {
      vi.stubGlobal('navigator', { languages: ['fr', 'en'] })
      expect(detectPreferredLanguage()).toBe('fr')
    })

    it('should extract language code from locale (e.g., fr-FR -> fr)', () => {
      vi.stubGlobal('navigator', { languages: ['fr-FR', 'en-US'] })
      expect(detectPreferredLanguage()).toBe('fr')
    })

    it('should fall back to second preference if first is not supported', () => {
      vi.stubGlobal('navigator', { languages: ['zh-CN', 'es-ES', 'en'] })
      expect(detectPreferredLanguage()).toBe('es')
    })

    it('should return default language when no supported language found', () => {
      vi.stubGlobal('navigator', { languages: ['zh-CN', 'ja-JP', 'ru-RU'] })
      expect(detectPreferredLanguage()).toBe('en')
    })

    it('should handle Korean language', () => {
      vi.stubGlobal('navigator', { languages: ['ko-KR', 'en-US'] })
      expect(detectPreferredLanguage()).toBe('ko')
    })

    it('should handle German language', () => {
      vi.stubGlobal('navigator', { languages: ['de-DE', 'en-GB'] })
      expect(detectPreferredLanguage()).toBe('de')
    })

    it('should handle Arabic language', () => {
      vi.stubGlobal('navigator', { languages: ['ar-SA', 'en-US'] })
      expect(detectPreferredLanguage()).toBe('ar')
    })

    it('should be case-insensitive', () => {
      vi.stubGlobal('navigator', { languages: ['FR-FR', 'EN-US'] })
      expect(detectPreferredLanguage()).toBe('fr')
    })
  })

  describe('hasLanguagePrefix', () => {
    it('should return false for root path', () => {
      expect(hasLanguagePrefix('/')).toBe(false)
    })

    it('should return false for paths without language prefix', () => {
      expect(hasLanguagePrefix('/agents')).toBe(false)
      expect(hasLanguagePrefix('/#settings')).toBe(false)
      expect(hasLanguagePrefix('/knowledge/files')).toBe(false)
    })

    it('should return true for paths with language prefix', () => {
      expect(hasLanguagePrefix('/fr')).toBe(true)
      expect(hasLanguagePrefix('/fr/')).toBe(true)
      expect(hasLanguagePrefix('/fr/agents')).toBe(true)
      expect(hasLanguagePrefix('/de/settings')).toBe(true)
      expect(hasLanguagePrefix('/es/knowledge/files')).toBe(true)
    })

    it('should be case-insensitive', () => {
      expect(hasLanguagePrefix('/FR/agents')).toBe(true)
      expect(hasLanguagePrefix('/De/settings')).toBe(true)
    })

    it('should not match partial language codes', () => {
      expect(hasLanguagePrefix('/french/agents')).toBe(false)
      expect(hasLanguagePrefix('/english/settings')).toBe(false)
    })
  })

  describe('buildLanguageUrl', () => {
    it('should return path as-is for default language (en)', () => {
      expect(buildLanguageUrl('/agents', 'en')).toBe('/agents')
      expect(buildLanguageUrl('/#settings', 'en')).toBe('/#settings')
    })

    it('should return root for empty path with default language', () => {
      expect(buildLanguageUrl('', 'en')).toBe('/')
      expect(buildLanguageUrl('/', 'en')).toBe('/')
    })

    it('should add language prefix for non-default languages', () => {
      expect(buildLanguageUrl('/agents', 'fr')).toBe('/fr/agents')
      expect(buildLanguageUrl('/#settings', 'de')).toBe('/de/settings')
      expect(buildLanguageUrl('/knowledge/files', 'es')).toBe(
        '/es/knowledge/files',
      )
    })

    it('should handle empty path for non-default languages', () => {
      expect(buildLanguageUrl('', 'fr')).toBe('/fr')
      // For '/' path, we strip trailing slash for consistency (home page = /de)
      expect(buildLanguageUrl('/', 'de')).toBe('/de')
    })

    it('should remove existing language prefix before adding new one', () => {
      expect(buildLanguageUrl('/fr/agents', 'de')).toBe('/de/agents')
      expect(buildLanguageUrl('/es/#settings', 'fr')).toBe('/fr/settings')
    })

    it('should handle query strings and hashes', () => {
      expect(buildLanguageUrl('/agents?tab=all', 'fr')).toBe(
        '/fr/agents?tab=all',
      )
      expect(buildLanguageUrl('/#settings/appearance', 'de')).toBe(
        '/de/#settings/appearance',
      )
    })
  })
})
