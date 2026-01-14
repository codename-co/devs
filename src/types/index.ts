import { LanguageCode } from '@/i18n'
import { IconName } from '@/lib/types'

export interface Agent {
  id: string
  slug: string // URL-friendly identifier, auto-generated from name, unique across all agents
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
  deletedAt?: Date // When the agent was soft deleted (presence indicates deleted)
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

/**
 * Attachment metadata for messages
 * Used for persisting file references in conversation history
 */
export interface MessageAttachment {
  /** Type classification for LLM processing */
  type: 'image' | 'document' | 'text'
  /** Original filename */
  name: string
  /** Base64-encoded file content */
  data: string
  /** MIME type of the file */
  mimeType: string
  /** File size in bytes (for display purposes) */
  size?: number
}

export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  agentId?: string // Which agent sent this message (for assistant messages)
  content: string
  timestamp: Date
  isPinned?: boolean // Whether this message is pinned
  pinnedDescription?: string // Short AI-generated description when pinned
  pinnedAt?: Date // When the message was pinned
  attachments?: MessageAttachment[] // File attachments for this message
  traceIds?: string[] // Trace IDs for operations performed to generate this message
}

export interface Conversation {
  id: string
  agentId: string // Primary agent ID (for backward compatibility)
  agentSlug?: string // Primary agent slug (for URL generation)
  participatingAgents: string[] // All agents that have participated in this conversation
  workflowId: string
  timestamp: Date // Creation timestamp (createdAt)
  updatedAt: Date // Last modification timestamp, used for sorting
  messages: Message[]
  title?: string // Auto-generated title from LLM summarization
  isPinned?: boolean // Whether this conversation is starred/pinned
  summary?: string // AI-generated conversation summary
  pinnedMessageIds?: string[] // Array of pinned message IDs for quick lookup
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
  syncSource?: 'manual' | 'filesystem_api' | 'connector' // How this item was added
  fileSystemHandle?: string // Serialized handle for File System API items
  watchId?: string // ID for file watcher
  lastSyncCheck?: Date // When we last checked for updates
  // Connector-related fields (when syncSource is 'connector')
  connectorId?: string // ID of the connector that synced this item
  externalId?: string // ID in the external system (e.g., Google Drive file ID)
  externalUrl?: string // URL to view the item in the external system
  syncedAt?: Date // When this item was last synced from the connector
  // Document processing fields
  transcript?: string // Extracted text content from document processing
  processingStatus?: 'pending' | 'processing' | 'completed' | 'failed' // Current processing state
  processingError?: string // Error message if processing failed
  processedAt?: Date // When the document was last processed
}

export interface PersistedFolderWatcher {
  id: string
  basePath: string
  lastSync: Date
  isActive: boolean
  createdAt: Date
  // Handle is stored separately in fileHandles store (IndexedDB supports FileSystemHandle)
  hasStoredHandle?: boolean
}

// FileSystemDirectoryHandle can be stored directly in IndexedDB
export interface FileHandleEntry {
  id: string // Same as the watcher ID
  handle: FileSystemDirectoryHandle
  createdAt: Date
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
  /** @deprecated - model selection is now stored separately in selectedModels */
  model?: string
  baseUrl?: string
  timestamp: Date
  order?: number
}

/**
 * Stores the selected model for each provider
 * Key is the provider name, value is the selected model ID
 */
export type SelectedModels = Partial<Record<LLMProvider, string>>

/**
 * Capability flags for LLM models
 * Used to select appropriate models for different tasks
 */
export interface ModelCapabilities {
  /** Budget-friendly model suitable for high-volume, simple tasks */
  lowCost?: boolean
  /** Premium model with higher pricing (flagship/pro tiers) */
  highCost?: boolean
  /** Model with extended reasoning/thinking capabilities (e.g., o1, DeepSeek R1) */
  thinking?: boolean
  /** Optimized for low latency responses */
  fast?: boolean
  /** Can process and understand images */
  vision?: boolean
  /** Supports function/tool calling */
  tools?: boolean
}

/**
 * LLM Model definition with capabilities
 */
