# Unified Prompt Experience — "Sessions"

## Problem

Today the PromptArea has 5 modes (`chat`, `live`, `studio`, `app`, `agent`) that scatter the user to 5 different pages via `sessionStorage` hops and `navigate()` redirects:

| Mode           | SessionStorage Key       | Redirect Target      |
| -------------- | ------------------------ | -------------------- |
| `studio`       | `studioPrompt`           | `/studio`            |
| `app`          | `appPrompt`              | `/marketplace/new`   |
| `agent`        | `agentPrompt`            | `/agents/new`        |
| `chat` (devs)  | —                        | `/tasks/{id}`        |
| `chat` (other) | `pendingPrompt` + others | `/agents/run/{slug}` |

This fragments the experience. The user must understand modes, destinations, and different UIs for what is fundamentally the same action: **"I have a request → give me a result."**

---

## Inspiration

### Manus.ai

- Single prompt → creates a **Session** inside a **Project**
- The prompt area transitions into an execution view
- A sandbox (execution environment) handles any task type
- Dual-panel: conversation + artifact preview
- Sessions run asynchronously, are shareable, and have replay

### Perplexity

- Single prompt → creates a **Thread** (search) or **Computer run** (agent)
- Thread URL changes via client-side navigation
- Conversation is the backbone; output types render inline
- Progressive disclosure: the page _grows_ rather than _changes_

### Common Pattern

> **The prompt creates an entity, not a page navigation.** The entity has a lifecycle and accumulates artifacts.

---

## Proposed Design: **Sessions**

### Core Concept

A **Session** is the universal container for any user request. It unifies tasks, conversations, media generation, app building, and agent creation into a single entity and a single UX flow.

```
User Prompt → Session (created) → navigate(/session/{id}) → Agent(s) work → Artifacts produced
```

The transition from Index to Session page uses the **CSS View Transitions API** (`document.startViewTransition()`) to animate smoothly between the prompt view and the session view — giving the feel of an in-place morph while being a real route change.

### The word "Session"

- Generic enough to cover all use cases
- Familiar to users (chat sessions, work sessions)
- Implies a lifecycle (start → work → results)
- Used by Manus, the market leader in this pattern

### Intent: Explicit Signals + LLM Classification

**The user's intent is NEVER guessed via heuristic or keyword-matching.** This is a hard rule (documented in AGENTS.md).

Intent is determined by **explicit UI signals** or by **LLM classification** of the prompt:

| Signal                            | Intent         | What Happens                                            |
| --------------------------------- | -------------- | ------------------------------------------------------- |
| Selected agent = `devs` (default) | `task`         | Multi-agent orchestration via WorkflowOrchestrator      |
| Selected agent = specific agent   | `conversation` | Direct chat with that agent                             |
| User clicked mode = `studio`      | `media`        | Image/video generation pipeline                         |
| User clicked mode = `app`         | `app`          | Extension builder pipeline                              |
| User clicked mode = `agent`       | `agent`        | Agent meta-prompting pipeline                           |
| User clicked mode = `live`        | `conversation` | Live voice chat with selected agent                     |
| No explicit mode selected         | LLM-classified | The **fast** model classifies the prompt into an intent |

No keyword matching. No heuristic pattern matching. Intent comes from UI controls or LLM classification — never from brittle regex/keyword rules.

### Model Tiers

Users configure **three model tiers** in their settings. Each tier is a provider + model pair, used for different purposes across the platform:

| Tier         | Setting Key     | Purpose                                                               | Examples                                |
| ------------ | --------------- | --------------------------------------------------------------------- | --------------------------------------- |
| **Fast**     | `fastModel`     | Intent classification, title generation, quick summaries, suggestions | GPT 4o-mini, Gemini Flash, Claude Haiku |
| **Balanced** | `balancedModel` | Standard conversations, agent chat, moderate reasoning                | GPT 5, Claude Sonnet, Gemini Pro        |
| **Thinking** | `thinkingModel` | Complex orchestration, deep analysis, multi-step reasoning            | GPT 5, Claude Opus, Gemini Pro          |

```typescript
// In SyncedSettings (src/stores/userStore.ts)
interface ModelTierConfig {
  providerId: string // credential ID
  provider: LLMProvider // provider type
  model: string // model ID
}

interface SyncedSettings {
  // ... existing fields ...

  // Model tiers — user-configured in Settings
  fastModel?: ModelTierConfig // Quick, cheap tasks (intent classification, titles)
  balancedModel?: ModelTierConfig // Standard conversations and agent work
  thinkingModel?: ModelTierConfig // Complex reasoning and orchestration
}
```

