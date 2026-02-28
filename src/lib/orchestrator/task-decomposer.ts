/**
 * LLM-Driven Task Decomposer
 *
 * Replaces the hardcoded keyword-based task breakdown with intelligent,
 * LLM-powered decomposition that produces:
 * - A dependency graph (not flat lists) with explicit edges
 * - Input/output contracts between tasks
 * - Parallelization hints
 * - Model recommendations per sub-task
 *
 * Inspired by: Manus Wide Research decomposition, Claude Code planning.
 *
 * @module lib/orchestrator/task-decomposer
 */

import { LLMService, LLMMessage } from '@/lib/llm'
import { CredentialService } from '@/lib/credential-service'
import type {
  Requirement,
  AgentSpec,
  TaskIOContract,
  TaskExecutionMode,
} from '@/types'
import type { TaskAnalysisResult } from '@/lib/task-analyzer'

// ============================================================================
// Types
// ============================================================================

export interface DecomposedTask {
  /** Temporary ID for referencing in the dependency graph */
  tempId: string
  title: string
  description: string
  complexity: 'simple' | 'complex'
  /** Which tempIds this task depends on */
  dependsOn: string[]
  /** Can this task run in parallel with siblings that share no dependencies? */
  parallelizable: boolean
  /** Input/output contract */
  ioContract: TaskIOContract
  /** Suggested execution mode */
  executionMode: TaskExecutionMode
  /** Model hint for cost optimization */
  modelHint: 'fast' | 'balanced' | 'powerful'
  /** Requirements specific to this sub-task */
  requirements: Pick<Requirement, 'type' | 'description' | 'priority'>[]
  /** Suggested agent spec */
  suggestedAgent: Pick<
    AgentSpec,
    'name' | 'role' | 'requiredSkills' | 'specialization' | 'scope'
  >
}

export interface TaskDecomposition {
  /** The main task description */
  mainTaskTitle: string
  mainTaskDescription: string
  /** Decomposed sub-tasks with dependency graph */
  subTasks: DecomposedTask[]
  /** Whether a final synthesis step is needed */
  requiresSynthesis: boolean
  /** Strategy recommendation */
  strategy:
    | 'single_agent'
    | 'sequential_agents'
    | 'parallel_agents'
    | 'parallel_isolated'
    | 'iterative_deep'
  /** Estimated total duration in minutes */
  estimatedDuration: number
}

// ============================================================================
// Decomposition Prompt
// ============================================================================

const DECOMPOSITION_PROMPT = `You are an expert task decomposition engine. Given a user's request, you break it down into an optimal set of sub-tasks with clear dependency relationships.

IMPORTANT: Respond with ONLY valid JSON. No explanations, no markdown formatting, just pure JSON.

## Principles
1. **Fresh context per agent**: Each sub-task will be executed by an independent agent with its own context window. Design tasks so each can be understood independently.
2. **Explicit dependencies**: If task B needs output from task A, declare it. Don't assume shared context.
3. **Maximize parallelism**: Tasks that don't depend on each other should be parallelizable.
4. **Input/output contracts**: Each task should clearly state what it needs (inputs) and what it produces (outputs).
5. **Right-size model selection**: Use 'fast' for simple lookup/filtering, 'balanced' for most work, 'powerful' for synthesis/creative.
6. **Synthesis step**: If multiple parallel tasks produce independent results, add a synthesis task that merges them.

## JSON Response Schema

{
  "mainTaskTitle": "string — concise title for the overall task",
  "mainTaskDescription": "string — expanded description",
  "subTasks": [
    {
      "tempId": "string — e.g. 'research', 'analyze', 'write', 'synthesize'",
      "title": "string — concise task title",
      "description": "string — self-contained description with all necessary context. The agent executing this will NOT see the original prompt, only this description.",
      "complexity": "simple | complex",
      "dependsOn": ["tempId of dependency"],
      "parallelizable": true,
      "ioContract": {
        "inputs": [{"taskId": "tempId", "description": "what is needed from that task"}],
        "outputs": [{"key": "output_name", "description": "what this task produces"}]
      },
      "executionMode": "single-shot | iterative",
      "modelHint": "fast | balanced | powerful",
      "requirements": [
        {"type": "functional | non_functional | constraint", "description": "string", "priority": "must | should | could"}
      ],
      "suggestedAgent": {
        "name": "Agent Name",
        "role": "Agent Role",
        "requiredSkills": ["skill1"],
        "specialization": "Specific expertise"
      }
    }
  ],
  "requiresSynthesis": true,
  "strategy": "parallel_agents | sequential_agents | parallel_isolated | iterative_deep | single_agent",
  "estimatedDuration": 30
}

## Strategy Selection Guide
- **single_agent**: Simple tasks, one agent suffices
- **sequential_agents**: Tasks form a strict pipeline (A → B → C)
- **parallel_agents**: Some tasks can run in parallel with dependency resolution
- **parallel_isolated**: Many independent research/analysis tasks (Manus Wide Research pattern) — best for tasks that benefit from multiple independent perspectives
- **iterative_deep**: Deep research requiring iterative search→read→reason loops (Perplexity Research Mode pattern)

User Request: {prompt}

Analysis Context: {analysis}`