export interface LLMModel {
  /** Model identifier (e.g., "gpt-4o", "claude-sonnet-4-5-20250929") */
  id: string
  /** Optional display name (defaults to id if not provided) */
  name?: string
  /** Model capability flags */
  capabilities?: ModelCapabilities
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
  | 'openai-compatible'
  | 'custom'
  // Image generation providers
  | 'stability'
  | 'replicate'
  | 'together'
  | 'fal'

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

// ============================================================================
// Agent Memory System - Learning from Conversations
// ============================================================================

/**
 * Confidence level for a memory entry
 * - high: Human validated or derived from explicit user statements
 * - medium: Inferred with high certainty from conversation patterns
 * - low: Tentatively inferred, needs validation
 */
export type MemoryConfidence = 'high' | 'medium' | 'low'

/**
 * Validation status for human review workflow
 * - pending: Awaiting human review
 * - approved: Human validated as correct
 * - rejected: Human marked as incorrect/irrelevant
 * - auto_approved: Auto-approved based on high confidence + time threshold
 */
export type MemoryValidationStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'auto_approved'

/**
 * Category of memory for organization and retrieval
 */
export type MemoryCategory =
  | 'fact' // Factual information about user/domain
  | 'preference' // User preferences and choices
  | 'behavior' // Learned behavioral patterns
  | 'domain_knowledge' // Domain-specific knowledge
  | 'relationship' // Relationships between entities
  | 'procedure' // How to do specific tasks
  | 'correction' // Corrections to previous assumptions

/**
 * A single memory entry learned from conversations
 */
export interface AgentMemoryEntry {
  id: string
  agentId: string
  category: MemoryCategory
  title: string // Short descriptive title
  content: string // The actual learned information
  confidence: MemoryConfidence
  validationStatus: MemoryValidationStatus

  // Provenance tracking
  sourceConversationIds: string[] // Conversations this was learned from
  sourceMessageIds: string[] // Specific messages that contributed
  learnedAt: Date

  // Human review
  reviewedAt?: Date
  reviewedBy?: string // 'human' or agent ID
  reviewNotes?: string

  // Versioning for progressive updates
  version: number
  previousVersionId?: string
  supersededBy?: string // If this memory was replaced

  // Usage tracking
  lastUsedAt?: Date
  usageCount: number

  // Expiration (optional, for time-sensitive info)
  expiresAt?: Date

  // Tags for retrieval
  tags: string[]
  keywords: string[] // Auto-extracted for semantic matching

  // Global memory (shared across all agents)
  isGlobal?: boolean // If true, this memory applies to all agents

  createdAt: Date
  updatedAt: Date
}

/**
 * A learning event captured from a conversation
 * These are processed into AgentMemoryEntry after synthesis
 */
export interface MemoryLearningEvent {
  id: string
  agentId: string
  conversationId: string
  messageId?: string

  // What was learned
  rawExtraction: string // Direct extraction from conversation
  suggestedCategory: MemoryCategory
  suggestedConfidence: MemoryConfidence

  // Processing status
  processed: boolean
  resultingMemoryId?: string // The AgentMemoryEntry created
  discardedReason?: string // If not turned into memory

  extractedAt: Date
  processedAt?: Date
}

/**
 * Agent memory document - the persistent "working document" for an agent
 * Contains aggregated memories and synthesis
 */
export interface AgentMemoryDocument {
  id: string
  agentId: string

  // Summary synthesis (regenerated periodically)
  synthesis: string // Markdown summary of all memories
  lastSynthesisAt: Date

  // Statistics
  totalMemories: number
  memoriesByCategory: Record<MemoryCategory, number>
  memoriesByConfidence: Record<MemoryConfidence, number>
  pendingReviewCount: number

  // Auto-learning settings per agent
  autoLearnEnabled: boolean
  autoApproveHighConfidence: boolean // Auto-approve high confidence after delay
  autoApproveDelayHours: number // Hours before auto-approval (default: 24)

  createdAt: Date
  updatedAt: Date
}

/**
 * Settings for memory learning behavior
 */
export interface AgentMemorySettings {
  // Global toggle
  enabled: boolean

  // Learning triggers
  learnAfterConversation: boolean // Learn when conversation ends
  learnOnExplicitRequest: boolean // Learn when user says "remember this"

  // Review settings
  requireHumanReview: boolean // Require human approval for all memories
  autoApproveThreshold: MemoryConfidence // Auto-approve at this confidence level

  // Synthesis settings
  dailySynthesis: boolean // Generate daily synthesis
  synthesisTime: string // Time for daily synthesis (e.g., "23:00")

  // Retention settings
  maxMemoriesPerAgent: number // Limit memories per agent
  retentionDays: number // Days to keep unused memories
}

// ============================================================================
// Pinned Messages System - Important conversation moments
// ============================================================================

/**
 * A pinned message from a conversation
 * Represents an important moment that should be available to the agent in future conversations
 */
export interface PinnedMessage {
  id: string
  conversationId: string
  messageId: string // Reference to the original message
  agentId: string // The agent who generated this message
  content: string // The message content
  description: string // Short AI-generated description (5-10 words)
  keywords: string[] // Keywords for relevance matching
  pinnedAt: Date
  createdAt: Date
  updatedAt: Date
}
