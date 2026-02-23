/**
 * Tests for GitHub Content Fetcher — Agent Skills
 *
 * This tests the pure/sync utility functions (parseGitHubUrl, parseFrontmatter,
 * detectLanguage, detectMimeType, extractPythonPackages) and the main
 * fetchSkillFromGitHub function (with mocked fetch).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  parseGitHubUrl,
  parseFrontmatter,
  detectLanguage,
  detectMimeType,
  extractPythonPackages,
  fetchSkillFromGitHub,
  PYTHON_STDLIB_MODULES,
} from '@/lib/skills/github-fetcher'

// ── parseGitHubUrl ──

describe('parseGitHubUrl', () => {
  it('should parse a standard GitHub tree URL', () => {
    const result = parseGitHubUrl(
      'https://github.com/owner/repo/tree/main/path/to/skill',
    )
    expect(result).toEqual({
      owner: 'owner',
      repo: 'repo',
      branch: 'main',
      path: 'path/to/skill',
    })
  })

  it('should handle branches with slashes (single segment)', () => {
    const result = parseGitHubUrl(
      'https://github.com/acme/tools/tree/develop/.agent',
    )
    expect(result).toEqual({
      owner: 'acme',
      repo: 'tools',
      branch: 'develop',
      path: '.agent',
    })
  })

  it('should throw on invalid URL format', () => {
    expect(() => parseGitHubUrl('https://github.com/owner/repo')).toThrow(
      'Invalid GitHub URL format',
    )
    expect(() =>
      parseGitHubUrl('https://gitlab.com/owner/repo/tree/main/x'),
    ).toThrow('Invalid GitHub URL format')
    expect(() => parseGitHubUrl('not-a-url')).toThrow(
      'Invalid GitHub URL format',
    )
  })

  it('should handle paths with multiple segments', () => {
    const result = parseGitHubUrl(
      'https://github.com/user/project/tree/v1.0/agents/coding/python',
    )
    expect(result).toEqual({
      owner: 'user',
      repo: 'project',
      branch: 'v1.0',
      path: 'agents/coding/python',
    })
  })

  it('should parse a GitHub blob URL', () => {
    const result = parseGitHubUrl(
      'https://github.com/anthropics/skills/blob/main/skills/brand-guidelines/SKILL.md',
    )
    expect(result).toEqual({
      owner: 'anthropics',
      repo: 'skills',
      branch: 'main',
      path: 'skills/brand-guidelines',
    })
  })

  it('should parse a raw.githubusercontent.com URL with refs/heads', () => {
    const result = parseGitHubUrl(
      'https://raw.githubusercontent.com/anthropics/skills/refs/heads/main/skills/brand-guidelines/SKILL.md',
    )
    expect(result).toEqual({
      owner: 'anthropics',
      repo: 'skills',
      branch: 'main',
      path: 'skills/brand-guidelines',
    })
  })

  it('should parse a raw.githubusercontent.com URL (standard format)', () => {
    const result = parseGitHubUrl(
      'https://raw.githubusercontent.com/owner/repo/main/path/to/skill/SKILL.md',
    )
    expect(result).toEqual({
      owner: 'owner',
      repo: 'repo',
      branch: 'main',
      path: 'path/to/skill',
    })
  })

  it('should strip SKILL.md from tree URLs', () => {
    const result = parseGitHubUrl(
      'https://github.com/owner/repo/tree/main/my-skill/SKILL.md',
    )
    expect(result).toEqual({
      owner: 'owner',
      repo: 'repo',
      branch: 'main',
      path: 'my-skill',
    })
  })

  it('should parse the mcp-builder GitHub tree URL', () => {
    const result = parseGitHubUrl(
      'https://github.com/anthropics/skills/tree/main/skills/mcp-builder',
    )
    expect(result).toEqual({
      owner: 'anthropics',
      repo: 'skills',
      branch: 'main',
      path: 'skills/mcp-builder',
    })
  })
})

// ── parseFrontmatter ──

describe('parseFrontmatter', () => {
  it('should parse standard YAML frontmatter', () => {
    const raw = `---
name: my-skill
description: A test skill
license: MIT
---
# Hello World

Instructions here.`
    const result = parseFrontmatter(raw)

    expect(result.frontmatter.name).toBe('my-skill')
    expect(result.frontmatter.description).toBe('A test skill')
    expect(result.frontmatter.license).toBe('MIT')
    expect(result.body).toContain('# Hello World')
    expect(result.body).toContain('Instructions here.')
  })

  it('should handle quoted values', () => {
    const raw = `---
name: "quoted name"
description: 'single quoted'
---
Body`
    const result = parseFrontmatter(raw)
    expect(result.frontmatter.name).toBe('quoted name')
    expect(result.frontmatter.description).toBe('single quoted')
  })

  it('should handle multi-line values with > block scalar', () => {
    const raw = `---
name: my-skill
description: >
  This is a long
  description that
  spans multiple lines.
---
Body`
    const result = parseFrontmatter(raw)
    expect(result.frontmatter.description).toContain('This is a long')
    expect(result.frontmatter.description).toContain('spans multiple lines.')
  })

  it('should handle nested mappings', () => {
    const raw = `---
name: my-skill
metadata:
  category: coding
  version: 1.0.0
---
Body`
    const result = parseFrontmatter(raw)
    expect(result.frontmatter.metadata).toEqual({
      category: 'coding',
      version: '1.0.0',
    })
  })

  it('should throw when frontmatter is missing', () => {
    expect(() => parseFrontmatter('# No frontmatter')).toThrow(
      'SKILL.md does not contain valid YAML frontmatter',
    )
  })

  it('should return an empty body when there is nothing after ---', () => {
    const raw = `---
name: minimal
---
`
    const result = parseFrontmatter(raw)
    expect(result.frontmatter.name).toBe('minimal')
    expect(result.body.trim()).toBe('')
  })
})

// ── detectLanguage ──

describe('detectLanguage', () => {
  it('should detect Python', () => {
    expect(detectLanguage('script.py')).toBe('python')
  })

  it('should detect Bash', () => {
    expect(detectLanguage('run.sh')).toBe('bash')
    expect(detectLanguage('build.bash')).toBe('bash')
  })

  it('should detect JavaScript/TypeScript', () => {
    expect(detectLanguage('index.js')).toBe('javascript')
    expect(detectLanguage('utils.ts')).toBe('javascript')
    expect(detectLanguage('module.mjs')).toBe('javascript')
  })

  it('should return "other" for unknown extensions', () => {
    expect(detectLanguage('data.csv')).toBe('other')
    expect(detectLanguage('config.toml')).toBe('other')
    expect(detectLanguage('noext')).toBe('other')
  })
})

// ── detectMimeType ──

describe('detectMimeType', () => {
  it('should detect markdown', () => {
    expect(detectMimeType('README.md')).toBe('text/markdown')
  })

  it('should detect images', () => {
    expect(detectMimeType('icon.png')).toBe('image/png')
    expect(detectMimeType('photo.jpg')).toBe('image/jpeg')
    expect(detectMimeType('logo.svg')).toBe('image/svg+xml')
  })

  it('should detect JSON and YAML', () => {
    expect(detectMimeType('config.json')).toBe('application/json')
    expect(detectMimeType('schema.yaml')).toBe('text/yaml')
    expect(detectMimeType('data.yml')).toBe('text/yaml')
  })

  it('should return undefined for unknown extensions', () => {
    expect(detectMimeType('script.py')).toBeUndefined()
    expect(detectMimeType('noext')).toBeUndefined()
  })
})

// ── extractPythonPackages ──

describe('extractPythonPackages', () => {
  it('should extract third-party import statements', () => {
    const source = `
import requests
import numpy as np
from pandas import DataFrame
from collections import OrderedDict
import os
`
    const packages = extractPythonPackages(source)
    expect(packages).toContain('requests')
    expect(packages).toContain('numpy')
    expect(packages).toContain('pandas')
  })

  it('should filter out stdlib modules', () => {
    const source = `
import os
import sys
import json
from pathlib import Path
from datetime import datetime
`
    const packages = extractPythonPackages(source)
    expect(packages).toHaveLength(0)
  })

  it('should handle dotted imports', () => {
    const source = `
from sklearn.model_selection import train_test_split
import matplotlib.pyplot as plt
`
    const packages = extractPythonPackages(source)
    expect(packages).toContain('sklearn')
    expect(packages).toContain('matplotlib')
  })

  it('should deduplicate and sort', () => {
    const source = `
import requests
import requests
from requests import Session
`
    const packages = extractPythonPackages(source)
    expect(packages).toEqual(['requests'])
  })

  it('should handle empty source', () => {
    expect(extractPythonPackages('')).toEqual([])
  })

  it('should handle multiple imports on one line', () => {
    const source = `import flask, django`
    const packages = extractPythonPackages(source)
    expect(packages).toContain('flask')
    expect(packages).toContain('django')
  })
})

// ── PYTHON_STDLIB_MODULES ──

describe('PYTHON_STDLIB_MODULES', () => {
  it('should contain common stdlib modules', () => {
    expect(PYTHON_STDLIB_MODULES.has('os')).toBe(true)
    expect(PYTHON_STDLIB_MODULES.has('sys')).toBe(true)
    expect(PYTHON_STDLIB_MODULES.has('json')).toBe(true)
    expect(PYTHON_STDLIB_MODULES.has('asyncio')).toBe(true)
  })

  it('should not contain third-party modules', () => {
    expect(PYTHON_STDLIB_MODULES.has('requests')).toBe(false)
    expect(PYTHON_STDLIB_MODULES.has('numpy')).toBe(false)
    expect(PYTHON_STDLIB_MODULES.has('flask')).toBe(false)
  })
})

// ── fetchSkillFromGitHub (mocked fetch) ──

describe('fetchSkillFromGitHub', () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    globalThis.fetch = vi.fn()
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  /**
   * Helper: build a mock Response object.
   */
  function mockResponse(body: unknown, ok = true, status = 200) {
    return {
      ok,
      status,
      json: () => Promise.resolve(body),
      text: () =>
        Promise.resolve(typeof body === 'string' ? body : JSON.stringify(body)),
    } as unknown as Response
  }

  const SKILL_MD = `---
name: pptx
description: Create and edit PowerPoint presentations
license: MIT
---
# PPTX Skill

Use this skill for presentations.`

  it('should fetch root-level files alongside SKILL.md as references', async () => {
    const mockFetch = globalThis.fetch as ReturnType<typeof vi.fn>

    // Root directory listing — includes SKILL.md + extra .md files + known dirs
    const rootDirListing = [
      {
        name: 'SKILL.md',
        path: 'skills/pptx/SKILL.md',
        type: 'file',
        download_url: null,
        size: 200,
      },
      {
        name: 'editing.md',
        path: 'skills/pptx/editing.md',
        type: 'file',
        download_url: null,
        size: 500,
      },
      {
        name: 'pptxgenjs.md',
        path: 'skills/pptx/pptxgenjs.md',
        type: 'file',
        download_url: null,
        size: 800,
      },
      {
        name: 'scripts',
        path: 'skills/pptx/scripts',
        type: 'dir',
        download_url: null,
        size: 0,
      },
    ]

    // scripts/ directory listing
    const scriptsDirListing = [
      {
        name: 'convert.py',
        path: 'skills/pptx/scripts/convert.py',
        type: 'file',
        download_url: null,
        size: 100,
      },
    ]

    mockFetch.mockImplementation((url: string) => {
      // GitHub API — directory listings
      if (url.includes('api.github.com/repos') && url.endsWith('skills/pptx')) {
        return Promise.resolve(mockResponse(rootDirListing))
      }
      if (
        url.includes('api.github.com/repos') &&
        url.endsWith('skills/pptx/scripts')
      ) {
        return Promise.resolve(mockResponse(scriptsDirListing))
      }
      // references/ and assets/ → 404 (don't exist)
      if (url.includes('api.github.com/repos')) {
        return Promise.resolve(
          mockResponse({ message: 'Not Found' }, false, 404),
        )
      }

      // raw.githubusercontent.com — file content
      if (
        url.includes('raw.githubusercontent.com') &&
        url.endsWith('SKILL.md')
      ) {
        return Promise.resolve(mockResponse(SKILL_MD))
      }
      if (
        url.includes('raw.githubusercontent.com') &&
        url.endsWith('editing.md')
      ) {
        return Promise.resolve(
          mockResponse('# Editing Guide\n\nHow to edit pptx files.'),
        )
      }
      if (
        url.includes('raw.githubusercontent.com') &&
        url.endsWith('pptxgenjs.md')
      ) {
        return Promise.resolve(
          mockResponse('# PptxGenJS Docs\n\nAPI reference.'),
        )
      }
      if (
        url.includes('raw.githubusercontent.com') &&
        url.endsWith('convert.py')
      ) {
        return Promise.resolve(mockResponse('import pptx\nprint("hello")'))
      }

      return Promise.resolve(mockResponse('Not found', false, 404))
    })

    const result = await fetchSkillFromGitHub(
      'https://github.com/anthropics/skills/tree/main/skills/pptx',
    )

    // Verify manifest
    expect(result.manifest.name).toBe('pptx')
    expect(result.manifest.description).toBe(
      'Create and edit PowerPoint presentations',
    )

    // Verify scripts were fetched
    expect(result.scripts).toHaveLength(1)
    expect(result.scripts[0].path).toBe('skills/pptx/scripts/convert.py')
    expect(result.scripts[0].language).toBe('python')
    expect(result.scripts[0].requiredPackages).toEqual(['pptx'])

    // Verify root-level .md files are in references
    expect(result.references).toHaveLength(2)
    const refPaths = result.references.map((r) => r.path)
    expect(refPaths).toContain('skills/pptx/editing.md')
    expect(refPaths).toContain('skills/pptx/pptxgenjs.md')

    const editingRef = result.references.find((r) =>
      r.path.endsWith('editing.md'),
    )!
    expect(editingRef.content).toContain('Editing Guide')
    expect(editingRef.mimeType).toBe('text/markdown')

    const pptxRef = result.references.find((r) =>
      r.path.endsWith('pptxgenjs.md'),
    )!
    expect(pptxRef.content).toContain('PptxGenJS Docs')
  })

  it('should fetch extra subdirectories not in the known set', async () => {
    const mockFetch = globalThis.fetch as ReturnType<typeof vi.fn>

    const rootDirListing = [
      {
        name: 'SKILL.md',
        path: 'skills/demo/SKILL.md',
        type: 'file',
        download_url: null,
        size: 200,
      },
      {
        name: 'templates',
        path: 'skills/demo/templates',
        type: 'dir',
        download_url: null,
        size: 0,
      },
    ]

    const templatesDirListing = [
      {
        name: 'base.html',
        path: 'skills/demo/templates/base.html',
        type: 'file',
        download_url: null,
        size: 100,
      },
    ]

    mockFetch.mockImplementation((url: string) => {
      if (url.includes('api.github.com/repos') && url.endsWith('skills/demo')) {
        return Promise.resolve(mockResponse(rootDirListing))
      }
      if (
        url.includes('api.github.com/repos') &&
        url.endsWith('skills/demo/templates')
      ) {
        return Promise.resolve(mockResponse(templatesDirListing))
      }
      if (url.includes('api.github.com/repos')) {
        return Promise.resolve(
          mockResponse({ message: 'Not Found' }, false, 404),
        )
      }
      if (
        url.includes('raw.githubusercontent.com') &&
        url.endsWith('SKILL.md')
      ) {
        return Promise.resolve(mockResponse(SKILL_MD))
      }
      if (
        url.includes('raw.githubusercontent.com') &&
        url.endsWith('base.html')
      ) {
        return Promise.resolve(
          mockResponse('<html><body>Template</body></html>'),
        )
      }
      return Promise.resolve(mockResponse('Not found', false, 404))
    })

    const result = await fetchSkillFromGitHub(
      'https://github.com/owner/repo/tree/main/skills/demo',
    )

    // templates/ is not a known subdir, so its files appear in references
    expect(result.references).toHaveLength(1)
    expect(result.references[0].path).toBe('skills/demo/templates/base.html')
    expect(result.references[0].content).toContain('Template')
    expect(result.references[0].mimeType).toBe('text/html')
  })

  it('should work with a skill that only has SKILL.md (no extra files)', async () => {
    const mockFetch = globalThis.fetch as ReturnType<typeof vi.fn>

    const rootDirListing = [
      {
        name: 'SKILL.md',
        path: 'skills/simple/SKILL.md',
        type: 'file',
        download_url: null,
        size: 200,
      },
    ]

    mockFetch.mockImplementation((url: string) => {
      if (
        url.includes('api.github.com/repos') &&
        url.endsWith('skills/simple')
      ) {
        return Promise.resolve(mockResponse(rootDirListing))
      }
      if (url.includes('api.github.com/repos')) {
        return Promise.resolve(
          mockResponse({ message: 'Not Found' }, false, 404),
        )
      }
      if (
        url.includes('raw.githubusercontent.com') &&
        url.endsWith('SKILL.md')
      ) {
        return Promise.resolve(mockResponse(SKILL_MD))
      }
      return Promise.resolve(mockResponse('Not found', false, 404))
    })

    const result = await fetchSkillFromGitHub(
      'https://github.com/owner/repo/tree/main/skills/simple',
    )

    expect(result.manifest.name).toBe('pptx')
    expect(result.scripts).toHaveLength(0)
    expect(result.references).toHaveLength(0)
    expect(result.assets).toHaveLength(0)
  })

  it('should merge canonical references/ with root-level files', async () => {
    const mockFetch = globalThis.fetch as ReturnType<typeof vi.fn>

    const rootDirListing = [
      {
        name: 'SKILL.md',
        path: 'skills/mixed/SKILL.md',
        type: 'file',
        download_url: null,
        size: 200,
      },
      {
        name: 'guide.md',
        path: 'skills/mixed/guide.md',
        type: 'file',
        download_url: null,
        size: 300,
      },
      {
        name: 'references',
        path: 'skills/mixed/references',
        type: 'dir',
        download_url: null,
        size: 0,
      },
    ]

    const referencesDirListing = [
      {
        name: 'API.md',
        path: 'skills/mixed/references/API.md',
        type: 'file',
        download_url: null,
        size: 400,
      },
    ]

    mockFetch.mockImplementation((url: string) => {
      if (
        url.includes('api.github.com/repos') &&
        url.endsWith('skills/mixed')
      ) {
        return Promise.resolve(mockResponse(rootDirListing))
      }
      if (
        url.includes('api.github.com/repos') &&
        url.endsWith('skills/mixed/references')
      ) {
        return Promise.resolve(mockResponse(referencesDirListing))
      }
      if (url.includes('api.github.com/repos')) {
        return Promise.resolve(
          mockResponse({ message: 'Not Found' }, false, 404),
        )
      }
      if (
        url.includes('raw.githubusercontent.com') &&
        url.endsWith('SKILL.md')
      ) {
        return Promise.resolve(mockResponse(SKILL_MD))
      }
      if (
        url.includes('raw.githubusercontent.com') &&
        url.endsWith('guide.md')
      ) {
        return Promise.resolve(mockResponse('# Guide\n\nExtra guide.'))
      }
      if (url.includes('raw.githubusercontent.com') && url.endsWith('API.md')) {
        return Promise.resolve(mockResponse('# API Reference\n\nEndpoints.'))
      }
      return Promise.resolve(mockResponse('Not found', false, 404))
    })

    const result = await fetchSkillFromGitHub(
      'https://github.com/owner/repo/tree/main/skills/mixed',
    )

    // Both canonical references/ and root-level files should be in references
    expect(result.references).toHaveLength(2)
    const refPaths = result.references.map((r) => r.path)
    expect(refPaths).toContain('skills/mixed/references/API.md')
    expect(refPaths).toContain('skills/mixed/guide.md')
  })
})
