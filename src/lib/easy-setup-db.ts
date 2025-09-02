import { db } from '@/lib/db'
import { Agent, Credential, LLMProvider } from '@/types'
import { EasySetupData } from './easy-setup'
import { nanoid } from 'nanoid'
import { successToast } from '@/lib/toast'

/**
 * Initialize easy setup by importing agents and credentials
 */
export async function initializeEasySetup(
  setupData: EasySetupData,
  decryptedData: { c: Array<{ p: string; k: string; m?: string; b?: string }> },
): Promise<void> {
  await db.init()

  // Keep track of what was imported for success message
  let importedCounts = {
    agents: 0,
    credentials: 0,
  }

  console.log(decryptedData)

  try {
    // 1. Import credentials first (needed by agents potentially)
    if (decryptedData.c && decryptedData.c.length > 0) {
      // Import SecureStorage for encrypting API keys
      const { SecureStorage } = await import('@/lib/crypto')

      for (const credentialData of decryptedData.c) {
        // Check if credential already exists for this provider
        const existingCredentials = await db.query(
          'credentials',
          'provider',
          credentialData.p,
        )

        if (existingCredentials.length === 0) {
          const credentialId = nanoid()

          // Encrypt the plaintext API key with master password
          const { encrypted, iv, salt } = await SecureStorage.encryptCredential(
            credentialData.k, // This is the plaintext API key from export
          )

          // Store encryption metadata in localStorage
          localStorage.setItem(`${credentialId}-iv`, iv)
          localStorage.setItem(`${credentialId}-salt`, salt)

          // Add new credential with encrypted API key
          const credential: Credential = {
            provider: credentialData.p as LLMProvider,
            encryptedApiKey: encrypted,
            ...(credentialData.m && { model: credentialData.m }),
            ...(credentialData.b && { baseUrl: credentialData.b }),
            id: credentialId,
            timestamp: new Date(),
          }

          await db.add('credentials', credential)
          importedCounts.credentials++
        }
      }
    }

    // 2. Import agents
    if (setupData.p.a && setupData.p.a.length > 0) {
      for (const agentData of setupData.p.a) {
        // Check if agent already exists by name and role
        const existingAgents = await db.query('agents', 'name', agentData.n)
        const isDuplicate = existingAgents.some(
          (agent) =>
            agent.role === agentData.r && agent.instructions === agentData.i,
        )

        if (!isDuplicate) {
          const agent: Agent = {
            name: agentData.n,
            role: agentData.r,
            instructions: agentData.i,
            temperature: agentData.t,
            id: nanoid(),
            createdAt: new Date(),
          }

          await db.add('agents', agent)
          importedCounts.agents++
        }
      }
    }

    // Show success message
    const successMessage = buildSuccessMessage(importedCounts, setupData.p.n)
    successToast('Easy Setup Complete', successMessage)
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
  await db.init()

  try {
    // Get all data to export
    const [allAgents, allCredentials] = await Promise.all([
      db.getAll('agents'),
      db.getAll('credentials'),
    ])
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
