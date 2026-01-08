/**
 * Tool Registry
 *
 * Central registry for all available tools in the DEVS platform.
 * Tools are functions that can be called by the Agent Loop to perform
 * actions like web searches, knowledge queries, code execution, etc.
 */

import type { ToolDefinition, ToolCall, ToolResult } from '@/lib/llm/tool-types'
import { mcpManager } from '@/lib/mcp'

// Import real tool executors
import {
  webSearchExecutor as realWebSearchExecutor,
  knowledgeQueryExecutor as realKnowledgeQueryExecutor,
  artifactCreateExecutor as realArtifactCreateExecutor,
  artifactUpdateExecutor,
  artifactListExecutor,
} from './executors'

// =============================================================================
// Tool Executor Interface
// =============================================================================

/**
 * Function signature for tool executors
 */
export type ToolExecutor = (
  args: Record<string, unknown>,
  context?: ToolExecutionContext,
) => Promise<ToolExecutionResult>

/**
 * Context provided to tool executors
 */
export interface ToolExecutionContext {
  /** Current agent ID */
  agentId?: string
  /** Current conversation ID */
  conversationId?: string
  /** Current task ID */
  taskId?: string
  /** User-provided credentials or tokens */
  credentials?: Record<string, string>
  /** Abort signal for cancellation */
  signal?: AbortSignal
}

/**
 * Result from tool execution
 */
export interface ToolExecutionResult {
  success: boolean
  content: string | Record<string, unknown>
  error?: {
    code: string
    message: string
    details?: unknown
  }
  metadata?: {
    duration?: number
    cached?: boolean
    source?: string
  }
}

/**
 * Registered tool with definition and executor
 */
export interface RegisteredTool {
  definition: ToolDefinition
  executor: ToolExecutor
  /** Whether this tool is enabled */
  enabled: boolean
  /** Source of the tool (built-in, mcp, custom) */
  source: 'built-in' | 'mcp' | 'custom'
}

// =============================================================================
// Tool Registry Class
// =============================================================================

/**
 * Central registry for managing and executing tools
 */
export class ToolRegistry {
  private tools = new Map<string, RegisteredTool>()

  /**
   * Register a new tool
   */
  register(
    definition: ToolDefinition,
    executor: ToolExecutor,
    source: 'built-in' | 'mcp' | 'custom' = 'custom',
  ): void {
    this.tools.set(definition.name, {
      definition,
      executor,
      enabled: true,
      source,
    })
  }

  /**
   * Unregister a tool
   */
  unregister(name: string): boolean {
    return this.tools.delete(name)
  }

  /**
   * Get a tool by name
   */
  get(name: string): RegisteredTool | undefined {
    return this.tools.get(name)
  }

  /**
   * Check if a tool exists
   */
  has(name: string): boolean {
    return this.tools.has(name)
  }

  /**
   * Enable or disable a tool
   */
  setEnabled(name: string, enabled: boolean): boolean {
    const tool = this.tools.get(name)
    if (tool) {
      tool.enabled = enabled
      return true
    }
    return false
  }

  /**
   * Get all tool definitions (only enabled tools)
   */
  getToolDefinitions(includeDisabled = false): ToolDefinition[] {
    const definitions: ToolDefinition[] = []
    for (const tool of this.tools.values()) {
      if (includeDisabled || tool.enabled) {
        definitions.push(tool.definition)
      }
    }
    return definitions
  }

  /**
   * Get tool definitions by tags
   */
  getToolsByTags(tags: string[]): ToolDefinition[] {
    const definitions: ToolDefinition[] = []
    for (const tool of this.tools.values()) {
      if (!tool.enabled) continue
      const toolTags = tool.definition.tags || []
      if (tags.some((tag) => toolTags.includes(tag))) {
        definitions.push(tool.definition)
      }
    }
    return definitions
  }

  /**
   * Execute a tool call
   */
  async execute(
    toolCall: ToolCall,
    context?: ToolExecutionContext,
  ): Promise<ToolResult> {
    const tool = this.tools.get(toolCall.name)

    if (!tool) {
      // Check if it's an MCP tool
      if (toolCall.name.startsWith('mcp_')) {
        return mcpManager.executeToolCall(toolCall)
      }

      return {
        toolCallId: toolCall.id,
        toolName: toolCall.name,
        success: false,
        content: '',
        error: {
          code: 'TOOL_NOT_FOUND',
          message: `Tool not found: ${toolCall.name}`,
        },
      }
    }

    if (!tool.enabled) {
      return {
        toolCallId: toolCall.id,
        toolName: toolCall.name,
        success: false,
        content: '',
        error: {
          code: 'TOOL_DISABLED',
          message: `Tool is disabled: ${toolCall.name}`,
        },
      }
    }

    const startTime = Date.now()

    try {
      const result = await tool.executor(toolCall.arguments, context)
      return {
        toolCallId: toolCall.id,
        toolName: toolCall.name,
        success: result.success,
        content: result.content,
        error: result.error,
        metadata: {
          ...result.metadata,
          duration: Date.now() - startTime,
        },
      }
    } catch (error) {
      return {
        toolCallId: toolCall.id,
        toolName: toolCall.name,
        success: false,
        content: '',
        error: {
          code: 'EXECUTION_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        metadata: {
          duration: Date.now() - startTime,
        },
      }
    }
  }