// ============================================================================
// Public API
// ============================================================================

/**
 * Decomposes a user prompt into an optimal set of sub-tasks using LLM reasoning.
 * Falls back to heuristic decomposition if LLM fails.
 */
export async function decomposeTask(
  prompt: string,
  analysis: TaskAnalysisResult,
): Promise<TaskDecomposition> {
  try {
    const config = await CredentialService.getActiveConfig()
    if (!config) {
      throw new Error('No AI provider configured')
    }

    const filledPrompt = DECOMPOSITION_PROMPT.replace(
      '{prompt}',
      prompt,
    ).replace(
      '{analysis}',
      JSON.stringify(
        {
          complexity: analysis.complexity,
          requiredSkills: analysis.requiredSkills,
          requirements: analysis.requirements.map((r) => ({
            type: r.type,
            description: r.description,
            priority: r.priority,
          })),
          suggestedAgents: analysis.suggestedAgents,
        },
        null,
        2,
      ),
    )

    const messages: LLMMessage[] = [
      { role: 'system', content: filledPrompt },
      { role: 'user', content: prompt },
    ]

    const response = await LLMService.chat(messages, config)
    const parsed = parseDecompositionResponse(response.content)

    if (parsed) {
      // Validate the decomposition
      validateDecomposition(parsed)
      return parsed
    }

    // Fallback to heuristic
    console.warn(
      '⚠️ LLM decomposition failed to parse, using heuristic fallback',
    )
    return heuristicDecomposition(prompt, analysis)
  } catch (error) {
    console.error('❌ Task decomposition failed:', error)
    return heuristicDecomposition(prompt, analysis)
  }
}

// ============================================================================
// Response Parsing
// ============================================================================

function parseDecompositionResponse(
  response: string,
): TaskDecomposition | null {
  try {
    // Try direct JSON parse
    const cleaned = response.trim()
    let jsonStr = cleaned

    // Extract JSON from code blocks if present
    const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1]
    } else {
      // Try to find JSON object
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        jsonStr = jsonMatch[0]
      }
    }

    // Clean common JSON issues
    jsonStr = jsonStr.replace(/,(\s*[}\]])/g, '$1') // trailing commas

    const parsed = JSON.parse(jsonStr) as TaskDecomposition

    // Basic validation
    if (!parsed.subTasks || !Array.isArray(parsed.subTasks)) {
      return null
    }

    return parsed
  } catch (error) {
    console.error('JSON parsing error in decomposition:', error)
    return null
  }
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Validates the decomposition for structural correctness:
 * - No circular dependencies
 * - All dependency references are valid
 * - At least one task
 */
