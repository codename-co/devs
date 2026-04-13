import { useI18n, useUrl } from '@/i18n'
import { Container, Icon, PromptArea, Section, Title } from '@/components'
import type { PromptMode } from '@/components/PromptArea'
import { DevsIcon } from '@/components/DevsIcon'
import { EasySetupModal } from '@/components/EasySetup/EasySetupModal'
import DefaultLayout from '@/layouts/Default'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Agent, InstalledSkill, SessionIntent } from '@/types'
import { useSessionStore } from '@/stores/sessionStore'
import { errorToast } from '@/lib/toast'
import { useBackgroundImage } from '@/hooks/useBackgroundImage'
import { useEasySetup } from '@/hooks/useEasySetup'
import { usePWAInstallPrompt } from '@/hooks/usePWAInstallPrompt'
import {
  Alert,
  Button,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
  Link,
} from '@heroui/react'
import { motion } from 'framer-motion'
import { motionVariants } from './motion'
import { getAgentsByCategory } from '@/stores/agentStore'
// import { loadAllMethodologies } from '@/stores/methodologiesStore'
// import type { Methodology } from '@/types/methodology.types'
import localeI18n from './i18n'
import { agentThemeIcon, useCasesByThemes } from '@/lib/agents'
import { PRODUCT } from '@/config/product'
import { userSettings } from '@/stores/userStore'
import { RecentActivity } from './RecentActivity'

