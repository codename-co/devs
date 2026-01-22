/**
 * DEVS Bridge - Extension API
 *
 * This script is loaded by extension apps running in sandboxed iframes.
 * It expects `window.__DEVS_CONTEXT__` to be set before this script loads.
 *
 * Usage in extensions:
 *   // Access context
 *   const { extensionId, extensionName, theme, language } = window.DEVS
 *
 *   // Make LLM calls
 *   const response = await window.DEVS.llm.chat([
 *     { role: 'user', content: 'Hello!' }
 *   ])
 *
 *   // Translate UI labels
 *   const label = window.DEVS.t('myKey') // Returns translated string or key as fallback
 *
 *   // Access and execute tools
 *   const tools = await window.DEVS.tools.list()
 *   const result = await window.DEVS.tools.execute('search_knowledge', { query: 'my search' })
 */
;(function () {
  'use strict'

  const context = window.__DEVS_CONTEXT__ || {}
  delete window.__DEVS_CONTEXT__

  // Extract i18n messages from context for translation helper
  const i18nMessages = context.i18n || {}

  /**
   * Translation helper function
   * Returns the translated string for the given key, or the key itself as fallback
   * @param {string} key - Translation key
   * @param {Record<string, string>} [params] - Optional interpolation parameters
   * @returns {string} - Translated string or key as fallback
   */
  function t(key, params = {}) {
    let text = i18nMessages[key] ?? key

    // Replace interpolation placeholders like {name} with provided params
    Object.entries(params).forEach(([paramKey, value]) => {
      text = text.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(value))
    })

    return text
  }

  // Request tracking for async operations
  const pendingRequests = new Map()
  const streamingRequests = new Map()
  const eventSubscriptions = new Map()
  let requestId = 0

  // Listen for responses from parent
  window.addEventListener('message', (event) => {
    const {
      type,
      requestId: resId,
      success,
      data,
      error,
      chunk,
      done,
    } = event.data || {}

    // Handle streaming chunks
    if (type && type.endsWith('_STREAM_CHUNK')) {
      const streaming = streamingRequests.get(resId)
      if (streaming) {
        if (done) {
          streamingRequests.delete(resId)
          streaming.resolve()
        } else if (chunk) {
          streaming.onChunk(chunk)
        }
      }
      return
    }

    // Handle event broadcasts (no requestId)
    if (type && type.startsWith('DEVS_EVENT_')) {
      const eventType = type.replace('DEVS_EVENT_', '')
      const callbacks = eventSubscriptions.get(eventType) || []
      callbacks.forEach((cb) => {
        try {
          cb(data)
        } catch (e) {
          console.error('Event callback error:', e)
        }
      })
      return
    }

    if (!type || !type.endsWith('_RESPONSE')) return

    const pending = pendingRequests.get(resId)
    if (pending) {
      pendingRequests.delete(resId)
      if (success) {
        pending.resolve(data)
      } else {
        pending.reject(new Error(error || 'Unknown error'))
      }
    }
  })

  /**
   * Send an async request to the parent DEVS app
   * @param {string} type - Message type
   * @param {object} payload - Request payload
   * @param {number} [timeout=30000] - Timeout in ms (default 30s for LLM calls)
   * @returns {Promise<any>}
   */
  function sendRequest(type, payload = {}, timeout = 30000) {
    return new Promise((resolve, reject) => {
      const id = ++requestId
      pendingRequests.set(id, { resolve, reject })

      const timer = setTimeout(() => {
        if (pendingRequests.has(id)) {
          pendingRequests.delete(id)
          reject(new Error('Request timeout'))
        }
      }, timeout)

      // Clear timeout on completion
      const originalResolve = resolve
      const originalReject = reject
      pendingRequests.set(id, {
        resolve: (data) => {
          clearTimeout(timer)
          originalResolve(data)
        },
        reject: (err) => {
          clearTimeout(timer)
          originalReject(err)
        },
      })

      window.parent.postMessage({ type, requestId: id, payload }, '*')
    })
  }

  /**
   * Send a streaming request to the parent DEVS app
   * @param {string} type - Message type
   * @param {object} payload - Request payload
   * @param {(chunk: any) => void} onChunk - Callback for each chunk
   * @param {number} [timeout=120000] - Timeout in ms (default 2 min for streaming)
   * @returns {Promise<void>}
   */
  function streamRequest(type, payload = {}, onChunk, timeout = 120000) {
    return new Promise((resolve, reject) => {
      const id = ++requestId

      const timer = setTimeout(() => {
        if (streamingRequests.has(id)) {
          streamingRequests.delete(id)
          reject(new Error('Streaming request timeout'))
        }
      }, timeout)

      streamingRequests.set(id, {
        onChunk,
        resolve: () => {
          clearTimeout(timer)
          resolve()
        },
        reject: (err) => {
          clearTimeout(timer)
          reject(err)
        },
      })

      window.parent.postMessage(
        { type, requestId: id, payload, stream: true },
        '*',
      )
    })
  }

  /**
   * Subscribe to events from the parent DEVS app
   * @param {string} eventType - Event type to subscribe to
   * @param {(data: any) => void} callback - Callback function
   * @returns {() => void} - Unsubscribe function
   */
  function subscribeToEvent(eventType, callback) {
    if (!eventSubscriptions.has(eventType)) {
      eventSubscriptions.set(eventType, [])
      // Notify parent we want to receive this event type
      window.parent.postMessage(
        { type: 'DEVS_SUBSCRIBE', payload: { eventType } },
        '*',
      )
    }
    eventSubscriptions.get(eventType).push(callback)

    // Return unsubscribe function
    return () => {
      const callbacks = eventSubscriptions.get(eventType) || []
      const index = callbacks.indexOf(callback)
      if (index > -1) {
        callbacks.splice(index, 1)
      }
      if (callbacks.length === 0) {
        eventSubscriptions.delete(eventType)
        window.parent.postMessage(
          { type: 'DEVS_UNSUBSCRIBE', payload: { eventType } },
          '*',
        )
      }
    }
  }

  /**
   * Send a fire-and-forget event to the parent
   * @param {string} type - Message type
   * @param {object} payload - Event payload
   */
  function sendEvent(type, payload = {}) {
    window.parent.postMessage({ type, payload }, '*')
  }

  // Expose the DEVS API globally
  window.DEVS = Object.freeze({
    // Static context (frozen, excluding i18n which is handled by t())
    extensionId: context.extensionId,
    extensionName: context.extensionName,
    theme: context.theme,
    language: context.language,
    context,

    /**
     * Translation helper for UI labels
     * Returns the translated string for the given key, or the key itself as fallback
     * @param {string} key - Translation key
     * @param {Record<string, string>} [params] - Optional interpolation parameters
     * @returns {string} - Translated string or key as fallback
     */
    t,

    /**
     * Navigate to a different page or route
     * @param {string} path - The path to navigate to (e.g., '/x/extension-id/page' or external URL)
     */
    navigate: (path) => {
      sendEvent('DEVS_NAVIGATE', { path })
    },

    /**
     * LLM API for making AI calls
     */
    llm: Object.freeze({
      /**
       * Send a chat completion request
       * @param {Array<{role: 'system'|'user'|'assistant', content: string}>} messages
       * @param {object} [options] - Optional configuration
       * @param {string} [options.provider] - LLM provider (e.g., 'openai', 'anthropic', 'google')
       * @param {string} [options.model] - Model ID (e.g., 'gpt-4', 'claude-3-opus')
       * @param {number} [options.temperature] - Temperature (0-2)
       * @param {number} [options.maxTokens] - Max tokens to generate
       * @returns {Promise<{content: string, usage?: {promptTokens: number, completionTokens: number}}>}
       */
      chat: (messages, options = {}) =>
        sendRequest('DEVS_LLM_CHAT', { messages, options }),

      /**
       * Generate a simple completion from a prompt string
       * @param {string} prompt - The prompt text
       * @param {object} [options] - Optional configuration
       * @returns {Promise<string>} - The generated text
       */
      complete: async (prompt, options = {}) => {
        const result = await sendRequest('DEVS_LLM_CHAT', {
          messages: [{ role: 'user', content: prompt }],
          options,
        })
        return result.content
      },
    }),

    /**
     * UI API for accessing DEVS UI components
     */
    ui: Object.freeze({
      /**
       * Show a toast notification
       * @param {string} message - Toast message
       * @param {object} [options] - Toast options
       * @param {'success'|'error'|'warning'|'info'} [options.type='info'] - Toast type
       * @param {number} [options.duration=3000] - Duration in ms
       * @returns {void} - Fire and forget, no response needed
       */
      toast: (message, options = {}) => {
        window.parent.postMessage(
          { type: 'DEVS_UI_TOAST', payload: { message, options } },
          '*',
        )
      },

      /**
       * Show a confirmation dialog
       * @param {object} options - Confirm options
       * @param {string} options.title - Dialog title
       * @param {string} options.message - Dialog message
       * @param {string} [options.confirmLabel='Confirm'] - Confirm button label
       * @param {string} [options.cancelLabel='Cancel'] - Cancel button label
       * @returns {Promise<boolean>} - True if confirmed, false if cancelled
       */
      confirm: (options) => sendRequest('DEVS_UI_CONFIRM', options, 120000),
    }),

    /**
     * Agents API for accessing DEVS agents
     */
    agents: Object.freeze({
      /**
       * List all available agents (built-in + custom)
       * @returns {Promise<Array<{id: string, slug: string, name: string, role: string, icon?: string, instructions?: string}>>}
       */
      list: () => sendRequest('DEVS_AGENTS_LIST'),

      /**
       * Get a specific agent by ID or slug
       * @param {string} idOrSlug - Agent ID or slug
       * @returns {Promise<{id: string, slug: string, name: string, role: string, icon?: string, instructions?: string} | null>}
       */
      get: (idOrSlug) => sendRequest('DEVS_AGENTS_GET', { idOrSlug }),
    }),

    /**
     * Image Generation API
     */
    image: Object.freeze({
      /**
       * Generate an image from a prompt
       * @param {string} prompt - Image generation prompt
       * @param {object} [options] - Generation options
       * @param {string} [options.provider] - Provider ('openai', 'stability', 'together', etc.)
       * @param {string} [options.model] - Model ID
       * @param {string} [options.size] - Image size ('512x512', '1024x1024')
       * @param {string} [options.style] - Style ('vivid', 'natural')
       * @param {string} [options.quality] - Quality ('standard', 'hd')
       * @returns {Promise<{url: string, base64?: string}>}
       */
      generate: (prompt, options = {}) =>
        sendRequest('DEVS_IMAGE_GENERATE', { prompt, options }, 120000), // 2 min timeout
    }),

    /**
     * Storage API for extension-specific data persistence
     */
    storage: Object.freeze({
      /**
       * Store extension-specific data (scoped to extension ID)
       * @param {string} key - Storage key
       * @param {any} value - Value to store (will be JSON serialized)
       * @returns {Promise<void>}
       */
      set: (key, value) => sendRequest('DEVS_STORAGE_SET', { key, value }),

      /**
       * Get stored value
       * @param {string} key - Storage key
       * @returns {Promise<any>}
       */
      get: (key) => sendRequest('DEVS_STORAGE_GET', { key }),

      /**
       * Remove stored value
       * @param {string} key - Storage key
       * @returns {Promise<void>}
       */
      remove: (key) => sendRequest('DEVS_STORAGE_REMOVE', { key }),

      /**
       * List all storage keys for this extension
       * @returns {Promise<string[]>}
       */
      keys: () => sendRequest('DEVS_STORAGE_KEYS'),
    }),

    /**
     * Vision API for analyzing images and canvas content
     */
    vision: Object.freeze({
      /**
       * Analyze an image using vision models
       * @param {string} imageData - Base64 encoded image or data URL
       * @param {string} [prompt] - Optional analysis prompt
       * @param {object} [options] - Analysis options
       * @param {string} [options.provider] - Vision provider
       * @param {string} [options.model] - Vision model
       * @returns {Promise<{description: string, elements?: Array<{type: string, bounds: {x: number, y: number, width: number, height: number}, description: string}>}>}
       */
      analyze: (imageData, prompt, options = {}) =>
        sendRequest(
          'DEVS_VISION_ANALYZE',
          { imageData, prompt, options },
          60000,
        ),

      /**
       * Interpret hand-drawn sketches and diagrams
       * @param {string} imageData - Base64 encoded sketch image
       * @param {object} [options] - Interpretation options
       * @param {'flowchart'|'wireframe'|'diagram'|'freeform'} [options.type] - Expected sketch type
       * @returns {Promise<{interpretation: string, elements: Array<{type: string, label?: string, connections?: string[]}>, suggestedActions?: string[]}>}
       */
      interpretSketch: (imageData, options = {}) =>
        sendRequest(
          'DEVS_VISION_INTERPRET_SKETCH',
          { imageData, options },
          60000,
        ),
    }),

    /**
     * Canvas Collaboration API for real-time P2P canvas sync
     */
    canvas: Object.freeze({
      /**
       * Subscribe to real-time presence updates (cursors, selections)
       * @param {(update: {userId: string, agentId?: string, name: string, color: string, position: {x: number, y: number}, selection?: string[]}) => void} callback
       * @returns {() => void} - Unsubscribe function
       */
      onPresenceUpdate: (callback) =>
        subscribeToEvent('CANVAS_PRESENCE', callback),

      /**
       * Broadcast local cursor/selection state to other participants
       * @param {{position: {x: number, y: number}, selection?: string[]}} state
       */
      broadcastPresence: (state) =>
        sendEvent('DEVS_CANVAS_PRESENCE_BROADCAST', state),

      /**
       * Get a Yjs-compatible shared document for real-time sync
       * @param {string} documentId - Canvas document ID
       * @returns {Promise<{docId: string, roomId: string, awareness: object}>} - Sync metadata for Yjs setup
       */
      getSharedDocument: (documentId) =>
        sendRequest('DEVS_CANVAS_GET_DOC', { documentId }),

      /**
       * Join a collaborative canvas session
       * @param {string} documentId - Canvas document ID
       * @param {{name?: string, color?: string}} [options] - User display options
       * @returns {Promise<{sessionId: string, participants: Array<{userId: string, name: string, color: string}>}>}
       */
      joinSession: (documentId, options = {}) =>
        sendRequest('DEVS_CANVAS_JOIN', { documentId, options }),

      /**
       * Leave the current canvas session
       * @param {string} sessionId
       * @returns {Promise<void>}
       */
      leaveSession: (sessionId) =>
        sendRequest('DEVS_CANVAS_LEAVE', { sessionId }),

      /**
       * Subscribe to canvas change events from other participants
       * @param {(change: {userId: string, agentId?: string, operation: 'add'|'update'|'delete', elements: any[]}) => void} callback
       * @returns {() => void} - Unsubscribe function
       */
      onCanvasChange: (callback) => subscribeToEvent('CANVAS_CHANGE', callback),
    }),

    /**
     * Agent Collaboration API - Invite agents as active canvas participants
     */
    agentCollaboration: Object.freeze({
      /**
       * Invite an agent to join the canvas as an active participant
       * @param {string} agentIdOrSlug - Agent ID or slug
       * @param {object} [options] - Invitation options
       * @param {'observer'|'contributor'|'facilitator'} [options.role='contributor'] - Agent's role
       * @param {string} [options.context] - Initial context for the agent
       * @param {string} [options.canvasSnapshot] - Current canvas state (base64 image)
       * @returns {Promise<{sessionId: string, agentId: string, agentName: string}>}
       */
      inviteAgent: (agentIdOrSlug, options = {}) =>
        sendRequest('DEVS_AGENT_INVITE', { agentIdOrSlug, options }),

      /**
       * Request an agent action on canvas elements
       * @param {string} sessionId - Agent session ID
       * @param {object} request - Action request
       * @param {'analyze'|'suggest'|'create'|'refine'|'organize'|'annotate'} request.action - Action type
       * @param {any[]} [request.elements] - Selected elements to act on
       * @param {string} [request.prompt] - Natural language instruction
       * @param {string} [request.canvasSnapshot] - Current canvas state (base64 image)
       * @returns {Promise<{response: string, suggestedElements?: any[], annotations?: Array<{elementId?: string, text: string, position: {x: number, y: number}}>, actions?: Array<{type: string, payload: any}>}>}
       */
      requestAction: (sessionId, request) =>
        sendRequest('DEVS_AGENT_ACTION', { sessionId, request }, 90000),

      /**
       * Stream agent responses for real-time canvas updates
       * @param {string} sessionId - Agent session ID
       * @param {object} request - Action request (same as requestAction)
       * @param {(chunk: {type: 'text'|'element'|'annotation'|'action', data: any}) => void} onChunk
       * @returns {Promise<void>}
       */
      streamAction: (sessionId, request, onChunk) =>
        streamRequest(
          'DEVS_AGENT_ACTION_STREAM',
          { sessionId, request },
          onChunk,
        ),

      /**
       * Subscribe to agent-initiated canvas updates
       * @param {(update: {sessionId: string, agentId: string, type: 'drawing'|'annotation'|'suggestion', data: any}) => void} callback
       * @returns {() => void} - Unsubscribe function
       */
      onAgentUpdate: (callback) =>
        subscribeToEvent('AGENT_CANVAS_UPDATE', callback),

      /**
       * Remove an agent from the canvas session
       * @param {string} sessionId - Agent session ID
       * @returns {Promise<void>}
       */
      dismissAgent: (sessionId) =>
        sendRequest('DEVS_AGENT_DISMISS', { sessionId }),

      /**
       * List all active agent sessions on the canvas
       * @returns {Promise<Array<{sessionId: string, agentId: string, agentName: string, role: string, joinedAt: string}>>}
       */
      listActiveSessions: () => sendRequest('DEVS_AGENT_LIST_SESSIONS'),
    }),

    /**
     * Knowledge Base API for accessing user's knowledge
     */
    knowledge: Object.freeze({
      /**
       * Search knowledge base for relevant context
       * @param {string} query - Search query
       * @param {object} [options] - Search options
       * @param {number} [options.limit=10] - Maximum results
       * @param {Array<'file'|'folder'>} [options.types] - Filter by item types
       * @param {string[]} [options.tags] - Filter by tags
       * @returns {Promise<Array<{id: string, name: string, path: string, content?: string, relevance: number, fileType?: string}>>}
       */
      search: (query, options = {}) =>
        sendRequest('DEVS_KNOWLEDGE_SEARCH', { query, options }),

      /**
       * Get a specific knowledge item by ID
       * @param {string} id - Knowledge item ID
       * @returns {Promise<{id: string, name: string, path: string, content?: string, fileType?: string, tags?: string[]} | null>}
       */
      get: (id) => sendRequest('DEVS_KNOWLEDGE_GET', { id }),

      /**
       * Save canvas content as a knowledge item
       * @param {object} item - Item to save
       * @param {string} item.name - Item name
       * @param {string} item.content - Item content (markdown, JSON, etc.)
       * @param {string} [item.path] - Virtual path
       * @param {string[]} [item.tags] - Tags for organization
       * @param {string} [item.description] - Item description
       * @returns {Promise<{id: string}>}
       */
      save: (item) => sendRequest('DEVS_KNOWLEDGE_SAVE', item),

      /**
       * Update an existing knowledge item
       * @param {string} id - Item ID
       * @param {object} updates - Fields to update
       * @returns {Promise<void>}
       */
      update: (id, updates) =>
        sendRequest('DEVS_KNOWLEDGE_UPDATE', { id, updates }),
    }),

    /**
     * Tasks API for creating and tracking tasks from canvas elements
     */
    tasks: Object.freeze({
      /**
       * Create a task from canvas content
       * @param {object} task - Task to create
       * @param {string} task.title - Task title
       * @param {string} task.description - Task description
       * @param {string} [task.assignedAgentId] - Assigned agent ID
       * @param {Array<{type: string, description: string}>} [task.requirements] - Task requirements
       * @param {string} [task.sourceElementId] - Canvas element that spawned this task
       * @returns {Promise<{id: string, workflowId: string}>}
       */
      create: (task) => sendRequest('DEVS_TASK_CREATE', task),

      /**
       * Link a canvas element to an existing task
       * @param {string} taskId - Task ID
       * @param {object} link - Link details
       * @param {string} link.elementId - Canvas element ID
       * @param {'source'|'artifact'|'reference'} link.type - Link type
       * @param {string} [link.description] - Link description
       * @returns {Promise<void>}
       */
      linkElement: (taskId, link) =>
        sendRequest('DEVS_TASK_LINK', { taskId, link }),

      /**
       * Get task by ID
       * @param {string} taskId - Task ID
       * @returns {Promise<{id: string, title: string, description: string, status: string, assignedAgentId?: string, artifacts: string[]} | null>}
       */
      get: (taskId) => sendRequest('DEVS_TASK_GET', { taskId }),

      /**
       * List tasks with optional filtering
       * @param {object} [options] - Filter options
       * @param {'pending'|'in_progress'|'completed'|'failed'} [options.status] - Filter by status
       * @param {string} [options.assignedAgentId] - Filter by assigned agent
       * @param {number} [options.limit=20] - Maximum results
       * @returns {Promise<Array<{id: string, title: string, status: string, assignedAgentId?: string}>>}
       */
      list: (options = {}) => sendRequest('DEVS_TASK_LIST', options),

      /**
       * Subscribe to task status changes
       * @param {(update: {taskId: string, status: string, agentId?: string}) => void} callback
       * @returns {() => void} - Unsubscribe function
       */
      onStatusChange: (callback) =>
        subscribeToEvent('TASK_STATUS_CHANGE', callback),
    }),

    /**
     * Conversations API for accessing agent conversation history
     */
    conversations: Object.freeze({
      /**
       * Get recent conversations with an agent
       * @param {string} agentId - Agent ID
       * @param {object} [options] - Options
       * @param {number} [options.limit=10] - Maximum results
       * @returns {Promise<Array<{id: string, title?: string, summary?: string, timestamp: string, messageCount: number}>>}
       */
      getRecent: (agentId, options = {}) =>
        sendRequest('DEVS_CONVERSATIONS_RECENT', { agentId, options }),

      /**
       * Get messages from a specific conversation
       * @param {string} conversationId - Conversation ID
       * @param {object} [options] - Options
       * @param {number} [options.limit=50] - Maximum messages
       * @param {string} [options.before] - Get messages before this message ID
       * @returns {Promise<Array<{id: string, role: string, content: string, timestamp: string}>>}
       */
      getMessages: (conversationId, options = {}) =>
        sendRequest('DEVS_CONVERSATION_MESSAGES', { conversationId, options }),

      /**
       * Create a new conversation with canvas context
       * @param {object} options - Conversation options
       * @param {string} options.agentId - Agent to converse with
       * @param {string} [options.initialContext] - Initial context (e.g., canvas description)
       * @param {string} [options.canvasSnapshot] - Canvas snapshot (base64 image)
       * @param {string} [options.title] - Conversation title
       * @returns {Promise<{conversationId: string}>}
       */
      create: (options) => sendRequest('DEVS_CONVERSATION_CREATE', options),

      /**
       * Add a message to an existing conversation
       * @param {string} conversationId - Conversation ID
       * @param {string} content - Message content
       * @returns {Promise<{messageId: string, response?: {content: string, messageId: string}}>}
       */
      addMessage: (conversationId, content) =>
        sendRequest(
          'DEVS_CONVERSATION_ADD_MESSAGE',
          { conversationId, content },
          60000,
        ),
    }),

    /**
     * Artifacts API for accessing task artifacts
     */
    artifacts: Object.freeze({
      /**
       * Get artifacts for a task
       * @param {string} taskId - Task ID
       * @returns {Promise<Array<{id: string, type: string, description: string, content: string, status: string}>>}
       */
      getForTask: (taskId) =>
        sendRequest('DEVS_ARTIFACTS_FOR_TASK', { taskId }),

      /**
       * Create an artifact from canvas content
       * @param {object} artifact - Artifact to create
       * @param {string} artifact.taskId - Associated task ID
       * @param {string} artifact.type - Artifact type (e.g., 'code', 'design', 'document')
       * @param {string} artifact.description - Artifact description
       * @param {string} artifact.content - Artifact content
       * @param {string[]} [artifact.validates] - Requirement IDs this validates
       * @returns {Promise<{id: string}>}
       */
      create: (artifact) => sendRequest('DEVS_ARTIFACT_CREATE', artifact),
    }),

    /**
     * Export API for canvas portability
     */
    export: Object.freeze({
      /**
       * Export canvas to various formats
       * @param {'json'|'svg'|'png'|'pdf'|'markdown'} format - Export format
       * @param {object} [options] - Export options
       * @param {string[]} [options.elementIds] - Specific elements to export (all if empty)
       * @param {boolean} [options.includeAnnotations=true] - Include agent annotations
       * @param {boolean} [options.includeMetadata=true] - Include element metadata
       * @param {number} [options.scale=1] - Scale factor for raster exports
       * @returns {Promise<{data: string, mimeType: string, filename: string}>}
       */
      canvas: (format, options = {}) =>
        sendRequest('DEVS_EXPORT_CANVAS', { format, options }, 30000),

      /**
       * Export canvas elements as code/prototype
       * @param {object} options - Export options
       * @param {string[]} [options.elementIds] - Elements to convert
       * @param {'react'|'html'|'svg'|'figma'} options.target - Target format
       * @param {string} [options.framework] - Framework variant (e.g., 'nextjs', 'vite')
       * @returns {Promise<{files: Array<{path: string, content: string}>, preview?: string}>}
       */
      toCode: (options) => sendRequest('DEVS_EXPORT_TO_CODE', options, 60000),
    }),

    /**
     * Clipboard API for canvas clipboard operations
     */
    clipboard: Object.freeze({
      /**
       * Copy elements to clipboard
       * @param {any[]} elements - Canvas elements to copy
       * @param {'elements'|'image'|'text'} [format='elements'] - Clipboard format
       * @returns {Promise<void>}
       */
      copy: (elements, format = 'elements') =>
        sendRequest('DEVS_CLIPBOARD_COPY', { elements, format }),

      /**
       * Paste from clipboard
       * @returns {Promise<{type: 'elements'|'image'|'text', data: any} | null>}
       */
      paste: () => sendRequest('DEVS_CLIPBOARD_PASTE'),
    }),

    /**
     * Tools API for accessing registered tools
     */
    tools: Object.freeze({
      /**
       * List all registered tools
       * @param {object} [options] - Filter options
       * @param {'knowledge'|'math'|'code'|'presentation'|'connector'|'utility'|'custom'} [options.category] - Filter by category
       * @param {string[]} [options.tags] - Filter by tags (tools must have at least one matching tag)
       * @param {boolean} [options.enabledOnly=true] - Only return enabled tools
       * @returns {Promise<Array<{name: string, displayName: string, shortDescription: string, icon: string, category: string, tags?: string[], definition: object}>>}
       */
      list: (options = {}) => sendRequest('DEVS_TOOLS_LIST', options),

      /**
       * Get a specific tool by name
       * @param {string} name - Tool name
       * @returns {Promise<{name: string, displayName: string, shortDescription: string, icon: string, category: string, tags?: string[], definition: object} | null>}
       */
      get: (name) => sendRequest('DEVS_TOOLS_GET', { name }),

      /**
       * Execute a tool with the given arguments
       * @param {string} name - Tool name to execute
       * @param {object} args - Arguments to pass to the tool
       * @param {object} [options] - Execution options
       * @param {number} [options.timeout=60000] - Timeout in ms
       * @returns {Promise<{success: boolean, result?: any, error?: string}>}
       */
      execute: (name, args, options = {}) =>
        sendRequest(
          'DEVS_TOOLS_EXECUTE',
          { name, args, options },
          options.timeout || 60000,
        ),

      /**
       * Get all available tool categories
       * @returns {Promise<string[]>}
       */
      getCategories: () => sendRequest('DEVS_TOOLS_CATEGORIES'),
    }),
  })

  // Forward keyboard events to parent window for hotkey handling
  document.addEventListener('keydown', (e) => {
    // Skip if user is typing in an input/textarea/contenteditable
    const target = e.target
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable
    ) {
      // Only forward if it's a modifier key combo (Cmd/Ctrl + key)
      if (!(e.metaKey || e.ctrlKey)) return
    }

    e.preventDefault()

    parent.postMessage(
      {
        type: 'DEVS_KEYBOARD_EVENT',
        payload: {
          key: e.key,
          code: e.code,
          keyCode: e.keyCode,
          which: e.which,
          altKey: e.altKey,
          ctrlKey: e.ctrlKey,
          metaKey: e.metaKey,
          shiftKey: e.shiftKey,
          repeat: e.repeat,
        },
      },
      '*',
    )
  })
})()
