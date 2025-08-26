import { LLMService, LLMMessage } from '@/lib/llm'
import { CredentialService } from '@/lib/credential-service'
import type { Task, Requirement, TaskPlan, AgentSpec } from '@/types'

export interface TaskAnalysisResult {
  requirements: Requirement[]
  complexity: 'simple' | 'complex'
  suggestedStrategy: TaskPlan['strategy']
  estimatedPasses: number
  estimatedDuration: number
  requiredSkills: string[]
  suggestedAgents: AgentSpec[]
}

export interface TaskBreakdown {
  mainTask: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>
  subTasks: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>[]
}

export class TaskAnalyzer {
  private static readonly ANALYSIS_PROMPT = `You are an expert task analyzer specializing in breaking down user requests into structured requirements and implementation plans.

IMPORTANT: You MUST respond with ONLY valid JSON. No explanations, no markdown formatting, just pure JSON.

Analyze the following user prompt and provide a JSON response with this exact structure:

{
  "requirements": [
    {
      "type": "functional" | "non_functional" | "constraint",
      "description": "Clear description of the requirement",
      "priority": "must" | "should" | "could" | "wont",
      "source": "explicit" | "implicit" | "inferred",
      "validationCriteria": ["criterion1", "criterion2"]
    }
  ],
  "complexity": "simple" | "complex",
  "suggestedStrategy": "single_agent" | "sequential_agents" | "parallel_agents" | "hierarchical",
  "estimatedPasses": number,
  "estimatedDuration": number_in_minutes,
  "requiredSkills": ["skill1", "skill2"],
  "suggestedAgents": [
    {
      "name": "Agent Name",
      "role": "Agent Role",
      "requiredSkills": ["skill1", "skill2"],
      "estimatedExperience": "Junior|Mid|Senior|Expert",
      "specialization": "Specific area of expertise"
    }
  ]
}

Guidelines:
- Simple tasks: Can be completed by one agent in 1-2 passes
- Complex tasks: Require multiple agents or multiple passes
- Extract both explicit requirements (stated) and implicit requirements (implied)
- Validation criteria should be measurable and specific
- Required skills should match common expertise areas
- Suggested agents should complement each other for complex tasks

User Prompt: {prompt}`

  /*
  private static readonly BREAKDOWN_PROMPT = `You are a task breakdown specialist. Given a complex task analysis, break it down into a main task and subtasks.

IMPORTANT: You MUST respond with ONLY valid JSON. No explanations, no markdown formatting, just pure JSON.

Provide a JSON response with this structure:

{
  "mainTask": {
    "title": "Main task title",
    "description": "Detailed description",
    "complexity": "complex",
    "status": "pending",
    "dependencies": [],
    "requirements": [], // Copy relevant requirements from analysis
    "artifacts": [],
    "estimatedPasses": number,
    "actualPasses": 0
  },
  "subTasks": [
    {
      "title": "Subtask title",
      "description": "Detailed description",
      "complexity": "simple" | "complex",
      "status": "pending",
      "dependencies": ["parent_or_sibling_task_ids"],
      "requirements": [], // Specific requirements for this subtask
      "artifacts": [],
      "estimatedPasses": number,
      "actualPasses": 0
    }
  ]
}

Task Analysis: {analysis}
Original Prompt: {prompt}`
  */

  static async analyzePrompt(prompt: string): Promise<TaskAnalysisResult> {
    try {
      const config = await CredentialService.getActiveConfig()
      if (!config) {
        throw new Error('No LLM provider configured')
      }

      const messages: LLMMessage[] = [
        {
          role: 'system',
          content: this.ANALYSIS_PROMPT.replace('{prompt}', prompt),
        },
        {
          role: 'user',
          content: prompt,
        },
      ]

      let response = ''
      for await (const chunk of LLMService.streamChat(messages, config)) {
        response += chunk
      }

      // Parse the JSON response with better error handling
      const cleanResponse = response.trim()
      let jsonMatch = cleanResponse.match(/\{[\s\S]*\}/)

      if (!jsonMatch) {
        // Try to extract JSON from code blocks
        const codeBlockMatch = cleanResponse.match(
          /```(?:json)?\s*(\{[\s\S]*?\})\s*```/,
        )
        if (codeBlockMatch) {
          jsonMatch = [codeBlockMatch[1]]
        } else {
          throw new Error('Invalid JSON response from LLM - no JSON found')
        }
      }

      let analysis: TaskAnalysisResult
      try {
        analysis = JSON.parse(jsonMatch[0]) as TaskAnalysisResult
      } catch (parseError) {
        // Try to clean up common JSON issues
        let jsonStr = jsonMatch[0]
        // Remove trailing commas
        jsonStr = jsonStr.replace(/,(\s*[}\]])/g, '$1')
        // Fix common JSON formatting issues
        jsonStr = jsonStr.replace(/\n/g, '\\n') // Escape newlines in strings
        jsonStr = jsonStr.replace(/\r/g, '\\r') // Escape carriage returns
        jsonStr = jsonStr.replace(/\t/g, '\\t') // Escape tabs
        // Try parsing again
        try {
          analysis = JSON.parse(jsonStr) as TaskAnalysisResult
        } catch (secondError) {
          console.error('JSON parsing failed twice:', parseError, secondError)
          console.error('Original response:', response)

          // Ultimate fallback: create basic analysis from prompt
          analysis = {
            requirements: [
              {
                id: crypto.randomUUID(),
                type: 'functional',
                description: 'Complete the requested task as specified',
                priority: 'must',
                source: 'explicit',
                status: 'pending',
                validationCriteria: ['Task completion matches user request'],
                taskId: '',
              },
            ],
            complexity: TaskAnalyzer.estimateComplexity(prompt),
            suggestedStrategy: 'single_agent',
            estimatedPasses: 1,
            estimatedDuration: 60, // 1 hour default
            requiredSkills: TaskAnalyzer.extractKeywords(prompt).slice(0, 3),
            suggestedAgents: [
              {
                name: 'Task Executor',
                role: 'General Task Executor',
                requiredSkills: TaskAnalyzer.extractKeywords(prompt).slice(
                  0,
                  3,
                ),
                estimatedExperience: 'Mid',
                specialization: 'General problem solving',
              },
            ],
          }
        }
      }

