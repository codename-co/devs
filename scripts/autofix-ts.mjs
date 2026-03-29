#!/usr/bin/env node
import { execSync } from "child_process"
import { readFileSync, writeFileSync, existsSync } from "fs"
import { join } from "path"

const ROOT = "/Users/arnaud/repos/codename/devs"

function read(rel) {
  const p = join(ROOT, rel)
  if (!existsSync(p)) return null
  return readFileSync(p, "utf8")
}

function write(rel, content) {
  writeFileSync(join(ROOT, rel), content, "utf8")
}

const tsOutput = execSync("npx tsc --noEmit 2>&1 || true", {
  cwd: ROOT, maxBuffer: 10 * 1024 * 1024, encoding: "utf8"
})

const errors = {}
for (const line of tsOutput.split("\n")) {
  const m = line.match(/^(src\/.+?)\((\d+),(\d+)\): error (TS\d+): (.+)$/)
  if (m) {
    const [, file, ln, col, code, msg] = m
    if (!errors[file]) errors[file] = []
    errors[file].push({ line: +ln, col: +col, code, msg })
  }
}

const total = Object.values(errors).reduce((s, a) => s + a.length, 0)
console.log("Total errors:", total)

let fixedCount = 0

for (const [file, fileErrors] of Object.entries(errors)) {
  const tsErrs = fileErrors.filter(e => e.code === "TS7006" || e.code === "TS7031")
  if (!tsErrs.length) continue
  const content = read(file)
  if (!content) continue
  const lines = content.split("\n")
  let changed = false
  const sorted = [...tsErrs].sort((a, b) => b.line - a.line || b.col - a.col)
  for (const err of sorted) {
    const idx = err.line - 1
    if (idx >= lines.length) continue
    const line = lines[idx]
    const pm = err.msg.match(/(?:Parameter|Binding element) '(\w+)'/)
    if (!pm) continue
    const param = pm[1]
    const col = err.col - 1
    const after = line.substring(col)
    if (new RegExp("^" + param + "\\s*:").test(after)) continue
    const before = line.substring(0, col)
    const rest = line.substring(col)
    if (new RegExp("^" + param + "(?=[\\s,)\\]=])").test(rest)) {
      lines[idx] = before + param + ": any" + rest.substring(param.length)
      changed = true
      continue
    }
    const newLine = line.replace(new RegExp("(?<=[(\\s,])" + param + "(?=\\s*[,)=>])"), param + ": any")
    if (newLine !== line) { lines[idx] = newLine; changed = true }
  }
  if (changed) {
    write(file, lines.join("\n"))
    fixedCount++
    console.log("  TS7006:", file)
  }
}

for (const [file, fileErrors] of Object.entries(errors)) {
  const unused = fileErrors.filter(e => e.code === "TS6133" || e.code === "TS6196")
  if (!unused.length) continue
  let content = read(file)
  if (!content) continue
  let lines = content.split("\n")
  let changed = false
  const sorted = [...unused].sort((a, b) => b.line - a.line)
  for (const err of sorted) {
    const idx = err.line - 1
    if (idx >= lines.length) continue
    const line = lines[idx]
    const nm = err.msg.match(/'(\w+)'/)
    if (!nm) continue
    const name = nm[1]
    if (line.includes("import ")) {
      const named = line.match(/import\s+(?:type\s+)?\{([^}]+)\}\s+from/)
      if (named) {
        const names = named[1].split(",").map(n => n.trim())
        const filtered = names.filter(n => {
          const clean = n.includes(" as ") ? n.split(" as ").pop().trim() : n.trim()
          return clean !== name
        })
        if (filtered.length === 0) { lines[idx] = ""; changed = true }
        else if (filtered.length < names.length) {
          lines[idx] = line.replace(/\{[^}]+\}/, "{ " + filtered.join(", ") + " }")
          changed = true
        }
        continue
      }
      const dm = line.match(/^import\s+(\w+)\s+from\s+/)
      if (dm && dm[1] === name) { lines[idx] = ""; changed = true; continue }
    } else {
      const varPat = new RegExp("\\b(const|let|var)\\s+" + name + "\\b")
      if (varPat.test(line)) {
        lines[idx] = line.replace(varPat, "$1 _" + name)
        changed = true
      }
    }
  }
  if (changed) {
    write(file, lines.join("\n"))
    fixedCount++
    console.log("  TS6133:", file)
  }
}

console.log("Done. Fixed", fixedCount, "files.")
