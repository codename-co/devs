# DEVS Extension Bridge API

This documentation describes the APIs available to extensions running in DEVS sandboxed iframes via the `window.DEVS` global object.

## Overview

Extensions are loaded in sandboxed iframes and communicate with the parent DEVS app through a message-based API. The bridge script (`extension-bridge.js`) is automatically injected and exposes the `DEVS` global object.

All async methods return Promises and can throw errors. Wrap calls in try-catch:

```javascript
try {
  const response = await DEVS.llm.chat([...])
} catch (error) {
  DEVS.ui.toast(error.message, { type: 'error' })
}
```

Common error types:

- **Request timeout** - The request took too long (default 30s for most calls, 2 min for LLM/streaming)
- **Unknown error** - Generic error from the parent app

---

## Context Properties

Static context available immediately when the extension loads:

| Property        | Type     | Description                                     |
| --------------- | -------- | ----------------------------------------------- |
| `extensionId`   | `string` | Unique identifier for this extension            |
| `extensionName` | `string` | Display name of the extension                   |
| `theme`         | `string` | Current DEVS theme (`'light'` or `'dark'`)      |
| `language`      | `string` | Current UI language code (e.g., `'en'`, `'fr'`) |

```javascript
console.log(DEVS.extensionId) // "my-extension-id"
console.log(DEVS.theme) // "dark"
```

---

## Translation Helper

### `DEVS.t(key, params?)`

Returns the translated string for the given key, or the key itself as fallback. Interpolation placeholders like `{name}` are replaced with provided params.

```typescript
t(key: string, params?: Record<string, string>): string
```

```javascript
const label = DEVS.t('save_button') // "Save"
const greeting = DEVS.t('hello_user', { name: 'Alice' }) // "Hello, Alice!"
```

---

## Navigation

### `DEVS.navigate(path)`

Navigate to a DEVS route or external URL. Fire-and-forget (no return value).

```typescript
navigate(path: string): void
```

```javascript
DEVS.navigate('/x/my-extension/settings')
```

---

## LLM API (`DEVS.llm`)

### `chat(messages, options?)`

Send a chat completion request to the user's configured LLM provider.

```typescript
chat(
  messages: Array<{
    role: 'system' | 'user' | 'assistant'
    content: string
  }>,
  options?: {
    temperature?: number // 0-2
    maxTokens?: number
  }
): Promise<{
  content: string
  usage?: {
    promptTokens: number
    completionTokens: number
  }
}>
```

```javascript
const response = await DEVS.llm.chat(
  [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: 'Hello!' },
  ],
  { temperature: 0.7 },
)

console.log(response.content)
```

### `complete(prompt, options?)`

Convenience wrapper around `chat()` that takes a single prompt string and returns the response content directly.

```typescript
complete(prompt: string, options?: { temperature?: number; maxTokens?: number }): Promise<string>
```

```javascript
const result = await DEVS.llm.complete('Write a haiku about coding')
```

---

## UI API (`DEVS.ui`)

### `toast(message, options?)`

Show a toast notification. Fire-and-forget (no return value).

```typescript
toast(
  message: string,
  options?: {
    type?: 'success' | 'error' | 'warning' | 'info'
    duration?: number // milliseconds, default 3000
  }
): void
```

```javascript
DEVS.ui.toast('File saved successfully!', { type: 'success' })
DEVS.ui.toast('Something went wrong', { type: 'error', duration: 5000 })
```

### `confirm(options)`

Show a confirmation dialog. Returns `true` if confirmed, `false` if cancelled.

```typescript
confirm(options: {
  title: string
  message: string
  confirmLabel?: string // default 'Confirm'
  cancelLabel?: string  // default 'Cancel'
}): Promise<boolean>
```

```javascript
const confirmed = await DEVS.ui.confirm({
  title: 'Delete item?',
  message: 'This action cannot be undone.',
  confirmLabel: 'Delete',
  cancelLabel: 'Keep',
})
```

---

## Agents API (`DEVS.agents`)

### `list()`

List all available agents (built-in + custom). Returns basic agent metadata.

```typescript
list(): Promise<Array<{
  id: string
  slug: string
  name: string
  role: string
  icon?: string
  instructions?: string
}>>
```

### `get(idOrSlug)`

Get a specific agent by ID or slug. Returns `null` if the agent is not found or has been deleted.

```typescript
get(idOrSlug: string): Promise<Agent | null>
```

```javascript
const agents = await DEVS.agents.list()
const devs = await DEVS.agents.get('devs')
```

---

## Image Generation API (`DEVS.image`)

### `generate(prompt, options?)`

Generate an image from a text prompt using the user's configured provider.

