/**
 * Skill Tool Plugins
 *
 * Tool plugins that enable LLM agents to interact with installed Agent Skills:
 * - `activate_skill` — Load full SKILL.md instructions for a specialized task
 * - `read_skill_file` — Read reference or asset files from a skill
 * - `run_skill_script` — Execute Python scripts in a sandboxed code runner
 *
 * @module tools/plugins/skill-tools
 */

import { createToolPlugin } from '../registry'
import {
  getSkillByName,
  getEnabledSkills,
} from '@/stores/skillStore'
import {
  sandbox,
  checkPackageCompatibility,
} from '@/lib/sandbox'
import {
  resolveInputFiles,
  processOutputFiles,
  formatOutputForLLM,
} from '@/lib/skills/file-bridge'
import type { FileReference } from '@/lib/skills/file-bridge'
import type { ToolPlugin } from '../types'

// ============================================================================
// Types
// ============================================================================

interface ActivateSkillArgs {
  skill_name: string
}

interface ReadSkillFileArgs {
  skill_name: string
  file_path: string
}

interface RunSkillScriptArgs {
  skill_name: string
  script_path: string
  arguments?: Record<string, unknown>
  input_files?: Array<{
    path: string
    knowledge_item_id?: string
    content?: string
    encoding?: 'text' | 'base64'
  }>
}

// ============================================================================
// activate_skill
// ============================================================================

/**
 * Tool that loads the full SKILL.md instructions for a specific skill.
 *
 * When the LLM determines a task matches an available skill from the
 * `<available_skills>` catalog, it calls this tool to get detailed
 * instructions on how to perform the task.
 */
export const activateSkillPlugin: ToolPlugin<ActivateSkillArgs, string> =
  createToolPlugin({
    metadata: {
      name: 'activate_skill',
      displayName: 'Activate Skill',
      shortDescription: 'Load full instructions for a specialized skill',
      icon: 'OpenBook',
      category: 'skill',
      tags: ['skill', 'agent-skill'],
      enabledByDefault: true,
    },
    definition: {
      type: 'function',
      function: {
        name: 'activate_skill',
        description:
          'Load the full instructions for a specialized skill. Call this when a user\'s task matches one of the skills listed in <available_skills>. Returns the complete SKILL.md body with detailed step-by-step guidance.',
        parameters: {
          type: 'object',
          properties: {
            skill_name: {
              type: 'string',
              description:
                'The name of the skill to activate (from <available_skills>)',
            },
          },
          required: ['skill_name'],
        },
      },
    },
    handler: async ({ skill_name }) => {
      const skill = getSkillByName(skill_name)
      if (!skill) {
        const available = getEnabledSkills()
          .map((s) => s.name)
          .join(', ')
        throw new Error(
          `Skill "${skill_name}" not found. Available skills: ${available || 'none'}`,
        )
      }

      if (!skill.enabled) {
        throw new Error(
          `Skill "${skill_name}" is installed but currently disabled.`,
        )
      }

      // Build a comprehensive response with instructions + file listing
      const parts: string[] = [skill.skillMdContent]

      if (skill.scripts.length > 0) {
        parts.push('\n## Available Scripts\n')
        for (const script of skill.scripts) {
          const pkgs = script.requiredPackages?.length
            ? ` (requires: ${script.requiredPackages.join(', ')})`
            : ''
          parts.push(`- \`${script.path}\` [${script.language}]${pkgs}`)
        }
        parts.push(
          '\nUse `run_skill_script` to execute Python or JavaScript scripts.',
          'Bash scripts cannot be executed directly but you can read and follow their logic.',
        )
      }

      if (skill.references.length > 0) {
        parts.push('\n## Reference Files\n')
        for (const ref of skill.references) {
          parts.push(`- \`${ref.path}\``)
        }
        parts.push('\nUse `read_skill_file` to read reference documents.')
      }

      if (skill.assets.length > 0) {
        parts.push('\n## Assets\n')
        for (const asset of skill.assets) {
          parts.push(`- \`${asset.path}\``)
        }
        parts.push('\nUse `read_skill_file` to access asset files.')
      }

      return parts.join('\n')
    },
  })

