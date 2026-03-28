# Unified UI — PromptArea as the Single Entry Point

## Goal

Consolidate the main creative features of DEVS into the Index page (`src/pages/Index/index.tsx`) so that the **PromptArea** component becomes the single, unified entry point for all key user actions. This simplifies navigation, reduces page sprawl, and reinforces the "Google-like simplicity" design principle.

## Features to Unify

| Feature | Current Route | Current Trigger | Target Trigger (Index Page) |
|---|---|---|---|
| **Web App Generation** | `/marketplace/new` | Drawer nav / direct URL | PromptArea submission with detected intent or explicit mode |
| **Live Audio** | `/live` | Drawer nav / direct URL | Dedicated CTA visible when PromptArea is **pristine** (no text, no attachments) |
| **Studio (Image/Video)** | `/studio` | Drawer nav / "Studio" button on Index | PromptArea submission with detected intent or explicit mode |
| **Agent Creation** | `/agents/new` | Drawer nav / direct URL | PromptArea submission with detected intent or explicit mode |

---

## Design Principles

1. **Single surface** — The Index page PromptArea is the universal starting point. Users type what they want; the system routes to the right experience.
2. **Progressive disclosure** — Advanced options (model, provider, settings) appear only after mode selection, not upfront.
3. **Zero-friction switching** — Users can change mode without losing their prompt text.
4. **Pristine state CTAs** — When the PromptArea is empty and has no attachments, surface quick-access CTAs (e.g., Live) directly below or beside it.
5. **Existing routes preserved** — Deep links (`/studio`, `/live`, `/marketplace/new`, `/agents/new`) continue to work as redirects or standalone fallbacks.

---

## Architecture

### 1. PromptArea Modes

Introduce an explicit **mode** concept to PromptArea:

```typescript
type PromptMode = 'chat' | 'studio' | 'app' | 'agent'
```

| Mode | Behavior | Submit Action |
|---|---|---|
| `chat` (default) | Current behavior — send prompt to agent or orchestrator | `onSubmitToAgent` / `onSubmitTask` |
| `studio` | Image/video generation | Navigate to `/studio` with prompt pre-filled, or render Studio inline |
| `app` | Web app generation | Navigate to `/marketplace/new` with prompt pre-filled, or generate inline |
| `agent` | Agent creation — describe agent, AI generates config | Navigate to `/agents/new` with prompt pre-filled, or generate inline |

**Live** is not a mode — it is a standalone action (voice, no text prompt required).

### 2. Mode Selection UI — Toolbar Toggle Buttons

Mode switching is always **explicit** — the user clicks a toggle inside the PromptArea toolbar. No heuristics, no keyword detection, no external tabs.

The PromptArea already has a bottom toolbar with two groups:

```
Left:   [📎 Attachments] [👤 Agent picker]
Right:  [Model selector] [🎙 Mic] [→ Submit]
```

**New design**: Add small **toggle icon-buttons** to the **left group** of the toolbar, next to the existing attachment and agent picker buttons. These toggles switch the PromptArea mode:

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  Describe the image you want to create…                      │
│                                                              │
│  [📎] [🎨·] [🧩] [🤖]  [👤 agent]  ────  [model] [🎙] [→] │
└──────────────────────────────────────────────────────────────┘
                 ↑
          active mode = studio (dot indicator)
```

**Behavior:**

- **Default state (no toggle active)** = `chat` mode. The buttons appear as `light` variant, dimmmed.
- **Clicking a toggle** activates that mode: the button gets a subtle highlight (e.g., `flat` variant with accent color, or a small dot indicator). Only one mode can be active at a time.
- **Clicking the active toggle again** deactivates it → back to `chat` mode.
- **Switching mode preserves prompt text** — no text is lost.
- **Placeholder text changes** per mode to guide the user:
  - `chat`: "Ask anything…"
  - `studio`: "Describe the image or video you want to create…"
  - `app`: "Describe the web app you want to build…"
  - `agent`: "Describe the AI agent you want to create…"
- **Submit button behavior changes** per mode (different handler, potentially different icon/color).
- **Tooltips** on each toggle explain what it does: "Image & video generation", "Create a web app", "Create an agent".

**Why this works better than tabs:**

- **No added chrome** — the buttons live in an area that already exists, no new UI layer.
- **Familiar pattern** — mirrors formatting toolbars in messaging apps (Slack, Discord) and creation toolbars in AI products (ChatGPT's canvas/image/search toggles).
- **Discoverable but unobtrusive** — small icons with tooltips; the PromptArea stays clean.
- **Consistent** — same interaction pattern as the existing attachment and agent picker buttons.

### 3. Live CTA — Pristine State Only

The **Live** voice feature is surfaced as a separate CTA below the PromptArea, visible only when the prompt is **pristine** (empty text, no files attached). It navigates directly to the Live voice experience.

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  Ask anything…                                               │
│                                                              │
│  [📎] [🎨] [🧩] [🤖]  [👤 agent]  ────────  [model] [🎙] [→] │
└──────────────────────────────────────────────────────────────┘

  [ 🎙 Live ]          ← visible only when pristine (no text, no files)
```

