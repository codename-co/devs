/**
 * GitHub Content Fetcher for Agent Skills
 *
 * Fetches skill content (SKILL.md, scripts, references, assets) from GitHub
 * repositories. Uses raw.githubusercontent.com for file content (CORS-friendly,
 * no rate limit) and the GitHub API for directory listings.
 *
 * @module lib/skills/github-fetcher
 */

import type { SkillScript, SkillFile } from '@/types'

// ============================================================================
// Types
// ============================================================================

/** Parsed components of a GitHub directory URL. */
export interface ParsedGitHubUrl {
  owner: string
  repo: string
  branch: string
  path: string
}

/** SKILL.md parsed manifest (frontmatter fields). */
export interface SkillManifest {
  name: string
  description: string
  license?: string
  metadata?: Record<string, string>
  [key: string]: unknown
}

/** Complete skill data fetched from GitHub. */
export interface FetchedSkill {
  manifest: SkillManifest
  scripts: SkillScript[]
  references: SkillFile[]
  assets: SkillFile[]
  rawSkillMd: string
  githubUrl: string
}

/** Shape returned by the GitHub Contents API for a single entry. */
interface GitHubContentEntry {
  name: string
  path: string
  type: 'file' | 'dir'
  download_url: string | null
  size: number
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Python standard library modules — used to filter out non-package imports
 * when extracting dependencies from skill scripts.
 */
export const PYTHON_STDLIB_MODULES = new Set([
  'os', 'sys', 'json', 're', 'pathlib', 'datetime', 'collections', 'typing',
  'io', 'math', 'csv', 'urllib', 'http', 'hashlib', 'base64', 'functools',
  'itertools', 'subprocess', 'shutil', 'tempfile', 'glob', 'argparse',
  'logging', 'unittest', 'copy', 'string', 'textwrap', 'abc', 'dataclasses',
  'enum', 'time', 'random', 'struct', 'socket', 'select', 'signal',
  'threading', 'multiprocessing', 'queue', 'contextlib', 'operator',
  'weakref', 'types', 'inspect', 'dis', 'gc', 'traceback', 'warnings',
  'atexit', 'pprint', 'statistics', 'decimal', 'fractions', 'cmath',
  'array', 'bisect', 'heapq', 'codecs', 'locale', 'gettext', 'unicodedata',
  'difflib', 'fnmatch', 'fileinput', 'stat', 'posixpath', 'ntpath',
  'genericpath', 'linecache', 'tokenize', 'keyword', 'token', 'pdb',
  'profile', 'pstats', 'timeit', 'trace', 'pickle', 'shelve', 'dbm',
  'sqlite3', 'zlib', 'gzip', 'bz2', 'lzma', 'zipfile', 'tarfile',
  'configparser', 'tomllib', 'netrc', 'plistlib', 'xmlrpc', 'html',
  'xml', 'email', 'mailbox', 'mimetypes', 'binascii', 'quopri', 'uu',
  'secrets', 'hmac', 'ssl', 'ftplib', 'poplib', 'imaplib', 'smtplib',
  'uuid', 'telnetlib', 'xmlrpc', 'ipaddress', 'asyncio', 'concurrent',
  'ctypes', 'platform', 'errno', 'faulthandler', 'site', 'sysconfig',
  '__future__', 'builtins', '_thread',
])

const EXTENSION_TO_LANGUAGE: Record<string, SkillScript['language']> = {
  '.py': 'python',
  '.sh': 'bash',
  '.bash': 'bash',
  '.js': 'javascript',
  '.ts': 'javascript',
  '.mjs': 'javascript',
  '.cjs': 'javascript',
}

const EXTENSION_TO_MIME: Record<string, string> = {
  '.md': 'text/markdown',
  '.txt': 'text/plain',
  '.json': 'application/json',
  '.yaml': 'text/yaml',
  '.yml': 'text/yaml',
  '.csv': 'text/csv',
  '.html': 'text/html',
  '.xml': 'application/xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.pdf': 'application/pdf',
}

// ============================================================================
// URL Parsing
// ============================================================================

/**
 * Parse a GitHub URL into its components.
 *
 * Supports multiple URL formats:
 * - `https://github.com/owner/repo/tree/branch/path` (directory)
 * - `https://github.com/owner/repo/blob/branch/path/SKILL.md` (file)
 * - `https://raw.githubusercontent.com/owner/repo/branch/path/SKILL.md` (raw)
 * - `https://raw.githubusercontent.com/owner/repo/refs/heads/branch/path/SKILL.md` (raw with refs)
 *
 * If the URL points to SKILL.md directly, the path is resolved to the parent directory.
 *
 * @param url - GitHub URL
 * @returns Parsed URL components
 * @throws Error if the URL format is invalid
 */
export function parseGitHubUrl(url: string): ParsedGitHubUrl {
  // Standard GitHub tree or blob URL
  const treeMatch = url.match(
    /^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/(?:tree|blob)\/([^/]+)\/(.+)$/,
  )
  if (treeMatch) {
    const [, owner, repo, branch, rawPath] = treeMatch
    // Strip SKILL.md if pointing to the file directly
    const path = rawPath.replace(/\/SKILL\.md$/, '')
    return { owner, repo, branch, path }
  }

  // raw.githubusercontent.com with refs/heads/ prefix
  const rawRefsMatch = url.match(
    /^https?:\/\/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/refs\/heads\/([^/]+)\/(.+)$/,
  )
  if (rawRefsMatch) {
    const [, owner, repo, branch, rawPath] = rawRefsMatch
    const path = rawPath.replace(/\/SKILL\.md$/, '')
    return { owner, repo, branch, path }
  }

  // raw.githubusercontent.com standard format
  const rawMatch = url.match(
    /^https?:\/\/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/([^/]+)\/(.+)$/,
  )
  if (rawMatch) {
    const [, owner, repo, branch, rawPath] = rawMatch
    const path = rawPath.replace(/\/SKILL\.md$/, '')
    return { owner, repo, branch, path }
  }

  throw new Error(
    `Invalid GitHub URL format: ${url}. Expected a GitHub repository URL ` +
    '(e.g. https://github.com/owner/repo/tree/branch/path)',
  )
}

// ============================================================================
// YAML Frontmatter Parser (zero-dependency)
// ============================================================================

/**
 * Parse YAML frontmatter and markdown body from a SKILL.md file.
 *
 * This is a lightweight, zero-dependency parser that handles common
 * YAML constructs used in SKILL.md files: scalars, multi-line blocks (`>`),
 * and one level of nested mappings.
 *
 * @param raw - Raw SKILL.md content
 * @returns Parsed frontmatter and markdown body
 * @throws Error if no valid frontmatter is found
 */
export function parseFrontmatter(raw: string): {
  frontmatter: SkillManifest
  body: string
} {
  const fmRegex = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/
  const match = raw.match(fmRegex)
  if (!match) {
    throw new Error(
      'SKILL.md does not contain valid YAML frontmatter (missing --- markers)',
    )
  }

  const yamlBlock = match[1]
  const body = match[2]

  const manifest: Record<string, unknown> = {}
  let currentKey: string | null = null
  let multiLineValue = ''
  let isMultiLine = false
  let nestedObject: Record<string, string> | null = null
  let nestedKey: string | null = null
  const indent = (line: string) => line.length - line.trimStart().length

  const flushMultiLine = () => {
    if (isMultiLine && currentKey) {
      manifest[currentKey] = multiLineValue.trim()
      isMultiLine = false
      multiLineValue = ''
      currentKey = null
    }
  }

  const flushNested = () => {
    if (nestedKey && nestedObject) {
      manifest[nestedKey] = { ...nestedObject }
      nestedKey = null
      nestedObject = null
    }
  }

  for (const line of yamlBlock.split('\n')) {
    const trimmed = line.trimEnd()

    // Blank line
    if (trimmed === '') {
      if (isMultiLine) multiLineValue += '\n'
      continue
    }

    const lineIndent = indent(line)

    // Nested key:value (indented under a parent key)
    if (nestedKey && lineIndent >= 2) {
      const nestedMatch = trimmed.match(
        /^\s+(\w[\w.-]*)\s*:\s*"?([^"]*)"?\s*$/,
      )
      if (nestedMatch) {
        nestedObject![nestedMatch[1]] = nestedMatch[2].trim()
        continue
      }
    }

