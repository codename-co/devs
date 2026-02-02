import { useState, useEffect } from 'react'

import { PRODUCT } from '@/config/product'
import { errorToast, successToast } from '@/lib/toast'
import { slugify, generateUniqueSlug } from '@/lib/slugify'
import { type Agent, type AgentColor, type Tool } from '@/types'
import { Lang } from '@/i18n'
import { userSettings } from '@/stores/userStore'
import { IconName } from '@/lib/types'
import {
  agents,
  whenReady,
  transact,
  useLiveMap,
  useLiveValue,
} from '@/lib/yjs'

type AgentJSON = Omit<Agent, 'createdAt' | 'updatedAt' | 'version' | 'tools'>

// Cache for built-in agents loaded from JSON files
const builtInAgentCache = new Map<string, Agent>()
let agentsList: string[] | null = null

const defaultDevsTeam: Agent = {
  id: 'devs',
  slug: 'devs',
  name: PRODUCT.displayName,
  icon: 'Devs',
  desc: 'Autonomous multi-agent orchestrator for complex task delegation',
  role: 'Autonomous Task Orchestrator and Multi-Agent Team Coordinator',
  instructions: /* md */ `You are the ${PRODUCT.displayName} autonomous orchestration system. Your primary mission is to analyze user requests and coordinate teams of specialized agents to deliver complete, high-quality solutions without requiring human intervention.

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

Your success is measured by delivering complete, high-quality solutions that meet all user requirements without requiring any intermediate human intervention.
`,
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

// Initialize the default DEVS agent in Yjs if not present
whenReady.then(() => {
  if (!agents.has('devs')) {
    agents.set('devs', defaultDevsTeam)
  }
})

/**
 * Get all existing slugs from Yjs and built-in cache
 */
function getAllExistingSlugs(): Set<string> {
  const slugs = new Set<string>()

  // Add slugs from built-in agents cache
  for (const agent of builtInAgentCache.values()) {
    if (agent.slug) {
      slugs.add(agent.slug)
    }
  }

  // Add slugs from Yjs (custom agents)
  for (const agent of agents.values()) {
    if (agent.slug && !agent.deletedAt) {
      slugs.add(agent.slug)
    }
  }

  return slugs
}

/**
 * Load a built-in agent from JSON file
 */
async function loadBuiltInAgent(agentId: string): Promise<Agent | null> {
  if (!agentId) return null

  if (builtInAgentCache.has(agentId)) {
    return builtInAgentCache.get(agentId)!
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
    // Use existing slug from JSON or fallback to id (built-in agents use id as slug)
    const agent: Agent = {
      ...agentData,
      slug: agentData.slug || agentData.id,
      createdAt: new Date(),
    }

    builtInAgentCache.set(agentId, agent)
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
  await whenReady

  // Check user setting for hiding default agents
  const hideDefaultAgents = userSettings.getState().hideDefaultAgents
  const includeDefaults = options?.includeDefaultAgents ?? !hideDefaultAgents

  // Load built-in agents from JSON files (if not hidden)
  let validBuiltInAgents: Agent[] = []
  if (includeDefaults) {
    const agentIds = await getAvailableAgents()
    const builtInAgents = await Promise.all(
      agentIds.map((id) =>
        id === 'devs' ? Promise.resolve(defaultDevsTeam) : loadBuiltInAgent(id),
      ),
    )
    validBuiltInAgents = builtInAgents.filter(
      (agent): agent is Agent => agent !== null,
    )
  }

  // Get custom agents from Yjs (filter out deleted)
  const customAgents = getAllCustomAgents()

  // Combine all agents
  return [...validBuiltInAgents, ...customAgents]
}

/**
 * Get all custom agents from Yjs (excludes deleted)
 */
function getAllCustomAgents(): Agent[] {
  return Array.from(agents.values()).filter(
    (agent) => agent.id.startsWith('custom-') && !agent.deletedAt,
  )
}

/**
 * Get an agent by ID (sync when possible)
 */
export function getAgentById(id: string): Agent | undefined {
  if (id === 'devs') {
    return agents.get('devs') ?? defaultDevsTeam
  }

  // Check Yjs first (includes custom agents)
  const yjsAgent = agents.get(id)
  if (yjsAgent && !yjsAgent.deletedAt) {
    return yjsAgent
  }

  // Check built-in agent cache
  if (builtInAgentCache.has(id)) {
    return builtInAgentCache.get(id)
  }

  return undefined
}

/**
 * Get an agent by ID (async version for backward compatibility)
 * Tries built-in agents from JSON files if not in Yjs
 */
export async function getAgentByIdAsync(id: string): Promise<Agent | null> {
  await whenReady

  if (id === 'devs') {
    return agents.get('devs') ?? defaultDevsTeam
  }

  // Check Yjs first (includes custom agents)
  const yjsAgent = agents.get(id)
  if (yjsAgent && !yjsAgent.deletedAt) {
    return yjsAgent
  }

  // Check built-in agent cache
  if (builtInAgentCache.has(id)) {
    return builtInAgentCache.get(id)!
  }

  // Try loading from JSON files
  const jsonAgent = await loadBuiltInAgent(id)
  if (jsonAgent) {
    return jsonAgent
  }

  return null
}

/**
 * Get an agent by its slug (sync version)
 */
export function getAgentBySlug(slug: string): Agent | undefined {
  if (!slug) return undefined

  // For 'devs' slug, return default agent
  if (slug === 'devs') {
    return agents.get('devs') ?? defaultDevsTeam
  }

  // Search in Yjs
  for (const agent of agents.values()) {
    if (agent.slug === slug && !agent.deletedAt) {
      return agent
    }
  }

  // Search in built-in agent cache
  for (const agent of builtInAgentCache.values()) {
    if (agent.slug === slug) {
      return agent
    }
  }

  // Fall back to ID-based lookup (for backward compatibility)
  return getAgentById(slug)
}

/**
 * Get an agent by its slug (async version for backward compatibility)
 */
export async function getAgentBySlugAsync(slug: string): Promise<Agent | null> {
  await whenReady

  if (!slug) return null

  // For 'devs' slug, return default agent
  if (slug === 'devs') {
    return agents.get('devs') ?? defaultDevsTeam
  }

  // Search in Yjs first
  for (const agent of agents.values()) {
    if (agent.slug === slug && !agent.deletedAt) {
      return agent
    }
  }

  // Search in built-in agent cache
  for (const agent of builtInAgentCache.values()) {
    if (agent.slug === slug) {
      return agent
    }
  }

  // Try loading all built-in agents and search
  const agentIds = await getAvailableAgents()
  for (const agentId of agentIds) {
    if (agentId === 'devs') continue
    const builtInAgent = await loadBuiltInAgent(agentId)
    if (builtInAgent && builtInAgent.slug === slug) {
      return builtInAgent
    }
  }

  // Fall back to ID-based lookup (for backward compatibility)
  return getAgentByIdAsync(slug)
}

export function getDefaultAgent(): Agent {
  return agents.get('devs') ?? defaultDevsTeam
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

export async function getAgentsByCategory(
  lang: string = 'en',
  options?: { includeDefaultAgents?: boolean },
): Promise<{
  agentsByCategory: AgentsByCategory
  orderedCategories: string[]
}> {
  const agents = await loadAllAgents(options)

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
  tools?: Tool[]
  icon?: IconName
  color?: AgentColor
  portrait?: string
}): Promise<Agent> {
  try {
    await whenReady

    // Generate a unique slug from the name
    const existingSlugs = getAllExistingSlugs()
    const baseSlug = slugify(agentData.name)
    const uniqueSlug = generateUniqueSlug(baseSlug, existingSlugs)

    // Create the agent object with required fields
    const agent: Agent = {
      id: `custom-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      slug: uniqueSlug,
      name: agentData.name,
      role: agentData.role,
      instructions: agentData.instructions || '',
      temperature: agentData.temperature,
      tags: agentData.tags,
      knowledgeItemIds: agentData.knowledgeItemIds,
      tools: agentData.tools || [],
      icon: agentData.icon,
      color: agentData.color,
      portrait: agentData.portrait,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    // Save to Yjs (single source of truth)
    agents.set(agent.id, agent)

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
    await whenReady

    // Get current agent
    const currentAgent = getAgentById(agentId)
    if (!currentAgent) {
      throw new Error(`Agent with id ${agentId} not found`)
    }

    // Handle slug update if name changed
    let newSlug = currentAgent.slug
    if (updates.name && updates.name !== currentAgent.name) {
      const existingSlugs = getAllExistingSlugs()
      const baseSlug = slugify(updates.name)
      // Exclude current slug so we can keep it if the new base slug matches
      newSlug = generateUniqueSlug(baseSlug, existingSlugs, currentAgent.slug)
    }

    // Create updated agent
    const updatedAgent: Agent = {
      ...currentAgent,
      ...updates,
      id: agentId, // Ensure ID doesn't change
      slug: updates.slug ?? newSlug, // Allow explicit slug override or use computed one
      updatedAt: new Date(),
    }

    // Save to Yjs (single source of truth)
    agents.set(agentId, updatedAgent)

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

/**
 * Delete an agent (soft delete via deletedAt)
 */
export async function deleteAgent(agentId: string): Promise<void> {
  try {
    // Prevent deletion of default agent
    if (agentId === 'devs') {
      throw new Error('Cannot delete the default agent')
    }

    // Prevent deletion of built-in agents
    if (!agentId.startsWith('custom-')) {
      throw new Error('Cannot delete built-in agents')
    }

    await whenReady

    // Get current agent
    const currentAgent = agents.get(agentId)
    if (!currentAgent) {
      throw new Error(`Agent with id ${agentId} not found`)
    }

    // Soft delete by setting deletedAt
    const deletedAgent: Agent = {
      ...currentAgent,
      deletedAt: new Date(),
      updatedAt: new Date(),
    }

    // Save to Yjs (single source of truth)
    agents.set(agentId, deletedAgent)

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

/**
 * Soft delete an agent (alias for deleteAgent for backward compatibility)
 */
export async function softDeleteAgent(agentId: string): Promise<void> {
  return deleteAgent(agentId)
}

/**
 * Restore a soft-deleted agent
 */
export async function restoreAgent(
  agentId: string,
): Promise<Agent | undefined> {
  try {
    await whenReady

    const currentAgent = agents.get(agentId)
    if (!currentAgent) {
      throw new Error(`Agent with id ${agentId} not found`)
    }

    if (!currentAgent.deletedAt) {
      // Agent is not deleted, return as-is
      return currentAgent
    }

    // Remove deletedAt to restore
    const restoredAgent: Agent = {
      ...currentAgent,
      deletedAt: undefined,
      updatedAt: new Date(),
    }

    // Save to Yjs
    agents.set(agentId, restoredAgent)

    successToast('Agent restored successfully!')

    return restoredAgent
  } catch (error) {
    console.error('Error restoring agent:', error)
    errorToast(
      'Failed to restore agent',
      error instanceof Error ? error.message : 'Unknown error',
    )
    throw error
  }
}

/**
 * Get all agents (for backward compatibility, async version)
 */
export async function loadCustomAgents(): Promise<Agent[]> {
  try {
    await whenReady
    return getAllCustomAgents()
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
      id === 'devs' ? Promise.resolve(defaultDevsTeam) : loadBuiltInAgent(id),
    ),
  )
  return builtInAgents.filter((agent): agent is Agent => agent !== null)
}

export async function getAgentsSeparated(): Promise<{
  customAgents: Agent[]
  builtInAgents: Agent[]
}> {
  await whenReady

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
  const allAgents = await loadAllAgents()

  return allAgents
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

/**
 * Get all agents (sync) - returns custom agents from Yjs
 */
export function getAllAgents(): Agent[] {
  return getAllCustomAgents()
}

/**
 * Batch create multiple agents
 */
export async function batchCreateAgents(
  agentsToCreate: Agent[],
): Promise<void> {
  await whenReady

  transact(() => {
    for (const agent of agentsToCreate) {
      agents.set(agent.id, agent)
    }
  })

  // Invalidate the agents list cache
  agentsList = null
}

// ============================================================================
// React Hooks
// ============================================================================

/**
 * React hook to subscribe to all agents (custom agents from Yjs)
 * Returns only non-deleted agents
 */
export function useAgents(): Agent[] {
  const allAgents = useLiveMap(agents)
  return allAgents.filter((agent) => !agent.deletedAt)
}

/**
 * React hook to subscribe to a single agent by ID
 * Returns undefined if not found or deleted
 */
export function useAgent(id: string | undefined): Agent | undefined {
  const agent = useLiveValue(agents, id)
  if (!agent || agent.deletedAt) {
    // Check built-in agent cache
    if (id && builtInAgentCache.has(id)) {
      return builtInAgentCache.get(id)
    }
    return undefined
  }
  return agent
}

/**
 * React hook to subscribe to agents separated into custom and built-in
 * Returns { customAgents, builtInAgents, loading }
 */
export function useAgentsSeparated(): {
  customAgents: Agent[]
  builtInAgents: Agent[]
  loading: boolean
} {
  const customAgents = useAgents()
  const hideDefaultAgents = userSettings((state) => state.hideDefaultAgents)
  const [builtInAgents, setBuiltInAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (hideDefaultAgents) {
      setBuiltInAgents([])
      setLoading(false)
    } else {
      loadBuiltInAgents().then((agents) => {
        setBuiltInAgents(agents)
        setLoading(false)
      })
    }
  }, [hideDefaultAgents])

  return { customAgents, builtInAgents, loading }
}

/**
 * React hook to check if Yjs data is ready
 */
export { useSyncReady } from '@/lib/yjs'
