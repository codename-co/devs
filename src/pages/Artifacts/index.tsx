import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Chip, Modal, Button, Pagination, ScrollShadow } from '@heroui/react'

import { useI18n } from '@/i18n'
import { Section, Container, Icon, ArtifactPreviewCard } from '@/components'
import DefaultLayout from '@/layouts/Default'
import { getAgentById } from '@/stores/agentStore'
import { useFullyDecryptedConversations, useArtifacts } from '@/hooks'
import {
  type CodeBlockType,
  detectSpecializedCodeType,
} from '@/components/Widget/Widget'
import { MarkdownRenderer } from '@/components'
import { Widget } from '@/components/Widget/Widget'
import type { Artifact, Conversation } from '@/types'
import type { HeaderProps, IconName } from '@/lib/types'
import localI18n from './i18n'

const ITEMS_PER_PAGE = 12

// ============================================================================
// Library item: wraps both artifacts and conversation widgets
// ============================================================================

interface LibraryItemArtifact {
  kind: 'artifact'
  id: string
  title: string
  subtitle: string
  icon: string
  typeLabel: string
  statusColor: 'success' | 'primary' | 'danger' | 'default'
  statusLabel?: string
  versionLabel?: string
  agentName?: string
  date: Date
  artifact: Artifact
}

interface LibraryItemWidget {
  kind: 'widget'
  id: string
  title: string
  subtitle: string
  icon: string
  typeLabel: string
  statusColor: 'default'
  agentName?: string
  conversationTitle?: string
  date: Date
  code: string
  widgetType: CodeBlockType
  language?: string
}

type LibraryItem = LibraryItemArtifact | LibraryItemWidget

// ============================================================================
// Helpers
// ============================================================================

const getStatusColor = (status: Artifact['status']) => {
  switch (status) {
    case 'approved':
    case 'final':
      return 'success' as const
    case 'review':
      return 'primary' as const
    case 'rejected':
      return 'danger' as const
    default:
      return 'default' as const
  }
}

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
  pptx: 'Presentation',
  html: 'Html5',
  generic: 'Code',
}

const WIDGET_LABELS: Record<CodeBlockType, string> = {
  abc: 'Score',
  svg: 'SVG',
  diagram: 'Diagram',
  marpit: 'Presentation',
  pptx: 'PowerPoint',
  html: 'HTML Widget',
  generic: 'Code',
}

// ============================================================================
// Extract widgets from conversation messages
// ============================================================================

const CODE_BLOCK_RE = /```(\w+)?\n([\s\S]*?)```/g

function extractWidgetsFromConversations(
  conversations: Conversation[],
): LibraryItemWidget[] {
  const widgets: LibraryItemWidget[] = []
  let idx = 0

  for (const conv of conversations) {
    for (const msg of conv.messages) {
      if (msg.role !== 'assistant' || !msg.content) continue

      let match: RegExpExecArray | null
      CODE_BLOCK_RE.lastIndex = 0

      while ((match = CODE_BLOCK_RE.exec(msg.content)) !== null) {
        const [, language, code] = match
        const widgetType = detectSpecializedCodeType(code, language)
        if (!widgetType) continue

        const agent = msg.agentId ? getAgentById(msg.agentId) : null

        widgets.push({
          kind: 'widget',
          id: `widget-${conv.id}-${msg.id}-${idx++}`,
          title: String(conv.title),
          subtitle: WIDGET_LABELS[widgetType],
          icon: WIDGET_ICONS[widgetType],
          typeLabel: widgetType,
          statusColor: 'default',
          agentName: agent?.name,
          // conversationTitle: conv.title,
          date: new Date(msg.timestamp),
          code: code.trim(),
          widgetType,
          language,
        })
      }
    }
  }

  return widgets
}

// ============================================================================
// Content component (reusable in History page tabs)
// ============================================================================

