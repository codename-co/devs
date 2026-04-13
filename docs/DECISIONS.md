# DEVS - Architectural Decision Records

> Key decisions, their context, and why we chose what we chose.

Each record follows: **Context** (what prompted the decision), **Decision** (what we chose), **Consequences** (what followed).

---

## ADR-001: Browser-Only Architecture

**Date:** Project inception

**Context:** Agentic AI platforms universally assume a backend: servers for orchestration, databases for state, APIs for model access. This creates cost, complexity, privacy exposure, and a barrier for individual users.

**Decision:** DEVS runs entirely in the browser. No application server. No server-side database. Static file hosting only.

**Consequences:**
- Distribution is trivial — a URL is enough
- Privacy is structural, not policy-based
- State management must solve offline-first, multi-tab, and cross-device without a server
- Some capabilities (long-running background jobs, webhook receivers) are constrained
- The Docker image is ~60 MB serving static files

---

## ADR-002: Yjs as Single Source of Truth

**Date:** v0.5 (replaced dual IndexedDB + Zustand approach)

**Context:** Early versions used IndexedDB for persistence and Zustand for in-memory state, with manual sync between them. This caused stale reads, race conditions on concurrent writes, and made P2P sync a separate concern layered on top.

**Decision:** Adopt Yjs as the single source of truth. All persistent data lives in typed `Y.Map` instances within one `Y.Doc`. Zustand stores become thin wrappers providing React hooks. `y-indexeddb` handles local persistence. `y-websocket` and `y-webrtc` handle P2P sync.

**Consequences:**
- One write path (Yjs maps), one read path (reactive hooks)
- P2P sync came "for free" — enabling it required no application code changes
- CRDT semantics eliminated all manual conflict resolution
- Some browser-specific data (CryptoKeys, FileSystemHandles) still lives in IndexedDB because Yjs can only serialize JSON-compatible data
- Learning curve for Yjs patterns, but the API surface is small

---

## ADR-003: Soft Delete Everywhere

**Date:** v0.5

**Context:** With P2P sync, a hard delete on one device could race with an edit on another, causing data loss or ghost references.

**Decision:** All entities use `deletedAt?: Date` for soft deletion. Read hooks filter out deleted entities. No physical removal.

**Consequences:**
- P2P sync handles deletions gracefully (the delete flag propagates via CRDT)
- Undo is trivially possible (clear `deletedAt`)
- Storage grows over time — needs periodic cleanup strategy (not yet implemented)
- All queries must include the `!deletedAt` filter (enforced in store hooks)

---

## ADR-004: LLM Provider Abstraction

**Date:** v0.1

**Context:** Users have different LLM preferences and cost constraints. Vendor lock-in defeats the privacy-first mission.

**Decision:** Define `LLMProviderInterface` with `chat()`, `streamChat()`, `validateApiKey()`, and `getAvailableModels()`. Register provider implementations at startup. All application code calls `LLMService` — never a specific provider.

**Consequences:**
- Adding a new provider is a single file + registration line
- Tool calling uses OpenAI function-calling format as canonical schema — other providers adapt
- Some provider-specific features (Anthropic extended thinking, Google search grounding) require optional config fields
- Users can switch providers without changing workflows
- 12+ providers supported with the same interface

---

## ADR-005: OpenAI Tool Format as Canonical

**Date:** v0.3

**Context:** Different LLM providers have different function/tool calling formats. We needed one schema for tool definitions and one format for tool call results.

**Decision:** Use OpenAI's function-calling format (`ToolDefinition`, `ToolCall`) as the canonical schema. Provider adapters translate to/from native formats.

**Consequences:**
- Tool plugins define their schema once
- Providers that don't support tools natively get prompt-based simulation
- New providers must implement the translation layer
- The ecosystem (OpenAI format) has the most community tooling and documentation

---

## ADR-006: Strategy Pattern for Orchestration

**Date:** v0.6 (orchestrator rewrite)

**Context:** The original orchestrator was a single 963-line file handling both simple and complex tasks. Adding new execution strategies required modifying the monolith.

