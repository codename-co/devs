# Tools System

DEVS provides a comprehensive tool system that gives AI agents capabilities beyond text generation. Tools are modular, self-registering components that enable agents to interact with knowledge bases, perform calculations, execute code, access external services, and more.

## Overview

Tools in DEVS are organized into two main categories:

1. **Global Tools** - Available to all agents by default
2. **Connector Tools** - Available only when a specific connector is active

```
src/tools/
├── index.ts              # Main exports
├── registry.ts           # Tool plugin registry
├── types.ts              # TypeScript interfaces
├── bridge.ts             # Legacy registry bridge
└── plugins/              # Tool implementations
    ├── calculate.ts      # Math tools
    ├── execute.ts        # Code execution
    ├── knowledge.ts      # Knowledge base tools
    ├── text-ocr.ts       # OCR/text extraction
    ├── wikipedia.ts      # Wikipedia research
    ├── wikidata.ts       # Wikidata queries
    ├── arxiv.ts          # arXiv papers
    └── connectors/       # Per-connector tools
        ├── gmail.ts
        ├── drive.ts
        ├── calendar.ts
        └── ...
```

---

## Global Tools

Global tools are automatically registered and available to every agent. They don't require any special configuration or authentication.

### Tool Categories

| Category         | Description                                    | Tools                                                                                                                           |
| ---------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **Knowledge**    | Search and read from the user's knowledge base | `search_knowledge`, `read_document`, `list_documents`, `get_document_summary`                                                   |
| **Math**         | Evaluate mathematical expressions              | `calculate`                                                                                                                     |
| **Code**         | Execute code in a sandboxed environment        | `execute`                                                                                                                       |
| **Presentation** | Generate presentation slides                   | `generate_presentation`                                                                                                         |
| **Research**     | Access Wikipedia, Wikidata, arXiv              | `wikipedia_search`, `wikipedia_article`, `wikidata_search`, `wikidata_entity`, `wikidata_sparql`, `arxiv_search`, `arxiv_paper` |
| **Utility**      | General-purpose utilities                      | `text_ocr`                                                                                                                      |

### Knowledge Tools

Tools for interacting with the user's personal knowledge base stored in IndexedDB.

```typescript
// Search for documents matching a query
search_knowledge({ query: 'project requirements', max_results: 5 })

// Read full content of a specific document
read_document({ document_id: 'doc-123', max_length: 10000 })

// List documents in a folder
list_documents({ folder_id: 'folder-456', include_content: false })

// Get a summary of a document
get_document_summary({ document_id: 'doc-123' })
```

### Math Tools

Evaluate mathematical expressions in a sandboxed JavaScript environment.

```typescript
// Basic arithmetic
calculate({ expression: '2 + 2 * 3' })

// Using Math functions
calculate({ expression: 'Math.sqrt(16) + Math.pow(2, 3)' })

// With variables
calculate({
  expression: 'principal * Math.pow(1 + rate, years)',
  variables: { principal: 1000, rate: 0.05, years: 10 },
})
```

### Code Tools

Execute code in a sandboxed environment (Web Worker).

```typescript
execute({
  code: 'return data.map(x => x * 2)',
  language: 'javascript',
  context: { data: [1, 2, 3, 4, 5] },
})
```

### Research Tools

Access external knowledge sources for research tasks.

```typescript
// Search Wikipedia
wikipedia_search({ query: 'machine learning', max_results: 5 })

// Get Wikipedia article content
wikipedia_article({ title: 'Artificial intelligence', full_content: true })

// Search Wikidata entities
wikidata_search({ query: 'Albert Einstein' })

// Query Wikidata with SPARQL
wikidata_sparql({ query: 'SELECT ?item WHERE { ?item wdt:P31 wd:Q5 }' })

// Search arXiv papers
arxiv_search({ query: 'transformer architecture', max_results: 10 })

// Get arXiv paper details
arxiv_paper({ arxiv_id: '2306.12001' })
```

### Utility Tools

General-purpose tools for document processing and other utilities.

#### Text OCR

Extract text from PDFs and images using OCR (Optical Character Recognition).

```typescript
// Extract text from a PDF
text_ocr({
  content: '<base64-encoded-pdf>',
  mimeType: 'application/pdf',
  filename: 'document.pdf',
})

// Extract text from an image
text_ocr({
  content: '<base64-encoded-image>',
  mimeType: 'image/png',
  filename: 'screenshot.png',
})
```

