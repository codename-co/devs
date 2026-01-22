# DEVS Extension Bridge API

This documentation describes the interfaces available to extensions running in DEVS sandboxed iframes via `window.DEVS`.

## Overview

Extensions are loaded in sandboxed iframes and communicate with the parent DEVS app through a message-based API. The bridge script (`extension-bridge.js`) is automatically injected and exposes the `window.DEVS` object.

---

## Context Properties

Static context available immediately when the extension loads:

| Property        | Type     | Description                                     |
| --------------- | -------- | ----------------------------------------------- |
| `extensionId`   | `string` | Unique identifier for this extension            |
| `extensionName` | `string` | Display name of the extension                   |
| `theme`         | `string` | Current DEVS theme (`'light'` or `'dark'`)      |
| `language`      | `string` | Current UI language code (e.g., `'en'`, `'fr'`) |

**Example:**

```javascript
console.log(DEVS.extensionId) // "my-extension-id"
console.log(DEVS.theme) // "dark"
```

---

## Translation Helper

### `DEVS.t(key, params?)`

Returns the translated string for the given key, or the key itself as fallback.

```typescript
t(key: string, params?: Record<string, string>): string
```

**Example:**

```javascript
const label = DEVS.t('save_button') // "Save"
const greeting = DEVS.t('hello_user', { name: 'Alice' }) // "Hello, Alice!"
```

---

## LLM API (`DEVS.llm`)

### `chat(messages, options?)`

Send a chat completion request to the configured LLM provider.

```typescript
chat(
  messages: Array<{
    role: 'system' | 'user' | 'assistant'
    content: string
  }>,
  options?: {
    provider?: string    // 'openai', 'anthropic', 'google', etc.
    model?: string       // 'gpt-4', 'claude-3-opus', etc.
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

**Example:**

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

Generate a simple completion from a prompt string.

```typescript
complete(prompt: string, options?: LLMOptions): Promise<string>
```

**Example:**

```javascript
const result = await DEVS.llm.complete('Write a haiku about coding')
```

---

## UI API (`DEVS.ui`)

### `toast(message, options?)`

Show a toast notification (fire-and-forget).

```typescript
toast(
  message: string,
  options?: {
    type?: 'success' | 'error' | 'warning' | 'info'
    duration?: number // milliseconds, default 3000
  }
): void
```

**Example:**

```javascript
DEVS.ui.toast('File saved successfully!', { type: 'success' })
DEVS.ui.toast('Something went wrong', { type: 'error', duration: 5000 })
```

### `confirm(options)`

Show a confirmation dialog.

```typescript
confirm(options: {
  title: string
  message: string
  confirmLabel?: string // default 'Confirm'
  cancelLabel?: string  // default 'Cancel'
}): Promise<boolean>
```

**Example:**

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

List all available agents (built-in + custom).

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

Get a specific agent by ID or slug.

```typescript
get(idOrSlug: string): Promise<Agent | null>
```

**Example:**

```javascript
const agents = await DEVS.agents.list()
const devs = await DEVS.agents.get('devs')
```

---

## Image Generation API (`DEVS.image`)

### `generate(prompt, options?)`

Generate an image from a text prompt.

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

**Example:**

```javascript
const image = await DEVS.image.generate('A sunset over mountains', {
  size: '1024x1024',
  style: 'vivid',
})
```

---

## Storage API (`DEVS.storage`)

Extension-scoped persistent storage. Data is isolated per extension.

### `set(key, value)`

```typescript
set(key: string, value: any): Promise<void>
```

### `get(key)`

```typescript
get(key: string): Promise<any>
```

### `remove(key)`

```typescript
remove(key: string): Promise<void>
```

### `keys()`

```typescript
keys(): Promise<string[]>
```

**Example:**

```javascript
await DEVS.storage.set('preferences', { darkMode: true })
const prefs = await DEVS.storage.get('preferences')
const allKeys = await DEVS.storage.keys()
await DEVS.storage.remove('preferences')
```

---

## Vision API (`DEVS.vision`)

### `analyze(imageData, prompt?, options?)`

Analyze an image using vision models.

```typescript
analyze(
  imageData: string,  // Base64 or data URL
  prompt?: string,
  options?: {
    provider?: string
    model?: string
  }
): Promise<{
  description: string
  elements?: Array<{
    type: string
    bounds: { x: number; y: number; width: number; height: number }
    description: string
  }>
}>
```

### `interpretSketch(imageData, options?)`

Interpret hand-drawn sketches and diagrams.

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

**Example:**

```javascript
const canvas = document.querySelector('canvas')
const imageData = canvas.toDataURL('image/png')

