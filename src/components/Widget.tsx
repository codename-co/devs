import './widget.css'

import { Card, CardBody, CardHeader, Tab, Tabs } from '@heroui/react'
import { useEffect, useRef, useState } from 'react'

// Type definitions for specialized widgets
export type CodeBlockType = 'abc' | 'svg' | 'diagram' | 'chart' | 'generic'

export interface WidgetProps {
  code: string
  type: CodeBlockType
  language?: string
  className?: string
}

// ABC Music Notation Renderer
const ABCRenderer = ({ code }: { code: string }) => {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState<boolean | undefined>()
  const wrapperRef = useRef<HTMLDivElement>(null)
  const abcContainerRef = useRef<HTMLDivElement | null>(null)
  const isRenderingRef = useRef<boolean>(false)

  useEffect(() => {
    const wrapper = wrapperRef.current
    if (!wrapper || isRenderingRef.current) {
      return
    }

    isRenderingRef.current = true

    const renderABC = async () => {
      try {
        setLoading(true)

        // Check if we're in a browser environment
        if (typeof window === 'undefined') {
          throw new Error('ABC.js requires a browser environment')
        }

        // Check if ABC content appears incomplete (missing required elements)
        const trimmedCode = code.trim()
        const hasKeySignature = /K:\s*\w+/i.test(trimmedCode)
        const hasMeter = /M:\s*[\d\/]+/i.test(trimmedCode)
        const hasIndex = /X:\s*\d+/i.test(trimmedCode)
        
        // Consider it incomplete if it's missing essential ABC elements
        const codeIncomplete = !hasKeySignature && !hasMeter && !hasIndex

        // Clear all previous content
        wrapper.innerHTML = ''
        abcContainerRef.current = null

        // For very incomplete content, show a preview message
        if (codeIncomplete && trimmedCode.length < 10) {
          const previewContainer = document.createElement('div')
          previewContainer.className = 'abc-preview-container p-4 bg-default-50 border border-default-200 rounded-md'
          previewContainer.innerHTML = '<p class="text-sm text-default-600">ABC notation streaming...</p>'
          wrapper.appendChild(previewContainer)
          setError(null)
          setLoading(false)
          return
        }

        // Dynamically import abcjs from ESM CDN
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const abcjs = await import('https://esm.sh/abcjs@6.5' as any)

        // Try to render even incomplete ABC - abcjs is quite forgiving
        const abcContainer = document.createElement('div')
        abcContainer.className = 'widget abc-notation-isolated'
        
        try {
          const visualObj = abcjs.renderAbc(abcContainer, code, {
            responsive: 'resize',
            visualTranspose: 0,
            oneSvgPerLine: false
          })[0]

          abcContainerRef.current = abcContainer
          wrapper.appendChild(abcContainer)

          // Only add audio controls if we have a complete-enough tune
          if (!codeIncomplete && visualObj) {
            const synth = new abcjs.synth.CreateSynth()
            const myContext = new AudioContext()
            const audioParams = {
              options: { program: 1 }, // Piano
            }
            
            synth
              .init({
                audioContext: myContext,
                visualObj: visualObj[0],
                millisecondsPerMeasure: 500,
                options: audioParams,
              })
              .then(function (_results: SpeechSynthesisEventInit) {
                // Ready to play. The results are details about what was loaded.
              })
              .catch(function (reason: Error | string) {
                console.log('Audio init failed:', reason)
              })

            // audio player
            const audioPlayer = document.createElement('div')
            audioPlayer.className = 'abc-notation-audio-player'
            const synthControl = new abcjs.synth.SynthController()
            synthControl.load(audioPlayer)
            synthControl.setTune(visualObj, false, audioParams.options)

            wrapper.appendChild(audioPlayer)
          } else if (codeIncomplete) {
            // Add a note that this is streaming content
            const streamingNote = document.createElement('div')
            streamingNote.className = 'mt-2 text-xs text-default-500'
            streamingNote.textContent = 'ABC notation is still streaming...'
            wrapper.appendChild(streamingNote)
          }
        } catch (renderError) {
          // If rendering fails, show the partial content in a preview
          console.log('ABC rendering failed, showing preview:', renderError)
          const previewContainer = document.createElement('div')
          previewContainer.className = 'abc-preview-container p-4 bg-warning-50 border border-warning-200 rounded-md'
          previewContainer.innerHTML = `
            <p class="text-sm text-warning-700 mb-2">ABC notation preview (streaming...)</p>
            <pre class="text-xs font-mono bg-default-100 p-2 rounded overflow-x-auto">${trimmedCode}</pre>
          `
          wrapper.appendChild(previewContainer)
        }

        setError(null)
      } catch (err) {
        console.error('Error rendering ABC notation:', err)
        setError(
          err instanceof Error ? err.message : 'Failed to render ABC notation',
        )
      } finally {
        setLoading(false)
        // isRenderingRef.current = false
      }
    }

    renderABC()

    // Cleanup function - clear all content and reset rendering flag
    return () => {
      wrapper.innerHTML = ''
      abcContainerRef.current = null
      // isRenderingRef.current = false
    }
  }, [code])

  if (loading) {
    return (
      <div className="p-4 bg-default-50 border border-default-200 rounded-md">
        <p className="text-sm text-default-600">
          Loading ABC notation renderer...
        </p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 bg-danger-50 border border-danger-200 text-danger-700 rounded-md">
        <p className="font-semibold">Rendering Error</p>
        <p className="text-sm">{error}</p>
        <details className="mt-2">
          <summary className="cursor-pointer text-xs underline">
            View ABC Source
          </summary>
          <pre className="bg-default-100 p-2 rounded text-xs mt-2 overflow-x-auto">
            <code>{code}</code>
          </pre>
        </details>
      </div>
    )
  }

  return <div ref={wrapperRef} className="abc-notation-container" />
}

