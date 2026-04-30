import { useState, type ReactNode } from 'react'
import { Chip } from '@heroui/react_3'
import { Icon } from '@/components'
import type { IconName } from '@/lib/types'

interface SectionCardProps {
  icon: IconName
  title: string
  count?: number
  defaultExpanded?: boolean
  children: ReactNode
  action?: ReactNode
}

export function SectionCard({
  icon,
  title,
  count,
  defaultExpanded = true,
  children,
  action,
}: SectionCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  return (
    <div className="bg-default-50 dark:bg-default-100/50 rounded-xl">
      {/* Header */}
      <button
        type="button"
        className="flex w-full items-center gap-2.5 px-4 py-3 text-left transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <Icon name={icon} size="sm" className="text-muted shrink-0" />
        <span className="text-foreground flex-1 text-sm font-medium">
          {title}
        </span>
        {count != null && count > 0 && (
          <Chip size="sm" variant="soft" className="text-xs">
            {count}
          </Chip>
        )}
        {action && (
          <span
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            role="presentation"
          >
            {action}
          </span>
        )}
        <Icon
          name="NavArrowDown"
          size="sm"
          className={`text-muted shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Content */}
      <div
        className={`grid transition-all duration-200 ${isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
      >
        <div className="overflow-hidden">
          <div className="border-separator border-t px-4 py-3">{children}</div>
        </div>
      </div>
    </div>
  )
}

/**
 * Empty state placeholder for sections with no items.
 */
export function SectionEmpty({
  icon,
  message,
}: {
  icon: IconName
  message: string
}) {
  return (
    <div className="flex flex-col items-center gap-2 py-4 text-center">
      <Icon name={icon} size="lg" className="text-muted opacity-30" />
      <p className="text-muted text-xs">{message}</p>
    </div>
  )
}
