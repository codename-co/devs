import { Listbox, ListboxItem } from '@heroui/react'
import { useEffect, useCallback } from 'react'

import { useI18n, type Lang } from '@/i18n'
import type { InstalledSkill } from '@/types'

interface SkillMentionPopoverProps {
  lang: Lang
  skills: InstalledSkill[]
  selectedIndex: number
  onSelect: (skill: InstalledSkill) => void
  onClose: () => void
}

export function SkillMentionPopover({
  lang,
  skills,
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
      const skill = skills.find((s) => s.id === key)
      if (skill) {
        onSelect(skill)
      }
    },
    [skills, onSelect],
  )

  if (skills.length === 0) {
    return (
      <div
        className="absolute bottom-full left-0 mb-2 w-80 max-h-64 overflow-y-auto bg-content1 rounded-lg shadow-lg border border-default-200 p-4 z-50"
        data-testid="skill-mention-popover"
      >
        <p className="text-default-500 text-sm">{t('No skills found')}</p>
      </div>
    )
  }

  return (
    <div
      className="absolute bottom-full left-0 mb-2 w-80 max-h-64 overflow-y-auto bg-content1 rounded-lg shadow-lg border border-default-200 z-50"
      data-testid="skill-mention-popover"
    >
      <Listbox
        aria-label={t('Select a skill')}
        selectionMode="single"
        selectedKeys={skills[selectedIndex] ? [skills[selectedIndex].id] : []}
        onAction={handleAction}
      >
        {skills.map((skill, index) => {
          const isSelected = index === selectedIndex

          return (
            <ListboxItem
              key={skill.id}
              data-selected={isSelected}
              description={skill.description}
              className={isSelected ? 'bg-default-100' : ''}
              textValue={skill.name}
              onPress={() => onSelect(skill)}
            >
              {skill.name}
            </ListboxItem>
          )
        })}
      </Listbox>
    </div>
  )
}
