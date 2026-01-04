/**
 * Sync Module
 * Provides data synchronization and encryption for collaboration
 */

export {
  generateEncryptionKey,
  encrypt,
  decrypt,
  decryptJSON,
  exportKey,
  importKey,
  deriveKeyFromPassword,
  generateKeyId,
  hash,
  encryptBlob,
  decryptToBlob,
} from './encryption'

export {
  CRDTDocumentManager,
  getCRDTManager,
  resetCRDTManager,
  type SyncableEntityType,
  type EntityChange,
} from './crdt-adapter'

export {
  AwarenessManager,
  createAwarenessManager,
  generateUserColor,
  formatPresenceStatus,
} from './awareness'

export {
  CollaborativeExecutionManager,
  createCollaborativeExecutionManager,
  type ApprovalRequest,
  type ExecutionAction,
  type CreateExecutionConfig,
} from './collaborative-execution'

export * from './providers'
