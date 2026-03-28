import { readFileSync, writeFileSync, readdirSync } from 'fs'
import { join } from 'path'

const heroUiImport = "'@heroui/react'"
const compatImport = "'@/components/heroui-compat'"

function walkDir(dir) {
  const results = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'test') continue
      results.push(...walkDir(fullPath))
    } else if (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts')) {
      results.push(fullPath)
    }
  }
  return results
}

const files = walkDir('src')
let changed = 0

for (const file of files) {
  if (file.startsWith('src/components/heroui-compat')) continue
  const content = readFileSync(file, 'utf8')
  if (content.indexOf(heroUiImport) === -1) continue
  const newContent = content.split(heroUiImport).join(compatImport)
  if (newContent !== content) {
    writeFileSync(file, newContent)
    changed++
  }
}
console.log('Updated: ' + changed + ' files')
