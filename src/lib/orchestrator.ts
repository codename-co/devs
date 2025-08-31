import { TaskAnalyzer, type TaskAnalysisResult } from '@/lib/task-analyzer'
import { ContextBroker } from '@/lib/context-broker'
import { ArtifactManager } from '@/lib/artifact-manager'
import { useTaskStore } from '@/stores/taskStore'
import { useConversationStore } from '@/stores/conversationStore'
import { getAgentById, createAgent, loadAllAgents } from '@/stores/agentStore'
import { LLMService, LLMMessage, LLMMessageAttachment } from '@/lib/llm'
import { CredentialService } from '@/lib/credential-service'
import {
  getKnowledgeAttachments,
  buildAgentInstructions,
} from '@/lib/agent-knowledge'
import type {
  Task,
  Agent,
  ExecutionResult,
  AgentSpec,
  Artifact,
  SharedContext,
  TaskAttachment,
} from '@/types'

export interface OrchestrationResult {
  success: boolean
  workflowId: string
  mainTaskId: string
  subTaskIds: string[]
  artifacts: Artifact[]
  errors?: string[]
}

export class WorkflowOrchestrator {
  private static readonly AGENT_RECRUITER_ID = 'agent-recruiter'
  private static readonly VALIDATOR_AGENT_ID = 'validator-agent'
  private static runningOrchestrations = new Set<string>()

  // Helper function to convert TaskAttachment to LLMMessageAttachment
  private static convertTaskAttachments(
    attachments: TaskAttachment[] = [],
  ): LLMMessageAttachment[] {
    return attachments.map((attachment) => ({
      type: attachment.type.startsWith('image/')
        ? ('image' as const)
        : attachment.type === 'text/plain'
          ? ('text' as const)
          : ('document' as const),
      name: attachment.name,
      data: attachment.data,
      mimeType: attachment.type,
    }))
  }

  static async orchestrateTask(
    prompt: string,
    existingTaskId?: string,
  ): Promise<OrchestrationResult> {
    // Use task ID for deduplication if available, otherwise fall back to prompt hash
    const orchestrationKey =
      existingTaskId || btoa(encodeURIComponent(prompt)).substring(0, 32)

    if (this.runningOrchestrations.has(orchestrationKey)) {
      console.log(
        '⏭️ Orchestration already running for this task/prompt, skipping duplicate',
      )
      throw new Error('Orchestration already in progress for this task')
    }

    // If we have an existing task ID, check if it's already been orchestrated
    if (existingTaskId) {
      const { getTaskById } = useTaskStore.getState()
      const existingTask = await getTaskById(existingTaskId)
      if (existingTask && existingTask.status !== 'pending') {
        console.log(
          `⏭️ Task ${existingTaskId} already processed (status: ${existingTask.status}), skipping orchestration`,
        )
        // Return a success result for already processed tasks
        const artifacts =
          await ArtifactManager.getArtifactsByTask(existingTaskId)
        return {
          success: true,
          workflowId: existingTask.workflowId,
          mainTaskId: existingTask.id,
          subTaskIds: [],
          artifacts,
        }
      }
    }

    this.runningOrchestrations.add(orchestrationKey)
    try {
      console.log(
        '🚀 Starting task orchestration for:',
        prompt.substring(0, 100),
      )

      // Step 1: Analyze the task
      const analysis = await TaskAnalyzer.analyzePrompt(prompt)
      console.log('📊 Task analysis complete:', {
        complexity: analysis.complexity,
        requiredSkills: analysis.requiredSkills,
        estimatedPasses: analysis.estimatedPasses,
      })

      // Step 2: Create workflow and plan
      const workflowId = crypto.randomUUID()

      // Step 3: Determine execution strategy
      if (analysis.complexity === 'simple') {
        console.log(
          '📝 Using focused single-pass execution for direct content creation',
        )
        return await this.executeSinglePass(
          prompt,
          analysis,
          workflowId,
          existingTaskId,
        )
      } else {
        return await this.executeMultiPass(
          prompt,
          analysis,
          workflowId,
          existingTaskId,
        )
      }
    } catch (error) {
      console.error('❌ Orchestration failed:', error)
      throw error
    } finally {
      this.runningOrchestrations.delete(orchestrationKey)
    }
  }

