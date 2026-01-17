/**
 * Google Tasks Connector Provider
 *
 * Implements OAuth 2.0 authentication and API integration for Google Tasks.
 * Supports listing, reading task lists and tasks, and delta sync via updatedMin.
 */

import { BRIDGE_URL } from '@/config/bridge'

import { BaseAppConnectorProvider } from '../../connector-provider'
import type {
  Connector,
  ConnectorProviderConfig,
  OAuthResult,
  TokenRefreshResult,
  AccountInfo,
  ListOptions,
  ListResult,
  ContentResult,
  ChangesResult,
  ConnectorItem,
  ProviderMetadata,
} from '../../types'
import { registerProvider } from './registry'

// =============================================================================
// Provider Metadata
// =============================================================================

/** Self-contained metadata for Google Tasks provider */
export const metadata: ProviderMetadata = {
  id: 'google-tasks',
  name: 'Google Tasks',
  icon: 'GoogleTasks',
  color: '#4285f4',
  description: 'Sync tasks and to-do lists from Google Tasks',
  syncSupported: true,
  oauth: {
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: `${BRIDGE_URL}/api/google/token`,
    clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
    clientSecret: '',
    scopes: [
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/tasks.readonly',
    ],
    pkceRequired: true,
  },
  // Google providers share proxy routes - defined in google-drive
}

// Register the provider
registerProvider(metadata, () => import('./google-tasks'))

// =============================================================================
// Constants
// =============================================================================

/** Google Tasks API v1 base URL */
const TASKS_API_BASE = 'https://tasks.googleapis.com/tasks/v1'

/** Google OAuth2 endpoints */
const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
/** Use bridge URL for token operations - bridge injects client_secret server-side */
const GOOGLE_TOKEN_URL = `${BRIDGE_URL}/api/google/token`
const GOOGLE_REVOKE_URL = 'https://oauth2.googleapis.com/revoke'
const GOOGLE_TOKENINFO_URL = 'https://oauth2.googleapis.com/tokeninfo'
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo'

/** Google Tasks API scope (plus user info for account details) */
const TASKS_SCOPES = [
  'https://www.googleapis.com/auth/tasks.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
].join(' ')

/** Default page size for task listing */
const DEFAULT_PAGE_SIZE = 100

/** Default task list ID (primary task list) */
const DEFAULT_TASKLIST_ID = '@default'

// =============================================================================
// Types
// =============================================================================

/** Google Task List */
interface TaskList {
  kind: string
  id: string
  etag: string
  title: string
  updated?: string
  selfLink?: string
}

/** Response from tasklists.list */
interface TaskListsListResponse {
  kind: string
  etag: string
  items?: TaskList[]
  nextPageToken?: string
}

/** Google Task */
interface Task {
  kind: string
  id: string
  etag: string
  title: string
  updated?: string
  selfLink?: string
  parent?: string
  position?: string
  notes?: string
  status?: 'needsAction' | 'completed'
  due?: string // RFC3339 date string
  completed?: string // RFC3339 timestamp
  deleted?: boolean
  hidden?: boolean
  links?: Array<{
    type: string
    description?: string
    link: string
  }>
  webViewLink?: string
}

/** Response from tasks.list */
interface TasksListResponse {
  kind: string
  etag: string
  items?: Task[]
  nextPageToken?: string
}

/** Response from Google OAuth token endpoint */
interface GoogleTokenResponse {
  access_token: string
  refresh_token?: string
  expires_in?: number
  scope: string
  token_type: string
}

