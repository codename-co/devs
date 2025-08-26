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
  createdAt: Date
  updatedAt?: Date
  version?: string
  i18n?: {
    [lang: string]: {
      name?: string
      desc?: string
    }
  }
}

export interface Workflow {
  id: string
  strategy: string
  status: 'pending' | 'running' | 'completed'
  checkpoints: Checkpoint[]
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

export interface Task {
  id: string
  workflowId: string
  title: string
  description: string
  complexity: 'simple' | 'complex'
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  assignedAgentId?: string
  assignedAt?: Date // When the agent was assigned
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
  format: 'markdown' | 'json' | 'code' | 'binary'
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
