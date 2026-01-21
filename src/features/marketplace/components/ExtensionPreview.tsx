/**
 * Extension Preview Component
 *
 * Renders a sandboxed iframe preview of extension page code.
 * Extracted from DynamicAppRoute for reuse in the extension editor.
 */

import { useEffect, useMemo, useRef } from 'react'
import { Spinner } from '@heroui/react'

import { useI18n } from '@/i18n'
import { userSettings } from '@/stores/userStore'
import { generateAppPageHtml, generateAppPageHtmlWithConsole } from '../utils'
import { useExtensionBridge, type ConsoleEntry } from '../hooks'
import type { LanguageCode } from '@/i18n'
import type { ExtensionI18n } from '../types'

export type { ConsoleEntry }

export interface ExtensionPreviewProps {
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
  /** Callback when a console message is received (enables console capture) */
  onConsoleMessage?: (entry: ConsoleEntry) => void
  /** Callback when the preview refreshes (e.g., code or theme changes) */
  onPreviewRefresh?: () => void
}

/**
 * Sandboxed iframe preview for extension pages
 */
export function ExtensionPreview({
  extensionId,
  extensionName,
  pageCode,
  i18n: extI18n,
  isLoading = false,
  minHeight = '300px',
  className = '',
  onConsoleMessage,
  onPreviewRefresh,
}: ExtensionPreviewProps) {
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

  // Generate the HTML for the iframe
  // Use console-capturing version if onConsoleMessage is provided
  const iframeSrcDoc = useMemo(
    () =>
      onConsoleMessage
        ? generateAppPageHtmlWithConsole(pageCode, isDarkTheme, devsContext)
        : generateAppPageHtml(pageCode, isDarkTheme, devsContext),
    [pageCode, isDarkTheme, devsContext, onConsoleMessage],
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

  // Use the shared extension bridge hook for message handling
  useExtensionBridge({
    iframeRef,
    extensionId,
    onConsoleMessage,
  })

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

export default ExtensionPreview
