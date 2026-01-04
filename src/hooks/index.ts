/**
 * Hooks barrel file
 * Re-exports all custom hooks for convenient importing
 */

export { useBackgroundImage } from './useBackgroundImage'
export { useEasySetup } from './useEasySetup'
export { usePWAInstall } from './usePWAInstall'
export { usePWAInstallPrompt } from './usePWAInstallPrompt'
export { useTypingUsers, type UseTypingUsersOptions, type UseTypingUsersReturn } from './useTypingUsers'
export { 
  useCollaboratorCursors, 
  type UseCollaboratorCursorsOptions, 
  type UseCollaboratorCursorsReturn 
} from './useCollaboratorCursors'
export { 
  useCollaboration, 
  type UseCollaborationOptions, 
  type UseCollaborationReturn 
} from './useCollaboration'
