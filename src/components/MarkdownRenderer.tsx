import { marked } from 'marked'
import katex from 'katex'
import React, { JSX, useEffect, useMemo, useRef, useState } from 'react'

import {
  type CodeBlockType,
  detectSpecializedCodeType,
  Widget,
} from './Widget/Widget'
import { useI18n } from '@/i18n'
import type { SourceInfo } from './InlineSource'
import {
  InlineCitation,
  SemanticCitation,
  EXTENDED_CITATION_PATTERN,
  getSemanticCitationType,
} from './InlineSource'

interface MarkdownRendererProps {
  content: string
  className?: string
  renderWidgets?: boolean
  /** Sources for inline citation rendering */
  sources?: SourceInfo[]
  /** Whether the content is actively streaming — enables throttled re-parsing */
  isStreaming?: boolean
}

interface CodeBlock {
  id: string
  code: string
  language?: string
  type: 'specialized' | 'regular'
  specializedType?: CodeBlockType
}

interface ThinkBlock {
  id: string
  content: string
  processing: boolean
}

interface MathBlock {
  id: string
  latex: string
}

export const MarkdownRenderer = ({
  content,
  className = '',
  renderWidgets = true,
  sources = [],
  isStreaming = false,
}: MarkdownRendererProps) => {
  const [processedContent, setProcessedContent] = useState<{
    html: string
    codeBlocks: CodeBlock[]
    thinkBlocks: ThinkBlock[]
    mathBlocks: MathBlock[]
  }>({ html: '', codeBlocks: [], thinkBlocks: [], mathBlocks: [] })

  const { t } = useI18n()

  // Helper function to configure marked with KaTeX support
  const configureMarked = () => {
    marked.setOptions({
      gfm: true, // GitHub Flavored Markdown
      breaks: true, // Line breaks
    })

    // Reset and configure marked extensions
    marked.use({
      renderer: {
        code(token) {
          if (!token.lang) {
            // Check if the code block starts and ends with $$ for display math
            if (token.text.match(/^\$\$[\s\S]*\$\$$/)) {
              const expr = token.text.substring(2, token.text.length - 2)
              return katex.renderToString(expr, { displayMode: true })
            }
          }
          // Fallback to default renderer for other code blocks
          return false
        },
        codespan(token) {
          // Check if the codespan starts and ends with $$ for inline math (wrapped format)
          if (token.text.match(/^\$\$[\s\S]*\$\$$/)) {
            const expr = token.text.substring(2, token.text.length - 2)
            return katex.renderToString(expr, { displayMode: false })
          }
          // Fallback to default renderer for other codespans
          return false
        },
      },
    })
  }

  // Throttle markdown parsing during streaming to avoid re-parsing on every token.
  // When streaming, we wait THROTTLE_MS after the last content change before re-parsing.
  // When not streaming, we parse immediately.
  const THROTTLE_MS = 60
  const throttleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const latestContentRef = useRef(content)
  latestContentRef.current = content

  useEffect(() => {
    return () => {
      if (throttleTimerRef.current) clearTimeout(throttleTimerRef.current)
    }
  }, [])

  useEffect(() => {
    const doRender = () => renderMarkdown(latestContentRef.current)

    if (isStreaming) {
      // Throttle during streaming
      if (throttleTimerRef.current) clearTimeout(throttleTimerRef.current)
      throttleTimerRef.current = setTimeout(doRender, THROTTLE_MS)
    } else {
      // Immediate parse when not streaming (historical messages, final content)
      if (throttleTimerRef.current) {
        clearTimeout(throttleTimerRef.current)
        throttleTimerRef.current = null
      }
      doRender()
    }
  }, [content, isStreaming])

  const renderMarkdown = async (contentToRender: string) => {
    try {
      const codeBlocks: CodeBlock[] = []
      const thinkBlocks: ThinkBlock[] = []
      let processedMarkdown = contentToRender

      // Preprocess display math: Convert $$...$$ to placeholders
      const mathBlocks: { id: string; latex: string }[] = []
      let mathBlockIndex = 0

      // Match $$...$$ blocks (display math)
      processedMarkdown = processedMarkdown.replace(
        /\$\$([\s\S]*?)\$\$/g,
        (_match, latex) => {
          const id = `math-block-${mathBlockIndex++}`
          mathBlocks.push({ id, latex: latex.trim() })
          return `<div data-math-block-id="${id}"></div>`
        },
      )

      // Preprocess inline math: Convert $...$ to `$...$` so marked treats it as code
      // Use a more robust regex that handles special characters in LaTeX
      processedMarkdown = processedMarkdown.replace(
        /\$([^$\n]+?)\$/g,
        (_match, expr) => `\`$$${expr}$$\``,
      )

      // Process <think> tags first
      const thinkTagRegex = /<think>([\s\S]*?)<\/think>/g
      const incompleteThinkRegex = /<think>([\s\S]*)$/
      let thinkMatch
      let thinkIndex = 0

      // First, process complete think tags
      while ((thinkMatch = thinkTagRegex.exec(contentToRender)) !== null) {
        const [fullMatch, thinkContent] = thinkMatch
        const blockId = `think-block-${thinkIndex++}`

        // Replace with a placeholder
        const placeholder = `<div data-think-block-id="${blockId}"></div>`
        processedMarkdown = processedMarkdown.replace(fullMatch, placeholder)

        thinkBlocks.push({
          id: blockId,
          content: thinkContent.trim(),
          processing: false, // Complete blocks are not processing
        })
      }

      // Check for incomplete think tag at the end
      const incompleteThinkMatch = incompleteThinkRegex.exec(contentToRender)
      if (incompleteThinkMatch) {
        const [fullMatch, thinkContent] = incompleteThinkMatch
        const blockId = `think-block-${thinkIndex++}`

        // Replace with a placeholder
        const placeholder = `<div data-think-block-id="${blockId}"></div>`
        processedMarkdown = processedMarkdown.replace(fullMatch, placeholder)

        thinkBlocks.push({
          id: blockId,
          content: thinkContent.trim(),
          processing: true, // Incomplete blocks are still processing
        })
      }

      if (renderWidgets) {
        // Check for incomplete code blocks during streaming
        const codeBlockMatches = contentToRender.match(/```/g)
        const codeBlockCount = codeBlockMatches?.length || 0
        const hasIncompleteCodeBlock =
          contentToRender.includes('```') && codeBlockCount % 2 !== 0

        if (hasIncompleteCodeBlock) {
          // console.debug(
          //   '[MarkdownRenderer] Detected incomplete code block during streaming, using progressive fallback',
          // )

          // Process any complete code blocks that exist before the incomplete one
          const completeCodeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g
          let match
          let blockIndex = 0

          // Extract complete code blocks
          while (
            (match = completeCodeBlockRegex.exec(contentToRender)) !== null
          ) {
            const [fullMatch, language, code] = match
            const blockId = `code-block-${blockIndex++}`

            // Detect if this is a specialized code block
            const specializedType = detectSpecializedCodeType(code, language)

            if (specializedType) {
              // Replace with a placeholder that we'll process later
              const placeholder = `<div data-code-block-id="${blockId}"></div>`
              processedMarkdown = processedMarkdown.replace(
                fullMatch,
                placeholder,
              )

              codeBlocks.push({
                id: blockId,
                code: code.trim(),
                language,
                type: 'specialized',
                specializedType,
              })
            } else {
              // Keep regular code blocks as-is for normal markdown processing
              codeBlocks.push({
                id: blockId,
                code: code.trim(),
                language,
                type: 'regular',
              })
            }
          }

          // Handle the incomplete code block - check if it's an ABC block
          const incompletePartStart = contentToRender.lastIndexOf('```')
          const beforeIncomplete = contentToRender.substring(
            0,
            incompletePartStart,
          )
          const incompletePart = contentToRender.substring(incompletePartStart)

          // Extract language and partial code from incomplete block
          const incompleteMatch = incompletePart.match(/```(\w+)?\n?([\s\S]*)$/)
          if (incompleteMatch) {
            const [, incompleteLanguage, incompleteCode] = incompleteMatch
            const partialSpecializedType = detectSpecializedCodeType(
              incompleteCode,
              incompleteLanguage,
            )

            // If it's a specialized block (like ABC), render it immediately as incomplete
            if (partialSpecializedType) {
              const incompleteBlockId = `code-block-${blockIndex++}`
              const placeholder = `<div data-code-block-id="${incompleteBlockId}"></div>`

              codeBlocks.push({
                id: incompleteBlockId,
                code: incompleteCode.trim(),
                language: incompleteLanguage,
                type: 'specialized',
                specializedType: partialSpecializedType,
              })

              // Configure marked for better formatting
              configureMarked()

              const beforeHtml = await marked.parse(beforeIncomplete)

              setProcessedContent({
                html: beforeHtml + placeholder,
                codeBlocks,
                thinkBlocks,
                mathBlocks,
              })
              return
            }
          }

          // Fallback for non-specialized incomplete blocks
          // Configure marked for better formatting
          configureMarked()

          const beforeHtml =
            codeBlocks.length > 0
              ? await marked.parse(
                  beforeIncomplete.substring(
                    0,
                    beforeIncomplete.lastIndexOf('```'),
                  ),
                )
              : await marked.parse(beforeIncomplete)

          const incompleteHtml = incompletePart.replace(/\n/g, '<br>')

          setProcessedContent({
            html: beforeHtml + incompleteHtml,
            codeBlocks,
            thinkBlocks,
            mathBlocks,
          })
          return
        }

        // Extract and process complete code blocks
        const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g
        let match
        let blockIndex = 0

        while ((match = codeBlockRegex.exec(contentToRender)) !== null) {
          const [fullMatch, language, code] = match
          const blockId = `code-block-${blockIndex++}`

          // Check if this is a math block (KaTeX)
          const isMathBlock =
            !language && code.trim().match(/^\$\$[\s\S]*\$\$$/)

          // Detect if this is a specialized code block
          const specializedType = detectSpecializedCodeType(code, language)

          if (isMathBlock) {
            // Leave math blocks in the markdown for KaTeX processing
            // Don't extract them
            continue
          } else if (specializedType) {
            // Replace with a placeholder that we'll process later
            const placeholder = `<div data-code-block-id="${blockId}"></div>`
            processedMarkdown = processedMarkdown.replace(
              fullMatch,
              placeholder,
            )

            codeBlocks.push({
              id: blockId,
              code: code.trim(),
              language,
              type: 'specialized',
              specializedType,
            })
          } else {
            // Keep regular code blocks as-is for normal markdown processing
            codeBlocks.push({
              id: blockId,
              code: code.trim(),
              language,
              type: 'regular',
            })
          }
        }
      }

      // Configure marked for better formatting
      configureMarked()

      // console.debug(
      //   '📝 PROCESSED MARKDOWN BEFORE PARSE:',
      //   processedMarkdown.substring(0, 500),
      // )
      const html = await marked.parse(processedMarkdown)
      // console.debug('📄 HTML AFTER PARSE:', html.substring(0, 500))

      setProcessedContent({ html, codeBlocks, thinkBlocks, mathBlocks })
    } catch (error) {
      console.error('Error rendering markdown:', error)
      // Fallback to plain text if markdown parsing fails
      setProcessedContent({
        html: contentToRender.replace(/\n/g, '<br>'),
        codeBlocks: [],
        thinkBlocks: [],
        mathBlocks: [],
      })
    }
  }

  const markdownStyles = {
    // Basic styling for markdown elements
    '--markdown-h1-size': '1.5rem',
    '--markdown-h2-size': '1.25rem',
    '--markdown-h3-size': '1.125rem',
    '--markdown-code-bg': 'var(--heroui-colors-default-100)',
    '--markdown-code-color': 'var(--heroui-colors-default-900)',
    '--markdown-blockquote-border': 'var(--heroui-colors-default-300)',
  } as React.CSSProperties

  // Helper to process text and replace citations with React components
  // Handles both numeric citations [1], [2] and semantic citations [Memory], [Pinned], [Document Name]
  const processCitations = (
    text: string,
    keyPrefix: string,
  ): (string | JSX.Element)[] => {
    const parts: (string | JSX.Element)[] = []
    let lastIndex = 0
    const citationRegex = new RegExp(EXTENDED_CITATION_PATTERN.source, 'g')
    let match

    while ((match = citationRegex.exec(text)) !== null) {
      // Add text before the citation
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index))
      }

      const capturedValue = match[1]
      const isNumeric = /^\d+$/.test(capturedValue)

      if (isNumeric) {
        // Numeric citation [1], [2], etc.
        const refNumber = parseInt(capturedValue, 10)
        const source = sources.find((s) => s.refNumber === refNumber)

        if (source) {
          parts.push(
            <InlineCitation
              key={`${keyPrefix}-citation-${match.index}`}
              number={refNumber}
              source={source}
            />,
          )
        } else {
          // Keep as text if no matching source
          parts.push(match[0])
        }
      } else {
        // Semantic citation [Memory], [Pinned], or [Document Name]
        const semanticType = getSemanticCitationType(capturedValue)
        parts.push(
          <SemanticCitation
            key={`${keyPrefix}-semantic-${match.index}`}
            type={semanticType || 'document'}
            label={capturedValue}
          />,
        )
      }

      lastIndex = match.index + match[0].length
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex))
    }

    return parts.length > 0 ? parts : [text]
  }

  const renderedContent = useMemo(() => {
    const { html, codeBlocks, thinkBlocks, mathBlocks } = processedContent

    // Check for numeric citations (requires sources) or semantic citations in content
    const hasNumericCitations = sources.length > 0
    const hasSemanticCitations =
      /\[(Memory|Pinned|[A-Z][A-Za-z0-9\s\-_.]+)\]/.test(html)
    const hasCitations = hasNumericCitations || hasSemanticCitations

    if (
      (codeBlocks.length === 0 ||
        !codeBlocks.some((block) => block.type === 'specialized')) &&
      thinkBlocks.length === 0 &&
      mathBlocks.length === 0 &&
      !hasCitations
    ) {
      // No specialized code blocks, think blocks, math blocks, or citations, render normally
      return (
        <div
          className={`markdown-content ${className}`}
          dangerouslySetInnerHTML={{ __html: html }}
          style={markdownStyles}
        />
      )
    }

    // Parse HTML and replace placeholders with React components
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')

    const elements: JSX.Element[] = []

    let elementIndex = 0
    const processNode = (
      node: Node,
    ): JSX.Element | string | (string | JSX.Element)[] => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent || ''
        // Process citations in text nodes
        if (hasCitations && text) {
          const parts = processCitations(text, `text-${elementIndex++}`)
          // If only one part and it's the same as input, return as string
          if (parts.length === 1 && parts[0] === text) {
            return text
          }
          return parts
        }
        return text
      }

      if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as Element

        // Check if this is a math block placeholder
        const mathBlockId = element.getAttribute('data-math-block-id')
        if (mathBlockId) {
          const mathBlock = mathBlocks.find((block) => block.id === mathBlockId)
          if (mathBlock) {
            try {
              const rendered = katex.renderToString(mathBlock.latex, {
                displayMode: true,
              })
              return (
                <div
                  key={mathBlockId}
                  className="my-4"
                  dangerouslySetInnerHTML={{ __html: rendered }}
                />
              )
            } catch (err) {
              console.error('KaTeX render error:', err)
              return (
                <div key={mathBlockId} className="my-4 text-red-500">
                  Error rendering math: {mathBlock.latex}
                </div>
              )
            }
          }
        }

        // Check if this is a think block placeholder
        const thinkBlockId = element.getAttribute('data-think-block-id')
        if (thinkBlockId) {
          const thinkBlock = thinkBlocks.find(
            (block) => block.id === thinkBlockId,
          )
          if (thinkBlock) {
            return (
              <details key={thinkBlockId} className="my-4">
                <summary className="cursor-pointer">
                  {thinkBlock.processing ? t('Thinking…') : t('Thoughts')}
                </summary>
                <div className="ml-4 text-sm text-gray-600 hover:text-gray-800 whitespace-pre-wrap">
                  {thinkBlock.content}
                </div>
              </details>
            )
          }
        }

        // Check if this is a code block placeholder
        const codeBlockId = element.getAttribute('data-code-block-id')
        if (codeBlockId) {
          const codeBlock = codeBlocks.find((block) => block.id === codeBlockId)
          if (
            codeBlock &&
            codeBlock.type === 'specialized' &&
            codeBlock.specializedType
          ) {
            return (
              <Widget
                key={codeBlockId}
                code={codeBlock.code}
                type={codeBlock.specializedType}
                language={codeBlock.language}
                className="my-4"
              />
            )
          }
        }

        // Process regular elements
        const tagName = element.tagName.toLowerCase()
        const props: Record<string, unknown> = {
          key: `element-${elementIndex++}`,
        }

        // Copy attributes
        Array.from(element.attributes).forEach((attr) => {
          if (attr.name === 'class') {
            props.className = attr.value
          } else if (attr.name === 'style') {
            // Parse inline style string into React style object
            const styleObj: Record<string, string> = {}
            attr.value.split(';').forEach((style) => {
              const [key, value] = style.split(':').map((s) => s.trim())
              if (key && value) {
                // Convert kebab-case to camelCase
                const camelKey = key.replace(/-([a-z])/g, (g) =>
                  g[1].toUpperCase(),
                )
                styleObj[camelKey] = value
              }
            })
            props.style = styleObj
          } else {
            props[attr.name] = attr.value
          }
        })

        // Process children - flatten arrays from citation processing
        const children = Array.from(element.childNodes).flatMap((child) => {
          const result = processNode(child)
          return Array.isArray(result) ? result : [result]
        })

        return React.createElement(tagName, props, ...children)
      }

      return ''
    }

    // Process body content
    const bodyContent = doc.body
    if (bodyContent) {
      Array.from(bodyContent.childNodes).forEach((node) => {
        const processed = processNode(node)
        if (processed) {
          if (Array.isArray(processed)) {
            // Citation processing returned multiple parts
            processed.forEach((part, idx) => {
              if (typeof part === 'string') {
                elements.push(
                  <span key={`text-${elementIndex++}-${idx}`}>{part}</span>,
                )
              } else {
                elements.push(part)
              }
            })
          } else if (typeof processed === 'string') {
            elements.push(
              <span key={`text-${elementIndex++}`}>{processed}</span>,
            )
          } else {
            elements.push(processed)
          }
        }
      })
    }

    return (
      <div className={`markdown-content ${className}`} style={markdownStyles}>
        {elements}
      </div>
    )
  }, [processedContent, className, sources, processCitations])

  return (
    <>
      {renderedContent}
      {isStreaming && (
        <span
          className="inline-block w-[3px] h-[1.1em] bg-primary-500 align-text-bottom ml-0.5 animate-pulse"
          aria-hidden="true"
        />
      )}
    </>
  )
}
