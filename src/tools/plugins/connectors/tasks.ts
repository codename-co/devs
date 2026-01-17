/**
 * Google Tasks Connector Plugins
 *
 * Tool plugins for Google Tasks operations: list tasks, get task, and list tasklists.
 *
 * @module tools/plugins/connectors/tasks
 */

import { createToolPlugin } from '@/tools/registry'
import type { ToolPlugin } from '@/tools/types'
import {
  tasksList,
  tasksGet,
  tasksListTasklists,
} from '@/features/connectors/tools/service'
import {
  TASKS_TOOL_DEFINITIONS,
  type TasksListParams,
  type TasksListResult,
  type TasksGetParams,
  type TasksGetResult,
  type TasksListTasklistsParams,
  type TasksListTasklistsResult,
} from '@/features/connectors/tools/types'

/**
 * Tasks list plugin - List tasks from a tasklist.
 */
export const tasksListPlugin: ToolPlugin<TasksListParams, TasksListResult> =
  createToolPlugin({
    metadata: {
      name: 'tasks_list',
      displayName: 'Tasks List',
      shortDescription: 'List tasks from a Google Tasks tasklist',
      category: 'connector',
      tags: ['connector', 'tasks', 'list', 'google'],
      icon: 'GoogleTasks',
      estimatedDuration: 1500,
    },
    definition: TASKS_TOOL_DEFINITIONS.tasks_list,
    handler: async (args, context) => {
      if (context?.abortSignal?.aborted) {
        throw new Error('Aborted')
      }
      return tasksList(args)
    },
  })

/**
 * Tasks get plugin - Get a specific task.
 */
export const tasksGetPlugin: ToolPlugin<TasksGetParams, TasksGetResult> =
  createToolPlugin({
    metadata: {
      name: 'tasks_get',
      displayName: 'Tasks Get',
      shortDescription: 'Get a specific task from Google Tasks',
      category: 'connector',
      tags: ['connector', 'tasks', 'get', 'google'],
      icon: 'GoogleTasks',
      estimatedDuration: 1000,
    },
    definition: TASKS_TOOL_DEFINITIONS.tasks_get,
    handler: async (args, context) => {
      if (context?.abortSignal?.aborted) {
        throw new Error('Aborted')
      }
      return tasksGet(args)
    },
  })

/**
 * Tasks list tasklists plugin - List all tasklists.
 */
export const tasksListTasklistsPlugin: ToolPlugin<
  TasksListTasklistsParams,
  TasksListTasklistsResult
> = createToolPlugin({
  metadata: {
    name: 'tasks_list_tasklists',
    displayName: 'Tasks List Tasklists',
    shortDescription: 'List all Google Tasks tasklists',
    category: 'connector',
    tags: ['connector', 'tasks', 'tasklists', 'google'],
    icon: 'GoogleTasks',
    estimatedDuration: 1000,
  },
  definition: TASKS_TOOL_DEFINITIONS.tasks_list_tasklists,
  handler: async (args, context) => {
    if (context?.abortSignal?.aborted) {
      throw new Error('Aborted')
    }
    return tasksListTasklists(args)
  },
})

/**
 * All Tasks plugins.
 */
export const tasksPlugins = [
  tasksListPlugin,
  tasksGetPlugin,
  tasksListTasklistsPlugin,
] as const

/**
 * Tasks plugin names for registration checks.
 */
export const TASKS_PLUGIN_NAMES = [
  'tasks_list',
  'tasks_get',
  'tasks_list_tasklists',
] as const