**How tiers are used:**

- **Session intent classification** → `fastModel` (lightweight LLM call to classify prompt when no explicit mode is set)
- **Conversation title generation** → `fastModel`
- **Quick reply suggestions** → `fastModel`
- **Standard agent conversations** → `balancedModel` (or the per-conversation model override from ModelSelector)
- **Task orchestration & analysis** → `thinkingModel`
- **Requirement validation** → `thinkingModel`
- **Agent meta-prompting** → `thinkingModel`

The existing per-conversation **ModelSelector** in the PromptArea remains as an override. When the user explicitly picks a model in the PromptArea, that model is used for that conversation regardless of tiers.

**Settings UI:** A new "Model Tiers" section in the "settingsproviders" Settings page lets users assign a provider+model to each tier. Sensible defaults are auto-detected from configured credentials (cheapest model → fast, mid-range → balanced, most capable → thinking).

### Session Entity

```typescript
type SessionIntent = 'conversation' | 'task' | 'media' | 'app' | 'agent'

interface Session {
  id: string
  title: string // AI-generated from prompt
  prompt: string // Original user request (first turn)
  status: 'starting' | 'running' | 'completed' | 'failed'

  // Initial intent (first turn) — determined by UI signals or LLM classification
  intent: SessionIntent

  // Per-turn tracking — each follow-up can have a different intent
  turns: SessionTurn[]

  // Agent assignment
  primaryAgentId: string // Main agent handling this
  participatingAgents: string[] // All agents involved (accumulates across turns)

  // Links to existing entities created during session lifecycle
  conversationId?: string // Chat thread (for conversation/follow-up turns)
  taskId?: string // Orchestrated task (for task turns)

  // Artifacts produced across all turns
  artifacts: SessionArtifact[]

  // Input context (first turn)
  attachments?: SessionAttachment[]
  mentionedSkills?: string[]
  mentionedConnectors?: string[]
  methodology?: string

  // Timestamps
  createdAt: Date
  updatedAt: Date
  completedAt?: Date
}

interface SessionTurn {
  id: string
  prompt: string // User message for this turn
  intent: SessionIntent // Resolved intent for THIS turn
  agentId: string // Agent handling this turn
  artifactIds: string[] // Artifacts produced by this turn
  status: 'pending' | 'running' | 'completed' | 'failed'
  createdAt: Date
  completedAt?: Date
}

interface SessionArtifact {
  id: string
  type:
    | 'image'
    | 'video'
    | 'document'
    | 'code'
    | 'app'
    | 'agent'
    | 'website'
    | 'presentation'
  title: string
  content: string // Rendered content or base64
  mimeType?: string
  preview?: string // Thumbnail/preview
  metadata?: Record<string, any> // Type-specific data
  createdAt: Date
}

interface SessionAttachment {
  name: string
  type: string
  size: number
  data: string // Base64
}
```

### UX Flow

#### Phase 1: Prompt (Index Page — as today)

```
┌──────────────────────────────────────────┐
│              Hey DEVS                      │
│     Your AI agents ready to collaborate    │
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │  Need something done?            ⏎   │  │
│  │                                      │  │
│  │  [📎] [Agent ▾]    [🎙] [Model ▾] → │  │
│  └──────────────────────────────────────┘  │
│                                            │
│  [💬 Chat] [🎨 Studio] [🌐 App] [🤖 Agent]│  ← Mode selectors (explicit intent)
│                                            │
│       Use case chips / Recent activity     │
└──────────────────────────────────────────┘
```

Mode buttons set the session intent explicitly. They are not hints — they are the definitive intent signal.

#### Phase 2: Transition (CSS View Transitions API)

On submit, the Index page:

1. Creates a Session entity in the sessionStore
2. Wraps `navigate('/session/{id}')` inside `document.startViewTransition()`
3. The PromptArea element gets `view-transition-name: prompt-area` so it morphs into the session's prompt bar
4. The hero/title area cross-fades out while the session header fades in

```typescript
// In Index page submit handler
const session = await createSession({ prompt, intent, agent, files, ... })

if (document.startViewTransition) {
  document.startViewTransition(() => {
    navigate(url(`/session/${session.id}`))
  })
} else {
  navigate(url(`/session/${session.id}`))
}
```

