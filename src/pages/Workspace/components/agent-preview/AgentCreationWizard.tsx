import { useState, useCallback, useRef, useEffect } from 'react'
import {
  Breadcrumbs,
  Button,
  Input,
  ScrollShadow,
  TextArea,
} from '@heroui/react_3'
import { Icon, MarkdownRenderer } from '@/components'
import { useI18n } from '@/i18n'
import { LLMService, type LLMMessage } from '@/lib/llm'
import { CredentialService } from '@/lib/credential-service'
import { AGENT_META_PROMPT_SYSTEM } from '@/lib/agent-meta-prompt'
import { createAgent } from '@/stores/agentStore'
import type { Agent } from '@/types'
import { PlaygroundTab } from './tabs/PlaygroundTab'

type WizardMode = 'choose' | 'ai' | 'form' | 'test'

interface AgentCreationWizardProps {
  onCreated: (agentId: string) => void
  onCancel: () => void
}

interface AgentDraft {
  name: string
  role: string
  instructions: string
}

export function AgentCreationWizard({
  onCreated,
  onCancel,
}: AgentCreationWizardProps) {
  const { t } = useI18n()
  const [mode, setMode] = useState<WizardMode>('choose')

  // Track whether form was reached via AI or manual
  const [origin, setOrigin] = useState<'ai' | 'manual'>('manual')

  // AI describe step
  const [description, setDescription] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [streamPreview, setStreamPreview] = useState('')
  const [generateError, setGenerateError] = useState<string | null>(null)

  // Form / review
  const [draft, setDraft] = useState<AgentDraft>({
    name: '',
    role: '',
    instructions: '',
  })

  // Test
  const [tempAgent, setTempAgent] = useState<Agent | null>(null)

  // Creating
  const [isCreating, setIsCreating] = useState(false)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (mode === 'ai') textareaRef.current?.focus()
  }, [mode])

  useEffect(() => () => abortRef.current?.abort(), [])

  /* ─── Navigation ──────────────────────────────────────── */

  const goToChoose = useCallback(() => {
    abortRef.current?.abort()
    setIsGenerating(false)
    setMode('choose')
  }, [])

  const goToAI = useCallback(() => {
    setOrigin('ai')
    setMode('ai')
  }, [])

  const goToManual = useCallback(() => {
    setOrigin('manual')
    setDraft({ name: '', role: '', instructions: '' })
    setMode('form')
  }, [])

  const goToForm = useCallback(() => {
    setMode('form')
  }, [])

  const goToTest = useCallback(() => {
    setTempAgent({
      id: '__temp__',
      slug: 'temp-agent',
      name: draft.name || 'New Agent',
      role: draft.role || 'AI Assistant',
      instructions: draft.instructions || 'You are a helpful assistant.',
      tags: ['custom'],
      createdAt: new Date(),
    })
    setMode('test')
  }, [draft])

  /* ─── AI Generation ───────────────────────────────────── */

  const handleGenerate = useCallback(async () => {
    const text = description.trim()
    if (!text || isGenerating) return

    setGenerateError(null)
    setStreamPreview('')
    setIsGenerating(true)

    try {
      const config = await CredentialService.getActiveConfig()
      if (!config) {
        throw new Error(
          'No AI provider configured. Please configure one in Settings.',
        )
      }

      const llmMessages: LLMMessage[] = [
        { role: 'system', content: AGENT_META_PROMPT_SYSTEM },
        { role: 'user', content: text },
      ]

      const abortController = new AbortController()
      abortRef.current = abortController

      let response = ''
      for await (const chunk of LLMService.streamChat(llmMessages, {
        ...config,
        signal: abortController.signal,
      })) {
        if (abortController.signal.aborted) break
        response += chunk
        setStreamPreview(response)
      }

      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error(
          'Failed to generate agent configuration. Please try again.',
        )
      }

      const parsed = JSON.parse(jsonMatch[0])
      if (!parsed.name || !parsed.role) {
        throw new Error('Generated configuration is missing required fields.')
      }

      setDraft({
        name: parsed.name,
        role: parsed.role,
        instructions: parsed.instructions || '',
      })
      setOrigin('ai')
      setMode('form')
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      setGenerateError(
        err instanceof Error ? err.message : 'Generation failed.',
      )
    } finally {
      setIsGenerating(false)
      abortRef.current = null
    }
  }, [description, isGenerating])

  const handleCancelGeneration = useCallback(() => {
    abortRef.current?.abort()
    setIsGenerating(false)
  }, [])

  /* ─── Create agent ────────────────────────────────────── */

  const handleCreate = useCallback(async () => {
    if (!draft.name.trim() || !draft.role.trim() || isCreating) return
    setIsCreating(true)
    try {
      const agent = await createAgent({
        name: draft.name.trim(),
        role: draft.role.trim(),
        instructions: draft.instructions.trim(),
        tags: ['custom'],
      })
      onCreated(agent.id)
    } catch {
      setIsCreating(false)
    }
  }, [draft, isCreating, onCreated])

  const canCreate = draft.name.trim() && draft.role.trim()

  /* ─── Breadcrumbs ─────────────────────────────────────── */

  const breadcrumbItems = (() => {
    const items: { label: string; onPress?: () => void }[] = [
      { label: t('Agents'), onPress: onCancel },
      {
        label: t('New agent'),
        onPress: mode !== 'choose' ? goToChoose : undefined,
      },
    ]

    if (mode === 'ai') {
      items.push({ label: t('AI') })
    } else if (mode === 'form') {
      items.push({ label: origin === 'ai' ? t('Edit') : t('Settings') })
    } else if (mode === 'test') {
      items.push({ label: t('Test') })
    }

    return items
  })()

  return (
    <div className="flex min-h-0 max-h-full flex-1 flex-col gap-4 overflow-clip">
      {/* Breadcrumbs */}
      <div className="shrink-0">
        <Breadcrumbs>
          {breadcrumbItems.map((item, i) => {
            const isLast = i === breadcrumbItems.length - 1
            return (
              <Breadcrumbs.Item
                key={`${item.label}-${i}`}
                onPress={() => {
                  if (!isLast && item.onPress) item.onPress()
                }}
                className={isLast ? 'font-medium' : 'cursor-pointer'}
              >
                {item.label}
              </Breadcrumbs.Item>
            )
          })}
        </Breadcrumbs>
      </div>

      {/* Step content */}
      {mode === 'choose' && <ModeChooser onAI={goToAI} onManual={goToManual} />}

      {mode === 'ai' && (
        <DescribeStep
          description={description}
          onDescriptionChange={setDescription}
          isGenerating={isGenerating}
          streamPreview={streamPreview}
          error={generateError}
          onGenerate={handleGenerate}
          onCancelGeneration={handleCancelGeneration}
          onSkipToManual={goToManual}
          textareaRef={textareaRef}
        />
      )}

      {mode === 'form' && (
        <FormStep
          draft={draft}
          onDraftChange={setDraft}
          canCreate={!!canCreate}
          isCreating={isCreating}
          onTest={goToTest}
          onCreate={handleCreate}
          onBack={origin === 'ai' ? () => setMode('ai') : goToChoose}
        />
      )}

      {mode === 'test' && tempAgent && (
        <TestStep
          agent={tempAgent}
          canCreate={!!canCreate}
          isCreating={isCreating}
          onCreate={handleCreate}
          onBack={goToForm}
        />
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   Mode Chooser
   ═══════════════════════════════════════════════════════════════ */

function ModeChooser({
  onAI,
  onManual,
}: {
  onAI: () => void
  onManual: () => void
}) {
  const { t } = useI18n()
  return (
    <ScrollShadow hideScrollBar className="min-h-0 flex-1 overflow-y-auto">
      <div className="flex flex-col gap-4 py-1">
        <div className="flex flex-col gap-1">
          <h3 className="text-foreground text-base font-semibold">
            {t('How would you like to create your agent?')}
          </h3>
          <p className="text-muted text-xs leading-relaxed">
            {t('Choose your preferred approach. You can always switch later.')}
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={onAI}
            className="group flex items-start gap-4 rounded-xl border p-4 text-left transition-colors hover:border-primary hover:bg-primary/5"
          >
            <div className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-lg">
              <Icon name="Sparks" size="md" />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-foreground text-sm font-semibold">
                {t('AI-Assisted')}
              </span>
              <span className="text-muted text-xs leading-relaxed">
                {t(
                  'Describe what kind of agent you need in plain language. AI will generate the name, role, and instructions for you.',
                )}
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={onManual}
            className="group flex items-start gap-4 rounded-xl border p-4 text-left transition-colors hover:border-secondary hover:bg-secondary/5"
          >
            <div className="bg-secondary/10 text-secondary flex size-10 shrink-0 items-center justify-center rounded-lg">
              <Icon name="PageEdit" size="md" />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-foreground text-sm font-semibold">
                {t('Manual Configuration')}
              </span>
              <span className="text-muted text-xs leading-relaxed">
                {t(
                  'Set up everything yourself. Define the name, role, and instructions from scratch.',
                )}
              </span>
            </div>
          </button>
        </div>
      </div>
    </ScrollShadow>
  )
}

/* ═══════════════════════════════════════════════════════════════
   Describe Step (AI-Assisted)
   ═══════════════════════════════════════════════════════════════ */

function DescribeStep({
  description,
  onDescriptionChange,
  isGenerating,
  streamPreview,
  error,
  onGenerate,
  onCancelGeneration,
  onSkipToManual,
  textareaRef,
}: {
  description: string
  onDescriptionChange: (v: string) => void
  isGenerating: boolean
  streamPreview: string
  error: string | null
  onGenerate: () => void
  onCancelGeneration: () => void
  onSkipToManual: () => void
  textareaRef: React.RefObject<HTMLTextAreaElement | null>
}) {
  const { t } = useI18n()
  return (
    <ScrollShadow hideScrollBar className="min-h-0 flex-1 overflow-y-auto">
      <div className="flex flex-col gap-4 py-1">
        <div className="flex flex-col gap-1">
          <h3 className="text-foreground text-base font-semibold">
            {t('Describe your agent')}
          </h3>
          <p className="text-muted text-xs leading-relaxed">
            {t(
              'Tell us what kind of agent you want and we\u2019ll generate its name, role, and instructions automatically.',
            )}
          </p>
        </div>

        {error && (
          <div className="bg-danger-50 text-danger border-danger-200 rounded-lg border px-3 py-2 text-xs">
            {error}
          </div>
        )}

        <TextArea
          ref={textareaRef}
          variant="secondary"
          value={description}
          placeholder={t(
            'e.g., A friendly cooking assistant who specializes in Italian cuisine and can suggest wine pairings...',
          )}
          rows={4}
          onChange={(e) => onDescriptionChange(e.target.value)}
          disabled={isGenerating}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault()
              onGenerate()
            }
          }}
        />

        {/* Streaming preview */}
        {isGenerating && streamPreview && (
          <div className="bg-default-50 rounded-lg border p-3">
            <div className="mb-2 flex items-center gap-2">
              <div className="bg-primary size-1.5 animate-pulse rounded-full" />
              <span className="text-muted text-xs">
                {t('Generating agent...')}
              </span>
            </div>
            <div className="text-foreground max-h-40 overflow-y-auto text-xs leading-relaxed">
              <MarkdownRenderer content={streamPreview} />
            </div>
          </div>
        )}

        {/* Thinking indicator */}
        {isGenerating && !streamPreview && (
          <div className="flex items-center gap-2 py-2">
            <div className="bg-default-200 size-1.5 animate-pulse rounded-full" />
            <div className="bg-default-200 size-1.5 animate-pulse rounded-full [animation-delay:150ms]" />
            <div className="bg-default-200 size-1.5 animate-pulse rounded-full [animation-delay:300ms]" />
            <span className="text-muted text-xs">{t('Thinking...')}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isGenerating ? (
              <Button
                size="sm"
                variant="secondary"
                onPress={onCancelGeneration}
              >
                <Icon name="Xmark" size="xs" />
                {t('Stop')}
              </Button>
            ) : (
              <Button
                size="sm"
                variant="primary"
                onPress={onGenerate}
                isDisabled={!description.trim()}
              >
                <Icon name="Sparks" size="xs" />
                {t('Generate Agent')}
              </Button>
            )}
            <span className="text-muted text-[10px]">
              <kbd className="bg-default-100 rounded px-1 py-0.5 font-mono text-[10px]">
                {navigator.platform?.includes('Mac') ? '\u2318' : 'Ctrl'}+Enter
              </kbd>{' '}
              {t('to generate')}
            </span>
          </div>

          {!isGenerating && (
            <Button
              size="sm"
              variant="ghost"
              className="text-muted"
              onPress={onSkipToManual}
            >
              {t('Skip to manual')}
              <Icon name="ArrowRight" size="xs" />
            </Button>
          )}
        </div>
      </div>
    </ScrollShadow>
  )
}

/* ═══════════════════════════════════════════════════════════════
   Form Step (shared by AI-review and manual)
   ═══════════════════════════════════════════════════════════════ */

function FormStep({
  draft,
  onDraftChange,
  canCreate,
  isCreating,
  onTest,
  onCreate,
  onBack,
}: {
  draft: AgentDraft
  onDraftChange: (d: AgentDraft) => void
  canCreate: boolean
  isCreating: boolean
  onTest: () => void
  onCreate: () => void
  onBack: () => void
}) {
  const { t } = useI18n()
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ScrollShadow hideScrollBar className="min-h-0 flex-1 overflow-y-auto">
        <div className="flex flex-col gap-5 py-1">
          <div className="flex flex-col gap-1">
            <h3 className="text-foreground text-base font-semibold">
              {t('Agent configuration')}
            </h3>
            <p className="text-muted text-xs leading-relaxed">
              {t(
                'Define your agent\u2019s identity and behavior. All fields are editable.',
              )}
            </p>
          </div>

          {/* Name */}
          <FormField
            label={t('Name')}
            icon="UserCircle"
            value={draft.name}
            placeholder={t('Agent name...')}
            onChange={(v) => onDraftChange({ ...draft, name: v })}
            required
          />

          {/* Role */}
          <FormField
            label={t('Role')}
            icon="UserCircle"
            value={draft.role}
            placeholder={t('Agent role...')}
            onChange={(v) => onDraftChange({ ...draft, role: v })}
            required
          />

          {/* Instructions */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5">
              <Icon name="PageEdit" size="sm" className="text-muted" />
              <span className="text-muted text-xs font-medium uppercase tracking-wide">
                {t('Instructions')}
              </span>
            </div>
            <TextArea
              variant="secondary"
              value={draft.instructions}
              placeholder={t('Detailed instructions for the agent\u2019s behavior, personality, skills, constraints, and goals...')}
              rows={8}
              onChange={(e) =>
                onDraftChange({ ...draft, instructions: e.target.value })
              }
              style={{ resize: 'vertical' }}
            />
          </div>
        </div>
      </ScrollShadow>

      {/* Sticky action bar */}
      <div className="flex shrink-0 items-center gap-3 border-t pt-3 mt-3">
        <Button
          size="sm"
          variant="primary"
          isDisabled={!canCreate || isCreating}
          onPress={onCreate}
        >
          {isCreating ? (
            <div className="bg-current size-3 animate-spin rounded-full border-2 border-transparent border-t-current" />
          ) : (
            <Icon name="Check" size="xs" />
          )}
          {isCreating ? t('Creating...') : t('Create Agent')}
        </Button>
        <Button
          size="sm"
          variant="secondary"
          isDisabled={!canCreate || isCreating}
          onPress={onTest}
        >
          <Icon name="Play" size="xs" />
          {t('Test first')}
        </Button>
        <div className="flex-1" />
        <Button
          size="sm"
          variant="ghost"
          className="text-muted"
          onPress={onBack}
        >
          <Icon name="ArrowLeft" size="xs" />
          {t('Back')}
        </Button>
      </div>
    </div>
  )
}

function FormField({
  label,
  icon,
  value,
  placeholder,
  onChange,
  required,
}: {
  label: string
  icon: string
  value: string
  placeholder: string
  onChange: (v: string) => void
  required?: boolean
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        <Icon name={icon as any} size="sm" className="text-muted" />
        <span className="text-muted text-xs font-medium uppercase tracking-wide">
          {label}
          {required && <span className="text-danger ml-0.5">*</span>}
        </span>
      </div>
      <Input
        variant="secondary"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   Test Step
   ═══════════════════════════════════════════════════════════════ */

function TestStep({
  agent,
  canCreate,
  isCreating,
  onCreate,
  onBack,
}: {
  agent: Agent
  canCreate: boolean
  isCreating: boolean
  onCreate: () => void
  onBack: () => void
}) {
  const { t } = useI18n()
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <PlaygroundTab agent={agent} />

      {/* Sticky action bar */}
      <div className="flex shrink-0 items-center gap-3 border-t pt-3">
        <Button
          size="sm"
          variant="primary"
          isDisabled={!canCreate || isCreating}
          onPress={onCreate}
        >
          {isCreating ? (
            <div className="bg-current size-3 animate-spin rounded-full border-2 border-transparent border-t-current" />
          ) : (
            <Icon name="Check" size="xs" />
          )}
          {isCreating ? t('Creating...') : t('Create Agent')}
        </Button>
        <div className="flex-1" />
        <Button
          size="sm"
          variant="ghost"
          className="text-muted"
          onPress={onBack}
        >
          <Icon name="ArrowLeft" size="xs" />
          {t('Back to configure')}
        </Button>
      </div>
    </div>
  )
}
