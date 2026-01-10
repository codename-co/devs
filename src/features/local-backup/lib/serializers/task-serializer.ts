/**
 * Task Serializer
 *
 * Serialize/deserialize Task entities to Markdown with YAML frontmatter
 *
 * Format:
 * ```
 * ---
 * id: task-xyz789
 * workflowId: workflow-abc123
 * title: Implement user authentication
 * complexity: complex
 * status: in_progress
 * assignedAgentId: frontend-developer
 * ...
 * ---
 *
 * ## Description
 *
 * Implement user authentication with OAuth 2.0 support...
 *
 * ## Requirements
 *
 * - [ ] Support Google OAuth
 * - [x] Implement JWT tokens
 *
 * ## Steps
 *
 * 1. [x] Design authentication flow
 * 2. [ ] Implement login endpoint
 * ```
 */
import type { Task, Requirement, TaskStep } from '@/types'
import type {
  FileMetadata,
  TaskFrontmatter,
  SerializedFile,
  Serializer,
} from './types'
import {
  parseFrontmatter,
  stringifyFrontmatter,
  sanitizeFilename,
  formatDate,
  parseDate,
  shortHash,
} from '../utils'

const DIRECTORY = 'tasks'
const EXTENSION = '.task.md'

/**
 * Serialize a Task to Markdown with YAML frontmatter
 */
function serialize(task: Task): SerializedFile {
  const frontmatter: TaskFrontmatter = {
    id: task.id,
    workflowId: task.workflowId,
    title: task.title,
    complexity: task.complexity,
    status: task.status,
    ...(task.assignedAgentId && { assignedAgentId: task.assignedAgentId }),
    ...(task.assignedAt && { assignedAt: formatDate(task.assignedAt) }),
    ...(task.assignedRoleId && { assignedRoleId: task.assignedRoleId }),
    ...(task.parentTaskId && { parentTaskId: task.parentTaskId }),
    dependencies: task.dependencies || [],
    artifacts: task.artifacts || [],
    estimatedPasses: task.estimatedPasses,
    actualPasses: task.actualPasses,
    createdAt: formatDate(task.createdAt),
    updatedAt: formatDate(task.updatedAt),
    ...(task.completedAt && { completedAt: formatDate(task.completedAt) }),
    ...(task.dueDate && { dueDate: formatDate(task.dueDate) }),
    ...(task.methodologyId && { methodologyId: task.methodologyId }),
    ...(task.phaseId && { phaseId: task.phaseId }),
    ...(task.taskTemplateId && { taskTemplateId: task.taskTemplateId }),
  }

  // Build body content
  let body = '## Description\n\n' + (task.description || '')

  // Add requirements section
  if (task.requirements?.length) {
    body += '\n\n## Requirements\n'
    for (const req of task.requirements) {
      const checkbox = req.status === 'satisfied' ? '[x]' : '[ ]'
      const priority = req.priority ? ` (${req.priority})` : ''
      body += `\n- ${checkbox} **${req.type}**${priority}: ${req.description}`
      if (req.validationCriteria?.length) {
        body += '\n  - Criteria: ' + req.validationCriteria.join(', ')
      }
    }
  }

  // Add steps section
  if (task.steps?.length) {
    body += '\n\n## Steps\n'
    const sortedSteps = [...task.steps].sort((a, b) => a.order - b.order)
    for (const step of sortedSteps) {
      const checkbox =
        step.status === 'completed'
          ? '[x]'
          : step.status === 'failed'
            ? '[!]'
            : '[ ]'
      const agent = step.agentId ? ` (@${step.agentId})` : ''
      body += `\n${step.order}. ${checkbox} ${step.name}${agent}`
      if (step.description) {
        body += `\n   ${step.description}`
      }
    }
  }

  // Add attachments info
  if (task.attachments?.length) {
    body += '\n\n## Attachments\n'
    for (const attachment of task.attachments) {
      body += `\n- ${attachment.name} (${attachment.type}, ${attachment.size} bytes)`
    }
  }

  const content = stringifyFrontmatter(frontmatter, body)

  // Organize by workflow
  const workflowDir = sanitizeFilename(task.workflowId)

  return {
    filename: getFilename(task),
    content,
    directory: `${DIRECTORY}/${workflowDir}`,
  }
}

/**
 * Deserialize Markdown with YAML frontmatter to a Task
 * If file metadata is provided and frontmatter lacks timestamps, use file metadata
 */