  /**
   * Create a tool executor function for the AgentLoop
   */
  createExecutor(
    context?: ToolExecutionContext,
  ): (toolCall: ToolCall) => Promise<ToolResult> {
    return (toolCall: ToolCall) => this.execute(toolCall, context)
  }

  /**
   * Get all registered tools (for debugging/admin)
   */
  getAllTools(): RegisteredTool[] {
    return Array.from(this.tools.values())
  }
}

// =============================================================================
// Global Tool Registry Instance
// =============================================================================

export const toolRegistry = new ToolRegistry()

// =============================================================================
// Built-in Tool Definitions
// =============================================================================

/**
 * Web search tool definition
 */
export const webSearchTool: ToolDefinition = {
  name: 'web_search',
  description:
    'Search the web for information. Use this to find current information, facts, or answer questions that require up-to-date knowledge.',
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'The search query',
      },
      numResults: {
        type: 'number',
        description: 'Number of results to return (default: 5, max: 10)',
      },
    },
    required: ['query'],
  },
  tags: ['search', 'web', 'information'],
}

/**
 * Knowledge base query tool definition
 */
export const knowledgeQueryTool: ToolDefinition = {
  name: 'knowledge_query',
  description:
    "Query the user's knowledge base for relevant information. Use this to find documents, files, or information the user has previously uploaded or synced.",
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'The search query for the knowledge base',
      },
      filters: {
        type: 'object',
        description: 'Optional filters for the search',
        properties: {
          fileType: {
            type: 'string',
            description: 'Filter by file type (document, image, text)',
          },
          tags: {
            type: 'array',
            description: 'Filter by tags',
            items: { type: 'string' },
          },
        },
      },
      limit: {
        type: 'number',
        description: 'Maximum number of results (default: 10)',
      },
    },
    required: ['query'],
  },
  tags: ['knowledge', 'search', 'documents'],
}

/**
 * Connector fetch tool definition
 */
export const connectorFetchTool: ToolDefinition = {
  name: 'connector_fetch',
  description:
    "Fetch data from connected external services (Google Drive, Gmail, Notion, etc.). Use this to retrieve specific documents or data from the user's connected accounts.",
  inputSchema: {
    type: 'object',
    properties: {
      connector: {
        type: 'string',
        description:
          'The connector ID to fetch from (e.g., google-drive, gmail, notion)',
      },
      resourceId: {
        type: 'string',
        description: 'The ID of the resource to fetch',
      },
      action: {
        type: 'string',
        description: 'The action to perform (get, list, search)',
        enum: ['get', 'list', 'search'],
      },
      query: {
        type: 'string',
        description: 'Search query (for search action)',
      },
    },
    required: ['connector', 'action'],
  },
  tags: ['connector', 'external', 'sync'],
}

/**
 * Code execution tool definition
 */
export const codeExecuteTool: ToolDefinition = {
  name: 'code_execute',
  description:
    'Execute code in a sandboxed environment. Supports JavaScript/TypeScript. Use this for calculations, data processing, or generating code output.',
  inputSchema: {
    type: 'object',
    properties: {
      code: {
        type: 'string',
        description: 'The code to execute',
      },
      language: {
        type: 'string',
        description: 'Programming language (javascript, typescript)',
        enum: ['javascript', 'typescript'],
      },
      timeout: {
        type: 'number',
        description:
          'Execution timeout in milliseconds (default: 5000, max: 30000)',
      },
    },
    required: ['code', 'language'],
  },
  tags: ['code', 'execute', 'compute'],
  requiresConfirmation: true,
}

/**
 * Artifact creation tool definition
 */
export const artifactCreateTool: ToolDefinition = {
  name: 'artifact_create',
  description:
    'Create an artifact (document, code file, report, etc.) and save it to the current task. Use this to produce deliverables or intermediate results.',
  inputSchema: {
    type: 'object',
    properties: {
      title: {
        type: 'string',
        description: 'Title of the artifact',
      },
      type: {
        type: 'string',
        description: 'Type of artifact',
        enum: ['document', 'code', 'design', 'analysis', 'plan', 'report'],
      },
      format: {
        type: 'string',
        description: 'Format of the content',
        enum: ['markdown', 'json', 'code', 'html'],
      },
      content: {
        type: 'string',
        description: 'The artifact content',
      },
      description: {
        type: 'string',
        description: 'Brief description of the artifact',
      },
    },
    required: ['title', 'type', 'format', 'content'],
  },
  tags: ['artifact', 'create', 'output'],
}

// =============================================================================
// Built-in Tool Executors
// =============================================================================

