# DEVS - Conventions

> How we write code, organize files, and keep things consistent.

## Language & Tooling

| Tool | Version | Purpose |
|------|---------|---------|
| TypeScript | 5.8 | All application code. Strict mode enabled. |
| React | 19 | UI layer. Auto-JSX (no `import React` needed). |
| Vite | 7 | Bundler, dev server, MPA page generation. |
| Tailwind CSS | 4 | Styling. Utility-first with oklch color tokens. |
| ESLint | 9 | Flat config. Pragmatic rule set — enforces critical rules only. |
| Prettier | 3 | Formatting. No manual style debates. |
| Vitest | 3 | Unit and integration tests. jsdom environment. |
| Playwright | 1.55 | E2E browser tests. |

## Project Structure

```
src/
├── app/            App shell, providers, router, initialization
├── components/     Shared UI components (not feature-specific)
├── config/         Product constants, API endpoints
├── features/       Independent feature modules (see below)
├── hooks/          Shared custom React hooks
├── i18n/           Translations and language utilities
├── layouts/        Page layout templates
├── lib/            Business logic, services, utilities
├── pages/          Route-level page components
├── stores/         Zustand stores (Yjs-backed)
├── styles/         Global CSS, Tailwind config
├── test/           Test files (mirrors src/ structure)
├── tools/          Tool plugin definitions
├── types/          Shared TypeScript type definitions
└── workers/        Web Worker scripts
```

### Feature Module Pattern

Each feature in `src/features/` is self-contained:

```
features/{name}/
├── components/     Feature-specific UI
├── hooks/          Feature-specific hooks
├── stores/         Feature-specific state (if needed)
├── lib/            Feature-specific logic
├── pages/          Feature routes (if any)
├── types/          Feature types
└── i18n/           Feature translations
```

Features import from `src/lib/`, `src/stores/`, and `src/types/` but never from other features.

## Naming Conventions

### Files

| Type | Pattern | Example |
|------|---------|---------|
| React component | `PascalCase.tsx` | `AgentCard.tsx` |
| Hook | `use{Name}.ts` | `useThreads.ts` |
| Store | `{name}Store.ts` | `agentStore.ts` |
| Service / utility | `kebab-case.ts` | `context-broker.ts` |
| Types | `index.ts` in `types/` | `src/types/index.ts` |
| Test | `{name}.test.ts` | `agent-store.test.ts` |
| Translation | `{lang}.ts` in `i18n/` | `i18n/en.ts` |

### Code

- **Components**: PascalCase (`AgentAvatar`, `ThreadList`)
- **Hooks**: camelCase with `use` prefix (`useAgents`, `useLiveMap`)
- **Store functions**: camelCase verbs (`createAgent`, `deleteConversation`)
- **Constants**: SCREAMING_SNAKE for true constants, camelCase for config objects
- **Types/Interfaces**: PascalCase, no `I` prefix (`Agent`, not `IAgent`)
- **Enums**: Prefer union types (`'light' | 'dark'`) over TypeScript enums

## State Management

### The Rule

**Yjs is the single source of truth.** All persistent data is written to Yjs maps. Zustand stores are thin wrappers that provide React hooks.

### Pattern

```typescript
// Store exports two things: write functions and read hooks

// 1. Write function — direct Yjs mutation
export function createAgent(data: AgentData): Agent {
  const agent = { ...data, id: nanoid(), createdAt: new Date() }
  agents.set(agent.id, agent)
  return agent
}

// 2. Read hook — reactive Yjs observation
export function useAgents(): Agent[] {
  return useLiveMap(agents).filter(a => !a.deletedAt)
}
```

### Soft Delete

Entities are soft-deleted by setting `deletedAt`. Read hooks filter them out. This simplifies P2P sync and enables undo.

### Space Scoping

Space-scoped entities carry `spaceId?: string`. The default space matches `undefined`, `''`, or `'default'`. Specific spaces require exact match.

## Styling

### Component Library

HeroUI v2 is the primary component library. HeroUI v3 (beta) is installed for gradual migration. Do not mix v2 and v3 components on the same page.

### Tailwind-First

When HeroUI component default styling are not enough, one can use Tailwind utility classes. No CSS modules. No styled-components.