**Decision:** Rewrite as a modular orchestrator with pluggable strategies. `engine.ts` routes by complexity tier. `strategies/shared.ts` provides reusable building blocks. `single-agent.ts` and `agent-team.ts` implement the actual execution.

**Consequences:**
- Adding a new strategy is a new file + router case
- Shared building blocks (30+ functions) eliminate duplication
- The event system enables UI progress tracking without coupling
- Legacy orchestrator kept for reference (`orchestrator.legacy.ts`)

---

## ADR-007: Spaces for Multi-Workspace Isolation

**Date:** v0.7

**Context:** Users wanted to separate work contexts (personal vs. professional, client A vs. client B) without running multiple instances.

**Decision:** Introduce `Space` entities with optional `spaceId` on all major entity types. The default space is virtual (matches undefined spaceId). URL routing encodes space as base64url path segment.

**Consequences:**
- Complete data isolation between workspaces
- Per-space settings overrides
- Active space is per-device (localStorage), not synced — each device can view a different space
- Every store query must space-filter (enforced in hook layer)
- Built-in agents are global; only custom agents are space-scoped

[More about Spaces](./more/SPACES.md)

---

## ADR-008: Feature Module Organization

**Date:** v0.4

**Context:** As the codebase grew, cross-cutting imports between page components, stores, and services made dependency graphs hard to reason about.

**Decision:** Organize independent capabilities as feature modules under `src/features/`. Each feature owns its components, hooks, stores, and types. Features may import from shared `src/lib/`, `src/stores/`, and `src/types/` but never from other features.

**Consequences:**
- 12 feature modules with clear boundaries
- Code splitting naturally follows feature boundaries
- New features don't require modifying existing code
- Shared concerns (Yjs, LLM, routing) remain in `src/lib/`

---

## ADR-009: Unified Thread Abstraction (V2)

**Date:** v0.7

**Context:** The V1 UI had separate pages for conversations, tasks, sessions, and artifacts. Navigation was fragmented. Users wanted a unified inbox-like experience.

**Decision:** Create a `Thread` type that abstracts over all entity types. The V2 shell renders everything through the thread interface, with `kind` discriminating the source type.

**Consequences:**
- Single list with filtering, search, and keyboard navigation
- Multi-select, tagging, starring work uniformly across entity types
- Source-specific details accessed via `thread.source`
- Thread construction requires mapping logic for each entity type
- The abstraction occasionally leaks — some features only make sense for conversations

---

## ADR-010: Tool Plugin Self-Registration

**Date:** v0.6

**Context:** Tools were hard-coded in the chat service. Adding a new tool meant modifying three files.

**Decision:** Tool plugins are self-contained objects with metadata, JSON Schema, and handler. They register themselves into a central registry. Registration is lazy — tools are loaded at first chat invocation.

**Consequences:**
- Adding a tool is one file + one export
- Metadata enables UI discovery (icons, descriptions, categories)
- Lazy loading keeps initial bundle small
- Connector-specific tools are dynamically available based on active connectors

---

## ADR-011: Polyglot Sandboxed Code Execution

**Date:** v0.4 (QuickJS), v0.8 (expanded to polyglot with Pyodide)

**Context:** Agents need to execute code (calculations, data transforms, analysis). Running arbitrary code in the main thread is a security risk. JavaScript-only execution was too limiting — data analysis and scientific computing tasks benefit from Python's ecosystem.

**Decision:** Build a polyglot sandbox (`src/lib/sandbox/`) with a unified `SandboxRequest`/`SandboxResult` contract. Each language is backed by a WASM-isolated runtime: **QuickJS** (`quickjs-emscripten`) for JavaScript, **Pyodide** for Python. Runtimes are lazily initialized and share a common `ISandboxRuntime` interface. A Web Worker hosts the Pyodide runtime to keep the main thread responsive.