export const LibraryContent = () => {
  const { t } = useI18n(localI18n)
  const location = useLocation()
  const navigate = useNavigate()
  const artifacts = useArtifacts()
  const conversations = useFullyDecryptedConversations()
  const [previewArtifact, setPreviewArtifact] = useState<Artifact | null>(null)
  const [previewWidget, setPreviewWidget] = useState<LibraryItemWidget | null>(
    null,
  )
  const [page, setPage] = useState(1)

  // --- Hash → state: update the URL hash when opening / closing items ---
  const setHashId = useCallback(
    (id: string | null) => {
      if (id) {
        window.location.hash = id
      } else if (location.hash) {
        navigate(location.pathname + location.search, { replace: true })
      }
    },
    [navigate, location.pathname, location.search, location.hash],
  )

  const handleClosePreview = useCallback(() => {
    setPreviewArtifact(null)
    setPreviewWidget(null)
    setHashId(null)
  }, [setHashId])

  const handleDownload = useCallback((artifact: Artifact) => {
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
  }, [])

  const handleWidgetDownload = useCallback((widget: LibraryItemWidget) => {
    const extMap: Record<CodeBlockType, string> = {
      svg: 'svg',
      html: 'html',
      abc: 'abc',
      diagram: 'mmd',
      marpit: 'md',
      pptx: 'js',
      generic: 'txt',
    }
    const mimeMap: Record<CodeBlockType, string> = {
      svg: 'image/svg+xml',
      html: 'text/html',
      abc: 'text/plain',
      diagram: 'text/plain',
      marpit: 'text/markdown',
      pptx: 'text/javascript',
      generic: 'text/plain',
    }
    const ext = extMap[widget.widgetType] || 'txt'
    const blob = new Blob([widget.code], {
      type: mimeMap[widget.widgetType] || 'text/plain',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${widget.title}.${ext}`
    a.click()
    URL.revokeObjectURL(url)
  }, [])

  // Build a unified, chronologically sorted list of library items
  const items: LibraryItem[] = useMemo(() => {
    // 1. Artifacts
    const artifactItems: LibraryItemArtifact[] = artifacts.map((a) => {
      const agent = getAgentById(a.agentId)
      return {
        kind: 'artifact',
        id: a.id,
        title: a.title,
        subtitle: a.description,
        icon: ARTIFACT_ICONS[a.type] ?? 'Page',
        typeLabel: a.type,
        statusColor: getStatusColor(a.status),
        statusLabel: a.status,
        versionLabel: `v${a.version}`,
        agentName: agent?.name,
        date: new Date(a.createdAt),
        artifact: a,
      }
    })

    // 2. Widgets extracted from conversation messages
    const widgetItems = extractWidgetsFromConversations(conversations)

    // Merge & sort by date descending
    return [...artifactItems, ...widgetItems].sort(
      (a, b) => b.date.getTime() - a.date.getTime(),
    )
  }, [artifacts, conversations])

  // --- Hash → state: auto-open the item whose id is in the URL hash ---
  const hashId = location.hash.replace('#', '')

  useEffect(() => {
    if (!hashId || items.length === 0) return

    const match = items.find((i) => i.id === hashId)
    if (!match) return

    if (match.kind === 'artifact') {
      setPreviewArtifact(match.artifact)
    } else {
      setPreviewWidget(match)
    }
  }, [hashId, items])

  return (
    <>
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-8">
          <div className="w-16 h-16 rounded-full bg-default-100 flex items-center justify-center mb-4">
            <Icon name="Box3dPoint" size="xl" className="text-default-400" />
          </div>
          <p className="text-lg font-semibold mb-1">{t('No items yet')}</p>
          <p className="text-sm text-default-500 text-center max-w-xs">
            {t('Items will appear here once agents produce deliverables.')}
          </p>
        </div>
      ) : (
        <>
          <div
            data-testid="library-list"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
          >
            {items
              .slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)
              .map((item) =>
                item.kind === 'artifact' ? (
                  <ArtifactPreviewCard
                    key={item.id}
                    item={{ kind: 'artifact', artifact: item.artifact }}
                    layout="landscape"
                    onPress={() => {
                      setPreviewArtifact(item.artifact)
                      setHashId(item.id)
                    }}
                  />
                ) : (
                  <ArtifactPreviewCard
                    key={item.id}
                    item={{
                      kind: 'widget',
                      widget: {
                        id: item.id,
                        title: item.title,
                        code: item.code,
                        widgetType: item.widgetType,
                        language: item.language,
                        agentName: item.agentName,
                      },
                    }}
                    layout="landscape"
                    onPress={() => {
                      setPreviewWidget(item)
                      setHashId(item.id)
                    }}
                  />
                ),
              )}
          </div>
          {items.length > ITEMS_PER_PAGE && (
            <div className="flex justify-center mt-6">
              <Pagination
                total={Math.ceil(items.length / ITEMS_PER_PAGE)}
                page={page}
                onChange={setPage}
                showControls
                size="sm"
              />
            </div>
          )}
        </>
      )}
      {/* Artifact preview modal */}
      <Modal
        size="5xl"
        scrollBehavior="inside"
        placement="bottom-center"
        isOpen={!!previewArtifact}
        onOpenChange={(v) => !v && (handleClosePreview)()}
        backdrop="blur"
        classNames={{
          base: 'max-h-[85vh]',
          body: 'p-4',
        }}
      >
        <Modal.Dialog>
          {previewArtifact && (
            <>
              <Modal.Header className="flex items-center gap-3">
                <div className="flex items-center gap-4 max-w-full">
                  <Icon
                    name={
                      (ARTIFACT_ICONS[previewArtifact.type] ?? 'Page') as any
                    }
                    className="text-default-500 shrink-0"
                  />
                  <span className="truncate">{previewArtifact.title}</span>
                  <Chip
                    size="sm"
                    variant="soft"
                    color={getStatusColor(previewArtifact.status)}
                  >
                    {previewArtifact.status}
                  </Chip>
                  <Chip size="sm" variant="soft" color="default">
                    {previewArtifact.type}
                  </Chip>
                </div>
              </Modal.Header>
              <Modal.Body>
                {/* {previewArtifact.description && (
                  <p className="text-sm text-default-600 mb-3">
                    {previewArtifact.description}
                  </p>
                )} */}
                <ScrollShadow className="max-h-[60vh]">
                  <div className="bg-default-50 rounded-lg p-4">
                    <MarkdownRenderer
                      content={previewArtifact.content}
                      className="prose dark:prose-invert prose-sm max-w-none"
                    />
                  </div>
                </ScrollShadow>
              </Modal.Body>
              <Modal.Footer>
                <Button
                  // color="primary"
                  variant="secondary"
                  size="sm"
                  startContent={<Icon name="Download" size="sm" />}
                  onPress={() => handleDownload(previewArtifact)}
                >
                  {t('Download')}
                </Button>
              </Modal.Footer>
            </>
          )}
        </Modal.Dialog>
      </Modal>

      {/* Widget preview modal */}
      <Modal
        size="5xl"
        scrollBehavior="inside"
        placement="bottom-center"
        isOpen={!!previewWidget}
        onOpenChange={(v) => !v && (handleClosePreview)()}
        backdrop="blur"
        classNames={{
          base: 'max-h-[85vh]',
          body: 'p-4',
        }}
      >
        <Modal.Dialog>
          {previewWidget && (
            <>
              <Modal.Header className="flex items-center gap-3">
                <div className="flex items-center gap-4 max-w-full">
                  <Icon
                    name={previewWidget.icon as any}
                    className="text-default-500 shrink-0"
                  />
                  <span className="truncate">{previewWidget.title}</span>
                  <Chip size="sm" variant="soft" color="default">
                    {previewWidget.typeLabel}
                  </Chip>
                  {previewWidget.agentName && (
                    <Chip size="sm" variant="soft" color="default">
                      {previewWidget.agentName}
                    </Chip>
                  )}
                </div>
              </Modal.Header>
              <Modal.Body>
                {previewWidget.conversationTitle && (
                  <p className="text-sm text-default-600 mb-3">
                    {previewWidget.conversationTitle}
                  </p>
                )}
                <ScrollShadow className="max-h-[60vh]">
                  <Widget
                    code={previewWidget.code}
                    type={previewWidget.widgetType}
                    language={previewWidget.language}
                    showActions={false}
                  />
                </ScrollShadow>
              </Modal.Body>
              <Modal.Footer>
                <Button
                  color="primary"
                  variant="secondary"
                  startContent={<Icon name="Download" size="sm" />}
                  onPress={() => handleWidgetDownload(previewWidget)}
                >
                  {t('Download')}
                </Button>
              </Modal.Footer>
            </>
          )}
        </Modal.Dialog>
      </Modal>
    </>
  )
}

// ============================================================================
// Page component (standalone route)
// ============================================================================

export const LibraryPage = () => {
  const { t } = useI18n(localI18n)

  const header: HeaderProps = {
    color: 'bg-success-50',
    icon: {
      name: 'BookStack',
      color: 'text-success-600 dark:text-success-300',
    },
    title: t('Library'),
    subtitle: t('All deliverables generated by your agents'),
  }

  return (
    <DefaultLayout title={t('Library')} header={header}>
      <Section>
        <Container>
          <LibraryContent />
        </Container>
      </Section>
    </DefaultLayout>
  )
}
