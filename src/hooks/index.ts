/**
 * Hooks - Public API
 *
 * Re-exports all custom React hooks for easy imports.
 */

// Real-time data hooks (instant reactivity)
export {
  // Data hooks
  useConversations,
  useConversation,
  useAgents,
  useAgent,
  useKnowledge,
  useKnowledgeItem,
  useTasks,
  useTask,
  useMemories,
  useAgentMemories,
  useArtifacts,
  useArtifact,
  useCredentials,
  // Utility hooks
  useFiltered,
  useSorted,
  useCount,
  useSyncReady,
  // Low-level hooks (for advanced use)
  useLiveMap,
  useLiveValue,
} from './useLive'

// PWA hooks
export { usePWAInstall } from './usePWAInstall'
export { usePWAInstallPrompt } from './usePWAInstallPrompt'

// UI hooks
export { useBackgroundImage } from './useBackgroundImage'
export { useEasySetup } from './useEasySetup'

// OAuth hooks
export { useOAuth } from './useOAuth'
export type { OAuthStatus, OAuthState, UseOAuthReturn } from './useOAuth'
