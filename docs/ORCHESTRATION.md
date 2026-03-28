# Agent Teams Orchestration

> Design document for DEVS multi-agent orchestration. This describes the principles, architecture, and flows for coordinating teams of AI agents to accomplish both simple and complex tasks.

---

## Table of Contents

1. [Vision](#vision)
2. [Core Principles](#core-principles)
3. [Architecture Overview](#architecture-overview)
4. [N-Tiered Execution Model](#n-tiered-execution-model)
5. [Core Abstractions](#core-abstractions)
6. [Orchestration Flow](#orchestration-flow)
7. [Shared Task List](#shared-task-list)
8. [Inter-Agent Communication](#inter-agent-communication)
9. [Real-Time Visual Feedback](#real-time-visual-feedback)
10. [Agent Lifecycle](#agent-lifecycle)
11. [Error Handling & Recovery](#error-handling--recovery)
12. [Future: Background Automation](#future-background-automation)
13. [Comparison: Subagents vs Agent Teams](#comparison-subagents-vs-agent-teams)
14. [Implementation Roadmap](#implementation-roadmap)

---

## Vision

A user types a prompt. DEVS figures out whether it needs one agent or twenty, builds the right team, shows the user exactly what is happening at every moment, and delivers validated results. The system is simple enough that a single agent handles most tasks directly, yet powerful enough that the same primitives scale to deeply nested multi-agent workflows.

---

## Core Principles

### 1. Simplicity First

Every concept in the system reduces to three things: **Agents**, **Tasks**, and **Messages**. There are no special-case constructs for "teams" or "workflows"—a team is just a set of agents sharing a task list, and a workflow is just a tree of tasks with dependencies.

### 2. N-Tiered, Not N-Complex

The same execution pattern works at every level. A team lead decomposes work and delegates. If a delegate determines its subtask is itself complex, it becomes a lead for its own sub-team. This recurs to arbitrary depth using the same three primitives. The user sees a single unified task tree regardless of depth.

### 3. Generic and Reusable

Every component is designed as a standalone primitive:

- **TaskList** is a generic shared work queue, usable by any orchestration strategy.
- **Mailbox** is a generic pub/sub channel, usable for any inter-agent communication.
- **AgentScope** is a generic capability boundary, usable for any agent execution.
- **Execution strategies** are pluggable—the coordinator doesn't know _how_ work gets done, only that tasks move from pending to completed.

### 4. Instant Visual Feedback

The user never waits in the dark. From the moment a prompt is submitted:

- A task tree appears immediately (even before analysis completes).
- Streaming LLM tokens flow in real-time for every active agent.
- Agent assignments, status changes, and artifacts surface as they happen.
- Communication between agents is visible as a trace timeline.

### 5. Future-Proof for Automation

The design assumes that in the future, orchestrations can run unattended in the background (via Service Workers, scheduled triggers, or recurring cron-like tasks). Every decision point that currently requires user attention is modeled as a hookable gate that can be auto-resolved by policy.

---

## Architecture Overview

```
┌───────────────────────────────────────────────────────────┐
│                      User Prompt                          │
└──────────────────────────┬────────────────────────────────┘
                           │
                           ▼
              ┌────────────────────────┐
              │    Team Lead Agent     │
              │  (Analyze, Decompose,  │
              │   Recruit, Delegate)   │
              └───────────┬────────────┘
                          │
               Spawn Team & Assign Tasks
                          │
                          ▼
           ┌──────────────────────────────┐
           │      Shared Task List        │
           │  (Yjs-backed, observable,    │
           │   dependency-aware)          │
           └──┬──────────┬──────────┬─────┘
              │          │          │
        Claim & Work  Claim & Work  Claim & Work
              │          │          │
              ▼          ▼          ▼
         ┌────────┐ ┌────────┐ ┌────────┐
         │Agent A │◄►│Agent B │◄►│Agent C │
         └───┬────┘ └───┬────┘ └───┬────┘
             │          │          │
          Artifacts  Artifacts  Artifacts
             │          │          │
             └──────────┴──────────┘
                        │
                        ▼
              ┌────────────────────┐
              │    Validation &    │
              │    Synthesis       │
              └────────────────────┘
```

**Key difference from the legacy orchestrator:** The team lead does not _execute_ work. It _delegates_ work through a shared task list. Agents self-coordinate by claiming tasks, communicating findings, and producing artifacts. The lead monitors progress and intervenes only when needed (failed validations, stuck tasks, scope changes).

---

## N-Tiered Execution Model

The system selects the lightest execution tier that fits the task's complexity. All tiers use the same primitives.

### Tier 0 — Direct Execution (Single Agent)

```
User → Agent → Result
```

- **When:** Simple tasks. One agent can handle it in one pass.
- **What happens:** No team, no task list overhead. The agent receives the prompt, executes via LLM, and returns an artifact.
- **Example:** "Translate this paragraph to French."

### Tier 1 — Flat Team (Lead + Teammates)

```
User → Lead → Shared Task List → [Agent A, Agent B, Agent C] → Synthesis → Result
```

- **When:** Moderate complexity. Multiple skills needed, but no deep nesting.
- **What happens:** The lead decomposes the prompt into subtasks, recruits or selects agents, and populates the shared task list. Agents claim tasks, communicate laterally, produce artifacts. The lead (or a designated synthesis agent) merges results.
- **Example:** "Write a blog post about quantum computing with technical accuracy and engaging prose." → Researcher + Writer + Editor.

### Tier 2 — Nested Teams (Recursive Delegation)

```
User → Lead → Shared Task List → [Sub-Lead A → [Agent A1, A2], Agent B, Sub-Lead C → [Agent C1, C2]]
```

- **When:** High complexity. Some subtasks are themselves complex enough to warrant their own teams.
- **What happens:** Same as Tier 1, but when a delegate analyzes its assigned subtask and determines it requires multiple agents, it becomes a lead for a child team. The parent's shared task list tracks the delegated subtask as a single item; the child maintains its own nested task list.
- **Example:** "Build a comprehensive market analysis for launching a SaaS product." → Strategy Lead, Technical Lead (spawns: architect + developer + QA), Marketing Lead (spawns: researcher + copywriter).

### Tier Selection Heuristic

```
analyze(prompt) → { complexity, requiredSkills, estimatedSubtasks }

if estimatedSubtasks ≤ 1        → Tier 0 (direct)
if estimatedSubtasks ≤ 6        → Tier 1 (flat team)
if estimatedSubtasks > 6        → Tier 2 (nested, group subtasks into clusters)
```

The heuristic is a starting point. The lead can promote Tier 0 → Tier 1, or Tier 1 → Tier 2, mid-execution if a subtask turns out to be more complex than anticipated. This is a natural consequence of using the same primitives at every level.

---

## Core Abstractions

These are the reusable building blocks. Everything else is composed from them.

### 1. Agent

An AI persona with a role, instructions, and scoped capabilities.

```typescript
interface Agent {
  id: string
  slug: string
  name: string
  role: string
  instructions: string
  scope?: AgentScope        // tools, model, permissions, turn limits
  tags?: string[]
}
```

### 2. Task

A unit of work with explicit inputs, outputs, and dependencies.

```typescript
interface Task {
  id: string
  parentTaskId?: string      // enables nesting (Tier 2)
  workflowId: string
  title: string
  description: string
  status: TaskStatus         // pending → claimed → in_progress → completed | failed
  assignedAgentId?: string
  dependencies: string[]     // task IDs that must complete first
  ioContract?: TaskIOContract // declared inputs/outputs
  artifacts: string[]        // produced artifact IDs
  priority: TaskPriority
  parallelizable: boolean
  isSynthesis: boolean       // final merge task flag
}
```

**Task status lifecycle:**

```
pending ──claim──▶ claimed ──start──▶ in_progress ──finish──▶ completed
   │                  │                    │
   │                  └──unclaim──▶ pending │
   │                                       │
   └──────────────────────────────────── failed ──retry──▶ pending
```

The `claimed` state prevents race conditions when multiple agents try to pick up the same task. It is the locking mechanism.

### 3. Message (Mailbox)

A typed, directed communication between agents.

```typescript
interface AgentMessage {
  id: string
  from: string              // agent ID
  to: string | 'broadcast'  // agent ID or broadcast to all team members
  workflowId: string
  type: MessageType          // 'finding' | 'question' | 'decision' | 'status' | 'handoff'
  content: string
  referencedTaskIds?: string[]
  referencedArtifactIds?: string[]
  timestamp: Date
}
```

### 4. Artifact

A deliverable produced by an agent for a task.

```typescript
interface Artifact {
  id: string
  taskId: string
  agentId: string
  type: string               // 'document' | 'code' | 'analysis' | 'review' | ...
  content: string
  validates?: string[]       // requirement IDs this artifact satisfies
  status: 'draft' | 'final'
  createdAt: Date
}
```

### 5. Workflow

A container that groups a task tree, the participating agents, and the communication trace for one user prompt.

```typescript
interface Workflow {
  id: string
  promptId: string
  strategy: 'direct' | 'flat-team' | 'nested-team'
  leadAgentId: string
  participatingAgentIds: string[]
  rootTaskId: string
  status: 'analyzing' | 'running' | 'validating' | 'completed' | 'failed'
  createdAt: Date
  completedAt?: Date
}
```

---

## Orchestration Flow

### Phase 1: Analysis

The team lead agent analyzes the user prompt via LLM to produce:

1. **Complexity assessment** — simple, moderate, complex.
2. **Requirement extraction** — functional, non-functional, constraints (with MoSCoW priorities).
3. **Skill identification** — what agent capabilities are needed.
4. **Task decomposition** — a list of subtasks with dependency graph.
5. **Tier selection** — which execution tier to use.

```
User Prompt
    │
    ▼
┌─────────────────────┐
│  TaskAnalyzer (LLM) │
│                     │
│  → complexity       │
│  → requirements[]   │
│  → skills[]         │
│  → subtasks[]       │
│  → tier             │
└─────────┬───────────┘
          │
          ▼
  Create Workflow + Task Tree
```

**Visual feedback:** The moment analysis begins, the UI shows a "thinking" state. As soon as the task tree is available (even partial, via streaming), it renders in the task list panel.

### Phase 2: Team Assembly

Based on the analysis, the lead:

1. **Searches existing agents** for skill matches (built-in + custom agents).
2. **Recruits new agents** via the agent-recruiter if no match exists—creating specialized agents on the fly with tailored instructions.
3. **Assigns scopes** to each agent (tools, model tier, turn limits).
4. **Populates the shared task list** with the decomposed subtasks.

```
Analysis Result
    │
    ▼
┌──────────────────────────────────────┐
│  Agent Discovery & Recruitment       │
│                                      │
│  for each required skill:            │
│    1. findAgentBySkill(skill)        │
│    2. if not found → recruitAgent()  │
│    3. assignScope(agent, task)       │
└──────────────────┬───────────────────┘
                   │
                   ▼
        Shared Task List populated
        with assigned agents
```

**Visual feedback:** Agents appear in the team panel as they are recruited. Each agent card shows their role, assigned tasks, and status (idle/working/done).

### Phase 3: Execution

Agents execute in parallel where dependencies allow.

```
while (hasUnfinishedTasks(taskList)):

    readyTasks = taskList.filter(t =>
        t.status === 'pending' &&
        t.dependencies.every(d => isCompleted(d))
    )

    for task in readyTasks:
        agent = task.assignedAgent || nextAvailableAgent()
        agent.claim(task)
        agent.execute(task)  // LLM inference with streaming
            → produces artifacts
            → may send messages to other agents
            → may update task status

    // Handle inter-agent communication
    processMailbox()
```

**Key execution rules:**

| Rule | Description |
|------|-------------|
| **Claim before work** | An agent must transition a task to `claimed` before starting. This prevents two agents from working the same task. |
| **Stream everything** | All LLM calls use streaming. Token-by-token output is piped to the UI in real-time. |
| **Communicate findings** | When an agent discovers something relevant to other agents' tasks, it publishes a message via the Mailbox. |
| **Produce artifacts** | Every meaningful output is stored as an Artifact linked to the task and agent. |
| **Respect scope** | Agents operate within their `AgentScope`—limited tools, model, turn count. |

**Visual feedback:** Active agents show streaming LLM output. The task list updates in real-time (pending → in_progress → completed). Artifacts appear as they are created.

### Phase 4: Validation & Synthesis

After all tasks complete:

1. **Requirement validation** — Each requirement is checked against produced artifacts. Evidence is collected.
2. **Synthesis** — If the workflow has a synthesis task, a designated agent merges all artifacts into a final deliverable.
3. **Refinement loop** — Failed validations generate refinement tasks that re-enter the execution phase. Maximum 2 refinement cycles.

```
All tasks completed
    │
    ▼
┌─────────────────────────────────────┐
│  RequirementValidator               │
│                                     │
│  for each requirement:              │
│    evidence = findEvidence(artifacts)│
│    if sufficient → mark satisfied   │
│    else → create refinement task    │
└──────────────────┬──────────────────┘
                   │
              ┌────┴────┐
              │         │
          All pass   Some fail
              │         │
              ▼         ▼
          Synthesis   Re-enter Phase 3
              │       (max 2 retries)
              ▼
        Final Artifact
```

**Visual feedback:** A validation summary appears showing requirement satisfaction (green/yellow/red). Refinement cycles are visible as new tasks appended to the task tree.

---

## Shared Task List

The shared task list is the central coordination mechanism. It replaces top-down micromanagement with self-organizing work distribution.

### Design

- **Backed by Yjs** — The task list lives in a Yjs Y.Map, giving it automatic persistence (y-indexeddb), real-time reactivity (`useLiveMap`), and future P2P sync.
- **Observable** — Any store subscriber (React component, agent process) sees changes instantly.
- **Dependency-aware** — Tasks carry a `dependencies: string[]` array. A task cannot be claimed until all its dependencies are completed. When a dependency completes, blocked tasks auto-unblock.
- **Concurrency-safe** — The `claimed` status acts as a lock. Only one agent can transition a task from `pending` to `claimed`. Yjs CRDT merge semantics handle conflicts.

### Task Assignment Strategies

| Strategy | Description | When to use |
|----------|-------------|-------------|
| **Lead-assigned** | The lead explicitly sets `assignedAgentId` on each task. | When the lead knows which agent is best for each task (most common). |
| **Self-claimed** | Tasks have no `assignedAgentId`. Agents poll for unblocked, unclaimed tasks and claim them. | When agents are interchangeable or when load balancing matters. |
| **Hybrid** | The lead assigns high-priority or skill-specific tasks; remaining tasks are self-claimed. | For large teams with mixed specialization. |

### Dependency Resolution

```
Task A (no deps)     ──▶ can start immediately
Task B (depends on A) ──▶ blocked until A completes
Task C (depends on A) ──▶ blocked until A completes
Task D (depends on B, C) ──▶ blocked until both B and C complete
```

Tasks B and C run in parallel once A completes. Task D waits for both. Circular dependencies are detected at decomposition time and rejected.

---

## Inter-Agent Communication

Agents communicate through a **Mailbox** system—a lightweight pub/sub layer built on top of the existing `ContextBroker`.

### Message Types

| Type | Purpose | Example |
|------|---------|---------|
| `finding` | Share a discovery relevant to other agents | "The API requires OAuth 2.0, not API keys." |
| `question` | Ask another agent for clarification | "What authentication method should I use?" |
| `decision` | Announce a decision that affects the team | "We'll use PostgreSQL instead of MongoDB." |
| `status` | Report progress or blockers | "Task X is 80% done, blocked on API docs." |
| `handoff` | Transfer partially completed work | "Here's my draft; please review and finalize." |
| `review` | Request or deliver a peer review | "I found 3 issues in the code artifact." |

### Communication Rules

1. **Targeted over broadcast.** Agents send messages to specific agents unless the information is genuinely team-wide.
2. **Lazy delivery.** Messages are stored in the Mailbox. An agent reads its inbox at the start of each turn (before claiming new work) and incorporates relevant context.
3. **Auto-routing.** When an agent publishes a `finding`, the Mailbox uses keyword matching to push it to agents whose current tasks share relevant keywords.
4. **Visible to the user.** All messages are logged in the workflow's communication trace, visible in the UI.

### How Communication Enhances Quality

In the subagent model, Agent B never knows what Agent A discovered. In the agent team model:

- Agent B can **challenge** Agent A's assumptions.
- Agent C can **build on** Agent A's findings instead of duplicating research.
- The lead can **redirect** the team based on emerging findings.
- Competing hypotheses get tested in parallel and debated.

This maps directly to the DEVS concept of `SharedContext` and `ContextBroker`, extended with typed messages and explicit agent-to-agent channels.

---

## Real-Time Visual Feedback

The user should _never_ wonder "what's happening?" Every phase of orchestration has a corresponding UI element.

### Feedback Timeline

| Phase | What the user sees |
|-------|--------------------|
| **Prompt submitted** | Spinner transitions to "Analyzing..." |
| **Analysis complete** | Task tree renders (may grow as subtasks are added). Tier badge shows (Direct / Team / Nested Team). |
| **Team assembled** | Agent cards appear in a team panel, each showing role, avatar, and assigned tasks. |
| **Execution starts** | Active agents show streaming LLM output in their respective conversation panels. Task status updates in real-time (color-coded). |
| **Messages exchanged** | Communication trace panel shows inter-agent messages as a timestamped timeline (like a group chat). |
| **Artifacts produced** | Artifact chips appear on the relevant task card. Clicking opens the content. |
| **Validation runs** | Requirement checklist updates with green/yellow/red indicators. |
| **Refinement needed** | New refinement tasks appear in the task tree, linked to failed requirements. |
| **Completed** | Final synthesis artifact is presented. Summary panel shows stats (agents used, time, tokens, requirement satisfaction). |

### UI Components (Reactive via Yjs)

```
┌─────────────────────────────────────────────────────────────────┐
│  Workflow Header                                                │
│  [Prompt summary] [Tier badge] [Status] [Duration] [Token cost]│
├─────────────────────┬───────────────────────────────────────────┤
│  Task Tree          │  Active Agent Panel                       │
│                     │                                           │
│  ☑ Analysis         │  ┌─────────────────────────────┐         │
│  ☑ Research (Agent A)│  │ Agent B — "Technical Writer" │         │
│  ▶ Writing (Agent B)│  │ Working on: "Write intro"    │         │
│  ○ Review (Agent C) │  │ ░░░░░░░░░░ streaming...     │         │
│  ○ Synthesis        │  └─────────────────────────────┘         │
│                     │                                           │
├─────────────────────┼───────────────────────────────────────────┤
│  Communication Trace│  Artifacts                                │
│                     │                                           │
│  10:01 A→B: "Found │  📄 research-notes.md (Agent A)           │
│   3 key papers"     │  📄 draft-intro.md (Agent B) [streaming]  │
│  10:02 B→A: "Can    │  ⏳ review-comments (Agent C) [pending]   │
│   you share links?" │                                           │
│  10:03 A→B: "Here…" │                                          │
└─────────────────────┴───────────────────────────────────────────┘
```

All panels are **reactive observers** of the Yjs-backed stores. No polling. When an agent writes an artifact or sends a message, the UI updates in the same tick.

---

## Agent Lifecycle

### Within a Single Workflow

```
idle ──recruit──▶ assigned ──claim──▶ working ──finish──▶ idle
                                         │
                                    communicate
                                         │
                                    claim next task
```

### Agent Recycling

Agents created during a workflow are **cached** for reuse. If a future workflow needs a "Technical Writer" agent, the system finds the existing one rather than creating a duplicate. Cache key is `role + skill tags`.

### Agent Scope Enforcement

Each agent operates within a defined `AgentScope`:

```typescript
interface AgentScope {
  allowedTools?: string[]     // tool whitelist
  deniedTools?: string[]      // tool blacklist
  maxTurns?: number           // max LLM round-trips
  model?: string              // model override (e.g., cheaper model for research)
  provider?: LLMProvider      // provider override
  permissions?: 'read-only' | 'read-write' | 'full'
  temperature?: number        // creativity dial
  maxTokens?: number          // per-call token limit
}
```

The lead assigns scopes based on task needs. A research agent might get a cheap, fast model. A code generation agent might get the most capable model. A reviewer might be read-only.

---

## Error Handling & Recovery

### Multi-Level Recovery Strategy

```
Level 1 — Agent Level
    Agent hits an error during execution
    → Retry with adjusted prompt (up to 2 retries)
    → If still failing, send 'status' message to lead

Level 2 — Task Level
    Task fails after agent retries exhausted
    → Lead reassigns to a different agent
    → If no suitable agent, lead recruits a new one
    → Task re-enters 'pending' state

Level 3 — Validation Level
    Requirement validation fails
    → Create refinement tasks targeting specific gaps
    → Re-enter execution phase (max 2 refinement cycles)
    → If still failing, mark requirement as 'failed' with evidence

Level 4 — Workflow Level
    Critical failure (all agents fail, circular dependency, timeout)
    → Workflow status → 'failed'
    → User notified with diagnostic summary
    → Partial artifacts preserved for manual recovery
```

### Deadlock Prevention

- **Circular dependency detection** at task decomposition time (topological sort).
- **Timeout per task** — if a task stays `in_progress` beyond a configurable duration, it is auto-failed and reassigned.
- **Starvation prevention** — if no tasks are claimable (all blocked) and no tasks are in progress, the lead is notified to intervene.

---

## Future: Background Automation

While current implementation is interactive (user watches the workflow), the architecture is designed to support fully autonomous background execution.

### Design Hooks for Automation

| Concern | Interactive (Now) | Automated (Future) |
|---------|------------------|-------------------|
| Trigger | User types a prompt | Scheduled cron, webhook, file system event |
| Approval gates | User sees task tree and can modify before execution | Auto-approved by policy (or queued for batch review) |
| Monitoring | Real-time UI panels | Notification summaries (email, push, in-app badge) |
| Human-in-the-loop | User can pause, redirect, intervene | Escalation rules: "notify me if confidence < 80%" |
| Artifact delivery | Rendered in the UI | Written to file system (local-backup), pushed to connector, or stored for retrieval |

### Service Worker Integration

Background workflows will execute within the Service Worker context:

- **Task Queue** — A priority queue (`TaskPriority`) schedules workflows.
- **Execution Budget** — Background tasks get lower priority and model-cost budgets.
- **State Persistence** — Workflow state is in Yjs (persisted to IndexedDB), so the browser tab can close and reopen without losing progress.
- **Wake-on-complete** — When a background workflow finishes, the UI receives a notification.

### Recurring Workflows

Tasks with `recurrence` (cron string) re-enter the queue automatically:

```typescript
// "Every Monday at 9am, generate a weekly report"
{
  recurrence: '0 9 * * 1',
  scheduledAt: nextMonday9am,
  description: 'Generate weekly project status report'
}
```

---

## Comparison: Subagents vs Agent Teams

Both patterns delegate work, but they serve different purposes. DEVS supports both—Tier 0 with subagent-like direct execution, and Tiers 1-2 with full agent teams.

| Aspect | Subagents (Tier 0) | Agent Teams (Tier 1-2) |
|--------|-------------------|----------------------|
| **Context** | Shared with caller or summarized back | Each agent has its own context window |
| **Communication** | Report results back to the main agent only | Agents message each other directly |
| **Coordination** | Main agent manages all work | Shared task list with self-coordination |
| **Best for** | Focused tasks where only the result matters | Complex work requiring discussion and collaboration |
| **Token cost** | Lower: results summarized back to main context | Higher: each agent is a separate LLM session |
| **Visual feedback** | Single stream | Multi-stream with inter-agent communication trace |
| **Scalability** | Limited by main agent's context window | Scales to arbitrary team size and depth |

**Hybrid approach:** DEVS can start as Tier 0 (subagent-style) and dynamically promote to Tier 1 if the agent determines the task needs collaboration. This is a unique advantage of using the same primitives at every level.

---

## Implementation Roadmap

### Phase 1: Foundation (Refactor)

Refactor the legacy `WorkflowOrchestrator` to use the new primitives.

- [ ] Add `claimed` status to `TaskStatus` type
- [ ] Add `AgentMessage` type and Mailbox store (Yjs-backed)
- [ ] Add `Workflow` entity to track orchestration runs
- [ ] Refactor `TaskAnalyzer` to output tier selection
- [ ] Implement task dependency resolution with topological sort
- [ ] Implement task claiming with concurrency safety

### Phase 2: Agent Teams Execution

Build the Tier 1 (flat team) execution engine.

- [ ] Implement shared task list coordination loop
- [ ] Implement agent self-claiming strategy
- [ ] Integrate Mailbox into agent execution context
- [ ] Wire streaming LLM output per agent
- [ ] Implement validation and refinement loop

### Phase 3: Visual Feedback Layer

Build the real-time UI components.

- [ ] Task tree panel (reactive, Yjs-observed)
- [ ] Active agent panel (multi-stream)
- [ ] Communication trace timeline
- [ ] Artifact panel with inline preview
- [ ] Workflow header with stats (duration, tokens, status)

### Phase 4: Nested Teams (Tier 2)

Extend to recursive delegation.

- [ ] Implement nested task list creation (child workflow)
- [ ] Connect parent task status to child workflow completion
- [ ] Nested task tree rendering in UI
- [ ] Scope inheritance (child teams inherit parent scope with overrides)

### Phase 5: Background Automation

Enable unattended execution.

- [ ] Task priority queue in Service Worker
- [ ] Scheduled/recurring task triggers
- [ ] Notification system for background completion
- [ ] Policy-based auto-approval gates
- [ ] Budget controls for background token spending

---

## Appendix: Mapping to Existing DEVS Code

| Concept | Current Code | Change Needed |
|---------|-------------|---------------|
| Task | `src/types/index.ts` → `Task` | Add `claimed` status, ensure `parentTaskId` nesting |
| Agent scope | `src/types/index.ts` → `AgentScope` | Already exists. No change. |
| Task IO contract | `src/types/index.ts` → `TaskIOContract` | Already exists. No change. |
| Task analysis | `src/lib/task-analyzer.ts` | Add tier selection output |
| Context sharing | `src/lib/context-broker.ts` | Extend to typed `AgentMessage` Mailbox |
| Artifact management | `src/lib/artifact-manager.ts` | No change (already generic) |
| Orchestrator | `src/lib/orchestrator.legacy.ts` | Refactor to new tiered model |
| Task store | `src/stores/taskStore.ts` | Add claiming logic, dependency auto-unblock |
| Requirement validation | `src/lib/requirement-validator.ts` | No change (already generic) |
| Conversation store | `src/stores/conversationStore.ts` | Support multi-agent conversation per workflow |

---

_This document is a design reference for future implementation. It captures the principles, architecture, and detailed flows needed to build agent team orchestration in DEVS._