```typescript
generate(
  prompt: string,
  options?: {
    provider?: string  // 'openai', 'stability', 'together', etc.
    model?: string
    size?: string      // '512x512', '1024x1024'
    style?: string     // 'vivid', 'natural'
    quality?: string   // 'standard', 'hd'
  }
): Promise<{
  url: string
  base64?: string
}>
```

```javascript
const image = await DEVS.image.generate('A sunset over mountains', {
  size: '1024x1024',
  style: 'vivid',
})
```

---

## Storage API (`DEVS.storage`)

Extension-scoped persistent storage backed by localStorage. Data is isolated per extension ID.

### `set(key, value)`

Store a value. The value is JSON-serialized.

```typescript
set(key: string, value: any): Promise<void>
```

### `get(key)`

Retrieve a stored value. Returns `null` if the key does not exist.

```typescript
get(key: string): Promise<any>
```

### `remove(key)`

Delete a stored value.

```typescript
remove(key: string): Promise<void>
```

### `keys()`

List all storage keys for this extension.

```typescript
keys(): Promise<string[]>
```

```javascript
await DEVS.storage.set('preferences', { darkMode: true })
const prefs = await DEVS.storage.get('preferences')
const allKeys = await DEVS.storage.keys()
await DEVS.storage.remove('preferences')
```

---

## Vision API (`DEVS.vision`)

### `analyze(imageData, prompt?, options?)`

Analyze an image using the user's configured vision-capable LLM. Accepts a base64 string or data URL.

```typescript
analyze(
  imageData: string,
  prompt?: string,
  options?: {
    provider?: string
    model?: string
  }
): Promise<{
  description: string
  usage?: { promptTokens: number; completionTokens: number }
}>
```

### `interpretSketch(imageData, options?)`

Interpret hand-drawn sketches and diagrams. Returns a structured JSON interpretation with identified elements and suggested actions.

```typescript
interpretSketch(
  imageData: string,
  options?: {
    type?: 'flowchart' | 'wireframe' | 'diagram' | 'freeform'
  }
): Promise<{
  interpretation: string
  elements: Array<{
    type: string
    label?: string
    connections?: string[]
  }>
  suggestedActions?: string[]
}>
```

```javascript
const canvas = document.querySelector('canvas')
const imageData = canvas.toDataURL('image/png')

const analysis = await DEVS.vision.analyze(imageData, 'What do you see?')
const sketch = await DEVS.vision.interpretSketch(imageData, {
  type: 'wireframe',
})
```

---

## Tools API (`DEVS.tools`)

Access and execute registered DEVS tools (knowledge search, math, code execution, etc.).

### `list(options?)`

List available tools, optionally filtered by category or tags.

```typescript
list(options?: {
  category?: string   // 'knowledge', 'math', 'code', 'utility', etc.
  tags?: string[]
  enabledOnly?: boolean // default true
}): Promise<Array<{
  name: string
  displayName: string
  shortDescription: string
  icon: string
  category: string
  tags?: string[]
  definition: object
}>>
```

### `get(name)`

Get a specific tool by name. Returns `null` if not found.

```typescript
get(name: string): Promise<Tool | null>
```

### `execute(name, args, options?)`

Execute a tool with the given arguments.

```typescript
execute(
  name: string,
  args: object,
  options?: { timeout?: number } // default 60000ms
): Promise<{
  success: boolean
  result?: any
  error?: string
}>
```

### `getCategories()`

Get all available tool categories.

```typescript
getCategories(): Promise<string[]>
```

```javascript
// List available tools
const tools = await DEVS.tools.list({ category: 'knowledge' })

// Execute a tool
const result = await DEVS.tools.execute('search_knowledge', {
  query: 'design patterns',
})
```

---

## Keyboard Events

The bridge automatically forwards keyboard events to the parent DEVS window for global hotkey handling. Events from input fields (`<input>`, `<textarea>`, `contenteditable`) are only forwarded when modifier keys (Cmd/Ctrl) are pressed.

---

## Planned APIs (Not Yet Available)

The following APIs are defined in the bridge script but do not have handlers in the parent app yet. Calling them will return an "Unknown message type" error.

| API Namespace              | Description                          |
| -------------------------- | ------------------------------------ |
| `DEVS.canvas.*`            | Real-time P2P canvas collaboration   |
| `DEVS.agentCollaboration.*`| Invite agents as canvas participants |
| `DEVS.knowledge.*`         | Knowledge base search and storage    |
| `DEVS.tasks.*`             | Task creation and tracking           |
| `DEVS.conversations.*`     | Conversation history access          |
| `DEVS.artifacts.*`         | Task artifact management             |
| `DEVS.export.*`            | Canvas export to various formats     |
| `DEVS.clipboard.*`         | Clipboard copy/paste operations      |

These APIs are planned for future releases. Do not rely on them in production extensions.
