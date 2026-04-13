# DEVS - Architecture

> How the browser becomes an agentic runtime.

## High-Level Overview

```
┌─────────────────────────────────────────────────────────┐
│                      Browser Tab                        │
│                                                         │
│  ┌──────────┐  ┌────────────┐  ┌──────────────────┐    │
│  │ React UI │→ │ Zustand    │→ │ Yjs Y.Document   │    │
│  │ (Pages,  │  │ (Stores)   │  │ (Source of Truth) │    │
│  │  V2 Shell│  │            │  │                   │    │
│  │  Studio) │  └────────────┘  └────────┬──────────┘    │
│  └──────────┘                           │               │
│       │                     ┌───────────┼───────────┐   │
│       │                     │           │           │   │
│       ▼                ┌────▼───┐  ┌────▼───┐  ┌───▼──┐│
│  ┌──────────┐          │y-index │  │y-web   │  │y-web ││
│  │Orchestr- │          │db     │  │socket  │  │rtc   ││
│  │ator      │          │(local)│  │(relay) │  │(P2P) ││
│  │Engine    │          └───────┘  └────────┘  └──────┘│
│  └────┬─────┘                                         │
│       │           ┌──────────────┐                    │
│       ├──────────→│ LLM Service  │→ External APIs     │
│       │           └──────────────┘                    │
│       ├──────────→ Tool Executor                      │
│       ├──────────→ Context Broker                     │
│       └──────────→ Memory Service                     │
│                                                       │
│  ┌──────────────────────────────────────┐             │
│  │ Service Worker (background proxy)    │             │
│  └──────────────────────────────────────┘             │
└───────────────────────────────────────────────────────┘
```

DEVS is a single-page application. Everything executes inside the browser. There is no backend server for application logic — only static file hosting and an optional OAuth proxy for connector auth flows.

## Data Layer: Yjs-First

Yjs is the **single source of truth** for all application data. Every entity lives in a typed `Y.Map` inside one shared `Y.Doc`.

### Why Yjs

- **CRDT semantics** — concurrent edits from multiple tabs or devices merge automatically, no conflict resolution code needed.
- **Offline-first** — `y-indexeddb` persists every change locally; the app works without network.
- **P2P sync** — enabling `y-websocket` or `y-webrtc` replicates state across devices with zero application code changes.
- **Reactive** — custom hooks (`useLiveMap`, `useLiveValue`) observe Y.Map changes and trigger React re-renders.

### Data Maps

```
Y.Doc
 ├── agents            Y.Map<Agent>
 ├── conversations     Y.Map<Conversation>
 ├── tasks             Y.Map<Task>
 ├── artifacts         Y.Map<Artifact>
 ├── memories          Y.Map<AgentMemoryEntry>
 ├── workflows         Y.Map<Workflow>
 ├── sessions          Y.Map<Session>
 ├── studioEntries     Y.Map<StudioEntry>
 ├── traces / spans    Y.Map<Trace> / Y.Map<Span>
 ├── preferences       Y.Map<Preferences>
 ├── credentials       Y.Map<Credential>
 ├── connectors        Y.Map<Connector>
 ├── skills            Y.Map<InstalledSkill>
 ├── spaces            Y.Map<Space>
 ├── threadTags        Y.Map<ThreadTag>
 └── ... (20+ maps total)
```

### Store Pattern

Stores are thin wrappers around Yjs maps. Writes go directly to Yjs; reads come through reactive hooks.

```typescript
// Write: immediate Yjs mutation
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

### Legacy IndexedDB

A small set of browser-specific objects that can't serialize to Yjs remain in IndexedDB: `CryptoKey` handles, `FileSystemDirectoryHandle` references, and high-volume trace data.

## Orchestration Engine

The orchestrator lives in `src/lib/orchestrator/` and follows a **strategy pattern** with shared building blocks.

### Flow

```
User prompt
  │
  ▼
TaskAnalyzer.analyzePrompt()     ← LLM-powered complexity assessment
  │
  ├── Tier 0 (simple)  →  executeSingleAgent()
  │                          Find best agent → runAgent() → artifact
  │
  └── Tier 1+ (complex) → executeAgentTeam()
                             Decompose into subtasks
                             Resolve dependencies
                             Execute in parallel batches
                             Synthesize results
```

### Key Components

| Component | File | Responsibility |
|-----------|------|----------------|
| **Engine** | `orchestrator/engine.ts` | Entry point, strategy routing, dedup |
| **Task Decomposer** | `orchestrator/task-decomposer.ts` | Break prompt into subtasks with deps |
| **Team Coordinator** | `orchestrator/team-coordinator.ts` | Assign agents, manage parallel batches |
| **Agent Runner** | `orchestrator/agent-runner.ts` | Execute agent with tools, stream output |
| **Synthesis Engine** | `orchestrator/synthesis-engine.ts` | Merge multi-agent results |
| **Approval Gate** | `orchestrator/approval-gate.ts` | Human-in-the-loop checkpoints |
| **Recovery** | `orchestrator/recovery.ts` | Retry, orphan detection, graceful failure |
| **Scheduler** | `orchestrator/scheduler.ts` | Background queue processing |
| **Shared Strategies** | `orchestrator/strategies/shared.ts` | Reusable execution building blocks |

### Background Execution

```
submitBackground(prompt, priority)
  → Queued in Yjs-backed store
  → Leader-elected scheduler (one tab owns the queue)
  → Drains entries by priority
  → Results persisted to Yjs (visible on any device)