  private static async executeSinglePass(
    prompt: string,
    analysis: TaskAnalysisResult,
    workflowId: string,
    existingTaskId?: string,
  ): Promise<OrchestrationResult> {
    console.log('🔄 Executing single-pass strategy')

    // Get or create main task
    const { createTask, getTaskById, updateTask } = useTaskStore.getState()
    let mainTask: Task

    if (existingTaskId) {
      // Use existing task and update it with analysis results
      const existingTask = await getTaskById(existingTaskId)
      if (!existingTask) {
        throw new Error(`Existing task ${existingTaskId} not found`)
      }

      // Update the existing task with orchestration details
      await updateTask(existingTaskId, {
        complexity: 'simple',
        estimatedPasses: 1,
        dueDate: new Date(Date.now() + analysis.estimatedDuration * 60 * 1000),
        // Merge requirements from analysis with existing ones, adding detection timestamps
        requirements: [
          ...existingTask.requirements,
          ...analysis.requirements.map((req) => ({
            ...req,
            detectedAt: req.detectedAt || new Date(),
          })),
        ],
      })

      // Get updated task
      const updatedTask = await getTaskById(existingTaskId)
      if (!updatedTask) {
        throw new Error(`Failed to get updated task ${existingTaskId}`)
      }
      mainTask = updatedTask
      console.log('🔄 Using existing task:', mainTask.id)
    } else {
      // Create new task (fallback for when no existing task is provided)
      mainTask = await createTask({
        workflowId,
        title: TaskAnalyzer.extractTaskTitle(prompt),
        description: prompt,
        complexity: 'simple',
        status: 'pending',
        dependencies: [],
        requirements: analysis.requirements.map((req) => ({
          ...req,
          detectedAt: req.detectedAt || new Date(),
        })),
        artifacts: [],
        steps: [],
        estimatedPasses: 1,
        actualPasses: 0,
        dueDate: new Date(Date.now() + analysis.estimatedDuration * 60 * 1000),
      })
      console.log('🆕 Created new task:', mainTask.id)
    }

    try {
      // Find or create suitable agent - enhance for creative writing
      let agentSpec = analysis.suggestedAgents[0]

      if (!agentSpec) {
        agentSpec = {
          name: 'Task Executor',
          role: 'General Task Executor',
          requiredSkills: analysis.requiredSkills,
          estimatedExperience: 'Mid',
          specialization: 'General problem solving',
        }
      }

      const agent = await this.findOrCreateAgent(agentSpec)

      // Execute task
      console.log(`🤖 Executing task with agent: ${agent.name}`)
      const result = await this.executeTaskWithAgent(mainTask, agent, prompt)
      console.log(`✅ Task execution result:`, result)

      // Validate result
      const isValid = await this.validateTaskCompletion(mainTask)

      if (!isValid.validation_passed) {
        // Create refinement task if validation fails
        console.log('🔄 Task validation failed, creating refinement task')
        const refinementTask = await this.createRefinementTask(
          mainTask,
          isValid.reason,
        )
        await this.executeTaskWithAgent(
          refinementTask,
          agent,
          `Please address these issues: ${isValid.reason}`,
        )
      }

      // Validate and update individual requirements
      const {
        validateAndUpdateRequirements,
        updateTask,
        markRequirementSatisfied,
      } = useTaskStore.getState()
      console.log('🔍 Validating individual requirements...')
      const requirementValidation = await validateAndUpdateRequirements(
        mainTask.id,
      )
      console.log(
        `📋 Requirement validation complete: ${requirementValidation.satisfactionRate}% satisfied`,
      )

      // Mark individual requirements as satisfied if they passed validation
      for (const result of requirementValidation.results) {
        if (result.status === 'satisfied') {
          await markRequirementSatisfied(
            mainTask.id,
            result.requirementId,
            result.evidence,
          )
        }
      }

      // Mark task complete
      await updateTask(mainTask.id, {
        status: 'completed',
        actualPasses: mainTask.actualPasses + 1,
        completedAt: new Date(), // Track when the task was completed
      })

      const artifacts = await ArtifactManager.getArtifactsByTask(mainTask.id)

      return {
        success: true,
        workflowId,
        mainTaskId: mainTask.id,
        subTaskIds: [],
        artifacts,
      }
    } catch (error) {
      console.error('❌ Single-pass execution failed:', error)
      const { updateTask } = useTaskStore.getState()
      await updateTask(mainTask.id, { status: 'failed' })

      return {
        success: false,
        workflowId,
        mainTaskId: mainTask.id,
        subTaskIds: [],
        artifacts: [],
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      }
    }
  }

