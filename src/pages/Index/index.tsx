import { useI18n } from '@/i18n'
import {
  AgentCard,
  Container,
  Icon,
  PromptArea,
  Section,
  Title,
} from '@/components'
import { EasySetupModal } from '@/components/EasySetup/EasySetupModal'
import DefaultLayout from '@/layouts/Default'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Agent } from '@/types'
import { useTaskStore } from '@/stores/taskStore'
import { errorToast } from '@/lib/toast'
import { useBackgroundImage } from '@/hooks/useBackgroundImage'
import { useEasySetup } from '@/hooks/useEasySetup'
import { Alert } from '@heroui/react'
import { motion } from 'framer-motion'
import { motionVariants } from './motion'
import { getAgentsByCategory } from '@/stores/agentStore'
// import { loadAllMethodologies } from '@/stores/methodologiesStore'
// import type { Methodology } from '@/types/methodology.types'

export const IndexPage = () => {
  const { lang, url, t } = useI18n()
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
        setAgents(
          allAgents
            .filter((agent) => agent.id !== 'devs')
            // .filter((agent) => !agent.id.startsWith('custom-'))
            .sort(() => Math.random() - 0.5)
            .slice(0, 12),
        )
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

  const onSubmit = async () => {
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
      className="relative min-h-screen"
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
            className="flex flex-col items-center mt-0 sm:mt-[10vh]"
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
              onValueChange={setPrompt}
              onSend={onSubmit}
              isSending={isSending}
              selectedAgent={selectedAgent}
              onAgentChange={setSelectedAgent}
              onFilesChange={setSelectedFiles}
            />
          </motion.div>
        </Section>

        {/* Agents Section */}
        <motion.div {...motionVariants.agentSection}>
          <Section mainClassName="bg-default-50">
            {!isLoadingAgents && (
              <motion.div {...motionVariants.agentCards}>
                <Container>
                  {/* <Title level={3} size="lg" className="text-gray-600">
                {t('Agents')}
              </Title> */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {agents.map((agent) => (
                      <AgentCard
                        key={agent.id}
                        id={agent.id}
                        onPress={() =>
                          setSelectedAgent(
                            selectedAgent?.id === agent.id ? null : agent,
                          )
                        }
                      />
                    ))}
                  </div>
                </Container>
              </motion.div>
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
          </Section>
        </motion.div>
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
