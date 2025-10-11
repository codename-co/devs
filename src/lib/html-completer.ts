export const completeStreamingHtml = (html: string): string => {
  const foundIssues: { type: string; message: string }[] = []
  let completed: string = html

  // Track open tags and their positions
  let inScript = false
  let scriptContent = ''
  let scriptStart = -1
  let scriptMatch: RegExpMatchArray | null = null

  // Find the LAST script tag that doesn't have a closing tag yet
  const scriptRegex = /<script[^>]*>/gi
  let match: RegExpMatchArray | null
  let lastOpenScriptIndex = -1
  let lastOpenScriptMatch: RegExpMatchArray | null = null

  while ((match = scriptRegex.exec(html)) !== null) {
    const scriptStartPos = match.index! + match[0].length
    const afterScript = html.slice(scriptStartPos)

    // Check if this script tag has a closing tag
    if (!afterScript.includes('</script>')) {
      lastOpenScriptIndex = scriptStartPos
      lastOpenScriptMatch = match
    }
  }

  if (lastOpenScriptIndex > -1 && lastOpenScriptMatch) {
    inScript = true
    scriptStart = lastOpenScriptIndex
    scriptContent = html.slice(scriptStart)
    scriptMatch = lastOpenScriptMatch
  }

  if (inScript && scriptContent) {
    // Parse JSX/JavaScript content
    let braceCount = 0
    let parenCount = 0
    let bracketCount = 0
    let inString = false
    let stringChar = ''
    let lastNonWhitespace = ''

    // First pass: track delimiter stack and strings
    const delimiterStack: string[] = [] // Track opening order
    let lastAngleBracket = '' // Track last < or > we saw
    let inJsxContentPass1 = false

    for (let i = 0; i < scriptContent.length; i++) {
      const char = scriptContent[i]
      const prevChar = i > 0 ? scriptContent[i - 1] : ''

      // Simple heuristic for JSX content detection:
      // If we just saw a > and haven't seen a < yet, we might be in JSX content
      if (!inString) {
        if (char === '>') {
          lastAngleBracket = '>'
          // After >, we're potentially in JSX content
          inJsxContentPass1 = true
        } else if (char === '<') {
          lastAngleBracket = '<'
          inJsxContentPass1 = false
        }
      }

      // Handle strings (but not in JSX text content)
      if (
        (char === '"' || char === "'" || char === '`') &&
        prevChar !== '\\' &&
        !inJsxContentPass1
      ) {
        if (!inString) {
          inString = true
          stringChar = char
        } else if (char === stringChar) {
          inString = false
          stringChar = ''
        }
      }

      if (!inString) {
        if (char === '{') {
          delimiterStack.push('{')
          braceCount++
        }
        if (char === '}') {
          if (delimiterStack[delimiterStack.length - 1] === '{') {
            delimiterStack.pop()
          }
          braceCount--
        }
        if (char === '(') {
          delimiterStack.push('(')
          parenCount++
        }
        if (char === ')') {
          if (delimiterStack[delimiterStack.length - 1] === '(') {
            delimiterStack.pop()
          }
          parenCount--
        }
        if (char === '[') {
          delimiterStack.push('[')
          bracketCount++
        }
        if (char === ']') {
          if (delimiterStack[delimiterStack.length - 1] === '[') {
            delimiterStack.pop()
          }
          bracketCount--
        }

        if (char.trim()) lastNonWhitespace = char
      }
    }

    // Second pass: Check for JSX tags in the content (including fragments)
    const openTags = []
    let i = 0
    inString = false
    stringChar = ''
    let jsxDepth = 0 // Track JSX nesting depth
    let inJsxContent = false // Track if we're inside JSX element text content
    let inJsxTag = false // Track if we're currently parsing a JSX tag

    while (i < scriptContent.length) {
      const char = scriptContent[i]
      const prevChar = i > 0 ? scriptContent[i - 1] : ''

      // Track JSX expressions to temporarily exit JSX content mode
      // When we're in JSX content and hit {, we enter an expression
      // where normal string rules apply
      if (!inString && inJsxContent && char === '{') {
        inJsxContent = false // Temporarily exit JSX content for the expression
      }

      // Track strings (but not in JSX text content)
      // In JSX, quotes are only strings inside:
      // - JSX expressions: {foo('bar')}
      // - JSX attributes: className="foo"
      // - Regular JavaScript code
      // NOT in JSX text content: <p>L'Alliance</p>
      if (
        (char === '"' || char === "'" || char === '`') &&
        prevChar !== '\\' &&
        !inJsxContent
      ) {
        if (!inString) {
          inString = true
          stringChar = char
        } else if (char === stringChar) {
          inString = false
          stringChar = ''
        }
      }

      // Track JSX expression depth (only when inside JSX)
      // Don't track braces - they're handled by the delimiter stack
      // JSX tags can appear anywhere in the code, not just outside expressions

      // Only look for JSX tags when not in strings
      if (!inString && char === '<') {
        // Entering a JSX tag - no longer in JSX content
        inJsxContent = false
        inJsxTag = true

        i++

        // Check if it's a closing tag
        let isClosing = false
        if (i < scriptContent.length && scriptContent[i] === '/') {
          isClosing = true
          i++
        }

        // Extract tag name
        let tagName = ''
        while (
          i < scriptContent.length &&
          scriptContent[i] !== '>' &&
          scriptContent[i] !== ' ' &&
          scriptContent[i] !== '\n' &&
          scriptContent[i] !== '\t' &&
          scriptContent[i] !== '/'
        ) {
          tagName += scriptContent[i]
          i++
        }

        // Skip to end of tag or EOF
        let selfClosing = false
        let foundClosingBracket = false
        while (i < scriptContent.length && scriptContent[i] !== '>') {
          if (
            scriptContent[i] === '/' &&
            i + 1 < scriptContent.length &&
            scriptContent[i + 1] === '>'
          ) {
            selfClosing = true
          }
          i++
        }

        if (i < scriptContent.length && scriptContent[i] === '>') {
          foundClosingBracket = true
          i++ // consume the >
          inJsxTag = false
        }

        // Only process complete tags (that have a closing >)
        if (foundClosingBracket) {
          // Handle React fragments
          if (tagName === '') {
            if (isClosing) {
              // </> - closing fragment
              if (openTags.length > 0 && openTags[openTags.length - 1] === '') {
                openTags.pop()
                jsxDepth--
              }
            } else if (!selfClosing) {
              // <> - opening fragment
              openTags.push('')
              jsxDepth++
            }
          } else if (isClosing) {
            // Regular closing tag
            if (
              openTags.length > 0 &&
              openTags[openTags.length - 1] === tagName
            ) {
              openTags.pop()
              jsxDepth--
            }
          } else if (!selfClosing) {
            // Regular opening tag (not self-closing)
            openTags.push(tagName)
            jsxDepth++
          }

          // After processing the tag, update inJsxContent
          // We're in JSX content if we have open JSX tags
          if (!isClosing && !selfClosing) {
            // Just opened a tag - now we're in its content
            inJsxContent = true
          } else if (isClosing) {
            // Just closed a tag - we're in content if there are still open tags
            inJsxContent = jsxDepth > 0
          }
        } else {
          // Incomplete tag at EOF - add it to open tags
          if (!isClosing && tagName) {
            openTags.push(tagName)
            jsxDepth++
          }
        }
      } else {
        i++
      }
    }

    // Build completion
    let completion = ''

    // Complete unclosed strings
    if (inString) {
      completion += stringChar
      foundIssues.push({
        type: 'string',
        message: `Unclosed string (${stringChar})`,
      })
    }

    // Complete JSX tags (including fragments)
    if (openTags.length > 0) {
      for (let i = openTags.length - 1; i >= 0; i--) {
        if (openTags[i] === '') {
          // Close React fragment
          completion += '</>'
          foundIssues.push({
            type: 'jsx',
            message: 'Unclosed React fragment: <>',
          })
        } else {
          completion += `</${openTags[i]}>`
          foundIssues.push({
            type: 'jsx',
            message: `Unclosed JSX tag: <${openTags[i]}>`,
          })
        }
      }
    }

    // Complete delimiters in LIFO order (reverse of opening order)
    if (delimiterStack.length > 0) {
      const closingDelimiters: { [key: string]: string } = {
        '(': ')',
        '{': '}',
        '[': ']',
      }

      // Close in reverse order
      for (let i = delimiterStack.length - 1; i >= 0; i--) {
        const opener = delimiterStack[i]
        const closer = closingDelimiters[opener]
        completion += closer
      }

      // Report issues
      if (parenCount > 0) {
        foundIssues.push({
          type: 'syntax',
          message: `${parenCount} unclosed parenthesis(es)`,
        })
      }
      if (bracketCount > 0) {
        foundIssues.push({
          type: 'syntax',
          message: `${bracketCount} unclosed bracket(s)`,
        })
      }
      if (braceCount > 0) {
        foundIssues.push({
          type: 'syntax',
          message: `${braceCount} unclosed brace(s)`,
        })
      }
    }

    // Add the completion to script content
    completed = html + completion

    // Close script tag if needed
    if (!scriptContent.includes('</script>')) {
      completed += '\n    </script>'
      foundIssues.push({ type: 'html', message: 'Unclosed <script> tag' })
    }
  }

  // Complete HTML tags
  const htmlOpenTags = []

  // Find all unclosed HTML tags
  const beforeScript =
    scriptStart > -1
      ? html.slice(0, scriptStart - String(scriptMatch?.[0]).length)
      : html
  const tagMatches = beforeScript.matchAll(/<(\/?[\w-]+)[^>]*>/g)

  for (const match of tagMatches) {
    const fullTag = match[0]
    const tagName = match[1]

    if (tagName.startsWith('/')) {
      const closingTag = tagName.slice(1)
      const idx = htmlOpenTags.lastIndexOf(closingTag)
      if (idx > -1) htmlOpenTags.splice(idx, 1)
    } else if (
      !fullTag.endsWith('/>') &&
      !['br', 'img', 'input', 'meta', 'link'].includes(tagName)
    ) {
      htmlOpenTags.push(tagName)
    }
  }

  // Close remaining HTML tags
  if (htmlOpenTags.length > 0) {
    for (let i = htmlOpenTags.length - 1; i >= 0; i--) {
      completed += `\n</${htmlOpenTags[i]}>`
      foundIssues.push({
        type: 'html',
        message: `Unclosed HTML tag: <${htmlOpenTags[i]}>`,
      })
    }
  }

  console.debug('HTML Completion Issues:', foundIssues)

  return completed
  // return { completed, issues: foundIssues }
}
