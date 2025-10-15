import css from './Presentation.marp.css?raw'

export const Slide = ({
  content,
  className,
}: {
  content: string
  className?: string
}) => (
  <div
    className={`w-full relative bg-black rounded-md overflow-hidden ${className}`}
    style={{ aspectRatio: '16/9' }}
  >
    <iframe
      title="Slide Preview"
      srcDoc={
        /* html */ `<!DOCTYPE html>
<html>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  ${css}
</style>
<body contenteditable>
${content}
</body>
</html>`
      }
      className="inset-0 w-full h-full border-0 rounded-md bg-transparent"
      sandbox="allow-same-origin allow-scripts allow-forms"
    />
  </div>
)
