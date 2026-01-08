import { marked } from 'marked'

/**
 * Copy content to clipboard in multiple formats for maximum compatibility.
 * - Plain text (markdown) for IDEs and code editors
 * - HTML for word processors and rich text editors
 *
 * @param markdown - The markdown content to copy
 * @returns Promise that resolves when content is copied
 */
export async function copyRichText(markdown: string): Promise<void> {
  // Convert markdown to HTML for rich text editors
  const html = await marked.parse(markdown, {
    gfm: true,
    breaks: true,
  })

  // Wrap HTML with basic styling for better paste results
  const styledHtml = `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6;">${html}</div>`

  try {
    // Modern Clipboard API - write both formats
    await navigator.clipboard.write([
      new ClipboardItem({
        'text/plain': new Blob([markdown], { type: 'text/plain' }),
        'text/html': new Blob([styledHtml], { type: 'text/html' }),
      }),
    ])
  } catch {
    // Fallback for browsers that don't support ClipboardItem
    // or when the page doesn't have clipboard-write permission
    await navigator.clipboard.writeText(markdown)
  }
}