const analysis = await DEVS.vision.analyze(imageData, 'What do you see?')
const sketch = await DEVS.vision.interpretSketch(imageData, {
  type: 'wireframe',
})
```

---

## Canvas Collaboration API (`DEVS.canvas`)

Real-time P2P canvas synchronization.

### `onPresenceUpdate(callback)`

Subscribe to real-time presence updates (cursors, selections).

```typescript
onPresenceUpdate(
  callback: (update: {
    userId: string
    agentId?: string
    name: string
    color: string
    position: { x: number; y: number }
    selection?: string[]
  }) => void
): () => void  // Returns unsubscribe function
```

### `broadcastPresence(state)`

Broadcast local cursor/selection state.

```typescript
broadcastPresence(state: {
  position: { x: number; y: number }
  selection?: string[]
}): void
```

### `getSharedDocument(documentId)`

Get Yjs-compatible shared document for real-time sync.

```typescript
getSharedDocument(documentId: string): Promise<{
  docId: string
  roomId: string
  awareness: object
}>
```

### `joinSession(documentId, options?)`

Join a collaborative canvas session.

```typescript
joinSession(
  documentId: string,
  options?: { name?: string; color?: string }
): Promise<{
  sessionId: string
  participants: Array<{ userId: string; name: string; color: string }>
}>
```

### `leaveSession(sessionId)`

```typescript
leaveSession(sessionId: string): Promise<void>
```

### `onCanvasChange(callback)`

Subscribe to canvas changes from other participants.

```typescript
onCanvasChange(
  callback: (change: {
    userId: string
    agentId?: string
    operation: 'add' | 'update' | 'delete'
    elements: any[]
  }) => void
): () => void
```

**Example:**

```javascript
// Join a session
const session = await DEVS.canvas.joinSession('my-canvas-id', {
  name: 'Alice',
  color: '#ff0000',
})

// Broadcast cursor position
DEVS.canvas.broadcastPresence({ position: { x: 100, y: 200 } })

// Listen for other users
const unsubscribe = DEVS.canvas.onPresenceUpdate((update) => {
  console.log(`${update.name} moved to`, update.position)
})

// Cleanup
unsubscribe()
await DEVS.canvas.leaveSession(session.sessionId)
```

---

## Agent Collaboration API (`DEVS.agentCollaboration`)

Invite AI agents as active canvas participants.

### `inviteAgent(agentIdOrSlug, options?)`

Invite an agent to join the canvas as an active participant.

```typescript
inviteAgent(
  agentIdOrSlug: string,
  options?: {
    role?: 'observer' | 'contributor' | 'facilitator'
    context?: string
    canvasSnapshot?: string  // Base64 image
  }
): Promise<{
  sessionId: string
  agentId: string
  agentName: string
}>
```

### `requestAction(sessionId, request)`

Request an agent action on canvas elements.

```typescript
requestAction(
  sessionId: string,
  request: {
    action: 'analyze' | 'suggest' | 'create' | 'refine' | 'organize' | 'annotate'
    elements?: any[]
    prompt?: string
    canvasSnapshot?: string
  }
): Promise<{
  response: string
  suggestedElements?: any[]
  annotations?: Array<{
    elementId?: string
    text: string
    position: { x: number; y: number }
  }>
  actions?: Array<{ type: string; payload: any }>
}>
```

### `streamAction(sessionId, request, onChunk)`

Stream agent responses for real-time updates.

```typescript
streamAction(
  sessionId: string,
  request: ActionRequest,
  onChunk: (chunk: {
    type: 'text' | 'element' | 'annotation' | 'action'
    data: any
  }) => void
): Promise<void>
```

### `onAgentUpdate(callback)`

Subscribe to agent-initiated canvas updates.

```typescript
onAgentUpdate(
  callback: (update: {
    sessionId: string
    agentId: string
    type: 'drawing' | 'annotation' | 'suggestion'
    data: any
  }) => void
): () => void
```

### `dismissAgent(sessionId)`

```typescript
dismissAgent(sessionId: string): Promise<void>
```

### `listActiveSessions()`

```typescript
listActiveSessions(): Promise<Array<{
  sessionId: string
  agentId: string
  agentName: string
  role: string
  joinedAt: string
}>>
```

**Example:**

```javascript
// Invite a designer agent
const session = await DEVS.agentCollaboration.inviteAgent('designer', {
  role: 'contributor',
  context: 'Help me design a landing page',
})

