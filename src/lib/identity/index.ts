/**
 * Identity Management Module
 * Provides cryptographic identity for users and devices
 */

export {
  generateUserIdentity,
  exportIdentity,
  importIdentity,
  serializeIdentity,
  signData,
  verifySignature
} from './user-identity'

export {
  generateDeviceIdentity,
  updateDeviceLastSeen
} from './device-identity'

export {
  generateKeyExchangeKeyPair,
  deriveSharedSecret,
  encryptKeyForRecipient,
  decryptKeyFromSender,
  generateWorkspaceKey,
  importPublicKeyForExchange,
  exportPublicKeyForExchange
} from './key-exchange'
