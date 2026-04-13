# Contributing to DEVS

Contributions are welcome! This guide covers everything you need to get started.

For detailed conventions, see [docs/CONVENTIONS.md](docs/CONVENTIONS.md).

## Getting Started

### Prerequisites

- **Node.js** 24+ (LTS recommended)
- **npm** 10+

### Setup

```shell
# Install dependencies
npm i

# Start the development server
npm run dev

# Build and preview
npm run build
npm run preview
```

## Project Structure

```
src/
  app/            App shell, providers, router
  components/     Shared UI components
  features/       Independent feature modules (connectors, marketplace, studio, traces, etc.)
  hooks/          Shared custom React hooks
  i18n/           Translations
  lib/            Business logic and services
  pages/          Route-level page components
  stores/         Zustand stores (Yjs-backed)
  test/           Unit tests (mirrors src/ structure)
  tools/          Tool plugin definitions
  types/          Shared TypeScript types
```

Feature modules (`src/features/`) are self-contained. They may import from `src/lib/`, `src/stores/`, and `src/types/` but never from other features.

## Testing

### Running Tests

```bash
npm run test:run       # Run all unit tests once
npm run test:watch     # Watch mode (recommended during development)
npm run test:coverage  # Tests with coverage report
npm run test:e2e       # E2E tests (Playwright)
npm run test:e2e:ui    # E2E tests with interactive UI
```

### TDD Mandate

**All new code in `src/lib/` and `src/stores/` must follow TDD:**

1. **Red** — Write a failing test that describes expected behavior
2. **Green** — Write the minimum code to make it pass
3. **Refactor** — Improve code quality while keeping tests green
4. **Verify** — Run `npm run test:coverage` before committing

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

## Code Style

### Naming

| Type | Pattern | Example |
|------|---------|---------|
| Component | `PascalCase.tsx` | `AgentCard.tsx` |
| Hook | `use{Name}.ts` | `useThreads.ts` |
| Store | `{name}Store.ts` | `agentStore.ts` |
| Service/utility | `kebab-case.ts` | `context-broker.ts` |
| Test | `{name}.test.ts` | `agent-store.test.ts` |

### Styling

Tailwind CSS utility classes. No CSS modules. No styled-components. No hard-coded color values — use tokens (`bg-primary`, `text-default-500`).

### Internationalization

Never hardcode user-facing strings. All text goes through the i18n system. Apostrophes use `&apos;` in translation strings.

### State Management

Yjs is the single source of truth. Stores write directly to Yjs maps; reads come through reactive hooks (`useLiveMap`, `useLiveValue`). See [docs/CONVENTIONS.md](docs/CONVENTIONS.md) for patterns.

## Git Conventions

- **Commit messages:** Gitmoji with imperative mood, concise (`:sparkles: Add agent memory export`, not `Added agent memory export feature`)
- **Branch naming:** `feature/short-description`, `fix/short-description`
- **PRs:** Include a summary and test plan

## Other Commands

```bash
npm run lint         # Run ESLint
npm run typecheck    # Run TypeScript type checker
```

## Further Reading

- [Architecture](docs/ARCHITECTURE.md) — System design and data layer
- [Conventions](docs/CONVENTIONS.md) — Full coding conventions
- [Decisions](docs/DECISIONS.md) — Why things are the way they are
- [Glossary](docs/GLOSSARY.md) — Term definitions
