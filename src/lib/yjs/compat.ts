/**
 * @module yjs/compat
 *
 * Yjs Compatibility Layer (Deprecated)
 *
 * Before the Yjs-first refactor, consumers obtained Y.Map references
 * through **function-style getters** (e.g. `getAgentsMap()`).  This
 * module preserves those getters so that existing call-sites keep
 * working — but all new code should import the map constants directly.
 *
 * @deprecated Import the typed map constants from `'@/lib/yjs'` instead.
 *
 * @example
 * ```ts
 * // ❌ Old style (deprecated) — still works but avoid in new code
 * import { getAgentsMap } from '@/lib/yjs/compat'
 * const agents = getAgentsMap()
 *
 * // ✅ New style (preferred)
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

// Re-export types so callers migrating from compat don't need a second import
export type { Preferences, Workflow } from './maps'

/** @deprecated Use `import { ydoc } from '@/lib/yjs'` instead. */
export const getYDoc = () => ydoc

/** @deprecated Use `import { agents } from '@/lib/yjs'` instead. */
export const getAgentsMap = () => agents

/** @deprecated Use `import { conversations } from '@/lib/yjs'` instead. */
export const getConversationsMap = () => conversations

/** @deprecated Use `import { knowledge } from '@/lib/yjs'` instead. */
export const getKnowledgeMap = () => knowledge

/** @deprecated Use `import { tasks } from '@/lib/yjs'` instead. */
export const getTasksMap = () => tasks

/** @deprecated Use `import { artifacts } from '@/lib/yjs'` instead. */
export const getArtifactsMap = () => artifacts

/** @deprecated Use `import { memories } from '@/lib/yjs'` instead. */
export const getMemoriesMap = () => memories

/** @deprecated Use `import { preferences } from '@/lib/yjs'` instead. */
export const getPreferencesMap = () => preferences

/** @deprecated Use `import { credentials } from '@/lib/yjs'` instead. */
export const getCredentialsMap = () => credentials

/** @deprecated Use `import { credentials } from '@/lib/yjs'` instead. */
export const getSecretsMap = () => secrets

/** @deprecated Use `import { studioEntries } from '@/lib/yjs'` instead. */
export const getStudioEntriesMap = () => studioEntries

/** @deprecated Use `import { workflows } from '@/lib/yjs'` instead. */
export const getWorkflowsMap = () => workflows

/** @deprecated Use `import { battles } from '@/lib/yjs'` instead. */
export const getBattlesMap = () => battles

/** @deprecated Use `import { pinnedMessages } from '@/lib/yjs'` instead. */
export const getPinnedMessagesMap = () => pinnedMessages
