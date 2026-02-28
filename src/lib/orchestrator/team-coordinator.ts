/**
 * Agent Team Coordinator
 *
 * Implements the Agent Teams pattern for multi-agent orchestration, inspired by
 * Claude Code's agent teams architecture. Unlike subagents (which only report
 * results back to a lead), agent teams feature:
 *
 * - **Shared Task List**: A centralized task pool that teammates claim and work on
 * - **Inter-agent Messaging**: Teammates communicate directly via a mailbox system
 * - **Self-coordination**: Teammates autonomously claim unblocked tasks
 * - **Team Lead**: Coordinates work, assigns tasks, and synthesizes results
 *
 * Architecture:
 * ```
 * Main Agent (Team Lead)
 *        │
 *   Spawn Team & Assign Tasks
 *        ↓
 *   ┌─────────────────┐
 *   │ Shared Task List │
 *   └────┬────┬────┬──┘
 *        │    │    │
 *   Claim & Communicate
 *        ↓    ↓    ↓
 *   [Teammate][Teammate][Teammate]
 *        ↔ Communicate ↔
 * ```
 *
 * Teams can be formed by:
 * 1. Explicit user request (e.g., "Create a team with a researcher, writer, and reviewer")
 * 2. Automatic detection from prompt patterns (collaboration keywords, role lists)
 * 3. Orchestration engine decision based on task complexity
 *
 * @module lib/orchestrator/team-coordinator
 */

import type { Agent, AgentSpec } from '@/types'

// ============================================================================
// Types
// ============================================================================

/** Status of a task in the shared task list */
export type TeamTaskStatus =
  | 'pending'
  | 'blocked'
  | 'in_progress'
  | 'completed'
  | 'failed'

/** Configuration for creating a new task in the shared list */
export interface TeamTaskInput {
  title: string
  description: string
  dependencies: string[]
  /** Optional agent spec for skill-based auto-assignment */
  agentSpec?: Pick<
    AgentSpec,
    | 'name'
    | 'role'
    | 'requiredSkills'
    | 'specialization'
    | 'estimatedExperience'
  >
}

/** A task in the shared task list */
export interface TeamTask {
  id: string
  title: string
  description: string
  status: TeamTaskStatus
  dependencies: string[]
  /** Agent ID of the teammate that claimed this task */
  claimedBy?: string
  /** When the task was claimed */
  claimedAt?: Date
  /** When the task was completed */
  completedAt?: Date
  /** Output/result from the completed task */
  output?: string
  /** Error message if the task failed */
  error?: string
  /** Optional agent spec for skill-based matching */
  agentSpec?: TeamTaskInput['agentSpec']
  /** When the task was created */
  createdAt: Date
}

/** A message in the team mailbox */
export interface TeamMessage {
  id: string
  from: string
  to: string
  content: string
  type: 'direct' | 'broadcast'
  timestamp: Date
  read: boolean
}

/** Team configuration as returned by createTeam */
export interface AgentTeamConfig {
  name: string
  leadId: string
  memberIds: string[]
  goal: string
  status: 'active' | 'completed' | 'disbanded'
  createdAt: Date
}

/** Result of prompt analysis for team detection */
export interface TeamDetectionResult {
  isTeamRequest: boolean
  suggestedRoles: string[]
  teamGoal?: string
}

// ============================================================================
// Event Emitter (minimal in-memory)
// ============================================================================

type EventHandler = (...args: any[]) => void

class MiniEmitter {
  private handlers = new Map<string, EventHandler[]>()

  on(event: string, handler: EventHandler): void {
    const existing = this.handlers.get(event) || []
    existing.push(handler)
    this.handlers.set(event, existing)
  }

  off(event: string, handler: EventHandler): void {
    const existing = this.handlers.get(event) || []
    this.handlers.set(
      event,
      existing.filter((h) => h !== handler),
    )
  }

  protected emit(event: string, ...args: any[]): void {
    const handlers = this.handlers.get(event) || []
    handlers.forEach((h) => h(...args))
  }

  removeAllListeners(): void {
    this.handlers.clear()
  }
}

// ============================================================================
// SharedTaskList
// ============================================================================

/**
 * A shared task list that teammates can add to, claim from, and complete.
 *
 * Tasks have a simple lifecycle:
 *   pending → in_progress (claimed) → completed | failed
 *
 * Dependencies are enforced: a task cannot be claimed until all its
 * dependencies are completed.
 *
 * Events:
 * - `task-added`: A new task was added
 * - `task-claimed`: A teammate claimed a task
 * - `task-completed`: A task was completed
 * - `task-failed`: A task failed
 * - `tasks-unblocked`: One or more tasks became ready after a dependency completed
 */