// ============================================================================
// read_skill_file
// ============================================================================

/**
 * Tool that reads a reference or asset file from an installed skill.
 *
 * This allows the LLM to access supplementary documents, templates,
 * and data files bundled with a skill.
 */
export const readSkillFilePlugin: ToolPlugin<ReadSkillFileArgs, string> =
  createToolPlugin({
    metadata: {
      name: 'read_skill_file',
      displayName: 'Read Skill File',
      shortDescription: 'Read a reference or asset file from an installed skill',
      icon: 'Page',
      category: 'skill',
      tags: ['skill', 'agent-skill'],
      enabledByDefault: true,
    },
    definition: {
      type: 'function',
      function: {
        name: 'read_skill_file',
        description:
          'Read a reference document, asset, or script file from an installed skill. Use after activating a skill to access its bundled resources.',
        parameters: {
          type: 'object',
          properties: {
            skill_name: {
              type: 'string',
              description: 'The name of the skill containing the file',
            },
            file_path: {
              type: 'string',
              description:
                'The file path within the skill (e.g. "references/REFERENCE.md" or "scripts/analyze.py")',
            },
          },
          required: ['skill_name', 'file_path'],
        },
      },
    },
    handler: async ({ skill_name, file_path }) => {
      const skill = getSkillByName(skill_name)
      if (!skill) {
        throw new Error(`Skill "${skill_name}" not found.`)
      }

      // Search across all file types: scripts, references, and assets
      const allFiles = [
        ...skill.scripts.map((s) => ({ path: s.path, content: s.content })),
        ...skill.references.map((r) => ({ path: r.path, content: r.content })),
        ...skill.assets.map((a) => ({ path: a.path, content: a.content })),
      ]

      const file = allFiles.find(
        (f) =>
          f.path === file_path ||
          f.path.endsWith(`/${file_path}`) ||
          f.path.endsWith(file_path),
      )

      if (!file) {
        const available = allFiles.map((f) => f.path).join(', ')
        throw new Error(
          `File "${file_path}" not found in skill "${skill_name}". Available files: ${available || 'none'}`,
        )
      }

      return file.content
    },
  })

// ============================================================================
// run_skill_script
// ============================================================================

/**
 * Tool that executes a Python script bundled with an installed skill.
 *
 * Runs the script in a Pyodide Web Worker (sandboxed code runner) with:
 * - Automatic PyPI package installation via micropip
 * - Virtual filesystem for input/output files
 * - stdout/stderr capture
 * - Configurable timeout
 *
 * Requires user confirmation before execution (requiresConfirmation: true).
 */
