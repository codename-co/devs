import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

const ROOT = process.cwd()
const tsOutput = readFileSync('/tmp/ts-errors.txt', 'utf8')

const errors = []
for (const line of tsOutput.split('\n')) {
  const m = line.match(/^(src\/.+?)\((\d+),(\d+)\): error (TS7006|TS7031): (.+)$/)
  if (m) {








































































































console.log('\nTotal fixed: ' + totalFixed + ' across ' + fixedFiles.length + ' files')}  }    console.log('  Fixed: ' + file + ' (' + fileErrors.length + ' errors)')    fixedFiles.push(file + ' (' + fileErrors.length + ' errors)')    writeFileSync(filePath, lines.join('\n'), 'utf8')  if (changed) {  }    }      }        }          console.warn('  SKIP: ' + file + ':' + err.line + ' - param "' + param + '" not found')        } else {          totalFixed++          changed = true          lines[idx] = line.substring(0, mi + param.length) + ': any' + line.substring(mi + param.length)          if (/^\s*:/.test(afterMatch)) continue          const afterMatch = line.substring(mi + param.length)          const mi = match.index        if (match) {        const match = line.match(re)        const re = new RegExp('(?<=[({,\\s])' + param + '(?=\\s*[,)=>])')        // Try finding it nearby      } else {        totalFixed++        changed = true        lines[idx] = line.substring(0, col + param.length) + ': any' + line.substring(col + param.length)        // Param is exactly at the expected column      if (atCol === param) {      const atCol = line.substring(col, col + param.length)      if (new RegExp('^' + param + '\\s*:').test(afterCol)) continue      const afterCol = line.substring(col)      // Check if already typed at this position      const param = err.param    } else {      totalFixed++      changed = true      lines[idx] = line.substring(0, closeBracePos + 1) + ': any' + line.substring(closeBracePos + 1)      if (/^\s*:/.test(afterBrace)) continue      const afterBrace = line.substring(closeBracePos + 1)      const closeBracePos = openBrace + closeBraceIdx      }        continue        console.warn('  SKIP binding: ' + file + ':' + err.line + ' - no }')      if (closeBraceIdx === -1) {      const closeBraceIdx = afterOpen.indexOf('}')      const afterOpen = line.substring(openBrace)      }        continue        console.warn('  SKIP binding: ' + file + ':' + err.line + ' - no {')      if (openBrace === -1) {      const openBrace = beforeCol.lastIndexOf('{')      const beforeCol = line.substring(0, col)      // Binding element like ({isSelected}) => needs }: any after closing brace    if (err.isBinding) {    const col = err.col - 1    const line = lines[idx]    }      continue      console.warn('  SKIP: ' + file + ':' + err.line + ' - out of range')    if (idx >= lines.length) {    const idx = err.line - 1  for (const err of sorted) {  const sorted = [...fileErrors].sort((a, b) => b.line - a.line || b.col - a.col)  // Sort bottom-up to avoid index shifts  let changed = false  const lines = content.split('\n')  const content = readFileSync(filePath, 'utf8')  const filePath = join(ROOT, file)for (const [file, fileErrors] of Object.entries(byFile)) {const fixedFiles = []let totalFixed = 0}  byFile[err.file].push(err)  if (!byFile[err.file]) byFile[err.file] = []for (const err of errors) {const byFile = {}console.log('Found ' + errors.length + ' TS7006/TS7031 errors')}  }    }      })        isBinding: msg.startsWith('Binding element'),        param: paramMatch[1],        code,        col: +col,        line: +ln,        file,      errors.push({    if (paramMatch) {    const paramMatch = msg.match(/(?:Parameter|Binding element) '(\w+)'/)    const [, file, ln, col, code, msg] = m
// Run tsc and collect TS7006/TS7031 errors
const tsOutput = execSync('npx tsc --noEmit 2>&1 || true', {
  cwd: ROOT,
  maxBuffer: 20 * 1024 * 1024,
  encoding: 'utf8',
})

const errors = []
for (const line of tsOutput.split('\n')) {
  // Match: src/file.tsx(line,col): error TS7006: Parameter 'X' implicitly has an 'any' type.
  const m = line.match(
    /^(src\/.+?)\((\d+),(\d+)\): error (TS700[16]|TS7031): (.+)$/,
  )
  if (m) {
    const [, file, ln, col, code, msg] = m
    // Extract parameter name
    const paramMatch = msg.match(/(?:Parameter|Binding element) '(\w+)'/)
    if (paramMatch) {
      errors.push({
        file,
        line: +ln,
        col: +col,
        code,
        param: paramMatch[1],
        isBinding: msg.startsWith('Binding element'),
      })
    }
  }
}

console.log(`Found ${errors.length} TS7006/TS7031 errors`)

// Group by file
const byFile = {}
for (const err of errors) {
  if (!byFile[err.file]) byFile[err.file] = []
  byFile[err.file].push(err)
}

let totalFixed = 0
const fixedFiles = []

for (const [file, fileErrors] of Object.entries(byFile)) {
  const filePath = join(ROOT, file)
  const content = readFileSync(filePath, 'utf8')
  const lines = content.split('\n')
  let changed = false

  // Sort errors by line desc, then col desc so we fix from bottom-up
  // This prevents line/col shifts from affecting later fixes
  const sorted = [...fileErrors].sort(
    (a, b) => b.line - a.line || b.col - a.col,
  )

  for (const err of sorted) {
    const idx = err.line - 1
    if (idx >= lines.length) {
      console.warn(`  SKIP: ${file}:${err.line} - line out of range`)
      continue
    }

    const line = lines[idx]
    const col = err.col - 1 // 0-based

    if (err.isBinding) {
      // Binding element: e.g. ({isSelected}) => ...
      // Need to find the closing } of the destructuring that contains this param
      // and add `: any` after it
      // Find the destructuring pattern: { ... paramName ... }
      // The col points to the param inside the braces
      // We need to find the closing `}` and add `: any` after `}` but before `)`
      const beforeCol = line.substring(0, col)
      const openBrace = beforeCol.lastIndexOf('{')
      if (openBrace === -1) {
        console.warn(
          `  SKIP binding: ${file}:${err.line} - no opening brace found`,
        )
        continue
      }
      // Find the matching closing brace
      const afterOpen = line.substring(openBrace)
      const closeBrace = afterOpen.indexOf('}')
      if (closeBrace === -1) {
        console.warn(
          `  SKIP binding: ${file}:${err.line} - no closing brace found`,
        )
        continue
      }
      const closeBracePos = openBrace + closeBrace
      // Check if there's already a `: any` or type annotation after }
      const afterBrace = line.substring(closeBracePos + 1)
      if (/^\s*:/.test(afterBrace)) {
        // Already has a type annotation
        continue
      }
      // Insert `: any` after the closing brace
      lines[idx] =
        line.substring(0, closeBracePos + 1) +
        ': any' +
        line.substring(closeBracePos + 1)
      changed = true
      totalFixed++
    } else {
      // Regular parameter: e.g. (e) => or (key) =>
      const param = err.param

      // Check if the param at the indicated column already has a type
      const afterCol = line.substring(col)
      const paramRegex = new RegExp(`^${param}\\s*:`)
      if (paramRegex.test(afterCol)) {
        // Already typed
        continue
      }

      // Verify the param is at the expected position
      const atCol = line.substring(col, col + param.length)
      if (atCol !== param) {
        // Try to find it nearby (columns can shift slightly)
        const nearbyRegex = new RegExp(
          `(?<=[({,\\s])${param}(?=\\s*[,)=>])`,
        )
        const nearbyMatch = line.match(nearbyRegex)
        if (nearbyMatch) {
          const matchIdx = nearbyMatch.index
          // Make sure it doesn't already have `: any` or `: Type`
          const afterMatch = line.substring(matchIdx + param.length)
          if (/^\s*:/.test(afterMatch)) continue

          lines[idx] =
            line.substring(0, matchIdx + param.length) +
            ': any' +
            line.substring(matchIdx + param.length)
          changed = true
          totalFixed++
        } else {
          console.warn(
            `  SKIP: ${file}:${err.line}:${err.col} - param '${param}' not found at col`,
          )
        }
        continue
      }

      // Insert `: any` right after the param name
      lines[idx] =
        line.substring(0, col + param.length) +
        ': any' +
        line.substring(col + param.length)
      changed = true
      totalFixed++
    }
  }

  if (changed) {
    writeFileSync(filePath, lines.join('\n'), 'utf8')
    fixedFiles.push(file)
    console.log(`  Fixed: ${file} (${fileErrors.length} errors)`)
  }
}

console.log(`\nTotal fixed: ${totalFixed} across ${fixedFiles.length} files`)
console.log('\nFixed files:')
fixedFiles.forEach((f) => console.log(`  ${f}`))
