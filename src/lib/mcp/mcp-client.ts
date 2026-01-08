/**
 * MCP (Model Context Protocol) Client
 *
 * Implements a browser-compatible MCP client for discovering and invoking
 * tools from MCP servers. Supports multiple transport methods:
 * - WebSocket: Real-time bidirectional communication
 * - SSE: Server-Sent Events for streaming responses
 * - HTTP: Simple request/response over fetch
 *
 * For browser compatibility, we focus on WebSocket and SSE transports.
 * The stdio transport is not available in browsers but could be used
 * via a relay server pattern.
 */

import type {
  McpConfig,
  McpTool,
  McpResource,
} from '@/features/connectors/types'
import type {
  ToolDefinition,
  ToolParameterSchema,
  ToolCall,
  ToolResult,
} from '@/lib/llm/tool-types'

// =============================================================================
// MCP Protocol Types (JSON-RPC 2.0)
// =============================================================================

/**
 * JSON-RPC 2.0 request
 */
export interface JsonRpcRequest {
  jsonrpc: '2.0'
  id: string | number
  method: string
  params?: Record<string, unknown>
}

/**
 * JSON-RPC 2.0 response
 */
export interface JsonRpcResponse<T = unknown> {
  jsonrpc: '2.0'
  id: string | number
  result?: T
  error?: JsonRpcError
}

/**
 * JSON-RPC 2.0 error
 */
export interface JsonRpcError {
  code: number
  message: string
  data?: unknown
}

/**
 * MCP server capabilities
 */
export interface McpServerCapabilities {
  tools?: boolean
  resources?: boolean
  prompts?: boolean
  sampling?: boolean
}

/**
 * MCP tool definition from server
 */
export interface McpToolDefinition {
  name: string
  description?: string
  inputSchema?: {
    type: 'object'
    properties?: Record<string, unknown>
    required?: string[]
  }
}

/**
 * MCP resource definition from server
 */
export interface McpResourceDefinition {
  uri: string
  name?: string
  description?: string
  mimeType?: string
}

/**
 * MCP tool call result
 */
export interface McpToolCallResult {
  content: Array<{
    type: 'text' | 'image' | 'resource'
    text?: string
    data?: string
    mimeType?: string
    uri?: string
  }>
  isError?: boolean
}

// =============================================================================
// MCP Client
// =============================================================================

/**
 * Connection state of the MCP client
 */
export type McpConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'error'

/**
 * Events emitted by the MCP client
 */
export interface McpClientEvents {
  stateChange: (state: McpConnectionState) => void
  toolsDiscovered: (tools: McpTool[]) => void
  resourcesDiscovered: (resources: McpResource[]) => void
  error: (error: Error) => void
}

/**
 * MCP Client for browser-based tool invocation
 */
export class McpClient {
  private config: McpConfig
  private state: McpConnectionState = 'disconnected'
  private websocket: WebSocket | null = null
  private eventSource: EventSource | null = null
  private pendingRequests = new Map<
    string | number,
    {
      resolve: (value: unknown) => void
      reject: (error: Error) => void
      timeout: ReturnType<typeof setTimeout>
    }
  >()
  private requestId = 0
  private listeners = new Map<keyof McpClientEvents, Set<Function>>()

  // Discovered capabilities
  private tools: McpTool[] = []
  private resources: McpResource[] = []
  private capabilities: McpServerCapabilities = {}

  constructor(config: McpConfig) {
    this.config = config
  }

  /**
   * Get current connection state
   */
  getState(): McpConnectionState {
    return this.state
  }

  /**
   * Get discovered tools
   */
  getTools(): McpTool[] {
    return [...this.tools]
  }

  /**
   * Get discovered resources
   */
  getResources(): McpResource[] {
    return [...this.resources]
  }

