import { memo, useCallback, useEffect, useState } from 'react'
import { Card, CardBody } from '@heroui/react'

import { Icon } from '@/components'
import { MarkdownRenderer } from '@/components/MarkdownRenderer'
import { detectSpecializedCodeType } from '@/components/Widget/Widget'
import type { Artifact } from '@/types'
import type { CodeBlockType } from '@/components/Widget/Widget'
import type { IconName } from '@/lib/types'
import { openInspector } from '@/stores/inspectorPanelStore'
import {
  generateWidgetCapture,
  getPersistedCapture,
  persistCapture,
} from '@/lib/widget-capture'

// ============================================================================
// Artifact capture helpers
// ============================================================================

const CODE_BLOCK_RE = /```(\w+)?\n([\s\S]*?)```/g

/**
 * Determine if an artifact's content can be rendered as a visual capture.
 * Returns the code to capture and the widget type, or null if not capturable.
 */
function getArtifactCapturable(
  artifact: Artifact,
): { code: string; widgetType: CodeBlockType } | null {
  // Direct HTML format
  if (artifact.format === 'html' && artifact.content) {
    return { code: artifact.content, widgetType: 'html' }
  }

  // Check if content itself looks like SVG
  const trimmed = artifact.content?.trim()
  if (trimmed?.startsWith('<svg') && trimmed.endsWith('</svg>')) {
    return { code: trimmed, widgetType: 'svg' }
  }

  // For markdown, extract the first renderable code block
  if (artifact.format === 'markdown' && artifact.content) {
    CODE_BLOCK_RE.lastIndex = 0
    let match: RegExpExecArray | null
    while ((match = CODE_BLOCK_RE.exec(artifact.content)) !== null) {
      const [, language, code] = match
      const widgetType = detectSpecializedCodeType(code, language)
      if (
        widgetType === 'html' ||
        widgetType === 'svg' ||
        widgetType === 'marpit' ||
        widgetType === 'abc'
      ) {
        return { code: code.trim(), widgetType }
      }
    }
  }

  return null
}

// ============================================================================
// Shared types & constants
// ============================================================================

export interface WidgetInfo {
  id: string
  title: string
  code: string
  widgetType: CodeBlockType
  language?: string
  agentName?: string
}

export type PreviewItem =
  | { kind: 'artifact'; artifact: Artifact }
  | { kind: 'widget'; widget: WidgetInfo }

const ARTIFACT_ICONS: Record<string, IconName> = {
  code: 'Terminal',
  document: 'Page',
  design: 'DesignPencil',
  analysis: 'Activity',
  plan: 'Strategy',
  report: 'Presentation',
}

const WIDGET_ICONS: Record<CodeBlockType, IconName> = {
  abc: 'MusicNoteSolid',
  svg: 'MediaImage',
  diagram: 'CubeScan',
  marpit: 'Presentation',
  html: 'Html5',
  generic: 'Code',
}

const WIDGET_LABELS: Record<CodeBlockType, string> = {
  abc: 'Score',
  svg: 'SVG',
  diagram: 'Diagram',
  marpit: 'Presentation',
  html: 'HTML',
  generic: 'Code',
}

// ============================================================================
// Component
// ============================================================================

/**
 * Generic artifact/widget preview card.
 *
 * - `layout="list"`      — compact horizontal row (default, for vertical lists)
 * - `layout="landscape"` — wider card with content preview, suited for grids
 */
