/**
 * Extension Generator Service
 *
 * Uses LLM to generate schema-compliant extensions based on user prompts.
 * The generated extensions are validated against the extension.schema.json
 * and stored in the customExtensions IndexedDB store.
 */

import { LLMService, LLMMessage } from '@/lib/llm'
import { CredentialService } from '@/lib/credential-service'
import { db } from '@/lib/db'
import { errorToast, successToast } from '@/lib/toast'
import type {
  ExtensionType,
  ExtensionDefinition,
  CustomExtension,
} from './types'
import ExtensionSchema from '../../../public/schemas/extension.schema.json?raw'
import ExtensionBridge from '../../../docs/EXTENSION-BRIDGE.md?raw'

// =============================================================================
// SYSTEM PROMPT
// =============================================================================

export const EXTENSION_SYSTEM_PROMPT = /* md */ `You are an expert extension generator for DEVS, a browser-native AI agent orchestration platform.

Your task is to generate valid extension definitions based on user descriptions. Extensions follow this JSON schema:

## EXTENSION SCHEMA

\`\`\`json
${ExtensionSchema}
\`\`\`

FOR APP EXTENSIONS:
The "pages" object should contain React component code as strings. The code has access to:
- All React hooks (useState, useEffect, etc.). But NEVER import React itself (it is already imported).
- @dev/components components (that inherit from @heroui/react) (Button, Card, Input, Modal, Container, Section, PromptArea, etc.)
- The "window.DEVS" Bridge API for platform integration

## EXTENSION BRIDGE API

${ExtensionBridge.replace(/^/gm, '  ')}

## EXAMPLE EXTENSION CODE

Example page code (this is the ONLY valid structure):
\`\`\`
import { Button, Container, Section } from '@devs/components'

const App = () => {
  return (
    <Section>
      <Container>
        <Button variant="light">
          Example button
        </Button>
      </Container>
    </Section>
  )
}
\`\`\`

## GENERAL IMPORTANT INSTRUCTIONS

- Generate ONLY valid JSON
- Use appropriate icons from Iconoir
- Use appropriate colors that match the extension's purpose
- For apps, generate functional React code
- Keep descriptions concise but informative
- The path keys should match the actual app routes (e.g., "/translate" for a translation app); never use "/" for the main page nor generic names like "main" or "home"; prefer short yet descriptive paths that will be unique within the app; exclude the leading slash in the path keys
- The id must be unique and URL-friendly (lowercase, hyphens only)
- React code: Except for react, react-dom, react-dom/client, react/jsx-runtime, framer-motion, @heroui/react and @devs/components, import only https://esm.sh packages and set the path to "?external=react,react-dom"
- React code: The page code must define an "App" component but NEVER render or return it. NO "return <App />" or "export default App" at the end. The extension loader handles rendering automatically. Just define the component, nothing else.

Respond with ONLY the JSON object, no markdown code blocks or explanations.
`

// =============================================================================
// EXTENSION GENERATOR
// =============================================================================

export interface GenerateExtensionOptions {
  type: ExtensionType
  prompt: string
}

export interface GenerateExtensionResult {
  success: boolean
  extension?: CustomExtension
  error?: string
}

/**
 * Generate an extension definition using LLM
 */
