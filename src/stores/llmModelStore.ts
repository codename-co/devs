import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Credential } from '@/types'
import { db } from '@/lib/db'
import { SecureStorage } from '@/lib/crypto'
import { LLMService, LocalLLMProvider } from '@/lib/llm'
import { successToast, errorToast } from '@/lib/toast'

interface LLMModelStore {
  // Credential state
  credentials: Credential[]
  selectedCredentialId: string | null

  // Actions
  setSelectedCredentialId: (id: string | null) => void
  getSelectedCredential: (credentials?: Credential[]) => Credential | null
  loadCredentials: () => Promise<void>
  addCredential: (
    provider: string,
    apiKey: string,
    model: string,
    baseUrl?: string,
  ) => Promise<boolean>
  deleteCredential: (id: string) => Promise<void>
  setAsDefault: (credentialId: string) => Promise<void>
  updateCredentialOrder: (
    credentialId: string,
    newOrder: number,
  ) => Promise<void>
}

export const useLLMModelStore = create<LLMModelStore>()(
  persist(
    (set, get) => ({
      credentials: [],
      selectedCredentialId: null,

      setSelectedCredentialId: (id: string | null) =>
        set({ selectedCredentialId: id }),

      getSelectedCredential: (credentials?: Credential[]) => {
        const { selectedCredentialId, credentials: storeCredentials } = get()
        const creds = credentials || storeCredentials

        // If no specific credential is selected, use the default (first one)
        if (!selectedCredentialId && creds.length > 0) {
          return creds[0]
        }

        // Find the selected credential
        const selected = creds.find((c) => c.id === selectedCredentialId)

        // If selected credential doesn't exist anymore, fallback to default
        if (!selected && creds.length > 0) {
          set({ selectedCredentialId: creds[0].id })
          return creds[0]
        }

        return selected || null
      },

      loadCredentials: async () => {
        await db.init()
        const creds = await db.getAll('credentials')

        // Sort credentials by order
        const sortedCreds = creds.sort((a, b) => {
          if (a.order === undefined && b.order === undefined) return 0
          if (a.order === undefined) return 1
          if (b.order === undefined) return -1
          return a.order - b.order
        })

        // If no credentials exist, create a default local provider
        if (sortedCreds.length === 0) {
          try {
            const defaultModel = LocalLLMProvider.DEFAULT_MODEL
            const keyToEncrypt = 'local-no-key'

            const { encrypted, iv, salt } =
              await SecureStorage.encryptCredential(keyToEncrypt)

            const credential: Credential = {
              id: `local-${Date.now()}`,
              provider: 'local',
              encryptedApiKey: encrypted,
              model: defaultModel,
              timestamp: new Date(),
              order: 0,
            }

            localStorage.setItem(`${credential.id}-iv`, iv)
            localStorage.setItem(`${credential.id}-salt`, salt)

            await db.add('credentials', credential)

            // Reload credentials
            const updatedCreds = await db.getAll('credentials')
            const sortedUpdatedCreds = updatedCreds.sort((a, b) => {
              if (a.order === undefined && b.order === undefined) return 0
              if (a.order === undefined) return 1
              if (b.order === undefined) return -1
              return a.order - b.order
            })
            set({ credentials: sortedUpdatedCreds })
          } catch (error) {
            console.error('Failed to create default local provider:', error)
          }
        } else {
          set({ credentials: sortedCreds })
        }
      },

      updateCredentialOrder: async (credentialId: string, newOrder: number) => {
        try {
          await db.init()
          const credential = await db.get('credentials', credentialId)
          if (credential) {
            const updatedCredential = { ...credential, order: newOrder }
            await db.update('credentials', updatedCredential)
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
        model: string,
        baseUrl?: string,
      ) => {
        const { credentials, updateCredentialOrder } = get()

        try {
          // Validate API key
          const isValid = await LLMService.validateApiKey(
            provider as any,
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
            provider: provider as any,
            encryptedApiKey: encrypted,
            model,
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
          await get().loadCredentials()

          successToast('Credential added successfully')
          return true
        } catch (error) {
          errorToast('Failed to add credential')
          console.error(error)
          return false
        }
      },

      deleteCredential: async (id: string) => {
        try {
          await db.delete('credentials', id)
          localStorage.removeItem(`${id}-iv`)
          localStorage.removeItem(`${id}-salt`)
          await get().loadCredentials()
          successToast('Credential deleted')
        } catch (error) {
          errorToast('Failed to delete credential')
        }
      },
    }),
    {
      name: 'devs-llm-model',
      partialize: (state) => ({
        selectedCredentialId: state.selectedCredentialId,
      }),
    },
  ),
)