function validateDecomposition(decomposition: TaskDecomposition): void {
  const taskIds = new Set(decomposition.subTasks.map((t) => t.tempId))

  // Check all dependencies reference valid tasks
  for (const task of decomposition.subTasks) {
    for (const dep of task.dependsOn) {
      if (!taskIds.has(dep)) {
        throw new Error(
          `Task "${task.tempId}" depends on unknown task "${dep}"`,
        )
      }
    }
  }

  // Check for circular dependencies using topological sort
  const visited = new Set<string>()
  const visiting = new Set<string>()

  function visit(taskId: string): void {
    if (visiting.has(taskId)) {
      throw new Error(`Circular dependency detected involving task "${taskId}"`)
    }
    if (visited.has(taskId)) return

    visiting.add(taskId)
    const task = decomposition.subTasks.find((t) => t.tempId === taskId)
    if (task) {
      for (const dep of task.dependsOn) {
        visit(dep)
      }
    }
    visiting.delete(taskId)
    visited.add(taskId)
  }

  for (const task of decomposition.subTasks) {
    visit(task.tempId)
  }
}

// ============================================================================
// Heuristic Fallback
// ============================================================================

/**
 * Fallback decomposition when LLM fails.
 * Uses domain-aware heuristics (improved from original keyword matching).
 */
function heuristicDecomposition(
  prompt: string,
  analysis: TaskAnalysisResult,
): TaskDecomposition {
  const lowerPrompt = prompt.toLowerCase()

  // Detect task domain
  const isResearch = /research|analyze|compare|review|investigate|study/.test(
    lowerPrompt,
  )
  const isCreative =
    /write|create|compose|design|draft|story|novel|article|essay/.test(
      lowerPrompt,
    )
  const isDevelopment = /implement|develop|build|code|program|deploy|test/.test(
    lowerPrompt,
  )
  const isAnalysis = /analyze|evaluate|assess|audit|benchmark/.test(lowerPrompt)

  if (isResearch) {
    return buildResearchDecomposition(prompt, analysis)
  } else if (isCreative) {
    return buildCreativeDecomposition(prompt, analysis)
  } else if (isDevelopment) {
    return buildDevelopmentDecomposition(prompt, analysis)
  } else if (isAnalysis) {
    return buildAnalysisDecomposition(prompt, analysis)
  }

  return buildGenericDecomposition(prompt, analysis)
}

function buildResearchDecomposition(
  prompt: string,
  analysis: TaskAnalysisResult,
): TaskDecomposition {
  return {
    mainTaskTitle: extractTitle(prompt),
    mainTaskDescription: prompt,
    subTasks: [
      {
        tempId: 'research',
        title: 'Research & Information Gathering',
        description: `Conduct thorough research on the following topic. Gather key facts, data, and perspectives.\n\nTopic: ${prompt}`,
        complexity: 'complex',
        dependsOn: [],
        parallelizable: true,
        ioContract: {
          outputs: [
            {
              key: 'research_findings',
              description: 'Comprehensive research findings',
            },
          ],
        },
        executionMode: 'iterative',
        modelHint: 'balanced',
        requirements: analysis.requirements
          .filter((r) => r.type === 'functional')
          .map((r) => ({
            type: r.type,
            description: r.description,
            priority: r.priority,
          })),
        suggestedAgent: {
          name: 'Researcher',
          role: 'Research Analyst',
          requiredSkills: ['research', 'analysis'],
          specialization: 'Information gathering and synthesis',
        },
      },
      {
        tempId: 'analyze',
        title: 'Analysis & Evaluation',
        description: `Analyze the research findings. Identify patterns, draw conclusions, and evaluate the evidence.`,
        complexity: 'simple',
        dependsOn: ['research'],
        parallelizable: false,
        ioContract: {
          inputs: [
            { taskId: 'research', description: 'Research findings to analyze' },
          ],
          outputs: [
            {
              key: 'analysis_results',
              description: 'Analyzed conclusions and insights',
            },
          ],
        },
        executionMode: 'iterative',
        modelHint: 'powerful',
        requirements: analysis.requirements
          .filter((r) => r.type === 'non_functional')
          .map((r) => ({
            type: r.type,
            description: r.description,
            priority: r.priority,
          })),
        suggestedAgent: {
          name: 'Analyst',
          role: 'Domain Analyst',
          requiredSkills: ['analysis', 'critical-thinking'],
          specialization: 'Data analysis and evaluation',
        },
      },
      {
        tempId: 'synthesize',
        title: 'Synthesis & Report',
        description: `Synthesize all research and analysis into a comprehensive, well-structured report.`,
        complexity: 'simple',
        dependsOn: ['analyze'],
        parallelizable: false,
        ioContract: {
          inputs: [
            {
              taskId: 'analyze',
              description: 'Analysis results to synthesize',
            },
          ],
          outputs: [
            { key: 'final_report', description: 'Final synthesized report' },
          ],
        },
        executionMode: 'single-shot',
        modelHint: 'powerful',
        requirements: [],
        suggestedAgent: {
          name: 'Writer',
          role: 'Report Writer',
          requiredSkills: ['writing', 'synthesis'],
          specialization: 'Report creation and formatting',
        },
      },
    ],
    requiresSynthesis: false, // synthesis is already a task
    strategy: 'sequential_agents',
    estimatedDuration: analysis.estimatedDuration,
  }
}

