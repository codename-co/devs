import { PRODUCT } from '@/config/product'
import { errorToast, successToast } from '@/lib/toast'
import { db } from '@/lib/db'
import { type Agent } from '@/types'

type AgentJSON = Omit<Agent, 'createdAt' | 'updatedAt' | 'version' | 'tools'>

const agentCache = new Map<string, Agent>()
let agentsList: string[] | null = null

const defaultDevsTeam: Agent = {
  id: 'devs',
  name: PRODUCT.displayName,
  icon: 'Devs',
  desc: 'General orchestrator, delegates to other agents',
  role: 'Coordinate other agents to deliver complete solutions.',
  instructions: `You are the orchestrator of the ${PRODUCT.displayName} team. Your role is to coordinate other agents to deliver complete solutions. You can delegate tasks to specialized agents based on their expertise.`,
  tags: ['orchestrator'],
  createdAt: new Date(),
  i18n: {
    fr: {
      desc: "Orchestrateur d'équipe",
    },
  },
}

agentCache.set('devs', defaultDevsTeam)

async function loadAgent(agentId: string): Promise<Agent | null> {
  if (agentCache.has(agentId)) {
    return agentCache.get(agentId)!
  }

  try {
    const response = await fetch(`/agents/${agentId}.json`)
    if (!response.ok) {
      errorToast('Failed to load agent', `${agentId}: ${response.status}`)
      return null
    }

    const agentData: AgentJSON = await response.json()
    const agent: Agent = {
      ...agentData,
      createdAt: new Date(),
    }

    agentCache.set(agentId, agent)
    return agent
  } catch (error) {
    console.error(`Error loading agent ${agentId}:`, error)
    return null
  }
}

export async function getAvailableAgents(): Promise<string[]> {
  if (agentsList !== null) {
    return agentsList
  }

  try {
    const response = await fetch('/agents/manifest.json')
    if (!response.ok) {
      throw new Error(`Failed to fetch manifest: ${response.status}`)
    }

    const manifest = await response.json()
    agentsList = ['devs', ...(manifest.agents || [])]
    return agentsList
  } catch (error) {
    console.error('Error fetching agent manifest:', error)
    return ['devs']
  }
}

export async function loadAllAgents(): Promise<Agent[]> {
  // Load built-in agents from JSON files
  const agentIds = await getAvailableAgents()
  const builtInAgents = await Promise.all(
    agentIds.map((id) =>
      id === 'devs' ? Promise.resolve(defaultDevsTeam) : loadAgent(id),
    ),
  )
  const validBuiltInAgents = builtInAgents.filter(
    (agent): agent is Agent => agent !== null,
  )

  // Load custom agents from IndexedDB
  const customAgents = await loadCustomAgents()

  // Combine all agents
  return [...validBuiltInAgents, ...customAgents]
}

export async function getAgentById(id: string): Promise<Agent | null> {
  if (id === 'devs') {
    return defaultDevsTeam
  }

  // Check cache first
  if (agentCache.has(id)) {
    return agentCache.get(id)!
  }

  // Try loading from JSON files first
  const jsonAgent = await loadAgent(id)
  if (jsonAgent) {
    return jsonAgent
  }

  // Try loading from IndexedDB for custom agents
  try {
    if (!db.isInitialized()) {
      await db.init()
    }
    const customAgent = await db.get('agents', id)
    if (customAgent) {
      agentCache.set(id, customAgent)
      return customAgent
    }
  } catch (error) {
    console.error(`Error loading custom agent ${id}:`, error)
  }

  return null
}

export function getDefaultAgent(): Agent {
  return defaultDevsTeam
}

export type AgentCategory =
  | 'default'
  | 'scientist'
  | 'advisor'
  | 'artist'
  | 'philosopher'
  | 'musician'
  | 'writer'
  | 'other'

export interface AgentsByCategory {
  [category: string]: Agent[]
}

