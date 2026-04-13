# DEVS - Glossary

> Terms used across the codebase and documentation.

---

### Agent

An AI persona with a name, role, instructions (system prompt), tools, and optional knowledge base. Agents are assigned to tasks by the orchestrator or selected by the user. Built-in agents ship as JSON; custom agents are stored in Yjs.

### Approval Gate

A checkpoint in an orchestration workflow where execution pauses for human review before continuing. Used for high-stakes tasks or when confidence is low.

### Artifact

A structured output produced by an agent during task execution. Types include code, analysis, design, plan, report, and document. Artifacts are linked to the task and agent that created them, and can serve as evidence for requirement validation.

### BYOK (Bring Your Own Key)

The platform's model for LLM access: users provide their own API keys for cloud providers. Keys are encrypted at rest via Web Crypto API and never leave the browser.

### Connector

An integration with an external service (Google Drive, Gmail, Notion, Slack, etc.) that imports content into the knowledge base. Uses OAuth 2.0 PKCE for authentication, with delta sync for incremental updates.

### Context Broker

A publish/subscribe system for sharing information between agents during orchestration. Agents publish findings, decisions, constraints, and resources; other agents subscribe by keyword or type.

### CRDT (Conflict-free Replicated Data Type)

A data structure that can be replicated across multiple devices and merged automatically without conflicts. Yjs implements CRDTs for DEVS's data layer.

### Decomposition

The process of breaking a complex prompt into multiple subtasks with explicit dependencies. Performed by the Task Decomposer component using LLM analysis.

### Extension

A third-party addition to DEVS installed via the marketplace. Types: apps (workflows), agents (personas), connectors (integrations), tools (capabilities). Extensions run in sandboxed iframes.

### Extension Bridge

The message-based API (`window.DEVS`) exposed to extensions running in sandboxed iframes. Provides access to LLM, UI notifications, translations, and theme context.

### Feature Module

A self-contained directory under `src/features/` that encapsulates components, hooks, stores, and logic for a specific capability (e.g., connectors, marketplace, traces).

### Knowledge Base

A collection of files and documents stored locally in IndexedDB. Supports upload, folder watching, and connector imports. Content is deduplicated via SHA-256 hashing.

### Knowledge Item

A single entry in the knowledge base — either a file or a folder. Carries metadata (path, type, tags), optional extracted text content, and sync provenance.

### Langfuse

An open-source LLM observability platform. DEVS integrates with Langfuse (opt-in) to capture traces, token usage, latency, and cost for all LLM calls.

### LLM Provider

A backend that serves language model inference. DEVS abstracts 12+ providers behind `LLMProviderInterface`: cloud APIs (OpenAI, Anthropic, Google), self-hosted servers (Ollama), and local in-browser models (WebGPU).

### LLM Service

The static registry (`LLMService`) that routes `chat()` and `streamChat()` calls to the appropriate provider. Handles tool calling, streaming, multimodal attachments, and progress tracking.

### Memory (Agent Memory)

Information an agent has learned from conversations. Categorized as facts, preferences, behaviors, domain knowledge, relationships, procedures, or corrections. Memories go through human review before being approved for context injection.

### Memory Learning Service

The service that extracts potential memories from conversations using LLM analysis, creates pending memory entries, and manages the human review workflow.

### Methodology

A structured problem-solving framework (8D, A3, PDCA, DMAIC, Scrum, Agile, AOSTC, YOLO) that guides how the orchestrator decomposes and sequences tasks.

### Orchestrator (Workflow Orchestrator)

The engine that coordinates multi-agent task execution. Analyzes complexity, selects a strategy (single-agent or multi-agent), manages decomposition, schedules execution, and synthesizes results.

### P2P Sync

Peer-to-peer data synchronization between devices using Yjs over WebRTC or WebSocket. Password-protected rooms. No central server sees user data.

### PKCE (Proof Key for Code Exchange)

An OAuth 2.0 extension designed for public clients (browsers). Used by all DEVS connectors for secure authentication without storing client secrets.

### Preferences

User settings stored in the Yjs `preferences` map: theme, language, default models, global system instructions, and per-space overrides.

### Skill

An installable capability bundle for agents. Combines tool definitions, system prompt additions, and configuration. Skills extend what an agent can do without modifying its core instructions.

### Space

A workspace that isolates data. Every space-scoped entity carries an optional `spaceId`. The default space is virtual (matches undefined spaceId). Spaces enable multi-tenant use on a single device.

### Strategy (Execution Strategy)

The orchestrator's plan for executing a task. **Single-agent** (Tier 0) for simple tasks; **Agent-team** (Tier 1+) for complex tasks requiring decomposition and multiple agents.

### Studio

The agent creation and editing interface. Includes role configuration, instruction writing, tool assignment, knowledge attachment, and AI portrait generation.

### Studio Entry

A saved agent configuration in the studio, distinct from the deployed agent. Supports drafts and versioning.

### Subtask

A child task created during decomposition. Carries a description, assigned agent, dependencies (other subtask IDs), and its own artifacts and status.

### Synthesis

The process of merging outputs from multiple subtasks into a coherent final result. Performed by the Synthesis Engine using LLM summarization.

### Thread

The V2 shell's unified abstraction over conversations, tasks, sessions, and media. Provides a consistent interface for listing, filtering, searching, and displaying any entity type.

### Tier (Complexity Tier)

The complexity level assigned to a prompt by the Task Analyzer. **Tier 0** (simple, single-agent) or **Tier 1+** (complex, multi-agent with decomposition).

### Tool

A capability that agents can invoke during conversations. Defined as a plugin with metadata, a JSON Schema, and a handler function. Categories: knowledge, math, code, research, connector-specific.

[More about Tools](./more/TOOLS.md)

### Tool Plugin

The structured format for defining a tool: metadata (name, icon, category), OpenAI function-calling schema, and an async handler with execution context.

### Trace

A record of an LLM interaction captured for observability. Includes request/response data, token usage, latency, cost, provider, and model.

[More about Traces](./more/TRACES.md)

### V2 Shell

The primary application interface (V2 redesign). A thread-based workspace with sidebar navigation, multi-select, tag filtering, keyboard shortcuts, and contextual panels.

### Workflow

A record of an orchestration run. Tracks strategy, status, checkpoints, and the set of tasks and agents involved.

### Yjs

The CRDT framework that serves as DEVS's data layer. Provides conflict-free replication, local persistence (y-indexeddb), and P2P sync (y-websocket, y-webrtc).

---

**Related:** [ARCHITECTURE.md](./ARCHITECTURE.md), [CONVENTIONS.md](./CONVENTIONS.md)
