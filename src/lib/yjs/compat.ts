/**
 * Yjs Compatibility Layer
 *
 * Provides function-style getters for backward compatibility with code
 * that uses the old yjs-doc.ts API. New code should import maps directly.
 *
 * @deprecated Use direct map imports from './maps' instead.
 *
 * @example
 * ```ts
 * // Old style (deprecated)
 * import { getAgentsMap } from '@/lib/yjs/compat'
 * const agents = getAgentsMap()
 *
 * // New style (preferred)
 * import { agents } from '@/lib/yjs'
 * ```
 */
import { ydoc } from './doc'
import {
  agents,
  conversations,
  knowledge,
  tasks,
  artifacts,
  memories,
  preferences,
  credentials,
  studioEntries,
  workflows,
  battles,
  pinnedMessages,
  secrets,
} from './maps'

// Re-export types for convenience
export type { Preferences, Workflow } from './maps'

/** @deprecated Use `ydoc` directly instead */
export const getYDoc = () => ydoc

/** @deprecated Use `agents` directly instead */
export const getAgentsMap = () => agents

/** @deprecated Use `conversations` directly instead */
export const getConversationsMap = () => conversations

/** @deprecated Use `knowledge` directly instead */
export const getKnowledgeMap = () => knowledge

/** @deprecated Use `tasks` directly instead */
export const getTasksMap = () => tasks

/** @deprecated Use `artifacts` directly instead */
export const getArtifactsMap = () => artifacts

/** @deprecated Use `memories` directly instead */
export const getMemoriesMap = () => memories

/** @deprecated Use `preferences` directly instead */
export const getPreferencesMap = () => preferences

/** @deprecated Use `credentials` directly instead */
export const getCredentialsMap = () => credentials

/** @deprecated Use `credentials` directly instead */
export const getSecretsMap = () => secrets

/** @deprecated Use `studioEntries` directly instead */
export const getStudioEntriesMap = () => studioEntries

/** @deprecated Use `workflows` directly instead */
export const getWorkflowsMap = () => workflows

/** @deprecated Use `battles` directly instead */
export const getBattlesMap = () => battles

/** @deprecated Use `pinnedMessages` directly instead */
export const getPinnedMessagesMap = () => pinnedMessages
