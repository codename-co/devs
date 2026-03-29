/**
 * Fix remaining 217 TypeScript errors from HeroUI v2→v3 migration.
 * 
 * Categories:
 * - TS2322 (116): Prop type mismatches on compound sub-components
 * - TS6133 (24): Unused variables  
 * - TS2353 (22): Unknown properties (title on Tab, hideCloseButton on Toast)
 * - TS7006 (17): Implicit any parameters
 * - TS2339 (14): Property doesn't exist (radius, onValueChange, classNames, target)
 * - TS2304 (9): Cannot find name (Dropdown, toast)
 * - TS2741 (5): Missing required properties
 * - TS6196 (4): Declared but value never read
 * - Misc (6): TS2769, TS17001, TS2551, TS2314, TS7031
 */

import { readFileSync, writeFileSync, existsSync } from 'fs'
import { execSync } from 'child_process'

const ROOT = '/Users/arnaud/repos/codename/devs'

function readFile(rel) {
  const p = `${ROOT}/${rel}`
  if (!existsSync(p)) return null
  return readFileSync(p, 'utf8')
}

function writeFile(rel, content) {
  writeFileSync(`${ROOT}/${rel}`, content, 'utf8')
}

// Get all TS errors
const tsOutput = execSync('npx tsc --noEmit 2>&1 || true', { cwd: ROOT, maxBuffer: 10 * 1024 * 1024 }).toString()
const errorLines = tsOutput.split('\n').filter(l => l.includes('error TS'))

console.log(`Total errors: ${errorLines.length}`)

// Parse errors by file
const errorsByFile = {}
for (const line of errorLines) {
  const match = line.match(/^src\/(.+?)\((\d+),(\d+)\): error (TS\d+): (.+)$/)
  if (match) {
    const [, file, lineNum, col, code, msg] = match
    const key = `src/${file}`
    if (!errorsByFile[key]) errorsByFile[key] = []
    errorsByFile[key].push({ line: parseInt(lineNum), col: parseInt(col), code, msg })
  }
}

console.log(`Files with errors: ${Object.keys(errorsByFile).length}`)

// Strategy: For each error category, apply targeted fixes

// ============================================================
// 1. Fix TS6133 (unused variables) and TS6196 (unused declarations)
// ============================================================
function fixUnusedVars(filePath, errors) {
  let content = readFile(filePath)
  if (!content) return

  const unusedErrors = errors.filter(e => e.code === 'TS6133' || e.code === 'TS6196')
  if (unusedErrors.length === 0) return

  const lines = content.split('\n')
  let changed = false

  for (const err of unusedErrors) {
    const lineIdx = err.line - 1
    const line = lines[lineIdx]
    if (!line) continue

    // Extract variable name from error message
    const nameMatch = err.msg.match(/'(\w+)'/)
    if (!nameMatch) continue
    const varName = nameMatch[1]

    // If it's an import line, try to remove just that import
    if (line.includes('import ')) {
      // Check if it's a named import we can remove
      const importMatch = line.match(/import\s+\{([^}]+)\}\s+from/)
      if (importMatch) {
        const names = importMatch[1].split(',').map(n => n.trim())
        const filtered = names.filter(n => {
          const cleanName = n.replace(/\s+as\s+\w+/, '').trim()
          return cleanName !== varName
        })
        if (filtered.length === 0) {
          // Remove entire import line
          lines[lineIdx] = ''
          changed = true
        } else if (filtered.length < names.length) {
          lines[lineIdx] = line.replace(importMatch[1], ' ' + filtered.join(', ') + ' ')
          changed = true
        }
      }
      // Check default import
      const defaultMatch = line.match(/import\s+(\w+)\s+from/)
      if (defaultMatch && defaultMatch[1] === varName) {
        lines[lineIdx] = ''
        changed = true
      }
    }
    // For regular variable declarations, prefix with underscore
    else if (line.match(new RegExp(`\\b(const|let|var)\\s+${varName}\\b`))) {
      lines[lineIdx] = line.replace(new RegExp(`\\b${varName}\\b`), `_${varName}`)
      changed = true
    }
  }

  if (changed) {
    writeFile(filePath, lines.join('\n'))
  }
}

// ============================================================
// 2. Fix compat layer files themselves
// ============================================================
function fixCompatFiles() {
  // Fix avatar-compat.tsx - 'data-testid' not in AvatarRootProps
  const avatarPath = 'src/components/heroui-compat/avatar-compat.tsx'
  let avatar = readFile(avatarPath)
  if (avatar) {
    avatar = avatar.replace(
      /data-testid=\{[^}]+\}/,
      ''
    )
    writeFile(avatarPath, avatar)
  }

  // Fix card-compat.tsx - surface variant
  const cardPath = 'src/components/heroui-compat/card-compat.tsx'
  let card = readFile(cardPath)
  if (card) {
    // Map "surface" to valid variant by excluding it
    card = card.replace(
      /"surface" \| /g,
      ''
    )
    writeFile(cardPath, card)
  }

  // Fix pagination-compat.tsx
  const paginationPath = 'src/components/heroui-compat/pagination-compat.tsx'
  let pagination = readFile(paginationPath)
  if (pagination) {
    // Check what errors exist - likely prop type issues
    const errors = errorsByFile[paginationPath] || []
    for (const err of errors) {
      console.log(`  pagination: ${err.code} ${err.msg.substring(0, 80)}`)
    }
  }

  // Fix tooltip-compat.tsx
  const tooltipPath = 'src/components/heroui-compat/tooltip-compat.tsx'
  let tooltip = readFile(tooltipPath)
  if (tooltip) {
    const errors = errorsByFile[tooltipPath] || []
    for (const err of errors) {
      console.log(`  tooltip: ${err.code} ${err.msg.substring(0, 80)}`)
    }
  }

  // Fix input-compat.tsx
  const inputPath = 'src/components/heroui-compat/input-compat.tsx'
  let input = readFile(inputPath)
  if (input) {
    const errors = errorsByFile[inputPath] || []
    for (const err of errors) {
      console.log(`  input: ${err.code} ${err.msg.substring(0, 80)}`)
    }
  }

  // Fix slider-compat.tsx
  const sliderPath = 'src/components/heroui-compat/slider-compat.tsx'
  let slider = readFile(sliderPath)
  if (slider) {
    const errors = errorsByFile[sliderPath] || []
    for (const err of errors) {
      console.log(`  slider: ${err.code} ${err.msg.substring(0, 80)}`)
    }
  }
}

