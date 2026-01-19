import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  RadioGroup,
  Radio,
  Spinner,
  Chip,
  Tooltip,
} from '@heroui/react'

import DefaultLayout from '@/layouts/Default'
import { Container, Section, Icon, Title, PromptArea } from '@/components'
import { useI18n, useUrl } from '@/i18n'
import type { HeaderProps, IconName } from '@/lib/types'
import type { ExtensionType } from '../types'
import { generateExtension } from '../extension-generator'
import localI18n from './i18n'

/**
 * New Extension Page
 *
 * Allows users to create custom extensions using AI generation.
 * Users select an extension type and provide a description,
 * then the AI generates a schema-compliant extension.
 */

// Extension type metadata for display
const EXTENSION_TYPES: {
  type: ExtensionType
  icon: IconName
  label: string
  description: string
  example: string
  disable?: true
}[] = [
  {
    type: 'app',
    icon: 'CubeScan',
    label: 'App',
    description: 'Full UI applications with interactive pages',
    example:
      'A pomodoro timer app, a habit tracker, a mood journal with charts',
  },
  {
    type: 'agent',
    icon: 'User',
    label: 'Agent',
    description: 'AI agents with specialized instructions and personality',
    example:
      'A code reviewer agent, a writing coach, a data analysis specialist',
    disable: true,
  },
  {
    type: 'connector',
    icon: 'Puzzle',
    label: 'Connector',
    description: 'Integrations with external services and APIs',
    example: 'A GitHub integration, a Slack connector, a weather data provider',
    disable: true,
  },
  {
    type: 'tool',
    icon: 'Settings',
    label: 'Tool',
    description: 'Utility functions that agents can use',
    example:
      'A URL shortener, a JSON formatter, a unit converter, a calculator',
    disable: true,
  },
]

