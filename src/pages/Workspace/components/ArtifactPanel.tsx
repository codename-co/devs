import { useEffect, useState } from 'react'
import { Modal, ModalContent, ModalBody } from '@heroui/react'
import { Button, ScrollShadow } from '@heroui/react_3'
import { ArtifactPreviewCard } from '@/components/ArtifactPreviewCard'
import type { PreviewItem } from '@/components/ArtifactPreviewCard'
import { Icon, MarkdownRenderer, Widget } from '@/components'
import { useI18n } from '@/i18n'

const WIDE_BREAKPOINT = 1280

interface ArtifactPanelProps {
  item: PreviewItem | null
  onClose: () => void
}

/**
 * Shows an artifact or widget preview as a side panel on wide screens (≥1280px)
 * or as a modal on narrower screens.
 */
export function ArtifactPanel({ item, onClose }: ArtifactPanelProps) {
  const { t } = useI18n()
  const [isWide, setIsWide] = useState(
    () => window.innerWidth >= WIDE_BREAKPOINT,
  )

  useEffect(() => {
    const mql = window.matchMedia(`(min-width: ${WIDE_BREAKPOINT}px)`)
    const handler = (e: MediaQueryListEvent) => setIsWide(e.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [])

  // Close on Escape
  useEffect(() => {
    if (!item) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }
    window.addEventListener('keydown', handleKey, true)
    return () => window.removeEventListener('keydown', handleKey, true)
  }, [item, onClose])

  if (!item) return null

  const title =
    item.kind === 'artifact' ? item.artifact.title : item.widget.title

  // ---- Inline side panel (wide screens) ----
  if (isWide) {
    return (
      <div className="flex h-full min-h-0 min-w-0 flex-col overflow-clip py-4 pr-4">
        <div className="bg-surface flex min-h-0 max-h-full flex-1 flex-col gap-4 overflow-clip rounded-2xl p-4 shadow-sm">
          {/* Header */}
          <div className="flex shrink-0 items-center gap-2">
            <h2 className="text-foreground flex-1 truncate text-sm font-semibold">
              {title}
            </h2>
            <Button
              isIconOnly
              size="sm"
              variant="ghost"
              onPress={onClose}
              aria-label={t('Close')}
            >
              <Icon name="Xmark" />
            </Button>
          </div>

          {/* Content */}
          <ScrollShadow
            hideScrollBar
            className="min-h-0 flex-1 overflow-y-auto"
          >
            <PanelContent item={item} />
          </ScrollShadow>
        </div>
      </div>
    )
  }

  // ---- Modal (narrow screens) ----
  return (
    <Modal isOpen onClose={onClose} size="5xl" scrollBehavior="inside">
      <ModalContent>
        <ModalBody className="p-4">
          <PanelContent item={item} />
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}

function PanelContent({ item }: { item: PreviewItem }) {
  if (item.kind === 'widget') {
    return (
      <Widget
        code={item.widget.code}
        type={item.widget.widgetType}
        language={item.widget.language}
        showActions={false}
      />
    )
  }
  // Markdown artifacts: render content directly
  if (item.artifact.format === 'markdown' && item.artifact.content) {
    return (
      <div className="text-foreground text-sm leading-relaxed">
        <MarkdownRenderer content={item.artifact.content} />
      </div>
    )
  }
  return <ArtifactPreviewCard item={item} layout="landscape" />
}
