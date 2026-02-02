import {
  agents as agentsMap,
  credentials as credentialsMap,
} from '@/lib/yjs/maps'
import { Agent, Credential, LLMProvider } from '@/types'
import { EasySetupData } from './easy-setup'
import { nanoid } from 'nanoid'
import { notifySuccess } from '@/features/notifications'
import { userSettings } from '@/stores/userStore'

/**
 * Initialize easy setup by importing agents and credentials
 */
export async function initializeEasySetup(
  setupData: EasySetupData,
  decryptedData: { c: Array<{ p: string; k: string; m?: string; b?: string }> },
): Promise<void> {
  const { setPlatformName } = userSettings.getState()

  // Keep track of what was imported for success message
  let importedCounts = {
    agents: 0,
    credentials: 0,
  }
  let firstImportedCredentialId: string | null = null

  console.log(decryptedData)

  try {
    // 1. Import credentials first (needed by agents potentially)
    if (decryptedData.c && decryptedData.c.length > 0) {
      // Import SecureStorage for encrypting API keys
      const { SecureStorage } = await import('@/lib/crypto')

      // Get existing credentials count to calculate order
      const existingCredentials = Array.from(credentialsMap.values())
      const baseOrder = existingCredentials.length

      for (let i = 0; i < decryptedData.c.length; i++) {
        const credentialData = decryptedData.c[i]

        // Check if credential already exists for this provider
        const existingCredentialsForProvider = existingCredentials.filter(
          (c) => c.provider === credentialData.p,
        )

        if (existingCredentialsForProvider.length === 0) {
          const credentialId = nanoid()

          // Encrypt the plaintext API key with master password
          const { encrypted, iv, salt } = await SecureStorage.encryptCredential(
            credentialData.k, // This is the plaintext API key from export
          )

          // Store encryption metadata in localStorage
          localStorage.setItem(`${credentialId}-iv`, iv)
          localStorage.setItem(`${credentialId}-salt`, salt)

          // Add new credential with encrypted API key
          // First imported credential gets order 0 (becomes default)
          const credential: Credential = {
            provider: credentialData.p as LLMProvider,
            encryptedApiKey: encrypted,
            ...(credentialData.m && { model: credentialData.m }),
            ...(credentialData.b && { baseUrl: credentialData.b }),
            id: credentialId,
            timestamp: new Date(),
            order: baseOrder + i,
          }

          credentialsMap.set(credentialId, credential)
          importedCounts.credentials++

          // Remember the first imported credential
          if (firstImportedCredentialId === null) {
            firstImportedCredentialId = credentialId
          }
        }
      }
    }

    // 2. Import agents
    if (setupData.p.a && setupData.p.a.length > 0) {
      for (const agentData of setupData.p.a) {
        // Check if agent already exists by name and role
        const existingAgents = Array.from(agentsMap.values()).filter(
          (a) => a.name === agentData.n,
        )
        const isDuplicate = existingAgents.some(
          (agent) =>
            agent.role === agentData.r && agent.instructions === agentData.i,
        )

        if (!isDuplicate) {
          const slug = agentData.n
            .toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '')
            .slice(0, 50)

          const agent: Agent = {
            name: agentData.n,
            slug,
            role: agentData.r,
            instructions: agentData.i,
            temperature: agentData.t,
            id: nanoid(),
            createdAt: new Date(),
          }

          agentsMap.set(agent.id, agent)
          importedCounts.agents++
        }
      }
    }

    // 3. Import platform name
    if (setupData.p.n) {
      setPlatformName(setupData.p.n)
    }

    // 4. Set the first imported credential as default and select it
    if (firstImportedCredentialId) {
      const { useLLMModelStore } = await import('@/stores/llmModelStore')
      const { setAsDefault, setSelectedCredentialId, loadCredentials } =
        useLLMModelStore.getState()

      // Load credentials into the store first
      await loadCredentials()

      // Set as default (moves it to order 0)
      await setAsDefault(firstImportedCredentialId)

      // Select this credential
      setSelectedCredentialId(firstImportedCredentialId)
    }

    // Show success message
    const successMessage = buildSuccessMessage(importedCounts, setupData.p.n)
    notifySuccess({
      title: 'Easy Setup Complete',
      description: successMessage,
    })
  } catch (error) {
    console.error('Error initializing team setup:', error)
    throw new Error(
      `Failed to initialize easy setup: ${error instanceof Error ? error.message : String(error)}`,
    )
  }
}

/**
 * Build a user-friendly success message based on what was imported
 */
function buildSuccessMessage(
  counts: { agents: number; credentials: number },
  platformName?: string,
): string {
  const parts: string[] = []

  if (counts.agents > 0) {
    parts.push(`${counts.agents} agent${counts.agents > 1 ? 's' : ''}`)
  }

  if (counts.credentials > 0) {
    parts.push(
      `${counts.credentials} LLM provider${counts.credentials > 1 ? 's' : ''}`,
    )
  }

  if (parts.length === 0) {
    return 'No new items to import - everything was already configured!'
  }

  let message = `Successfully imported: ${parts.join(', ')}`

  if (platformName) {
    message += ` for ${platformName}`
  }

  return message
}

/**
 * Export current configuration for easy setup sharing
 */
export async function exportEasySetup(
  password: string,
  options?: {
    includeAllAgents?: boolean
    selectedAgentIds?: string[]
  },
): Promise<string> {
  try {
    // Get all data to export
    const allAgents = Array.from(agentsMap.values())
    const allCredentials = Array.from(credentialsMap.values())
    console.log(allAgents)

    // Filter agents based on selection
    const agents = options?.includeAllAgents
      ? allAgents
      : allAgents.filter((agent) =>
          options?.selectedAgentIds?.includes(agent.id),
        )

    // Get platformName from userSettings
    const { userSettings } = await import('@/stores/userStore')
    const platformName = userSettings.getState().platformName

    // Create and encode setup data
    const { createSetupData } = await import('./easy-setup')

    return await createSetupData(agents, allCredentials, password, platformName)
  } catch (error) {
    console.error('Error exporting team setup:', error)
    throw new Error(
      `Failed to export easy setup: ${error instanceof Error ? error.message : String(error)}`,
    )
  }
}
