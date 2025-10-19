import { useI18n } from '@/i18n'
import { Container, Icon, PromptArea, Section, Title } from '@/components'
import { EasySetupModal } from '@/components/EasySetup/EasySetupModal'
import DefaultLayout from '@/layouts/Default'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Agent } from '@/types'
import { useTaskStore } from '@/stores/taskStore'
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
} from '@heroui/react'
import { motion } from 'framer-motion'
import { motionVariants } from './motion'
import { getAgentsByCategory } from '@/stores/agentStore'
// import { loadAllMethodologies } from '@/stores/methodologiesStore'
// import type { Methodology } from '@/types/methodology.types'
import localeI18n from './i18n'
import { agentThemeIcon, useCasesByThemes } from '@/lib/agents'
import { PRODUCT } from '@/config/product'

export const IndexPage = () => {
  const { lang, url, t } = useI18n(localeI18n)
  const navigate = useNavigate()
  const [prompt, setPrompt] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  // const [methodologies, setMethodologies] = useState<Methodology[]>([])
  const [isLoadingAgents, setIsLoadingAgents] = useState(true)
  // const [isLoadingMethodologies, setIsLoadingMethodologies] = useState(true)

  const { createTaskWithRequirements } = useTaskStore()
  const { backgroundImage, backgroundLoaded, isDragOver, dragHandlers } =
    useBackgroundImage()
  const { hasSetupData, setupData, clearSetupData } = useEasySetup()

  // PWA install prompt
  usePWAInstallPrompt({
    title: t('Install {productName}', { productName: PRODUCT.displayName }),
    description: t(
      'Install this app on your device for a better experience and offline access.',
    ),
  })

  // Load agents and methodologies on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoadingAgents(true)
        const { agentsByCategory, orderedCategories } =
          await getAgentsByCategory(lang)
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

  const onSubmitToAgent = async () => {
    if (!prompt.trim() || isSending) return

    setIsSending(true)

    // Determine which agent to use (default to 'devs' if none selected)
    const agent = selectedAgent || { id: 'devs' }

    // Store prompt, agent, and files in sessionStorage for AgentRunPage to pick up
    sessionStorage.setItem('pendingPrompt', prompt)
    sessionStorage.setItem('pendingAgent', JSON.stringify(agent))
    if (selectedFiles.length > 0) {
      // Convert files to base64 for storage
      const filesData = await Promise.all(
        selectedFiles.map(async (file) => ({
          name: file.name,
          type: file.type,
          size: file.size,
          data: await fileToBase64(file),
        })),
      )
      sessionStorage.setItem('pendingFiles', JSON.stringify(filesData))
    }

    // Navigate to the agent run page
    navigate(url(`/agents/run#${agent.id}`))

    // Clear the prompt and files
    setPrompt('')
    setSelectedFiles([])
    setIsSending(false)
  }

  const onSubmitTask = async () => {
    if (!prompt.trim() || isSending) return

    setIsSending(true)

    try {
      // Determine which agent to use (default to 'devs' if none selected)
      const agent = selectedAgent || { id: 'devs' }

      // Convert files to TaskAttachment format
      const attachments = await Promise.all(
        selectedFiles.map(async (file) => ({
          name: file.name,
          type: file.type,
          size: file.size,
          data: await fileToBase64(file),
        })),
      )

      // Create a task with the user's prompt
      const task = await createTaskWithRequirements(
        {
          workflowId: crypto.randomUUID(), // Create a new workflow for this task
          title: prompt.length > 50 ? prompt.substring(0, 50) + '...' : prompt,
          description: prompt,
          attachments,
          complexity: 'complex', // Assume complex by default since it goes to orchestrator
          status: 'pending',
          assignedAgentId: agent.id,
          dependencies: [],
          artifacts: [],
          steps: [],
          estimatedPasses: 1,
          actualPasses: 0,
        },
        prompt, // User requirement for extracting specific requirements
      )

      // Clear the prompt and files
      setPrompt('')
      setSelectedFiles([])

      // Navigate to the task page
      navigate(url(`/tasks/${task.id}`))
    } catch (error) {
      console.error('Failed to create task:', error)
      errorToast('Failed to create task', error)
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
              <Icon
                size="4xl"
                name="DevsAnimated"
                animation="appear"
                className="mb-4 sm:my-6 text-blue-300 dark:text-white devs-icon-blur-on-out"
              />
            </motion.div>

            <motion.div {...motionVariants.title}>
              <Title
                subtitle={t('Delegate complex tasks to your own AI teams')}
              >
                {t('Let your agents take it from here')}
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
        </Section>
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