// ============================================================
// 3. Fix toast imports (TS2304: Cannot find name 'toast')
// ============================================================
function fixToastImports() {
  const toastFiles = Object.entries(errorsByFile).filter(([, errors]) =>
    errors.some(e => e.code === 'TS2304' && e.msg.includes("'toast'"))
  )
  
  for (const [filePath] of toastFiles) {
    let content = readFile(filePath)
    if (!content) continue
    
    // Check if toast is already imported
    if (content.includes("import { toast }") || content.includes(", toast }") || content.includes("{ toast,")) {
      continue
    }
    
    // Add toast to existing compat import
    if (content.includes("from '@/components/heroui-compat'")) {
      content = content.replace(
        /import\s*\{([^}]+)\}\s*from\s*'@\/components\/heroui-compat'/,
        (match, imports) => {
          if (imports.includes('toast')) return match
          return `import { ${imports.trim()}, toast } from '@/components/heroui-compat'`
        }
      )
    } else {
      // Add new import
      content = `import { toast } from '@/components/heroui-compat'\n${content}`
    }
    
    writeFile(filePath, content)
  }
}

// ============================================================
// 4. Fix missing Dropdown import (TS2304)
// ============================================================
function fixDropdownImports() {
  const files = Object.entries(errorsByFile).filter(([, errors]) =>
    errors.some(e => e.code === 'TS2304' && e.msg.includes("'Dropdown'"))
  )
  
  for (const [filePath] of files) {
    let content = readFile(filePath)
    if (!content) continue
    
    if (content.match(/import\s*\{[^}]*Dropdown[^}]*\}\s*from/)) continue
    
    if (content.includes("from '@/components/heroui-compat'")) {
      content = content.replace(
        /import\s*\{([^}]+)\}\s*from\s*'@\/components\/heroui-compat'/,
        (match, imports) => {
          if (imports.includes('Dropdown')) return match
          return `import { ${imports.trim()}, Dropdown } from '@/components/heroui-compat'`
        }
      )
    } else {
      content = `import { Dropdown } from '@/components/heroui-compat'\n${content}`
    }
    
    writeFile(filePath, content)
  }
}

// ============================================================
// 5. Fix Switch.onValueChange: v3 onChange returns boolean not event
// ============================================================
function fixSwitchOnChange() {
  // src/pages/Settings/components/FeaturesSection.tsx uses e.target on Switch onChange
  const featuresPath = 'src/pages/Settings/components/FeaturesSection.tsx'
  let content = readFile(featuresPath)
  if (!content) return
  
  // Replace (e) => { ...e.target... } patterns on Switch onChange with (checked) => { ... }
  // The v3 Switch onChange gives boolean directly
  content = content.replace(
    /onChange=\{(?:\(e\)|e)\s*=>\s*\{[^}]*e\.target\.[^}]*\}\}/g,
    (match) => {
      // Extract the setter call pattern
      const setterMatch = match.match(/(\w+)\(e\.target\.\w+\)/)
      if (setterMatch) {
        return `onChange={(checked: boolean) => { ${setterMatch[1]}(checked) }}`
      }
      return match
    }
  )

  // Also fix simpler patterns: onChange={(e) => setter(e.target.checked)}
  content = content.replace(
    /onChange=\{(?:\(e\)|e)\s*=>\s*(\w+)\(e\.target\.(?:checked|value)\)\}/g,
    'onChange={(checked: boolean) => $1(checked)}'
  )

  writeFile(featuresPath, content)
}

// ============================================================
// 6. Fix lib/toast.ts
// ============================================================
function fixLibToast() {
  const toastPath = 'src/lib/toast.ts'
  let content = readFile(toastPath)
  if (!content) return
  
  const errors = errorsByFile[toastPath] || []
  if (errors.length === 0) return

  for (const err of errors) {
    console.log(`  lib/toast: ${err.code} L${err.line} ${err.msg.substring(0, 100)}`)
  }
}

// Run all fixes
console.log('\n--- Fixing compat layer files ---')
fixCompatFiles()

console.log('\n--- Fixing toast imports ---')
fixToastImports()

console.log('\n--- Fixing Dropdown imports ---')
fixDropdownImports()

console.log('\n--- Fixing Switch onChange ---')
fixSwitchOnChange()

console.log('\n--- Fixing lib/toast ---')
fixLibToast()

console.log('\n--- Fixing unused variables ---')
for (const [filePath, errors] of Object.entries(errorsByFile)) {
  fixUnusedVars(filePath, errors)
}

console.log('\nDone! Run typecheck to see remaining errors.')
