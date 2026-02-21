/**
 * Extension Bridge Hook
 *
 * Shared hook for handling message communication between the parent window
 * and sandboxed extension iframes. Handles LLM requests, agent access,
 * storage operations, and UI interactions.
 */

import { useCallback, useEffect, type RefObject } from 'react'

import { LLMService } from '@/lib/llm'
import { CredentialService } from '@/lib/credential-service'
import { useNavigate } from 'react-router-dom'
import { useI18n, useUrl } from '@/i18n'
import type { Agent } from '@/types'

export interface ConsoleEntry {
  id: string
  type: 'log' | 'info' | 'warn' | 'error'
  message: string
  timestamp: Date
}

export interface UseExtensionBridgeOptions {
  /** Reference to the iframe element */
  iframeRef: RefObject<HTMLIFrameElement | null>
  /** Extension ID for storage namespacing */
  extensionId?: string
  /** Callback when a console message is received */
  onConsoleMessage?: (entry: ConsoleEntry) => void
}

/**
 * Hook that handles all message communication with extension iframes
 */
export function useExtensionBridge({
  iframeRef,
  extensionId,
  onConsoleMessage,
}: UseExtensionBridgeOptions) {
  const { lang } = useI18n()
  const navigate = useNavigate()
  const url = useUrl(lang)

  // Handle messages from the sandboxed iframe
  const handleIframeMessage = useCallback(
    async (event: MessageEvent) => {
      // Verify the message is from our iframe
      if (iframeRef.current?.contentWindow !== event.source) return

      const { type, requestId, payload } = event.data || {}
      if (!type) return

      // Handle console messages from the iframe
      if (type === 'DEVS_CONSOLE_MESSAGE') {
        const { level, message } = payload || {}
        if (onConsoleMessage) {
          onConsoleMessage({
            id: crypto.randomUUID(),
            type: level || 'log',
            message: String(message),
            timestamp: new Date(),
          })
        }
        return
      }

      // Handle keyboard events - forward to parent document
      if (type === 'DEVS_KEYBOARD_EVENT') {
        const {
          key,
          code,
          keyCode,
          which,
          altKey,
          ctrlKey,
          metaKey,
          shiftKey,
          repeat,
        } = payload || {}
        const syntheticEvent = new KeyboardEvent('keydown', {
          key,
          code,
          keyCode,
          which,
          altKey,
          ctrlKey,
          metaKey,
          shiftKey,
          repeat,
          bubbles: true,
          cancelable: true,
        })
        document.dispatchEvent(syntheticEvent)
        return
      }

      // Handle toast (fire-and-forget, no response needed)
      if (type === 'DEVS_UI_TOAST') {
        const { addToast } = await import('@heroui/react')
        const { message, options = {} } = payload || {}
        addToast({ title: message, color: options.type || 'default' })
        return
      }

      // Handle navigation (fire-and-forget, no response needed)
      if (type === 'DEVS_NAVIGATE') {
        const { path } = payload || {}
        if (path) {
          navigate(url(path))
        }
        return
      }

      // For other message types, requestId is required
      if (!requestId) return

      let response: { success: boolean; data?: unknown; error?: string }

      try {
        switch (type) {
          case 'DEVS_LLM_CHAT': {
            const config = await CredentialService.getActiveConfig()

            if (!config) {
              response = {
                success: false,
                error:
                  'No AI provider configured. Please add credentials in Settings.',
              }
              break
            }

            const { messages, options = {} } = payload || {}
            const result = await LLMService.chat(messages, {
              ...config,
              temperature: options.temperature ?? config.temperature,
              maxTokens: options.maxTokens ?? config.maxTokens,
            })

            response = {
              success: true,
              data: {
                content: result.content,
                usage: result.usage,
              },
            }
            break
          }

          case 'DEVS_AGENTS_LIST': {
            const { loadBuiltInAgents } = await import('@/stores/agentStore')
            const { agents: agentsMap } = await import('@/lib/yjs')
            const builtIn = await loadBuiltInAgents()
            const custom = Array.from(agentsMap.values())
            const customIds = new Set(custom.map((a) => a.id))
            const agents = [
              ...builtIn.filter((a) => !customIds.has(a.id) && !a.deletedAt),
              ...custom.filter((a) => !a.deletedAt),
            ].map((a) => ({
              id: a.id,
              slug: a.slug,
              name: a.name,
              role: a.role,
              icon: a.icon,
              instructions: a.instructions,
            }))
            response = { success: true, data: agents }
            break
          }

          case 'DEVS_AGENTS_GET': {
            const { idOrSlug } = payload || {}
            const { getAgentById, getAgentBySlug, loadBuiltInAgents } =
              await import('@/stores/agentStore')
            let agent: Agent | null | undefined =
              getAgentById(idOrSlug) || getAgentBySlug(idOrSlug)
            if (!agent) {
              const builtIn = await loadBuiltInAgents()
              agent =
                builtIn.find((a) => a.id === idOrSlug || a.slug === idOrSlug) ||
                null
            }
            if (agent && !agent.deletedAt) {
              response = {
                success: true,
                data: {
                  id: agent.id,
                  slug: agent.slug,
                  name: agent.name,
                  role: agent.role,
                  icon: agent.icon,
                  instructions: agent.instructions,
                },
              }
            } else {
              response = { success: false, error: 'Agent not found' }
            }
            break
          }

          case 'DEVS_IMAGE_GENERATE': {
            const { ImageGenerationService } = await import(
              '@/features/studio/services/image-generation-service'
            )
            const { prompt, options = {} } = payload || {}
            const config = await CredentialService.getActiveConfig()
            if (!config || !config.apiKey) {
              response = {
                success: false,
                error:
                  'No image provider configured. Please set up a provider in Settings.',
              }
              break
            }
            const result = await ImageGenerationService.generate(
              prompt,
              options,
              {
                provider: options.provider || 'openai',
                apiKey: config.apiKey,
              },
            )
            response = {
              success: true,
              data: {
                url: result.images?.[0]?.url,
                base64: result.images?.[0]?.base64,
              },
            }
            break
          }

          case 'DEVS_STORAGE_SET': {
            const { key, value } = payload || {}
            const storageKey = `devs_ext_${extensionId}_${key}`
            localStorage.setItem(storageKey, JSON.stringify(value))
            response = { success: true, data: undefined }
            break
          }

          case 'DEVS_STORAGE_GET': {
            const { key } = payload || {}
            const storageKey = `devs_ext_${extensionId}_${key}`
            const raw = localStorage.getItem(storageKey)
            response = { success: true, data: raw ? JSON.parse(raw) : null }
            break
          }

          case 'DEVS_STORAGE_REMOVE': {
            const { key } = payload || {}
            const storageKey = `devs_ext_${extensionId}_${key}`
            localStorage.removeItem(storageKey)
            response = { success: true, data: undefined }
            break
          }

          case 'DEVS_STORAGE_KEYS': {
            const prefix = `devs_ext_${extensionId}_`
            const keys: string[] = []
            for (let i = 0; i < localStorage.length; i++) {
              const k = localStorage.key(i)
              if (k?.startsWith(prefix)) {
                keys.push(k.slice(prefix.length))
              }
            }
            response = { success: true, data: keys }
            break
          }

          case 'DEVS_UI_CONFIRM': {
            const { title, message } = payload || {}
            const confirmed = window.confirm(`${title}\n\n${message}`)
            response = { success: true, data: confirmed }
            break
          }

          case 'DEVS_TOOLS_LIST': {
            const { toolRegistry } = await import('@/tools/registry')
            const { category, tags, enabledOnly = true } = payload || {}
            const tools = toolRegistry.list({ category, tags, enabledOnly })
            response = {
              success: true,
              data: tools.map((t) => ({
                name: t.metadata.name,
                displayName: t.metadata.displayName,
                shortDescription: t.metadata.shortDescription,
                icon: t.metadata.icon,
                category: t.metadata.category,
                tags: t.metadata.tags,
                definition: t.definition,
              })),
            }
            break
          }

          case 'DEVS_TOOLS_GET': {
            const { toolRegistry } = await import('@/tools/registry')
            const { name } = payload || {}
            const tool = toolRegistry.get(name)
            if (tool) {
              response = {
                success: true,
                data: {
                  name: tool.metadata.name,
                  displayName: tool.metadata.displayName,
                  shortDescription: tool.metadata.shortDescription,
                  icon: tool.metadata.icon,
                  category: tool.metadata.category,
                  tags: tool.metadata.tags,
                  definition: tool.definition,
                },
              }
            } else {
              response = { success: false, error: `Tool "${name}" not found` }
            }
            break
          }

          case 'DEVS_TOOLS_EXECUTE': {
            const { toolRegistry } = await import('@/tools/registry')
            const { name, args } = payload || {}
            const tool = toolRegistry.get(name)
            if (!tool) {
              response = { success: false, error: `Tool "${name}" not found` }
              break
            }
            if (!tool.enabled) {
              response = {
                success: false,
                error: `Tool "${name}" is currently disabled`,
              }
              break
            }
            try {
              // Validate arguments if validator exists
              const validatedArgs = tool.validate
                ? tool.validate(args)
                : (args as Parameters<typeof tool.handler>[0])
              // Execute the tool
              const result = await tool.handler(validatedArgs, {
                agentId: undefined,
                conversationId: undefined,
                taskId: undefined,
              })
              response = { success: true, data: { success: true, result } }
            } catch (execError) {
              response = {
                success: true,
                data: {
                  success: false,
                  error:
                    execError instanceof Error
                      ? execError.message
                      : 'Tool execution failed',
                },
              }
            }
            break
          }

          case 'DEVS_TOOLS_CATEGORIES': {
            const { toolRegistry } = await import('@/tools/registry')
            response = { success: true, data: toolRegistry.getCategories() }
            break
          }

          case 'DEVS_VISION_ANALYZE': {
            const config = await CredentialService.getActiveConfig()
            if (!config) {
              response = {
                success: false,
                error:
                  'No AI provider configured. Please add credentials in Settings.',
              }
              break
            }

            const { imageData, prompt, options = {} } = payload || {}
            if (!imageData) {
              response = { success: false, error: 'imageData is required' }
              break
            }

            // Extract MIME type and base64 data from data URL
            const dataUrlMatch = imageData.match(
              /^data:(image\/[^;]+);base64,(.+)$/,
            )
            const mimeType = dataUrlMatch ? dataUrlMatch[1] : 'image/png'
            const base64Data = dataUrlMatch ? dataUrlMatch[2] : imageData

            const analysisPrompt =
              prompt ||
              'Analyze this image in detail. Describe what you see, including any text, objects, people, colors, and overall composition.'

            const messages = [
              {
                role: 'user' as const,
                content: analysisPrompt,
                attachments: [
                  {
                    type: 'image' as const,
                    name: 'image',
                    data: base64Data,
                    mimeType,
                  },
                ],
              },
            ]

            const result = await LLMService.chat(messages, {
              ...config,
              ...options,
            })

            response = {
              success: true,
              data: {
                description: result.content,
                usage: result.usage,
              },
            }
            break
          }

          case 'DEVS_VISION_INTERPRET_SKETCH': {
            const config = await CredentialService.getActiveConfig()
            if (!config) {
              response = {
                success: false,
                error:
                  'No AI provider configured. Please add credentials in Settings.',
              }
              break
            }

            const { imageData, options = {} } = payload || {}
            if (!imageData) {
              response = { success: false, error: 'imageData is required' }
              break
            }

            // Extract MIME type and base64 data from data URL
            const dataUrlMatch = imageData.match(
              /^data:(image\/[^;]+);base64,(.+)$/,
            )
            const mimeType = dataUrlMatch ? dataUrlMatch[1] : 'image/png'
            const base64Data = dataUrlMatch ? dataUrlMatch[2] : imageData

            const sketchType = options.type || 'freeform'
            const interpretPrompt = `Analyze this hand-drawn sketch or diagram. The expected type is: ${sketchType}.

Please provide:
1. An interpretation of what the sketch represents
2. Identify all distinct elements (shapes, text, arrows, connections)
3. Describe any relationships or flows between elements
4. Suggest possible actions or next steps based on the sketch

Format your response as JSON with this structure:
{
  "interpretation": "Overall description of what the sketch represents",
  "elements": [
    {"type": "shape/text/arrow/etc", "label": "optional label", "connections": ["ids of connected elements"]}
  ],
  "suggestedActions": ["action1", "action2"]
}`

            const messages = [
              {
                role: 'user' as const,
                content: interpretPrompt,
                attachments: [
                  {
                    type: 'image' as const,
                    name: 'sketch',
                    data: base64Data,
                    mimeType,
                  },
                ],
              },
            ]

            const result = await LLMService.chat(messages, {
              ...config,
              ...options,
            })

            // Try to parse JSON response, fallback to raw content
            let parsedResult
            try {
              const jsonMatch = result.content.match(/\{[\s\S]*\}/)
              if (jsonMatch) {
                parsedResult = JSON.parse(jsonMatch[0])
              } else {
                parsedResult = {
                  interpretation: result.content,
                  elements: [],
                  suggestedActions: [],
                }
              }
            } catch {
              parsedResult = {
                interpretation: result.content,
                elements: [],
                suggestedActions: [],
              }
            }

            response = {
              success: true,
              data: parsedResult,
            }
            break
          }

          default:
            response = {
              success: false,
              error: `Unknown message type: ${type}`,
            }
        }
      } catch (err) {
        response = {
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        }
      }

      // Send response back to the iframe
      iframeRef.current?.contentWindow?.postMessage(
        { type: `${type}_RESPONSE`, requestId, ...response },
        '*',
      )
    },
    [extensionId, onConsoleMessage, iframeRef],
  )

  // Set up message listener for iframe communication
  useEffect(() => {
    window.addEventListener('message', handleIframeMessage)
    return () => window.removeEventListener('message', handleIframeMessage)
  }, [handleIframeMessage])
}

export default useExtensionBridge