function buildCreativeDecomposition(
  prompt: string,
  analysis: TaskAnalysisResult,
): TaskDecomposition {
  return {
    mainTaskTitle: extractTitle(prompt),
    mainTaskDescription: prompt,
    subTasks: [
      {
        tempId: 'plan',
        title: 'Creative Planning & Outline',
        description: `Create a detailed plan and outline for the following creative work. Include structure, key themes, tone, and style decisions.\n\nRequest: ${prompt}`,
        complexity: 'simple',
        dependsOn: [],
        parallelizable: false,
        ioContract: {
          outputs: [
            { key: 'creative_plan', description: 'Outline and creative plan' },
          ],
        },
        executionMode: 'iterative',
        modelHint: 'balanced',
        requirements: analysis.requirements
          .filter((r) => r.type === 'constraint')
          .map((r) => ({
            type: r.type,
            description: r.description,
            priority: r.priority,
          })),
        suggestedAgent: {
          name: 'Creative Director',
          role: 'Creative Planner',
          requiredSkills: ['planning', 'creativity'],
          specialization: 'Creative direction and planning',
        },
      },
      {
        tempId: 'create',
        title: 'Content Creation',
        description: `Execute the creative work based on the provided plan. Focus on quality, originality, and adherence to the plan.`,
        complexity: 'complex',
        dependsOn: ['plan'],
        parallelizable: false,
        ioContract: {
          inputs: [{ taskId: 'plan', description: 'Creative plan to execute' }],
          outputs: [
            { key: 'draft_content', description: 'Draft creative content' },
          ],
        },
        executionMode: 'iterative',
        modelHint: 'powerful',
        requirements: analysis.requirements
          .filter((r) => r.type === 'functional')
          .map((r) => ({
            type: r.type,
            description: r.description,
            priority: r.priority,
          })),
        suggestedAgent: {
          name: 'Writer',
          role: 'Content Creator',
          requiredSkills: ['writing', 'creativity'],
          specialization: 'Creative content production',
        },
      },
      {
        tempId: 'refine',
        title: 'Review & Polish',
        description: `Review the draft content for quality, coherence, and completeness. Polish and refine.`,
        complexity: 'simple',
        dependsOn: ['create'],
        parallelizable: false,
        ioContract: {
          inputs: [
            {
              taskId: 'create',
              description: 'Draft content to review and polish',
            },
          ],
          outputs: [
            { key: 'final_content', description: 'Polished final content' },
          ],
        },
        executionMode: 'single-shot',
        modelHint: 'powerful',
        requirements: [],
        suggestedAgent: {
          name: 'Editor',
          role: 'Content Editor',
          requiredSkills: ['editing', 'quality-assurance'],
          specialization: 'Content review and refinement',
        },
      },
    ],
    requiresSynthesis: false,
    strategy: 'sequential_agents',
    estimatedDuration: analysis.estimatedDuration,
  }
}

