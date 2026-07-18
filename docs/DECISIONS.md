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

## ADR-017: Browser-Only Strangler Re-Platform

**Date:** Re-platform kickoff (Phase 0)

**Context:** DEVS grew to ~283 K LoC and passes four of six success criteria (portable, universal, democratic, web-only) but fails **thin** and **KISS**. The failures are *accretion*, not *foundation*: a hand-rolled ~10 K-line LLM layer, ~30 K-line connector layer, and ~7 K-line orchestrator now duplicate capabilities the ecosystem standardises (AI SDK, MCP). The moat — the intersection of zero-install, local-first CRDT, model-agnostic BYOK, and privacy-by-architecture, deliverable as a URL — lives in the Yjs data layer, Web Crypto, i18n/RTL, and the `ee/` split, not in the plumbing. A blank-page rewrite would destroy the moat and re-accrete the same bloat. Full analysis: [revamp/REPORT.md](./revamp/REPORT.md).

**Decision:** Do an **aggressive strangler re-platform**, not a rewrite. Keep the moat; delete or outsource the hand-rolled plumbing. Three hard invariants:

1. **Browser-only stands.** Agent execution never leaves the browser tab. No Node/cloud sandbox (`@ai-sdk/sandbox-vercel`, `@vercel/sandbox`), no server-side runner, no WebContainers — ever. The enterprise control plane only supplies identity, policy, connectors (MCP gateway), sync, audit, and managed inference endpoints the browser calls.
2. **The core is the centre of gravity.** The target is the smallest browser-native local-first PWA (Yjs + Web Crypto + a minimal LLM facade + a minimal tool facade + a simple agent loop + a small inert policy reader). AI SDK, MCP, the DEVS Harness, and enterprise are **optional layers behind facades**, never the architectural centre.
3. **The DEVS Harness defaults to a thin, DEVS-owned browser implementation (Option B).** Conforming to the AI SDK `HarnessV1` abstraction (Option A) is adopted only if the Phase 0.5 spike proves it materially simpler and clears explicit kill criteria (no `fs`/`ws` leakage, no Node-polyfill pile, no stubbing the ~40% server-durability contract). Either way, browser-only holds.

Methodology: **"Always-Green Strangler"** — trunk-based, `main` releasable at every commit; every swap ships behind a facade + feature flag; old and new coexist; old code is deleted only after parity is proven by golden/characterization tests. Enterprise is a **seam designed-in from Phase 0, implemented last, always optional**.

**Consequences:**
- The two failing criteria (thin, KISS) are fixed by *removing* code; line count going down is a tracked success metric.
- Framework bets (AI SDK, harness, MCP) are gated by Phase 0.5 spikes and reversible behind facades; the fallback for the LLM layer is a minimal fetch-based browser adapter.
- Client-side policy is configuration/UX, **not** a security boundary; hard enterprise controls are enforced server-side at the gateway/connector edge.
- A long-lived `v2` branch is forbidden; every strangle ends with a delete-PR.
- The Yjs data layer, Web Crypto, i18n, and `ee/` foundations are not touched without a specific, tested reason.

---

## ADR-018: Dependency-Justification Rule

**Date:** Re-platform kickoff (Phase 0)

**Context:** The re-platform outsources plumbing to the ecosystem (AI SDK, MCP, the harness, enterprise layers). The risk is that a new stack simply becomes the *next* centre of gravity and re-accretes bloat — trading one dependency mess for another. The origin failure was accretion; new dependencies must not repeat it.

**Decision:** A dependency (or optional layer) is allowed **only if it deletes substantially more code than it adds and does not become a new architectural centre of gravity.** Every framework is an optional layer behind a facade, spike-gated, and subject to the core→optional import boundary. This rule is the explicit gate in the Phase 0.5 go/no-go ADRs for AI SDK (Spike A) and the DEVS Harness (Spike B).

