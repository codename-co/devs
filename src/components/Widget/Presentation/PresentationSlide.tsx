import { memo, useMemo } from 'react'
import css from './Presentation.marp.css?raw'

/**
 * Individual slide component optimized for streaming
 * Uses memo to prevent re-renders when content hasn't changed
 */
export const Slide = memo(
  ({ content, className }: { content: string; className?: string }) => {
    // Memoize the srcDoc to prevent iframe reloads
    const srcDoc = useMemo(
      () => /* html */ `<!DOCTYPE html>
<html>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  ${css}
</style>
<body contenteditable>
${content}
</body>
</html>`,
      [content],
    )

    return (
      <div
        className={`w-full relative bg-black rounded-md overflow-hidden ${className}`}
        style={{ aspectRatio: '16/9' }}
      >
        <iframe
          title="Slide Preview"
          srcDoc={srcDoc}
          className="inset-0 w-full h-full border-0 rounded-md bg-transparent"
          sandbox="allow-same-origin allow-scripts allow-forms"
        />
      </div>
    )
  },
)

Slide.displayName = 'Slide'
