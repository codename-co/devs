# DEVS Marketplace - Platform Extension System

> A standardized, schema-driven marketplace enabling users to create, share, and publish Apps, Agents, Connectors, and Tools.

## Executive Summary

The DEVS Marketplace transforms DEVS from an AI orchestration tool into an **extensible platform**, allowing the community to build and share custom extensions. All extensions are defined using a **unified JSON schema** (`extension.schema.json`), ensuring consistency, security, and interoperability.

---

## Table of Contents

1. [Vision & Goals](#vision--goals)
2. [Architecture Overview](#architecture-overview)
3. [Extension Types](#extension-types)
4. [Unified Extension Schema](#unified-extension-schema)
5. [Extension Lifecycle](#extension-lifecycle)
6. [Marketplace Features](#marketplace-features)
7. [Security & Trust](#security--trust)
8. [Implementation Roadmap](#implementation-roadmap)
9. [Technical Specifications](#technical-specifications)

---

## Vision & Goals

### Vision

Democratize AI agent orchestration by enabling anyone to extend DEVS with custom capabilities, share their creations, and benefit from community-built extensions—all without requiring backend infrastructure.

### Goals

1. **Standardization**: Single unified JSON schema for all extension types
2. **Discoverability**: Searchable, categorized marketplace with ratings/reviews
3. **Security**: Sandboxed execution in iframes, permission-based access
4. **Interoperability**: Extensions can compose and depend on each other
5. **Privacy-First**: Extensions run locally, respect user data boundaries
6. **Low Barrier**: Non-developers can create simple extensions via YAML definitions

---

## Architecture Overview

```text
┌─────────────────────────────────────────────────────────────────────┐
│                      DEVS Marketplace Platform                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │    Apps     │  │   Agents    │  │ Connectors  │  │   Tools     │ │
│  │             │  │             │  │             │  │             │ │
│  │ Translation │  │ Code Review │  │  GitHub     │  │ Web Search  │ │
│  │ Code Audit  │  │ PR Analyst  │  │  Jira       │  │ Calculator  │ │
│  │ Workflows   │  │ Doc Writer  │  │  Linear     │  │ File Ops    │ │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘ │
│         │                │                │                │        │
│  ┌──────▼────────────────▼────────────────▼────────────────▼──────┐ │
│  │                    Extension Registry                          │ │
│  │                  (IndexedDB + Optional Sync)                   │ │
│  └────────────────────────────┬───────────────────────────────────┘ │
│                               │                                      │
│  ┌────────────────────────────▼───────────────────────────────────┐ │
│  │                     Schema Validator                            │ │
│  │            (JSON Schema + Security Checks)                      │ │
│  └────────────────────────────┬───────────────────────────────────┘ │
│                               │                                      │
│  ┌────────────────────────────▼───────────────────────────────────┐ │
│  │                    Standardized Hooks                           │ │
│  │   onInstall │ onActivate │ onExecute │ onDeactivate │ onRemove  │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Core Components

| Component              | Description                                      |
| ---------------------- | ------------------------------------------------ |
| **Extension Registry** | IndexedDB store for installed extensions         |
| **Schema Validator**   | Validates YAML against JSON schemas              |
| **Hook Engine**        | Executes lifecycle hooks in sandboxed context    |
| **Marketplace API**    | Optional hosted service for discovery/publishing |
| **UI Components**      | Browse, install, configure extensions            |

---

## Extension Types

All extensions share a **unified schema** (`extension.schema.json`) with a `type` field that distinguishes between the four extension types:

| Type          | Description                                       | Example Use Cases                     |
| ------------- | ------------------------------------------------- | ------------------------------------- |
| **app**       | Full applications with custom UI pages            | Translation Studio, Code Analysis     |
| **agent**     | AI personas with specific roles and instructions  | Code Reviewer, PR Analyst, Doc Writer |
| **connector** | Integrations with external services (OAuth, APIs) | GitHub, Jira, Linear, Notion          |
| **tool**      | Callable capabilities that agents can invoke      | Web Search, Calculator, File Tree     |

### Apps

Apps are **full applications** with custom UI pages that run in sandboxed iframes. They can combine agents, tools, and connectors to solve specific use cases.

#### Example Apps

| App                   | Description                            |
| --------------------- | -------------------------------------- |
| **Translation App**   | Translate content using local models   |
| **Code Analysis App** | Static analysis with GitHub sync       |
| **PR Review App**     | Automated pull request review workflow |
| **Blog Writer App**   | End-to-end blog post creation          |

#### Example App Definition

```yaml
id: translation-studio
type: app
name: Translation Studio
version: 1.0.0
license: MIT
icon: Language
color: blue
description: Professional translation powered by local AI models.
featured: true
privacyPolicy: https://devs.new/privacy
source: https://github.com/devsai/translation-studio

# Custom pages (inline React code)
pages:
  main: |
    export default function TranslationPage() {
      // Page implementation using DEVS Bridge API
      return <div>Translation UI</div>
    }

# User-configurable settings
configuration:
  schema:
    type: object
    properties:
      defaultSourceLang:
        type: string
        default: auto
      defaultTargetLang:
        type: string
        default: en
  defaults:
    defaultSourceLang: auto
    defaultTargetLang: en

# Localized metadata
i18n:
  fr:
    name: Studio de Traduction
    description: Traduction professionnelle avec des modèles IA locaux.
```

---

### Agents

Agents are **AI personas** with specific roles and instructions. They use the unified extension schema with `type: agent`.

#### Example Agent Definition

```yaml
id: code-reviewer
type: agent
name: Code Reviewer
version: 1.0.0
license: MIT
icon: GitPullRequest
color: purple
description: Expert code reviewer with multi-language expertise
i18n:
  fr:
    name: Réviseur de Code
    description: Expert en révision de code avec expertise multi-langage
```

---

### Connectors

Connectors enable DEVS to integrate with external services. They use the unified extension schema with `type: connector`.

| Auth Type | Use Case                       |
| --------- | ------------------------------ |
| OAuth 2.0 | Google, GitHub, Notion, Slack  |
| API Key   | Custom REST/GraphQL APIs       |
| MCP       | Model Context Protocol servers |

#### Example Connector Definition

```yaml
id: linear
type: connector
name: Linear
version: 1.0.0
license: MIT
icon: Layout
color: indigo
description: Connect to Linear for issue tracking and project management
source: https://github.com/devsai/linear-connector

i18n:
  fr:
    name: Linear
    description: Connexion à Linear pour le suivi des tickets et la gestion de projet
```

#### Example Connectors

```yaml
# examples/connectors/linear.connector.yaml
metadata:
  id: linear
  name: Linear
  version: 1.0.0
  description: Connect to Linear for issue tracking and project management
  icon: Layout
  color: '#5E6AD2'

type: oauth

auth:
  authUrl: https://linear.app/oauth/authorize
  tokenUrl: https://api.linear.app/oauth/token
  scopes:
    - read
    - write
    - issues:create
  pkceRequired: true

capabilities:
  - read
  - write
  - search
  - sync

rateLimit:
  requests: 1500
  windowSeconds: 3600

endpoints:
  - id: list-issues
    method: POST
    path: /graphql
    description: List issues with GraphQL query
  - id: create-issue
    method: POST
    path: /graphql
    description: Create a new issue
  - id: update-issue
    method: POST
    path: /graphql
    description: Update an existing issue

tools:
  - metadata:
      name: linear_list_issues
      displayName: List Linear Issues
      shortDescription: List issues from Linear
      icon: List
      category: connector
    definition:
      type: function
      function:
        name: linear_list_issues
        description: List issues from Linear with optional filters
        parameters:
          type: object
          properties:
            teamId:
              type: string
              description: Filter by team ID
            state:
              type: string
              enum: [backlog, todo, in_progress, done, canceled]
            limit:
              type: integer
              default: 50

  - metadata:
      name: linear_create_issue
      displayName: Create Linear Issue
      shortDescription: Create a new issue in Linear
      icon: Plus
      category: connector
    definition:
      type: function
      function:
        name: linear_create_issue
        description: Create a new issue in Linear
        parameters:
          type: object
          required: [title, teamId]
          properties:
            title:
              type: string
            description:
              type: string
            teamId:
              type: string
            priority:
              type: integer
              enum: [0, 1, 2, 3, 4]

syncConfig:
  enabled: true
  cursorField: updatedAt
  deltaEndpoint: /graphql
  fullSyncInterval: 24

hooks:
  onInstall:
    type: prompt
    prompt: Verify Linear OAuth credentials and test connection
```

```yaml
# examples/connectors/custom-api.connector.yaml
metadata:
  id: my-company-api
  name: My Company API
  version: 1.0.0
  description: Internal company API connector
  icon: Building
  category: custom

type: api

auth:
  baseUrl: https://api.mycompany.com/v1
  authType: bearer
  headers:
    X-API-Version: '2024-01'

capabilities:
  - read
  - write

endpoints:
  - id: get-employees
    method: GET
    path: /employees
    description: Get list of employees
  - id: get-projects
    method: GET
    path: /projects
    description: Get list of projects
```

---

### Tools

Tools are **atomic capabilities** that agents can invoke. They use the unified extension schema with `type: tool`.

#### Example Tool Definition

```yaml
id: web-search
type: tool
name: Web Search
version: 1.0.0
license: MIT
icon: Search
color: blue
description: Search the web using multiple search engines

i18n:
  fr:
    name: Recherche Web
    description: Rechercher sur le web en utilisant plusieurs moteurs de recherche
```

#### Example Tools

```yaml
# examples/tools/web-search.tool.yaml
metadata:
  name: web_search
  displayName: Web Search
  shortDescription: Search the web using multiple search engines
  longDescription: |
    Performs web searches using DuckDuckGo, Brave Search, or SearXNG.
    Returns structured results with titles, URLs, and snippets.
  icon: Search
  category: web
  tags:
    - search
    - web
    - research
  enabledByDefault: true
  estimatedDuration: 3000

definition:
  type: function
  function:
    name: web_search
    description: |
      Search the web for information. Returns top results with titles,
      URLs, and content snippets.
    parameters:
      type: object
      required:
        - query
      properties:
        query:
          type: string
          description: Search query
        maxResults:
          type: integer
          default: 10
          maximum: 50
        engine:
          type: string
          enum: [duckduckgo, brave, searxng]
          default: duckduckgo
        region:
          type: string
          description: Region code (e.g., us-en, fr-fr)

implementation:
  type: script
  source: |
    async function handler({ query, maxResults = 10, engine = 'duckduckgo', region }) {
      const engines = {
        duckduckgo: async (q) => {
          const response = await fetch(
            `https://api.duckduckgo.com/?q=${encodeURIComponent(q)}&format=json`
          );
          return response.json();
        },
        // ... other engines
      };

      const results = await engines[engine](query);
      return {
        query,
        engine,
        results: results.slice(0, maxResults).map(r => ({
          title: r.title,
          url: r.url,
          snippet: r.description
        }))
      };
    }
  sandboxConfig:
    timeout: 10000
    allowedAPIs:
      - fetch
      - json

permissions:
  - network

rateLimit:
  maxCalls: 100
  windowSeconds: 3600
```

```yaml
# examples/tools/file-tree.tool.yaml
metadata:
  name: file_tree
  displayName: File Tree
  shortDescription: Generate file tree structure from a directory
  icon: FolderTree
  category: file
  tags:
    - file
    - directory
    - structure
  requiresConfirmation: false

definition:
  type: function
  function:
    name: file_tree
    description: Generate a tree view of a directory structure
    parameters:
      type: object
      required:
        - path
      properties:
        path:
          type: string
          description: Directory path to scan
        maxDepth:
          type: integer
          default: 5
        includeFiles:
          type: boolean
          default: true
        excludePatterns:
          type: array
          items:
            type: string
          default:
            - node_modules
            - .git
            - __pycache__

implementation:
  type: builtin
  source: file-tree-plugin

permissions:
  - file-read
```

```yaml
# examples/tools/static-analysis.tool.yaml
metadata:
  name: static_analysis
  displayName: Static Code Analysis
  shortDescription: Analyze code for issues, security vulnerabilities, and style
  icon: Shield
  category: code
  tags:
    - code
    - analysis
    - security
    - linting
  estimatedDuration: 15000
  requiresConfirmation: true

definition:
  type: function
  function:
    name: static_analysis
    description: |
      Run static analysis on code to identify bugs, security issues,
      code smells, and style violations. Supports multiple languages.
    parameters:
      type: object
      required:
        - code
      properties:
        code:
          type: string
          description: Code to analyze
        language:
          type: string
          enum: [typescript, javascript, python, go, rust, java]
        analysisTypes:
          type: array
          items:
            type: string
            enum: [bugs, security, style, complexity, performance]
          default: [bugs, security]
        severity:
          type: string
          enum: [error, warning, info, hint]
          default: warning

implementation:
  type: composite
  composedTools:
    - eslint_analyze
    - semgrep_scan
    - complexity_check
  source: |
    async function handler(args, context) {
      const results = await Promise.all([
        context.tools.eslint_analyze(args),
        context.tools.semgrep_scan(args),
        context.tools.complexity_check(args)
      ]);

      return {
        issues: results.flatMap(r => r.issues),
        summary: {
          total: results.reduce((sum, r) => sum + r.issues.length, 0),
          byType: groupBy(results.flatMap(r => r.issues), 'type')
        }
      };
    }

permissions:
  - knowledge-access
```

---

## Unified Extension Schema

All extensions use a single unified schema (`extension.schema.json`) with type-specific behavior determined by the `type` field.

### Schema Reference

The full schema is defined in [public/schemas/extension.schema.json](../public/schemas/extension.schema.json).

### Required Fields

| Field     | Type   | Description                            |
| --------- | ------ | -------------------------------------- |
| `id`      | string | Unique identifier (`^[a-z0-9-]+$`)     |
| `type`    | enum   | `app`, `agent`, `connector`, or `tool` |
| `name`    | string | Human-readable display name            |
| `version` | string | Semantic version (`X.Y.Z`)             |
| `license` | string | License identifier (default: `MIT`)    |

### Optional Fields

| Field           | Type   | Description                                     |
| --------------- | ------ | ----------------------------------------------- |
| `icon`          | string | Iconoir icon name (see <https://iconoir.com/>)  |
| `color`         | enum   | Tailwind color name for theming                 |
| `description`   | string | Brief description of the extension              |
| `author`        | object | Author information (`name`, `email`, `url`)     |
| `featured`      | bool   | Whether to feature in marketplace               |
| `privacyPolicy` | string | URL to privacy policy                           |
| `source`        | string | URL to source code repository                   |
| `screenshots`   | array  | Base64-encoded screenshot images                |
| `i18n`          | object | Localized `name`, `description`, and `messages` |
| `pages`         | object | Custom UI pages (inline React code for apps)    |
| `configuration` | object | User-configurable settings with JSON Schema     |

### Color Options

Extensions can specify a `color` from the Tailwind color palette:

```text
default, primary, secondary, success, warning, danger, info,
red, orange, yellow, green, teal, blue, indigo, purple, pink, gray
```

### Author Schema

```json
{
  "name": "Author Name",
  "email": "author@example.com",
  "url": "https://author-website.com"
}
```

### Configuration Schema

Extensions can define user-configurable settings:

```yaml
configuration:
  schema:
    type: object
    properties:
      apiEndpoint:
        type: string
        format: uri
      maxResults:
        type: integer
        minimum: 1
        maximum: 100
  defaults:
    apiEndpoint: https://api.example.com
    maxResults: 10
```

### Custom Pages (Apps Only)

Apps can define custom UI pages with inline React code:

```yaml
pages:
  main: |
    export default function MainPage() {
      const { llm, ui, t } = window.DEVS
      // Use DEVS Bridge API
      return <div>Custom UI</div>
    }
  settings: |
    export default function SettingsPage() {
      return <div>Settings UI</div>
    }
```

Pages run in sandboxed iframes and communicate with DEVS via the Extension Bridge API.
See [EXTENSION-BRIDGE.md](EXTENSION-BRIDGE.md) for details.

---

## Packaging Format

### Single-File Extensions (YAML)

For simple extensions, a single YAML file is sufficient:

```yaml
# my-agent.extension.yaml
id: my-agent
type: agent
name: My Agent
version: 1.0.0
license: MIT
description: A simple agent extension
```

### File Extensions

| Type               | Extension         | MIME Type                    |
| ------------------ | ----------------- | ---------------------------- |
| **Package**        | `.devs`           | `application/x-devs-package` |
| **Extension YAML** | `.extension.yaml` | `application/x-devs+yaml`    |

---

## Extension Lifecycle

Extensions follow a standard lifecycle:

```text
Discover → Install → Configure → Activate → Use → Update → Deactivate → Remove
```

Extensions run in sandboxed iframes and communicate with DEVS via the Extension Bridge API.
See [EXTENSION-BRIDGE.md](EXTENSION-BRIDGE.md) for details on available services.

---

## Marketplace Features

### Discovery & Search

The marketplace supports searching by:

- Extension name and description
- Tags and categories
- Author name
- Extension type (app, agent, connector, tool)

### Publishing Flow

1. **Create**: Define extension in YAML format
2. **Validate**: Schema validation against `extension.schema.json`
3. **Review**: Security checks and sandbox validation
4. **Publish**: Make available in marketplace

### Ratings & Reviews

Users can rate extensions (1-5 stars) and leave reviews to help others discover quality extensions.

### Version Management

Extensions use semantic versioning (`X.Y.Z`). The marketplace tracks version history and supports automatic updates.

---

## Security & Trust

### Sandboxing

All extensions run in **sandboxed iframes** with limited access to DEVS APIs via the Extension Bridge.
See [EXTENSION-BRIDGE.md](EXTENSION-BRIDGE.md) for the complete API surface.

### Trust Levels

| Level          | Badge | Requirements               | Capabilities                  |
| -------------- | ----- | -------------------------- | ----------------------------- |
| **Unverified** | ⚪    | None                       | Basic features, warning shown |
| **Community**  | 🟢    | 100+ downloads, no reports | Standard features             |
| **Verified**   | ✅    | Manual review, code audit  | Full features, featured       |
| **Official**   | ⭐    | DEVS team                  | All features, highlighted     |

---

## Implementation Roadmap

### Phase 1: Foundation (Q1 2026)

**Goal**: Core infrastructure and local extensions

| Task               | Description                       | Priority    |
| ------------------ | --------------------------------- | ----------- |
| Schema Design      | Finalize unified extension schema | 🔴 Critical |
| Extension Registry | IndexedDB store for extensions    | 🔴 Critical |
| Schema Validator   | Validate YAML against schema      | 🔴 Critical |
| Hook Engine        | Execute lifecycle hooks           | 🔴 Critical |
| Basic UI           | Install/uninstall/enable UI       | 🟡 High     |

**Deliverables**:

- `public/schemas/extension.schema.json`
- `src/stores/extensionStore.ts`
- `src/lib/extension-validator.ts`

### Phase 2: Local Marketplace (Q2 2026)

**Goal**: Import/export and local sharing

| Task               | Description                        | Priority    |
| ------------------ | ---------------------------------- | ----------- |
| Extension Importer | Import from YAML files             | 🔴 Critical |
| Extension Exporter | Export to YAML files               | 🔴 Critical |
| Extension Browser  | Browse/search installed extensions | 🟡 High     |
| Configuration UI   | Per-extension settings             | 🟡 High     |
| Bundled Extensions | Ship example extensions            | 🟡 High     |

**Deliverables**:

- `src/features/marketplace/importer.ts`
- `src/features/marketplace/exporter.ts`
- `src/pages/MarketplacePage.tsx`
- `src/components/ExtensionCard.tsx`
- `public/extensions/` (bundled examples)

### Phase 3: Remote Marketplace (Q3 2026)

**Goal**: Community sharing and discovery

| Task               | Description                       | Priority    |
| ------------------ | --------------------------------- | ----------- |
| Marketplace API    | REST API for discovery/publishing | 🔴 Critical |
| GitHub Integration | Publish from GitHub repos         | 🟡 High     |
| Search & Discovery | Full-text search, categories      | 🟡 High     |
| Ratings & Reviews  | User feedback system              | 🟢 Medium   |
| Auto-updates       | Check and install updates         | 🟢 Medium   |

**Deliverables**:

- `utils/devs-marketplace/` (optional backend)
- `src/features/marketplace/api.ts`
- `src/features/marketplace/publisher.ts`

### Phase 4: Advanced Features (Q4 2026)

**Goal**: Enterprise and monetization

| Task                | Description                   | Priority  |
| ------------------- | ----------------------------- | --------- |
| Code Signing        | Verify extension authenticity | 🟡 High   |
| Permission Auditing | Security review tools         | 🟡 High   |
| Analytics           | Usage tracking for authors    | 🟢 Medium |
| Monetization        | Paid extensions support       | 🟢 Medium |
| Enterprise          | Private marketplaces          | 🟢 Low    |

---

## Technical Specifications

### Directory Structure

```text
src/
├── features/
│   └── marketplace/
│       ├── index.ts
│       ├── types.ts           # Extension types
│       ├── importer.ts        # Import YAML extensions
│       ├── exporter.ts        # Export extensions
│       ├── validator.ts       # Schema validation
│       └── components/
│           ├── ExtensionCard.tsx
│           └── ExtensionBrowser.tsx
│
├── stores/
│   └── extensionStore.ts      # Extension state management
│
└── lib/
    └── extension-loader.ts    # Load extensions at runtime

public/
├── schemas/
│   └── extension.schema.json  # Unified extension schema
│
└── extensions/                # Bundled extensions
    └── examples/
```

### Extension Store Schema

```typescript
// src/stores/extensionStore.ts
interface ExtensionEntry {
  id: string
  type: 'app' | 'agent' | 'connector' | 'tool'
  version: string
  source: 'bundled' | 'local' | 'marketplace'

  // Parsed extension definition
  definition: ExtensionDefinition

  // State
  status: 'installed' | 'active' | 'disabled' | 'error'
  errorMessage?: string

  // User configuration
  config: Record<string, unknown>

  // Metadata
  installedAt: Date
  updatedAt: Date
  lastUsedAt?: Date
  usageCount: number
}
```

### API Endpoints (Optional Backend)

```yaml
# Marketplace API specification
openapi: 3.0.0
info:
  title: DEVS Marketplace API
  version: 1.0.0

paths:
  /extensions:
    get:
      summary: List extensions
      parameters:
        - name: type
          in: query
          schema:
            type: string
            enum: [app, agent, connector, tool]
        - name: category
          in: query
          schema:
            type: string
        - name: search
          in: query
          schema:
            type: string
        - name: page
          in: query
          schema:
            type: integer
        - name: limit
          in: query
          schema:
            type: integer

    post:
      summary: Publish extension
      requestBody:
        content:
          application/yaml:
            schema:
              type: string

  /extensions/{id}:
    get:
      summary: Get extension details

    put:
      summary: Update extension

    delete:
      summary: Unpublish extension

  /extensions/{id}/versions:
    get:
      summary: List versions

    post:
      summary: Publish new version

  /extensions/{id}/reviews:
    get:
      summary: List reviews

    post:
      summary: Add review

  /extensions/{id}/download:
    get:
      summary: Download extension YAML
```

---

## Example Extensions

### App Example

```yaml
id: translation-studio
type: app
name: Translation Studio
version: 1.0.0
license: MIT
icon: Language
color: blue
description: Professional translation powered by local AI models.
featured: true
source: https://github.com/devsai/translation-studio

pages:
  main: | # tsx
    const App = () => {
      const { llm, ui } = window.DEVS
      return <TranslationUI />
    }

i18n:
  fr:
    name: Studio de Traduction
    description: Traduction professionnelle avec des modèles IA locaux.
```

### Agent Example

```yaml
id: code-reviewer
type: agent
name: Code Reviewer
version: 1.0.0
license: MIT
icon: GitPullRequest
color: purple
description: Expert code reviewer with multi-language expertise.

i18n:
  fr:
    name: Réviseur de Code
    description: Expert en révision de code avec expertise multi-langage.
```

### Connector Example

```yaml
id: linear-connector
type: connector
name: Linear
version: 1.0.0
license: MIT
icon: Layout
color: indigo
description: Connect to Linear for issue tracking.
source: https://github.com/devsai/linear-connector
```

### Tool Example

```yaml
id: web-search
type: tool
name: Web Search
version: 1.0.0
license: MIT
icon: Search
color: blue
description: Search the web using multiple search engines.
```

---

## Summary

The DEVS Marketplace transforms the platform into an extensible ecosystem where:

1. **Users** can discover and install curated extensions
2. **Creators** can build and share custom Apps, Agents, Connectors, and Tools
3. **Community** can collaborate on improving and expanding capabilities

All extensions use a **unified schema** (`extension.schema.json`), ensuring:

- Consistency across extension types
- Security through sandboxed iframe execution
- Interoperability between extensions
- Easy creation without deep technical knowledge

---

## References

- [Extension Schema](../public/schemas/extension.schema.json)
- [Extension Bridge API](EXTENSION-BRIDGE.md)
- [Connectors Documentation](CONNECTORS.md)
