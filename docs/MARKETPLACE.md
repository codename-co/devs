# DEVS Marketplace - Platform Extension System

> A standardized, schema-driven marketplace enabling users to create, share, and publish Apps, Agents, Connectors, and Tools.

## Executive Summary

The DEVS Marketplace transforms DEVS from an AI orchestration tool into an **extensible platform**, allowing the community to build and share custom extensions. All extensions are defined using **YAML schemas** with standardized hooks, ensuring consistency, security, and interoperability.

---

## Table of Contents

1. [Vision & Goals](#vision--goals)
2. [Architecture Overview](#architecture-overview)
3. [Extension Types](#extension-types)
   - [Apps](#apps)
   - [Agents](#agents)
   - [Connectors](#connectors)
   - [Tools](#tools)
4. [Schema Specifications](#schema-specifications)
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

1. **Standardization**: Unified YAML schema for all extension types
2. **Discoverability**: Searchable, categorized marketplace with ratings/reviews
3. **Security**: Sandboxed execution, permission systems, code signing
4. **Interoperability**: Extensions can compose and depend on each other
5. **Privacy-First**: Extensions run locally, respect user data boundaries
6. **Low Barrier**: Non-developers can create simple extensions via a specialist agent

---

## Architecture Overview

```
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

### Apps

Apps are **complete workflows** that combine agents, tools, and connectors to solve specific use cases. They are the highest-level abstraction.

#### Example Apps

| App                   | Description                            | Components                                         |
| --------------------- | -------------------------------------- | -------------------------------------------------- |
| **Translation App**   | Translate content using TranslateGemma | TranslateGemma model, file tools                   |
| **Code Analysis App** | Static analysis with local/GitHub sync | Linter tools, GitHub connector, code-analyst agent |
| **PR Review App**     | Automated pull request review workflow | GitHub connector, code-reviewer agent, methodology |
| **Blog Writer App**   | End-to-end blog post creation          | Research agent, writer agent, SEO tools            |
| **Meeting Notes App** | Transcribe and summarize meetings      | Google Meet connector, summarizer agent            |

#### App Schema (`app.schema.yaml`)

```yaml
# public/schemas/app.schema.yaml
$schema: https://json-schema.org/draft/2020-12/schema
$id: https://devs.new/schemas/app.schema.yaml
title: DEVS App Definition
description: Schema for defining complete workflow apps

type: object
required:
  - metadata
  - components
  - workflow

properties:
  metadata:
    type: object
    required: [id, name, version, category]
    properties:
      id:
        type: string
        pattern: '^[a-z0-9-]+$'
        description: Unique app identifier
      name:
        type: string
        description: Display name
      version:
        type: string
        pattern: "^\\d+\\.\\d+\\.\\d+$"
      description:
        type: string
      category:
        type: string
        enum:
          - productivity
          - development
          - content
          - communication
          - analytics
          - automation
          - education
          - creative
      author:
        $ref: '#/$defs/author'
      license:
        type: string
        default: MIT
      repository:
        type: string
        format: uri
      links:
        $ref: '#/$defs/extensionLinks'
      icon:
        type: string
        description: Must be a valid Iconoir icon name <https://iconoir.com/>
      tags:
        type: array
        items:
          type: string
      i18n:
        type: object
        patternProperties:
          '^[a-z]{2}(-[A-Z]{2})?$':
            type: object
            properties:
              name:
                type: string
              description:
                type: string

  components:
    type: object
    description: Required extension components
    properties:
      agents:
        type: array
        items:
          oneOf:
            - type: string # Reference to existing agent ID
            - $ref: '#/$defs/embeddedAgent'
      connectors:
        type: array
        items:
          oneOf:
            - type: string # Reference to existing connector type
            - $ref: '#/$defs/embeddedConnector'
      tools:
        type: array
        items:
          oneOf:
            - type: string # Reference to existing tool name
            - $ref: '#/$defs/embeddedTool'
      models:
        type: array
        description: Required LLM models
        items:
          type: object
          properties:
            provider:
              type: string
            model:
              type: string
            purpose:
              type: string

  workflow:
    type: object
    description: App workflow definition
    properties:
      entrypoint:
        type: string
        description: ID of the primary agent or methodology
      methodology:
        type: string
        description: Reference to a methodology file
      steps:
        type: array
        items:
          $ref: '#/$defs/workflowStep'

  configuration:
    type: object
    description: User-configurable settings
    properties:
      schema:
        type: object
        description: JSON Schema for configuration options
      defaults:
        type: object
        description: Default configuration values

  permissions:
    type: array
    description: Required permissions
    items:
      type: string
      enum:
        - knowledge-read
        - knowledge-write
        - connector-use
        - tool-execute
        - llm-call
        - file-system
        - network
        - clipboard

  hooks:
    $ref: '#/$defs/hooks'

$defs:
  author:
    type: object
    properties:
      name:
        type: string
      email:
        type: string
        format: email
      url:
        type: string
        format: uri
      verified:
        type: boolean

  embeddedAgent:
    type: object
    description: Inline agent definition
    $ref: 'agent.schema.json'

  embeddedConnector:
    type: object
    description: Inline connector definition
    properties:
      type:
        type: string
        enum: [oauth, api, mcp]
      provider:
        type: string
      config:
        type: object

  embeddedTool:
    type: object
    description: Inline tool definition
    $ref: 'tool.schema.yaml'

  workflowStep:
    type: object
    required: [id, action]
    properties:
      id:
        type: string
      action:
        type: string
        enum:
          - invoke-agent
          - execute-tool
          - call-connector
          - user-input
          - conditional
          - parallel
          - loop
      target:
        type: string
      input:
        type: object
      output:
        type: string
      condition:
        type: string
      onSuccess:
        type: string
      onFailure:
        type: string

  hooks:
    type: object
    properties:
      onInstall:
        $ref: '#/$defs/hookDefinition'
      onActivate:
        $ref: '#/$defs/hookDefinition'
      onConfigure:
        $ref: '#/$defs/hookDefinition'
      onExecute:
        $ref: '#/$defs/hookDefinition'
      onDeactivate:
        $ref: '#/$defs/hookDefinition'
      onRemove:
        $ref: '#/$defs/hookDefinition'
      onUpdate:
        $ref: '#/$defs/hookDefinition'

  hookDefinition:
    type: object
    properties:
      type:
        type: string
        enum:
          - inline # Embedded script
          - reference # Reference to tool
          - prompt # LLM prompt execution
      script:
        type: string
        description: Inline JavaScript (sandboxed)
      tool:
        type: string
        description: Tool name to execute
      prompt:
        type: string
        description: LLM prompt to execute
      timeout:
        type: integer
        default: 30000
```

#### Example App Definition

```yaml
# examples/apps/translation-app.app.yaml
metadata:
  id: translation-app
  name: Translation Studio
  version: 1.0.0
  description: |
    Translate documents, text, and conversations using state-of-the-art
    translation models including TranslateGemma for 100+ languages.
  category: productivity
  author:
    name: DEVS Community
    verified: true
  license: MIT
  icon: Languages
  tags:
    - translation
    - multilingual
    - localization
  i18n:
    fr:
      name: Studio de Traduction
      description: Traduisez des documents et du texte avec des modèles de traduction avancés
    es:
      name: Estudio de Traducción
      description: Traduzca documentos y texto con modelos de traducción avanzados

components:
  agents:
    - id: translator
      name: Translator
      icon: Languages
      role: Expert multilingual translator
      instructions: |
        You are a professional {SOURCE_LANG} ({SOURCE_CODE}) to {TARGET_LANG} ({TARGET_CODE}) translator. Your goal is to accurately convey the meaning and nuances of the original {SOURCE_LANG} text while adhering to {TARGET_LANG} grammar, vocabulary, and cultural sensitivities.
        Produce only the {TARGET_LANG} translation, without any additional explanations or commentary. Please translate the following {SOURCE_LANG} text into {TARGET_LANG}:

      tags:
        - translation
        - language

  tools:
    - translate_text # Built-in tool reference

  models:
    - provider: ollama
      model: translategemma
      purpose: Primary translation model

workflow:
  entrypoint: translator
  steps:
    - id: detect-language
      action: invoke-agent
      target: translator
      input:
        task: detect_language
    - id: translate
      action: invoke-agent
      target: translator
      input:
        task: translate
    - id: review
      action: user-input
      input:
        prompt: Review the translation and request refinements if needed

configuration:
  schema:
    type: object
    properties:
      defaultTargetLanguage:
        type: string
        default: en
        enum: [en, fr, es, de, it, pt, zh, ja, ko, ar, ru]
      preserveFormatting:
        type: boolean
        default: true
      includeAlternatives:
        type: boolean
        default: false
  defaults:
    defaultTargetLanguage: en
    preserveFormatting: true

permissions:
  - knowledge-read
  - llm-call
  - clipboard

hooks:
  onInstall:
    type: prompt
    prompt: Check if TranslateGemma model is available, suggest installation if not
  onActivate:
    type: inline
    script: |
      console.log('Translation Studio activated')
```

---

### Agents

Agents are **AI personas** with specific roles, instructions, and capabilities. The existing `agent.schema.json` is extended with marketplace metadata.

#### Extended Agent Schema

```yaml
# Extension to existing agent.schema.json for marketplace
metadata:
  marketplace:
    author:
      name: string
      email: string
      verified: boolean
    publishedAt: date
    updatedAt: date
    downloads: number
    rating: number
    reviews: number
    category:
      - assistant
      - creative
      - technical
      - educational
      - specialized
    compatibility:
      minVersion: string
      maxVersion: string
    dependencies:
      tools: string[]
      connectors: string[]

# Agents can now include tool requirements
tools:
  required:
    - tool_name
  optional:
    - tool_name

# Agents can specify connector requirements
connectors:
  required:
    - github
  optional:
    - jira
```

#### Example Marketplace Agent

```yaml
# examples/agents/code-reviewer.agent.yaml
id: code-reviewer
name: Code Reviewer
icon: GitPullRequest
desc: Expert code reviewer with multi-language expertise
role: Senior software engineer specializing in code review and quality assurance

instructions: |
  You are an expert code reviewer with 15+ years of experience across multiple
  programming languages and paradigms.

  ## Your Expertise
  - **Languages**: TypeScript, Python, Go, Rust, Java, C++
  - **Paradigms**: OOP, Functional, Reactive, Event-driven
  - **Practices**: Clean Code, SOLID, Design Patterns, TDD
  - **Security**: OWASP Top 10, secure coding practices

  ## Review Methodology
  1. **Correctness**: Does the code do what it's supposed to?
  2. **Security**: Are there any vulnerabilities?
  3. **Performance**: Are there optimization opportunities?
  4. **Maintainability**: Is the code readable and well-structured?
  5. **Testing**: Is there adequate test coverage?

  ## Output Format
  Provide structured feedback:
  - 🔴 **Critical**: Must fix before merge
  - 🟡 **Suggestion**: Recommended improvements
  - 🟢 **Praise**: What was done well
  - 💡 **Learning**: Educational notes

temperature: 0.4

tags:
  - code-review
  - development
  - quality
  - security

tools:
  required:
    - github_get_pull_request
    - github_list_pull_request_files
  optional:
    - execute_code

connectors:
  required:
    - github

examples:
  - id: review-pr
    title: Review a Pull Request
    prompt: |
      Review PR #123 in the myorg/myrepo repository. Focus on security
      and performance issues.
  - id: code-standards
    title: Check coding standards
    prompt: |
      Review this code for adherence to clean code principles and suggest
      improvements.

metadata:
  marketplace:
    author:
      name: DEVS Team
      verified: true
    category: technical
    compatibility:
      minVersion: '1.0.0'
    dependencies:
      connectors:
        - github
```

---

### Connectors

Connectors enable DEVS to integrate with external services. Three types are supported:

| Type      | Authentication | Use Case                       |
| --------- | -------------- | ------------------------------ |
| **OAuth** | OAuth 2.0 PKCE | Google, GitHub, Notion, Slack  |
| **API**   | API Key/Bearer | Custom REST/GraphQL APIs       |
| **MCP**   | MCP Protocol   | Model Context Protocol servers |

#### Connector Schema

```yaml
# public/schemas/connector.schema.yaml
$schema: https://json-schema.org/draft/2020-12/schema
$id: https://devs.new/schemas/connector.schema.yaml
title: DEVS Connector Definition
description: Schema for defining external service connectors

type: object
required:
  - metadata
  - type
  - auth

properties:
  metadata:
    type: object
    required: [id, name, version]
    properties:
      id:
        type: string
        pattern: '^[a-z0-9-]+$'
      name:
        type: string
      version:
        type: string
      description:
        type: string
      icon:
        type: string
      color:
        type: string
        pattern: '^#[0-9A-Fa-f]{6}$'
      author:
        $ref: 'app.schema.yaml#/$defs/author'
      category:
        type: string
        enum:
          - cloud-storage
          - productivity
          - development
          - communication
          - social
          - finance
          - custom

  type:
    type: string
    enum: [oauth, api, mcp]

  auth:
    oneOf:
      - $ref: '#/$defs/oauthConfig'
      - $ref: '#/$defs/apiConfig'
      - $ref: '#/$defs/mcpConfig'

  capabilities:
    type: array
    items:
      type: string
      enum: [read, write, search, watch, sync]

  rateLimit:
    type: object
    properties:
      requests:
        type: integer
      windowSeconds:
        type: integer

  endpoints:
    type: array
    description: Available API endpoints
    items:
      $ref: '#/$defs/endpoint'

  tools:
    type: array
    description: Tools automatically registered for this connector
    items:
      $ref: 'tool.schema.yaml'

  syncConfig:
    type: object
    description: Configuration for delta sync
    properties:
      enabled:
        type: boolean
      cursorField:
        type: string
      deltaEndpoint:
        type: string
      fullSyncInterval:
        type: integer
        description: Hours between full syncs

  hooks:
    $ref: 'app.schema.yaml#/$defs/hooks'

$defs:
  oauthConfig:
    type: object
    required: [authUrl, tokenUrl, scopes]
    properties:
      authUrl:
        type: string
        format: uri
      tokenUrl:
        type: string
        format: uri
      scopes:
        type: array
        items:
          type: string
      pkceRequired:
        type: boolean
        default: true
      useBasicAuth:
        type: boolean
        default: false

  apiConfig:
    type: object
    required: [baseUrl, authType]
    properties:
      baseUrl:
        type: string
        format: uri
      authType:
        type: string
        enum: [bearer, api-key, basic, none]
      headers:
        type: object
        additionalProperties:
          type: string

  mcpConfig:
    type: object
    required: [transport]
    properties:
      serverUrl:
        type: string
      transport:
        type: string
        enum: [stdio, sse, websocket]
      capabilities:
        type: array
        items:
          type: string

  endpoint:
    type: object
    required: [id, method, path]
    properties:
      id:
        type: string
      method:
        type: string
        enum: [GET, POST, PUT, PATCH, DELETE]
      path:
        type: string
      description:
        type: string
      parameters:
        type: object
      response:
        type: object
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
  author:
    name: DEVS Community
  category: development

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

Tools are **atomic capabilities** that agents can invoke. They follow the OpenAI function calling format.

#### Tool Schema

```yaml
# public/schemas/tool.schema.yaml
$schema: https://json-schema.org/draft/2020-12/schema
$id: https://devs.new/schemas/tool.schema.yaml
title: DEVS Tool Definition
description: Schema for defining tools available to AI agents

type: object
required:
  - metadata
  - definition

properties:
  metadata:
    type: object
    required: [name, displayName, shortDescription, icon, category]
    properties:
      name:
        type: string
        pattern: '^[a-z][a-z0-9_]*$'
        description: Tool function name (snake_case)
      displayName:
        type: string
        description: Human-readable name
      shortDescription:
        type: string
        maxLength: 100
      longDescription:
        type: string
      icon:
        type: string
      category:
        type: string
        enum:
          - knowledge
          - math
          - code
          - presentation
          - connector
          - utility
          - web
          - file
          - communication
          - custom
      tags:
        type: array
        items:
          type: string
      enabledByDefault:
        type: boolean
        default: false
      estimatedDuration:
        type: integer
        description: Milliseconds
      requiresConfirmation:
        type: boolean
        default: false
      author:
        $ref: 'app.schema.yaml#/$defs/author'

  definition:
    type: object
    description: OpenAI function calling format
    required: [type, function]
    properties:
      type:
        type: string
        const: function
      function:
        type: object
        required: [name, description, parameters]
        properties:
          name:
            type: string
          description:
            type: string
          parameters:
            type: object
            description: JSON Schema for parameters

  implementation:
    type: object
    description: How the tool is implemented
    properties:
      type:
        type: string
        enum:
          - builtin # Native TypeScript implementation
          - script # Sandboxed JavaScript
          - wasm # WebAssembly module
          - connector # Delegates to connector
          - prompt # LLM prompt execution
          - composite # Combines other tools
      source:
        type: string
        description: Implementation source (script, WASM URL, or tool references)
      connector:
        type: string
        description: Connector ID for connector-type tools
      composedTools:
        type: array
        description: Tool names for composite tools
        items:
          type: string
      sandboxConfig:
        type: object
        properties:
          timeout:
            type: integer
            default: 30000
          memoryLimit:
            type: integer
            description: MB
            default: 128
          allowedAPIs:
            type: array
            items:
              type: string
              enum:
                - fetch
                - crypto
                - console
                - date
                - math
                - json

  validation:
    type: object
    description: Input validation rules
    properties:
      schema:
        type: object
        description: JSON Schema for runtime validation
      sanitize:
        type: boolean
        default: true

  permissions:
    type: array
    items:
      type: string
      enum:
        - network
        - file-read
        - file-write
        - clipboard
        - knowledge-access
        - connector-access

  rateLimit:
    type: object
    properties:
      maxCalls:
        type: integer
      windowSeconds:
        type: integer

  hooks:
    type: object
    properties:
      beforeExecute:
        $ref: 'app.schema.yaml#/$defs/hookDefinition'
      afterExecute:
        $ref: 'app.schema.yaml#/$defs/hookDefinition'
      onError:
        $ref: 'app.schema.yaml#/$defs/hookDefinition'
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
  author:
    name: DEVS Team
    verified: true

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

## Schema Specifications

### Common Base Schema

All extension types share common metadata fields:

```yaml
# public/schemas/common.schema.yaml
$defs:
  baseMetadata:
    type: object
    required: [id, name, version]
    properties:
      id:
        type: string
        pattern: '^[a-z0-9-]+$'
        description: Unique identifier (lowercase alphanumeric with hyphens)
      name:
        type: string
        minLength: 1
        maxLength: 100
      version:
        type: string
        pattern: "^\\d+\\.\\d+\\.\\d+(-[a-z0-9.]+)?$"
        description: Semantic version
      description:
        type: string
        maxLength: 500
      icon:
        type: string
        description: Icon name from DEVS icon set
      author:
        $ref: '#/$defs/author'
      license:
        type: string
        default: MIT
      repository:
        type: string
        format: uri
        description: Source code repository
      homepage:
        type: string
        format: uri
        description: Extension homepage
      documentation:
        type: string
        format: uri
        description: Documentation URL
      privacyPolicy:
        type: string
        format: uri
        description: Privacy policy URL
      termsOfService:
        type: string
        format: uri
        description: Terms of service URL
      support:
        type: string
        format: uri
        description: Support or issue tracker URL
      funding:
        type: string
        format: uri
      keywords:
        type: array
        items:
          type: string
      createdAt:
        type: string
        format: date-time
      updatedAt:
        type: string
        format: date-time

  author:
    type: object
    required: [name]
    properties:
      name:
        type: string
        description: Author or organization name
      email:
        type: string
        format: email
      url:
        type: string
        format: uri
        description: Author's personal or organization website
      avatar:
        type: string
        format: uri
      verified:
        type: boolean
        default: false
      github:
        type: string
        description: GitHub username or organization

  # Extension-level URIs (separate from author)
  extensionLinks:
    type: object
    properties:
      website:
        type: string
        format: uri
        description: Extension homepage or landing page
      documentation:
        type: string
        format: uri
        description: Link to full documentation
      privacyPolicy:
        type: string
        format: uri
        description: Privacy policy URL (required if extension collects data)
      termsOfService:
        type: string
        format: uri
        description: Terms of service URL
      support:
        type: string
        format: uri
        description: Support page or issue tracker
      changelog:
        type: string
        format: uri
        description: Link to changelog or release notes

  i18n:
    type: object
    patternProperties:
      '^[a-z]{2}(-[A-Z]{2})?$':
        type: object
        properties:
          name:
            type: string
          description:
            type: string
```

### Schema Versioning

Each schema includes version information for backward compatibility:

```yaml
$schema: https://json-schema.org/draft/2020-12/schema
$id: https://devs.new/schemas/v1/app.schema.yaml
schemaVersion: 1.0.0
```

### Packaging Format Analysis

#### Format Comparison

| Format             | Human-Readable | Multi-file     | Binary Assets  | Validation     | Tooling      |
| ------------------ | -------------- | -------------- | -------------- | -------------- | ------------ |
| **YAML**           | ✅ Excellent   | ❌ Single file | ❌ Base64 only | ✅ JSON Schema | 🟡 Good      |
| **JSON**           | 🟡 Good        | ❌ Single file | ❌ Base64 only | ✅ JSON Schema | ✅ Excellent |
| **ZIP Bundle**     | ❌ Binary      | ✅ Native      | ✅ Native      | 🟡 Custom      | ✅ Excellent |
| **Tar.gz**         | ❌ Binary      | ✅ Native      | ✅ Native      | 🟡 Custom      | ✅ Excellent |
| **WASM Component** | ❌ Binary      | ✅ Embedded    | ✅ Native      | ✅ Type-safe   | 🟡 Emerging  |

#### Recommendation: Hybrid Approach

**Use YAML for definition, ZIP for distribution.**

```
extension.devs                    # Distribution package (.devs = ZIP)
├── manifest.yaml                 # Main definition (YAML)
├── README.md                     # Documentation
├── LICENSE                       # License file
├── icon.svg                      # Extension icon
├── assets/                       # Binary assets
│   ├── screenshots/
│   └── models/                   # Small model files
├── scripts/                      # Additional scripts
│   ├── handlers.js               # Sandboxed handlers
│   └── validators.js             # Custom validators
└── i18n/                         # Translations
    ├── fr.yaml
    ├── es.yaml
    └── de.yaml
```

#### Why YAML for Definitions?

**Advantages:**

1. **Human-readable**: Easy to write, review, and version control
2. **Comments**: Supports inline documentation (JSON doesn't)
3. **Multi-line strings**: Perfect for instructions, prompts, scripts
4. **Existing ecosystem**: Agents/methodologies already use YAML
5. **Git-friendly**: Clean diffs, easy merge conflict resolution
6. **Low barrier**: Non-developers can create simple extensions

**Disadvantages:**

1. **Single file limitation**: Complex apps need multiple files
2. **No binary assets**: Images, models require Base64 (bloated)
3. **Indentation-sensitive**: Easy to make syntax errors
4. **Large files**: Complex apps become unwieldy (500+ lines)
5. **Security**: Script injection via YAML anchors/aliases

#### Why ZIP for Distribution?

**Advantages:**

1. **Multi-file**: Separate concerns (manifest, scripts, assets)
2. **Binary assets**: Icons, screenshots, small models
3. **Compression**: Smaller download size
4. **Integrity**: Built-in CRC checksums
5. **Standard format**: Universal tooling support
6. **Streaming**: Can extract specific files without full download

**Disadvantages:**

1. **Not human-readable**: Must extract to view
2. **Git unfriendly**: Binary diffs, no merge
3. **Extra step**: Packaging required before publishing

#### Proposed Workflow

```
Development (YAML)              Build              Distribution (ZIP)
──────────────────────────────────────────────────────────────────────

my-extension/                   npm run            my-extension.devs
├── manifest.yaml          ───▶ devs:pack    ───▶  (ZIP archive)
├── handlers.js
├── icon.svg
└── i18n/
    └── fr.yaml

                                                   ▼

                                            Upload to Marketplace
                                                   or
                                            Share .devs file directly
```

#### Single-File Extensions (YAML Only)

For simple extensions, a single YAML file is sufficient:

```yaml
# simple-agent.agent.yaml
# No packaging needed - publish directly

id: simple-agent
name: Simple Agent
# ... rest of definition
```

**Use single YAML when:**

- Extension is purely declarative (no custom scripts)
- No binary assets needed
- Under 200 lines
- Quick prototyping

**Use ZIP bundle when:**

- Custom UI with multiple components
- Binary assets (icons, models, images)
- Complex scripts in separate files
- Multiple translation files
- Comprehensive documentation

#### Package Manifest Structure

```yaml
# manifest.yaml (inside .devs package)

package:
  format: devs-package
  version: 1.0.0 # Package format version

extension:
  $ref: ./extension.yaml # Or inline the extension definition

files:
  icon: ./icon.svg
  readme: ./README.md
  license: ./LICENSE
  scripts:
    handlers: ./scripts/handlers.js
  i18n:
    fr: ./i18n/fr.yaml
    es: ./i18n/es.yaml
  assets:
    screenshot1: ./assets/screenshots/main.png
    screenshot2: ./assets/screenshots/settings.png

checksums:
  algorithm: sha256
  files:
    ./extension.yaml: abc123...
    ./scripts/handlers.js: def456...
```

#### Security Considerations

| Concern               | YAML Mitigation              | ZIP Mitigation           |
| --------------------- | ---------------------------- | ------------------------ |
| **Code injection**    | Disable YAML anchors/aliases | Signature verification   |
| **Path traversal**    | N/A                          | Validate paths, no `../` |
| **Large files**       | Size limits                  | Max uncompressed size    |
| **Malicious scripts** | Sandboxed execution          | Content Security Policy  |
| **Tampering**         | Hash verification            | Digital signatures       |

#### Implementation

```typescript
// src/features/marketplace/packager.ts

interface DevsPackage {
  manifest: PackageManifest
  extension: ExtensionDefinition
  files: Map<string, Uint8Array>
}

async function packExtension(dir: string): Promise<Blob> {
  const zip = new JSZip()

  // Read manifest
  const manifest = await readYAML(join(dir, 'manifest.yaml'))

  // Add all referenced files
  for (const [key, path] of Object.entries(manifest.files)) {
    const content = await readFile(join(dir, path))
    zip.file(path, content)
  }

  // Generate checksums
  manifest.checksums = await generateChecksums(zip)
  zip.file('manifest.yaml', stringifyYAML(manifest))

  return zip.generateAsync({ type: 'blob' })
}

async function unpackExtension(blob: Blob): Promise<DevsPackage> {
  const zip = await JSZip.loadAsync(blob)

  // Verify checksums first
  const manifest = parseYAML(await zip.file('manifest.yaml').async('string'))
  await verifyChecksums(zip, manifest.checksums)

  // Parse extension definition
  const extension = parseYAML(await zip.file('extension.yaml').async('string'))
  await validateSchema(extension)

  // Extract files
  const files = new Map()
  for (const [path, file] of Object.entries(zip.files)) {
    if (!file.dir) {
      files.set(path, await file.async('uint8array'))
    }
  }

  return { manifest, extension, files }
}
```

#### File Extension

| Type                   | Extension         | MIME Type                           |
| ---------------------- | ----------------- | ----------------------------------- |
| **Package**            | `.devs`           | `application/x-devs-package`        |
| **Agent (single)**     | `.agent.yaml`     | `application/x-devs-agent+yaml`     |
| **Tool (single)**      | `.tool.yaml`      | `application/x-devs-tool+yaml`      |
| **Connector (single)** | `.connector.yaml` | `application/x-devs-connector+yaml` |
| **App (single)**       | `.app.yaml`       | `application/x-devs-app+yaml`       |

---

## Extension Lifecycle

```
┌─────────────────────────────────────────────────────────────────────┐
│                      Extension Lifecycle                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐     │
│   │ Discover │───▶│ Install  │───▶│ Configure│───▶│ Activate │     │
│   └──────────┘    └────┬─────┘    └──────────┘    └────┬─────┘     │
│                        │                               │            │
│                   onInstall                       onActivate        │
│                        │                               │            │
│                        ▼                               ▼            │
│                  ┌──────────┐                   ┌──────────┐        │
│                  │ Validate │                   │  Execute │        │
│                  │  Schema  │                   │   Hook   │        │
│                  └──────────┘                   └────┬─────┘        │
│                                                      │              │
│                                                 onExecute           │
│                                                      │              │
│   ┌──────────┐    ┌──────────┐    ┌──────────┐      ▼              │
│   │  Remove  │◀───│Deactivate│◀───│  Update  │◀──[ Use ]           │
│   └────┬─────┘    └────┬─────┘    └────┬─────┘                     │
│        │               │               │                            │
│   onRemove        onDeactivate    onUpdate                         │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Lifecycle Hooks

| Hook           | Trigger             | Use Cases                                 |
| -------------- | ------------------- | ----------------------------------------- |
| `onInstall`    | After installation  | Validate dependencies, initialize storage |
| `onActivate`   | Extension activated | Start services, register handlers         |
| `onConfigure`  | Settings changed    | Apply new configuration                   |
| `onExecute`    | Extension invoked   | Main execution logic                      |
| `onDeactivate` | Extension disabled  | Stop services, cleanup                    |
| `onRemove`     | Before uninstall    | Remove data, cleanup                      |
| `onUpdate`     | Version updated     | Migrate data, update config               |

### Hook Execution Context

```typescript
interface HookContext {
  // Extension info
  extension: {
    id: string
    version: string
    type: 'app' | 'agent' | 'connector' | 'tool'
    config: Record<string, unknown>
  }

  // Available services (sandboxed)
  services: {
    storage: {
      get(key: string): Promise<unknown>
      set(key: string, value: unknown): Promise<void>
      delete(key: string): Promise<void>
    }
    llm: {
      chat(messages: Message[], options?: LLMOptions): Promise<string>
    }
    tools: {
      execute(name: string, args: unknown): Promise<unknown>
      list(): ToolMetadata[]
    }
    knowledge: {
      search(query: string): Promise<KnowledgeItem[]>
      get(id: string): Promise<KnowledgeItem>
    }
    ui: {
      toast(message: string, type: 'info' | 'success' | 'error'): void
      confirm(message: string): Promise<boolean>
      prompt(message: string): Promise<string | null>
    }
  }

  // Previous hook result (for chaining)
  previousResult?: unknown
}
```

---

## Marketplace Features

### Discovery & Search

```yaml
# Marketplace search capabilities
search:
  indexes:
    - name
    - description
    - tags
    - author.name
  filters:
    - type: [app, agent, connector, tool]
    - category: [productivity, development, ...]
    - verified: boolean
    - minRating: number
    - compatibility: version
  sort:
    - relevance
    - downloads
    - rating
    - updated
    - created
```

### Publishing Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Publishing Flow                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐     │
│   │  Create  │───▶│ Validate │───▶│  Review  │───▶│ Publish  │     │
│   │Extension │    │  Schema  │    │ (Manual) │    │  Live    │     │
│   └──────────┘    └──────────┘    └──────────┘    └──────────┘     │
│                                                                      │
│   Local Development    ┌──────────────────────┐                     │
│   ──────────────────   │ Security Checks:     │                     │
│   • YAML definition    │ • Permission audit   │                     │
│   • Local testing      │ • Code scan          │                     │
│   • Version bump       │ • Dependency check   │                     │
│                        │ • Sandbox validation │                     │
│                        └──────────────────────┘                     │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Ratings & Reviews

```yaml
review:
  rating: 1-5
  title: string
  content: string
  authorId: string
  extensionId: string
  version: string
  createdAt: date
  helpful: number
  reported: boolean
```

### Version Management

```yaml
versioning:
  strategy: semver
  changelog:
    required: true
    format: keep-a-changelog
  migration:
    supported: true
    maxVersionSkip: 2
```

---

## Security & Trust

### Permission System

```yaml
# Permission categories with risk levels
permissions:
  low-risk:
    - knowledge-read # Read knowledge base
    - llm-call # Make LLM API calls
    - clipboard-read # Read clipboard

  medium-risk:
    - knowledge-write # Modify knowledge base
    - tool-execute # Execute other tools
    - clipboard-write # Write to clipboard
    - connector-use # Use connectors

  high-risk:
    - file-system # Access file system
    - network # Make network requests
    - execute-code # Run arbitrary code

# Permission prompts
prompts:
  file-system: 'This extension wants to access files on your device'
  network: 'This extension wants to make network requests'
  execute-code: 'This extension wants to run code on your device'
```

### Sandboxing

```typescript
// Sandboxed execution environment for extension scripts
interface SandboxConfig {
  // Resource limits
  memoryLimit: number // MB, default 128
  cpuTimeLimit: number // ms, default 30000

  // API access
  allowedGlobals: string[] // ['console', 'Math', 'Date', 'JSON']
  allowedAPIs: string[] // ['fetch', 'crypto']

  // Network restrictions
  networkPolicy: {
    allowedHosts: string[]
    blockedHosts: string[]
    maxConnections: number
  }

  // Storage limits
  storageQuota: number // bytes
}
```

### Trust Levels

| Level          | Badge | Requirements               | Capabilities                  |
| -------------- | ----- | -------------------------- | ----------------------------- |
| **Unverified** | ⚪    | None                       | Basic features, warning shown |
| **Community**  | 🟢    | 100+ downloads, no reports | Standard features             |
| **Verified**   | ✅    | Manual review, code audit  | Full features, featured       |
| **Official**   | ⭐    | DEVS team                  | All features, highlighted     |

### Code Signing

```yaml
# Extension signature manifest
signature:
  algorithm: ed25519
  publicKey: base64-encoded-key
  timestamp: ISO-8601
  digest: sha256-hash-of-content
  certificate:
    issuer: devs.new
    subject: author-email
    validFrom: date
    validTo: date
```

---

## Implementation Roadmap

### Phase 1: Foundation (Q1 2026)

**Goal**: Core infrastructure and local extensions

| Task               | Description                    | Priority    |
| ------------------ | ------------------------------ | ----------- |
| Schema Design      | Finalize all YAML schemas      | 🔴 Critical |
| Extension Registry | IndexedDB store for extensions | 🔴 Critical |
| Schema Validator   | Validate YAML against schemas  | 🔴 Critical |
| Hook Engine        | Execute lifecycle hooks        | 🔴 Critical |
| Basic UI           | Install/uninstall/enable UI    | 🟡 High     |

**Deliverables**:

- `public/schemas/app.schema.yaml`
- `public/schemas/connector.schema.yaml`
- `public/schemas/tool.schema.yaml`
- `src/stores/extensionStore.ts`
- `src/lib/extension-validator.ts`
- `src/lib/hook-engine.ts`

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

```
src/
├── features/
│   └── marketplace/
│       ├── index.ts
│       ├── types.ts                    # Extension types
│       ├── api.ts                      # Marketplace API client
│       ├── importer.ts                 # Import YAML extensions
│       ├── exporter.ts                 # Export extensions
│       ├── validator.ts                # Schema validation
│       ├── hook-engine.ts              # Execute hooks
│       ├── sandbox.ts                  # Sandboxed execution
│       ├── permissions.ts              # Permission system
│       ├── components/
│       │   ├── ExtensionCard.tsx
│       │   ├── ExtensionBrowser.tsx
│       │   ├── ExtensionDetail.tsx
│       │   ├── ExtensionConfig.tsx
│       │   ├── PublishWizard.tsx
│       │   └── PermissionPrompt.tsx
│       ├── hooks/
│       │   ├── useExtensions.ts
│       │   ├── useMarketplace.ts
│       │   └── useExtensionConfig.ts
│       └── pages/
│           ├── MarketplacePage.tsx
│           └── PublishPage.tsx
│
├── stores/
│   └── extensionStore.ts               # Extension state management
│
└── lib/
    └── extension-loader.ts             # Load extensions at runtime

public/
├── schemas/
│   ├── app.schema.yaml
│   ├── agent.schema.yaml               # Extended
│   ├── connector.schema.yaml
│   ├── tool.schema.yaml
│   ├── methodology.schema.yaml         # Extended
│   └── common.schema.yaml
│
└── extensions/                          # Bundled extensions
    ├── apps/
    │   ├── translation-app.app.yaml
    │   └── code-analysis-app.app.yaml
    ├── agents/
    ├── connectors/
    └── tools/
```

### Extension Store Schema

```typescript
// src/stores/extensionStore.ts
interface ExtensionEntry {
  id: string
  type: 'app' | 'agent' | 'connector' | 'tool'
  version: string
  source: 'bundled' | 'local' | 'marketplace'

  // Raw YAML content
  definition: string

  // Parsed and validated
  parsed: AppDefinition | AgentDefinition | ConnectorDefinition | ToolDefinition

  // State
  status: 'installed' | 'active' | 'disabled' | 'error'
  errorMessage?: string

  // Configuration
  config: Record<string, unknown>

  // Permissions
  grantedPermissions: string[]
  deniedPermissions: string[]

  // Metadata
  installedAt: Date
  updatedAt: Date
  lastUsedAt?: Date
  usageCount: number

  // Marketplace info (if from marketplace)
  marketplace?: {
    publishedAt: Date
    downloads: number
    rating: number
    author: Author
  }
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

## Example Apps in Detail

### 1. Translation App (Complete Example)

This example demonstrates the full power of DEVS marketplace apps:

- **Custom UI** with language pair selectors and dual textareas
- **WebGPU-powered local model** from the TranslateGemma collection
- **CDN dependencies** for language detection (franc.js)
- **Offline-capable** translation without API calls

```yaml
# public/extensions/apps/translation-studio.app.yaml
# A complete, production-ready translation app

metadata:
  id: translation-studio
  name: Translation Studio
  version: 1.0.0
  category: productivity
  description: |
    Professional translation powered by WebGPU-accelerated TranslateGemma.
    Works entirely offline after initial model download.
    Automatic language detection with 187 language support via franc.js.
  author:
    name: DEVS Community
    verified: true
  license: MIT
  links:
    website: https://devs.new/apps/translation-studio
    documentation: https://devs.new/docs/apps/translation-studio
    privacyPolicy: https://devs.new/privacy
    support: https://github.com/devs-new/translation-studio/issues
  icon: Languages
  tags:
    - translation
    - multilingual
    - offline
    - webgpu
    - local-ai
  i18n:
    fr:
      name: Studio de Traduction
      description: |
        Traduction professionnelle avec TranslateGemma accéléré par WebGPU.
        Fonctionne entièrement hors ligne après le téléchargement initial du modèle.
    es:
      name: Estudio de Traducción
      description: |
        Traducción profesional con TranslateGemma acelerado por WebGPU.
        Funciona completamente sin conexión después de la descarga inicial del modelo.
    de:
      name: Übersetzungsstudio
      description: |
        Professionelle Übersetzung mit WebGPU-beschleunigtem TranslateGemma.
        Funktioniert nach dem ersten Modell-Download vollständig offline.

# =============================================================================
# Dependencies
# =============================================================================

dependencies:
  # CDN-loaded libraries
  cdn:
    - name: franc
      description: Language detection library (187 languages)
      url: https://cdnjs.cloudflare.com/ajax/libs/franc/6.2.0/franc.min.js
      integrity: sha384-xxx  # SRI hash for security
      global: franc  # Window global exposed by the library

    - name: franc-min
      description: Lightweight franc with top 82 languages
      url: https://cdnjs.cloudflare.com/ajax/libs/franc/6.2.0/franc-min.min.js
      integrity: sha384-xxx
      global: francMin
      optional: true  # Use if full franc is too large

  # Required models (downloaded on first use)
  models:
    - id: translategemma-2b-webgpu
      provider: webgpu
      name: TranslateGemma 2B
      description: Compact multilingual translation model optimized for WebGPU
      size: 1.2GB
      quantization: int4
      downloadUrl: https://huggingface.co/nicholasKluge/translategemma-2b-webgpu
      required: true

    - id: translategemma-7b-webgpu
      provider: webgpu
      name: TranslateGemma 7B
      description: High-quality translation model for complex texts
      size: 4.5GB
      quantization: int4
      downloadUrl: https://huggingface.co/nicholasKluge/translategemma-7b-webgpu
      required: false  # Optional upgrade

# =============================================================================
# Custom UI Definition
# =============================================================================

ui:
  type: custom
  layout: split-horizontal

  components:
    # Header with language selectors
    - id: header
      type: container
      layout: row
      className: flex items-center justify-between p-4 border-b
      children:
        - id: source-lang-group
          type: container
          layout: column
          children:
            - id: source-lang-label
              type: text
              content: Source Language
              className: text-sm text-gray-500 mb-1
            - id: source-lang
              type: select
              placeholder: Auto-detect
              options: ${languageOptions}
              value: ${state.sourceLanguage}
              onChange: setSourceLanguage
              allowEmpty: true
              emptyLabel: Auto-detect (franc.js)

        - id: swap-button
          type: button
          icon: ArrowLeftRight
          variant: ghost
          tooltip: Swap languages
          onClick: swapLanguages
          disabled: ${!state.sourceLanguage}

        - id: target-lang-group
          type: container
          layout: column
          children:
            - id: target-lang-label
              type: text
              content: Target Language
              className: text-sm text-gray-500 mb-1
            - id: target-lang
              type: select
              placeholder: Select target
              options: ${languageOptions}
              value: ${state.targetLanguage}
              onChange: setTargetLanguage
              required: true

    # Main content: dual textareas
    - id: content
      type: container
      layout: row
      className: flex-1 grid grid-cols-2 gap-4 p-4
      children:
        # Source text panel
        - id: source-panel
          type: container
          layout: column
          className: flex flex-col h-full
          children:
            - id: source-header
              type: container
              layout: row
              className: flex items-center justify-between mb-2
              children:
                - id: detected-lang
                  type: chip
                  content: ${state.detectedLanguage ? `Detected: ${state.detectedLanguage}` : ''}
                  variant: flat
                  size: sm
                  visible: ${state.detectedLanguage && !state.sourceLanguage}
                - id: source-char-count
                  type: text
                  content: ${state.sourceText?.length || 0} characters
                  className: text-xs text-gray-400

            - id: source-text
              type: textarea
              placeholder: Enter text to translate...
              value: ${state.sourceText}
              onChange: handleSourceTextChange
              className: flex-1 min-h-[300px] resize-none
              autoFocus: true

            - id: source-actions
              type: container
              layout: row
              className: flex items-center gap-2 mt-2
              children:
                - id: paste-button
                  type: button
                  icon: Clipboard
                  label: Paste
                  variant: flat
                  size: sm
                  onClick: pasteFromClipboard
                - id: clear-button
                  type: button
                  icon: X
                  label: Clear
                  variant: flat
                  size: sm
                  onClick: clearSource
                  disabled: ${!state.sourceText}

        # Target text panel
        - id: target-panel
          type: container
          layout: column
          className: flex flex-col h-full
          children:
            - id: target-header
              type: container
              layout: row
              className: flex items-center justify-between mb-2
              children:
                - id: translation-status
                  type: chip
                  content: ${state.isTranslating ? 'Translating...' : 'Ready'}
                  variant: ${state.isTranslating ? 'warning' : 'success'}
                  size: sm
                - id: target-char-count
                  type: text
                  content: ${state.targetText?.length || 0} characters
                  className: text-xs text-gray-400

            - id: target-text
              type: textarea
              placeholder: Translation will appear here...
              value: ${state.targetText}
              readOnly: true
              className: flex-1 min-h-[300px] resize-none bg-gray-50

            - id: target-actions
              type: container
              layout: row
              className: flex items-center gap-2 mt-2
              children:
                - id: copy-button
                  type: button
                  icon: Copy
                  label: Copy
                  variant: flat
                  size: sm
                  onClick: copyToClipboard
                  disabled: ${!state.targetText}
                - id: speak-button
                  type: button
                  icon: Volume2
                  label: Listen
                  variant: flat
                  size: sm
                  onClick: speakTranslation
                  disabled: ${!state.targetText}

    # Footer with model info and translate button
    - id: footer
      type: container
      layout: row
      className: flex items-center justify-between p-4 border-t
      children:
        - id: model-info
          type: container
          layout: row
          className: flex items-center gap-2
          children:
            - id: model-icon
              type: icon
              name: Cpu
              className: text-gray-400
            - id: model-name
              type: text
              content: ${state.modelName || 'TranslateGemma 2B'}
              className: text-sm text-gray-500
            - id: webgpu-badge
              type: chip
              content: WebGPU
              variant: success
              size: sm
              visible: ${state.webgpuAvailable}
            - id: webgpu-warning
              type: chip
              content: WebGPU unavailable - using WASM fallback
              variant: warning
              size: sm
              visible: ${!state.webgpuAvailable}

        - id: translate-button
          type: button
          icon: Languages
          label: Translate
          variant: primary
          size: lg
          onClick: translateText
          disabled: ${!state.sourceText || !state.targetLanguage || state.isTranslating}
          loading: ${state.isTranslating}

# =============================================================================
# State Management
# =============================================================================

state:
  initial:
    sourceLanguage: null  # null = auto-detect
    targetLanguage: en
    sourceText: ""
    targetText: ""
    detectedLanguage: null
    isTranslating: false
    webgpuAvailable: false
    modelName: TranslateGemma 2B
    modelLoaded: false
    error: null

  # Debounced auto-detection when source text changes
  effects:
    - trigger: sourceText
      debounce: 300
      action: detectLanguage

# =============================================================================
# Language Options
# =============================================================================

constants:
  languageOptions:
    - { value: en, label: English, flag: 🇬🇧 }
    - { value: fr, label: Français, flag: 🇫🇷 }
    - { value: es, label: Español, flag: 🇪🇸 }
    - { value: de, label: Deutsch, flag: 🇩🇪 }
    - { value: it, label: Italiano, flag: 🇮🇹 }
    - { value: pt, label: Português, flag: 🇵🇹 }
    - { value: nl, label: Nederlands, flag: 🇳🇱 }
    - { value: pl, label: Polski, flag: 🇵🇱 }
    - { value: ru, label: Русский, flag: 🇷🇺 }
    - { value: uk, label: Українська, flag: 🇺🇦 }
    - { value: zh, label: 中文, flag: 🇨🇳 }
    - { value: ja, label: 日本語, flag: 🇯🇵 }
    - { value: ko, label: 한국어, flag: 🇰🇷 }
    - { value: ar, label: العربية, flag: 🇸🇦 }
    - { value: hi, label: हिन्दी, flag: 🇮🇳 }
    - { value: tr, label: Türkçe, flag: 🇹🇷 }
    - { value: vi, label: Tiếng Việt, flag: 🇻🇳 }
    - { value: th, label: ไทย, flag: 🇹🇭 }
    - { value: id, label: Bahasa Indonesia, flag: 🇮🇩 }
    - { value: ms, label: Bahasa Melayu, flag: 🇲🇾 }

  # Mapping from franc.js ISO 639-3 to our ISO 639-1 codes
  francToIso:
    eng: en
    fra: fr
    spa: es
    deu: de
    ita: it
    por: pt
    nld: nl
    pol: pl
    rus: ru
    ukr: uk
    cmn: zh
    jpn: ja
    kor: ko
    ara: ar
    hin: hi
    tur: tr
    vie: vi
    tha: th
    ind: id
    msa: ms

# =============================================================================
# Actions (Sandboxed JavaScript)
# =============================================================================

actions:
  # Initialize app: load CDN dependencies and check WebGPU
  onActivate:
    type: script
    script: |
      // Load franc.js from CDN
      async function loadFranc() {
        if (window.franc) return window.franc;

        return new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/franc/6.2.0/franc-min.min.js';
          script.onload = () => resolve(window.franc);
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }

      // Check WebGPU availability
      async function checkWebGPU() {
        if (!navigator.gpu) return false;
        try {
          const adapter = await navigator.gpu.requestAdapter();
          return !!adapter;
        } catch {
          return false;
        }
      }

      const [franc, webgpuAvailable] = await Promise.all([
        loadFranc(),
        checkWebGPU()
      ]);

      context.setState({
        webgpuAvailable,
        francLoaded: !!franc
      });

      if (!webgpuAvailable) {
        context.ui.toast(
          'WebGPU not available. Using WebAssembly fallback (slower).',
          'warning'
        );
      }

  # Detect language using franc.js
  detectLanguage:
    type: script
    script: |
      const { sourceText, sourceLanguage } = context.state;

      // Skip if source language is manually set or text is too short
      if (sourceLanguage || !sourceText || sourceText.length < 10) {
        context.setState({ detectedLanguage: null });
        return;
      }

      // Use franc.js for detection
      const franc = window.franc;
      if (!franc) {
        console.warn('franc.js not loaded');
        return;
      }

      const detected = franc(sourceText);

      // Map franc's ISO 639-3 to our ISO 639-1
      const francToIso = context.constants.francToIso;
      const isoCode = francToIso[detected] || null;

      if (isoCode) {
        const langOption = context.constants.languageOptions.find(
          opt => opt.value === isoCode
        );
        context.setState({
          detectedLanguage: langOption ? `${langOption.flag} ${langOption.label}` : isoCode
        });
      } else {
        context.setState({ detectedLanguage: null });
      }

  # Handle source text change with debounced detection
  handleSourceTextChange:
    type: script
    script: |
      const { value } = event;
      context.setState({ sourceText: value });
      // Detection is triggered by state effect with debounce

  # Swap source and target languages
  swapLanguages:
    type: script
    script: |
      const { sourceLanguage, targetLanguage, sourceText, targetText } = context.state;

      context.setState({
        sourceLanguage: targetLanguage,
        targetLanguage: sourceLanguage || context.state.detectedLanguage?.split(' ')[1]?.toLowerCase(),
        sourceText: targetText,
        targetText: sourceText,
        detectedLanguage: null
      });

  # Main translation action
  translateText:
    type: script
    script: |
      const { sourceText, sourceLanguage, targetLanguage, detectedLanguage } = context.state;

      if (!sourceText || !targetLanguage) return;

      context.setState({ isTranslating: true, error: null });

      try {
        // Determine source language (manual or detected)
        const sourceLang = sourceLanguage ||
          context.constants.francToIso[window.franc(sourceText)] ||
          'auto';

        // Call WebGPU TranslateGemma model
        const result = await context.models.run('translategemma-2b-webgpu', {
          task: 'translation',
          source_lang: sourceLang,
          target_lang: targetLanguage,
          text: sourceText
        });

        context.setState({
          targetText: result.translation,
          isTranslating: false
        });

      } catch (error) {
        context.setState({
          isTranslating: false,
          error: error.message
        });
        context.ui.toast(`Translation failed: ${error.message}`, 'error');
      }

  # Clipboard operations
  pasteFromClipboard:
    type: script
    script: |
      try {
        const text = await navigator.clipboard.readText();
        context.setState({ sourceText: text });
      } catch (error) {
        context.ui.toast('Failed to read clipboard', 'error');
      }

  copyToClipboard:
    type: script
    script: |
      const { targetText } = context.state;
      try {
        await navigator.clipboard.writeText(targetText);
        context.ui.toast('Copied to clipboard', 'success');
      } catch (error) {
        context.ui.toast('Failed to copy', 'error');
      }

  clearSource:
    type: script
    script: |
      context.setState({
        sourceText: '',
        targetText: '',
        detectedLanguage: null
      });

  # Text-to-speech for translation
  speakTranslation:
    type: script
    script: |
      const { targetText, targetLanguage } = context.state;

      if (!targetText) return;

      const utterance = new SpeechSynthesisUtterance(targetText);
      utterance.lang = targetLanguage;

      // Find a voice for the target language
      const voices = speechSynthesis.getVoices();
      const voice = voices.find(v => v.lang.startsWith(targetLanguage));
      if (voice) utterance.voice = voice;

      speechSynthesis.speak(utterance);

  setSourceLanguage:
    type: script
    script: |
      context.setState({
        sourceLanguage: event.value,
        detectedLanguage: null  // Clear auto-detection when manually set
      });

  setTargetLanguage:
    type: script
    script: |
      context.setState({ targetLanguage: event.value });

# =============================================================================
# Permissions
# =============================================================================

permissions:
  - clipboard         # Read/write clipboard for paste/copy
  - llm-call          # Call TranslateGemma model
  - network           # Load franc.js from CDN (first time only)

# =============================================================================
# Hooks
# =============================================================================

hooks:
  onInstall:
    type: script
    script: |
      // Check if TranslateGemma model is available
      const hasModel = await context.models.isDownloaded('translategemma-2b-webgpu');

      if (!hasModel) {
        const confirm = await context.ui.confirm(
          'Translation Studio requires the TranslateGemma 2B model (1.2GB). Download now?'
        );

        if (confirm) {
          context.ui.toast('Downloading TranslateGemma model...', 'info');
          await context.models.download('translategemma-2b-webgpu', {
            onProgress: (progress) => {
              context.ui.updateToast(`Downloading: ${Math.round(progress * 100)}%`);
            }
          });
          context.ui.toast('Model downloaded successfully!', 'success');
        }
      }

  onRemove:
    type: script
    script: |
      // Optionally clean up model on uninstall
      const removeModel = await context.ui.confirm(
        'Remove the TranslateGemma model (1.2GB) as well?'
      );

      if (removeModel) {
        await context.models.delete('translategemma-2b-webgpu');
      }
```

#### Key Features Demonstrated

| Feature                | Implementation                                |
| ---------------------- | --------------------------------------------- |
| **Custom UI**          | `ui` section with declarative component tree  |
| **Language Detection** | franc.js loaded from cdnjs CDN                |
| **Local AI Model**     | TranslateGemma 2B via WebGPU                  |
| **State Management**   | Reactive `state` with effects                 |
| **Clipboard Access**   | Native browser APIs in sandboxed scripts      |
| **Text-to-Speech**     | Web Speech API integration                    |
| **Offline Support**    | Model cached locally after download           |
| **i18n**               | App metadata translated to multiple languages |

#### Installation Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Translation Studio Install                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  1. User clicks "Install" on marketplace                            │
│     └─▶ Schema validation                                           │
│     └─▶ Permission prompt: clipboard, llm-call, network            │
│                                                                      │
│  2. onInstall hook runs                                              │
│     └─▶ Check for TranslateGemma model                              │
│     └─▶ Prompt for 1.2GB download if missing                        │
│     └─▶ Download with progress indicator                            │
│                                                                      │
│  3. App becomes available in launcher                                │
│     └─▶ Icon appears in app drawer                                  │
│     └─▶ "Translation Studio" listed in agents                       │
│                                                                      │
│  4. First launch                                                     │
│     └─▶ onActivate: Load franc.js from CDN                         │
│     └─▶ onActivate: Check WebGPU availability                      │
│     └─▶ Show custom dual-textarea UI                                │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

#### Runtime Flow

```
User types text          franc.js detects          User clicks
in source textarea  ───▶  source language   ───▶   "Translate"
       │                        │                       │
       ▼                        ▼                       ▼
  debounce 300ms         Show "Detected:         TranslateGemma
                          🇫🇷 Français"          WebGPU inference
                                                       │
                                                       ▼
                                                 Result appears
                                                 in target textarea
```

### 2. Code Analysis App

```yaml
metadata:
  id: code-analysis-suite
  name: Code Analysis Suite
  version: 1.0.0
  category: development
  description: |
    Comprehensive static analysis with GitHub/local sync.
    Supports TypeScript, Python, Go, and more.

components:
  agents:
    - id: code-analyst
      name: Code Analyst
      instructions: |
        Expert static analysis engineer...

  connectors:
    - github

  tools:
    - static_analysis
    - security_scan
    - complexity_metrics
    - dependency_audit

workflow:
  steps:
    - id: sync-source
      action: call-connector
      target: github
      input:
        action: clone
    - id: analyze
      action: parallel
      steps:
        - execute-tool: static_analysis
        - execute-tool: security_scan
        - execute-tool: complexity_metrics
    - id: report
      action: invoke-agent
      target: code-analyst
      input:
        task: generate_report
```

### 3. PR Review Methodology App

```yaml
metadata:
  id: pr-review-workflow
  name: PR Review Workflow
  version: 1.0.0
  category: development
  description: |
    Structured pull request review methodology.
    Based on best practices from Google, Microsoft, and top OSS projects.

components:
  agents:
    - id: pr-reviewer
      name: PR Reviewer
      instructions: |
        You review pull requests systematically...

  connectors:
    - github

workflow:
  methodology: pr-review
  steps:
    - id: fetch-pr
      action: call-connector
      target: github
      input:
        action: get_pull_request
    - id: analyze-diff
      action: invoke-agent
      target: pr-reviewer
      input:
        task: analyze_changes
    - id: check-tests
      action: execute-tool
      target: github_get_checks
    - id: security-review
      action: execute-tool
      target: security_scan
    - id: generate-feedback
      action: invoke-agent
      target: pr-reviewer
      input:
        task: write_review
    - id: post-review
      action: call-connector
      target: github
      input:
        action: create_review
```

---

## Compatibility Analysis

This section analyzes how the proposed marketplace schema maps to the existing DEVS codebase architecture.

### Current Architecture Overview

| Component               | Location                                             | Pattern                                                   |
| ----------------------- | ---------------------------------------------------- | --------------------------------------------------------- |
| **Tool Plugins**        | `src/tools/plugins/`                                 | `ToolPlugin` interface with metadata, definition, handler |
| **Tool Registry**       | `src/tools/registry.ts`                              | Centralized registration with `createToolPlugin()`        |
| **Connector Providers** | `src/features/connectors/providers/apps/`            | `ProviderMetadata` + `BaseAppConnectorProvider` class     |
| **Provider Registry**   | `src/features/connectors/providers/apps/registry.ts` | `registerProvider()` with lazy loading                    |
| **Connector Tools**     | `src/features/connectors/tools/`                     | Service layer wrapping provider APIs                      |
| **Tool Definitions**    | `src/features/connectors/tools/types.ts`             | OpenAI function calling format                            |

### ✅ Tool Schema Compatibility

The proposed `tool.schema.yaml` aligns well with the existing `ToolPlugin` interface:

```typescript
// Existing: src/tools/types.ts
interface ToolPlugin {
  metadata: ToolMetadata // ✅ Maps to tool.schema.yaml#/properties/metadata
  definition: ToolDefinition // ✅ Maps to tool.schema.yaml#/properties/definition
  handler: ToolHandler // ⚠️ Requires runtime bridge (see below)
  validate?: Function // ✅ Maps to tool.schema.yaml#/properties/validation
  initialize?: Function // ✅ Maps to hooks.onInstall
  cleanup?: Function // ✅ Maps to hooks.onRemove
}

// Existing metadata already matches:
interface ToolMetadata {
  name: string // ✅ Matches
  displayName: string // ✅ Matches
  shortDescription: string // ✅ Matches
  icon: IconName // ✅ Matches
  category: ToolCategory // ✅ Matches
  tags?: string[] // ✅ Matches
  enabledByDefault?: boolean // ✅ Matches
  estimatedDuration?: number // ✅ Matches
  requiresConfirmation?: bool // ✅ Matches
}
```

**Migration Path for Tools:**

1. **Builtin tools** (TypeScript handlers) → `implementation.type: 'builtin'`
2. **Script tools** (sandboxed JS) → `implementation.type: 'script'`
3. **Connector tools** → `implementation.type: 'connector'` with reference

**Example: Converting Gmail Search Tool**

```yaml
# From: src/tools/plugins/connectors/gmail.ts
# To: marketplace YAML format

metadata:
  name: gmail_search
  displayName: Gmail Search
  shortDescription: Search emails using Gmail search syntax
  icon: Mail
  category: connector
  tags: [connector, gmail, search, email]
  estimatedDuration: 2000
  author:
    name: DEVS Team
    verified: true

definition:
  type: function
  function:
    name: gmail_search
    description: |
      Search emails using Gmail's search syntax.
      Supports queries like "from:boss@company.com", "subject:meeting", "is:unread"
    parameters:
      type: object
      required: [connector_id, query]
      properties:
        connector_id:
          type: string
          description: The ID of the Gmail connector to use
        query:
          type: string
          description: Gmail search query
        max_results:
          type: integer
          default: 10

implementation:
  type: connector
  connector: gmail
  source: gmail_search # Maps to service function

permissions:
  - connector-access
```

### ✅ Connector Schema Compatibility

The proposed `connector.schema.yaml` maps well to the existing `ProviderMetadata`:

```typescript
// Existing: src/features/connectors/types.ts
interface ProviderMetadata {
  id: AppConnectorProvider // ✅ Maps to metadata.id
  name: string // ✅ Maps to metadata.name
  icon: string // ✅ Maps to metadata.icon
  color: string // ✅ Maps to metadata.color
  description: string // ✅ Maps to metadata.description
  syncSupported: boolean // ✅ Maps to syncConfig.enabled
  oauth: OAuthConfig // ✅ Maps to auth (type: oauth)
  proxyRoutes?: ProxyRoute[] // ⚠️ Needs bridge config section
}

// OAuthConfig matches exactly:
interface OAuthConfig {
  authUrl: string // ✅ Matches
  tokenUrl: string // ✅ Matches
  scopes: string[] // ✅ Matches
  clientId: string // ⚠️ Runtime injection needed
  pkceRequired: boolean // ✅ Matches
  useBasicAuth?: boolean // ✅ Matches
}
```

**Example: Converting Google Drive Connector**

```yaml
# From: src/features/connectors/providers/apps/google-drive.ts
# To: marketplace YAML format

metadata:
  id: google-drive
  name: Google Drive
  version: 1.0.0
  description: Sync files and folders from Google Drive
  icon: GoogleDrive
  color: '#4285f4'
  category: cloud-storage
  author:
    name: DEVS Team
    verified: true
  links:
    documentation: https://devs.new/docs/connectors/google-drive
    privacyPolicy: https://devs.new/privacy

type: oauth

auth:
  authUrl: https://accounts.google.com/o/oauth2/v2/auth
  tokenUrl: ${BRIDGE_URL}/api/google/token
  scopes:
    - https://www.googleapis.com/auth/userinfo.email
    - https://www.googleapis.com/auth/userinfo.profile
    - https://www.googleapis.com/auth/drive.readonly
    - https://www.googleapis.com/auth/drive.metadata.readonly
  pkceRequired: true

capabilities:
  - read
  - search
  - sync

syncConfig:
  enabled: true
  cursorField: pageToken
  deltaEndpoint: /drive/v3/changes
  fullSyncInterval: 24

# Tools automatically registered with this connector
tools:
  - drive_search
  - drive_read
  - drive_list

# Bridge/proxy configuration (for OAuth credential injection)
bridge:
  routes:
    - pathPrefix: /api/google
      pathMatch: /token
      target: https://oauth2.googleapis.com
      credentials:
        type: body
        clientIdEnvKey: VITE_GOOGLE_CLIENT_ID
        clientSecretEnvKey: VITE_GOOGLE_CLIENT_SECRET
```

### ⚠️ Gap Analysis

| Gap                     | Current Implementation     | Proposed Solution                                               |
| ----------------------- | -------------------------- | --------------------------------------------------------------- |
| **TypeScript handlers** | Native TS functions        | `implementation.type: 'builtin'` references registered handlers |
| **Runtime secrets**     | `import.meta.env.VITE_*`   | Template variables `${VAR_NAME}` resolved at runtime            |
| **Proxy routes**        | Provider-specific config   | Standardized `bridge` section in connector schema               |
| **Class inheritance**   | `BaseAppConnectorProvider` | Interface-based with hook implementations                       |
| **Type safety**         | Strong TypeScript types    | Runtime validation via JSON Schema                              |

### Migration Strategy

#### Phase 1: Dual Support (Recommended)

Keep existing TypeScript implementations while adding YAML schema support:

```typescript
// src/features/marketplace/loader.ts
export async function loadExtension(yaml: string): Promise<Extension> {
  const parsed = parseYAML(yaml)
  const validated = await validateSchema(parsed)

  // For builtin implementations, delegate to existing registry
  if (validated.implementation?.type === 'builtin') {
    const existing = toolRegistry.get(validated.implementation.source)
    if (existing) {
      return wrapExistingTool(existing, validated.metadata)
    }
  }

  // For script implementations, use sandbox
  if (validated.implementation?.type === 'script') {
    return createSandboxedTool(validated)
  }

  // For connector implementations, wire to service layer
  if (validated.implementation?.type === 'connector') {
    return createConnectorTool(validated)
  }
}
```

#### Phase 2: YAML-First Development

New extensions created via YAML, existing ones gradually migrated:

```
src/tools/plugins/
├── calculate.ts        # Keep: complex TypeScript logic
├── execute.ts          # Keep: security-sensitive code execution
├── connectors/         # Migrate: mostly declarative wiring
│   ├── gmail.ts        →  public/extensions/tools/gmail.tool.yaml
│   ├── drive.ts        →  public/extensions/tools/drive.tool.yaml
│   └── ...
```

#### Phase 3: Full YAML Migration

All extensions defined in YAML, TypeScript only for:

- Core runtime (sandbox, validator, hook engine)
- Security-critical built-in handlers
- Complex business logic that can't be sandboxed

### Connector Provider Interface Mapping

```typescript
// Existing interface methods → YAML hooks mapping

class BaseAppConnectorProvider {
  // Authentication
  async authenticate()     → hooks.onActivate
  async refreshToken()     → (handled by runtime)
  async revokeAccess()     → hooks.onDeactivate

  // Data operations (become tools)
  async list()             → tools[].drive_list
  async read()             → tools[].drive_read
  async search()           → tools[].drive_search
  async getChanges()       → syncConfig + runtime

  // Account info
  async getAccountInfo()   → (runtime utility)
}
```

### Tool Handler Bridge

For TypeScript handlers that can't be expressed in YAML:

```yaml
# Tool with builtin handler reference
implementation:
  type: builtin
  source: execute_code  # References registered TypeScript handler

# The TypeScript handler is registered separately:
# src/tools/builtins/execute-code.ts
toolRegistry.registerBuiltin('execute_code', executeCodeHandler)
```

### Recommended Schema Additions

Based on the compatibility analysis, add these to the schemas:

```yaml
# Addition to connector.schema.yaml
properties:
  bridge:
    type: object
    description: OAuth proxy/bridge configuration
    properties:
      routes:
        type: array
        items:
          type: object
          properties:
            pathPrefix:
              type: string
            pathMatch:
              type: string
            target:
              type: string
              format: uri
            targetPathPrefix:
              type: string
            credentials:
              type: object
              properties:
                type:
                  type: string
                  enum: [body, basic-auth, header, none]
                clientIdEnvKey:
                  type: string
                clientSecretEnvKey:
                  type: string

# Addition to tool.schema.yaml
properties:
  implementation:
    properties:
      source:
        oneOf:
          - type: string
            description: Builtin handler name or inline script
          - type: object
            description: Multi-file implementation
            properties:
              main:
                type: string
              dependencies:
                type: array
                items:
                  type: string
```

### Compatibility Score

| Extension Type | Compatibility | Notes                                        |
| -------------- | ------------- | -------------------------------------------- |
| **Tools**      | 🟢 95%        | Direct mapping, only handler bridging needed |
| **Connectors** | 🟢 90%        | OAuth config matches, need bridge section    |
| **Agents**     | 🟢 100%       | Already YAML-based in `public/agents/`       |
| **Apps**       | 🟡 New        | No existing equivalent, clean implementation |

### Conclusion

The proposed marketplace schema architecture is **highly compatible** with the existing DEVS codebase:

1. **Tool schema** directly maps to `ToolPlugin` interface
2. **Connector schema** aligns with `ProviderMetadata` structure
3. **Agent schema** extends existing `public/agents/*.agent.yaml` format
4. **Migration path** allows incremental adoption without breaking changes

The main work involves:

- Adding a YAML loader/validator for extensions
- Creating a handler bridge for TypeScript implementations
- Standardizing the bridge/proxy configuration
- Building the extension registry store

---

## Conclusion

The DEVS Marketplace transforms the platform into an extensible ecosystem where:

1. **Users** can discover and install curated extensions
2. **Creators** can build and share custom Apps, Agents, Connectors, and Tools
3. **Community** can collaborate on improving and expanding capabilities
4. **Enterprise** can deploy private marketplaces with custom extensions

All extensions are defined in **standardized YAML schemas**, ensuring:

- Consistency across extension types
- Security through permission systems and sandboxing
- Interoperability between extensions
- Easy creation without deep technical knowledge

---

## References

- [Agent Schema](../public/schemas/agent.schema.json)
- [Methodology Schema](../public/schemas/methodology.schema.json)
- [Connectors Documentation](CONNECTORS.md)
- [Tool System](../src/tools/README.md)

---

_Last Updated: January 2026_
