# Agent Skills — In-Browser Skill Execution for DEVS

## Executive Summary

**Agent Skills** is an open standard (by Anthropic, adopted by OpenAI) for packaging specialized knowledge, workflows, and executable scripts into portable folders that extend AI agent capabilities. DEVS aims to be the first **browser-native** platform that can discover, install, and **execute** Agent Skills — including their Python scripts — entirely client-side, with zero server dependencies.

This is made possible by three building blocks:

| Component              | Role                                          | Source                                        |
| ---------------------- | --------------------------------------------- | --------------------------------------------- |
| **Skills.sh Registry** | Open leaderboard & search across 79k+ skills  | [skills.sh](https://skills.sh) REST API       |
| **SkillsMP Registry**  | Discovery & search across 227k+ skills        | [skillsmp.com](https://skillsmp.com) REST API |
| **Polyglot Sandbox**   | Unified code execution (Python + JS)          | `src/lib/sandbox/` with Pyodide & QuickJS     |
| **Web Workers**        | Sandboxed, off-main-thread execution          | Browser-native API                            |

Combined, they let any DEVS user browse the world's Agent Skills catalog, install a skill, and have their agents **run its Python and JavaScript scripts in-browser** — including installing PyPI packages on the fly — all without a server, a terminal, or any local Python installation.

---

## Table of Contents

1. [What Are Agent Skills?](#1-what-are-agent-skills)
2. [The DEVS Opportunity](#2-the-devs-opportunity)
3. [Architecture Overview](#3-architecture-overview)
4. [Skill Discovery — Registry Integration](#4-skill-discovery--registry-integration)
5. [Skill Storage & Management](#5-skill-storage--management)
6. [Skill Activation — Prompt Injection](#6-skill-activation--prompt-injection)
7. [Skill Execution — Polyglot Sandbox](#7-skill-execution--polyglot-sandbox)
8. [Tool System Integration](#8-tool-system-integration)
9. [Security Model](#9-security-model)
10. [Gap Analysis](#10-gap-analysis)
11. [Implementation Plan](#11-implementation-plan)
12. [Technical Risks & Mitigations](#12-technical-risks--mitigations)
13. [Future Possibilities](#13-future-possibilities)

---

## 1. What Are Agent Skills?

[Agent Skills](https://agentskills.io/) are a lightweight, open format for extending AI agents. A skill is a directory with:

```
skill-name/
├── SKILL.md          # Required — YAML frontmatter + markdown instructions
├── scripts/          # Optional — executable code (Python, Bash, etc.)
├── references/       # Optional — documentation loaded on demand
└── assets/           # Optional — templates, images, data files
```

### SKILL.md Format

```yaml
---
name: data-analysis
description: >
  Analyze datasets using Python with pandas, numpy, and visualization
  libraries. Use when analyzing CSV/Excel files, exploring data, or
  creating visualizations.
license: Apache-2.0
metadata:
  author: example-org
  version: "1.0"
---

# Data Analysis

## When to use
Use this skill when the user wants to analyze data, create charts, ...

## How to analyze
1. Load the dataset with pandas...
2. Run the analysis script: `scripts/analyze.py`
...
```

### Progressive Disclosure

Skills are designed for token efficiency:

1. **Discovery** (~50-100 tokens): Only `name` and `description` are loaded at startup
2. **Activation** (<5000 tokens): Full `SKILL.md` body loaded when the skill matches a task
3. **Execution** (as needed): Scripts, references, and assets loaded only when required

### Where Skills Come From

- [Anthropic's official skills](https://github.com/anthropics/skills) — 15 high-quality reference skills
- [agentskills.io](https://agentskills.io/) — Open specification
- [Skills.sh](https://skills.sh/) — Open leaderboard tracking 79k+ skills by install count
- [SkillsMP](https://skillsmp.com/) — Community registry indexing 227k+ skills from GitHub
- Developers create custom skills in their own repos

---

## 2. The DEVS Opportunity

### The Problem

Agent Skills were designed for **filesystem-based agents** (Claude Code, Codex CLI) that can `cat` files and `python script.py`. Browser-based platforms are explicitly labeled as the "tool-based" integration path — the less capable option.

### The Gap We Fill

No browser-native platform currently provides:

- Searching and installing skills from a registry
- Injecting skill instructions into agent prompts at runtime
- **Executing skill scripts** without a server

DEVS can be the first to close this gap, making 227k+ skills accessible to anyone with a browser.

### Why It Matters

| Audience            | Value                                                                            |
| ------------------- | -------------------------------------------------------------------------------- |
| Non-technical users | Access to specialized AI workflows without installing Python, Git, or a terminal |
| Developers          | Test and use skills across devices without local setup                           |
| Skill authors       | Massive new distribution channel — any browser becomes a runtime                 |
| DEVS platform       | Competitive moat — no other browser-based agent platform can execute skills      |

---

## 3. Architecture Overview

```
┌────────────────────────────────────────────────────────────────────────┐
│                         DEVS Browser App                               │
│                                                                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────────┐ │
│  │ Skill Store  │  │ Skill        │  │ LLM Chat Flow                │ │
│  │ (Yjs Map)    │◀─│ Discovery UI │  │                              │ │
│  │              │  │              │  │ System Message:              │ │
│  │ - metadata   │  │ Skills.sh +  │  │ ┌──────────────────────┐    │ │
│  │ - SKILL.md   │  │ SkillsMP API │  │ │ Agent Instructions   │    │ │
│  │ - scripts/   │  │ (search)     │  │ ├──────────────────────┤    │ │
│  │ - refs/      │  │              │  │ │ Memory Context       │    │ │
│  │ - assets/    │  └──────────────┘  │ ├──────────────────────┤    │ │
│  └──────┬───────┘                    │ │ Skill Catalog        │◀───┼── <available_skills>
│         │                            │ │ (name+desc only)     │    │ │
│         │ activate                   │ ├──────────────────────┤    │ │
│         ▼                            │ │ Active Skill Body    │◀───┼── Full SKILL.md
│  ┌──────────────────────┐            │ └──────────────────────┘    │ │
│  │ Polyglot Sandbox     │            │                              │ │
│  │ (src/lib/sandbox/)   │◀── tool ───│ Tool Definitions:           │ │
│  │                      │    call    │ ┌──────────────────────┐    │ │
│  │ ┌─────────────────┐  │            │ │ activate_skill       │    │ │
│  │ │ PythonRuntime    │  │            │ │ run_skill_script     │    │ │
│  │ │ (Pyodide Worker) │  │            │ │ read_skill_file      │    │ │
│  │ ├─────────────────┤  │── result ──▶│ │ execute (code interp)│    │ │
│  │ │ JavaScriptRuntime│  │            │ └──────────────────────┘    │ │
│  │ │ (QuickJS Worker) │  │            │                              │ │
│  │ └─────────────────┘  │            └──────────────────────────────┘ │
│  └──────────────────────┘                                              │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
          │                                        │
          │ (no network)                           │ CORS proxy / dedicated proxy
          ▼                                        ▼
     ┌──────────┐                           ┌──────────────┐
     │ IndexedDB │                           │ SkillsMP API │
     │ (via Yjs) │                           │ Skills.sh    │
     └──────────┘                           │ GitHub Raw   │
                                            └──────────────┘
```

### Data Flow

1. **Discovery**: User searches Skills.sh and/or SkillsMP → selects skill → metadata saved to Yjs
2. **Fetching**: SKILL.md + scripts fetched from GitHub raw URLs → stored in Yjs
3. **Activation**: When a task matches a skill description, the LLM calls `activate_skill` to load full instructions
4. **Execution**: LLM calls `run_skill_script` tool → Sandbox routes to the appropriate runtime (Pyodide for Python, QuickJS for JavaScript) → result returns to LLM

### Relationship with the `execute` Tool

The platform provides **two code execution tools** that share the same Sandbox engine:

| Tool               | Purpose                                | Trigger                                |
| ------------------ | -------------------------------------- | -------------------------------------- |
| `execute`          | General-purpose code interpreter       | LLM writes ad-hoc code during chat     |
| `run_skill_script` | Execute a script bundled with a skill  | LLM activates a skill and runs its scripts |

Both route through `sandbox.execute()` — the unified entry point that dispatches to the correct WASM runtime. The `execute` tool is disabled by default and enabled per-agent, while `run_skill_script` is always available when skills are installed.

---

## 4. Skill Discovery — Registry Integration

### Skills.sh — Open Leaderboard

[Skills.sh](https://skills.sh) is the open Agent Skills ecosystem by Vercel Labs. It provides a free, unauthenticated search API that indexes skills from GitHub repositories and ranks them by install count.

#### API Endpoint

```
GET https://skills.sh/api/search
Params: q (string)
```

No authentication required.

#### Response Format

```json
{
  "query": "design",
  "searchType": "fuzzy",
  "skills": [
    {
      "id": "vercel-labs/agent-skills/web-design-guidelines",
      "skillId": "web-design-guidelines",
      "name": "web-design-guidelines",
      "installs": 137509,
      "source": "vercel-labs/agent-skills"
    }
  ]
}
```

#### CORS Solution

Skills.sh doesn't set CORS headers for browser requests. Instead of routing through the generic CORS proxy, we use a **dedicated proxy route** in `vite-proxy-routes.ts`:

```typescript
{
  pathPrefix: '/api/skills',
  target: 'https://skills.sh',
  targetPathPrefix: '/api',
  credentials: { type: 'none' },
}
```

- **Dev**: Vite's `oauthProxyPlugin` rewrites `/api/skills/*` → `https://skills.sh/api/*`
- **Prod**: The bridge server / Caddy handles the same path rewrite

This approach is simpler than the CORS proxy since no authentication or header injection is needed.

#### Unified Search

The Settings UI searches both registries in parallel. Results from Skills.sh are converted to the SkillsMP `SkillSearchResult` format via `toUnifiedSkillResult()`, enabling seamless merging and deduplication by GitHub URL.

### SkillsMP — Curated Registry

#### API Endpoints

SkillsMP provides two search endpoints authenticated via API key:

#### Keyword Search

```
GET https://skillsmp.com/api/v1/skills/search
Authorization: Bearer <API_KEY>
Params: q (string), page (number), limit (number, max 100), sortBy (stars|recent)
```

#### AI Semantic Search

```
GET https://skillsmp.com/api/v1/skills/ai-search
Authorization: Bearer <API_KEY>
Params: q (string)
```

### Response Format

```json
{
  "success": true,
  "data": {
    "skills": [
      {
        "id": "ihkreddy-agent-skills-data-analysis-skill-md",
        "name": "data-analysis",
        "author": "IHKREDDY",
        "description": "Analyze datasets using Python with pandas...",
        "githubUrl": "https://github.com/IHKREDDY/agent-skills/tree/main/data-analysis",
        "skillUrl": "https://skillsmp.com/skills/ihkreddy-agent-skills-...",
        "stars": 10,
        "updatedAt": 1766572679
      }
    ],
    "pagination": { "page": 1, "limit": 20, "total": 2345, "hasNext": true }
  }
}
```

### CORS Consideration

The SkillsMP API likely requires CORS headers for browser calls. Two strategies:

1. **Preferred**: Route through DEVS CORS proxy (`fetchViaCorsProxy`) — works today for GET requests
2. **Alternative**: Ask SkillsMP to allowlist `devs.new` origin
3. **Fallback**: Add a dedicated proxy route in `vite-proxy-routes.ts` and Caddy config

### API Key Management

The SkillsMP API key (`sk_live_skillsmp_...`) is a platform-level credential, not per-user. Options:

| Strategy                      | Pros                                   | Cons                             |
| ----------------------------- | -------------------------------------- | -------------------------------- |
| **Embed in app** (obfuscated) | Simple, works offline after first load | Key extractable from bundle      |
| **Proxy the search API**      | Key stays server-side                  | Adds server dependency           |
| **User provides own key**     | Zero risk                              | Friction, most users won't do it |

**Recommendation**: Embed the key in the app bundle (environment variable via Vite). The key only grants read-only search access to public GitHub data — low risk. Add rate limiting awareness in the UI.

---

## 5. Skill Storage & Management

### Data Model

```typescript
interface InstalledSkill {
  id: string // SkillsMP ID or custom slug
  name: string // From SKILL.md frontmatter
  description: string // From SKILL.md frontmatter
  author: string // GitHub author
  license?: string // From frontmatter
  metadata?: Record<string, string> // From frontmatter
  compatibility?: string // Environment requirements

  // Content (fetched from GitHub)
  skillMdContent: string // Full SKILL.md body (instructions)
  scripts: SkillScript[] // Fetched Python/Bash scripts
  references: SkillFile[] // Reference documents
  assets: SkillFile[] // Static resources

  // Management
  githubUrl: string // Source repository
  stars: number // Popularity indicator
  installedAt: Date
  updatedAt: Date
  lastCheckedAt?: Date // For update detection
  enabled: boolean // User can disable without uninstalling

  // Assignment
  assignedAgentIds: string[] // Which agents have this skill (empty = all)
  autoActivate: boolean // Always inject vs. match-based activation
}

interface SkillScript {
  path: string // e.g. "scripts/analyze.py"
  content: string // Script source code
  language: 'python' | 'bash' | 'javascript' | 'other'
  requiredPackages?: string[] // Extracted from imports (e.g. ['pandas', 'numpy'])
}

interface SkillFile {
  path: string // e.g. "references/REFERENCE.md"
  content: string // File content (text) or base64 (binary)
  mimeType?: string
}
```

### Yjs Integration

Skills are stored in a dedicated Yjs map, consistent with existing store patterns:

```typescript
// src/stores/skillStore.ts
const skills: Y.Map<InstalledSkill> = ydoc.getMap('skills')

export function installSkill(data: InstalledSkill): InstalledSkill { ... }
export function uninstallSkill(id: string): void { ... }
export function getInstalledSkills(): InstalledSkill[] { ... }
export function getSkillsForAgent(agentId: string): InstalledSkill[] { ... }
export function useSkills(): InstalledSkill[] { return useLiveMap(skills) }
```

### Fetching Skill Content from GitHub

SkillsMP provides `githubUrl` linking to the skill's GitHub directory. To fetch content:

1. **Parse the GitHub URL** → extract `owner`, `repo`, `branch`, `path`
2. **Use GitHub API** to list directory contents:
   ```
   GET https://api.github.com/repos/{owner}/{repo}/contents/{path}
   ```
3. **Fetch each file** via raw URL:
   ```
   https://raw.githubusercontent.com/{owner}/{repo}/{branch}/{path}/SKILL.md
   ```
4. **Recursively fetch** `scripts/`, `references/`, `assets/` directories

**CORS**: `raw.githubusercontent.com` supports CORS — direct `fetch()` works from the browser. The GitHub API also supports CORS for unauthenticated requests (60 req/hour limit — sufficient for skill installation).

### Package Dependency Extraction

When a Python script is installed, automatically parse its imports to pre-identify required packages:

```typescript
function extractPythonDependencies(scriptContent: string): string[] {
  const imports = new Set<string>()
  const importRegex = /^(?:from\s+(\w+)|import\s+(\w+))/gm
  let match
  while ((match = importRegex.exec(scriptContent))) {
    const pkg = match[1] || match[2]
    if (!STDLIB_MODULES.has(pkg)) imports.add(pkg)
  }
  return Array.from(imports)
}
```

---

## 6. Skill Activation — Prompt Injection

### Phase 1: Catalog Injection (All Conversations)

At conversation start, inject a compact catalog of all enabled skills into the system message — same pattern as the Agent Skills spec recommends:

```xml
<available_skills>
  <skill>
    <name>pdf</name>
    <description>Use for anything involving PDF files: reading, merging, splitting, form filling, OCR.</description>
  </skill>
  <skill>
    <name>data-analysis</name>
    <description>Analyze datasets with pandas, numpy, create charts and statistical summaries.</description>
  </skill>
</available_skills>
```

**Token budget**: ~50-100 tokens per skill. With 20 installed skills, this costs ~1000-2000 tokens — acceptable.

**Integration point**: `buildAgentInstructions()` in `src/lib/agent-knowledge.ts` — append the catalog XML after existing knowledge context.

### Phase 2: Skill Activation (On Demand)

When the LLM determines a task matches a skill, it activates it. Two approaches:

#### Approach A: LLM-Driven Activation (Recommended)

Add a `activate_skill` tool that the LLM can call:

```typescript
const activateSkillTool: ToolDefinition = {
  type: 'function',
  function: {
    name: 'activate_skill',
    description:
      'Load the full instructions for a skill to perform a specialized task.',
    parameters: {
      type: 'object',
      properties: {
        skill_name: {
          type: 'string',
          description: 'The name of the skill to activate',
        },
      },
      required: ['skill_name'],
    },
  },
}
```

When called, the tool returns the full SKILL.md body content. The LLM then has the detailed instructions and can call `run_skill_script` for execution.

#### Approach B: Auto-Activation (Simpler)

Pre-match skills to the conversation topic using keyword/embedding similarity and inject up-front. Simpler but wastes context window if mismatched.

**Recommendation**: Start with Approach A (LLM-driven) — it matches the Agent Skills spec's progressive disclosure philosophy and is more token-efficient.

### Per-Agent Skill Assignment

Skills can be assigned to specific agents or be globally available:

```typescript
function getSkillsForAgent(agentId: string): InstalledSkill[] {
  return getInstalledSkills().filter(
    (skill) =>
      skill.enabled &&
      (skill.assignedAgentIds.length === 0 ||
        skill.assignedAgentIds.includes(agentId)),
  )
}
```

---

## 7. Skill Execution — Polyglot Sandbox

Skill scripts execute through the **unified Sandbox** (`src/lib/sandbox/`), a polyglot code execution engine that routes to WASM-isolated runtimes. This replaces the need for a standalone Pyodide service — the Sandbox provides Python (Pyodide) and JavaScript (QuickJS) under a single API.

### Sandbox Architecture

```
src/lib/sandbox/
├── index.ts              # Public API: sandbox singleton, types, runtime re-exports
├── sandbox.ts            # Sandbox class — routes to runtimes by language
├── types.ts              # SandboxRequest, SandboxResult, ISandboxRuntime interface
└── runtimes/
    ├── python.ts         # PythonRuntime — wraps Pyodide Web Worker
    └── javascript.ts     # JavaScriptRuntime — wraps QuickJS Web Worker
```

### Unified Execution API

All code execution — whether from skill scripts or the general `execute` tool — uses the same interface:

```typescript
import { sandbox } from '@/lib/sandbox'

// Execute Python (Pyodide)
const py = await sandbox.execute({
  language: 'python',
  code: 'import math; print(math.pi)',
  packages: ['numpy'],
  files: [{ path: 'data.csv', content: 'a,b\n1,2' }],
  timeout: 60_000,
})

// Execute JavaScript (QuickJS)
const js = await sandbox.execute({
  language: 'javascript',
  code: 'export default [1,2,3].reduce((a,b) => a+b, 0)',
  timeout: 5_000,
})
```

### Web Worker Isolation

Each runtime runs in a **dedicated Web Worker** — completely isolated from the main thread:

```
Main Thread (UI)               Web Workers (WASM Runtimes)
┌──────────────────┐           ┌──────────────────────────┐
│ React App        │           │ PythonRuntime            │
│ LLM Chat Flow    │           │ ┌──────────────────────┐ │
│                  │ postMsg   │ │ Pyodide (Python 3.11)│ │
│ Sandbox ─────────┼──────────▶│ │ - Full stdlib        │ │
│                  │           │ │ - micropip (PyPI)    │ │
│                  │◀──────────┼─│ - Virtual filesystem │ │
│                  │  result   │ └──────────────────────┘ │
│                  │           ├──────────────────────────┤
│                  │ postMsg   │ JavaScriptRuntime        │
│                  ├──────────▶│ ┌──────────────────────┐ │
│                  │           │ │ QuickJS (ES2020)     │ │
│                  │◀──────────┼─│ - Console capture    │ │
│                  │  result   │ │ - JSON interop       │ │
│                  │           │ └──────────────────────┘ │
└──────────────────┘           └──────────────────────────┘
```

**Benefits**:

- UI never freezes during script execution
- Code cannot access DOM, localStorage, cookies, or Service Worker
- Workers can be terminated (timeout) without crashing the app
- Each language has independent lifecycle (lazy init, terminate, restart)
- Progress events stream from workers to the UI in real-time

### Runtime Lifecycle

Runtimes are created lazily on first use and cached for subsequent calls:

```typescript
// Pre-warm a runtime for instant first execution
await sandbox.warmup('python')

// Check runtime state
sandbox.getState('python')  // 'idle' | 'loading' | 'ready' | 'executing' | 'error'

// Subscribe to progress events
const unsubscribe = sandbox.onProgress((event) => {
  // event.type: 'loading' | 'installing' | 'executing' | 'complete'
  console.log(event.message)
})

// Terminate a runtime to free resources
sandbox.terminate('python')
```

### Supported Languages

| Language       | Runtime   | WASM Engine | Script Support | Package Support                    |
| -------------- | --------- | ----------- | -------------- | ---------------------------------- |
| **Python**     | Pyodide   | Emscripten  | ✅ Full        | micropip (PyPI) + 100+ built-in   |
| **JavaScript** | QuickJS   | WASM        | ✅ Full        | N/A (self-contained)              |
| **Bash**       | —         | —           | ❌ Read-only   | N/A — shown as text for LLM       |

### Python Runtime Details

The `PythonRuntime` (`src/lib/sandbox/runtimes/python.ts`) wraps the Pyodide Web Worker (`src/workers/pyodide-worker.js`):

- **CPython 3.11** compiled to WebAssembly via Emscripten
- **100+ pre-compiled packages**: NumPy, pandas, scipy, matplotlib, scikit-learn, Pillow, lxml, etc.
- **micropip**: Install pure-Python wheels from PyPI at runtime
- **Virtual filesystem**: Mount input files before execution, collect output files after
- **stdout/stderr capture**: All `print()` output captured and returned

### Package Installation

Pyodide supports installing packages in three tiers:

| Tier            | Source                   | Examples                                                     | Install Method               |
| --------------- | ------------------------ | ------------------------------------------------------------ | ---------------------------- |
| **Built-in**    | Pre-compiled WASM wheels | numpy, pandas, scipy, matplotlib, scikit-learn, Pillow, lxml | `pyodide.loadPackage()`      |
| **Pure Python** | PyPI (any wheel)         | requests, pyyaml, beautifulsoup4, pdfplumber, pypdf          | `micropip.install()`         |
| **C-extension** | Not supported            | psycopg2, some crypto libs                                   | N/A — must find alternatives |

Package compatibility is checked before execution via `checkPackageCompatibility()` from `src/lib/sandbox/runtimes/python.ts`. Incompatible packages produce a warning but don't block execution.

### Handling Skill Scripts by Language

The `run_skill_script` tool handles different script languages:

1. **Python scripts**: Execute via the Sandbox's Python runtime ✅
2. **JavaScript scripts**: Execute via the Sandbox's JavaScript runtime ✅
3. **Bash/other scripts**: Return the script content to the LLM with an explanation that the script cannot be executed directly, but the LLM can read it and follow the logic manually or translate relevant parts to Python/JavaScript

### File I/O Bridge

The file bridge (`src/lib/skills/file-bridge.ts`) maps between DEVS knowledge items and the Sandbox's virtual filesystem:

```typescript
import { resolveInputFiles, processOutputFiles, formatOutputForLLM } from '@/lib/skills/file-bridge'

// Resolve knowledge items to sandbox-compatible files
const inputFiles = await resolveInputFiles([
  { path: 'data.csv', knowledgeItemId: 'abc123' },
  { path: 'config.json', content: '{"key": "value"}' },
])

// Pass to sandbox execution
const result = await sandbox.execute({
  language: 'python',
  code: scriptContent,
  files: inputFiles,
})

// Process output files (detect MIME types, format for display)
const outputs = processOutputFiles(result.outputFiles ?? [])
const formatted = formatOutputForLLM(outputs)
```

---

## 8. Tool System Integration

Skills integrate with the DEVS tool system via three tool plugins registered in `src/tools/plugins/skill-tools.ts` and one shared tool in `src/tools/plugins/execute.ts`.

### Tool Plugin System

All tools follow the same plugin pattern (`createToolPlugin()`) and are collected by the `ToolPluginRegistry`:

```typescript
// src/tools/plugins/skill-tools.ts
import { createToolPlugin } from '../registry'
import { sandbox, checkPackageCompatibility } from '@/lib/sandbox'
import { resolveInputFiles, processOutputFiles, formatOutputForLLM } from '@/lib/skills/file-bridge'
```

### Tool 1: `activate_skill`

Loads full SKILL.md instructions when the LLM determines a task matches an available skill. Returns the skill body plus a listing of available scripts, references, and assets.

```typescript
export const activateSkillPlugin = createToolPlugin<{ skill_name: string }, string>({
  metadata: {
    name: 'activate_skill',
    displayName: 'Activate Skill',
    shortDescription: 'Load full instructions for a specialized skill',
    category: 'skill',
    icon: 'OpenBook',
    enabledByDefault: true,
  },
  handler: async ({ skill_name }) => {
    const skill = getSkillByName(skill_name)
    if (!skill) throw new Error(`Skill "${skill_name}" not found.`)
    // Returns: SKILL.md body + file listing with tool usage hints
    return buildSkillActivationResponse(skill)
  },
})
```

### Tool 2: `run_skill_script`

Executes a script bundled with an installed skill via the polyglot Sandbox. Supports Python and JavaScript natively; returns Bash scripts as readable text.

```typescript
export const runSkillScriptPlugin = createToolPlugin<RunSkillScriptArgs, string>({
  metadata: {
    name: 'run_skill_script',
    displayName: 'Run Skill Script',
    shortDescription: 'Execute a script from an installed skill in a sandboxed environment',
    category: 'skill',
    icon: 'Play',
    enabledByDefault: true,
    requiresConfirmation: true, // User confirms before running code
  },
  handler: async (args, context) => {
    const skill = getSkillByName(args.skill_name)
    const script = skill.scripts.find(s => s.path === args.script_path)

    // Language routing:
    // - Python → sandbox.execute({ language: 'python', ... })
    // - JavaScript → sandbox.execute({ language: 'javascript', ... })
    // - Bash → return script content as readable text for the LLM
    if (script.language === 'bash') {
      return `Bash script — shown as text:\n\`\`\`bash\n${script.content}\n\`\`\``
    }

    // Resolve input files from knowledge base via file-bridge
    const inputFiles = await resolveInputFiles(args.input_files ?? [])

    // Execute in the sandbox
    const result = await sandbox.execute({
      language: script.language as SandboxLanguage, // 'python' | 'javascript'
      code: script.content,
      context: args.arguments,
      packages: script.requiredPackages,
      files: inputFiles,
      timeout: 60_000,
    })

    // Format result for LLM (stdout, stderr, return value, output files)
    return formatExecutionResult(result, script.path)
  },
})
```

### Tool 3: `read_skill_file`

Reads reference documents, assets, or script source files from an installed skill. Searches across all file types (scripts, references, assets).

```typescript
export const readSkillFilePlugin = createToolPlugin<ReadSkillFileArgs, string>({
  metadata: {
    name: 'read_skill_file',
    displayName: 'Read Skill File',
    shortDescription: 'Read a reference or asset file from an installed skill',
    category: 'skill',
    icon: 'Page',
    enabledByDefault: true,
  },
  handler: async ({ skill_name, file_path }) => {
    const skill = getSkillByName(skill_name)
    const allFiles = [...skill.scripts, ...skill.references, ...skill.assets]
    const file = allFiles.find(f => f.path === file_path || f.path.endsWith(file_path))
    if (!file) throw new Error(`File "${file_path}" not found in skill "${skill_name}"`)
    return file.content
  },
})
```

### Tool 4: `execute` (General Code Interpreter)

The `execute` tool (`src/tools/plugins/execute.ts`) is a general-purpose code interpreter that shares the same Sandbox engine. Unlike `run_skill_script`, it:

- Is **disabled by default** (must be explicitly enabled per agent)
- Does **not** require user confirmation
- Accepts ad-hoc code written by the LLM (not from skill bundles)
- Supports both Python and JavaScript

```typescript
export const executePlugin = createToolPlugin<ExecuteParams, ExecuteResult | ExecuteError>({
  metadata: {
    name: 'execute',
    displayName: 'Execute Code',
    shortDescription: 'Run JavaScript or Python code in a secure sandbox',
    category: 'code',
    enabledByDefault: false,
  },
  handler: async (args) => {
    const result = await sandbox.execute({
      language: args.language ?? 'javascript',
      code: args.code,
      context: args.input != null ? { input: args.input } : undefined,
      packages: args.packages,
      timeout: args.timeout,
    })
    return mapToLegacyFormat(result)
  },
})
```

### Integration with Chat Flow

These tools plug directly into the existing tool execution pipeline in `src/lib/chat.ts`:

1. `getAgentToolDefinitions()` collects all registered tool plugins from the `ToolPluginRegistry`
2. The tool execution loop (`executeToolCalls()`) routes calls through `defaultExecutor`
3. Tool spans are recorded in the trace system for observability
4. No changes needed to the core chat flow — plugins are self-registering

### Conversation UI Integration

Tool executions appear in the conversation timeline in `src/pages/Agents/run.tsx`:

| Tool               | Display Name              | Icon         |
| ------------------ | ------------------------- | ------------ |
| `activate_skill`   | "Activating skill"        | `OpenBook`   |
| `run_skill_script` | "Running skill script"    | `Play`       |
| `read_skill_file`  | "Reading skill file"      | `Page`       |
| `execute`          | "Code interpreter"        | `Code`       |

---

## 9. Security Model

### Threat Surface

| Vector                          | Risk                             | Mitigation                                                             |
| ------------------------------- | -------------------------------- | ---------------------------------------------------------------------- |
| Malicious Python scripts        | Data exfiltration, crypto mining | Web Worker isolation — no DOM, no cookies, no localStorage             |
| Network access from Python      | Calling external APIs            | Pyodide in a Worker has no `fetch` by default; network disabled        |
| Infinite loops / memory bombs   | DoS on user's browser            | Timeout (configurable, default 60s) + Worker.terminate()               |
| Malicious SKILL.md instructions | Prompt injection                 | User reviews skill before installing; skill content is user-controlled |
| SkillsMP API key exposure       | Rate limit abuse                 | Key is read-only, public data; rate limit in UI; replaceable           |
| Supply chain (PyPI packages)    | Malicious packages               | micropip verifies SHA-256 hashes from PyPI JSON API                    |

### Sandboxing Layers

```
Layer 1: Web Worker         → No DOM, no main-thread state access
Layer 2: WASM Runtime       → Pyodide (Emscripten FS) or QuickJS (memory-isolated)
Layer 3: No network         → importScripts blocked, no fetch in worker
Layer 4: Timeout            → Worker.terminate() after configurable limit
Layer 5: User consent       → requiresConfirmation: true on run_skill_script
```

### Permission Model

Before a skill script runs, the user sees a confirmation dialog:

```
⚠️ Skill "pdf" wants to run: scripts/extract_form_structure.py

This script will:
  • Install packages: pypdf, pdfplumber
  • Process 1 input file: invoice.pdf
  • Estimated execution: <30 seconds

[Cancel] [Run Script]
```

### Content Security Policy

Web Workers are loaded with restrictive CSP:

```
Content-Security-Policy: default-src 'none';
  script-src 'self' https://cdn.jsdelivr.net/pyodide/;
  connect-src https://cdn.jsdelivr.net https://files.pythonhosted.org;
```

This allows loading Pyodide from CDN and downloading PyPI wheels, but nothing else. The QuickJS runtime is self-contained and needs no external resources.

---

## 10. Gap Analysis

### What's Implemented ✅

| Capability                        | Implementation                                                                |
| --------------------------------- | ----------------------------------------------------------------------------- |
| Tool plugin system                | `ToolPluginRegistry` with categories, tags, enable/disable — fully operational |
| LLM prompt injection              | `buildAgentInstructions()` + `buildSkillInstructions()` in `skill-prompt.ts`  |
| Polyglot Sandbox                  | `src/lib/sandbox/` — Python (Pyodide) + JavaScript (QuickJS) under one API   |
| Pyodide Web Worker                | `src/workers/pyodide-worker.js` — CPython 3.11, micropip, virtual FS         |
| Skill Store (Yjs)                 | `src/stores/skillStore.ts` — CRUD, enable/disable, agent assignment, hooks    |
| SkillsMP API client               | `src/lib/skills/skillsmp-client.ts` — keyword + AI semantic search via proxy  |
| GitHub content fetcher             | `src/lib/skills/github-fetcher.ts` — recursive fetch, SKILL.md parsing       |
| 3 skill tool plugins              | `src/tools/plugins/skill-tools.ts` — activate, run, read                     |
| Code interpreter tool             | `src/tools/plugins/execute.ts` — polyglot via same Sandbox                   |
| Skill catalog injection           | `src/lib/skills/skill-prompt.ts` — `<available_skills>` XML + auto-activation |
| File I/O bridge                   | `src/lib/skills/file-bridge.ts` — knowledge ↔ virtual FS mapping             |
| Package compatibility checking    | `checkPackageCompatibility()` in Python runtime                               |
| CORS proxy                        | `fetchViaCorsProxy` for external SkillsMP API calls                          |
| Skills.sh API client              | `src/lib/skills/skillssh-client.ts` — search via dedicated proxy route       |
| Yjs persistence                   | All entity stores use Yjs maps with y-indexeddb                               |

### Remaining Gaps 🔧

| Component                                     | Effort | Priority | Status                                     |
| --------------------------------------------- | ------ | -------- | ------------------------------------------ |
| **Skill discovery UI**                        | Medium | P1       | Features page needed                       |
| **Skill management UI**                       | Medium | P1       | Settings/installed skills list             |
| **Per-agent skill assignment UI**             | Small  | P1       | Agent settings integration                 |
| **Orchestrator tool support**                 | Medium | P1       | `executeTaskWithAgent()` lacks tool calling |
| **i18n for skill UI**                         | Small  | P1       | Translation strings needed                 |
| **Skill update checker**                      | Small  | P2       | GitHub API version check                   |
| **Pre-warm strategies**                       | Small  | P2       | Background Pyodide loading                 |

### Critical Architectural Gap: Orchestrator + Tools

The current `WorkflowOrchestrator.executeTaskWithAgent()` uses `LLMService.streamChat()` **without tool definitions**. Tools are only available in the interactive chat flow (`submitChat()`). This means skills activated during orchestrated multi-agent workflows have no script execution capability.

**Fix required**: Add tool calling support to the orchestrator's task execution path — either by:

1. Refactoring to reuse the chat flow's tool loop, or
2. Adding a parallel tool execution loop to `executeTaskWithAgent()`

### Pyodide Limitations (Python Runtime)

| Limitation                    | Impact                            | Workaround                                                                                       |
| ----------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------ |
| **~25MB initial download**    | First load latency                | Lazy-load only when a skill needs Python; cache aggressively via Service Worker                  |
| **No C extensions from PyPI** | Some packages won't install       | 100+ C-extension packages pre-compiled in Pyodide (numpy, pandas, scipy, Pillow, lxml, etc.)     |
| **No real filesystem**        | Scripts that read/write files     | Emscripten virtual FS + file-bridge mapping via `src/lib/skills/file-bridge.ts`                  |
| **No subprocess / os.system** | Scripts calling external programs | Detect and report incompatibility; LLM can translate the logic to pure Python                    |
| **No threading**              | CPU-bound parallel code           | Single-threaded acceptable for most skill scripts                                                |
| **Cold start ~3-5 seconds**   | UX lag on first execution         | Pre-warm Worker via `sandbox.warmup('python')` after first skill install                         |

### JavaScript Runtime (QuickJS)

JavaScript execution via QuickJS has lighter constraints:

| Property            | Value                                |
| ------------------- | ------------------------------------ |
| **Download size**   | ~1MB WASM (vs 25MB for Pyodide)     |
| **Cold start**      | <500ms                               |
| **ES version**      | ES2020                               |
| **Package support** | None (self-contained scripts only)   |
| **Timeout default** | 5 seconds (configurable up to 30s)   |

---

## 11. Implementation Plan

### ~~Phase 0: Proof of Concept~~ ✅ Complete

Validated core technical assumptions: SkillsMP API, GitHub fetching, Pyodide execution.

### ~~Phase 1: Foundation~~ ✅ Complete

All foundation components are implemented:

- **Skill Store** — `src/stores/skillStore.ts` with Yjs persistence + `src/test/stores/skillStore.test.ts`
- **SkillsMP API Client** — `src/lib/skills/skillsmp-client.ts` with keyword + AI semantic search
- **GitHub Content Fetcher** — `src/lib/skills/github-fetcher.ts` with SKILL.md parsing, package extraction
- **Skill Catalog Injection** — `src/lib/skills/skill-prompt.ts` with `<available_skills>` XML + auto-activation

### ~~Phase 2: Polyglot Execution~~ ✅ Complete

The unified Sandbox replaced the planned standalone PyodideService:

- **Polyglot Sandbox** — `src/lib/sandbox/` with Python (Pyodide) + JavaScript (QuickJS) runtimes
- **Pyodide Web Worker** — `src/workers/pyodide-worker.js` with micropip, virtual FS, timeout
- **Skill Tool Plugins** — `src/tools/plugins/skill-tools.ts` with `activate_skill`, `run_skill_script`, `read_skill_file`
- **Code Interpreter** — `src/tools/plugins/execute.ts` sharing the same Sandbox engine
- **File I/O Bridge** — `src/lib/skills/file-bridge.ts` with knowledge ↔ virtual FS mapping

### Phase 3: Polish & Integration (In Progress)

**Goal**: Production-ready experience with full platform integration.

#### 3.1 Skill Discovery & Management UI

```
src/features/skills/components/SkillSearch.tsx
src/features/skills/components/InstalledSkills.tsx
src/features/skills/components/SkillDetailModal.tsx
```

- Search bar with keyword/AI toggle leveraging `skillsmp-client.ts`
- Installed skills list with enable/disable toggles
- Per-agent assignment interface
- Compatibility indicators (Python ✅, JavaScript ✅, Bash ⚠️)

#### 3.2 Orchestrator Integration

- Add tool calling support to `executeTaskWithAgent()` in `src/lib/orchestrator.ts`
- Skills available during multi-agent workflow execution (not just interactive chat)

#### 3.3 Observability

- Skill activation events in traces
- Python/JS execution timing and package install metrics
- Per-skill usage analytics

#### 3.4 i18n

- Skill UI strings in all 6 languages
- Skill metadata remains in original language

### Phase 4: Advanced (Future)

- **Skill creation wizard** — create custom skills from within DEVS
- **Skill sharing** — export installed skills as SKILL.md bundles
- **Package caching** — persist installed PyPI packages in IndexedDB
- **Pre-warm strategies** — background-load Pyodide + common packages
- **Agent auto-install** — LLM discovers and installs relevant skills from SkillsMP during task analysis
- **Marketplace integration** — skills as a new extension type alongside apps, agents, connectors, tools

---

## 12. Technical Risks & Mitigations

### Risk 1: Pyodide Bundle Size (Critical)

**Problem**: Pyodide is ~25MB (WASM + stdlib). This is large for a PWA.

**Mitigations**:

- **Lazy loading**: Only download Pyodide when the first skill script needs to run — not at app startup
- **Service Worker caching**: After first download, cache Pyodide in the SW cache — subsequent loads are instant
- **CDN delivery**: Use jsDelivr CDN (global edge network) for fast initial download
- **Loading UI**: Show clear progress bar ("Setting up Python environment... 15MB/25MB")
- **Pre-warm optional**: After installing a skill with scripts, offer to "prepare the Python environment now"

### Risk 2: SkillsMP API Stability / CORS

**Problem**: SkillsMP is a third-party service. It may go down, change APIs, or block CORS.

**Mitigations**:

- **Graceful degradation**: Skills already installed work offline forever (stored in Yjs)
- **GitHub fallback**: If SkillsMP is down, users can paste a GitHub URL directly to install skills
- **CORS proxy**: Route SkillsMP API calls through the DEVS CORS proxy
- **API response caching**: Cache search results for 1 hour to reduce API calls

### Risk 3: Package Compatibility

**Problem**: Not all PyPI packages work with Pyodide (C extensions not pre-compiled).

**Mitigations**:

- **Compatibility check**: Before installing a skill, analyze its scripts and warn about packages that won't work
- **Pre-compiled list**: Pyodide includes 100+ popular packages — most data science and PDF skills work out of the box
- **Fallback to LLM**: If a script can't run, the LLM can still read the script code and follow its logic manually, producing equivalent output through reasoning alone
- **Compatibility badge**: Show ✅ / ⚠️ / ❌ in the skill card based on package analysis

### Risk 4: Script Execution Security

**Problem**: Running arbitrary Python code from the internet.

**Mitigations**: See [Security Model](#9-security-model). The Web Worker provides the same isolation model as a sandboxed iframe — the baseline for web extension security.

### Risk 5: GitHub API Rate Limits

**Problem**: Unauthenticated GitHub API has 60 requests/hour limit.

**Mitigations**:

- **Batch fetching**: Fetch all skill files in one API call (directory listing) + parallel raw file fetches
- **Raw URLs**: `raw.githubusercontent.com` doesn't count against API limits
- **Cache installed content**: Once installed, skills never re-fetch unless explicitly checking for updates
- **Optional GitHub token**: Power users can provide a GitHub PAT for higher limits (5000 req/hour)

---

## 13. Future Possibilities

### Agent Auto-Discovery

During `TaskAnalyzer.analyzePrompt()`, the system could proactively search SkillsMP for relevant skills and suggest installation:

```
"Your task involves PDF form filling. I found a skill 'pdf' (⭐ 243k, by Anthropic)
that specializes in this. Would you like me to install it?"
```

### Skill Composition

Agents could combine multiple skills in a single workflow:

```
Task: "Analyze the sales data from this PDF report"
→ Activate skill: pdf (extract tables)
→ Run: scripts/extract_form_structure.py
→ Activate skill: data-analysis (analyze extracted data)
→ Run: scripts/analyze.py
```

### Custom Skill Creation

Users could create skills directly in DEVS:

1. Describe what the skill should do
2. LLM generates SKILL.md + scripts
3. Test locally with Pyodide
4. Export as a GitHub-compatible skill folder
5. Optionally push to GitHub and list on SkillsMP

### P2P Skill Sharing

Since skills are stored in Yjs, they automatically sync across devices via P2P. A team could share a private skill library without publishing to GitHub.

### Offline Skill Repository

Bundle a curated set of popular skills directly in the DEVS app bundle for offline-first access — a "starter pack" of the most useful skills.

---

## Appendix A: Example End-to-End Flow

**User**: "Extract all the tables from this PDF report and create a summary chart"

**Step 1** — LLM sees `<available_skills>` in system message, matches "pdf" and "data-analysis"

**Step 2** — LLM calls `activate_skill({ skill_name: "pdf" })`
→ Returns full PDF skill instructions with script list

**Step 3** — LLM calls `run_skill_script({ skill_name: "pdf", script_path: "scripts/extract_form_structure.py", input_files: [{ path: "/input/report.pdf", knowledge_item_id: "abc123" }] })`
→ Pyodide Worker installs `pypdf`, `pdfplumber` via micropip → runs script → returns extracted tables

**Step 4** — LLM calls `activate_skill({ skill_name: "data-analysis" })`
→ Returns data analysis instructions

**Step 5** — LLM calls `run_skill_script({ skill_name: "data-analysis", script_path: "scripts/analyze.py", arguments: { data: extracted_tables, chart_type: "bar" } })`
→ Pyodide Worker uses pandas + matplotlib → generates chart → returns as base64 image

**Step 6** — LLM presents the summary chart and table analysis to the user

**Total server calls**: 0 (except LLM API). Everything else ran in-browser.

---

## Appendix B: Comparison with Other Platforms

| Feature           | Claude Code / Codex CLI | Manus                      | DEVS                                                    |
| ----------------- | ----------------------- | -------------------------- | ------------------------------------------------------- |
| Skill discovery   | Manual (Git clone)      | One-click (SkillsMP)       | In-app search (SkillsMP API)                            |
| Skill activation  | Filesystem `cat`        | Server-side                | In-browser (Yjs store + progressive disclosure)         |
| Python execution  | Local Python install    | Cloud VM                   | Pyodide WebAssembly (via Sandbox)                       |
| JS execution      | Local Node.js           | Cloud VM                   | QuickJS WebAssembly (via Sandbox)                       |
| Bash execution    | Native shell            | Cloud VM                   | ❌ Not supported (fallback to LLM)                      |
| Network access    | Full                    | Full                       | ❌ Sandboxed (secure)                                   |
| Offline support   | ✅ (local files)        | ❌ (cloud required)        | ✅ (Yjs + Service Worker)                               |
| Privacy           | Local machine           | Cloud (data leaves device) | 100% in-browser                                         |
| Setup required    | Git, Python, shell      | Account + payment          | None — just a browser                                   |
| Package ecosystem | Full PyPI + system      | Full PyPI + system         | Pyodide-compatible subset (~95% of pure Python)         |

---

## Appendix C: Key External References

- [Agent Skills Specification](https://agentskills.io/specification) — Format definition
- [Agent Skills Integration Guide](https://agentskills.io/integrate-skills) — How to add skills to an agent
- [SkillsMP API Documentation](https://skillsmp.com/docs/api) — REST API for skill search
- [Pyodide Documentation](https://pyodide.org/en/stable/) — Python in WebAssembly
- [Pyodide Web Worker Guide](https://pyodide.org/en/stable/usage/webworker.html) — Off-thread execution
- [Pyodide Package Loading](https://pyodide.org/en/stable/usage/loading-packages.html) — micropip and package management
- [Anthropic Official Skills](https://github.com/anthropics/skills) — Reference skill implementations
