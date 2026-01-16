---
name: agent-definition
description: Guide for creating and configuring AI agents in the DEVS platform. Use this when asked to create new agents, modify agent behavior, or work with agent YAML/JSON files.
---

# Agent Definition for DEVS

Agents are AI personas with specific roles, instructions, and capabilities. They can be defined as built-in agents (YAML/JSON files) or created dynamically by users.

## Agent File Locations

- Built-in agents: `public/agents/*.agent.yaml` and `public/agents/*.agent.json`
- Agent manifest: `public/agents/manifest.json`

## YAML Agent Template

```yaml
id: my-agent
name: My Agent Name
icon: Bot # Lucide icon name
desc: Short description of what this agent does
role: Detailed role description that appears in agent cards
instructions: |
  # Agent Instructions

  You are [Agent Name], an expert in [domain/specialty].

  ## Your Expertise
  - Skill 1
  - Skill 2
  - Skill 3

  ## Behavior Guidelines
  1. Always [specific behavior]
  2. Never [things to avoid]
  3. Prefer [preferred approaches]

  ## Response Format
  - Use [format guidelines]
  - Include [required elements]
  - Structure responses as [structure]

  ## Important Rules
  - Rule 1
  - Rule 2
temperature: 0.7 # 0-1, lower = more deterministic
tags:
  - category1
  - category2
i18n:
  fr:
    name: Mon Agent
    desc: Description courte
    role: Description du rôle
    instructions: |
      Instructions en français...
  es:
    name: Mi Agente
    desc: Descripción corta
    role: Descripción del rol
    instructions: |
      Instrucciones en español...
```

## Agent Interface

```typescript
interface Agent {
  id: string // Unique identifier
  slug: string // URL-friendly, auto-generated from name
  name: string // Display name
  icon?: IconName // Lucide icon name (e.g., 'Bot', 'Brain', 'Code')
  role: string // Role description
  instructions: string // System prompt / instructions
  temperature?: number // LLM temperature (0-1)
  tags?: string[] // Categorization tags
  tools?: Tool[] // Available tools/capabilities
  createdAt: Date
  updatedAt?: Date
  deletedAt?: Date // Soft delete timestamp
  version?: string
}
```

## Instruction Writing Best Practices

### 1. Clear Identity

Start with who the agent is:

```markdown
You are [Name], a [role/expertise] specializing in [domain].
Your purpose is to [main objective].
```

### 2. Expertise Definition

List specific skills and knowledge areas:

```markdown
## Your Expertise

- Deep knowledge of [topic 1]
- Expert in [technique/methodology]
- Skilled at [specific task]
```

### 3. Behavioral Guidelines

Define how the agent should behave:

```markdown
## Behavior Guidelines

1. Always maintain a [tone/style]
2. Provide [type of responses]
3. When uncertain, [fallback behavior]
```

### 4. Output Format

Specify expected response structure:

```markdown
## Response Format

- Start with [opening element]
- Include [required sections]
- End with [closing element]
- Use [formatting style] for code/lists/etc.
```

### 5. Constraints

Define limitations and boundaries:

```markdown
## Constraints

- Never [prohibited actions]
- Always [required behaviors]
- Stay within [boundaries]
```

## Example: Software Architect Agent

```yaml
id: software-architect
name: Software Architect
icon: Building2
desc: Expert in system design and architecture decisions
role: Senior software architect specializing in scalable, maintainable systems
instructions: |
  # Software Architect

  You are a Senior Software Architect with 20+ years of experience designing
  complex software systems across multiple domains.

  ## Your Expertise
  - System design and architecture patterns
  - Microservices and distributed systems
  - Database design and data modeling
  - API design and integration patterns
  - Performance optimization and scalability
  - Security architecture

  ## Approach
  1. Understand requirements before proposing solutions
  2. Consider trade-offs explicitly (cost, complexity, performance)
  3. Prefer proven patterns over novel approaches
  4. Design for change and extensibility
  5. Document decisions with rationale

  ## Response Format
  When analyzing architecture:
  - Start with understanding the problem
  - Propose 2-3 alternatives with trade-offs
  - Recommend one with clear justification
  - Include diagrams using Mermaid when helpful

  ## Constraints
  - Never recommend over-engineering for simple problems
  - Always consider operational complexity
  - Factor in team capabilities and timeline
temperature: 0.5
tags:
  - technical
  - design
  - planning
```

## Internationalization (i18n)

When adding translations, follow this pattern:

```yaml
i18n:
  fr:
    name: Architecte Logiciel
    desc: Expert en conception de systèmes et décisions d'architecture
    role: Architecte logiciel senior spécialisé dans les systèmes évolutifs
    instructions: |
      # Architecte Logiciel

      Vous êtes un architecte logiciel senior...
```

**Important**: Use curly apostrophe `'` instead of straight apostrophe `'` in translations.

Supported languages: `en`, `fr`, `es`, `de`, `it`, `ja`, `zh`, `ko`, `pt`

## Adding to Manifest

After creating an agent file, add it to `public/agents/manifest.json`:

```json
{
  "agents": ["agent-recruiter", "software-architect", "my-new-agent"]
}
```

## Agent Slugs

Slugs are auto-generated from names and must be unique:

- `Software Architect` → `software-architect`
- `Da Vinci` → `da-vinci`
- `Agent Recruiter` → `agent-recruiter`

Use `generateUniqueSlug()` from `src/lib/slugify.ts` when creating agents programmatically.

## Temperature Guidelines

| Temperature | Use Case                                |
| ----------- | --------------------------------------- |
| 0.0 - 0.3   | Factual, deterministic (code, analysis) |
| 0.4 - 0.6   | Balanced (general assistance)           |
| 0.7 - 0.8   | Creative (writing, brainstorming)       |
| 0.9 - 1.0   | Highly creative (poetry, fiction)       |

## Icon Reference

Common Lucide icons for agents:

- `Bot`, `Brain`, `Cpu` - AI/Tech agents
- `Code`, `Terminal`, `Braces` - Developer agents
- `Palette`, `Pen`, `Image` - Creative agents
- `BookOpen`, `GraduationCap` - Educational agents
- `Building2`, `Landmark` - Business/Architecture agents
- `Heart`, `Smile` - Support/Wellness agents
- `Search`, `Microscope` - Research agents
