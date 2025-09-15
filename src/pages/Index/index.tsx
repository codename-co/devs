import { useI18n } from '@/i18n'
import { Icon, PromptArea, Section, Title } from '@/components'
import { EasySetupModal } from '@/components/EasySetup/EasySetupModal'
import DefaultLayout from '@/layouts/Default'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Agent } from '@/types'
import { useTaskStore } from '@/stores/taskStore'
import { errorToast } from '@/lib/toast'
import { useBackgroundImage } from '@/hooks/useBackgroundImage'
import { useEasySetup } from '@/hooks/useEasySetup'
import { Alert } from '@heroui/react'
import { motion } from 'framer-motion'
import { motionVariants } from './motion'

export const IndexPage = () => {
  const { lang, url, t } = useI18n()
  const navigate = useNavigate()
  const [prompt, setPrompt] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])

  const { createTaskWithRequirements } = useTaskStore()
  const { backgroundImage, backgroundLoaded, isDragOver, dragHandlers } =
    useBackgroundImage()
  const { hasSetupData, setupData, clearSetupData } = useEasySetup()

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

        <Section mainClassName="text-center relative">
          <motion.div
            layoutId="active"
            className="flex flex-col items-center"
            {...motionVariants.container}
          >
            <motion.div {...motionVariants.icon}>
              <Icon
                size="4xl"
                name="SparksSolid"
                className="mb-4 sm:my-6 text-primary-200 dark:text-primary-700"
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