/** Response from Google userinfo endpoint */
interface GoogleUserInfoResponse {
  id: string
  email?: string
  name?: string
  picture?: string
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Format a due date for display.
 *
 * @param dueDate - The RFC3339 date string
 * @returns Formatted date string
 */
function formatDueDate(dueDate: string | undefined): string {
  if (!dueDate) return 'No due date'

  const date = new Date(dueDate)
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/**
 * Format a task as markdown.
 *
 * @param task - The task to format
 * @param taskListTitle - The title of the task list
 * @returns Markdown-formatted task content
 */
function formatTaskAsMarkdown(task: Task, taskListTitle?: string): string {
  const sections: string[] = []

  // Title with status indicator
  const statusIcon = task.status === 'completed' ? '✅' : '⬜'
  sections.push(`# ${statusIcon} ${task.title || 'Untitled Task'}`)
  sections.push('')

  // Status
  sections.push(
    `**Status:** ${task.status === 'completed' ? 'Completed' : 'Not completed'}`,
  )

  // Due date
  if (task.due) {
    const dueDate = new Date(task.due)
    const now = new Date()
    const isOverdue = task.status !== 'completed' && dueDate < now
    sections.push(
      `**Due:** ${formatDueDate(task.due)}${isOverdue ? ' (Overdue)' : ''}`,
    )
  }

  // Completed date
  if (task.completed) {
    const completedDate = new Date(task.completed)
    sections.push(
      `**Completed:** ${completedDate.toLocaleString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })}`,
    )
  }

  // Task list
  if (taskListTitle) {
    sections.push(`**List:** ${taskListTitle}`)
  }

  // Last updated
  if (task.updated) {
    const updatedDate = new Date(task.updated)
    sections.push(
      `**Updated:** ${updatedDate.toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })}`,
    )
  }

  sections.push('')

  // Notes/Description
  sections.push('## Notes')
  sections.push(task.notes || 'No notes')
  sections.push('')

  // Links
  if (task.links && task.links.length > 0) {
    sections.push('## Related Links')
    for (const link of task.links) {
      const description = link.description || link.link
      sections.push(`- [${description}](${link.link})`)
    }
    sections.push('')
  }

  return sections.join('\n')
}

/**
 * Format a task list as markdown.
 *
 * @param taskList - The task list to format
 * @returns Markdown-formatted task list content
 */
function formatTaskListAsMarkdown(taskList: TaskList): string {
  const sections: string[] = []

  sections.push(`# 📋 ${taskList.title || 'Untitled Task List'}`)
  sections.push('')

  if (taskList.updated) {
    const updatedDate = new Date(taskList.updated)
    sections.push(
      `**Last Updated:** ${updatedDate.toLocaleString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })}`,
    )
    sections.push('')
  }

  sections.push('This is a task list from Google Tasks.')

  return sections.join('\n')
}

/**
 * Create a short description for a task.
 *
 * @param task - The task
 * @returns Short description string
 */
function createTaskDescription(task: Task): string {
  const parts: string[] = []

  // Status
  parts.push(task.status === 'completed' ? 'Completed' : 'To do')

  // Due date
  if (task.due) {
    parts.push(`Due: ${new Date(task.due).toLocaleDateString()}`)
  }

  // Notes preview
  if (task.notes) {
    const preview = task.notes.slice(0, 50)
    parts.push(preview + (task.notes.length > 50 ? '...' : ''))
  }

  return parts.join(' • ')
}

// =============================================================================
// Provider Implementation
// =============================================================================

/**
 * Google Tasks connector provider.
 *
 * Provides OAuth authentication and API integration for Google Tasks,
 * including task list/task listing, content retrieval, and delta sync.
 */
export class GoogleTasksProvider extends BaseAppConnectorProvider {
  readonly id = 'google-tasks' as const

  readonly config: ConnectorProviderConfig = {
    id: 'google-tasks',
    category: 'app',
    name: 'Google Tasks',
    icon: 'GoogleTasks',
    color: '#4285f4',
    capabilities: ['read'],
    supportedTypes: ['task', 'tasklist'],
    maxFileSize: 1024 * 1024,
    rateLimit: { requests: 500, windowSeconds: 100 },
  }

  /** Get the Google OAuth client ID from environment */
  private get clientId(): string {
    return import.meta.env.VITE_GOOGLE_CLIENT_ID || ''
  }

  /** Get the OAuth redirect URI */
  private get redirectUri(): string {
    return `${window.location.origin}/oauth/callback`
  }

  // ===========================================================================
  // OAuth Methods
  // ===========================================================================

  /**
   * Generate the Google OAuth authorization URL for Tasks.
   *
   * Builds a URL with PKCE support for secure browser-based OAuth.
   *
   * @param state - State parameter for CSRF protection
   * @param codeChallenge - PKCE code challenge (S256)
   * @returns The full authorization URL
   */
  getAuthUrl(state: string, codeChallenge: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: TASKS_SCOPES,
      access_type: 'offline',
      prompt: 'consent',
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    })

    return `${GOOGLE_AUTH_URL}?${params.toString()}`
  }

