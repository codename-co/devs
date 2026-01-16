---
name: tool-generation
description: Guide for creating and registering new LLM tools in the DEVS platform. Use this when asked to create a new tool, add tool capabilities, or extend the tool system.
---

# Tool Generation for DEVS

Tools are capabilities that LLM agents can invoke during conversations. They enable agents to search documents, execute code, interact with external services, and perform specialized operations. This guide covers the complete process of creating, registering, and testing new tools.

## Architecture Overview

```
Tool Definition (types.ts)    →    Tool Handler (service.ts)
         ↓                                 ↓
    ToolDefinition                   Handler Function
    (JSON Schema)                    (async function)
         ↓                                 ↓
              Tool Registration (executor.ts)
                        ↓
              KnowledgeToolRegistry.register()
                        ↓
              Available to all agents via chat.ts
```

## Directory Structure

Tools are organized by feature domain:

```
src/lib/
├── tool-executor/
│   ├── types.ts         # Core tool executor types
│   ├── executor.ts      # Registry, executor, registration functions
│   └── index.ts         # Public exports
├── knowledge-tools/     # Document search/read tools
│   ├── types.ts         # Params, results, and KNOWLEDGE_TOOL_DEFINITIONS
│   └── service.ts       # Handler implementations
├── math-tools/          # Calculation tools
│   ├── types.ts         # MATH_TOOL_DEFINITIONS
│   └── service.ts       # calculate() handler
├── code-tools/          # Code execution tools
│   ├── types.ts         # CODE_TOOL_DEFINITIONS
│   └── service.ts       # execute() handler
└── features/connectors/tools/  # External service tools
    ├── types.ts         # CONNECTOR_TOOL_DEFINITIONS
    └── service.ts       # Gmail, Drive, etc. handlers
```

## Step 1: Define Types

Create parameter and result interfaces in `types.ts`:

```typescript
/**
 * My Tool Types
 * @module lib/my-tools/types
 */

import type { ToolDefinition } from '@/lib/llm/types'

// ============================================================================
// Tool Parameter Types
// ============================================================================

/**
 * Parameters for the my_tool operation.
 * Document each parameter with JSDoc.
 */
export interface MyToolParams {
  /**
   * Required parameter description.
   */
  requiredParam: string

  /**
   * Optional parameter with default value.
   * @default 10
   */
  optionalParam?: number

  /**
   * Filter by specific values.
   */
  filter?: ('value1' | 'value2' | 'value3')[]
}

// ============================================================================
// Tool Result Types
// ============================================================================

/**
 * Result of my_tool operation.
 */
export interface MyToolResult {
  /** Whether the operation succeeded */
  success: boolean
  /** Error message if failed */
  error?: string
  /** The operation result data */
  data: MyToolData | null
  /** Execution duration in milliseconds */
  duration_ms: number
}

/**
 * Data returned by my_tool.
 */
export interface MyToolData {
  id: string
  name: string
  // ... other fields
}

// ============================================================================
// Tool Name Type
// ============================================================================

/**
 * Names of all tools in this module.
 */
export type MyToolName = 'my_tool' | 'my_other_tool'

// ============================================================================
// Tool Definitions
// ============================================================================

/**
 * Pre-defined tool definitions for my tools.
 * These can be directly passed to LLM requests.
 */
export const MY_TOOL_DEFINITIONS: Record<MyToolName, ToolDefinition> = {
  my_tool: {
    type: 'function',
    function: {
      name: 'my_tool',
      description:
        'Brief description of what the tool does. ' +
        'Include usage context: when to use it, what it returns. ' +
        'Mention any important limitations or requirements.',
      parameters: {
        type: 'object',
        properties: {
          requiredParam: {
            type: 'string',
            description: 'What this parameter does and expected values',
          },
          optionalParam: {
            type: 'integer',
            description: 'Optional description (default: 10)',
            minimum: 1,
            maximum: 100,
          },
          filter: {
            type: 'array',
            description: 'Filter results by these values',
            items: {
              type: 'string',
              enum: ['value1', 'value2', 'value3'],
            },
          },
        },
        required: ['requiredParam'],
      },
    },
  },

  my_other_tool: {
    // ... another tool definition
  },
}
```

## Step 2: Implement Handler

Create handler functions in `service.ts`:

````typescript
/**
 * My Tool Service
 * @module lib/my-tools/service
 */