export async function getAgentsByCategory(lang: string = 'en'): Promise<{
  agentsByCategory: AgentsByCategory
  orderedCategories: string[]
}> {
  const agents = await loadAllAgents()

  // Group agents by their first tag
  const agentsByCategory = agents.reduce((acc, agent) => {
    if (agent.id === 'devs') {
      // Always put devs in its own "default" category
      acc['default'] = acc['default'] || []
      acc['default'].push(agent)
    } else {
      // Use the first tag as category
      const firstTag = agent.tags?.[0]
      const validCategories = [
        'scientist',
        'advisor',
        'artist',
        'philosopher',
        'musician',
        'writer',
      ]
      const category =
        firstTag && validCategories.includes(firstTag) ? firstTag : 'other'
      acc[category] = acc[category] || []
      acc[category].push(agent)
    }
    return acc
  }, {} as AgentsByCategory)

  // Sort agents within each category by name
  Object.values(agentsByCategory).forEach((categoryAgents) => {
    categoryAgents.sort((a, b) => {
      return (a.i18n?.[lang]?.name || a.name).localeCompare(
        b.i18n?.[lang]?.name || b.name,
      )
    })
  })

  // Order categories (default first, then alphabetically, other last)
  const orderedCategories = Object.keys(agentsByCategory).sort((a, b) => {
    if (a === 'default') return -1
    if (b === 'default') return 1
    if (a === 'other') return 1
    if (b === 'other') return -1
    return a.localeCompare(b)
  })

  return { agentsByCategory, orderedCategories }
}

export async function createAgent(agentData: {
  name: string
  role: string
  instructions?: string
  temperature?: number
  tags?: string[]
}): Promise<Agent> {
  try {
    // Ensure database is initialized
    if (!db.isInitialized()) {
      await db.init()
    }

    // Create the agent object with required fields
    const agent: Agent = {
      id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: agentData.name,
      role: agentData.role,
      instructions: agentData.instructions || '',
      temperature: agentData.temperature,
      tags: agentData.tags,
      tools: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    // Save to IndexedDB
    await db.add('agents', agent)

    // Add to cache
    agentCache.set(agent.id, agent)

    // Invalidate the agents list cache so it will be refreshed next time
    agentsList = null

    successToast('Agent created successfully!')

    return agent
  } catch (error) {
    console.error('Error creating agent:', error)
    errorToast(
      'Failed to create agent',
      error instanceof Error ? error.message : 'Unknown error',
    )
    throw error
  }
}

export async function updateAgent(
  agentId: string,
  updates: Partial<Agent>,
): Promise<Agent> {
  try {
    // Ensure database is initialized
    if (!db.isInitialized()) {
      await db.init()
    }

    // Get current agent
    const currentAgent = await getAgentById(agentId)
    if (!currentAgent) {
      throw new Error(`Agent with id ${agentId} not found`)
    }

    // Create updated agent
    const updatedAgent: Agent = {
      ...currentAgent,
      ...updates,
      id: agentId, // Ensure ID doesn't change
      updatedAt: new Date(),
    }

    // Save to IndexedDB
    await db.update('agents', updatedAgent)

    // Update cache
    agentCache.set(agentId, updatedAgent)

    successToast('Agent updated successfully!')

    return updatedAgent
  } catch (error) {
    console.error('Error updating agent:', error)
    errorToast(
      'Failed to update agent',
      error instanceof Error ? error.message : 'Unknown error',
    )
    throw error
  }
}

export async function deleteAgent(agentId: string): Promise<void> {
  try {
    // Prevent deletion of default agent
    if (agentId === 'devs') {
      throw new Error('Cannot delete the default agent')
    }

    // Ensure database is initialized
    if (!db.isInitialized()) {
      await db.init()
    }

    // Delete from IndexedDB
    await db.delete('agents', agentId)

    // Remove from cache
    agentCache.delete(agentId)

    // Invalidate the agents list cache
    agentsList = null

    successToast('Agent deleted successfully!')
  } catch (error) {
    console.error('Error deleting agent:', error)
    errorToast(
      'Failed to delete agent',
      error instanceof Error ? error.message : 'Unknown error',
    )
    throw error
  }
}

export async function loadCustomAgents(): Promise<Agent[]> {
  try {
    // Ensure database is initialized
    if (!db.isInitialized()) {
      await db.init()
    }

    // Get all agents from IndexedDB
    const customAgents = await db.getAll('agents')

    // Add to cache
    customAgents.forEach((agent) => {
      agentCache.set(agent.id, agent)
    })

    return customAgents
  } catch (error) {
    console.error('Error loading custom agents:', error)
    return []
  }
}

export async function loadBuiltInAgents(): Promise<Agent[]> {
  // Load built-in agents from JSON files
  const agentIds = await getAvailableAgents()
  const builtInAgents = await Promise.all(
    agentIds.map((id) =>
      id === 'devs' ? Promise.resolve(defaultDevsTeam) : loadAgent(id),
    ),
  )
  return builtInAgents.filter((agent): agent is Agent => agent !== null)
}

export async function getAgentsSeparated(): Promise<{
  customAgents: Agent[]
  builtInAgents: Agent[]
}> {
  const [customAgents, builtInAgents] = await Promise.all([
    loadCustomAgents(),
    loadBuiltInAgents(),
  ])

  return {
    customAgents,
    builtInAgents,
  }
}
