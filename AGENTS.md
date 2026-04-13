# DEVS - AI Agent Orchestration Platform

> The Web as the runtime for agentic AI. Open your browser and start delegating.

## What DEVS Is

An open-source, browser-native platform that lets anyone delegate complex tasks to a swarm of AI agents — without servers, without subscriptions, without surrendering data.

- **Delegate, don't chat.** Users describe a goal; the system analyzes complexity, assembles a purpose-built team, decomposes work, and delivers structured output.
- **Bring Your Own Model.** 12+ LLM backends — cloud APIs, self-hosted endpoints, local in-browser inference.
- **Privacy by architecture.** All data stays on-device. Yjs CRDTs handle the data layer; Web Crypto encrypts credentials. No telemetry unless the user opts in.
- **Swarm intelligence.** Agents have roles, tools, memories, and knowledge bases. The orchestrator routes by complexity tier.
- **Extensible.** A marketplace of apps, agents, connectors, and tools — YAML-defined, sandboxed in iframes.

**Live:** [devs.new](https://devs.new) | **Repository:** [github.com/codename-co/devs](https://github.com/codename-co/devs) | **License:** MIT

---

## Documentation

Detailed documentation lives in `docs/`:

| Document | What It Covers |
|----------|---------------|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System architecture, data layer, orchestration, LLM integration, tools, UI |
| [docs/CONVENTIONS.md](docs/CONVENTIONS.md) | Code style, file naming, state management patterns, testing, i18n |
| [docs/DECISIONS.md](docs/DECISIONS.md) | Architectural decision records (ADRs) with context and rationale |
| [docs/GLOSSARY.md](docs/GLOSSARY.md) | Definitions of all terms used across the codebase |
| [docs/TODO.md](docs/TODO.md) | Current status of all features (done, in progress, planned, future) |
| [docs/VISION.md](docs/VISION.md) | Full vision document — problem, thesis, design principles |

Additional deep-dives in `docs/more/`:

| Document | Topic |
|----------|-------|
| [docs/more/CONNECTORS.md](docs/more/CONNECTORS.md) | External service integrations (OAuth, sync) |
| [docs/more/TOOLS.md](docs/more/TOOLS.md) | Tool plugin system and built-in tools |
| [docs/more/TRACES.md](docs/more/TRACES.md) | LLM observability and cost tracking |
| [docs/more/SPACES.md](docs/more/SPACES.md) | Multi-workspace isolation |
| [docs/more/SYNC.md](docs/more/SYNC.md) | Yjs-first data layer and P2P sync |
| [docs/more/MARKETPLACE.md](docs/more/MARKETPLACE.md) | Extension system (apps, agents, tools) |
| [docs/more/LOCAL-BACKUP.md](docs/more/LOCAL-BACKUP.md) | Bidirectional file system sync |
| [docs/more/EXTENSION-BRIDGE.md](docs/more/EXTENSION-BRIDGE.md) | Sandboxed extension API |
| [docs/more/MEET-BOT.md](docs/more/MEET-BOT.md) | Google Meet integration |
| [docs/more/SEARCH.md](docs/more/SEARCH.md) | Global search |

---

## Technical Stack

| Layer | Technology |
|-------|-----------|
| Bundler | Vite 7 (MPA mode) |
| Language | TypeScript 5.8 (strict) |
| UI | React 19 + HeroUI v2 (migrating to v3) |
| Styling | Tailwind CSS v4 (oklch color tokens) |
| Data layer | Yjs (single source of truth) + y-indexeddb + y-websocket + y-webrtc |
| Testing | Vitest 3 + Playwright 1.55 |
| Linting | ESLint 9 (flat config) + Prettier 3 |
| Code execution | QuickJS (JS) + Pyodide (Python) — both WASM-sandboxed |
| Deployment | Static files, Docker (~60 MB) |

---

## Key Features

### LLM Provider Independence

BYOK (Bring Your Own Key) support for 12+ providers behind a unified `LLMProviderInterface`:

| Provider | Type |
|----------|------|
| OpenAI | Cloud API |
| Anthropic | Cloud API |
| Google Gemini | Cloud API |
| Mistral | Cloud API |
| OpenRouter | Proxy (100+ models) |
| HuggingFace | Cloud API |
| Ollama | Local server |
| OpenAI-compatible | Any (LM Studio, vLLM, etc.) |
| Local (WebGPU) | In-browser via Transformers.js |
| Vertex AI | Cloud API |
| Claude Code | Local CLI |

Tool calling uses the OpenAI function-calling format as canonical schema. Streaming, multimodal attachments (image/document/text), and extended thinking are supported.

### Agent System

- **AI Studio** — Create, edit, configure custom agents with roles, instructions, temperature, tags, tools, and knowledge base
- **Built-in agents** — Ship as JSON; custom agents stored in Yjs
- **Agent memory** — LLM-powered extraction from conversations, human review workflow (approve/reject/edit), context injection into future conversations
- **Agent portraits** — AI-generated
- **Skills** — Installable capability bundles (tools + instructions)

### Multi-Agent Orchestration

The orchestrator lives in `src/lib/orchestrator/` and uses a strategy pattern:

| Component | File | Responsibility |
|-----------|------|----------------|
| Engine | `orchestrator/engine.ts` | Entry point, strategy routing, dedup |
| Task Decomposer | `orchestrator/task-decomposer.ts` | Break prompt into subtasks with deps |
| Team Coordinator | `orchestrator/team-coordinator.ts` | Assign agents, manage parallel batches |
| Agent Runner | `orchestrator/agent-runner.ts` | Execute agent with tools, stream output |
| Synthesis Engine | `orchestrator/synthesis-engine.ts` | Merge multi-agent results |
| Approval Gate | `orchestrator/approval-gate.ts` | Human-in-the-loop checkpoints |
| Recovery | `orchestrator/recovery.ts` | Retry, orphan detection, graceful failure |
| Scheduler | `orchestrator/scheduler.ts` | Background queue processing |

**Flow:** User prompt -> TaskAnalyzer (LLM-powered complexity assessment) -> Tier 0 (single agent) or Tier 1+ (multi-agent with decomposition, dependency resolution, parallel execution, synthesis).

**Methodology templates:** 8D, A3, Agile, AOSTC, DMAIC, PDCA, Scrum, YOLO.

### Tool System

Self-registering plugins in `src/tools/`:

| Category | Tools |
|----------|-------|
| Knowledge | search_knowledge, read_document, list_documents, summarize |
| Math | calculate (sandboxed QuickJS) |
| Code | execute (sandboxed QuickJS + Pyodide) |
| Research | wikipedia_search, arxiv_search, wikidata_query |
| Utility | text_ocr |
| Connectors | drive_*, gmail_*, calendar_*, slack_*, notion_* |
| Generation | artifact, presentation, PowerPoint |

### Connectors

OAuth 2.0 PKCE integrations in `src/features/connectors/`:

- Google Drive, Gmail, Google Calendar, Google Tasks, Google Meet, Google Chat
- Notion, Slack, Figma, Dropbox, OneDrive, Outlook, Qonto

### Knowledge Base

File upload, folder watching (File System Access API), SHA-256 deduplication, background sync. Supports text, image, and document files (PDF, DOCX, XLSX, PPTX, CSV).

### Collaboration

- P2P sync via WebRTC and WebSocket relay (Yjs)
- Password-protected rooms
- QR code sharing
- CRDT-based automatic conflict resolution

### Spaces

Multi-workspace isolation. Every space-scoped entity carries `spaceId?: string`. Per-space settings overrides. See [docs/more/SPACES.md](docs/more/SPACES.md).

---

## Project Structure

```
src/
  app/            App shell, providers, router, initialization
  components/     Shared UI components
  config/         Product constants, API endpoints
  features/       Independent feature modules (connectors, marketplace, studio, traces, sync, etc.)
  hooks/          Shared custom React hooks
  i18n/           Translations and language utilities
  layouts/        Page layout templates
  lib/            Business logic, services, utilities
  pages/          Route-level page components
  stores/         Zustand stores (Yjs-backed)
  styles/         Global CSS, Tailwind config
  test/           Test files (mirrors src/ structure)
  tools/          Tool plugin definitions
  types/          Shared TypeScript type definitions
  workers/        Web Worker scripts
```

Features in `src/features/` are self-contained: they may import from `src/lib/`, `src/stores/`, and `src/types/` but never from other features.

---

## Data Layer

### Yjs-First Architecture

Yjs is the single source of truth. All persistent data lives in typed `Y.Map` instances within one `Y.Doc`. Stores are thin wrappers that provide write functions and reactive read hooks.

```typescript
// Write: direct Yjs mutation
export function createAgent(data: AgentData): Agent {
  const agent = { ...data, id: nanoid(), createdAt: new Date() }
  agents.set(agent.id, agent)
  return agent
}

// Read: reactive hook observing Y.Map
export function useAgents(): Agent[] {
  return useLiveMap(agents).filter(a => !a.deletedAt)
}
```

Soft delete everywhere (`deletedAt?: Date`). Read hooks filter out deleted entities.

### Data Maps

Key Yjs maps: `agents`, `conversations`, `tasks`, `artifacts`, `memories`, `workflows`, `sessions`, `studioEntries`, `traces`, `spans`, `preferences`, `credentials`, `connectors`, `skills`, `spaces`, `threadTags` (20+ maps total).

### Data Schema

Data types are defined in [src/types/index.ts](src/types/index.ts).

```typescript
interface Agent {
  id: string
  slug: string
  name: string
  icon?: IconName
  role: string
  instructions: string
  temperature?: number
  tags?: string[]
  tools?: Tool[]
  createdAt: Date
  updatedAt?: Date
  version?: string
}

interface Task {
  id: string
  workflowId: string
  title: string
  description: string
  complexity: 'simple' | 'complex'
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  assignedAgentId?: string
  parentTaskId?: string
  dependencies: string[]
  requirements: Requirement[]
  artifacts: string[]
  steps: TaskStep[]
  createdAt: Date
  updatedAt: Date
  completedAt?: Date
}

interface Conversation {
  id: string
  agentId: string
  participatingAgents: string[]
  workflowId: string
  timestamp: Date
  updatedAt: Date
  messages: Message[]
  title?: string
  isPinned?: boolean
  summary?: string
}

interface KnowledgeItem {
  id: string
  name: string
  type: 'file' | 'folder'
  fileType?: 'document' | 'image' | 'text'
  content?: string
  contentHash?: string
  path: string
  lastModified: Date
  createdAt: Date
  tags?: string[]
}

interface Artifact {
  id: string
  taskId: string
  agentId: string
  type: string
  description: string
  content: string
  status: 'pending' | 'completed'
  validates?: string[]
  createdAt: Date
}
```

---

## State Management

Yjs-backed Zustand stores:

| Store | Yjs Map | Responsibility |
|-------|---------|----------------|
| AgentStore | `agents` | Agent CRUD, built-in + custom agents |
| ConversationStore | `conversations` | Message history, title generation |
| TaskStore | `tasks` | Task lifecycle, requirement validation |
| ArtifactStore | `artifacts` | Deliverable management |
| AgentMemoryStore | `memories` | Memory CRUD, human review, context injection |
| ContextStore | — | Inter-agent context sharing |
| UserStore | `preferences` | Settings, theme, language |

All stores follow the same pattern: direct Yjs writes, reactive hooks via `useLiveMap`/`useLiveValue`, error handling with toast notifications.

---

## Development

### Commands

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run lint         # Run linting
npm run typecheck    # Type checking
npm run test:run     # Run all unit tests once
npm run test:watch   # Tests in watch mode (recommended during development)
npm run test:coverage # Tests with coverage report
npm run test:e2e     # Run E2E tests
```

### TDD Mandate

All new code in `src/lib/` and `src/stores/` must follow TDD:

1. **Red** — Write a failing test
2. **Green** — Minimal code to pass
3. **Refactor** — Clean up, keep tests green
4. **Verify** — `npm run test:coverage`

### Coverage Targets

| Directory | Target | Priority |
|-----------|--------|----------|
| `src/lib/**` | 60%+ | Critical |
| `src/stores/**` | 60%+ | Critical |
| `src/components/**` | 30%+ | Medium |
| `src/pages/**` | 20%+ | Low |

---

## Design Principles

1. **Accessibility first** — Works on 2GB RAM devices. Multi-language. Keyboard navigable. Screen reader compatible.
2. **Privacy by design** — Data never leaves the client unless the user connects P2P sync or an external connector.
3. **Progressive disclosure** — A single prompt area by default. Complexity revealed as needed.
4. **Real-time transparency** — Users see the orchestration trace.
5. **Graceful degradation** — Offline-capable. Missing providers handled. Tool failures don't crash workflows.

---

## Internationalization (i18n) Guidelines

When working with translation strings, apostrophes must use `&apos;` instead of `'`. All user-facing strings go through the i18n system. Supported languages: English, French, German, Spanish, Arabic, Korean.

---

## AI Agent Guidelines

### Context7 MCP for Documentation

Always use Context7 MCP automatically when working on tasks that involve:

- Library or framework API documentation
- Code generation with external dependencies
- Setup or configuration steps for tools/packages
- Implementation patterns for React, Vite, Zustand, Playwright, HeroUI, or other project dependencies

This ensures accurate, up-to-date documentation is referenced without requiring explicit requests.
