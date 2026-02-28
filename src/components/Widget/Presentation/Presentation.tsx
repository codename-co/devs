import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { Alert, Spinner } from '@heroui/react'
import { type Marpit as MarpitType } from '@marp-team/marpit'
import MarpitCSS from './Presentation.marp.css?raw'
import { SlidesRenderer } from './SlidesRenderer'
import { errorToast } from '@/lib/toast'

// Extract individual slide HTML from the full rendered content
const extractSlideHTML = (fullHTML: string, slideIndex: number): string => {
  // Parse the HTML to extract individual sections
  const parser = new DOMParser()
  const doc = parser.parseFromString(fullHTML, 'text/html')
  const sections = doc.querySelectorAll('section')

  if (slideIndex < sections.length) {
    return sections[slideIndex].outerHTML
  }

  return ''
}

/**
 * Marpit Presentation Renderer
 * Optimized for streaming content - avoids flickering by:
 * 1. Only showing loading state on initial render
 * 2. Keeping previous content visible while new content renders
 * 3. Debouncing rapid updates during streaming
 */
export const Presentation = ({ code }: { code: string }) => {
  const [error, setError] = useState<string | null>(null)
  const [isInitialLoad, setIsInitialLoad] = useState<boolean>(true)
  const [renderedContent, setRenderedContent] = useState<{
    html: string
    css: string
    slides: number
  } | null>(null)

  // Keep reference to Marpit instance to avoid re-importing
  const marpitRef = useRef<MarpitType | null>(null)
  const marpitLoadingRef = useRef<Promise<void> | null>(null)

  // Animation frame for smooth streaming updates
  const rafRef = useRef<number | null>(null)
  const pendingCodeRef = useRef<string | null>(null)
  const isRenderingRef = useRef<boolean>(false)

  // Initialize Marpit instance once
  const initMarpit = useCallback(async () => {
    if (marpitRef.current) return
    if (marpitLoadingRef.current) {
      await marpitLoadingRef.current
      return
    }

    marpitLoadingRef.current = (async () => {
      const Marpit = (
        await import('https://esm.sh/@marp-team/marpit@3.1.3' as string)
      ).Marpit

      const marpit: MarpitType = new Marpit({
        emoji: {
          shortcode: 'twemoji',
          unicode: 'twemoji',
        },
        math: 'katex',
        minifyCSS: true,
        slug: true,
        markdown: {
          html: true,
          breaks: true,
          looseYAML: true,
          inlineSVG: true,
        },
        script: false,
        inlineSVG: false,
      }) as MarpitType

      marpit.themeSet.default = marpit.themeSet.add(MarpitCSS)
      marpitRef.current = marpit
    })()

    await marpitLoadingRef.current
  }, [])

  // Render function that uses cached Marpit instance
  const renderCode = useCallback(
    async (codeToRender: string) => {
      // Prevent concurrent renders
      if (isRenderingRef.current) {
        pendingCodeRef.current = codeToRender
        return
      }

      isRenderingRef.current = true

      try {
        await initMarpit()

        if (!marpitRef.current) {
          throw new Error('Marpit failed to initialize')
        }

        const { html, css } = marpitRef.current.render(codeToRender)
        const slideCount = (html.match(/<section[^>]*>/g) || []).length

        setRenderedContent({ html, css, slides: slideCount })
        setError(null)
        setIsInitialLoad(false)
      } catch (err) {
        console.error('Error rendering Marpit presentation:', err)
        setError(
          err instanceof Error
            ? err.message
            : 'Failed to render Marpit presentation',
        )
      } finally {
        isRenderingRef.current = false

        // If there's a pending update, schedule it for the next frame
        if (pendingCodeRef.current && pendingCodeRef.current !== codeToRender) {
          const pendingCode = pendingCodeRef.current
          pendingCodeRef.current = null
          rafRef.current = requestAnimationFrame(() => {
            renderCode(pendingCode)
          })
        }
      }
    },
    [initMarpit],
  )

  useEffect(() => {
    // Cancel any pending animation frame
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
    }

    // For initial load, render immediately
    if (!renderedContent) {
      renderCode(code)
      return
    }

    // For streaming updates, use requestAnimationFrame for smooth 60fps updates
    rafRef.current = requestAnimationFrame(() => {
      renderCode(code)
    })

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
      }
    }
  }, [code, renderCode, renderedContent])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
      }
    }
  }, [])

  const exportToPDF = useCallback(() => {
    if (!renderedContent) return

    // Create a new window
    const win = window.open('', '_blank')
    if (!win) {
      errorToast('Please allow popups')
      return
    }

    // Create the HTML content for PDF export
    const html = /* html */ `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Presentation</title>
          <style>
            ${renderedContent.css}

            /* PDF-specific styles */
            @page {
              size: 1280px 720px;
              margin: 0;
            }

            body {
              margin: 0;
              padding: 0;
              font-family: inherit;
            }

            section {
              width: 1280px !important;
              height: 720px !important;
              page-break-after: always;
              page-break-inside: avoid;
              display: flex !important;
              transform: none !important;
              /* margin: 1rem auto; */
            }

            section:last-child {
              page-break-after: avoid;
            }
          </style>
        </head>
        <body>
          ${renderedContent.html}
        </body>
      </html>
    `

    // Write content and trigger print
    win.document.write(html)
    win.document.close()

    // Wait for content to load, then print
    win.onload = () => {
      setTimeout(() => {
        win.print()
        win.close()
      }, 500)
    }
  }, [renderedContent])

  // Memoize slides array to prevent unnecessary re-renders
  const renderedSlides = useMemo(() => {
    if (!renderedContent) return []
    return Array.from({ length: renderedContent.slides }, (_, index) =>
      extractSlideHTML(renderedContent.html, index),
    )
  }, [renderedContent])

  // Only show loading spinner on initial load
  if (isInitialLoad && !renderedContent) {
    return <Spinner size="lg" className="m-4" />
  }

  if (error && !renderedContent) {
    return (
      <Alert color="danger" title="Marpit rendering error">
        {error}
      </Alert>
    )
  }

  if (!renderedContent) {
    return <Alert color="default">No slides to display</Alert>
  }

  return (
    <SlidesRenderer
      slides={renderedSlides}
      onExportPDF={exportToPDF}
      className="marpit-presentation max-w-full"
    />
  )
}