function buildDevelopmentDecomposition(
  prompt: string,
  analysis: TaskAnalysisResult,
): TaskDecomposition {
  return {
    mainTaskTitle: extractTitle(prompt),
    mainTaskDescription: prompt,
    subTasks: [
      {
        tempId: 'design',
        title: 'Technical Analysis & Design',
        description: `Analyze requirements and create a technical design for: ${prompt}\n\nConsider architecture, data models, APIs, and implementation approach.`,
        complexity: 'simple',
        dependsOn: [],
        parallelizable: false,
        ioContract: {
          outputs: [
            {
              key: 'technical_design',
              description: 'Technical design document',
            },
          ],
        },
        executionMode: 'iterative',
        modelHint: 'balanced',
        requirements: analysis.requirements
          .filter((r) => r.type === 'functional')
          .map((r) => ({
            type: r.type,
            description: r.description,
            priority: r.priority,
          })),
        suggestedAgent: {
          name: 'Architect',
          role: 'Technical Architect',
          requiredSkills: ['architecture', 'design'],
          specialization: 'System design and technical planning',
        },
      },
      {
        tempId: 'implement',
        title: 'Implementation',
        description: `Implement the solution based on the technical design. Write clean, well-documented code.`,
        complexity: 'complex',
        dependsOn: ['design'],
        parallelizable: false,
        ioContract: {
          inputs: [
            { taskId: 'design', description: 'Technical design to implement' },
          ],
          outputs: [
            {
              key: 'implementation',
              description: 'Implemented code and documentation',
            },
          ],
        },
        executionMode: 'iterative',
        modelHint: 'powerful',
        requirements: analysis.requirements.map((r) => ({
          type: r.type,
          description: r.description,
          priority: r.priority,
        })),
        suggestedAgent: {
          name: 'Developer',
          role: 'Software Developer',
          requiredSkills: ['coding', 'testing'],
          specialization: 'Software implementation',
        },
      },
      {
        tempId: 'review',
        title: 'Code Review & Testing',
        description: `Review the implementation for quality, correctness, and completeness. Suggest improvements and verify all requirements are met.`,
        complexity: 'simple',
        dependsOn: ['implement'],
        parallelizable: false,
        ioContract: {
          inputs: [
            { taskId: 'implement', description: 'Implementation to review' },
          ],
          outputs: [
            {
              key: 'review_report',
              description: 'Review findings and suggestions',
            },
          ],
        },
        executionMode: 'single-shot',
        modelHint: 'balanced',
        requirements: analysis.requirements
          .filter((r) => r.type === 'non_functional')
          .map((r) => ({
            type: r.type,
            description: r.description,
            priority: r.priority,
          })),
        suggestedAgent: {
          name: 'Reviewer',
          role: 'Code Reviewer',
          requiredSkills: ['code-review', 'testing'],
          specialization: 'Code quality and testing',
        },
      },
    ],
    requiresSynthesis: false,
    strategy: 'sequential_agents',
    estimatedDuration: analysis.estimatedDuration,
  }
}

