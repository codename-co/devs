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
  slug: string
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
 * Context for serialization, providing additional metadata
 */
export interface SerializeContext {
  /** Agent slug lookup function - returns slug for an agentId */
  getAgentSlug?: (agentId: string) => string | undefined
}

/**
 * Frontmatter for conversation files
 */
export interface ConversationFrontmatter {
  id: string
  agentId: string
  agentSlug?: string
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
  /** Reference to the binary content file (relative to same directory) */
  binaryFile?: string
}

/**
 * Represents a serialized file set for knowledge items
 * Knowledge items output both a metadata file and optionally a binary content file
 */
export interface SerializedKnowledgeFileSet {
  /** Metadata filename (e.g., ".readme-abc123.metadata.knowledge.md") - prefixed with dot for hidden files */
  metadataFilename: string
  /** Metadata file content with YAML frontmatter */
  metadataContent: string
  /** Subdirectory path (e.g., "knowledge/documents") */
  directory: string
  /** Binary filename (e.g., "readme-abc123.pdf") - present only for binary files */
  binaryFilename?: string
  /** Binary content as base64 or raw string - present only for binary files */
  binaryContent?: string
  /** Whether binary content is base64 encoded */
  isBinaryBase64?: boolean
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
 * Frontmatter for studio entry files
 */
export interface StudioEntryFrontmatter {
  id: string
  prompt: string
  isFavorite?: boolean
  tags?: string[]
  createdAt: string
  settings: Record<string, unknown>
  images: Record<string, unknown>[]
}

/**
 * Represents a serialized file set for studio entries
 * Studio entries output both a metadata file and optionally image files
 */
export interface SerializedStudioFileSet {
  /** Metadata filename (e.g., "mountain-sunset-abc123.studio.md") */
  metadataFilename: string
  /** Metadata file content with YAML frontmatter */
  metadataContent: string
  /** Subdirectory path (e.g., "studio") */
  directory: string
  /** Image files to write */
  imageFiles: {
    filename: string
    content: string
    isBase64: boolean
  }[]
}

/**
 * Serializer interface for all entity types
 */
export interface Serializer<T> {
  /** Serialize entity to file content, with optional context */
  serialize(entity: T, context?: SerializeContext): SerializedFile
  /** Deserialize file content to entity, optionally using file metadata and binary content */
  deserialize(
    content: string,
    filename: string,
    fileMetadata?: FileMetadata,
    binaryContent?: string,
  ): T | null
  /** Get the file extension for this entity type */
  getExtension(): string
  /** Get the directory name for this entity type */
  getDirectory(): string
  /** Generate filename for an entity */
  getFilename(entity: T): string
}
