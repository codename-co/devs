import { describe, expect, test } from 'vitest'
import { detectSpecializedCodeType } from '@/components/Widget'

describe('Widget Marpit Detection', () => {
  test('should detect marpit by language', () => {
    const code = `# My Presentation

This is a simple slide.

---

## Slide 2

More content here.`

    expect(detectSpecializedCodeType(code, 'marpit')).toBe('marpit')
    expect(detectSpecializedCodeType(code, 'marp')).toBe('marpit')
  })

  test('should detect marpit by content with YAML frontmatter', () => {
    const code = `---
marp: true
theme: default
---

# Welcome to Marpit

---

## Features

- Simple
- Flexible`

    expect(detectSpecializedCodeType(code)).toBe('marpit')
  })

  test('should detect marpit by Marp directives', () => {
    const code = `<!-- theme: default -->
<!-- paginate: true -->

# My Presentation

---

## Slide 2`

    expect(detectSpecializedCodeType(code)).toBe('marpit')
  })

  test('should detect marpit by class directives', () => {
    const code = `# My Presentation

<!-- _class: lead -->

Welcome to this presentation

---

## Features`

    expect(detectSpecializedCodeType(code)).toBe('marpit')
  })

  test('should not detect marpit for short content', () => {
    const code = `# Short title`

    expect(detectSpecializedCodeType(code, 'markdown')).toBe(null)
  })

  test('should detect marpit for long markdown with slide separators without headers', () => {
    const code = `Welcome to this presentation

This is a longer presentation that should be detected as Marpit because it has slide separators and sufficient length to be a meaningful presentation.

---

Features:

- Feature 1
- Feature 2
- Feature 3

---

Conclusion

Thank you for your attention!`

    expect(detectSpecializedCodeType(code, 'markdown')).toBe('marpit')
  })

  test('should not detect regular markdown without slide patterns', () => {
    const code = `# Regular Markdown

This is just regular markdown content without any slide-specific patterns or sufficient length to warrant slide treatment.`

    expect(detectSpecializedCodeType(code, 'markdown')).toBe(null)
  })
})
