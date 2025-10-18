import { useEffect, useMemo, useRef, useState } from 'react'
import mermaid from 'mermaid'
import elkLayouts from '@mermaid-js/layout-elk'
import { userSettings } from '@/stores/userStore'

const useMermaid = (code: string) => {
  const [svg, setSvg] = useState<string | null>()
  const diagramIdRef = useRef<string>(undefined)

  const { theme, isDarkTheme } = userSettings()

  const isDark = useMemo(() => isDarkTheme(), [theme])

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'loose',
      layout: 'elk',
      fontFamily:
        "Bahnschrift, 'DIN Alternate', 'Franklin Gothic Medium', 'Nimbus Sans Narrow', sans-serif-condensed, sans-serif",
      theme: 'base',
      themeVariables: {
        darkMode: isDark,
        background: '#f4f4f4',
        fontSize: '16px',
        // noteBkgColor: '#f00',
        primaryColor: isDark ? '#15a15155' : '#e9faf1bb',
        secondaryColor: isDark ? '#ccc9' : '#fffce9',
        // noteTextColor: '#333',
        lineColor: isDark ? '#fff9' : '#333',
      },
    })

    mermaid.registerLayoutLoaders(elkLayouts)
  }, [isDark])

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
  }, [code, isDark])

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