- Disappears as soon as the user types or attaches a file.
- Uses the same ghost button style as existing use-case buttons on the Index page.
- Clicking it navigates to `/live` with the currently selected agent.

### 4. Submission Flow per Mode

#### Chat (default — unchanged)

```
User types prompt → selects agent → Submit
  → sessionStorage + navigate to /agents/run/{slug}
```

#### Studio

```
User clicks 🎨 toggle in toolbar → placeholder updates → types prompt → Submit
  → Phase 1: sessionStorage.set('studioPrompt', prompt) + navigate to /studio
  → Phase 2: Render StudioPanel inline below PromptArea
```

#### Web App

```
User clicks 🧩 toggle in toolbar → placeholder updates → types prompt → Submit
  → Phase 1: sessionStorage.set('appPrompt', prompt) + navigate to /marketplace/new
  → Phase 2: Run generateExtension() inline, navigate to editor on success
```

#### Agent

```
User clicks 🤖 toggle in toolbar → placeholder updates → types prompt → Submit
  → Phase 1: sessionStorage.set('agentPrompt', prompt) + navigate to /agents/new
  → Phase 2: Run meta-prompt inline, show agent preview in a modal
```

#### Live

```
User clicks Live CTA below PromptArea (pristine state only)
  → Phase 1: navigate to /live with current selected agent
  → Phase 2: Activate live voice overlay on Index page (mic + waveform + transcript)
```

---

## Implementation Plan

### Phase 1 — Prompt-forwarding (low effort, high value)

**Goal**: All features reachable from the Index page via PromptArea. Each mode navigates to its existing page with the prompt pre-filled.

#### Tasks

1. **Add `PromptMode` type and mode toggle buttons to PromptArea**
   - File: `src/components/PromptArea/index.tsx`
   - Add `mode` prop and `onModeChange` callback
   - Render three icon toggle buttons (`🎨 Studio`, `🧩 Web App`, `🤖 Agent`) in the **left group** of the bottom toolbar, after `AttachmentSelector` and before `AgentSelector`
   - Toggle behavior: click to activate, click again to deactivate, only one active at a time
   - Active toggle gets visual highlight (`flat` variant + accent color, or dot indicator)
   - Change placeholder text based on active mode
   - Tooltips on each toggle

2. **Add Live CTA to Index page**
   - File: `src/pages/Index/index.tsx`
   - Add `mode` state (`chat | studio | app | agent`)
   - Compute `isPristine = !prompt.trim() && selectedFiles.length === 0`
   - Render **Live** CTA below PromptArea only when pristine
   - Pass `mode` and `onModeChange` to PromptArea
   - On submit, route to the handler matching the current mode

3. **Forward prompt to target pages via sessionStorage**
   - Studio: `sessionStorage.setItem('studioPrompt', prompt)` → navigate `/studio`
   - App: `sessionStorage.setItem('appPrompt', prompt)` → navigate `/marketplace/new`
   - Agent: `sessionStorage.setItem('agentPrompt', prompt)` → navigate `/agents/new`

4. **Consume forwarded prompt in target pages**
   - `StudioPage`: read `sessionStorage.getItem('studioPrompt')`, pre-fill and auto-focus
   - `NewExtensionPage`: read `sessionStorage.getItem('appPrompt')`, pre-fill description
   - `AgentsNewPage`: read `sessionStorage.getItem('agentPrompt')`, pre-fill meta description

5. **Update Index page use-case buttons**
   - Replace the current standalone "Studio" button with the Live CTA (pristine only)
   - Remove duplicated nav entries from the app drawer (optional, can keep as secondary access)

#### Files to Modify

| File | Changes |
|---|---|
| `src/components/PromptArea/index.tsx` | Add `mode` / `onModeChange` props, render toggle buttons in toolbar, placeholder per mode |
| `src/pages/Index/index.tsx` | Add Live CTA (pristine), mode state, mode-aware submission |
| `src/pages/Index/i18n/*.ts` | Add i18n keys for CTA labels |
| `src/features/studio/pages/StudioPage.tsx` | Read `studioPrompt` from sessionStorage |
| `src/features/marketplace/pages/NewExtensionPage.tsx` | Read `appPrompt` from sessionStorage |
| `src/pages/Agents/new.tsx` | Read `agentPrompt` from sessionStorage |

