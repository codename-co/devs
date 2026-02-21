import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Credential, LLMProvider, SelectedModels } from '@/types'
import { SecureStorage, isCryptoAvailable } from '@/lib/crypto'
import { LLMService, LocalLLMProvider } from '@/lib/llm'
import { successToast, errorToast } from '@/lib/toast'
import { credentials as credentialsYjs, isReady } from '@/lib/yjs'
import { getT } from '@/i18n/utils'

const t = getT()

// Guard to prevent re-entrant loadCredentials calls (caused by migrations triggering Yjs observer)
let isLoadingCredentials = false

interface LLMModelStore {
  // Credential state - now one credential per provider
  credentials: Credential[]
  // Selected provider ID
  selectedProviderId: string | null
  // Selected provider type (persisted for instant display before credentials load)
  selectedProviderType: LLMProvider | null
  // Selected model per provider
  selectedModels: SelectedModels
  // Legacy field for backwards compatibility
  selectedCredentialId: string | null

  // Actions
  setSelectedProviderId: (id: string | null) => void
  setSelectedModel: (provider: LLMProvider, model: string) => void
  getSelectedProvider: () => Credential | null
  getSelectedModel: (provider?: LLMProvider) => string | null
  /** @deprecated use getSelectedProvider instead */
  getSelectedCredential: (credentials?: Credential[]) => Credential | null
  /** @deprecated use setSelectedProviderId instead */
  setSelectedCredentialId: (id: string | null) => void
  loadCredentials: () => Promise<void>
  addCredential: (
    provider: string,
    apiKey: string,
    model?: string,
    baseUrl?: string,
  ) => Promise<boolean>
  updateCredential: (
    id: string,
    apiKey: string,
    baseUrl?: string,
  ) => Promise<boolean>
  deleteCredential: (id: string) => Promise<void>
  setAsDefault: (credentialId: string) => Promise<void>
  updateCredentialOrder: (
    credentialId: string,
    newOrder: number,
  ) => Promise<void>
  getCredentialForProvider: (provider: LLMProvider) => Credential | null
}