  private static async executeMultiPass(
    prompt: string,
    analysis: TaskAnalysisResult,
    workflowId: string,
    existingTaskId?: string,
  ): Promise<OrchestrationResult> {
    console.log('🔄 Executing multi-pass strategy')

    try {
      // Step 1: Break down into tasks
      const breakdown = await TaskAnalyzer.breakdownTask(
        prompt,
        analysis,
        workflowId,
      )

      // Step 2: Get or create main task and subtasks
      const { createTask, getTaskById, updateTask } = useTaskStore.getState()
      let mainTask: Task

      if (existingTaskId) {
        // Use existing task and update it with breakdown results
        const existingTask = await getTaskById(existingTaskId)
        if (!existingTask) {
          throw new Error(`Existing task ${existingTaskId} not found`)
        }

        // Update the existing task with multipass orchestration details
        await updateTask(existingTaskId, {
          ...breakdown.mainTask,
          id: existingTaskId, // Keep the original ID
          workflowId: existingTask.workflowId, // Keep original workflow ID
          // Merge requirements with detection timestamps
          requirements: [
            ...existingTask.requirements,
            ...(breakdown.mainTask.requirements || []).map((req) => ({
              ...req,
              detectedAt: req.detectedAt || new Date(),
            })),
          ],
        })

        // Get updated task
        const updatedTask = await getTaskById(existingTaskId)
        if (!updatedTask) {
          throw new Error(`Failed to get updated task ${existingTaskId}`)
        }
        mainTask = updatedTask
        console.log('🔄 Using existing task for multipass:', mainTask.id)
      } else {
        // Create new task (fallback)
        mainTask = await createTask(breakdown.mainTask)
        console.log('🆕 Created new multipass task:', mainTask.id)
      }

      const subTasks: Task[] = []
      for (const subTaskData of breakdown.subTasks) {
        const subTask = await createTask({
          ...subTaskData,
          parentTaskId: mainTask.id,
        })
        subTasks.push(subTask)
      }

      // Step 3: Build team of agents
      const team = await this.buildTeam(analysis.suggestedAgents)

      // Step 4: Execute tasks in coordination
      console.log(
        `🎭 Coordinating ${subTasks.length} subtasks with ${team.length} agents`,
      )
      const results = await this.coordinateTeamExecution(subTasks, team)
      console.log(`✅ Team execution completed, ${results.length} results`)

      // Step 5: Validate overall completion
      const validationResults = await Promise.all(
        subTasks.map((task) => this.validateTaskCompletion(task)),
      )

      const failedValidations = validationResults.filter(
        (v) => !v.validation_passed,
      )

      if (failedValidations.length > 0) {
        console.log(
          '🔄 Some tasks failed validation, creating refinement cycle',
        )
        await this.handleValidationFailures(subTasks, failedValidations, team)
      }

      // Step 6: Validate and update requirements for all tasks
      const { validateAndUpdateRequirements, markRequirementSatisfied } =
        useTaskStore.getState()
      console.log('🔍 Validating individual requirements for all tasks...')

      // Validate requirements for main task and subtasks
      for (const task of [mainTask, ...subTasks]) {
        const requirementValidation = await validateAndUpdateRequirements(
          task.id,
        )
        console.log(
          `📋 Task ${task.id} requirement validation: ${requirementValidation.satisfactionRate}% satisfied`,
        )

        // Mark individual requirements as satisfied if they passed validation
        for (const result of requirementValidation.results) {
          if (result.status === 'satisfied') {
            await markRequirementSatisfied(
              task.id,
              result.requirementId,
              result.evidence,
            )
          }
        }
      }

      // Step 7: Mark main task complete
      const taskStoreForUpdate = useTaskStore.getState()
      await taskStoreForUpdate.updateTask(mainTask.id, {
        status: 'completed',
        actualPasses: analysis.estimatedPasses,
        completedAt: new Date(), // Track when the task was completed
      })

      const allArtifacts = await Promise.all(
        [mainTask, ...subTasks].map((task) =>
          ArtifactManager.getArtifactsByTask(task.id),
        ),
      )
      const artifacts = allArtifacts.flat()

      return {
        success: true,
        workflowId,
        mainTaskId: mainTask.id,
        subTaskIds: subTasks.map((t) => t.id),
        artifacts,
      }
    } catch (error) {
      console.error('❌ Multi-pass execution failed:', error)

      return {
        success: false,
        workflowId,
        mainTaskId: '',
        subTaskIds: [],
        artifacts: [],
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      }
    }
  }

