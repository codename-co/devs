---
name: orchestration-workflow
description: Guide for working with the multi-agent orchestration system in DEVS. Use this when asked to modify task orchestration, agent coordination, or workflow execution.
---

# Orchestration Workflow for DEVS

The DEVS orchestration system coordinates multiple AI agents to complete complex tasks autonomously.

## Architecture Overview

```
User Request → WorkflowOrchestrator → TaskAnalyzer → Agent Execution → Validation
                     ↓
              Strategy Selection
              (single-pass / multi-pass)
                     ↓
              Team Building → Coordinated Execution → Artifact Creation
```

## Core Components

### WorkflowOrchestrator (`src/lib/orchestrator.ts`)

Central coordination hub that:

- Prevents duplicate processing via prompt hashing
- Selects execution strategy based on complexity
- Manages agent recruitment and team building
- Handles error recovery and retries

### TaskAnalyzer (`src/lib/task-analyzer.ts`)

LLM-powered analysis that:

- Breaks down complex prompts into requirements
- Assesses task complexity (simple/complex)
- Identifies required skills
- Generates subtasks with dependencies

### RequirementValidator (`src/lib/requirement-validator.ts`)

Validates task deliverables against requirements:

- Functional requirements (feature implementation)
- Non-functional requirements (performance, usability)
- Constraints (technology, time, resources)

## Execution Strategies

### Single-Pass Strategy

For simple tasks that one agent can complete:

```typescript
async function executeSinglePass(task: Task, agent: Agent): Promise<void> {
  // 1. Execute with enhanced context
  const result = await executeTaskWithAgent(task, agent, task.description)

  // 2. Create artifact from result
  await createArtifact({
    taskId: task.id,
    agentId: agent.id,
    type: 'deliverable',
    content: result,
  })

  // 3. Validate against requirements
  const validation = await validateRequirements(task, [artifact])

  // 4. Handle validation failures
  if (!validation.allSatisfied) {
    await createRefinementTask(task, validation.failures)
  }
}
```

### Multi-Pass Strategy

For complex tasks requiring multiple agents:

```typescript
async function executeMultiPass(task: Task): Promise<void> {
  // 1. Break down into subtasks
  const subtasks = await taskAnalyzer.breakdown(task)

  // 2. Build specialized team
  const team = await buildTeam(subtasks)

  // 3. Execute with dependency resolution
  await coordinateTeamExecution(subtasks, team)

  // 4. Validate all deliverables
  const validation = await validateAllRequirements(task, subtasks)
}
```

## Team Coordination

```typescript
async function coordinateTeamExecution(
  tasks: Task[],
  team: Agent[],
): Promise<void> {
  const executedTasks = new Set<string>()

  while (executedTasks.size < tasks.length) {
    // Find tasks with satisfied dependencies
    const readyTasks = tasks.filter(
      (task) =>
        !executedTasks.has(task.id) &&
        task.dependencies.every((depId) => executedTasks.has(depId)),
    )

    // Execute in parallel batches
    const batch = readyTasks.slice(0, team.length)
    await Promise.all(
      batch.map((task, index) => {
        const agent = team[index % team.length]
        return executeTaskWithAgent(task, agent, task.description)
      }),
    )

    batch.forEach((task) => executedTasks.add(task.id))
  }
}
```

## Context Sharing

The ContextBroker enables inter-agent communication:

```typescript
import { ContextBroker } from '@/lib/context-broker'

// Agent publishes context
await ContextBroker.publish({
  type: 'finding',
  agentId: agent.id,
  content: 'Discovered that the API requires authentication',
  keywords: ['api', 'authentication', 'security'],
})

// Another agent retrieves relevant context
const relevantContext = await ContextBroker.getRelevant(['api', 'design'])
```

## Task States

```typescript
type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'failed'
```

State transitions:

- `pending` → `in_progress` (when assigned to agent)
- `in_progress` → `completed` (when validated successfully)
- `in_progress` → `failed` (when validation fails after retries)
- `failed` → `in_progress` (when retry initiated)

## Requirement Types

```typescript
interface Requirement {
  id: string
  type: 'functional' | 'non-functional' | 'constraint'
  description: string
  priority: 'must' | 'should' | 'could' | 'wont'
  source: 'explicit' | 'implicit' | 'inferred'
  validationStatus?: 'satisfied' | 'pending' | 'failed'
  evidence?: string[]
}
```

## Creating Custom Orchestration Logic

When extending orchestration:

```typescript
import { WorkflowOrchestrator } from '@/lib/orchestrator'
import { TaskAnalyzer } from '@/lib/task-analyzer'
import { getAgentById, createAgent } from '@/stores/agentStore'

async function customOrchestration(prompt: string): Promise<void> {
  // 1. Analyze the task
  const analysis = await TaskAnalyzer.analyze(prompt)

  // 2. Find or create suitable agent
  let agent = await findAgentWithSkills(analysis.requiredSkills)
  if (!agent) {
    agent = await createAgent({
      name: 'Dynamic Agent',
      role: analysis.suggestedRole,
      instructions: analysis.suggestedInstructions,
    })
  }

  // 3. Create task with requirements
  const task = await createTask({
    title: analysis.title,
    description: prompt,
    complexity: analysis.complexity,
    requirements: analysis.requirements,
    assignedAgentId: agent.id,
  })

  // 4. Execute based on complexity
  if (analysis.complexity === 'simple') {
    await executeSinglePass(task, agent)
  } else {
    await executeMultiPass(task)
  }
}
```

## Error Handling

The orchestrator implements multi-level error handling:

1. **Orchestration Level**: Duplicate prevention, graceful degradation
2. **Validation Level**: Automatic refinement tasks on failure
3. **Agent Level**: Fallback agent creation when recruitment fails
4. **Network Level**: LLM provider fallbacks, timeout handling

```typescript
try {
  await orchestrator.execute(prompt)
} catch (error) {
  if (error instanceof DuplicatePromptError) {
    // Already processing this prompt
    return existingWorkflow
  }
  if (error instanceof AgentNotFoundError) {
    // Create fallback agent
    const fallbackAgent = await createFallbackAgent(requiredSkills)
    await orchestrator.execute(prompt, fallbackAgent)
  }
  // Log and notify user
  console.error('Orchestration failed:', error)
  toast.error('Task execution failed. Please try again.')
}
```

## Testing Orchestration

```typescript
import { describe, it, expect, vi } from 'vitest'
import { WorkflowOrchestrator } from '@/lib/orchestrator'

vi.mock('@/lib/llm')
vi.mock('@/stores/agentStore')
vi.mock('@/stores/taskStore')

describe('WorkflowOrchestrator', () => {
  it('should select single-pass for simple tasks', async () => {
    const result = await WorkflowOrchestrator.analyze('Write a hello world')
    expect(result.strategy).toBe('single-pass')
  })

  it('should build team for complex tasks', async () => {
    const result = await WorkflowOrchestrator.analyze(
      'Build a complete e-commerce platform',
    )
    expect(result.strategy).toBe('multi-pass')
    expect(result.requiredAgents.length).toBeGreaterThan(1)
  })
})
```
