import { PRODUCT } from '@/config/product'
import { errorToast, successToast } from '@/lib/toast'
import { db } from '@/lib/db'
import { deleteFromYjs, syncToYjs } from '@/lib/sync'
import { type Agent } from '@/types'
import { Lang } from '@/i18n'
import { userSettings } from '@/stores/userStore'

type AgentJSON = Omit<Agent, 'createdAt' | 'updatedAt' | 'version' | 'tools'>

const agentCache = new Map<string, Agent>()
let agentsList: string[] | null = null

const defaultDevsTeam: Agent = {
  id: 'devs',
  name: PRODUCT.displayName,
  icon: 'Devs',
  desc: 'Autonomous multi-agent orchestrator for complex task delegation',
  role: 'Autonomous Task Orchestrator and Multi-Agent Team Coordinator',
  instructions: `You are the ${PRODUCT.displayName} autonomous orchestration system. Your primary mission is to analyze user requests and coordinate teams of specialized agents to deliver complete, high-quality solutions without requiring human intervention.

## Core Capabilities:

### 🎯 Autonomous Task Analysis
- Automatically analyze user prompts to extract explicit and implicit requirements
- Assess task complexity and determine optimal execution strategy
- Break down complex tasks into manageable subtasks with clear dependencies
- Estimate effort, duration, and required expertise levels

### 🤖 Intelligent Agent Management
- Automatically recruit new agents using the agent-recruiter when needed skills aren't available
- Build optimal teams based on required expertise and task complexity
- Coordinate agent execution in parallel or sequential workflows
- Manage agent context sharing and knowledge transfer

### 📋 Requirement-Driven Execution
- Ensure all user requirements (functional, non-functional, constraints) are identified and tracked
- Create comprehensive artifacts (documents, code, designs, analyses, plans, reports)
- Maintain full traceability between requirements and deliverables
- Use the validator-agent to verify completion before marking tasks done

### 🔄 Self-Correcting Workflows
- Automatically validate all deliverables against requirements
- Create iterative refinement cycles when validation fails
- Handle complex multi-pass workflows autonomously
- Adapt strategy based on intermediate results and validation feedback

### 📊 Context-Aware Coordination
- Share relevant context and findings between agents
- Prevent duplicate work through intelligent context management
- Build upon previous agent outputs for efficient collaboration
- Maintain workflow state and execution history

## Execution Strategy:

**For Simple Tasks (1-2 agents, 1-2 passes):**
1. Identify appropriate existing agent or recruit new one
2. Execute task with enhanced context and requirements
3. Create comprehensive artifacts
4. Validate against requirements
5. Refine if validation fails

**For Complex Tasks (multiple agents, multiple passes):**
1. Break down into coordinated subtasks
2. Build specialized team of agents (existing + recruited)
3. Execute subtasks based on dependencies and agent expertise
4. Coordinate context sharing between agents
5. Validate each deliverable and overall completion
6. Iterate until all requirements fully satisfied

## Output Requirements:
- Always create markdown-format artifacts by default (unless specific format required)
- Ensure complete requirement traceability
- Provide comprehensive documentation of decisions and approach
- Generate actionable deliverables that fully address user needs

## Autonomous Operation:
- Never ask for user clarification during execution
- Make intelligent assumptions and document them
- Handle edge cases and failures gracefully
- Complete all work before presenting final results

When a user provides a request, immediately trigger the autonomous orchestration process. Analyze the task, build the team, coordinate execution, validate results, and deliver comprehensive artifacts that fully satisfy all requirements.

Your success is measured by delivering complete, high-quality solutions that meet all user requirements without requiring any intermediate human intervention.`,
  tags: ['orchestrator', 'autonomous', 'multi-agent', 'coordination'],
  createdAt: new Date(),
  i18n: {
    ar: {
      desc: 'منسق متعدد الوكلاء المستقل لتفويض المهام المعقدة',
      role: 'منسق مهام مستقل ومنسق فريق متعدد الوكلاء',
    },
    de: {
      desc: 'Autonomer Multi-Agenten-Orchestrator für die Delegation komplexer Aufgaben',
      role: 'Autonomer Aufgabenorchestrator und Koordinator für Multi-Agenten-Teams',
    },
    es: {
      desc: 'Orquestador multiagente autónomo para la delegación de tareas complejas',
      role: 'Orquestador de tareas autónomo y coordinador de equipos multiagente',
    },
    fr: {
      desc: "Orchestrateur d'agents, délégateur de tâches",
      role: "Orchestrateur de tâches autonome et coordinateur d'équipes multi-agents",
    },
    ko: {
      desc: '복잡한 작업 위임을 위한 자율 다중 에이전트 오케스트레이터',
      role: '자율 작업 오케스트레이터 및 다중 에이전트 팀 코디네이터',
    },
  },
}

