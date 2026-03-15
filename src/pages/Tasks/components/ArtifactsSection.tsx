import { memo, useEffect, useMemo, useState } from 'react'
import { Card, CardBody, Link } from '@heroui/react'

import { useI18n } from '@/i18n'
import { Icon, Title, ArtifactCard } from '@/components'
import {
  type CodeBlockType,
  detectSpecializedCodeType,
} from '@/components/Widget/Widget'
import { getAgentById } from '@/stores/agentStore'
import { openInspector } from '@/stores/inspectorPanelStore'
import {
  generateWidgetCapture,
  getPersistedCapture,
  persistCapture,
} from '@/lib/widget-capture'
import type { Artifact as ArtifactType, Conversation } from '@/types'
import type { IconName } from '@/lib/types'

// ── Widget extraction from conversation messages ────────────────────────

interface ExtractedWidget {
  id: string
  title: string
  agentName?: string
  date: Date
  code: string
  widgetType: CodeBlockType
  language?: string
}

const CODE_BLOCK_RE = /```(\w+)?\n([\s\S]*?)```/g

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

/** Try to extract a human-readable title from the widget source code. */
function extractWidgetTitle(
  code: string,
  widgetType: CodeBlockType,
): string | null {
  const trimmed = code.trim()
  switch (widgetType) {
    case 'html': {
      // <title>…</title>
      const titleMatch = trimmed.match(/<title[^>]*>(.*?)<\/title>/is)
      if (titleMatch?.[1]?.trim()) return titleMatch[1].trim()
      // First <h1>…</h1> or <h2>…</h2>
      const headingMatch = trimmed.match(/<h[12][^>]*>(.*?)<\/h[12]>/is)
      if (headingMatch?.[1]?.trim())
        return headingMatch[1].replace(/<[^>]+>/g, '').trim()
      return null
    }
    case 'svg': {
      const titleMatch = trimmed.match(/<title[^>]*>(.*?)<\/title>/is)
      if (titleMatch?.[1]?.trim()) return titleMatch[1].trim()
      return null
    }
    case 'abc': {
      // T: Title field in ABC notation
      const tMatch = trimmed.match(/^T:\s*(.+)$/m)
      if (tMatch?.[1]?.trim()) return tMatch[1].trim()
      return null
    }
    case 'diagram': {
      // First non-directive line often has the diagram title/label
      const lines = trimmed.split('\n')
      // Look for a title directive: title My Title
      const titleLine = lines.find((l) => /^\s*title\s+/i.test(l))
      if (titleLine) return titleLine.replace(/^\s*title\s+/i, '').trim()
      return null
    }
    case 'marpit': {
      // First # heading
      const headingMatch = trimmed.match(/^#\s+(.+)$/m)
      if (headingMatch?.[1]?.trim()) return headingMatch[1].trim()
      return null
    }
    default:
      return null
  }
}

function extractWidgets(conversations: Conversation[]): ExtractedWidget[] {
  const widgets: ExtractedWidget[] = []
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
        const codeTrimmed = code.trim()
        const contentTitle = extractWidgetTitle(codeTrimmed, widgetType)
        widgets.push({
          id: `widget-${conv.id}-${msg.id}-${idx++}`,
          title: contentTitle ?? conv.title ?? WIDGET_LABELS[widgetType],
          agentName: agent?.name,
          date: new Date(msg.timestamp),
          code: codeTrimmed,
          widgetType,
          language,
        })
      }
    }
  }
  return widgets
}

// ── Component ───────────────────────────────────────────────────────────

type UnifiedItem =
  | { kind: 'artifact'; artifact: ArtifactType; date: Date }
  | { kind: 'widget'; widget: ExtractedWidget; date: Date }

