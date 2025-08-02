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

// interface Workflow {
//   id: string
//   strategy: string
//   status: 'pending' | 'running' | 'completed'
//   checkpoints: Checkpoint[]
// }

// interface Conversation {
//   id: string
//   agentId: string
//   workflowId: string
//   timestamp: Date
// }

// interface Knowledge {
//   id: string
//   domain: string
//   agentId: string
//   confidence: number
// }

// interface Credential {
//   provider: string
//   encryptedToken: string
//   timestamp: Date
// }

interface Tool {
  id: string
  name: string
  description: string
  type: 'file' | 'web' | 'api' | 'shell' | 'custom'
  config: Record<string, any>
}

// interface Checkpoint {
//   id: string
//   name: string
//   status: 'pending' | 'completed'
//   timestamp: Date
// }

// interface Artifact {
//   id: string
//   description: string
//   content: string // Base64 encoded or file reference
//   dueDate: Date
//   status: 'pending' | 'completed'
// }