**Supported formats:**

- PDFs: `application/pdf`
- Images: `image/png`, `image/jpeg`, `image/gif`, `image/webp`, `image/bmp`, `image/tiff`

**Use cases:**

- Process scanned PDF documents
- Extract text from screenshots
- Convert image-based content to searchable text
- Works with `drive_read` tool output for non-textual PDFs

---

## Connector Tools

Connector tools become available when users connect external services via OAuth. Each connector provides specialized tools for interacting with that service.

### Available Connectors

| Provider            | Tools                                                                   | Authentication |
| ------------------- | ----------------------------------------------------------------------- | -------------- |
| **Google Drive**    | `drive_search`, `drive_read`, `drive_list`                              | OAuth 2.0      |
| **Gmail**           | `gmail_search`, `gmail_read`, `gmail_list_labels`, `gmail_create_draft` | OAuth 2.0      |
| **Google Calendar** | `calendar_list_events`, `calendar_get_event`, `calendar_search`         | OAuth 2.0      |
| **Google Tasks**    | `tasks_list`, `tasks_get`, `tasks_list_tasklists`                       | OAuth 2.0      |
| **Notion**          | `notion_search`, `notion_read_page`, `notion_query_database`            | OAuth 2.0      |
| **Slack**           | `slack_search`, `slack_list_channels`, `slack_read_channel`             | OAuth 2.0      |
| **Outlook**         | `outlook_search`, `outlook_read`, `outlook_list_folders`                | OAuth 2.0      |
| **OneDrive**        | `onedrive_search`, `onedrive_read`, `onedrive_list`                     | OAuth 2.0      |
| **Dropbox**         | `dropbox_search`, `dropbox_read`, `dropbox_list`                        | OAuth 2.0      |
| **Figma**           | `figma_list_files`, `figma_get_file`, `figma_get_comments`              | OAuth 2.0      |
| **Google Chat**     | `googlechat_list_spaces`, `googlechat_read_messages`                    | OAuth 2.0      |
| **Google Meet**     | `googlemeet_list_meetings`                                              | OAuth 2.0      |
| **Qonto**           | `qonto_list_accounts`, `qonto_list_transactions`, `qonto_get_statement` | OAuth 2.0      |

### Google Drive Tools

```typescript
// Search for files
drive_search({ query: 'quarterly report', max_results: 10 })

// Read file content (PDFs are automatically OCR-processed)
drive_read({ file_id: '1abc...' })

// List files in a folder
drive_list({ folder_id: 'root', page_size: 20 })
```

**Note:** PDFs are automatically processed with OCR to extract text content. For scanned documents that fail automatic extraction, the `text_ocr` tool can be used manually for image-based OCR.

### Gmail Tools

```typescript
// Search emails
gmail_search({ query: 'from:boss@company.com subject:urgent' })

// Read email content
gmail_read({ message_id: 'msg-123' })

// List available labels
gmail_list_labels({})

// Create a draft
gmail_create_draft({
  to: 'recipient@example.com',
  subject: 'Hello',
  body: 'Message content...',
})
```

### Notion Tools

```typescript
// Search across Notion workspace
notion_search({ query: 'project plan' })

// Read a specific page
notion_read_page({ page_id: 'abc-123...' })

// Query a database
notion_query_database({
  database_id: 'db-456...',
  filter: { property: 'Status', equals: 'In Progress' },
})
```

---

## Tool Registration

### How Tools Are Registered

Tools go through a multi-layer registration system:

1. **Plugin Definition** - Each tool is defined as a `ToolPlugin` with metadata, definition, and handler
2. **Plugin Registry** - Plugins are registered with `toolRegistry`
3. **Legacy Bridge** - For backward compatibility, plugins are also bridged to the legacy `KnowledgeToolRegistry`
4. **Runtime Registration** - Tools are lazily registered when first needed

```typescript
// Registration flow in chat.ts
if (!areKnowledgeToolsRegistered()) {
  registerKnowledgeTools()
}
if (!areMathToolsRegistered()) {
  registerMathTools()
}
// ... etc for each category
```

### Creating a New Tool