import type { MyToolParams, MyToolResult } from './types'
import { db } from '@/lib/db'

/**
 * Execute the my_tool operation.
 *
 * @param params - Tool parameters
 * @returns Operation result
 *
 * @example
 * ```typescript
 * const result = await myTool({ requiredParam: 'value' })
 * if (result.success) {
 *   console.log(result.data)
 * }
 * ```
 */
export async function myTool(params: MyToolParams): Promise<MyToolResult> {
  const startTime = performance.now()

  try {
    // 1. Validate parameters
    if (!params.requiredParam) {
      return {
        success: false,
        error: 'requiredParam is required',
        data: null,
        duration_ms: performance.now() - startTime,
      }
    }

    // 2. Perform operation
    const data = await performOperation(params)

    // 3. Return success result
    return {
      success: true,
      data,
      duration_ms: performance.now() - startTime,
    }
  } catch (error) {
    // 4. Handle errors gracefully
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      data: null,
      duration_ms: performance.now() - startTime,
    }
  }
}

// Re-export definitions for convenience
export { MY_TOOL_DEFINITIONS } from './types'
````

## Step 3: Register Tools

Add registration in `src/lib/tool-executor/executor.ts`:

### 3a. Import Dependencies

```typescript
// At top of executor.ts
import { myTool, MY_TOOL_DEFINITIONS } from '@/lib/my-tools/service'
import type { MyToolParams, MyToolResult } from '@/lib/my-tools/types'
```

### 3b. Create Registration Function

```typescript
// ============================================================================
// My Tools Registration
// ============================================================================

/**
 * Register all my tools with the default registry.
 * Call this during application initialization.
 */
export function registerMyTools(): void {
  defaultRegistry.register<MyToolParams, MyToolResult>(
    MY_TOOL_DEFINITIONS.my_tool,
    async (args, context) => {
      // Check for abort signal
      if (context.abortSignal?.aborted) {
        throw new Error('Aborted')
      }

      return myTool(args)
    },
    {
      tags: ['my-category'], // Used for filtering tools
      estimatedDuration: 500, // Helps with timeout estimation
      requiresConfirmation: false, // Set true for destructive operations
    },
  )
}

/**
 * Check if my tools are registered.
 */
export function areMyToolsRegistered(): boolean {
  return defaultRegistry.has('my_tool')
}

/**
 * Unregister all my tools from the default registry.
 */
export function unregisterMyTools(): void {
  defaultRegistry.unregister('my_tool')
}
```

### 3c. Call Registration at App Init

In `src/app/App.tsx` or initialization code:

```typescript
import { registerMyTools } from '@/lib/tool-executor'

// In initialization effect
useEffect(() => {
  registerMyTools()
}, [])
```

## Step 4: Make Tools Available to Agents

### Universal Tools (Available to All Agents)

Add to `getAgentToolDefinitions` in `src/lib/chat.ts`:

```typescript
import { MY_TOOL_DEFINITIONS } from '@/lib/my-tools'

function getAgentToolDefinitions(_agent: Agent): ToolDefinition[] {
  return [
    ...Object.values(KNOWLEDGE_TOOL_DEFINITIONS),
    ...Object.values(MATH_TOOL_DEFINITIONS),
    ...Object.values(CODE_TOOL_DEFINITIONS),
    ...Object.values(MY_TOOL_DEFINITIONS), // Add here
  ]
}
```

### Conditional Tools (Based on Agent Config)

For tools that should only be available to specific agents:

```typescript
function getAgentToolDefinitions(agent: Agent): ToolDefinition[] {
  const tools = [...Object.values(KNOWLEDGE_TOOL_DEFINITIONS)]

  // Add my tools only if agent has specific capability
  if (agent.tools?.some((t) => t.type === 'my-feature')) {
    tools.push(...Object.values(MY_TOOL_DEFINITIONS))
  }

  return tools
}
```

## Step 5: Write Tests (TDD Required)

Create test file at `src/test/lib/my-tools/service.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { myTool } from '@/lib/my-tools/service'

describe('myTool', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('parameter validation', () => {
    it('should fail when requiredParam is missing', async () => {
      const result = await myTool({ requiredParam: '' })

      expect(result.success).toBe(false)
      expect(result.error).toContain('requiredParam')
    })
  })

  describe('successful execution', () => {
    it('should return data on success', async () => {
      const result = await myTool({ requiredParam: 'test' })

      expect(result.success).toBe(true)
      expect(result.data).not.toBeNull()
      expect(result.duration_ms).toBeGreaterThan(0)
    })
  })

  describe('error handling', () => {
    it('should catch and return errors gracefully', async () => {
      // Mock a failure scenario
      vi.spyOn(db, 'getAll').mockRejectedValueOnce(new Error('DB error'))

      const result = await myTool({ requiredParam: 'test' })

      expect(result.success).toBe(false)
      expect(result.error).toBe('DB error')
    })
  })
})
```

