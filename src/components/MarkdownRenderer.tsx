import { marked } from 'marked'
import React, { JSX, useEffect, useMemo, useState } from 'react'

import { type CodeBlockType, detectSpecializedCodeType, Widget } from './Widget'

interface MarkdownRendererProps {
  content: string
  className?: string
}

interface CodeBlock {
  id: string
  code: string
  language?: string
  type: 'specialized' | 'regular'
  specializedType?: CodeBlockType
}

export const MarkdownRenderer = ({
  content,
  className = '',
}: MarkdownRendererProps) => {
  const [processedContent, setProcessedContent] = useState<{
    html: string
    codeBlocks: CodeBlock[]
  }>({ html: '', codeBlocks: [] })

  useEffect(() => {
    const renderMarkdown = async () => {
      try {
        const codeBlocks: CodeBlock[] = []
        let processedMarkdown = content

        // Check for incomplete code blocks during streaming
        const codeBlockMatches = content.match(/```/g)
        const codeBlockCount = codeBlockMatches?.length || 0
        const hasIncompleteCodeBlock =
          content.includes('```') && codeBlockCount % 2 !== 0

        if (hasIncompleteCodeBlock) {
          console.debug(
            '[MarkdownRenderer] Detected incomplete code block during streaming, using progressive fallback',
          )

          // Process any complete code blocks that exist before the incomplete one
          const completeCodeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g
          let match
          let blockIndex = 0

          // Extract complete code blocks
          while ((match = completeCodeBlockRegex.exec(content)) !== null) {
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

          // For the incomplete part, just use line breaks
          const incompletePartStart = content.lastIndexOf('```')
          const beforeIncomplete = content.substring(0, incompletePartStart)
          const incompletePart = content.substring(incompletePartStart)

          // Configure marked for better formatting
          marked.setOptions({
            gfm: true, // GitHub Flavored Markdown
            breaks: true, // Line breaks
          })

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
          })
          return
        }

        // Extract and process complete code blocks
        const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g
        let match
        let blockIndex = 0

        console.log(
          `[MarkdownRenderer] Processing ${codeBlockCount / 2} complete code blocks`,
        )

        while ((match = codeBlockRegex.exec(content)) !== null) {
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

        // Configure marked for better formatting
        marked.setOptions({
          gfm: true, // GitHub Flavored Markdown
          breaks: true, // Line breaks
        })

        const html = await marked.parse(processedMarkdown)

        setProcessedContent({ html, codeBlocks })
      } catch (error) {
        console.error('Error rendering markdown:', error)
        // Fallback to plain text if markdown parsing fails
        setProcessedContent({
          html: content.replace(/\n/g, '<br>'),
          codeBlocks: [],
        })
      }
    }

    renderMarkdown()
  }, [content])

  const markdownStyles = {
    // Basic styling for markdown elements
    '--markdown-h1-size': '1.5rem',
    '--markdown-h2-size': '1.25rem',
    '--markdown-h3-size': '1.125rem',
    '--markdown-code-bg': 'var(--heroui-colors-default-100)',
    '--markdown-code-color': 'var(--heroui-colors-default-900)',
    '--markdown-blockquote-border': 'var(--heroui-colors-default-300)',
  } as React.CSSProperties

  const renderedContent = useMemo(() => {
    const { html, codeBlocks } = processedContent

    if (
      codeBlocks.length === 0 ||
      !codeBlocks.some((block) => block.type === 'specialized')
    ) {
      // No specialized code blocks, render normally
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
    const processNode = (node: Node): JSX.Element | string => {
      if (node.nodeType === Node.TEXT_NODE) {
        return node.textContent || ''
      }

      if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as Element

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
                key={`${codeBlockId}-${elementIndex++}`}
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
          } else {
            props[attr.name] = attr.value
          }
        })

        // Process children
        const children = Array.from(element.childNodes).map(processNode)

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
          elements.push(
            typeof processed === 'string' ? (
              <span key={`text-${elementIndex++}`}>{processed}</span>
            ) : (
              processed
            ),
          )
        }
      })
    }

    return (
      <div className={`markdown-content ${className}`} style={markdownStyles}>
        {elements}
      </div>
    )
  }, [processedContent, className])

  return renderedContent
}
