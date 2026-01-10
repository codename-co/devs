/**
 * Folder Sync Serializer Types
 *
 * Type definitions for Markdown + YAML frontmatter serialization
 */

export interface SerializedFile {
  /** Filename (e.g., "einstein.agent.md") */
  filename: string
  /** Full file content with YAML frontmatter */
  content: string
  /** Subdirectory path (e.g., "agents", "conversations") */
  directory: string
}

export interface ParsedFile<T> {
  /** Parsed frontmatter as object */
  frontmatter: T
  /** Markdown body content */
  body: string
}

/**
 * Frontmatter for agent files
 */
export interface AgentFrontmatter {
  id: string
  name: string
  icon?: string
  desc?: string
  role: string
  temperature?: number
  tags?: string[]
  knowledgeItemIds?: string[]
  createdAt: string
  updatedAt?: string
  version?: string
  deletedAt?: string
  i18n?: Record<string, unknown>
}

/**
 * Frontmatter for conversation files
 */
export interface ConversationFrontmatter {
  id: string
  agentId: string
  participatingAgents: string[]
  workflowId: string
  title?: string
  isPinned?: boolean
  summary?: string
  createdAt: string
  updatedAt: string
}

/**
 * Frontmatter for memory files
 */
export interface MemoryFrontmatter {
  id: string
  agentId: string
  category: string
  title: string
  confidence: string
  source: string
  sourceConversationId?: string
  keywords: string[]
  tags: string[]
  validationStatus: string
  reviewedAt?: string
  reviewedBy?: string
  reviewNotes?: string
  usageCount: number
  lastUsedAt?: string
  expiresAt?: string
  learnedAt: string
  version: number
  createdAt: string
  updatedAt: string
}

/**
 * Frontmatter for knowledge item files
 */
export interface KnowledgeItemFrontmatter {
  id: string
  name: string
  type: 'file' | 'folder'
  fileType?: string
  contentHash?: string
  mimeType?: string
  size?: number
  path: string
  parentId?: string
  lastModified: string
  createdAt: string
  tags?: string[]
  description?: string
  syncSource?: string
  connectorId?: string
  externalId?: string
  externalUrl?: string
  syncedAt?: string
  hasTranscript?: boolean
  processingStatus?: string
  processedAt?: string
}

/**
 * Frontmatter for task files
 */
export interface TaskFrontmatter {
  id: string
  workflowId: string
  title: string
  complexity: 'simple' | 'complex'
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  assignedAgentId?: string
  assignedAt?: string
  assignedRoleId?: string
  parentTaskId?: string
  dependencies: string[]
  artifacts: string[]
  estimatedPasses: number
  actualPasses: number
  createdAt: string
  updatedAt: string
  completedAt?: string
  dueDate?: string
  methodologyId?: string
  phaseId?: string
  taskTemplateId?: string
}

/**
 * File metadata from the file system
 */
export interface FileMetadata {
  /** File's last modified time from the OS */
  lastModified: Date
  /** File size in bytes */
  size: number
}

/**
 * Serializer interface for all entity types
 */
export interface Serializer<T> {
  /** Serialize entity to file content */
  serialize(entity: T): SerializedFile
  /** Deserialize file content to entity, optionally using file metadata */
  deserialize(
    content: string,
    filename: string,
    fileMetadata?: FileMetadata,
  ): T | null
  /** Get the file extension for this entity type */
  getExtension(): string
  /** Get the directory name for this entity type */
  getDirectory(): string
  /** Generate filename for an entity */
  getFilename(entity: T): string
}