export class SharedTaskList extends MiniEmitter {
  private tasks = new Map<string, TeamTask>()
  /** Claim lock — prevents two agents from claiming the same task simultaneously */
  private claimLock = new Set<string>()

  // --------------------------------------------------------------------------
  // Add
  // --------------------------------------------------------------------------

  addTask(input: TeamTaskInput): TeamTask {
    const task: TeamTask = {
      id: crypto.randomUUID(),
      title: input.title,
      description: input.description,
      status: 'pending',
      dependencies: [...input.dependencies],
      agentSpec: input.agentSpec,
      createdAt: new Date(),
    }

    this.tasks.set(task.id, task)
    this.emit('task-added', task)
    return task
  }

  // --------------------------------------------------------------------------
  // Claim
  // --------------------------------------------------------------------------

  /**
   * Attempt to claim a task for an agent.
   * Returns `true` if the claim succeeded, `false` otherwise.
   *
   * Claims fail if:
   * - Task doesn't exist
   * - Task is already claimed / completed / failed
   * - Task has unresolved dependencies
   * - Another claim is in progress (file-lock style)
   */
  claimTask(taskId: string, agentId: string): boolean {
    const task = this.tasks.get(taskId)
    if (!task) return false
    if (task.status !== 'pending') return false

    // Prevent concurrent claims
    if (this.claimLock.has(taskId)) return false
    this.claimLock.add(taskId)

    try {
      // Check dependencies
      if (!this.areDependenciesSatisfied(taskId)) return false

      // Claim it
      task.status = 'in_progress'
      task.claimedBy = agentId
      task.claimedAt = new Date()
      this.tasks.set(taskId, task)

      this.emit('task-claimed', { ...task })
      return true
    } finally {
      this.claimLock.delete(taskId)
    }
  }

  // --------------------------------------------------------------------------
  // Complete / Fail
  // --------------------------------------------------------------------------

  completeTask(taskId: string, output: string): void {
    const task = this.tasks.get(taskId)
    if (!task) return

    task.status = 'completed'
    task.output = output
    task.completedAt = new Date()
    this.tasks.set(taskId, task)

    this.emit('task-completed', { ...task })

    // Check if any blocked tasks are now unblocked
    const unblocked = this.findNewlyUnblockedTasks(taskId)
    if (unblocked.length > 0) {
      this.emit('tasks-unblocked', unblocked)
    }
  }

  failTask(taskId: string, error: string): void {
    const task = this.tasks.get(taskId)
    if (!task) return

    task.status = 'failed'
    task.error = error
    this.tasks.set(taskId, task)

    this.emit('task-failed', { ...task })
  }

  // --------------------------------------------------------------------------
  // Queries
  // --------------------------------------------------------------------------

  getTask(taskId: string): TeamTask | undefined {
    const task = this.tasks.get(taskId)
    return task ? { ...task } : undefined
  }

  getAllTasks(): TeamTask[] {
    return Array.from(this.tasks.values()).map((t) => ({ ...t }))
  }

  /**
   * Returns tasks that are pending and have all dependencies satisfied.
   * These are the tasks available for teammates to claim.
   */
  getReadyTasks(): TeamTask[] {
    return Array.from(this.tasks.values())
      .filter(
        (task) =>
          task.status === 'pending' && this.areDependenciesSatisfied(task.id),
      )
      .map((t) => ({ ...t }))
  }

  /**
   * Returns outputs from all completed dependencies of a given task.
   * Used to inject upstream context into a teammate's execution.
   */
  getDependencyOutputs(
    taskId: string,
  ): Array<{ taskTitle: string; content: string }> {
    const task = this.tasks.get(taskId)
    if (!task) return []

    return task.dependencies
      .map((depId) => this.tasks.get(depId))
      .filter(
        (dep): dep is TeamTask =>
          !!dep && dep.status === 'completed' && !!dep.output,
      )
      .map((dep) => ({
        taskTitle: dep.title,
        content: dep.output!,
      }))
  }

  /** Check whether all tasks are completed (or failed). */
  isComplete(): boolean {
    if (this.tasks.size === 0) return true
    return Array.from(this.tasks.values()).every(
      (task) => task.status === 'completed' || task.status === 'failed',
    )
  }

