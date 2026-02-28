import { Listbox, ListboxItem, ListboxSection } from '@heroui/react'
import { useEffect, useCallback } from 'react'

import { Icon } from '../Icon'
import { useI18n, type Lang } from '@/i18n'
import type { SlashCommandItem } from './useSkillMention'

interface SkillMentionPopoverProps {
  lang: Lang
  items: SlashCommandItem[]
  selectedIndex: number
  onSelect: (item: SlashCommandItem) => void
  onClose: () => void
}

export function SkillMentionPopover({
  lang,
  items,
  selectedIndex,
  onSelect,
  onClose,
}: SkillMentionPopoverProps) {
  const { t } = useI18n(lang as any)

  // Scroll selected item into view
  useEffect(() => {
    const selectedElement = document.querySelector(
      '[data-testid="skill-mention-popover"] [data-selected="true"]',
    )
    selectedElement?.scrollIntoView({
      block: 'nearest',
      behavior: 'smooth',
    })
  }, [selectedIndex])

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const popover = document.querySelector(
        '[data-testid="skill-mention-popover"]',
      )
      if (popover && !popover.contains(e.target as Node)) {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  const handleAction = useCallback(
    (key: React.Key) => {
      const item = items.find((i) => i.id === key)
      if (item) {
        onSelect(item)
      }
    },
    [items, onSelect],
  )

  if (items.length === 0) {
    return (
      <div
        className="absolute bottom-full left-0 mb-2 w-80 max-h-64 overflow-y-auto bg-content1 rounded-lg shadow-lg border border-default-200 p-4 z-50"
        data-testid="skill-mention-popover"
      >
        <p className="text-default-500 text-sm">{t('No skills found')}</p>
      </div>
    )
  }

  const skills = items.filter((i) => i.type === 'skill')
  const connectors = items.filter((i) => i.type === 'connector')

  return (
    <div
      className="absolute bottom-full left-0 mb-2 w-80 max-h-64 overflow-y-auto bg-content1 rounded-lg shadow-lg border border-default-200 z-50"
      data-testid="skill-mention-popover"
    >
      <Listbox
        aria-label={t('Select a skill')}
        selectionMode="single"
        selectedKeys={items[selectedIndex] ? [items[selectedIndex].id] : []}
        onAction={handleAction}
      >
        {skills.length > 0 ? (
          <ListboxSection title={t('Skills')} key="skills-section">
            {skills.map((item) => {
              const globalIndex = items.indexOf(item)
              const isSelected = globalIndex === selectedIndex

              return (
                <ListboxItem
                  key={item.id}
                  data-selected={isSelected}
                  description={item.description}
                  className={isSelected ? 'bg-default-100' : ''}
                  textValue={item.name}
                  onPress={() => onSelect(item)}
                  startContent={
                    <Icon
                      name="Puzzle"
                      size="sm"
                      className="text-primary-500"
                    />
                  }
                >
                  {item.name}
                </ListboxItem>
              )
            })}
          </ListboxSection>
        ) : null}
        {connectors.length > 0 ? (
          <ListboxSection title={t('Connectors')} key="connectors-section">
            {connectors.map((item) => {
              const globalIndex = items.indexOf(item)
              const isSelected = globalIndex === selectedIndex

              return (
                <ListboxItem
                  key={item.id}
                  data-selected={isSelected}
                  description={item.description}
                  className={isSelected ? 'bg-default-100' : ''}
                  textValue={item.name}
                  onPress={() => onSelect(item)}
                  startContent={
                    <Icon name="Link" size="sm" className="text-success-500" />
                  }
                >
                  {item.name}
                </ListboxItem>
              )
            })}
          </ListboxSection>
        ) : null}
      </Listbox>
    </div>
  )
}