CSS for the transition:

```css
/* Shared element: the prompt area morphs from Index to Session */
#prompt-area {
  view-transition-name: prompt-area;
}

::view-transition-old(prompt-area) {
  animation: 300ms ease-out both fade-and-shrink;
}

::view-transition-new(prompt-area) {
  animation: 300ms ease-in both fade-and-grow;
}

/* Page-level cross-fade */
::view-transition-old(root) {
  animation: 200ms ease-out both fade-out;
}

::view-transition-new(root) {
  animation: 200ms ease-in 100ms both fade-in;
}
```

#### Phase 3: Session Page (Dual-Panel — reuses RunLayout)

The `/session/{id}` route renders using the **existing `RunLayout`** (already used by both AgentRunPage and TaskPage), which already provides:

- Compact top bar with back button, title, actions
- Main content area with ScrollShadow
- ContextualPanel (side panel for agent details)
- InspectorPanel (side panel for artifact inspection)
- Responsive — collapses panels on small screens

```
┌──────────────────────────────────────────────────────┐
│ ← Back    Session: "Design a landing page for..."    │
├──────────────────────────────────────────────────────┤
│                                                      │
│  CONVERSATION / EXECUTION VIEW                       │
│  (reuses MessageBubble, ConversationStepTracker,     │
│   timeline pattern from run.tsx / show.tsx)           │
│                                                      │
│  🤖 Agent: Analyzing your request...                │
│  📋 Breaking down into sub-tasks...                  │
│  🔄 Working on design...                            │
│  ✅ Design complete                                  │
│                                                      │
│  ┌──────────────────────────────────────────────┐    │
│  │  Follow-up message                        ⏎  │    │
│  └──────────────────────────────────────────────┘    │
│                                                      │
├──────────────────────────────────────────────────────┤
│  [ContextualPanel]              [InspectorPanel]     │
│  Agent details, memories        Artifact preview,    │
│                                 sub-tasks, artifacts │
└──────────────────────────────────────────────────────┘
```

The InspectorPanel and ContextualPanel already handle the "dual-panel" experience. No new layout needed.

#### Phase 4: Follow-up (Continuous, Multi-Intent)

The user can send follow-up messages within the same session. **Each turn can have a different intent.** The session is not locked to its initial intent.

Example flow:

1. User: "Generate a hero image for a SaaS product" → intent: `media` → image generated
2. User: "Now build a landing page using that image" → intent: `app` → app/extension built
3. User: "Create an agent that specializes in this visual style" → intent: `agent` → agent created
4. User: "How does the color theory work here?" → intent: `conversation` → chat response

The session's `intent` field records the **initial** intent (what determined the first pipeline). But follow-up messages are classified independently using the same rules:

- If the user switches mode explicitly → that mode's intent
- If no mode change → LLM classifies the follow-up using the `fastModel`
- The currently selected agent also factors in (explicit signal)

**Artifacts accumulate across intents.** A single session timeline can contain images, code, agent definitions, and conversation messages — all interleaved chronologically. This is what makes the session a true universal container rather than a typed wrapper.

```typescript
interface Session {
  // ...
  intent: SessionIntent // Initial intent (first turn)
  // Each message carries its own resolved intent
}

interface SessionMessage {
  id: string
  prompt: string // User's follow-up message
  intent: SessionIntent // Classified intent for THIS turn
  artifactIds: string[] // Artifacts produced by this turn
  timestamp: Date
}

type SessionIntent = 'conversation' | 'task' | 'media' | 'app' | 'agent'
```

The `SessionPage` doesn't render a single `*SessionView` — it renders a **unified timeline** where each turn dispatches to the appropriate pipeline and the results render inline:

```typescript
function SessionPage() {
  const session = useSession(sessionId)

  // The timeline renders all turns, each with its own intent
  return (
    <RunLayout header={sessionHeader}>
      <SessionTimeline session={session} />
      {/* PromptArea for follow-ups — mode buttons + agent selector
          determine intent for the NEXT turn */}
      <PromptArea onSubmit={handleFollowUp} />
    </RunLayout>
  )
}

// Each turn dispatches to the right pipeline
async function handleFollowUp(prompt, mode, agent, files) {
  const intent = resolveIntent(mode, agent) // explicit signals
    ?? await classifyIntent(prompt)          // LLM fallback

  await executeTurn(session, { prompt, intent, agent, files })
}
```