// Request the agent to analyze the canvas
const result = await DEVS.agentCollaboration.requestAction(session.sessionId, {
  action: 'analyze',
  prompt: 'What improvements would you suggest?',
})

// Stream real-time responses
await DEVS.agentCollaboration.streamAction(
  session.sessionId,
  { action: 'create', prompt: 'Add a hero section' },
  (chunk) => {
    if (chunk.type === 'element') {
      addToCanvas(chunk.data)
    }
  },
)

// Dismiss when done
await DEVS.agentCollaboration.dismissAgent(session.sessionId)
```

---

## Knowledge Base API (`DEVS.knowledge`)

### `search(query, options?)`

Search knowledge base for relevant context.

```typescript
search(
  query: string,
  options?: {
    limit?: number  // default 10
    types?: Array<'file' | 'folder'>
    tags?: string[]
  }
): Promise<Array<{
  id: string
  name: string
  path: string
  content?: string
  relevance: number
  fileType?: string
}>>
```

### `get(id)`

```typescript
get(id: string): Promise<{
  id: string
  name: string
  path: string
  content?: string
  fileType?: string
  tags?: string[]
} | null>
```

### `save(item)`

Save canvas content as a knowledge item.

```typescript
save(item: {
  name: string
  content: string
  path?: string
  tags?: string[]
  description?: string
}): Promise<{ id: string }>
```

### `update(id, updates)`

```typescript
update(id: string, updates: Partial<KnowledgeItem>): Promise<void>
```

**Example:**

```javascript
// Search for design docs
const results = await DEVS.knowledge.search('design system', {
  limit: 5,
  tags: ['design'],
})

// Save canvas as knowledge
await DEVS.knowledge.save({
  name: 'Landing Page Mockup',
  content: canvasAsMarkdown,
  tags: ['design', 'landing-page'],
})
```

---

## Tasks API (`DEVS.tasks`)

### `create(task)`

Create a task from canvas content.

```typescript
create(task: {
  title: string
  description: string
  assignedAgentId?: string
  requirements?: Array<{ type: string; description: string }>
  sourceElementId?: string
}): Promise<{ id: string; workflowId: string }>
```

### `linkElement(taskId, link)`

Link a canvas element to an existing task.

```typescript
linkElement(
  taskId: string,
  link: {
    elementId: string
    type: 'source' | 'artifact' | 'reference'
    description?: string
  }
): Promise<void>
```

### `get(taskId)`

```typescript
get(taskId: string): Promise<{
  id: string
  title: string
  description: string
  status: string
  assignedAgentId?: string
  artifacts: string[]
} | null>
```

### `list(options?)`

```typescript
list(options?: {
  status?: 'pending' | 'in_progress' | 'completed' | 'failed'
  assignedAgentId?: string
  limit?: number
}): Promise<Array<{
  id: string
  title: string
  status: string
  assignedAgentId?: string
}>>
```

### `onStatusChange(callback)`

```typescript
onStatusChange(
  callback: (update: {
    taskId: string
    status: string
    agentId?: string
  }) => void
): () => void
```

**Example:**

```javascript
// Create a task from canvas selection
const task = await DEVS.tasks.create({
  title: 'Implement hero section',
  description: 'Based on the wireframe mockup',
  assignedAgentId: 'developer',
})

