import { useEffect, useRef, useState } from 'react'
import mermaid from 'mermaid'

// Global initialization to ensure mermaid is only initialized once
mermaid.initialize({
  startOnLoad: false,
  theme: 'neutral',
  securityLevel: 'loose',
  fontFamily: 'inherit',
})

const useMermaid = (code: string) => {
  const [svg, setSvg] = useState<string | null>()
  const diagramIdRef = useRef<string>(undefined)

  // Create a unique ID per component instance
  if (!diagramIdRef.current) {
    diagramIdRef.current = `mermaid-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
  }

  useEffect(() => {
    const renderMermaid = async () => {
      try {
        // Clear any previous SVG state
        setSvg(null)

        // Use a unique ID for each render attempt
        const uniqueId = `${diagramIdRef.current}-${Date.now()}`
        const { svg } = await mermaid.render(uniqueId, code)
        setSvg(svg)
      } catch (error) {
        console.error('Error rendering Mermaid diagram:', error)
        setSvg(null)
      }
    }

    renderMermaid()
  }, [code])

  return { diagramId: diagramIdRef.current, svg }
}

/**
 * Mermaid Diagram Renderer
 */
export const Diagram = ({ code }: { code: string }) => {
  const { svg } = useMermaid(code)

  return (
    <div
      className="mermaid-diagram-container place-items-center"
      dangerouslySetInnerHTML={{ __html: svg || '' }}
    />
  )
}