// Use real executors from ./executors
const webSearchExecutor = realWebSearchExecutor
const knowledgeQueryExecutor = realKnowledgeQueryExecutor

/**
 * Connector fetch executor
 */
const connectorFetchExecutor: ToolExecutor = async (args, _context) => {
  const { connector, resourceId, action, query } = args as {
    connector: string
    resourceId?: string
    action: string
    query?: string
  }

  // TODO: Integrate with connector system
  return {
    success: true,
    content: {
      message: `Connector ${connector} action ${action}. Full integration pending.`,
      connector,
      action,
      resourceId,
      query,
    },
    metadata: {
      source: 'placeholder',
    },
  }
}

/**
 * Code execution executor (sandboxed)
 */
const codeExecuteExecutor: ToolExecutor = async (args, _context) => {
  const {
    code,
    language,
    timeout = 5000,
  } = args as {
    code: string
    language: string
    timeout?: number
  }

  // Only support JavaScript for now
  if (language !== 'javascript' && language !== 'typescript') {
    return {
      success: false,
      content: '',
      error: {
        code: 'UNSUPPORTED_LANGUAGE',
        message: `Language ${language} is not supported. Use JavaScript or TypeScript.`,
      },
    }
  }

  try {
    // Create a sandboxed execution environment using a Web Worker
    const result = await executeSandboxedCode(code, Math.min(timeout, 30000))
    return {
      success: true,
      content: result,
      metadata: {
        source: 'sandbox',
      },
    }
  } catch (error) {
    return {
      success: false,
      content: '',
      error: {
        code: 'EXECUTION_ERROR',
        message:
          error instanceof Error ? error.message : 'Code execution failed',
      },
    }
  }
}

/**
 * Execute code in a sandboxed Web Worker
 */
async function executeSandboxedCode(
  code: string,
  timeout: number,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const workerCode = `
      self.onmessage = function(e) {
        try {
          const result = eval(e.data);
          self.postMessage({ success: true, result: String(result) });
        } catch (error) {
          self.postMessage({ success: false, error: error.message });
        }
      };
    `
    const blob = new Blob([workerCode], { type: 'application/javascript' })
    const worker = new Worker(URL.createObjectURL(blob))

    const timeoutId = setTimeout(() => {
      worker.terminate()
      reject(new Error('Execution timeout'))
    }, timeout)

    worker.onmessage = (e) => {
      clearTimeout(timeoutId)
      worker.terminate()
      if (e.data.success) {
        resolve(e.data.result)
      } else {
        reject(new Error(e.data.error))
      }
    }

    worker.onerror = (error) => {
      clearTimeout(timeoutId)
      worker.terminate()
      reject(new Error(error.message))
    }

    worker.postMessage(code)
  })
}

// =============================================================================
// Additional Tool Definitions
// =============================================================================

/**
 * Artifact update tool definition
 */
export const artifactUpdateTool: ToolDefinition = {
  name: 'artifact_update',
  description: 'Update an existing artifact with new content or metadata.',
  inputSchema: {
    type: 'object',
    properties: {
      artifactId: {
        type: 'string',
        description: 'The ID of the artifact to update',
      },
      content: {
        type: 'string',
        description: 'New content for the artifact',
      },
      description: {
        type: 'string',
        description: 'Updated description',
      },
    },
    required: ['artifactId'],
  },
  tags: ['artifact', 'update', 'output'],
}

/**
 * Artifact list tool definition
 */
export const artifactListTool: ToolDefinition = {
  name: 'artifact_list',
  description: 'List artifacts, optionally filtered by task or type.',
  inputSchema: {
    type: 'object',
    properties: {
      taskId: {
        type: 'string',
        description: 'Filter by task ID',
      },
      type: {
        type: 'string',
        description: 'Filter by artifact type',
        enum: ['document', 'code', 'design', 'analysis', 'plan', 'report'],
      },
      limit: {
        type: 'number',
        description: 'Maximum number of results (default: 10)',
      },
    },
    required: [],
  },
  tags: ['artifact', 'list', 'query'],
}

// =============================================================================
// Register Built-in Tools
// =============================================================================

/**
 * Initialize built-in tools
 */
export function initializeBuiltInTools(): void {
  toolRegistry.register(webSearchTool, webSearchExecutor, 'built-in')
  toolRegistry.register(knowledgeQueryTool, knowledgeQueryExecutor, 'built-in')
  toolRegistry.register(connectorFetchTool, connectorFetchExecutor, 'built-in')
  toolRegistry.register(codeExecuteTool, codeExecuteExecutor, 'built-in')
  toolRegistry.register(
    artifactCreateTool,
    realArtifactCreateExecutor,
    'built-in',
  )
  toolRegistry.register(artifactUpdateTool, artifactUpdateExecutor, 'built-in')
  toolRegistry.register(artifactListTool, artifactListExecutor, 'built-in')
}

// Initialize on module load
initializeBuiltInTools()