function buildAnalysisDecomposition(
  prompt: string,
  analysis: TaskAnalysisResult,
): TaskDecomposition {
  return {
    mainTaskTitle: extractTitle(prompt),
    mainTaskDescription: prompt,
    subTasks: [
      {
        tempId: 'gather',
        title: 'Data Gathering',
        description: `Gather all relevant data and information for analysis: ${prompt}`,
        complexity: 'simple',
        dependsOn: [],
        parallelizable: true,
        ioContract: {
          outputs: [
            { key: 'raw_data', description: 'Collected data and information' },
          ],
        },
        executionMode: 'iterative',
        modelHint: 'fast',
        requirements: [],
        suggestedAgent: {
          name: 'Data Collector',
          role: 'Research Assistant',
          requiredSkills: ['research', 'data-collection'],
          specialization: 'Data gathering',
        },
      },
      {
        tempId: 'analyze',
        title: 'Deep Analysis',
        description: `Perform in-depth analysis of the gathered data. Identify patterns, trends, and key insights.`,
        complexity: 'complex',
        dependsOn: ['gather'],
        parallelizable: false,
        ioContract: {
          inputs: [{ taskId: 'gather', description: 'Raw data to analyze' }],
          outputs: [
            { key: 'analysis', description: 'Analysis results and insights' },
          ],
        },
        executionMode: 'iterative',
        modelHint: 'powerful',
        requirements: analysis.requirements.map((r) => ({
          type: r.type,
          description: r.description,
          priority: r.priority,
        })),
        suggestedAgent: {
          name: 'Analyst',
          role: 'Data Analyst',
          requiredSkills: ['analysis', 'statistics'],
          specialization: 'Data analysis and interpretation',
        },
      },
      {
        tempId: 'report',
        title: 'Report Generation',
        description: `Generate a comprehensive report from the analysis. Include visualizations, conclusions, and recommendations.`,
        complexity: 'simple',
        dependsOn: ['analyze'],
        parallelizable: false,
        ioContract: {
          inputs: [
            { taskId: 'analyze', description: 'Analysis results to report on' },
          ],
          outputs: [
            { key: 'final_report', description: 'Final analysis report' },
          ],
        },
        executionMode: 'single-shot',
        modelHint: 'powerful',
        requirements: [],
        suggestedAgent: {
          name: 'Report Writer',
          role: 'Technical Writer',
          requiredSkills: ['writing', 'visualization'],
          specialization: 'Report creation',
        },
      },
    ],
    requiresSynthesis: false,
    strategy: 'sequential_agents',
    estimatedDuration: analysis.estimatedDuration,
  }
}

function buildGenericDecomposition(
  prompt: string,
  analysis: TaskAnalysisResult,
): TaskDecomposition {
  return {
    mainTaskTitle: extractTitle(prompt),
    mainTaskDescription: prompt,
    subTasks: [
      {
        tempId: 'plan',
        title: 'Planning & Analysis',
        description: `Analyze the following request and create a detailed plan of action.\n\nRequest: ${prompt}`,
        complexity: 'simple',
        dependsOn: [],
        parallelizable: false,
        ioContract: {
          outputs: [{ key: 'plan', description: 'Detailed action plan' }],
        },
        executionMode: 'iterative',
        modelHint: 'balanced',
        requirements: analysis.requirements
          .slice(0, Math.ceil(analysis.requirements.length / 2))
          .map((r) => ({
            type: r.type,
            description: r.description,
            priority: r.priority,
          })),
        suggestedAgent: {
          name: 'Planner',
          role: 'Strategic Planner',
          requiredSkills: ['planning', 'analysis'],
          specialization: 'Task planning and strategy',
        },
      },
      {
        tempId: 'execute',
        title: 'Execution & Delivery',
        description: `Execute the plan and produce the final deliverable.`,
        complexity: 'complex',
        dependsOn: ['plan'],
        parallelizable: false,
        ioContract: {
          inputs: [{ taskId: 'plan', description: 'Plan to execute' }],
          outputs: [{ key: 'deliverable', description: 'Final deliverable' }],
        },
        executionMode: 'iterative',
        modelHint: 'powerful',
        requirements: analysis.requirements
          .slice(Math.ceil(analysis.requirements.length / 2))
          .map((r) => ({
            type: r.type,
            description: r.description,
            priority: r.priority,
          })),
        suggestedAgent: {
          name: 'Executor',
          role: 'Task Executor',
          requiredSkills: analysis.requiredSkills,
          specialization: 'Task execution',
        },
      },
    ],
    requiresSynthesis: false,
    strategy: 'sequential_agents',
    estimatedDuration: analysis.estimatedDuration,
  }
}

function extractTitle(prompt: string): string {
  const sentences = prompt.split(/[.!?]+/)
  const first = sentences[0]?.trim() || prompt
  return first.length > 60 ? first.substring(0, 60) + '...' : first
}
