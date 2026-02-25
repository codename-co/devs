/**
 * Tests for Skill Tool Plugins — activate_skill, read_skill_file, run_skill_script
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { InstalledSkill, SkillScript } from '@/types'
import type { SandboxResult } from '@/lib/sandbox'
import type { ToolExecutionContext } from '@/lib/tool-executor/types'

// ── Mocks ──

const mockSkillsMap = new Map<string, InstalledSkill>()

vi.mock('@/stores/skillStore', () => ({
  getSkillByName: (name: string) =>
    Array.from(mockSkillsMap.values()).find(
      (s) => s.name.toLowerCase() === name.toLowerCase(),
    ),
  getEnabledSkills: () =>
    Array.from(mockSkillsMap.values()).filter((s) => s.enabled),
}))

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockExecute = vi.fn<(...args: any[]) => Promise<SandboxResult>>()
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockOnProgress = vi.fn((_cb?: any) => vi.fn())

vi.mock('@/lib/sandbox', () => ({
  sandbox: {
    execute: (...args: unknown[]) => mockExecute(...args),
    onProgress: (cb: unknown) => mockOnProgress(cb),
  },
  checkPackageCompatibility: (pkg: string) => {
    if (['numpy', 'pandas'].includes(pkg)) return 'builtin'
    if (['pdf2image'].includes(pkg)) return 'incompatible'
    return 'unknown'
  },
}))

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockResolveInputFiles = vi.fn(async (_refs?: any): Promise<any[]> => [])

vi.mock('@/lib/skills/file-bridge', () => ({
  resolveInputFiles: (refs: unknown) => mockResolveInputFiles(refs),
  processOutputFiles: (files: unknown[]) =>
    (files as any[]).map((f: any) => ({
      ...f,
      filename: f.path.split('/').pop(),
      mimeType: 'text/plain',
      isBinary: false,
    })),
  formatOutputForLLM: (files: unknown[]) =>
    (files as any[]).length > 0
      ? `\n## Output Files\n${(files as any[]).map((f: any) => f.filename).join(', ')}`
      : '',
}))

// ── Import after mocks ──

import {
  activateSkillPlugin,
  readSkillFilePlugin,
  runSkillScriptPlugin,
  skillPlugins,
  SKILL_TOOL_DEFINITIONS,
} from '@/tools/plugins/skill-tools'

// ── Helpers ──

function makeScript(overrides: Partial<SkillScript> = {}): SkillScript {
  return {
    path: overrides.path ?? 'scripts/analyze.py',
    content: overrides.content ?? 'print("hello world")',
    language: overrides.language ?? 'python',
    requiredPackages: overrides.requiredPackages ?? [],
  }
}

function makeSkill(overrides: Partial<InstalledSkill> = {}): InstalledSkill {
  const now = new Date()
  return {
    id: overrides.id ?? 'skill-1',
    name: overrides.name ?? 'test-skill',
    description: overrides.description ?? 'A test skill',
    author: overrides.author ?? 'author',
    skillMdContent: overrides.skillMdContent ?? '# Test\nDo stuff',
    scripts: overrides.scripts ?? [makeScript()],
    references: overrides.references ?? [],
    assets: overrides.assets ?? [],
    githubUrl:
      overrides.githubUrl ?? 'https://github.com/test/repo/tree/main/.agent',
    stars: overrides.stars ?? 10,
    installedAt: overrides.installedAt ?? now,
    updatedAt: overrides.updatedAt ?? now,
    enabled: overrides.enabled ?? true,
    assignedAgentIds: overrides.assignedAgentIds ?? [],
    autoActivate: overrides.autoActivate ?? false,
  }
}

function makeContext(
  overrides: Partial<ToolExecutionContext> = {},
): ToolExecutionContext {
  return {
    agentId: 'agent-1',
    conversationId: 'conv-1',
    onProgress: vi.fn(),
    ...overrides,
  }
}

// ── Tests ──

describe('skill-tools', () => {
  beforeEach(() => {
    mockSkillsMap.clear()
    mockExecute.mockReset()
    mockOnProgress.mockReturnValue(vi.fn())
    mockResolveInputFiles.mockReset().mockResolvedValue([])
  })

  // ── Plugin registration ───────────────────────────────────────

  describe('plugin exports', () => {
    it('should export all three plugins', () => {
      expect(skillPlugins).toHaveLength(3)
      expect(skillPlugins).toContain(activateSkillPlugin)
      expect(skillPlugins).toContain(readSkillFilePlugin)
      expect(skillPlugins).toContain(runSkillScriptPlugin)
    })

    it('should export SKILL_TOOL_DEFINITIONS with all tool definitions', () => {
      expect(SKILL_TOOL_DEFINITIONS).toBeDefined()
      expect(SKILL_TOOL_DEFINITIONS.activate_skill).toBeDefined()
      expect(SKILL_TOOL_DEFINITIONS.read_skill_file).toBeDefined()
      expect(SKILL_TOOL_DEFINITIONS.run_skill_script).toBeDefined()
      expect(SKILL_TOOL_DEFINITIONS.activate_skill.function.name).toBe(
        'activate_skill',
      )
      expect(SKILL_TOOL_DEFINITIONS.read_skill_file.function.name).toBe(
        'read_skill_file',
      )
      expect(SKILL_TOOL_DEFINITIONS.run_skill_script.function.name).toBe(
        'run_skill_script',
      )
    })

    it('all skill plugins should have category "skill"', () => {
      for (const plugin of skillPlugins) {
        expect(plugin.metadata.category).toBe('skill')
      }
    })

    it('run_skill_script should have correct metadata', () => {
      expect(runSkillScriptPlugin.metadata.name).toBe('run_skill_script')
      expect(runSkillScriptPlugin.metadata.category).toBe('skill')
      expect(runSkillScriptPlugin.metadata.requiresConfirmation).toBe(true)
      expect(runSkillScriptPlugin.metadata.enabledByDefault).toBe(true)
    })

    it('run_skill_script definition should require skill_name and script_path', () => {
      const fn = runSkillScriptPlugin.definition.function
      expect(fn.name).toBe('run_skill_script')
      expect(fn.parameters.required).toContain('skill_name')
      expect(fn.parameters.required).toContain('script_path')
    })
  })

  // ── run_skill_script handler ──────────────────────────────────

  describe('run_skill_script', () => {
    it('should throw when skill is not found', async () => {
      const ctx = makeContext()
      await expect(
        runSkillScriptPlugin.handler(
          { skill_name: 'nonexistent', script_path: 'scripts/foo.py' },
          ctx,
        ),
      ).rejects.toThrow('not found')
    })

    it('should throw when skill is disabled', async () => {
      mockSkillsMap.set(
        's1',
        makeSkill({ id: 's1', name: 'pdf', enabled: false }),
      )
      const ctx = makeContext()
      await expect(
        runSkillScriptPlugin.handler(
          { skill_name: 'pdf', script_path: 'scripts/analyze.py' },
          ctx,
        ),
      ).rejects.toThrow('disabled')
    })

    it('should throw when script is not found in skill', async () => {
      mockSkillsMap.set('s1', makeSkill({ id: 's1', name: 'pdf' }))
      const ctx = makeContext()
      await expect(
        runSkillScriptPlugin.handler(
          { skill_name: 'pdf', script_path: 'scripts/missing.py' },
          ctx,
        ),
      ).rejects.toThrow('not found in skill')
    })

    it('should return bash script content instead of executing it', async () => {
      const bashScript = makeScript({
        path: 'scripts/run.sh',
        language: 'bash',
        content: '#!/bin/bash\necho "hello"',
      })
      mockSkillsMap.set(
        's1',
        makeSkill({ id: 's1', name: 'pdf', scripts: [bashScript] }),
      )
      const ctx = makeContext()

      const result = await runSkillScriptPlugin.handler(
        { skill_name: 'pdf', script_path: 'scripts/run.sh' },
        ctx,
      )

      expect(result).toContain('Bash script')
      expect(result).toContain('cannot be executed directly')
      expect(result).toContain('#!/bin/bash')
    })

    it('should execute a JavaScript script via the sandbox', async () => {
      const jsScript = makeScript({
        path: 'scripts/transform.js',
        language: 'javascript',
        content: 'export default [1,2,3].reduce((a,b) => a+b, 0)',
      })
      mockSkillsMap.set(
        's1',
        makeSkill({ id: 's1', name: 'transform-skill', scripts: [jsScript] }),
      )
      mockExecute.mockResolvedValue({
        success: true,
        result: '6',
        stdout: '',
        stderr: '',
        console: [],
        executionTimeMs: 10,
        language: 'javascript',
      })

      const ctx = makeContext()
      const result = await runSkillScriptPlugin.handler(
        { skill_name: 'transform-skill', script_path: 'scripts/transform.js' },
        ctx,
      )

      expect(result).toContain('executed successfully')
      expect(result).toContain('6')
      expect(mockExecute).toHaveBeenCalledWith(
        expect.objectContaining({
          language: 'javascript',
          code: 'export default [1,2,3].reduce((a,b) => a+b, 0)',
          timeout: 30_000,
        }),
      )
    })

    it('should throw for unsupported script languages', async () => {
      const rubyScript = makeScript({
        path: 'scripts/run.rb',
        language: 'other' as any,
        content: 'puts "hello"',
      })
      mockSkillsMap.set(
        's1',
        makeSkill({ id: 's1', name: 'ruby-skill', scripts: [rubyScript] }),
      )
      const ctx = makeContext()
      await expect(
        runSkillScriptPlugin.handler(
          { skill_name: 'ruby-skill', script_path: 'scripts/run.rb' },
          ctx,
        ),
      ).rejects.toThrow('Supported languages: Python, JavaScript')
    })

    it('should execute a Python script successfully', async () => {
      mockSkillsMap.set('s1', makeSkill({ id: 's1', name: 'pdf' }))
      mockExecute.mockResolvedValue({
        success: true,
        result: '42',
        stdout: 'hello world\n',
        stderr: '',
        console: [],
        executionTimeMs: 150,
        packagesInstalled: [],
        language: 'python',
      })

      const ctx = makeContext()
      const result = await runSkillScriptPlugin.handler(
        { skill_name: 'pdf', script_path: 'scripts/analyze.py' },
        ctx,
      )

      expect(result).toContain('executed successfully')
      expect(result).toContain('150ms')
      expect(result).toContain('hello world')
      expect(result).toContain('42')
    })

    it('should include error details on failure', async () => {
      mockSkillsMap.set('s1', makeSkill({ id: 's1', name: 'pdf' }))
      mockExecute.mockResolvedValue({
        success: false,
        stdout: '',
        stderr: 'Traceback...',
        console: [],
        executionTimeMs: 50,
        error: 'ModuleNotFoundError: No module named pdf2image',
        language: 'python',
      })

      const ctx = makeContext()
      const result = await runSkillScriptPlugin.handler(
        { skill_name: 'pdf', script_path: 'scripts/analyze.py' },
        ctx,
      )

      expect(result).toContain('failed')
      expect(result).toContain('ModuleNotFoundError')
    })

    it('should pass packages from the script to the runner', async () => {
      const script = makeScript({
        requiredPackages: ['pypdf', 'pdfplumber'],
      })
      mockSkillsMap.set(
        's1',
        makeSkill({ id: 's1', name: 'pdf', scripts: [script] }),
      )
      mockExecute.mockResolvedValue({
        success: true,
        stdout: '',
        stderr: '',
        console: [],
        executionTimeMs: 100,
        packagesInstalled: ['pypdf', 'pdfplumber'],
        language: 'python',
      })

      const ctx = makeContext()
      await runSkillScriptPlugin.handler(
        { skill_name: 'pdf', script_path: 'scripts/analyze.py' },
        ctx,
      )

      expect(mockExecute).toHaveBeenCalledWith(
        expect.objectContaining({
          language: 'python',
          packages: ['pypdf', 'pdfplumber'],
        }),
      )
    })

    it('should pass context arguments to the runner', async () => {
      mockSkillsMap.set('s1', makeSkill({ id: 's1', name: 'pdf' }))
      mockExecute.mockResolvedValue({
        success: true,
        stdout: '',
        stderr: '',
        console: [],
        executionTimeMs: 100,
        language: 'python',
      })

      const ctx = makeContext()
      await runSkillScriptPlugin.handler(
        {
          skill_name: 'pdf',
          script_path: 'scripts/analyze.py',
          arguments: { input_path: '/input/data.csv', mode: 'summary' },
        },
        ctx,
      )

      expect(mockExecute).toHaveBeenCalledWith(
        expect.objectContaining({
          language: 'python',
          context: { input_path: '/input/data.csv', mode: 'summary' },
        }),
      )
    })

    it('should resolve input files via the file bridge', async () => {
      mockSkillsMap.set('s1', makeSkill({ id: 's1', name: 'pdf' }))
      mockResolveInputFiles.mockResolvedValue([
        { path: 'data.csv', content: 'a,b\n1,2', encoding: 'text' },
      ])
      mockExecute.mockResolvedValue({
        success: true,
        stdout: '',
        stderr: '',
        console: [],
        executionTimeMs: 100,
        language: 'python',
      })

      const ctx = makeContext()
      await runSkillScriptPlugin.handler(
        {
          skill_name: 'pdf',
          script_path: 'scripts/analyze.py',
          input_files: [{ path: 'data.csv', knowledge_item_id: 'kb-123' }],
        },
        ctx,
      )

      expect(mockResolveInputFiles).toHaveBeenCalledWith([
        { path: 'data.csv', knowledgeItemId: 'kb-123' },
      ])
      expect(mockExecute).toHaveBeenCalledWith(
        expect.objectContaining({
          files: [{ path: 'data.csv', content: 'a,b\n1,2', encoding: 'text' }],
        }),
      )
    })

    it('should include output files in the result', async () => {
      mockSkillsMap.set('s1', makeSkill({ id: 's1', name: 'pdf' }))
      mockExecute.mockResolvedValue({
        success: true,
        stdout: '',
        stderr: '',
        console: [],
        executionTimeMs: 200,
        outputFiles: [
          {
            path: '/output/result.csv',
            content: 'x,y\n1,2',
            encoding: 'text' as const,
          },
        ],
        language: 'python',
      })

      const ctx = makeContext()
      const result = await runSkillScriptPlugin.handler(
        { skill_name: 'pdf', script_path: 'scripts/analyze.py' },
        ctx,
      )

      expect(result).toContain('Output Files')
      expect(result).toContain('result.csv')
    })

    it('should report progress during execution', async () => {
      mockSkillsMap.set('s1', makeSkill({ id: 's1', name: 'pdf' }))
      mockExecute.mockResolvedValue({
        success: true,
        stdout: '',
        stderr: '',
        console: [],
        executionTimeMs: 100,
        language: 'python',
      })

      const progressFn = vi.fn()
      const ctx = makeContext({ onProgress: progressFn })

      await runSkillScriptPlugin.handler(
        { skill_name: 'pdf', script_path: 'scripts/analyze.py' },
        ctx,
      )

      expect(progressFn).toHaveBeenCalledWith(0.1, expect.any(String))
      expect(progressFn).toHaveBeenCalledWith(0.9, expect.any(String))
      expect(progressFn).toHaveBeenCalledWith(1.0, 'Done')
    })

    it('should abort when abort signal is triggered', async () => {
      const controller = new AbortController()
      controller.abort()

      const ctx = makeContext({ abortSignal: controller.signal })
      await expect(
        runSkillScriptPlugin.handler(
          { skill_name: 'pdf', script_path: 'scripts/foo.py' },
          ctx,
        ),
      ).rejects.toThrow('Aborted')
    })

    it('should match scripts with flexible path matching', async () => {
      const script = makeScript({ path: 'scripts/analyze.py' })
      mockSkillsMap.set(
        's1',
        makeSkill({ id: 's1', name: 'pdf', scripts: [script] }),
      )
      mockExecute.mockResolvedValue({
        success: true,
        stdout: '',
        stderr: '',
        console: [],
        executionTimeMs: 50,
        language: 'python',
      })

      const ctx = makeContext()

      // Should match on partial path
      await runSkillScriptPlugin.handler(
        { skill_name: 'pdf', script_path: 'analyze.py' },
        ctx,
      )
      expect(mockExecute).toHaveBeenCalled()
    })

    it('should unsubscribe from progress events after execution', async () => {
      const unsubFn = vi.fn()
      mockOnProgress.mockReturnValue(unsubFn)

      mockSkillsMap.set('s1', makeSkill({ id: 's1', name: 'pdf' }))
      mockExecute.mockResolvedValue({
        success: true,
        stdout: '',
        stderr: '',
        console: [],
        executionTimeMs: 50,
        language: 'python',
      })

      const ctx = makeContext()
      await runSkillScriptPlugin.handler(
        { skill_name: 'pdf', script_path: 'scripts/analyze.py' },
        ctx,
      )

      expect(unsubFn).toHaveBeenCalled()
    })
  })

  // ── Validation ────────────────────────────────────────────────

  describe('run_skill_script validation', () => {
    it('should reject missing skill_name', () => {
      expect(() =>
        runSkillScriptPlugin.validate!({ script_path: 'foo.py' }),
      ).toThrow('skill_name')
    })

    it('should reject missing script_path', () => {
      expect(() =>
        runSkillScriptPlugin.validate!({ skill_name: 'pdf' }),
      ).toThrow('script_path')
    })

    it('should pass valid arguments', () => {
      const result = runSkillScriptPlugin.validate!({
        skill_name: 'pdf',
        script_path: 'scripts/analyze.py',
      })
      expect(result).toEqual({
        skill_name: 'pdf',
        script_path: 'scripts/analyze.py',
      })
    })
  })

  // ── activate_skill (existing — verify still works) ────────────

  describe('activate_skill', () => {
    it('should return SKILL.md content with script listing', async () => {
      const script = makeScript({
        path: 'scripts/analyze.py',
        requiredPackages: ['pandas'],
      })
      mockSkillsMap.set(
        's1',
        makeSkill({
          id: 's1',
          name: 'pdf',
          skillMdContent: '# PDF Skill\nProcess PDFs.',
          scripts: [script],
        }),
      )

      const ctx = makeContext()
      const result = await activateSkillPlugin.handler(
        { skill_name: 'pdf' },
        ctx,
      )

      expect(result).toContain('# PDF Skill')
      expect(result).toContain('scripts/analyze.py')
      expect(result).toContain('run_skill_script')
      expect(result).toContain('pandas')
    })
  })

  // ── read_skill_file (existing — verify still works) ───────────

  describe('read_skill_file', () => {
    it('should return file content', async () => {
      mockSkillsMap.set(
        's1',
        makeSkill({
          id: 's1',
          name: 'pdf',
          references: [
            { path: 'references/README.md', content: '# Reference' },
          ],
        }),
      )

      const ctx = makeContext()
      const result = await readSkillFilePlugin.handler(
        { skill_name: 'pdf', file_path: 'references/README.md' },
        ctx,
      )

      expect(result).toBe('# Reference')
    })
  })
})