### Phase 2 — Inline rendering (higher effort, polished UX)

**Goal**: Target experiences render inline on the Index page instead of navigating away.

#### Tasks

1. **Extract reusable panels from feature pages**
   - `StudioPanel` from `StudioPage` (prompt → generation → gallery)
   - `AppGeneratorPanel` from `NewExtensionPage` (prompt → schema → editor)
   - `AgentCreatorPanel` from `AgentsNewPage` (prompt → meta → preview)
   - `LiveOverlay` from `LivePage` (mic → transcript → response)

2. **Render panels conditionally on Index based on mode**
   - When `mode === 'studio'` → show `<StudioPanel />` below PromptArea
   - When `mode === 'app'` → show `<AppGeneratorPanel />`
   - When `mode === 'agent'` → show `<AgentCreatorPanel />`
   - When `mode === 'live'` → show `<LiveOverlay />` as floating panel

3. **Shared PromptArea context**
   - All panels reuse the same PromptArea for input
   - Panel-specific controls (provider, model, settings) appear as PromptArea add-ons

4. **Animate transitions between modes**
   - Use `framer-motion` layoutId animations (already in use on Index)
   - Smooth panel entrance/exit

### Phase 3 — Refinements (future)

**Goal**: Polish the mode-switching experience based on usage data.

#### Tasks

1. **URL-persisted mode** — Reflect active mode in the URL (e.g., `/?mode=studio`) for shareability and deep linking
2. **Mode-specific PromptArea add-ons** — Inline provider/model selectors for Studio, template picker for Web App, etc.
3. **Recent mode memory** — Remember the last-used mode per session so returning users land in their preferred mode
4. **Analytics** — Track mode usage, switch patterns, and completion rates to inform further UX decisions

---

## UX Considerations

### Toolbar Toggle Design

- Toggles are `isIconOnly` HeroUI `Button` components, same `size="sm"` as existing toolbar buttons
- Inactive state: `variant="light"`, default color, muted icon
- Active state: `variant="flat"`, `color="primary"` (or mode-specific accent), or a small dot/underline indicator
- Transition between states uses a subtle scale or color animation
- Only one toggle can be active at a time (radio behavior); clicking active toggle deactivates it
- Toggles are separated from the attachment/agent buttons by a thin vertical divider for visual grouping

### Pristine Live CTA

- Appears with a subtle fade-in animation (consistent with existing `motionVariants`)
- Uses ghost button variant with `Microphone` icon
- Positioned below the PromptArea, centered
- Disappears immediately when user starts typing or attaches a file

### Mode Indicator

- When a mode other than `chat` is active, the active toggle button is highlighted — no separate chip or badge needed (the button itself is the indicator)
- Placeholder text changes per mode to guide the user:
  - `chat`: "Ask anything…"
  - `studio`: "Describe the image or video you want to create…"
  - `app`: "Describe the web app you want to build…"
  - `agent`: "Describe the AI agent you want to create…"

### Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl/Cmd + Enter` | Submit (existing) |
| `Ctrl/Cmd + Shift + L` | Toggle Live mode |
| `Ctrl/Cmd + Shift + S` | Toggle Studio mode |
| `Ctrl/Cmd + Shift + A` | Toggle App mode |

### Mobile

- Toolbar toggle buttons remain the same on mobile — they are already small icon buttons
- Live CTA renders centered below PromptArea when pristine
- Studio/App/Agent modes: navigate to dedicated page (Phase 1 behavior kept on mobile for space)

---

## Migration Strategy

1. **Phase 1 ships first** — No breaking changes, existing routes still work, drawer nav entries preserved
2. **Phase 2 iterates** — Drawer entries for Studio/Live/New App/New Agent become secondary (link to Index with mode pre-selected)
3. **Phase 3 refines** — URL persistence, mode memory, and analytics layered on

---

## Open Questions

- [ ] Should the existing use-case theme dropdown buttons remain alongside the toolbar toggles, or be folded into a single "Examples" dropdown?
- [ ] Should Live mode in Phase 2 be a full overlay or a side panel?
- [ ] Should mode state persist in the URL (e.g., `/?mode=studio`) for shareability? (Deferred to Phase 3)
- [ ] Should mobile always navigate to dedicated pages or attempt inline rendering?
- [ ] What icon set works best for the three toggles? Candidates: `MediaImagePlus` / `Palette` (Studio), `Code` / `CodeBrackets` / `AppWindow` (App), `BotMessage` / `UserPlus` (Agent)
