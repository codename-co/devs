import { useState, useCallback } from 'react'
import {
  Card,
  CardBody,
  Button,
  Chip,
  Tabs,
  Tab,
  Input,
  Textarea,
} from '@heroui/react'
import {
  Upload,
  Check,
  WarningTriangle,
  Page,
  Code,
  CloudUpload,
  Folder,
} from 'iconoir-react'

import DefaultLayout from '@/layouts/Default'
import { Container, Section } from '@/components'
import { useI18n } from '@/i18n'
import type { HeaderProps } from '@/lib/types'
import localI18n from './i18n'

/**
 * Publish Page
 *
 * Interface for creating and publishing new extensions to the marketplace.
 * Supports:
 * - Uploading YAML extension files
 * - Schema validation
 * - Publishing workflow
 *
 * Currently shows a placeholder as the marketplace is under development.
 */
export function PublishPage() {
  const { t } = useI18n(localI18n)
  const [activeTab, setActiveTab] = useState<'upload' | 'create'>('upload')
  const [isDragOver, setIsDragOver] = useState(false)

  const header: HeaderProps = {
    icon: {
      name: 'Upload',
      color: 'text-secondary-400 dark:text-secondary-500',
    },
    title: t('Publish Extension'),
    subtitle: t('Share your extension with the community'),
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    // TODO: Handle file drop when marketplace is implemented
  }, [])

  return (
    <DefaultLayout header={header}>
      <Section>
        <Container>
          {/* Coming Soon Banner */}
          <Card className="mb-8 border border-warning-200 dark:border-warning-800 bg-warning-50 dark:bg-warning-900/20">
            <CardBody className="py-4">
              <div className="flex items-center gap-3">
                <WarningTriangle className="w-5 h-5 text-warning-500 flex-shrink-0" />
                <div>
                  <span className="font-medium text-warning-700 dark:text-warning-400">
                    {t('Coming Soon')}
                  </span>
                  <span className="text-warning-600 dark:text-warning-500 ml-2">
                    {t('The DEVS Marketplace is under development')}. Publishing
                    will be available soon.
                  </span>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Form */}
            <div className="lg:col-span-2">
              <Card className="border border-default-200 dark:border-default-800">
                <CardBody className="p-6">
                  <Tabs
                    selectedKey={activeTab}
                    onSelectionChange={(key) =>
                      setActiveTab(key as 'upload' | 'create')
                    }
                    className="mb-6"
                  >
                    <Tab
                      key="upload"
                      title={
                        <div className="flex items-center gap-2">
                          <Upload className="w-4 h-4" />
                          <span>{t('Upload Extension')}</span>
                        </div>
                      }
                    />
                    <Tab
                      key="create"
                      title={
                        <div className="flex items-center gap-2">
                          <Code className="w-4 h-4" />
                          <span>{t('Create New Extension')}</span>
                        </div>
                      }
                    />
                  </Tabs>

                  {activeTab === 'upload' && (
                    <div className="space-y-6">
                      {/* Drop Zone */}
                      <div
                        className={`
                          border-2 border-dashed rounded-xl p-12 text-center
                          transition-colors cursor-pointer
                          ${
                            isDragOver
                              ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                              : 'border-default-300 dark:border-default-700 hover:border-default-400'
                          }
                        `}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                      >
                        <div className="flex flex-col items-center">
                          <div className="p-4 rounded-full bg-default-100 dark:bg-default-800 mb-4">
                            <CloudUpload className="w-8 h-8 text-default-500" />
                          </div>
                          <p className="text-default-900 font-medium mb-1">
                            {t('Drop your extension file here')}
                          </p>
                          <p className="text-sm text-default-500 mb-4">
                            {t('Upload a .yaml or .devs file')}
                          </p>
                          <Button
                            color="primary"
                            variant="flat"
                            startContent={<Folder className="w-4 h-4" />}
                            isDisabled
                          >
                            {t('Or browse files')}
                          </Button>
                        </div>
                      </div>

                      {/* Supported formats */}
                      <div className="text-sm text-default-500">
                        <p className="font-medium mb-2">Supported formats:</p>
                        <div className="flex flex-wrap gap-2">
                          <Chip size="sm" variant="flat">
                            .agent.yaml
                          </Chip>
                          <Chip size="sm" variant="flat">
                            .tool.yaml
                          </Chip>
                          <Chip size="sm" variant="flat">
                            .connector.yaml
                          </Chip>
                          <Chip size="sm" variant="flat">
                            .app.yaml
                          </Chip>
                          <Chip size="sm" variant="flat">
                            .devs
                          </Chip>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'create' && (
                    <div className="space-y-6">
                      <Input
                        label="Extension Name"
                        placeholder="My Awesome Extension"
                        isDisabled
                      />
                      <Textarea
                        label="Description"
                        placeholder="Describe what your extension does..."
                        minRows={3}
                        isDisabled
                      />
                      <div className="grid grid-cols-2 gap-4">
                        <Input label="Version" placeholder="1.0.0" isDisabled />
                        <Input
                          label="Author"
                          placeholder="Your name"
                          isDisabled
                        />
                      </div>
                      <Textarea
                        label="Extension Definition (YAML)"
                        placeholder="# Paste your extension YAML here..."
                        minRows={10}
                        className="font-mono"
                        isDisabled
                      />
                    </div>
                  )}

                  <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-default-200">
                    <Button variant="flat" isDisabled>
                      {t('Validate')}
                    </Button>
                    <Button color="primary" isDisabled>
                      {t('Publish')}
                    </Button>
                  </div>
                </CardBody>
              </Card>
            </div>

            {/* Right Column - Info */}
            <div className="space-y-6">
              {/* Publishing Guidelines */}
              <Card className="border border-default-200 dark:border-default-800">
                <CardBody className="p-6">
                  <h3 className="font-semibold text-default-900 mb-4">
                    Publishing Guidelines
                  </h3>
                  <ul className="space-y-3 text-sm text-default-600">
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-success-500 mt-0.5 flex-shrink-0" />
                      <span>
                        Follow the YAML schema for your extension type
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-success-500 mt-0.5 flex-shrink-0" />
                      <span>Include clear descriptions and documentation</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-success-500 mt-0.5 flex-shrink-0" />
                      <span>Specify all required permissions</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-success-500 mt-0.5 flex-shrink-0" />
                      <span>Test your extension locally before publishing</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-success-500 mt-0.5 flex-shrink-0" />
                      <span>Use semantic versioning (e.g., 1.0.0)</span>
                    </li>
                  </ul>
                </CardBody>
              </Card>

              {/* Schema Documentation */}
              <Card className="border border-default-200 dark:border-default-800">
                <CardBody className="p-6">
                  <h3 className="font-semibold text-default-900 mb-4">
                    Schema Documentation
                  </h3>
                  <div className="space-y-2">
                    <Button
                      variant="flat"
                      size="sm"
                      className="w-full justify-start"
                      startContent={<Page className="w-4 h-4" />}
                      as="a"
                      href="/docs/MARKETPLACE.md"
                      isDisabled
                    >
                      App Schema
                    </Button>
                    <Button
                      variant="flat"
                      size="sm"
                      className="w-full justify-start"
                      startContent={<Page className="w-4 h-4" />}
                      isDisabled
                    >
                      Agent Schema
                    </Button>
                    <Button
                      variant="flat"
                      size="sm"
                      className="w-full justify-start"
                      startContent={<Page className="w-4 h-4" />}
                      isDisabled
                    >
                      Connector Schema
                    </Button>
                    <Button
                      variant="flat"
                      size="sm"
                      className="w-full justify-start"
                      startContent={<Page className="w-4 h-4" />}
                      isDisabled
                    >
                      Tool Schema
                    </Button>
                  </div>
                </CardBody>
              </Card>

              {/* My Extensions */}
              <Card className="border border-default-200 dark:border-default-800">
                <CardBody className="p-6">
                  <h3 className="font-semibold text-default-900 mb-4">
                    {t('My extensions')}
                  </h3>
                  <p className="text-sm text-default-500">
                    {t('No extensions found')}.{' '}
                    {t('Be the first to publish an extension!')}
                  </p>
                </CardBody>
              </Card>
            </div>
          </div>
        </Container>
      </Section>
    </DefaultLayout>
  )
}

export default PublishPage
