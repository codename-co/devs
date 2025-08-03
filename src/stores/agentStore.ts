import { PRODUCT } from '@/config/product'
import { errorToast } from '@/lib/toast'
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
  const agentIds = await getAvailableAgents()
  const agents = await Promise.all(
    agentIds.map((id) =>
      id === 'devs' ? Promise.resolve(defaultDevsTeam) : loadAgent(id),
    ),
  )
  return agents.filter((agent): agent is Agent => agent !== null)
}

export async function getAgentById(id: string): Promise<Agent | null> {
  if (id === 'devs') {
    return defaultDevsTeam
  }
  return loadAgent(id)
}

export function getDefaultAgent(): Agent {
  return defaultDevsTeam
}

export type AgentCategory = 'default' | 'scientist' | 'advisor' | 'artist' | 'philosopher' | 'musician' | 'writer' | 'other'

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
      const validCategories = ['scientist', 'advisor', 'artist', 'philosopher', 'musician', 'writer']
      const category = firstTag && validCategories.includes(firstTag) ? firstTag : 'other'
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
