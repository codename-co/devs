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

export interface Tool {
  id: string
  name: string
  description: string
  type: 'file' | 'web' | 'api' | 'shell' | 'custom'
  config: Record<string, any>
}

export interface Workflow {
  id: string
  strategy: string
  status: 'pending' | 'running' | 'completed'
  checkpoints: Checkpoint[]
}

export interface Checkpoint {
  id: string
  name: string
  status: 'pending' | 'completed'
  timestamp: Date
}

export type Lang = 'en' | 'fr' | 'es' | 'de'
