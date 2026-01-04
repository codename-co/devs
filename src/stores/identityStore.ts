/**
 * Identity Store
 * Manages user and device identity with secure key storage
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { UserIdentity, DeviceIdentity, UserIdentityWithKeys } from '@/types'
import { 
  generateUserIdentity, 
  exportIdentity, 
  importIdentity, 
  serializeIdentity 
} from '@/lib/identity/user-identity'
import { generateDeviceIdentity } from '@/lib/identity/device-identity'

// Key for encrypted private key storage in IndexedDB
const PRIVATE_KEY_STORAGE_KEY = 'devs-identity-private-key'
const DB_NAME = 'devs-identity'
const STORE_NAME = 'keys'

interface IdentityState {
  // Public user identity (safe to persist in localStorage)
  user: UserIdentity | null
  
  // Current device
  device: DeviceIdentity | null
  
  // All linked devices
  linkedDevices: DeviceIdentity[]
  
  // Runtime-only: loaded crypto keys (not persisted)
  _cryptoKeys: {
    publicKey: CryptoKey | null
    privateKey: CryptoKey | null
    devicePrivateKey: CryptoKey | null
  } | null
  
  // Identity setup status
  isInitialized: boolean
  isLoading: boolean
  error: string | null
}

interface IdentityActions {
  // Initialize identity (load existing or create new)
  initialize: () => Promise<void>
  
  // Create a new identity
  createIdentity: (displayName?: string) => Promise<void>
  
  // Import identity from backup
  importIdentityBackup: (exportedData: string, password: string) => Promise<void>
  
  // Export identity for backup
  exportIdentityBackup: (password: string) => Promise<string>
  
  // Update display name
  updateDisplayName: (displayName: string) => void
  
  // Update avatar
  updateAvatar: (avatar: string) => void
  
  // Add a linked device
  addLinkedDevice: (device: DeviceIdentity) => void
  
  // Remove a linked device
  removeLinkedDevice: (deviceId: string) => void
  
  // Get crypto keys (runtime only)
  getCryptoKeys: () => { publicKey: CryptoKey; privateKey: CryptoKey } | null
  
  // Clear identity (logout)
  clearIdentity: () => Promise<void>
  
  // Reset error
  clearError: () => void
}

type IdentityStore = IdentityState & IdentityActions

// IndexedDB helpers for secure key storage
async function openKeyDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }
  })
}

async function storeEncryptedKey(key: string, value: string): Promise<void> {
  const db = await openKeyDatabase()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const request = store.put(value, key)
    
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve()
    
    tx.oncomplete = () => db.close()
  })
}

async function getEncryptedKey(key: string): Promise<string | null> {
  const db = await openKeyDatabase()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const request = store.get(key)
    
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result ?? null)
    
    tx.oncomplete = () => db.close()
  })
}

async function deleteEncryptedKey(key: string): Promise<void> {
  const db = await openKeyDatabase()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const request = store.delete(key)
    
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve()
    
    tx.oncomplete = () => db.close()
  })
}

const initialState: IdentityState = {
  user: null,
  device: null,
  linkedDevices: [],
  _cryptoKeys: null,
  isInitialized: false,
  isLoading: false,
  error: null
}

export const useIdentityStore = create<IdentityStore>()(
  persist(
    (set, get) => ({
      ...initialState,
      
      initialize: async () => {
        const state = get()
        if (state.isInitialized || state.isLoading) return
        
        set({ isLoading: true, error: null })
        
        try {
          // Check if we have stored identity
          const encryptedKey = await getEncryptedKey(PRIVATE_KEY_STORAGE_KEY)
          
          if (encryptedKey && state.user) {
            // We have identity, but need to load crypto keys
            // For now, keys need password to decrypt
            // This will be handled by importIdentityBackup or a dedicated unlock method
            set({ isInitialized: true, isLoading: false })
          } else {
            // No identity yet
            set({ isInitialized: true, isLoading: false })
          }
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to initialize identity',
            isLoading: false 
          })
        }
      },
      
      createIdentity: async (displayName?: string) => {
        set({ isLoading: true, error: null })
        
        try {
          // Generate new user identity
          const identity = await generateUserIdentity(displayName)
          
          // Generate device identity
          const { device, privateKey: devicePrivateKey } = await generateDeviceIdentity(
            identity.id,
            undefined // Auto-detect device name
          )
          
          // Export and store encrypted private key (using a default internal password)
          // In production, this should prompt user for a password
          const internalPassword = `devs-internal-${identity.id}`
          const exportedIdentity = await exportIdentity(identity, internalPassword)
          await storeEncryptedKey(PRIVATE_KEY_STORAGE_KEY, exportedIdentity)
          
          // Store device private key separately
          const deviceKeyData = await crypto.subtle.exportKey('pkcs8', devicePrivateKey)
          const deviceKeyBase64 = btoa(String.fromCharCode(...new Uint8Array(deviceKeyData)))
          await storeEncryptedKey(`device-key-${device.id}`, deviceKeyBase64)
          
          set({
            user: serializeIdentity(identity),
            device,
            linkedDevices: [device],
            _cryptoKeys: {
              publicKey: identity.publicCryptoKey,
              privateKey: identity.privateCryptoKey,
              devicePrivateKey
            },
            isLoading: false
          })
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to create identity',
            isLoading: false 
          })
        }
      },
      
      importIdentityBackup: async (exportedData: string, password: string) => {
        set({ isLoading: true, error: null })
        
        try {
          // Import identity from backup
          const identity = await importIdentity(exportedData, password)
          
          // Generate device identity for this device
          const { device, privateKey: devicePrivateKey } = await generateDeviceIdentity(
            identity.id,
            undefined // Auto-detect device name
          )
          
          // Store keys
          await storeEncryptedKey(PRIVATE_KEY_STORAGE_KEY, exportedData)
          
          const deviceKeyData = await crypto.subtle.exportKey('pkcs8', devicePrivateKey)
          const deviceKeyBase64 = btoa(String.fromCharCode(...new Uint8Array(deviceKeyData)))
          await storeEncryptedKey(`device-key-${device.id}`, deviceKeyBase64)
          
          set({
            user: serializeIdentity(identity),
            device,
            linkedDevices: [device], // Start fresh, other devices will sync
            _cryptoKeys: {
              publicKey: identity.publicCryptoKey,
              privateKey: identity.privateCryptoKey,
              devicePrivateKey
            },
            isLoading: false
          })
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to import identity',
            isLoading: false 
          })
        }
      },
      
      exportIdentityBackup: async (password: string) => {
        const state = get()
        
        if (!state._cryptoKeys?.privateKey || !state.user) {
          throw new Error('No identity to export')
        }
        
        const identityWithKeys: UserIdentityWithKeys = {
          ...state.user,
          publicCryptoKey: state._cryptoKeys.publicKey!,
          privateCryptoKey: state._cryptoKeys.privateKey
        }
        
        return exportIdentity(identityWithKeys, password)
      },
      
      updateDisplayName: (displayName: string) => {
        set((state) => ({
          user: state.user ? { ...state.user, displayName } : null
        }))
      },
      
      updateAvatar: (avatar: string) => {
        set((state) => ({
          user: state.user ? { ...state.user, avatar } : null
        }))
      },
      
      addLinkedDevice: (device: DeviceIdentity) => {
        set((state) => ({
          linkedDevices: [...state.linkedDevices.filter(d => d.id !== device.id), device]
        }))
      },
      
      removeLinkedDevice: (deviceId: string) => {
        set((state) => ({
          linkedDevices: state.linkedDevices.filter(d => d.id !== deviceId)
        }))
      },
      
      getCryptoKeys: () => {
        const state = get()
        if (!state._cryptoKeys?.publicKey || !state._cryptoKeys?.privateKey) {
          return null
        }
        return {
          publicKey: state._cryptoKeys.publicKey,
          privateKey: state._cryptoKeys.privateKey
        }
      },
      
      clearIdentity: async () => {
        try {
          await deleteEncryptedKey(PRIVATE_KEY_STORAGE_KEY)
          const state = get()
          if (state.device) {
            await deleteEncryptedKey(`device-key-${state.device.id}`)
          }
        } catch (error) {
          console.error('Failed to clear stored keys:', error)
        }
        
        set(initialState)
      },
      
      clearError: () => set({ error: null })
    }),
    {
      name: 'devs-identity',
      partialize: (state) => ({
        // Only persist public data, not crypto keys
        user: state.user,
        device: state.device,
        linkedDevices: state.linkedDevices,
        isInitialized: state.isInitialized
      }),
      // Don't persist _cryptoKeys - they're loaded at runtime
    }
  )
)

// Selector hooks for convenience
export const useUserIdentity = () => useIdentityStore((state) => state.user)
export const useDeviceIdentity = () => useIdentityStore((state) => state.device)
export const useLinkedDevices = () => useIdentityStore((state) => state.linkedDevices)
export const useIdentityStatus = () => useIdentityStore((state) => ({
  isInitialized: state.isInitialized,
  isLoading: state.isLoading,
  error: state.error,
  hasIdentity: !!state.user
}))
