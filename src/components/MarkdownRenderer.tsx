import { marked } from 'marked'
import React, { JSX, useEffect, useMemo, useState } from 'react'

import {
  type CodeBlockType,
  detectSpecializedCodeType,
  Widget,
} from './Widget/Widget'
import { useI18n } from '@/i18n'

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

interface ThinkBlock {
  id: string
  content: string
  processing: boolean
}

export const MarkdownRenderer = ({
  content,
  className = '',
}: MarkdownRendererProps) => {
  const [processedContent, setProcessedContent] = useState<{
    html: string
    codeBlocks: CodeBlock[]
    thinkBlocks: ThinkBlock[]
  }>({ html: '', codeBlocks: [], thinkBlocks: [] })

  const { t } = useI18n()

  useEffect(() => {
    const renderMarkdown = async () => {
      try {
        const codeBlocks: CodeBlock[] = []
        const thinkBlocks: ThinkBlock[] = []
        let processedMarkdown = content

        // Process <think> tags first
        const thinkTagRegex = /<think>([\s\S]*?)<\/think>/g
        const incompleteThinkRegex = /<think>([\s\S]*)$/
        let thinkMatch
        let thinkIndex = 0

        // First, process complete think tags
        while ((thinkMatch = thinkTagRegex.exec(content)) !== null) {
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
        const incompleteThinkMatch = incompleteThinkRegex.exec(content)
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

          // Handle the incomplete code block - check if it's an ABC block
          const incompletePartStart = content.lastIndexOf('```')
          const beforeIncomplete = content.substring(0, incompletePartStart)
          const incompletePart = content.substring(incompletePartStart)

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
              marked.setOptions({
                gfm: true, // GitHub Flavored Markdown
                breaks: true, // Line breaks
              })

              const beforeHtml = await marked.parse(beforeIncomplete)

              setProcessedContent({
                html: beforeHtml + placeholder,
                codeBlocks,
                thinkBlocks,
              })
              return
            }
          }

          // Fallback for non-specialized incomplete blocks
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
            thinkBlocks,
          })
          return
        }

        // Extract and process complete code blocks
        const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g
        let match
        let blockIndex = 0

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

        setProcessedContent({ html, codeBlocks, thinkBlocks })
      } catch (error) {
        console.error('Error rendering markdown:', error)
        // Fallback to plain text if markdown parsing fails
        setProcessedContent({
          html: content.replace(/\n/g, '<br>'),
          codeBlocks: [],
          thinkBlocks: [],
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
    const { html, codeBlocks, thinkBlocks } = processedContent

    if (
      (codeBlocks.length === 0 ||
        !codeBlocks.some((block) => block.type === 'specialized')) &&
      thinkBlocks.length === 0
    ) {
      // No specialized code blocks or think blocks, render normally
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