export const runSkillScriptPlugin: ToolPlugin<RunSkillScriptArgs, string> =
  createToolPlugin({
    metadata: {
      name: 'run_skill_script',
      displayName: 'Run Skill Script',
      shortDescription:
        'Execute a Python script from an installed skill in a sandboxed environment',
      icon: 'Play',
      category: 'skill',
      tags: ['skill', 'agent-skill', 'python', 'execution', 'sandbox'],
      enabledByDefault: true,
      estimatedDuration: 30_000,
      requiresConfirmation: true,
    },
    definition: {
      type: 'function',
      function: {
        name: 'run_skill_script',
        description:
          'Execute a Python script bundled with an installed Agent Skill. ' +
          'The script runs in an isolated Python 3.11 environment (Pyodide WebAssembly) ' +
          'with automatic PyPI package installation. Supports file input/output via a ' +
          'virtual filesystem. Use after activating a skill to run its scripts.',
        parameters: {
          type: 'object',
          properties: {
            skill_name: {
              type: 'string',
              description:
                'The name of the installed skill containing the script',
            },
            script_path: {
              type: 'string',
              description:
                'Path to the script within the skill (e.g. "scripts/analyze.py")',
            },
            arguments: {
              type: 'object',
              description:
                'Key-value arguments to pass to the script. Values are injected as ' +
                'Python global variables AND as sys.argv CLI flags (for argparse ' +
                'compatibility). Keys are converted to --flag format with underscores ' +
                'becoming hyphens. For example, { "prompt": "hello", "filename": "out.png" } ' +
                'becomes sys.argv = ["script.py", "--prompt", "hello", "--filename", "out.png"]. ' +
                'Boolean true values become flags without a value (e.g. { "verbose": true } → --verbose).',
            },
            input_files: {
              type: 'array',
              description:
                'Files to mount in the sandbox virtual filesystem. Each file needs a ' +
                'path (virtual FS path) and either a knowledge_item_id (to load from ' +
                'the knowledge base) or inline content.',
              items: {
                type: 'object',
                properties: {
                  path: {
                    type: 'string',
                    description:
                      'Path in the virtual filesystem (e.g. "data.csv" → /input/data.csv)',
                  },
                  knowledge_item_id: {
                    type: 'string',
                    description:
                      'ID of a knowledge item to mount at this path',
                  },
                  content: {
                    type: 'string',
                    description: 'Inline file content to mount at this path',
                  },
                  encoding: {
                    type: 'string',
                    enum: ['text', 'base64'],
                    description:
                      'Encoding of inline content (default: "text")',
                  },
                },
                required: ['path'],
              },
            },
          },
          required: ['skill_name', 'script_path'],
        },
      },
    },
    handler: async (args, context) => {
      // Check for abort signal
      if (context.abortSignal?.aborted) {
        throw new Error('Aborted')
      }

      // ── Resolve skill and script ──────────────────────────────
      const skill = getSkillByName(args.skill_name)
      if (!skill) {
        const available = getEnabledSkills()
          .map((s) => s.name)
          .join(', ')
        throw new Error(
          `Skill "${args.skill_name}" not found. Available skills: ${available || 'none'}`,
        )
      }

      if (!skill.enabled) {
        throw new Error(
          `Skill "${args.skill_name}" is installed but currently disabled.`,
        )
      }

      const script = skill.scripts.find(
        (s) =>
          s.path === args.script_path ||
          s.path.endsWith(`/${args.script_path}`) ||
          s.path.endsWith(args.script_path),
      )

      if (!script) {
        const available = skill.scripts.map((s) => s.path).join(', ')
        throw new Error(
          `Script "${args.script_path}" not found in skill "${skill.name}". ` +
            `Available scripts: ${available || 'none'}`,
        )
      }

      // ── Validate script language ──────────────────────────────
      if (script.language !== 'python') {
        if (script.language === 'bash') {
          return (
            `This is a Bash script and cannot be executed directly in the browser.\n\n` +
            `**Script content** (\`${script.path}\`):\n\`\`\`bash\n${script.content}\n\`\`\`\n\n` +
            `You can read this script and follow its logic to accomplish the task manually, ` +
            `or translate the relevant parts to Python and re-run with \`run_skill_script\`.`
          )
        }
        throw new Error(
          `Script "${script.path}" is written in ${script.language} and cannot ` +
            `be executed in the sandboxed code runner. Only Python scripts are supported.`,
        )
      }

      // ── Check package compatibility ───────────────────────────
      const packages = script.requiredPackages ?? []
      const incompatible = packages.filter(
        (pkg) => checkPackageCompatibility(pkg) === 'incompatible',
      )

      if (incompatible.length > 0) {
        const warning =
          `Warning: The following packages may not work in the browser environment: ` +
          `${incompatible.join(', ')}. The script may fail when importing them.`
        // Don't block — still try to run, just warn
        console.warn(`[run_skill_script] ${warning}`)
      }

      // Log sys.argv mapping for debugging if arguments are provided
      if (args.arguments && Object.keys(args.arguments).length > 0) {
        const argv = ['script.py']
        for (const [key, value] of Object.entries(args.arguments)) {
          const flag = `--${key.replace(/_/g, '-')}`
          if (typeof value === 'boolean') {
            if (value) argv.push(flag)
          } else {
            argv.push(flag, String(value))
          }
        }
        console.debug(`[run_skill_script] sys.argv will be: ${JSON.stringify(argv)}`)
      }

      // ── Resolve input files ───────────────────────────────────
      const fileRefs: FileReference[] = (args.input_files ?? []).map(
        (f) => {
          if (f.knowledge_item_id) {
            return {
              path: f.path,
              knowledgeItemId: f.knowledge_item_id,
            }
          }
          return {
            path: f.path,
            content: f.content ?? '',
            encoding: f.encoding ?? 'text',
          }
        },
      )
      const inputFiles = await resolveInputFiles(fileRefs)

      // ── Execute in sandbox ────────────────────────────────────
      context.onProgress?.(0.1, 'Initializing Python environment…')

      const unsubscribe = sandbox.onProgress((event) => {
        if (event.type === 'loading') {
          context.onProgress?.(0.2, event.message)
        } else if (event.type === 'executing' || event.type === 'installing') {
          context.onProgress?.(0.5, event.message)
        }
      })

      try {
        const result = await sandbox.execute({
          language: 'python',
          code: script.content,
          context: args.arguments,
          packages,
          files: inputFiles,
          timeout: 60_000,
          traceId: skill.id,
          label: script.path,
        })

        context.onProgress?.(0.9, 'Processing results…')

        // ── Format result for LLM ──────────────────────────────
        const parts: string[] = []

        if (result.success) {
          parts.push(`✅ Script \`${script.path}\` executed successfully.`)
        } else {
          parts.push(`❌ Script \`${script.path}\` failed.`)
        }

        parts.push(`\n**Execution time**: ${result.executionTimeMs}ms`)

        if (result.packagesInstalled?.length) {
          parts.push(
            `**Packages installed**: ${result.packagesInstalled.join(', ')}`,
          )
        }

        if (result.result) {
          parts.push(`\n**Return value**:\n\`\`\`\n${result.result}\n\`\`\``)
        }

        if (result.stdout.trim()) {
          parts.push(`\n**Output (stdout)**:\n\`\`\`\n${result.stdout}\n\`\`\``)
        }

        if (result.stderr.trim()) {
          parts.push(
            `\n**Errors/Warnings (stderr)**:\n\`\`\`\n${result.stderr}\n\`\`\``,
          )
        }

        if (result.error) {
          parts.push(`\n**Error**:\n\`\`\`\n${result.error}\n\`\`\``)
        }

        // Process and format output files
        if (result.outputFiles?.length) {
          const processed = processOutputFiles(result.outputFiles)
          parts.push(formatOutputForLLM(processed))
        }

        context.onProgress?.(1.0, 'Done')
        return parts.join('\n')
      } finally {
        unsubscribe()
      }
    },
    validate: (args): RunSkillScriptArgs => {
      const params = args as RunSkillScriptArgs

      if (!params.skill_name || typeof params.skill_name !== 'string') {
        throw new Error('skill_name is required and must be a string')
      }

      if (!params.script_path || typeof params.script_path !== 'string') {
        throw new Error('script_path is required and must be a string')
      }

      return params
    },
  })

// ============================================================================
// Exports
// ============================================================================

/**
 * All skill-related tool plugins.
 */
export const skillPlugins: ToolPlugin<any, any>[] = [
  activateSkillPlugin,
  readSkillFilePlugin,
  runSkillScriptPlugin,
]

/**
 * Tool definitions for all skill tools (for passing to LLM).
 */
export const SKILL_TOOL_DEFINITIONS = {
  activate_skill: activateSkillPlugin.definition,
  read_skill_file: readSkillFilePlugin.definition,
  run_skill_script: runSkillScriptPlugin.definition,
}
