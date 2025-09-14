import { useEffect, useState } from 'react'

/**
 * SVG Code Renderer
 */
export const SVG = ({ code }: { code: string }) => {
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
