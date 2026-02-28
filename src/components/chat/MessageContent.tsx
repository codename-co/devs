import { memo } from 'react'
import { MarkdownRenderer, Widget, useTraceSources } from '@/components'
import { useTraceStore } from '@/stores/traceStore'

/**
 * Renders message content with optional source citations.
 * Handles string or multi-part content arrays.
 * Supports Marpit presentations when detected.
 */
export const MessageContent = memo(
  ({
    content: rawContent,
    traceIds = [],
    isStreaming = false,
  }: {
    content: string | Array<{ type: string; text?: string }>
    traceIds?: string[]
    isStreaming?: boolean
  }) => {
    // Normalize content to string
    const content =
      typeof rawContent === 'string'
        ? rawContent
        : Array.isArray(rawContent)
          ? rawContent
              .filter((p) => p.type === 'text' && p.text)
              .map((p) => p.text)
              .join('\n')
          : String(rawContent ?? '')

    const { citedSources } = useTraceSources({
      traceIds,
      loadTrace: useTraceStore.getState().loadTrace,
      getCurrentSpans: () => useTraceStore.getState().currentSpans,
      clearCurrentTrace: useTraceStore.getState().clearCurrentTrace,
      content,
    })

    // Detect Marpit presentations
    const isMarpit = (() => {
      const match = content.match(/^---\s*\n([\s\S]*?)\n---/)
      if (!match) return false
      return match[1].includes('marp: true') || match[1].includes('marp:true')
    })()

    return (
      <div className="text-left">
        <div className="prose prose-neutral text-medium break-words">
          {isMarpit ? (
            <Widget type="marpit" language="yaml" code={content} />
          ) : (
            <MarkdownRenderer
              content={content}
              className="prose dark:prose-invert"
              sources={citedSources}
              isStreaming={isStreaming}
            />
          )}
        </div>
      </div>
    )
  },
)

MessageContent.displayName = 'MessageContent'
