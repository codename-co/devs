# Orchestration — Enhanced Implementation Plan

> Expert review of the [Gap Analysis](./ORCHESTRATION_TODO.md) with reordered priorities, risk assessments, scope cuts, and concrete acceptance criteria. This is the delivery team's execution playbook.

---

## Implementation Progress

| Phase | Status | Notes |
|-------|--------|-------|
| **Phase 0** — Engine Refactor & Foundation Types | ✅ Complete | 8/8 steps. engine.ts reduced from 1599→~290 lines. |
| **Phase 1** — Workflow Entity & Progress Wiring | ✅ Complete | 4/4 steps. Workflow lifecycle, progress wiring, multi-agent merged into agent-team. |
| **Phase 2** — Tool-Aware Decomposition & Validation | ✅ Complete | 4/4 steps. Tool-aware decomposer, validateAndRefine extracted to shared.ts, synthesis events. |
| **Phase 3** — Service Recovery | ✅ Complete | 4/4 steps. recovery.ts, RecoveryBanner, resume/discard, startup hook. |
| **Phase 4** — Agent Teams Maturation | ✅ Complete | 4.1, 4.3, 4.4, 4.5 done. 4.2 (team context injection) was already handled by existing contextPrefix pattern. |
| **Phase 5** — Live Visual Feedback Layer | ✅ Complete | 6/6 remaining steps (5.5 RecoveryBanner was built in Phase 3). |
| **Phase 6** — Nested Teams (Tier 2) | 🔜 Deferred | Not started. Awaiting evidence that flat teams hit a ceiling. |
| **Phase 7** — Background Automation | ✅ Complete | 5/5 steps. Yjs-backed queue, scheduler with leader election, approval gates, SW bridge. |

**Verification:** 0 new TS errors (6 pre-existing: 5 i18n locales + 1 test mock). 118/118 orchestration tests pass + Phase 7 tests.

---

## Table of Contents