      // Add task IDs to requirements
      analysis.requirements = analysis.requirements.map((req) => ({
        ...req,
        id: crypto.randomUUID(),
        status: 'pending' as const,
        taskId: '', // Will be set when task is created
      }))

      return analysis
    } catch (error) {
      console.error('Error analyzing task:', error)
      throw error
    }
  }

  static async breakdownTask(
    prompt: string,
    analysis: TaskAnalysisResult,
    workflowId: string,
  ): Promise<TaskBreakdown> {
    try {
      // For now, let's create a smart fallback breakdown based on analysis
      // This avoids the JSON parsing issues while still providing good task structure
      const breakdown = this.createIntelligentBreakdown(
        prompt,
        analysis,
        workflowId,
      )
      return breakdown
    } catch (error) {
      console.error('Error breaking down task:', error)
      throw error
    }
  }

  private static createIntelligentBreakdown(
    prompt: string,
    analysis: TaskAnalysisResult,
    workflowId: string,
  ): TaskBreakdown {
    const now = new Date()
    const dueDate = new Date(
      now.getTime() + analysis.estimatedDuration * 60 * 1000,
    )

    // Create main task
    const mainTask = {
      title: TaskAnalyzer.extractTaskTitle(prompt),
      description: prompt,
      complexity: analysis.complexity,
      status: 'pending' as const,
      dependencies: [],
      requirements: analysis.requirements,
      artifacts: [],
      steps: [],
      estimatedPasses: analysis.estimatedPasses,
      actualPasses: 0,
      workflowId,
      assignedAgentId: undefined,
      parentTaskId: undefined,
      dueDate,
    }

    // Create intelligent subtasks based on the type of work
    const subTasks = this.generateSubTasks(
      prompt,
      analysis,
      workflowId,
      dueDate,
    )

    return { mainTask, subTasks }
  }

  private static generateSubTasks(
    prompt: string,
    analysis: TaskAnalysisResult,
    workflowId: string,
    dueDate: Date,
  ): Omit<Task, 'id' | 'createdAt' | 'updatedAt'>[] {
    const subTasks: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>[] = []
    const lowerPrompt = prompt.toLowerCase()

    // Detect common task patterns and create appropriate subtasks
    if (
      lowerPrompt.includes('roman') ||
      lowerPrompt.includes('novel') ||
      lowerPrompt.includes('story')
    ) {
      // Creative writing workflow
      subTasks.push(
        {
          title: 'Research and Planning',
          description:
            'Research historical context and plan the narrative structure',
          complexity: 'simple' as const,
          status: 'pending' as const,
          dependencies: [],
          requirements: analysis.requirements.filter(
            (r) => r.type === 'constraint',
          ),
          artifacts: [],
          steps: [],
          estimatedPasses: 1,
          actualPasses: 0,
          workflowId,
          assignedAgentId: undefined,
          parentTaskId: '',
          dueDate,
        },
        {
          title: 'Character and Plot Development',
          description: 'Develop main characters and plot outline',
          complexity: 'simple' as const,
          status: 'pending' as const,
          dependencies: [],
          requirements: analysis.requirements.filter(
            (r) => r.type === 'functional',
          ),
          artifacts: [],
          steps: [],
          estimatedPasses: 1,
          actualPasses: 0,
          workflowId,
          assignedAgentId: undefined,
          parentTaskId: '',
          dueDate,
        },
        {
          title: 'Writing and Style Implementation',
          description:
            'Write the novel with Victor Hugo style and historical accuracy',
          complexity: 'complex' as const,
          status: 'pending' as const,
          dependencies: [],
          requirements: analysis.requirements,
          artifacts: [],
          steps: [],
          estimatedPasses: 2,
          actualPasses: 0,
          workflowId,
          assignedAgentId: undefined,
          parentTaskId: '',
          dueDate,
        },
      )
    } else if (
      lowerPrompt.includes('implement') ||
      lowerPrompt.includes('develop') ||
      lowerPrompt.includes('build')
    ) {
      // Development workflow
      subTasks.push(
        {
          title: 'Analysis and Design',
          description: 'Analyze requirements and create technical design',
          complexity: 'simple' as const,
          status: 'pending' as const,
          dependencies: [],
          requirements: analysis.requirements.filter(
            (r) => r.type === 'functional',
          ),
          artifacts: [],
          steps: [],
          estimatedPasses: 1,
          actualPasses: 0,
          workflowId,
          assignedAgentId: undefined,
          parentTaskId: '',
          dueDate,
        },
        {
          title: 'Implementation',
          description: 'Implement the solution according to specifications',
          complexity: 'complex' as const,
          status: 'pending' as const,
          dependencies: [],
          requirements: analysis.requirements,
          artifacts: [],
          steps: [],
          estimatedPasses: 2,
          actualPasses: 0,
          workflowId,
          assignedAgentId: undefined,
          parentTaskId: '',
          dueDate,
        },
      )
    } else {
      // Generic workflow - break into planning and execution
      subTasks.push(
        {
          title: 'Planning and Analysis',
          description: 'Plan the approach and analyze requirements',
          complexity: 'simple' as const,
          status: 'pending' as const,
          dependencies: [],
          requirements: analysis.requirements.slice(
            0,
            Math.ceil(analysis.requirements.length / 2),
          ),
          artifacts: [],
          steps: [],
          estimatedPasses: 1,
          actualPasses: 0,
          workflowId,
          assignedAgentId: undefined,
          parentTaskId: '',
          dueDate,
        },
        {
          title: 'Execution and Delivery',
          description: 'Execute the plan and deliver the results',
          complexity: 'complex' as const,
          status: 'pending' as const,
          dependencies: [],
          requirements: analysis.requirements.slice(
            Math.ceil(analysis.requirements.length / 2),
          ),
          artifacts: [],
          steps: [],
          estimatedPasses: analysis.estimatedPasses - 1,
          actualPasses: 0,
          workflowId,
          assignedAgentId: undefined,
          parentTaskId: '',
          dueDate,
        },
      )
    }

    return subTasks
  }

  static async createTaskPlan(
    analysis: TaskAnalysisResult,
    workflowId: string,
  ): Promise<TaskPlan> {
    return {
      id: crypto.randomUUID(),
      workflowId,
      strategy: analysis.suggestedStrategy,
      estimatedDuration: analysis.estimatedDuration,
      requiredSkills: analysis.requiredSkills,
      agentAssignments: [], // Will be populated during team building
    }
  }

  static isComplexTask(analysis: TaskAnalysisResult): boolean {
    return (
      analysis.complexity === 'complex' ||
      analysis.estimatedPasses > 2 ||
      analysis.requiredSkills.length > 3 ||
      analysis.suggestedAgents.length > 1
    )
  }

  static extractKeywords(prompt: string): string[] {
    // Simple keyword extraction - could be enhanced with NLP
    const words = prompt
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((word) => word.length > 3)

    // Remove common words
    const stopWords = [
      'this',
      'that',
      'with',
      'have',
      'will',
      'from',
      'they',
      'been',
      'were',
      'said',
      'what',
      'when',
      'where',
      'would',
      'could',
      'should',
    ]
    return [...new Set(words.filter((word) => !stopWords.includes(word)))]
  }

  static estimateComplexity(prompt: string): 'simple' | 'complex' {
    const indicators = {
      simple: ['fix', 'update', 'change', 'add', 'remove', 'simple', 'quick'],
      complex: [
        'implement',
        'design',
        'architecture',
        'system',
        'multiple',
        'integration',
        'workflow',
        'orchestration',
        'complex',
      ],
    }

    const lowerPrompt = prompt.toLowerCase()
    const simpleScore = indicators.simple.reduce(
      (score, word) => score + (lowerPrompt.includes(word) ? 1 : 0),
      0,
    )
    const complexScore = indicators.complex.reduce(
      (score, word) => score + (lowerPrompt.includes(word) ? 1 : 0),
      0,
    )

    return complexScore > simpleScore ? 'complex' : 'simple'
  }

  static extractTaskTitle(prompt: string): string {
    const sentences = prompt.split(/[.!?]+/)
    const firstSentence = sentences[0]?.trim() || prompt
    return firstSentence.length > 50
      ? firstSentence.substring(0, 50) + '...'
      : firstSentence
  }
}