    // Multi-line continuation (indented text following a `>` or `|` block)
    if (isMultiLine && lineIndent >= 2) {
      multiLineValue += (multiLineValue ? ' ' : '') + trimmed.trim()
      continue
    }

    // Flush any open blocks before processing a new top-level key
    flushMultiLine()
    flushNested()

    // Top-level key: value
    const kvMatch = trimmed.match(/^(\w[\w.-]*)\s*:\s*(.*)$/)
    if (!kvMatch) continue

    const key = kvMatch[1]
    let value = kvMatch[2].trim()

    // Block scalar indicator (> or |)
    if (value === '>' || value === '|') {
      currentKey = key
      isMultiLine = true
      multiLineValue = ''
      continue
    }

    // Nested mapping (value is empty → expect indented children)
    if (value === '') {
      nestedKey = key
      nestedObject = {}
      continue
    }

    // Strip surrounding quotes
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }

    manifest[key] = value
  }

  flushMultiLine()
  flushNested()

  return {
    frontmatter: manifest as unknown as SkillManifest,
    body,
  }
}

// ============================================================================
// Language & Package Detection
// ============================================================================

/**
 * Detect the programming language of a file based on its extension.
 */
export function detectLanguage(filename: string): SkillScript['language'] {
  const ext = filename.slice(filename.lastIndexOf('.')).toLowerCase()
  return EXTENSION_TO_LANGUAGE[ext] ?? 'other'
}

