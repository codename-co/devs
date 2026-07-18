#!/usr/bin/env node
/**
 * check-boundaries.mjs — deterministic core→optional import gate (REPORT §2.2).
 *
 * The core browser PWA must not grow new dependencies on optional feature
 * layers (connectors, marketplace, …). Those layers carry substantial
 * pre-existing coupling that the re-platform burns down over Phases 4/6, so a
 * hard "zero violations" rule would block `main` today. Instead this gate
 * grandfathers the *current* violations in an allow-list and fails only when a
 * NEW core→optional import appears — the strangler's ratchet.
 *
 * Exit codes: 0 = ok · 1 = new violation(s) · 2 = usage/IO error.
 *
 * Flags:
 *   --update   Rewrite the allow-list from the current violations (review the
 *              diff!). Use only when intentionally adding/removing coupling.
 */

import { promises as fs } from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SRC = path.join(ROOT, 'src')
const ALLOWLIST = path.join(ROOT, 'docs', 'revamp', 'boundary-allowlist.json')

/** Optional feature layers guarded against core imports. */
const OPTIONAL = ['connectors', 'marketplace', 'meeting-bot']
const OPTIONAL_RE = new RegExp(`@/features/(${OPTIONAL.join('|')})(?:/|')`)

/** A file is "optional" (exempt) if it lives inside an optional layer. */
function isOptionalFile(rel) {
  return OPTIONAL.some((o) => rel.startsWith(`src/features/${o}/`))
}
function isTestFile(rel) {
  return (
    rel.startsWith('src/test/') ||
    /\.(test|spec)\.(ts|tsx)$/.test(rel) ||
    rel.includes('/__tests__/')
  )
}

async function walk(dir) {
  const out = []
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) out.push(...(await walk(full)))
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(full)
  }
  return out
}

function importedOptionalLayers(source) {
  const layers = new Set()
  const re = new RegExp(OPTIONAL_RE.source, 'g')
  let m
  while ((m = re.exec(source))) layers.add(m[1])
  return [...layers]
}

async function collectViolations() {
  const files = await walk(SRC)
  const violations = {}
  for (const file of files) {
    const rel = path.relative(ROOT, file).replace(/\\/g, '/')
    if (isOptionalFile(rel) || isTestFile(rel)) continue
    const layers = importedOptionalLayers(await fs.readFile(file, 'utf-8'))
    if (layers.length) violations[rel] = layers.sort()
  }
  return violations
}

async function loadAllowlist() {
  try {
    return JSON.parse(await fs.readFile(ALLOWLIST, 'utf-8'))
  } catch (err) {
    if (err.code === 'ENOENT') return { grandfathered: {} }
    throw err
  }
}

async function main() {
  const update = process.argv.includes('--update')
  const violations = await collectViolations()
  const total = Object.keys(violations).length

  if (update) {
    const doc = {
      _comment:
        'Grandfathered core→optional import debt (REPORT §2.2). Burn down over Phases 4/6; never add new entries by hand — run scripts/check-boundaries.mjs --update only when intentionally changing coupling.',
      generatedAt: new Date().toISOString().slice(0, 10),
      grandfathered: violations,
    }
    await fs.mkdir(path.dirname(ALLOWLIST), { recursive: true })
    await fs.writeFile(ALLOWLIST, `${JSON.stringify(doc, null, 2)}\n`, 'utf-8')
    console.log(`Updated allow-list: ${total} grandfathered core→optional file(s).`)
    return 0
  }

  const allow = (await loadAllowlist()).grandfathered || {}
  const added = []
  const cleared = []

  for (const [file, layers] of Object.entries(violations)) {
    const known = allow[file] || []
    const novel = layers.filter((l) => !known.includes(l))
    if (novel.length) added.push(`${file} → ${novel.join(', ')}`)
  }
  for (const file of Object.keys(allow)) {
    if (!violations[file]) cleared.push(file)
  }

  console.log(
    `Core→optional imports: ${total} file(s) (grandfathered budget ${Object.keys(allow).length}).`,
  )
  if (cleared.length) {
    console.log(
      `\n✅ ${cleared.length} file(s) no longer violate — trim the allow-list:\n  ` +
        cleared.join('\n  '),
    )
  }
  if (added.length) {
    console.error(
      `\n❌ NEW core→optional import(s) — core must not grow this coupling (REPORT §2.2):\n  ` +
        added.join('\n  ') +
        `\n\nMove the code behind the tool/connector facade, or (if truly intentional) ` +
        `run: node scripts/check-boundaries.mjs --update`,
    )
    return 1
  }
  console.log('✅ No new core→optional imports.')
  return 0
}

main().then(
  (code) => process.exit(code),
  (err) => {
    console.error(err)
    process.exit(2)
  },
)
