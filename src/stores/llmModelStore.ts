import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Credential, LLMProvider, SelectedModels } from '@/types'
import { db } from '@/lib/db'
import { SecureStorage, isCryptoAvailable } from '@/lib/crypto'
import { LLMService, LocalLLMProvider } from '@/lib/llm'
import { successToast, errorToast } from '@/lib/toast'
import { syncToYjs, deleteFromYjs } from '@/features/sync'

interface LLMModelStore {
  // Credential state - now one credential per provider
  credentials: Credential[]
  // Selected provider ID
  selectedProviderId: string | null
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
      selectedModels: {},
      selectedCredentialId: null,

      setSelectedProviderId: (id: string | null) =>
        set({ selectedProviderId: id, selectedCredentialId: id }),

      setSelectedModel: (provider: LLMProvider, model: string) =>
        set((state) => ({
          selectedModels: { ...state.selectedModels, [provider]: model },
        })),

      setSelectedCredentialId: (id: string | null) =>
        set({ selectedCredentialId: id, selectedProviderId: id }),

      getCredentialForProvider: (provider: LLMProvider) => {
        const { credentials } = get()
        return credentials.find((c) => c.provider === provider) || null
      },

      getSelectedProvider: () => {
        const { selectedProviderId, credentials } = get()

        // If no specific provider is selected, use the default (first one)
        if (!selectedProviderId && credentials.length > 0) {
          return credentials[0]
        }

        // Find the selected provider
        const selected = credentials.find((c) => c.id === selectedProviderId)

        // If selected provider doesn't exist anymore, fallback to default
        if (!selected && credentials.length > 0) {
          set({ selectedProviderId: credentials[0].id })
          return credentials[0]
        }

        return selected || null
      },

      getSelectedModel: (provider?: LLMProvider) => {
        const { selectedModels, credentials, selectedProviderId } = get()

        // Determine which provider to get model for
        let targetProvider = provider
        if (!targetProvider) {
          const selectedCred = credentials.find(
            (c) => c.id === selectedProviderId,
          )
          targetProvider = selectedCred?.provider || credentials[0]?.provider
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
        if (!selected && creds.length > 0) {
          set({
            selectedProviderId: creds[0].id,
            selectedCredentialId: creds[0].id,
          })
          return creds[0]
        }

        return selected || null
      },

      loadCredentials: async () => {
        await db.init()
        const creds = await db.getAll('credentials')

        // Migration: consolidate multiple credentials per provider into one
        // Keep the oldest credential per provider and migrate model selections
        const providerMap = new Map<LLMProvider, Credential[]>()

        creds.forEach((cred) => {
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
              new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
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
          await db.delete('credentials', id)
          deleteFromYjs('credentials', id)
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

        // If no credentials exist, create a default local provider
        if (sortedCreds.length === 0 && isCryptoAvailable()) {
          try {
            const defaultModel = LocalLLMProvider.DEFAULT_MODEL
            const keyToEncrypt = 'local-no-key'

            const { encrypted, iv, salt } =
              await SecureStorage.encryptCredential(keyToEncrypt)

            const credential: Credential = {
              id: `local-${Date.now()}`,
              provider: 'local',
              encryptedApiKey: encrypted,
              timestamp: new Date(),
              order: 0,
            }

            localStorage.setItem(`${credential.id}-iv`, iv)
            localStorage.setItem(`${credential.id}-salt`, salt)

            await db.add('credentials', credential)
            syncToYjs('credentials', credential)

            // Set the default model for local provider
            set((state) => ({
              credentials: [credential],
              selectedModels: { ...state.selectedModels, local: defaultModel },
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
      },

      updateCredentialOrder: async (credentialId: string, newOrder: number) => {
        try {
          await db.init()
          const credential = await db.get('credentials', credentialId)
          if (credential) {
            const updatedCredential = { ...credential, order: newOrder }
            await db.update('credentials', updatedCredential)
            syncToYjs('credentials', updatedCredential)
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
            errorToast('Invalid API key')
            return false
          }

          // Encrypt and store credential
          const { encrypted, iv, salt } =
            await SecureStorage.encryptCredential(apiKey)

          const credential: Credential = {
            id: `${provider}-${Date.now()}`,
            provider: provider as LLMProvider,
            encryptedApiKey: encrypted,
            baseUrl:
              provider === 'custom' ||
              provider === 'ollama' ||
              provider === 'openai-compatible'
                ? baseUrl
                : undefined,
            timestamp: new Date(),
            order: 0, // Set as default (first position)
          }

          localStorage.setItem(`${credential.id}-iv`, iv)
          localStorage.setItem(`${credential.id}-salt`, salt)

          // Update existing credentials to shift their order down
          for (let i = 0; i < credentials.length; i++) {
            const newOrder = (credentials[i].order || i) + 1
            if (credentials[i].order !== newOrder) {
              await updateCredentialOrder(credentials[i].id, newOrder)
            }
          }

          await db.add('credentials', credential)
          syncToYjs('credentials', credential)

          // If a model was provided, set it as the selected model for this provider
          if (model) {
            setSelectedModel(provider as LLMProvider, model)
          }

          await loadCredentials()

          successToast('Provider added successfully')
          return true
        } catch (error) {
          errorToast('Failed to add provider')
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
          await db.init()
          const credential = await db.get('credentials', id)
          if (!credential) {
            errorToast('Credential not found')
            return false
          }

          // Validate API key
          const isValid = await LLMService.validateApiKey(
            credential.provider,
            apiKey || 'local-no-key',
          )
          if (!isValid) {
            errorToast('Invalid API key')
            return false
          }

          // Encrypt the new API key
          const { encrypted, iv, salt } =
            await SecureStorage.encryptCredential(apiKey)

          const updatedCredential: Credential = {
            ...credential,
            encryptedApiKey: encrypted,
            baseUrl: baseUrl ?? credential.baseUrl,
            timestamp: new Date(),
          }

          // Update localStorage with new encryption metadata
          localStorage.setItem(`${id}-iv`, iv)
          localStorage.setItem(`${id}-salt`, salt)

          await db.update('credentials', updatedCredential)
          syncToYjs('credentials', updatedCredential)

          await get().loadCredentials()

          successToast('Provider updated successfully')
          return true
        } catch (error) {
          errorToast('Failed to update provider')
          console.error(error)
          return false
        }
      },

      deleteCredential: async (id: string) => {
        try {
          const credential = get().credentials.find((c) => c.id === id)

          await db.delete('credentials', id)
          deleteFromYjs('credentials', id)
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
          successToast('Provider deleted')
        } catch (error) {
          errorToast('Failed to delete provider')
        }
      },
    }),
    {
      name: 'devs-llm-model',
      partialize: (state) => ({
        selectedCredentialId: state.selectedCredentialId,
        selectedProviderId: state.selectedProviderId,
        selectedModels: state.selectedModels,
      }),
    },
  ),
)