/**
 * Detect the MIME type of a file based on its extension.
 */
export function detectMimeType(filename: string): string | undefined {
  const ext = filename.slice(filename.lastIndexOf('.')).toLowerCase()
  return EXTENSION_TO_MIME[ext]
}

/**
 * Extract third-party package names from Python source code
 * by analyzing import statements and filtering out stdlib modules.
 */
export function extractPythonPackages(source: string): string[] {
  const packages = new Set<string>()

  for (const line of source.split('\n')) {
    const trimmed = line.trim()

    // import foo, bar
    const importMatch = trimmed.match(/^import\s+(.+)$/)
    if (importMatch) {
      for (const part of importMatch[1].split(',')) {
        const mod = part.trim().split(/\s+as\s+/)[0].split('.')[0].trim()
        if (mod && !PYTHON_STDLIB_MODULES.has(mod)) {
          packages.add(mod)
        }
      }
      continue
    }

    // from foo import ...
    const fromMatch = trimmed.match(/^from\s+([\w.]+)\s+import/)
    if (fromMatch) {
      const mod = fromMatch[1].split('.')[0].trim()
      if (mod && !PYTHON_STDLIB_MODULES.has(mod)) {
        packages.add(mod)
      }
    }
  }

  return [...packages].sort()
}

// ============================================================================
// GitHub API Helpers
// ============================================================================

/**
 * Fetch a directory listing from the GitHub Contents API.
 *
 * @remarks Uses the public API (60 req/hour unauthenticated).
 */
