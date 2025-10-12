import { LanguageCode } from '@/i18n'
import { IconName } from '@/lib/types'

export interface Agent {
  id: string
  name: string
  icon?: IconName
  desc?: string
  role: string
  instructions: string
  temperature?: number
  tags?: string[]
  tools?: Tool[]
  knowledgeItemIds?: string[] // Associated knowledge items for context
  createdAt: Date
  updatedAt?: Date
  version?: string
  examples?: Example[]
  i18n?: {
    [K in LanguageCode]?: {
      name?: string
      desc?: string
      role?: string
      examples?: Example[]
    }
  }
}

export interface Example {
  id: string
  title?: string
  prompt: string
}

export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  agentId?: string // Which agent sent this message (for assistant messages)
  content: string
  timestamp: Date
}

export interface Conversation {
  id: string
  agentId: string // Primary agent ID (for backward compatibility)
  participatingAgents: string[] // All agents that have participated in this conversation
  workflowId: string
  timestamp: Date
  messages: Message[]
  title?: string // Auto-generated title from LLM summarization
}

export interface KnowledgeItem {
  id: string
  name: string
  type: 'file' | 'folder'
  fileType?: 'document' | 'image' | 'text' // Type of file based on content/extension
  content?: string // File content or base64 for binary files
  contentHash?: string // SHA-256 hash for deduplication
  mimeType?: string
  size?: number
  path: string // Full path for organization
  parentId?: string // For nested folders
  lastModified: Date
  createdAt: Date
  tags?: string[]
  description?: string
  // Sync-related fields
  syncSource?: 'manual' | 'filesystem_api' // How this item was added
  fileSystemHandle?: string // Serialized handle for File System API items
  watchId?: string // ID for file watcher
  lastSyncCheck?: Date // When we last checked for updates
}

export interface PersistedFolderWatcher {
  id: string
  basePath: string
  lastSync: Date
  isActive: boolean
  createdAt: Date
  // Note: FileSystemDirectoryHandle cannot be serialized, so we'll need to re-request permission
}

export interface Knowledge {
  id: string
  domain: string
  agentId: string
  confidence: number
}

export interface Credential {
  id: string
  provider: LLMProvider
  encryptedApiKey: string
  model?: string
  baseUrl?: string
  timestamp: Date
  order?: number
}

export type LLMProvider =
  | 'local'
  | 'ollama'
  | 'openai'
  | 'anthropic'
  | 'google'
  | 'vertex-ai'
  | 'mistral'
  | 'openrouter'
  | 'deepseek'
  | 'grok'
  | 'huggingface'
  | 'custom'

export interface LLMConfig {
  provider: LLMProvider
  model: string
  apiKey?: string
  baseUrl?: string
  temperature?: number
  maxTokens?: number
}

export interface Tool {
  id: string
  name: string
  description: string
  type: 'file' | 'web' | 'api' | 'shell' | 'custom'
  config: Record<string, any>
}

export interface Checkpoint {
  id: string
  name: string
  status: 'pending' | 'completed'
  timestamp: Date
}

export interface TaskStep {
  id: string
  name: string
  description: string
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  startedAt?: Date
  completedAt?: Date
  duration?: number // in milliseconds
  agentId?: string
  order: number
}

export interface TaskAttachment {
  name: string
  type: string
  size: number
  data: string // base64 encoded file data
}

export interface Task {
  id: string
  workflowId: string
  title: string
  description: string
  attachments?: TaskAttachment[] // File attachments from user
  complexity: 'simple' | 'complex'
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  assignedAgentId?: string
  assignedAt?: Date // When the agent was assigned
  assignedRoleId?: string // Methodology role ID for this assignment
  parentTaskId?: string
  dependencies: string[]
  requirements: Requirement[]
  artifacts: string[] // artifact IDs
  steps: TaskStep[]
  estimatedPasses: number
  actualPasses: number
  createdAt: Date
  updatedAt: Date
  completedAt?: Date // When the task was completed
  dueDate?: Date
  // Methodology-specific fields
  methodologyId?: string // Which methodology is guiding this task
  phaseId?: string // Which phase of the methodology this task belongs to
  taskTemplateId?: string // Reference to the methodology's task template
}

export interface Requirement {
  id: string
  type: 'functional' | 'non_functional' | 'constraint'
  description: string
  priority: 'must' | 'should' | 'could' | 'wont'
  source: 'explicit' | 'implicit' | 'inferred'
  status: 'pending' | 'in_progress' | 'satisfied' | 'failed'
  validationCriteria: string[]
  taskId: string
  detectedAt?: Date
  validatedAt?: Date
  satisfiedAt?: Date
  validationResult?: string
}

export interface SharedContext {
  id: string
  taskId: string
  agentId: string
  contextType: 'decision' | 'finding' | 'resource' | 'constraint'
  title: string
  content: string
  relevantAgents: string[]
  expiryDate?: Date
  createdAt: Date
}

export interface TaskPlan {
  id: string
  workflowId: string
  strategy:
    | 'single_agent'
    | 'sequential_agents'
    | 'parallel_agents'
    | 'hierarchical'
  estimatedDuration: number
  requiredSkills: string[]
  agentAssignments: AgentAssignment[]
}

export interface AgentAssignment {
  agentId: string
  role: 'leader' | 'contributor' | 'reviewer'
  tasks: string[]
  contextAccess: string[]
}

export interface AgentSpec {
  name: string
  role: string
  requiredSkills: string[]
  estimatedExperience: string
  specialization: string
}

export interface ExecutionResult {
  success: boolean
  artifacts: Artifact[]
  context: SharedContext[]
  errors?: string[]
  nextTasks?: Task[]
}

export interface Artifact {
  id: string
  taskId: string
  agentId: string
  title: string
  description: string
  type: 'document' | 'code' | 'design' | 'analysis' | 'plan' | 'report'
  format: 'markdown' | 'json' | 'code' | 'html' | 'binary'
  content: string
  version: number
  status: 'draft' | 'review' | 'approved' | 'rejected' | 'final'
  dependencies: string[]
  validates: string[]
  createdAt: Date
  updatedAt: Date
  reviewedBy?: string[]
}

export interface LangfuseConfig {
  id: string
  host: string
  publicKey: string
  encryptedSecretKey: string
  enabled: boolean
  timestamp: Date
}