export async function generateExtension(
  options: GenerateExtensionOptions,
): Promise<GenerateExtensionResult> {
  const { type, prompt } = options

  // Get LLM config
  const config = await CredentialService.getActiveConfig()
  if (!config) {
    return {
      success: false,
      error: 'No LLM provider configured. Please add credentials in Settings.',
    }
  }

  const messages: LLMMessage[] = [
    { role: 'system', content: EXTENSION_SYSTEM_PROMPT },
    {
      role: 'user',
      content: `Generate a ${type} extension based on this description:\n\n${prompt}\n\nRemember to output ONLY valid JSON.`,
    },
  ]

  try {
    const response = await LLMService.chat(messages, {
      ...config,
      temperature: 0.7,
    })

    // Parse the JSON response
    let extensionDef: ExtensionDefinition
    try {
      // Clean up response - remove markdown code blocks if present
      let jsonStr = response.content.trim()
      if (jsonStr.startsWith('```json')) {
        jsonStr = jsonStr.slice(7)
      } else if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.slice(3)
      }
      if (jsonStr.endsWith('```')) {
        jsonStr = jsonStr.slice(0, -3)
      }
      jsonStr = jsonStr.trim()

      extensionDef = JSON.parse(jsonStr)
    } catch (parseError) {
      console.error('Failed to parse extension JSON:', parseError)
      console.error('Raw response:', response.content)
      return {
        success: false,
        error: 'Failed to parse generated extension. Please try again.',
      }
    }

    // Validate required fields
    if (!extensionDef.id || !extensionDef.name || !extensionDef.type) {
      return {
        success: false,
        error:
          'Generated extension is missing required fields (id, name, type).',
      }
    }

    // Ensure ID is properly formatted
    extensionDef.id = extensionDef.id
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')

    // Make ID unique by appending timestamp
    extensionDef.id = `${extensionDef.id}-${Date.now().toString(36)}`

    // Ensure type matches requested type
    extensionDef.type = type

    // Ensure version format
    if (
      !extensionDef.version ||
      !/^\d+\.\d+\.\d+$/.test(extensionDef.version)
    ) {
      extensionDef.version = '1.0.0'
    }

    // Ensure license
    if (!extensionDef.license) {
      extensionDef.license = 'MIT'
    }

    // Create the CustomExtension
    const customExtension: CustomExtension = {
      ...extensionDef,
      generationPrompt: prompt,
      createdAt: new Date(),
      enabled: true,
    }

    // Save to IndexedDB
    if (!db.isInitialized()) {
      await db.init()
    }
    await db.update('customExtensions', customExtension)

    successToast('Extension created', `${customExtension.name} is ready to use`)

    return {
      success: true,
      extension: customExtension,
    }
  } catch (error) {
    console.error('Failed to generate extension:', error)
    const message =
      error instanceof Error ? error.message : 'Unknown error occurred'
    errorToast('Failed to generate extension', message)
    return {
      success: false,
      error: message,
    }
  }
}

// =============================================================================
// CUSTOM EXTENSION MANAGEMENT
// =============================================================================

/**
 * Get all custom extensions
 */
export async function getCustomExtensions(): Promise<CustomExtension[]> {
  if (!db.isInitialized()) {
    await db.init()
  }
  return db.getAll('customExtensions')
}

/**
 * Get a custom extension by ID
 */
export async function getCustomExtension(
  id: string,
): Promise<CustomExtension | undefined> {
  if (!db.isInitialized()) {
    await db.init()
  }
  return db.get('customExtensions', id)
}

/**
 * Update a custom extension
 */
export async function updateCustomExtension(
  extension: CustomExtension,
): Promise<void> {
  if (!db.isInitialized()) {
    await db.init()
  }
  extension.updatedAt = new Date()
  await db.update('customExtensions', extension)
  successToast('Extension updated', `${extension.name} has been updated`)
}

/**
 * Delete a custom extension
 */
export async function deleteCustomExtension(id: string): Promise<void> {
  if (!db.isInitialized()) {
    await db.init()
  }
  const extension = await db.get('customExtensions', id)
  await db.delete('customExtensions', id)
  if (extension) {
    successToast('Extension deleted', `${extension.name} has been removed`)
  }
}

/**
 * Toggle a custom extension's enabled state
 */
export async function toggleCustomExtension(
  id: string,
  enabled: boolean,
): Promise<void> {
  if (!db.isInitialized()) {
    await db.init()
  }
  const extension = await db.get('customExtensions', id)
  if (extension) {
    extension.enabled = enabled
    extension.updatedAt = new Date()
    await db.update('customExtensions', extension)
    successToast(
      enabled ? 'Extension enabled' : 'Extension disabled',
      extension.name,
    )
  }
}
