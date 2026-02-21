/**
 * Sandboxed Code Runner — Pyodide Web Worker
 *
 * Loads CPython 3.11 (compiled to WebAssembly) via Pyodide and executes
 * Python scripts off the main thread in a fully sandboxed environment.
 *
 * Security properties:
 * - No DOM access (Web Worker)
 * - No localStorage / cookies / IndexedDB (isolation)
 * - No network access by default
 * - Emscripten virtual filesystem (no real FS)
 * - Main thread enforces timeouts via Worker.terminate()
 *
 * Message protocol:
 *   IN:  { type: 'execute', id, script, packages?, context?, files? }
 *   OUT: { type: 'ready' }
 *   OUT: { type: 'loading', message }
 *   OUT: { type: 'progress', id, message }
 *   OUT: { type: 'result', id, success, result?, error?, stdout, stderr,
 *          executionTimeMs, packagesInstalled?, outputFiles? }
 *
 * @module workers/pyodide-worker
 */

/* global importScripts, loadPyodide */

// Catch any truly unhandled promise rejections in the worker
self.addEventListener('unhandledrejection', (e) => {
  e.preventDefault()
  console.error('[pyodide-worker] Unhandled rejection:', e.reason)
})

const PYODIDE_CDN = 'https://cdn.jsdelivr.net/pyodide/v0.27.5/full/'

/**
 * Common package name aliases.
 * Maps import names / informal names → actual PyPI / Pyodide package names.
 */
const PACKAGE_ALIASES = {
  pil: 'Pillow',
  cv2: 'opencv-python',
  bs4: 'beautifulsoup4',
  yaml: 'pyyaml',
  sklearn: 'scikit-learn',
  skimage: 'scikit-image',
  dateutil: 'python-dateutil',
  attr: 'attrs',
  gi: 'pygobject',
  wx: 'wxpython',
  usb: 'pyusb',
  serial: 'pyserial',
  crypto: 'pycryptodome',
  PIL: 'Pillow',
}

/**
 * Resolve a package name through the alias map.
 * @param {string} pkg
 * @returns {string}
 */
function resolvePackageAlias(pkg) {
  // Exact match first (case-sensitive for PyPI)
  if (PACKAGE_ALIASES[pkg]) return PACKAGE_ALIASES[pkg]
  // Case-insensitive fallback
  const lower = pkg.toLowerCase()
  if (PACKAGE_ALIASES[lower]) return PACKAGE_ALIASES[lower]
  return pkg
}

let pyodide = null

// ── Initialization ──────────────────────────────────────────────────

async function initPyodide() {
  self.postMessage({ type: 'loading', message: 'Downloading Python runtime…' })
  importScripts(`${PYODIDE_CDN}pyodide.js`)

  self.postMessage({
    type: 'loading',
    message: 'Initializing Python 3.11 (WebAssembly)…',
  })
  pyodide = await loadPyodide({ indexURL: PYODIDE_CDN })

  self.postMessage({ type: 'loading', message: 'Loading package manager…' })
  await pyodide.loadPackage('micropip')

  // Create standard directories for file I/O
  pyodide.runPython(`
import os
for _d in ['/input', '/output', '/tmp']:
    os.makedirs(_d, exist_ok=True)
del _d
`)

  self.postMessage({ type: 'ready' })
}

// ── File I/O helpers ────────────────────────────────────────────────

/**
 * Mount input files into the Pyodide virtual filesystem.
 *
 * @param {Array<{path: string, content: string, encoding?: string}>} files
 */
function mountInputFiles(files) {
  if (!files || files.length === 0) return

  for (const file of files) {
    const targetPath = file.path.startsWith('/')
      ? file.path
      : `/input/${file.path}`

    // Ensure parent directory exists
    const dir = targetPath.substring(0, targetPath.lastIndexOf('/'))
    if (dir) {
      pyodide.runPython(`
import os
os.makedirs('${dir}', exist_ok=True)
`)
    }

    if (file.encoding === 'base64') {
      // Binary file — decode base64 and write as bytes
      const binaryStr = atob(file.content)
      const bytes = new Uint8Array(binaryStr.length)
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i)
      }
      pyodide.FS.writeFile(targetPath, bytes)
    } else {
      // Text file — write as UTF-8
      pyodide.FS.writeFile(targetPath, file.content)
    }
  }
}

/**
 * Collect output files from /output/ directory.
 *
 * @returns {Array<{path: string, content: string, encoding: string}>}
 */