// Mermaid Diagram Renderer
const MermaidRenderer = ({ code }: { code: string }) => {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState<boolean | undefined>()
  const wrapperRef = useRef<HTMLDivElement>(null)
  const mermaidContainerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const wrapper = wrapperRef.current
    if (!wrapper) {
      return
    }

    const renderMermaid = async () => {
      try {
        setLoading(true)

        // Check if we're in a browser environment
        if (typeof window === 'undefined') {
          throw new Error('Mermaid requires a browser environment')
        }

        // Create a completely isolated container that React won't manage
        if (mermaidContainerRef.current) {
          wrapper.removeChild(mermaidContainerRef.current)
        }

        const mermaidContainer = document.createElement('div')
        mermaidContainer.className = 'widget mermaid-diagram-isolated'
        mermaidContainerRef.current = mermaidContainer
        wrapper.appendChild(mermaidContainer)

        // Dynamically import mermaid from ESM CDN
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mermaid = await import('https://esm.sh/mermaid@11' as any)

        // Initialize mermaid with configuration
        mermaid.default.initialize({
          startOnLoad: false,
          theme: 'neutral',
          securityLevel: 'loose',
          fontFamily: 'inherit',
        })

        // Generate unique ID for this diagram
        const diagramId = `mermaid-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`

        // Render the mermaid diagram
        const { svg } = await mermaid.default.render(diagramId, code)
        mermaidContainer.innerHTML = svg

        setError(null)
      } catch (err) {
        console.error('Error rendering Mermaid diagram:', err)
        setError(
          err instanceof Error
            ? err.message
            : 'Failed to render Mermaid diagram',
        )
      } finally {
        setLoading(false)
      }
    }

    renderMermaid()

    // Cleanup function - manually remove the isolated container
    return () => {
      if (
        mermaidContainerRef.current &&
        wrapper.contains(mermaidContainerRef.current)
      ) {
        wrapper.removeChild(mermaidContainerRef.current)
        mermaidContainerRef.current = null
      }
    }
  }, [code])

  if (loading) {
    return (
      <div className="p-4 bg-default-50 border border-default-200 rounded-md">
        <p className="text-sm text-default-600">
          Loading Mermaid diagram renderer...
        </p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 bg-danger-50 border border-danger-200 text-danger-700 rounded-md">
        <p className="font-semibold">Rendering Error</p>
        <p className="text-sm">{error}</p>
        <details className="mt-2">
          <summary className="cursor-pointer text-xs underline">
            View Mermaid Source
          </summary>
          <pre className="bg-default-100 p-2 rounded text-xs mt-2 overflow-x-auto">
            <code>{code}</code>
          </pre>
        </details>
      </div>
    )
  }

  return <div ref={wrapperRef} className="mermaid-diagram-container" />
}