export async function fetchGitHubDirectory(
  owner: string,
  repo: string,
  path: string,
): Promise<GitHubContentEntry[]> {
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`
  const res = await fetch(url, {
    headers: { Accept: 'application/vnd.github.v3+json' },
  })
  if (!res.ok) {
    throw new Error(
      `GitHub API error ${res.status} for ${url}: ${await res.text()}`,
    )
  }
  const data = await res.json()
  if (!Array.isArray(data)) {
    throw new Error(
      `Expected array from GitHub API for directory listing at ${path}`,
    )
  }
  return data as GitHubContentEntry[]
}

/**
 * Fetch raw file content from raw.githubusercontent.com.
 *
 * @remarks CORS-friendly, no rate limit.
 */
export async function fetchRawContent(
  owner: string,
  repo: string,
  branch: string,
  filePath: string,
): Promise<string> {
  const url = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath}`
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(
      `Failed to fetch raw content (${res.status}) from ${url}`,
    )
  }
  return res.text()
}

// ============================================================================
// Recursive Directory Fetching
// ============================================================================

/**
 * Recursively fetch all files in a GitHub directory.
 * Returns empty array if the directory doesn't exist (optional dirs like scripts/).
 */
export async function fetchAllFilesInDirectory(
  owner: string,
  repo: string,
  branch: string,
  dirPath: string,
): Promise<{ path: string; content: string }[]> {
  let entries: GitHubContentEntry[]
  try {
    entries = await fetchGitHubDirectory(owner, repo, dirPath)
  } catch {
    // Directory doesn't exist — not an error for optional dirs
    return []
  }

  const results: { path: string; content: string }[] = []

  for (const entry of entries) {
    if (entry.type === 'file') {
      const content = await fetchRawContent(owner, repo, branch, entry.path)
      results.push({ path: entry.path, content })
    } else if (entry.type === 'dir') {
      const nested = await fetchAllFilesInDirectory(
        owner,
        repo,
        branch,
        entry.path,
      )
      results.push(...nested)
    }
  }

  return results
}

// ============================================================================
// Main Entry Point
// ============================================================================

/**
 * Fetch a complete skill from GitHub given its directory URL.
 *
 * This is the primary function for downloading a skill. It:
 * 1. Parses the GitHub URL to extract owner/repo/branch/path
 * 2. Fetches SKILL.md and parses its YAML frontmatter
 * 3. Fetches scripts/, references/, and assets/ directories in parallel
 * 4. Detects languages and extracts Python package dependencies
 *
 * @param githubUrl - GitHub directory URL (e.g. https://github.com/org/repo/tree/main/skill-name)
 * @returns Complete skill data ready for installation
 * @throws Error if URL is invalid or SKILL.md is missing
 */
export async function fetchSkillFromGitHub(
  githubUrl: string,
): Promise<FetchedSkill> {
  const { owner, repo, branch, path } = parseGitHubUrl(githubUrl)

  // 1. Fetch SKILL.md
  const rawSkillMd = await fetchRawContent(
    owner,
    repo,
    branch,
    `${path}/SKILL.md`,
  )
  const { frontmatter: manifest } = parseFrontmatter(rawSkillMd)

  // 2. Fetch optional sub-directories in parallel
  const [scriptFiles, referenceFiles, assetFiles] = await Promise.all([
    fetchAllFilesInDirectory(owner, repo, branch, `${path}/scripts`),
    fetchAllFilesInDirectory(owner, repo, branch, `${path}/references`),
    fetchAllFilesInDirectory(owner, repo, branch, `${path}/assets`),
  ])

  // 3. Build scripts with language detection & package extraction
  const scripts: SkillScript[] = scriptFiles.map((f) => {
    const language = detectLanguage(f.path)
    const script: SkillScript = { path: f.path, content: f.content, language }
    if (language === 'python') {
      const pkgs = extractPythonPackages(f.content)
      if (pkgs.length > 0) script.requiredPackages = pkgs
    }
    return script
  })

  // 4. Build references & assets
  const references: SkillFile[] = referenceFiles.map((f) => ({
    path: f.path,
    content: f.content,
    mimeType: detectMimeType(f.path),
  }))

  const assets: SkillFile[] = assetFiles.map((f) => ({
    path: f.path,
    content: f.content,
    mimeType: detectMimeType(f.path),
  }))

  return { manifest, scripts, references, assets, rawSkillMd, githubUrl }
}