**Consequences:**
- Adoption ADRs must show the net LoC delta (added vs deleted) and confirm the dependency stays behind one facade.
- The core/optional import boundary is enforced by lint (`eslint-rules/core-boundary.js`) and the `scripts/check-boundaries.mjs` burn-down gate; core must never import an optional/enterprise module.
- Experimental dependencies (e.g. `@ai-sdk/harness`) are wrapped so a breaking release touches one module; their Node/cloud sandbox providers are never adopted.
- A dependency that adds more than it deletes, or that leaks into the core centre, is rejected regardless of feature appeal.

---

## ADR-019: Spike A Outcome — Back the LLM Facade with the AI SDK (GREEN)

**Date:** Phase 0.5 (spike)

**Context:** Phase 3 replaces the hand-rolled ~9.5 K-line LLM provider layer with
the AI SDK behind the `LLMService` facade — but only if the SDK works *client-side*
(BYOK, CORS, streaming, tool-calls, multimodal) at an acceptable bundle cost. Spike
A probed `ai@7.0.31` + `@ai-sdk/openai|anthropic|google|openai-compatible` with real
Vite browser builds and provider source inspection. Full evidence:
[revamp/spikes/FINDINGS.md](./revamp/spikes/FINDINGS.md).

**Decision:** **GREEN — back the provider facade with the AI SDK in Phase 3.** The
packages bundle cleanly for the browser (no Node built-in leakage), are
lazy-loadable per provider (~50–90 KB gzip each incl. shared `provider-utils`),
and expose `apiKey` / custom `headers` / `baseURL` / custom `fetch` on every
provider — covering BYOK, Anthropic's `anthropic-dangerous-direct-browser-access`
header, OpenAI-compatible/local endpoints, and a CORS/proxy escape hatch. No hard
browser guard; streaming, tool-calls, and multimodal file parts are first-class.
Roll provider-by-provider behind `engine.llm='ai-sdk'`; keep a minimal
`fetch`-based adapter (`engine.llm='fetch'`) behind the *same* facade as the
fallback. Per the `ai-sdk` skill, verify every API against `node_modules/ai/docs/`
(current APIs: `ToolLoopAgent`, `tool({ inputSchema })`, `stopWhen: isStepCount(n)`,
`toUIMessageStream`) — not memory.

**Consequences:**
- Phase 3 deletes ~9 K lines of bespoke providers and adds a thin facade + lazy
  adapters — clears the dependency-justification rule (ADR-018).