export function NewExtensionPage() {
  const { lang, t } = useI18n(localI18n)
  const url = useUrl(lang)
  const navigate = useNavigate()

  const [selectedType, setSelectedType] = useState<ExtensionType>('app')
  const [prompt, setPrompt] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const header: HeaderProps = {
    icon: {
      name: 'Code',
      color: 'text-warning-400 dark:text-warning-500',
    },
    title: t('Create Extension'),
    subtitle: t('Generate a custom extension using AI'),
  }

  const selectedTypeInfo = EXTENSION_TYPES.find((t) => t.type === selectedType)

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError(t('Please provide a description for your extension'))
      return
    }

    setIsGenerating(true)
    setError(null)

    try {
      const result = await generateExtension({
        type: selectedType,
        prompt: prompt.trim(),
      })

      if (result.success && result.extension) {
        // Navigate to the extension editor for refinement
        navigate(`/marketplace/edit/${result.extension.id}?new=true`)
      } else {
        setError(result.error || t('Failed to generate extension'))
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t('Failed to generate extension'),
      )
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <DefaultLayout header={header}>
      <Section>
        <Container className="max-w-3xl">
          {/* Hero Section */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-warning-100 to-warning-50 dark:from-warning-900/30 dark:to-warning-950/20 p-8 mb-8">
            <div className="relative z-10">
              <Title level={2}>{t('Build with AI')}</Title>
              <p className="text-default-600 dark:text-default-400 mt-2">
                {t(
                  'Describe what you want to create and let AI generate a fully functional extension for you.',
                )}
              </p>
            </div>
            <div className="absolute top-0 right-0 w-48 h-48 opacity-10 dark:opacity-5">
              <Icon name="Sparks" className="w-full h-full" />
            </div>
          </div>

          {/* Step 1: Select Type */}
          <Card className="mb-6">
            <CardHeader className="gap-3">
              <Chip color="warning" variant="flat" size="sm">
                {t('Step 1')}
              </Chip>
              <span className="font-semibold">
                {t('Choose extension type')}
              </span>
            </CardHeader>
            <CardBody>
              <RadioGroup
                value={selectedType}
                onValueChange={(value) =>
                  setSelectedType(value as ExtensionType)
                }
                orientation="horizontal"
                classNames={{
                  wrapper: 'grid grid-cols-2 md:grid-cols-4 gap-4',
                }}
              >
                {EXTENSION_TYPES.map((typeInfo) => (
                  <Tooltip
                    key={typeInfo.type}
                    content={typeInfo.description}
                    placement="top"
                  >
                    <Radio
                      value={typeInfo.type}
                      isDisabled={typeInfo.disable}
                      classNames={{
                        base: 'inline-flex m-0 bg-content1 hover:bg-content2 items-center justify-between flex-row-reverse max-w-[200px] cursor-pointer rounded-lg gap-4 p-4 border-2 border-transparent data-[selected=true]:border-warning',
                        label: 'w-full',
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-warning-100 dark:bg-warning-900/30">
                          <Icon
                            name={typeInfo.icon}
                            className="text-warning-600 dark:text-warning-400"
                          />
                        </div>
                        <div>
                          <div className="font-medium">{typeInfo.label}</div>
                        </div>
                      </div>
                    </Radio>
                  </Tooltip>
                ))}
              </RadioGroup>

              {selectedTypeInfo && (
                <div className="mt-4 p-3 rounded-lg bg-default-100 dark:bg-default-50">
                  <div className="text-sm text-default-600 dark:text-default-400">
                    <span className="font-medium">{t('Examples')}: </span>
                    {selectedTypeInfo.example}
                  </div>
                </div>
              )}
            </CardBody>
          </Card>

          {/* Step 2: Describe Your Extension */}
          <Card className="mb-6">
            <CardHeader className="gap-3">
              <Chip color="warning" variant="flat" size="sm">
                {t('Step 2')}
              </Chip>
              <span className="font-semibold">
                {t('Describe your extension')}
              </span>
            </CardHeader>
            <CardBody>
              <PromptArea
                lang={lang}
                placeholder={t(
                  'Describe what your extension should do, its features, and how it should look...',
                )}
                value={prompt}
                onValueChange={setPrompt}
                minRows={5}
                maxRows={10}
                withAgentSelector={false}
                onSubmit={handleGenerate}
              />

              <div className="mt-4 text-sm text-default-500">
                <p className="font-medium mb-2">
                  {t('Tips for better results')}:
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>{t('Be specific about the features you want')}</li>
                  <li>{t('Mention any UI preferences (colors, layout)')}</li>
                  <li>{t('Include example use cases')}</li>
                  <li>{t('Describe the target users')}</li>
                </ul>
              </div>
            </CardBody>
          </Card>

          {/* Error Display */}
          {error && (
            <div className="mb-6 p-4 rounded-lg bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800">
              <div className="flex items-center gap-2 text-danger-600 dark:text-danger-400">
                <Icon name="WarningTriangle" />
                <span>{error}</span>
              </div>
            </div>
          )}

          {/* Generate Button */}
          <div className="flex flex-col items-end gap-3">
            <div className="flex gap-4">
              <Button
                variant="flat"
                onPress={() => navigate('/marketplace')}
                isDisabled={isGenerating}
              >
                {t('Cancel')}
              </Button>
              <Button
                color="warning"
                variant="shadow"
                startContent={
                  isGenerating ? (
                    <Spinner size="sm" color="current" />
                  ) : (
                    <Icon name="Sparks" />
                  )
                }
                onPress={handleGenerate}
                isDisabled={isGenerating || !prompt.trim()}
              >
                {isGenerating ? t('Generating...') : t('Generate Extension')}
              </Button>
            </div>
            <button
              type="button"
              onClick={() => navigate(url('/marketplace/edit/new'))}
              className="text-sm text-default-400 hover:text-default-600 dark:hover:text-default-300 transition-colors"
            >
              {t('or create manually')}
            </button>
          </div>

          {/* Generating State */}
          {isGenerating && (
            <div className="mt-8 text-center">
              <div className="inline-flex items-center gap-3 px-6 py-4 rounded-xl bg-warning-50 dark:bg-warning-900/20">
                <Spinner size="md" color="warning" />
                <div className="text-left">
                  <p className="font-medium">
                    {t('Creating your extension...')}
                  </p>
                  <p className="text-sm text-default-500">
                    {t('This may take a few seconds')}
                  </p>
                </div>
              </div>
            </div>
          )}
        </Container>
      </Section>
    </DefaultLayout>
  )
}

export default NewExtensionPage
