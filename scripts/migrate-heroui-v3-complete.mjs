#!/usr/bin/env node
/**
 * HeroUI v2 → v3 Complete Migration Script
 * Single pass - handles all transformations from v2 to v3
 * 
 * Run: node scripts/migrate-heroui-v3-complete.mjs
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs'
import { join, relative } from 'path'

const ROOT = new URL('..', import.meta.url).pathname.replace(/\/$/, '')
const SRC = join(ROOT, 'src')

function getAllFiles(dir) {
  const files = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name)
    if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
      files.push(...getAllFiles(fullPath))
    } else if (entry.isFile() && /\.(tsx?|jsx?)$/.test(entry.name)) {
      files.push(fullPath)
    }
  }
  return files
}

// Helper: remove a JSX prop with balanced brace expression
function removeBraceProp(content, tagRegex, propName) {
  const regex = new RegExp(`(${tagRegex})([^>]*?)\\s+${propName}=\\{`, 'g')
  let result = content
  let safety = 0
  while (safety++ < 200) {
    const match = regex.exec(result)
    if (!match) break
    
    const beforeTag = result.substring(0, match.index)
    const tag = match[1]
    const middleProps = match[2]
    const braceStartInResult = match.index + match[0].length - 1
    
    // Find matching closing brace
    let depth = 1, i = braceStartInResult + 1
    while (i < result.length && depth > 0) {
      if (result[i] === '{') depth++
      else if (result[i] === '}') depth--
      i++
    }
    
    result = beforeTag + tag + middleProps + result.substring(i)
    regex.lastIndex = 0
  }
  return result
}

// Helper: remove a JSX prop with string value
function removeStringProp(content, tagRegex, propName) {
  const regex = new RegExp(`(${tagRegex}[^>]*)\\s+${propName}="[^"]*"`, 'g')
  return content.replace(regex, '$1')
}

// =========================================================================
// PHASE 1: Component renames and import transformations
// =========================================================================

function phase1_imports(content) {
  // Fix @heroui/react imports - rename v2 names to v3 names
  content = content.replace(
    /import\s*\{([^}]+)\}\s*from\s*['"]@heroui\/react['"]/g,
    (match, imports) => {
      const items = imports.split(',').map(s => s.trim()).filter(Boolean)
      const transformed = items.map(item => {
        // Handle "type X" and "X as Y" patterns
        const typePrefix = item.startsWith('type ') ? 'type ' : ''
        const rest = typePrefix ? item.substring(5) : item
        
        // Don't process "as" aliases or already-correct names
        const parts = rest.split(/\s+as\s+/)
        let name = parts[0].trim()
        const alias = parts[1]?.trim()
        
        // Rename map (v2 → v3)
        const renames = {
          'ModalContent': null, // removed, use Modal.Dialog
          'ModalHeader': null,
          'ModalBody': null,
          'ModalFooter': null,
          'CardHeader': null,
          'CardBody': null,
          'CardFooter': null,
          'AccordionItem': null,
          'DropdownTrigger': null,
          'DropdownMenu': null,
          'DropdownItem': null,
          'DropdownSection': null,
          'SelectItem': null,
          'SelectSection': null,
          'PopoverTrigger': null,
          'PopoverContent': null,
          'ListboxItem': null,
          'ListboxSection': null,
          'Listbox': 'ListBox',
          'TabList': null,
          'Divider': 'Separator',
          'Progress': 'ProgressBar',
          'Textarea': 'TextArea', // v3 name is TextArea
          'Snippet': null, // removed in v3
          'useDisclosure': 'useOverlayState',
          'addToast': 'toast',
        }
        
        if (name in renames) {
          const newName = renames[name]
          if (newName === null) return null // remove this import
          name = newName
        }
        
        if (alias) return `${typePrefix}${name} as ${alias}`
        return `${typePrefix}${name}`
      }).filter(Boolean)
      
      if (transformed.length === 0) return '' // All imports removed
      return `import { ${transformed.join(', ')} } from '@heroui/react'`
    }
  )
  
  // Clean up empty import lines
  content = content.replace(/^\s*\n/gm, '\n')
  
  // Also handle type-only imports
  content = content.replace(
    /import\s+type\s*\{([^}]+)\}\s*from\s*['"]@heroui\/react['"]/g,
    (match, imports) => {
      const items = imports.split(',').map(s => s.trim()).filter(Boolean)
      const transformed = items.map(item => {
        const typeRenames = {
          'DropdownMenuProps': 'DropdownMenuProps',  // still exists
          'ListboxProps': 'ListBoxProps',
        }
        return typeRenames[item] || item
      })
      return `import type { ${transformed.join(', ')} } from '@heroui/react'`
    }
  )
  
  // Add missing imports for components used in JSX
  const heroMatch = content.match(/import\s*\{([^}]+)\}\s*from\s*['"]@heroui\/react['"]/)
  if (heroMatch) {
    const existingNames = heroMatch[1].split(',').map(s => {
      const m = s.trim().match(/(?:type\s+)?(\w+)/)
      return m ? m[1] : ''
    }).filter(Boolean)
    
    const contentNoImports = content.replace(/import\s[^;]+;?\n?/g, '')
    const missing = []
    
    if (/\bDropdown[.\s<]/.test(contentNoImports) && !existingNames.includes('Dropdown')) missing.push('Dropdown')
    if (/\bListBox[.\s<]/.test(contentNoImports) && !existingNames.includes('ListBox')) missing.push('ListBox')
    if (/\bProgressBar[\s<]/.test(contentNoImports) && !existingNames.includes('ProgressBar')) missing.push('ProgressBar')
    if (/\buseOverlayState\s*\(/.test(contentNoImports) && !existingNames.includes('useOverlayState')) missing.push('useOverlayState')
    if (/\btoast\s*[.(]/.test(contentNoImports) && !existingNames.includes('toast')) missing.push('toast')
    
    if (missing.length > 0) {
      const allItems = heroMatch[1].split(',').map(s => s.trim()).filter(Boolean)
      allItems.push(...missing)
      content = content.replace(
        /import\s*\{[^}]+\}\s*from\s*['"]@heroui\/react['"]/,
        `import { ${allItems.join(', ')} } from '@heroui/react'`
      )
    }
  }
  
  // Remove framer-motion imports from source files (not extension files)
  if (!/extension/.test(content)) {
    content = content.replace(/import\s*\{[^}]*\}\s*from\s*['"]framer-motion['"]\s*;?\n?/g, '')
    content = content.replace(/import\s+.*\s+from\s*['"]framer-motion['"]\s*;?\n?/g, '')
  }
  
  return content
}

// =========================================================================
// PHASE 1: JSX tag renames (v2 component names → v3 compound pattern)
// =========================================================================

function phase1_jsxRenames(content) {
  const tagRenames = [
    // Card
    ['CardHeader', 'Card.Header'],
    ['CardBody', 'Card.Content'],
    ['CardFooter', 'Card.Footer'],
    // Modal
    ['ModalContent', 'Modal.Dialog'],
    ['ModalHeader', 'Modal.Header'],
    ['ModalBody', 'Modal.Body'],
    ['ModalFooter', 'Modal.Footer'],
    // Accordion
    ['AccordionItem', 'Accordion.Item'],
    // Dropdown
    ['DropdownTrigger', 'Dropdown.Trigger'],
    ['DropdownMenu', 'Dropdown.Menu'],
    ['DropdownItem', 'Dropdown.Item'],
    ['DropdownSection', 'Dropdown.Section'],
    // Select
    ['SelectItem', 'Select.Item'],
    ['SelectSection', 'Select.Section'],
    // Popover
    ['PopoverTrigger', 'Popover.Trigger'],
    ['PopoverContent', 'Popover.Content'],
    // Listbox
    ['ListboxItem', 'ListBox.Item'],
    ['ListboxSection', 'ListBox.Section'],
    ['Listbox', 'ListBox'],
    // Tab components
    ['TabList', 'Tabs.List'],
    // Renamed components
    ['Divider', 'Separator'],
    ['Textarea', 'TextArea'],
  ]
  
  for (const [old, newTag] of tagRenames) {
    // Opening tags: <Old ... → <New ...
    content = content.replace(new RegExp(`<${old}(\\s|>|\\/)`, 'g'), `<${newTag}$1`)
    // Closing tags: </Old> → </New>
    content = content.replace(new RegExp(`<\\/${old}>`, 'g'), `</${newTag}>`)
  }
  
  // Rename Progress tag (both opening and closing, but not ProgressBar)
  content = content.replace(/<Progress(\s|>)(?!Bar)/g, '<ProgressBar$1')
  content = content.replace(/<\/Progress>(?!Bar)/g, '</ProgressBar>')
  
  // Rename Snippet → pre>code (since it's removed in v3)
  content = content.replace(/<Snippet([^>]*)>/g, '<pre><code>')
  content = content.replace(/<\/Snippet>/g, '</code></pre>')
  
  return content
}

// =========================================================================
// PHASE 1: Prop renames
// =========================================================================

function phase1_propRenames(content) {
  // key → id on compound component children (Accordion.Item, Dropdown.Item, etc.)
  const compoundItems = [
    'Accordion\\.Item',
    'Dropdown\\.Item',
    'Select\\.Item',
    'ListBox\\.Item',
    'Tabs\\.Tab',
  ]
  for (const tag of compoundItems) {
    content = content.replace(
      new RegExp(`(<${tag}\\s[^>]*?)\\bkey=`, 'g'),
      `$1id=`
    )
  }
  
  // isPressable → remove (not in v3 Card)
  content = content.replace(/(<Card[^>]*?)\s+isPressable(?:=\{true\})?/g, '$1')
  
  // isDisabled on various components → same name, keep it
  
  // onClick → onPress on buttons
  content = content.replace(/(<Button[^>]*?)\bonClick=/g, '$1onPress=')
  
  return content
}

// =========================================================================
// PHASE 2: useDisclosure → useOverlayState
// =========================================================================

function phase2_useDisclosure(content) {
  // Replace useDisclosure() → useOverlayState()
  content = content.replace(/\buseDisclosure\s*\(\s*\)/g, 'useOverlayState()')
  
  // Fix destructuring of useOverlayState
  // Parse each destructuring, fix item by item
  content = content.replace(
    /const\s*\{([^}]*)\}\s*=\s*useOverlayState\s*\(\)/g,
    (match, destructured) => {
      const items = destructured.split(',').map(s => s.trim()).filter(Boolean)
      const fixedItems = items.map(item => {
        // Skip comments
        if (item.startsWith('//')) return item
        // Simple mappings: onOpen → open: onOpen
        if (/^\s*onOpen\s*$/.test(item)) return 'open: onOpen'
        if (/^\s*onClose\s*$/.test(item)) return 'close: onClose'
        if (/^\s*onOpenChange\s*$/.test(item)) return 'setOpen: onOpenChange'
        // Already aliased correctly
        if (/^open\s*:\s*\w+/.test(item)) return item
        if (/^close\s*:\s*\w+/.test(item)) return item
        if (/^setOpen\s*:\s*\w+/.test(item)) return item
        // Custom alias: onOpen: customName → open: customName
        if (/^onOpen\s*:\s*(\w+)/.test(item)) return item.replace('onOpen:', 'open:')
        if (/^onClose\s*:\s*(\w+)/.test(item)) return item.replace('onClose:', 'close:')
        if (/^onOpenChange\s*:\s*(\w+)/.test(item)) return item.replace('onOpenChange:', 'setOpen:')
        // Keep as-is (isOpen, toggle, etc.)
        return item
      })
      return `const { ${fixedItems.join(', ')} } = useOverlayState()`
    }
  )
  
  return content
}

// =========================================================================
// PHASE 2: Modal API fixes
// =========================================================================

function phase2_modal(content) {
  // Remove onClose from Modal (v3 doesn't have it)
  // Convert <Modal ... onClose={fn} ...> to <Modal ... onOpenChange={(v) => !v && fn()} ...>
  
  // Handle Modal with ModalContent render prop pattern:
  // v2: <Modal isOpen={x} onClose={y}><ModalContent>{(onClose) => (...)}</ModalContent></Modal>
  // In phase 1, ModalContent became Modal.Dialog, but the render prop pattern changed
  
  // Simple conversion: Modal.Dialog used to take {(onClose) => JSX} render function
  // v3: Modal.Dialog just takes children. Remove the render function wrapper.
  content = content.replace(
    /<Modal\.Dialog>\s*\{[( ]*onClose[) ]*=>\s*\(/g,
    '<Modal.Dialog>'
  )
  // Close the render function
  content = content.replace(
    /\)\s*\}\s*<\/Modal\.Dialog>/g,
    '</Modal.Dialog>'
  )
  
  // Fix onClose prop on Modal root  
  content = content.replace(
    /(<Modal\s[^>]*?)\bonClose=\{([^}]+)\}([^>]*>)/g,
    (match, before, closeExpr, after) => {
      return `${before}onOpenChange={(v) => !v && (${closeExpr})()}${after}`
    }
  )
  
  // Fix size prop on Modal (move to string literal - v3 supports it on Container)
  // Leave size for now
  
  return content
}

// =========================================================================
// PHASE 2: Variant mappings (v2 → v3)
// =========================================================================

function phase2_variants(content) {
  // === BUTTON VARIANTS ===
  // v2: solid, bordered, light, flat, ghost, shadow, faded
  // v3: primary, secondary, tertiary, danger, danger-soft, ghost, outline
  const buttonVariantMap = {
    'solid': 'primary', 'bordered': 'outline', 'light': 'ghost',
    'flat': 'secondary', 'shadow': 'primary', 'faded': 'secondary',
  }
  for (const [old, newVal] of Object.entries(buttonVariantMap)) {
    content = content.replace(new RegExp(`(<Button[^>]*)\\bvariant="${old}"`, 'g'), `$1variant="${newVal}"`)
  }
  
  // === CHIP VARIANTS ===
  // v2: solid, bordered, light, flat, ghost, shadow, faded, dot
  // v3: primary, secondary, soft, tertiary
  const chipVariantMap = {
    'solid': 'primary', 'bordered': 'secondary', 'light': 'tertiary',
    'flat': 'soft', 'faded': 'soft', 'dot': 'soft', 'shadow': 'primary',
  }
  for (const [old, newVal] of Object.entries(chipVariantMap)) {
    content = content.replace(new RegExp(`(<Chip[^>]*)\\bvariant="${old}"`, 'g'), `$1variant="${newVal}"`)
  }
  
  // === BADGE VARIANTS ===  
  // v3: primary, secondary, soft
  const badgeVariantMap = {
    'solid': 'primary', 'flat': 'soft', 'faded': 'soft',
    'bordered': 'secondary', 'shadow': 'primary',
  }
  for (const [old, newVal] of Object.entries(badgeVariantMap)) {
    content = content.replace(new RegExp(`(<Badge[^>]*)\\bvariant="${old}"`, 'g'), `$1variant="${newVal}"`)
  }
  
  // === INPUT VARIANTS ===
  // v3: primary, secondary  
  const inputVariantMap = {
    'bordered': 'secondary', 'flat': 'primary', 'faded': 'secondary', 'underlined': 'primary',
  }
  for (const [old, newVal] of Object.entries(inputVariantMap)) {
    content = content.replace(new RegExp(`(<Input[^>]*)\\bvariant="${old}"`, 'g'), `$1variant="${newVal}"`)
    content = content.replace(new RegExp(`(<TextArea[^>]*)\\bvariant="${old}"`, 'g'), `$1variant="${newVal}"`)
    content = content.replace(new RegExp(`(<Select[^>]*)\\bvariant="${old}"`, 'g'), `$1variant="${newVal}"`)
  }
  
  // === TABS VARIANTS ===
  // v3: primary, secondary
  content = content.replace(/(<Tabs[^>]*)\bvariant="underlined"/g, '$1variant="primary"')
  content = content.replace(/(<Tabs[^>]*)\bvariant="bordered"/g, '$1variant="secondary"')
  content = content.replace(/(<Tabs[^>]*)\bvariant="light"/g, '$1variant="primary"')
  
  // === COLOR MAPPINGS ===
  // Chip/Badge colors: default, success, warning, danger, accent (no primary/secondary)
  content = content.replace(/(<Chip[^>]*)\bcolor="primary"/g, '$1color="accent"')
  content = content.replace(/(<Chip[^>]*)\bcolor="secondary"/g, '$1color="default"')
  content = content.replace(/(<Badge[^>]*)\bcolor="primary"/g, '$1color="accent"')
  content = content.replace(/(<Badge[^>]*)\bcolor="secondary"/g, '$1color="default"')
  
  // === ALERT ===
  // v3 Alert uses `status` not `variant` for warning/error/info/success
  content = content.replace(/<Alert(\s[^>]*?)\bvariant=/g, '<Alert$1status=')
  
  // === DYNAMIC VARIANTS ===
  // Fix string literals in variant={} expressions
  const v2toV3 = {
    'solid': 'primary', 'bordered': 'outline', 'light': 'ghost',
    'flat': 'secondary', 'shadow': 'primary', 'faded': 'secondary',
  }
  for (const [old, newVal] of Object.entries(v2toV3)) {
    content = content.replace(
      new RegExp(`(variant=\\{[^}]*)"${old}"`, 'g'),
      `$1"${newVal}"`
    )
  }
  
  return content
}

// =========================================================================
// PHASE 2: Prop removals/fixes
// =========================================================================

function phase2_propFixes(content) {
  // Remove radius from Avatar
  content = removeStringProp(content, '<Avatar', 'radius')
  
  // Remove classNames from Spinner (use className instead)
  content = removeBraceProp(content, '<Spinner', 'classNames')
  
  // Remove startContent/endContent from components that don't support them in v3
  content = removeBraceProp(content, '<Dropdown\\.Item', 'startContent')
  content = removeBraceProp(content, '<ListBox\\.Item', 'startContent')
  content = removeBraceProp(content, '<ListBox\\.Item', 'endContent')
  
  // CheckboxGroup: onValueChange → onChange
  content = content.replace(
    /(<CheckboxGroup[^>]*?)\bonValueChange=/g,
    '$1onChange='
  )
  
  // addToast() → toast()
  content = content.replace(/\baddToast\s*\(/g, 'toast(')
  
  // Remove motion-related code (AnimatePresence, motion.div, etc.)
  // Only in non-extension files
  content = content.replace(/<AnimatePresence[^>]*>/g, '<>')
  content = content.replace(/<\/AnimatePresence>/g, '</>')
  content = content.replace(/<motion\.(\w+)/g, '<$1')
  content = content.replace(/<\/motion\.(\w+)>/g, '</$1>')
  
  // Remove motion-specific props
  const motionProps = ['initial', 'animate', 'exit', 'transition', 'variants', 'whileHover', 'whileTap', 'whileInView', 'whileFocus', 'drag']
  for (const prop of motionProps) {
    content = removeBraceProp(content, '<\\w+', prop)
    content = removeStringProp(content, '<\\w+', prop)
  }
  
  return content
}

// =========================================================================
// PHASE 2: Clean up unused variables/imports
// =========================================================================

function phase2_cleanup(content) {
  // Remove unused Progress import if ProgressBar is imported
  content = content.replace(
    /import\s*\{([^}]+)\}\s*from\s*['"]@heroui\/react['"]/g,
    (match, imports) => {
      const items = imports.split(',').map(s => s.trim()).filter(Boolean)
      const contentNoImports = content.replace(/import\s[^;]*;?\n?/g, '')
      
      const filtered = items.filter(item => {
        const name = item.match(/(?:type\s+)?(\w+)/)?.[1]
        if (!name) return true
        
        // Check if the name is used in the code
        if (name === 'Progress' && !new RegExp(`\\b${name}\\b`).test(contentNoImports)) return false
        if (name === 'Snippet' && !/<Snippet|<pre><code/.test(contentNoImports)) return false
        
        return true
      })
      
      if (filtered.length === 0) return ''
      return `import { ${filtered.join(', ')} } from '@heroui/react'`
    }
  )
  
  return content
}

// =========================================================================
// MAIN
// =========================================================================

const files = getAllFiles(SRC)
let totalChanged = 0

for (const filePath of files) {
  const original = readFileSync(filePath, 'utf8')
  let content = original
  
  // Skip test files
  if (filePath.includes('/test/')) continue
  
  // Only process files with HeroUI or relevant patterns
  if (!/@heroui|framer-motion|useDisclosure|addToast/.test(content)) continue
  
  // Apply all phases in order
  content = phase1_imports(content)
  content = phase1_jsxRenames(content)
  content = phase1_propRenames(content)
  content = phase2_useDisclosure(content)
  content = phase2_modal(content)
  content = phase2_variants(content)
  content = phase2_propFixes(content)
  content = phase2_cleanup(content)
  
  if (content !== original) {
    writeFileSync(filePath, content, 'utf8')
    totalChanged++
    console.log(`  Fixed: ${relative(ROOT, filePath)}`)
  }
}

console.log(`\nDone! Fixed ${totalChanged} files.`)