## Tool Definition Best Practices

### 1. Clear Descriptions

```typescript
// ✅ Good - specific, actionable, includes context
description: 'Search the knowledge base for documents matching a query. ' +
  'Use this to find relevant information before answering questions. ' +
  'Returns ranked results with relevance scores and text snippets.'

// ❌ Bad - vague, no context
description: 'Search for documents.'
```

### 2. Parameter Documentation

```typescript
// ✅ Good - explains purpose, format, defaults
properties: {
  query: {
    type: 'string',
    description:
      'Search query - can be keywords, phrases, or natural language questions. ' +
      'If the user query is not in English, include both original terms AND translations.',
  },
  max_results: {
    type: 'integer',
    description: 'Maximum number of results to return (default: 10)',
    minimum: 1,
    maximum: 50,
  },
}
```

### 3. Enum Values for Constrained Choices

```typescript
properties: {
  file_type: {
    type: 'string',
    description: 'Filter by file type',
    enum: ['document', 'image', 'text'],  // LLM will only use these values
  },
}
```

### 4. Required vs Optional

```typescript
parameters: {
  type: 'object',
  properties: { /* ... */ },
  required: ['query'],  // Only list truly required params
}
```

## Result Formatting Best Practices

### 1. Consistent Structure

```typescript
// Always include:
interface ToolResult {
  success: boolean // Was operation successful?
  error?: string // If failed, why?
  data: SomeType | null // The actual result
  duration_ms: number // How long did it take?
}
```

### 2. Truncation for Large Results

```typescript
interface ListResult {
  items: Item[]
  total_count: number // Total available
  has_more: boolean // Is there more?
  truncated: boolean // Was result cut off?
  limit: number // Applied limit
  offset: number // Current position
}
```

### 3. Error Types

```typescript
interface ErrorResult {
  success: false
  error: string
  error_type?:
    | 'validation'
    | 'not_found'
    | 'permission'
    | 'timeout'
    | 'internal'
  details?: Record<string, unknown>
}
```

## Existing Tools Reference

| Tool Module        | Tools                                                                         | Purpose                       |
| ------------------ | ----------------------------------------------------------------------------- | ----------------------------- |
| `knowledge-tools`  | `search_knowledge`, `read_document`, `list_documents`, `get_document_summary` | Knowledge base operations     |
| `math-tools`       | `calculate`                                                                   | Safe mathematical expressions |
| `code-tools`       | `execute`                                                                     | WASM-sandboxed JS execution   |
| `connectors/tools` | `gmail_*`, `drive_*`, `calendar_*`, `notion_*`, `qonto_*`                     | External service integration  |

## Tool Execution Flow

```typescript
// In chat.ts during LLM response processing:
1. LLM decides to call tool with arguments
2. ToolCall extracted from response
3. defaultExecutor.execute(toolCall, context)
   a. Find handler in registry
   b. Parse and validate arguments
   c. Execute handler with timeout
   d. Format result as JSON string
4. Result added to conversation
5. Continue LLM conversation with tool result
```

## Security Considerations

1. **Input Validation**: Always validate and sanitize parameters
2. **Timeout Limits**: Set appropriate `estimatedDuration`
3. **Abort Signals**: Respect `context.abortSignal`
4. **No Side Effects**: Tools should be idempotent when possible
5. **Confirmation**: Set `requiresConfirmation: true` for destructive operations

## Checklist for New Tools

- [ ] Create types in `types.ts` with JSDoc documentation
- [ ] Define `TOOL_DEFINITIONS` with clear descriptions
- [ ] Implement handler in `service.ts` with error handling
- [ ] Add registration function in `executor.ts`
- [ ] Call registration in app initialization
- [ ] Add to `getAgentToolDefinitions` in `chat.ts` (if universal)
- [ ] Write comprehensive tests with TDD
- [ ] Run `npm run test:coverage` to verify coverage
- [ ] Update this skill if adding new patterns