export const ArtifactsSection = memo(
  ({
    artifacts,
    conversations = [],
  }: {
    artifacts: ArtifactType[]
    conversations?: Conversation[]
  }) => {
    const { t } = useI18n()
    const [previews, setPreviews] = useState<Record<string, string>>({})

    const items: UnifiedItem[] = useMemo(() => {
      const list: UnifiedItem[] = artifacts.map((a) => ({
        kind: 'artifact',
        artifact: a,
        date: new Date(a.createdAt),
      }))

      for (const w of extractWidgets(conversations)) {
        list.push({ kind: 'widget', widget: w, date: w.date })
      }

      return list.sort((a, b) => a.date.getTime() - b.date.getTime())
    }, [artifacts, conversations])

    // Load persisted captures, then generate missing ones
    useEffect(() => {
      let cancelled = false
      const widgets = items.filter(
        (i): i is UnifiedItem & { kind: 'widget' } => i.kind === 'widget',
      )
      if (widgets.length === 0) return

      // 1. Load from Yjs cache first
      const loaded: Record<string, string> = {}
      const missing: typeof widgets = []
      for (const w of widgets) {
        if (previews[w.widget.id]) continue
        const persisted = getPersistedCapture(w.widget.id)
        if (persisted) {
          loaded[w.widget.id] = persisted
        } else {
          missing.push(w)
        }
      }
      if (Object.keys(loaded).length > 0) {
        setPreviews((prev) => ({ ...prev, ...loaded }))
      }

      // 2. Generate & persist captures for widgets without one
      for (const { widget } of missing) {
        generateWidgetCapture(widget.code, widget.widgetType).then(
          (dataUrl) => {
            if (cancelled || !dataUrl) return
            persistCapture(widget.id, dataUrl)
            setPreviews((prev) => ({ ...prev, [widget.id]: dataUrl }))
          },
        )
      }

      return () => {
        cancelled = true
      }
    }, [items])

    const [showAll, setShowAll] = useState(false)

    if (items.length === 0) return null

    const lastItem = items[items.length - 1]
    const hiddenItems = items.slice(0, -1)
    const visibleItems = showAll ? items : [lastItem]

    return (
      <div>
        <div className="flex items-center gap-2 mb-3 text-default-500">
          <Icon name="Page" size="sm" />
          <Title level={5}>{t('Artifacts')}</Title>
        </div>
        {!showAll && hiddenItems.length > 0 && (
          <Link
            as="button"
            size="sm"
            className="mb-2"
            onPress={() => setShowAll(true)}
          >
            {t('Show all artifacts')}
          </Link>
        )}
        <div className="space-y-2">
          {visibleItems.map((item) =>
            item.kind === 'artifact' ? (
              <ArtifactCard key={item.artifact.id} artifact={item.artifact} />
            ) : (
              <Card
                key={item.widget.id}
                isPressable
                fullWidth
                shadow="none"
                className="border border-default-200 bg-default-50 hover:bg-default-100"
                onPress={() =>
                  openInspector({
                    type: 'widget',
                    code: item.widget.code,
                    widgetType: item.widget.widgetType,
                    language: item.widget.language,
                    title: item.widget.title,
                  })
                }
              >
                <CardBody className="flex flex-row items-center gap-2 sm:gap-3 p-2 sm:p-3">
                  <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-medium bg-default-100 shrink-0">
                    <Icon
                      name={WIDGET_ICONS[item.widget.widgetType]}
                      size="md"
                      className="text-default-500"
                    />
                  </div>
                  <div className="flex flex-col min-w-0 flex-1 overflow-hidden">
                    <span className="font-medium text-xs sm:text-sm truncate">
                      {item.widget.title}
                    </span>
                    <span className="text-tiny text-default-400 truncate">
                      {WIDGET_LABELS[item.widget.widgetType]}
                      {item.widget.agentName && (
                        <span className="ml-1">— {item.widget.agentName}</span>
                      )}
                    </span>
                  </div>
                  {previews[item.widget.id] && (
                    <img
                      src={previews[item.widget.id]}
                      alt=""
                      className="w-12 h-9 sm:w-20 sm:h-15 rounded-small object-cover object-top bg-default-100 shrink-0 -my-4"
                    />
                  )}
                  <Icon
                    name="NavArrowRight"
                    size="md"
                    className="text-default-500"
                  />
                </CardBody>
              </Card>
            ),
          )}
        </div>
      </div>
    )
  },
)

ArtifactsSection.displayName = 'ArtifactsSection'