  /**
   * Exchange an authorization code for access and refresh tokens.
   *
   * @param code - The authorization code from OAuth callback
   * @param codeVerifier - The PKCE code verifier
   * @returns OAuth result with tokens
   * @throws Error if token exchange fails
   */
  async exchangeCode(code: string, codeVerifier: string): Promise<OAuthResult> {
    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: this.clientId,
        code,
        code_verifier: codeVerifier,
        grant_type: 'authorization_code',
        redirect_uri: this.redirectUri,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Token exchange failed: ${response.status} ${errorText}`)
    }

    const data: GoogleTokenResponse = await response.json()

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
      scope: data.scope,
      tokenType: data.token_type,
    }
  }

  /**
   * Refresh an expired access token using the refresh token.
   *
   * @param connector - The connector with the refresh token
   * @returns New access token and expiration
   * @throws Error if refresh fails or no refresh token available
   */
  async refreshToken(connector: Connector): Promise<TokenRefreshResult> {
    const refreshToken = await this.getDecryptedRefreshToken(connector)

    if (!refreshToken) {
      throw new Error('No refresh token available')
    }

    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: this.clientId,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Token refresh failed: ${response.status} ${errorText}`)
    }

    const data: GoogleTokenResponse = await response.json()

    return {
      accessToken: data.access_token,
      expiresIn: data.expires_in,
    }
  }

  /**
   * Validate that a token is still valid with Google.
   *
   * @param token - The access token to validate
   * @returns True if the token is valid
   */
  async validateToken(token: string): Promise<boolean> {
    try {
      const response = await fetch(
        `${GOOGLE_TOKENINFO_URL}?access_token=${encodeURIComponent(token)}`,
      )
      return response.ok
    } catch {
      return false
    }
  }

  /**
   * Revoke all access for a connector.
   *
   * @param connector - The connector to revoke access for
   * @throws Error if revocation fails
   */
  async revokeAccess(connector: Connector): Promise<void> {
    const token = await this.getDecryptedToken(connector)

    const response = await fetch(
      `${GOOGLE_REVOKE_URL}?token=${encodeURIComponent(token)}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      },
    )

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(
        `Token revocation failed: ${response.status} ${errorText}`,
      )
    }
  }

  /**
   * Get account information for the authenticated user.
   *
   * @param token - The access token
   * @returns Account information including ID and email
   * @throws Error if fetching account info fails
   */
  async getAccountInfo(token: string): Promise<AccountInfo> {
    const response = await fetch(GOOGLE_USERINFO_URL, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(
        `Failed to get account info: ${response.status} ${errorText}`,
      )
    }

    const data: GoogleUserInfoResponse = await response.json()

    return {
      id: data.id,
      email: data.email,
      name: data.name,
      picture: data.picture,
    }
  }

  // ===========================================================================
  // Content Operations
  // ===========================================================================

  /**
   * List tasks from Google Tasks using a raw access token.
   *
   * @param token - The raw access token
   * @param options - Pagination and filtering options
   * @returns List of tasks with pagination info
   */
  async listWithToken(
    token: string,
    options?: ListOptions,
  ): Promise<ListResult> {
    const taskListId =
      (options?.filter?.taskListId as string) || DEFAULT_TASKLIST_ID

    // If path is empty or root, list task lists first
    if (!options?.path || options.path === '/') {
      return this.listTaskListsWithToken(token, options)
    }

    // Otherwise, list tasks in the specified task list
    const params = new URLSearchParams({
      maxResults: String(options?.pageSize ?? DEFAULT_PAGE_SIZE),
      showCompleted: 'true',
      showHidden: 'false',
    })

    // Add cursor for pagination
    if (options?.cursor) {
      params.set('pageToken', options.cursor)
    }

    const listUrl = `${TASKS_API_BASE}/lists/${encodeURIComponent(taskListId)}/tasks?${params.toString()}`
    const listData = await this.fetchJsonWithRawToken<TasksListResponse>(
      token,
      listUrl,
    )

    if (!listData.items || listData.items.length === 0) {
      return {
        items: [],
        hasMore: false,
      }
    }

    // Filter out deleted tasks
    const activeTasks = listData.items.filter((task) => !task.deleted)

    return {
      items: activeTasks.map((task) =>
        this.normalizeTaskItem(task, taskListId),
      ),
      nextCursor: listData.nextPageToken,
      hasMore: !!listData.nextPageToken,
    }
  }

  /**
   * List task lists using a raw access token.
   *
   * @param token - The raw access token
   * @param options - Pagination options
   * @returns List of task lists
   */
  private async listTaskListsWithToken(
    token: string,
    options?: ListOptions,
  ): Promise<ListResult> {
    const params = new URLSearchParams({
      maxResults: String(options?.pageSize ?? DEFAULT_PAGE_SIZE),
    })

    if (options?.cursor) {
      params.set('pageToken', options.cursor)
    }

    const listUrl = `${TASKS_API_BASE}/users/@me/lists?${params.toString()}`
    const listData = await this.fetchJsonWithRawToken<TaskListsListResponse>(
      token,
      listUrl,
    )

    if (!listData.items || listData.items.length === 0) {
      return {
        items: [],
        hasMore: false,
      }
    }

    return {
      items: listData.items.map((taskList) =>
        this.normalizeTaskListItem(taskList),
      ),
      nextCursor: listData.nextPageToken,
      hasMore: !!listData.nextPageToken,
    }
  }

  /**
   * List tasks and task lists from Google Tasks.
   *
   * @param connector - The connector to list from
   * @param options - Pagination and filtering options
   *   - path: '/' for task lists, '/taskListId' for tasks in that list
   *   - filter.taskListId: Specific task list ID
   *   - filter.showCompleted: Include completed tasks (default: true)
   * @returns List of tasks/task lists with pagination info
   */
  async list(connector: Connector, options?: ListOptions): Promise<ListResult> {
    // If path is empty or root, list task lists
    if (!options?.path || options.path === '/') {
      return this.listTaskLists(connector, options)
    }

    // Extract task list ID from path (e.g., '/taskListId' -> 'taskListId')
    const pathParts = options.path.split('/').filter(Boolean)
    const taskListId = pathParts[0] || DEFAULT_TASKLIST_ID

    const params = new URLSearchParams({
      maxResults: String(options?.pageSize ?? DEFAULT_PAGE_SIZE),
      showCompleted: String(options?.filter?.showCompleted ?? true),
      showHidden: 'false',
    })

    // Add cursor for pagination
    if (options?.cursor) {
      params.set('pageToken', options.cursor)
    }

    const listUrl = `${TASKS_API_BASE}/lists/${encodeURIComponent(taskListId)}/tasks?${params.toString()}`

    try {
      const listData = await this.fetchJson<TasksListResponse>(
        connector,
        listUrl,
      )

      if (!listData.items || listData.items.length === 0) {
        return {
          items: [],
          hasMore: false,
        }
      }

      // Filter out deleted tasks
      const activeTasks = listData.items.filter((task) => !task.deleted)

      return {
        items: activeTasks.map((task) =>
          this.normalizeTaskItem(task, taskListId),
        ),
        nextCursor: listData.nextPageToken,
        hasMore: !!listData.nextPageToken,
      }
    } catch (error) {
      // Handle specific API errors
      if (error instanceof Error) {
        if (error.message.includes('404')) {
          throw new Error(`Task list '${taskListId}' not found`)
        }
        if (error.message.includes('403')) {
          throw new Error(`Access denied to task list '${taskListId}'`)
        }
      }
      throw error
    }
  }

  /**
   * List all task lists for the user.
   *
   * @param connector - The connector to list from
   * @param options - Pagination options
   * @returns List of task lists
   */
  private async listTaskLists(
    connector: Connector,
    options?: ListOptions,
  ): Promise<ListResult> {
    const params = new URLSearchParams({
      maxResults: String(options?.pageSize ?? DEFAULT_PAGE_SIZE),
    })

    if (options?.cursor) {
      params.set('pageToken', options.cursor)
    }

    const listUrl = `${TASKS_API_BASE}/users/@me/lists?${params.toString()}`

    try {
      const listData = await this.fetchJson<TaskListsListResponse>(
        connector,
        listUrl,
      )

      if (!listData.items || listData.items.length === 0) {
        return {
          items: [],
          hasMore: false,
        }
      }

      return {
        items: listData.items.map((taskList) =>
          this.normalizeTaskListItem(taskList),
        ),
        nextCursor: listData.nextPageToken,
        hasMore: !!listData.nextPageToken,
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('403')) {
        throw new Error('Access denied to task lists')
      }
      throw error
    }
  }

  /**
   * Read the content of a specific task or task list.
   *
   * @param connector - The connector to read from
   * @param externalId - The ID (format: "taskListId:taskId" for tasks, "list:taskListId" for lists)
   * @returns The content and metadata
   */
  async read(connector: Connector, externalId: string): Promise<ContentResult> {
    // Check if this is a task list
    if (externalId.startsWith('list:')) {
      const taskListId = externalId.slice(5)
      return this.readTaskList(connector, taskListId)
    }

    // Parse externalId - format is "taskListId:taskId"
    let taskListId = DEFAULT_TASKLIST_ID
    let taskId = externalId

    if (externalId.includes(':')) {
      const parts = externalId.split(':')
      taskListId = parts[0]
      taskId = parts.slice(1).join(':')
    }

    const url = `${TASKS_API_BASE}/lists/${encodeURIComponent(taskListId)}/tasks/${encodeURIComponent(taskId)}`

    try {
      const task = await this.fetchJson<Task>(connector, url)

      // Get task list title for context
      let taskListTitle: string | undefined
      try {
        const taskListUrl = `${TASKS_API_BASE}/users/@me/lists/${encodeURIComponent(taskListId)}`
        const taskList = await this.fetchJson<TaskList>(connector, taskListUrl)
        taskListTitle = taskList.title
      } catch {
        // Ignore errors getting task list title
      }

      // Format the content as markdown
      const content = formatTaskAsMarkdown(task, taskListTitle)

      return {
        content,
        mimeType: 'text/markdown',
        metadata: {
          id: task.id,
          taskListId,
          status: task.status,
          title: task.title,
          notes: task.notes,
          due: task.due,
          completed: task.completed,
          updated: task.updated,
          parent: task.parent,
          position: task.position,
          links: task.links,
          webViewLink: task.webViewLink,
        },
      }
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('404')) {
          throw new Error(
            `Task '${taskId}' not found in task list '${taskListId}'`,
          )
        }
        if (error.message.includes('403')) {
          throw new Error(`Access denied to task '${taskId}'`)
        }
      }
      throw error
    }
  }

  /**
   * Read a task list's content.
   *
   * @param connector - The connector to read from
   * @param taskListId - The task list ID
   * @returns The task list content and metadata
   */
  private async readTaskList(
    connector: Connector,
    taskListId: string,
  ): Promise<ContentResult> {
    const url = `${TASKS_API_BASE}/users/@me/lists/${encodeURIComponent(taskListId)}`

    try {
      const taskList = await this.fetchJson<TaskList>(connector, url)

      const content = formatTaskListAsMarkdown(taskList)

      return {
        content,
        mimeType: 'text/markdown',
        metadata: {
          id: taskList.id,
          title: taskList.title,
          updated: taskList.updated,
          selfLink: taskList.selfLink,
        },
      }
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('404')) {
          throw new Error(`Task list '${taskListId}' not found`)
        }
        if (error.message.includes('403')) {
          throw new Error(`Access denied to task list '${taskListId}'`)
        }
      }
      throw error
    }
  }

  // ===========================================================================
  // Delta Sync
  // ===========================================================================

  /**
   * Get changes since a cursor for delta sync.
   *
   * Uses Google Tasks' updatedMin parameter for incremental sync.
   * - Initial sync: No cursor, fetches all tasks
   * - Delta sync: Uses updatedMin to get only changed tasks since last sync
   *
   * Note: Google Tasks doesn't have a true syncToken mechanism like Calendar.
   * We use the timestamp of the last sync as the cursor.
   *
   * @param connector - The connector to get changes from
   * @param cursor - ISO timestamp from last sync, or null for initial sync
   * @returns Added, modified, and deleted items with new cursor
   */
  async getChanges(
    connector: Connector,
    cursor: string | null,
  ): Promise<ChangesResult> {
    const added: ConnectorItem[] = []
    const modified: ConnectorItem[] = []
    const deleted: string[] = []

    // Get all task lists first
    const taskListsUrl = `${TASKS_API_BASE}/users/@me/lists?maxResults=100`
    const taskListsData = await this.fetchJson<TaskListsListResponse>(
      connector,
      taskListsUrl,
    )

    if (!taskListsData.items) {
      return {
        added: [],
        modified: [],
        deleted: [],
        newCursor: new Date().toISOString(),
        hasMore: false,
      }
    }

    // For each task list, get tasks
    for (const taskList of taskListsData.items) {
      const params = new URLSearchParams({
        maxResults: '100',
        showCompleted: 'true',
        showHidden: 'true', // Include hidden tasks to detect deletions
        showDeleted: 'true', // Include deleted tasks for delta sync
      })

      // If we have a cursor (timestamp), use it for delta sync
      if (cursor) {
        params.set('updatedMin', cursor)
      }

      const tasksUrl = `${TASKS_API_BASE}/lists/${encodeURIComponent(taskList.id)}/tasks?${params.toString()}`

      try {
        const tasksData = await this.fetchJson<TasksListResponse>(
          connector,
          tasksUrl,
        )

        if (tasksData.items) {
          for (const task of tasksData.items) {
            if (task.deleted || task.hidden) {
              // Task was deleted or hidden
              deleted.push(`${taskList.id}:${task.id}`)
            } else if (cursor) {
              // During delta sync, treat all non-deleted as modified
              modified.push(this.normalizeTaskItem(task, taskList.id))
            } else {
              // Initial sync - all tasks are "added"
              added.push(this.normalizeTaskItem(task, taskList.id))
            }
          }
        }

        // Also add task list itself on initial sync
        if (!cursor) {
          added.push(this.normalizeTaskListItem(taskList))
        }
      } catch (error) {
        // Skip task lists we can't access
        console.warn(`Failed to sync task list ${taskList.id}:`, error)
      }
    }

    // The new cursor is the current timestamp
    const newCursor = new Date().toISOString()

    return {
      added,
      modified,
      deleted,
      newCursor,
      hasMore: false, // We process all task lists in one go
    }
  }

  // ===========================================================================
  // Normalization
  // ===========================================================================

  /**
   * Normalize a Google Task to a ConnectorItem.
   *
   * @param rawItem - The raw task object
   * @param taskListId - The task list ID
   * @returns Normalized ConnectorItem
   */
  normalizeTaskItem(task: Task, taskListId: string): ConnectorItem {
    // Determine last modified date
    const lastModified = task.updated ? new Date(task.updated) : new Date()

    // Build the external ID (include task list ID)
    const externalId = `${taskListId}:${task.id}`

    // Format content as markdown
    const content = formatTaskAsMarkdown(task)

    // Build tags from task properties
    const tags: string[] = ['task']
    if (task.status === 'completed') tags.push('completed')
    if (task.status === 'needsAction') tags.push('todo')
    if (task.parent) tags.push('subtask')

    return {
      externalId,
      name: task.title || 'Untitled Task',
      type: 'file' as const,
      fileType: 'document' as const,
      mimeType: 'text/plain',
      path: `/tasks/${taskListId}`,
      parentExternalId: task.parent
        ? `${taskListId}:${task.parent}`
        : `list:${taskListId}`,
      lastModified,
      externalUrl: task.webViewLink,
      content,
      description: createTaskDescription(task),
      tags,
      metadata: {
        taskListId,
        taskId: task.id,
        status: task.status,
        title: task.title,
        notes: task.notes,
        due: task.due,
        dueTimestamp: task.due ? new Date(task.due).getTime() : undefined,
        completed: task.completed,
        completedTimestamp: task.completed
          ? new Date(task.completed).getTime()
          : undefined,
        updated: task.updated,
        parent: task.parent,
        position: task.position,
        isSubtask: !!task.parent,
        links: task.links,
      },
    }
  }

  /**
   * Normalize a Google Task List to a ConnectorItem (folder).
   *
   * @param taskList - The raw task list object
   * @returns Normalized ConnectorItem
   */
  normalizeTaskListItem(taskList: TaskList): ConnectorItem {
    const lastModified = taskList.updated
      ? new Date(taskList.updated)
      : new Date()

    return {
      externalId: `list:${taskList.id}`,
      name: taskList.title || 'Untitled List',
      type: 'folder' as const,
      path: '/tasks',
      lastModified,
      externalUrl: taskList.selfLink,
      content: formatTaskListAsMarkdown(taskList),
      description: `Task list with ${taskList.title || 'no title'}`,
      tags: ['tasklist'],
      metadata: {
        taskListId: taskList.id,
        title: taskList.title,
        updated: taskList.updated,
      },
    }
  }

  /**
   * Normalize a raw item from the provider's API to a ConnectorItem.
   *
   * This is the main normalization method required by the base class.
   * It handles both tasks and task lists based on the item's structure.
   *
   * @param rawItem - The raw item from the API (Task or TaskList)
   * @returns Normalized ConnectorItem
   */
  normalizeItem(rawItem: unknown): ConnectorItem {
    const item = rawItem as Task | TaskList

    // Determine if this is a task list or a task
    // Task lists have 'kind' === 'tasks#taskList'
    // Tasks have 'kind' === 'tasks#task'
    if ('kind' in item && item.kind === 'tasks#taskList') {
      return this.normalizeTaskListItem(item as TaskList)
    }

    // Assume it's a task - use default task list if not specified
    return this.normalizeTaskItem(item as Task, DEFAULT_TASKLIST_ID)
  }

  // ===========================================================================
  // Additional Methods
  // ===========================================================================

  /**
   * Get list of task lists for the authenticated user.
   *
   * @param connector - The connector to use
   * @returns Array of task list objects with ID and title
   */
  async getTaskLists(
    connector: Connector,
  ): Promise<Array<{ id: string; title: string }>> {
    const url = `${TASKS_API_BASE}/users/@me/lists?maxResults=100`
    const response = await this.fetchJson<TaskListsListResponse>(connector, url)

    return (response.items || []).map((list) => ({
      id: list.id,
      title: list.title,
    }))
  }
}

// =============================================================================
// Default Export
// =============================================================================

export default new GoogleTasksProvider()
