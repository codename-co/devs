# Competitive Analysis: AI Agent Orchestration Platforms

> **Date**: February 2026
> **Purpose**: Deep research into competitor platforms to identify patterns, mechanics, and key differences — and chart a path forward for DEVS to reach feature parity while preserving its differentiators.

---

## Table of Contents

- [1. Platform-by-Platform Breakdown](#1-platform-by-platform-breakdown)
  - [Perplexity Computer](#perplexity-computer)
  - [Perplexity Research Mode](#perplexity-research-mode)
  - [Manus Skills](#manus-skills)
  - [Manus Wide Research](#manus-wide-research)
  - [Claude Code Subagents](#claude-code-subagents)
  - [HappyCapy](#happycapy)
- [2. Cross-Cutting Patterns](#2-cross-cutting-patterns)
- [3. DEVS Gap Analysis](#3-devs-gap-analysis)
- [4. Path Forward](#4-path-forward)
- [5. Guarding Our Differentiators](#5-guarding-our-differentiators)

---

## 1. Platform-by-Platform Breakdown

### Perplexity Computer

An **independent digital worker** that completes tasks and workflows asynchronously.

| Aspect | Detail |
|---|---|
| **Core model** | Async task execution — fire-and-forget tasks that run in the background |
| **Sub-agents** | Domain-specific workers: market research, financial analysis, news monitoring, coordination agents |
| **Composition** | Capabilities chain naturally: research → analysis → doc creation → email → scheduled follow-up |
| **Integrations** | Premium: Gmail, Outlook, GitHub, Linear, Slack, Notion, Snowflake, Databricks, Salesforce |
| **Sandbox** | Personal cloud sandbox with persistent memory across tasks |
| **Scheduling** | Supports recurring/scheduled tasks (monitoring, digests) |
| **Pricing** | Credit-based (10K/month for Max tier) |

**Key insight**: The standout mechanic is *composition* — capabilities chain together without the user wiring them. One prompt can trigger a research → analysis → document → email → scheduled-follow-up pipeline. The system treats each step as a sub-agent with its own domain expertise.

---

### Perplexity Research Mode

A **deep research engine** that performs iterative search-and-reason cycles.

| Aspect | Detail |
|---|---|
| **Core model** | Iterative loop: search → read → reason → decide what to search next |
| **Scale** | Performs dozens of searches, reads hundreds of sources per query |
| **Speed** | Completes in under 3–5 minutes |
| **Model orchestration** | Auto-selects optimal model per reasoning stage |
| **Output** | Structured reports; exports to PDF, doc, Perplexity Pages |
| **Domains** | Finance, marketing, technology, current affairs, health, biography, travel |

**Key insight**: The power is in the *iterative reasoning loop*. Rather than a single LLM call, Research Mode makes dozens of sequential decisions about what to search next based on what it's already found. This is fundamentally different from DEVS's current single-shot `executeTaskWithAgent` pattern.

---

### Manus Skills

A **modular capability system** built on file-system-based resources.

| Aspect | Detail |
|---|---|
| **Core model** | Skills as reusable, composable, installable capability modules |
| **Installation** | "Build with Manus" (save from interaction), upload (.zip/.skill), official library, import from GitHub |
| **Progressive Disclosure** | 3 levels: L1 metadata (~100 tokens at startup), L2 instructions (<5K tokens on trigger), L3 resources (on demand) |
| **Activation** | Slash commands in chat |
| **Core advantages** | Specialization, reusability, composability |
| **Community** | Skill sharing ecosystem |

**Key insight**: The **progressive disclosure** model is brilliant for context management. Loading a full skill definition (~5K+ tokens) for every installed skill would bloat the system prompt. Instead, only ~100-token summaries are loaded at startup; the LLM decides when to "activate" a skill and only then loads the full instructions. DEVS already implements a similar pattern via `buildSkillCatalogXml()` and the `activate_skill` tool — this validates our approach.

---

### Manus Wide Research

A **parallel multi-agent architecture** designed to solve the context window degradation problem.

| Aspect | Detail |
|---|---|
| **Problem statement** | Quality drops precipitously after 8–10 items in sequential processing |
| **Solution** | Spawn N independent agents, each with a completely fresh context window |
| **Pipeline** | Task decomposition → Parallel agent deployment → Independent processing → Result synthesis |
| **Scale** | Handles 250+ items with uniform quality |
| **Use cases** | Market research, academic research, competitive intelligence, lead generation, batch processing |

**Key insight**: This is the single most important architectural pattern missing from DEVS. The core innovation is simple: **quality degrades with context accumulation, so give each sub-agent a fresh context**. DEVS's current `coordinateTeamExecution` runs agents from a shared pool without context isolation — quality will degrade as the conversation history grows.

---

### Claude Code Subagents

The most **mature and well-documented** sub-agent system available today.

| Aspect | Detail |
|---|---|
| **Built-in subagents** | Explore (read-only, Haiku model), Plan, General-purpose |
| **Custom subagents** | Defined as Markdown files with YAML frontmatter |
| **Tool scoping** | Per-subagent allowlist/denylist |
| **Model selection** | sonnet/opus/haiku/inherit — cost control per subagent |
| **Permission modes** | default, acceptEdits, dontAsk, bypassPermissions, plan |
| **Lifecycle hooks** | PreToolUse, PostToolUse, Stop, SubagentStart, SubagentStop |
| **Memory** | Persistent MEMORY.md files at user/project/local scope |
| **Execution** | Foreground and background modes; git worktree isolation |
| **Constraint** | Subagents cannot spawn other subagents (flat, one-level hierarchy) |
| **Parallelism** | Agent teams for sustained parallel execution |

**Key insight**: Claude Code's strength is in **scoping and control**. Every subagent gets a tightly defined sandbox: which tools it can use, which model it runs on, how many turns it gets, what permissions it has. This is the most production-grade approach to agent orchestration — DEVS has none of this scoping today.

---

### HappyCapy

An **agent-native computer** — a GUI wrapper around Claude Code with a consumer UX.

| Aspect | Detail |
|---|---|
| **Core model** | "Agent-native computer" — skills are "the new software" |
| **Sandbox** | Private, isolated, secure execution environment |
| **UX metaphor** | Agents deliver work to an inbox (email-like) |
| **Visualization** | CLI→GUI: "see what AI sees, click where AI clicks" |
| **Positioning** | "OpenClaw alternative. No setup. No security risks." |
| **Runtime** | Browser-based, no installation |

**Key insight**: HappyCapy validates the browser-native approach DEVS already takes. The "inbox" metaphor for async task delivery is compelling UX — agents complete work in the background and deliver results to a central inbox rather than requiring the user to watch execution in real-time.

---

## 2. Cross-Cutting Patterns

Six patterns emerge across all platforms:

### Pattern 1: Fresh Context Per Agent

**Who**: Manus Wide Research (core), Claude Code Subagents, Perplexity Computer

Each sub-agent gets a clean context window containing only what it needs. This prevents the quality degradation that occurs when a single context accumulates information from sequential tasks.

### Pattern 2: Iterative Autonomous Execution

**Who**: Perplexity Research Mode (core), Perplexity Computer, Claude Code Subagents

Agents don't just respond once — they loop: reason → act (tool call) → observe → decide whether to continue. This transforms agents from "one-shot responders" into "autonomous workers."

### Pattern 3: Modular Skills / Capabilities

**Who**: Manus Skills (core), Claude Code (custom agents), HappyCapy ("skills as software")

Capabilities are packaged as reusable, shareable, composable modules. Users install skills, agents discover and activate them on demand.

### Pattern 4: Scoped Agent Permissions

**Who**: Claude Code Subagents (core)

Each agent has explicit boundaries: which tools it can use, which model it runs on, how long it can run, what it's allowed to modify. Without scoping, agents are either too powerful (risky) or too restricted (useless).

### Pattern 5: Async / Background Execution

**Who**: Perplexity Computer (core), Claude Code, HappyCapy

Tasks run unattended. Users fire off work and come back later. Results appear in an "inbox" or dashboard. This decouples task submission from task monitoring.

### Pattern 6: Dedicated Result Synthesis

**Who**: Manus Wide Research (core), Perplexity Research Mode, Perplexity Computer

After parallel agents complete their work, a dedicated synthesis step merges, ranks, filters, and formats results into a unified deliverable. Without this, users get N raw outputs instead of one coherent answer.

### Cross-Reference Matrix

| Pattern | Perplexity Computer | Perplexity Research | Manus Skills | Manus Wide Research | Claude Code | HappyCapy | **DEVS** |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| Fresh context per agent | ✅ | — | — | ✅✅ | ✅ | ✅ | ❌ |
| Iterative execution | ✅ | ✅✅ | — | — | ✅ | — | ❌ |
| Modular skills | ✅ | — | ✅✅ | — | ✅ | ✅ | ⚠️ partial |
| Scoped permissions | — | — | — | — | ✅✅ | — | ❌ |
| Async / background | ✅✅ | — | — | — | ✅ | ✅ | ❌ |
| Result synthesis | ✅ | ✅✅ | — | ✅✅ | — | — | ❌ |

✅✅ = core feature, ✅ = supported, ⚠️ = partial, ❌ = missing, — = not applicable

---

## 3. DEVS Gap Analysis

### What DEVS Already Has (Strengths)

| Strength | Detail |
|---|---|
| **Open source, free, portable** | MIT licensed, browser-native, offline-first — no competitor matches all three |
| **Provider independence** | Supports OpenAI, Anthropic, Gemini, Mistral, Ollama, custom endpoints |
| **Skill system** | Progressive disclosure via `buildSkillCatalogXml()` + `activate_skill` tool — similar to Manus L1/L2/L3 |
| **Tool plugin registry** | Extensible `ToolPluginRegistry` with categories, lifecycle hooks, enable/disable |
| **Agent memories** | Full memory system with human review, categories, confidence levels, synthesis |
| **Knowledge base** | File upload, folder watching, deduplication, file system sync |
| **WASM sandbox** | Pyodide (Python) + QuickJS (JavaScript) in-browser sandboxed execution |
| **P2P sync** | Yjs/CRDT-based cross-device synchronization |
| **Traces** | LLM observability with token tracking, cost estimation, latency metrics |
| **Marketplace** | Extension system with agents, tools, connectors, apps |

### Where DEVS Falls Short (Gaps)

#### Gap 1: No Context Isolation (Critical)

**Current state**: `coordinateTeamExecution()` in `orchestrator.ts` assigns agents from a shared pool but doesn't isolate context windows. `executeTaskWithAgent()` creates a conversation per execution, but shared context accumulates via `ContextBroker`.

**Impact**: Quality will degrade on complex multi-agent tasks — the exact problem Manus Wide Research was built to solve.

**What competitors do**: Each sub-agent spawns with a fresh context containing only its system prompt, task description, and explicit dependency outputs.

#### Gap 2: Single-Shot Agent Execution (Critical)

**Current state**: `executeTaskWithAgent()` sends one message and collects one streaming response. No tool use during execution, no iterative reasoning, no self-correction.

**Impact**: Agents can't search the web, read files, run calculations, or iterate during task execution. They're limited to what they can produce in a single generation.

**What competitors do**: Perplexity Research Mode performs dozens of search→read→reason loops. Claude Code subagents use tools and loop for up to `maxTurns`.

#### Gap 3: Hardcoded Task Decomposition (High)

**Current state**: `TaskAnalyzer.generateSubTasks()` pattern-matches on keywords (`roman`, `novel`, `story` → creative writing subtasks; `implement`, `develop`, `build` → dev subtasks). Falls back to a generic two-phase pattern.

**Impact**: Decomposition is brittle and domain-specific. Any task that doesn't match the hardcoded keywords gets a generic planning→execution split.

**What competitors do**: LLM-driven decomposition that produces dependency graphs with explicit input/output contracts.

#### Gap 4: No Agent Scoping (High)

**Current state**: All agents have access to the same tools and run with the same model/config. No tool allowlists, no model overrides, no turn limits.

**Impact**: Can't optimize cost (use cheaper models for simple tasks) or restrict capabilities (limit tool access for untrusted agents).

**What competitors do**: Claude Code has per-subagent model selection, tool allowlists/denylists, permission modes, and turn limits.

#### Gap 5: No Async/Background Execution (Medium)

**Current state**: Orchestration is synchronous. The user must wait for the entire pipeline to complete.

**Impact**: Poor UX for complex tasks that take minutes. Users can't fire-and-forget.

**What competitors do**: Perplexity Computer and HappyCapy use background execution with notification on completion. Claude Code supports background subagents.

#### Gap 6: No Result Synthesis (Medium)

**Current state**: Each sub-task produces an artifact. There's no dedicated step to merge them into a unified deliverable.

**Impact**: Users receive N separate artifacts instead of one coherent output.

**What competitors do**: Manus Wide Research has explicit synthesis agents. Perplexity Research Mode produces unified reports.

#### Gap 7: No Cost Control (Low)

**Current state**: All LLM calls use the same provider configuration.

**Impact**: Simple exploration tasks consume the same resources as complex synthesis. No way to optimize spend.

**What competitors do**: Claude Code assigns model tiers per subagent (Haiku for exploration, Opus for creation).

---

## 4. Path Forward

### Guiding Principle

Close the gap on the **six cross-cutting patterns** while preserving DEVS's unique position as the only open-source, free, browser-native, provider-independent agent orchestration platform.

### Phase 1: Foundation (Weeks 1–4)

**Goal**: Fix the two critical gaps — context isolation and iterative execution.

#### 1.1 Isolated Agent Contexts

Refactor `executeTaskWithAgent()` so each sub-agent execution starts with a **fresh, scoped context**:

- New conversation with clean message history
- System prompt + task-specific instructions only
- Dependency outputs injected as context (not full conversation history)
- Knowledge items filtered by relevance to the specific sub-task

This is the highest-impact single change. It directly addresses the quality degradation problem that Manus Wide Research was built to solve.

```
Before:  Agent A → Agent B (inherits A's context) → Agent C (inherits A+B context)
After:   Agent A (fresh) ║ Agent B (fresh) ║ Agent C (fresh) → Synthesis
```

#### 1.2 Iterative Agent Execution Loop

Replace the current single-message pattern with an autonomous execution loop:

```
while (!task.isComplete && turns < maxTurns):
  1. Agent reasons about current state
  2. Agent may call tools (search, knowledge, calculate, run code)
  3. Agent observes tool results
  4. Agent decides: more work needed? → loop; done? → produce final output
```

This leverages the existing tool plugin system — agents already have access to knowledge tools, calculate, Wikipedia, arXiv, skill tools, etc. They just can't use them during orchestrated execution today.

#### 1.3 Per-Agent Model Selection

Add a `model` override to agent specifications and the orchestration pipeline:

- Lighter/cheaper models for exploration and planning sub-tasks
- Heavier models for synthesis, creation, and validation
- `inherit` option to use the user's default configuration

---

### Phase 2: Smart Orchestration (Weeks 5–8)

**Goal**: Replace hardcoded patterns with intelligent, LLM-driven orchestration.

#### 2.1 LLM-Driven Task Decomposition

Replace `TaskAnalyzer.generateSubTasks()` keyword matching with a fully LLM-driven decomposition that produces:

- A **dependency graph** (not just flat lists) with explicit edges
- **Input/output contracts** between tasks (what data flows from task A to task B)
- **Parallelization hints** (which tasks can run concurrently)
- **Model recommendations** per sub-task (exploration vs. synthesis)

#### 2.2 Parallel Execution with Synthesis

Implement the Manus Wide Research pattern:

1. Decompose work into N independent units
2. Spawn N parallel agent executions (each with fresh, isolated context)
3. Collect all results
4. Run a dedicated **synthesis agent** that merges, ranks, filters, and formats
5. Return a unified deliverable

This pattern is especially powerful for research, competitive analysis, content creation, and any task where multiple perspectives improve quality.

#### 2.3 Agent Scoping

Add per-agent capability boundaries:

```typescript
interface AgentScope {
  allowedTools?: string[]    // tool whitelist (empty = all allowed)
  deniedTools?: string[]     // tool blacklist
  maxTurns?: number          // execution budget (iteration limit)
  model?: string             // model override (e.g., 'haiku', 'sonnet')
  permissions?: 'read-only' | 'read-write' | 'full'
}
```

---

### Phase 3: Async & Background (Weeks 9–12)

**Goal**: Decouple task submission from task monitoring.

#### 3.1 Background Task Execution

Leverage existing Service Worker infrastructure to run orchestrations in the background:

- User submits task → sees confirmation → continues using the app
- Task executes asynchronously via Service Worker
- Notification when work completes
- Results appear in a task inbox / dashboard

#### 3.2 Task Queue & Scheduling

- Priority queue for pending tasks
- Optional scheduled/recurring tasks (daily digests, monitoring)
- Pause / resume / cancel controls
- Progress reporting via the existing trace system

#### 3.3 Composition Pipelines

Allow users to define reusable multi-step workflows:

```
Research → Analyze → Write → Review → Format → Deliver
```

Each step is a sub-agent with its own scope, model, and tools. Inspired by Perplexity Computer's natural composition, but user-configurable.

---

### Phase 4: Ecosystem (Weeks 13+)

**Goal**: Make the orchestration system community-extensible.

#### 4.1 Custom Subagent Definitions

Inspired by Claude Code's Markdown-based agent specs:

- Users define custom sub-agents as YAML/Markdown files
- Stored in knowledge base or local backup folder
- Include tool scoping, model preferences, instruction templates
- Shareable via marketplace

#### 4.2 Skill–Orchestration Bridge

Bridge the existing skill system with orchestration:

- Skills become first-class orchestration capabilities
- Agents automatically discover and activate relevant skills during iterative execution
- Skill outputs feed into the orchestration pipeline

#### 4.3 Community Workflow Templates

Pre-built orchestration templates shared via marketplace:

| Template | Inspired By | Pattern |
|---|---|---|
| **Deep Research** | Perplexity Research Mode | Iterative search→read→reason loops |
| **Wide Research** | Manus Wide Research | N parallel researchers → synthesis |
| **Code Review** | Claude Code | Explore → Plan → Review → Report |
| **Content Pipeline** | Perplexity Computer | Research → Write → Edit → Format |
| **Competitive Analysis** | Manus Wide Research | Parallel per-competitor → comparison matrix |

---

## 5. Guarding Our Differentiators

Every phase must preserve what makes DEVS unique:

| Principle | How to Protect |
|---|---|
| **Open Source** | All orchestration logic stays in `src/lib/`. No proprietary APIs, no closed-source dependencies. MIT licensed. |
| **Free** | No credit system, no usage tiers, no paywalls. Users bring their own API keys. Cost control is about *optimizing* the user's spend, not monetizing it. |
| **Portable** | Everything runs in-browser. Background tasks via Service Worker, not cloud infrastructure. IndexedDB + Yjs for persistence. |
| **Independent** | Provider-agnostic model selection. Per-agent model overrides work with any provider. Never depend on a single LLM vendor. |
| **Private** | All context, memories, artifacts, and orchestration state stay in IndexedDB/Yjs on the user's device. No telemetry, no server-side processing. |

---

## Priority Summary

If resources are limited, the **three highest-impact changes** to implement first:

| Priority | Change | Why |
|---|---|---|
| **#1** | **Isolated agent contexts** | Fixes the fundamental quality problem with multi-agent execution. Without this, adding more agents makes output *worse*, not better. |
| **#2** | **Iterative agent execution with tool use** | Transforms agents from one-shot responders to autonomous workers. Unlocks the full power of the existing tool/skill ecosystem during orchestration. |
| **#3** | **LLM-driven task decomposition** | Removes brittle hardcoded patterns. Makes orchestration truly intelligent and domain-agnostic. |

These three changes alone would put DEVS at rough feature parity with the core mechanics of all six competitors, while preserving everything that makes it unique.

---

## Appendix: Source References

| Platform | Source |
|---|---|
| Perplexity Computer | https://www.perplexity.ai/hub/blog/perplexity-computer |
| Perplexity Research Mode | https://www.perplexity.ai/hub/faq/what-is-research-mode |
| Manus Skills | https://manus.im/blog/Manus-Skills-Modular-Capability-Resources-for-AI-Agents |
| Manus Wide Research | https://manus.im/blog/Introducing-Manus-Wide-Research-Parallel-Multi-Agent-Architecture-for-Scale |
| Claude Code Subagents | https://docs.anthropic.com/en/docs/claude-code/sub-agents |
| HappyCapy | https://happycapy.com |