### Architecture Changes

#### New Store: `sessionStore`

```
src/stores/sessionStore.ts
```

Manages Session entities in Yjs. Acts as the **orchestration coordinator** — on creation it:

1. Sets `intent` based on the explicit mode + agent signals
2. Creates the appropriate sub-entities (conversation, task)
3. Triggers the right execution pipeline
4. Tracks status and artifacts

#### New Page: `SessionPage`

```
src/pages/Session/index.tsx
```

A **unified timeline** that renders all turns sequentially. Each turn dispatches to the appropriate pipeline, and the results render inline in the timeline:

```typescript
function SessionPage() {
  const session = useSession(sessionId)

  return (
    <RunLayout header={sessionHeader}>
      {/* Unified timeline — renders each turn's output based on its intent */}
      <SessionTimeline session={session}>
        {session.turns.map(turn => (
          <SessionTurnView key={turn.id} turn={turn} session={session} />
        ))}
      </SessionTimeline>

      {/* PromptArea for follow-ups — mode + agent determine next turn's intent */}
      <PromptArea
        onSubmit={handleFollowUp}
        mode={mode}
        onModeChange={setMode}
        selectedAgent={agent}
        onAgentChange={setAgent}
      />
    </RunLayout>
  )
}
```

`SessionTurnView` renders differently based on the turn's intent — conversation messages, generated images, task orchestration progress, app previews, or agent cards — all within a single chronological timeline.

The `*SessionView` components (ConversationSessionView, MediaSessionView, etc.) are used as **turn renderers**, not page-level views. They extract and reuse core logic from existing pages (AgentRunPage, StudioPage, etc.).

#### New CSS: View Transition styles

```
src/styles/view-transitions.css
```

CSS rules for `view-transition-name`, `::view-transition-old()`, `::view-transition-new()` animations.

#### Modified: Index Page

- Single submit flow: creates Session, navigates with View Transition
- No more `sessionStorage` hops
- Mode buttons set `intent` on the session explicitly

#### Modified: PromptArea

- `onSubmit` callback signature simplified
- Mode buttons still exist but produce a `mode` value that the parent translates into `session.intent`
- No redirect logic inside PromptArea

#### New Route

```typescript
// In Router.tsx
'session/:sessionId': SessionPage,
```

#### Preserved: Existing Pages

The existing pages (`/studio`, `/agents/run/`, `/tasks/`, etc.) remain accessible as direct entry points for power users, bookmarks, and deep links. The session page is the new primary flow.

### Intent → Pipeline Mapping

```typescript
async function executeSession(session: Session) {
  switch (session.intent) {
    case 'conversation':
      // Create conversation, start agent chat
      // Artifacts: extracted inline from messages (widgets, code, etc.)
      return runConversationPipeline(session)

    case 'task':
      // Create task via orchestrator, multi-agent coordination
      // Artifacts: task deliverables
      return runTaskPipeline(session)

    case 'media':
      // Route to image/video generation
      // Artifacts: generated images/videos
      return runMediaPipeline(session)

    case 'app':
      // Route to extension builder
      // Artifacts: generated app/extension
      return runAppPipeline(session)

    case 'agent':
      // Route to agent meta-prompting
      // Artifacts: generated agent definition
      return runAgentPipeline(session)
  }
}
```

Each pipeline:

1. Creates the appropriate sub-entities (conversation, task, etc.)
2. Streams progress to the session's conversation panel
3. Produces artifacts that render in the InspectorPanel
4. Updates session status as work progresses

---

## Implementation Plan

### Phase 1: Foundation (Session Entity + Store + Route)

1. **Define Session types** in `src/types/index.ts`
2. **Create `sessionStore`** in `src/stores/sessionStore.ts` — Yjs-backed, with CRUD operations
3. **Write tests** for sessionStore (TDD mandatory)
4. **Add `/session/:sessionId` route** to `Router.tsx`

### Phase 2: Session Page + View Transitions

5. **Create `SessionPage`** — unified timeline with RunLayout
6. **Create `SessionTimeline` + `SessionTurnView`** — chronological turn renderer that dispatches to intent-specific components
7. **Create `ConversationTurn`** — extracts core chat logic from AgentRunPage
8. **Create `TaskTurn`** — extracts orchestration logic from TaskPage
9. **Add CSS View Transition styles** in `src/styles/view-transitions.css`
10. **Add `view-transition-name` to PromptArea** `#prompt-area` element

