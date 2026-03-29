#!/usr/bin/env node
/**
 * Fix TS7006 (implicit any params) and TS6133 (unused imports) 
 * across the codebase after HeroUI v3 migration.
 */
import { execSync } from 'child_process'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'





























































































































































console.log(`\nDone. Fixed ${fixedCount} files.`)}  }    console.log(`  TS6133: ${file} (${unused.length} unused)`)    fixedCount++    write(file, lines.join('\n'))  if (changed) {  }    }      }        changed = true        lines[idx] = line.replace(varPat, `$1 _${name}`)      if (varPat.test(line)) {      const varPat = new RegExp(`\\b(const|let|var)\\s+${name}\\b`)      // Prefix unused local var with _    } else {      }        continue        changed = true        lines[idx] = ''      if (dm && dm[1] === name) {      const dm = line.match(/^import\s+(\w+)\s+from\s+/)      // Default import      }        continue        }          changed = true          lines[idx] = line.replace(/\{[^}]+\}/, '{ ' + filtered.join(', ') + ' }')        } else if (filtered.length < names.length) {          changed = true          lines[idx] = ''        if (filtered.length === 0) {        })          return clean !== name          const clean = n.includes(' as ') ? n.split(' as ').pop().trim() : n.trim()        const filtered = names.filter(n => {        const names = named[1].split(',').map(n => n.trim())      if (named) {      const named = line.match(/import\s+(?:type\s+)?\{([^}]+)\}\s+from/)      // Named import: import { A, B } from '...'    if (line.includes('import ')) {    const name = nm[1]    if (!nm) continue    const nm = err.msg.match(/'(\w+)'/)        const line = lines[idx]    if (idx >= lines.length) continue    const idx = err.line - 1  for (const err of sorted) {  const sorted = [...unused].sort((a, b) => b.line - a.line)  // Sort bottom-to-top  let changed = false  let lines = content.split('\n')  if (!content) continue  let content = read(file)  if (!unused.length) continue  const unused = fileErrors.filter(e => e.code === 'TS6133' || e.code === 'TS6196')for (const [file, fileErrors] of Object.entries(errors)) {// Fix TS6133 / TS6196: remove unused imports or prefix vars}  }    console.log(`  TS7006: ${file} (${tsErrs.length} params)`)    fixedCount++    write(file, lines.join('\n'))  if (changed) {  }    }      changed = true      lines[idx] = newLine    if (newLine !== line) {    const newLine = line.replace(broader, param + ': any')    const broader = new RegExp(`(?<=[(\\s,])${param}(?=\\s*[,)=>])`)    // Broader search - find param after ( , or space, before , ) =>    }      continue      changed = true      lines[idx] = before + param + ': any' + rest.substring(param.length)    if (directMatch.test(rest)) {    const directMatch = new RegExp(`^${param}(?=[\\s,)\\]=])`)        const rest = line.substring(col)    const before = line.substring(0, col)    // Try direct replacement at column position    if (alreadyTyped.test(after)) continue    const alreadyTyped = new RegExp(`^${param}\\s*:`)    const after = line.substring(col)    // Skip if already typed at this position    const col = err.col - 1    const param = pm[1]    if (!pm) continue    const pm = err.msg.match(/(?:Parameter|Binding element) '(\w+)'/)    // Extract param name from error message    const line = lines[idx]    if (idx >= lines.length) continue    const idx = err.line - 1  for (const err of sorted) {  const sorted = [...tsErrs].sort((a, b) => b.line - a.line || b.col - a.col)  // Sort bottom-to-top to preserve line numbers  let changed = false  const lines = content.split('\n')  if (!content) continue  const content = read(file)    if (!tsErrs.length) continue  const tsErrs = fileErrors.filter(e => e.code === 'TS7006' || e.code === 'TS7031')for (const [file, fileErrors] of Object.entries(errors)) {// Fix TS7006 / TS7031: add `: any` to implicit any paramslet fixedCount = 0console.log(`Total errors: ${total}`)const total = Object.values(errors).reduce((s, a) => s + a.length, 0)}  }    errors[file].push({ line: +ln, col: +col, code, msg })    if (!errors[file]) errors[file] = []    const [, file, ln, col, code, msg] = m  if (m) {  const m = line.match(/^(src\/.+?)\((\d+),(\d+)\): error (TS\d+): (.+)$/)for (const line of tsOutput.split('\n')) {const errors = {}})  encoding: 'utf8'  maxBuffer: 10 * 1024 * 1024,  cwd: ROOT,const tsOutput = execSync('npx tsc --noEmit 2>&1 || true', {// Run tsc and parse errors}  writeFileSync(join(ROOT, rel), content, 'utf8')function write(rel, content) {}  return readFileSync(p, 'utf8')  if (!existsSync(p)) return null  const p = join(ROOT, rel)function read(rel) {const ROOT = '/Users/arnaud/repos/codename/devs'const ROOT = '/Users/arnaud/repos/codename/devs'

function read(rel) {
  const p = join(ROOT, rel)
  if (!existsSync(p)) return null
  return readFileSync(p, 'utf8')
}

function write(rel, content) {
  writeFileSync(join(ROOT, rel), content, 'utf8')
}

// Run tsc and parse errors
const tsOutput = execSync('npx tsc --noEmit 2>&1 || true', {
  cwd: ROOT,
  maxBuffer: 10 * 1024 * 1024,
  encoding: 'utf8'
})

const errors = {}
for (const line of tsOutput.split('\n')) {
  const m = line.match(/^(src\/.+?)\((\d+),(\d+)\): error (TS\d+): (.+)$/)
  if (m) {
    const [, file, ln, col, code, msg] = m
    if (!errors[file]) errors[file] = []
    errors[file].push({ line: +ln, col: +col, code, msg })
  }
}

const total = Object.values(errors).reduce((s, a) => s + a.length, 0)
console.log(`Total errors: ${total}`)

let fixedCount = 0

// Fix TS7006 / TS7031: add `: any` to implicit any params
for (const [file, fileErrors] of Object.entries(errors)) {
  const tsErrs = fileErrors.filter(e => e.code === 'TS7006' || e.code === 'TS7031')
  if (!tsErrs.length) continue
  
  const content = read(file)
  if (!content) continue
  const lines = content.split('\n')
  let changed = false

  // Sort bottom-to-top to preserve line numbers
  const sorted = [...tsErrs].sort((a, b) => b.line - a.line || b.col - a.col)

  for (const err of sorted) {
    const idx = err.line - 1
    if (idx >= lines.length) continue
    const line = lines[idx]

    // Extract param name
    const pm = err.msg.match(/(?:Parameter|Binding element) '(\w+)'/)
    if (!pm) continue
    const param = pm[1]
    const col = err.col - 1

    // Skip if already typed
    const after = line.substring(col)
    if (new RegExp(`^${param}\\s*:`).test(after)) continue

    // Try direct replacement at column position
    const before = line.substring(0, col)
    const rest = line.substring(col)
    
    if (new RegExp(`^${param}(?=[\\s,)\\]=])`).test(rest)) {
      lines[idx] = before + param + ': any' + rest.substring(param.length)
      changed = true
      continue
    }

    // Broader search in the line
    const newLine = line.replace(
      new RegExp(`(?<=[\\(\\s,])${param}(?=\\s*[,)=>])`),
      param + ': any'
    )
    if (newLine !== line) {
      lines[idx] = newLine
      changed = true
    }
  }

  if (changed) {
    write(file, lines.join('\n'))
    fixedCount++
    console.log(`  TS7006: ${file} (${tsErrs.length} fixes)`)
  }
}

// Fix TS6133 / TS6196: remove unused imports/vars
for (const [file, fileErrors] of Object.entries(errors)) {
  const unused = fileErrors.filter(e => e.code === 'TS6133' || e.code === 'TS6196')
  if (!unused.length) continue

  let content = read(file)
  if (!content) continue
  let lines = content.split('\n')
  let changed = false

  // Sort bottom-to-top
  const sorted = [...unused].sort((a, b) => b.line - a.line)

  for (const err of sorted) {
    const idx = err.line - 1
    if (idx >= lines.length) continue
    const line = lines[idx]
    
    const nm = err.msg.match(/'(\w+)'/)
    if (!nm) continue
    const name = nm[1]

    if (line.includes('import ')) {
      // Named import: import { A, B } from '...'
      const named = line.match(/import\s+(?:type\s+)?\{([^}]+)\}\s+from/)
      if (named) {
        const names = named[1].split(',').map(n => n.trim())
        const filtered = names.filter(n => {
          const cleanName = n.includes(' as ') ? n.split(' as ').pop().trim() : n.trim()
          return cleanName !== name
        })
        if (filtered.length === 0) {
          lines[idx] = ''
          changed = true
        } else if (filtered.length < names.length) {
          lines[idx] = line.replace(/\{[^}]+\}/, '{ ' + filtered.join(', ') + ' }')
          changed = true
        }
        continue
      }
      // Default import
      const dm = line.match(/^import\s+(\w+)\s+from\s+/)
      if (dm && dm[1] === name) {
        lines[idx] = ''
        changed = true
        continue
      }
    } else {
      // Prefix unused local var with _
      const varPattern = new RegExp(`\\b(const|let|var)\\s+${name}\\b`)
      if (varPattern.test(line)) {
        lines[idx] = line.replace(varPattern, `$1 _${name}`)
        changed = true
      }
    }
  }

  if (changed) {
    write(file, lines.join('\n'))
    fixedCount++
    console.log(`  TS6133: ${file} (${unused.length} fixes)`)
  }
}

console.log(`\nDone. Fixed ${fixedCount} files.`)