  /** Detect cycles in the dependency graph using DFS. */
  hasCircularDependency(): boolean {
    const visited = new Set<string>()
    const visiting = new Set<string>()

    const hasCycle = (taskId: string): boolean => {
      if (visiting.has(taskId)) return true
      if (visited.has(taskId)) return false

      visiting.add(taskId)
      const task = this.tasks.get(taskId)
      if (task) {
        for (const depId of task.dependencies) {
          if (hasCycle(depId)) return true
        }
      }
      visiting.delete(taskId)
      visited.add(taskId)
      return false
    }

    for (const taskId of this.tasks.keys()) {
      if (hasCycle(taskId)) return true
    }
    return false
  }

  // --------------------------------------------------------------------------
  // Internal helpers
  // --------------------------------------------------------------------------

  private areDependenciesSatisfied(taskId: string): boolean {
    const task = this.tasks.get(taskId)
    if (!task) return false
    return task.dependencies.every((depId) => {
      const dep = this.tasks.get(depId)
      return dep && dep.status === 'completed'
    })
  }

  /**
   * Find tasks that were blocked and are now ready because `completedTaskId`
   * was just completed.
   */
  private findNewlyUnblockedTasks(completedTaskId: string): string[] {
    const unblocked: string[] = []
    for (const [id, task] of this.tasks.entries()) {
      if (
        task.status === 'pending' &&
        task.dependencies.includes(completedTaskId) &&
        this.areDependenciesSatisfied(id)
      ) {
        unblocked.push(id)
      }
    }
    return unblocked
  }
}

// ============================================================================
// TeamMailbox
// ============================================================================

/**
 * A messaging system for inter-agent communication.
 *
 * Supports:
 * - Direct messages (agent → agent)
 * - Broadcasts (agent → all teammates)
 * - Read tracking
 * - Conversation view (messages between two agents)
 *
 * Events:
 * - `message-sent`: A message was delivered
 */
export class TeamMailbox extends MiniEmitter {
  private messages: TeamMessage[] = []

  // --------------------------------------------------------------------------
  // Send
  // --------------------------------------------------------------------------

  sendMessage(from: string, to: string, content: string): TeamMessage {
    const message: TeamMessage = {
      id: crypto.randomUUID(),
      from,
      to,
      content,
      type: 'direct',
      timestamp: new Date(),
      read: false,
    }

    this.messages.push(message)
    this.emit('message-sent', message)
    return message
  }

  broadcast(
    from: string,
    recipients: string[],
    content: string,
  ): TeamMessage[] {
    const sent: TeamMessage[] = []

    for (const to of recipients) {
      // Don't send broadcast to the sender
      if (to === from) continue

      const message: TeamMessage = {
        id: crypto.randomUUID(),
        from,
        to,
        content,
        type: 'broadcast',
        timestamp: new Date(),
        read: false,
      }

      this.messages.push(message)
      sent.push(message)
      this.emit('message-sent', message)
    }

    return sent
  }

  // --------------------------------------------------------------------------
  // Read
  // --------------------------------------------------------------------------

  getMessages(agentId: string): TeamMessage[] {
    return this.messages.filter((m) => m.to === agentId)
  }

  getUnreadMessages(agentId: string): TeamMessage[] {
    return this.messages.filter((m) => m.to === agentId && !m.read)
  }

  markRead(agentId: string, messageId: string): void {
    const msg = this.messages.find(
      (m) => m.id === messageId && m.to === agentId,
    )
    if (msg) msg.read = true
  }

  /**
   * Returns all messages exchanged between two agents (in either direction),
   * sorted chronologically.
   */
  getConversation(agentA: string, agentB: string): TeamMessage[] {
    return this.messages
      .filter(
        (m) =>
          (m.from === agentA && m.to === agentB) ||
          (m.from === agentB && m.to === agentA),
      )
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
  }
}

// ============================================================================
// TeamCoordinator
// ============================================================================

/** Input for creating a new team */
export interface CreateTeamInput {
  name: string
  lead: Agent
  teammates: Agent[]
  goal: string
}

/**
 * Coordinates a team of AI agents working together on a shared goal.
 *
 * The coordinator manages:
 * - Team lifecycle (create → active → completed/disbanded)
 * - Shared task list
 * - Inter-agent mailbox
 * - Teammate matching for tasks
 *
 * Only one team can be active at a time (per coordinator instance).
 */
export class TeamCoordinator {
  private team?: AgentTeamConfig
  private taskList?: SharedTaskList
  private mailbox?: TeamMailbox
  private agents = new Map<string, Agent>()

  // --------------------------------------------------------------------------
  // Team Lifecycle
  // --------------------------------------------------------------------------