export const ArtifactPreviewCard = memo(
  ({
    item,
    layout = 'list',
    onPress,
  }: {
    item: PreviewItem
    layout?: 'list' | 'landscape'
    onPress?: () => void
  }) => {
    const [preview, setPreview] = useState<string | null>(null)

    // Generate / load capture thumbnail for both widgets and artifacts
    useEffect(() => {
      let captureId: string
      let captureCode: string
      let captureType: CodeBlockType

      if (item.kind === 'widget') {
        captureId = item.widget.id
        captureCode = item.widget.code
        captureType = item.widget.widgetType
      } else {
        const capturable = getArtifactCapturable(item.artifact)
        if (!capturable) return
        captureId = `artifact-${item.artifact.id}`
        captureCode = capturable.code
        captureType = capturable.widgetType
      }

      const persisted = getPersistedCapture(captureId)
      if (persisted) {
        setPreview(persisted)
        return
      }
      let cancelled = false
      generateWidgetCapture(captureCode, captureType).then((dataUrl) => {
        if (cancelled || !dataUrl) return
        persistCapture(captureId, dataUrl)
        setPreview(dataUrl)
      })
      return () => {
        cancelled = true
      }
    }, [item])

    const handlePress = useCallback(() => {
      if (onPress) return onPress()
      if (item.kind === 'artifact') {
        openInspector({ type: 'artifact', artifact: item.artifact })
      } else {
        openInspector({
          type: 'widget',
          code: item.widget.code,
          widgetType: item.widget.widgetType,
          language: item.widget.language,
          title: item.widget.title,
        })
      }
    }, [item, onPress])

    // ----- Shared data extraction -----
    const title =
      item.kind === 'artifact' ? item.artifact.title : item.widget.title
    const icon: IconName =
      item.kind === 'artifact'
        ? (ARTIFACT_ICONS[item.artifact.type] ?? 'Page')
        : WIDGET_ICONS[item.widget.widgetType]
    const statusLabel =
      item.kind === 'artifact' ? item.artifact.status : undefined
    const typeLabel =
      item.kind === 'artifact'
        ? item.artifact.type
        : WIDGET_LABELS[item.widget.widgetType]

    // ---- Landscape card ----
    if (layout === 'landscape') {
      return (
        <div>
          <Card
            isPressable
            shadow="none"
            className="w-full border border-default-200 bg-default-50 hover:bg-default-100"
            onPress={handlePress}
          >
            <CardBody className="p-0 flex flex-col overflow-hidden">
              {/* Content preview pane */}
              <div className="w-full h-36 bg-default-100/50 overflow-hidden relative">
                {preview ? (
                  <img
                    src={preview}
                    alt=""
                    className="w-full h-full object-cover object-top"
                  />
                ) : item.kind === 'artifact' && item.artifact.content ? (
                  <div className="p-2 overflow-hidden h-full">
                    {item.artifact.format === 'markdown' ? (
                      <div className="text-[8px] leading-tight text-default-500 overflow-hidden h-full [&_*]:text-tiny [&_*]:!leading-tight">
                        <MarkdownRenderer
                          content={item.artifact.content.slice(0, 400)}
                          renderWidgets={false}
                        />
                      </div>
                    ) : (
                      <pre className="text-[8px] leading-tight text-default-500 whitespace-pre-wrap break-all overflow-hidden h-full">
                        {item.artifact.content.slice(0, 400)}
                      </pre>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <Icon name={icon} size="xl" className="text-default-300" />
                  </div>
                )}
              </div>
            </CardBody>
          </Card>

          {/* Title below the preview */}
          <h3 className="p-2 text-sm font-medium truncate" title={title}>
            {title}
          </h3>
        </div>
      )
    }

    // ---- List card (default, compact) ----
    return (
      <Card
        isPressable
        fullWidth
        shadow="none"
        className="border border-default-200 bg-default-50 hover:bg-default-100"
        onPress={handlePress}
      >
        <CardBody className="flex flex-row items-center gap-2 sm:gap-3 p-2 sm:p-3">
          {/* <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-medium bg-default-100 shrink-0">
            <Icon name={icon} size="md" className="text-default-500" />
          </div> */}
          {/* <div className="flex flex-col min-w-0 flex-1 overflow-hidden">
            <span className="font-medium text-xs sm:text-sm truncate">
              {title}
            </span>
            <span className="text-tiny text-default-400 truncate">
              {typeLabel}
              {item.kind === 'widget' && item.widget.agentName && (
                <span className="ml-1">— {item.widget.agentName}</span>
              )}
              {item.kind === 'artifact' && statusLabel && (
                <span className="ml-1">· {statusLabel}</span>
              )}
            </span>
          </div> */}
          {preview ? (
            <img
              src={preview}
              alt=""
              className="w-32 h-16 rounded-small object-cover object-top bg-default-100 shrink-0 -my-3"
            />
          ) : item.kind === 'artifact' && item.artifact.content ? (
            <div className="w-16 h-10 sm:w-24 sm:h-14 rounded-small bg-default-100 overflow-hidden shrink-0">
              {item.artifact.format === 'markdown' ? (
                <div className="text-[7px] leading-tight text-default-400 p-1 h-full overflow-hidden [&_*]:!text-[7px] [&_*]:!leading-tight">
                  <MarkdownRenderer
                    content={item.artifact.content.slice(0, 200)}
                    renderWidgets={false}
                  />
                </div>
              ) : (
                <pre className="text-[7px] leading-tight text-default-400 whitespace-pre-wrap break-all p-1 h-full overflow-hidden">
                  {item.artifact.content.slice(0, 200)}
                </pre>
              )}
            </div>
          ) : null}
          <Icon
            name="NavArrowRight"
            size="md"
            className="text-default-500 shrink-0"
          />
        </CardBody>
      </Card>
    )
  },
)

ArtifactPreviewCard.displayName = 'ArtifactPreviewCard'