```

### Events

The orchestrator emits typed events: `agent-start`, `agent-streaming`, `agent-tool-call`, `agent-complete`, `phase-change`. The V2 shell subscribes to render real-time progress.

## LLM Integration

`LLMService` is a static registry of provider implementations behind a common interface.

### Registered Providers

| Provider | Backend | Notes |
|----------|---------|-------|
| OpenAI | Cloud API | GPT-4o, o1, o3 |
| Anthropic | Cloud API | Claude 4 family, extended thinking |
| Google | Cloud API | Gemini 2.5 |
| Mistral | Cloud API | |
| OpenRouter | Proxy | Access to 100+ models |
| HuggingFace | Cloud API | Serverless inference |
| Ollama | Local server | Self-hosted models |
| OpenAI-compatible | Any | LM Studio, vLLM, etc. |
| Local (WebGPU) | In-browser | HuggingFace Transformers.js |
| Vertex AI | Cloud API | Google enterprise |
| Claude Code | Local | CLI integration |

### Tool Calling

Tools use the OpenAI function-calling format as the canonical schema. Providers that don't natively support it get adapter logic. The iterative tool loop runs up to `max_tool_iterations` (default: 10) rounds.

### Attachments

Messages carry typed attachments (`image`, `document`, `text`) as base64-encoded data. Provider adapters translate these to each API's multimodal format.

## Tool System

Tools are self-registering plugins with metadata, a JSON Schema definition, and a handler function.

### Architecture

```
ToolPlugin (metadata + definition + handler)
  → ToolRegistry (lazy registration at chat time)
    → ToolExecutor (batch execution, error capture)
      → Results formatted back to LLM
```

### Built-in Categories

| Category | Tools |
|----------|-------|
| Knowledge | search_knowledge, read_document, list_documents |
| Math | calculate (sandboxed QuickJS) |
| Code | execute (sandboxed QuickJS) |
| Research | wikipedia_search, arxiv_search, wikidata_query |
| Utility | text_ocr |
| Connectors | drive_*, gmail_*, calendar_*, slack_*, notion_* |

## UI Architecture

### V2 Shell

The primary interface is a **unified thread view** that abstracts over conversations, tasks, sessions, and media into a single `Thread` type:

```typescript
interface Thread {
  id: string
  kind: 'task' | 'conversation' | 'media' | 'session'
  title: string
  snippet: string
  agent?: Agent
  participants: Agent[]
  messages: ThreadMessage[]
  artifacts: Artifact[]
  tags: string[]
  source: { task?: Task; conversation?: Conversation; session?: Session }
}
```

The shell provides: filtering, multi-select, keyboard navigation (j/k/s/Escape), tag-based organization, and a contextual inspector panel.

### Spaces

Spaces provide multi-workspace isolation. Every space-scoped entity carries an optional `spaceId`. The default space matches entities where `spaceId` is undefined.

### Component Stack

- **HeroUI v2** — primary component library (migrating to v3)
- **Tailwind CSS v4** — utility-first styling with oklch color tokens
- **Framer Motion** — animations
- **Monaco Editor** — code editing
- **Mermaid** — diagram rendering
- **ECharts** — data visualization

## Feature Modules

Each feature in `src/features/` is independently organized:

| Feature | What It Does |
|---------|-------------|
| **connectors** | OAuth integrations (Google, Notion, Slack, Figma, Dropbox) |
| **marketplace** | Extension discovery, install, and sandboxed execution |
| **studio** | Agent creation/editing with AI-generated portraits |
| **traces** | LLM observability dashboard with cost tracking |
| **sync** | Yjs sync management UI and WebRTC connection |
| **local-backup** | Bidirectional file system sync (Markdown + YAML frontmatter) |
| **search** | Global search across all entity types |
| **skills** | Installable agent capabilities (tools + instructions) |
| **live** | Real-time collaboration features |
| **meeting-bot** | Google Meet integration |
| **notifications** | In-app and push notification system |

## Security Model

| Layer | Mechanism |
|-------|-----------|
| Credential storage | Web Crypto API (AES-GCM encryption at rest) |
| Data isolation | All data in browser; no server-side storage |
| Extension sandboxing | Iframes with message-based bridge |
| P2P sync | Optional; password-protected rooms |

## Deployment

DEVS ships as static files. The Docker image (~60 MB) runs a static web server:

```dockerfile
FROM node:24-alpine AS builder
RUN npm ci && npm run build

FROM joseluisq/static-web-server:2
COPY --from=builder /app/dist /public
```

No backend process. No database server. The browser _is_ the runtime.

---

**Source:** `src/lib/`, `src/stores/`, `src/features/` | **Related:** [DECISIONS.md](./DECISIONS.md), [CONVENTIONS.md](./CONVENTIONS.md)