function collectOutputFiles() {
  const outputs = []

  try {
    const fileList = pyodide.runPython(`
import os, json, base64

_output_files = []
for _root, _dirs, _files in os.walk('/output'):
    for _f in _files:
        _full = os.path.join(_root, _f)
        try:
            _content = open(_full, 'r').read()
            _output_files.append({'path': _full, 'content': _content, 'encoding': 'text'})
        except UnicodeDecodeError:
            _raw = open(_full, 'rb').read()
            _b64 = base64.b64encode(_raw).decode('ascii')
            _output_files.append({'path': _full, 'content': _b64, 'encoding': 'base64'})

json.dumps(_output_files)
`)

    if (fileList) {
      return JSON.parse(fileList)
    }
  } catch (_) {
    // Output collection is best-effort
  }

  return outputs
}

/**
 * Clean up input/output directories between executions.
 */
function cleanupFilesystem() {
  try {
    pyodide.runPython(`
import os, shutil
for _d in ['/input', '/output']:
    if os.path.exists(_d):
        shutil.rmtree(_d)
    os.makedirs(_d, exist_ok=True)
del _d
`)
  } catch (_) {
    // Best-effort cleanup
  }
}

// ── Execution ───────────────────────────────────────────────────────

async function handleExecute(msg) {
  const { id, script, packages = [], context = {}, files = [] } = msg
  const start = performance.now()
  let stdout = ''
  let stderr = ''
  const packagesInstalled = []

  try {
    // ── Clean up from previous execution ──────────────────────────
    cleanupFilesystem()

    // ── Mount input files ─────────────────────────────────────────
    if (files.length > 0) {
      self.postMessage({
        type: 'progress',
        id,
        message: `Mounting ${files.length} input file(s)…`,
      })
      mountInputFiles(files)
    }

    // ── Install requested packages ────────────────────────────────
    if (packages.length > 0) {
      // Resolve aliases (e.g. PIL → Pillow, cv2 → opencv-python)
      const resolvedPackages = packages.map((pkg) => {
        const resolved = resolvePackageAlias(pkg)
        if (resolved !== pkg) {
          stderr += `Note: Resolved package alias "${pkg}" → "${resolved}"\n`
        }
        return resolved
      })

      self.postMessage({
        type: 'progress',
        id,
        message: `Installing packages: ${resolvedPackages.join(', ')}…`,
      })
      const micropip = pyodide.pyimport('micropip')
      for (const pkg of resolvedPackages) {
        try {
          await micropip.install(pkg)
          packagesInstalled.push(pkg)
        } catch (pkgErr) {
          // If a package fails, report but continue with others
          stderr += `Warning: Failed to install "${pkg}": ${pkgErr.message}\n`
        }
      }
    }

    // ── Inject context variables into Python globals ──────────────
    for (const [key, value] of Object.entries(context)) {
      pyodide.globals.set(key, pyodide.toPy(value))
    }

    // ── Build sys.argv from context variables ─────────────────────
    // Scripts using argparse read from sys.argv. Convert context
    // key-value pairs to CLI-style arguments so they work naturally.
    const sysArgv = ['script.py']
    for (const [key, value] of Object.entries(context)) {
      // Convert key to --flag format (underscores → hyphens)
      const flag = `--${key.replace(/_/g, '-')}`
      if (typeof value === 'boolean') {
        if (value) sysArgv.push(flag)
      } else {
        sysArgv.push(flag, String(value))
      }
    }

    // ── Redirect stdout / stderr and patch sys.exit ───────────────
    pyodide.runPython(`
import sys, io as _io

# Capture stdout/stderr
_captured_stdout = _io.StringIO()
_captured_stderr = _io.StringIO()
_orig_stdout = sys.stdout
_orig_stderr = sys.stderr
sys.stdout = _captured_stdout
sys.stderr = _captured_stderr

# Set sys.argv from context variables (for argparse compatibility)
sys.argv = ${JSON.stringify(sysArgv)}

# Override sys.exit to prevent SystemExit from crashing the sandbox.
# argparse calls sys.exit(2) on parse errors, which would otherwise
# terminate execution and produce an unhelpful traceback.
class _SandboxExit(Exception):
    def __init__(self, code=0):
        self.code = code
        super().__init__(f"sys.exit({code})")

_orig_exit = sys.exit
def _sandbox_exit(code=0):
    raise _SandboxExit(code)
sys.exit = _sandbox_exit
`)

    // ── Execute the script ────────────────────────────────────────
    self.postMessage({ type: 'progress', id, message: 'Running script…' })

    let result = null
    let execError = null
    let isSandboxExit = false
    try {
      const pyResult = await pyodide.runPythonAsync(script)
      if (pyResult !== undefined && pyResult !== null) {
        result = String(pyResult)
      }
    } catch (e) {
      // Check if this is a _SandboxExit (from sys.exit override)
      const errMsg = e.message || String(e)
      if (errMsg.includes('_SandboxExit')) {
        isSandboxExit = true
        // Extract the exit code from the error message
        const codeMatch = errMsg.match(/sys\.exit\((\d+)\)/)
        const exitCode = codeMatch ? parseInt(codeMatch[1], 10) : 1
        if (exitCode !== 0) {
          // We'll build the full error message after capturing stderr
          // so we can include the argparse usage/error hints
          execError = { exitCode }
        }
        // exit(0) is a normal exit — not an error
      } else {
        execError = e
      }
    }

    // ── Capture output (always, even on error) ────────────────────
    try {
      stdout = pyodide.runPython('_captured_stdout.getvalue()')
    } catch (_) {
      /* ignore */
    }
    try {
      const capturedStderr = pyodide.runPython('_captured_stderr.getvalue()')
      stderr += capturedStderr
    } catch (_) {
      /* ignore */
    }

    // ── Clean stderr and build error for _SandboxExit ─────────────
    if (isSandboxExit) {
      // Strip Python traceback noise from stderr — keep only the
      // meaningful lines (argparse usage, error messages, etc.)
      const cleanLines = []
      const stderrLines = stderr.split('\n')
      let inTraceback = false
      for (const line of stderrLines) {
        if (line.startsWith('Traceback (most recent call last):')) {
          inTraceback = true
          continue
        }
        if (inTraceback) {
          // End of traceback: a line that doesn't start with whitespace
          // and isn't "During handling of..." or a chained exception line
          if (
            line.startsWith('  ') ||
            line.startsWith('\t') ||
            line.startsWith('During handling of') ||
            line.startsWith('_SandboxExit:') ||
            line.match(/^\w+Error:/) ||
            line.match(/^\w+Exception:/) ||
            line === ''
          ) {
            continue // skip traceback lines
          }
          inTraceback = false
        }
        cleanLines.push(line)
      }
      stderr = cleanLines.join('\n').trim()

      // Build friendly error including the argparse hint from stderr
      if (execError && execError.exitCode !== undefined) {
        const argparseHint = stderr ? `\n\nScript stderr:\n${stderr}` : ''
        execError = new Error(
          `Script called sys.exit(${execError.exitCode}). ` +
            `This typically means argparse could not parse the provided arguments. ` +
            `Make sure to pass the required arguments as key-value pairs in the "arguments" object — ` +
            `they are injected as --key value in sys.argv (underscores become hyphens).` +
            argparseHint,
        )
      }
    }

    // ── Restore streams and sys.exit ──────────────────────────────
    try {
      pyodide.runPython(`
import sys as _sys
_sys.stdout = _orig_stdout
_sys.stderr = _orig_stderr
_sys.exit = _orig_exit
del _captured_stdout, _captured_stderr, _orig_stdout, _orig_stderr, _orig_exit, _sandbox_exit, _SandboxExit
`)
    } catch (_) {
      try {
        pyodide.runPython(`
import sys as _sys, io as _io
if not hasattr(_sys.stdout, 'fileno'):
    _sys.stdout = _io.TextIOWrapper(_io.FileIO(1, 'w'))
if not hasattr(_sys.stderr, 'fileno'):
    _sys.stderr = _io.TextIOWrapper(_io.FileIO(2, 'w'))
`)
      } catch (_) {
        /* give up */
      }
    }

    if (execError) {
      throw execError
    }

    // ── Collect output files ──────────────────────────────────────
    const outputFiles = collectOutputFiles()

    const executionTimeMs = Math.round(performance.now() - start)
    self.postMessage({
      id,
      type: 'result',
      success: true,
      result,
      stdout,
      stderr,
      executionTimeMs,
      ...(packagesInstalled.length > 0 && { packagesInstalled }),
      ...(outputFiles.length > 0 && { outputFiles }),
    })
  } catch (err) {
    const executionTimeMs = Math.round(performance.now() - start)
    self.postMessage({
      id,
      type: 'result',
      success: false,
      error: err.message || String(err),
      stdout,
      stderr,
      executionTimeMs,
    })
  }
}

// ── Message handler ──────────────────────────────────────────────────

self.onmessage = async (e) => {
  const msg = e.data
  if (msg.type === 'execute') {
    if (!pyodide) {
      self.postMessage({
        id: msg.id,
        type: 'result',
        success: false,
        error:
          'Python environment is not initialized yet. Please wait for the ready signal.',
        stdout: '',
        stderr: '',
        executionTimeMs: 0,
      })
      return
    }
    await handleExecute(msg)
  }
}

// ── Boot ─────────────────────────────────────────────────────────────

initPyodide().catch((err) => {
  self.postMessage({
    type: 'result',
    id: '__init__',
    success: false,
    error: `Python environment initialization failed: ${err.message || err}`,
    stdout: '',
    stderr: '',
    executionTimeMs: 0,
  })
})