agentCache.set('devs', defaultDevsTeam)

async function loadAgent(agentId: string): Promise<Agent | null> {
  if (!agentId) return null

  if (agentCache.has(agentId)) {
    return agentCache.get(agentId)!
  }

  if (agentId.startsWith('custom-')) {
    // Custom agents are not stored as JSON files
    return null
  }

  try {
    const response = await fetch(`/agents/${agentId}.agent.json`)
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

export async function loadAllAgents(options?: {
  includeDefaultAgents?: boolean
}): Promise<Agent[]> {
  // Check user setting for hiding default agents
  const hideDefaultAgents = userSettings.getState().hideDefaultAgents
  const includeDefaults = options?.includeDefaultAgents ?? !hideDefaultAgents

  // Load built-in agents from JSON files (if not hidden)
  let validBuiltInAgents: Agent[] = []
  if (includeDefaults) {
    const agentIds = await getAvailableAgents()
    const builtInAgents = await Promise.all(
      agentIds.map((id) =>
        id === 'devs' ? Promise.resolve(defaultDevsTeam) : loadAgent(id),
      ),
    )
    validBuiltInAgents = builtInAgents.filter(
      (agent): agent is Agent => agent !== null,
    )
  }

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
  | 'developer'
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
        'developer',
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
      const langKey = lang as Lang
      return (a.i18n?.[langKey]?.name ?? a.name).localeCompare(
        b.i18n?.[langKey]?.name ?? b.name,
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
  knowledgeItemIds?: string[]
}): Promise<Agent> {
  try {
    // Ensure database is initialized
    if (!db.isInitialized()) {
      await db.init()
    }

    // Create the agent object with required fields
    const agent: Agent = {
      id: `custom-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      name: agentData.name,
      role: agentData.role,
      instructions: agentData.instructions || '',
      temperature: agentData.temperature,
      tags: agentData.tags,
      knowledgeItemIds: agentData.knowledgeItemIds,
      tools: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    // Save to IndexedDB
    await db.add('agents', agent)

    // Sync to Yjs for P2P sync
    syncToYjs('agents', agent)

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

    // Sync to Yjs for P2P sync
    syncToYjs('agents', updatedAgent)

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

    // Sync deletion to Yjs
    deleteFromYjs('agents', agentId)

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

export async function softDeleteAgent(agentId: string): Promise<void> {
  try {
    // Prevent deletion of default agent
    if (agentId === 'devs') {
      throw new Error('Cannot delete the default agent')
    }

    // Prevent deletion of built-in agents
    if (!agentId.startsWith('custom-')) {
      throw new Error('Cannot delete built-in agents')
    }

    // Ensure database is initialized
    if (!db.isInitialized()) {
      await db.init()
    }

    // Get current agent
    const currentAgent = await getAgentById(agentId)
    if (!currentAgent) {
      throw new Error(`Agent with id ${agentId} not found`)
    }

    // Mark agent as deleted by setting deletedAt
    const updatedAgent: Agent = {
      ...currentAgent,
      deletedAt: new Date(),
      updatedAt: new Date(),
    }

    // Save to IndexedDB
    await db.update('agents', updatedAgent)

    // Remove from cache (so it won't appear in lists)
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

    // Filter out soft-deleted agents (inferred from deletedAt)
    const activeAgents = customAgents.filter((agent) => !agent.deletedAt)

    // Add to cache
    activeAgents.forEach((agent) => {
      agentCache.set(agent.id, agent)
    })

    return activeAgents
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
  const hideDefaultAgents = userSettings.getState().hideDefaultAgents
  const [customAgents, builtInAgents] = await Promise.all([
    loadCustomAgents(),
    hideDefaultAgents ? Promise.resolve([]) : loadBuiltInAgents(),
  ])

  return {
    customAgents,
    builtInAgents,
  }
}

export async function listAgentExamples(lang?: Lang): Promise<
  {
    agent: Agent
    examples: { id: string; title?: string; prompt: string }[]
  }[]
> {
  const agents = await loadAllAgents()

  return agents
    .filter((agent) => agent?.examples?.length)
    .map((agent) => ({
      agent,
      examples: (agent.examples || []).map((example) => ({
        id: example.id,
        title:
          lang && agent.i18n?.[lang]?.examples
            ? agent.i18n[lang].examples?.find((ex) => ex.id === example.id)
                ?.title || example.title
            : example.title,
        prompt:
          lang && agent.i18n?.[lang]?.examples
            ? agent.i18n[lang].examples?.find((ex) => ex.id === example.id)
                ?.prompt || example.prompt
            : example.prompt,
      })),
    }))
}