```tsx
// Good
<div className="flex items-center gap-2 rounded-lg bg-default-100 p-4">

// Avoid
<div style={{ display: 'flex', alignItems: 'center' }}>
```

### Theming

- Primary color scale (50-900) generated at runtime from user preference
- oklch color space for perceptual uniformity
- Dark mode via CSS class toggle (`.dark`)
- No hard-coded color values in components — always use tokens (`bg-primary`, `text-default-500`)

## Internationalization

### Rules

1. **Never hardcode user-facing strings.** All text goes through the i18n system.
2. **Apostrophes use `&apos;`** (the HTML entity) instead of `'` in translation strings.
3. Per-component translations live in `i18n/` subdirectories alongside the component.
4. Supported languages: English, French, German, Spanish, Arabic, Korean (Portuguese in some modules).
5. RTL languages (Arabic) are handled via `<html dir="rtl">` set at app init.

### Pattern

```typescript
// i18n/en.ts
export default {
  greeting: 'Hello',
  agentCreated: 'Agent "{name}" has been created',
}

// Component
const { t } = useI18n()
return <p>{t('greeting')}</p>
```

## Testing

### TDD Mandate

All new code in `src/lib/` and `src/stores/` **must** follow TDD:

1. **Red** — Write a failing test
2. **Green** — Minimal code to pass
3. **Refactor** — Clean up, keep tests green
4. **Verify** — `npm run test:coverage`

### Coverage Targets

| Directory | Target | Priority |
|-----------|--------|----------|
| `src/lib/**` | 60%+ | Critical |
| `src/stores/**` | 60%+ | Critical |
| `src/components/**` | 30%+ | Medium |
| `src/pages/**` | 20%+ | Low |

### Test Organization

- Unit tests: `src/test/{category}/{name}.test.ts`
- E2E tests: `tests/e2e/{scenario}.spec.ts`
- Run: `npm run test:run` (once), `npm run test:watch` (dev), `npm run test:e2e` (browser)

## LLM Provider Integration

### Adding a New Provider

1. Implement `LLMProviderInterface` in `src/lib/llm/providers/{name}.ts`
2. Register in `src/lib/llm/index.ts`
3. Add model definitions to `src/lib/llm/models.ts`
4. Tool calling uses OpenAI function-calling format as the canonical schema

### Iterative Tool Loop

The agent runner executes tools iteratively (up to `max_tool_iterations` rounds). Each round: send messages → check for `tool_calls` → execute tools → append results → repeat until the model returns content without tool calls.

## Tool Plugin Conventions

### Structure

```typescript
export const myTool = createToolPlugin({
  metadata: {
    name: 'my_tool',
    displayName: 'My Tool',
    shortDescription: 'Does a thing',
    icon: 'Wrench',
    category: 'utility',
    tags: ['tag1'],
    enabledByDefault: true,
    estimatedDuration: 1000,
  },
  definition: {
    type: 'function',
    function: {
      name: 'my_tool',
      description: 'Does a thing',
      parameters: { type: 'object', properties: { ... }, required: [...] },
    },
  },
  handler: async (args, context) => { ... },
})
```

### Registration

Add the plugin to `src/tools/plugins/index.ts`. Tools are lazy-registered at first chat invocation.

## Git & Commits

- Commit messages: imperative mood, concise (`Add agent memory export`, not `Added agent memory export feature`)
- Branch naming: `feature/short-description`, `fix/short-description`
- PRs: Summary + test plan

## Error Handling

- Business logic errors: return structured results, never throw
- UI errors: caught by React ErrorBoundary at app root
- LLM failures: retry with exponential backoff, then graceful degradation
- Orchestration failures: mark task as failed, emit error event, continue other tasks
- Toast notifications for user-facing errors

## Security

- **Never log credentials.** ESLint rules enforce this in connector code.
- **Encrypt at rest.** API keys stored via Web Crypto API (AES-GCM).
- **Sandbox extensions.** All third-party code runs in iframes with a message bridge.
- **No `eval`.** Code execution uses QuickJS (WebAssembly sandbox).

---

**Related:** [ARCHITECTURE.md](./ARCHITECTURE.md), [DECISIONS.md](./DECISIONS.md)
