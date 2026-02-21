/**
 * Tests for GitHub Content Fetcher — Agent Skills
 *
 * This tests the pure/sync utility functions (parseGitHubUrl, parseFrontmatter,
 * detectLanguage, detectMimeType, extractPythonPackages). Network-dependent
 * functions (fetchGitHubDirectory, fetchRawContent, fetchSkillFromGitHub)
 * are tested via integration / E2E.
 */

import { describe, it, expect } from 'vitest'
import {
  parseGitHubUrl,
  parseFrontmatter,
  detectLanguage,
  detectMimeType,
  extractPythonPackages,
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
    expect(() => parseGitHubUrl('https://gitlab.com/owner/repo/tree/main/x')).toThrow(
      'Invalid GitHub URL format',
    )
    expect(() => parseGitHubUrl('not-a-url')).toThrow('Invalid GitHub URL format')
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
