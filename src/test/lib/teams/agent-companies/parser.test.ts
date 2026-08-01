/**
 * Tests for Agent Companies manifest parser.
 *
 * Follows TDD — tests written first, then implementation.
 */
import { describe, it, expect } from 'vitest'

import {
  parseCompanyManifest,
  parseTeamManifest,
  parseAgentsManifest,
  parseSkillManifest,
  parseProjectManifest,
  parseTasksManifest,
  parsePackageFiles,
} from '@/lib/teams/agent-companies/parser'

// ============================================================================
// COMPANY.md
// ============================================================================

describe('parseCompanyManifest', () => {
  it('parses COMPANY.md with full frontmatter', () => {
    const content = `---
name: Acme AI Corp
description: An AI-powered engineering company
domain: acme.com
version: "1.0"
---

# Acme AI Corp

We build intelligent software.`

    const result = parseCompanyManifest(content)
    expect(result).not.toBeNull()
    expect(result!.name).toBe('Acme AI Corp')
    expect(result!.description).toBe('An AI-powered engineering company')
    expect(result!.domain).toBe('acme.com')
    expect(result!.version).toBe('1.0')
  })

  it('parses COMPANY.md with only required fields', () => {
    const content = `---
name: MinimalCo
---

Minimal company.`

    const result = parseCompanyManifest(content)
    expect(result).not.toBeNull()
    expect(result!.name).toBe('MinimalCo')
    expect(result!.description).toBeUndefined()
  })

  it('returns null for invalid content', () => {
    expect(parseCompanyManifest('')).toBeNull()
    expect(parseCompanyManifest('no frontmatter')).toBeNull()
  })

  it('returns null when name is missing', () => {
    const content = `---
description: No name
---

Body.`
    expect(parseCompanyManifest(content)).toBeNull()
  })
})

// ============================================================================
// TEAM.md
// ============================================================================

describe('parseTeamManifest', () => {
  it('parses TEAM.md with frontmatter and body', () => {
    const content = `---
name: Engineering
description: Core engineering team
icon: Code
---

## Mission

Build and maintain the platform.`

    const result = parseTeamManifest(content)
    expect(result).not.toBeNull()
    expect(result!.frontmatter.name).toBe('Engineering')
    expect(result!.frontmatter.description).toBe('Core engineering team')
    expect(result!.frontmatter.icon).toBe('Code')
    expect(result!.body).toContain('Build and maintain the platform.')
  })

  it('returns null when name is missing', () => {
    const content = `---
description: Unnamed team
---

Body.`
    expect(parseTeamManifest(content)).toBeNull()
  })
})

// ============================================================================
// AGENTS.md
// ============================================================================

