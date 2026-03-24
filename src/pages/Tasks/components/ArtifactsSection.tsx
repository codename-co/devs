import { memo, useMemo, useState } from 'react'
import { Link } from '@heroui/react'

import { useI18n } from '@/i18n'
import { Icon, Title, ArtifactPreviewCard } from '@/components'
import {
  type CodeBlockType,
  detectSpecializedCodeType,
} from '@/components/Widget/Widget'
import { getAgentById } from '@/stores/agentStore'
import type { Artifact as ArtifactType, Conversation } from '@/types'

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
      const titleMatch = trimmed.match(/<title[^>]*>(.*?)<\/title>/is)
      if (titleMatch?.[1]?.trim()) return titleMatch[1].trim()
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
      const tMatch = trimmed.match(/^T:\s*(.+)$/m)
      if (tMatch?.[1]?.trim()) return tMatch[1].trim()
      return null
    }
    case 'diagram': {
      const lines = trimmed.split('\n')
      const titleLine = lines.find((l) => /^\s*title\s+/i.test(l))
      if (titleLine) return titleLine.replace(/^\s*title\s+/i, '').trim()
      return null
    }
    case 'marpit': {
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
              <ArtifactPreviewCard
                key={item.artifact.id}
                item={{ kind: 'artifact', artifact: item.artifact }}
              />
            ) : (
              <ArtifactPreviewCard
                key={item.widget.id}
                item={{
                  kind: 'widget',
                  widget: {
                    id: item.widget.id,
                    title: item.widget.title,
                    code: item.widget.code,
                    widgetType: item.widget.widgetType,
                    language: item.widget.language,
                    agentName: item.widget.agentName,
                  },
                }}
              />
            ),
          )}
        </div>
      </div>
    )
  },
)

ArtifactsSection.displayName = 'ArtifactsSection'