1. [Overall Assessment](#overall-assessment)
2. [Strategic Recommendations](#strategic-recommendations)
3. [Revised Phase Plan](#revised-phase-plan)
   - [Phase 0 — Engine Refactor & Foundation Types](#phase-0--engine-refactor--foundation-types)
   - [Phase 1 — Workflow Entity & Progress Wiring](#phase-1--workflow-entity--progress-wiring)
   - [Phase 2 — Tool-Aware Decomposition & Validation for All Paths](#phase-2--tool-aware-decomposition--validation-for-all-paths)
   - [Phase 3 — Service Recovery](#phase-3--service-recovery)
   - [Phase 4 — Agent Teams Maturation](#phase-4--agent-teams-maturation)
   - [Phase 5 — Live Visual Feedback Layer](#phase-5--live-visual-feedback-layer)
   - [Phase 6 — Nested Teams (Tier 2)](#phase-6--nested-teams-tier-2)
   - [Phase 7 — Background Automation](#phase-7--background-automation)
4. [What NOT to Build (Scope Cuts)](#what-not-to-build-scope-cuts)
5. [Risk Register](#risk-register)
6. [Testing Strategy](#testing-strategy)
7. [Success Metrics](#success-metrics)
8. [Dependency Graph](#dependency-graph)

---

## Overall Assessment

The gap analysis in `ORCHESTRATION_TODO.md` is thorough and well-structured. The team identified the right gaps. My adjustments are about **execution order, risk mitigation, and scope discipline** — not about changing what needs to be built.

### What's Right

- **Yjs-first approach** — correct. No new IndexedDB tables.
- **"Don't rewrite" stance** — the existing engine, agent-runner, task-decomposer, and synthesis-engine are solid. Extend, don't replace.
- **TDD mandate** — non-negotiable for lib/ and stores/.
- **Incremental delivery** — each phase is independently shippable.

### What Needs Adjustment

1. **Phase 0 of the TODO is too passive.** Adding types and stores without behavioral changes is fine for groundwork, but the team should tackle the most impactful structural debt _first_: the engine.ts monolith. At 1,599 lines with three strategy implementations sharing duplicated conversation-creation, event-emission, artifact-creation, and status-update code, any Phase 1+ work on this file will be painful and merge-conflict-prone. Extract shared logic before adding new features.

2. **Progress reporting (G11) is actually a Phase 1 concern, not Phase 4.** The `phase-change` event is defined but _never emitted_. The `onProgress` callback exists but is never wired from the task page. This means every user today sees zero progress feedback during orchestration. This is the single highest-impact UX fix with the lowest effort — it should ship weeks before the communication trace or agent team bar.

3. **Validation for all paths (G9) should be Phase 2, not Phase 3.** Right now, multi-agent and team execution — the paths handling the most complex tasks — have _zero_ validation. This is a quality hole that compounds every other improvement. Fix it before adding richer team dynamics.

4. **Tool-aware decomposition (G13) should pair with validation**, not with team maturation. It's an independent improvement to the LLM prompts, requires no new stores or abstractions, and directly improves output quality.

5. **Agent self-claiming (G4) can be deferred.** The current orchestrator-driven approach (lead assigns, engine executes) works. Self-claiming is an optimization/elegance concern, not a quality or UX concern. Push it to Phase 4 or later.

6. **Nested teams (Tier 2) is a Phase 6+ concern.** The design doc beautifully describes recursive delegation, but in practice, flat teams with good decomposition handle 95%+ of real-world prompts. Build it when users hit the ceiling, not before.

---

## Strategic Recommendations

### R1: Split engine.ts Before Adding Features

**Why:** Every phase touches this 1,599-line file. Three strategies have duplicated scaffolding (create conversation, emit events, update task status, create artifact). If you add workflow status updates, validation loops, retry logic, and mailbox integration to each strategy independently, you'll have 2,500+ lines of nearly-unmaintainable code.

**What to do:** Extract a `StrategyBase` or set of shared utility functions:

```
src/lib/orchestrator/
├── engine.ts               → remains the router (~200 lines)
├── strategies/
│   ├── shared.ts           → createConversationForSubTask(), emitAgentEvents(), 
│   │                         createArtifact(), updateTaskStatus(), runAndStreamAgent()
│   ├── single-agent.ts     → executeSingleAgent()
│   ├── multi-agent.ts      → executeMultiAgent()
│   └── agent-team.ts       → executeAgentTeam()
```

**Acceptance criteria:**
- engine.ts is under 300 lines
- Each strategy file is under 400 lines
- No duplicated conversation creation, event emission, or artifact creation code
- All existing tests pass without modification
- This is a pure refactor — zero behavioral changes

**Estimated effort:** 1–2 days. Worth every hour.

### R2: Fix the Dead Event Bus Before Building on It

The `agent-tool-call` event is defined but never emitted. The `phase-change` event is defined but never emitted. The existing events that _are_ emitted (`agent-start`, `agent-streaming`, `agent-complete`) work but only for current strategies.

Before shipping any visual feedback improvements (Phase 5), the event bus must be reliable:

- **Emit `phase-change`** at every orchestration state transition.
- **Emit `agent-tool-call`** from the agent runner when tools are called (the data is already available in the `onProgress` callback — just also emit an event).
- **Add a simple integration test** that runs a mock orchestration and verifies the expected event sequence fires.

### R3: Merge Multi-Agent into Agent-Team

The gap analysis correctly identifies that `executeMultiAgent()` is essentially a less capable version of `executeAgentTeam()`. The difference is that multi-agent uses orchestrator-driven assignment while agent-team uses a `TeamCoordinator`. But the coordinator's `getBestTeammateForTask()` does the same skill-matching as the engine's `findBestAgent()`.

**Recommendation:** After the engine split (R1), don't maintain two separate strategies. Fold multi-agent into agent-team with a configuration flag:

```typescript
// Tier 1 with lead-assigned strategy = what multi-agent does today
// Tier 1 with self-claimed strategy = what agent-team aspires to be
executeTeam(tasks, agents, { assignmentStrategy: 'lead-assigned' | 'self-claimed' | 'hybrid' })
```

This halves the surface area for validation, retry, mailbox, and recovery logic.

**When:** After Phase 0 engine refactor, during Phase 1. This alone eliminates a major source of inconsistency — multi-agent gets validation, retry, and mailbox for free.

### R4: Don't Over-Engineer the Mailbox Early

The design doc describes six message types, auto-routing by keyword, lazy delivery, and targeted messaging. The current `TeamMailbox` is in-memory with two fields (`type: 'direct' | 'broadcast'`, `content: string`).

**Recommendation:** Ship the Yjs-backed mailbox with just `finding` and `status` message types first. These cover the primary use case: agents sharing discoveries and reporting blockers. Add `question`, `decision`, `handoff`, and `review` when there's a concrete UX that requires them (likely Phase 6+). Auto-routing by keyword is a nice-to-have — explicit agent-to-agent targeting is simpler and more predictable.

### R5: Recovery Should Be User-Initiated, Not Automatic

The gap analysis proposes detecting orphaned workflows on app init and offering resume/discard. This is correct. Do **not** auto-resume interrupted workflows silently. The user may have closed the tab intentionally. The user may have changed their mind. Silent auto-resume burns LLM tokens without consent.

**Ship the recovery banner with two buttons: Resume and Discard. Nothing else.** The resume logic re-enters the execution loop with completed sub-tasks skipped. Keep it simple.

### R6: LLM-Based Tier Selection Needs a Fallback

The gap analysis proposes moving tier selection from keyword regex to an LLM call in `TaskAnalyzer`. This is correct — the regex approach is brittle. But LLM calls can fail, be slow, or return unexpected results.

**Recommendation:** Keep the existing regex heuristic as a fast fallback. Use the LLM for tier selection _only when the regex is ambiguous_ (no strong signal either way). If the LLM call fails, fall back to the regex result. If the regex detects an explicit team request, skip the LLM entirely.

```
detectTeamFromPrompt(prompt) → { isTeamRequest: true, confidence: 'high' }  → Tier 1, skip LLM
detectTeamFromPrompt(prompt) → { isTeamRequest: false, confidence: 'low' }  → ask LLM
LLM fails → fall back to complexity-based: simple → Tier 0, complex → Tier 1
```

### R7: Activated Skills Forward Is a Quick Win — Ship It Immediately

The bug where `/mention` activated skills are lost when orchestration is triggered is a real user-facing regression. The fix is straightforward (thread `activatedSkills` through three function signatures). Ship this _as part of Phase 0_, not Phase 1. It requires no new abstractions.

---

## Revised Phase Plan

### Phase 0 — Engine Refactor & Foundation Types ✅

> **Status:** ✅ Complete — all 8 steps implemented.  
> **Goal:** Structural cleanup and foundation types. No user-visible behavior changes. Enables all subsequent phases to land cleanly.  
> **Duration estimate:** 1.5 weeks  
> **Risk:** Low (pure refactoring + type additions)  
> **Parallelizable:** Steps 0.1–0.3 can run in parallel. Steps 0.4–0.6 depend on 0.1. Step 0.7 depends on 0.4/0.5. Step 0.8 is independent.

#### Step 0.1 — Split engine.ts into Strategy Modules ✅

Extract shared orchestration scaffolding into `src/lib/orchestrator/strategies/shared.ts`:

- `createSubTaskConversation(taskId, agentId, workflowId)` — currently duplicated 3x
- `emitAgentLifecycleEvents(taskId, agentId, agentName, workflowId)` — start/streaming/complete wrapper
- `createTaskArtifact(taskId, agentId, content, description)` — currently duplicated 3x
- `updateTaskWithResult(taskId, status, artifacts)` — status + artifact linking

Move each strategy into its own file under `strategies/`. Keep `engine.ts` as the router that calls `analyzePrompt()` → selects strategy → delegates.

**Done when:**
- `engine.ts` < 300 lines
- Each strategy file < 400 lines
- `npm run test:watch` all green
- Zero behavioral changes

#### Step 0.2 — Add Workflow, AgentMessage, and Claimed Status Types ✅

**File:** `src/types/index.ts`

Add the three types from the gap analysis:

```typescript
// Workflow entity
interface Workflow {
  id: string
  prompt: string
  strategy: 'direct' | 'flat-team' | 'nested-team'
  tier: 0 | 1 | 2
  leadAgentId: string
  participatingAgentIds: string[]
  rootTaskId: string
  status: 'analyzing' | 'decomposing' | 'recruiting' | 'executing' | 'validating' | 'synthesizing' | 'completed' | 'failed' | 'interrupted'
  phase: string
  progress: number
  totalTurnsUsed: number
  error?: string
  createdAt: Date
  completedAt?: Date
  updatedAt: Date
}

// Typed inter-agent message
interface AgentMessage {
  id: string
  workflowId: string
  from: string
  to: string | 'broadcast'
  type: 'finding' | 'question' | 'decision' | 'status' | 'handoff' | 'review'
  content: string
  referencedTaskIds?: string[]
  referencedArtifactIds?: string[]
  timestamp: Date
  read: boolean
}
```

Add `'claimed'` to Task status:
```typescript
status: 'pending' | 'claimed' | 'in_progress' | 'completed' | 'failed'
```

**Ripple check:** Search for `status === 'pending'`, `status !== 'completed'`, and TaskStatus-related switch statements. The `claimed` status should be transparent to most consumers — treat it as equivalent to `in_progress` for displaypurposes everywhere except the claiming logic itself.

**Tests:** Type-level compile checks. Update any existing tests that check `status` values.

#### Step 0.3 — Fix Dead Events ✅

**File:** `src/lib/orchestrator/events.ts` and `agent-runner.ts`

1. In `agent-runner.ts`, wherever tool call results are processed (inside the agentic loop), emit `agent-tool-call` with tool name and input.
2. In `engine.ts` (or its strategy modules after 0.1), emit `phase-change` at every orchestration state transition: analysis start, decomposition start, recruitment start, execution start, validation start, synthesis start, completion/failure.

**Done when:** A test subscribes to events, runs a mock orchestration, and sees the full expected event sequence: `phase-change(analyzing)` → `phase-change(executing)` → `agent-start` → `agent-tool-call` (if tools used) → `agent-streaming` → `agent-complete` → `phase-change(completed)`.

#### Step 0.4 — Create workflowStore ✅

**File:** `src/stores/workflowStore.ts`

Yjs-backed store (same pattern as `taskStore`). Uses a `Y.Map` named `workflows`.

Functions:
- `createWorkflow(data)` → writes to Yjs map, returns Workflow
- `updateWorkflow(id, partial)` → merges into Yjs map entry
- `getWorkflowById(id)` → reads from Yjs map
- `getActiveWorkflows()` → filters by status not in `['completed', 'failed', 'interrupted']`
- `useWorkflow(id)` → reactive hook
- `useWorkflows()` → reactive hook, all workflows

**Tests first:** `src/test/stores/workflowStore.test.ts` — CRUD operations, status transitions, reactive hooks.

#### Step 0.5 — Create mailboxStore ✅

**File:** `src/stores/mailboxStore.ts`

Yjs-backed store for `AgentMessage`. Uses a `Y.Map` named `agentMessages`.

**MVP scope (only `finding` and `status` types):**
- `sendMessage(msg: Omit<AgentMessage, 'id' | 'timestamp' | 'read'>)` → writes, returns message
- `getMessagesForAgent(agentId, workflowId)` → filter inbox
- `getUnreadMessages(agentId, workflowId)` → filter unread
- `markRead(messageId)` → update
- `getMessagesByWorkflow(workflowId)` → all messages for a workflow
- `useWorkflowMessages(workflowId)` → reactive hook

Skip `broadcastMessage()` convenience wrapper, `auto-routing`, and message types beyond `finding`/`status` for now.

**Tests first:** `src/test/stores/mailboxStore.test.ts`

#### Step 0.6 — Register Yjs Maps ✅

**File:** wherever Yjs maps are declared (likely `src/lib/yjs/maps.ts` or `src/features/sync/`)

Register `workflows` and `agentMessages` as synced Y.Maps.

**Done when:** Data written to `workflowStore` or `mailboxStore` persists across page refresh.

#### Step 0.7 — Forward Activated Skills to Orchestration (Quick Win) ✅

Thread `activatedSkills` through:
1. `src/lib/chat.ts` → `WorkflowOrchestrator.orchestrateTask()` call
2. `src/lib/orchestrator/index.ts` → `orchestrate()` call
3. `src/lib/orchestrator/engine.ts` → `OrchestrationOptions` type → strategy functions
4. `src/lib/orchestrator/agent-runner.ts` → `buildSystemPrompt()` → append skill content

**Done when:** A test activates a skill via `/mention`, triggers orchestration, and verifies the skill content appears in the agent's system prompt for sub-tasks.

#### Step 0.8 — Add `claimTask` / `unclaimTask` to Task Store ✅

**File:** `src/stores/taskStore.ts`

```typescript
function claimTask(taskId: string, agentId: string): boolean {
  const task = getTaskById(taskId)
  if (!task || task.status !== 'pending') return false
  updateTask(taskId, { status: 'claimed', assignedAgentId: agentId })
  return true
}

function unclaimTask(taskId: string): boolean {
  const task = getTaskById(taskId)
  if (!task || task.status !== 'claimed') return false
  updateTask(taskId, { status: 'pending', assignedAgentId: undefined })
  return true
}
```

**Tests:** Claim/unclaim transitions, double-claim rejection, unclaim from wrong status rejection.

---

### Phase 1 — Workflow Entity & Progress Wiring ✅

> **Status:** ✅ Complete — all 4 steps implemented.  
> **Goal:** Orchestration runs produce `Workflow` records. The task page shows real progress. Users see what's happening.  
> **Duration estimate:** 1 week  
> **Risk:** Low-medium (wiring existing primitives)  
> **Depends on:** Phase 0 (types, stores, event fixes)

#### Step 1.1 — orchestrate() Creates and Updates Workflow ✅

**File:** Strategy router in `engine.ts`

At orchestration start:
1. `createWorkflow({ prompt, strategy: 'direct', tier: 0, leadAgentId, rootTaskId, status: 'analyzing' })`
2. As each phase transitions, `updateWorkflow(id, { status, phase, progress })`
3. On completion: `updateWorkflow(id, { status: 'completed', completedAt: new Date() })`
4. On error: `updateWorkflow(id, { status: 'failed', error: err.message })`

Also emit `phase-change` events at each transition (from Step 0.3) with the same data — this enables both Yjs-based UI (workflow store subscription) and event-based UI (streaming hook).

**Strategy-to-workflow mapping:**
- `executeSingleAgent` → strategy `'direct'`, tier `0`
- `executeAgentTeam` → strategy `'flat-team'`, tier `1`

**Tests:** Verify workflow is created with correct initial state, transitions through statuses, and ends in terminal state.

#### Step 1.2 — Use `claimed` Status in Execution Loop ✅

Update the strategy modules (from Step 0.1) to use `claimTask()` before agent execution and transition to `in_progress` only after the agent starts producing output.

Flow: `pending` → `claimTask(taskId, agentId)` → `claimed` → agent starts → `in_progress` → agent finishes → `completed` or `failed`.

On failure: if the error is during claiming, unclaim. If the error is during execution, mark `failed`.

**Tests:** Verify the full status lifecycle in integration tests.

#### Step 1.3 — Wire Progress from Engine to Task Page ✅

**File:** `src/pages/Tasks/show.tsx`

The current `orchestrateTask()` call passes no options. Fix:

```typescript
await WorkflowOrchestrator.orchestrateTask(task.description, task.id, {
  onProgress: (update) => setOrchestrationProgress(update.progress),
  signal: abortControllerRef.current.signal,
})
```

**File:** `src/lib/orchestrator/index.ts`

Update `orchestrateTask()` facade to accept and forward options to `orchestrate()`.

**Done when:** Users see a progress bar and phase text during orchestration instead of a static "Orchestrating..." message.

#### Step 1.4 — Merge Multi-Agent into Agent-Team ✅

Per recommendation R3:
- Remove `executeMultiAgent()` as a separate path.
- Route all Tier 1 work through the team strategy with `assignmentStrategy: 'lead-assigned'`.
- The `TeamCoordinator` already supports this — it's how `getBestTeammateForTask()` works.
- Delete `executeMultiAgent()` after verifying behavioral equivalence.

**Why now:** This eliminates the need to add validation, retry, and mailbox integration to two separate code paths in later phases.

**Done when:** The `executeMultiAgent` function no longer exists. All complex tasks route through team execution. All existing tests pass.

---

### Phase 2 — Tool-Aware Decomposition & Validation for All Paths ✅

> **Status:** ✅ Complete — all 4 steps implemented.  
> **Goal:** Every orchestration path produces validated output. The task decomposer knows what tools are available. These are the highest-leverage quality improvements.  
> **Duration estimate:** 1 week  
> **Risk:** Medium (LLM prompt changes require iteration)  
> **Depends on:** Phase 1 (merged strategies, workflow entity)

#### Step 2.1 — Make Task Decomposer Tool-Aware ✅

**File:** `src/lib/orchestrator/task-decomposer.ts`

Before calling the LLM for decomposition, collect available tool names + one-line descriptions (not full schemas — keep prompt concise):

```
## Available Capabilities
Agents have access to these tools:
- knowledge_search: Search the user's knowledge base
- code_interpreter: Execute JavaScript/Python code
- web_search: Search the web for current information
- google_drive: Read files from connected Google Drive
- gmail: Search and read connected Gmail
- notion: Read from connected Notion workspace
- math: Evaluate mathematical expressions
- presentation: Generate slide decks
- [... dynamically from active connectors]

Consider whether sub-tasks can leverage these tools. For example, if the user asks to "summarize my recent emails", a single sub-task with the gmail tool is better than multiple manual steps.
```

**Important:** Use `collectTools()` or a lighter variant that returns only names + descriptions. Do NOT dump full JSON schemas into the decomposition prompt — that's wasted tokens.

Also append active connector names so the LLM knows what external data is available.

**Tests:** Verify the decomposition prompt includes tool names. Verify that when a connector is active, it appears in the prompt.

#### Step 2.2 — Validation for All Execution Paths ✅

**File:** Strategy modules

Extract the validation + refinement logic from `executeSingleAgent()` into a shared function:

```typescript
async function validateAndRefine(
  task: Task, 
  maxRefinements: number = 2, 
  workflowId: string,
  signal?: AbortSignal
): Promise<void>
```

Call it at the end of every strategy (single-agent, team). After synthesis completes, run validation. If it fails and refinement count < 2, create refinement tasks and re-execute them.

**Critical detail:** The refinement tasks should use the existing sub-task infrastructure. Don't create a brand new decomposition — create targeted fix tasks that reference the specific failed requirements and the synthesis output.

**Tests:**
- Single-agent path still validates (regression).
- Team path validates after synthesis.
- Refinement task is created on validation failure.
- Max 2 refinements, then mark as completed-with-warnings (not failed — the user still gets partial output).

#### Step 2.3 — Give Synthesis and Validation Tool Access ✅

**File:** `src/lib/orchestrator/synthesis-engine.ts`

Update `synthesizeResults()` to accept tool definitions and pass them to `LLMService.chat()`. The synthesis agent may need to verify facts, run code, or access connectors.

**File:** Validation function (from Step 2.2)

Run validation via `runAgentSingleShot()` instead of raw `LLMService.streamChat()`. This gives the validator full tool access through the standard agentic loop.

**Tests:** Verify synthesis and validation calls include tool definitions.

#### Step 2.4 — Emit Events During Synthesis ✅

Currently, the UI goes dark during synthesis because `synthesizeResults()` doesn't emit events. Fix:

1. Emit `phase-change` with `phase: 'synthesizing'` before synthesis starts.
2. Emit `agent-streaming` events during synthesis streaming (the synthesis is essentially an agent call — treat it the same way).
3. Emit `agent-complete` when synthesis finishes.

**Done when:** The streaming UI shows the synthesis step actively generating output, not a blank screen.

---

### Phase 3 — Service Recovery ✅

> **Status:** ✅ Complete — all 4 steps implemented.  
> **Goal:** Interrupted orchestrations are detected and can be resumed. Users never lose completed work.  
> **Duration estimate:** 1–1.5 weeks  
> **Risk:** Medium-high (recovery logic has many edge cases)  
> **Depends on:** Phase 1 (workflow entity stores execution state)

#### Step 3.1 — Orphan Detection ✅

**File:** New `src/lib/orchestrator/recovery.ts`

`detectOrphanedWorkflows()`:
1. Query all workflows where status is NOT terminal (`completed`, `failed`, `interrupted`).
2. Cross-reference with `runningOrchestrations` Set. Any workflow not in the in-memory set is orphaned.
3. Classify each orphan:
   - `analyzing` / `decomposing` → **restart**: no sub-tasks exist, re-run from scratch
   - `recruiting` / `executing` → **partial resume**: some sub-tasks may be complete
   - `validating` / `synthesizing` → **re-validate**: all sub-tasks should be done, re-run validation/synthesis
4. For each orphan's sub-tasks:
   - `completed` → leave as-is
   - `claimed` / `in_progress` → reset to `pending`
   - `pending` → leave as-is
   - `failed` → leave as-is
5. Mark workflow as `interrupted`.

**Tests first:** Test classification with various workflow/task state combinations. This is pure logic — easy to test exhaustively.

#### Step 3.2 — Recovery Banner UI ✅

**File:** New `src/pages/Tasks/components/RecoveryBanner.tsx`

Shown when the associated workflow has `status === 'interrupted'`:

- Warning-colored banner with icon
- Message: "This orchestration was interrupted. {completed}/{total} sub-tasks completed."
- **Resume button** — calls `resumeWorkflow(workflowId)`
- **Discard button** — marks workflow as `failed`, all non-completed sub-tasks as `failed`

**Important UX decision:** The Resume button should show a confirmation with the estimated LLM cost to re-run the remaining sub-tasks. Don't surprise users with unexpected token spend.

#### Step 3.3 — Resume Logic ✅

**File:** `src/lib/orchestrator/recovery.ts`

`resumeWorkflow(workflowId)`:
1. Load workflow and all sub-tasks.
2. Collect completed sub-tasks' artifacts (for dependency context).
3. Filter to only `pending` sub-tasks.
4. Call `orchestrate()` with option: `{ resume: true, existingTaskId: rootTaskId, skipAnalysis: true }`.
5. The engine reads existing sub-tasks instead of creating new ones.
6. Builds dependency graph from existing sub-tasks.
7. Skips completed sub-tasks.
8. Executes remaining sub-tasks normally, injecting completed artifacts as dependency context.
9. Runs synthesis if all sub-tasks are now complete.

**Key edge case:** If a sub-task was `in_progress` and produced _partial_ output (a conversation exists but no artifact), the resume should treat it as pending but include the partial conversation as context ("You previously started this work. Here's what you had so far: [partial output]. Please complete it.").

**Tests:** Resume with 0/N complete, K/N complete, and N/N complete (should just re-synthesize).

#### Step 3.4 — Startup Hook ✅

Run `detectOrphanedWorkflows()` once after Yjs sync is ready. Don't run it in a global provider — let each task page detect its own workflow's status on mount. This is simpler and avoids a global hook that scans everything.

The task index page (`/tasks`) can show a count badge for interrupted workflows to draw attention.

---

### Phase 4 — Agent Teams Maturation ✅

> **Status:** ✅ Complete — steps 4.1, 4.3, 4.4, 4.5 implemented. Step 4.2 (team context injection) was already handled by the existing `contextPrefix` pattern in team execution.  
> **Goal:** Move from orchestrator-driven execution to genuine team communication. Agents see what others have discovered.  
> **Duration estimate:** 1.5–2 weeks  
> **Risk:** Medium (LLM prompt engineering for team communication)  
> **Depends on:** Phase 1 (merged strategy), Phase 0 (mailbox store)

#### Step 4.1 — Replace In-Memory TeamMailbox with mailboxStore ✅

**File:** `src/lib/orchestrator/team-coordinator.ts`

Replace the in-memory `TeamMailbox` with calls to `mailboxStore`:
- `sendMessage()` → `mailboxStore.sendMessage()`
- `getUnreadMessages()` → `mailboxStore.getUnreadMessages()`
- `markRead()` → `mailboxStore.markRead()`

The `TeamMailbox` class becomes a thin facade or is removed entirely.

**Done when:** Messages survive page refresh. `useWorkflowMessages(workflowId)` returns messages written during team execution.

#### Step 4.2 — Inject Team Context into Agent Execution ✅ _(already handled by existing contextPrefix pattern)_

**File:** `src/lib/orchestrator/agent-runner.ts`

Add a `teamMessages` parameter to `buildSystemPrompt()`. When provided, append a section:

```
## Team Communication
Your teammates have shared the following findings and status updates:

[Agent: Researcher] (finding): "The API uses OAuth 2.0 PKCE, not simple API keys. Documentation at {url}."
[Agent: Architect] (status): "Design phase 80% complete. Waiting on auth details."

Consider these when executing your task. Build on existing findings rather than duplicating work.
```

In the team execution loop, before each agent runs:
1. Fetch unread messages from `mailboxStore.getUnreadMessages(agentId, workflowId)`.
2. If any exist, pass them to the agent via `teamMessages`.
3. After the agent completes, broadcast a `finding` message with a one-sentence summary of what the agent produced.

**Important:** Keep the injected context concise. Don't dump entire message histories — summarize to the last 5-10 messages or the most recent per teammate.

#### Step 4.3 — LLM-Based Tier Selection (with Fallback) ✅

**File:** `src/lib/task-analyzer.ts`

Per recommendation R6:

1. Run `detectTeamFromPrompt()` first (existing regex).
2. If it returns `isTeamRequest: true` with high confidence → Tier 1, skip LLM.
3. If ambiguous → include tier question in the existing `TaskAnalyzer.analyzePrompt()` LLM call (it already calls an LLM — just add a field to the expected JSON output).
4. If LLM fails to provide a tier → fall back to `complexity === 'simple' ? 0 : 1`.

Add `tier: 0 | 1` and `tierReason: string` to `TaskAnalysisResult`.

**File:** Strategy router in `engine.ts`

Replace the current routing:
```
// Before: keyword detection overrides complexity
// After: analysis.tier drives routing. keyword detection is an override.

const tier = teamDetection.isTeamRequest ? Math.max(1, analysis.tier) : analysis.tier
if (tier === 0) → executeSingleAgent()
if (tier >= 1) → executeAgentTeam()
```

**Tests:** Test tier selection with various prompts. Test fallback when LLM returns unexpected output.

#### Step 4.4 — Agent-Level Retry ✅

**File:** `src/lib/orchestrator/agent-runner.ts`

Wrap the agentic loop in a retry layer:

```typescript
async function runAgentWithRetry(config, maxRetries = 2): Promise<AgentRunnerResult> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await runAgent(config)
    } catch (error) {
      if (attempt === maxRetries) throw error
      if (!isTransientError(error)) throw error  // don't retry non-transient errors
      config.messages = [
        ...config.messages,
        { role: 'user', content: `Previous attempt failed: ${error.message}. Please try a different approach.` }
      ]
      await delay(1000 * (attempt + 1))  // simple backoff
    }
  }
}
```

**What counts as transient:** Rate limit (429), timeout, network error, 5xx from provider. Do NOT retry on 4xx (bad request), context length exceeded, or content filter violations.

**Tests:** Test retry on transient error, no retry on permanent error, exponential backoff timing.

#### Step 4.5 — Typed Messages (Progressive) ✅

Start with just `finding` and `status` types in the team execution loop:

- When an agent completes a sub-task → broadcast `finding` with result summary
- When an agent retries or hits an error → send `status` to the lead agent
- When the lead detects a blocked dependency → broadcast `status` to the team

Add `question`/`decision`/`handoff`/`review` in a future iteration when there are specific UX flows that use them (e.g., a review step that sends structured feedback).

---

### Phase 5 — Live Visual Feedback Layer ✅

> **Status:** ✅ Complete — all steps implemented (5.5 RecoveryBanner was built during Phase 3).  
> **Goal:** The task page becomes a live activity feed. Users see streaming output, team status, workflow progress, and communication traces.  
> **Duration estimate:** 2–2.5 weeks  
> **Risk:** Low-medium (mostly UI wiring, existing components do the heavy lifting)  
> **Depends on:** Phase 1 (workflow entity), Phase 2 (events), Phase 4 (mailbox)  
> **Parallelizable:** Steps 5.1–5.3 are independent UI components that can be built in parallel.

#### Design Principle

Reuse existing components aggressively. The gap analysis already identified the right building blocks:

| Need | Existing Component | New Work |
|------|-------------------|----------|
| Streaming markdown | `MarkdownRenderer` | None |
| Thinking blocks | `MarkdownRenderer` ThinkBlock | Wire `agent-thinking` events |
| Tool call steps | `ConversationStepTracker` | Wire `agent-tool-call` events |
| Sub-task checklist | `SubTasksSection` | Minor: merge streaming state with store state |
| Artifacts | `ArtifactCard` | None — already reactive from Yjs |
| Agent team display | **New** `AgentTeamBar` | ~50 lines |
| Workflow header | **New** `WorkflowHeader` | ~80 lines |
| Communication trace | **New** `CommunicationTrace` | ~120 lines |
| Recovery banner | **New** `RecoveryBanner` | ~60 lines |

**4 new components, all small.** Everything else is wiring.

#### Step 5.1 — Extend useOrchestrationStreaming Hook ✅

**File:** `src/hooks/useOrchestrationStreaming.ts`

Add to `SubTaskStreamingState`:
```typescript
thinkingContent?: string
isThinking?: boolean
toolCalls?: Array<{ toolName: string; input: any; status: 'running' | 'completed' }>
```

Add a workflow-level progress object:
```typescript
interface WorkflowProgressState {
  phase: string
  phaseMessage: string
  progress: number
  activeAgents: Array<{ agentId: string; agentName: string; taskId: string }>
}
```

Subscribe to `agent-thinking`, `agent-tool-call`, and `phase-change` events (now that they're actually emitted from Phase 0).

Return `{ streamingMap, workflowProgress }`.

**Tests:** Unit tests with mock events.

#### Step 5.2 — WorkflowHeader Component ✅

**File:** New `src/pages/Tasks/components/WorkflowHeader.tsx`

Subscribes to `useWorkflow(workflowId)`:
- Tier badge (Chip: "Direct" / "Team")
- Status pill (color coded: blue=analyzing, yellow=executing, green=completed, red=failed, orange=interrupted)
- Phase message text
- Progress bar (HeroUI `Progress`)
- Duration ticker (live elapsed time)

Replace the current `TaskStatusBanner` with this richer component.

#### Step 5.3 — AgentTeamBar Component ✅

**File:** New `src/pages/Tasks/components/AgentTeamBar.tsx`

Horizontal row of agent chips showing the team:
```
[🤖 Analyst ✓] [🔬 Researcher ⏳] [✍️ Writer ○]
```

Data source: `workflow.participatingAgentIds` + `workflowProgress.activeAgents`.

Intentionally simple — chips in a row, no org chart.

#### Step 5.4 — CommunicationTrace Component ✅

**File:** New `src/pages/Tasks/components/CommunicationTrace.tsx`

Subscribes to `useWorkflowMessages(workflowId)`:
- Timestamped message list (like a compact group chat)
- Agent name chip + type badge per message
- Auto-scrolls to latest
- Collapsible panel (collapsed when empty, expanded when messages arrive)

#### Step 5.5 — RecoveryBanner Component ✅ _(built during Phase 3, Step 3.2)_

Already described in Phase 3, Step 3.2. Built here if not already built.

#### Step 5.6 — Wire Everything into show.tsx ✅

Update `src/pages/Tasks/show.tsx`:
1. Replace `TaskStatusBanner` with `WorkflowHeader`
2. Add `AgentTeamBar` below the header
3. Add `CommunicationTrace` between sub-tasks and conversations
4. Add `RecoveryBanner` when workflow is interrupted
5. Pass enriched `streamingMap` (with thinking/tool data) to `SubTasksSection`

#### Step 5.7 — Sub-Task Conversation Enrichment ✅

**File:** `src/pages/Tasks/components/SubTaskConversation.tsx`

Pass thinking content and tool call data from the streaming state into `ConversationStepTracker`:
- Synthetic `ConversationStep` for active thinking
- `PendingToolCall` entries from `agent-tool-call` events

This requires no new rendering components — `ConversationStepTracker` and `MarkdownRenderer` already handle these data types.

---

### Phase 6 — Nested Teams (Tier 2) 🔜

> **Status:** 🔜 Deferred — awaiting evidence that flat teams hit a ceiling with real users.  
> **Goal:** Enable recursive delegation for deeply complex tasks.  
> **Duration estimate:** 2 weeks  
> **Risk:** High (recursive patterns are easy to get wrong)  
> **Depends on:** Phase 4 (mature team execution)  
> **Recommendation:** Defer until Tier 1 is battle-tested with real users and you have evidence that flat teams hit a ceiling.

#### Step 6.1 — Child Workflow Creation

When the task decomposer flags a sub-task as `complexity: 'complex'`, create a child workflow:
- `parentWorkflowId` reference on the child
- The parent tracks the child's `workflowId` on the sub-task
- Parent waits for child completion before considering the dependency satisfied

#### Step 6.2 — Scope Inheritance

Child teams inherit parent `AgentScope` with restriction-only overrides (can narrow, can't widen).

#### Step 6.3 — Depth Limit

**Critical safeguard:** Hard limit of 3 nesting levels. Without this, a pathological prompt can spawn infinite recursive teams and burn unbounded LLM tokens. The limit should be configurable but default to 3.

```typescript
if (currentDepth >= MAX_NESTING_DEPTH) {
  // Force direct execution even if the sub-task is complex
  return executeSingleAgent(task)
}
```

#### Step 6.4 — Nested Task Tree UI

Update `SubTasksSection` to recursively render tasks with sub-tasks (indentation or collapsible nesting based on `parentTaskId`).

---

### Phase 7 — Background Automation ✅

> **Status:** ✅ Complete — all 5 steps implemented.  
> **Goal:** Fire-and-forget orchestration and scheduled/recurring tasks.  
> **Duration estimate:** 3+ weeks (Service Worker orchestration is architecturally complex)  
> **Risk:** High (worker bundling, Yjs in worker context, testing)  
> **Depends on:** Phases 1–3 (workflow entity, recovery)

#### Step 7.1 — Persist TaskQueue to Yjs ✅

**File:** `src/stores/queueStore.ts`

Replaced in-memory `Map` with Yjs-backed `queuedTasks` map. Queue survives page refresh.

- New `QueuedTaskEntry`, `ScheduleConfig`, and `ApprovalGate` types in `src/types/index.ts`
- Yjs map `queuedTasks` registered in `src/lib/yjs/maps.ts` and re-exported from `src/lib/yjs/index.ts`
- Full Zustand + Yjs store with: enqueue, priority sorting, scheduling, recurring task support, approval gate integration, prune
- Non-React exports for lib/ consumers: `enqueueTask()`, `getReadyEntries()`, `markQueueStarted()`, etc.

**Done when:** Queue entries persist across page refresh. Priority ordering works. Scheduled entries detected. ✅

#### Step 7.2 — Web Worker (Intermediate Step) ✅

**File:** `src/lib/orchestrator/background-worker.ts`

V1 implementation uses a "virtual worker" pattern — execution happens on the main thread but is managed through a worker-compatible API, so upgrading to a real Web Worker is a drop-in replacement.

- `initBackgroundWorker()` — Initialize the worker manager
- `executeInBackground(entry)` — Execute a queue entry with progress tracking
- `cancelBackgroundTask(entryId)` — Cancel a running background task
- `shutdownBackgroundWorker()` — Clean shutdown
- Typed message interfaces (`WorkerInboundMessage`, `WorkerOutboundMessage`) ready for real Worker upgrade

**Design decision:** Since LLM calls are async fetch (non-blocking), the primary benefit of a real Worker is isolating the orchestration state machine from UI jank. The v1 approach provides the same API surface for a seamless upgrade path.

**Done when:** Background tasks execute without blocking UI. Worker API is typed for future upgrade. ✅

#### Step 7.3 — Service Worker Bridge ✅

**File:** `src/lib/orchestrator/sw-bridge.ts` + `public/sw.js`

Rather than full orchestration inside the SW (which requires Yjs + store access in worker context), the bridge provides:

- **Browser notifications** when background tasks complete/fail via `Notification` API with SW fallback
- **Keepalive pings** to prevent SW from going idle during long orchestration runs
- **Message protocol**: `BACKGROUND_TASK_STARTED`, `_PROGRESS`, `_COMPLETED`, `_FAILED`, `_CANCELLED`, `_KEEPALIVE`
- SW message handler in `public/sw.js` tracks active background tasks

**Done when:** Browser notifications fire on task completion. SW stays alive during orchestration. ✅

#### Step 7.4 — Scheduling Engine ✅

**File:** `src/lib/orchestrator/scheduler.ts`

Tick-based scheduling engine with cross-tab leader election:

- **Leader election** via `BroadcastChannel` — only one tab drains the queue at a time
- **Heartbeat protocol** (3s heartbeat, 10s timeout) — automatic leader failover if a tab closes
- **Tick loop** (5s interval) — polls Yjs queue for ready tasks, promotes due scheduled entries
- **Cron parser** — supports `*/N` interval patterns and `min hour * * dow` time patterns
- **Capacity management** — respects `MAX_CONCURRENT` (3) limit across all running tasks
- **Recurring tasks** — after completion, computes next run and re-enqueues with updated schedule
- `startScheduler()` / `stopScheduler()` lifecycle
- `forceTick()` for testing and manual drain
- `cancelScheduledTask(entryId)` — abort via AbortController

**Engine integration:** `submitBackground()` in `engine.ts` now uses `enqueueTask()` from queueStore. The scheduler auto-drains — no more fire-and-forget async IIFE. Legacy `submitBackgroundLegacy()` preserved for backward compatibility.

**Done when:** Queue auto-drains with leader election. Scheduled tasks fire on time. Recurring tasks re-enqueue. ✅

#### Step 7.5 — Human-in-the-Loop Gates ✅

**File:** `src/lib/orchestrator/approval-gate.ts`

Approval gate system for background task oversight:

- **Gate triggers**: `before-execution`, `after-decomposition`, `before-synthesis`, `on-budget-exceed`
- **Auto-approve policies**: `always` (fire-and-forget), `under-budget` (within token threshold), `never` (manual review)
- **Gate creation helpers**: `createDefaultGates()` (single gate), `createComprehensiveGates()` (full oversight)
- **Evaluation**: `checkGate()` evaluates policy + budget, returns blocking gate or null
- **Actions**: `approveGate()`, `rejectGate()` (also cancels task), `autoApproveAll()`
- **Review queue**: `getPendingApprovals()` returns entries awaiting human review
- Budget threshold support: auto-approve when estimated tokens are under limit

**Done when:** Gates block execution until approved. Auto-approve policies work. Review queue queryable. ✅

---

## What NOT to Build (Scope Cuts)

These items appear in the design doc or gap analysis but should be explicitly deferred:

| Item | Why Defer |
|------|-----------|
| **Agent self-claiming (G4)** | Orchestrator-driven assignment works. Self-claiming is an elegance concern, not a quality/UX concern. Build when there's evidence of load-balancing issues with large teams (~10+ agents). |
| **Auto-routing messages by keyword** | Explicit targeting is simpler and more predictable. Auto-routing risks sending irrelevant context to agents, wasting tokens. |
| **Six message types at launch** | Ship `finding` + `status` only. Add others when specific UX flows require them. |
| **Competing hypothesis testing** | The design doc mentions agents debating and challenging each other. This requires a sophisticated turn-taking protocol. Table it until the basic mailbox is proven. |
| **Budget controls for background tasks** | Basic budget gating shipped in Phase 7 (approval gates with `on-budget-exceed` trigger). Full cost estimation per model per token is a Phase 7+ concern. |
| **Recurring workflows** | Basic recurring support shipped in Phase 7 (cron + interval via `ScheduleConfig`). Advanced scheduling (calendars, dependencies between recurring tasks) is Phase 7+. |
| **P2P conflict resolution for `claimed` status** | Yjs CRDT merge semantics handle this theoretically, but two devices both claiming the same task simultaneously is an edge case that won't occur until P2P sync is actively used by multiple users. Cross that bridge later. |

---

## Risk Register

| Risk | Impact | Likelihood | Mitigation |
|------|--------|-----------|------------|
| **engine.ts refactor breaks existing flows** | High | Medium | Comprehensive test coverage before refactoring. Run full E2E suite after each step. |
| **LLM tier selection is unreliable** | Medium | High | Keep regex fallback. Log tier selections for analysis. Allow user override. |
| **Recovery resume produces incoherent output** | High | Medium | Inject completed sub-task summaries as explicit context. Test with various completion states. |
| **Team mailbox floods agent context windows** | Medium | Medium | Limit injected messages to 5-10 most recent. Summarize older messages. Monitor token usage. |
| **Nested teams (Tier 2) create runaway token spend** | High | Low | Hard depth limit (3 levels). Budget per workflow. User confirmation before spawning child teams. |
| **Phase-change events not emitted at all transition points** | Low | High | Create an integration test that walks through a full orchestration and asserts the complete event sequence. |
| **Yjs map growth (messages, workflows) degrades performance** | Medium | Low | Add cleanup for messages older than 30 days. Archive completed workflows. Monitor IndexedDB size. |
| **Synthesis goes dark (no streaming feedback)** | Medium | High (it's the current state) | Phase 2, Step 2.4 explicitly addresses this. Prioritize it. |

---

## Testing Strategy

### Unit Tests (TDD — write first)

Every new module in `src/lib/` and `src/stores/`:

- **workflowStore:** CRUD, status transitions, reactive hooks
- **mailboxStore:** Send/read/mark-read, workflow filtering
- **recovery.ts:** Orphan classification, sub-task reset logic, resume logic
- **strategies/shared.ts:** Conversation creation, event emission, artifact creation
- **agent-runner retry:** Transient vs permanent error handling, backoff

### Integration Tests

- **Full orchestration cycle:** Prompt → analysis → decomposition → execution → synthesis → validation → workflow completed. Assert events, workflow status, artifacts.
- **Recovery cycle:** Start orchestration → simulate browser close (mark workflow as interrupted) → detect orphans → resume → verify output.
- **Team communication:** Multi-agent team → agents share findings → later agents receive findings in context.

### E2E Tests (Playwright)

- **Happy path:** Submit a complex prompt → see task tree render → see agents stream → see synthesis → see completion.
- **Progress visibility:** Submit a prompt → verify progress bar updates → verify phase text changes.
- **Recovery flow:** Submit a prompt → navigate away mid-execution → return → see recovery banner → click resume.

### Coverage Targets

| Module | Target |
|--------|--------|
| `src/stores/workflowStore.ts` | 80%+ |
| `src/stores/mailboxStore.ts` | 80%+ |
| `src/lib/orchestrator/recovery.ts` | 90%+ (critical path) |
| `src/lib/orchestrator/strategies/*.ts` | 60%+ |
| `src/lib/orchestrator/agent-runner.ts` (retry logic) | 80%+ |
| New UI components | 30%+ |

---

## Success Metrics

How we know each phase accomplished its goal:

| Phase | Metric | Target |
|-------|--------|--------|
| **0 — Refactor** | engine.ts line count | < 300 lines |
| **0 — Refactor** | Duplicated code across strategies | Zero (shared.ts handles it) |
| **1 — Workflow** | User can see orchestration progress | Progress bar shows non-zero values |
| **1 — Workflow** | Workflow records exist in Yjs | Navigate to task → workflow entity is queryable |
| **2 — Quality** | Multi-agent tasks are validated | 100% of Tier 1 runs include validation step |
| **2 — Quality** | Decomposer mentions tools | Tool names appear in decomposition LLM prompt |
| **3 — Recovery** | Browser close doesn't lose work | Refresh during orchestration → recovery banner appears → resume produces correct output |
| **4 — Teams** | Agents share context | Agent B's prompt includes Agent A's findings |
| **5 — Visual** | User always knows what's happening | At no point during orchestration is the UI static for >2 seconds without visible activity |
| **6 — Nested** | Complex tasks produce better output | Before/after comparison of output quality on standardized complex prompts |

---

## Dependency Graph

```
Phase 0.1 (Engine Split) ──────────┐
Phase 0.2 (Types) ─────────────────┤
Phase 0.3 (Fix Events) ────────────┤
Phase 0.4 (workflowStore) ─────────┤
Phase 0.5 (mailboxStore) ──────────┼──▶ Phase 1 (Workflow + Progress) ──▶ Phase 2 (Quality) ──▶ Phase 3 (Recovery)
Phase 0.6 (Yjs Maps) ──────────────┤                                                              │
Phase 0.7 (Skills Forward) ────────┤                                                              │
Phase 0.8 (Claim/Unclaim) ─────────┘                                                              │
                                                                                                   │
                                        Phase 4 (Teams) ◀─ depends on Phase 1 ────────────────────┘
                                             │
                                             ▼
                                        Phase 5 (Visual) ── depends on Phase 1, 2, 4
                                             │
                                             ▼
                                        Phase 6 (Nested) ── depends on Phase 4
                                             │
                                             ▼
                                        Phase 7 (Background) ── depends on Phase 1, 3
```

**Parallel work opportunities:**
- Phase 0 steps 0.1–0.3 and 0.4–0.6 can run in parallel (different people/PRs)
- Phase 2 (quality) and Phase 4 (teams) can overlap if team execution is merged in Phase 1
- Phase 5 UI components (5.2, 5.3, 5.4, 5.5) can be built in parallel by different developers
- Phase 7 is a separate workstream that only needs Phase 1 and Phase 3

---

## Summary: What Changed from the Original TODO

| Original Plan | Enhanced Plan | Why |
|--------------|--------------|-----|
| Phase 0 is types-only | Phase 0 includes engine refactor | Reduces risk and effort for all subsequent phases |
| Progress wiring is Phase 4 | Progress wiring is Phase 1 | Highest UX impact with lowest effort |
| Validation for all paths is Phase 3 | Validation is Phase 2 | Biggest quality gap — fix before adding team features |
| Multi-agent and agent-team are separate strategies | Merged in Phase 1 | Halves implementation surface for validation, retry, mailbox |
| 6 message types at launch | 2 message types (`finding`, `status`) | Ship simple, iterate based on evidence |
| Agent self-claiming is Phase 3 | Deferred (not critical) | Orchestrator-driven assignment works fine |
| Nested teams (Tier 2) is Phase 5 | Deferred to Phase 6 | No evidence flat teams are insufficient yet |
| Background automation is Phase 6 | Moved to Phase 7, flagged as separate initiative | Architecturally complex, orthogonal to core improvements |
| Skills forward is Phase 1 | Moved to Phase 0 (quick win) | Straightforward fix that improves quality immediately |

---

_This document is the enhanced execution plan. Phases 0–5 are complete. Phases 6–7 are deferred. Update as phases complete._