// SVG Code Renderer
const SVGRenderer = ({ code }: { code: string }) => {
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Basic SVG validation
    if (!code.trim().startsWith('<svg') || !code.trim().endsWith('</svg>')) {
      setError('Invalid SVG format')
    } else {
      setError(null)
    }
  }, [code])

  if (error) {
    return (
      <div className="p-4 bg-danger-50 border border-danger-200 text-danger-700 rounded-md">
        <p className="font-semibold">SVG Error</p>
        <p className="text-sm">{error}</p>
      </div>
    )
  }

  return (
    <div
      className="svg-container flex justify-center items-center p-4"
      dangerouslySetInnerHTML={{ __html: code }}
    />
  )
}

// Main specialized widget component
export const Widget = ({
  code,
  type,
  language,
  className = '',
}: WidgetProps) => {
  const [viewMode, setViewMode] = useState<'source' | 'render'>('render')

  const getTitle = () => {
    switch (type) {
      case 'abc':
        return 'ABC Music Notation'
      case 'svg':
        return 'SVG Graphics'
      case 'diagram':
        return 'Mermaid Diagram'
      case 'chart':
        return 'Chart'
      default:
        return `${language || 'Code'} Block`
    }
  }

  const renderContent = () => {
    if (viewMode === 'source') {
      return (
        <pre className="bg-default-100 p-4 rounded-md overflow-x-auto">
          <code className="text-sm font-mono">{code}</code>
        </pre>
      )
    }

    // Render based on type
    switch (type) {
      case 'abc':
        return <ABCRenderer code={code} />
      case 'svg':
        return <SVGRenderer code={code} />
      case 'diagram':
        return <MermaidRenderer code={code} />
      default:
        // For other types, show source by default until specific renderers are implemented
        return (
          <div className="p-4 bg-warning-50 border border-warning-200 text-warning-700 rounded-md">
            <p className="font-semibold">Renderer Not Implemented</p>
            <p className="text-sm">
              The renderer for "{type}" blocks is not yet implemented. Showing
              source code.
            </p>
            <pre className="bg-default-100 p-4 rounded-md overflow-x-auto mt-2">
              <code className="text-sm font-mono">{code}</code>
            </pre>
          </div>
        )
    }
  }

  return (
    <Card className={`specialized-code-block ${className}`}>
      <CardHeader className="flex justify-between items-center">
        <h4 className="text-sm font-semibold text-default-600">{getTitle()}</h4>

        <div className="flex gap-2">
          <Tabs
            aria-label="View mode"
            size="sm"
            selectedKey={viewMode === 'render' ? 'render' : 'source'}
            onSelectionChange={(key) => setViewMode(key as 'render' | 'source')}
          >
            <Tab key="render" title="Render"></Tab>
            <Tab key="source" title="Code"></Tab>
          </Tabs>
        </div>
      </CardHeader>
      <CardBody className="pt-0">{renderContent()}</CardBody>
    </Card>
  )
}

// Auto-detection helper function
export const detectSpecializedCodeType = (
  code: string,
  language?: string,
): CodeBlockType | null => {
  const trimmedCode = code.trim()

  // ABC Music Notation detection - enhanced for streaming
  if (language === 'abc') {
    return 'abc'
  }
  
  // Check for ABC notation patterns - common ABC headers that might appear early in streaming
  if (
    trimmedCode.includes('X:') || // Index number (usually first line)
    trimmedCode.includes('T:') || // Title
    trimmedCode.includes('M:') || // Meter
    trimmedCode.includes('L:') || // Default note length
    trimmedCode.includes('K:') || // Key signature
    trimmedCode.includes('Q:') || // Tempo
    (trimmedCode.includes('M:') && trimmedCode.includes('K:')) // Traditional check
  ) {
    return 'abc'
  }

  // SVG detection
  if (
    language === 'svg' ||
    (trimmedCode.startsWith('<svg') && trimmedCode.endsWith('</svg>'))
  ) {
    return 'svg'
  }

  // Diagram detection (placeholder for future implementations)
  if (language === 'mermaid' || language === 'diagram') {
    return 'diagram'
  }

  // Chart detection (placeholder for future implementations)
  if (language === 'chart' || language === 'plotly') {
    return 'chart'
  }

  return null
}