describe('parseAgentsManifest', () => {
  it('parses AGENTS.md with multiple agents', () => {
    const content = `---
version: "1.0"
---

## Backend Engineer

**Role:** Senior backend developer

**Tags:** backend, api, python

**Temperature:** 0.7

Build robust APIs and services.

## Frontend Engineer

**Role:** Senior frontend developer

**Tags:** frontend, react, typescript

Build beautiful user interfaces.`

    const result = parseAgentsManifest(content)
    expect(result).not.toBeNull()
    expect(result!.frontmatter.version).toBe('1.0')
    expect(result!.agents).toHaveLength(2)

    const backend = result!.agents[0]
    expect(backend.name).toBe('Backend Engineer')
    expect(backend.role).toBe('Senior backend developer')
    expect(backend.tags).toEqual(['backend', 'api', 'python'])
    expect(backend.temperature).toBe(0.7)
    expect(backend.instructions).toContain('Build robust APIs and services.')

    const frontend = result!.agents[1]
    expect(frontend.name).toBe('Frontend Engineer')
    expect(frontend.role).toBe('Senior frontend developer')
    expect(frontend.tags).toEqual(['frontend', 'react', 'typescript'])
  })

  it('parses agent with icon and color', () => {
    const content = `---
version: "1.0"
---

## Designer

**Role:** UX/UI designer

**Icon:** Palette

**Color:** blue

Design intuitive interfaces.`

    const result = parseAgentsManifest(content)
    expect(result).not.toBeNull()
    const agent = result!.agents[0]
    expect(agent.icon).toBe('Palette')
    expect(agent.color).toBe('blue')
  })

  it('parses agent with tools', () => {
    const content = `---
version: "1.0"
---

## Researcher

**Role:** Research analyst

**Tools:** wikipedia_search, arxiv_search, search_knowledge

Research topics thoroughly.`

    const result = parseAgentsManifest(content)
    expect(result).not.toBeNull()
    expect(result!.agents[0].tools).toEqual([
      'wikipedia_search',
      'arxiv_search',
      'search_knowledge',
    ])
  })

  it('returns empty agents for content without H2 sections', () => {
    const content = `---
version: "1.0"
---

Just some text without agents.`

    const result = parseAgentsManifest(content)
    expect(result).not.toBeNull()
    expect(result!.agents).toHaveLength(0)
  })

  it('handles AGENTS.md without frontmatter', () => {
    const content = `## Simple Agent

**Role:** Worker

Do stuff.`

    const result = parseAgentsManifest(content)
    expect(result).not.toBeNull()
    expect(result!.agents).toHaveLength(1)
    expect(result!.agents[0].name).toBe('Simple Agent')
  })
})

// ============================================================================
// SKILL.md
// ============================================================================

describe('parseSkillManifest', () => {
  it('parses SKILL.md with full metadata', () => {
    const content = `---
name: Code Review
description: Automated code review with best practices
author: devs-team
license: MIT
tags:
  - code
  - review
autoActivate: true
---

## Instructions

Review code for quality, security, and performance.`

    const result = parseSkillManifest(content)
    expect(result).not.toBeNull()
    expect(result!.frontmatter.name).toBe('Code Review')
    expect(result!.frontmatter.description).toBe(
      'Automated code review with best practices',
    )
    expect(result!.frontmatter.author).toBe('devs-team')
    expect(result!.frontmatter.license).toBe('MIT')
    expect(result!.frontmatter.tags).toEqual(['code', 'review'])
    expect(result!.frontmatter.autoActivate).toBe(true)
    expect(result!.body).toContain(
      'Review code for quality, security, and performance.',
    )
  })

  it('returns null when name or description is missing', () => {
    const noName = `---
description: Missing name
---

Body.`
    expect(parseSkillManifest(noName)).toBeNull()

    const noDesc = `---
name: Missing desc
---

Body.`
    expect(parseSkillManifest(noDesc)).toBeNull()
  })
})

// ============================================================================
// PROJECT.md
// ============================================================================

describe('parseProjectManifest', () => {
  it('parses PROJECT.md', () => {
    const content = `---
name: Platform Rewrite
description: Rewrite the core platform in Rust
status: in_progress
priority: high
---

## Goals

- Improve performance by 10x
- Reduce memory usage`

    const result = parseProjectManifest(content)
    expect(result).not.toBeNull()
    expect(result!.frontmatter.name).toBe('Platform Rewrite')
    expect(result!.frontmatter.status).toBe('in_progress')
    expect(result!.frontmatter.priority).toBe('high')
    expect(result!.body).toContain('Improve performance by 10x')
  })

  it('returns null when name is missing', () => {
    const content = `---
description: No name
---

Body.`
    expect(parseProjectManifest(content)).toBeNull()
  })
})

// ============================================================================
// TASK.md
// ============================================================================

