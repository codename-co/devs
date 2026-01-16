---
name: i18n-translation
description: Guide for adding internationalization support in the DEVS platform. Use this when asked to add new languages, translate strings, or work with i18n files.
---

# Internationalization (i18n) for DEVS

DEVS supports multiple languages. All user-facing strings must be translatable.

## Supported Languages

- `en` - English (default)
- `fr` - French
- `es` - Spanish
- `de` - German
- `it` - Italian
- `ja` - Japanese
- `zh` - Chinese
- `ko` - Korean
- `pt` - Portuguese

## File Locations

- UI translations: `src/i18n/locales/{lang}.ts`
- Agent translations: `public/agents/*.agent.yaml` (i18n section)
- Methodology translations: `public/methodologies/*.methodology.yaml` (i18n section)

## UI Translation Structure

```typescript
// src/i18n/locales/en.ts
export default {
  common: {
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    loading: 'Loading...',
    error: 'An error occurred',
  },
  agents: {
    title: 'Agents',
    create: 'Create Agent',
    edit: 'Edit Agent',
    delete: 'Delete Agent',
    name: 'Name',
    role: 'Role',
    instructions: 'Instructions',
  },
  conversations: {
    title: 'Conversations',
    new: 'New Conversation',
    empty: 'No messages yet',
    placeholder: 'Type your message...',
  },
  // ... more sections
}
```

## Using Translations in Components

```tsx
import { useTranslation } from 'react-i18next'

function MyComponent() {
  const { t } = useTranslation()

  return (
    <div>
      <h1>{t('agents.title')}</h1>
      <Button>{t('common.save')}</Button>

      {/* With interpolation */}
      <p>{t('agents.greeting', { name: agent.name })}</p>

      {/* With pluralization */}
      <p>{t('agents.count', { count: agents.length })}</p>
    </div>
  )
}
```

## Interpolation

```typescript
// In translation file
{
  greeting: 'Hello, {{name}}!',
  itemCount: '{{count}} item',
  itemCount_plural: '{{count}} items',
}

// In component
t('greeting', { name: 'John' })  // "Hello, John!"
t('itemCount', { count: 1 })     // "1 item"
t('itemCount', { count: 5 })     // "5 items"
```

## Adding a New Translation Key

1. Add the key to `src/i18n/locales/en.ts` (default language)
2. Add translations to all other language files
3. Use the key in your component with `t('section.key')`

```typescript
// 1. Add to en.ts
export default {
  myFeature: {
    title: 'My Feature',
    description: 'This is my new feature',
  },
}

// 2. Add to fr.ts
export default {
  myFeature: {
    title: 'Ma Fonctionnalité',
    description: 'Ceci est ma nouvelle fonctionnalité',
  },
}

// 3. Use in component
const { t } = useTranslation()
<h1>{t('myFeature.title')}</h1>
```

## Agent/Methodology i18n

Add translations directly in YAML files:

```yaml
id: my-agent
name: My Agent
desc: Short description
role: Role description
instructions: |
  English instructions...

i18n:
  fr:
    name: Mon Agent
    desc: Description courte
    role: Description du rôle
    instructions: |
      Instructions en français...
  es:
    name: Mi Agente
    desc: Descripción corta
    role: Descripción del rol
    instructions: |
      Instrucciones en español...
  de:
    name: Mein Agent
    desc: Kurze Beschreibung
    role: Rollenbeschreibung
    instructions: |
      Anweisungen auf Deutsch...
```

## Critical Rules

### 1. Use Curly Apostrophe

**Always use `'` (curly apostrophe) instead of `'` (straight apostrophe)** in translation strings:

```typescript
// ✅ Correct
"It's working" // Using '
"Don't forget" // Using '

// ❌ Wrong
"It's working" // Using '
"Don't forget" // Using '
```

### 2. Alphabetical Ordering

Keep translation keys in alphabetical order within each section:

```typescript
export default {
  common: {
    cancel: 'Cancel', // a
    delete: 'Delete', // d
    edit: 'Edit', // e
    save: 'Save', // s
  },
}
```

### 3. Consistent Key Naming

Use camelCase for keys, organized by feature:

```typescript
{
  agents: {
    createNew: 'Create New Agent',
    deleteConfirm: 'Are you sure you want to delete this agent?',
    editTitle: 'Edit Agent',
  },
}
```

### 4. No HTML in Translations

Avoid HTML in translation strings. Use Trans component for complex formatting:

```tsx
import { Trans } from 'react-i18next'

// Instead of: t('message', { link: '<a href="...">' })
;<Trans i18nKey="learnMore">
  Click <a href="/docs">here</a> to learn more.
</Trans>
```

## Adding a New Language

1. Create new locale file: `src/i18n/locales/{lang}.ts`
2. Copy structure from `en.ts` and translate all strings
3. Add language code to `src/i18n/locales.ts`
4. Add language option to settings UI

```typescript
// src/i18n/locales.ts
export const supportedLocales = [
  { code: 'en', name: 'English' },
  { code: 'fr', name: 'Français' },
  { code: 'es', name: 'Español' },
  { code: 'new', name: 'New Language' }, // Add new language
] as const
```

## Validation

Run type checking to ensure all translation keys are present:

```bash
npm run typecheck
```

Missing translations will cause TypeScript errors if the translation types are properly configured.

## Testing Translations

```typescript
import { describe, it, expect, vi } from 'vitest'

// Mock translations
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: object) => {
      if (params) {
        return `${key}:${JSON.stringify(params)}`
      }
      return key
    },
  }),
  Trans: ({ children }: { children: React.ReactNode }) => children,
}))

describe('MyComponent', () => {
  it('renders translated title', () => {
    render(<MyComponent />)
    expect(screen.getByText('myFeature.title')).toBeInTheDocument()
  })
})
```
