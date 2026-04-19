import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Button,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
  ScrollShadow,
} from '@heroui/react'
import { Icon, PromptArea, Title } from '@/components'
import { DevsIcon } from '@/components/DevsIcon'
import type { PromptMode } from '@/components/PromptArea'
import { useI18n, useUrl } from '@/i18n'
import { useSessionStore } from '@/stores/sessionStore'
import { getAgentsByCategory } from '@/stores/agentStore'
import { agentThemeIcon, useCasesByThemes } from '@/lib/agents'
import { errorToast } from '@/lib/toast'
import type { Agent, InstalledSkill, SessionIntent } from '@/types'
import { userSettings } from '@/stores/userStore'
import { PRODUCT } from '@/config/product'

export interface NewTaskHeroProps {
  /** When true the PromptArea receives autofocus. Default: true. */
  autoFocus?: boolean
  /** Show the category use-case dropdowns. Default: true. */
  showUseCases?: boolean
  className?: string
  /**
   * Externally controlled prompt value. When provided, the internal prompt
   * state is overridden — useful for tours, demos, or controlled playback.
   */
  value?: string
  /** Called when the internal prompt state changes. */
  onValueChange?: (value: string) => void
  /**
   * When true, skips loading real agents and LLM providers. Use in product
   * tours or other purely visual contexts where live data is not needed.
   */
  demo?: boolean
}

/** Map session intent to V2 filter for navigation */
const intentToFilter = (intent: SessionIntent): string => {
  switch (intent) {
    case 'task':
      return 'tasks'
    case 'conversation':
      return 'conversations'
    default:
      return 'inbox'
  }
}

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => {
      const result = reader.result as string
      resolve(result.split(',')[1])
    }
    reader.onerror = reject
  })

/**
 * Shared hero block for the DEVS home page — the DEVS logo, product title,
 * prompt composer, and use-case category dropdowns.
 *
 * Self-contained: owns all of its state and side-effects (session creation,
 * navigation). Both the real NewTaskPage and the product tour render this
 * component so there is a single source of truth — visual tweaks flow through
 * automatically.
 */