  createTeam(input: CreateTeamInput): AgentTeamConfig {
    if (this.team && this.team.status === 'active') {
      throw new Error('A team is already active. Call cleanup() first.')
    }

    // Store agents for skill matching
    this.agents.set(input.lead.id, input.lead)
    for (const teammate of input.teammates) {
      this.agents.set(teammate.id, teammate)
    }

    this.team = {
      name: input.name,
      leadId: input.lead.id,
      memberIds: input.teammates.map((t) => t.id),
      goal: input.goal,
      status: 'active',
      createdAt: new Date(),
    }

    this.taskList = new SharedTaskList()
    this.mailbox = new TeamMailbox()

    return { ...this.team }
  }

  cleanup(): void {
    if (this.taskList) {
      this.taskList.removeAllListeners()
    }
    if (this.mailbox) {
      this.mailbox.removeAllListeners()
    }
    this.team = undefined
    this.taskList = undefined
    this.mailbox = undefined
    this.agents.clear()
  }

  // --------------------------------------------------------------------------
  // Task Management
  // --------------------------------------------------------------------------

  addTasks(inputs: TeamTaskInput[]): TeamTask[] {
    if (!this.team || !this.taskList) {
      throw new Error('No active team. Call createTeam() first.')
    }

    return inputs.map((input) => this.taskList!.addTask(input))
  }

  // --------------------------------------------------------------------------
  // Team Membership
  // --------------------------------------------------------------------------

  addTeammate(agent: Agent): void {
    if (!this.team) {
      throw new Error('No active team. Call createTeam() first.')
    }

    this.agents.set(agent.id, agent)
    this.team.memberIds.push(agent.id)
  }

  removeTeammate(agentId: string): void {
    if (!this.team) {
      throw new Error('No active team. Call createTeam() first.')
    }

    if (agentId === this.team.leadId) {
      throw new Error('Cannot remove the team lead.')
    }

    this.team.memberIds = this.team.memberIds.filter((id) => id !== agentId)
    this.agents.delete(agentId)
  }

  // --------------------------------------------------------------------------
  // Communication
  // --------------------------------------------------------------------------

  sendMessage(from: string, to: string, content: string): void {
    if (!this.mailbox) {
      throw new Error('No active team. Call createTeam() first.')
    }
    this.mailbox.sendMessage(from, to, content)
  }

  broadcast(from: string, content: string): void {
    if (!this.team || !this.mailbox) {
      throw new Error('No active team. Call createTeam() first.')
    }

    const allMembers = [this.team.leadId, ...this.team.memberIds]
    this.mailbox.broadcast(from, allMembers, content)
  }

  // --------------------------------------------------------------------------
  // Queries
  // --------------------------------------------------------------------------

  getTeam(): AgentTeamConfig | undefined {
    return this.team ? { ...this.team } : undefined
  }

  getTaskList(): SharedTaskList | undefined {
    return this.taskList
  }

  getMailbox(): TeamMailbox | undefined {
    return this.mailbox
  }

  getTeamStatus():
    | {
        name: string
        status: string
        leadId: string
        memberCount: number
        totalTasks: number
        pendingTasks: number
        inProgressTasks: number
        completedTasks: number
        failedTasks: number
      }
    | undefined {
    if (!this.team || !this.taskList) return undefined

    const allTasks = this.taskList.getAllTasks()
    return {
      name: this.team.name,
      status: this.team.status,
      leadId: this.team.leadId,
      memberCount: this.team.memberIds.length,
      totalTasks: allTasks.length,
      pendingTasks: allTasks.filter((t) => t.status === 'pending').length,
      inProgressTasks: allTasks.filter((t) => t.status === 'in_progress')
        .length,
      completedTasks: allTasks.filter((t) => t.status === 'completed').length,
      failedTasks: allTasks.filter((t) => t.status === 'failed').length,
    }
  }

  // --------------------------------------------------------------------------
  // Skill-Based Matching
  // --------------------------------------------------------------------------

  /**
   * Find the best teammate for a given task based on skill matching.
   *
   * Scoring:
   * - +3 for matching tag
   * - +2 for skill in agent role
   * - +1 for skill in agent instructions
   *
   * Returns the best match, or the first available teammate if no match.
   */
  getBestTeammateForTask(task: TeamTaskInput): Agent | undefined {
    if (!this.team) return undefined

    const requiredSkills = task.agentSpec?.requiredSkills || []

    // Score each teammate
    const scored = this.team.memberIds
      .map((id) => {
        const agent = this.agents.get(id)
        if (!agent) return { agent: undefined, score: 0 }

        let score = 0
        for (const skill of requiredSkills) {
          const lower = skill.toLowerCase()
          if (agent.tags?.some((t) => t.toLowerCase() === lower)) score += 3
          if (agent.role.toLowerCase().includes(lower)) score += 2
          if (agent.instructions.toLowerCase().includes(lower)) score += 1
          // Also match agent name
          if (agent.name.toLowerCase().includes(lower)) score += 2
        }
        return { agent, score }
      })
      .filter((s) => s.agent !== undefined)
      .sort((a, b) => b.score - a.score)

    if (scored.length > 0 && scored[0].score > 0) {
      return scored[0].agent
    }

    // Fallback: return the first available teammate
    for (const id of this.team.memberIds) {
      const agent = this.agents.get(id)
      if (agent) return agent
    }

    return undefined
  }