### Phase 3: Index Page Integration

11. **Modify Index page submit handlers** — create Session + first Turn, navigate with `startViewTransition()`
12. **Remove `sessionStorage` hops** — `pendingPrompt`, `studioPrompt`, `appPrompt`, `agentPrompt`
13. **Mode buttons** produce `intent` value for the current turn
14. **Follow-up handler** — classifies each follow-up independently (explicit signals or LLM fast model)

### Phase 4: Remaining Turn Renderers

15. **`MediaTurn`** — wraps StudioPage generation logic
16. **`AppTurn`** — wraps NewExtensionPage generation logic
17. **`AgentTurn`** — wraps AgentsNewPage meta-prompting logic

### Phase 5: Polish

16. **Session history** in sidebar/recent activity (RecentActivity component)
17. **Session sharing** (URL-based, already addressable via `/session/{id}`)
18. **Graceful fallback** for browsers without View Transitions API support

---

## Migration Strategy

- **Non-breaking**: Session is a new entity layered on top of existing entities
- **Gradual**: Existing pages remain functional via direct URL access
- **Backward-compatible**: Conversations, tasks, artifacts continue to work as before
- **Progressive**: Each pipeline can be migrated independently
- **No heuristic**: Intent comes from UI controls or LLM classification, never from keyword matching

## File Impact Summary

| File                                           | Change                                                                         |
| ---------------------------------------------- | ------------------------------------------------------------------------------ |
| `src/types/index.ts`                           | Add `Session`, `SessionArtifact`, `SessionAttachment`, `ModelTierConfig` types |
| `src/stores/sessionStore.ts`                   | **New** — Session CRUD, Yjs-backed                                             |
| `src/stores/userStore.ts`                      | Add `fastModel`, `balancedModel`, `thinkingModel` to `SyncedSettings`          |
| `src/pages/Session/index.tsx`                  | **New** — Session page (unified timeline + PromptArea)                         |
| `src/pages/Session/SessionTimeline.tsx`        | **New** — chronological turn renderer                                          |
| `src/pages/Session/SessionTurnView.tsx`        | **New** — dispatches to intent-specific renderers per turn                     |
| `src/pages/Session/turns/ConversationTurn.tsx` | **New** — turn renderer reusing AgentRunPage chat logic                        |
| `src/pages/Session/turns/TaskTurn.tsx`         | **New** — turn renderer reusing TaskPage orchestration logic                   |
| `src/pages/Session/turns/MediaTurn.tsx`        | **New** — turn renderer reusing StudioPage generation logic                    |
| `src/pages/Session/turns/AppTurn.tsx`          | **New** — turn renderer reusing NewExtensionPage logic                         |
| `src/pages/Session/turns/AgentTurn.tsx`        | **New** — turn renderer reusing AgentsNewPage meta-prompting logic             |
| `src/pages/Settings/`                          | Add Model Tiers section (fast / balanced / thinking selectors)                 |
| `src/styles/view-transitions.css`              | **New** — CSS View Transition animations                                       |
| `src/pages/Index/index.tsx`                    | Modify — single submit → create Session + navigate with View Transition        |
| `src/components/PromptArea/index.tsx`          | Modify — simplified submit, no redirects                                       |
| `src/app/Router.tsx`                           | Add `session/:sessionId` route                                                 |
| `src/test/stores/sessionStore.test.ts`         | **New** — TDD tests                                                            |
| `AGENTS.md`                                    | Updated — no-heuristic rule added                                              |

## Key Design Decisions

1. **"Session" as the unifying entity** — generic, familiar, lifecycle-oriented
2. **No heuristic intent detection** — intent comes from explicit UI controls or LLM classification, never keyword matching
3. **CSS View Transitions** — real `navigate()` call wrapped in `startViewTransition()` for smooth morphing
4. **Reuse RunLayout** — the dual-panel layout (main + ContextualPanel + InspectorPanel) already exists
5. **Existing pages preserved** — for power users, deep links, backwards compatibility
6. **Pipelines wrap existing logic** — no rewrite, service extraction from existing pages
7. **`sessionStorage` hops eliminated** — Session entity carries all state in Yjs
