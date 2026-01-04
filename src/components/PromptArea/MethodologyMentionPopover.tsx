import { Listbox, ListboxItem, ListboxSection } from '@heroui/react'
import { useEffect, useCallback, useMemo } from 'react'

import { useI18n, type Lang } from '@/i18n'
import type { Methodology } from '@/types/methodology.types'

interface MethodologyMentionPopoverProps {
  lang: Lang
  methodologies: Methodology[]
  selectedIndex: number
  onSelect: (methodology: Methodology) => void
  onClose: () => void
}

// Map methodology types to categories for grouping
const methodologyTypeCategories: Record<string, string> = {
  sequential: 'Sequential',
  'parallel-sequential': 'Parallel',
  'event-driven': 'Event-Driven',
  iterative: 'Iterative',
  hierarchical: 'Hierarchical',
  'time-boxed': 'Time-Boxed',
  hybrid: 'Hybrid',
}

export function MethodologyMentionPopover({
  lang,
  methodologies,
  selectedIndex,
  onSelect,
  onClose,
}: MethodologyMentionPopoverProps) {
  const { t } = useI18n(lang as any)

  // Scroll selected item into view
  useEffect(() => {
    const selectedElement = document.querySelector(
      '[data-testid="methodology-mention-popover"] [data-selected="true"]',
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
        '[data-testid="methodology-mention-popover"]',
      )
      if (popover && !popover.contains(e.target as Node)) {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  // Group methodologies by type for display
  const methodologiesByType = useMemo(() => {
    const grouped: Record<string, Methodology[]> = {}

    methodologies.forEach((methodology) => {
      const type = methodology.metadata.type || 'other'
      if (!grouped[type]) {
        grouped[type] = []
      }
      grouped[type].push(methodology)
    })

    return grouped
  }, [methodologies])

  const orderedTypes = useMemo(() => {
    const order = [
      'sequential',
      'iterative',
      'parallel-sequential',
      'event-driven',
      'hierarchical',
      'time-boxed',
      'hybrid',
      'other',
    ]
    return order.filter((type) => methodologiesByType[type]?.length > 0)
  }, [methodologiesByType])

  // Calculate global index for a methodology
  const getGlobalIndex = useCallback(
    (methodology: Methodology): number => {
      return methodologies.findIndex(
        (m) => m.metadata.id === methodology.metadata.id,
      )
    },
    [methodologies],
  )

  const handleAction = useCallback(
    (key: React.Key) => {
      const methodology = methodologies.find((m) => m.metadata.id === key)
      if (methodology) {
        onSelect(methodology)
      }
    },
    [methodologies, onSelect],
  )

  if (methodologies.length === 0) {
    return (
      <div
        className="absolute bottom-full left-0 mb-2 w-80 max-h-64 overflow-y-auto bg-content1 rounded-lg shadow-lg border border-default-200 p-4 z-50"
        data-testid="methodology-mention-popover"
      >
        <p className="text-default-500 text-sm">
          {t('No methodologies found')}
        </p>
      </div>
    )
  }

  return (
    <div
      className="absolute bottom-full left-0 mb-2 w-80 max-h-64 overflow-y-auto bg-content1 rounded-lg shadow-lg border border-default-200 z-50"
      data-testid="methodology-mention-popover"
    >
      <Listbox
        aria-label={t('Select a methodology')}
        selectionMode="single"
        selectedKeys={
          methodologies[selectedIndex]
            ? [methodologies[selectedIndex].metadata.id]
            : []
        }
        onAction={handleAction}
      >
        {orderedTypes.map((type) => (
          <ListboxSection
            key={type}
            title={t((methodologyTypeCategories[type] ?? type) as any)}
            classNames={{
              heading: 'text-xs font-semibold text-default-500 px-2 py-1',
            }}
          >
            {methodologiesByType[type].map((methodology) => {
              const globalIndex = getGlobalIndex(methodology)
              const isSelected = globalIndex === selectedIndex
              const name =
                methodology.metadata.i18n?.[lang]?.name ??
                methodology.metadata.name
              const description =
                methodology.metadata.i18n?.[lang]?.title ??
                methodology.metadata.title

              return (
                <ListboxItem
                  key={methodology.metadata.id}
                  data-selected={isSelected}
                  description={description}
                  className={isSelected ? 'bg-default-100' : ''}
                  textValue={name}
                  onPress={() => onSelect(methodology)}
                >
                  {name}
                </ListboxItem>
              )
            })}
          </ListboxSection>
        ))}
      </Listbox>
    </div>
  )
}
