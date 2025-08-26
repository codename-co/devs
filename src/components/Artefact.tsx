import { useState, useEffect } from 'react'
import {
  Button,
  Chip,
  ScrollShadow,
  Badge,
  Tooltip,
  ButtonGroup,
} from '@heroui/react'
import clsx from 'clsx'

import { useI18n } from '@/i18n'
import { Icon } from './Icon'
import { MarkdownRenderer } from './MarkdownRenderer'
import type { Artifact as IArtifact } from '@/types'

interface ArtifactProps {
  artifacts: IArtifact[]
  selectedArtifactId?: string
  onArtifactSelect: (artifactId: string | null) => void
  isMinimized: boolean
  onMinimize: () => void
  onExpand: () => void
  className?: string
}

export const Artifact = ({
  artifacts,
  selectedArtifactId,
  onArtifactSelect,
  isMinimized,
  onMinimize,
  onExpand,
  className,
}: ArtifactProps) => {
  const { t } = useI18n()
  const [currentIndex, setCurrentIndex] = useState(0)

  // Update current index when selectedArtifactId changes
  useEffect(() => {
    if (selectedArtifactId && artifacts.length > 0) {
      const index = artifacts.findIndex((a) => a.id === selectedArtifactId)
      if (index !== -1) {
        setCurrentIndex(index)
      }
    }
  }, [selectedArtifactId, artifacts])

  // Get current artifact
  const currentArtifact = artifacts[currentIndex]

  // Helper function to get artifact type color
  const getArtifactTypeColor = (type: IArtifact['type']) => {
    switch (type) {
      case 'document':
        return 'primary'
      case 'code':
        return 'secondary'
      case 'design':
        return 'success'
      case 'analysis':
        return 'warning'
      case 'plan':
        return 'danger'
      case 'report':
        return 'default'
      default:
        return 'default'
    }
  }

  // Helper function to get artifact status color
  const getArtifactStatusColor = (status: IArtifact['status']) => {
    switch (status) {
      case 'final':
        return 'success'
      case 'approved':
        return 'success'
      case 'review':
        return 'warning'
      case 'rejected':
        return 'danger'
      case 'draft':
        return 'default'
      default:
        return 'default'
    }
  }

  // Helper function to get artifact type icon
  const getArtifactTypeIcon = (type: IArtifact['type']) => {
    switch (type) {
      case 'document':
        return 'Document'
      case 'code':
        return 'Code'
      case 'design':
        return 'Palette'
      case 'analysis':
        return 'BarChart'
      case 'plan':
        return 'Task'
      case 'report':
        return 'Document'
      default:
        return 'PagePlus'
    }
  }

  // Navigation functions
  const navigateToPrevious = () => {
    if (artifacts.length > 0) {
      const newIndex =
        currentIndex > 0 ? currentIndex - 1 : artifacts.length - 1
      setCurrentIndex(newIndex)
      onArtifactSelect(artifacts[newIndex]?.id || null)
    }
  }

  const navigateToNext = () => {
    if (artifacts.length > 0) {
      const newIndex =
        currentIndex < artifacts.length - 1 ? currentIndex + 1 : 0
      setCurrentIndex(newIndex)
      onArtifactSelect(artifacts[newIndex]?.id || null)
    }
  }

  if (artifacts.length === 0) {
    return null
  }

  return (
    <aside
      className={clsx(
        'transition-all duration-300 ease-in-out',
        'border border-default-200 dark:border-default-300 rounded-lg',
        'bg-gray-50 dark:bg-content1 backdrop-blur-md overflow-hidden',
        isMinimized ? 'w-48' : '',
        className,
      )}
    >
      {/* Minimized view */}
      {isMinimized && (
        <div className="h-full flex items-center justify-between p-4">
          <div className="flex items-center gap-2">
            <Icon
              name={
                getArtifactTypeIcon(currentArtifact?.type || 'document') as any
              }
              className="w-5 h-5 text-default-500"
            />
            <span className="text-small font-medium text-default-600">
              {t('Artifacts')} ({artifacts.length})
            </span>
          </div>
          <Tooltip content={t('Expand artifacts panel')} placement="left">
            <Button
              isIconOnly
              variant="light"
              size="sm"
              onPress={onExpand}
              aria-label={t('Expand artifacts panel')}
            >
              <Icon name="SidebarExpand" className="w-4 h-4" />
            </Button>
          </Tooltip>
        </div>
      )}

      {/* Expanded view */}
      {!isMinimized && (
        <div className="flex flex-col max-h-screen">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-default-200 dark:border-default-300 flex-shrink-0">
            <div className="flex items-center gap-2">
              <Icon name="Page" className="w-8 h-8 text-primary" />
              <h3 className="text-lg font-semibold">{currentArtifact.title}</h3>
              <Badge content={artifacts.length} color="primary" size="sm">
                <div className="w-4 h-4" />
              </Badge>
            </div>

            <div className="flex items-center gap-1">
              {/* Navigation controls */}
              {artifacts.length > 1 && (
                <ButtonGroup size="sm" variant="light">
                  <Tooltip content={t('Previous artifact')} placement="bottom">
                    <Button
                      isIconOnly
                      onPress={navigateToPrevious}
                      isDisabled={artifacts.length <= 1}
                    >
                      <Icon name="ChevronLeft" className="w-4 h-4" />
                    </Button>
                  </Tooltip>
                  <Button
                    variant="flat"
                    size="sm"
                    className="min-w-fit px-2"
                    isDisabled
                  >
                    {currentIndex + 1} / {artifacts.length}
                  </Button>
                  <Tooltip content={t('Next artifact')} placement="bottom">
                    <Button
                      isIconOnly
                      onPress={navigateToNext}
                      isDisabled={artifacts.length <= 1}
                    >
                      <Icon name="ChevronRight" className="w-4 h-4" />
                    </Button>
                  </Tooltip>
                </ButtonGroup>
              )}

              <Tooltip
                content={t('Minimize artifacts panel')}
                placement="bottom"
              >
                <Button
                  isIconOnly
                  variant="light"
                  size="sm"
                  onPress={onMinimize}
                  aria-label={t('Minimize artifacts panel')}
                >
                  <Icon name="SidebarCollapse" className="w-4 h-4" />
                </Button>
              </Tooltip>
            </div>
          </div>

          {/* Content */}
          <ScrollShadow className="flex-1 p-4 overflow-y-auto">
            {currentArtifact ? (
              <>
                <div className="flex flex-col w-full">
                  <div className="flex flex-wrap gap-2">
                    <Chip
                      size="sm"
                      color={getArtifactTypeColor(currentArtifact.type)}
                      variant="flat"
                    >
                      {currentArtifact.type}
                    </Chip>
                    <Chip
                      size="sm"
                      color={getArtifactStatusColor(currentArtifact.status)}
                      variant="flat"
                    >
                      {currentArtifact.status}
                    </Chip>
                    <Chip size="sm" variant="flat">
                      v{currentArtifact.version}
                    </Chip>
                  </div>
                </div>

                <div className="overflow-y-auto">
                  {currentArtifact.format === 'markdown' ? (
                    <MarkdownRenderer
                      content={currentArtifact.content}
                      className="prose dark:prose-invert prose-sm max-w-none"
                    />
                  ) : currentArtifact.format === 'code' ? (
                    <pre className="bg-default-100 rounded-lg p-3 text-small overflow-x-auto">
                      <code>{currentArtifact.content}</code>
                    </pre>
                  ) : (
                    <div className="bg-default-50 rounded-lg p-3 text-small">
                      {currentArtifact.content}
                    </div>
                  )}
                </div>

                {/* Metadata */}
                <div className="space-y-3">
                  {currentArtifact.dependencies.length > 0 && (
                    <div>
                      <span className="font-semibold text-default-600 text-tiny">
                        {t('Dependencies')}:
                      </span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {currentArtifact.dependencies.map((depId) => (
                          <Chip key={depId} size="sm" variant="bordered">
                            {depId.slice(-8)}
                          </Chip>
                        ))}
                      </div>
                    </div>
                  )}

                  {currentArtifact.validates.length > 0 && (
                    <div>
                      <span className="font-semibold text-default-600 text-tiny">
                        {t('Validates Requirements')}:
                      </span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {currentArtifact.validates.map((reqId) => (
                          <Chip
                            key={reqId}
                            size="sm"
                            variant="bordered"
                            color="success"
                          >
                            {reqId.slice(-8)}
                          </Chip>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-32 text-center">
                <Icon
                  name="PagePlus"
                  className="w-8 h-8 text-default-400 mb-2"
                />
                <p className="text-default-500">{t('No artifact selected')}</p>
              </div>
            )}
          </ScrollShadow>

          {/* Footer with artifact list when multiple artifacts */}
          {artifacts.length > 1 && (
            <div className="border-t border-default-200 dark:border-default-300 p-2 flex-shrink-0">
              <ScrollShadow orientation="horizontal" className="max-w-full">
                <div className="flex gap-2 p-2">
                  {artifacts.map((artifact, index) => (
                    <Tooltip
                      key={artifact.id}
                      content={artifact.title}
                      placement="top"
                    >
                      <Button
                        size="sm"
                        variant={index === currentIndex ? 'solid' : 'light'}
                        color={index === currentIndex ? 'primary' : 'default'}
                        onPress={() => {
                          setCurrentIndex(index)
                          onArtifactSelect(artifact.id)
                        }}
                        className="min-w-fit px-2"
                      >
                        <Icon
                          name={getArtifactTypeIcon(artifact.type) as any}
                          className="w-4 h-4"
                        />
                      </Button>
                    </Tooltip>
                  ))}
                </div>
              </ScrollShadow>
            </div>
          )}
        </div>
      )}
    </aside>
  )
}
