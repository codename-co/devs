---
name: react-component-development
description: Guide for creating React components using HeroUI in the DEVS platform. Use this when asked to create new UI components, pages, or modify existing React code.
---

# React Component Development for DEVS

When creating React components in the DEVS platform, follow these patterns using HeroUI and project conventions.

## Component Structure

Components are organized as:

- `src/components/` - Shared/reusable components
- `src/pages/` - Route-based page components
- `src/features/{feature}/components/` - Feature-specific components

## Component Template

```tsx
import { useState, useCallback } from 'react'
import { Button, Card, CardBody, Spinner } from '@heroui/react'
import { useTranslation } from 'react-i18next'
import { Icon } from '@/components/Icon'

interface MyComponentProps {
  title: string
  onAction?: () => void
  isDisabled?: boolean
  children?: React.ReactNode
}

export function MyComponent({
  title,
  onAction,
  isDisabled = false,
  children,
}: MyComponentProps) {
  const { t } = useTranslation()
  const [isLoading, setIsLoading] = useState(false)

  const handleAction = useCallback(async () => {
    if (!onAction) return
    setIsLoading(true)
    try {
      await onAction()
    } finally {
      setIsLoading(false)
    }
  }, [onAction])

  return (
    <Card>
      <CardBody className="gap-4">
        <h2 className="text-lg font-semibold">{title}</h2>
        {children}
        <Button
          color="primary"
          isDisabled={isDisabled || isLoading}
          isLoading={isLoading}
          onPress={handleAction}
        >
          {t('common.submit')}
        </Button>
      </CardBody>
    </Card>
  )
}
```

## HeroUI Component Usage

Always import from `@heroui/react`:

```tsx
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  CardFooter,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Input,
  Textarea,
  Select,
  SelectItem,
  Chip,
  Badge,
  Avatar,
  Spinner,
  Progress,
  Tooltip,
  Popover,
  PopoverTrigger,
  PopoverContent,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Table,
  TableHeader,
  TableBody,
  TableColumn,
  TableRow,
  TableCell,
  Tabs,
  Tab,
  Accordion,
  AccordionItem,
  Divider,
  Switch,
  Checkbox,
} from '@heroui/react'
```

## Critical Patterns

### 1. Internationalization (i18n)

All user-facing strings must be translatable:

```tsx
import { useTranslation } from 'react-i18next'

function MyComponent() {
  const { t } = useTranslation()

  return <Button>{t('agents.create')}</Button>
}
```

Use curly apostrophe `'` (not `'`) in translation strings.

### 2. Path Aliases

Always use `@/` prefix for imports:

```tsx
// ✅ Correct
import { Agent } from '@/types'
import { Icon } from '@/components/Icon'

// ❌ Wrong
import { Agent } from '../../types'
```

### 3. Event Handlers

Use HeroUI's `onPress` instead of `onClick` for buttons:

```tsx
// ✅ Correct
<Button onPress={handleClick}>Click me</Button>

// ❌ Avoid for HeroUI buttons
<Button onClick={handleClick}>Click me</Button>
```

### 4. Loading States

Use HeroUI's built-in loading props:

```tsx
<Button isLoading={isLoading} isDisabled={isLoading}>
  Submit
</Button>

<Spinner size="sm" />
```

### 5. Icons

Use the project's Icon component with Lucide icons:

```tsx
import { Icon } from '@/components/Icon'

<Icon name="Plus" size={20} />
<Icon name="Settings" className="text-default-500" />
```

### 6. Styling

Use Tailwind CSS classes. Common patterns:

```tsx
// Flex layouts
<div className="flex items-center gap-2">
<div className="flex flex-col gap-4">

// Spacing
<div className="p-4 m-2">
<div className="px-4 py-2">

// Text styling
<span className="text-sm text-default-500">
<h2 className="text-lg font-semibold">
```

## Store Integration

Use Zustand stores with selectors for performance:

```tsx
import { useAgentStore } from '@/stores/agentStore'

function AgentList() {
  // ✅ Good - select only what you need
  const agents = useAgentStore((state) => state.agents)
  const isLoading = useAgentStore((state) => state.isLoading)

  // ❌ Bad - subscribes to entire store
  const store = useAgentStore()
}
```

## Modal Pattern

```tsx
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  useDisclosure,
} from '@heroui/react'

function MyModal() {
  const { isOpen, onOpen, onOpenChange } = useDisclosure()

  return (
    <>
      <Button onPress={onOpen}>Open Modal</Button>
      <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>Title</ModalHeader>
              <ModalBody>Content</ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>
                  Cancel
                </Button>
                <Button color="primary" onPress={onClose}>
                  Confirm
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  )
}
```

## Testing

Component tests go in `src/test/components/`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { MyComponent } from '@/components/MyComponent'

describe('MyComponent', () => {
  it('renders title correctly', () => {
    render(<MyComponent title="Test Title" />)
    expect(screen.getByText('Test Title')).toBeInTheDocument()
  })
})
```
