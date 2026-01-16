---
name: feature-development
description: Guide for developing new features in the DEVS platform following the modular feature architecture. Use this when asked to add a new feature, create a feature module, or understand the feature structure.
---

# Feature Development for DEVS

Features in DEVS are self-contained modules that encapsulate related functionality. Each feature has its own components, hooks, stores, and logic.

## Feature Directory Structure

```
src/features/{feature-name}/
├── index.ts              # Public exports
├── components/           # Feature-specific components
│   ├── FeatureComponent.tsx
│   └── index.ts
├── hooks/                # Feature-specific hooks
│   ├── useFeatureHook.ts
│   └── index.ts
├── stores/               # Feature-specific stores (if needed)
│   └── featureStore.ts
├── lib/                  # Feature-specific utilities
│   └── feature-utils.ts
├── types/                # Feature-specific types
│   └── index.ts
└── README.md             # Feature documentation
```

## Existing Features Reference

| Feature      | Directory                    | Description                         |
| ------------ | ---------------------------- | ----------------------------------- |
| Battle Arena | `src/features/battle/`       | Agent vs agent competitions         |
| Connectors   | `src/features/connectors/`   | OAuth integrations (Google, Notion) |
| Live         | `src/features/live/`         | Real-time collaboration             |
| Sync         | `src/features/sync/`         | P2P data synchronization via Yjs    |
| Traces       | `src/features/traces/`       | LLM observability and analytics     |
| Local Backup | `src/features/local-backup/` | File system sync                    |

## Creating a New Feature

### 1. Create Feature Directory

```bash
mkdir -p src/features/my-feature/{components,hooks,lib,types}
```

### 2. Define Types

```typescript
// src/features/my-feature/types/index.ts
export interface MyFeatureConfig {
  enabled: boolean
  option1: string
  option2: number
}

export interface MyFeatureState {
  isActive: boolean
  data: MyFeatureData[]
}

export interface MyFeatureData {
  id: string
  name: string
  createdAt: Date
}
```

### 3. Create Feature Store (if needed)

```typescript
// src/features/my-feature/stores/myFeatureStore.ts
import { create } from 'zustand'
import type { MyFeatureState, MyFeatureData } from '../types'

interface MyFeatureActions {
  initialize: () => Promise<void>
  addData: (data: MyFeatureData) => void
  clear: () => void
}

export const useMyFeatureStore = create<MyFeatureState & MyFeatureActions>(
  (set) => ({
    isActive: false,
    data: [],

    initialize: async () => {
      // Initialize feature
      set({ isActive: true })
    },

    addData: (data) => {
      set((state) => ({ data: [...state.data, data] }))
    },

    clear: () => {
      set({ data: [], isActive: false })
    },
  }),
)
```

### 4. Create Components

```typescript
// src/features/my-feature/components/MyFeaturePanel.tsx
import { Card, CardBody, Button } from '@heroui/react'
import { useTranslation } from 'react-i18next'
import { useMyFeatureStore } from '../stores/myFeatureStore'

export function MyFeaturePanel() {
  const { t } = useTranslation()
  const { isActive, data, initialize } = useMyFeatureStore()

  if (!isActive) {
    return (
      <Card>
        <CardBody>
          <Button onPress={initialize}>
            {t('myFeature.activate')}
          </Button>
        </CardBody>
      </Card>
    )
  }

  return (
    <Card>
      <CardBody>
        <h2>{t('myFeature.title')}</h2>
        {data.map((item) => (
          <div key={item.id}>{item.name}</div>
        ))}
      </CardBody>
    </Card>
  )
}
```

### 5. Create Hooks

```typescript
// src/features/my-feature/hooks/useMyFeature.ts
import { useCallback, useEffect } from 'react'
import { useMyFeatureStore } from '../stores/myFeatureStore'

export function useMyFeature() {
  const store = useMyFeatureStore()

  useEffect(() => {
    // Setup on mount
    return () => {
      // Cleanup on unmount
    }
  }, [])

  const handleAction = useCallback(async () => {
    // Feature-specific logic
  }, [])

  return {
    ...store,
    handleAction,
  }
}
```

### 6. Create Public Exports

```typescript
// src/features/my-feature/index.ts
export { MyFeaturePanel } from './components/MyFeaturePanel'
export { useMyFeature } from './hooks/useMyFeature'
export { useMyFeatureStore } from './stores/myFeatureStore'
export type { MyFeatureConfig, MyFeatureState, MyFeatureData } from './types'
```

### 7. Add Feature Documentation

```markdown
<!-- src/features/my-feature/README.md -->

# My Feature

Brief description of what this feature does.

## Usage

\`\`\`tsx
import { MyFeaturePanel, useMyFeature } from '@/features/my-feature'

function App() {
const { isActive, handleAction } = useMyFeature()

return <MyFeaturePanel />
}
\`\`\`

## Configuration

Describe configuration options...

## API Reference

### Components

- `MyFeaturePanel` - Main UI component

### Hooks

- `useMyFeature()` - Primary hook for feature functionality

### Store

- `useMyFeatureStore` - Zustand store for feature state
```

## Integration Points

### Adding to Navigation

```typescript
// In relevant page or layout
import { MyFeaturePanel } from '@/features/my-feature'

function MyPage() {
  return (
    <div>
      <MyFeaturePanel />
    </div>
  )
}
```

### Feature Flags

For features that need to be toggleable:

```typescript
// src/features/my-feature/lib/feature-flags.ts
export function isMyFeatureEnabled(): boolean {
  // Check user settings, environment, etc.
  return localStorage.getItem('myFeature.enabled') === 'true'
}
```

### Adding Translations

```typescript
// Add to src/i18n/locales/en.ts
export default {
  // ... existing translations
  myFeature: {
    title: 'My Feature',
    activate: 'Activate Feature',
    description: 'Feature description',
  },
}
```

## Testing Features

```typescript
// src/test/features/my-feature/MyFeaturePanel.test.tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MyFeaturePanel } from '@/features/my-feature'
import { useMyFeatureStore } from '@/features/my-feature/stores/myFeatureStore'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

describe('MyFeaturePanel', () => {
  beforeEach(() => {
    useMyFeatureStore.setState({ isActive: false, data: [] })
  })

  it('shows activate button when inactive', () => {
    render(<MyFeaturePanel />)
    expect(screen.getByText('myFeature.activate')).toBeInTheDocument()
  })

  it('shows data when active', () => {
    useMyFeatureStore.setState({
      isActive: true,
      data: [{ id: '1', name: 'Test', createdAt: new Date() }],
    })
    render(<MyFeaturePanel />)
    expect(screen.getByText('Test')).toBeInTheDocument()
  })
})
```

## Best Practices

1. **Keep features isolated**: Minimize dependencies between features
2. **Use index exports**: Only expose public API through `index.ts`
3. **Document thoroughly**: Each feature should have a README
4. **Test in isolation**: Feature tests shouldn't depend on other features
5. **Lazy load when possible**: Use dynamic imports for large features
