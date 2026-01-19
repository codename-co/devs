/**
 * Extension Preview With Console
 *
 * Enhanced version of ExtensionPreview that captures and exposes console output
 * from the sandboxed iframe. This allows the parent component to display
 * console logs and provide them to the AI assistant for debugging.
 */

import { useCallback, useEffect, useMemo, useRef } from 'react'
import { Spinner } from '@heroui/react'

import { useI18n } from '@/i18n'
import { userSettings } from '@/stores/userStore'
import { LLMService } from '@/lib/llm'
import { CredentialService } from '@/lib/credential-service'
import { generateAppPageHtmlWithConsole } from '../utils'
import type { LanguageCode } from '@/i18n'
import type { ExtensionI18n } from '../types'

export interface ConsoleEntry {
  id: string
  type: 'log' | 'info' | 'warn' | 'error'
  message: string
  timestamp: Date
}

export interface ExtensionPreviewWithConsoleProps {
  /** The extension ID (used for storage namespacing) */
  extensionId?: string
  /** The extension name */
  extensionName?: string
  /** The page code to render */
  pageCode: string
  /** Optional i18n messages */
  i18n?: Record<string, ExtensionI18n>
  /** Whether the preview is loading */
  isLoading?: boolean
  /** Minimum height for the iframe */
  minHeight?: string
  /** CSS class name */
  className?: string
  /** Callback when a console message is received */
  onConsoleMessage?: (entry: ConsoleEntry) => void
  /** Callback when the preview refreshes (e.g., code or theme changes) */
  onPreviewRefresh?: () => void
}

/**
 * Sandboxed iframe preview for extension pages with console capture
 */
export function ExtensionPreviewWithConsole({
  extensionId,
  extensionName,
  pageCode,
  i18n: extI18n,
  isLoading = false,
  minHeight = '300px',
  className = '',
  onConsoleMessage,
  onPreviewRefresh,
}: ExtensionPreviewWithConsoleProps) {
  const { lang } = useI18n()
  const iframeRef = useRef<HTMLIFrameElement>(null)

  // Subscribe to theme changes reactively
  const theme = userSettings((state) => state.theme)
  const isDarkTheme = useMemo(() => {
    if (theme === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches
    }
    return theme === 'dark'
  }, [theme])

  // Build context object to inject into the iframe
  const devsContext = useMemo(
    () => ({
      extensionId,
      extensionName,
      theme: isDarkTheme ? ('dark' as const) : ('light' as const),
      language: lang,
      // Include i18n messages for the current locale (with English fallback)
      i18n: {
        ...(extI18n?.['en']?.messages ?? {}),
        ...(extI18n?.[lang as LanguageCode]?.messages ?? {}),
      },
    }),
    [extensionId, extensionName, extI18n, isDarkTheme, lang],
  )

  // Generate the HTML for the iframe (with console capture)
  const iframeSrcDoc = useMemo(
    () => generateAppPageHtmlWithConsole(pageCode, isDarkTheme, devsContext),
    [pageCode, isDarkTheme, devsContext],
  )

  // Key to force iframe refresh when code or theme changes
  const iframeKey = useMemo(
    () =>
      `${extensionId || 'preview'}-${isDarkTheme ? 'dark' : 'light'}-${Date.now()}`,
    [extensionId, isDarkTheme, pageCode],
  )

  // Notify parent when preview refreshes (iframeKey changes)
  useEffect(() => {
    onPreviewRefresh?.()
  }, [iframeKey, onPreviewRefresh])

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
                  'No LLM provider configured. Please add credentials in Settings.',
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
            const { db } = await import('@/lib/db')
            const builtIn = await loadBuiltInAgents()
            const custom = await db.getAll('agents')
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
            let agent =
              (await getAgentById(idOrSlug)) || (await getAgentBySlug(idOrSlug))
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
    [extensionId, onConsoleMessage],
  )

  // Set up message listener for iframe communication
  useEffect(() => {
    window.addEventListener('message', handleIframeMessage)
    return () => window.removeEventListener('message', handleIframeMessage)
  }, [handleIframeMessage])

  if (isLoading) {
    return (
      <div
        className={`flex items-center justify-center ${className}`}
        style={{ minHeight }}
      >
        <Spinner size="lg" />
      </div>
    )
  }

  if (!pageCode) {
    return (
      <div
        className={`flex items-center justify-center text-default-400 ${className}`}
        style={{ minHeight }}
      >
        No preview available
      </div>
    )
  }

  return (
    <iframe
      key={iframeKey}
      ref={iframeRef}
      srcDoc={iframeSrcDoc}
      className={`w-full flex-1 border-0 ${className}`}
      style={{ minHeight }}
      sandbox="allow-scripts allow-forms allow-modals allow-same-origin"
      title={extensionName || 'Extension Preview'}
      // @ts-ignore
      allowtransparency="true"
      allowFullScreen={false}
    />
  )
}

export default ExtensionPreviewWithConsole
