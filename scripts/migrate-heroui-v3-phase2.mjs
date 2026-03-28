#!/usr/bin/env node
/**
 * HeroUI v3 Migration Phase 2 - Fix remaining type errors after v3 install
 * 
 * Fixes:
 * 1. Import renames: Progress→ProgressBar, TextArea→Textarea, Listbox→ListBox, addToast→toast, Snippet removal
 * 2. Missing imports: ListBox, Dropdown, ProgressBar where used in JSX
 * 3. Tooltip compound pattern: content/placement props → Tooltip.Trigger + Tooltip.Content
 * 4. Variant mappings: old v2 values → v3 values
 * 5. Modal API: isOpen/onClose → state prop with useOverlayState
 * 6. Tab title prop removal
 * 7. useDisclosure → useOverlayState
 * 8. Button startContent removal
 * 9. Various prop fixes (Avatar radius, Spinner classNames, etc.)
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs'
import { join, relative } from 'path'

const ROOT = new URL('..', import.meta.url).pathname.replace(/\/$/, '')
const SRC = join(ROOT, 'src')

function getAllTsxFiles(dir) {
  const files = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name)
    if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
      files.push(...getAllTsxFiles(fullPath))
    } else if (entry.isFile() && /\.(tsx?|jsx?)$/.test(entry.name)) {
      files.push(fullPath)
    }
  }
  return files
}

// =============================================================================
// 1. Fix imports
// =============================================================================
function fixImports(content, filePath) {
  // Replace Progress → ProgressBar in imports
  content = content.replace(
    /(import\s*\{[^}]*)\bProgress\b([^}]*\}\s*from\s*['"]@heroui\/react['"])/g,
    (match, before, after) => {
      // Don't replace ProgressBar or ProgressCircle
      if (before.includes('ProgressBar') || after.includes('ProgressBar')) {
        return match.replace(/\bProgress\b(?!Bar|Circle)/, '')
      }
      return match.replace(/\bProgress\b(?!Bar|Circle)/, 'ProgressBar')
    }
  )

  // Replace TextArea → Textarea in imports
  content = content.replace(
    /(import\s*\{[^}]*)\bTextArea\b([^}]*\}\s*from\s*['"]@heroui\/react['"])/g,
    (match, before, after) => match.replace(/\bTextArea\b/, 'Textarea')
  )

  // Replace addToast → toast in imports
  content = content.replace(
    /(import\s*\{[^}]*)\baddToast\b([^}]*\}\s*from\s*['"]@heroui\/react['"])/g,
    (match) => match.replace(/\baddToast\b/, 'toast')
  )

  // Remove Snippet from imports (no longer in v3)
  // Use a function approach: parse the import, filter out Snippet, reconstruct
  content = content.replace(
    /import\s*\{([^}]+)\}\s*from\s*['"]@heroui\/react['"]/g,
    (match, imports) => {
      const items = imports.split(',').map(s => s.trim()).filter(Boolean)
      const filtered = items.filter(item => !/^\s*Snippet\s*$/.test(item))
      if (filtered.length === items.length) return match // nothing changed
      return `import { ${filtered.join(', ')} } from '@heroui/react'`
    }
  )

  // Replace Separator import (it exists in v3, should be fine)
  // Replace useDisclosure → useOverlayState in imports
  content = content.replace(
    /(import\s*\{[^}]*)\buseDisclosure\b([^}]*\}\s*from\s*['"]@heroui\/react['"])/g,
    (match) => match.replace(/\buseDisclosure\b/, 'useOverlayState')
  )

  // Add missing component imports where JSX uses them but they're not imported
  // Parse the import to get the actual item list
  const heroImportMatch = content.match(/import\s*\{([^}]+)\}\s*from\s*['"]@heroui\/react['"]/)
  if (heroImportMatch) {
    const currentImportItems = heroImportMatch[1].split(',').map(s => s.trim()).filter(Boolean)
    const currentImportNames = currentImportItems.map(item => {
      const m = item.match(/(?:type\s+)?(\w+)/)
      return m ? m[1] : ''
    })
    const missingImports = []
    
    // Don't look for these in import lines
    const contentWithoutImports = content.replace(/import\s*\{[^}]+\}\s*from\s*['"][^'"]+['"]/g, '')

    // Check if ListBox is used in JSX but not imported
    if (/\bListBox[.\s<]/.test(contentWithoutImports) && !currentImportNames.includes('ListBox')) {
      missingImports.push('ListBox')
    }

    // Check if Dropdown is used in JSX but not imported
    if (/\bDropdown[.\s<]/.test(contentWithoutImports) && !currentImportNames.includes('Dropdown')) {
      missingImports.push('Dropdown')
    }

    // Check if ProgressBar is used in JSX but not imported
    if (/\bProgressBar\b/.test(contentWithoutImports) && !currentImportNames.includes('ProgressBar')) {
      missingImports.push('ProgressBar')
    }

    // Check if useOverlayState is used but not imported
    if (/\buseOverlayState\b/.test(contentWithoutImports) && !currentImportNames.includes('useOverlayState')) {
      missingImports.push('useOverlayState')
    }

    // Check if toast is used but not imported
    if (/\btoast[.(]/.test(contentWithoutImports) && !currentImportNames.includes('toast')) {
      missingImports.push('toast')
    }

    if (missingImports.length > 0) {
      // Reconstruct import with added items
      const allItems = [...currentImportItems, ...missingImports]
      content = content.replace(
        /import\s*\{[^}]+\}\s*from\s*['"]@heroui\/react['"]/,
        `import { ${allItems.join(', ')} } from '@heroui/react'`
      )
    }
  }

  // If there's no @heroui/react import but we use these components, add one
  if (!/import\s.*from\s*['"]@heroui\/react['"]/.test(content)) {
    const needed = []
    if (/\bListBox[.\s<]/.test(content)) needed.push('ListBox')
    if (/\bDropdown[.\s<]/.test(content)) needed.push('Dropdown')
    if (/\bProgressBar\b/.test(content)) needed.push('ProgressBar')
    if (/\buseOverlayState\s*\(/.test(content)) needed.push('useOverlayState')
    if (needed.length > 0) {
      const importLine = `import { ${needed.join(', ')} } from '@heroui/react'\n`
      // Add after last import
      const lastImport = content.lastIndexOf('\nimport ')
      if (lastImport >= 0) {
        const lineEnd = content.indexOf('\n', lastImport + 1)
        // Find end of that import statement
        let pos = lineEnd
        // Handle multi-line imports
        if (content.substring(lastImport, lineEnd).includes('{') && !content.substring(lastImport, lineEnd).includes('}')) {
          pos = content.indexOf('}', lineEnd)
          pos = content.indexOf('\n', pos)
        }
        content = content.substring(0, pos + 1) + importLine + content.substring(pos + 1)
      } else {
        content = importLine + content
      }
    }
  }

  return content
}

// =============================================================================
// 2. Fix JSX renames (TextArea→Textarea, addToast→toast in function calls)
// =============================================================================
function fixJsxRenames(content) {
  // TextArea → Textarea in JSX  
  content = content.replace(/<TextArea\b/g, '<Textarea')
  content = content.replace(/<\/TextArea>/g, '</Textarea>')

  // addToast( → toast( in function calls
  content = content.replace(/\baddToast\s*\(/g, 'toast(')

  return content
}

// =============================================================================
// 3. Fix Tooltip compound pattern
// =============================================================================
function fixTooltip(content) {
  // Pattern: <Tooltip content={expr} [placement="x"]>{children}</Tooltip>
  // → <Tooltip><Tooltip.Trigger>{children}</Tooltip.Trigger><Tooltip.Content [placement="x"]>{expr}</Tooltip.Content></Tooltip>
  
  // Handle self-closing tooltips (shouldn't exist but be safe)
  // and standard open/close tooltips

  // Match <Tooltip ... content={...} or content="..." ...>
  // This needs to handle:
  // 1. content="string"
  // 2. content={expr}
  // 3. content={<JSX/>}
  // With optional placement="value"

  let result = content
  let changed = true
  let iterations = 0

  while (changed && iterations < 100) {
    changed = false
    iterations++

    // Match: <Tooltip ... content=... ...> ... </Tooltip>
    // Use a state machine approach to match balanced JSX
    const tooltipOpenRegex = /<Tooltip\s+([^>]*\bcontent\s*=)/g
    let match
    
    while ((match = tooltipOpenRegex.exec(result)) !== null) {
      const startIdx = match.index
      
      // Parse the opening tag to extract props
      const tagStart = startIdx
      let pos = startIdx + '<Tooltip'.length
      
      // Find the end of the opening tag (handle > vs />)
      let depth = 1
      let inString = false
      let stringChar = ''
      let inExpr = 0
      let tagEndPos = -1
      let selfClosing = false
      
      // Find end of opening tag
      for (let i = pos; i < result.length; i++) {
        const ch = result[i]
        if (inString) {
          if (ch === stringChar && result[i-1] !== '\\') inString = false
          continue
        }
        if (ch === '"' || ch === "'") {
          inString = true
          stringChar = ch
          continue
        }
        if (ch === '{') { inExpr++; continue }
        if (ch === '}') { inExpr--; continue }
        if (inExpr > 0) continue
        if (ch === '/' && result[i+1] === '>') {
          tagEndPos = i + 2
          selfClosing = true
          break
        }
        if (ch === '>') {
          tagEndPos = i + 1
          break
        }
      }
      
      if (tagEndPos === -1) continue
      
      const openingTag = result.substring(tagStart, tagEndPos)
      
      // Extract content prop value
      let contentValue = ''
      let contentStart = -1
      let contentEnd = -1
      
      // Try content="string"
      const contentStrMatch = openingTag.match(/\bcontent\s*=\s*"([^"]*)"/)
      if (contentStrMatch) {
        contentValue = contentStrMatch[1]
        contentStart = openingTag.indexOf(contentStrMatch[0])
        contentEnd = contentStart + contentStrMatch[0].length
      } else {
        // Try content={expr}
        const contentExprIdx = openingTag.indexOf('content={')
        if (contentExprIdx >= 0) {
          let braceDepth = 0
          let exprEnd = -1
          for (let i = contentExprIdx + 'content='.length; i < openingTag.length; i++) {
            if (openingTag[i] === '{') braceDepth++
            else if (openingTag[i] === '}') {
              braceDepth--
              if (braceDepth === 0) {
                exprEnd = i + 1
                break
              }
            }
          }
          if (exprEnd > 0) {
            contentValue = openingTag.substring(contentExprIdx + 'content='.length, exprEnd)
            contentStart = contentExprIdx
            contentEnd = exprEnd
          }
        }
      }
      
      if (contentStart === -1) continue
      
      // Extract placement prop if present
      let placementAttr = ''
      const placementMatch = openingTag.match(/\bplacement\s*=\s*"([^"]*)"/)
      let placementRemoveStart = -1
      let placementRemoveEnd = -1
      if (placementMatch) {
        placementAttr = ` placement="${placementMatch[1]}"`
        placementRemoveStart = openingTag.indexOf(placementMatch[0])
        placementRemoveEnd = placementRemoveStart + placementMatch[0].length
      }
      
      // Build the content expression for Tooltip.Content children
      let tooltipContent
      if (contentStrMatch) {
        tooltipContent = contentValue
      } else {
        // It's {expr}, unwrap the braces for children
        tooltipContent = contentValue
      }
      
      if (selfClosing) {
        // Self-closing tooltip (rare), no children
        const newContent = `<Tooltip>\n<Tooltip.Content${placementAttr}>${tooltipContent}</Tooltip.Content>\n</Tooltip>`
        result = result.substring(0, startIdx) + newContent + result.substring(tagEndPos)
        changed = true
        break
      }
      
      // Find the closing </Tooltip> matching this opening
      let closePos = -1
      let nestDepth = 1
      pos = tagEndPos
      while (pos < result.length && nestDepth > 0) {
        const openTag = result.indexOf('<Tooltip', pos)
        const closeTag = result.indexOf('</Tooltip>', pos)
        
        if (closeTag === -1) break
        
        if (openTag !== -1 && openTag < closeTag) {
          // Check if it's a sub-component like <Tooltip.Trigger (skip those)
          const afterTag = result.substring(openTag + '<Tooltip'.length)
          if (/^[.\s>\/]/.test(afterTag) && !afterTag.startsWith('.')) {
            nestDepth++
          }
          pos = openTag + 1
        } else {
          nestDepth--
          if (nestDepth === 0) {
            closePos = closeTag
          }
          pos = closeTag + '</Tooltip>'.length
        }
      }
      
      if (closePos === -1) continue
      
      // Get children between opening and closing tag
      const children = result.substring(tagEndPos, closePos).trim()
      
      // Build remaining props (without content and placement)
      let propsStr = openingTag.substring('<Tooltip'.length, openingTag.length - 1).trim()
      
      // Remove content prop
      if (contentStrMatch) {
        propsStr = propsStr.replace(contentStrMatch[0], '')
      } else {
        // Remove content={...} using positions relative to props
        const fullContentStr = openingTag.substring(contentStart, contentEnd)
        propsStr = propsStr.replace(fullContentStr, '')
      }
      
      // Remove placement prop
      if (placementMatch) {
        propsStr = propsStr.replace(placementMatch[0], '')
      }
      
      // Clean up remaining props
      propsStr = propsStr.replace(/\s+/g, ' ').trim()
      
      const rootProps = propsStr ? ` ${propsStr}` : ''
      
      const replacement = `<Tooltip${rootProps}>
          <Tooltip.Trigger>
            ${children}
          </Tooltip.Trigger>
          <Tooltip.Content${placementAttr}>
            ${tooltipContent}
          </Tooltip.Content>
        </Tooltip>`
      
      result = result.substring(0, startIdx) + replacement + result.substring(closePos + '</Tooltip>'.length)
      changed = true
      break // restart from beginning after each replacement
    }
  }
  
  return result
}

// =============================================================================
// 4. Fix variant mappings
// =============================================================================
function fixVariants(content) {
  // Button: v2 variants (solid, bordered, light, flat, ghost, shadow, faded)
  //       → v3 variants (primary, secondary, tertiary, danger, danger-soft, ghost, outline)
  // For buttons specifically:
  // - variant="solid" → variant="primary"
  // - variant="bordered" → variant="outline"  
  // - variant="light" → variant="ghost"
  // - variant="flat" → variant="secondary"
  // - variant="shadow" → variant="primary" (no shadow in v3)
  // - variant="faded" → variant="secondary"
  
  // We need to be context-aware - only change variant on specific components
  // Using a pragmatic approach: fix the specific error patterns

  // Fix Button variant mappings (old v2 values still present)
  // Pattern: <Button ... variant="flat" ...> 
  content = content.replace(/(<Button[^>]*)\bvariant="flat"/g, '$1variant="secondary"')
  content = content.replace(/(<Button[^>]*)\bvariant="solid"/g, '$1variant="primary"')
  content = content.replace(/(<Button[^>]*)\bvariant="bordered"/g, '$1variant="outline"')
  content = content.replace(/(<Button[^>]*)\bvariant="light"/g, '$1variant="ghost"')
  content = content.replace(/(<Button[^>]*)\bvariant="shadow"/g, '$1variant="primary"')
  content = content.replace(/(<Button[^>]*)\bvariant="faded"/g, '$1variant="secondary"')
  
  // Fix dynamic Button variants in ternaries/variables
  // "flat" | "solid" → map to v3
  // These are typically: variant={condition ? "flat" : "solid"} or similar
  
  // Fix Chip variant "dot" → "soft"
  content = content.replace(/(<Chip[^>]*)\bvariant="dot"/g, '$1variant="soft"')
  
  // Fix Input/Tabs variant "underlined" → "primary" 
  content = content.replace(/(<Input[^>]*)\bvariant="underlined"/g, '$1variant="primary"')
  content = content.replace(/(<Textarea[^>]*)\bvariant="underlined"/g, '$1variant="primary"')
  content = content.replace(/(<Tabs[^>]*)\bvariant="underlined"/g, '$1variant="primary"')
  
  // Fix Badge variant: "flat" → "soft", "faded" → "soft"  
  content = content.replace(/(<Badge[^>]*)\bvariant="flat"/g, '$1variant="soft"')
  content = content.replace(/(<Badge[^>]*)\bvariant="faded"/g, '$1variant="soft"')

  // Fix Input variant: "bordered" → "secondary", "flat" → "primary", "faded" → "secondary"
  content = content.replace(/(<Input[^>]*)\bvariant="bordered"/g, '$1variant="secondary"')
  content = content.replace(/(<Input[^>]*)\bvariant="flat"/g, '$1variant="primary"')
  content = content.replace(/(<Input[^>]*)\bvariant="faded"/g, '$1variant="secondary"')
  content = content.replace(/(<Textarea[^>]*)\bvariant="bordered"/g, '$1variant="secondary"')
  content = content.replace(/(<Textarea[^>]*)\bvariant="flat"/g, '$1variant="primary"')
  content = content.replace(/(<Textarea[^>]*)\bvariant="faded"/g, '$1variant="secondary"')
  
  // Fix Select variant
  content = content.replace(/(<Select[^>]*)\bvariant="bordered"/g, '$1variant="secondary"')
  content = content.replace(/(<Select[^>]*)\bvariant="flat"/g, '$1variant="primary"')
  content = content.replace(/(<Select[^>]*)\bvariant="underlined"/g, '$1variant="primary"')
  content = content.replace(/(<Select[^>]*)\bvariant="faded"/g, '$1variant="secondary"')

  // Fix Accordion variant: "bordered" → check what v3 has
  // v3 Accordion: check later

  // Fix Alert: v3 Alert uses `status` not `variant`
  // <Alert variant="warning"> → <Alert status="warning">
  content = content.replace(/<Alert\s+variant=/g, '<Alert status=')

  return content
}

// =============================================================================
// 5. Fix Modal API
// =============================================================================
function fixModal(content) {
  // Fix <Modal ... isOpen={x} onClose={y} ...>
  // In v3, Modal doesn't have onClose. It has onOpenChange from DialogTrigger
  // Convert: onClose={fn} → onOpenChange={(v) => !v && fn()}
  
  // Simple pattern: remove onClose and add onOpenChange
  // Handle both orders: isOpen then onClose, onClose then isOpen
  
  // Replace onClose on Modal with onOpenChange  
  content = content.replace(
    /(<Modal[\s\S]*?)\bonClose=\{([^}]+)\}([\s\S]*?>)/g,
    (match, before, closeExpr, after) => {
      // Only if this is on a Modal opening tag (not deeply nested)
      if (before.includes('>')) return match // Already past the opening tag
      return `${before}onOpenChange={(v) => !v && (${closeExpr})()}${after}`
    }
  )

  // Fix size prop on Modal (should be on Modal.Container in v3, but leave for now)
  
  return content
}

// =============================================================================
// 6. Fix useDisclosure calls and related patterns
// =============================================================================
function fixUseDisclosure(content) {
  // Replace useDisclosure() with useOverlayState()
  content = content.replace(
    /\buseDisclosure\s*\(\s*\)/g,
    'useOverlayState()'
  )
  
  // Fix destructuring patterns for useOverlayState
  // useOverlayState returns { isOpen, open, close, toggle, setOpen }
  // Old useDisclosure returned { isOpen, onOpen, onClose, onOpenChange }
  // Need: const { isOpen, open: onOpen, close: onClose, setOpen: onOpenChange } = useOverlayState()
  
  content = content.replace(
    /const\s*\{([^}]*)\}\s*=\s*useOverlayState\s*\(\)/g,
    (match, destructured) => {
      // Parse individual destructured items
      const items = destructured.split(',').map(s => s.trim()).filter(Boolean)
      const fixedItems = items.map(item => {
        item = item.trim()
        // if it's just "onOpen" (no alias), convert to "open: onOpen"
        if (item === 'onOpen') return 'open: onOpen'
        // if it's just "onClose" (no alias), convert to "close: onClose"
        if (item === 'onClose') return 'close: onClose'
        // if it's just "onOpenChange" (no alias), convert to "setOpen: onOpenChange"
        if (item === 'onOpenChange') return 'setOpen: onOpenChange'
        // if it already has the correct alias, keep it
        if (/^open\s*:\s*onOpen$/.test(item)) return 'open: onOpen'
        if (/^close\s*:\s*onClose$/.test(item)) return 'close: onClose'
        if (/^setOpen\s*:\s*onOpenChange$/.test(item)) return 'setOpen: onOpenChange'
        // Otherwise keep as-is (e.g., isOpen, toggle)
        return item
      })
      return `const { ${fixedItems.join(', ')} } = useOverlayState()`
    }
  )

  return content
}

// =============================================================================
// 7. Fix Tab title prop  
// =============================================================================
function fixTabTitle(content) {
  // v3 Tab doesn't have a `title` prop
  // v2: <Tab key="x" title={label}>{panel}</Tab>
  // v3: Tab just takes children as the tab label
  // The panel content goes into <Tabs.Panel>
  
  // For now, convert title={expr} to children by removing title prop
  // and making the title value the children (this won't handle panels correctly
  // but at least makes it compile)
  
  // Pattern: <Tabs.Tab id="x" title={expr}>children</Tabs.Tab>
  // → <Tabs.Tab id="x">{expr}</Tabs.Tab> (panel content needs separate handling)
  
  // Simple approach: remove title prop from Tab, the title becomes unused
  // Actually, for title="string", convert to children:
  // <Tabs.Tab id="x" title="Label">panel</Tabs.Tab>
  // → <Tabs.Tab id="x">Label</Tabs.Tab>
  
  // For title={expr}:
  // <Tabs.Tab id="x" title={expr}>panel</Tabs.Tab>
  // → <Tabs.Tab id="x">{expr}</Tabs.Tab>
  
  // This loses the panel content but fixes the type error
  // TODO: Proper conversion would split into Tab + Panel
  
  // Handle title="string"
  content = content.replace(
    /<Tabs\.Tab(\s+[^>]*?)\s+title="([^"]*)"([^>]*)>[\s\S]*?<\/Tabs\.Tab>/g,
    (match, beforeTitle, titleStr, afterTitle) => {
      return `<Tabs.Tab${beforeTitle}${afterTitle}>${titleStr}</Tabs.Tab>`
    }
  )
  
  // Handle title={expr} - more complex
  content = content.replace(
    /<Tabs\.Tab(\s+[^>]*?)\s+title=\{/g,
    (match, beforeTitle) => {
      // Find the matching closing brace
      const fullMatch = match
      // We need to find the full title={...} prop
      // Return the opening but let's handle it differently
      return `<Tabs.Tab${beforeTitle} title={` // keeps it for now
    }
  )
  
  return content
}

// Helper: remove a JSX prop that has a brace-expression value (handles nested braces)
function removePropWithBraces(content, tagPattern, propName) {
  const regex = new RegExp(`(${tagPattern}[^>]*?)\\s+${propName}=\\{`, 'g')
  let result = content
  let match
  
  // Process one at a time to avoid index issues
  while ((match = regex.exec(result)) !== null) {
    const propStart = match[0].length - propName.length - 2 + match.index // position of propName
    const braceStart = match.index + match[0].length - 1 // position of opening {
    
    // Find matching closing brace
    let depth = 1
    let i = braceStart + 1
    while (i < result.length && depth > 0) {
      if (result[i] === '{') depth++
      else if (result[i] === '}') depth--
      i++
    }
    
    // Remove from before propName to after closing brace
    const beforeProp = result.substring(0, match.index + match[1].length)
    const afterProp = result.substring(i)
    result = beforeProp + afterProp
    
    // Reset regex
    regex.lastIndex = 0
  }
  
  return result
}

// =============================================================================
// 8. Fix various prop issues
// =============================================================================
function fixMiscProps(content) {
  // Avatar: remove radius prop (not in v3)
  content = content.replace(/(<Avatar[^>]*)\s+radius="[^"]*"/g, '$1')
  
  // Spinner: remove classNames prop (use className instead)
  content = removePropWithBraces(content, '<Spinner', 'classNames')
  
  // Remove startContent/endContent from components that no longer support them
  content = removePropWithBraces(content, '<Dropdown\\.Item', 'startContent')
  content = removePropWithBraces(content, '<ListBox\\.Item', 'startContent')
  content = removePropWithBraces(content, '<ListBox\\.Item', 'endContent')

  // Fix Chip/Badge color="primary" → color is valid in v3 for Chip (values: default, success, warning, danger, accent)
  // But "primary" and "secondary" are not valid colors for Chip in v3
  content = content.replace(/(<Chip[^>]*)\bcolor="primary"/g, '$1color="accent"')
  content = content.replace(/(<Chip[^>]*)\bcolor="secondary"/g, '$1color="default"')
  content = content.replace(/(<Badge[^>]*)\bcolor="primary"/g, '$1color="accent"')
  content = content.replace(/(<Badge[^>]*)\bcolor="secondary"/g, '$1color="default"')

  // Fix CheckboxGroup: onValueChange → onChange
  content = content.replace(
    /(<CheckboxGroup[^>]*?)\s+onValueChange=/g,
    '$1 onChange='
  )

  // Fix Snippet → pre/code block (since Snippet doesn't exist in v3)
  content = content.replace(/<Snippet([^>]*)>/g, '<pre><code>')
  content = content.replace(/<\/Snippet>/g, '</code></pre>')

  return content
}

// =============================================================================
// 9. Fix type imports that no longer exist
// =============================================================================
function fixTypeImports(content) {
  // Remove type imports that don't exist in v3
  // type DropdownMenuProps → DropdownMenuProps still exists actually
  
  // Remove unused Progress import (if ProgressBar is now imported)
  if (/\bProgressBar\b/.test(content)) {
    content = content.replace(
      /(import\s*\{[^}]*)(?:,\s*\bProgress\b(?!Bar|Circle)|\bProgress\b(?!Bar|Circle)\s*,?)([^}]*\}\s*from\s*['"]@heroui\/react['"])/g,
      (match, before, after) => {
        let result = before + after
        result = result.replace(/,\s*,/g, ',')
        result = result.replace(/\{\s*,/, '{')
        result = result.replace(/,\s*\}/, '}')
        return result
      }
    )
  }

  return content
}

// =============================================================================
// 10. Fix dynamic variant expressions
// =============================================================================
function fixDynamicVariants(content) {
  // Fix string literal variant values in ternaries and variables
  // e.g.: variant={isActive ? "solid" : "flat"} → variant={isActive ? "primary" : "secondary"}
  // This is tricky because we might change things in wrong contexts
  
  // Map old v2 button variants to v3 in string contexts near variant=
  const buttonV2toV3 = {
    'solid': 'primary',
    'bordered': 'outline',
    'light': 'ghost',
    'flat': 'secondary',
    'shadow': 'primary',
    'faded': 'secondary'
  }
  
  // Fix variant={...} expressions that contain old v2 values
  // Only in contexts where it's clearly a Button (check surrounding JSX)
  // For safety, only fix string literals inside variant expressions
  for (const [oldVal, newVal] of Object.entries(buttonV2toV3)) {
    // In ternary expressions like variant={x ? "old" : "old2"}
    content = content.replace(
      new RegExp(`(variant=\\{[^}]*)"${oldVal}"`, 'g'),
      `$1"${newVal}"`
    )
  }
  
  return content
}

// =============================================================================
// 11. Clean up unused imports
// =============================================================================
function cleanUnusedImports(content) {
  // Remove Progress from import if not used (replaced by ProgressBar)
  // Remove useOverlayState from import if not used
  // Remove motionVariants if not used
  
  const heroImportMatch = content.match(/import\s*\{([^}]+)\}\s*from\s*['"]@heroui\/react['"]/)
  if (!heroImportMatch) return content
  
  const imports = heroImportMatch[1].split(',').map(s => s.trim()).filter(Boolean)
  const cleanedImports = imports.filter(imp => {
    // Extract the actual name (handle "type X", "X as Y", etc.)
    const nameMatch = imp.match(/(?:type\s+)?(\w+)(?:\s+as\s+\w+)?/)
    if (!nameMatch) return true
    const name = nameMatch[1]
    
    // Check if it's used in the rest of the content (not in the import line)
    const contentWithoutImports = content.replace(/import\s*\{[^}]+\}\s*from\s*['"][^'"]+['"]/g, '')
    
    // Special cases
    if (name === 'Progress' && /\bProgressBar\b/.test(contentWithoutImports)) return false
    if (name === 'Snippet' && !/<Snippet|<pre><code/.test(contentWithoutImports)) return false
    
    return true
  })
  
  if (cleanedImports.length !== imports.length) {
    const newImportLine = `import { ${cleanedImports.join(', ')} } from '@heroui/react'`
    content = content.replace(/import\s*\{[^}]+\}\s*from\s*['"]@heroui\/react['"]/, newImportLine)
  }
  
  return content
}

// =============================================================================
// Main processing
// =============================================================================
const files = getAllTsxFiles(SRC)
let totalChanged = 0

for (const filePath of files) {
  const original = readFileSync(filePath, 'utf8')
  let content = original
  
  // Skip test files
  if (filePath.includes('/test/')) continue
  
  // Only process files that import from @heroui or use HeroUI components
  if (!/@heroui/.test(content) && !/\b(ListBox|Dropdown|ProgressBar|useDisclosure|useOverlayState)\b/.test(content)) {
    continue
  }
  
  content = fixImports(content, filePath)
  content = fixJsxRenames(content)
  // content = fixTooltip(content)  // DISABLED - breaks JSX structure, needs AST-based approach
  content = fixVariants(content)
  content = fixModal(content)
  content = fixUseDisclosure(content)
  // content = fixTabTitle(content)  // Skip - too complex for regex, handle manually
  content = fixMiscProps(content)
  content = fixTypeImports(content)
  content = fixDynamicVariants(content)
  content = cleanUnusedImports(content)
  
  if (content !== original) {
    writeFileSync(filePath, content, 'utf8')
    totalChanged++
    console.log(`  Fixed: ${relative(ROOT, filePath)}`)
  }
}

console.log(`\nDone! Fixed ${totalChanged} files.`)