**Consequences:**
- Complete WASM-level isolation from the host environment for both languages
- Python support unlocks `numpy`, `pandas`, and the broader scientific ecosystem via micropip
- Unified API — callers specify `language: 'python' | 'javascript'` and get the same result shape
- Runtimes are lazy-loaded — no cost until first use, with optional pre-warming
- Pyodide's initial load is heavier (~15 MB WASM) compared to QuickJS (~300 KB)
- Timeout enforcement and progress reporting are consistent across runtimes
- Virtual filesystem support allows mounting input files and collecting output files
- Extensible design — adding a new language requires implementing `ISandboxRuntime`
- Python support eventually will be useful for future skills that require python execution (data analysis, visualization, advanced algorithms) and for power users who want to write custom code in their agents

---

## ADR-012: Web Crypto API for Credential Storage

**Date:** v0.2

**Context:** Users store API keys for LLM providers. Keys must be encrypted at rest to prevent extraction from IndexedDB.

**Decision:** Use the Web Crypto API (AES-GCM) to encrypt credentials before storing. The encryption key is derived from a device-local secret. Optional IV field supports cross-device sync scenarios.

**Consequences:**
- Keys are encrypted in IndexedDB — browsing the database doesn't reveal them
- Encryption is transparent to application code (SecureStorage abstraction)
- Cross-device sync requires the user to re-enter keys (local device key is not portable) unless IV-based mode is used
- Non-extractable CryptoKey objects can't be stored in Yjs — they remain in IndexedDB

---

## ADR-013: Extension Sandboxing via Iframes

**Date:** v0.7

**Context:** The marketplace allows community-built extensions. Untrusted code must not access user data, DOM, or credentials.

**Decision:** Extensions run in sandboxed iframes. Communication happens through `postMessage` with a typed bridge API (`window.DEVS`). Extensions can request LLM calls, show toasts, and read theme/language context — nothing else.

**Consequences:**
- Complete isolation from the host application
- Extensions can't access Yjs, IndexedDB, or credentials directly
- The bridge API is the security boundary — every capability must be explicitly exposed
- Performance overhead of cross-frame messaging (negligible for UI, noticeable for high-frequency data)
- Extensions must be self-contained (bundle their own dependencies)

---

## ADR-014: Tailwind CSS v4 with oklch Colors

**Date:** v0.7

**Context:** Migrating from Tailwind v3. v4 introduces native CSS variables, better performance, and cleaner configuration.

**Decision:** Adopt Tailwind v4 with oklch color space for theme tokens. Primary color scale (50-900) generated at runtime from a user-chosen base color.

**Consequences:**
- Perceptually uniform color transitions across the scale
- Dynamic theming without rebuilding CSS
- No hard-coded colors in components — all through Tailwind tokens
- HeroUI v2 compatibility required some adapter work
- HeroUI v3 (beta) is designed for Tailwind v4 — cleaner integration coming

---

## ADR-015: HeroUI as Component Library

**Date:** v0.1

**Context:** Building accessible, polished UI components from scratch is expensive and error-prone.

**Decision:** Use HeroUI (built on React Aria) as the primary component library. Currently on v2, with v3 installed for gradual migration.

**Consequences:**
- Accessibility (ARIA, keyboard, screen reader) comes built-in
- Consistent design language across the application
- v2 → v3 migration is in progress (compound component pattern, Tailwind v4 native)
- Some components needed customization beyond HeroUI's API
- Two versions coexist temporarily (do not mix on the same page)

---

## ADR-016: Multi-Page Application via Vite

**Date:** v0.3

**Context:** DEVS needs per-language page variants for SEO and shareable URLs, but also rich client-side interactivity.

**Decision:** Use Vite's MPA mode with `vite-plugin-virtual-mpa` to generate per-language HTML entries from page components. Each page is a full React app with client-side routing within it.

**Consequences:**
- Clean URLs with language prefixes (`/fr/about`, `/en/settings`)
- Per-page metadata for SEO (title, description, Open Graph)
- Code splitting by page and feature
- Build generates multiple HTML files but the runtime is still SPA-like
- Optional prerendering for fully static pages

---

**Related:** [ARCHITECTURE.md](./ARCHITECTURE.md), [CONVENTIONS.md](./CONVENTIONS.md), [VISION.md](./VISION.md)
