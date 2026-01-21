/**
 * Extension Preview With Console
 *
 * Re-export of ExtensionPreview with console-specific prop types.
 * This exists for backwards compatibility - the base ExtensionPreview
 * component now supports all console features when onConsoleMessage is provided.
 */

import {
  ExtensionPreview,
  type ExtensionPreviewProps,
} from './ExtensionPreview'

// Re-export the ConsoleEntry type
export type { ConsoleEntry } from './ExtensionPreview'

export interface ExtensionPreviewWithConsoleProps
  extends Omit<ExtensionPreviewProps, 'onConsoleMessage' | 'onPreviewRefresh'> {
  /** Callback when a console message is received */
  onConsoleMessage?: ExtensionPreviewProps['onConsoleMessage']
  /** Callback when the preview refreshes (e.g., code or theme changes) */
  onPreviewRefresh?: ExtensionPreviewProps['onPreviewRefresh']
}

/**
 * Sandboxed iframe preview for extension pages with console capture.
 * This is an alias for ExtensionPreview with console features enabled.
 */
export function ExtensionPreviewWithConsole(
  props: ExtensionPreviewWithConsoleProps,
) {
  return <ExtensionPreview {...props} />
}

export default ExtensionPreviewWithConsole