export const useLLMModelStore = create<LLMModelStore>()(
  persist(
    (set, get) => ({
      credentials: [],
      selectedProviderId: null,
      selectedProviderType: null,
      selectedModels: {},
      selectedCredentialId: null,

      setSelectedProviderId: (id: string | null) => {
        // Resolve provider type from the credential for persistence
        const credential = id
          ? get().credentials.find((c) => c.id === id)
          : null
        set({
          selectedProviderId: id,
          selectedCredentialId: id,
          selectedProviderType:
            credential?.provider ?? get().selectedProviderType,
        })
      },

      setSelectedModel: (provider: LLMProvider, model: string) =>
        set((state) => ({
          selectedModels: { ...state.selectedModels, [provider]: model },
          // Also track the provider type for the active selection
          selectedProviderType: provider,
        })),

      setSelectedCredentialId: (id: string | null) => {
        const credential = id
          ? get().credentials.find((c) => c.id === id)
          : null
        set({
          selectedCredentialId: id,
          selectedProviderId: id,
          selectedProviderType:
            credential?.provider ?? get().selectedProviderType,
        })
      },

      getCredentialForProvider: (provider: LLMProvider) => {
        const { credentials } = get()
        return credentials.find((c) => c.provider === provider) || null
      },

      getSelectedProvider: () => {
        const { selectedProviderId, selectedProviderType, credentials } = get()

        // If no specific provider is selected, use the default (first one)
        if (!selectedProviderId && credentials.length > 0) {
          return credentials[0]
        }

        // Find the selected provider
        const selected = credentials.find((c) => c.id === selectedProviderId)

        // If selected provider doesn't exist anymore, fallback to default
        // Note: do NOT call set() here — getters must be side-effect-free
        // to avoid silently overwriting the user's selection during renders.
        if (!selected && credentials.length > 0) {
          return credentials[0]
        }

        // Before credentials load, return a minimal credential from persisted info
        // so the UI can display the correct model name and provider icon immediately
        if (!selected && selectedProviderId && selectedProviderType) {
          return {
            id: selectedProviderId,
            provider: selectedProviderType,
            encryptedApiKey: '',
            timestamp: new Date(),
          } as Credential
        }

        return selected || null
      },

      getSelectedModel: (provider?: LLMProvider) => {
        const {
          selectedModels,
          credentials,
          selectedProviderId,
          selectedProviderType,
        } = get()

        // Determine which provider to get model for
        // MUST be consistent with getSelectedProvider() fallback logic
        let targetProvider = provider
        if (!targetProvider) {
          if (selectedProviderId) {
            const selectedCred = credentials.find(
              (c) => c.id === selectedProviderId,
            )
            targetProvider = selectedCred?.provider
          }
          if (!targetProvider) {
            // Match getSelectedProvider's fallback: credentials[0] when no explicit selection
            targetProvider =
              credentials[0]?.provider || selectedProviderType || undefined
          }
        }

        if (!targetProvider) return null

        return selectedModels[targetProvider] || null
      },

      getSelectedCredential: (credentials?: Credential[]) => {
        const {
          selectedProviderId,
          selectedCredentialId,
          credentials: storeCredentials,
        } = get()
        const creds = credentials || storeCredentials
        const id = selectedProviderId || selectedCredentialId

        // If no specific credential is selected, use the default (first one)
        if (!id && creds.length > 0) {
          return creds[0]
        }

        // Find the selected credential
        const selected = creds.find((c) => c.id === id)

        // If selected credential doesn't exist anymore, fallback to default
        // Note: do NOT call set() here — getters must be side-effect-free
        // to avoid silently overwriting the user's selection during renders.
        if (!selected && creds.length > 0) {
          return creds[0]
        }

        return selected || null
      },

      loadCredentials: async () => {
        // Prevent re-entrant calls caused by migrations triggering Yjs observer
        if (isLoadingCredentials) {
          return
        }
        isLoadingCredentials = true

        try {
          const creds = Array.from(credentialsYjs.values())

          // Debug logging for sync troubleshooting
          console.log(
            `[LLMModelStore] Loading ${creds.length} credentials from Yjs`,
          )
          creds.forEach((cred) => {
            console.log(
              `[LLMModelStore] Credential ${cred.id}: provider=${cred.provider}, hasIv=${!!cred.iv}`,
            )
          })

          // Migration: Add IV to credential object if missing (for sync compatibility)
          // This ensures older credentials work with the new sync system
          for (const cred of creds) {
            if (!cred.iv) {
              const iv = localStorage.getItem(`${cred.id}-iv`)
              if (iv) {
                console.log(
                  `[LLMModelStore] Migrating IV to credential object for ${cred.id}`,
                )
                credentialsYjs.set(cred.id, { ...cred, iv })
              }
            }
          }

          // Re-read after migration
          const migratedCreds = Array.from(credentialsYjs.values())

          // Migration: consolidate multiple credentials per provider into one
          // Keep the oldest credential per provider and migrate model selections
          const providerMap = new Map<LLMProvider, Credential[]>()

          migratedCreds.forEach((cred) => {
            const provider = cred.provider
            if (!providerMap.has(provider)) {
              providerMap.set(provider, [])
            }
            providerMap.get(provider)!.push(cred)
          })

          const migratedModels: SelectedModels = {}
          const credentialsToDelete: string[] = []
          const consolidatedCredentials: Credential[] = []

          for (const [provider, providerCreds] of providerMap) {
            // Sort by timestamp to keep the oldest one
            const sorted = providerCreds.sort(
              (a, b) =>
                new Date(a.timestamp).getTime() -
                new Date(b.timestamp).getTime(),
            )

            // Keep the oldest credential
            const primaryCred = sorted[0]
            consolidatedCredentials.push(primaryCred)

            // If there's a model on the primary credential or any duplicate, use it
            // Prefer the model from the credential with the lowest order (default)
            const credsWithModels = sorted.filter((c) => c.model)
            if (credsWithModels.length > 0) {
              // Use the model from the default credential (lowest order)
              const sortedByOrder = credsWithModels.sort(
                (a, b) => (a.order ?? 999) - (b.order ?? 999),
              )
              migratedModels[provider] = sortedByOrder[0].model!
            }

            // Mark duplicates for deletion
            for (let i = 1; i < sorted.length; i++) {
              credentialsToDelete.push(sorted[i].id)
            }
          }

          // Delete duplicate credentials
          for (const id of credentialsToDelete) {
            credentialsYjs.delete(id)
            localStorage.removeItem(`${id}-iv`)
            localStorage.removeItem(`${id}-salt`)
          }

          // Sort by order
          const sortedCreds = consolidatedCredentials.sort((a, b) => {
            if (a.order === undefined && b.order === undefined) return 0
            if (a.order === undefined) return 1
            if (b.order === undefined) return -1
            return a.order - b.order
          })

          // If no credentials exist, create a default local provider.
          // Only do this when Yjs persistence is fully synced — otherwise
          // we'd see an empty map before IndexedDB has loaded and
          // mistakenly create a local provider that overrides the user's
          // real default.
          if (sortedCreds.length === 0 && isCryptoAvailable() && isReady()) {
            try {
              const defaultModel = LocalLLMProvider.DEFAULT_MODEL
              const keyToEncrypt = 'local-no-key'

              const { encrypted, iv, salt, mode } =
                await SecureStorage.encryptCredential(keyToEncrypt)

              const credential: Credential = {
                id: `local-${Date.now()}`,
                provider: 'local',
                encryptedApiKey: encrypted,
                // Always store IV in credential object for sync compatibility
                iv,
                // Store encryption mode
                encryptionMode: mode,
                timestamp: new Date(),
                order: 0,
              }

              // Also store IV in localStorage as backup
              localStorage.setItem(`${credential.id}-iv`, iv)
              if (salt) {
                localStorage.setItem(`${credential.id}-salt`, salt)
              }

              credentialsYjs.set(credential.id, credential)

              // Set the default model for local provider
              set((state) => ({
                credentials: [credential],
                selectedModels: {
                  ...state.selectedModels,
                  local: defaultModel,
                },
                selectedProviderType:
                  state.selectedProviderType ?? ('local' as LLMProvider),
              }))
              return
            } catch (error) {
              console.error('Failed to create default local provider:', error)
            }
          }

          // Update state with migrated models if any
          const currentSelectedModels = get().selectedModels
          const mergedModels = { ...currentSelectedModels }
          for (const [provider, model] of Object.entries(migratedModels)) {
            // Only set if not already set (don't override user's explicit selection)
            if (!mergedModels[provider as LLMProvider]) {
              mergedModels[provider as LLMProvider] = model
            }
          }

          set({ credentials: sortedCreds, selectedModels: mergedModels })
        } finally {
          isLoadingCredentials = false
        }
      },

      updateCredentialOrder: async (credentialId: string, newOrder: number) => {
        try {
          const credential = credentialsYjs.get(credentialId)
          if (credential) {
            const updatedCredential = { ...credential, order: newOrder }
            credentialsYjs.set(credential.id, updatedCredential)
          }
        } catch (error) {
          console.error('Failed to update credential order:', error)
        }
      },

      setAsDefault: async (credentialId: string) => {
        const { credentials, updateCredentialOrder, loadCredentials } = get()
        const credentialIndex = credentials.findIndex(
          (c) => c.id === credentialId,
        )
        if (credentialIndex === -1 || credentialIndex === 0) return

        // Update all credentials to shift their order
        for (let i = 0; i < credentials.length; i++) {
          let newOrder: number
          if (i < credentialIndex) {
            newOrder = (credentials[i].order || i) + 1
          } else if (i === credentialIndex) {
            newOrder = 0
          } else {
            newOrder = credentials[i].order || i
          }

          if (credentials[i].order !== newOrder) {
            await updateCredentialOrder(credentials[i].id, newOrder)
          }
        }

        // Update selected provider to the new default
        const newDefault = credentials[credentialIndex]
        set({
          selectedProviderId: newDefault.id,
          selectedCredentialId: newDefault.id,
          selectedProviderType: newDefault.provider,
        })

        // Reload credentials
        await loadCredentials()
      },

      addCredential: async (
        provider: string,
        apiKey: string,
        model?: string,
        baseUrl?: string,
      ) => {
        const {
          credentials,
          updateCredentialOrder,
          setSelectedModel,
          loadCredentials,
        } = get()

        // Check if provider already has a credential
        const existingCred = credentials.find((c) => c.provider === provider)
        if (existingCred) {
          errorToast(
            'This provider is already configured. Edit or delete the existing one first.',
          )
          return false
        }

        try {
          // Validate API key
          const isValid = await LLMService.validateApiKey(
            provider as LLMProvider,
            apiKey || 'local-no-key',
          )
          if (!isValid) {
            errorToast(t('Invalid API key'))
            return false
          }

          // Encrypt and store credential
          const { encrypted, iv, salt, mode } =
            await SecureStorage.encryptCredential(apiKey)

          const credential: Credential = {
            id: `${provider}-${Date.now()}`,
            provider: provider as LLMProvider,
            encryptedApiKey: encrypted,
            // Always store IV in credential object for sync compatibility
            // This allows credentials to be synced and used on other devices
            iv,
            // Store the encryption mode so we know if it's syncable
            encryptionMode: mode,
            baseUrl:
              provider === 'custom' ||
              provider === 'ollama' ||
              provider === 'openai-compatible'
                ? baseUrl
                : undefined,
            timestamp: new Date(),
            order: 0, // Set as default (first position)
          }

          // Also store IV in localStorage as backup for local mode
          localStorage.setItem(`${credential.id}-iv`, iv)
          if (salt) {
            localStorage.setItem(`${credential.id}-salt`, salt)
          }

          // Update existing credentials to shift their order down
          for (let i = 0; i < credentials.length; i++) {
            const newOrder = (credentials[i].order || i) + 1
            if (credentials[i].order !== newOrder) {
              await updateCredentialOrder(credentials[i].id, newOrder)
            }
          }

          credentialsYjs.set(credential.id, credential)

          // If a model was provided, set it as the selected model for this provider
          if (model) {
            setSelectedModel(provider as LLMProvider, model)
          }

          // Select the newly added provider as the active one
          set({
            selectedProviderId: credential.id,
            selectedCredentialId: credential.id,
            selectedProviderType: provider as LLMProvider,
          })

          await loadCredentials()

          successToast(t('Provider added successfully'))
          return true
        } catch (error) {
          errorToast(t('Failed to add provider'))
          console.error(error)
          return false
        }
      },

      updateCredential: async (
        id: string,
        apiKey: string,
        baseUrl?: string,
      ) => {
        try {
          const credential = credentialsYjs.get(id)
          if (!credential) {
            errorToast(t('Credential not found'))
            return false
          }

          // Validate API key
          const isValid = await LLMService.validateApiKey(
            credential.provider,
            apiKey || 'local-no-key',
          )
          if (!isValid) {
            errorToast(t('Invalid API key'))
            return false
          }

          // Encrypt the new API key
          const { encrypted, iv, salt, mode } =
            await SecureStorage.encryptCredential(apiKey)

          const updatedCredential: Credential = {
            ...credential,
            encryptedApiKey: encrypted,
            // Always store IV in credential object for sync compatibility
            iv,
            // Update encryption mode
            encryptionMode: mode,
            baseUrl: baseUrl ?? credential.baseUrl,
            timestamp: new Date(),
          }

          // Also store IV in localStorage as backup
          localStorage.setItem(`${id}-iv`, iv)
          if (salt) {
            localStorage.setItem(`${id}-salt`, salt)
          }

          credentialsYjs.set(id, updatedCredential)

          await get().loadCredentials()

          successToast(t('Provider updated successfully'))
          return true
        } catch (error) {
          errorToast(t('Failed to update provider'))
          console.error(error)
          return false
        }
      },

      deleteCredential: async (id: string) => {
        try {
          const credential = get().credentials.find((c) => c.id === id)

          credentialsYjs.delete(id)
          localStorage.removeItem(`${id}-iv`)
          localStorage.removeItem(`${id}-salt`)

          // Clear the selected model for this provider
          if (credential) {
            set((state) => {
              const newSelectedModels = { ...state.selectedModels }
              delete newSelectedModels[credential.provider]
              return { selectedModels: newSelectedModels }
            })
          }

          await get().loadCredentials()
          successToast(t('Provider deleted'))
        } catch (error) {
          errorToast(t('Failed to delete provider'))
        }
      },
    }),
    {
      name: 'devs-llm-model',
      partialize: (state) => ({
        selectedCredentialId: state.selectedCredentialId,
        selectedProviderId: state.selectedProviderId,
        selectedProviderType: state.selectedProviderType,
        selectedModels: state.selectedModels,
      }),
    },
  ),
)

// =========================================================================
// Yjs Observers for P2P sync
// =========================================================================

/**
 * Initialize Yjs observers for real-time sync.
 * When credentials are modified on another device,
 * this ensures the Zustand store stays in sync.
 */
function initYjsObservers(): void {
  credentialsYjs.observe(() => {
    // Reload credentials when Yjs map changes
    useLLMModelStore.getState().loadCredentials()
  })
}

// Initialize observers when module loads
initYjsObservers()