  /**
   * Get the Agent instance for a given ID (from the team's local cache).
   */
  getAgent(agentId: string): Agent | undefined {
    return this.agents.get(agentId)
  }
}

// ============================================================================
// Prompt-Based Team Detection
// ============================================================================

/**
 * Analyzes a user prompt to determine if an agent team is being requested,
 * and extracts suggested roles from the prompt text.
 *
 * Detection signals:
 * 1. Explicit keywords: "team", "collaborate", "together", "parallel"
 * 2. Role lists: "one on X, one on Y" or "- X reviewer - Y analyst"
 * 3. Multiple agent mentions: "researcher and writer"
 * 4. Numbered lists of perspectives/roles
 */
export function detectTeamFromPrompt(prompt: string): TeamDetectionResult {
  const lower = prompt.toLowerCase()

  // Team intent keywords
  const teamKeywords = [
    'agent team',
    'create a team',
    'build a team',
    'spawn',
    'team of agents',
    'collaborate',
    'collaboration',
    'work together',
    'multiple agents',
    'from different angles',
    'from multiple angles',
    'different perspectives',
    'multiple perspectives',
    'in parallel',
    'reviewers',
    'teammates',
  ]

  const hasTeamKeyword = teamKeywords.some((kw) => lower.includes(kw))

  // Extract roles from patterns
  const suggestedRoles: string[] = []

  // Pattern: "one on X, one on Y, one on Z"
  const oneOnPattern =
    /one\s+(?:on|focused on|checking|validating|playing)\s+([^,.\n]+)/gi
  let match
  while ((match = oneOnPattern.exec(prompt)) !== null) {
    suggestedRoles.push(match[1].trim().toLowerCase())
  }

  // Pattern: "- One focused on X" or "- X reviewer"
  const dashListPattern =
    /[-•]\s*(?:one\s+)?(?:focused on\s+|checking\s+|validating\s+)?([^-•\n]+)/gi
  while ((match = dashListPattern.exec(prompt)) !== null) {
    const role = match[1].trim().toLowerCase()
    if (
      role.length > 2 &&
      role.length < 100 &&
      !suggestedRoles.includes(role)
    ) {
      suggestedRoles.push(role)
    }
  }

  // Pattern: "1) a X, 2) a Y, 3) a Z"
  const numberedPattern = /\d\)\s*(?:a\s+)?([^,\d)]+)/gi
  while ((match = numberedPattern.exec(prompt)) !== null) {
    const role = match[1].trim().toLowerCase()
    if (role.length > 2 && !suggestedRoles.includes(role)) {
      suggestedRoles.push(role)
    }
  }

  // Pattern: "the researcher and writer" or "researcher, writer, and reviewer"
  const roleConnectorPattern =
    /\b(researcher|writer|reviewer|analyst|designer|developer|tester|architect|manager|strategist|qa|devops|security|frontend|backend|database)\b/gi
  const roleMatches: string[] = []
  while ((match = roleConnectorPattern.exec(prompt)) !== null) {
    const role = match[1].toLowerCase()
    if (!roleMatches.includes(role)) {
      roleMatches.push(role)
    }
  }

  // If we found multiple role-like words, those are suggested roles too
  if (roleMatches.length >= 2) {
    for (const r of roleMatches) {
      if (!suggestedRoles.includes(r)) {
        suggestedRoles.push(r)
      }
    }
  }

  // Pattern: "three reviewers:" or "5 agent teammates"
  const countPattern =
    /(\d+|two|three|four|five|six|seven|eight|nine|ten)\s+(?:agent\s+)?(?:reviewers?|teammates?|agents?|members?)/i
  const countMatch = lower.match(countPattern)

  // Determine if this is a team request
  const isTeamRequest =
    hasTeamKeyword ||
    suggestedRoles.length >= 2 ||
    (roleMatches.length >= 2 &&
      (lower.includes(' and ') || lower.includes(','))) ||
    !!countMatch

  return {
    isTeamRequest,
    suggestedRoles,
    teamGoal: isTeamRequest ? prompt : undefined,
  }
}
