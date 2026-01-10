import { describe, it, expect } from 'vitest'
import { slugify, generateUniqueSlug } from '@/lib/slugify'

describe('slugify', () => {
  describe('basic functionality', () => {
    it('should convert to lowercase', () => {
      expect(slugify('Hello World')).toBe('hello-world')
    })

    it('should replace spaces with hyphens', () => {
      expect(slugify('foo bar baz')).toBe('foo-bar-baz')
    })

    it('should remove special characters', () => {
      expect(slugify('hello@world!')).toBe('helloworld')
    })

    it('should remove consecutive hyphens', () => {
      expect(slugify('hello   world')).toBe('hello-world')
      expect(slugify('hello---world')).toBe('hello-world')
    })

    it('should trim leading and trailing hyphens', () => {
      expect(slugify(' hello world ')).toBe('hello-world')
      expect(slugify('-hello-world-')).toBe('hello-world')
    })

    it('should handle empty string', () => {
      expect(slugify('')).toBe('')
    })

    it('should handle null/undefined input', () => {
      expect(slugify(null as unknown as string)).toBe('')
      expect(slugify(undefined as unknown as string)).toBe('')
    })
  })

  describe('accent handling', () => {
    it('should remove accents from French characters', () => {
      expect(slugify('Café résumé')).toBe('cafe-resume')
    })

    it('should remove accents from German characters', () => {
      expect(slugify('Müller Größe')).toBe('muller-groe')
    })

    it('should remove accents from Spanish characters', () => {
      expect(slugify('Señor niño')).toBe('senor-nino')
    })

    it('should handle mixed international characters', () => {
      expect(slugify('Crème brûlée')).toBe('creme-brulee')
    })
  })

  describe('length limiting', () => {
    it('should respect default max length of 50', () => {
      const longString = 'a'.repeat(100)
      expect(slugify(longString).length).toBe(50)
    })

    it('should respect custom max length', () => {
      const longString = 'a'.repeat(100)
      expect(slugify(longString, 20).length).toBe(20)
    })

    it('should not truncate short strings', () => {
      expect(slugify('short', 50)).toBe('short')
    })
  })

  describe('real-world agent names', () => {
    it('should slugify "Albert Einstein"', () => {
      expect(slugify('Albert Einstein')).toBe('albert-einstein')
    })

    it('should slugify "Financial Advisor"', () => {
      expect(slugify('Financial Advisor')).toBe('financial-advisor')
    })

    it('should slugify "Da Vinci"', () => {
      expect(slugify('Da Vinci')).toBe('da-vinci')
    })

    it('should slugify "Jean-Jacques Rousseau"', () => {
      expect(slugify('Jean-Jacques Rousseau')).toBe('jean-jacques-rousseau')
    })

    it('should slugify agent name with special chars', () => {
      expect(slugify('My Agent (v2.0)')).toBe('my-agent-v20')
    })
  })
})

describe('generateUniqueSlug', () => {
  describe('basic functionality', () => {
    it('should return base slug if no conflicts', () => {
      const existingSlugs = new Set(['other-slug'])
      expect(generateUniqueSlug('my-slug', existingSlugs)).toBe('my-slug')
    })

    it('should append -2 for first conflict', () => {
      const existingSlugs = new Set(['my-slug'])
      expect(generateUniqueSlug('my-slug', existingSlugs)).toBe('my-slug-2')
    })

    it('should increment number for multiple conflicts', () => {
      const existingSlugs = new Set(['my-slug', 'my-slug-2', 'my-slug-3'])
      expect(generateUniqueSlug('my-slug', existingSlugs)).toBe('my-slug-4')
    })

    it('should handle array input', () => {
      const existingSlugs = ['my-slug', 'my-slug-2']
      expect(generateUniqueSlug('my-slug', existingSlugs)).toBe('my-slug-3')
    })

    it('should handle empty existing slugs', () => {
      expect(generateUniqueSlug('my-slug', new Set())).toBe('my-slug')
      expect(generateUniqueSlug('my-slug', [])).toBe('my-slug')
    })
  })

  describe('excludeSlug for updates', () => {
    it('should allow same slug when excluded (update scenario)', () => {
      const existingSlugs = new Set(['my-slug', 'other-slug'])
      expect(generateUniqueSlug('my-slug', existingSlugs, 'my-slug')).toBe(
        'my-slug',
      )
    })

    it('should still enforce uniqueness against other slugs', () => {
      const existingSlugs = new Set(['my-slug', 'other-slug'])
      expect(generateUniqueSlug('other-slug', existingSlugs, 'my-slug')).toBe(
        'other-slug-2',
      )
    })
  })

  describe('edge cases', () => {
    it('should handle gaps in numbering', () => {
      const existingSlugs = new Set(['my-slug', 'my-slug-3', 'my-slug-5'])
      expect(generateUniqueSlug('my-slug', existingSlugs)).toBe('my-slug-2')
    })

    it('should handle large number of conflicts', () => {
      const existingSlugs = new Set<string>()
      for (let i = 0; i < 100; i++) {
        existingSlugs.add(`my-slug${i > 0 ? `-${i + 1}` : ''}`)
      }
      const result = generateUniqueSlug('my-slug', existingSlugs)
      expect(result).toBe('my-slug-101')
    })
  })
})
