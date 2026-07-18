import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Dropdown, Label } from '@heroui/react_3'
import { Icon } from '@/components'
import { useI18n } from '@/i18n'
import {
  applyMemoryOperation,
  GLOBAL_MEMORY_AGENT_ID,
} from '@/lib/memory-learning-service'
import { successToast, errorToast } from '@/lib/toast'

interface RememberSelectionMenuProps {
  /** Agent whose memory the selection is saved to (for the "this agent" scope). */
  agentId?: string
  children: ReactNode
  className?: string
}

/** Format a raw text selection into a single tidy memory bullet. */
export function formatSelectionNote(text: string): string {
  return `- ${text.replace(/\s+/g, ' ').trim()}`
}

/** Minimum selection length (chars) before the menu is offered. */
export const MIN_SELECTION_LENGTH = 2

/**
 * Wraps message content and, when the user selects some text inside it, shows a
 * floating HeroUI v3 action menu offering to "remember" the selection into the
 * agent's memory (or the global memory shared by all agents).
 *
 * The whole UI is built from HeroUI v3 (`@heroui/react_3`) components: the menu
 * is a `Dropdown` anchored to an invisible trigger placed at the selection.
 */
export function RememberSelectionMenu({
  agentId,
  children,
  className,
}: RememberSelectionMenuProps) {
  const { t } = useI18n()
  const containerRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [selectedText, setSelectedText] = useState('')
  const [anchor, setAnchor] = useState<{ left: number; top: number }>({
    left: 0,
    top: 0,
  })

  // Detect a text selection made within this message.
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const handleMouseUp = () => {
      // Defer so the selection is finalised before we read it.
      requestAnimationFrame(() => {
        const sel = window.getSelection()
        if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
          return
        }
        const text = sel.toString().trim()
        if (text.length < MIN_SELECTION_LENGTH) return

        const range = sel.getRangeAt(0)
        if (!el.contains(range.commonAncestorContainer)) return

        const rect = range.getBoundingClientRect()
        setSelectedText(text)
        setAnchor({ left: rect.left + rect.width / 2, top: rect.top })
        setOpen(true)
      })
    }

    el.addEventListener('mouseup', handleMouseUp)
    return () => el.removeEventListener('mouseup', handleMouseUp)
  }, [])

  const remember = useCallback(
    async (key: React.Key) => {
      const targetId =
        key === 'global' ? GLOBAL_MEMORY_AGENT_ID : agentId
      setOpen(false)

      if (!targetId) {
        errorToast(t('No agent selected for this memory'))
        return
      }

      // Store the selection as a single tidy bullet.
      const note = formatSelectionNote(selectedText)
      try {
        await applyMemoryOperation(targetId, 'append', { content: note })
        successToast(
          key === 'global'
            ? t('Added to global memory')
            : t('Added to this agent\u2019s memory'),
        )
        window.getSelection()?.removeAllRanges()
      } catch (error) {
        errorToast(t('Failed to save to memory'), error)
      }
    },
    [agentId, selectedText, t],
  )

  return (
    <div ref={containerRef} className={className}>
      {children}

      <Dropdown isOpen={open} onOpenChange={setOpen}>
        {/* Invisible trigger positioned at the current text selection. */}
        <Dropdown.Trigger
          aria-label={t('Selection actions')}
          excludeFromTabOrder
          className="pointer-events-none fixed h-0 w-0 p-0 opacity-0"
          style={{ left: anchor.left, top: anchor.top }}
        />
        <Dropdown.Popover placement="top">
          <Dropdown.Menu
            onAction={remember}
            aria-label={t('Remember selection')}
          >
            {agentId ? (
              <Dropdown.Item
                id="agent"
                textValue={t('Remember for this agent')}
              >
                <Icon name="Brain" size="sm" />
                <Label>{t('Remember for this agent')}</Label>
              </Dropdown.Item>
            ) : null}
            <Dropdown.Item
              id="global"
              textValue={t('Remember for all agents')}
            >
              <Icon name="Internet" size="sm" />
              <Label>{t('Remember for all agents')}</Label>
            </Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown>
    </div>
  )
}
