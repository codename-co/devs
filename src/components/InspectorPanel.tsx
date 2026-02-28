import React, { memo, useEffect, useState } from 'react'
import { Button, Chip, ScrollShadow, Tooltip } from '@heroui/react'

import { Icon } from './Icon'
import { MarkdownRenderer } from '@/components/MarkdownRenderer'
import { ContentPreview } from '@/components/ContentPreview/ContentPreview'
import { Widget } from '@/components/Widget/Widget'
import { useInspectorPanelStore } from '@/stores/inspectorPanelStore'
import type { InspectorItem } from '@/stores/inspectorPanelStore'
import { useI18n } from '@/i18n'

// ============================================================================
// Inspector Panel – a slide-out detail pane for artifacts, widgets,
// sources, and knowledge items.  Renders beside the ContextualPanel
// on the right edge of the Run layout.
// ============================================================================

export const InspectorPanel: React.FC = memo(() => {
  const item = useInspectorPanelStore((s) => s.item)
  const close = useInspectorPanelStore((s) => s.close)

  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Close on Escape key
  useEffect(() => {
    if (!item) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [item, close])

  if (!item) return null

  return (
    <aside className="flex-1 h-full md:h-screen z-50 fixed md:relative end-0 md:p-4 md:ps-0 md:rounded-xl min-w-5/6">
      {/* Backdrop on mobile */}
      {isMobile && (
        <div
          className="fixed inset-0 bg-black opacity-40 dark:opacity-70 -z-1 pointer-events-auto"
          onClick={close}
        />
      )}

      <div
        id="inspector-panel"
        data-testid="inspector-panel"
        className="h-full w-full pointer-events-auto"
      >
        <InspectorContent item={item} />
      </div>
    </aside>
  )
})
InspectorPanel.displayName = 'InspectorPanel'

// ============================================================================
// Inner content renderer – dispatches by item type
// ============================================================================

const InspectorContent = memo(({ item }: { item: InspectorItem }) => {
  const { close, goBack, history } = useInspectorPanelStore()
  const { t } = useI18n()
  const canGoBack = history.length > 0

  const title = getItemTitle(item)
  const icon = getItemIcon(item)

  return (
    <div className="w-full h-full bg-background dark:bg-content1 md:rounded-xl flex flex-col overflow-hidden">
      <ScrollShadow
        hideScrollBar
        className="flex flex-col overflow-y-auto flex-1 p-0.5"
      >
        {/* Header bar */}
        <div className="sticky top-0 bg-background dark:bg-content1 z-10 pb-2 mb-2 px-2">
          <div className="flex items-center gap-2">
            {canGoBack && (
              <Tooltip content={t('Back')}>
                <Button
                  isIconOnly
                  variant="light"
                  size="sm"
                  onPress={goBack}
                  aria-label={t('Back')}
                >
                  <Icon
                    name="ArrowRight"
                    size="sm"
                    className="opacity-60 rotate-180"
                  />
                </Button>
              </Tooltip>
            )}

            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Icon name={icon} className="w-4 h-4 text-default-500 shrink-0" />
              <span className="text-sm font-medium truncate">{title}</span>
            </div>

            <Tooltip content={t('Close')}>
              <Button
                data-testid="inspector-close-button"
                isIconOnly
                variant="light"
                size="sm"
                onPress={close}
                aria-label={t('Close')}
              >
                <Icon name="Xmark" size="sm" className="opacity-60" />
              </Button>
            </Tooltip>
          </div>
        </div>

        {/* Body */}
        <div className="px-3 pb-4 h-full">
          <InspectorBody item={item} />
        </div>
      </ScrollShadow>
    </div>
  )
})
InspectorContent.displayName = 'InspectorContent'

// ============================================================================
// Body renderers per item type
// ============================================================================

const InspectorBody = memo(({ item }: { item: InspectorItem }) => {
  switch (item.type) {
    case 'artifact':
      return <ArtifactBody artifact={item.artifact} />
    case 'widget':
      return (
        <WidgetBody
          code={item.code}
          widgetType={item.widgetType}
          language={item.language}
          title={item.title}
        />
      )
    case 'source':
      return <SourceBody source={item} />
    case 'knowledge':
      return <KnowledgeBody item={item.item} />
    default:
      return null
  }
})
InspectorBody.displayName = 'InspectorBody'

// ── Artifact ────────────────────────────────────────────────────────────

const ArtifactBody = memo(
  ({ artifact }: { artifact: import('@/types').Artifact }) => {
    const statusColor =
      artifact.status === 'approved' || artifact.status === 'final'
        ? 'success'
        : artifact.status === 'rejected'
          ? 'danger'
          : 'warning'

    return (
      <div className="space-y-4">
        {/* Meta chips */}
        <div className="flex flex-wrap gap-2">
          <Chip size="sm" variant="flat" color={statusColor}>
            {artifact.status}
          </Chip>
          <Chip size="sm" variant="flat" color="default">
            {artifact.type}
          </Chip>
          <Chip size="sm" variant="flat" color="default">
            v{artifact.version}
          </Chip>
        </div>

        {artifact.description && (
          <p className="text-sm text-default-600">{artifact.description}</p>
        )}

        {/* Full content */}
        <div className="rounded-lg bg-default-50 dark:bg-default-100/30 p-4">
          <MarkdownRenderer
            content={artifact.content}
            className="prose dark:prose-invert prose-sm max-w-none"
          />
        </div>

        <div className="flex justify-between text-tiny text-default-400">
          <span>
            Created: {new Date(artifact.createdAt).toLocaleDateString()}
          </span>
          <span>{artifact.content.length.toLocaleString()} chars</span>
        </div>
      </div>
    )
  },
)
ArtifactBody.displayName = 'ArtifactBody'

// ── Widget ──────────────────────────────────────────────────────────────

const WidgetBody = memo(
  ({
    code,
    widgetType,
    language,
    title,
  }: {
    code: string
    widgetType: import('@/components/Widget/Widget').CodeBlockType
    language?: string
    title?: string
  }) => {
    return (
      <Widget
        code={code}
        type={widgetType}
        language={language}
        title={title}
        showTitle={false}
        showActions={false}
        showShadows={false}
        className="w-full h-full"
      />
    )
  },
)
WidgetBody.displayName = 'WidgetBody'

// ── Source (knowledge or external) ──────────────────────────────────────

const SourceBody = memo(
  ({
    source,
  }: {
    source: import('@/stores/inspectorPanelStore').InspectorItemSource
  }) => {
    if (source.knowledgeItem) {
      return <KnowledgeBody item={source.knowledgeItem} />
    }

    // External source – show information card
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Chip size="sm" variant="flat">
            {source.source.type}
          </Chip>
        </div>

        <p className="text-sm font-medium">{source.source.name}</p>

        {source.source.externalUrl && (
          <a
            href={source.source.externalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary-500 hover:underline flex items-center gap-1"
          >
            <Icon name="Internet" size="sm" />
            {source.source.externalUrl}
          </a>
        )}
      </div>
    )
  },
)
SourceBody.displayName = 'SourceBody'

// ── Knowledge Item ──────────────────────────────────────────────────────

const KnowledgeBody = memo(
  ({ item }: { item: import('@/types').KnowledgeItem }) => {
    return (
      <ContentPreview
        type="knowledge"
        item={item}
        mode="full"
        className="border-0 rounded-none"
      />
    )
  },
)
KnowledgeBody.displayName = 'KnowledgeBody'

// ============================================================================
// Helpers
// ============================================================================

function getItemTitle(item: InspectorItem): string {
  switch (item.type) {
    case 'artifact':
      return item.artifact.title
    case 'widget': {
      if (item.title) return item.title
      const widgetTitles: Record<string, string> = {
        abc: 'Music Score',
        svg: 'SVG Graphics',
        diagram: 'Mermaid Diagram',
        marpit: 'Presentation',
        html: 'HTML',
        generic: 'Code',
      }
      return widgetTitles[item.widgetType] || item.widgetType
    }
    case 'source':
      return item.source.name
    case 'knowledge':
      return item.item.name
  }
}

function getItemIcon(item: InspectorItem): import('@/lib/types').IconName {
  switch (item.type) {
    case 'artifact':
      return 'Page'
    case 'widget': {
      const map: Record<string, import('@/lib/types').IconName> = {
        abc: 'MusicNoteSolid',
        svg: 'MediaImage',
        diagram: 'CubeScan',
        marpit: 'Presentation',
        html: 'Html5',
      }
      return map[item.widgetType] || 'Code'
    }
    case 'source': {
      const sourceIcons: Record<string, import('@/lib/types').IconName> = {
        knowledge: 'Page',
        gmail: 'Gmail',
        drive: 'GoogleDrive',
        calendar: 'GoogleCalendar',
        notion: 'Notion',
        tasks: 'GoogleTasks',
      }
      return sourceIcons[item.source.type] || 'Internet'
    }
    case 'knowledge':
      return 'Page'
  }
}