// Track progress
DEVS.tasks.onStatusChange((update) => {
  if (update.taskId === task.id) {
    console.log('Task status:', update.status)
  }
})
```

---

## Conversations API (`DEVS.conversations`)

### `getRecent(agentId, options?)`

```typescript
getRecent(
  agentId: string,
  options?: { limit?: number }
): Promise<Array<{
  id: string
  title?: string
  summary?: string
  timestamp: string
  messageCount: number
}>>
```

### `getMessages(conversationId, options?)`

```typescript
getMessages(
  conversationId: string,
  options?: { limit?: number; before?: string }
): Promise<Array<{
  id: string
  role: string
  content: string
  timestamp: string
}>>
```

### `create(options)`

Create a new conversation with canvas context.

```typescript
create(options: {
  agentId: string
  initialContext?: string
  canvasSnapshot?: string
  title?: string
}): Promise<{ conversationId: string }>
```

### `addMessage(conversationId, content)`

```typescript
addMessage(
  conversationId: string,
  content: string
): Promise<{
  messageId: string
  response?: { content: string; messageId: string }
}>
```

**Example:**

```javascript
// Start a conversation about the canvas
const conv = await DEVS.conversations.create({
  agentId: 'designer',
  initialContext: 'Looking at this wireframe...',
  canvasSnapshot: canvas.toDataURL(),
})

// Send a message and get response
const result = await DEVS.conversations.addMessage(
  conv.conversationId,
  'What do you think about the layout?',
)
console.log('Agent response:', result.response?.content)
```

---

## Artifacts API (`DEVS.artifacts`)

### `getForTask(taskId)`

```typescript
getForTask(taskId: string): Promise<Array<{
  id: string
  type: string
  description: string
  content: string
  status: string
}>>
```

### `create(artifact)`

```typescript
create(artifact: {
  taskId: string
  type: string  // 'code', 'design', 'document', etc.
  description: string
  content: string
  validates?: string[]  // Requirement IDs
}): Promise<{ id: string }>
```

**Example:**

```javascript
// Create an artifact from canvas export
await DEVS.artifacts.create({
  taskId: 'task-123',
  type: 'design',
  description: 'Final mockup for hero section',
  content: await DEVS.export.canvas('svg'),
})
```

---

## Export API (`DEVS.export`)

### `canvas(format, options?)`

Export canvas to various formats.

```typescript
canvas(
  format: 'json' | 'svg' | 'png' | 'pdf' | 'markdown',
  options?: {
    elementIds?: string[]
    includeAnnotations?: boolean  // default true
    includeMetadata?: boolean     // default true
    scale?: number                // default 1
  }
): Promise<{
  data: string
  mimeType: string
  filename: string
}>
```

### `toCode(options)`

Export canvas elements as code/prototype.

```typescript
toCode(options: {
  elementIds?: string[]
  target: 'react' | 'html' | 'svg' | 'figma'
  framework?: string  // 'nextjs', 'vite', etc.
}): Promise<{
  files: Array<{ path: string; content: string }>
  preview?: string
}>
```

**Example:**

```javascript
// Export as PNG
const png = await DEVS.export.canvas('png', { scale: 2 })

// Export to React components
const code = await DEVS.export.toCode({
  target: 'react',
  framework: 'nextjs',
})
code.files.forEach((file) => console.log(file.path, file.content))
```

---

## Clipboard API (`DEVS.clipboard`)

### `copy(elements, format?)`

```typescript
copy(
  elements: any[],
  format?: 'elements' | 'image' | 'text'
): Promise<void>
```

### `paste()`

```typescript
paste(): Promise<{
  type: 'elements' | 'image' | 'text'
  data: any
} | null>
```

**Example:**

```javascript
// Copy selected elements
await DEVS.clipboard.copy(selectedElements, 'elements')

// Paste content
const pasted = await DEVS.clipboard.paste()
if (pasted?.type === 'elements') {
  addToCanvas(pasted.data)
}
```

---

## Keyboard Events

The bridge automatically forwards keyboard events to the parent DEVS window for global hotkey handling. Events from input fields (`<input>`, `<textarea>`, `contenteditable`) are only forwarded when modifier keys (Cmd/Ctrl) are pressed.

---

## Error Handling

All async methods can throw errors. Wrap calls in try-catch:

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
