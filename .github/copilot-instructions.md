# DEVS AI Platform - Copilot Instructions

## Project Overview

DEVS is a **browser-native AI agent orchestration platform** built as a PWA. All processing happens client-side using IndexedDB, Service Workers, and Web Crypto API—no backend required. Users delegate complex tasks to teams of AI agents that collaborate autonomously.

## Architecture at a Glance

```
src/
├── lib/           # Core business logic (orchestrator, LLM, task analysis)
├── stores/        # Zustand stores with IndexedDB persistence
├── features/      # Feature modules (battle, connectors, live, sync, traces)
├── components/    # Shared React components using HeroUI
├── pages/         # Route-based page components
├── types/         # TypeScript interfaces (Agent, Task, Conversation, etc.)
└── i18n/          # Internationalization (6 languages)
```

**Key architectural decisions:**

- **Offline-first**: All data persists in IndexedDB via `src/lib/db/index.ts`
- **Provider-agnostic LLM**: Abstract interface in `src/lib/llm/index.ts` supports OpenAI, Anthropic, Gemini, Ollama, and more
- **Zustand for state**: Stores in `src/stores/` sync with IndexedDB and Yjs for P2P

## Critical Patterns

### Store Pattern (src/stores/)

Stores export functions (not hooks) for non-React contexts. Use the store directly for business logic:

```typescript
// ✅ Correct - import functions directly
import { getAgentById, createAgent } from '@/stores/agentStore'
// ❌ Wrong - don't destructure from useStore in lib code
```

### LLM Service Usage

Always use `LLMService` from `@/lib/llm` for AI calls—never call provider APIs directly:

```typescript
import { LLMService } from '@/lib/llm'
const response = await LLMService.chat(messages, config)
```

### Component Library

Use **HeroUI** (`@heroui/react`) for all UI components. Import specific components:

```typescript
import { Button, Modal, Spinner, Chip } from '@heroui/react'
```

### Path Aliases

Always use `@/` prefix for imports (configured in `tsconfig.json`):

```typescript
import { Agent } from '@/types'
import { db } from '@/lib/db'
```

## Development Commands

```bash
npm run dev          # Start Vite dev server (runs scripts/prepare-config-files.js first)
npm run test:watch   # Vitest in watch mode (recommended during development)
npm run test:coverage # Coverage report (verify before committing lib/ or stores/ changes)
npm run test:e2e     # Playwright E2E tests
npm run lint         # ESLint check
npm run typecheck    # TypeScript compilation check
```

## Testing Requirements

**TDD is mandatory for `src/lib/` and `src/stores/`**:

1. Write failing test first in `src/test/`
2. Implement minimum code to pass
3. Run `npm run test:coverage` before committing

Coverage targets: 60%+ for lib/ and stores/, 30%+ for components/.

Test files mirror source structure:

- `src/lib/orchestrator.ts` → `src/test/lib/orchestrator.test.ts`

## Key Domain Concepts

| Entity        | Store               | Description                                       |
| ------------- | ------------------- | ------------------------------------------------- |
| Agent         | `agentStore`        | AI persona with instructions, role, temperature   |
| Task          | `taskStore`         | Work item with requirements, dependencies, status |
| Conversation  | `conversationStore` | Multi-agent chat history                          |
| Artifact      | `artifactStore`     | Task deliverables (code, docs, etc.)              |
| KnowledgeItem | DB directly         | User files/documents for agent context            |

## Orchestration Flow

User prompts flow through `WorkflowOrchestrator` (`src/lib/orchestrator.ts`):

1. `TaskAnalyzer` breaks down complexity and requirements
2. Agents recruited from cache or created via `agent-recruiter`
3. Tasks execute with dependency resolution (parallel when possible)
4. `RequirementValidator` verifies deliverables
5. Failed validations trigger refinement cycles

## i18n Guidelines

- Translation files in `src/i18n/locales/`
- Use `’` (curly apostrophe) not `'` in translation strings
- All user-facing strings must support 6+ languages

## Feature Modules

Each feature in `src/features/` is self-contained:

- `connectors/` - OAuth 2.0 PKCE integrations (Google, Notion)
- `sync/` - P2P sync via Yjs/WebRTC
- `traces/` - LLM observability
- `battle/` - Agent vs agent competitive arena
- `local-backup/` - Bidirectional file system sync

## Common Gotchas

1. **Database initialization**: Always check `db.isInitialized()` before operations
2. **Agent slugs**: The way to go to reference an agent; their slug is auto-generated from name, must be unique—use `generateUniqueSlug()`
3. **Service Worker**: LLM requests proxy through `public/sw.js` for progress tracking
4. **Soft deletes**: Agents use `deletedAt` field, not hard deletes
