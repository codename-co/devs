/**
 * TrySkillRunner — Sandbox execution panel for "Try it out" CTA.
 *
 * Lets the user pick a Python script from an installed skill,
 * optionally provide JSON arguments, run in the sandboxed Pyodide
 * environment, and view stdout / stderr / output files.
 */

import { useState, useCallback, useRef } from 'react'
import {
  Button,
  Select,
  SelectItem,
  Textarea,
  Chip,
  Progress,
  Divider,
  Tooltip,
} from '@heroui/react'
import { Icon } from '@/components'
import {
  sandbox,
  checkPackageCompatibility,
} from '@/lib/sandbox'
import type { SandboxResult } from '@/lib/sandbox'
import type { InstalledSkill, SkillScript } from '@/types'

// ============================================================================
// Types
// ============================================================================

interface TrySkillRunnerProps {
  /** The installed skill to try */
  skill: InstalledSkill
  /** Translation function */
  t: (key: string) => string
}

// ============================================================================
// Component
// ============================================================================

export function TrySkillRunner({ skill, t }: TrySkillRunnerProps) {
  // Only Python scripts can be executed
  const runnableScripts = skill.scripts.filter((s) => s.language === 'python')

  const [selectedScriptPath, setSelectedScriptPath] = useState<string>(
    runnableScripts[0]?.path ?? '',
  )
  const [argsJson, setArgsJson] = useState('')
  const [argsError, setArgsError] = useState<string | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [progress, setProgress] = useState<{ value: number; label: string }>({
    value: 0,
    label: '',
  })
  const [result, setResult] = useState<SandboxResult | null>(null)

  const unsubRef = useRef<(() => void) | null>(null)

  const selectedScript = runnableScripts.find(
    (s) => s.path === selectedScriptPath,
  )

  // ── Validate JSON args ──

  const validateArgs = useCallback(
    (raw: string): Record<string, unknown> | null => {
      if (!raw.trim()) return {}
      try {
        const parsed = JSON.parse(raw)
        if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
          setArgsError(t('Arguments must be a JSON object'))
          return null
        }
        setArgsError(null)
        return parsed as Record<string, unknown>
      } catch {
        setArgsError(t('Invalid JSON'))
        return null
      }
    },
    [t],
  )

  // ── Run handler ──

  const handleRun = useCallback(async () => {
    if (!selectedScript) return

    const parsedArgs = validateArgs(argsJson)
    if (parsedArgs === null) return

    setIsRunning(true)
    setResult(null)
    setProgress({ value: 0.05, label: t('Initializing Python environment…') })

    // Subscribe to progress events
    unsubRef.current = sandbox.onProgress((event) => {
      if (event.type === 'loading') {
        setProgress({ value: 0.2, label: event.message })
      } else if (event.type === 'executing' || event.type === 'installing') {
        setProgress({ value: 0.5, label: event.message })
      }
    })

    try {
      const packages = selectedScript.requiredPackages ?? []
      const execResult = await sandbox.execute({
        language: 'python',
        code: selectedScript.content,
        context: parsedArgs,
        packages,
        timeout: 60_000,
        traceId: skill.id,
        label: selectedScript.path,
      })

      setProgress({ value: 1, label: t('Done') })
      setResult(execResult)
    } catch (err) {
      setResult({
        success: false,
        error: err instanceof Error ? err.message : String(err),
        stdout: '',
        stderr: '',
        console: [],
        executionTimeMs: 0,
        language: 'python',
      })
    } finally {
      unsubRef.current?.()
      unsubRef.current = null
      setIsRunning(false)
    }
  }, [selectedScript, argsJson, validateArgs, skill.id, t])

  // ── No runnable scripts ──

  if (runnableScripts.length === 0) {
    return (
      <div className="text-center py-8 text-default-400">
        <Icon name="Code" width={32} height={32} className="mx-auto mb-2" />
        <p className="text-sm">{t('No Python scripts available')}</p>
        <p className="text-xs mt-1">
          {t('Only Python scripts can be executed in the sandbox')}
        </p>
      </div>
    )
  }

  // ── Package compatibility chips ──

  const renderPackageChips = (script: SkillScript) => {
    const packages = script.requiredPackages ?? []
    if (packages.length === 0) return null

    return (
      <div className="flex flex-wrap gap-1 mt-2">
        {packages.map((pkg) => {
          const compat = checkPackageCompatibility(pkg)
          const color =
            compat === 'builtin'
              ? 'success'
              : compat === 'incompatible'
                ? 'danger'
                : 'default'
          return (
            <Tooltip
              key={pkg}
              content={
                compat === 'incompatible'
                  ? t('This package may not work in the browser environment')
                  : compat === 'builtin'
                    ? t('Pre-compiled in Pyodide')
                    : t('Will be installed via micropip')
              }
            >
              <Chip size="sm" variant="flat" color={color}>
                {pkg}
              </Chip>
            </Tooltip>
          )
        })}
      </div>
    )
  }

  return (
    <div className="space-y-4 py-2">
      {/* Script selector */}
      <Select
        label={t('Select script')}
        selectedKeys={selectedScriptPath ? [selectedScriptPath] : []}
        onSelectionChange={(keys) => {
          const key = Array.from(keys)[0] as string
          if (key) {
            setSelectedScriptPath(key)
            setResult(null)
          }
        }}
        size="sm"
        classNames={{ trigger: 'h-12' }}
      >
        {runnableScripts.map((script) => (
          <SelectItem key={script.path} textValue={script.path}>
            <div className="flex items-center gap-2">
              <Icon name="Code" width={14} height={14} />
              <span className="font-mono text-xs">{script.path}</span>
            </div>
          </SelectItem>
        ))}
      </Select>

      {/* Package chips for selected script */}
      {selectedScript && renderPackageChips(selectedScript)}

      {/* Arguments */}
      <Textarea
        label={t('Arguments (JSON)')}
        description={t('Keys become --flags in sys.argv for argparse scripts')}
        placeholder={'{\n  "prompt": "hello world",\n  "filename": "output.png"\n}'}
        value={argsJson}
        onValueChange={(v) => {
          setArgsJson(v)
          if (argsError) validateArgs(v)
        }}
        isInvalid={!!argsError}
        errorMessage={argsError}
        minRows={3}
        maxRows={6}
        size="sm"
        classNames={{
          input: 'font-mono text-xs',
        }}
      />

      {/* Run button */}
      <Button
        color="primary"
        size="sm"
        onPress={handleRun}
        isDisabled={isRunning || !selectedScript}
        isLoading={isRunning}
        startContent={
          !isRunning ? <Icon name="Play" width={14} height={14} /> : undefined
        }
        className="w-full"
      >
        {isRunning ? t('Running script…') : t('Run Script')}
      </Button>

      {/* Progress bar */}
      {isRunning && (
        <div className="space-y-1">
          <Progress
            size="sm"
            value={progress.value * 100}
            color="primary"
            className="w-full"
          />
          <p className="text-xs text-default-500 text-center">
            {progress.label}
          </p>
        </div>
      )}

      {/* Results */}
      {result && (
        <>
          <Divider />

          <div className="space-y-3">
            {/* Status header */}
            <div className="flex items-center gap-2">
              {result.success ? (
                <Chip size="sm" color="success" variant="flat">
                  {t('Script executed successfully')}
                </Chip>
              ) : (
                <Chip size="sm" color="danger" variant="flat">
                  {t('Script execution failed')}
                </Chip>
              )}
              <span className="text-xs text-default-400">
                {result.executionTimeMs}ms
              </span>
              {result.packagesInstalled && result.packagesInstalled.length > 0 && (
                <span className="text-xs text-default-400">
                  · {result.packagesInstalled.length} {t('packages installed')}
                </span>
              )}
            </div>

            {/* Return value */}
            {result.result && (
              <div>
                <p className="text-xs font-semibold mb-1">{t('Return value')}</p>
                <pre className="text-xs bg-default-100 rounded-lg p-3 overflow-auto max-h-40 whitespace-pre-wrap">
                  {result.result}
                </pre>
              </div>
            )}

            {/* stdout */}
            {result.stdout.trim() && (
              <div>
                <p className="text-xs font-semibold mb-1">{t('Output')}</p>
                <pre className="text-xs bg-default-100 rounded-lg p-3 overflow-auto max-h-48 whitespace-pre-wrap">
                  {result.stdout}
                </pre>
              </div>
            )}

            {/* stderr */}
            {result.stderr.trim() && (
              <div>
                <p className="text-xs font-semibold mb-1 text-warning">
                  {t('Warnings')}
                </p>
                <pre className="text-xs bg-warning-50 rounded-lg p-3 overflow-auto max-h-32 whitespace-pre-wrap">
                  {result.stderr}
                </pre>
              </div>
            )}

            {/* Error */}
            {result.error && (
              <div>
                <p className="text-xs font-semibold mb-1 text-danger">
                  {t('Error')}
                </p>
                <pre className="text-xs bg-danger-50 rounded-lg p-3 overflow-auto max-h-32 whitespace-pre-wrap">
                  {result.error}
                </pre>
              </div>
            )}

            {/* Output files */}
            {result.outputFiles && result.outputFiles.length > 0 && (
              <div>
                <p className="text-xs font-semibold mb-1">
                  {t('Output files')} ({result.outputFiles.length})
                </p>
                <div className="space-y-2">
                  {result.outputFiles.map((f, i) => (
                    <div
                      key={i}
                      className="bg-default-100 rounded-lg p-2"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Icon
                          name="Page"
                          width={14}
                          height={14}
                          className="text-default-500"
                        />
                        <span className="text-xs font-mono">{f.path}</span>
                        <Chip size="sm" variant="flat">
                          {f.encoding}
                        </Chip>
                      </div>
                      {f.encoding === 'text' && (
                        <pre className="text-xs overflow-auto max-h-32 whitespace-pre-wrap mt-1">
                          {f.content.slice(0, 2000)}
                          {f.content.length > 2000 && '…'}
                        </pre>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