- Live-key smoke per provider is still required before each `engine.llm='ai-sdk'`
  flip (the spike used no BYOK keys; viability was shown by source, bundle, docs,
  and DEVS's existing browser usage).
- The `fetch` fallback keeps the bet reversible behind one facade.

---

## ADR-020: Spike B Outcome — DEVS Harness is Option B (thin, DEVS-owned)

**Date:** Phase 0.5 (spike)

**Context:** ADR-017 defaults the DEVS Harness to a thin DEVS-owned implementation
(Option B) and adopts the AI SDK `HarnessV1` abstraction (Option A) only if a spike
proves it materially simpler and clears explicit kill criteria. Spike B probed
`@ai-sdk/harness@1.0.36`, `just-bash@3.1.0`, and `@ai-sdk/sandbox-just-bash` with
real browser builds and functional round-trips. Full evidence:
[revamp/spikes/FINDINGS.md](./revamp/spikes/FINDINGS.md).

**Decision:** **Option B — a thin, DEVS-owned harness.** The three functional
probes passed (HarnessAgent bundles in-browser with only two trivial `fs`/`path`
stubs and no `ws`/`fs`/`net` leakage, ~+22.7 KB gzip marginal; `just-bash` runs a
full bash+virtual-FS round-trip on the already-present `quickjs-emscripten`; a
`ToolLoopAgent` streams one prompt turn into a `readUIMessageStream` consumer). But
Option A **fails a kill criterion**: `HarnessV1Session` declares **seven required
methods**, including the durability primitives `doContinueTurn` / `doSuspendTurn` /
`doDetach` / `doStop` (docs: *"Required on every adapter"*) that exist for process
boundaries, bridge sockets, and cross-slice runtime resumption — problems a
browser tab does not have. Conforming means implementing/stubbing ~40% of the
contract for non-problems, and the packages are experimental.

**Consequences:**
- Build a thin `DevsHarness` facade in Phase 5A that **reuses** `ai`'s
  `ToolLoopAgent` (agent loop), `toUIMessageStream`/`readUIMessageStream` (UI),
  and `just-bash` on `quickjs-emscripten` (sandbox) — code that deletes more than
  it adds (ADR-018).
- **Do not** take a dependency on `@ai-sdk/harness` or its `HarnessV1` contract;
  **borrow its vocabulary** (built-in tool names, `allow-reads/allow-edits/allow-all`
  permission modes, `{name,description,content,files}` skill shape) as *types*.
- Browser-only holds; no bridge (`ws`), no Node/cloud sandbox provider.
- Re-evaluate only if `@ai-sdk/harness` later makes the durability methods
  optional and stabilises — cheap to revisit because the harness sits behind one
  DEVS facade.

---

## ADR-021: Phase 3 Start — AI SDK Behind `LLMService`, OpenAI First Slice

**Date:** Phase 3

**Context:** ADR-019 (GREEN) cleared Phase 3 to back the `LLMService` facade with
the AI SDK, rolled provider-by-provider behind `engine.llm='ai-sdk'`, with a
`fetch` fallback behind the same facade. This ADR records the *pattern* chosen for
the strangle and the first provider slice (OpenAI).

**Decision:** A **strangler adapter**, not a rewrite of the facade.
`AiSdkProvider` (`src/lib/llm/ai-sdk/adapter.ts`) implements the existing
`LLMProviderInterface`, replacing only `chat`/`streamChat` with `ai`'s
`generateText`/`streamText` (+ `tool`/`jsonSchema` for canonical→AI-SDK tool
mapping), and **delegates** `validateApiKey`/`getAvailableModels` to the tested
legacy provider. A per-provider `AiSdkBinding` builds the model, lazily importing
its `@ai-sdk/*` package. Selection is a one-line seam in registration —
`maybeWrapWithAiSdk(provider, legacy)` — that returns the legacy provider unless
`engine.llm==='ai-sdk'` *and* the provider has a binding. Default flag `legacy`,
so the change is **inert** until per-provider parity is proven.

Key specifics (verified against `node_modules/ai/docs/`, not memory, per the
`ai-sdk` skill):
- OpenAI uses **`provider.chat(modelId)`** (Chat Completions), not the default
  `openai(modelId)` Responses API — parity with the legacy layer and broad
  OpenAI-compatible/local `baseURL` support.
- Canonical OpenAI-format tool schemas map via `tool({ inputSchema: jsonSchema(…) })`
  with **no `execute`** — the model only *returns* calls; DEVS runs them, keeping
  the agent loop intact. The legacy streaming `__TOOL_CALLS__` marker protocol is
  preserved.
- `ai`/`@ai-sdk/openai` are **dynamically imported** in the adapter methods and
  binding, so flipping the flag adds nothing to the boot graph (Phase 1 invariant;
  verified: distinctive `ai` internals absent from boot, +1.3 KB shell delta).

**Parity gate:** `src/test/lib/llm/ai-sdk/openai-parity.test.ts` drives the legacy
provider and the AI SDK adapter against **byte-identical mocked HTTP responses**
and asserts identical canonical output *and* a match against recorded golden
fixtures (`src/test/fixtures/golden/llm/openai-*`), for basic chat, tool-call
chat, and streamed text. This is what licenses deleting the hand-rolled OpenAI
provider — after the remaining live-key smoke (ADR-019) and a soak.

**Consequences:**
- The pattern generalises: each further provider (Anthropic, Google, Mistral,
  OpenRouter, Ollama, LM Studio, HuggingFace, OpenAI-compatible) is one slice —
  add a binding, record fixtures, flip the flag, soak, delete.
- **Bespoke providers** (no `@ai-sdk/*` package) are ported by implementing the
  AI SDK `LanguageModelV4` spec directly. First example: **ChatJimmy**
  (`src/lib/llm/ai-sdk/chatjimmy.ts`) — an unauthenticated, non-OpenAI endpoint
  with raw-text streaming and a `<|stats|>` trailer — now flows through the same
  `AiSdkProvider` adapter, parity-gated by `chatjimmy-parity.test.ts`.
- **Adapter detail:** `ai@7` rejects `role:'system'` in `messages`; the adapter
  sets `allowSystemInMessages: true` (DEVS system messages are agent-controlled
  instructions), preserving legacy wire behaviour and the ChatJimmy
  system→`systemPrompt` mapping.
- Special providers (Claude Code / Vertex / Copilot) are decided per-provider
  later (keep as thin browser-callable adapters or drop).
- The `fetch` engine value remains reserved for the minimal-adapter fallback; the
  current legacy providers already *are* fetch-based, so `legacy` covers it today.

---

## ADR-022: Phase 3 Delete — Hand-Rolled LLM Providers Removed, AI SDK Is the Backend

**Date:** Phase 3

**Context:** ADR-021 introduced the AI SDK behind the `LLMService` facade for one
provider behind a flag. The re-platform's premise (approved) is that the AI SDK
*replaces* the bloated hand-rolled provider layer — keeping it as a flagged
“legacy” fallback defeats the purpose. This ADR records the actual deletion.

**Decision:** **Delete the hand-rolled provider classes; the AI SDK is the
unconditional backend for standard providers.** Eleven files (~3,900 lines) were
removed — `openai, anthropic, google, mistral, openrouter, ollama, lm-studio,
openai-compatible, custom, huggingface, chatjimmy` — and replaced by a single
generic `AiSdkProvider` (`ai-sdk/adapter.ts`) plus few-line `AiSdkBinding`s
(`ai-sdk/bindings.ts`, ~750 lines total incl. the ChatJimmy custom model). The
`engine.llm` flag no longer selects a backend (vestigial; `'fetch'` reserved).

Provider-specific behaviour is preserved in the thin bindings (verified against
`@ai-sdk/*/docs`): Anthropic extended thinking (`budgetTokens`/adaptive +
`display:'summarized'`) + effort + browser BYOK header; Google `thinkingConfig`
+ search grounding; reasoning → canonical `thinking`; live model listing / key
validation as thin GETs (Ollama `/api/tags`, OpenAI-style `/models`).

**Special providers kept** (not standard-API bloat — the AI SDK cannot host them
in-browser): **local** (WebGPU/transformers.js in-tab — the moat), **claude-code**
(local CLI bridge), **vertex-ai** (browser OAuth; the SDK's vertex provider needs
Node `google-auth-library`), **github-copilot** (device-flow token exchange +
model catalog; its OpenAI-compatible *chat* now rides the AI SDK binding,
decoupled from the deleted `OpenAIProvider`).

**Consequences:**
- First-party LLM code drops ~3,150 lines net; 11 providers' wire protocols are
  now the SDK's responsibility — clears the dependency-justification rule
  (ADR-018) decisively (net-negative).
- Regression is guarded by golden fixtures recorded from the deleted providers
  (`openai-*`, `chatjimmy-*`); the AI SDK path reproduces them. Boot went **down**
  (providers were eagerly registered); `ai`/`@ai-sdk/*` internals stay off-boot.
- **Remaining gate:** per-provider **live-key smoke** (ADR-019) — the tests use
  mocked responses; real round-trips (Anthropic thinking, Google grounding,
  Ollama/LM-Studio, HF router) confirm wire correctness before broad release.
- **No** Node/cloud provider adapters were added; browser-only holds.

---

**Related:** [ARCHITECTURE.md](./ARCHITECTURE.md), [CONVENTIONS.md](./CONVENTIONS.md), [VISION.md](./VISION.md), [revamp/REPORT.md](./revamp/REPORT.md)