describe('parseTasksManifest', () => {
  it('parses TASK.md with multiple tasks', () => {
    const content = `---
version: "1.0"
---

## Set up CI/CD pipeline

**Priority:** must

**Dependencies:** none

Configure GitHub Actions for automated testing and deployment.

## Write API documentation

**Priority:** should

**Assigned:** Backend Engineer

**Dependencies:** Set up CI/CD pipeline

Document all public API endpoints with examples.`

    const result = parseTasksManifest(content)
    expect(result).not.toBeNull()
    expect(result!.tasks).toHaveLength(2)

    const task1 = result!.tasks[0]
    expect(task1.title).toBe('Set up CI/CD pipeline')
    expect(task1.priority).toBe('must')
    expect(task1.dependencies).toEqual([])
    expect(task1.description).toContain(
      'Configure GitHub Actions for automated testing and deployment.',
    )

    const task2 = result!.tasks[1]
    expect(task2.title).toBe('Write API documentation')
    expect(task2.priority).toBe('should')
    expect(task2.assignedAgent).toBe('Backend Engineer')
    expect(task2.dependencies).toEqual(['Set up CI/CD pipeline'])
  })

  it('handles TASK.md without frontmatter', () => {
    const content = `## Simple task

Do this thing.`

    const result = parseTasksManifest(content)
    expect(result).not.toBeNull()
    expect(result!.tasks).toHaveLength(1)
    expect(result!.tasks[0].title).toBe('Simple task')
  })
})

// ============================================================================
// Package (zip) parsing
// ============================================================================

describe('parsePackageFiles', () => {
  it('parses a complete package from file map', () => {
    const files = new Map<string, string>()

    files.set(
      'COMPANY.md',
      `---
name: TestCo
description: Test company
---

# TestCo`,
    )

    files.set(
      'teams/engineering/TEAM.md',
      `---
name: Engineering
---

Engineering team.`,
    )

    files.set(
      'AGENTS.md',
      `## Worker

**Role:** General worker

Do work.`,
    )

    files.set(
      'skills/review/SKILL.md',
      `---
name: Code Review
description: Review code
---

Review instructions.`,
    )

    files.set(
      'TASK.md',
      `## Setup

Setup the project.`,
    )

    const pkg = parsePackageFiles(files)

    expect(pkg.company).not.toBeNull()
    expect(pkg.company!.name).toBe('TestCo')
    expect(pkg.teams).toHaveLength(1)
    expect(pkg.teams[0].frontmatter.name).toBe('Engineering')
    expect(pkg.agents).toHaveLength(1)
    expect(pkg.agents[0].name).toBe('Worker')
    expect(pkg.skills).toHaveLength(1)
    expect(pkg.skills[0].frontmatter.name).toBe('Code Review')
    expect(pkg.tasks).toHaveLength(1)
    expect(pkg.tasks[0].title).toBe('Setup')
  })

  it('handles a minimal package with only AGENTS.md', () => {
    const files = new Map<string, string>()
    files.set(
      'AGENTS.md',
      `## Bot

**Role:** Assistant

Help users.`,
    )

    const pkg = parsePackageFiles(files)
    expect(pkg.company).toBeUndefined()
    expect(pkg.teams).toHaveLength(0)
    expect(pkg.agents).toHaveLength(1)
    expect(pkg.skills).toHaveLength(0)
    expect(pkg.tasks).toHaveLength(0)
  })

  it('handles empty file map', () => {
    const pkg = parsePackageFiles(new Map())
    expect(pkg.company).toBeUndefined()
    expect(pkg.teams).toHaveLength(0)
    expect(pkg.agents).toHaveLength(0)
    expect(pkg.skills).toHaveLength(0)
    expect(pkg.tasks).toHaveLength(0)
  })

  it('finds manifests in nested directories', () => {
    const files = new Map<string, string>()
    files.set(
      'my-company/COMPANY.md',
      `---
name: Nested Co
---

Nested.`,
    )
    files.set(
      'my-company/teams/sales/TEAM.md',
      `---
name: Sales
---

Sales team.`,
    )
    files.set(
      'my-company/teams/marketing/TEAM.md',
      `---
name: Marketing
---

Marketing team.`,
    )

    const pkg = parsePackageFiles(files)
    expect(pkg.company!.name).toBe('Nested Co')
    expect(pkg.teams).toHaveLength(2)
    expect(pkg.teams.map((t) => t.frontmatter.name).sort()).toEqual([
      'Marketing',
      'Sales',
    ])
  })
})