```typescript
import { createToolPlugin } from '@/tools/registry'
import type { ToolPlugin } from '@/tools/types'

export const myToolPlugin: ToolPlugin<MyParams, MyResult> = createToolPlugin({
  metadata: {
    name: 'my_tool',
    displayName: 'My Tool',
    shortDescription: 'Does something useful',
    icon: 'Puzzle',
    category: 'utility',
    tags: ['example', 'demo'],
    enabledByDefault: false,
    estimatedDuration: 1000,
  },
  definition: {
    type: 'function',
    function: {
      name: 'my_tool',
      description: 'Detailed description for the LLM...',
      parameters: {
        type: 'object',
        properties: {
          input: { type: 'string', description: 'The input value' },
        },
        required: ['input'],
      },
    },
  },
  handler: async (args, context) => {
    if (context.abortSignal?.aborted) {
      throw new Error('Aborted')
    }
    // Tool implementation
    return { result: args.input.toUpperCase() }
  },
  validate: (args) => {
    if (!args.input) throw new Error('Input is required')
    return args as MyParams
  },
})
```

### Registering a New Tool Category

1. **Add to plugins index** (`src/tools/plugins/index.ts`):

```typescript
export { myToolPlugin } from './my-tool'
// Add to corePlugins array
// Add to pluginsByCategory
```

2. **Add bridge helpers** (`src/tools/bridge.ts`):

```typescript
export const MY_TOOL_NAMES = getPluginNamesByCategory('mycategory')
```

3. **Add registration functions** (`src/lib/tool-executor/executor.ts`):

```typescript
export function registerMyTools(): void {
  registerCategoryWithLegacy('mycategory', defaultRegistry)
}
export function areMyToolsRegistered(): boolean {
  return isCategoryRegisteredInLegacy('mycategory', defaultRegistry)
}
```

4. **Export from index** (`src/lib/tool-executor/index.ts`)

5. **Call registration in chat** (`src/lib/chat.ts`):

```typescript
if (!areMyToolsRegistered()) {
  registerMyTools()
}
```

6. **Add tool definition to agents** (`src/lib/chat.ts` in `getAgentToolDefinitions`):

```typescript
return [...existingTools, MY_TOOL_DEFINITION]
```

---

## Tool Execution

### Execution Flow

1. LLM generates a tool call in its response
2. `executeToolCalls()` in `chat.ts` processes the calls
3. Tools are registered if not already
4. `defaultExecutor.executeBatch()` runs the tools
5. Results are formatted and returned to the LLM

### Execution Context

Each tool receives an execution context:

```typescript
interface ToolExecutionContext {
  agentId?: string
  conversationId?: string
  taskId?: string
  abortSignal?: AbortSignal
}
```

### Error Handling

Tools should return structured error responses:

```typescript
interface ToolError {
  success: false
  error: string
  code: 'invalid_input' | 'not_found' | 'network_error' | 'processing_error'
}
```

---

## Best Practices

### For Tool Authors

1. **Validate inputs early** - Use the `validate` function to catch errors before execution
2. **Check abort signals** - Respect `context.abortSignal` for cancellation
3. **Return structured results** - Use consistent success/error response shapes
4. **Provide clear descriptions** - The LLM relies on the description to understand when to use the tool
5. **Handle errors gracefully** - Always catch exceptions and return meaningful error messages

### For LLM Prompts

1. **Be specific** - Tell the agent which tools are available and when to use them
2. **Chain tools** - Describe workflows like "search → read → summarize"
3. **Handle failures** - Instruct agents how to recover from tool errors

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         LLM Response                            │
│                    (with tool_calls array)                      │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                      executeToolCalls()                         │
│                         (chat.ts)                               │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Tool Registration Check                        │
│   registerKnowledgeTools(), registerMathTools(), etc.           │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                    defaultExecutor                              │
│               (KnowledgeToolExecutor)                           │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Tool Plugin  │  │ Tool Plugin  │  │ Tool Plugin  │          │
│  │  (handler)   │  │  (handler)   │  │  (handler)   │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Tool Results                               │
│              (formatted for LLM consumption)                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## Related Documentation

- [CONNECTORS.md](./CONNECTORS.md) - OAuth integration for connector tools
- [AGENTS.md](../AGENTS.md) - Agent system overview
- [ARCHITECTURE.md](../ARCHITECTURE.md) - System architecture
