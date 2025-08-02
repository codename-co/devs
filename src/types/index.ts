import { IconName } from '@/lib/types'

export interface Agent {
  id: string
  name: string
  icon?: IconName
  role: string
  instructions: string
  temperature?: number
  tags?: string[]
  tools?: Tool[]
  createdAt: Date
  updatedAt?: Date
  version?: string
}

export interface Workflow {
  id: string
  strategy: string
  status: 'pending' | 'running' | 'completed'
  checkpoints: Checkpoint[]
}

export interface Conversation {
  id: string
  agentId: string
  workflowId: string
  timestamp: Date
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
  | 'litellm'
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

export interface Artifact {
  id: string
  description: string
  content: string // Base64 encoded or file reference
  dueDate: Date
  status: 'pending' | 'completed'
}