export const IndexPage = () => {
  const { lang, t } = useI18n(localeI18n)
  const url = useUrl(lang)
  const navigate = useNavigate()
  const [prompt, setPrompt] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [mode, setMode] = useState<PromptMode>('chat')
  // const [methodologies, setMethodologies] = useState<Methodology[]>([])
  const [isLoadingAgents, setIsLoadingAgents] = useState(true)
  // const [isLoadingMethodologies, setIsLoadingMethodologies] = useState(true)

  const { createSession } = useSessionStore()
  const { backgroundImage, backgroundLoaded, isDragOver, dragHandlers } =
    useBackgroundImage()
  const { hasSetupData, setupData, clearSetupData } = useEasySetup()

  const { platformName } = userSettings()
  const productName = platformName ?? PRODUCT.displayName

  // PWA install prompt
  usePWAInstallPrompt({
    title: t('Install {productName}', { productName }),
    description: t(
      'Install this app on your device for a better experience and offline access.',
    ),
  })

  // Load agents and methodologies on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoadingAgents(true)
        // Always include default agents on the Index page for use cases
        const { agentsByCategory, orderedCategories } =
          await getAgentsByCategory(lang, { includeDefaultAgents: true })
        // Flatten all agents from all categories
        const allAgents = orderedCategories.flatMap(
          (category) => agentsByCategory[category] || [],
        )

        // Create a map for quick agent lookup
        const agentsMap = new Map<string, Agent>()
        allAgents.forEach((agent) => {
          agentsMap.set(agent.id, agent)
        })

        setAgents(allAgents.filter((agent) => agent.id !== 'devs'))
      } catch (error) {
        console.error('Failed to load agents:', error)
      } finally {
        setIsLoadingAgents(false)
      }
    }
    loadData()
  }, [lang])

  // useEffect(() => {
  //   const loadData = async () => {
  //     try {
  //       setIsLoadingMethodologies(true)
  //       const data = await loadAllMethodologies()
  //       setMethodologies(data)
  //     } catch (error) {
  //       console.error('Failed to load methodologies:', error)
  //     } finally {
  //       setIsLoadingMethodologies(false)
  //     }
  //   }
  //   loadData()
  // }, [lang])

  // Helper function to convert File to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => {
        const result = reader.result as string
        // Remove the data URL prefix (data:mime/type;base64,)
        resolve(result.split(',')[1])
      }
      reader.onerror = reject
    })
  }

  const handleUseCaseClick = (
    useCase: {
      prompt: string
      id: string
      title?: string
      agent: Agent
    },
    focus = true,
  ) => {
    // Find the agent from the map
    if (useCase.agent) {
      setSelectedAgent(useCase.agent)
    }
    setPrompt(
      useCase.agent.i18n?.[lang]?.examples?.find((ex) => ex.id === useCase.id)
        ?.prompt ?? useCase.prompt,
    )

    if (focus) {
      // Focus the prompt area
      ;(document.querySelector('[data-testid="prompt-input"]') as any)?.focus()

      // Scroll to the prompt area
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const onSubmitToAgent = async (
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

      // Determine intent from explicit mode signals
      let intent: SessionIntent
      if (mode === 'studio') intent = 'media'
      else if (mode === 'app') intent = 'app'
      else if (mode === 'agent') intent = 'agent'
      else if (agent.id === 'devs') intent = 'task'
      else intent = 'conversation'

      // Convert files to session attachments
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

      // Create a session entity
      const session = await createSession({
        prompt: promptToUse,
        intent,
        primaryAgentId: agent.id,
        attachments,
        mentionedSkills: mentionedSkills?.map((s) => s.name),
        mentionedConnectors: mentionedConnectors?.map((c) => c.name),
      })

      // Clear any stale pending data — the Session pipeline handles execution now,
      // so we must not leave prompts that the legacy agents/run page would pick up.
      sessionStorage.removeItem('pendingPrompt')
      sessionStorage.removeItem('pendingAgent')
      sessionStorage.removeItem('pendingFiles')
      sessionStorage.removeItem('pendingSkills')
      sessionStorage.removeItem('pendingConnectors')

      // Navigate with View Transition
      const targetUrl = url(`/session/${session.id}`)
      if (document.startViewTransition) {
        document.startViewTransition(() => {
          navigate(targetUrl)
        })
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
  }

  const onSubmitTask = async (
    cleanedPrompt?: string,
    mentionedAgent?: Agent,
  ) => {
    const promptToUse = cleanedPrompt ?? prompt
    if (!promptToUse.trim() || isSending) return

    setIsSending(true)

    try {
      const agent = mentionedAgent ||
        selectedAgent || { id: 'devs', slug: 'devs' }

      // Convert files to session attachments
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

      // Determine intent
      let intent: SessionIntent
      if (mode === 'studio') intent = 'media'
      else if (mode === 'app') intent = 'app'
      else if (mode === 'agent') intent = 'agent'
      else intent = 'task'

      // Create session
      const session = await createSession({
        prompt: promptToUse,
        intent,
        primaryAgentId: agent.id,
        attachments,
      })

      // Clear any stale pending data — the Session pipeline handles execution now.
      sessionStorage.removeItem('pendingPrompt')
      sessionStorage.removeItem('pendingAgent')
      sessionStorage.removeItem('pendingFiles')
      sessionStorage.removeItem('pendingSkills')
      sessionStorage.removeItem('pendingConnectors')

      // Navigate with View Transition
      const targetUrl = url(`/session/${session.id}`)
      if (document.startViewTransition) {
        document.startViewTransition(() => {
          navigate(targetUrl)
        })
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
  }

  return (
    <div
      className="relative min-h-full"
      onDragEnter={dragHandlers.onDragEnter}
      onDragLeave={dragHandlers.onDragLeave}
      onDragOver={dragHandlers.onDragOver}
      onDrop={dragHandlers.onDrop}
    >
      <DefaultLayout showBackButton={false}>
        {/* Background Image */}
        {backgroundImage && (
          <div
            className={`absolute m-0 inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-1000 ${
              backgroundLoaded ? 'opacity-25 dark:opacity-40' : 'opacity-0'
            }`}
            style={{
              backgroundImage: `url(${backgroundImage})`,
            }}
          />
        )}
        {/* Drag Overlay */}
        {isDragOver && (
          <div className="absolute top-auto bottom-2 inset-0 flex items-center justify-center">
            <div>
              <Alert
                variant="faded"
                title={t('Drop your image here')}
                description={t('Release to set as background')}
              />
            </div>
          </div>
        )}

        <Section mainClassName="section-blank">
          <motion.div
            layoutId="active"
            className="flex flex-col text-center items-center mt-0 sm:mt-[10vh]"
            {...motionVariants.container}
          >
            <motion.div {...motionVariants.icon}>
              <DevsIcon />
            </motion.div>

            <motion.div {...motionVariants.title}>
              <Title
                subtitle={t('Your AI team is ready')}
                className="!text-2xl sm:!text-3xl md:!text-4xl font-light"
                subtitleClassName="text-md md:text-xl"
              >
                {platformName ||
                  t('Hey {productName}', { productName: PRODUCT.displayName })}
              </Title>
            </motion.div>
          </motion.div>

          <motion.div {...motionVariants.promptArea}>
            <PromptArea
              lang={lang}
              autoFocus
              className="my-8 sm:my-16"
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
            />
          </motion.div>

          <motion.div {...motionVariants.agentSection}>
            {/* Use Cases Section */}
            {!isLoadingAgents && (
              <Container size={7} className="mt-0 sm:-mt-8">
                <div className="flex gap-2 flex-wrap justify-center">
                  {useCasesByThemes(agents).map(
                    ({ theme, usecases }, index) => (
                      <motion.div
                        {...motionVariants.usecase}
                        transition={{
                          ...motionVariants.usecase.transition,
                          delay: 0.7 + 0.06 * index,
                        }}
                        key={theme}
                      >
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
                              <span className="font-semibold">
                                {t(theme as any)}
                              </span>
                            </Button>
                          </DropdownTrigger>
                          <DropdownMenu
                            aria-label={`${theme} examples`}
                            className="max-h-[70vh] overflow-y-auto"
                          >
                            {[
                              <DropdownItem
                                key="aa"
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
                                <span className="font-medium">
                                  {t(theme as any)}
                                </span>
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
                                  // description={
                                  //   <span className="text-xs text-default-500 line-clamp-2">
                                  //     {example.prompt}
                                  //   </span>
                                  // }
                                  classNames={{
                                    base: 'py-3',
                                    title: 'font-medium',
                                    description: 'text-xs',
                                  }}
                                  onPress={() => {
                                    handleUseCaseClick(example)

                                    // submit
                                    setTimeout(() => {
                                      const submitButton =
                                        document.querySelector(
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
                      </motion.div>
                    ),
                  )}
                </div>
              </Container>
            )}

            {/* Methodologies Section */}
            {/* {!isLoadingMethodologies && (
            <Container>
              <Title level={3} size="lg" className="text-gray-600">
                {t('Methodologies')}
              </Title>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {methodologies.map((methodology) => {
                  const methodologyName =
                    methodology.metadata.i18n?.[lang]?.name ||
                    methodology.metadata.name
                  return (
                    <Card
                      key={methodology.metadata.id}
                      isPressable
                      isHoverable
                      shadow="sm"
                      className="transition-transform"
                      onPress={() => {
                        window.location.hash = `p=${encodeURIComponent(methodologyName)}`
                      }}
                    >
                      <CardBody className="p-3 text-center">
                        <p className="text-sm font-medium">{methodologyName}</p>
                      </CardBody>
                    </Card>
                  )
                })}
              </div>
            </Container>
          )} */}
          </motion.div>

          <motion.div {...motionVariants.agentSection}>
            <RecentActivity />
          </motion.div>
        </Section>

        <footer className="absolute bottom-12 md:bottom-0 left-0 right-0 mt-auto py-6 flex justify-center gap-4 scale-90 text-sm *:text-default-400 dark:*:text-default-500">
          <Link href={url('/about')}>{t('About')}</Link>
          <Link href={url('/terms')}>{t('Terms')}</Link>
          <Link href={url('/privacy')}>{t('Privacy')}</Link>
          {/* Open Source */}
          <Link
            href="https://github.com/codename-co/devs"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center"
          >
            <Icon name="GitHub" size="sm" className="me-1" />
            {t('Open Source')}
          </Link>
        </footer>
      </DefaultLayout>

      {hasSetupData && setupData && (
        <EasySetupModal
          isOpen={true}
          onClose={clearSetupData}
          setupData={setupData}
          onSetupComplete={clearSetupData}
        />
      )}
    </div>
  )
}