export function NewTaskHero({
  autoFocus = true,
  showUseCases = true,
  className,
  value,
  onValueChange,
  demo = false,
}: NewTaskHeroProps) {
  const { lang, t } = useI18n()
  const url = useUrl(lang)
  const navigate = useNavigate()

  const [internalPrompt, setInternalPrompt] = useState('')
  const prompt = value !== undefined ? value : internalPrompt
  const setPrompt = (next: string) => {
    if (value === undefined) setInternalPrompt(next)
    onValueChange?.(next)
  }
  const [isSending, setIsSending] = useState(false)
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [mode, setMode] = useState<PromptMode>('chat')
  const [agents, setAgents] = useState<Agent[]>([])
  const [isLoadingAgents, setIsLoadingAgents] = useState(true)

  const { createSession } = useSessionStore()
  const { platformName } = userSettings()

  useEffect(() => {
    if (demo) {
      setIsLoadingAgents(false)
      return
    }
    let cancelled = false
    const loadData = async () => {
      try {
        setIsLoadingAgents(true)
        const { agentsByCategory, orderedCategories } =
          await getAgentsByCategory(lang, { includeDefaultAgents: true })
        if (cancelled) return
        const allAgents = orderedCategories.flatMap(
          (category) => agentsByCategory[category] || [],
        )
        setAgents(allAgents.filter((agent) => agent.id !== 'devs'))
      } catch (error) {
        console.error('Failed to load agents:', error)
      } finally {
        if (!cancelled) setIsLoadingAgents(false)
      }
    }
    loadData()
    return () => {
      cancelled = true
    }
  }, [lang, demo])

  const handleUseCaseClick = useCallback(
    (
      useCase: {
        prompt: string
        id: string
        title?: string
        agent: Agent
      },
      focus = true,
    ) => {
      if (useCase.agent) setSelectedAgent(useCase.agent)
      setPrompt(
        useCase.agent.i18n?.[lang]?.examples?.find((ex) => ex.id === useCase.id)
          ?.prompt ?? useCase.prompt,
      )
      if (focus) {
        ;(
          document.querySelector('[data-testid="prompt-input"]') as any
        )?.focus()
      }
    },
    [lang],
  )

  const onSubmitToAgent = useCallback(
    async (
      cleanedPrompt?: string,
      mentionedAgent?: Agent,
      _mentionedMethodology?: unknown,
      mentionedSkills?: InstalledSkill[],
      mentionedConnectors?: Array<{
        id: string
        name: string
        provider: string
        accountEmail?: string
      }>,
    ) => {
      const promptToUse = cleanedPrompt ?? prompt
      if (!promptToUse.trim() || isSending) return

      setIsSending(true)

      try {
        const agent = mentionedAgent ||
          selectedAgent || { id: 'devs', slug: 'devs' }

        let intent: SessionIntent
        if (mode === 'studio') intent = 'media'
        else if (mode === 'app') intent = 'app'
        else if (mode === 'agent') intent = 'agent'
        else if (agent.id === 'devs') intent = 'task'
        else intent = 'conversation'

        const attachments =
          selectedFiles.length > 0
            ? await Promise.all(
                selectedFiles.map(async (file) => ({
                  name: file.name,
                  type: file.type,
                  size: file.size,
                  data: await fileToBase64(file),
                })),
              )
            : undefined

        const session = await createSession({
          prompt: promptToUse,
          intent,
          primaryAgentId: agent.id,
          attachments,
          mentionedSkills: mentionedSkills?.map((s) => s.name),
          mentionedConnectors: mentionedConnectors?.map((c) => c.name),
        })

        sessionStorage.removeItem('pendingPrompt')
        sessionStorage.removeItem('pendingAgent')
        sessionStorage.removeItem('pendingFiles')
        sessionStorage.removeItem('pendingSkills')
        sessionStorage.removeItem('pendingConnectors')

        const targetUrl = url(`/v2/${intentToFilter(intent)}/${session.id}`)
        if (document.startViewTransition) {
          document.startViewTransition(() => navigate(targetUrl))
        } else {
          navigate(targetUrl)
        }

        setPrompt('')
        setSelectedFiles([])
        setMode('chat')
      } catch (error) {
        console.error('Failed to create session:', error)
        errorToast('Failed to create session', error)
      } finally {
        setIsSending(false)
      }
    },
    [
      prompt,
      isSending,
      selectedAgent,
      selectedFiles,
      mode,
      createSession,
      navigate,
      url,
    ],
  )

  const onSubmitTask = useCallback(
    async (cleanedPrompt?: string, mentionedAgent?: Agent) => {
      const promptToUse = cleanedPrompt ?? prompt
      if (!promptToUse.trim() || isSending) return

      setIsSending(true)

      try {
        const agent = mentionedAgent ||
          selectedAgent || { id: 'devs', slug: 'devs' }

        let intent: SessionIntent
        if (mode === 'studio') intent = 'media'
        else if (mode === 'app') intent = 'app'
        else if (mode === 'agent') intent = 'agent'
        else intent = 'task'

        const attachments =
          selectedFiles.length > 0
            ? await Promise.all(
                selectedFiles.map(async (file) => ({
                  name: file.name,
                  type: file.type,
                  size: file.size,
                  data: await fileToBase64(file),
                })),
              )
            : undefined

        const session = await createSession({
          prompt: promptToUse,
          intent,
          primaryAgentId: agent.id,
          attachments,
        })

        sessionStorage.removeItem('pendingPrompt')
        sessionStorage.removeItem('pendingAgent')
        sessionStorage.removeItem('pendingFiles')
        sessionStorage.removeItem('pendingSkills')
        sessionStorage.removeItem('pendingConnectors')

        const targetUrl = url(`/v2/${intentToFilter(intent)}/${session.id}`)
        if (document.startViewTransition) {
          document.startViewTransition(() => navigate(targetUrl))
        } else {
          navigate(targetUrl)
        }

        setPrompt('')
        setSelectedFiles([])
        setMode('chat')
      } catch (error) {
        console.error('Failed to create session:', error)
        errorToast('Failed to create session', error)
      } finally {
        setIsSending(false)
      }
    },
    [
      prompt,
      isSending,
      selectedAgent,
      selectedFiles,
      mode,
      createSession,
      navigate,
      url,
    ],
  )

  const useCases = useMemo(
    () => (isLoadingAgents ? [] : useCasesByThemes(agents)),
    [isLoadingAgents, agents],
  )

  return (
    <div className={className ?? 'flex h-full min-h-0 flex-1 flex-col'}>
      <ScrollShadow
        hideScrollBar
        className="flex min-h-0 flex-1 flex-col overflow-y-auto"
      >
        <div className="flex flex-1 flex-col items-center justify-center px-4 py-8 sm:py-16">
          <DevsIcon className="scale-150 opacity-50" />

          <Title
            subtitle={t('Your AI team is ready')}
            className="!text-2xl text-center sm:!text-3xl md:!text-4xl font-light"
            subtitleClassName="text-md md:text-xl text-center"
          >
            {platformName || PRODUCT.displayName}
          </Title>

          {/* PromptArea */}
          <div className="w-full max-w-2xl">
            <PromptArea
              lang={lang}
              autoFocus={autoFocus}
              className="mb-8"
              value={prompt}
              defaultPrompt={prompt}
              onValueChange={setPrompt}
              onSubmitToAgent={onSubmitToAgent}
              onSubmitTask={onSubmitTask}
              isSending={isSending}
              selectedAgent={selectedAgent}
              onAgentChange={setSelectedAgent}
              onFilesChange={setSelectedFiles}
              mode={mode}
              onModeChange={setMode}
              demo={demo}
            />
          </div>

          {/* Use cases */}
          {showUseCases && useCases.length > 0 && (
            <div className="flex max-w-2xl flex-wrap justify-center gap-2">
              {useCases.map(({ theme, usecases }) => (
                <Dropdown key={theme} placement="bottom-start">
                  <DropdownTrigger>
                    <Button
                      variant="ghost"
                      size="md"
                      className="inline-flex justify-start"
                      startContent={
                        usecases[0]?.agent.icon && (
                          <Icon
                            name={(agentThemeIcon as any)[theme]}
                            size="lg"
                            className="text-default-500"
                          />
                        )
                      }
                    >
                      <span className="font-semibold">{t(theme as any)}</span>
                    </Button>
                  </DropdownTrigger>
                  <DropdownMenu
                    aria-label={`${theme} examples`}
                    className="max-h-[70vh] overflow-y-auto"
                  >
                    {[
                      <DropdownItem
                        key="header"
                        className="py-2 text-default-500 !data-[hover=true]:bg-transparent"
                        startContent={
                          usecases[0]?.agent.icon && (
                            <Icon
                              name={(agentThemeIcon as any)[theme]}
                              size="md"
                              className="text-default-00"
                            />
                          )
                        }
                        endContent={
                          <Icon
                            name="Xmark"
                            size="md"
                            className="text-default-500"
                          />
                        }
                      >
                        <span className="font-medium">{t(theme as any)}</span>
                      </DropdownItem>,

                      ...usecases.map((example) => (
                        <DropdownItem
                          key={example.id}
                          endContent={
                            <Icon
                              name="NavArrowRight"
                              size="md"
                              className="text-default-500"
                            />
                          }
                          classNames={{
                            base: 'py-3',
                            title: 'font-medium',
                            description: 'text-xs',
                          }}
                          onPress={() => {
                            handleUseCaseClick(example)
                            setTimeout(() => {
                              const submitButton = document.querySelector(
                                '#prompt-area [type="submit"]',
                              ) as HTMLButtonElement | null
                              submitButton?.click()
                            }, 150)
                          }}
                          onMouseEnter={() =>
                            handleUseCaseClick(example, false)
                          }
                        >
                          {example.agent.i18n?.[lang]?.examples?.find(
                            (ex) => ex.id === example.id,
                          )?.title ?? example.title}
                        </DropdownItem>
                      )),
                    ]}
                  </DropdownMenu>
                </Dropdown>
              ))}
            </div>
          )}
        </div>
      </ScrollShadow>
    </div>
  )
}