  private static async buildTeam(
    suggestedAgents: AgentSpec[],
  ): Promise<Agent[]> {
    console.log('👥 Building team of agents')

    const team: Agent[] = []
    const allAgents = await loadAllAgents()

    for (const spec of suggestedAgents) {
      // First, try to find existing agent with matching skills
      const existingAgent = allAgents.find(
        (agent) =>
          agent.tags?.some((tag) => spec.requiredSkills.includes(tag)) ||
          spec.requiredSkills.some(
            (skill) =>
              agent.role.toLowerCase().includes(skill.toLowerCase()) ||
              agent.instructions.toLowerCase().includes(skill.toLowerCase()),
          ),
      )

      if (existingAgent) {
        console.log(`✅ Found existing agent: ${existingAgent.name}`)
        team.push(existingAgent)
      } else {
        // Create new agent using agent-recruiter
        console.log(`🆕 Recruiting new agent: ${spec.name}`)
        const newAgent = await this.recruitAgent(spec)
        team.push(newAgent)
      }
    }

    return team
  }

  private static async recruitAgent(spec: AgentSpec): Promise<Agent> {
    try {
      const recruiter = await getAgentById(this.AGENT_RECRUITER_ID)
      if (!recruiter) {
        console.warn('Agent recruiter not found, creating basic agent')
        // Fallback: create basic agent directly
        return await createAgent({
          name: spec.name,
          role: spec.role,
          instructions: `You are a ${spec.role} with expertise in ${spec.requiredSkills.join(', ')}. ${spec.specialization}`,
          temperature: 0.7,
          tags: spec.requiredSkills,
        })
      }

      const config = await CredentialService.getActiveConfig()
      if (!config) {
        throw new Error('No LLM provider configured')
      }

      const messages: LLMMessage[] = [
        {
          role: 'system',
          content: recruiter.instructions,
        },
        {
          role: 'user',
          content: `Create an agent profile for: ${JSON.stringify(spec, null, 2)}`,
        },
      ]

      let response = ''
      for await (const chunk of LLMService.streamChat(messages, config)) {
        response += chunk
      }

      // Parse JSON response from recruiter
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('Invalid response from agent recruiter')
      }

      const agentProfile = JSON.parse(jsonMatch[0])

      // Create the agent
      const newAgent = await createAgent({
        name: agentProfile.name,
        role: agentProfile.role,
        instructions: agentProfile.instructions,
        temperature: 0.7,
        tags: spec.requiredSkills,
      })

      console.log(`✅ Successfully recruited agent: ${newAgent.name}`)
      return newAgent
    } catch (error) {
      console.error('❌ Failed to recruit agent:', error)

      // Fallback: create basic agent
      return await createAgent({
        name: spec.name,
        role: spec.role,
        instructions: `You are a ${spec.role} with expertise in ${spec.requiredSkills.join(', ')}. ${spec.specialization}`,
        temperature: 0.7,
        tags: spec.requiredSkills,
      })
    }
  }

  private static async coordinateTeamExecution(
    tasks: Task[],
    team: Agent[],
  ): Promise<ExecutionResult[]> {
    console.log('🎭 Coordinating team execution')

    const results: ExecutionResult[] = []

    // Execute tasks based on dependencies
    const executedTasks = new Set<string>()

    while (executedTasks.size < tasks.length) {
      const readyTasks = tasks.filter(
        (task) =>
          !executedTasks.has(task.id) &&
          task.dependencies.every((depId) => executedTasks.has(depId)),
      )

      if (readyTasks.length === 0) {
        throw new Error(
          'Circular dependency detected or no tasks ready for execution',
        )
      }

      // Execute ready tasks in parallel (up to team size)
      const batch = readyTasks.slice(0, team.length)
      const batchPromises = batch.map(async (task, index) => {
        const agent = team[index % team.length]
        return this.executeTaskWithAgent(task, agent, task.description)
      })

      const batchResults = await Promise.all(batchPromises)
      results.push(...batchResults)

      batch.forEach((task) => executedTasks.add(task.id))
    }

    return results
  }

  private static async executeTaskWithAgent(
    task: Task,
    agent: Agent,
    prompt: string,
  ): Promise<ExecutionResult> {
    console.log(`🤖 Agent ${agent.name} executing task: ${task.title}`)

    try {
      // Update task status
      const { updateTask } = useTaskStore.getState()
      await updateTask(task.id, {
        status: 'in_progress',
        assignedAgentId: agent.id,
        assignedAt: new Date(), // Track when the agent was assigned
      })

      // Get relevant context for agent
      const relevantContext = await ContextBroker.getRelevantContexts(
        agent.id,
        TaskAnalyzer.extractKeywords(prompt),
      )

      // Create conversation
      const { createConversation, addMessage } = useConversationStore.getState()
      const conversation = await createConversation(agent.id, task.workflowId)

      // Prepare enhanced prompt with context
      const enhancedPrompt = this.buildEnhancedPrompt(
        prompt,
        task,
        relevantContext,
      )

      // Save the enhanced task prompt as user message in the agent's conversation
      await addMessage(conversation.id, {
        role: 'user',
        content: enhancedPrompt,
      })

      const config = await CredentialService.getActiveConfig()
      if (!config) {
        throw new Error('No LLM provider configured')
      }

      // Get knowledge attachments for the agent
      const knowledgeAttachments = await getKnowledgeAttachments(
        agent.knowledgeItemIds,
      )

      // Build enhanced instructions with knowledge context
      const baseInstructions =
        agent.instructions || 'You are a helpful AI assistant.'
      const enhancedInstructions = await buildAgentInstructions(
        baseInstructions,
        agent.knowledgeItemIds,
      )

      const messages: LLMMessage[] = [
        {
          role: 'system',
          content:
            enhancedInstructions +
            `\n\nYou are working on task: ${task.title}\n\nTask requirements: ${task.requirements.map((r) => r.description).join(', ')}`,
        },
        {
          role: 'user',
          content: enhancedPrompt,
          attachments: [
            ...this.convertTaskAttachments(task.attachments),
            ...knowledgeAttachments,
          ].filter(Boolean),
        },
      ]

      let response = ''
      for await (const chunk of LLMService.streamChat(messages, config)) {
        response += chunk
      }

      await addMessage(conversation.id, {
        role: 'assistant',
        content: response,
        agentId: agent.id,
      })

      const artifactTitle = `${task.title} - Deliverable`

      const artifactDescription = `Output from ${agent.name} for task: ${task.title}`

      // Create artifact from response
      const artifact = await ArtifactManager.createArtifact({
        taskId: task.id,
        agentId: agent.id,
        title: artifactTitle,
        description: artifactDescription,
        type: this.inferArtifactType(response, task),
        format: 'markdown',
        content: response,
        version: 1,
        status: 'final', // Mark as final for creative works
        dependencies: [],
        validates: task.requirements.map((r) => r.id),
        reviewedBy: [],
      })

      // Publish context about this execution
      await ContextBroker.publishContext({
        taskId: task.id,
        agentId: agent.id,
        contextType: 'finding',
        title: `Task completion: ${task.title}`,
        content: `Agent ${agent.name} completed task with artifact: ${artifact.title}`,
        relevantAgents: [agent.id],
        expiryDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      })

      return {
        success: true,
        artifacts: [artifact],
        context: [],
        nextTasks: [],
      }
    } catch (error) {
      console.error(`❌ Agent ${agent.name} failed to execute task:`, error)

      const { updateTask } = useTaskStore.getState()
      await updateTask(task.id, { status: 'failed' })

      return {
        success: false,
        artifacts: [],
        context: [],
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      }
    }
  }

  private static async validateTaskCompletion(
    task: Task,
  ): Promise<{ validation_passed: boolean; reason: string }> {
    try {
      const validator = await getAgentById(this.VALIDATOR_AGENT_ID)
      if (!validator) {
        console.warn('Validator agent not found, skipping validation')
        return { validation_passed: true, reason: 'Validator not available' }
      }

      const artifacts = await ArtifactManager.getArtifactsByTask(task.id)
      const config = await CredentialService.getActiveConfig()
      if (!config) {
        throw new Error('No LLM provider configured')
      }

      const validationPrompt = `
Task: ${task.title}
Description: ${task.description}
Requirements: ${task.requirements.map((r) => `${r.type}: ${r.description} (Priority: ${r.priority})`).join('\n')}

Deliverables:
${artifacts.map((a) => `- ${a.title}: ${a.description}\nContent: ${a.content.substring(0, 500)}...`).join('\n')}

Please validate if all requirements are met by the deliverables.
`

      const messages: LLMMessage[] = [
        {
          role: 'system',
          content: validator.instructions,
        },
        {
          role: 'user',
          content: validationPrompt,
          attachments: this.convertTaskAttachments(task.attachments),
        },
      ]

      let response = ''
      for await (const chunk of LLMService.streamChat(messages, config)) {
        response += chunk
      }

      // Parse validator response
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }

      // Fallback if no JSON found
      return {
        validation_passed:
          response.toLowerCase().includes('true') ||
          response.toLowerCase().includes('passed'),
        reason: response,
      }
    } catch (error) {
      console.error('❌ Validation failed:', error)
      return {
        validation_passed: false,
        reason: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }
    }
  }

  private static async createRefinementTask(
    originalTask: Task,
    failureReason: string,
  ): Promise<Task> {
    const { createTask } = useTaskStore.getState()

    return await createTask({
      workflowId: originalTask.workflowId,
      title: `Refinement: ${originalTask.title}`,
      description: `Address validation issues: ${failureReason}`,
      complexity: 'simple',
      status: 'pending',
      assignedAgentId: originalTask.assignedAgentId,
      parentTaskId: originalTask.id,
      dependencies: [originalTask.id],
      requirements: originalTask.requirements.filter(
        (r) => r.status !== 'satisfied',
      ),
      artifacts: [],
      steps: [],
      estimatedPasses: 1,
      actualPasses: 0,
      dueDate: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
    })
  }

  private static async handleValidationFailures(
    tasks: Task[],
    failures: { validation_passed: boolean; reason: string }[],
    team: Agent[],
  ): Promise<void> {
    for (let i = 0; i < failures.length; i++) {
      if (!failures[i].validation_passed) {
        const task = tasks[i]
        const refinementTask = await this.createRefinementTask(
          task,
          failures[i].reason,
        )
        const assignedAgent =
          team.find((agent) => agent.id === task.assignedAgentId) || team[0]

        await this.executeTaskWithAgent(
          refinementTask,
          assignedAgent,
          refinementTask.description,
        )
      }
    }
  }

  private static async findOrCreateAgent(spec: AgentSpec): Promise<Agent> {
    const allAgents = await loadAllAgents()

    // First, try to find existing agent with matching skills
    const existingAgent = allAgents.find(
      (agent) =>
        agent.tags?.some((tag) => spec.requiredSkills.includes(tag)) ||
        spec.requiredSkills.some(
          (skill) =>
            agent.role.toLowerCase().includes(skill.toLowerCase()) ||
            agent.instructions.toLowerCase().includes(skill.toLowerCase()),
        ),
    )

    if (existingAgent) {
      console.log(`✅ Found existing agent: ${existingAgent.name}`)
      return existingAgent
    } else {
      // Create new agent using recruiter or fallback
      console.log(`🆕 Creating new agent: ${spec.name}`)
      return await this.recruitAgent(spec)
    }
  }

  private static buildEnhancedPrompt(
    originalPrompt: string,
    task: Task,
    context: SharedContext[],
  ): string {
    let enhanced = originalPrompt

    if (context.length > 0) {
      enhanced += '\n\n## Relevant Context:\n'
      context.forEach((ctx) => {
        enhanced += `- ${ctx.title}: ${ctx.content}\n`
      })
    }

    if (task.attachments && task.attachments.length > 0) {
      enhanced += '\n\n## Attached Files:\n'
      task.attachments.forEach((attachment) => {
        enhanced += `- ${attachment.name} (${attachment.type}, ${Math.round(attachment.size / 1024)}KB)\n`
      })
      enhanced +=
        '\nPlease analyze and reference these attached files in your response as needed.\n'
    }

    enhanced += `\n\n## Task Requirements:\n`
    task.requirements.forEach((req) => {
      enhanced += `- ${req.type} (${req.priority}): ${req.description}\n`
    })

    enhanced += `\n\nPlease provide your deliverable in markdown format. Be thorough and ensure all requirements are addressed.`

    return enhanced
  }

  private static inferArtifactType(
    response: string,
    _task: Task,
  ): Artifact['type'] {
    const lowerResponse = response.toLowerCase()

    if (
      lowerResponse.includes('```') ||
      lowerResponse.includes('function') ||
      lowerResponse.includes('class')
    ) {
      return 'code'
    }

    if (
      lowerResponse.includes('analysis') ||
      lowerResponse.includes('findings') ||
      lowerResponse.includes('data')
    ) {
      return 'analysis'
    }

    if (
      lowerResponse.includes('design') ||
      lowerResponse.includes('architecture') ||
      lowerResponse.includes('diagram')
    ) {
      return 'design'
    }

    if (
      lowerResponse.includes('plan') ||
      lowerResponse.includes('steps') ||
      lowerResponse.includes('roadmap')
    ) {
      return 'plan'
    }

    if (
      lowerResponse.includes('report') ||
      lowerResponse.includes('summary') ||
      lowerResponse.includes('conclusion')
    ) {
      return 'report'
    }

    return 'document'
  }
}
