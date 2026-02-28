import { memo, useCallback } from 'react'
import { Button, Card, CardBody, Chip } from '@heroui/react'

import { Icon, MarkdownRenderer } from '@/components'
import type { Artifact as ArtifactType } from '@/types'
import { openInspector } from '@/stores/inspectorPanelStore'

export const ArtifactCard = memo(
  ({ artifact, onPress }: { artifact: ArtifactType; onPress?: () => void }) => {
    const statusColor =
      artifact.status === 'approved' || artifact.status === 'final'
        ? 'success'
        : artifact.status === 'rejected'
          ? 'danger'
          : 'warning'

    const handleOpen = useCallback(
      () =>
        onPress ? onPress() : openInspector({ type: 'artifact', artifact }),
      [artifact, onPress],
    )

    const handleDownload = useCallback(() => {
      const ext = artifact.format === 'markdown' ? 'md' : artifact.format
      const mimeMap: Record<string, string> = {
        markdown: 'text/markdown',
        json: 'application/json',
        code: 'text/plain',
        html: 'text/html',
        binary: 'application/octet-stream',
      }
      const blob = new Blob([artifact.content], {
        type: mimeMap[artifact.format] || 'text/plain',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${artifact.title}.${ext}`
      a.click()
      URL.revokeObjectURL(url)
    }, [artifact])

    if (artifact.format === 'markdown') {
      return (
        <Card
          isPressable
          onPress={handleOpen}
          shadow="none"
          className="border border-default-200 bg-default-50 hover:bg-default-100"
        >
          <CardBody className="flex flex-row items-center gap-2 sm:gap-3 p-2 sm:p-3">
            <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-medium bg-default-100 shrink-0">
              <Icon name="Page" size="md" className="text-default-500" />
            </div>
            <div className="flex flex-col min-w-0 flex-1 overflow-hidden">
              <span className="font-medium text-xs sm:text-sm truncate">
                {artifact.title}
              </span>
              <span className="text-tiny text-default-400 uppercase">
                Markdown
              </span>
            </div>
            <Button
              size="sm"
              variant="light"
              isIconOnly
              aria-label="Download artifact"
              className="shrink-0"
              onPress={handleDownload}
            >
              <Icon name="Download" size="sm" className="text-default-400" />
            </Button>
          </CardBody>
        </Card>
      )
    }

    return (
      <Card className="shadow-sm">
        <CardBody className="p-2 sm:p-3">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start w-full mb-2 gap-1 sm:gap-2">
            <div className="flex flex-col items-start min-w-0">
              <span className="font-medium text-xs sm:text-sm truncate max-w-full">
                {artifact.title}
              </span>
              <div className="flex flex-wrap gap-1 sm:gap-2 mt-1">
                <Chip
                  size="sm"
                  variant="flat"
                  color={statusColor}
                  className="text-tiny"
                >
                  {artifact.status}
                </Chip>
                <Chip
                  size="sm"
                  variant="flat"
                  color="default"
                  className="text-tiny"
                >
                  {artifact.type}
                </Chip>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-tiny text-default-500">
                {artifact.content.length.toLocaleString()} chars
              </span>
              <Button
                size="sm"
                variant="light"
                isIconOnly
                aria-label="Expand artifact"
                onPress={handleOpen}
              >
                <Icon name="Expand" size="sm" className="text-default-500" />
              </Button>
            </div>
          </div>
          {artifact.description && (
            <p className="text-small text-default-600 mb-2">
              {artifact.description}
            </p>
          )}
          <div className="p-1.5 sm:p-2 bg-default-100 rounded-small max-h-36 sm:max-h-48 overflow-y-auto">
            <MarkdownRenderer
              content={artifact.content}
              className="prose dark:prose-invert prose-sm text-small"
            />
          </div>
          <div className="flex flex-wrap justify-between text-tiny text-default-500 mt-2 gap-1">
            <span>
              Created: {new Date(artifact.createdAt).toLocaleDateString()}
            </span>
            <span>v{artifact.version}</span>
          </div>
        </CardBody>
      </Card>
    )
  },
)

ArtifactCard.displayName = 'ArtifactCard'
