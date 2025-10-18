import { useEffect, useState } from 'react'
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
 */
export const Presentation = ({ code }: { code: string }) => {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [renderedContent, setRenderedContent] = useState<{
    html: string
    css: string
    slides: number
  } | null>(null)

  useEffect(() => {
    const renderMarpit = async () => {
      try {
        setLoading(true)
        setError(null)

        // Check if we're in a browser environment
        if (typeof window === 'undefined') {
          throw new Error('Marpit requires a browser environment')
        }

        // Dynamically import marpit from ESM CDN
        const Marpit = (
          await import('https://esm.sh/@marp-team/marpit@3.1.3' as string)
        ).Marpit

        // Create Marpit instance
        const marpit: MarpitType = new Marpit({
          // html: true,
          emoji: {
            shortcode: 'twemoji',
            unicode: 'twemoji',
            // twemoji: {
            //   base: '/resources/twemoji/',
            // },
          },
          math: 'mathjax',
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

        // Render the markdown
        const { html, css } = marpit.render(code)

        // Count slides by counting section elements in rendered HTML
        const slideCount = (html.match(/<section[^>]*>/g) || []).length

        setRenderedContent({
          html,
          css,
          slides: slideCount,
        })
      } catch (err) {
        console.error('Error rendering Marpit presentation:', err)
        setError(
          err instanceof Error
            ? err.message
            : 'Failed to render Marpit presentation',
        )
      } finally {
        setLoading(false)
      }
    }

    renderMarpit()
  }, [code])

  const exportToPDF = () => {
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
  }

  // This effect is now handled in the individual slide containers

  if (loading) {
    return <Spinner size="lg" className="m-4" />
  }

  if (error) {
    return (
      <Alert color="danger" title="Marpit rendering error">
        {error}
      </Alert>
    )
  }

  if (!renderedContent) {
    return <Alert color="default">No slides to display</Alert>
  }

  // Create slides array - each slide contains only its specific section HTML
  const renderedSlides = Array.from(
    { length: renderedContent.slides },
    (_, index) => extractSlideHTML(renderedContent.html, index),
  )

  return (
    <SlidesRenderer
      slides={renderedSlides}
      onExportPDF={exportToPDF}
      className="marpit-presentation w-[80em] max-w-full"
    />
  )
}