function deserialize(
  content: string,
  filename: string,
  fileMetadata?: FileMetadata,
  _binaryContent?: string,
): Task | null {
  const parsed = parseFrontmatter<TaskFrontmatter>(content)
  if (!parsed) {
    console.warn(`Failed to parse task file: ${filename}`)
    return null
  }

  const { frontmatter, body } = parsed

  // Use file metadata as fallback for timestamps
  const createdAt = frontmatter.createdAt
    ? parseDate(frontmatter.createdAt)
    : (fileMetadata?.lastModified ?? new Date())
  const updatedAt = frontmatter.updatedAt
    ? parseDate(frontmatter.updatedAt)
    : (fileMetadata?.lastModified ?? new Date())

  // Parse description from body
  let description = ''
  const descMatch = body.match(/## Description\s*\n+([\s\S]*?)(?=\n## |$)/)
  if (descMatch) {
    description = descMatch[1].trim()
  }

  // Parse requirements from body
  const requirements: Requirement[] = []
  const reqSection = body.match(/## Requirements\s*\n+([\s\S]*?)(?=\n## |$)/)
  if (reqSection) {
    const reqRegex =
      /- \[([ x!])\] \*\*(\w+)\*\*(?:\s*\((\w+)\))?:\s*(.+?)(?:\n\s+-\s+Criteria:\s*(.+))?(?=\n-|\n##|$)/g
    let reqMatch
    while ((reqMatch = reqRegex.exec(reqSection[1])) !== null) {
      const status = reqMatch[1] === 'x' ? 'satisfied' : 'pending'
      requirements.push({
        id: `req-${requirements.length + 1}`,
        type: reqMatch[2] as Requirement['type'],
        description: reqMatch[4].trim(),
        priority: (reqMatch[3] as Requirement['priority']) || 'should',
        source: 'explicit',
        status,
        validationCriteria: reqMatch[5] ? reqMatch[5].split(', ') : [],
        taskId: frontmatter.id,
      })
    }
  }

  // Parse steps from body
  const steps: TaskStep[] = []
  const stepsSection = body.match(/## Steps\s*\n+([\s\S]*?)(?=\n## |$)/)
  if (stepsSection) {
    const stepRegex =
      /(\d+)\.\s*\[([ x!])\]\s*(.+?)(?:\s*\(@([^)]+)\))?(?:\n\s{3}(.+))?(?=\n\d+\.|\n##|$)/g
    let stepMatch
    while ((stepMatch = stepRegex.exec(stepsSection[1])) !== null) {
      const statusChar = stepMatch[2]
      let status: TaskStep['status'] = 'pending'
      if (statusChar === 'x') status = 'completed'
      else if (statusChar === '!') status = 'failed'

      steps.push({
        id: `step-${stepMatch[1]}`,
        name: stepMatch[3].trim(),
        description: stepMatch[5]?.trim() || '',
        status,
        order: parseInt(stepMatch[1], 10),
        ...(stepMatch[4] && { agentId: stepMatch[4] }),
      })
    }
  }

  const task: Task = {
    id: frontmatter.id,
    workflowId: frontmatter.workflowId,
    title: frontmatter.title,
    description,
    complexity: frontmatter.complexity,
    status: frontmatter.status,
    ...(frontmatter.assignedAgentId && {
      assignedAgentId: frontmatter.assignedAgentId,
    }),
    ...(frontmatter.assignedAt && {
      assignedAt: parseDate(frontmatter.assignedAt),
    }),
    ...(frontmatter.assignedRoleId && {
      assignedRoleId: frontmatter.assignedRoleId,
    }),
    ...(frontmatter.parentTaskId && { parentTaskId: frontmatter.parentTaskId }),
    dependencies: frontmatter.dependencies || [],
    requirements,
    artifacts: frontmatter.artifacts || [],
    steps,
    estimatedPasses: frontmatter.estimatedPasses || 1,
    actualPasses: frontmatter.actualPasses || 0,
    createdAt,
    updatedAt,
    ...(frontmatter.completedAt && {
      completedAt: parseDate(frontmatter.completedAt),
    }),
    ...(frontmatter.dueDate && { dueDate: parseDate(frontmatter.dueDate) }),
    ...(frontmatter.methodologyId && {
      methodologyId: frontmatter.methodologyId,
    }),
    ...(frontmatter.phaseId && { phaseId: frontmatter.phaseId }),
    ...(frontmatter.taskTemplateId && {
      taskTemplateId: frontmatter.taskTemplateId,
    }),
  }

  return task
}

function getFilename(task: Task): string {
  const titleSlug = sanitizeFilename(task.title, 40)
  const hash = shortHash(task.id)
  return `${titleSlug}-${hash}${EXTENSION}`
}

function getExtension(): string {
  return EXTENSION
}

function getDirectory(): string {
  return DIRECTORY
}

export const taskSerializer: Serializer<Task> = {
  serialize,
  deserialize,
  getFilename,
  getExtension,
  getDirectory,
}