  /**
   * Add event listener
   */
  on<K extends keyof McpClientEvents>(
    event: K,
    callback: McpClientEvents[K],
  ): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(callback)
  }

  /**
   * Remove event listener
   */
  off<K extends keyof McpClientEvents>(
    event: K,
    callback: McpClientEvents[K],
  ): void {
    this.listeners.get(event)?.delete(callback)
  }

  /**
   * Emit event
   */
  private emit<K extends keyof McpClientEvents>(
    event: K,
    ...args: Parameters<McpClientEvents[K]>
  ): void {
    const callbacks = this.listeners.get(event)
    if (callbacks) {
      for (const callback of callbacks) {
        try {
          ;(callback as Function)(...args)
        } catch (error) {
          console.error(`Error in MCP client event listener:`, error)
        }
      }
    }
  }

  /**
   * Connect to the MCP server
   */
  async connect(): Promise<void> {
    if (this.state === 'connected' || this.state === 'connecting') {
      return
    }

    this.setState('connecting')

    try {
      switch (this.config.transport) {
        case 'websocket':
          await this.connectWebSocket()
          break
        case 'sse':
          await this.connectSSE()
          break
        case 'stdio':
          throw new Error(
            'stdio transport not supported in browser. Use a WebSocket relay instead.',
          )
        default:
          throw new Error(`Unknown transport: ${this.config.transport}`)
      }

      // Initialize the connection
      await this.initialize()

      // Discover tools and resources
      await this.discover()

      this.setState('connected')
    } catch (error) {
      this.setState('error')
      this.emit('error', error as Error)
      throw error
    }
  }

  /**
   * Disconnect from the MCP server
   */
  async disconnect(): Promise<void> {
    if (this.websocket) {
      this.websocket.close()
      this.websocket = null
    }

    if (this.eventSource) {
      this.eventSource.close()
      this.eventSource = null
    }

    // Reject all pending requests
    for (const [_id, pending] of this.pendingRequests) {
      clearTimeout(pending.timeout)
      pending.reject(new Error('Connection closed'))
    }
    this.pendingRequests.clear()

    this.setState('disconnected')
  }

  /**
   * Call a tool on the MCP server
   */
  async callTool(
    name: string,
    args: Record<string, unknown>,
  ): Promise<McpToolCallResult> {
    const response = await this.sendRequest<McpToolCallResult>('tools/call', {
      name,
      arguments: args,
    })
    return response
  }

  /**
   * Read a resource from the MCP server
   */
  async readResource(uri: string): Promise<{
    contents: Array<{ uri: string; text?: string; blob?: string }>
  }> {
    const response = await this.sendRequest<{
      contents: Array<{ uri: string; text?: string; blob?: string }>
    }>('resources/read', { uri })
    return response
  }

  /**
   * Convert MCP tools to DEVS ToolDefinition format
   */
  toToolDefinitions(): ToolDefinition[] {
    return this.tools.map((tool) => ({
      name: `mcp_${tool.name}`,
      description: tool.description || `MCP tool: ${tool.name}`,
      inputSchema: (tool.inputSchema as unknown as ToolParameterSchema) || {
        type: 'object' as const,
        properties: {},
      },
      tags: ['mcp'],
    }))
  }

  /**
   * Execute a tool call and return a ToolResult
   */
  async executeToolCall(toolCall: ToolCall): Promise<ToolResult> {
    // Strip the 'mcp_' prefix if present
    const toolName = toolCall.name.startsWith('mcp_')
      ? toolCall.name.slice(4)
      : toolCall.name

    try {
      const result = await this.callTool(toolName, toolCall.arguments)

      // Convert MCP result to DEVS ToolResult
      const content = result.content
        .map((c) => {
          if (c.type === 'text') return c.text || ''
          if (c.type === 'resource') return `[Resource: ${c.uri}]`
          if (c.type === 'image') return `[Image: ${c.mimeType}]`
          return ''
        })
        .join('\n')

      return {
        toolCallId: toolCall.id,
        toolName: toolCall.name,
        success: !result.isError,
        content,
        error: result.isError
          ? {
              code: 'MCP_ERROR',
              message: content,
            }
          : undefined,
      }
    } catch (error) {
      return {
        toolCallId: toolCall.id,
        toolName: toolCall.name,
        success: false,
        content: '',
        error: {
          code: 'MCP_EXECUTION_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      }
    }
  }

  // ===========================================================================
  // Private Methods
  // ===========================================================================

  private setState(state: McpConnectionState): void {
    this.state = state
    this.emit('stateChange', state)
  }

  private async connectWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.websocket = new WebSocket(this.config.serverUrl)

        this.websocket.onopen = () => {
          resolve()
        }

        this.websocket.onerror = (_event) => {
          reject(new Error('WebSocket connection failed'))
        }

        this.websocket.onmessage = (event) => {
          this.handleMessage(event.data)
        }

        this.websocket.onclose = () => {
          this.setState('disconnected')
        }
      } catch (error) {
        reject(error)
      }
    })
  }

  private async connectSSE(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.eventSource = new EventSource(this.config.serverUrl)

        this.eventSource.onopen = () => {
          resolve()
        }

        this.eventSource.onerror = (_event) => {
          reject(new Error('SSE connection failed'))
        }

        this.eventSource.onmessage = (event) => {
          this.handleMessage(event.data)
        }
      } catch (error) {
        reject(error)
      }
    })
  }

  private handleMessage(data: string): void {
    try {
      const message: JsonRpcResponse = JSON.parse(data)

      if (message.id !== undefined) {
        const pending = this.pendingRequests.get(message.id)
        if (pending) {
          clearTimeout(pending.timeout)
          this.pendingRequests.delete(message.id)

          if (message.error) {
            pending.reject(
              new Error(`${message.error.code}: ${message.error.message}`),
            )
          } else {
            pending.resolve(message.result)
          }
        }
      }
    } catch (error) {
      console.error('Failed to parse MCP message:', error)
    }
  }

  private async sendRequest<T>(
    method: string,
    params?: Record<string, unknown>,
    timeout = 30000,
  ): Promise<T> {
    const id = ++this.requestId
    const request: JsonRpcRequest = {
      jsonrpc: '2.0',
      id,
      method,
      params,
    }

    return new Promise<T>((resolve, reject) => {
      const timeoutHandle = setTimeout(() => {
        this.pendingRequests.delete(id)
        reject(new Error(`Request timeout: ${method}`))
      }, timeout)

      this.pendingRequests.set(id, {
        resolve: resolve as (value: unknown) => void,
        reject,
        timeout: timeoutHandle,
      })

      if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
        this.websocket.send(JSON.stringify(request))
      } else if (this.eventSource) {
        // SSE is read-only, need to POST for requests
        this.postRequest(request)
          .then((result) => {
            clearTimeout(timeoutHandle)
            this.pendingRequests.delete(id)
            resolve(result as T)
          })
          .catch((error) => {
            clearTimeout(timeoutHandle)
            this.pendingRequests.delete(id)
            reject(error)
          })
      } else {
        clearTimeout(timeoutHandle)
        this.pendingRequests.delete(id)
        reject(new Error('Not connected'))
      }
    })
  }

  private async postRequest(request: JsonRpcRequest): Promise<unknown> {
    const response = await fetch(this.config.serverUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`)
    }

    const data: JsonRpcResponse = await response.json()
    if (data.error) {
      throw new Error(`${data.error.code}: ${data.error.message}`)
    }

    return data.result
  }

  private async initialize(): Promise<void> {
    const result = await this.sendRequest<{
      capabilities: McpServerCapabilities
      serverInfo?: { name: string; version: string }
    }>('initialize', {
      protocolVersion: '2024-11-05',
      clientInfo: {
        name: 'devs-mcp-client',
        version: '1.0.0',
      },
      capabilities: {
        tools: {},
        resources: {},
      },
    })

    this.capabilities = result.capabilities || {}
  }

  private async discover(): Promise<void> {
    // Discover tools
    if (this.capabilities.tools !== false) {
      try {
        const result = await this.sendRequest<{ tools: McpToolDefinition[] }>(
          'tools/list',
        )
        this.tools = result.tools.map((t) => ({
          name: t.name,
          description: t.description,
          inputSchema: t.inputSchema,
        }))
        this.emit('toolsDiscovered', this.tools)
      } catch (error) {
        console.warn('Failed to discover MCP tools:', error)
      }
    }

    // Discover resources
    if (this.capabilities.resources !== false) {
      try {
        const result = await this.sendRequest<{
          resources: McpResourceDefinition[]
        }>('resources/list')
        this.resources = result.resources.map((r) => ({
          uri: r.uri,
          name: r.name,
          description: r.description,
          mimeType: r.mimeType,
        }))
        this.emit('resourcesDiscovered', this.resources)
      } catch (error) {
        console.warn('Failed to discover MCP resources:', error)
      }
    }
  }
}

// =============================================================================
// MCP Client Manager
// =============================================================================

/**
 * Manages multiple MCP client connections
 */
export class McpClientManager {
  private clients = new Map<string, McpClient>()

  /**
   * Register an MCP server configuration
   */
  async register(id: string, config: McpConfig): Promise<McpClient> {
    // Disconnect existing client if any
    await this.unregister(id)

    const client = new McpClient(config)
    this.clients.set(id, client)

    // Connect automatically
    await client.connect()

    return client
  }

  /**
   * Unregister and disconnect an MCP client
   */
  async unregister(id: string): Promise<void> {
    const client = this.clients.get(id)
    if (client) {
      await client.disconnect()
      this.clients.delete(id)
    }
  }

  /**
   * Get a registered MCP client
   */
  get(id: string): McpClient | undefined {
    return this.clients.get(id)
  }

  /**
   * Get all registered clients
   */
  getAll(): Map<string, McpClient> {
    return new Map(this.clients)
  }

  /**
   * Get all tools from all connected MCP servers
   */
  getAllToolDefinitions(): ToolDefinition[] {
    const tools: ToolDefinition[] = []
    for (const [_id, client] of this.clients) {
      if (client.getState() === 'connected') {
        tools.push(...client.toToolDefinitions())
      }
    }
    return tools
  }

  /**
   * Execute a tool call, routing to the appropriate MCP client
   */
  async executeToolCall(toolCall: ToolCall): Promise<ToolResult> {
    // Find the client that has this tool
    for (const [_id, client] of this.clients) {
      if (client.getState() !== 'connected') continue

      const toolName = toolCall.name.startsWith('mcp_')
        ? toolCall.name.slice(4)
        : toolCall.name

      const hasTools = client.getTools().some((t) => t.name === toolName)
      if (hasTools) {
        return client.executeToolCall(toolCall)
      }
    }

    return {
      toolCallId: toolCall.id,
      toolName: toolCall.name,
      success: false,
      content: '',
      error: {
        code: 'TOOL_NOT_FOUND',
        message: `No MCP server has tool: ${toolCall.name}`,
      },
    }
  }

  /**
   * Disconnect all clients
   */
  async disconnectAll(): Promise<void> {
    const promises = Array.from(this.clients.keys()).map((id) =>
      this.unregister(id),
    )
    await Promise.all(promises)
  }
}

// Global MCP client manager instance
export const mcpManager = new McpClientManager()
