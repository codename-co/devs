/**
 * Local Backup Feature - Public API
 *
 * Local backup feature for DEVS.
 * Automatically backs up database entities to local Markdown files.
 */

// ============================================================================
// Components
// ============================================================================
export { FolderSyncSettings as LocalBackupSettings } from './components/FolderSyncSettings'
export { LocalBackupButton } from './components/LocalBackupButton'

// ============================================================================
// Hooks
// ============================================================================
export { useAutoBackup } from './hooks/useAutoBackup'

// ============================================================================
// Stores
// ============================================================================
export {
  useFolderSyncStore as useLocalBackupStore,
  tryReconnectFolderSync as tryReconnectLocalBackup,
} from './stores/folderSyncStore'

// ============================================================================
// Services
// ============================================================================
export {
  folderSyncService as localBackupService,
  agentSerializer,
  conversationSerializer,
  memorySerializer,
  knowledgeSerializer,
  taskSerializer,
  type FolderSyncConfig as LocalBackupConfig,
  type FolderSyncEvent as LocalBackupEvent,
} from './lib/local-backup-service'

// ============================================================================
// Serializers (for external use)
// ============================================================================
export type { SerializedFile, Serializer } from './lib/serializers/types'

// ============================================================================
// i18n
// ============================================================================
export { localI18n as localBackupI18n } from './i18n'
