# Orchestration — Gap Analysis & Implementation Plan

> Synthesized comparison between [ORCHESTRATION.md](./ORCHESTRATION.md) (target architecture) and the current v2 orchestration engine, with a step-by-step implementation roadmap.

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [What's Already Done](#whats-already-done)
3. [Gap Analysis](#gap-analysis)
   - [G1 — Workflow Entity](#g1--workflow-entity)
   - [G2 — Task `claimed` Status](#g2--task-claimed-status)
   - [G3 — Tier Selection](#g3--tier-selection)
   - [G4 — Agent Self-Claiming](#g4--agent-self-claiming)
   - [G5 — Persistent Yjs-Backed Mailbox](#g5--persistent-yjs-backed-mailbox)
   - [G6 — Typed Inter-Agent Messages](#g6--typed-inter-agent-messages)
   - [G7 — Communication Trace UI](#g7--communication-trace-ui)
   - [G8 — Nested Teams (Tier 2)](#g8--nested-teams-tier-2)
   - [G9 — Validation Loop for All Paths](#g9--validation-loop-for-all-paths)
   - [G10 — Agent-Level Retry](#g10--agent-level-retry)
   - [G11 — Progress Reporting Wired to UI](#g11--progress-reporting-wired-to-ui)
   - [G12 — Service Recovery & Resumption](#g12--service-recovery--resumption)
   - [G13 — Tools, Skills & Connectors at Every Step](#g13--tools-skills--connectors-at-every-step)
   - [G14 — Human-in-the-Loop Controls](#g14--human-in-the-loop-controls)
   - [G15 — Background Automation & Scheduling](#g15--background-automation--scheduling)
4. [Implementation Plan](#implementation-plan)
   - [Phase 0 — Prerequisite Foundation](#phase-0--prerequisite-foundation)
   - [Phase 1 — Core Data Model Hardening](#phase-1--core-data-model-hardening)
   - [Phase 2 — Service Recovery & Resumption](#phase-2--service-recovery--resumption)
   - [Phase 3 — Agent Teams Maturation](#phase-3--agent-teams-maturation)
   - [Phase 4 — Visual Feedback Layer](#phase-4--visual-feedback-layer)
   - [Phase 5 — Nested Teams (Tier 2)](#phase-5--nested-teams-tier-2)
   - [Phase 6 — Background Automation](#phase-6--background-automation)
5. [File Reference Map](#file-reference-map)

---

## Executive Summary

The current v2 orchestration engine (`src/lib/orchestrator/`) is a **solid foundation** that already implements the most complex parts of the design: LLM-driven task decomposition, dependency-aware parallel execution, iterative agentic loops with tool support, and a synthesis engine. However, it operates as a **sophisticated subagent model wrapped in a thin team coordinator shell**, rather than the self-organizing agent team architecture described in `ORCHESTRATION.md`.

The critical missing pieces fall into three categories:

1. **Persistent state for orchestration** — No `Workflow` entity, no `claimed` status, no Yjs-backed team mailbox. All orchestration coordination state is in-memory and lost on page refresh.
2. **Service recovery** — Because everything client-side, a browser close mid-orchestration leaves tasks stuck in `in_progress` forever. There is no mechanism to detect interrupted work and resume or clean up.
3. **Full tool/skill/connector leverage** — Tools and skills are injected at the agent-runner level (good), but skills activated via `/mentions` in chat are not forwarded to orchestrated sub-tasks, the task decomposer doesn't consider available tools/connectors when planning, and the synthesis engine runs without tool access.

---

## What's Already Done

These areas are implemented and working. **Do not rewrite them.**

| Area | Implementation | Quality |
|------|---------------|---------|
| **Single-agent execution (Tier 0)** | `executeSingleAgent()` in `engine.ts` | High — full agentic loop, tools, validation |
| **Multi-agent execution** | `executeMultiAgent()` in `engine.ts` | High — LLM decomposition, parallel batches, synthesis |
| **Agent Teams (Tier 1) — basic** | `executeAgentTeam()` in `engine.ts` using `TeamCoordinator` | Medium — works but orchestrator-driven, not self-organizing |
| **Task decomposition** | `decomposeTask()` in `task-decomposer.ts` | High — LLM-driven, dependency graph, I/O contracts, model hints |
| **Agentic loop** | `runAgent()` / `runAgentSingleShot()` in `agent-runner.ts` | High — iterative with full tool support |
| **Tool integration** | `collectTools()` in `agent-runner.ts` | High — knowledge, math, code, research, skill, connector, presentation tools |
| **Skill injection** | `buildSkillInstructions()` in `agent-runner.ts` system prompt | High — per-agent skill catalog |
| **Connector tools** | `getConnectorToolDefinitions()` in `agent-runner.ts` | High — dynamic from active connectors |
| **Synthesis engine** | `synthesizeResults()` in `synthesis-engine.ts` | High |
| **Orchestration events** | `events.ts` — typed event bus | High — `agent-start`, `agent-streaming`, `agent-tool-call`, `agent-complete`, `phase-change` |
| **Streaming hook** | `useOrchestrationStreaming` in `src/hooks/` | High — subscribes to events, builds `streamingMap` |
| **SharedTaskList** | In `team-coordinator.ts` | Medium — in-memory, claim locking, dependency resolution, cycle detection |
| **TeamMailbox** | In `team-coordinator.ts` | Low — in-memory, untyped, no persistence |
| **TaskQueue** | In `task-queue.ts` | Medium — in-memory priority queue with pause/resume/cancel |
| **Artifact management** | `ArtifactManager` | High — generic, no changes needed |
| **Requirement validation** | `validateTaskCompletion()` in `engine.ts` | Medium — LLM-based but only in single-agent path |
| **Task page UI** | `src/pages/Tasks/show.tsx` | Medium — renders sub-tasks, conversations, artifacts, streaming |
| **AgentScope type** | `src/types/index.ts` | Complete — allowedTools, deniedTools, maxTurns, model, provider, temperature, maxTokens, permissions |
| **TaskIOContract type** | `src/types/index.ts` | Complete |
| **Task v2 fields** | `src/types/index.ts` | Complete — executionMode, priority, runState, turnsUsed, parallelizable, isSynthesis, modelHint, recurrence, scheduledAt |

---

## Gap Analysis

### G1 — Workflow Entity

**Design doc:** `Workflow` is a first-class entity with `{ id, promptId, strategy, leadAgentId, participatingAgentIds, rootTaskId, status, createdAt, completedAt }`.

**Current state:** `workflowId` is a bare UUID string generated in `orchestrate()` and stored on `Task` and `Conversation`. There is no `Workflow` type, no store, no status tracking. You cannot query "show me all orchestrations" or "what's the status of workflow X" without reconstructing it from scattered task/conversation data.

**Impact:** Blocks workflow-level status display, recovery, and background automation. Also blocks the task page from showing a proper workflow header with tier badge, duration, and token cost.

### G2 — Task `claimed` Status

**Design doc:** Task status lifecycle is `pending → claimed → in_progress → completed | failed`. The `claimed` state is the **locking mechanism** that prevents two agents from working the same task.

**Current state:** Persistent `Task` type has `'pending' | 'in_progress' | 'completed' | 'failed'`. The `claimed` state only exists in the ephemeral `SharedTaskList`'s `TeamTask` type. The persistent task jumps directly from `pending` to `in_progress`.

**Impact:** Without a persistent `claimed` state, P2P sync scenarios (two tabs, two devices) could have agents double-execute the same task. Recovery logic also can't distinguish "task was being claimed" from "task is actively running".

### G3 — Tier Selection

**Design doc:** `TaskAnalyzer` outputs a tier recommendation: Tier 0 (direct), Tier 1 (flat team), Tier 2 (nested team). Selection heuristic based on estimated subtask count.

**Current state:** `TaskAnalyzer.analyzePrompt()` outputs `complexity: 'simple' | 'complex'`. Tier selection is split: simple → single-agent, complex → multi-agent, and `detectTeamFromPrompt()` (keyword regex) can override to agent-team. There is no unified tier decision.

**Impact:** The system can't intelligently choose between multi-agent (orchestrator-driven) and agent-team (self-organizing) based on task analysis. The keyword heuristic is brittle and doesn't leverage LLM reasoning.

### G4 — Agent Self-Claiming

**Design doc:** Agents autonomously poll the shared task list and claim available tasks. Three strategies: lead-assigned, self-claimed, hybrid.

**Current state:** The `executeAgentTeam()` loop in `engine.ts` drives everything: it calls `taskList.getReadyTasks()`, picks the best teammate via `coordinator.getBestTeammateForTask()`, and calls `taskList.claimTask()` on behalf of the agent. Agents never make autonomous decisions.

**Impact:** Agents can't respond dynamically to emerging context or reprioritize. The "team" is really just a multi-agent execution with a shared message board.

### G5 — Persistent Yjs-Backed Mailbox

**Design doc:** Inter-agent messages stored in a Yjs-backed Mailbox store, observable and persistent.

**Current state:** `TeamMailbox` is a plain in-memory class with a `messages: TeamMessage[]` array. Lost on page refresh. Not observable by React components. Not synced via Yjs.

**Impact:** Communication trace UI is impossible without data to display. Recovery can't replay or show what agents communicated.

### G6 — Typed Inter-Agent Messages

**Design doc:** Six message types: `finding`, `question`, `decision`, `status`, `handoff`, `review`. Auto-routing based on keywords. Targeted over broadcast.

**Current state:** `TeamMessage` has `type: 'direct' | 'broadcast'`. Content is an untyped string. The only messaging that happens is a broadcast of task completion summaries in `executeAgentTeam()`.

**Impact:** Agents can't challenge assumptions, build on each other's findings, or have structured handoffs. This is what differentiates agent teams from subagents.

### G7 — Communication Trace UI

**Design doc:** A timestamped timeline of inter-agent messages visible to the user. Part of the task page layout.

**Current state:** Not implemented. The task page (`show.tsx`) renders conversations (LLM chat messages per agent) but has no panel for inter-agent communication. The `TeamMailbox` messages are never surfaced.

**Impact:** Users can't see how agents coordinated. The "Real-Time Visual Feedback" principle is violated for team execution.

### G8 — Nested Teams (Tier 2)

**Design doc:** When a delegate determines its subtask is too complex, it becomes a lead for a child team. Same primitives, recursive depth. Parent task tracks child workflow as a single item.

**Current state:** Not implemented. No recursive team spawning. `parentTaskId` exists on `Task` but only for one level of nesting (main task → sub-tasks).

**Impact:** Complex tasks that would benefit from hierarchical decomposition are forced into a flat structure.

### G9 — Validation Loop for All Paths

**Design doc:** After all tasks complete, requirements are validated per-requirement with evidence. Failed validations generate refinement tasks (max 2 cycles).

**Current state:** `validateTaskCompletion()` and `createRefinementTask()` exist but are **only called in `executeSingleAgent()`**. Neither `executeMultiAgent()` nor `executeAgentTeam()` run validation or refinement.

**Impact:** Complex multi-agent work — the kind most likely to have quality issues — gets zero validation.

### G10 — Agent-Level Retry

**Design doc:** Agent retries with adjusted prompt (up to 2), then sends status message to lead.

**Current state:** `runAgent()` has no retry logic. If the LLM call fails, the error propagates up and the task fails immediately.

**Impact:** Transient LLM errors (rate limits, timeouts) kill entire sub-tasks instead of being recovered.

### G11 — Progress Reporting Wired to UI

**Design doc:** Phase-by-phase progress with percentages. Workflow header showing status, duration, token cost.

**Current state:** `orchestrate()` accepts `onProgress` callback. `show.tsx` has `orchestrationProgress` state and `setOrchestrationProgress`. But **`WorkflowOrchestrator.orchestrateTask()` does not forward `onProgress`** — the call in `show.tsx` passes no options. Progress is always 0.

**Impact:** Users see no progress indication during orchestration beyond "orchestrating...".

### G12 — Service Recovery & Resumption

**Design doc:** Yjs persistence means "the browser tab can close and reopen without losing progress." Background workflows survive tab close.

**Current state:** This is the **most critical gap** for a browser-native platform:

- **Task state is persisted** (Yjs → IndexedDB) — tasks, conversations, artifacts survive refresh. ✅
- **Orchestration execution state is NOT persisted** — `runningOrchestrations` Set, `TeamCoordinator` instance, `SharedTaskList`, `TeamMailbox`, `TaskQueue` are all in-memory JavaScript. ❌
- **Stuck tasks:** If the browser closes during orchestration, tasks remain `in_progress` forever. No cleanup, no recovery. The task page re-renders the task but can't resume it.
- **No orphan detection:** On app startup, nobody scans for tasks stuck in `in_progress` or `pending` with stale `assignedAt` timestamps.
- **No execution journal:** There's no record of which sub-tasks completed and which didn't, beyond individual task statuses. The engine can't know "I was in the middle of batch 2 of 4" on recovery.

**What needs to happen:**
1. Persist workflow execution state in Yjs (phase, which sub-tasks completed, team structure).
2. On app init, scan for orphaned tasks (status `in_progress` with no active orchestration).
3. Decide per-task: resume (re-enter execution loop from where it stopped) or fail gracefully (mark as failed, notify user).
4. For tasks that can be retried: re-trigger orchestration using existing task/sub-task structure rather than re-analyzing from scratch.

### G13 — Tools, Skills & Connectors at Every Step

**Design doc (implied throughout + AGENTS.md):** Agents leverage tools, skills, and connectors throughout orchestration.

**Current state — what works:**
- `agent-runner.ts` → `collectTools()` gathers **all** tool categories (knowledge, math, code, research, skill, connector, presentation).
- `buildSystemPrompt()` injects knowledge, memories, and skills per agent.
- Connector tools are dynamically discovered from active connectors.
- Both `runAgent()` and `runAgentSingleShot()` have full tool access.

**Current state — what doesn't:**
1. **Activated skills from `/mentions` are lost:** When the user types `/skill-name` in chat, `submitChat()` receives `activatedSkills` and injects them. But when orchestration is triggered, `WorkflowOrchestrator.orchestrateTask(prompt)` only receives the prompt — no skills are forwarded. Sub-tasks never see user-activated skills.
2. **Task decomposer is tool-blind:** `decomposeTask()` sends the prompt to the LLM for decomposition but doesn't tell it what tools/connectors are available. The LLM may decompose work into steps that could be trivially handled by an existing tool, or miss opportunities to use connectors (e.g., "fetch from Google Drive" when a Google Drive connector is active).
3. **Synthesis engine has no tool access:** `synthesizeResults()` calls `LLMService.chat()` without tools. If synthesis needs to verify a fact, compute something, or access a connector, it can't.
4. **Validation has no tool access:** `validateTaskCompletion()` calls `LLMService.streamChat()` without tools. The validator can't run code, check knowledge base, or use connectors to verify requirements.
5. **Team detection is keyword-only:** `detectTeamFromPrompt()` uses regex. It could leverage an LLM call or at least factor in available agents/skills to make better detection decisions.

### G14 — Human-in-the-Loop Controls

**Design doc:** Pause, intervene, approve actions. Hookable gates at decision points.

**Current state:** Only stop (abort via `AbortController`) and delete. No pause/resume wired to UI. `TaskQueue` has `pause()`/`resume()` methods but they're not exposed in the task page.

**Impact:** Users can't course-correct mid-orchestration without killing the entire workflow.

### G15 — Background Automation & Scheduling

**Design doc:** Task priority queue in Service Worker. Scheduled/recurring tasks via cron strings. Auto-approval gates. Budget controls.

**Current state:** `submitBackground()` exists but runs in the main thread (not Service Worker). `TaskQueue` is in-memory. The `recurrence` and `scheduledAt` fields exist on `Task` type but no scheduling engine processes them.

**Impact:** Background automation is non-functional. Recurring tasks are impossible.

---

## Implementation Plan

### Guiding Principles

- **Incremental delivery.** Each phase produces a working, testable increment. No big-bang rewrites.
- **Yjs-first.** All new persistent state goes into Yjs maps. No new IndexedDB tables.
- **Don't reinvent the wheel.** The existing `engine.ts`, `agent-runner.ts`, `task-decomposer.ts`, and `synthesis-engine.ts` are good. Extend them, don't rewrite them.
- **TDD for lib/ and stores/.** Every new module in `src/lib/` or `src/stores/` must have tests written first.
- **Tools, skills, and connectors are first-class.** Every step that calls an LLM should have access to the user's tools/skills/connectors unless explicitly scoped out.

---

### Phase 0 — Prerequisite Foundation

> Goal: Build the foundation types and stores that everything else depends on. No behavioral changes yet.

#### Step 0.1 — Add `Workflow` Type

**File:** `src/types/index.ts`

Add the `Workflow` interface:

```typescript
interface Workflow {
  id: string
  prompt: string
  strategy: 'direct' | 'flat-team' | 'nested-team'
  tier: 0 | 1 | 2
  leadAgentId: string
  participatingAgentIds: string[]
  rootTaskId: string
  status: 'analyzing' | 'decomposing' | 'recruiting' | 'executing' | 'validating' | 'synthesizing' | 'completed' | 'failed' | 'interrupted'
  phase: string                    // current human-readable phase
  progress: number                 // 0-100
  totalTurnsUsed: number
  error?: string
  createdAt: Date
  completedAt?: Date
  updatedAt: Date
}
```

**Tests first:** `src/test/types/workflow.test.ts` — type-level assertions (TypeScript compile check).

#### Step 0.2 — Add `claimed` to Task Status

**File:** `src/types/index.ts`

Change:
```typescript
status: 'pending' | 'in_progress' | 'completed' | 'failed'
```
To:
```typescript
status: 'pending' | 'claimed' | 'in_progress' | 'completed' | 'failed'
```

**Ripple effect:** Search all files for `status === 'pending'` or `status: 'in_progress'` matching and verify. The `claimed` status should be transparent to most consumers (they treat it like `in_progress` for display). Only the claiming/recovery logic needs to distinguish it.

**Tests first:** Update existing task store tests to verify the new status is allowed.

#### Step 0.3 — Add `AgentMessage` Type

**File:** `src/types/index.ts`

```typescript
interface AgentMessage {
  id: string
  workflowId: string
  from: string                     // agent ID
  to: string | 'broadcast'
  type: 'finding' | 'question' | 'decision' | 'status' | 'handoff' | 'review'
  content: string
  referencedTaskIds?: string[]
  referencedArtifactIds?: string[]
  timestamp: Date
  read: boolean
}
```

#### Step 0.4 — Create `workflowStore`

**File:** `src/stores/workflowStore.ts`

Yjs-backed store following the same pattern as `taskStore`, `agentStore`, etc. Uses a Yjs `Y.Map` named `workflows`.

Functions:
- `createWorkflow(data)` → writes to Yjs map
- `updateWorkflow(id, partial)` → updates Yjs map entry
- `getWorkflowById(id)` → reads from Yjs map
- `useWorkflow(id)` → reactive hook via `useLiveMap` filtered by ID
- `useWorkflows()` → reactive hook for all workflows

**Tests first:** `src/test/stores/workflowStore.test.ts`

#### Step 0.5 — Create `mailboxStore`

**File:** `src/stores/mailboxStore.ts`

Yjs-backed store for `AgentMessage`. Uses a Yjs `Y.Map` named `agentMessages`.

Functions:
- `sendMessage(msg)` → writes to Yjs map
- `broadcastMessage(from, workflowId, recipients, content, type)` → writes N messages
- `getMessagesForAgent(agentId, workflowId)` → filter from Yjs map
- `getUnreadMessages(agentId, workflowId)` → filter unread
- `markRead(agentId, messageId)` → update
- `getMessagesByWorkflow(workflowId)` → all messages for a workflow (for the trace UI)
- `useWorkflowMessages(workflowId)` → reactive hook

**Tests first:** `src/test/stores/mailboxStore.test.ts`

#### Step 0.6 — Register Yjs Maps

**File:** `src/lib/yjs/maps.ts` (or wherever Yjs maps are declared)

Register the new `workflows` and `agentMessages` Y.Maps so they are automatically persisted to IndexedDB and synced via P2P.

---

### Phase 1 — Core Data Model Hardening

> Goal: Wire the new types/stores into the existing orchestration engine without changing behavior. The engine produces `Workflow` records and uses `claimed` status.

#### Step 1.1 — `orchestrate()` Creates and Updates Workflow

**File:** `src/lib/orchestrator/engine.ts`

**What to do:**
- At the start of `orchestrate()`, create a `Workflow` record via `workflowStore.createWorkflow()`.
- Set initial status to `'analyzing'`.
- As the engine progresses through phases (analyzing → decomposing → recruiting → executing → validating → synthesizing → completed), call `updateWorkflow()` with the new status, phase, and progress.
- On error, set status to `'failed'` with error message.
- On success, set status to `'completed'` with `completedAt`.
- Pass the `Workflow` object (or at least the `workflowId`) through to the strategy functions.

**Net effect:** Workflows become observable. The task page can subscribe and display real status.

**Tests:** Update `src/test/lib/orchestrator/engine.test.ts` to verify workflow creation and status transitions.

#### Step 1.2 — Use `claimed` Status in Task Store

**File:** `src/stores/taskStore.ts`

Add a `claimTask(taskId, agentId)` function:
1. Check task status is `'pending'`
2. Atomically set status to `'claimed'`, `assignedAgentId` to the agent, `assignedAt` to now
3. Return success/failure

Add an `unclaimTask(taskId)` function:
1. Check task status is `'claimed'`
2. Set status back to `'pending'`, clear `assignedAgentId`

**File:** `src/lib/orchestrator/engine.ts`

Update `executeMultiAgent()` and `executeAgentTeam()` to:
1. Set sub-task status to `'claimed'` (via `claimTask()`) before starting execution
2. Set status to `'in_progress'` only after the agent actually starts producing output
3. On failure, the status should go to `'failed'` (not back to `'pending'` for now — that's Part of G10 retry).

**Tests:** `src/test/stores/taskStore.test.ts` — test claim/unclaim transitions.

#### Step 1.3 — Forward Activated Skills to Orchestration

**File:** `src/lib/chat.ts`

When `submitChat()` triggers orchestration (the `isDevsOrchestrator` branch), forward `activatedSkills` to `WorkflowOrchestrator.orchestrateTask()`.

**File:** `src/lib/orchestrator/index.ts`

Update the `WorkflowOrchestrator.orchestrateTask()` facade to accept an optional `activatedSkills` parameter and pass it through to `orchestrate()`.

**File:** `src/lib/orchestrator/engine.ts`

Add `activatedSkills` to `OrchestrationOptions`. Thread it through to `executeSingleAgent()`, `executeMultiAgent()`, `executeAgentTeam()`. In each, pass the activated skills to `runAgent()` / `runAgentSingleShot()` so they are included in the system prompt.

**File:** `src/lib/orchestrator/agent-runner.ts`

Update `buildSystemPrompt()` to accept optional `activatedSkills` and inject their content into the prompt alongside the existing `skillInstructions`.

**Tests:** Verify in `agent-runner.test.ts` that activated skills appear in generated system prompt.

#### Step 1.4 — Make Task Decomposer Tool-Aware

**File:** `src/lib/orchestrator/task-decomposer.ts`

Update the `DECOMPOSITION_PROMPT` to include a section listing available tools and active connectors. Before calling the LLM, call `collectTools()` (or a lighter version that just returns tool names + descriptions) and append them to the prompt:

```
## Available Tools & Connectors
The agents executing these sub-tasks have access to these tools:
{toolList}

Consider whether any sub-task can be simplified or enhanced by using these tools.
```

Also include active connector names so the LLM knows e.g. "Google Drive is connected — you can include a sub-task that fetches documents from it."

**Tests:** `src/test/lib/orchestrator/task-decomposer.test.ts` — verify tool list is injected into decomposition prompt.

#### Step 1.5 — Give Synthesis and Validation Tool Access

**File:** `src/lib/orchestrator/synthesis-engine.ts`

Update `synthesizeResults()` to optionally accept tool definitions and pass them via `config.tools` to `LLMService.chat()`. The synthesis agent can then call tools if needed (e.g., to verify facts or compute).

**File:** `src/lib/orchestrator/engine.ts`

Update `validateTaskCompletion()` to use `runAgent()` (iterative mode) instead of raw `LLMService.streamChat()`. This gives the validator agent full tool access via the standard agentic loop.

**Tests:** Update synthesis and validation tests.

---

### Phase 2 — Service Recovery & Resumption

> Goal: When the user opens DEVS and there are interrupted orchestrations, the system detects them and either resumes or cleans up gracefully.

#### Step 2.1 — Orphan Detection on App Init

**File:** New `src/lib/orchestrator/recovery.ts`

Create a `recoverOrphanedWorkflows()` function that runs once on app initialization (call from wherever Yjs sync completes — likely near where `useSyncReady` becomes true):

1. **Query all workflows** from `workflowStore` where `status` is NOT `'completed'`, `'failed'`, or `'interrupted'`.
2. **For each active workflow**, check if there is a corresponding entry in `runningOrchestrations` (there won't be, because the page was refreshed).
3. **Classify each:**
   - If `status === 'analyzing'` or `'decomposing'` → no sub-tasks yet, safe to **restart from scratch**.
   - If `status === 'recruiting'` or `'executing'` → sub-tasks exist, some may be completed. Candidate for **partial resume**.
   - If `status === 'validating'` or `'synthesizing'` → all sub-tasks should be done. Candidate for **re-run just validation/synthesis**.
4. **For each sub-task** of an interrupted workflow:
   - If `status === 'completed'` → leave it, its artifact is persisted.
   - If `status === 'claimed'` or `'in_progress'` → reset to `'pending'` (the agent's work was lost mid-stream).
   - If `status === 'failed'` → leave it (it was already failed before interruption).
5. **Mark the workflow** as `'interrupted'` and store the recovery classification.

**Tests first:** `src/test/lib/orchestrator/recovery.test.ts` — test classification logic with mock workflow/task states.

#### Step 2.2 — Recovery UI in Task Page

**File:** `src/pages/Tasks/show.tsx`

When the task page loads and detects the associated workflow has `status === 'interrupted'`:

1. Show a **recovery banner** (similar to `TaskStatusBanner`) with message: "This task was interrupted. Would you like to resume?"
2. **Resume button:** Calls a new `resumeWorkflow(workflowId)` function.
3. **Discard button:** Marks the workflow as `'failed'` and all `'pending'`/`'claimed'` sub-tasks as `'failed'`.

This keeps the user in control — no silent auto-resume that might burn LLM tokens unexpectedly.

#### Step 2.3 — Resume Logic

**File:** `src/lib/orchestrator/recovery.ts`

`resumeWorkflow(workflowId)` function:

1. Load the workflow and its root task.
2. Load all sub-tasks.
3. Determine which sub-tasks are `'completed'` (have artifacts) and which are `'pending'` (need re-execution).
4. Call `orchestrate()` with a new option: `{ resume: true, existingTaskId: rootTask.id }`. The engine should:
   - Skip task analysis and decomposition (sub-tasks already exist).
   - Skip already-completed sub-tasks.
   - Re-execute only `'pending'` sub-tasks, preserving dependency outputs from the completed ones.
   - Run synthesis if all sub-tasks are now complete.

**Key insight:** Because tasks, conversations, and artifacts are in Yjs, the completed sub-tasks' outputs are already available. The engine just needs to read `ArtifactManager.getArtifactsByTask(subTaskId)` to get dependency outputs for pending sub-tasks.

**File:** `src/lib/orchestrator/engine.ts`

Add a `resumeExecution()` strategy (or an `isResume` branch within `executeMultiAgent()` / `executeAgentTeam()`) that:
- Reads existing sub-tasks from the task store instead of creating new ones.
- Builds the dependency graph from existing sub-tasks.
- Skips sub-tasks with `status === 'completed'`.
- Executes remaining sub-tasks normally.

**Tests:** `src/test/lib/orchestrator/recovery.test.ts` — test resume with various combinations of completed/pending sub-tasks.

#### Step 2.4 — Startup Hook

**File:** `src/app/` (wherever the app initializes after Yjs sync — likely a top-level provider or effect)

After Yjs sync is ready, call `recoverOrphanedWorkflows()` once. This populates the recovery state that the task page can react to.

Alternatively, the task page itself can run detection for its specific workflow on mount (simpler, no global hook needed).

---

### Phase 3 — Agent Teams Maturation

> Goal: Move from orchestrator-driven team execution to genuine self-organizing agent teams with persistent communication.

#### Step 3.1 — Wire `mailboxStore` into `TeamCoordinator`

**File:** `src/lib/orchestrator/team-coordinator.ts`

Replace the in-memory `TeamMailbox` usage with calls to `mailboxStore`:
- `coordinator.sendMessage()` → `mailboxStore.sendMessage()`
- `coordinator.broadcast()` → `mailboxStore.broadcastMessage()`
- Reading unread messages → `mailboxStore.getUnreadMessages()`

The `TeamMailbox` class can remain as a thin wrapper that delegates to the store, or be removed entirely.

**Net effect:** Messages survive page refresh and are visible to the UI.

#### Step 3.2 — Typed Messages

**File:** `src/lib/orchestrator/engine.ts` (inside `executeAgentTeam()`)

When an agent completes a task and broadcasts, set the message type to `'finding'` (not just a plain string). When the agent encounters an issue, send a `'status'` message.

Extend the agent-runner to emit typed messages during execution:
- After each agentic loop turn that produces a tool result, optionally broadcast a `'finding'` to the team.
- When the agent encounters an error, send a `'status'` message.

This can be progressive — start with `finding` and `status`, add `question`/`decision`/`handoff`/`review` as specific use cases are built.

#### Step 3.3 — Inject Mailbox Context into Agent Execution

**File:** `src/lib/orchestrator/agent-runner.ts`

Update `buildSystemPrompt()` to accept a `teamMessages` parameter. When provided, append the relevant messages to the system prompt under a `## Team Communication` section. This gives each agent awareness of what others have discovered.

The engine's execution loop should fetch unread messages from `mailboxStore` before each agent execution and pass them through.

#### Step 3.4 — Tier Selection in TaskAnalyzer

**File:** `src/lib/task-analyzer.ts`

Extend the analysis prompt to ask the LLM for a tier recommendation:

```json
{
  "complexity": "simple | complex",
  "tier": 0 | 1 | 2,
  "tierReason": "string"
}
```

Update `TaskAnalysisResult` type to include `tier` and `tierReason`.

**File:** `src/lib/orchestrator/engine.ts`

Replace the current routing logic:
```typescript
// Current:
if (teamDetection.isTeamRequest) → executeAgentTeam()
else if (analysis.complexity === 'simple') → executeSingleAgent()
else → executeMultiAgent()

// New:
if (analysis.tier === 0) → executeSingleAgent()
else if (analysis.tier === 1) → executeAgentTeam()
else if (analysis.tier === 2) → executeNestedTeam() // Phase 5
```

Keep `detectTeamFromPrompt()` as an override: if the user explicitly requests a team (keywords), force Tier 1+.

Remove `executeMultiAgent()` as a separate path — fold it into `executeAgentTeam()`. The multi-agent path is essentially Tier 1 without the mailbox and with orchestrator-driven assignment, which is just a less capable version of the team path.

#### Step 3.5 — Agent-Level Retry (G10)

**File:** `src/lib/orchestrator/agent-runner.ts`

Wrap the agentic loop in a retry layer:

```typescript
async function runAgentWithRetry(config, maxRetries = 2): Promise<AgentRunnerResult> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await runAgent(config)
    } catch (error) {
      if (attempt === maxRetries) throw error
      // Adjust prompt for retry
      config.prompt = `Previous attempt failed: ${error.message}. Please try again.\n\n${config.prompt}`
    }
  }
}
```

**Tests:** `src/test/lib/orchestrator/agent-runner.test.ts` — test retry behavior on transient errors.

#### Step 3.6 — Validation for All Execution Paths (G9)

**File:** `src/lib/orchestrator/engine.ts`

Extract `validateTaskCompletion()` and `createRefinementTask()` into a shared validation module (or just call them from all three strategy functions).

After synthesis completes in `executeAgentTeam()`:
1. Run `validateTaskCompletion(mainTask)`.
2. If validation fails and refinement count < 2, create refinement tasks and re-execute them.
3. Re-synthesize.

Same for the multi-agent path (which will be merged into agent-team by Step 3.4).

**Tests:** Test validation + refinement in multi-agent/team paths.

---

### Phase 4 — Live Progress Reporting

> Goal: The user should see a rich, real-time progress feed as orchestration runs. The design draws on primitives **already in the codebase** — no new rendering libraries needed. Every piece of content an agent produces should be visible the moment it exists.

#### Design Principles for Live Reporting

The task page becomes a **live activity feed** composed of these building blocks, stacked vertically in chronological order:

| Element | Existing Primitive | What it shows |
|---------|-------------------|---------------|
| **Text streaming** | `MarkdownRenderer` with `isStreaming={true}` | Token-by-token LLM output rendered as rich markdown (code blocks, math, tables) |
| **Task steps** | `ConversationStepTracker` + `AccordionTracker` | Expandable step list showing tool calls, inputs/outputs, status icons |
| **Thinking steps** | `ConversationStep.thinkingContent` + `ThinkBlock` in `MarkdownRenderer` | Collapsible `<think>` block content streamed during reasoning, rendered with a "Thinking…" / "Thoughts" toggle |
| **Todo items** | Sub-task list in `SubTasksSection` with `SubTaskStatusIcon` | Real-time checklist of decomposed sub-tasks with status: pending (○), claimed (◎), running (spinner), completed (✓), failed (✗) |
| **Artifacts** | `ArtifactCard` component | Cards appearing inline as artifacts are created, with type badge, description, and expandable content preview |
| **Agent team** | New lightweight component | Compact row of agent chips showing who's working, who's idle, and who's done |

#### Step 4.1 — Enrich Orchestration Events

**File:** `src/lib/orchestrator/events.ts`

The existing event types are a good start but need extensions for richer live reporting:

1. **Add `AgentThinkingEvent`** — Emitted when the agent-runner encounters a `<think>` block during streaming:
   ```typescript
   interface AgentThinkingEvent {
     type: 'agent-thinking'
     taskId: string
     agentId: string
     thinkingContent: string // accumulated thinking text
     workflowId: string
   }
   ```

2. **Add `ArtifactCreatedEvent`** — Emitted by `ArtifactManager` when an artifact is written:
   ```typescript
   interface ArtifactCreatedEvent {
     type: 'artifact-created'
     taskId: string
     agentId: string
     artifactId: string
     artifactType: string
     description: string
     workflowId: string
   }
   ```

3. **Add `TaskStatusChangeEvent`** — Emitted when any sub-task changes status (claimed, in_progress, completed, failed):
   ```typescript
   interface TaskStatusChangeEvent {
     type: 'task-status-change'
     taskId: string
     previousStatus: string
     newStatus: string
     agentId?: string
     workflowId: string
   }
   ```

4. **Extend `PhaseChangeEvent`** — Already exists. Ensure the engine emits it at every transition (analyzing → decomposing → recruiting → executing → validating → synthesizing → completed) with meaningful `message` strings.

**File:** `src/lib/orchestrator/agent-runner.ts`

Emit `agent-thinking` events when `<think>` blocks are detected during streaming. The content parser already extracts these — hook into the streaming callback.

**File:** `src/lib/orchestrator/engine.ts`

Emit `task-status-change` events from every place that calls `taskStore.updateTask()` with a new status.

**Tests:** Unit tests for event emission in agent-runner and engine.

#### Step 4.2 — Extend `useOrchestrationStreaming` Hook

**File:** `src/hooks/useOrchestrationStreaming.ts`

The hook currently tracks only `SubTaskStreamingState` (content + isStreaming per task). Extend it to provide a richer picture:

1. **Add thinking state** to `SubTaskStreamingState`:
   ```typescript
   interface SubTaskStreamingState {
     // ... existing fields ...
     thinkingContent?: string       // accumulated <think> block
     isThinking?: boolean           // agent is in a reasoning phase
   }
   ```
   Subscribe to `agent-thinking` events and update the map.

2. **Add a workflow-level progress stream** — a separate state object (not per-task):
   ```typescript
   interface WorkflowProgressState {
     phase: string
     phaseMessage: string
     progress: number // 0-100
     activeAgents: { agentId: string; agentName: string; taskId: string }[]
     recentArtifacts: { artifactId: string; type: string; description: string }[]
   }
   ```
   Subscribe to `phase-change`, `agent-start`, `agent-complete`, and `artifact-created` events.

3. Return both: `{ streamingMap, workflowProgress }`.

**Tests:** `src/test/hooks/useOrchestrationStreaming.test.ts`

#### Step 4.3 — Live Sub-Task Checklist (Todo Items)

**File:** `src/pages/Tasks/components/SubTasksSection.tsx`

This component already exists and works well. Enhancements:

1. **Live status updates via events** — Currently, sub-task status comes from the Yjs store (which updates slightly after the engine writes). For snappier feedback, merge `streamingMap` states with task store status:
   - If `streamingMap.has(taskId)` and `isStreaming === true` → show as "running" regardless of store status.
   - If a `task-status-change` event fired for `'claimed'` → show the new "claimed" icon (filled circle or pulsing dot).

2. **Progress fraction** — Show `3/7 completed` inline with the "Sub-Tasks" header. Already partially present as chip counts; make it always visible.

3. **Auto-expand active** — The `AccordionTracker` should auto-expand items that are currently streaming and auto-collapse items that have completed (unless the user manually toggled them).

**No new component needed.** This is a refinement of the existing `SubTasksSection`.

#### Step 4.4 — Streaming Markdown with Thinking Blocks

**File:** `src/pages/Tasks/components/SubTaskConversation.tsx`

This component already renders a streaming `MessageBubble` for the active sub-task. Enhancements:

1. **Pass thinking content through** — The `SubTaskStreamingState` will now carry `thinkingContent`. Create a synthetic `ConversationStep` for thinking and pass it to `MessageBubble.liveSteps`:
   ```typescript
   const liveSteps: ConversationStep[] = []
   if (streaming?.isThinking) {
     liveSteps.push({
       id: 'thinking',
       icon: 'Sparks',
       i18nKey: 'Thinking…',
       status: 'running',
       startedAt: Date.now(),
       thinkingContent: streaming.thinkingContent,
     })
   }
   ```
   The existing `ConversationStepTracker` already renders `thinkingContent` inside a collapsible block. No changes needed to the step tracker itself.

2. **Tool call steps** — The existing `agent-tool-call` event is emitted but not consumed in the streaming hook. Subscribe to it and push `PendingToolCall` data into the streaming state so `ConversationStepTracker` can show live tool execution (loading state + tool name + input params).

3. **Markdown rendering** — `MessageContent` already uses `MarkdownRenderer` with `isStreaming` support. No changes needed. Content streams in token-by-token and renders as rich markdown with code blocks, math, and even specialized widgets.

**This requires no new component.** The existing `SubTaskConversation` → `MessageBubble` → `MessageContent` → `MarkdownRenderer` chain already handles streaming markdown perfectly. The only change is feeding richer data (thinking + tool steps) from the hook.

#### Step 4.5 — Inline Artifact Notifications

**File:** `src/pages/Tasks/components/SubTasksSection.tsx`

When an `artifact-created` event fires for a sub-task:

1. Immediately render an `ArtifactCard` in the sub-task's expanded content area (the `subArtifacts` section already exists).
2. Show a brief "pulse" animation on the card to draw attention (CSS animation, no library needed).

The artifacts are already rendered by `SubTasksSection` from `allArtifacts.filter(a => a.taskId === subTask.id)`. Since `allArtifacts` comes from a Yjs-backed store, the card appears automatically when the artifact is written. The event just enables an entry animation.

**Optional enhancement:** Add a lightweight "Artifact created: {description}" entry to the activity feed (see Step 4.8).

#### Step 4.6 — Agent Team Bar

**File:** New `src/pages/Tasks/components/AgentTeamBar.tsx`

A simple, compact component showing the team of agents working on this workflow. Renders as a horizontal row of agent chips/avatars:

```
[🤖 Analyst ✓] [🔬 Researcher ⏳] [✍️ Writer ○] [📋 Reviewer ○]
```

Each chip shows:
- Agent icon (from `agent.icon`) + name
- Status indicator: idle (○), working (spinner), done (✓), failed (✗)

**Data source:** `workflowProgress.activeAgents` from the extended hook (Step 4.2), combined with the full `participatingAgentIds` list from the `Workflow` entity (Phase 0).

**Positioning:** Rendered right below the `WorkflowHeader` (Step 4.7) and above the sub-task list. Should be sticky or always-visible.

This is intentionally **very simple** — just chips in a row, not a full org chart. The goal is awareness ("who's on this?"), not visualization.

#### Step 4.7 — Workflow Header Component

**File:** New `src/pages/Tasks/components/WorkflowHeader.tsx`

Reactive component subscribing to `useWorkflow(workflowId)`:
- **Tier badge:** `Chip` with Tier 0 / Tier 1 / Tier 2
- **Status pill:** Color-coded `Chip` (analyzing → blue, executing → yellow, completed → green, failed → red, interrupted → orange)
- **Phase message:** Human-readable text from `workflow.phase` (e.g., "Decomposing task into sub-tasks…", "3 agents executing in parallel…")
- **Progress bar:** HeroUI `Progress` component driven by `workflow.progress` (0-100)
- **Duration:** Elapsed time ticker from `workflow.createdAt` (live updates via `setInterval`)
- **Token/cost estimate:** From `workflow.totalTurnsUsed` (optional, can be added later)

Wire into `show.tsx` to replace the current `TaskStatusBanner`.

#### Step 4.8 — Progress Wiring from Engine to UI

**File:** `src/pages/Tasks/show.tsx`

The current `orchestrateTask()` call doesn't pass `onProgress`. Fix:

```typescript
await WorkflowOrchestrator.orchestrateTask(task.description, task.id, {
  onProgress: (update) => {
    setOrchestrationProgress(update.progress)
    // Workflow store is updated automatically by the engine (Step 1.1)
  }
})
```

Update `WorkflowOrchestrator.orchestrateTask()` facade in `index.ts` to accept and forward options.

Also subscribe to `phase-change` events from `useOrchestrationStreaming` and update a `currentPhase` state for display in the `WorkflowHeader`.

#### Step 4.9 — Communication Trace Timeline

**File:** New `src/pages/Tasks/components/CommunicationTrace.tsx`

Depends on Phase 3 (Yjs-backed mailbox). Reactive component subscribing to `useWorkflowMessages(workflowId)` from `mailboxStore`:
- Timestamped list of `AgentMessage` entries, styled like a compact group chat.
- Each message shows: sender agent name chip, recipient (or "broadcast" badge), message type badge (`finding` = blue, `decision` = purple, `question` = yellow, `status` = gray, `handoff` = orange, `review` = green), content.
- Auto-scrolls to latest.
- Collapsible panel (collapsed by default, expanded when messages exist during streaming).

Wire into `show.tsx` between the sub-tasks section and the conversation timeline.

#### Step 4.10 — Requirement Validation Indicators

**File:** `src/pages/Tasks/components/SubTasksSection.tsx`

The `Requirement` type already has `validationStatus: 'satisfied' | 'pending' | 'failed'` and `satisfiedAt`. Requirements are already rendered as `AccordionItem` entries with `SubTaskStatusIcon`. Enhancement:

- Add color-coded chips: green (`satisfied`), yellow (`pending`), red (`failed`).
- Show `evidence` content in the expanded accordion body when available.
- Animate status change when validation completes (green flash on satisfaction, red shake on failure).

#### Step 4.11 — Recovery Banner

**File:** New `src/pages/Tasks/components/RecoveryBanner.tsx`

Shown when `workflow.status === 'interrupted'`. A prominent alert-style banner:
- Icon (⚠️ warning) + message: "This orchestration was interrupted. {N} of {M} sub-tasks completed."
- **Resume button** → calls `resumeWorkflow(workflowId)` (Phase 2).
- **Discard button** → marks workflow as failed, all pending sub-tasks as failed.
- Shows a summary of what was completed vs what needs re-execution.

#### Summary: Reuse Map

| Need | Existing Component | Change Required |
|------|-------------------|-----------------|
| Streaming markdown | `MarkdownRenderer` | None — already supports `isStreaming` with throttled re-parsing |
| Thinking blocks | `MarkdownRenderer` (ThinkBlock) + `ConversationStepTracker` (thinkingContent) | Feed thinking data from new `agent-thinking` event into streaming hook |
| Task steps with tool I/O | `ConversationStepTracker` + `AccordionTracker` | Feed tool call data from `agent-tool-call` event into streaming hook |
| Todo items (sub-task checklist) | `SubTasksSection` + `SubTaskStatusIcon` + `AccordionTracker` | Minor: merge streaming state with store state for snappier UI |
| Artifacts | `ArtifactCard` | None — already rendered reactively from Yjs store |
| Agent team display | **New** `AgentTeamBar` | Simple chip row, ~50 lines |
| Workflow header | **New** `WorkflowHeader` | Standard HeroUI components |
| Communication trace | **New** `CommunicationTrace` | Depends on Phase 3 mailbox |
| Recovery banner | **New** `RecoveryBanner` | Depends on Phase 2 recovery |

**Net new components:** 4 small ones. **Everything else is wiring existing primitives to richer event data.**

---

### Phase 5 — Nested Teams (Tier 2)

> Goal: Enable recursive delegation where a sub-task lead spawns its own child team.

#### Step 5.1 — Child Workflow Creation

**File:** `src/lib/orchestrator/engine.ts`

New function `executeNestedTeam()` (or extend `executeAgentTeam()`):
- When the task decomposer flags a sub-task as `complexity: 'complex'`, instead of assigning a single agent, create a **child workflow** for that sub-task.
- The child workflow runs its own `orchestrate()` call with the sub-task description and a `parentWorkflowId` reference.
- The parent workflow tracks the child's `workflowId` on the sub-task.
- The parent waits for the child workflow to complete before considering the dependency satisfied.

**Key constraint:** All sub-workflows share the same root `workflowId` for conversation/message aggregation, OR the task page aggregates across the workflow tree.

#### Step 5.2 — Scope Inheritance

Child teams inherit the parent's `AgentScope` with optional overrides:
- If the parent workflow has a budget or model constraint, child teams inherit it.
- The child can restrict further (read-only for review sub-teams) but can't escalate.

#### Step 5.3 — Nested Task Tree UI

**File:** `src/pages/Tasks/components/SubTasksSection.tsx`

Update to recursively render sub-tasks that themselves have sub-tasks (based on `parentTaskId` relationships). Show indentation or collapsible nesting.

**Tests:** Component test with nested task data.

---

### Phase 6 — Background Automation

> Goal: Enable fire-and-forget orchestration and scheduled/recurring tasks.

#### Step 6.1 — Persist TaskQueue to Yjs

**File:** `src/lib/orchestrator/task-queue.ts`

Replace the in-memory `Map` with a Yjs-backed map (`queuedTasks` Y.Map). This way the queue survives page refresh and can be resumed.

#### Step 6.2 — Service Worker Orchestration Bridge

**File:** `public/sw.js` (or a new worker module)

For true background execution:
- The main thread enqueues a task via `submitBackground()`.
- On next Service Worker activation (or via messaging), the SW reads the queue from IndexedDB.
- The SW executes orchestration using the same engine code (bundled for worker context).
- Results are written back to Yjs / IndexedDB.

**Note:** This is the most architecturally complex step and may require Vite build configuration for worker bundling. Consider using Web Workers as an intermediate step (simpler, but requires the tab to stay open).

#### Step 6.3 — Scheduling Engine

**File:** New `src/lib/orchestrator/scheduler.ts`

- On app init, scan all tasks with `scheduledAt` in the future or `recurrence` set.
- Use `setTimeout` / `setInterval` (or a lightweight cron parser) to enqueue tasks at the right time.
- For recurring tasks: after completion, compute next `scheduledAt` from the cron expression and create the next task.

**Note:** This only works while the app is open. True background scheduling requires the Service Worker bridge from Step 6.2.

#### Step 6.4 — Human-in-the-Loop Gates

**File:** `src/lib/orchestrator/engine.ts`

At decision points (before execution starts, before synthesis), check a `requiresApproval` flag on the workflow. If set:
1. Update workflow status to `'awaiting_approval'`.
2. Emit an event.
3. The UI shows an approval prompt.
4. Resume only after user approval.

For background/automated mode, a policy can auto-approve:
```typescript
if (workflow.autoApprovePolicy === 'always') approve()
else if (workflow.autoApprovePolicy === 'confidence_threshold' && analysis.confidence > 0.8) approve()
else await waitForUserApproval()
```

---

## File Reference Map

Quick reference for which existing files are touched by each phase.

| File | Phase 0 | Phase 1 | Phase 2 | Phase 3 | Phase 4 | Phase 5 | Phase 6 |
|------|:-------:|:-------:|:-------:|:-------:|:-------:|:-------:|:-------:|
| `src/types/index.ts` | ✏️ | | | ✏️ | | | |
| `src/stores/workflowStore.ts` | 🆕 | | | | | | |
| `src/stores/mailboxStore.ts` | 🆕 | | | | | | |
| `src/lib/yjs/maps.ts` | ✏️ | | | | | | |
| `src/lib/orchestrator/engine.ts` | | ✏️ | ✏️ | ✏️ | ✏️ | ✏️ | ✏️ |
| `src/lib/orchestrator/events.ts` | | | | | ✏️ | | |
| `src/lib/orchestrator/index.ts` | | ✏️ | | | ✏️ | | |
| `src/lib/orchestrator/agent-runner.ts` | | ✏️ | | ✏️ | ✏️ | | |
| `src/lib/orchestrator/task-decomposer.ts` | | ✏️ | | | | | |
| `src/lib/orchestrator/synthesis-engine.ts` | | ✏️ | | | | | |
| `src/lib/orchestrator/team-coordinator.ts` | | | | ✏️ | | | |
| `src/lib/orchestrator/recovery.ts` | | | 🆕 | | | | |
| `src/lib/orchestrator/task-queue.ts` | | | | | | | ✏️ |
| `src/lib/orchestrator/scheduler.ts` | | | | | | | 🆕 |
| `src/lib/task-analyzer.ts` | | | | ✏️ | | | |
| `src/lib/chat.ts` | | ✏️ | | | | | |
| `src/stores/taskStore.ts` | | ✏️ | | | | | |
| `src/hooks/useOrchestrationStreaming.ts` | | | | | ✏️ | | |
| `src/pages/Tasks/show.tsx` | | | ✏️ | | ✏️ | | |
| `src/pages/Tasks/components/WorkflowHeader.tsx` | | | | | 🆕 | | |
| `src/pages/Tasks/components/AgentTeamBar.tsx` | | | | | 🆕 | | |
| `src/pages/Tasks/components/CommunicationTrace.tsx` | | | | | 🆕 | | |
| `src/pages/Tasks/components/RecoveryBanner.tsx` | | | | | 🆕 | | |
| `src/pages/Tasks/components/SubTasksSection.tsx` | | | | | ✏️ | ✏️ | |
| `src/pages/Tasks/components/SubTaskConversation.tsx` | | | | | ✏️ | | |
| `public/sw.js` | | | | | | | ✏️ |

Legend: 🆕 = new file, ✏️ = modify existing

---

_This document is the implementation roadmap for closing the gaps between ORCHESTRATION.md and the current codebase. It should be treated as a living reference — update it as phases are completed._
