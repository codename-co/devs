#!/usr/bin/env node
/**
 * check-budgets.mjs — universal performance budgets as a hard CI gate
 * (REPORT §Phase 0 "Universal budgets", §5 metrics).
 *
 * "Universal" is a slogan without enforced budgets. This gate runs AFTER
 * `npm run build` and enforces, against dist/:
 *
 *   1. Initial-shell JS budget — total gzipped bytes of the boot chunk graph
 *      (the entry <script> + its <link rel="modulepreload"> closure) for the
 *      main page must stay under `initialShellJsGzipKB`.
 *   2. Nothing-heavy-on-boot — no WASM / local-model runtime / editor / PDF /
 *      diagram stack may appear in the boot graph (they must be lazy-loaded).
 *
 * Budgets live in docs/revamp/budgets.json. On a brand-new tree the real
 * numbers are unknown until the first CI build, so run once with `--calibrate`
 * to seed the budget from the current build; tighten from there.
 *
 * Exit codes: 0 = within budget · 1 = over budget / forbidden-on-boot · 2 = IO.
 *
 * Flags:
 *   --calibrate   Seed initialShellJsGzipKB from the current build (review it).
 */

import { promises as fs } from 'node:fs'
import { gzipSync } from 'node:zlib'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const BUDGETS = path.join(ROOT, 'docs', 'revamp', 'budgets.json')

const DEFAULTS = {
  distDir: 'dist',
  // Candidate boot pages to measure (first that exists wins). MPA emits
  // per-language index pages; the English index is the canonical boot page.
  bootPages: ['en/index.html', 'index.html', 'en/index/index.html'],
  initialShellJsGzipKB: 0, // 0 = "not yet calibrated" (see --calibrate)
  // Heavy capabilities that must never be *eagerly bundled* on boot
  // (REPORT Phase 0/1). We match INTERNAL library symbols, not package names:
  // a lazy `import('pdfjs-dist')` / worker URL / CDN loader leaves the bare
  // specifier in a boot chunk (a legitimate lazy reference), but only real
  // eager bundling pulls in the library's internal symbols below.
  forbiddenOnBoot: [
    'loadPyodide', // pyodide runtime (worker URL 'pyodide-worker' does NOT match)
    'onnxruntime', // @huggingface/transformers / onnxruntime-web
    'monaco-editor/esm', // real Monaco bundle (CDN loader string does NOT match)
    'GlobalWorkerOptions', // pdfjs-dist internals
    'mermaidAPI', // mermaid render engine
    'cytoscape', // cytoscape graph engine
  ],
}

async function loadBudgets() {
  try {
    return { ...DEFAULTS, ...JSON.parse(await fs.readFile(BUDGETS, 'utf-8')) }
  } catch (err) {
    if (err.code === 'ENOENT') return { ...DEFAULTS }
    throw err
  }
}

async function exists(p) {
  try {
    await fs.access(p)
    return true
  } catch {
    return false
  }
}

/** Collect the boot chunk graph: entry <script> + modulepreload closure. */
async function bootGraph(distDir, bootPages) {
  let htmlPath = null
  for (const page of bootPages) {
    const candidate = path.join(distDir, page)
    if (await exists(candidate)) {
      htmlPath = candidate
      break
    }
  }
  if (!htmlPath) {
    throw new Error(
      `no boot page found in ${distDir} (looked for: ${bootPages.join(', ')}). ` +
        `Did the build run?`,
    )
  }
  const html = await fs.readFile(htmlPath, 'utf-8')
  const refs = new Set()
  const scriptRe = /<script[^>]+src="([^"]+\.js)"/g
  const preloadRe = /<link[^>]+rel="modulepreload"[^>]+href="([^"]+\.js)"/g
  for (const re of [scriptRe, preloadRe]) {
    let m
    while ((m = re.exec(html))) refs.add(m[1])
  }
  return { htmlPath, refs: [...refs] }
}

function resolveRef(distDir, htmlPath, ref) {
  if (ref.startsWith('/')) return path.join(distDir, ref.replace(/^\//, ''))
  return path.resolve(path.dirname(htmlPath), ref)
}

async function main() {
  const calibrate = process.argv.includes('--calibrate')
  const budgets = await loadBudgets()
  const distDir = path.join(ROOT, budgets.distDir)

  if (!(await exists(distDir))) {
    console.error(`✗ ${budgets.distDir}/ not found — run \`npm run build\` first.`)
    return 2
  }

  const { htmlPath, refs } = await bootGraph(distDir, budgets.bootPages)
  let totalGzip = 0
  const forbiddenHits = []

  for (const ref of refs) {
    const file = resolveRef(distDir, htmlPath, ref)
    if (!(await exists(file))) continue
    const buf = await fs.readFile(file)
    totalGzip += gzipSync(buf).length
    const hay = `${ref}\n${buf.toString('utf-8')}`
    for (const bad of budgets.forbiddenOnBoot) {
      if (hay.includes(bad)) forbiddenHits.push(`${bad} (via ${path.basename(ref)})`)
    }
  }

  const totalKB = Math.round((totalGzip / 1024) * 10) / 10
  console.log(
    `Boot page: ${path.relative(ROOT, htmlPath)} — ${refs.length} chunk(s), ` +
      `${totalKB} KB gzipped initial-shell JS.`,
  )

  if (calibrate) {
    const next = { ...budgets }
    // Seed with 10% headroom, rounded up to the next 10 KB.
    next.initialShellJsGzipKB = Math.ceil((totalKB * 1.1) / 10) * 10
    await fs.writeFile(BUDGETS, `${JSON.stringify(next, null, 2)}\n`, 'utf-8')
    console.log(
      `Calibrated initialShellJsGzipKB → ${next.initialShellJsGzipKB} KB ` +
        `(current ${totalKB} KB + 10% headroom). Tighten over time.`,
    )
    return 0
  }

  let failed = false
  if (forbiddenHits.length) {
    failed = true
    console.error(
      `\n❌ Heavy capability on boot (must be lazy-loaded — REPORT Phase 0/1):\n  ` +
        [...new Set(forbiddenHits)].join('\n  '),
    )
  }
  if (budgets.initialShellJsGzipKB <= 0) {
    console.warn(
      `\n⚠️  initialShellJsGzipKB not calibrated. Run once: ` +
        `node scripts/check-budgets.mjs --calibrate (after build), commit budgets.json.`,
    )
  } else if (totalKB > budgets.initialShellJsGzipKB) {
    failed = true
    console.error(
      `\n❌ Initial-shell JS ${totalKB} KB exceeds budget ${budgets.initialShellJsGzipKB} KB.`,
    )
  } else {
    console.log(
      `✅ Within budget (${totalKB} / ${budgets.initialShellJsGzipKB} KB).`,
    )
  }
  return failed ? 1 : 0
}

main().then(
  (code) => process.exit(code),
  (err) => {
    console.error(err)
    process.exit(2)
  },
)
